# Phase 6 — Vendor Registration

## Objective

Give a Department User (or Super Admin) a way to turn a Director-approved Requirement into
a real Vendor record — reading the Requirement, its AI Comparison's recommended (winning)
quotation, and its Director Review's approval, pre-filling as much of the vendor form as
that data allows, and letting the user verify/complete the rest before saving. This phase
never creates a Purchase Order, never modifies AI Comparison or Director Review, and never
re-runs OCR; it only reads that data once, at registration time.

## One deliberate deviation from the literal spec, flagged explicitly

The spec says **"Manual vendor creation must not be allowed."** This codebase already has a
pre-existing, fully manual `POST /vendors` endpoint (`vendor.routes.ts`) used by the
standalone Quotation flow's "No Active Vendor Found → Add Vendor" prompt — completely
unrelated to the Requirement → AI Comparison → Director Review pipeline this phase adds.
Removing or gating that endpoint would break existing, already-shipped functionality, which
the brief explicitly forbids ("Do NOT modify or break any existing functionality").

**Resolution:** Phase 6 adds a *new, separate, additive* pathway —
`POST /requirements/:id/vendor-registration` — that is the *only* way to create a Vendor
from this pipeline, and it enforces every constraint the spec asks for (Approved Requirement
required, winning quotation resolved server-side only, no client-supplied vendor selection).
The pre-existing generic `POST /vendors` endpoint is untouched, still reachable, and still
serves the Quotation flow exactly as before — "manual creation" is disallowed *for this
pipeline specifically*, which is the only interpretation consistent with not breaking
Phases 1–5's shipped behavior.

## Workflow

```
Requirement → Multiple Quotations → OCR → AI Comparison → Director Approval
→ Vendor Registration → Ready for Purchase Order
```

`Requirement.status` transitions `approved → vendor_finalized` on a successful registration
— `vendor_finalized` was declared in Phase 1's status enum and explicitly flagged in Phase
5's docs as "declared but unreachable until Phase 6 wires it." Phase 6 is that wiring; Phase
7 (Purchase Order) is expected to pick up from `vendor_finalized`.

## Vendor Creation — what's read, what's derived

- **Requirement**: must be scoped to the caller (Department User: own; Super Admin: any)
  and currently `approved` — 400 otherwise.
- **AI Comparison**: the *latest* comparison for the requirement is read (never
  regenerated); its `recommendation.quotation` is the winning quotation. If a comparison
  somehow has no resolved recommendation, the earliest quotation on the requirement is used
  as a defensive fallback — registration is never hard-blocked by that edge case.
- **Director Review**: must have `decision === 'approved'` — 400 otherwise (belt-and-braces
  check; in practice `Requirement.status === 'approved'` already implies this, since only
  `directorReviewService.decide('approved')` ever sets that status).
- **Pre-fill**: the winning quotation's `temporaryVendor` (name/contactPerson/phone/
  email/address) seeds the form — GST/PAN/bank details are never present in OCR or
  quotation data, so those fields always start blank for the user to fill in and verify.

## Vendor Details — schema additions

`Vendor` (`vendor.model.ts`) gained these fields, all **optional/defaulted** so every
pre-existing vendor (and the still-active manual-creation path) needs no changes:

| Field | Notes |
|---|---|
| `country` | Defaults `'India'`. Not spec-listed as a Vendor field on any other screen in this app (state/district/city are always India-specific `GEOGRAPHY_DATA` dropdowns) — stored per the spec's field list, but not exposed as a new mobile picker. |
| `documents[]` | `{ type: gst_certificate\|pan_card\|cancelled_cheque\|msme_certificate, fileName, url, mimeType, uploadedAt }` |
| `registrationStatus` | `pending_documents \| registered`. `registered` only once GST Certificate + PAN Card + Cancelled Cheque are *all* present — MSME is the one document the spec marks optional, so it never gates this. |
| `createdFromRequirement` | Unique + sparse index — one Requirement can only ever produce one registered vendor; sparse so manually-created vendors (which never set this) are unaffected. |
| `createdFromQuotation` | The AI Comparison's winning quotation. |
| `approvedByDirector` | The Director (or Super Admin acting as one) who approved the Director Review. |

