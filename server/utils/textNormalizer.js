function normalize(text) {
  if (!text) return '';

  return String(text)
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2000-\u200b\u2028\u2029\u202f\u205f\u3000]/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text) {
  return normalize(text)
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];
}

function similarity(left, right) {
  const a = normalize(left);
  const b = normalize(right);

  if (a === b) return 1;
  if (!a || !b) return 0;

  const leftTokens = tokens(a);
  const rightTokens = tokens(b);
  if (!leftTokens.length || !rightTokens.length) return 0;

  const leftCounts = new Map();
  const rightCounts = new Map();
  for (const token of leftTokens) leftCounts.set(token, (leftCounts.get(token) || 0) + 1);
  for (const token of rightTokens) rightCounts.set(token, (rightCounts.get(token) || 0) + 1);

  let intersection = 0;
  let union = 0;
  const allTokens = new Set([...leftCounts.keys(), ...rightCounts.keys()]);
  for (const token of allTokens) {
    intersection += Math.min(leftCounts.get(token) || 0, rightCounts.get(token) || 0);
    union += Math.max(leftCounts.get(token) || 0, rightCounts.get(token) || 0);
  }

  return union ? intersection / union : 0;
}

module.exports = { normalize, similarity };
