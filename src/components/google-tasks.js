/* ============================================================
   Devora — Google Tasks Component v1.0
   Fetches and syncs Google Tasks.
   Requires: chrome.identity + Google Tasks API token.
   ============================================================ */

const GoogleTasksComponent = {
  tasks: [],
  _token: null,
  _refreshTimer: null,
  _loadError: null,
  _isLoading: false,
  _listId: '@default',

  /* ── Init ─────────────────────────────────────────── */
  async init() {
    await this.fetchTasks(false);
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._refreshTimer = setInterval(() => this.fetchTasks(false), 15 * 60 * 1000);
  },

  /* ── Token ────────────────────────────────────────── */
  async _getToken(interactive = false) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome === 'undefined' || !chrome.identity || !chrome.identity.getAuthToken) {
          resolve(null);
          return;
        }
        chrome.identity.getAuthToken({ interactive }, (token) => {
          if (chrome.runtime.lastError || !token) {
            resolve(null);
            return;
          }
          resolve(token);
        });
      } catch (e) {
        resolve(null);
      }
    });
  },

  /* ── Fetch Tasks ──────────────────────────────────── */
  async fetchTasks(interactive = true) {
    this._isLoading = true;
    this._loadError = null;
    this._notifyPanel();

    this._token = await this._getToken(interactive);
    if (!this._token) {
      this._isLoading = false;
      this._loadError = interactive ? 'auth_failed' : 'not_connected';
      this._notifyPanel();
      return;
    }

    try {
      const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(this._listId)}/tasks?showCompleted=true&showHidden=true`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${this._token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      this.tasks = (data.items || []).map(t => ({
        id: t.id,
        title: t.title || '(No title)',
        completed: t.status === 'completed',
        updated: t.updated
      }));

      this._isLoading = false;
      this._loadError = null;
    } catch (err) {
      console.warn('[GoogleTasksComponent] fetch error:', err);
      this._isLoading = false;
      this._loadError = 'fetch_error';
    }

    this._notifyPanel();
  },

  /* ── Add Task ─────────────────────────────────────── */
  async addTask(title) {
    if (!title || !title.trim()) return;
    this._token = await this._getToken(true);
    if (!this._token) return;

    try {
      const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(this._listId)}/tasks`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this._token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: title.trim() })
      });
      if (res.ok) {
        await this.fetchTasks(false);
        if (typeof CalendarComponent !== 'undefined' && CalendarComponent.createEventFromTask) {
          await CalendarComponent.createEventFromTask({ title: title.trim() });
        }
      }
    } catch (e) {
      console.error('[GoogleTasksComponent] addTask error:', e);
    }
  },

  /* ── Toggle Task ──────────────────────────────────── */
  async toggleTask(taskId, currentStatus) {
    this._token = await this._getToken(true);
    if (!this._token) return;

    try {
      const newStatus = currentStatus ? 'needsAction' : 'completed';
      const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(this._listId)}/tasks/${encodeURIComponent(taskId)}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this._token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await this.fetchTasks(false);
      }
    } catch (e) {
      console.error('[GoogleTasksComponent] toggleTask error:', e);
    }
  },

  /* ── Delete Task ──────────────────────────────────── */
  async deleteTask(taskId) {
    this._token = await this._getToken(true);
    if (!this._token) return;

    try {
      const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(this._listId)}/tasks/${encodeURIComponent(taskId)}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this._token}` }
      });
      if (res.ok) {
        await this.fetchTasks(false);
      }
    } catch (e) {
      console.error('[GoogleTasksComponent] deleteTask error:', e);
    }
  },

  /* ── Render ───────────────────────────────────────── */
  renderTasksTab() {
    if (this._isLoading) {
      return `
        <div class="cal-loading">
          <div class="cal-spinner"></div>
          <span>Loading Google Tasks…</span>
        </div>`;
    }

    if (this._loadError === 'not_connected') {
      return `
        <div class="cal-connect-prompt">
          <div class="cal-connect-icon">📝</div>
          <p class="cal-connect-title">Connect Google Tasks</p>
          <p class="cal-connect-sub">Sync your tasks directly with your Google Account.</p>
          <button class="btn btn-sm btn-primary" id="gtasks-connect-btn">Connect Account</button>
        </div>`;
    }

    if (this._loadError === 'auth_failed') {
      return `
        <div class="cal-connect-prompt">
          <div class="cal-connect-icon">🔐</div>
          <p class="cal-connect-title">Authentication failed</p>
          <p class="cal-connect-sub">Please sign in to Google to sync Google Tasks.</p>
          <button class="btn btn-sm btn-secondary" id="gtasks-retry-btn">Try Again</button>
        </div>`;
    }

    if (this._loadError === 'fetch_error') {
      return `
        <div class="cal-connect-prompt">
          <div class="cal-connect-icon">⚠️</div>
          <p class="cal-connect-title">Could not load Google Tasks</p>
          <button class="btn btn-sm btn-secondary" id="gtasks-retry-btn">Retry</button>
        </div>`;
    }

    return `
      <div class="gtasks-header-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-weight:600; font-size:14px; opacity:0.9;">Google Tasks</span>
        <button class="btn-icon" id="gtasks-refresh-btn" title="Refresh">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
      </div>
      
      <form id="gtasks-add-form" style="display:flex; gap:8px; margin-bottom:16px;">
        <input type="text" id="gtasks-add-input" placeholder="Add a Google Task..." required style="flex:1; padding:7px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.15); background:rgba(0,0,0,0.2); color:inherit; font-size:14px;">
        <button type="submit" class="btn btn-sm btn-primary">Add</button>
      </form>

      ${this.tasks.length === 0 ? `
        <div class="cal-empty">
          <span class="cal-empty-icon">✨</span>
          <p>No tasks found in Google Tasks.</p>
        </div>` : `
        <div class="panel-tasks-list">
          ${this.tasks.map(t => `
            <div class="panel-task-row ${t.completed ? 'completed' : ''}" data-gtask-id="${t.id}">
              <button class="task-checkbox ${t.completed ? 'checked' : ''}" data-gtask-action="toggle" data-gtask-id="${t.id}" data-completed="${t.completed}">
                ${t.completed ? '✓' : ''}
              </button>
              <span class="panel-task-text">${this._escape(t.title)}</span>
              <button class="btn-icon panel-task-del" data-gtask-action="delete" data-gtask-id="${t.id}">✕</button>
            </div>
          `).join('')}
        </div>
      `}
    `;
  },

  /* ── Event binding ────────────────────────────────── */
  bindEvents(container) {
    container?.querySelector('#gtasks-connect-btn')?.addEventListener('click', () => this.fetchTasks(true));
    container?.querySelector('#gtasks-retry-btn')?.addEventListener('click',   () => this.fetchTasks(true));
    container?.querySelector('#gtasks-refresh-btn')?.addEventListener('click', () => this.fetchTasks(false));

    container?.querySelector('#gtasks-add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = container.querySelector('#gtasks-add-input');
      if (input && input.value) {
        this.addTask(input.value);
        input.value = '';
      }
    });

    container?.querySelectorAll('[data-gtask-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.gtaskAction;
        const id = btn.dataset.gtaskId;
        if (action === 'toggle') {
          const completed = btn.dataset.completed === 'true';
          this.toggleTask(id, completed);
        } else if (action === 'delete') {
          this.deleteTask(id);
        }
      });
    });
  },

  /* Notify panel & refresh main workspace tasks */
  _notifyPanel() {
    const tab = document.getElementById('tasks-gtasks-tab-content');
    if (tab) {
      tab.innerHTML = this.renderTasksTab();
      this.bindEvents(tab);
    }
    if (typeof TasksComponent !== 'undefined' && TasksComponent.loadTasks) {
      TasksComponent.loadTasks().then(() => TasksComponent.render());
    }
  },

  /* ── Clean on logout ─────────────────────────────────── */
  clear() {
    this.tasks = [];
    this._token = null;
    this._isLoading = false;
    this._loadError = null;
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
    const tab = document.getElementById('tasks-gtasks-tab-content');
    if (tab) {
      tab.innerHTML = this.renderTasksTab();
      this.bindEvents(tab);
    }
  },

  _escape(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
