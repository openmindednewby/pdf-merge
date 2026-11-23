# @dloizides/pdf-merge

Merge PDFs and PNG/JPEG images into one PDF, in input order. Built on [pdf-lib](https://github.com/Hopding/pdf-lib) (MIT, pinned `1.17.1`).

- PDF pages are copied as-is, so text stays selectable.
- Each image becomes one page sized to the image (1 px = 1 pt).
- Works in Node 18+, browsers and workers.

## Install

```bash
npm install @dloizides/pdf-merge
```

## Usage

```ts
import { mergeToPdf, PdfMergeError, PdfMergeFailure } from '@dloizides/pdf-merge';

const pdf = await mergeToPdf([
  { bytes: invoicePdf, mime: 'application/pdf' },
  { bytes: receiptPng, mime: 'image/png' },
  { bytes: receiptJpeg, mime: 'image/jpeg' },
]);
```

## API

### `mergeToPdf(parts: readonly MergePart[]): Promise<Uint8Array>`

| Field | Type | Meaning |
|-------|------|---------|
| `bytes` | `Uint8Array` | Raw file content |
| `mime` | `'application/pdf' \| 'image/png' \| 'image/jpeg'` | Type of `bytes` |

Rejects with `PdfMergeError` whose `reason` is:

| `PdfMergeFailure` | When |
|-------------------|------|
| `EmptyInput` | `parts` is empty |
| `UnsupportedMime` | a part has a mime outside the three above |

Nothing is built before the input is validated. Corrupt PDF or image bytes reject with pdf-lib's own error.

## License

MIT
