# Phase 3 — AI OCR Foundation

## Objective

Turn a quotation's uploaded attachment into structured data automatically: upload →
OCR → extracted text + structured fields, saved on the quotation and ready for Phase 4
(AI Comparison) to consume. This phase does **not** compare, score, or recommend
vendors — it only extracts and stores.

## Workflow

```
Upload PDF/Image → OCR Processing (auto, in background) → Extract Structured Data
→ Save on Quotation.ocr → Ready for AI Comparison (Phase 4)
```

Uploading an attachment (existing Phase 2 endpoint) now also fires OCR automatically in
the background — no separate "start OCR" call. `ocr.status` moves
`not_started → processing → completed | failed`. "Retry OCR" re-runs it on demand.

## Provider Abstraction

`src/services/ocr/ocrProvider.interface.ts` defines `OcrProvider` (`supports(mimeType)`,
`extractRawText(filePath, mimeType)`). Two providers implement it today:
- `pdfParseProvider` — local, offline, `pdf-parse` (same library the existing
  Bill-verification OCR already uses).
- `geminiVisionProvider` — images, reuses the existing `extractTextFromImage()` from
  `gemini.service.ts` (the same Gemini Vision call already used by Bill AI verification).

`quotationOcr.service.ts` selects a provider by mime type, gets raw text, then hands it to
`quotationOcrParser.ts` (new, Quotation-shaped — separate from the pre-existing
invoice/Bill parser) to extract structured fields. Adding OpenAI/Azure later means adding
one new file implementing `OcrProvider` and registering it — no change to the
orchestration or parsing logic.

## Database Changes

`Quotation` (existing collection) gains:
- `attachments[].fileHash` — SHA-256, rejects an exact duplicate re-upload.
- `ocr?: { status, attachmentVersion, provider, startedAt, completedAt, confidence,
  extractedText, structuredData, error }` — all optional, fully additive.
- `ocr.structuredData`: `vendorName, quotationNumber, quotationDate, currency, subtotal,
  gst, discount, grandTotal, items[]` (`items[]`: `description, quantity, unit,
  unitPrice, amount`).

`OCR_STATUS` added to `src/constants/status.ts`; `quotation_ocr_completed` /
`quotation_ocr_failed` added to `ActivityLog` actions and `Notification` types.

## API Endpoints

| Method | Path | Who | Change |
|---|---|---|---|
| POST | `/requirements/:id/quotations/:quotationId/attachments` | Department User, HOD | Existing — now also rejects duplicate file hashes and auto-starts OCR |
| POST | `/requirements/:id/quotations/:quotationId/ocr/retry` | Department User, HOD, Super Admin | New |
| GET | `/quotations/:id` | Any authenticated (scoped) | Existing — response now includes `ocr` |

## Mobile Screens

- `CreateRequirementQuotationScreen` — attachment picker now offers **Camera**,
  **Gallery** (`expo-image-picker`, already an installed dependency — plugin/permissions
  were already configured in `app.json`), and **File** (`expo-document-picker`, unchanged).
  Shows an indeterminate "Uploading attachment..." indicator during upload. On success,
  navigates straight to the OCR result screen instead of just going back.
- `QuotationOcrResultScreen` (new) — Processing (spinner), Completed (structured fields +
  items table + collapsible raw text + confidence/provider), Failed (error + Retry), and
  Not Started states. Polls `GET /quotations/:id` every 3s only while `status ===
  'processing'`, stopping itself the moment a poll returns a terminal status.
- `RequirementDetailsScreen` — each quotation card gained an OCR status badge
  (Not Started / Processing / Complete / Failed) that navigates to the result screen.

## Navigation

`QuotationOcrResult: { requirementId, quotationId }` added to `RequirementsStackParamList`
/ `RequirementsNavigator` — reached only from a quotation card's attachment row, no new
tab or drawer entry.

## Role Permissions

- **Department User**: upload (own requirement's quotations), retry OCR, view result.
- **HOD**: upload (department's quotations), retry OCR, view result.
- **Director**: read-only — can view `ocr` via `GET /quotations/:id` (existing
  unrestricted read), cannot upload or retry (403 on both, tested).
- **Super Admin**: full access, including retry (Department User/HOD upload restriction
  unchanged from Phase 2).

## Known Limitations

- Structured-field and line-item extraction is regex-based, best-effort — real scanned
  documents vary widely; `confidence` reflects how many fields were actually found, not a
  correctness guarantee. This is the intentional foundation Phase 4 builds a comparison
  view on top of, not a claim of perfect OCR accuracy.
- Upload progress is an indeterminate spinner, not a byte-level percentage — the existing
  `axiosBaseQuery` doesn't plumb through `onUploadProgress`, and wiring that in was out of
  scope for "extend, don't redesign."
- The mobile `NotificationType` union doesn't list `quotation_ocr_completed` /
  `quotation_ocr_failed` (pre-existing gap since Phase 1/2's own additions were never
  added either) — both fall back to the generic bell icon, not a crash.
- Gemini Vision OCR requires `GEMINI_API_KEY`; PDF OCR (`pdf-parse`) works fully offline.

## Preparation for Phase 4

`Quotation.ocr.structuredData` is the exact shape Phase 4 (AI Comparison) needs to line up
against a Requirement's `items[]` and budget — no schema change anticipated. Phase 4 is
expected to be a new comparison service reading `ocr.structuredData` across a
Requirement's quotations, not a modification of anything Phase 3 built.
