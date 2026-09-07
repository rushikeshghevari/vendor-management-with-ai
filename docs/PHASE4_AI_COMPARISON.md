# Phase 4 — AI Comparison Engine

## Objective

Read the OCR structured data Phase 3 already stored on every quotation attached to a
Requirement, and produce a recommendation-only comparison: statistics, an item-by-item
match against the Requirement's own items, plain-language AI observations, and a suggested
best-value quotation. This phase never re-runs OCR, never writes to `Quotation.ocr`, never
creates a Vendor, and never approves or finalizes anything.

## Workflow

```
Requirement → Multiple Quotations → OCR Completed → AI Comparison → Comparison Result
→ Ready for Director Review
```

Generating a comparison is a separate, explicit action (not automatic on upload) — a
Department User, HOD, or Super Admin taps "Generate Comparison"/"Regenerate Comparison".
Every generation reads whatever `ocr.structuredData` exists on each quotation *at that
moment* and inserts a brand-new `Comparison` document (earlier ones are never overwritten,
mirroring how `ActivityLog`/`AuditLog` are also append-only) — so "Generated time" always
means exactly when that specific result was produced.

## Comparison Engine

`src/modules/comparison/comparisonEngine.ts` is a pure, dependency-free module (no Mongoose,
no DB) — `comparison.service.ts` maps live Requirement/Quotation documents into plain input
shapes and hands them to `compare()`, the same split `quotationOcrParser.ts` uses for OCR
parsing. Everything below is computed deterministically, not via an LLM call — there is
nothing to keep "in sync" with a model provider, and results are perfectly reproducible for
the same underlying data.

- **Per-quotation snapshot**: Grand Total (OCR-extracted; falls back to the quotation's own
  `amount + amount * gst / 100` if OCR never found one), GST amount, Discount, Currency,
  Payment Terms, Delivery Terms (+ a best-effort Delivery Days parse), Quotation Date, Item
  Count, OCR status/confidence. **Validity is not currently tracked** — see Known
  Limitations.
- **Item comparison**: each Requirement item is matched against the quotation's OCR line
  items by normalized name (exact match, then substring) — one OCR item can only be claimed
  once. Unmatched Requirement items are `missing`; unclaimed OCR items are `extra`; matched
  pairs are checked for a quantity mismatch, unit price difference, and amount mismatch
  (>1% relative tolerance, to absorb rounding).
- **Statistics**: lowest/highest/average price, cost difference, and budget variance
  (computed against the recommended "best value" quotation, not just the cheapest one).
- **Best value / Recommendation**: the lowest-priced quotation among those with zero
  missing Requirement items; falls back to the overall lowest price (with a caveat) if
  every quotation is missing something. Always advisory (`isAdvisoryOnly: true`) — the
  reason text explicitly says "recommendation only... requires Director review."
