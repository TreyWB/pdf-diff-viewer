const Diff = require('diff');
const { normalize, similarity } = require('../utils/textNormalizer');

function diffPdfs(original, modified) {
  const pagePairs = alignSequences(original.pages, modified.pages, pageSimilarity, 0.12);
  const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };

  const alignedPages = pagePairs.map((pair, index) => {
    const leftPage = pair.left;
    const rightPage = pair.right;
    const linePairs = alignPageLines(leftPage, rightPage);
    const lines = linePairs.map((linePair, lineIndex) => buildLineDiff(linePair, lineIndex, stats));

    return {
      index,
      status: pageStatus(leftPage, rightPage, lines),
      left: leftPage ? pageSummary(leftPage) : null,
      right: rightPage ? pageSummary(rightPage) : null,
      lines,
    };
  });

  return {
    stats,
    pageCount: { original: original.pageCount, modified: modified.pageCount },
    alignedPages,
  };
}

function alignPageLines(leftPage, rightPage) {
  if (!leftPage) return rightPage.lines.map((right) => ({ left: null, right }));
  if (!rightPage) return leftPage.lines.map((left) => ({ left, right: null }));
  return alignSequences(leftPage.lines, rightPage.lines, lineSimilarity, 0.28);
}

function buildLineDiff(pair, index, stats) {
  if (!pair.left) {
    stats.added++;
    return { index, status: 'added', left: null, right: lineSummary(pair.right, 'added') };
  }
  if (!pair.right) {
    stats.removed++;
    return { index, status: 'removed', left: lineSummary(pair.left, 'removed'), right: null };
  }

  const leftText = normalize(pair.left.content);
  const rightText = normalize(pair.right.content);
  if (leftText === rightText) {
    stats.unchanged++;
    return {
      index,
      status: 'unchanged',
      left: lineSummary(pair.left, 'unchanged'),
      right: lineSummary(pair.right, 'unchanged'),
    };
  }

  stats.modified++;
  return {
    index,
    status: 'modified',
    left: lineSummary(pair.left, 'modified'),
    right: lineSummary(pair.right, 'modified'),
    wordDiff: Diff.diffWords(leftText, rightText).map((part) => ({
      value: part.value,
      added: Boolean(part.added),
      removed: Boolean(part.removed),
    })),
  };
}

function alignSequences(left, right, score, threshold) {
  const matches = longestCommonSubsequence(left, right, score, threshold);
  const aligned = [];
  let leftIndex = 0;
  let rightIndex = 0;

  for (const match of [...matches, { left: left.length, right: right.length }]) {
    alignUnmatchedRange(left, right, leftIndex, match.left, rightIndex, match.right, aligned);

    if (match.left < left.length && match.right < right.length) {
      aligned.push({ left: left[match.left], right: right[match.right] });
      leftIndex = match.left + 1;
      rightIndex = match.right + 1;
    }
  }

  return aligned;
}

function alignUnmatchedRange(left, right, leftStart, leftEnd, rightStart, rightEnd, aligned) {
  const leftCount = leftEnd - leftStart;
  const rightCount = rightEnd - rightStart;
  const pairedCount = Math.min(leftCount, rightCount);

  for (let index = 0; index < pairedCount; index++) {
    aligned.push({ left: left[leftStart + index], right: right[rightStart + index] });
  }
  for (let index = pairedCount; index < leftCount; index++) {
    aligned.push({ left: left[leftStart + index], right: null });
  }
  for (let index = pairedCount; index < rightCount; index++) {
    aligned.push({ left: null, right: right[rightStart + index] });
  }
}

function longestCommonSubsequence(left, right, score, threshold) {
  const matrix = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  const similarities = Array.from({ length: left.length }, () => Array(right.length).fill(0));

  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      similarities[i - 1][j - 1] = score(left[i - 1], right[j - 1]);
      if (similarities[i - 1][j - 1] >= threshold) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  const matches = [];
  let i = left.length;
  let j = right.length;
  while (i > 0 && j > 0) {
    if (similarities[i - 1][j - 1] >= threshold && matrix[i][j] === matrix[i - 1][j - 1] + 1) {
      matches.unshift({ left: i - 1, right: j - 1 });
      i--;
      j--;
    } else if (matrix[i - 1][j] > matrix[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return matches;
}

function lineSimilarity(left, right) {
  return similarity(left.content, right.content);
}

function pageSimilarity(left, right) {
  if (!left.content && !right.content) return 1;
  return similarity(left.content, right.content);
}

function lineSummary(line, status) {
  return { id: line.id, content: line.content, status };
}

function pageSummary(page) {
  return { pageNumber: page.pageNumber, width: page.width, height: page.height };
}

function pageStatus(left, right, lines) {
  if (!left) return 'added';
  if (!right) return 'removed';
  return lines.every((line) => line.status === 'unchanged') ? 'unchanged' : 'modified';
}

module.exports = { diffPdfs, alignSequences };
