const App = {
  init() {
    FileUpload.init();
    ScrollSync.init();
    document.getElementById('compare').addEventListener('click', () => this.handleCompare());
    document.getElementById('reset').addEventListener('click', () => this.handleReset());
    window.addEventListener('resize', () => DiffRenderer.syncRowHeights());
  },

  showView(view) {
    document.body.classList.remove('compare-view', 'loading-view');
    if (view === 'compare') document.body.classList.add('compare-view');
    if (view === 'loading') document.body.classList.add('loading-view');
  },

  async handleCompare() {
    const error = document.getElementById('error');
    const names = FileUpload.getFileNames();
    error.style.display = 'none';
    this.showView('loading');

    try {
      const result = await FileUpload.upload();
      document.getElementById('left-header').textContent = names.original;
      document.getElementById('right-header').textContent = names.modified;
      DiffRenderer.render(result);
      this.showView('compare');
      ScrollSync.reset();
    } catch (errorResponse) {
      error.textContent = errorResponse.message;
      error.style.display = 'block';
      this.showView('landing');
    }
  },

  handleReset() {
    DiffRenderer.clear();
    FileUpload.reset();
    for (const key of ['added', 'removed', 'modified', 'unchanged']) {
      document.getElementById(`stat-${key}`).textContent = '0';
    }
    document.getElementById('page-count').textContent = '0 ↔ 0 pages';
    document.getElementById('error').style.display = 'none';
    this.showView('landing');
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
