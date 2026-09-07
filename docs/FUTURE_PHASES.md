# Future Phases — Enterprise Procurement Workflow

Roadmap only — no implementation detail. Each phase is scoped when it starts, following
the same "analyze first, extend, don't break" approach as Phase 1.

## Phase 2 — Multiple Quotations
Allow a Requirement to collect more than one Quotation from different vendors.
`Quotation` gains a `requirement` back-reference. Requirement status begins moving
through `quotation_collection`.

## Phase 3 — AI OCR
Uploaded quotation documents are read by OCR to extract vendor, pricing, and line-item
data automatically, reducing manual entry.

## Phase 4 — AI Comparison / Auto Fill
OCR output auto-fills quotation fields; an AI-assisted comparison view ranks the
collected quotations against the Requirement's items and budget.

## Phase 5 — Director Comparison & Approval
Director reviews the AI comparison and approves exactly one quotation per Requirement
(the "Director Approval (Only Once)" step). Requirement status moves through
`quotation_comparison` → `director_review` → `approved`/`rejected`.

## Phase 6 — Vendor Registration Link
Once a Director approves a final quotation, a Vendor Registration link/flow is
generated for that vendor. This is the first point at which a Vendor record can be
created in the new workflow. Requirement status: `vendor_finalized`.

## Phase 7 — Purchase Order
Purchase Order generation is re-pointed to originate from the finalized
Requirement + approved Quotation, alongside (not replacing) the existing
quotation-only PO path used by the current live workflow.

## Phase 8 — Goods Receipt & Inspection ✅ Implemented
New Goods Receipt and Inspection records against a Purchase Order, gating whether a
Bill can be raised (mandatory only for a Requirement-originated Purchase Order). See
`PHASE8_GOODS_RECEIPT.md`.

## Phase 9 — Bill
Existing Bill module gains an optional Requirement/Goods-Receipt lineage for
audit/traceability. Existing bill-only flows continue to work unchanged.

## Phase 10 — Accounts
Existing Accounts verification step extended to surface the full
Requirement → Quotation → PO → Goods Receipt → Bill chain for review.

## Phase 11 — Payment
Existing Payment module unchanged in mechanics; reporting/audit trail extended to trace
a payment all the way back to its originating Requirement.

---

Each phase closes the loop one step further toward the target end-to-end workflow in
`PHASE1_REQUIREMENT_MODULE.md`, without breaking the modules any earlier phase already
shipped.
