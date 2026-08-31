const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');
const { createPdf } = require('./helpers/createPdf');

test('POST /api/diff compares two uploaded PDFs', async (t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const form = new FormData();
  form.append('original', new Blob([createPdf([['Hello world']])], { type: 'application/pdf' }), 'original.pdf');
  form.append('modified', new Blob([createPdf([['Hello brave world']])], { type: 'application/pdf' }), 'modified.pdf');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/diff`, { method: 'POST', body: form });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.success, true);
  assert.equal(result.stats.modified, 1);
  assert.equal(result.alignedPages[0].lines[0].status, 'modified');
});

test('POST /api/diff requires both PDFs', async (t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const form = new FormData();
  form.append('original', new Blob([createPdf([['Hello']])], { type: 'application/pdf' }), 'original.pdf');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/diff`, { method: 'POST', body: form });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /both original and modified/i);
});
