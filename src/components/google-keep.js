/* ============================================================
   Devora — Google Keep Integration v3.0 (Dynamic Sync Engine)
   ─────────────────────────────────────────────────────────
   • Full 2-way dynamic synchronization with Google Keep API
   • Instant local cache fallback (offline-first architecture)
   • Seamless note search, creation, deletion, and canvas pinning
   • Graceful handling of Google Cloud restricted scopes
   ============================================================ */

const GoogleKeepComponent = {
  notes: [],
  _token: null,
  _isLoading: false,
  _isSyncing: false,
  _loadError: null,      // null | 'not_signed_in' | 'scope_restricted' | 'fetch_error'
  _searchQuery: '',
  lastSyncedAt: null,
  _BASE: 'https://keep.googleapis.com/v1',

  /* ── Init: loads cache immediately & initiates sync ────── */
  async init() {
    try {
      if (typeof StorageManager !== 'undefined' && StorageManager.getKeepNotes) {
        this.notes = await StorageManager.getKeepNotes();
      }
    } catch (e) {}

    const user = await this._getUser();
    if (user && user.signedIn) {
      // Background sync silently
      this.fetchNotes(false);
    } else {
      this._loadError = 'not_signed_in';
    }
  },

  /* ── Token Helper ──────────────────────────────────────── */
  async _getToken(interactive = false) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome === 'undefined' || !chrome.identity?.getAuthToken) {
          resolve(null); return;
        }
        chrome.identity.getAuthToken({ interactive }, (token) => {
          if (chrome.runtime.lastError || !token) {
            resolve(null);
            return;
          }
          resolve(token);
        });
      } catch {
        resolve(null);
      }
    });
  },

  async _getUser() {
    try { return await StorageManager.getGoogleUser(); } catch { return null; }
  },

  /* ── Dynamic Sync / Fetch Notes ────────────────────────── */
  async fetchNotes(interactive = false) {
    const user = await this._getUser();
    if (!user || !user.signedIn) {
      this._isLoading = false;
      this._loadError = 'not_signed_in';
      this._notifyPanel();
      return this.notes;
    }

    this._isLoading = (this.notes.length === 0);
    this._isSyncing = true;
    this._notifyPanel();

    this._token = await this._getToken(interactive);
    if (!this._token) {
      this._isLoading = false;
      this._isSyncing = false;
      if (interactive) this._loadError = 'not_signed_in';
      this._notifyPanel();
      return this.notes;
    }

    try {
      const res = await fetch(`${this._BASE}/notes?pageSize=50`, {
        headers: { Authorization: `Bearer ${this._token}` }
      });

      if (res.status === 403) {
        // Scope restricted by Google policy (common on consumer accounts)
        this._isLoading = false;
        this._isSyncing = false;
        this._loadError = 'scope_restricted';
        this._notifyPanel();
        return this.notes;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const remoteNotes = (data.notes || []).map(n => ({
        keepId: n.name,
        title: n.title || '',
        text: n.body?.text?.text || '',
        updatedAt: n.updateTime ? new Date(n.updateTime).getTime() : Date.now(),
        trashed: !!n.trashed
      })).filter(n => !n.trashed);

      // Preserve any locally created notes that haven't pushed yet
      const localOnly = this.notes.filter(n => n.localOnly);
      const remoteIds = new Set(remoteNotes.map(n => n.keepId));
      const combined = [...localOnly.filter(n => !remoteIds.has(n.keepId)), ...remoteNotes];

      this.notes = combined;
      this.lastSyncedAt = Date.now();
      this._loadError = null;

      if (typeof StorageManager !== 'undefined' && StorageManager.saveKeepNotes) {
        await StorageManager.saveKeepNotes(this.notes);
      }
    } catch (err) {
      console.warn('[GoogleKeepComponent] fetchNotes error:', err);
      if (this.notes.length === 0) {
        this._loadError = 'fetch_error';
      }
    } finally {
      this._isLoading = false;
      this._isSyncing = false;
      this._notifyPanel();
      if (typeof NotesComponent !== 'undefined' && typeof NotesComponent.updateLauncherBadge === 'function') {
        NotesComponent.updateLauncherBadge();
      }
    }

    return this.notes;
  },

  /* ── Dynamic Create Note ───────────────────────────────── */
  async createNote(title, text = '') {
    const trimmedTitle = (title || '').trim();
    const trimmedText = (text || '').trim();
    if (!trimmedTitle && !trimmedText) return null;

    const localId = 'keep_local_' + Date.now();
    const newNote = {
      keepId: localId,
      title: trimmedTitle || 'Untitled Keep Note',
      text: trimmedText,
      updatedAt: Date.now(),
      localOnly: true
    };

    // Optimistic local update
    this.notes.unshift(newNote);
    if (typeof StorageManager !== 'undefined' && StorageManager.saveKeepNotes) {
      await StorageManager.saveKeepNotes(this.notes);
    }
    this._notifyPanel();

    // Background push to Google Keep API if authenticated
    try {
      this._token = await this._getToken(false);
      if (this._token) {
        const res = await fetch(`${this._BASE}/notes`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this._token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newNote.title,
            body: { text: { text: newNote.text } }
          })
        });

        if (res.ok) {
          const created = await res.json();
          if (created && created.name) {
            newNote.keepId = created.name;
            delete newNote.localOnly;
            if (typeof StorageManager !== 'undefined' && StorageManager.saveKeepNotes) {
              await StorageManager.saveKeepNotes(this.notes);
            }
            this.lastSyncedAt = Date.now();
            this._notifyPanel();
          }
        }
      }
    } catch (e) {
      console.warn('[GoogleKeepComponent] createNote remote sync error:', e);
    }

    return newNote;
  },

  /* ── Dynamic Delete Note ───────────────────────────────── */
  async deleteNote(keepId) {
    if (!keepId) return;

    // Optimistic local deletion
    this.notes = this.notes.filter(n => n.keepId !== keepId);
    if (typeof StorageManager !== 'undefined' && StorageManager.saveKeepNotes) {
      await StorageManager.saveKeepNotes(this.notes);
    }
    this._notifyPanel();

    // Remote sync
    if (!keepId.startsWith('keep_local_')) {
      try {
        this._token = await this._getToken(false);
        if (this._token) {
          const name = keepId.startsWith('notes/') ? keepId : `notes/${keepId}`;
          await fetch(`${this._BASE}/${name}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${this._token}` }
          });
        }
      } catch (e) {
        console.warn('[GoogleKeepComponent] deleteNote remote sync error:', e);
      }
    }
  },

  /* ── Convert / Pin to Devora Desktop Canvas ────────────── */
  async pinToCanvas(keepId) {
    const kn = this.notes.find(n => n.keepId === keepId);
    if (!kn || typeof NotesComponent === 'undefined') return;

    await NotesComponent.addNote({
      title: kn.title || 'Google Keep Note',
      content: kn.text || '',
      color: 'yellow',
      pinned: true
    });

    if (typeof Utils !== 'undefined' && Utils.toast) {
      Utils.toast('Keep note pinned to workspace screen', 'success');
    }
  },

  /* ── Render Google Keep Tab ────────────────────────────── */
  renderKeepTab() {
    const query = (this._searchQuery || '').toLowerCase().trim();
    const filteredNotes = query
      ? this.notes.filter(n => (n.title && n.title.toLowerCase().includes(query)) || (n.text && n.text.toLowerCase().includes(query)))
      : this.notes;

    const syncTimeStr = this.lastSyncedAt
      ? (typeof Utils !== 'undefined' && Utils.relativeTime ? `Synced ${Utils.relativeTime(this.lastSyncedAt)}` : 'Synced recently')
      : 'Auto-sync active';

    return `
      <div class="keep-container">
        <!-- Top Toolbar -->
        <div class="keep-header-toolbar">
          <div class="keep-header-brand">
            <div class="keep-brand-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 21h6v-1.5H9V21zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" fill="#FBBF24"/>
                <path d="M12 4a5 5 0 0 0-5 5c0 1.95.99 3.65 2.5 4.63V15h5v-1.37c1.51-.98 2.5-2.68 2.5-4.63a5 5 0 0 0-5-5z" fill="#F59E0B"/>
              </svg>
            </div>
            <div class="keep-brand-titles">
              <div class="keep-brand-name">Google Keep Sync</div>
              <div class="keep-sync-status-row">
                <span class="keep-live-dot ${this._isSyncing ? 'syncing' : ''}"></span>
                <span class="keep-sync-time">${this._isSyncing ? 'Syncing with Google…' : syncTimeStr}</span>
              </div>
            </div>
          </div>

          <div class="keep-header-actions">
            <button class="keep-action-pill-btn" id="keep-refresh-btn" title="Sync Keep Notes Now">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${this._isSyncing ? 'spin-icon' : ''}">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>${this._isSyncing ? 'Syncing…' : 'Sync'}</span>
            </button>
            <a href="https://keep.google.com" target="_blank" rel="noopener noreferrer" class="keep-action-pill-btn keep-web-btn" title="Open Google Keep Web App">
              <span>Open Keep</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </div>

        ${this._loadError === 'scope_restricted' ? `
          <div class="keep-info-banner">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
            <div class="keep-info-banner-text">
              <span>Google Keep cloud access requires test-user authorization. Local Keep sync is active.</span>
            </div>
            <button class="btn-sm btn-ghost" id="keep-retry-btn" title="Re-authenticate">Retry</button>
          </div>
        ` : ''}

        <!-- Quick Add Keep Note -->
        <form id="keep-add-form" class="keep-quick-card">
          <input type="text" id="keep-add-title" class="keep-input-title" placeholder="Take a Keep note…" autocomplete="off" required>
          <div class="keep-quick-details" id="keep-quick-details">
            <textarea id="keep-add-text" class="keep-input-text" placeholder="Note description or details (optional)…" rows="2"></textarea>
            <div class="keep-quick-footer">
              <span class="keep-quick-hint">Press Enter to save</span>
              <button type="submit" class="btn btn-sm btn-primary keep-submit-btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>Add Note</span>
              </button>
            </div>
          </div>
        </form>

        <!-- Search & Filter row if notes exist -->
        ${this.notes.length > 0 ? `
          <div class="keep-search-bar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="keep-search-input" value="${this._escape(this._searchQuery)}" placeholder="Search in Keep notes (${this.notes.length})…" autocomplete="off">
            ${this._searchQuery ? `<button class="btn-icon" id="keep-search-clear">✕</button>` : ''}
          </div>
        ` : ''}

        <!-- Notes List / States -->
        ${this._isLoading ? `
          <div class="keep-state-box">
            <div class="keep-spinner"></div>
            <p class="keep-state-title">Loading Google Keep…</p>
          </div>
        ` : this._loadError === 'not_signed_in' ? `
          <div class="keep-state-box">
            <div class="keep-state-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <p class="keep-state-title">Google Account Not Connected</p>
            <p class="keep-state-sub">Sign in with your Google Account in Settings ⚙️ to enable real-time Keep sync and cloud backups.</p>
          </div>
        ` : filteredNotes.length === 0 ? `
          <div class="panel-empty-inbox">
            <div class="inbox-graphic-icon">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                <path d="M9 21h6v-1.5H9V21zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" fill="#FBBF24" opacity="0.4"/>
              </svg>
            </div>
            <p>${this._searchQuery ? 'No matching Keep notes found' : 'No notes in Google Keep yet'}</p>
            <p style="font-size:0.78rem;opacity:0.5">${this._searchQuery ? 'Try another search keyword' : 'Create one above or open Keep on the web'}</p>
          </div>
        ` : `
          <div class="keep-cards-grid">
            ${filteredNotes.map(n => `
              <div class="keep-note-card" data-keep-id="${this._escape(n.keepId)}">
                <div class="keep-card-header">
                  <div class="keep-card-title">${this._escape(n.title || 'Untitled Note')}</div>
                  <div class="keep-card-actions">
                    <button class="keep-card-btn" data-keep-action="pin-to-canvas" data-keep-id="${this._escape(n.keepId)}" title="Pin to Desktop Screen">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24z"/></svg>
                    </button>
                    <button class="keep-card-btn" data-keep-action="copy" data-keep-id="${this._escape(n.keepId)}" title="Copy Note Text">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button class="keep-card-btn keep-del-btn" data-keep-action="delete" data-keep-id="${this._escape(n.keepId)}" title="Delete Note">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
                ${n.text ? `<div class="keep-card-body">${this._escape(n.text)}</div>` : ''}
                <div class="keep-card-footer">
                  <span class="keep-badge-pill">Keep</span>
                  <span class="keep-updated-meta">${n.updatedAt ? Utils.relativeTime(n.updatedAt) : ''}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  },

  /* ── Bind Keep Panel Events ────────────────────────────── */
  bindEvents(container) {
    if (!container) return;

    // Retry & Refresh buttons
    container.querySelector('#keep-retry-btn')?.addEventListener('click', () => this.fetchNotes(true));
    container.querySelector('#keep-refresh-btn')?.addEventListener('click', () => this.fetchNotes(false));

    // Search filter input
    const searchInput = container.querySelector('#keep-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._searchQuery = e.target.value;
        this._notifyPanel();
        const nextInput = document.getElementById('keep-search-input');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      });
    }
    container.querySelector('#keep-search-clear')?.addEventListener('click', () => {
      this._searchQuery = '';
      this._notifyPanel();
    });

    // Expand details on focus
    const titleInput = container.querySelector('#keep-add-title');
    const detailsWrap = container.querySelector('#keep-quick-details');
    if (titleInput && detailsWrap) {
      titleInput.addEventListener('focus', () => {
        detailsWrap.classList.add('is-expanded');
      });
    }

    // Submit form
    const form = container.querySelector('#keep-add-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleEl = container.querySelector('#keep-add-title');
        const textEl = container.querySelector('#keep-add-text');
        const title = titleEl?.value?.trim() || '';
        const text = textEl?.value?.trim() || '';
        if (!title && !text) return;

        if (titleEl) titleEl.value = '';
        if (textEl) textEl.value = '';
        detailsWrap?.classList.remove('is-expanded');

        await this.createNote(title, text);
      });
    }

    // Card Action buttons
    container.querySelectorAll('[data-keep-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.dataset.keepAction;
        const id = btn.dataset.keepId;
        if (!id) return;

        if (action === 'pin-to-canvas') {
          await this.pinToCanvas(id);
        } else if (action === 'copy') {
          const note = this.notes.find(n => n.keepId === id);
          if (note) {
            const content = `${note.title ? note.title + '\n\n' : ''}${note.text || ''}`;
            navigator.clipboard.writeText(content);
            btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
            setTimeout(() => {
              btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
            }, 1200);
          }
        } else if (action === 'delete') {
          const confirmed = await Utils.confirm({
            title: 'Delete Keep Note',
            message: 'Are you sure you want to delete this note from Google Keep?',
            confirmText: 'Delete Note',
            type: 'danger'
          });
          if (confirmed) {
            await this.deleteNote(id);
          }
        }
      });
    });
  },

  /* ── Notify notes panel to re-render Keep tab ─────────── */
  _notifyPanel() {
    const keepTab = document.getElementById('notes-keep-tab-content');
    if (keepTab) {
      keepTab.innerHTML = this.renderKeepTab();
      this.bindEvents(keepTab);
    }
  },

  /* ── Clean on logout ─────────────────────────────────── */
  clear() {
    this.notes = [];
    this._token = null;
    this._isLoading = false;
    this._isSyncing = false;
    this._loadError = null;
    this._searchQuery = '';
    this.lastSyncedAt = null;
    this._notifyPanel();
  },

  _escape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
