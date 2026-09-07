# Workflow Enhancement — Department User Controls Director Submission

## Objective

Fix a real workflow bug: a Requirement became visible/actionable to Directors the moment its
*first* quotation was uploaded, not when the Department User actually finished collecting and
reviewing quotations. The Department User must explicitly hand the requirement over via a new
"Submit to Director" action — only then does a Director get notified, and only then does
opening the review actually lock the requirement into Director Review.

This is an extension of the existing Requirement/Quotation/AI Comparison/Director
Review/Notification modules (Phases 1, 2, 4, 5) — no new module, no change to Phases 3, 6, 7,
or 8, no renumbering of the phase roadmap.

## Workflow

```
Create Requirement → Submit Requirement → Quotation Collection (upload 1..N quotations,
AI Comparison keeps being regenerated) → Department User presses "Submit to Director"
→ Director notified → Director opens Director Review → Approve / Send Back / Reject
```

- **Approve** — Requirement → `approved`. Quotation upload locked. AI Comparison read-only.
  Vendor Registration / Purchase Order flow continues exactly as before (unchanged).
- **Send Back** — Requirement → `quotation_collection`. Upload reopens; existing quotations
  are kept, new ones are appended. Department User can press "Submit to Director" again.
  Unlimited cycles.
- **Reject** — Requirement → `rejected` (terminal). No Vendor Registration, no Purchase Order.

All three decisions, their notifications, and the append-only `DirectorReview` audit trail
already existed in full before this change (Phase 5) — nothing about *deciding* changed here,
only *when a Director is allowed to see and act on the requirement in the first place*.

## Design decision: reusing `quotation_comparison` instead of adding a new status

`REQUIREMENT_STATUS` already declared a `quotation_comparison` value (added in Phase 1 for
forward-compatibility) that no backend code ever actually set — a genuinely dead enum member.
Rather than adding a new status (which would have rippled into every frontend
`Record<RequirementStatus, ...>` map, a "redesign" this change's instructions explicitly
excluded), `quotation_comparison` is repurposed as its natural meaning: *the Department User
has finished collecting quotations and explicitly submitted the requirement — it is with the
Director now, but not yet opened.* This required zero schema changes and only additive,
minimal-diff edits to the maps that already existed.

## What changed, by module

| Module | Before | After |
|---|---|---|
| `requirement.service.ts` | No hand-off action existed | New `submitToDirector()` — `quotation_collection → quotation_comparison`, requires ≥1 quotation, Department User (or Super Admin) only |
| `requirement.controller.ts` | `requirement_ready_for_review` notified Directors + Super Admins on the **first quotation upload** (`enteredCollection`) | That notification block is removed entirely from `createQuotation`; the same notification (same type, same recipients) now fires only from the new `submitToDirector` handler — no `dedupKey` (unlike one-shot events, this can legitimately fire again after every Send Back cycle) |
| `quotation.service.ts` (`createForRequirement`) | Upload allowed while status ∈ `{submitted, quotation_collection, quotation_comparison}` | Upload allowed only while status ∈ `{submitted, quotation_collection}` — locked the moment "Submit to Director" is pressed |
| `directorReview.service.ts` (`getReviewPackage`) | A Director/Super Admin merely *viewing* the package while status was `quotation_collection` **or** `quotation_comparison` auto-advanced it to `director_review` | Only `quotation_comparison` is eligible — viewing while still `quotation_collection` (before an explicit submit) can never lock the requirement into Director Review |
| `comparison.service.ts` (`generate`) | No status gate — comparison could be regenerated at any time, even after Approve/Reject | Blocked (400) once status ∈ `{approved, rejected, vendor_finalized, closed}` — read (`getLatest`/GET) is unaffected |
| `activityLog.model.ts` | — | New action: `requirement_submitted_to_director` |

New endpoint: `PATCH /requirements/:id/submit-to-director` (Department User / Super Admin,
same role gate as the existing `/submit`).

## Mobile

- `RequirementDetailsScreen` — new "Submit to Director" button, shown only while
  `status === 'quotation_collection'` and the caller owns the requirement (or is Super Admin);
  hidden otherwise, reappears automatically after a Send Back (status returns to
  `quotation_collection`). "Add Quotation" is now gated to `submitted`/`quotation_collection`
  only (previously any non-draft status). AI Comparison card shows a "read-only" message once
  a decision has been made.
- `AiComparisonScreen` — "Generate"/"Regenerate Comparison" button hidden once the requirement
  is `approved`/`rejected`/`vendor_finalized`/`closed`, mirroring the backend gate exactly.
- `DirectorDashboardScreen` — "Requirements Awaiting Review" now counts `quotation_comparison`
  + `director_review` (was `quotation_collection` + `director_review`) — a requirement still
  being worked on by its Department User no longer inflates the Director's task count.
- Status labels updated where `quotation_comparison` is displayed (`RequirementDetailsScreen`,
  `RequirementListScreen`, `RequirementCard`): "Comparing Quotations" → "Submitted to
  Director", since the status no longer means "a comparison is being generated" — comparison
  generation already happened; this status means "waiting on the Director."
- `DirectorReviewScreen` needed no changes — it already rendered whatever the review-package
  endpoint returned and already had full Approve/Send Back/Reject UI; the bug was entirely in
  *when* the backend allowed a Director to reach that state, not in the review screen itself.

## Testing

- Every existing fixture across `directorReview.test.ts`, `vendorRegistration.test.ts`,
  `purchaseOrder.test.ts`, `bill.test.ts`, and `goodsReceipt.test.ts` that drives a requirement
  from quotation upload to Director Review now inserts the explicit
  `PATCH .../submit-to-director` step (previously relied on the auto-transition-on-view from
  `quotation_collection`, which no longer happens).
- `requirement.test.ts` — rewrote the notification-timing test: quotations uploaded (including
  the first) must **not** notify Directors; only `submit-to-director` does.
- `directorReview.test.ts` — new "Workflow enhancement — Director submission control" suite:
  upload locked after submit / reopened after Send Back; no premature notification /
  notification fires exactly once per submit; `submit-to-director` rejects with no quotations
  and rejects a non-owner; AI Comparison read-only once approved. The existing "Send Back then
  re-review to Approve" full-workflow test was extended to explicitly resubmit to the Director
  on the second cycle and assert Directors are notified again (proving unlimited Send Back
  cycles genuinely work end-to-end, not just that the status transition is correct).
- Postman (`VMS-Requirements.postman_collection.json`) — "Phase 5 - Director Review" and
  "Phase 6 - Vendor Registration" folders each gained an explicit "submit(-again) to Director"
  step before their Director Review calls, renumbered accordingly.
- Backend: `npm run typecheck` clean, `npm test` → **202/202 passing** (was 198; +4 new).
- Frontend: `npx tsc --noEmit` clean, `npx jest` → 24/26 (the same 2 pre-existing, unrelated
  `ProfileScreen` failures present since before this change — confirmed not a regression).

## Backward compatibility

AI OCR (Phase 3), Vendor Registration (Phase 6), Purchase Order (Phase 7), Goods Receipt
(Phase 8), Bill/Accounts/Payments are untouched — none of them read `quotation_collection` or
`quotation_comparison`, and the only shared gate any of them depend on
(`Requirement.status === 'approved'`/`'vendor_finalized'`) is unaffected by this change.
