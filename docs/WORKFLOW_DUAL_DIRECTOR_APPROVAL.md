# Parallel Dual Director Approval

## Business requirement

There are two Directors with equal authority. Both must approve a Requirement — in any
order, independently — before it becomes Approved and Vendor Registration unlocks. Either
Director can Reject or Send Back on their own, immediately, without waiting for the other.

## Root cause / starting point

Before this change, `directorReviewService.decide()` treated a single Director's decision as
final: the first Director to approve immediately flipped `Requirement.status` to `APPROVED`.
There was no concept of "the other Director still needs to decide."

## Database changes

`DirectorReview` (unchanged collection, additive schema only — no migration needed):

- New `approvals: IDirectorApprovalEntry[]` array — one entry per currently-active Director
  (`{ director, directorName, decision, remarks?, decidedAt? }`). `directorName` is
  denormalized at seed time (same reasoning as `history[].performedByName`) so a past
  round's record stays accurate even if that Director is later renamed or deactivated.
- `decision` (top-level) keeps its existing meaning but is now the **aggregate** outcome
  across every entry in `approvals`, not one Director's own decision — see below.
- No new enum values anywhere. `DIRECTOR_REVIEW_DECISIONS` (`pending`/`approved`/`rejected`/
  `sent_back`) is reused both for each entry and for the aggregate.
- Existing documents created before this change hydrate with `approvals: []` automatically
  (Mongoose applies the schema's array default on read) and self-heal on next access via
  `ensureApprovalRoster` — no backfill script required.

## Backend changes

**Files:** `directorReview.model.ts`, `directorReview.service.ts`, `directorReview.controller.ts`.
No changes to `directorReview.routes.ts`, `directorReview.validation.ts`,
`vendorRegistrationService.ts`, or `vendorRegistrationController.ts` — see "why nothing else
needed to change" below.

- `ensureApprovalRoster()` — seeds a `pending` entry for every currently-active Director not
  already on the review's roster. Runs on every `getReviewPackage`/`decide` call; self-heals
  if a Director is added mid-review. Never removes an entry (a deactivated Director's past
  decision is preserved).
- `decide()`:
  - A Director may only move their **own** entry, and only once — attempting a second
    decision returns `400 "You have already submitted your decision for this requirement"`.
  - **Approve**: resolves the aggregate to `approved` (→ `Requirement.status = APPROVED`)
    only once every entry in `approvals` is `approved`. Otherwise the aggregate — and
    `Requirement.status` — stays `pending` / `director_review` ("Waiting for Director
    Approvals" is a UI-computed label, not a new status value).
  - **Reject** or **Send Back** from either Director resolves the whole requirement
    immediately, without waiting on the other Director's own pending entry.
  - **Send Back** additionally resets every entry in `approvals` back to `pending` (remarks
    and `decidedAt` cleared) — the next round starts clean.
  - A **Super Admin**'s decision is a full-access override — same precedent already used
    everywhere else in this codebase (Vendor Registration, standalone Quotation decisions,
    etc.) — and resolves the requirement immediately regardless of the individual Directors'
    entries.
- `redactPeerRemarks()` — a Director who hasn't submitted their own decision yet never sees
  the *other* Director's remarks in the API response (decision status like Pending/Approved
  always stays visible; only the free-text stays hidden). Department User, HOD, and Super
  Admin always see everything.
- Controller notifications now key off the requirement's **resulting** status (`approved` /
  `rejected` / `quotation_collection`) rather than the individual Director's own decision —
  a partial approval (one Director done, one still pending) fires no Department User
  notification at all, since nothing has actually resolved yet.

### Why nothing else needed to change

- `requirementController.submitToDirector` already notifies **every** active Director via
  `findActiveUsersByRole(ROLES.DIRECTOR)` — with two active Directors, both were always
  notified; no change needed.
- `vendorRegistrationService.register()`'s gate is `requirement.status !== APPROVED → 400`.
  Since `Requirement.status` only reaches `APPROVED` once every Director has approved, Vendor
  Registration was blocked correctly with zero changes to that module.
- `vendorRegistrationService.requireApprovedReview()` queries
  `DirectorReview.findOne({ decision: 'approved' })` — since the aggregate `decision` only
  becomes `'approved'` in the same moment `Requirement.status` does, this still works
  unchanged, and `review.director` (used for `Vendor.approvedByDirector`) naturally ends up
  holding whichever Director completed the *second* (deciding) approval.

## Frontend changes

**Files:** `features/directorReview/types.ts`, `features/directorReview/api/directorReviewApi.ts`,
`features/requirements/screens/DirectorReviewScreen.tsx`.

- New `DirectorApprovalEntry` type + `DirectorReview.approvals[]`.
- New **"Director Approvals"** card on the Director Review screen (placed right after
  Requirement Details, before the reviewer has to scroll past anything else):
  - One row per Director — `Director 1 — {name}`, `Director 2 — {name}`, etc. — each with
    its own Pending/Approved/Rejected/Sent Back badge, and remarks once visible (or
    "Remarks hidden until you submit your own decision" while the viewer's own entry is
    still pending).
  - "Your Decision" row for the signed-in Director.
  - "Overall Status" badge — Pending Review / Waiting for Director Approvals / Approved /
    Rejected / Sent Back for Revision — computed from `requirement.status` + `approvals[]`,
    no extra request.
- Approve/Send Back/Reject buttons now gate on `myApprovalEntry.decision === 'pending'` for
  a Director (a Super Admin is unaffected — always allowed while `director_review`). Once a
  Director has decided, the read-only panel explicitly says so ("You already submitted your
  decision (Approved). Waiting for the other Director to review.") instead of the generic
  read-only message.

## API changes

No new endpoints, no route/method changes. `GET /requirements/:id/director-review`,
`POST /requirements/:id/director-review/decision`, and
`PATCH /requirements/:id/director-review/remarks` are reused exactly as they were — only the
response shape gained `review.approvals[]`.

## Notification changes

- Submit to Director → both active Directors notified (unchanged — this already worked).
- Approve (partial, one of two) → **no notification** (nothing has resolved yet).
- Approve (final, both done) → Department User + HOD + Super Admins get "Requirement
  Approved" (unchanged wording/type, now correctly gated on the true final state).
- Reject (either Director) → Department User + HOD get "Requirement Rejected" immediately.
- Send Back (either Director) → Department User gets "Requirement Sent Back" immediately.

## End-to-end testing results

- Full backend suite: **215/215 passing**, 21 suites, zero regressions in Vendor
  Registration, Purchase Order, Goods Receipt, Bill, Accounts, or Payment.
- 9 new tests in `directorReview.test.ts` covering: both Directors notified on submit;
  roster shows both Pending before either decides; either Director can go first without
  resolving the requirement; resolution (and the "Requirement Approved" notification) fires
  only once both have approved; a repeat decision from the same Director is rejected; a
  Reject from either Director resolves immediately without waiting on the other; a Send Back
  clears both Directors' approvals; a Director's remarks stay hidden from the other until
  they've decided too; a Super Admin override still resolves immediately.
- 1 new integration test in `vendorRegistration.test.ts`: Vendor Registration returns `400`
  after only one of two Directors approves, and `201` once both have.
