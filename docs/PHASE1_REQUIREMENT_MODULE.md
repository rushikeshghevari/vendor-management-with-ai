# Phase 1 — Requirement Module

## Objective

Move the procurement workflow's starting point from **Vendor** to **Requirement**. A
Vendor is no longer created up front — it's only created after a Director selects the
final quotation (Phase 6). Phase 1 delivers the standalone Requirement module only:
create, list, view, edit (draft), submit, delete (draft). No other existing module is
modified in a way that changes its behavior.

## Existing Workflow

```
Vendor → Quotation → Purchase Order → Bill → Accounts → Payment
```

## New Workflow (end state, Phases 1–11)

```
Department User → Requirement → Multiple Quotations → Upload Quotation → AI OCR
→ Auto Fill → Quotation Comparison → Director Approval (once) → Final Vendor Selection
→ Vendor Registration Link → Vendor Registration → Purchase Order → Goods Receipt
→ Inspection → Bill → Accounts → Payment
```

Phase 1 implements only the first box (Requirement) as a fully working, standalone
module. Everything from "Multiple Quotations" onward is unchanged existing
functionality until its own phase (see `FUTURE_PHASES.md`) links it in.

## Database Changes

New collection `Requirement`, modeled on `quotation.model.ts`'s shape (status workflow +
department/creator ownership) with an embedded `items` array (modeled on
`purchaseOrder.model.ts`'s line-item subdocument).

**Requirement**: `requirementNumber` (unique, auto-generated `REQ-2026-000001`),
`department`, `createdBy`, `title`, `description?`, `priority`, `budget`, `requiredDate`,
`status`, `remarks?`, `approvalStatus`, `items[]`, `isDeleted`, `submittedAt?`,
`submittedBy?`, timestamps.

**Requirement Item** (embedded, no own collection): `itemName`, `specification?`,
`quantity`, `unit`, `estimatedRate`, `estimatedAmount`, `remarks?`.

**Status enum** (all 9 values declared now for forward-compatibility; Phase 1 code only
ever produces `draft` and `submitted` — the rest are unreachable until later phases wire
them in): `draft, submitted, quotation_collection, quotation_comparison,
director_review, approved, rejected, vendor_finalized, closed`.

**Relationships**: Department 1→many Requirement; Requirement 1→many Requirement Items;
Requirement 1→many Quotations (Phase 2+, not wired yet); **no Vendor link at this
stage**.

## API Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/requirements` | Department User, Super Admin |
| GET | `/api/v1/requirements` | Any authenticated (scoped by role) |
| GET | `/api/v1/requirements/:id` | Any authenticated (scoped by role) |
| PUT | `/api/v1/requirements/:id` | Owner (draft only), Super Admin |
| DELETE | `/api/v1/requirements/:id` | Owner (draft only), Super Admin |
| PATCH | `/api/v1/requirements/:id/submit` | Owner, Super Admin |

## Mobile Navigation

New `Requirements` tab (drawer + bottom-tab entry) for Super Admin, HOD, Department
User, and Director — positioned before Quotations to reflect its new place in the
workflow. Screens: List, Details, Create, Edit. A "Create Requirement" quick action and
a status-count dashboard card are added to the Department User dashboard (the actual
entry point of the new workflow) and a totals card to the Super Admin dashboard.

## Role Permissions

- **Department User**: create, edit own draft, submit own draft, delete own draft, view
  own requirements.
- **HOD**: view all requirements in their department. No write action in Phase 1 (an
  "approve submission" step was marked optional in the source spec and is not in the API
  list above — deferred, not implemented).
- **Director**: read-only visibility. No action in Phase 1 — will receive the quotation
  comparison in a later phase.
- **Super Admin**: full access (create/edit/delete/view any).

## Future Integration Points

- `Requirement.items` will feed the "Auto Fill" step (Phase 3–4) once quotations are
  attached.
- Requirement `status` will gain a real `quotation_collection` → `director_review` →
  `approved` path once Phases 2–5 land (Quotation gets a `requirement` back-reference).
- `Requirement.status = 'vendor_finalized'` is the hook Phase 6 (Vendor Registration
  Link) will set.
- No existing module reads or writes `Requirement` in Phase 1 — the integration is
  entirely additive and one-directional (Requirement will later reference/be referenced
  by Quotation), so Phase 1 carries zero regression risk to the current live workflow.
