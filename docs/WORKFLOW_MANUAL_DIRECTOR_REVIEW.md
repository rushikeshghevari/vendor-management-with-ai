# Manual Director Review (AI Comparison made optional)

## Root cause

`directorReviewService.getReviewPackage()` and `.decide()` both hard-required a
`Comparison` document to exist for the requirement before Director Review could even be
opened, let alone decided on. `comparisonService.generate()` is never called automatically —
it's a separate, manual "Generate" action on the AI Comparison screen — so a requirement
could reach `quotation_comparison` status (Submitted to Director) with zero comparisons
ever generated, and Director Review would then be permanently blocked with
`400 "Generate an AI comparison before starting Director Review"` until someone went and
generated one. `vendorRegistrationService.resolveWinningQuotation()` had the same hard
dependency one step later, so even fixing Director Review alone would have just moved the
same block to Vendor Registration.

Separately: nothing under `comparisonEngine.ts` calls an external AI/LLM API — the "AI
Comparison" is a deterministic price/item-matching algorithm that runs entirely in this
process. There's no AI provider integration to "turn on" later; "enabling AI" in the future
most likely means either (a) making sure Generate is called consistently in the workflow, or
(b) swapping `comparisonEngine.compare()`'s deterministic logic for a real model call. Either
way, nothing in this change touches that engine — it's fully intact and still produces the
same recommendation whenever a comparison is generated.

## What changed

Comparison existence became **optional, not required**, at every point that used to hard-block
on it:

- `directorReviewService.getReviewPackage()` — returns `comparison: null` instead of
  throwing when none exists. Director Review opens normally either way.
- `directorReviewService.decide()` — the AI-comparison gate is removed outright (its result
  was never even used, only checked). Approve / Send Back / Reject all work with or without
  a comparison.
- `vendorRegistrationService.resolveWinningQuotation()` — falls back to the earliest-uploaded
  quotation when there's no comparison at all, exactly the same fallback it already had for
  "a comparison exists but never resolved a recommendation."
- Frontend (`DirectorReviewScreen`, `DirectorReviewDecisionSheet`,
  `VendorRegistrationScreen`) — every `comparison.*` access is now null-guarded, and each
  screen shows **"AI Comparison is currently unavailable. Please review the quotations
  manually."** (or a context-appropriate variant) in place of the AI stats/recommendation
  when `comparison` is null.

## What did NOT change

- `comparisonEngine.ts` / `comparisonService.generate()` — untouched. Generating a
  comparison still works exactly as before, and the moment one exists for a requirement,
  every screen above goes back to showing the AI recommendation, highlighted quotation, and
  stats automatically — no flag, no redesign, no code change required to "re-enable AI."
  A comparison is just optional data now, not a workflow prerequisite.
- Requirement/Quotation/Vendor Registration/Purchase Order/Goods Receipt/Bill/Accounts/
  Payment modules and status machine — unchanged.

## Re-enabling full AI recommendation later

Nothing to do at the workflow level. Once an AI provider is wired into
`comparisonEngine.compare()` (or Generate is simply called earlier/automatically in the
flow), every screen already prefers `comparison.recommendation` whenever it's present — the
manual-review fallback only ever shows when `comparison` is genuinely absent.
