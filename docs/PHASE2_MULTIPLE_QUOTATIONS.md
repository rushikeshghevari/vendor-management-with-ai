# Phase 2 — Multiple Quotations

## Objective

Let a submitted Requirement collect more than one quotation from different vendors,
without creating a formal Vendor record for each one — a Vendor is still only created
once a Director picks a final quotation (Phase 6). Phase 2 is additive: the existing
standalone Vendor → Quotation flow is untouched.

## Workflow

```
Requirement (submitted) → Add Quotation #1 (temporary vendor + attachment)
                        → Add Quotation #2, #3, ... → status: quotation_collection
```

A Requirement must be `submitted` (or already `quotation_collection` /
`quotation_comparison`) before a quotation can be added to it. The first quotation added
flips the Requirement's status from `submitted` to `quotation_collection`; later ones
don't change it further — that's Phase 5's job.

## Database Changes

`Quotation` (existing collection) gains three fields, all optional so the legacy
Vendor-based flow is unaffected:
- `requirement?: ObjectId` — back-reference; indexed `{ requirement: 1, createdAt: -1 }`
- `temporaryVendor?: { name, contactPerson?, phone?, email?, address? }` — used instead of
  `vendor` when there's no Vendor record yet
- `vendor` stays required-by-convention but is `undefined` for requirement-linked
  quotations

`GET /quotations` (the old list) excludes requirement-linked quotations by default
(`requirement: { $exists: false }`) so the existing Quotations screen is unchanged.

`Notification` gained one new type: `quotation_added` (Requirement section of the enum).

## API Endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/api/v1/requirements/:id/quotations` | Any authenticated (scoped by role) |
| POST | `/api/v1/requirements/:id/quotations` | Department User (own requirement), HOD |
| POST | `/api/v1/requirements/:id/quotations/:quotationId/attachments` | Department User, HOD |

## Mobile Screens

- `CreateRequirementQuotationScreen` — temporary vendor info, quotation details
  (date/amount/GST/currency/priority/terms), PDF/image attachment picker. Reached from
  `RequirementDetailsScreen`'s "Add Quotation" button.
- `RequirementDetailsScreen` — gained a Quotations section: search, status filter, sort
  (latest/lowest/highest), lowest/highest/average amount stat cards, per-quotation cards.

## Navigation

`CreateRequirementQuotation` added to `RequirementsStackParamList` /
`RequirementsNavigator` — no new tab or drawer entry; it's reached only from within a
Requirement's own details screen.

## Role Permissions

- **Department User**: add quotations to their own submitted requirement.
- **HOD**: add quotations to any requirement in their department.
- **Director, Super Admin**: view only (Super Admin has full API access but the UI's "Add
  Quotation" button is gated to owner/HOD, same as the API's `authorize()`).

## Notifications & Activity Log

Adding a quotation notifies the department's HOD (unless the HOD is the one who added it)
and every active Super Admin — same fan-out and `notifyUsers`/`findActiveUsersByRole`
pattern as `requirement_submitted`. Message includes the quotation number, amount,
requirement number, and department name; `sender` and `createdAt` carry the acting user
and timestamp, same as every other notification in the system. An activity log entry
(`quotation_created`) is recorded on every add.

## Known Limitations

- The mobile `NotificationType`/`TYPE_ICON` union (`src/features/notifications/types.ts`)
  was never updated for Phase 1's `requirement_submitted` and doesn't include Phase 2's
  `quotation_added` either — both fall back to a generic bell icon (`NotificationCard.tsx`
  already has a `?? 'notifications-outline'` fallback, so this is cosmetic, not a crash).
- No dedicated edit/delete screen for a requirement-linked quotation yet — only create.
- Adding a quotation doesn't yet notify the Requirement's original creator if someone
  else (an HOD) adds it — only HOD + Super Admin are notified, per spec.

## Preparation for Phase 3

`Quotation.attachments` (PDF/image, versioned) is already populated by this phase's
upload endpoint — Phase 3 (AI OCR) reads the latest attachment version per quotation and
extracts vendor/pricing/line-item data into the same `temporaryVendor`/`amount`/`gst`
fields this phase already writes by hand. No schema change anticipated; Phase 3 is
expected to be a new service that populates existing fields, not new ones.
