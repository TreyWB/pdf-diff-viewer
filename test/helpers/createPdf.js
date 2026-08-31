function escapePdfText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function createPdf(pages) {
  const objects = new Map();
  const pageRefs = pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ');

  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(2, `<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`);

  pages.forEach((lines, index) => {
    const pageObject = 3 + index * 2;
    const contentObject = pageObject + 1;
    const operations = ['BT', '/F1 12 Tf', '72 720 Td'];

    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) operations.push('0 -20 Td');
      operations.push(`(${escapePdfText(line)}) Tj`);
    });
    operations.push('ET');

    const stream = `${operations.join('\n')}\n`;
    objects.set(
      pageObject,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObject} 0 R >>`
    );
    objects.set(contentObject, `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`);
  });

  let pdf = '%PDF-1.4\n%PDFDIFF\n';
  const offsets = [0];
  const objectCount = objects.size;
  for (let objectNumber = 1; objectNumber <= objectCount; objectNumber++) {
    offsets[objectNumber] = Buffer.byteLength(pdf);
    pdf += `${objectNumber} 0 obj\n${objects.get(objectNumber)}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objectCount + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let objectNumber = 1; objectNumber <= objectCount; objectNumber++) {
    pdf += `${String(offsets[objectNumber]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'binary');
}

module.exports = { createPdf };
