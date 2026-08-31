const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePdf, groupTextItemsIntoLines } = require('../server/services/pdfParser');
const { createPdf } = require('./helpers/createPdf');

test('parsePdf extracts ordered text lines and page metadata', async () => {
  const result = await parsePdf(createPdf([['Quarterly report', 'Revenue was 100'], ['Closing notes']]));

  assert.equal(result.pageCount, 2);
  assert.deepEqual(
    result.pages.map((page) => page.lines.map((line) => line.content)),
    [['Quarterly report', 'Revenue was 100'], ['Closing notes']]
  );
  assert.deepEqual(
    result.pages.map(({ width, height }) => [width, height]),
    [[612, 792], [612, 792]]
  );
});

test('parsePdf rejects files without a PDF signature', async () => {
  await assert.rejects(() => parsePdf(Buffer.from('not a pdf')), /not a valid PDF/i);
});

test('parsePdf explains when a PDF has no text layer', async () => {
  await assert.rejects(() => parsePdf(createPdf([[]])), /scanned or image-only PDFs require OCR/i);
});

test('groupTextItemsIntoLines restores spaces between positioned fragments', () => {
  const items = [
    { str: 'Hello', transform: [1, 0, 0, 10, 20, 100], width: 25, height: 10 },
    { str: 'world', transform: [1, 0, 0, 10, 50, 100], width: 25, height: 10 },
    { str: 'Next line', transform: [1, 0, 0, 10, 20, 80], width: 40, height: 10 },
  ];

  assert.deepEqual(
    groupTextItemsIntoLines(items, 1).map((line) => line.content),
    ['Hello world', 'Next line']
  );
});
