/* ============================================================
   Devora — Sticky Notes Component
   Floating draggable sticky notes with Google Account Sync,
   color themes, auto-save, category panel, and responsive launcher.
   ============================================================ */

const NotesComponent = {
  notes: [],
  googleUser: null,
  container: null,
  isPanelOpen: false,
  panelCategory: 'all',
  selectedAddColor: 'yellow',

  async init() {
    this.container = document.getElementById('notes-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notes-container';
      this.container.className = 'notes-canvas-container';
      document.body.appendChild(this.container);
    }


    await this.loadNotes();
    this.render();
    this.bindLauncherButton();
    this.bindGlobalShortcuts();
  },

  async loadNotes() {
    this.notes = await StorageManager.getNotes();
  },

  bindLauncherButton() {
    let launcher = document.getElementById('notes-widget-launcher');
    if (!launcher) {
      launcher = document.createElement('button');
      launcher.id = 'notes-widget-launcher';
      launcher.className = 'notes-widget-launcher';
      launcher.title = 'Toggle Notes Box (Press N)';
      document.body.appendChild(launcher);
    }
    this.updateLauncherBadge();

    launcher.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePanelBox();
    });
  },

  updateLauncherBadge() {
    const launcher = document.getElementById('notes-widget-launcher');
    if (!launcher) return;
    const count = this.notes.length;
    launcher.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <span>Notes</span>
      <span class="notes-launcher-badge">${count}</span>
    `;
  },

  togglePanelBox() {
    if (this.isPanelOpen) {
      this.closePanelBox();
    } else {
      this.openPanelBox();
    }
  },

  openPanelBox() {
    this.isPanelOpen = true;
    this.renderPanelBox();
  },

  closePanelBox() {
    this.isPanelOpen = false;
    const panel = document.getElementById('notes-floating-panel');
    if (panel) {
      // Clean up outside-click handler
      if (panel._outsideHandler) {
        document.removeEventListener('click', panel._outsideHandler);
        panel._outsideHandler = null;
      }
      panel.classList.remove('active');
      setTimeout(() => panel.remove(), 250);
    }
  },

  bindGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'n' || e.key === 'N') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        e.preventDefault();
        this.addNote();
      }
    });
  },

  async addNote(noteData = {}) {
    this.notes = await StorageManager.addNote({ pinned: true, ...noteData });
    this.render();
    if (this.isPanelOpen) this.renderPanelBox();
    this.updateLauncherBadge();

    // Focus newly created note title input
    const latestNote = this.notes[this.notes.length - 1];
    if (latestNote) {
      setTimeout(() => {
        const input = this.container.querySelector(`.sticky-note-card[data-id="${latestNote.id}"] .note-title-input`);
        if (input) {
          input.focus();
          input.select();
        }
      }, 100);
    }
  },

  /* ========== FLOATING PANEL BOX (Matching Tasks Widget Design) ========== */
  async renderPanelBox() {
    let panel = document.getElementById('notes-floating-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'notes-floating-panel';
      panel.className = 'notes-floating-panel glass-card';
      document.body.appendChild(panel);
    }

    const trashNotes = await StorageManager.getTrashNotes();
    const colorCounts = {
      all: this.notes.length,
      yellow: this.notes.filter(n => (n.color || 'yellow') === 'yellow').length,
      mint: this.notes.filter(n => n.color === 'mint').length,
      cyan: this.notes.filter(n => n.color === 'cyan').length,
      pink: this.notes.filter(n => n.color === 'pink').length,
      purple: this.notes.filter(n => n.color === 'purple').length,
      trash: trashNotes.length
    };

    let displayNotes = this.notes;
    let categoryTitle = 'All Notes';
    let categoryIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;

    if (isTrashMode) {
      displayNotes = trashNotes;
      categoryTitle = 'Trash Box';
      categoryIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    } else if (this.panelCategory === 'keep') {
      categoryTitle = 'Google Keep Notes';
      categoryIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 21h6v-1.5H9V21zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" fill="#FBBF24"/><path d="M12 4a5 5 0 0 0-5 5c0 1.95.99 3.65 2.5 4.63V15h5v-1.37c1.51-.98 2.5-2.68 2.5-4.63a5 5 0 0 0-5-5z" fill="#F59E0B"/></svg>`;
    } else if (this.panelCategory !== 'all') {
      displayNotes = this.notes.filter(n => (n.color || 'yellow') === this.panelCategory);
      categoryTitle = `${this.panelCategory.charAt(0).toUpperCase() + this.panelCategory.slice(1)} Notes`;
      categoryIcon = `<span class="note-color-badge dot-${this.panelCategory}"></span>`;
    }

    panel.innerHTML = `
      <div class="panel-layout">
        <!-- Sidebar -->
        <aside class="panel-sidebar">
          <div class="sidebar-header">
            <div class="sidebar-header-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="sidebar-header-icon-glow">
                <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span class="sidebar-title">Sticky Notes</span>
            </div>
            <button class="panel-action-icon-btn" id="notes-sidebar-add-btn" title="Create New Note">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          <nav class="sidebar-menu">
            <button class="sidebar-menu-item ${this.panelCategory === 'all' ? 'active' : ''}" data-ncat="all">
              <span class="sidebar-item-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </span>
              <span class="sidebar-item-label">All Notes</span>
              <span class="sidebar-item-count">${colorCounts.all}</span>
            </button>
            <button class="sidebar-menu-item ${this.panelCategory === 'yellow' ? 'active' : ''}" data-ncat="yellow">
              <span class="sidebar-item-icon"><span class="sidebar-color-glow dot-yellow"></span></span>
              <span class="sidebar-item-label">Yellow</span>
              ${colorCounts.yellow > 0 ? `<span class="sidebar-item-count">${colorCounts.yellow}</span>` : ''}
            </button>
            <button class="sidebar-menu-item ${this.panelCategory === 'mint' ? 'active' : ''}" data-ncat="mint">
              <span class="sidebar-item-icon"><span class="sidebar-color-glow dot-mint"></span></span>
              <span class="sidebar-item-label">Mint</span>
              ${colorCounts.mint > 0 ? `<span class="sidebar-item-count">${colorCounts.mint}</span>` : ''}
            </button>
            <button class="sidebar-menu-item ${this.panelCategory === 'cyan' ? 'active' : ''}" data-ncat="cyan">
              <span class="sidebar-item-icon"><span class="sidebar-color-glow dot-cyan"></span></span>
              <span class="sidebar-item-label">Cyan</span>
              ${colorCounts.cyan > 0 ? `<span class="sidebar-item-count">${colorCounts.cyan}</span>` : ''}
            </button>
            <button class="sidebar-menu-item ${this.panelCategory === 'pink' ? 'active' : ''}" data-ncat="pink">
              <span class="sidebar-item-icon"><span class="sidebar-color-glow dot-pink"></span></span>
              <span class="sidebar-item-label">Pink</span>
              ${colorCounts.pink > 0 ? `<span class="sidebar-item-count">${colorCounts.pink}</span>` : ''}
            </button>
            <button class="sidebar-menu-item ${this.panelCategory === 'purple' ? 'active' : ''}" data-ncat="purple">
              <span class="sidebar-item-icon"><span class="sidebar-color-glow dot-purple"></span></span>
              <span class="sidebar-item-label">Purple</span>
              ${colorCounts.purple > 0 ? `<span class="sidebar-item-count">${colorCounts.purple}</span>` : ''}
            </button>            <div class="sidebar-section-divider">
              <span>TRASH & ARCHIVE</span>
            </div>

            <button class="sidebar-menu-item ${this.panelCategory === 'trash' ? 'active' : ''}" data-ncat="trash">
              <span class="sidebar-item-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </span>
              <span class="sidebar-item-label">Trash Box</span>
              ${colorCounts.trash > 0 ? `<span class="sidebar-item-count sidebar-item-count--red">${colorCounts.trash}</span>` : ''}
            </button>
          </nav>
        </aside>

        <!-- Main Content -->
        <main class="panel-main">
          <header class="panel-header">
            <div class="panel-header-left">
              <span class="panel-header-icon">${categoryIcon}</span>
              <h3 class="panel-header-title">${categoryTitle}</h3>
              ${!isTrashMode ? `<span class="panel-header-count-chip">${displayNotes.length}</span>` : ''}
            </div>
            <div class="panel-header-right">
              ${isTrashMode && trashNotes.length > 0 ? `
                <button class="panel-hdr-action panel-hdr-danger" id="notes-empty-trash-btn" title="Empty Notes Trash Box Permanently">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  <span>Clean Trash</span>
                </button>
              ` : ''}
              ${!isTrashMode ? `
                <button class="panel-hdr-icon-btn" id="notes-expand-all" title="Pin all notes to desktop canvas">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                </button>
              ` : ''}
              <button class="panel-hdr-icon-btn" id="notes-close-x" title="Close Panel">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </header>

          <div class="panel-content-body">
            ${displayNotes.length === 0 ? `
              <div class="panel-empty-inbox">
                <div class="inbox-graphic-icon">
                  ${isTrashMode ? `
                    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  ` : `
                    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  `}
                </div>
                <p class="panel-empty-title">${isTrashMode ? 'Notes Trash Box is empty' : `No notes in ${categoryTitle}`}</p>
                <p class="panel-empty-sub">${isTrashMode ? 'Deleted notes will appear here' : 'Use the quick input below or press N to take a note'}</p>
              </div>` : `
              <div class="panel-tasks-list">
                ${displayNotes.map(n => isTrashMode ? `
                  <div class="panel-task-row trash-row note-panel-row" data-id="${n.id}">
                    <span class="note-color-badge dot-${n.color || 'yellow'}"></span>
                    <div class="trash-row-info">
                      <span class="panel-task-text">${Utils.escapeHtml(n.title || 'Untitled Note')}</span>
                      <span class="trash-row-meta">${n.deletedAt ? 'Deleted ' + Utils.relativeTime(n.deletedAt) : 'Deleted'}</span>
                    </div>
                    <div class="trash-row-actions">
                      <button class="trash-restore-btn" data-naction="restore" data-id="${n.id}" title="Restore Note">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.62"/></svg>
                        <span>Restore</span>
                      </button>
                      <button class="trash-perm-del-btn" data-naction="perm-delete" data-id="${n.id}" title="Delete Permanently">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </div>
                ` : `
                  <div class="panel-task-row note-panel-row" data-id="${n.id}" title="Double-click to pin to screen">
                    <span class="note-color-badge dot-${n.color || 'yellow'}"></span>
                    <div class="note-panel-info">
                      <div class="panel-task-title-line">
                        <span class="panel-task-text">${Utils.escapeHtml(n.title || 'Untitled Note')}</span>
                        ${n.pinned !== false ? '<span class="panel-pinned-badge" title="Pinned to desktop screen">📌</span>' : ''}
                      </div>
                      <span class="note-snippet-text">${Utils.escapeHtml((n.content || '').slice(0, 55)) || 'Empty note…'}</span>
                    </div>
                    <div class="panel-row-actions">
                      <button class="panel-action-icon-btn ${n.pinned !== false ? 'active-pin' : ''}" data-naction="pin" data-id="${n.id}" title="${n.pinned !== false ? 'Unpin from desktop screen' : 'Pin to desktop screen'}">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="${n.pinned !== false ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="12" y1="17" x2="12" y2="22"></line>
                          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24z"></path>
                        </svg>
                      </button>
                      <button class="panel-task-del" data-naction="delete" data-id="${n.id}" title="Move Note to Trash">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>`
            }
          </div>

          <footer class="panel-footer">
            ${isTrashMode ? `
              <div class="panel-trash-footer-note">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
                <span>Items in Notes Trash Box can be restored or permanently cleaned</span>
              </div>
            ` : `
              <form class="panel-add-form" id="notes-panel-add-form">
                <div class="note-color-picker-row">
                  <button type="button" class="color-dot dot-yellow ${this.selectedAddColor === 'yellow' ? 'active' : ''}" data-pick-color="yellow" title="Yellow"></button>
                  <button type="button" class="color-dot dot-mint ${this.selectedAddColor === 'mint' ? 'active' : ''}" data-pick-color="mint" title="Mint"></button>
                  <button type="button" class="color-dot dot-cyan ${this.selectedAddColor === 'cyan' ? 'active' : ''}" data-pick-color="cyan" title="Cyan"></button>
                  <button type="button" class="color-dot dot-pink ${this.selectedAddColor === 'pink' ? 'active' : ''}" data-pick-color="pink" title="Pink"></button>
                  <button type="button" class="color-dot dot-purple ${this.selectedAddColor === 'purple' ? 'active' : ''}" data-pick-color="purple" title="Purple"></button>
                </div>
                <input type="text" id="notes-panel-add-input" class="panel-add-input" placeholder="New ${this.selectedAddColor} note title…" autocomplete="off" required>
                <button type="submit" class="btn btn-sm btn-primary">Add Note</button>
              </form>
            `}
          </footer>
        </main>
      </div>
    `;

    requestAnimationFrame(() => panel.classList.add('active'));

    // Outside-click handler: close panel when clicking outside panel and launcher
    if (panel._outsideHandler) {
      document.removeEventListener('click', panel._outsideHandler);
      panel._outsideHandler = null;
    }
    setTimeout(() => {
      const outsideHandler = (e) => {
        const launcher = document.getElementById('notes-widget-launcher');
        if (panel.contains(e.target)) return;
        if (launcher && launcher.contains(e.target)) return;
        this.closePanelBox();
      };
      document.addEventListener('click', outsideHandler);
      panel._outsideHandler = outsideHandler;
    }, 50);

    // Sidebar Category switching
    panel.querySelectorAll('.sidebar-menu-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.panelCategory = btn.dataset.ncat;
        this.renderPanelBox();
      });
    });

    // Sidebar quick add button
    panel.querySelector('#notes-sidebar-add-btn')?.addEventListener('click', () => {
      this.addNote({ title: 'New Note', color: this.selectedAddColor || 'yellow', pinned: true });
    });

    // Close and Expand All buttons
    document.getElementById('notes-close-x')?.addEventListener('click', () => this.closePanelBox());
    document.getElementById('notes-expand-all')?.addEventListener('click', () => {
      this.notes.forEach(n => n.pinned = true);
      this.saveAndRefresh();
      this.closePanelBox();
    });

    // Empty Trash button
    document.getElementById('notes-empty-trash-btn')?.addEventListener('click', async () => {
      const confirmed = await Utils.confirm({
        title: 'Empty Notes Trash',
        message: 'Are you sure you want to permanently delete all notes in Trash Box? This cannot be undone.',
        confirmText: 'Empty Trash',
        type: 'danger'
      });
      if (confirmed) {
        await StorageManager.emptyNotesTrash();
        this.renderPanelBox();
      }
    });

    // Double-click row (only when not in trash mode)
    if (!isTrashMode) {
      panel.querySelector('.panel-content-body')?.addEventListener('dblclick', async (e) => {
        const row = e.target.closest('.note-panel-row');
        if (row && row.dataset.id) {
          this.notes = await StorageManager.updateNote(row.dataset.id, { pinned: true });
          this.render();
          this.renderPanelBox();
        }
      });
    }

    // Action buttons inside panel
    panel.querySelector('.panel-content-body')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-naction]');
      if (!btn) return;
      const action = btn.dataset.naction;
      const id = btn.dataset.id;
      if (action === 'pin') {
        const note = this.notes.find(n => n.id === id);
        const newPinnedStatus = !(note && note.pinned !== false);
        this.notes = await StorageManager.updateNote(id, { pinned: newPinnedStatus });
        this.render();
        this.renderPanelBox();
      } else if (action === 'delete') {
        const confirmed = await Utils.confirm({
          title: 'Move Note to Trash',
          message: 'Are you sure you want to delete this note? It will be moved to the Trash box.',
          confirmText: 'Delete',
          type: 'danger'
        });
        if (confirmed) {
          this.notes = await StorageManager.deleteNote(id);
          this.render();
          this.renderPanelBox();
          this.updateLauncherBadge();
        }
      } else if (action === 'restore') {
        await StorageManager.restoreNoteFromTrash(id);
        this.notes = await StorageManager.getNotes();
        this.render();
        this.renderPanelBox();
        this.updateLauncherBadge();
      } else if (action === 'perm-delete') {
        const confirmed = await Utils.confirm({
          title: 'Permanently Delete Note',
          message: 'Are you sure you want to permanently delete this note? This cannot be undone.',
          confirmText: 'Delete Permanently',
          type: 'danger'
        });
        if (confirmed) {
          await StorageManager.deleteNotePermanently(id);
          this.renderPanelBox();
        }
      }
    });

    // Color picker in add form
    panel.querySelectorAll('[data-pick-color]').forEach(dot => {
      dot.addEventListener('click', () => {
        this.selectedAddColor = dot.dataset.pickColor;
        panel.querySelectorAll('[data-pick-color]').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const input = document.getElementById('notes-panel-add-input');
        if (input) {
          input.placeholder = `New ${this.selectedAddColor} note title…`;
          input.focus();
        }
      });
    });

    // Inline form submit
    if (!isTrashMode) {
      document.getElementById('notes-panel-add-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('notes-panel-add-input');
        const title = input.value.trim();
        if (!title) return;
        await this.addNote({ title, color: this.selectedAddColor || 'yellow', pinned: true });
        this.renderPanelBox();
      });
    }
  },

  async saveAndRefresh() {
    await StorageManager.saveNotes(this.notes);
    this.render();
  },

  /* ========== FULL WINDOW CANVAS RENDER ========== */
  render() {
    if (!this.container) return;

    // Filter pinned/active notes visible on full window canvas area
    const canvasNotes = this.notes.filter(n => n.pinned !== false);

    if (canvasNotes.length === 0) {
      this.container.innerHTML = '';
      return;
    }

    this.container.innerHTML = canvasNotes.map(note => this._renderNoteHTML(note)).join('');
    this.bindNoteEvents();
  },

  _renderNoteHTML(note) {
    const color = note.color || 'yellow';
    const isSynced = this.googleUser && this.googleUser.signedIn;
    const stylePos = `style="position: fixed; left: ${note.x}px; top: ${note.y}px; z-index: 65; width: ${note.width || 300}px; height: ${note.height || 260}px;"`;

    return `
      <div class="sticky-note-card note-theme-${color}" data-id="${note.id}" ${stylePos}>
        <div class="note-header">
          <div class="note-drag-handle" title="Drag sticky note anywhere on full window canvas">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="8" cy="7" r="1.2" fill="currentColor"/>
              <circle cx="16" cy="7" r="1.2" fill="currentColor"/>
              <circle cx="8" cy="14" r="1.2" fill="currentColor"/>
              <circle cx="16" cy="14" r="1.2" fill="currentColor"/>
            </svg>
          </div>

          <!-- Color palette picker -->
          <div class="note-color-picker">
            <button class="color-dot dot-yellow ${color === 'yellow' ? 'active' : ''}" data-color="yellow" title="Yellow"></button>
            <button class="color-dot dot-mint ${color === 'mint' ? 'active' : ''}" data-color="mint" title="Mint"></button>
            <button class="color-dot dot-cyan ${color === 'cyan' ? 'active' : ''}" data-color="cyan" title="Cyan"></button>
            <button class="color-dot dot-pink ${color === 'pink' ? 'active' : ''}" data-color="pink" title="Pink"></button>
            <button class="color-dot dot-purple ${color === 'purple' ? 'active' : ''}" data-color="purple" title="Purple"></button>
          </div>

          <div class="note-header-actions">
            <!-- Google Sync Badge -->
            <span class="note-sync-indicator ${isSynced ? 'synced' : ''}" title="${isSynced ? `Synced with Google Account (${this.googleUser.email})` : 'Click to connect Google Account'}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path>
              </svg>
            </span>

            <button class="btn-icon note-btn-add" data-naction="add" title="New Note (+)">+</button>
            <button class="btn-icon note-btn-dock" data-naction="dock" title="Dock back into Floating Notes Box">📥</button>
            <button class="btn-icon note-btn-del" data-naction="delete" title="Delete Note">✕</button>
          </div>
        </div>

        <div class="note-body">
          <input type="text" class="note-title-input" value="${Utils.escapeHtml(note.title)}" placeholder="Note Title…" data-id="${note.id}">
          <textarea class="note-content-input" placeholder="Type thoughts or details…" data-id="${note.id}">${Utils.escapeHtml(note.content || '')}</textarea>
        </div>
      </div>
    `;
  },

  bindNoteEvents() {
    if (!this.container) return;

    // Free-form Drag positioning
    this.container.querySelectorAll('.sticky-note-card').forEach(card => {
      const id = card.dataset.id;

      card.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('.color-dot')) {
          return;
        }

        const rect = card.getBoundingClientRect();
        const isResizeCorner = (e.clientX >= rect.right - 24) && (e.clientY >= rect.bottom - 24);
        if (isResizeCorner) return;

        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const cardRect = card.getBoundingClientRect();

        card.style.position = 'fixed';
        card.style.left = `${cardRect.left}px`;
        card.style.top = `${cardRect.top}px`;
        card.style.zIndex = '10005';
        card.classList.add('note-dragging');

        const initialLeft = parseFloat(card.style.left) || cardRect.left;
        const initialTop = parseFloat(card.style.top) || cardRect.top;

        const onMouseMove = (moveEv) => {
          const deltaX = moveEv.clientX - startX;
          const deltaY = moveEv.clientY - startY;
          const maxLeft = Math.max(0, window.innerWidth - 60);
          const maxTop = Math.max(0, window.innerHeight - 30);
          const newLeft = Math.max(0, Math.min(maxLeft, initialLeft + deltaX));
          const newTop = Math.max(0, Math.min(maxTop, initialTop + deltaY));

          card.style.left = `${newLeft}px`;
          card.style.top = `${newTop}px`;
        };

        const onMouseUp = async () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          card.classList.remove('note-dragging');
          card.style.zIndex = '65';

          const finalLeft = Math.round(parseFloat(card.style.left));
          const finalTop = Math.round(parseFloat(card.style.top));
          this.notes = await StorageManager.updateNote(id, { x: finalLeft, y: finalTop });
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      // ResizeObserver
      if (window.ResizeObserver && !card._hasResizeObs) {
        card._hasResizeObs = true;
        let initialSkip = true;
        const ro = new ResizeObserver(entries => {
          if (initialSkip) { initialSkip = false; return; }
          for (let entry of entries) {
            const w = Math.round(entry.target.offsetWidth);
            const h = Math.round(entry.target.offsetHeight);
            clearTimeout(card._resizeTimer);
            card._resizeTimer = setTimeout(async () => {
              this.notes = await StorageManager.updateNote(id, { width: w, height: h });
            }, 400);
          }
        });
        ro.observe(card);
      }

      // Color dots
      card.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', async () => {
          const color = dot.dataset.color;
          this.notes = await StorageManager.updateNote(id, { color });
          this.render();
          if (this.isPanelOpen) this.renderPanelBox();
        });
      });

      // Header buttons (+, dock, delete)
      card.querySelectorAll('[data-naction]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const action = btn.dataset.naction;
          if (action === 'add') {
            this.addNote();
          } else if (action === 'dock') {
            // Hide off full window canvas and dock back into panel box
            this.notes = await StorageManager.updateNote(id, { pinned: false });
            this.render();
            if (this.isPanelOpen) this.renderPanelBox();
          } else if (action === 'delete') {
            const confirmed = await Utils.confirm({
              title: 'Move Note to Trash',
              message: 'Are you sure you want to delete this note? It will be moved to the Trash box.',
              confirmText: 'Delete',
              type: 'danger'
            });
            if (confirmed) {
              this.notes = await StorageManager.deleteNote(id);
              this.render();
              if (this.isPanelOpen) this.renderPanelBox();
              this.updateLauncherBadge();
            }
          }
        });
      });

      // Sync indicator click
      card.querySelector('.note-sync-indicator')?.addEventListener('click', () => {
        if (typeof SettingsComponent !== 'undefined') {
          SettingsComponent.open();
        }
      });

      // Inputs
      const titleInput = card.querySelector('.note-title-input');
      if (titleInput) {
        titleInput.addEventListener('input', Utils.debounce(async () => {
          this.notes = await StorageManager.updateNote(id, { title: titleInput.value });
          if (this.isPanelOpen) this.renderPanelBox();
        }, 400));
      }

      const contentInput = card.querySelector('.note-content-input');
      if (contentInput) {
        contentInput.addEventListener('input', Utils.debounce(async () => {
          this.notes = await StorageManager.updateNote(id, { content: contentInput.value });
          if (this.isPanelOpen) this.renderPanelBox();
        }, 400));
      }
    });
  },

  async refresh() {
    await this.loadNotes();
    this.render();
    if (this.isPanelOpen) this.renderPanelBox();
    this.updateLauncherBadge();
  }
};
