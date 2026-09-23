/* ============================================================
   Devora — Quick Links Component
   Developer-focused quick links bar with SVG icons.
   ============================================================ */

const QuickLinksComponent = {
  container: null,
  links: [],

  async init() {
    this.container = document.getElementById('quicklinks-container');
    await this.loadLinks();
    this.render();
    this.bindEvents();
  },

  async loadLinks() {
    this.links = await StorageManager.getQuickLinks();
  },

  render() {
    if (!this.container) return;

    const addBtnHTML = this.links.length < 10 ? `
      <button class="quicklink quicklink-add-btn" title="Add Link">
        <span class="quicklink-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m-7-7h14"/></svg>
        </span>
        <span class="quicklink-name">Add Link</span>
      </button>
    ` : '';

    this.container.innerHTML = `
      <div class="quicklinks-bar">
        ${this.links.map(link => {
          const iconHTML = link.icon 
            ? link.icon 
            : `<img src="https://www.google.com/s2/favicons?domain=${link.url}&sz=64" alt="icon" style="width:16px; height:16px; border-radius:3px;">`;
          return `
            <div class="quicklink-wrapper" data-id="${link.id}">
              <a href="${link.url}" class="quicklink" title="${link.name}" target="_blank" rel="noopener noreferrer">
                <span class="quicklink-icon">${iconHTML}</span>
                <span class="quicklink-name">${Utils.escapeHtml(link.name)}</span>
              </a>
              <button class="quicklink-delete-btn" title="Remove Link">✕</button>
            </div>
          `;
        }).join('')}
        ${addBtnHTML}
      </div>
    `;
  },

  bindEvents() {
    // Add Link Modal
    this.container.addEventListener('click', (e) => {
      const addBtn = e.target.closest('.quicklink-add-btn');
      if (addBtn) {
        this.showAddModal();
      }

      const delBtn = e.target.closest('.quicklink-delete-btn');
      if (delBtn) {
        const wrapper = delBtn.closest('.quicklink-wrapper');
        if (wrapper && wrapper.dataset.id) {
          this.deleteLink(wrapper.dataset.id);
        }
      }
    });
  },

  showAddModal() {
    const modal = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');

    modalContent.innerHTML = `
      <div class="modal-card glass-card">
        <div class="modal-header">
          <h3>Add Quick Link</h3>
          <button class="btn-icon modal-close-btn" id="modal-close">✕</button>
        </div>
        <form id="quicklink-form" class="modal-form">
          <div class="form-group">
            <label>Name</label>
            <input type="text" id="ql-name" class="form-input" placeholder="e.g. Reddit" required autofocus>
          </div>
          <div class="form-group">
            <label>URL</label>
            <input type="url" id="ql-url" class="form-input" placeholder="https://..." required>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Add</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.add('active');

    setTimeout(() => { document.getElementById('ql-name')?.focus(); }, 150);

    const closeModal = () => modal.classList.remove('active');
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    document.getElementById('quicklink-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('ql-name').value.trim();
      let url = document.getElementById('ql-url').value.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      const newLink = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        name,
        url
      };
      
      this.links.push(newLink);
      await StorageManager.saveQuickLinks(this.links);
      this.render();
      closeModal();
    });
  },

  async deleteLink(id) {
    this.links = this.links.filter(l => l.id !== id);
    await StorageManager.saveQuickLinks(this.links);
    this.render();
  }
};
