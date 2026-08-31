const FileUpload = {
  originalFile: null,
  modifiedFile: null,

  init() {
    for (const type of ['original', 'modified']) {
      const input = document.getElementById(type);
      const wrapper = document.getElementById(`${type}-wrapper`);
      const button = wrapper.querySelector('.file-button');

      button.addEventListener('click', () => input.click());
      input.addEventListener('change', (event) => this.handleFile(event.target.files[0], type));

      wrapper.addEventListener('dragover', (event) => {
        event.preventDefault();
        wrapper.classList.add('drag-over');
      });
      wrapper.addEventListener('dragleave', () => wrapper.classList.remove('drag-over'));
      wrapper.addEventListener('drop', (event) => {
        event.preventDefault();
        wrapper.classList.remove('drag-over');
        this.handleFile(event.dataTransfer.files[0], type);
      });
    }
  },

  handleFile(file, type) {
    const input = document.getElementById(type);
    const name = document.getElementById(`${type}-name`);
    const wrapper = document.getElementById(`${type}-wrapper`);
    const action = wrapper.querySelector('.file-action');

    if (!file) {
      this.clearFile(type);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      this.showError('Please select a .pdf file');
      input.value = '';
      this.clearFile(type);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      this.showError('PDFs must be 25MB or smaller');
      input.value = '';
      this.clearFile(type);
      return;
    }

    this[`${type}File`] = file;
    name.textContent = file.name;
    name.title = file.name;
    action.textContent = 'Change file';
    wrapper.classList.add('has-file');
    document.getElementById('error').style.display = 'none';
    this.updateCompareButton();
  },

  clearFile(type) {
    const wrapper = document.getElementById(`${type}-wrapper`);
    this[`${type}File`] = null;
    const name = document.getElementById(`${type}-name`);
    name.textContent = 'No file selected';
    name.title = '';
    wrapper.querySelector('.file-action').textContent = 'Choose file';
    wrapper.classList.remove('has-file');
    this.updateCompareButton();
  },

  updateCompareButton() {
    document.getElementById('compare').disabled = !(this.originalFile && this.modifiedFile);
  },

  getFileNames() {
    return {
      original: this.originalFile?.name || 'Original',
      modified: this.modifiedFile?.name || 'Modified',
    };
  },

  async upload() {
    if (!this.originalFile || !this.modifiedFile) {
      throw new Error('Please select both PDF files');
    }

    const body = new FormData();
    body.append('original', this.originalFile);
    body.append('modified', this.modifiedFile);

    const response = await fetch('/api/diff', { method: 'POST', body });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('The comparison server returned an invalid response');
    }

    if (!response.ok) throw new Error(data.error || 'Failed to compare PDFs');
    return data;
  },

  reset() {
    for (const type of ['original', 'modified']) {
      document.getElementById(type).value = '';
      this.clearFile(type);
    }
  },

  showError(message) {
    const error = document.getElementById('error');
    error.textContent = message;
    error.style.display = 'block';
  },
};
