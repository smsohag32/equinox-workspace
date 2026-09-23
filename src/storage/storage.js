/* ============================================================
   Devora — Storage Module
   Abstraction over chrome.storage.local for tasks, settings,
   and preferences persistence.
   ============================================================ */

const StorageManager = {
  /* ---- Default Settings ---- */
  defaults: {
    get settings() {
      return (typeof CONFIG !== 'undefined' && CONFIG.DEFAULTS) ? CONFIG.DEFAULTS : {
        theme: 'dark',
        clock: {
          format24: true,
          showSeconds: true,
          showDate: true
        },
        background: {
          preset: 'particles',
          customImage: null,
          animation: true,
          opacity: 0.4
        },
        dynamicWallpaper: {
          enabled: true,
          provider: 'wikimedia',
          category: 'landscapes',
          interval: 'newtab',
          cacheSize: 5,
          fallbackTheme: 'cosmic',
          overlayOpacity: 0.35,
          blur: 0,
          showAttribution: true
        },
        search: {
          engine: 'google'
        },
        tasks: {
          dailyReset: true,
          notifications: false
        },
        greeting: {
          name: 'Developer'
        },
        pomodoro: {
          workMinutes: 25,
          breakMinutes: 5,
          longBreakMinutes: 15,
          sessionsBeforeLongBreak: 4
        },
        quotes: {
          enabled: true,
          rotateOnNewTab: true
        }
      };
    }
  },

  /* ---- Generic Get/Set ---- */
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] ?? null);
      });
    });
  },

  async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  },

  async remove(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, resolve);
    });
  },

  /* ---- Settings ---- */
  async getSettings() {
    const key = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.SETTINGS) || 'devora_settings';
    const settings = await this.get(key);
    const defaults = this.defaults.settings;
    if (!settings) {
      await this.saveSettings(defaults);
      return { ...defaults };
    }
    // Merge with defaults to fill any missing keys from updates
    return this._deepMerge(defaults, settings);
  },

  async saveSettings(settings) {
    const key = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.SETTINGS) || 'devora_settings';
    await this.set(key, settings);
  },

  async updateSetting(path, value) {
    const settings = await this.getSettings();
    const keys = path.split('.');
    let obj = settings;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    await this.saveSettings(settings);
    return settings;
  },

  /* ---- Quick Links ---- */
  async getQuickLinks() {
    const key = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.QUICK_LINKS) || 'devora_quicklinks';
    const links = await this.get(key);
    if (links) return links;
    
    const defaultLinks = (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_QUICK_LINKS) 
      ? CONFIG.DEFAULT_QUICK_LINKS 
      : [
          { id: '1', name: 'GitHub', url: 'https://github.com', icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>` },
          { id: '2', name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 21h-10v-2h10v2zm6-11.665l-1.621-9.335-1.993.346 1.621 9.335 1.993-.346zm-5.964 6.937l-9.746-.975-.186 2.016 9.746.975.186-2.016zm.538-2.587l-9.276-2.608-.526 1.954 9.276 2.608.526-1.954zm1.204-2.413l-8.297-4.676-.994 1.738 8.297 4.676.994-1.738zm2.118-1.904l-6.63-6.976-1.452 1.38 6.63 6.976 1.452-1.38zM18 21v-6h-2v6h-2v-8h6v8h-2z"/></svg>` },
          { id: '3', name: 'MDN', url: 'https://developer.mozilla.org', icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 2.5h-7.497v4.608h2.247v-2.358h2.996v12.5h-2.996v-2.358h-2.247v4.608h7.497c.277 0 .502-.225.502-.502v-16.996c0-.277-.225-.502-.502-.502zm-10.997 0h-7.497c-.278 0-.504.225-.504.502v16.996c0 .277.226.502.504.502h7.497v-4.608h-2.247v2.358h-2.996v-12.5h2.996v2.358h2.247v-4.608z"/></svg>` },
          { id: '4', name: 'npm', url: 'https://www.npmjs.com', icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z"/></svg>` },
          { id: '5', name: 'ChatGPT', url: 'https://chat.openai.com', icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>` },
          { id: '6', name: 'Dev.to', url: 'https://dev.to', icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.42 10.05c-.18-.16-.46-.23-.84-.23H6v4.36h.58c.37 0 .65-.08.84-.23.2-.16.3-.46.3-.88v-2.13c0-.42-.1-.72-.3-.89zm15.54-2.68H1.04C.47 7.37 0 7.84 0 8.41v7.18c0 .57.47 1.04 1.04 1.04h21.92c.57 0 1.04-.47 1.04-1.04V8.41c0-.57-.47-1.04-1.04-1.04zM8.66 13.5c0 .85-.35 1.51-.99 1.98-.33.24-.79.36-1.39.36H4.5V8.16h1.78c.6 0 1.06.12 1.39.36.64.47.99 1.13.99 1.98v3zm3.56 2.34H10.2V8.16h2.02v5.08l2.63-5.08h2.02v7.68h-2.02v-5.08l-2.63 5.08zm7.36-.84c-.2.26-.57.49-.96.62-.37.12-.79.18-1.26.18-.41 0-.79-.05-1.16-.18-.37-.12-.65-.3-.84-.53-.2-.24-.31-.53-.31-.87V14h1.94v.39c0 .17.06.3.18.39.12.08.29.13.5.13s.38-.04.5-.13c.12-.08.18-.21.18-.37 0-.18-.08-.33-.24-.45-.16-.12-.42-.27-.78-.43-.63-.27-1.09-.56-1.38-.87-.3-.31-.44-.72-.44-1.24 0-.68.23-1.21.68-1.57.46-.37 1.05-.55 1.78-.55.72 0 1.3.18 1.74.53.44.35.66.84.66 1.48V11h-1.94v-.24c0-.15-.06-.27-.17-.37-.11-.1-.27-.14-.48-.14-.18 0-.33.05-.44.14-.11.1-.17.24-.17.43 0 .16.08.3.24.42.16.12.43.27.8.46.63.3 1.08.59 1.37.88.28.3.43.7.43 1.22 0 .72-.24 1.27-.68 1.64z"/></svg>` },
          { id: '7', name: 'CodePen', url: 'https://codepen.io', icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.144 13.067v-2.134L16.55 12zm1.857 1.151L12 19.848l-7.993-5.622V9.782L12 4.16l7.993 5.615v4.643h.008zM12 0L0 8.441v7.094l12 8.452 12-8.452V8.441L12 0zM5.856 13.067l1.594-1.067-1.594-1.067v2.134zm6.144 2.9l-4.288-3.026L5.856 14l6.144 4.324L18.144 14l-1.856-1.059-4.288 3.026zM12 8.033l-4.288 3.026 4.288 3.026 4.288-3.026L12 8.033z"/></svg>` }
        ];
    await this.saveQuickLinks(defaultLinks);
    return defaultLinks;
  },
  async saveQuickLinks(links) {
    const key = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.QUICK_LINKS) || 'devora_quicklinks';
    await this.set(key, links);
  },

  /* ---- Tasks ---- */
  _getTaskKey(date) {
    const prefix = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.TASKS) || 'devora_tasks';
    return `${prefix}_${date}`;
  },

  _getDateString(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  async getTasks(date) {
    const todayStr = this._getDateString();
    const targetDate = date || todayStr;
    const key = this._getTaskKey(targetDate);
    let tasks = await this.get(key);
    tasks = tasks || [];

    // If loading today's tasks, rollover any incomplete tasks from previous 7 days
    if (targetDate === todayStr) {
      const today = new Date();
      let rolledOver = false;
      const existingIds = new Set(tasks.map(t => t.id));

      for (let i = 1; i <= 7; i++) {
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - i);
        const pastKey = this._getTaskKey(this._getDateString(pastDate));
        const pastTasks = await this.get(pastKey);
        if (Array.isArray(pastTasks)) {
          for (const pt of pastTasks) {
            if (!pt.completed && !existingIds.has(pt.id)) {
              tasks.push({
                ...pt,
                pinned: true // Ensure overdue rolled-over task is pinned
              });
              existingIds.add(pt.id);
              rolledOver = true;
            }
          }
        }
      }
      if (rolledOver) {
        await this.saveTasks(targetDate, tasks);
      }
    }

    return tasks;
  },

  async saveTasks(date, tasks) {
    const key = this._getTaskKey(date || this._getDateString());
    await this.set(key, tasks);
    if (typeof SyncManager !== 'undefined') SyncManager.scheduleSync();
  },

  async addTask(task) {
    const today = this._getDateString();
    const tasks = await this.getTasks(today);
    const newTask = {
      id: crypto.randomUUID ? crypto.randomUUID() : this._generateId(),
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      dueTime: task.dueTime || null,
      dueDate: task.dueDate || today,
      completed: false,
      pinned: task.pinned !== undefined ? task.pinned : true,
      createdAt: Date.now(),
      completedAt: null,
      ...task
    };
    tasks.push(newTask);
    await this.saveTasks(today, tasks);

    return tasks;
  },

  async updateTask(taskId, updates) {
    const today = this._getDateString();
    const tasks = await this.getTasks(today);
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...updates };
      if (updates.completed) {
        tasks[idx].completedAt = Date.now();
      }
      await this.saveTasks(today, tasks);
    }
    return tasks;
  },

  async toggleTaskPin(taskId, date) {
    const dateKey = date || this._getDateString();
    const tasks = await this.getTasks(dateKey);
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const isCurrentlyPinned = tasks[idx].pinned !== false;
      tasks[idx].pinned = !isCurrentlyPinned;
      await this.saveTasks(dateKey, tasks);
    }
    return tasks;
  },

  /* ---- Trash Storage ---- */
  async getTrashTasks() {
    const trash = await this.get('devora_trash_tasks');
    return trash || [];
  },

  async saveTrashTasks(trash) {
    await this.set('devora_trash_tasks', trash);
  },

  async deleteTask(taskId, date) {
    const dateKey = date || this._getDateString();
    const tasks = await this.getTasks(dateKey);
    const taskToDelete = tasks.find(t => t.id === taskId);
    
    if (taskToDelete) {
      const trash = await this.getTrashTasks();
      const cleanTrash = trash.filter(t => t.id !== taskId);
      cleanTrash.unshift({
        ...taskToDelete,
        deletedAt: Date.now(),
        originalDate: dateKey
      });
      await this.saveTrashTasks(cleanTrash);
    }

    const filtered = tasks.filter(t => t.id !== taskId);
    await this.saveTasks(dateKey, filtered);
    return filtered;
  },

  async restoreTaskFromTrash(taskId) {
    const trash = await this.getTrashTasks();
    const taskIdx = trash.findIndex(t => t.id === taskId);
    if (taskIdx === -1) return trash;

    const [restoredTask] = trash.splice(taskIdx, 1);
    await this.saveTrashTasks(trash);

    const targetDate = restoredTask.originalDate || this._getDateString();
    delete restoredTask.deletedAt;
    delete restoredTask.originalDate;

    const activeTasks = await this.getTasks(targetDate);
    if (!activeTasks.some(t => t.id === restoredTask.id)) {
      activeTasks.push(restoredTask);
      await this.saveTasks(targetDate, activeTasks);
    }

    return trash;
  },

  async deleteTaskPermanently(taskId) {
    let trash = await this.getTrashTasks();
    trash = trash.filter(t => t.id !== taskId);
    await this.saveTrashTasks(trash);
    return trash;
  },

  async emptyTrash() {
    await this.saveTrashTasks([]);
    return [];
  },

  async toggleTask(taskId) {
    const today = this._getDateString();
    const tasks = await this.getTasks(today);
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      tasks[idx].completed = !tasks[idx].completed;
      tasks[idx].completedAt = tasks[idx].completed ? Date.now() : null;
      await this.saveTasks(today, tasks);
    }
    return tasks;
  },

  /* ---- Task History ---- */
  async getTaskHistory(days = 7) {
    const history = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = this._getDateString(d);
      const tasks = await this.getTasks(dateStr);
      if (tasks.length > 0) {
        history.push({ date: dateStr, tasks });
      }
    }
    return history;
  },

  /* ---- Pomodoro State ---- */
  async getPomodoroState() {
    const key = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.POMO_STATE) || 'devora_pomodoro';
    const state = await this.get(key);
    return state || {
      isRunning: false,
      mode: 'work', // 'work' | 'break' | 'longBreak'
      timeRemaining: 25 * 60,
      sessionsCompleted: 0,
      startedAt: null,
      autoStart: false,
      taskLabel: ''
    };
  },

  async savePomodoroState(state) {
    const key = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.POMO_STATE) || 'devora_pomodoro';
    await this.set(key, state);
  },

  /* ---- Sticky Notes ---- */
  async getNotes() {
    const key = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.STICKY_NOTES) || 'devora_sticky_notes';
    const notes = await this.get(key);
    if (!notes) {
      const initialNotes = [{
        id: 'welcome_note',
        title: '💡 Quick Dev Note',
        content: 'Type your ideas, code snippets, or todo list here!\n• Connected with Google Sync\n• Drag anywhere or resize',
        color: 'yellow',
        x: 50,
        y: 150,
        width: 270,
        height: 210,
        pinned: true,
        updatedAt: Date.now()
      }];
      await this.set(key, initialNotes);
      return initialNotes;
    }
    return notes;
  },

  async saveNotes(notes) {
    const key = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.STICKY_NOTES) || 'devora_sticky_notes';
    await this.set(key, notes);
    if (typeof SyncManager !== 'undefined') SyncManager.scheduleSync();
  },

  async addNote(noteData = {}) {
    const notes = await this.getNotes();
    const newNote = {
      id: crypto.randomUUID ? crypto.randomUUID() : this._generateId(),
      title: noteData.title || 'New Note',
      content: noteData.content || '',
      color: noteData.color || 'yellow',
      x: noteData.x || Math.min(window.innerWidth - 300, 60 + (notes.length * 35)),
      y: noteData.y || Math.min(window.innerHeight - 250, 140 + (notes.length * 35)),
      width: 300,
      height: 260,
      pinned: true,
      updatedAt: Date.now()
    };
    notes.push(newNote);
    await this.saveNotes(notes);
    return notes;
  },

  async updateNote(id, updates) {
    const notes = await this.getNotes();
    const idx = notes.findIndex(n => n.id === id);
    if (idx !== -1) {
      notes[idx] = { ...notes[idx], ...updates, updatedAt: Date.now() };
      await this.saveNotes(notes);
    }
    return notes;
  },

  /* ---- Sticky Notes Trash Storage ---- */
  async getTrashNotes() {
    const trash = await this.get('devora_trash_sticky_notes');
    return trash || [];
  },

  async saveTrashNotes(trash) {
    await this.set('devora_trash_sticky_notes', trash);
  },

  async deleteNote(id) {
    const notes = await this.getNotes();
    const noteToDelete = notes.find(n => n.id === id);

    if (noteToDelete) {
      const trash = await this.getTrashNotes();
      const cleanTrash = trash.filter(n => n.id !== id);
      cleanTrash.unshift({
        ...noteToDelete,
        deletedAt: Date.now()
      });
      await this.saveTrashNotes(cleanTrash);
    }

    const filtered = notes.filter(n => n.id !== id);
    await this.saveNotes(filtered);
    return filtered;
  },

  async restoreNoteFromTrash(id) {
    const trash = await this.getTrashNotes();
    const noteIdx = trash.findIndex(n => n.id === id);
    if (noteIdx === -1) return trash;

    const [restoredNote] = trash.splice(noteIdx, 1);
    await this.saveTrashNotes(trash);

    delete restoredNote.deletedAt;
    const activeNotes = await this.getNotes();
    if (!activeNotes.some(n => n.id === restoredNote.id)) {
      activeNotes.push(restoredNote);
      await this.saveNotes(activeNotes);
    }

    return trash;
  },

  async deleteNotePermanently(id) {
    let trash = await this.getTrashNotes();
    trash = trash.filter(n => n.id !== id);
    await this.saveTrashNotes(trash);
    return trash;
  },

  async emptyNotesTrash() {
    await this.saveTrashNotes([]);
    return [];
  },

  /* ---- Google Keep Local Cache ---- */
  async getKeepNotes() {
    const notes = await this.get('devora_google_keep_cache');
    return notes || [];
  },

  async saveKeepNotes(notes) {
    await this.set('devora_google_keep_cache', notes);
  },

  /* ---- Google Account Sync ---- */
  async getGoogleUser() {
    const key = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.GOOGLE_USER) || 'devora_google_user';
    const user = await this.get(key);
    return user || { signedIn: false, email: null, name: null, picture: null, lastSynced: null };
  },

  async saveGoogleUser(user) {
    const key = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.GOOGLE_USER) || 'devora_google_user';
    await this.set(key, user);
  },

  async signInGoogle() {
    return new Promise(async (resolve) => {
      if (typeof chrome === 'undefined' || !chrome.identity || !chrome.identity.getAuthToken) {
        console.warn('[Storage] chrome.identity API is not available.');
        resolve({ signedIn: false, email: null, name: null, picture: null, lastSynced: null, error: 'Chrome Identity API is not available' });
        return;
      }

      // Always clear cached tokens before requesting so Chrome doesn't reuse an old or revoked token
      if (chrome.identity.clearAllCachedAuthTokens) {
        try {
          await new Promise(r => chrome.identity.clearAllCachedAuthTokens(r));
        } catch (e) {}
      }

      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError || !token) {
          const rawMsg = chrome.runtime.lastError?.message || 'Authentication token could not be retrieved';
          console.warn('[Storage] Google OAuth error:', rawMsg);
          let friendlyError = 'Sign-in cancelled or failed';
          if (rawMsg.includes('user did not approve') || rawMsg.includes('User cancelled') || rawMsg.includes('closed the window')) {
            friendlyError = 'Google sign-in was cancelled';
          } else if (rawMsg.includes('OAuth2 client configuration') || rawMsg.includes('client ID')) {
            friendlyError = 'Google OAuth client configuration missing or invalid';
          } else if (rawMsg.includes('network') || rawMsg.includes('internet')) {
            friendlyError = 'Network error during Google sign-in';
          }
          resolve({ signedIn: false, email: null, name: null, picture: null, lastSynced: null, error: friendlyError, rawError: rawMsg });
          return;
        }

        // Fetch user profile from Google with the fresh token
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (data && data.email) {
            const user = {
              signedIn: true,
              email: data.email,
              name: data.name || data.given_name || data.email.split('@')[0],
              picture: data.picture || null,
              lastSynced: Date.now()
            };
            await this.saveGoogleUser(user);
            resolve(user);
          } else {
            resolve({ signedIn: false, email: null, name: null, picture: null, lastSynced: null, error: 'Email address not found in Google profile' });
          }
        } catch (e) {
          console.error('[Storage] Error fetching user profile:', e);
          resolve({ signedIn: false, email: null, name: null, picture: null, lastSynced: null, error: e.message || 'Error fetching user profile' });
        }
      });
    });
  },

  async signOutGoogle() {
    // 1. Immediately wipe local user session state
    const user = { signedIn: false, email: null, name: null, picture: null, lastSynced: null };
    await this.saveGoogleUser(user);

    // 2. Gather all active tokens across components to revoke and remove
    const tokensToRevoke = new Set();
    if (typeof GoogleKeepComponent !== 'undefined' && GoogleKeepComponent._token) {
      tokensToRevoke.add(GoogleKeepComponent._token);
    }
    if (typeof GoogleTasksComponent !== 'undefined' && GoogleTasksComponent._token) {
      tokensToRevoke.add(GoogleTasksComponent._token);
    }
    if (typeof CalendarComponent !== 'undefined' && CalendarComponent._token) {
      tokensToRevoke.add(CalendarComponent._token);
    }

    if (typeof chrome !== 'undefined' && chrome.identity) {
      try {
        const token = await new Promise(resolve => {
          chrome.identity.getAuthToken({ interactive: false }, (tok) => {
            if (chrome.runtime.lastError) resolve(null);
            else resolve(tok);
          });
        });
        if (token) tokensToRevoke.add(token);
      } catch (e) {}

      // Revoke each token on Google servers & remove from Chrome identity cache
      for (const tok of tokensToRevoke) {
        if (!tok) continue;
        try {
          // Google OAuth 2.0 Token Revocation (POST with body & fallback query)
          await fetch('https://oauth2.googleapis.com/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `token=${encodeURIComponent(tok)}`
          }).catch(async () => {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tok)}`, { method: 'POST' });
          });
        } catch (e) {}

        if (chrome.identity.removeCachedAuthToken) {
          try {
            await new Promise(r => chrome.identity.removeCachedAuthToken({ token: tok }, r));
          } catch (e) {}
        }
      }

      // Purge all cached auth tokens across all scopes in Chrome Identity
      if (chrome.identity.clearAllCachedAuthTokens) {
        try {
          await new Promise(r => chrome.identity.clearAllCachedAuthTokens(r));
        } catch(e) {}
      }
    }

    // 3. Clean sub-components in memory
    if (typeof GoogleTasksComponent !== 'undefined' && typeof GoogleTasksComponent.clear === 'function') {
      GoogleTasksComponent.clear();
    }
    if (typeof GoogleKeepComponent !== 'undefined' && typeof GoogleKeepComponent.clear === 'function') {
      GoogleKeepComponent.clear();
    }
    if (typeof CalendarComponent !== 'undefined' && typeof CalendarComponent.clear === 'function') {
      CalendarComponent.clear();
    }

    // 4. Reset SyncManager state and cancel any debounced push
    if (typeof SyncManager !== 'undefined') {
      SyncManager.status = 'no-account';
      SyncManager.lastSyncedAt = null;
      if (SyncManager._pendingSync) {
        clearTimeout(SyncManager._pendingSync);
        SyncManager._pendingSync = null;
      }
      if (typeof SyncManager._setStatus === 'function') {
        SyncManager._setStatus('no-account');
      } else if (typeof SyncManager._notifyStatus === 'function') {
        SyncManager._notifyStatus();
      }
    }

    // 5. Clean local device sync metadata email if present
    try {
      const meta = await this.get('devora_sync_meta_local');
      if (meta && meta.email) {
        delete meta.email;
        await this.set('devora_sync_meta_local', meta);
      }
    } catch (e) {}

    // 6. Reload and redraw workspace tasks & notes to remove Google-synced items
    try {
      if (typeof TasksComponent !== 'undefined' && typeof TasksComponent.loadTasks === 'function') {
        await TasksComponent.loadTasks();
        if (typeof TasksComponent.render === 'function') TasksComponent.render();
      }
    } catch (e) {}

    try {
      if (typeof NotesComponent !== 'undefined') {
        NotesComponent.googleUser = user;
        if (NotesComponent.currentFilter === 'keep') NotesComponent.currentFilter = 'all';
        if (typeof NotesComponent.loadNotes === 'function') {
          await NotesComponent.loadNotes();
          if (typeof NotesComponent.render === 'function') NotesComponent.render();
          if (typeof NotesComponent.renderPanel === 'function') NotesComponent.renderPanel();
        }
      }
    } catch (e) {}

    return user;
  },

  /* ---- Helpers ---- */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  _deepMerge(defaults, override) {
    const result = { ...defaults };
    for (const key of Object.keys(override)) {
      if (
        override[key] &&
        typeof override[key] === 'object' &&
        !Array.isArray(override[key]) &&
        defaults[key] &&
        typeof defaults[key] === 'object'
      ) {
        result[key] = this._deepMerge(defaults[key], override[key]);
      } else {
        result[key] = override[key];
      }
    }
    return result;
  }
};
