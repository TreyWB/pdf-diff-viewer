# PDF Diff Viewer

A lightweight web application for comparing the extractable text in two PDF files with a page-aware, side-by-side diff.

It follows the same Express + static JavaScript structure and visual language as the sibling DOCX and XLSX diff viewers. PDFs are processed in memory by the local Node process and are never written to disk.

## Quick start

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000), choose an original and modified PDF, and select **Compare PDFs**.

Node.js 20.19 or newer is required.

To use another port:

```bash
npm start -- --port=4173
```

## What it compares

- Pages are sequence-aligned so inserted or removed pages do not shift the rest of the comparison.
- Extracted text lines are aligned within each page.
- Changed lines receive word-level added/removed highlighting.
- The two document panels scroll together.

## Limits

- Maximum file size: 25MB per PDF.
- Maximum document length: 250 pages.
- Password-protected PDFs are not supported.
- Scanned or image-only PDFs need OCR first; this app deliberately does not guess at visual differences when no text layer exists.
- PDF text extraction follows the reading order encoded in the file. Complex multi-column layouts may not match their visual reading order perfectly.

## Tests

```bash
npm test
```

The test suite covers PDF extraction, page/line alignment, word-level changes, and the upload API.

## Release build

Create a runtime-only npm package in `release/`:

```bash
npm run build
```

The generated `pdf-diff-viewer-1.0.0.tgz` contains the server, browser assets, package metadata, and README. Tests and development-only files are excluded.
