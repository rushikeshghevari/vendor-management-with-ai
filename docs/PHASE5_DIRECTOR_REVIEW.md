# Phase 5 — Director Review & Approval

## Objective

Give a Director a single screen to review the complete procurement package for a
Requirement — the requirement itself, its quotations, each quotation's OCR data, the AI
comparison (Phase 4), and its full activity/remarks history — and record one of three
decisions: Approve, Reject, or Send Back. This phase never creates a Vendor or Purchase
Order, never re-runs OCR, and never modifies the AI comparison itself; it only reads that
data and records a Director's decision on top of it.

## Workflow

```
Requirement → Multiple Quotations → OCR Completed → AI Comparison → Director Review
→ Approve / Reject / Send Back → Ready for Vendor Registration (Approve only)
```

A Director (or Super Admin) opening the review package for a requirement that already has
an AI comparison automatically advances `Requirement.status` from `quotation_collection`/
`quotation_comparison` to `director_review` — read access by a Department User or HOD never
does this (they are read-only per the role table below). From there:
- **Approve** → `Requirement.status = approved` (Phase 6 picks up from here).
- **Reject** → `Requirement.status = rejected` (terminal).
- **Send Back** → `Requirement.status = quotation_collection` — the Department User can
  revise or add quotations, and the requirement naturally re-enters the same
  OCR → Comparison → Director Review path for a second look.

A decision is only accepted while the requirement is actually `director_review` — deciding
twice, or deciding before a comparison/viewing has happened, is rejected (404/400).

## Database

New collection, `DirectorReview` (`src/modules/directorReview/directorReview.model.ts`) —
**one document per Requirement** (unique index on `requirement`), not append-only like
Comparison/ActivityLog, because a Send Back and its subsequent re-review are the *same*
ongoing review, not a new one:
- `requirement`, `director` (most recent Director/Super Admin to act), `decision`
  (`pending | approved | rejected | sent_back`), `remarks`, `decisionDate`.
- `history[]` — every "viewed", decision, and remarks-edit event ever recorded, oldest
  first, each with `performedBy`/`performedByName`/`performedAt` — the full audit trail
  survives across Send Back → re-review cycles.
- `version` — increments on every decision or remarks edit (not on a plain "viewed").
- `createdBy`/`updatedBy` — standard audit fields.

Nothing on `Quotation.ocr` or `Comparison` is ever written to by this phase.

## API Endpoints

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/requirements/:id/director-review` | Department User (own), HOD (department), Director, Super Admin | Full package: requirement, latest comparison, quotations, up to 100 recent activity-log entries, and the review record. 400 if no comparison exists yet. Director/Super Admin viewing also advances status + logs a "viewed" event; DU/HOD viewing does neither. |
| POST | `/requirements/:id/director-review/decision` | Director, Super Admin | Body `{ decision: approved\|rejected\|sent_back, remarks? }` — remarks mandatory for reject/send_back. 404 if the requirement isn't currently `director_review`. |
| PATCH | `/requirements/:id/director-review/remarks` | Director, Super Admin | Updates remarks without changing the decision; increments `version`. |

Both write endpoints fire an `activity_log` entry (`director_review_viewed` /
`_approved` / `_rejected` / `_sent_back` / `_remarks_updated`) and, for decisions, a
notification fan-out:

| Decision | Notified |
|---|---|
| Approved | Department User (creator), HOD, every active Super Admin |
| Rejected | Department User (creator), HOD |
| Sent Back | Department User (creator) only |

## Mobile

- **Director Review Screen** (`DirectorReviewScreen.tsx`, new) — requirement summary card,
  Approve/Send Back/Reject action buttons (Director/Super Admin only, only while
  `director_review`), Requirement Details, Requirement Items, Quotations & OCR (per-
  quotation OCR status/grand total/confidence + a "Download quotation attachment" link),
  an AI Comparison Summary card (lowest/highest/budget variance/total quotations,
  recommendation, observations, and a "View Full Comparison" button into the existing
  Phase 4 `AiComparisonScreen` rather than duplicating its sort/filter table), Review
  History & Remarks (full audit trail + an "Add Remarks" inline editor), and Activity Logs.
- **Approval / Reject / Send Back dialogs** — one shared bottom sheet,
  `DirectorReviewDecisionSheet.tsx` (mirrors the existing `DirectorDecisionSheet` used for
  Quotation approval), with remarks mandatory for Reject/Send Back and optional for
  Approve, matching the backend validation exactly.
- **Remarks History / Approval Timeline** — `DirectorReviewHistory.tsx` (mirrors the
  existing `DirectorApprovalHistory` component), rendering every `viewed` / `approved` /
  `rejected` / `sent_back` / `remarks_updated` entry newest-first.
- **Requirement Details Screen** — gained a "Director Review" entry point alongside the
  existing "AI Comparison" one.

## Role Permissions

- **Department User**: read only.
- **HOD**: read only.
- **Director**: full — view, Approve/Reject/Send Back, add remarks.
- **Super Admin**: full access (explicit RBAC override, same "full access" pattern as
  Phases 3–4) — can decide/add remarks on any requirement, same as a Director.

## Testing

- `directorReview.validation.test.ts` (12 unit tests) — decision/remarks schema rules
  (remarks required for reject/send_back, not for approve; invalid decision values
  rejected).
- `directorReview.test.ts` (12 integration/permission/workflow tests) — comparison-required
  gate, Director view advances status + logs "viewed", read-only roles don't advance
  status, ownership 404, Department User/HOD forbidden from deciding, decide-before-review
  404, Approve/Reject/Send Back each verified end-to-end (status transition + correct
  notification fan-out + activity log), Super Admin override, repeat-decision 404, remarks
  update + its own permission check, and a full Send Back → revise → re-review → Approve
  workflow asserting `history`/`version` accumulate correctly across the whole cycle.
- Backend: `npm run typecheck` clean, `npm test` → **121/121 passing** (was 97; +24 new).
- Frontend: `npx tsc --noEmit` clean, `npx jest` → 24/26 (the same 2 pre-existing,
  unrelated `ProfileScreen` failures present before this phase — confirmed not a
  regression).

## Known Limitations

- **No document is picked as "the winning quotation" in this phase.** Approving a
  requirement records a decision, not a vendor selection — the given spec's DirectorReview
  fields (Requirement/Director/Decision/Remarks/Decision Date/History/Version/Audit) don't
  include one, so Phase 6 (Vendor Registration) is expected to make that choice, likely
  informed by the Comparison's own `recommendation`.
- Notifications on decision are fire-and-forget (same pattern as every prior phase) — a
  failure to notify never blocks or reverses the recorded decision.

## Preparation for Phase 6

`Requirement.status = 'approved'` is the hand-off point — Phase 6 (Vendor Registration) is
expected to read an approved Requirement plus its `Comparison` (for the recommended
quotation) and `DirectorReview` (for the Director's remarks) to create a Vendor record.
`vendor_finalized`/`closed` remain declared-but-unreachable `Requirement.status` values,
same "declared now, wired later" pattern used since Phase 1.
