/* ============================================================
   Devora — Google Calendar Component v1.0
   Fetches and displays today's Google Calendar events.
   Requires: chrome.identity + Google Calendar API token.
   Refreshes every 15 minutes automatically.
   ============================================================ */

const CalendarComponent = {
  events: [],
  _token: null,
  _refreshTimer: null,
  _loadError: null,
  _isLoading: false,

  /* ── Init ─────────────────────────────────────────── */
  async init() {
    // Background calendar event auto-fetch disabled as per user configuration
    // (no unnecessary background network requests or 403 scope errors)
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

  /* ── Fetch Events ─────────────────────────────────── */
  async fetchEvents(interactive = true) {
    if (!interactive) return;
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
      const now    = new Date();
      const start  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const end    = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      const url    = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}&singleEvents=true&orderBy=startTime&maxResults=25`;

      const res  = await fetch(url, { headers: { Authorization: `Bearer ${this._token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      this.events = (data.items || []).map(ev => ({
        id:       ev.id,
        title:    ev.summary || '(No title)',
        start:    ev.start?.dateTime || ev.start?.date,
        end:      ev.end?.dateTime   || ev.end?.date,
        allDay:   !ev.start?.dateTime,
        color:    ev.colorId ? this._calColor(ev.colorId) : '#6366f1',
        location: ev.location || '',
        htmlLink: ev.htmlLink || ''
      }));

      this._isLoading = false;
      this._loadError = null;
    } catch (err) {
      console.warn('[CalendarComponent] fetch error:', err);
      this._isLoading = false;
      this._loadError = 'fetch_error';
    }

    this._notifyPanel();
  },

  /* ── Render (called by tasks floating panel) ──────── */
  renderCalendarTab() {
    if (this._isLoading) {
      return `
        <div class="cal-loading">
          <div class="cal-spinner"></div>
          <span>Loading calendar…</span>
        </div>`;
    }

    if (this._loadError === 'not_connected') {
      return `
        <div class="cal-connect-prompt">
          <div class="cal-connect-icon">📅</div>
          <p class="cal-connect-title">Connect Google Calendar</p>
          <p class="cal-connect-sub">View today's events right here in your workspace.</p>
          <button class="btn btn-sm btn-primary" id="cal-connect-btn">Connect Account</button>
        </div>`;
    }

    if (this._loadError === 'auth_failed') {
      return `
        <div class="cal-connect-prompt">
          <div class="cal-connect-icon">🔐</div>
          <p class="cal-connect-title">Authentication failed</p>
          <p class="cal-connect-sub">Please sign in to your Google Account in Chrome settings.</p>
          <button class="btn btn-sm btn-secondary" id="cal-retry-btn">Try Again</button>
        </div>`;
    }

    if (this._loadError === 'fetch_error') {
      return `
        <div class="cal-connect-prompt">
          <div class="cal-connect-icon">⚠️</div>
          <p class="cal-connect-title">Could not load calendar</p>
          <button class="btn btn-sm btn-secondary" id="cal-retry-btn">Retry</button>
        </div>`;
    }

    const today    = new Date();
    const dateStr  = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const now      = Date.now();

    if (this.events.length === 0) {
      return `
        <div class="cal-header-row">
          <span class="cal-date-label">📅 ${dateStr}</span>
          <button class="btn-icon cal-refresh-btn" id="cal-refresh-btn" title="Refresh">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        </div>
        <div class="cal-empty">
          <span class="cal-empty-icon">🎉</span>
          <p>No events today — enjoy your free time!</p>
        </div>`;
    }

    return `
      <div class="cal-header-row">
        <span class="cal-date-label">📅 ${dateStr}</span>
        <button class="btn-icon cal-refresh-btn" id="cal-refresh-btn" title="Refresh">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
      </div>
      <div class="cal-events-list">
        ${this.events.map(ev => {
          const isPast = !ev.allDay && ev.end && new Date(ev.end).getTime() < now;
          const isCurrent = !ev.allDay && ev.start && ev.end
            && new Date(ev.start).getTime() <= now
            && new Date(ev.end).getTime()   >= now;
          const timeLabel = ev.allDay ? 'All day' : this._fmtTime(ev.start);
          return `
            <a class="cal-event-row ${isPast ? 'past' : ''} ${isCurrent ? 'current' : ''}"
               href="${ev.htmlLink}" target="_blank" rel="noopener" title="${ev.title}">
              <div class="cal-event-dot" style="background:${ev.color}"></div>
              <div class="cal-event-body">
                <span class="cal-event-title">${this._escape(ev.title)}</span>
                <span class="cal-event-time">${timeLabel}${ev.location ? ' · ' + this._escape(ev.location.split(',')[0]) : ''}</span>
              </div>
              ${isCurrent ? '<span class="cal-live-badge">LIVE</span>' : ''}
            </a>`;
        }).join('')}
      </div>`;
  },

  /* ── Event binding (called after DOM inject) ─────── */
  bindEvents(container) {
    container?.querySelector('#cal-connect-btn')?.addEventListener('click', () => this.fetchEvents(true));
    container?.querySelector('#cal-retry-btn')?.addEventListener('click',   () => this.fetchEvents(true));
    container?.querySelector('#cal-refresh-btn')?.addEventListener('click', () => this.fetchEvents(false));
  },

  /* Notify the tasks panel to re-render its calendar tab */
  _notifyPanel() {
    const tab = document.getElementById('tasks-cal-tab-content');
    if (tab) {
      tab.innerHTML = this.renderCalendarTab();
      this.bindEvents(tab);
    }
  },

  /* ── Create Google Calendar Event from Task ────────────── */
  async createEventFromTask(taskData) {
    const token = await this._getToken(false);
    if (!token) return null;

    try {
      const title = taskData.title || taskData.summary || 'New Task';
      const description = taskData.description || 'Task synced from Devora Workspace';
      
      let startObj, endObj;

      if (taskData.dueDate && taskData.dueTime) {
        const startIso = new Date(`${taskData.dueDate}T${taskData.dueTime}`).toISOString();
        const endIso = new Date(new Date(`${taskData.dueDate}T${taskData.dueTime}`).getTime() + 30 * 60 * 1000).toISOString();
        startObj = { dateTime: startIso };
        endObj = { dateTime: endIso };
      } else if (taskData.dueDate) {
        startObj = { date: taskData.dueDate };
        endObj = { date: taskData.dueDate };
      } else {
        const todayStr = new Date().toISOString().slice(0, 10);
        startObj = { date: todayStr };
        endObj = { date: todayStr };
      }

      const eventBody = {
        summary: title,
        description: description,
        start: startObj,
        end: endObj
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody)
      });

      if (res.ok) {
        const createdEvent = await res.json();
        await this.fetchEvents(false);
        return createdEvent;
      } else {
        console.warn('[CalendarComponent] createEvent failed HTTP:', res.status);
      }
    } catch (e) {
      console.error('[CalendarComponent] createEventFromTask error:', e);
    }
    return null;
  },

  /* ── Helpers ──────────────────────────────────────── */
  _fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  },

  /* ── Clean on logout ─────────────────────────────────── */
  clear() {
    this.events = [];
    this._token = null;
    this._isLoading = false;
    this._loadError = null;
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
    this._notifyPanel();
  },

  _escape(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  _calColor(id) {
    const colors = {
      '1':'#a4bdfc','2':'#7ae28c','3':'#dbadff','4':'#ff887c',
      '5':'#fbd75b','6':'#ffb878','7':'#46d6db','8':'#e1e1e1',
      '9':'#5484ed','10':'#51b749','11':'#dc2127'
    };
    return colors[id] || '#6366f1';
  }
};
