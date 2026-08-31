const DiffRenderer = {
  render(data) {
    const leftContent = document.getElementById('left-content');
    const rightContent = document.getElementById('right-content');
    leftContent.replaceChildren();
    rightContent.replaceChildren();

    this.updateStats(data.stats, data.pageCount);

    for (const page of data.alignedPages) {
      leftContent.appendChild(this.renderPage(page, 'left'));
      rightContent.appendChild(this.renderPage(page, 'right'));
    }

    requestAnimationFrame(() => requestAnimationFrame(() => this.syncRowHeights()));
  },

  updateStats(stats, pageCount) {
    for (const key of ['added', 'removed', 'modified', 'unchanged']) {
      document.getElementById(`stat-${key}`).textContent = stats[key];
    }
    document.getElementById('page-count').textContent = `${pageCount.original} ↔ ${pageCount.modified} pages`;
  },

  renderPage(page, side) {
    const pageData = page[side];
    const card = document.createElement('article');
    card.className = `pdf-page page-${page.status}${pageData ? '' : ' missing-page'}`;
    card.dataset.pageIndex = page.index;
    card.setAttribute(
      'aria-label',
      `${side === 'left' ? 'Original' : 'Modified'} ${pageData ? `page ${pageData.pageNumber}` : 'page placeholder'}, ${page.status}`
    );

    const header = document.createElement('header');
    header.className = 'pdf-page-header';

    const label = document.createElement('span');
    label.className = 'page-label';
    label.textContent = pageData ? `Page ${pageData.pageNumber}` : 'No matching page';
    header.appendChild(label);

    const status = document.createElement('span');
    status.className = `page-status ${page.status}`;
    status.textContent = page.status;
    header.appendChild(status);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'pdf-page-body';
    for (const line of page.lines) body.appendChild(this.renderLine(line, side));

    if (!page.lines.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-page';
      empty.textContent = 'Blank page';
      body.appendChild(empty);
    }

    card.appendChild(body);
    return card;
  },

  renderLine(line, side) {
    const lineData = line[side];
    const row = document.createElement('div');
    row.className = `diff-line ${lineData ? lineData.status : 'placeholder'}`;
    row.dataset.lineIndex = line.index;

    const marker = document.createElement('span');
    marker.className = 'line-marker';
    marker.textContent = !lineData ? '' : lineData.status === 'added' ? '+' : lineData.status === 'removed' ? '−' : lineData.status === 'modified' ? '~' : '·';
    row.appendChild(marker);

    const content = document.createElement('p');
    content.className = 'line-content';
    if (!lineData) {
      content.setAttribute('aria-hidden', 'true');
    } else if (line.status === 'modified' && line.wordDiff) {
      this.appendWordDiff(content, line.wordDiff, side);
    } else {
      content.textContent = lineData.content;
    }
    row.appendChild(content);
    return row;
  },

  appendWordDiff(target, wordDiff, side) {
    for (const part of wordDiff) {
      if ((part.added && side === 'left') || (part.removed && side === 'right')) continue;
      if (!part.added && !part.removed) {
        target.appendChild(document.createTextNode(part.value));
        continue;
      }

      const span = document.createElement('span');
      span.className = part.added ? 'diff-word-added' : 'diff-word-removed';
      span.textContent = part.value;
      target.appendChild(span);
    }
  },

  syncRowHeights() {
    const leftPages = document.querySelectorAll('#left-content .pdf-page');
    const rightPages = document.querySelectorAll('#right-content .pdf-page');

    leftPages.forEach((leftPage, pageIndex) => {
      const rightPage = rightPages[pageIndex];
      if (!rightPage) return;

      const leftLines = leftPage.querySelectorAll('.diff-line');
      const rightLines = rightPage.querySelectorAll('.diff-line');
      for (let lineIndex = 0; lineIndex < Math.max(leftLines.length, rightLines.length); lineIndex++) {
        const leftLine = leftLines[lineIndex];
        const rightLine = rightLines[lineIndex];
        if (!leftLine || !rightLine) continue;
        leftLine.style.minHeight = '';
        rightLine.style.minHeight = '';
        const height = Math.max(leftLine.offsetHeight, rightLine.offsetHeight);
        leftLine.style.minHeight = `${height}px`;
        rightLine.style.minHeight = `${height}px`;
      }
    });
  },

  clear() {
    document.getElementById('left-content').replaceChildren();
    document.getElementById('right-content').replaceChildren();
  },
};
