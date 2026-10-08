/* ============================================================
   Devora — Settings Component
   Full settings panel with theme, clock, background, search,
   tasks, and about sections.
   ============================================================ */

const SettingsComponent = {
  settings: null,
  isOpen: false,

  async init() {
    this.settings = await StorageManager.getSettings();
    this.bindTrigger();
  },

  bindTrigger() {
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.toggle());
    }
  },

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  async open() {
    this.settings = await StorageManager.getSettings();
    this.googleUser = await StorageManager.getGoogleUser();
    this.isOpen = true;
    this.renderPanel();
  },

  close() {
    this.isOpen = false;
    const panel = document.getElementById('settings-panel');
    if (panel) {
      panel.classList.remove('active');
      setTimeout(() => { panel.remove(); }, 300);
    }
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => { overlay.remove(); }, 300);
    }
  },

  renderPanel() {
    // Remove existing panel
    document.getElementById('settings-panel')?.remove();
    document.getElementById('settings-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'settings-overlay';
    overlay.className = 'settings-overlay';
    document.body.appendChild(overlay);

    const panel = document.createElement('div');
    panel.id = 'settings-panel';
    panel.className = 'settings-panel settings-drawer glass-card';
    panel.innerHTML = this._buildSettingsHTML();
    document.body.appendChild(panel);

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      panel.classList.add('active');
    });

    this.bindPanelEvents(panel, overlay);
    this._attachSyncStatus(panel);
  },

  _attachSyncStatus(panel) {
    if (typeof SyncManager === 'undefined') return;
    const badge = panel.querySelector('#settings-sync-badge');
    const text = badge?.querySelector('.sync-text');
    if (!badge || !text) return;

    const updateUI = (status, lastSync) => {
      badge.className = 'sync-status-badge ' + status;
      if (status === 'syncing') text.textContent = 'Syncing...';
      else if (status === 'offline') text.textContent = 'Offline (Local only)';
      else if (status === 'error') text.textContent = 'Sync Error';
      else if (status === 'idle') {
        if (lastSync) {
          const diff = Math.floor((Date.now() - lastSync) / 60000);
          text.textContent = diff === 0 ? 'Synced just now' : `Synced ${diff}m ago`;
        } else {
          text.textContent = '✓ Connected';
        }
      }
    };
    
    updateUI(SyncManager.status, SyncManager.lastSyncedAt);
    SyncManager.onStatusChange((status, lastSync) => updateUI(status, lastSync));
  },

  _buildSettingsHTML() {
    const s = this.settings;
    const g = this.googleUser || { signedIn: false };
    const dw = s.dynamicWallpaper || {
      enabled: true,
      provider: 'wikimedia',
      category: 'landscapes',
      interval: 'newtab',
      cacheSize: 5,
      fallbackTheme: 'cosmic',
      overlayOpacity: 0.35,
      blur: 0,
      showAttribution: true
    };
    const activeProvider = typeof ImageProviderRegistry !== 'undefined' ? ImageProviderRegistry.get(dw.provider || 'wikimedia') : null;
    const categoryList = activeProvider?.categories || [
      { id: 'landscapes', label: 'Scenic Landscapes' },
      { id: 'nature', label: 'Nature & Wildlife' },
      { id: 'architecture', label: 'World Architecture' },
      { id: 'astronomy', label: 'Night Skies & Astronomy' },
      { id: 'featured', label: 'Featured Masterpieces' }
    ];
    return `
      <div class="settings-header">
        <h2 class="settings-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
          </svg>
          Settings & Account
        </h2>
        <button class="btn-icon settings-close-btn" id="settings-close" title="Close Drawer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="settings-body">

        <!-- Data Backup & Restore -->
        <div class="settings-section settings-backup-section">
          <h3 class="settings-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Data Backup & Restore
          </h3>
          <div class="backup-card glass-card" style="padding: 16px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
            <p style="margin: 0 0 14px 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
              Export all your tasks, sticky notes, and personalized settings into a JSON backup file, or restore your workspace data anytime on any device.
            </p>
            <div class="backup-actions-row" style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="btn btn-sm btn-primary backup-action-btn" id="google-export-btn" title="Export Backup JSON">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export Backup</span>
              </button>
              <button class="btn btn-sm btn-secondary backup-action-btn" id="google-import-btn" title="Import Backup JSON">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span>Import Backup</span>
              </button>
              <input type="file" id="google-import-file" accept=".json" style="display: none;">
            </div>
          </div>
        </div>

        <!-- Sticky Notes -->
        <div class="settings-section">
          <h3 class="settings-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            Notes
          </h3>
          <div class="settings-option">
            <label>Add New Sticky Note</label>
            <button class="btn btn-sm btn-primary" id="settings-add-note-btn">+ Create Note</button>
          </div>
        </div>
        <!-- Appearance -->
        <div class="settings-section">
          <h3 class="settings-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            Appearance
          </h3>
          <div class="settings-option block-option">
            <label>Theme Selection</label>
            <div class="settings-theme-grid">
              <button class="theme-option ${s.theme === 'dark' ? 'active' : ''}" data-setting="theme" data-value="dark">
                <span class="theme-preview theme-dark"></span>
                <span>Dark</span>
              </button>
              <button class="theme-option ${s.theme === 'light' ? 'active' : ''}" data-setting="theme" data-value="light">
                <span class="theme-preview theme-light"></span>
                <span>Light</span>
              </button>
              <button class="theme-option ${s.theme === 'developer' ? 'active' : ''}" data-setting="theme" data-value="developer">
                <span class="theme-preview theme-developer"></span>
                <span>Developer</span>
              </button>
              <button class="theme-option ${s.theme === 'cyberpunk' ? 'active' : ''}" data-setting="theme" data-value="cyberpunk">
                <span class="theme-preview theme-cyberpunk"></span>
                <span>Cyberpunk</span>
              </button>
              <button class="theme-option ${s.theme === 'sunset' ? 'active' : ''}" data-setting="theme" data-value="sunset">
                <span class="theme-preview theme-sunset"></span>
                <span>Sunset</span>
              </button>
              <button class="theme-option ${s.theme === 'emerald' ? 'active' : ''}" data-setting="theme" data-value="emerald">
                <span class="theme-preview theme-emerald"></span>
                <span>Emerald</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Greeting -->
        <div class="settings-section">
          <h3 class="settings-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Greeting
          </h3>
          <div class="settings-option">
            <label for="settings-name">Your Name</label>
            <input type="text" id="settings-name" class="form-input" value="${Utils.escapeHtml(s.greeting?.name || 'Developer')}" placeholder="Developer">
          </div>
        </div>

        <!-- Clock -->
        <div class="settings-section">
          <h3 class="settings-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Clock
          </h3>
          <div class="settings-option">
            <label>Time Format</label>
            <div class="settings-toggle-group">
              <button class="toggle-option ${s.clock?.format24 === true ? 'active' : ''}" data-setting="clock.format24" data-value="true">24-hour</button>
              <button class="toggle-option ${s.clock?.format24 !== true ? 'active' : ''}" data-setting="clock.format24" data-value="false">12-hour</button>
            </div>
          </div>
          <div class="settings-option">
            <label>Show Seconds</label>
            <label class="switch">
              <input type="checkbox" id="settings-show-seconds" ${s.clock?.showSeconds === true ? 'checked' : ''} data-setting="clock.showSeconds">
              <span class="switch-slider"></span>
            </label>
          </div>
          <div class="settings-option">
            <label>Show Date</label>
            <label class="switch">
              <input type="checkbox" id="settings-show-date" ${s.clock?.showDate !== false ? 'checked' : ''} data-setting="clock.showDate">
              <span class="switch-slider"></span>
            </label>
          </div>
        </div>

        <!-- Dynamic Open-Source Wallpaper -->
        <div class="settings-section">
          <h3 class="settings-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Dynamic Background (Open-Source)
          </h3>
          
          <div class="settings-option">
            <div class="settings-option-info">
              <label>Enable Dynamic Wallpapers</label>
              <div class="settings-subdesc">Auto-rotate openly licensed enterprise-friendly imagery</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="settings-dynamic-bg-enabled" ${dw.enabled !== false ? 'checked' : ''} data-setting="dynamicWallpaper.enabled">
              <span class="switch-slider"></span>
            </label>
          </div>

          <!-- 1. Image Provider -->
          <div class="settings-option block-option">
            <div class="settings-option-info">
              <label for="settings-dw-provider">Image Provider</label>
              <div class="settings-subdesc">Commercially viable, enterprise-compliant sources</div>
            </div>
            <select id="settings-dw-provider" class="form-input form-select" data-setting="dynamicWallpaper.provider">
              <option value="wikimedia" ${dw.provider === 'wikimedia' ? 'selected' : ''}>Wikimedia Commons (CC-BY-SA / CC0)</option>
              <option value="nasa" ${dw.provider === 'nasa' ? 'selected' : ''}>NASA Earth & Cosmos (Public Domain)</option>
              <option value="local" ${dw.provider === 'local' ? 'selected' : ''}>Curated Offline Fallbacks (Zero Network)</option>
            </select>
          </div>

          <!-- 2. Category / Tags -->
          <div class="settings-option block-option">
            <div class="settings-option-info">
              <label for="settings-dw-category">Image Category / Tags</label>
              <div class="settings-subdesc">Genre of photography to fetch</div>
            </div>
            <select id="settings-dw-category" class="form-input form-select" data-setting="dynamicWallpaper.category">
              ${categoryList.map(c => `<option value="${c.id}" ${dw.category === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
            </select>
          </div>

          <!-- 3. Change Interval -->
          <div class="settings-option block-option">
            <div class="settings-option-info">
              <label for="settings-dw-interval">Change Interval</label>
              <div class="settings-subdesc">Frequency for rotating background</div>
            </div>
            <select id="settings-dw-interval" class="form-input form-select" data-setting="dynamicWallpaper.interval">
              <option value="newtab" ${dw.interval === 'newtab' ? 'selected' : ''}>Every New Tab</option>
              <option value="hourly" ${dw.interval === 'hourly' ? 'selected' : ''}>Hourly (Every 1 Hour)</option>
              <option value="6hours" ${dw.interval === '6hours' ? 'selected' : ''}>Every 6 Hours</option>
              <option value="daily" ${dw.interval === 'daily' ? 'selected' : ''}>Daily (Once per day)</option>
              <option value="manual" ${dw.interval === 'manual' ? 'selected' : ''}>Manual Only (via Shuffle button)</option>
            </select>
          </div>

          <!-- 4. Number of Cached Images -->
          <div class="settings-option">
            <div class="settings-option-info">
              <label for="settings-dw-cache-size">Cached Images Pool</label>
              <div class="settings-subdesc">Pre-cached pool for instant 0ms load & offline use</div>
            </div>
            <div class="settings-range-wrap">
              <input type="range" id="settings-dw-cache-size" class="settings-range" min="1" max="10" value="${dw.cacheSize || 5}" data-setting="dynamicWallpaper.cacheSize">
              <span class="settings-range-value" id="settings-dw-cache-size-val">${dw.cacheSize || 5} images</span>
            </div>
          </div>

          <!-- 5. Fallback Backgrounds -->
          <div class="settings-option block-option">
            <div class="settings-option-info">
              <label for="settings-dw-fallback">Fallback Background</label>
              <div class="settings-subdesc">Theme used when offline or behind restricted firewall</div>
            </div>
            <select id="settings-dw-fallback" class="form-input form-select" data-setting="dynamicWallpaper.fallbackTheme">
              <option value="cosmic" ${dw.fallbackTheme === 'cosmic' ? 'selected' : ''}>Deep Cosmic Night</option>
              <option value="aurora" ${dw.fallbackTheme === 'aurora' ? 'selected' : ''}>Emerald Borealis</option>
              <option value="obsidian" ${dw.fallbackTheme === 'obsidian' ? 'selected' : ''}>Obsidian Minimal Slate</option>
              <option value="sunset" ${dw.fallbackTheme === 'sunset' ? 'selected' : ''}>Sunset Horizon Dusk</option>
              <option value="nebula" ${dw.fallbackTheme === 'nebula' ? 'selected' : ''}>Violet Starlight Nebula</option>
            </select>
          </div>

          <!-- Eye Contrast Darkening Overlay -->
          <div class="settings-option">
            <div class="settings-option-info">
              <label for="settings-dw-overlay">Darkening Tint Overlay</label>
              <div class="settings-subdesc">Ensures high eye contrast and readability over photos</div>
            </div>
            <div class="settings-range-wrap">
              <input type="range" id="settings-dw-overlay" class="settings-range" min="0" max="80" value="${Math.round((dw.overlayOpacity ?? 0.35) * 100)}" data-setting="dynamicWallpaper.overlayOpacity">
              <span class="settings-range-value" id="settings-dw-overlay-val">${Math.round((dw.overlayOpacity ?? 0.35) * 100)}%</span>
            </div>
          </div>

          <!-- Background Blur Filter -->
          <div class="settings-option">
            <div class="settings-option-info">
              <label for="settings-dw-blur">Background Blur</label>
              <div class="settings-subdesc">Optional focus blur (0px - 10px)</div>
            </div>
            <div class="settings-range-wrap">
              <input type="range" id="settings-dw-blur" class="settings-range" min="0" max="10" value="${dw.blur || 0}" data-setting="dynamicWallpaper.blur">
              <span class="settings-range-value" id="settings-dw-blur-val">${dw.blur || 0}px</span>
            </div>
          </div>

          <!-- Attribution Toggle -->
          <div class="settings-option">
            <div class="settings-option-info">
              <label>License Attribution Badge</label>
              <div class="settings-subdesc">Show photographer credit & CC license pill in corner</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="settings-dw-attribution" ${dw.showAttribution !== false ? 'checked' : ''} data-setting="dynamicWallpaper.showAttribution">
              <span class="switch-slider"></span>
            </label>
          </div>

          <div class="settings-option">
            <label>Rotate Wallpaper</label>
            <button class="btn btn-sm btn-primary" id="settings-dw-next-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Next Wallpaper Now
            </button>
          </div>
        </div>

        <!-- Custom Background & Particles -->
        <div class="settings-section">
          <h3 class="settings-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Background Canvas & Upload
          </h3>
          <div class="settings-option">
            <label>Floating Code Particles</label>
            <label class="switch">
              <input type="checkbox" id="settings-bg-animation" ${s.background?.animation !== false ? 'checked' : ''} data-setting="background.animation">
              <span class="switch-slider"></span>
            </label>
          </div>
          <div class="settings-option">
            <label>Particle Opacity</label>
            <div class="settings-range-wrap">
              <input type="range" id="settings-bg-opacity" class="settings-range" min="0" max="100" value="${Math.round((s.background?.opacity ?? 0.4) * 100)}" data-setting="background.opacity">
              <span class="settings-range-value" id="settings-bg-opacity-value">${Math.round((s.background?.opacity ?? 0.4) * 100)}%</span>
            </div>
          </div>
          <div class="settings-option">
            <label>Upload Custom Background</label>
            <div class="settings-upload-wrap">
              <button class="btn btn-sm btn-secondary" id="settings-bg-upload-btn">Upload Image</button>
              <input type="file" id="settings-bg-upload" accept="image/*" hidden>
              ${s.background?.customImage ? '<button class="btn btn-sm btn-secondary" id="settings-bg-clear">Clear</button>' : ''}
            </div>
          </div>
        </div>

        <!-- Tasks -->
        <div class="settings-section">
          <h3 class="settings-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            Tasks
          </h3>
          <div class="settings-option">
            <label>Notifications</label>
            <label class="switch">
              <input type="checkbox" id="settings-notifications" ${s.tasks?.notifications ? 'checked' : ''} data-setting="tasks.notifications">
              <span class="switch-slider"></span>
            </label>
          </div>
        </div>

        <!-- Quotes -->
        <div class="settings-section">
          <h3 class="settings-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></svg>
            Quotes
          </h3>
          <div class="settings-option">
            <label>Show Quotes</label>
            <label class="switch">
              <input type="checkbox" id="settings-quotes" ${s.quotes?.enabled !== false ? 'checked' : ''} data-setting="quotes.enabled">
              <span class="switch-slider"></span>
            </label>
          </div>
        </div>

        <!-- About -->
        <div class="settings-section settings-about">
          <h3 class="settings-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            About
          </h3>
          <div class="settings-about-header">
            <p><strong>Equinox Workspace</strong> — Ultimate Dashboard</p>
            <p class="settings-version">Version 1.0.2</p>
            <p class="settings-tagline">Your developer command center.</p>
          </div>
        </div>
      </div>
    `;
  },

  showToast(message, type = 'info', duration = 3200) {
    let toast = document.getElementById('devora-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'devora-toast';
      toast.className = 'devora-toast';
      document.body.appendChild(toast);
    }

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else {
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.className = `devora-toast devora-toast-${type}`;
    toast.innerHTML = `<span class="devora-toast-icon">${iconSvg}</span><span class="devora-toast-msg">${Utils.escapeHtml(message)}</span>`;

    void toast.offsetWidth;
    toast.classList.add('active');

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('active');
    }, duration);
  },

  bindPanelEvents(panel, overlay) {
    // Close button
    document.getElementById('settings-close')?.addEventListener('click', () => this.close());
    overlay.addEventListener('click', () => this.close());


    // Google Export
    const exportBtn = document.getElementById('google-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        if (exportBtn.disabled) return;
        exportBtn.disabled = true;
        const origContent = exportBtn.innerHTML;
        exportBtn.innerHTML = `
          <svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          <span>Exporting...</span>
        `;

        try {
          if (typeof SyncManager === 'undefined') throw new Error('Sync engine not loaded');
          const data = await SyncManager.exportJSON();
          const dateStr = new Date().toISOString().slice(0, 10);
          const filename = `devora_backup_${dateStr}.json`;
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          this.showToast(`Backup exported (${filename})`, 'success');
        } catch (err) {
          console.error('[Settings] Export error:', err);
          this.showToast('Export failed: ' + err.message, 'error');
        } finally {
          exportBtn.disabled = false;
          exportBtn.innerHTML = origContent;
        }
      });
    }

    // Google Import
    const importBtn = document.getElementById('google-import-btn');
    const importInput = document.getElementById('google-import-file');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => {
        if (importBtn.disabled) return;
        importInput.click();
      });

      importInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input immediately so same file can be chosen again if needed
        importInput.value = '';

        if (!file.name.toLowerCase().endsWith('.json')) {
          this.showToast('Please select a valid .json backup file', 'warning');
          return;
        }

        importBtn.disabled = true;
        const origContent = importBtn.innerHTML;
        importBtn.innerHTML = `
          <svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          <span>Importing...</span>
        `;

        const reader = new FileReader();
        reader.onerror = () => {
          this.showToast('Could not read backup file', 'error');
          importBtn.disabled = false;
          importBtn.innerHTML = origContent;
        };

        reader.onload = async (re) => {
          try {
            if (typeof SyncManager === 'undefined') throw new Error('Sync engine not loaded');
            const res = await SyncManager.importJSON(re.target.result);
            if (res.success) {
              const count = res.totalRestored || res.noteCount || 0;
              this.showToast(`Backup restored successfully (${count} items)`, 'success');

              // Reload all state and re-render components cleanly
              this.settings = await StorageManager.getSettings();
              this.googleUser = await StorageManager.getGoogleUser();
              if (this.settings.theme) this.applyTheme(this.settings.theme);
              if (typeof TasksComponent !== 'undefined') await TasksComponent.loadTasks();
              if (typeof NotesComponent !== 'undefined') await NotesComponent.init();
              if (typeof QuickLinksComponent !== 'undefined') await QuickLinksComponent.init();
              if (typeof PomodoroComponent !== 'undefined') await PomodoroComponent.init();

              this.renderPanel();
            } else {
              this.showToast(`Import failed: ${res.error || 'Invalid format'}`, 'error');
              importBtn.disabled = false;
              importBtn.innerHTML = origContent;
            }
          } catch (err) {
            console.error('[Settings] Import error:', err);
            this.showToast('Import error: ' + err.message, 'error');
            importBtn.disabled = false;
            importBtn.innerHTML = origContent;
          }
        };

        reader.readAsText(file);
      });
    }

    // Add Sticky Note from Settings
    document.getElementById('settings-add-note-btn')?.addEventListener('click', async () => {
      if (typeof NotesComponent !== 'undefined') {
        await NotesComponent.addNote();
      }
    });

    // Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Theme buttons
    panel.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const value = btn.dataset.value;
        this.settings.theme = value;
        await StorageManager.saveSettings(this.settings);
        this.applyTheme(value);
        this.renderPanel(); // Re-render to update active state
      });
    });

    // Toggle group buttons
    panel.querySelectorAll('.toggle-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const setting = btn.dataset.setting;
        const value = btn.dataset.value === 'true';
        await StorageManager.updateSetting(setting, value);
        this.settings = await StorageManager.getSettings();
        this.notifyComponents();
        this.renderPanel();
      });
    });

    // Switch toggles
    panel.querySelectorAll('.switch input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', async () => {
        const setting = input.dataset.setting;
        await StorageManager.updateSetting(setting, input.checked);
        this.settings = await StorageManager.getSettings();
        this.notifyComponents();
      });
    });

    // Name input
    const nameInput = document.getElementById('settings-name');
    if (nameInput) {
      nameInput.addEventListener('input', Utils.debounce(async () => {
        await StorageManager.updateSetting('greeting.name', nameInput.value || 'Developer');
        this.settings = await StorageManager.getSettings();
        GreetingComponent.updateSettings(this.settings);
      }, 500));
    }

    // Opacity slider
    const opacitySlider = document.getElementById('settings-bg-opacity');
    const opacityValue = document.getElementById('settings-bg-opacity-value');
    if (opacitySlider) {
      opacitySlider.addEventListener('input', () => {
        opacityValue.textContent = `${opacitySlider.value}%`;
      });
      opacitySlider.addEventListener('change', async () => {
        await StorageManager.updateSetting('background.opacity', opacitySlider.value / 100);
        this.settings = await StorageManager.getSettings();
        BackgroundComponent.updateSettings(this.settings);
      });
    }

    // Background upload
    const uploadBtn = document.getElementById('settings-bg-upload-btn');
    const uploadInput = document.getElementById('settings-bg-upload');
    if (uploadBtn && uploadInput) {
      uploadBtn.addEventListener('click', () => uploadInput.click());
      uploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
          const dataUrl = evt.target.result;
          await StorageManager.updateSetting('background.customImage', dataUrl);
          this.settings = await StorageManager.getSettings();
          BackgroundComponent.setCustomBackground(dataUrl);
          this.renderPanel();
        };
        reader.readAsDataURL(file);
      });
    }

    // Clear custom background
    const clearBtn = document.getElementById('settings-bg-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        await StorageManager.updateSetting('background.customImage', null);
        this.settings = await StorageManager.getSettings();
        BackgroundComponent.clearCustomBackground();
        this.renderPanel();
      });
    }

    // Dynamic Wallpaper bindings
    const dwProviderSelect = document.getElementById('settings-dw-provider');
    if (dwProviderSelect) {
      dwProviderSelect.addEventListener('change', async (e) => {
        const providerId = e.target.value;
        const provider = typeof ImageProviderRegistry !== 'undefined' ? ImageProviderRegistry.get(providerId) : null;
        const defaultCat = provider?.categories?.[0]?.id || 'landscapes';

        await StorageManager.updateSetting('dynamicWallpaper.provider', providerId);
        await StorageManager.updateSetting('dynamicWallpaper.category', defaultCat);
        this.settings = await StorageManager.getSettings();
        if (typeof WallpaperManager !== 'undefined') {
          await WallpaperManager.updateConfig({ provider: providerId, category: defaultCat });
        }
        this.renderPanel();
      });
    }

    const dwCategorySelect = document.getElementById('settings-dw-category');
    if (dwCategorySelect) {
      dwCategorySelect.addEventListener('change', async (e) => {
        const category = e.target.value;
        await StorageManager.updateSetting('dynamicWallpaper.category', category);
        this.settings = await StorageManager.getSettings();
        if (typeof WallpaperManager !== 'undefined') {
          await WallpaperManager.updateConfig({ category });
        }
      });
    }

    const dwIntervalSelect = document.getElementById('settings-dw-interval');
    if (dwIntervalSelect) {
      dwIntervalSelect.addEventListener('change', async (e) => {
        const interval = e.target.value;
        await StorageManager.updateSetting('dynamicWallpaper.interval', interval);
        this.settings = await StorageManager.getSettings();
        if (typeof WallpaperManager !== 'undefined') {
          await WallpaperManager.updateConfig({ interval });
        }
      });
    }

    const dwCacheSlider = document.getElementById('settings-dw-cache-size');
    const dwCacheVal = document.getElementById('settings-dw-cache-size-val');
    if (dwCacheSlider) {
      dwCacheSlider.addEventListener('input', () => {
        if (dwCacheVal) dwCacheVal.textContent = `${dwCacheSlider.value} images`;
      });
      dwCacheSlider.addEventListener('change', async () => {
        const val = parseInt(dwCacheSlider.value, 10);
        await StorageManager.updateSetting('dynamicWallpaper.cacheSize', val);
        this.settings = await StorageManager.getSettings();
        if (typeof WallpaperManager !== 'undefined') {
          await WallpaperManager.updateConfig({ cacheSize: val });
        }
      });
    }

    const dwFallbackSelect = document.getElementById('settings-dw-fallback');
    if (dwFallbackSelect) {
      dwFallbackSelect.addEventListener('change', async (e) => {
        const fallbackTheme = e.target.value;
        await StorageManager.updateSetting('dynamicWallpaper.fallbackTheme', fallbackTheme);
        this.settings = await StorageManager.getSettings();
        if (typeof WallpaperManager !== 'undefined') {
          await WallpaperManager.updateConfig({ fallbackTheme });
        }
      });
    }

    const dwOverlaySlider = document.getElementById('settings-dw-overlay');
    const dwOverlayVal = document.getElementById('settings-dw-overlay-val');
    if (dwOverlaySlider) {
      dwOverlaySlider.addEventListener('input', () => {
        if (dwOverlayVal) dwOverlayVal.textContent = `${dwOverlaySlider.value}%`;
      });
      dwOverlaySlider.addEventListener('change', async () => {
        const val = parseInt(dwOverlaySlider.value, 10) / 100;
        await StorageManager.updateSetting('dynamicWallpaper.overlayOpacity', val);
        this.settings = await StorageManager.getSettings();
        if (typeof WallpaperManager !== 'undefined') {
          WallpaperManager.config.overlayOpacity = val;
          if (typeof BackgroundComponent !== 'undefined' && WallpaperManager.currentWallpaper) {
            BackgroundComponent.applyDynamicWallpaper(WallpaperManager.currentWallpaper, WallpaperManager.config);
          }
        }
      });
    }

    const dwBlurSlider = document.getElementById('settings-dw-blur');
    const dwBlurVal = document.getElementById('settings-dw-blur-val');
    if (dwBlurSlider) {
      dwBlurSlider.addEventListener('input', () => {
        if (dwBlurVal) dwBlurVal.textContent = `${dwBlurSlider.value}px`;
      });
      dwBlurSlider.addEventListener('change', async () => {
        const val = parseInt(dwBlurSlider.value, 10);
        await StorageManager.updateSetting('dynamicWallpaper.blur', val);
        this.settings = await StorageManager.getSettings();
        if (typeof WallpaperManager !== 'undefined') {
          WallpaperManager.config.blur = val;
          if (typeof BackgroundComponent !== 'undefined' && WallpaperManager.currentWallpaper) {
            BackgroundComponent.applyDynamicWallpaper(WallpaperManager.currentWallpaper, WallpaperManager.config);
          }
        }
      });
    }

    const dwNextBtn = document.getElementById('settings-dw-next-btn');
    if (dwNextBtn) {
      dwNextBtn.addEventListener('click', async () => {
        dwNextBtn.disabled = true;
        dwNextBtn.classList.add('spinning');
        if (typeof WallpaperManager !== 'undefined') {
          await WallpaperManager.nextWallpaper(true);
        }
        dwNextBtn.disabled = false;
        dwNextBtn.classList.remove('spinning');
      });
    }

    const dwEnabledToggle = document.getElementById('settings-dynamic-bg-enabled');
    if (dwEnabledToggle) {
      dwEnabledToggle.addEventListener('change', async () => {
        const enabled = dwEnabledToggle.checked;
        await StorageManager.updateSetting('dynamicWallpaper.enabled', enabled);
        this.settings = await StorageManager.getSettings();
        if (typeof WallpaperManager !== 'undefined') {
          await WallpaperManager.updateConfig({ enabled });
        }
      });
    }

    const dwAttrToggle = document.getElementById('settings-dw-attribution');
    if (dwAttrToggle) {
      dwAttrToggle.addEventListener('change', async () => {
        const showAttribution = dwAttrToggle.checked;
        await StorageManager.updateSetting('dynamicWallpaper.showAttribution', showAttribution);
        this.settings = await StorageManager.getSettings();
        if (typeof WallpaperManager !== 'undefined') {
          WallpaperManager.config.showAttribution = showAttribution;
          if (typeof WallpaperAttributionComponent !== 'undefined') {
            WallpaperAttributionComponent.render(WallpaperManager.currentWallpaper);
          }
        }
      });
    }
  },

  applyTheme(theme) {
    if (typeof DevoraApp !== 'undefined') {
      DevoraApp.applyTheme(theme);
    } else {
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem('devora_theme', theme); } catch(err) {}
    }
  },

  notifyComponents() {
    if (typeof ClockComponent !== 'undefined') ClockComponent.updateSettings(this.settings);
    if (typeof GreetingComponent !== 'undefined') GreetingComponent.updateSettings(this.settings);
    if (typeof BackgroundComponent !== 'undefined') BackgroundComponent.updateSettings(this.settings);
  }
};
