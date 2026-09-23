/* ============================================================
   Devora — Main Application Orchestrator
   Initializes all components, applies theme, registers
   keyboard shortcuts, and handles daily reset.
   ============================================================ */

const DevoraApp = {
  async init() {
    // Load settings and apply theme
    const settings = await StorageManager.getSettings();
    this.applyTheme(settings.theme);

    // Initialize all components
    await SyncManager.init();
    await Promise.all([
      typeof WallpaperManager !== 'undefined' ? WallpaperManager.init() : Promise.resolve(),
      BackgroundComponent.init(),
      typeof WallpaperAttributionComponent !== 'undefined' ? WallpaperAttributionComponent.init() : Promise.resolve(),
      GreetingComponent.init(),
      ClockComponent.init(),
      SearchComponent.init(),
      TasksComponent.init(),
      NotesComponent.init(),
      QuickLinksComponent.init(),
      QuotesComponent.init(),
      PomodoroComponent.init(),
      CalendarComponent.init(),
      SettingsComponent.init()
    ]);

    // Register keyboard shortcuts
    this.registerShortcuts();

    // Check daily reset
    this.checkDailyReset();

    console.log('✨ Equinox Workspace initialized');
  },

  applyTheme(theme) {
    let effectiveTheme = theme;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const updated = e.matches ? 'dark' : 'light';
        this._setThemeAttributes(updated);
      });
    } else {
      effectiveTheme = theme || 'dark';
    }
    this._setThemeAttributes(effectiveTheme);
  },

  _setThemeAttributes(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('devora_theme', theme);
    } catch(err) {}

    // Map theme to hex primary color for browser toolbar / tab strip tinting
    const themeMetaColors = {
      dark: '#05070e',
      light: '#f3f4f8',
      developer: '#080d1c',
      cyberpunk: '#0a0a12',
      sunset: '#150d1a',
      emerald: '#061814'
    };

    const color = themeMetaColors[theme] || '#05070e';
    let meta = document.getElementById('theme-color-meta');
    if (!meta) {
      meta = document.createElement('meta');
      meta.id = 'theme-color-meta';
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);
  },

  registerShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in input fields
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;

      // Escape — close any modal or settings
      if (e.key === 'Escape') {
        const modal = document.getElementById('modal-overlay');
        if (modal && modal.classList.contains('active')) {
          TasksComponent.closeModal();
          return;
        }
        if (SettingsComponent.isOpen) {
          SettingsComponent.close();
          return;
        }
      }

      if (isInput) return;

      // '/' — Focus search
      if (e.key === '/') {
        e.preventDefault();
        SearchComponent.focus();
      }
    });
  },

  async checkDailyReset() {
    const settings = await StorageManager.getSettings();
    if (settings.tasks?.dailyReset !== false) {
      // Tasks are already date-keyed, so opening a new day
      // automatically shows a fresh list. No explicit reset needed.
      // The storage module handles this via date-keyed task storage.
    }
  }
};

// Boot the application
document.addEventListener('DOMContentLoaded', () => {
  DevoraApp.init();
});
