# Phase 7 — Purchase Order

## Objective

Let a Purchase Order be generated directly from a `vendor_finalized` Requirement — reading
the registered Vendor (Phase 6) and its winning Quotation server-side, never letting the
client pick either — while leaving the original "pick an Approved Quotation, type the line
items" flow (used since before this workflow existed) completely untouched. Also adds real
email delivery of the generated PO PDF to the vendor, on top of the existing on-device share
sheet. Neither Goods Receipt nor `billService.create()` are touched in this phase.

## Workflow

```
Requirement → Multiple Quotations → OCR → AI Comparison → Director Approval
→ Vendor Registration → Purchase Order (this phase) → Ready for Goods Receipt (Phase 8)
```

`PurchaseOrder` gains two new **optional** fields — `requirement` and `requirementNumber` —
set only when the PO was generated via the new path. Every other field, including
`quotation`/`quotationCode`/`vendor`/`vendorName`/etc., is populated **exactly the same way**
for both origins (see "Design decision" below) — nothing downstream needed to learn a new
shape.

## Design decision: reusing the existing `quotation` field instead of relaxing it

The obvious-looking approach — make `PurchaseOrder.quotation` optional so a
Requirement-originated PO can omit it — turned out to be unnecessary and riskier than the
alternative. Phase 6's registered `Vendor` already stores `createdFromQuotation`: the exact
winning `Quotation` (from the AI Comparison's recommendation) that vendor was registered
from. So a Requirement-originated PO simply **resolves down to that same Quotation** and
proceeds through the rest of `purchaseOrderService.create()` almost unchanged:

- `PurchaseOrder.quotation` stays `required: true, unique: true` — **zero schema risk** to
  the legacy path, and the one-PO-per-Quotation unique index transitively gives
  one-PO-per-Requirement for free (a Requirement has exactly one registered Vendor with
  exactly one winning Quotation).
- `getById()`'s outstanding-balance calculation (queries `Payment` by `po.quotation`) needed
  **no changes** — `quotation` is always populated.
- `pdf.service.ts`'s "Quotation Ref" line needed **no structural changes** — only a small
  addition appending `(Requirement: REQ-...)` when applicable.
- The only genuinely new logic is: resolve `requirementId → Vendor.findOne({
  createdFromRequirement }) → vendor.createdFromQuotation`, and read vendor
  name/GST/address from that `Vendor` document instead of the populated `quotation.vendor`
  (which is never set for a Requirement-linked quotation — those always use
  `temporaryVendor` instead, per Phase 2).

## What's shared vs. what branches, in `purchaseOrderService.create()`

| Step | Legacy (quotationId) | New (requirementId) |
|---|---|---|
| Resolve target Quotation | `input.quotationId` directly | `Vendor.findOne({createdFromRequirement}).createdFromQuotation` |
| Approval gate | `quotation.status` must be `approved`/`billed` | `Requirement.status` must be `vendor_finalized` (the Quotation itself is never individually approved in this pipeline — Director Review approves the Requirement as a whole) |
| Vendor snapshot source | populated `quotation.vendor` | the Phase 6 registered `Vendor` document |
| Uniqueness check | `PurchaseOrder.findOne({quotation})` | same query — reused as-is |
| Line items / totals | entirely client-supplied, server only re-sums | same — the mobile app pre-fills from `Requirement.items` (see Mobile below), but the server has no knowledge of that; it treats the submitted `items[]` identically either way |
| Role gate | `DEPARTMENT_USER, HOD, SUPER_ADMIN` | same `PO_CREATE_ROLES` — **no additional ownership scoping** was added for the Requirement lookup, deliberately matching the legacy path's own lack of ownership scoping on the Quotation lookup (any of those three roles can generate a PO for any Requirement/Quotation they can name, today) |

## Validation

`createPurchaseOrderSchema` — `quotationId` and `requirementId` are now both optional, with
a `superRefine` requiring **exactly one**. `items`, `terms`, `notes` are unchanged.

## Email Integration

New optional integration — `src/services/email/email.service.ts` — SMTP via `nodemailer`,
following the exact same "optional external service, graceful no-op when unconfigured"
pattern already used for Firebase push (`firebase.service.ts`) and Gemini AI: reads
`SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` directly
from `process.env`, warns once and returns `{ sent: false, reason: 'SMTP not configured' }`
if unset — **never throws**, so a PO's lifecycle is never blocked by email being unset or a
send failing.

`POST /purchase-orders/:id/email` generates the same PDF `downloadPdf` uses
(`generatePurchaseOrderPdf`), resolves a recipient (`Vendor.email` on file, or an explicit
`recipientEmail` override in the body), sends it as an attachment, and always records a
`po_emailed` activity log entry (`newValue.sent` reflects the true outcome) — distinct from
the pre-existing `share` endpoint, which is audit-only and never actually sends anything
(the OS share sheet on-device does the real work there).

## Database changes

`PurchaseOrder` (`purchaseOrder.model.ts`) — two new optional fields, one new non-unique
index:
- `requirement?: ObjectId` (ref `Requirement`)
- `requirementNumber?: string`
- `{ requirement: 1 }` index (not unique — uniqueness already comes from the existing
  `quotation` unique index, transitively)

No changes to `Bill`, `Quotation`, `Vendor`, or any other existing schema.

## API Endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/purchase-orders` | Now accepts `requirementId` as an alternative to `quotationId` (exactly one required) |
| GET | `/purchase-orders/by-requirement/:requirementId` | New — mirrors `by-quotation/:quotationId`; used by the mobile "does a PO already exist" check |
| POST | `/purchase-orders/:id/email` | New — `{ recipientEmail? }`, Department User / HOD / Super Admin only, `data.sent` reflects the true outcome |

Every other existing endpoint (`list`, `getById`, `getByQuotation`, `verify`, `pdf`, `share`,
`stats`) is completely unchanged.

## Mobile

- **`CreatePurchaseOrderScreen`** — a new `requirementId` route param switches the screen
  into Requirement mode: the Quotation-picker dropdown is replaced with read-only
  Requirement/Vendor info (fetched via the existing `useGetRequirementByIdQuery` and Phase
  6's `useGetRegisteredVendorQuery` — no new backend prefill endpoint needed), and line
  items are pre-filled once from `Requirement.items` (name/quantity/rate → editable, same
  "pre-fill and let the user verify" pattern Vendor Registration established). Submission
  sends `{ requirementId, items, terms?, notes? }` instead of `{ quotationId, ... }`.
- **`RequirementDetailsScreen`** — a new "Purchase Order" card, visible once
  `status === 'vendor_finalized'`, mirroring the AI Comparison / Director Review / Vendor
  Registration cards exactly. Uses the new `useGetPurchaseOrderByRequirementQuery` to decide
  "Generate Purchase Order" vs. "View Purchase Order", and cross-tab-navigates into the
  `PurchaseOrders` tab's stack (same `getParent<BottomTabNavigationProp<...>>()` pattern
  already used by `AddVendorScreen`'s `returnTo` hand-off).
- **`PurchaseOrderDetailsScreen`** — a "Requirement" row in the PO Details card when
  `requirementNumber` is present, and a new "Email to Vendor" action button alongside the
  existing Download/Share buttons, reporting the true `sent`/`reason` outcome via an alert.

## Role Permissions

Unchanged from the original flow — Department User / HOD / Super Admin can generate a PO
(from either origin); Director, CEO, Accounts, Payment Department remain read-only. Email
sending uses the same three creator roles.

## Testing

Since `purchaseOrder.service.ts` had **zero pre-existing test coverage**, this phase adds a
full regression safety net alongside the new-path tests:

- `purchaseOrder.validation.test.ts` (9 unit tests) — exactly-one-of `quotationId`/
  `requirementId` enforced, item defaults, `emailPurchaseOrderSchema`.
- `purchaseOrder.test.ts` (18 integration tests):
  - **Legacy regression** (6): full quotation-approval-to-PO happy path, duplicate-PO 409,
    not-yet-approved 400, Director forbidden 403, missing-both-ids validation 400,
    `getById`/`getByQuotation` correctness — all against the *original* flow, proving it is
    unaffected.
  - **Requirement path** (6): full pipeline-to-PO happy path (asserting `requirement`/
    `requirementNumber`/resolved vendor/quotation), not-yet-`vendor_finalized` 400,
    duplicate-PO 409, missing-Requirement 404, HOD-allowed/Director-forbidden parity with
    the legacy role gate, `by-requirement` before/after check.
  - **Email** (4): SMTP-unconfigured `sent:false` + activity log recorded, explicit
    recipient override, Director forbidden, missing-PO 404.
  - **Model invariant** (1): a legacy PO's `requirement`/`requirementNumber` are genuinely
    `undefined` at the document level, not just absent from the API response.
- `email.service.test.ts` (4 unit tests) — no-ops without throwing when unconfigured (never
  calls `nodemailer.createTransport`), sends successfully once configured (mocked
  transporter), reports a failed send as `{sent:false, reason}` instead of throwing, and
  `sendPurchaseOrderEmail` builds the correct subject/attachment.
- Backend: `npm run typecheck` clean, `npm test` → **187/187 passing** (was 156; +31 new).
- Frontend: `npx tsc --noEmit` clean, `npx jest` → 24/26 (the same 2 pre-existing, unrelated
  `ProfileScreen` failures present since before this phase — confirmed not a regression).

## Known Limitations / Deliberate Scope Boundaries

- No ownership/department scoping was added to the Requirement lookup in `create()` — this
  deliberately mirrors the legacy path's own lack of scoping on the Quotation lookup (any
  Department User/HOD/Super Admin who knows the id can act on it). Not a new gap introduced
  by this phase.
- `billService.create()` was **not modified** — a Requirement-originated PO unlocks Bill
  creation exactly the same way a legacy one does today (existence of a non-deleted PO for
  the Quotation). Per this phase's explicit scope, Goods Receipt gating is deferred to
  Phase 8.
- Email is fire-and-forget from the caller's perspective but **not** fire-and-forget at the
  code level like activity logs/notifications elsewhere — the HTTP response waits for the
  send attempt to finish (success or failure) so `data.sent` is always accurate, since the
  entire point of this endpoint is reporting that outcome to the user.

## Preparation for Phase 8

Every PO now optionally carries `requirement`, giving Phase 8 (Goods Receipt & Inspection) a
precise way to scope its gate: per the earlier round of clarifying questions, Goods Receipt
is expected to become a hard prerequisite for Bill creation **only** when
`PurchaseOrder.requirement` is set — a legacy quotation-only PO continues straight to Bill
exactly as it does today.
