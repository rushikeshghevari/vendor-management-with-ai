# Phase 8 — Goods Receipt & Inspection

## Objective

Record what actually arrived against a generated Purchase Order — quantities received,
per-item condition, and an overall inspection outcome — and use that record to gate Bill
creation, but **only** for a Requirement-originated Purchase Order (`PurchaseOrder.requirement`
set, per Phase 7's own "Preparation for Phase 8" note). A legacy quotation-only Purchase Order
continues straight to Bill exactly as it did before this phase — Goods Receipt is available for
it too (recording is never blocked), but never mandatory.

## Workflow

```
Requirement → ... → Vendor Registration → Purchase Order → Goods Receipt (this phase)
→ Bill (mandatory gate only for a Requirement-originated PO) → ...
```

## Design decision: a standalone module, not new Purchase Order statuses

The obvious-looking approach — add a `PO_STATUS.GOODS_RECEIVED` value and thread it through
every `Record<PurchaseOrderStatus, ...>` map already existing across the mobile app's PO status
badges/labels — was rejected. It would have rippled into files that have nothing to do with
Goods Receipt just to keep them exhaustive, which is exactly the "redesign"/"refactor unrelated
modules" this phase's instructions ruled out. Instead:

- `GoodsReceipt` is a new, fully standalone 5-file module (`goodsReceipt.model/validation/
  service/controller/routes.ts`), following the identical pattern every other domain module in
  this codebase uses (closest structural template: `purchaseOrder.*`).
- `PurchaseOrder.status` is **never written to** by this phase. Instead, `PurchaseOrder` gains
  one new optional field — `goodsReceipt?: ObjectId` (ref `GoodsReceipt`) — set once a receipt
  is recorded, mirroring exactly how `PurchaseOrder.bill` is already denormalized once a Bill is
  created against it. "Has Goods Receipt been recorded?" is answered by this field being
  present (or, server-side, by a direct `GoodsReceipt.findOne({ purchaseOrder })` query) — never
  by a status string.
- One Goods Receipt per Purchase Order (`purchaseOrder` is `unique: true`) — a single
  completion event, not incremental/partial receipts. Matches the same one-PO-per-Quotation,
  one-Bill-per-Quotation simplicity already established elsewhere. Documented below as a
  deliberate scope boundary.

## What's shared vs. what branches, in `billService.create()`

Implementing this phase's actual gate surfaced two **pre-existing, independent gaps** in
`billService.create()` that silently made Bill creation for *any* Requirement-originated PO
impossible even before this phase (proven by writing the first end-to-end test against that
path — it failed twice, for reasons that had nothing to do with Goods Receipt). Both are fixed
alongside the new gate, since the new gate is unreachable/untestable without them:

| Check | Legacy (no `quotation.requirement`) | Requirement-originated (`quotation.requirement` set) |
|---|---|---|
| Quotation must be Approved | unchanged — `quotation.status !== 'approved'` still throws | **skipped** — a Requirement-linked Quotation stays at `draft` forever (Director Review approves the Requirement as a whole, never the Quotation individually; see `purchaseOrder.service.ts`'s identical `if (!requirementId)` gate around its own Approved/Billed check) |
| Vendor for the new Bill | `quotation.vendor` (always populated for this path) | **`linkedPo.vendor`** instead — a Requirement-linked Quotation never carries a real `vendor` ref (`temporaryVendor` only, per Phase 2); the PO already resolved the correct vendor at generation time (Phase 7) |
| Duplicate-invoice-per-vendor check | `quotation.vendor` | **`linkedPo.vendor`** — same reasoning |
| Post-create Quotation transition (`approved → billed`) | unchanged | **skipped** — nothing to transition; attempting it would throw a conflict (the Quotation was never `approved`) *after* the Bill had already been created |
| **New Phase 8 gate** | none — unaffected | `PurchaseOrder.requirement` set ⇒ a non-deleted `GoodsReceipt` must exist for that PO, or Bill creation is rejected with a 400 |

None of these four changes alter behavior for a single legacy quotation-only PO — every
existing legacy test (`bill` had zero pre-existing test coverage; `purchaseOrder.test.ts`'s 18
tests) still passes unmodified, and a new regression test locks in the legacy path explicitly.

## Validation

`createGoodsReceiptSchema` (Zod) — `purchaseOrder` (id), `receivedDate`, `items[]`
(`itemName`, `orderedQuantity`, `receivedQuantity`, `condition: good|damaged|short_supply`,
optional `remarks`), `overallCondition: good|damaged|partial`, optional `remarks`.
`purchaseOrder`/`poNumber`/`requirement`/`requirementNumber`/`vendor`/`department`/`createdBy`
are always derived server-side from the Purchase Order — never client-supplied.

## Database changes

- New collection `GoodsReceipt` (`goodsReceipt.model.ts`) — see fields above;
  `{ purchaseOrder: 1 }` unique index (one receipt per PO), `{ requirement: 1 }`,
  `{ department: 1, createdAt: -1 }`, `{ createdBy: 1, createdAt: -1 }`.
- `PurchaseOrder` (`purchaseOrder.model.ts`) — one new optional field: `goodsReceipt?: ObjectId`
  (ref `GoodsReceipt`), populated in `POPULATE_DETAIL` alongside the existing `bill` populate.
- New constants in `src/constants/status.ts`: `GRN_ITEM_CONDITION`
  (`good`/`damaged`/`short_supply`) and `GRN_OVERALL_CONDITION` (`good`/`damaged`/`partial`).
- No changes to `Bill`'s or `Quotation`'s schemas.

## API Endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/goods-receipts` | `{ purchaseOrder, receivedDate, items[], overallCondition, remarks? }` — Department User / HOD / Super Admin only (same roles as `PO_CREATE_ROLES`); ownership-scoped identically to PO generation (a Department User may only record against a PO they generated, an HOD only within their department) |
| GET | `/goods-receipts` | Paginated list, scoped per role (Department User: own; HOD: department; others: all, read-only) |
| GET | `/goods-receipts/:id` | Single receipt by id |
| GET | `/goods-receipts/by-po/:purchaseOrderId` | Returns the receipt for a PO, or `null` — used by the mobile app to decide "Record Goods Receipt" vs. "already recorded" |

`GET /purchase-orders/:id` and `GET /purchase-orders/by-requirement/:requirementId` now also
return a populated `goodsReceipt` (grnNumber, receivedDate, overallCondition) when one exists —
no new endpoint needed for that read.

## Mobile

- New feature folder `src/features/goodsReceipt/` (types, API slice, Zod form schema) —
  mirrors the `activityLog`/`aiAuditLog` feature-folder convention from the earlier
  production-readiness stages.
- **`RecordGoodsReceiptScreen`** (new) — registered inside the existing
  `PurchaseOrderStackParamList`/`PurchaseOrdersNavigator`, reached from a new "Record Goods
  Receipt" button on `PurchaseOrderDetailsScreen` (shown for Department User/HOD/Super Admin
  once a PO has no recorded receipt yet). Line items are fixed to the PO's own items
  (received quantity/condition/remarks per item, ordered quantity read-only) — not a free-form
  add/remove list, since a receipt is always against a specific PO's items. Uses
  `react-hook-form` + `zodResolver` + the shared `FormDateField`/`ChipSelect`/`FormTextField`
  primitives, matching the current form convention (`RequirementForm`, `BillForm`).
- **`PurchaseOrderDetailsScreen`** — two small additive sections only: a "Goods Receipt"
  summary card (GRN number/received date/condition) once recorded, and an informational card
  ("Goods Receipt required before a Bill can be created") when the PO is Requirement-originated
  and no receipt exists yet. No existing section was restructured.
- No changes to `CreateBillScreen`/Bill list/detail screens — the backend's 400 error message
  ("Goods Receipt must be recorded for this Purchase Order before a Bill can be created.")
  surfaces through the existing generic error-alert handling already in place there.

## Role Permissions

Same roles as Purchase Order generation — Department User / HOD / Super Admin may record a
Goods Receipt (ownership-scoped the same way); Director, CEO, Accounts, Payment Department
remain read-only.

## Testing

- `goodsReceipt.test.ts` (10 integration tests): legacy-PO regression (record against a
  quotation-only PO, duplicate-409, Director-forbidden-403, HOD-allowed, 404 for a
  non-existent PO, `by-po` before/after check) + Requirement-originated path (record against a
  Requirement-originated PO, denormalizes `requirement`/`requirementNumber` from the PO).
- `bill.test.ts` (new file — `bill.service.ts` had **zero pre-existing test coverage**, exactly
  like `purchaseOrder.service.ts` before Phase 7): legacy quotation-only PO Bill creation
  regression (Phase 8's gate must never apply), Requirement-originated PO Bill creation blocked
  until a Goods Receipt exists, then allowed once one is recorded.
- Backend: `npm run typecheck` clean, `npm test` → **198/198 passing** (was 188; +10 new).
- Frontend: `npx tsc --noEmit` clean, `npx jest` → 24/26 (the same 2 pre-existing, unrelated
  `ProfileScreen` failures present since before this phase — confirmed not a regression).

## Known Limitations / Deliberate Scope Boundaries

- One Goods Receipt per Purchase Order — partial/incremental receipts across multiple
  deliveries for the same PO are not supported. A second `POST /goods-receipts` for the same
  PO is rejected with 409. Disclosed, not silently limited.
- No separate "Goods Receipt Details" screen or list screen was built — the recorded summary
  (GRN number, date, condition) is shown inline on `PurchaseOrderDetailsScreen`, mirroring how
  "Linked Bill" is already shown there (also inline, no separate screen). Per-item
  condition/remarks are recorded and retrievable via the API but not yet surfaced in the
  mobile UI beyond the create form. A dedicated list screen (mirroring `ActivityLogListScreen`)
  is a natural, low-risk follow-up but was left out to keep this phase scoped to "implement
  only the Goods Receipt module."
- No new notification type was added beyond `goods_receipt_recorded` (Super Admins only,
  mirroring `po_generated`'s notify-Super-Admins-only pattern) — Department User/HOD are not
  separately notified of their own action, matching how PO generation itself doesn't
  self-notify its creator either.
- Postman collection (`VMS-GoodsReceipt.postman_collection.json`) builds its Happy Path on the
  legacy (quotation-only) PO flow for brevity — it does not re-run the full Phase 1-7
  Requirement pipeline. The Requirement-originated gate is covered by `bill.test.ts`/
  `goodsReceipt.test.ts` instead.
