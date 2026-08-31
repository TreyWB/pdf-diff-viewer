const { normalize } = require('../utils/textNormalizer');
const path = require('node:path');

const MAX_PAGES = 250;
const MAX_LINES_PER_PAGE = 2000;
const MAX_TOTAL_LINES = 50000;
let pdfjsPromise;
const standardFontDataUrl = `${path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts')}${path.sep}`;

function loadPdfjs() {
  pdfjsPromise ||= import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
}

async function parsePdf(buffer) {
  validatePdfHeader(buffer);

  let document;
  try {
    const pdfjs = await loadPdfjs();
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      isEvalSupported: false,
      standardFontDataUrl,
      useSystemFonts: false,
    });
    document = await loadingTask.promise;
  } catch (error) {
    throw friendlyPdfError(error);
  }

  if (document.numPages > MAX_PAGES) {
    await document.destroy();
    throw clientError(`PDFs are limited to ${MAX_PAGES} pages.`);
  }

  try {
    const pages = [];
    let totalLines = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent({ includeMarkedContent: false });
      const lines = groupTextItemsIntoLines(textContent.items, pageNumber);

      if (lines.length > MAX_LINES_PER_PAGE) {
        throw clientError(`Page ${pageNumber} contains too many text lines to compare safely.`);
      }
      totalLines += lines.length;
      if (totalLines > MAX_TOTAL_LINES) {
        throw clientError(`PDFs are limited to ${MAX_TOTAL_LINES.toLocaleString()} extracted text lines.`);
      }

      pages.push({
        pageNumber,
        width: Math.round(viewport.width * 100) / 100,
        height: Math.round(viewport.height * 100) / 100,
        lines,
        content: lines.map((line) => line.content).join('\n'),
      });
      page.cleanup();
    }

    if (!pages.some((page) => page.lines.length > 0)) {
      throw clientError(
        'No extractable text was found. Scanned or image-only PDFs require OCR, which this viewer does not perform.'
      );
    }

    return { pageCount: document.numPages, pages };
  } catch (error) {
    if (error.statusCode) throw error;
    throw friendlyPdfError(error);
  } finally {
    await document.destroy();
  }
}

function validatePdfHeader(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5) {
    throw clientError('The uploaded file is empty or is not a valid PDF.');
  }

  const prefix = buffer.subarray(0, Math.min(buffer.length, 1024)).toString('latin1');
  if (!prefix.includes('%PDF-')) {
    throw clientError('The uploaded file is not a valid PDF.');
  }
}

function friendlyPdfError(error) {
  const name = error?.name || '';
  const message = error?.message || '';

  if (name === 'PasswordException' || /password/i.test(message)) {
    return clientError('Password-protected PDFs are not supported. Remove the password and try again.');
  }
  if (name === 'InvalidPDFException' || /invalid pdf/i.test(message)) {
    return clientError('The uploaded file is damaged or is not a valid PDF.');
  }
  return Object.assign(new Error(`Unable to read PDF: ${message || 'unknown PDF error'}`), {
    statusCode: 400,
  });
}

function clientError(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function groupTextItemsIntoLines(items, pageNumber) {
  const positioned = items
    .filter((item) => typeof item.str === 'string' && normalize(item.str))
    .map((item, order) => ({
      text: item.str,
      x: Number(item.transform?.[4]) || 0,
      y: Number(item.transform?.[5]) || 0,
      width: Number(item.width) || 0,
      height: Math.abs(Number(item.height) || Number(item.transform?.[3]) || 10),
      hasEOL: Boolean(item.hasEOL),
      order,
    }))
    .sort((a, b) => {
      const yTolerance = Math.max(2, Math.min(a.height, b.height) * 0.35);
      if (Math.abs(a.y - b.y) > yTolerance) return b.y - a.y;
      return a.x - b.x || a.order - b.order;
    });

  const lineGroups = [];
  for (const item of positioned) {
    const tolerance = Math.max(2, item.height * 0.35);
    let line = lineGroups.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (!line) {
      line = { y: item.y, height: item.height, items: [] };
      lineGroups.push(line);
    }
    line.items.push(item);
    line.height = Math.max(line.height, item.height);
  }

  lineGroups.sort((a, b) => b.y - a.y);

  return lineGroups
    .map((line, index) => {
      line.items.sort((a, b) => a.x - b.x || a.order - b.order);
      let content = '';
      let previous = null;

      for (const item of line.items) {
        if (previous && shouldInsertSpace(previous, item, content)) content += ' ';
        content += item.text;
        previous = item;
      }

      return {
        id: `p${pageNumber}-l${index + 1}`,
        content: normalize(content),
        y: Math.round(line.y * 100) / 100,
        fontSize: Math.round(line.height * 100) / 100,
      };
    })
    .filter((line) => line.content);
}

function shouldInsertSpace(previous, current, existingText) {
  if (/\s$/.test(existingText) || /^\s/.test(current.text)) return false;

  const gap = current.x - (previous.x + previous.width);
  const spaceThreshold = Math.max(1.25, Math.min(previous.height, current.height) * 0.12);
  return gap > spaceThreshold;
}

module.exports = { parsePdf, groupTextItemsIntoLines };
