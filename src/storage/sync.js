/* ============================================================
   Devora — SyncManager v1.0
   Enterprise-grade offline-first sync engine.

   Architecture:
   ─────────────────────────────────────────────────────────
   • ALL writes go to chrome.storage.local first (instant).
   • Changes are queued and flushed to chrome.storage.sync
     within 3 seconds (debounced) when online + signed in.
   • On first open after reinstall, pulls remote data and
     merges with local (last-write-wins on updatedAt).
   • Works fully offline; syncs automatically when online.
   ─────────────────────────────────────────────────────────

   Sync storage key layout (chrome.storage.sync):
     devora_sync_meta        → { deviceId, lastPush, version }
     devora_sync_notes_0…N  → chunked note arrays (≤7KB each)
     devora_sync_tasks_0…N  → chunked task arrays per day
     devora_sync_settings    → settings snapshot
   ============================================================ */

const SyncManager = {
  _pendingSync: null,
  _isSyncing: false,
  _isOnline: navigator.onLine,
  _deviceId: null,
  _listeners: [],   // UI components register here for status updates

  /* ── SYNC STATUS ───────────────────────────────────────────
     'idle' | 'syncing' | 'offline' | 'error' | 'no-account'
  ─────────────────────────────────────────────────────────── */
  status: 'idle',
  lastSyncedAt: null,

  /* ── INIT ─────────────────────────────────────────────── */
  async init() {
    // Generate/restore stable device ID
    let meta = await this._localGet('devora_sync_meta_local');
    if (!meta || !meta.deviceId) {
      meta = { deviceId: this._uuid(), createdAt: Date.now() };
      await this._localSet('devora_sync_meta_local', meta);
    }
    this._deviceId = meta.deviceId;

    // Network listeners
    window.addEventListener('online',  () => { this._isOnline = true;  this._onOnline(); });
    window.addEventListener('offline', () => { this._isOnline = false; this._setStatus('offline'); });

    if (!this._isOnline) {
      this._setStatus('offline');
    }

    // On init: try to pull remote data (handles reinstall/new device)
    await this._tryInitialPull();
  },

  /* ── PUBLIC API ───────────────────────────────────────── */

  /** Call after any local write that should be synced. */
  scheduleSync() {
    if (this._pendingSync) clearTimeout(this._pendingSync);
    this._pendingSync = setTimeout(() => this.push(), 3000);
  },

  /** Force immediate sync push. */
  async push() {
    const user = await this._getUser();
    if (!user || !user.signedIn) { this._setStatus('no-account'); return; }
    if (!this._isOnline) { this._setStatus('offline'); return; }
    if (this._isSyncing) return;

    this._isSyncing = true;
    this._setStatus('syncing');

    try {
      // Pull user-provided tasks and notes from local storage
      const notes    = await this._localGet('devora_sticky_notes') || [];
      const settings = await this._localGet('devora_settings') || {};

      // Gather tasks for last 30 days
      const taskPayload = {};
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = this._dateKey(d);
        const storageKey = `devora_tasks_${key}`;
        const tasks = await this._localGet(storageKey);
        if (tasks && tasks.length > 0) {
          taskPayload[key] = tasks;
        }
      }

      // Chunk and write to sync storage
      await this._clearSyncKeys('devora_sync_notes_');
      await this._writeChunked('devora_sync_notes_', notes);

      await this._clearSyncKeys('devora_sync_tasks_');
      await this._writeChunked('devora_sync_tasks_', taskPayload);

      await this._syncSet('devora_sync_settings', settings);

      const quicklinks = await this._localGet('devora_quicklinks') || [];
      if (quicklinks && quicklinks.length > 0) {
        await this._syncSet('devora_sync_quicklinks', quicklinks);
      }

      // Update meta with user account email
      const meta = {
        deviceId: this._deviceId,
        lastPush: Date.now(),
        version: 1,
        email: user.email ? user.email.toLowerCase() : null,
        noteCount: notes.length,
        taskDays: Object.keys(taskPayload).length
      };
      await this._syncSet('devora_sync_meta', meta);

      this.lastSyncedAt = Date.now();
      try {
        user.lastSynced = this.lastSyncedAt;
        await this._localSet('devora_google_user', user);
      } catch (e) {}
      this._setStatus('idle');
    } catch (err) {
      console.warn('[SyncManager] push error:', err);
      this._setStatus('error');
    } finally {
      this._isSyncing = false;
    }
  },

  /** Pull remote data and merge with local. */
  async pull() {
    const user = await this._getUser();
    if (!user || !user.signedIn) { this._setStatus('no-account'); return false; }
    if (!this._isOnline) { this._setStatus('offline'); return false; }

    this._setStatus('syncing');

    try {
      const meta = await this._syncGet('devora_sync_meta');
      if (!meta) { this._setStatus('idle'); return false; }

      // Securely ensure remote backup belongs to this Google user
      if (meta.email && user.email && meta.email.toLowerCase() !== user.email.toLowerCase()) {
        console.log('[SyncManager] Remote backup is for account:', meta.email, 'Current user:', user.email);
        this._setStatus('idle');
        return false;
      }

      // Pull notes
      const remoteNotes = await this._readChunked('devora_sync_notes_');
      if (remoteNotes && remoteNotes.length > 0) {
        const localNotes = await this._localGet('devora_sticky_notes') || [];
        const merged = this._mergeByUpdatedAt(localNotes, remoteNotes, 'id');
        await this._localSet('devora_sticky_notes', merged);
      }

      // Pull tasks (all date keys)
      const remoteTasksObj = await this._readChunked('devora_sync_tasks_');
      if (remoteTasksObj && typeof remoteTasksObj === 'object' && !Array.isArray(remoteTasksObj)) {
        for (const [dateKey, remoteTasks] of Object.entries(remoteTasksObj)) {
          const storageKey = `devora_tasks_${dateKey}`;
          const localTasks = await this._localGet(storageKey) || [];
          const merged = this._mergeByUpdatedAt(localTasks, remoteTasks, 'id');
          await this._localSet(storageKey, merged);
        }
      }

      // Pull settings (only if local settings are default/missing)
      const localSettings = await this._localGet('devora_settings');
      if (!localSettings) {
        const remoteSettings = await this._syncGet('devora_sync_settings');
        if (remoteSettings) {
          await this._localSet('devora_settings', remoteSettings);
        }
      }

      // Pull quicklinks (only if local quicklinks are empty)
      const localLinks = await this._localGet('devora_quicklinks');
      if (!localLinks || localLinks.length === 0) {
        const remoteLinks = await this._syncGet('devora_sync_quicklinks');
        if (remoteLinks && Array.isArray(remoteLinks) && remoteLinks.length > 0) {
          await this._localSet('devora_quicklinks', remoteLinks);
        }
      }

      this.lastSyncedAt = Date.now();
      try {
        user.lastSynced = this.lastSyncedAt;
        await this._localSet('devora_google_user', user);
      } catch (e) {}
      this._setStatus('idle');
      return true;
    } catch (err) {
      console.warn('[SyncManager] pull error:', err);
      this._setStatus('error');
      return false;
    }
  },

  /** Export all local data as a JSON blob (for manual backup). */
  async exportJSON() {
    const notes    = await this._localGet('devora_sticky_notes') || [];
    const settings = await this._localGet('devora_settings') || {};
    const pomodoro = await this._localGet('devora_pomo_state') || await this._localGet('devora_pomodoro') || {};
    const quicklinks = await this._localGet('devora_quicklinks') || [];
    const taskPayload = {};
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = this._dateKey(d);
      const tasks = await this._localGet(`devora_tasks_${key}`);
      if (tasks && tasks.length > 0) taskPayload[key] = tasks;
    }
    return {
      _version: 1,
      _exportedAt: new Date().toISOString(),
      _deviceId: this._deviceId,
      notes,
      tasks: taskPayload,
      settings,
      pomodoro,
      quicklinks
    };
  },

  /** Import from a JSON backup blob. */
  async importJSON(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      if (!data || typeof data !== 'object') throw new Error('Invalid JSON format');
      if (data._version !== 1 && !data.settings && !data.tasks && !data.notes && !data.quicklinks) {
        throw new Error('Unrecognized backup format');
      }

      let restoredCount = 0;
      if (Array.isArray(data.notes)) {
        await this._localSet('devora_sticky_notes', data.notes);
        restoredCount += data.notes.length;
      }
      if (data.settings && typeof data.settings === 'object') {
        await this._localSet('devora_settings', data.settings);
      }
      if (data.pomodoro) {
        await this._localSet('devora_pomo_state', data.pomodoro);
      }
      if (Array.isArray(data.quicklinks)) {
        await this._localSet('devora_quicklinks', data.quicklinks);
      }
      if (data.tasks && typeof data.tasks === 'object') {
        for (const [dateKey, tasks] of Object.entries(data.tasks)) {
          if (Array.isArray(tasks)) {
            await this._localSet(`devora_tasks_${dateKey}`, tasks);
            restoredCount += tasks.length;
          }
        }
      }
      return {
        success: true,
        noteCount: (data.notes || []).length,
        taskCount: Object.keys(data.tasks || {}).length,
        totalRestored: restoredCount
      };
    } catch (err) {
      console.error('[SyncManager] importJSON error:', err);
      return { success: false, error: err.message };
    }
  },

  /** Register a listener that receives status updates. */
  onStatusChange(fn) {
    this._listeners.push(fn);
  },

  /* ── PRIVATE ────────────────────────────────────────── */

  _setStatus(status) {
    this.status = status;
    this._listeners.forEach(fn => { try { fn(status, this.lastSyncedAt); } catch(e) {} });
  },

  async _onOnline() {
    this._setStatus('idle');
    // Short delay to let network stabilize
    await new Promise(r => setTimeout(r, 1200));
    await this.push();
  },

  async _tryInitialPull() {
    const user = await this._getUser();
    if (!user || !user.signedIn || !this._isOnline) return;

    // Check if this is a fresh install (no local notes or tasks)
    const localNotes = await this._localGet('devora_sticky_notes');
    const remoteMeta = await this._syncGet('devora_sync_meta');

    // If remote has data but local is empty → this is a reinstall/new device
    if (remoteMeta && remoteMeta.noteCount > 0 && (!localNotes || localNotes.length === 0)) {
      console.log('[SyncManager] Detected reinstall / new device — pulling remote data…');
      await this.pull();
    }
  },

  /* Last-write-wins merge: keep whichever item has the highest updatedAt */
  _mergeByUpdatedAt(local = [], remote = [], idKey = 'id') {
    const map = new Map();
    [...local, ...remote].forEach(item => {
      const existing = map.get(item[idKey]);
      if (!existing || (item.updatedAt || 0) > (existing.updatedAt || 0)) {
        map.set(item[idKey], item);
      }
    });
    return Array.from(map.values());
  },

  /* Chunk large arrays into ≤7KB pieces for chrome.storage.sync quota */
  async _writeChunked(prefix, data) {
    const str  = JSON.stringify(data);
    const size = 7000; // ~7KB chunks
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    for (let i = 0; i < chunks.length; i++) {
      await this._syncSet(`${prefix}${i}`, chunks[i]);
    }
    await this._syncSet(`${prefix}count`, chunks.length);
  },

  async _readChunked(prefix) {
    const count = await this._syncGet(`${prefix}count`);
    if (!count) return null;
    let str = '';
    for (let i = 0; i < count; i++) {
      const chunk = await this._syncGet(`${prefix}${i}`);
      if (chunk) str += chunk;
    }
    try { return JSON.parse(str); } catch (e) { return null; }
  },

  async _clearSyncKeys(prefix) {
    try {
      const count = await this._syncGet(`${prefix}count`);
      if (!count) return;
      const keys = [];
      for (let i = 0; i < count; i++) keys.push(`${prefix}${i}`);
      keys.push(`${prefix}count`);
      await new Promise(resolve => chrome.storage.sync.remove(keys, resolve));
    } catch (e) {}
  },

  /* Wrappers */
  _localGet(key) {
    return new Promise(resolve => chrome.storage.local.get(key, r => resolve(r[key] ?? null)));
  },
  _localSet(key, value) {
    return new Promise(resolve => chrome.storage.local.set({ [key]: value }, resolve));
  },
  _syncGet(key) {
    return new Promise(resolve => {
      try { chrome.storage.sync.get(key, r => resolve(r[key] ?? null)); }
      catch (e) { resolve(null); }
    });
  },
  _syncSet(key, value) {
    return new Promise(resolve => {
      try { chrome.storage.sync.set({ [key]: value }, resolve); }
      catch (e) { resolve(); }
    });
  },
  async _getUser() {
    try { return await StorageManager.getGoogleUser(); } catch (e) { return null; }
  },
  _dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  },
  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
};