`Vendor Code`, `Company Name` (`name`), `Contact Person`, `Email`, `Phone`, `GST Number`,
`PAN Number`, `Address`, `City`, `State`, `PIN Code`, `Bank Name`, `Account Number`, `IFSC
Code`, `UPI` all already existed on `Vendor` from before this phase — reused as-is.

## Validation — duplicate prevention

`vendorRegistrationService.register()` rejects (before creating anything):
- **GST / PAN / Email** — checked with a single `$or` query against the *entire* Vendor
  collection (catches a collision with a vendor from the pre-existing manual flow too), 409
  with a message naming which field collided.
- **Vendor Code** — never client-supplied; generated fresh per registration via the
  existing atomic-counter `generateVendorCode()` (now exported from `vendor.service.ts`),
  so it can never collide.
- **Already registered for this requirement** — checked *before* the approved-status gate
  (see below), 409.

An interesting ordering bug was caught during integration testing: checking "is this
requirement Approved?" before "has a vendor already been registered?" meant a *second*
registration attempt against the same requirement got a confusing `400 not approved`
instead of `409 already registered` — because the first successful registration had already
advanced the requirement to `vendor_finalized`. Fixed by checking for an existing vendor
first, since that condition is the more specific and permanent one.

## Backend

New module `src/modules/vendorRegistration/`:
- `vendorRegistration.validation.ts` — `registerVendorSchema` (zod), same field-level rules
  as `vendor.validation.ts`'s `createVendorSchema` (GST/PAN/IFSC/pincode/phone/UPI regexes),
  plus optional `country`/`category` (defaulted server-side since the mobile form reuses the
  existing `VendorForm`/`vendorSchema` as-is and doesn't collect them explicitly).
- `vendorRegistration.service.ts` — `getRegisteredVendor()` (read-only, all 4 roles,
  scoped) and `register()` (Department User/Super Admin only; approved-requirement +
  approved-review + duplicate + already-registered checks; creates the Vendor; advances
  `Requirement.status`).
- `vendorRegistration.controller.ts` — collects the four multipart document fields into
  `IVendorDocument[]`, fires `vendor_registered` activity log + notification fan-out.
- `vendorRegistration.routes.ts` — mounted at the same `/requirements` prefix as
  requirement/comparison/directorReview routes (Express supports multiple routers sharing
  a mount prefix).

**Document upload**: `uploadVendorDocuments` (new multer config in `upload.middleware.ts`,
mirroring `uploadQuotationAttachment`'s disk-storage + PDF/PNG/JPG mime filter, 10MB limit)
uses `.fields([...])` for the four named slots (`gstCertificate`, `panCard`,
`cancelledCheque`, `msmeCertificate`) so all vendor-detail text fields and up to four files
arrive in a single `multipart/form-data` POST. Files land in `uploads/vendors/` (added to
`server.ts`'s `ensureUploadDirs()`), served statically at `/uploads/vendors/...` via the
existing generic `express.static('/uploads')` mount.

## API Endpoints

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/requirements/:id/vendor-registration` | Department User (own), HOD (department), Director, Super Admin | Returns the vendor already registered for this requirement. 404 if none yet — the normal starting state, not an error condition. |
| POST | `/requirements/:id/vendor-registration` | Department User (own), Super Admin | `multipart/form-data`: vendor detail fields + up to 4 document files. 400 if the requirement isn't Approved or has no comparison/review; 403 for HOD/Director; 409 if already registered or a GST/PAN/email duplicate exists. |

Both routes are additive — `vendor.routes.ts` (the pre-existing generic Vendor CRUD used by
the Quotation flow) is completely unchanged.

Notification fan-out on a successful registration: the department's HOD, the approving
Director, and every active Super Admin — read-only stakeholders in the pipeline informed,
same "who cares about this decision" logic as Phase 5's approval notifications.

## Mobile

One new screen, `VendorRegistrationScreen.tsx`, implementing all five of the spec's named
screens as internal steps of a single wizard (Details → Documents → Review → Success) —
this codebase's convention for a linear "create X" flow is one screen with a form
(`CreateRequirementScreen`, `CreateQuotationScreen`), not a chain of stack routes for a
single action, so that convention is kept here rather than introducing four new navigator
entries for one flow.

- **Details step** — reuses the existing `VendorForm`/`vendorSchema` component verbatim
  (the same form the manual "Add Vendor" screen uses), passing `defaultValues` derived from
  the AI Comparison's winning quotation's `temporaryVendor` info. The user can edit
  everything before continuing.
- **Documents step** — four `VendorDocumentPicker` slots (new component, mirrors
  `QuotationPdfUploadCard`'s stage-then-upload-on-save pattern) — GST Certificate, PAN Card,
  Cancelled Cheque, MSME Certificate (labeled optional).
- **Review step** — read-only summary of every entered field and attached document, plus
  the final "Confirm & Register" action that assembles one `multipart/form-data` request.
- **Success step** — vendor code, name, registration status, approving Director. Also
  rendered automatically (regardless of local wizard state) whenever a vendor already exists
  for this requirement, so revisiting the screen after a successful registration — or
  opening it from a different device — shows the result instead of restarting the wizard.
- **Requirement Details screen** — gained a "Vendor Registration" entry point, visible once
  `Requirement.status` is `approved` or `vendor_finalized` (button reads "Register Vendor"
  vs. "View Vendor" accordingly).

No new prefill endpoint was needed on the backend — the screen reuses the existing Phase 5
`useGetDirectorReviewQuery` (already returns requirement + comparison + quotations) to
derive both the winning quotation and the pre-fill data, rather than duplicating that
read logic in a new endpoint.

## Role Permissions

- **Department User**: create a vendor from their own Approved requirement.
- **HOD**: read only (can view an already-registered vendor; 403 on the create endpoint).
- **Director**: read only (same).
- **Super Admin**: full access — can register from any requirement (RBAC override, same
  pattern as every prior phase).

## Testing

- `vendorRegistration.validation.test.ts` (18 unit tests) — every required field's absence
  rejected, GST/PAN/IFSC/pincode/phone/UPI regex enforcement, optional fields omittable,
  case-normalization (GST/PAN/IFSC uppercased, email lowercased) on parse.
- `vendorRegistration.test.ts` (17 integration/permission/duplicate/workflow tests) —
  registration blocked before approval; HOD/Director forbidden (403); Department User and
  Super Admin can register (201); requirement advances to `vendor_finalized`;
  `createdFromRequirement`/`createdFromQuotation`/`approvedByDirector` all correctly linked;
  activity log + 3-way notification fan-out (HOD/Director/Super Admin); registration status
  derived correctly from which documents were attached; a second registration attempt for
  the same requirement is rejected (409); duplicate GST/PAN/email across *different*
  requirements is rejected (409); request body validation surfaces as 400; GET returns the
  registered vendor to all four roles once one exists.
- Backend: `npm run typecheck` clean, `npm test` → **156/156 passing** (was 121; +35 new).
- Frontend: `npx tsc --noEmit` clean, `npx jest` → 24/26 (the same 2 pre-existing, unrelated
  `ProfileScreen` failures present since before this phase — confirmed not a regression).

## Known Limitations

- `country` is stored (defaults `'India'`) but not exposed as a distinct mobile form field —
  consistent with the rest of the app, which has no India-vs-other-country concept anywhere
  else (state/district/city are all sourced from an India-only `GEOGRAPHY_DATA` dataset).
- `category` on a Requirement-derived vendor defaults from the reused `VendorForm`'s own
  default (`'Pharmaceutical'`) rather than anything requirement-specific — the spec's Vendor
  Details list doesn't call out `category` as a Phase 6 field at all; it's inherited from the
  pre-existing Vendor schema's own requiredness.
- Notifications on registration are fire-and-forget (same pattern as every prior phase) — a
  failure to notify never blocks or reverses the created vendor.

## Preparation for Phase 7

`Requirement.status = 'vendor_finalized'` is the hand-off point — Phase 7 (Purchase Order)
is expected to read the now-registered `Vendor` (via `Vendor.createdFromRequirement`) plus
the original `Requirement`/`Comparison` to generate a Purchase Order. `closed` remains a
declared-but-unreachable `Requirement.status`, same "declared now, wired later" pattern used
since Phase 1.
