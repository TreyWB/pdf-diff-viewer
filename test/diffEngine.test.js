const test = require('node:test');
const assert = require('node:assert/strict');
const { diffPdfs } = require('../server/services/diffEngine');

function document(...pages) {
  return {
    pageCount: pages.length,
    pages: pages.map((lines, pageIndex) => ({
      pageNumber: pageIndex + 1,
      width: 612,
      height: 792,
      content: lines.join('\n'),
      lines: lines.map((content, lineIndex) => ({ id: `p${pageIndex + 1}-l${lineIndex + 1}`, content })),
    })),
  };
}

test('diffPdfs reports line and word-level changes', () => {
  const result = diffPdfs(
    document(['Agreement', 'The total is 100 dollars.', 'Old line']),
    document(['Agreement', 'The total is 125 dollars.', 'New line', 'Added note'])
  );

  assert.deepEqual(result.stats, { added: 1, removed: 0, modified: 2, unchanged: 1 });
  assert.equal(result.alignedPages[0].status, 'modified');

  const changedTotal = result.alignedPages[0].lines[1];
  assert.equal(changedTotal.status, 'modified');
  assert.ok(changedTotal.wordDiff.some((part) => part.removed && part.value.includes('100')));
  assert.ok(changedTotal.wordDiff.some((part) => part.added && part.value.includes('125')));
});

test('diffPdfs aligns an inserted page without shifting following pages', () => {
  const result = diffPdfs(
    document(['Cover'], ['Terms and conditions'], ['Signature page']),
    document(['Cover'], ['Inserted appendix'], ['Terms and conditions'], ['Signature page'])
  );

  assert.deepEqual(
    result.alignedPages.map((page) => [page.left?.pageNumber || null, page.right?.pageNumber || null]),
    [[1, 1], [null, 2], [2, 3], [3, 4]]
  );
  assert.equal(result.stats.added, 1);
});

test('identical PDFs produce only unchanged lines', () => {
  const input = document(['One', 'Two'], ['Three']);
  const result = diffPdfs(input, input);

  assert.deepEqual(result.stats, { added: 0, removed: 0, modified: 0, unchanged: 3 });
  assert.ok(result.alignedPages.every((page) => page.status === 'unchanged'));
});