- **AI Observations** (rule-based, not free-text generation): lowest/highest quotation,
  missing documents, suspicious price deviation (>40% from average), quantity
  inconsistencies, duplicate quotation documents (same file hash uploaded under two
  different quotations — reuses Phase 3's SHA-256 `fileHash`), and low/failed OCR
  confidence warnings.

## Database Changes

New collection, `Comparison` (`src/modules/comparison/comparison.model.ts`) — linked to a
Requirement, never to a Quotation directly:
`requirement, quotations[] (snapshot), statistics, itemComparison[], observations[],
recommendation, generatedAt, generatedBy`. Nothing on `Requirement` or `Quotation` is
modified — `Quotation.ocr` is read-only from this phase's perspective, exactly as required.

## API Endpoints

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/requirements/:id/comparison` | Department User (own), HOD (department), Super Admin | Generates a fresh comparison; 400 if the requirement has no quotations yet |
| GET | `/requirements/:id/comparison` | Department User (own), HOD (department), Director, Super Admin | Returns the most recently generated comparison; 404 if none exists yet |

Mounted alongside `requirement.routes.ts` at the same `/requirements` prefix (its own
dedicated `comparison.routes.ts`/`comparison.controller.ts`/`comparison.validation.ts` —
same modular shape as the pre-existing `auditLog` module). Generating fires an
`activity_log` entry (`comparison_generated`) and a notification to the department's HOD
plus every active Director and Super Admin ("Ready for Director Review") — informational
only, nothing here approves anything.

## Mobile Screens

- **AI Comparison Screen** (`AiComparisonScreen.tsx`, new) — reachable from Requirement
  Details' "View Comparison" button:
  - Comparison Summary (generated time, quotation count, Generate/Regenerate button for
    Department User/HOD/Super Admin).
  - Statistics cards (lowest/highest/average price, cost difference, budget variance,
    total quotations).
  - AI Recommendation card, always labeled "Recommendation only — not an approval. Final
    decision requires Director review."
  - AI Observations list, severity-coded (info/warning/critical).
  - Vendor Comparison — one card per quotation, sortable by price (asc/desc) or vendor
    name; the recommended quotation is highlighted with a star.
  - Item Comparison — a quotation selector plus a status filter (All/Matched/Missing/
    Extra/Mismatch), showing required vs. quoted quantity/rate and mismatch flags.
- **Requirement Details Screen** — the earlier "Comparison will appear here" placeholder is
  now a real "View Comparison" entry point.

## Role Permissions

- **Department User**: view comparison; generate/regenerate for their own requirement.
- **HOD**: view comparison; generate/regenerate for their department's requirements.
- **Director**: view comparison only (403 on generate — matches Phase 3's OCR-retry
  precedent of Director being read-only).
- **Super Admin**: full access — view and generate/regenerate for any requirement.

## Testing

- `comparisonEngine.test.ts` (20 unit tests) — price statistics, budget variance, OCR
  fallback, lowest/highest/duplicate/suspicious-price/confidence observations, missing/
  extra/quantity/unit-price item detection, and recommendation selection (including the
  "cheaper-but-incomplete loses to pricier-but-complete" rule).
- `comparison.test.ts` (10 integration tests) — successful generation + persistence,
  activity log creation, notification fan-out to HOD/Director, graceful handling of
  incomplete OCR, 400 with no quotations, 404 for an unknown/inaccessible requirement, 401
  unauthenticated, 403 for Director generating, and both GET paths (found / not yet
  generated).
- Backend: `npm run typecheck` clean, `npm test` → **97/97 passing** (was 67; +30 new).
- Frontend: `npx tsc --noEmit` clean, `npx jest` → 24/26 (the same 2 pre-existing,
  unrelated `ProfileScreen` test-harness failures present before this phase — confirmed
  not a regression).

## Known Limitations

- **Validity is not tracked.** Neither the Quotation model nor Phase 3's OCR structured
  data captures a validity period, and this phase does not re-run OCR to add it — the field
  is always shown as "Not Available" rather than guessed.
- **Item matching is a best-effort text match** (normalized exact match, then substring),
  not a guaranteed pairing — a quotation item worded very differently from the Requirement
  item's name can be missed and reported as both "missing" (on the Requirement side) and
  "extra" (on the quotation side).
- **The recommendation is a deterministic rule (lowest price + item completeness), not a
  machine-learning model** — it is explicitly advisory and always requires a human
  (Director) decision.
- **Grand Total falls back to the manually entered amount** when OCR never extracted one
  (low confidence, failed, or not yet run) — the per-quotation snapshot's
  `grandTotalSource` field (`'ocr'` vs `'quotation'`) tells the caller which happened.

## Preparation for Phase 5

`Requirement.status` is untouched by this phase — `quotation_comparison`/`director_review`
remain declared-but-unreachable enum values (same "declared now, wired later" pattern from
Phase 1). Phase 5 (Director Review) is expected to read a `Comparison` document and a
`Requirement`'s quotations to drive an actual approval decision — this phase deliberately
stops at "recommendation produced," never touching approval state.
