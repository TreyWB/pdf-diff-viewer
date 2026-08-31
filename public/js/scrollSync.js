const ScrollSync = {
  leftPanel: null,
  rightPanel: null,
  activeSource: null,
  releaseTimer: null,

  init() {
    this.leftPanel = document.getElementById('left-content');
    this.rightPanel = document.getElementById('right-content');
    this.leftPanel.addEventListener('scroll', () => this.handleScroll(this.leftPanel, this.rightPanel));
    this.rightPanel.addEventListener('scroll', () => this.handleScroll(this.rightPanel, this.leftPanel));
  },

  handleScroll(source, target) {
    if (this.activeSource && this.activeSource !== source) return;
    this.activeSource = source;

    requestAnimationFrame(() => {
      const sourceRange = source.scrollHeight - source.clientHeight;
      const targetRange = target.scrollHeight - target.clientHeight;
      target.scrollTop = sourceRange > 0 ? (source.scrollTop / sourceRange) * targetRange : 0;
      target.scrollLeft = source.scrollLeft;

      clearTimeout(this.releaseTimer);
      this.releaseTimer = setTimeout(() => {
        this.activeSource = null;
      }, 60);
    });
  },

  reset() {
    for (const panel of [this.leftPanel, this.rightPanel]) {
      if (!panel) continue;
      panel.scrollTop = 0;
      panel.scrollLeft = 0;
    }
    this.activeSource = null;
  },
};
