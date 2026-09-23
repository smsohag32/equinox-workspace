/* ============================================================
   Devora — Wallpaper Attribution & Control Component
   Displays minimal, elegant licensing attribution (CC-BY-SA, CC0,
   Public Domain) and quick-rotate wallpaper control button.
   ============================================================ */

const WallpaperAttributionComponent = {
  container: null,
  currentWallpaper: null,
  isExpanded: false,

  init() {
    this.container = document.getElementById('wallpaper-attribution-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'wallpaper-attribution-container';
      this.container.className = 'wallpaper-attribution-container';
      document.body.appendChild(this.container);
    }

    // Subscribe to wallpaper updates from manager
    if (typeof WallpaperManager !== 'undefined') {
      WallpaperManager.subscribe((wp) => this.render(wp));
    }

    window.addEventListener('devora-wallpaper-changed', (e) => {
      this.render(e.detail?.wallpaper);
    });

    window.addEventListener('devora-wallpaper-disabled', () => {
      if (this.container) this.container.innerHTML = '';
    });

    // Close expanded card on outside click
    document.addEventListener('click', (e) => {
      if (this.isExpanded && !this.container.contains(e.target)) {
        this.isExpanded = false;
        this.render(this.currentWallpaper);
      }
    });
  },

  render(wallpaper) {
    if (!this.container) return;
    this.currentWallpaper = wallpaper;

    const config = WallpaperManager?.config || {};
    if (!config.enabled || config.showAttribution === false || !wallpaper) {
      this.container.innerHTML = '';
      this.container.classList.remove('active');
      return;
    }

    this.container.classList.add('active');

    // Display for local offline themes
    if (wallpaper.isLocal) {
      this.container.innerHTML = `
        <div class="wallpaper-attr-pill" id="wallpaper-attr-pill" title="Current Background: ${Utils.escapeHtml(wallpaper.title)}">
          <svg class="attr-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
          <span class="attr-pill-text">${Utils.escapeHtml(wallpaper.title)}</span>
          <button class="attr-next-btn" id="attr-next-btn" title="Cycle Wallpaper (Random)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </div>
      `;
      this.bindEvents();
      return;
    }

    // Display for remote open-source wallpapers (Wikimedia / NASA)
    const title = Utils.escapeHtml(wallpaper.title || 'Open Landscape');
    const author = Utils.escapeHtml(wallpaper.author || 'Open Contributor');
    const license = Utils.escapeHtml(wallpaper.license || 'Open License');
    const licenseUrl = wallpaper.licenseUrl || '#';
    const sourceName = Utils.escapeHtml(wallpaper.sourceName || 'Open Repository');
    const sourceUrl = wallpaper.sourceUrl || '#';

    if (this.isExpanded) {
      this.container.innerHTML = `
        <div class="wallpaper-attr-card glass-card">
          <div class="attr-card-header">
            <div class="attr-card-title-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
              <h4 class="attr-card-title">${title}</h4>
            </div>
            <button class="btn-icon attr-close-btn" id="attr-close-btn" title="Close">✕</button>
          </div>

          <div class="attr-card-body">
            <div class="attr-meta-row">
              <span class="attr-meta-label">Photographer:</span>
              <span class="attr-meta-val">${author}</span>
            </div>
            <div class="attr-meta-row">
              <span class="attr-meta-label">License:</span>
              <a href="${licenseUrl}" target="_blank" rel="noopener noreferrer" class="attr-license-link" title="View legal license deed">
                <span class="attr-license-tag">${license}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
            <div class="attr-meta-row">
              <span class="attr-meta-label">Source:</span>
              <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="attr-source-link">
                ${sourceName}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>

          <div class="attr-card-actions">
            <button class="btn btn-sm btn-primary attr-rotate-btn" id="attr-rotate-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Next Wallpaper
            </button>
            <button class="btn btn-sm btn-secondary attr-copy-btn" id="attr-copy-btn" title="Copy attribution text">
              Copy Credit
            </button>
          </div>
        </div>
      `;
    } else {
      this.container.innerHTML = `
        <div class="wallpaper-attr-pill" id="wallpaper-attr-pill" title="Photo credit & license information">
          <svg class="attr-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
          </svg>
          <span class="attr-pill-text">${title} • ${license}</span>
          <button class="attr-next-btn" id="attr-next-btn" title="Next Wallpaper">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </div>
      `;
    }

    this.bindEvents();
  },

  bindEvents() {
    const pill = this.container.querySelector('#wallpaper-attr-pill');
    const nextBtn = this.container.querySelector('#attr-next-btn');
    const rotateBtn = this.container.querySelector('#attr-rotate-btn');
    const closeBtn = this.container.querySelector('#attr-close-btn');
    const copyBtn = this.container.querySelector('#attr-copy-btn');

    if (pill) {
      pill.addEventListener('click', (e) => {
        // If clicking next button specifically, don't expand card
        if (e.target.closest('#attr-next-btn')) return;
        this.isExpanded = !this.isExpanded;
        this.render(this.currentWallpaper);
      });
    }

    const triggerNext = async (e) => {
      e?.stopPropagation();
      const btn = nextBtn || rotateBtn;
      if (btn) btn.classList.add('spinning');
      await WallpaperManager.nextWallpaper(true);
      if (btn) btn.classList.remove('spinning');
    };

    if (nextBtn) nextBtn.addEventListener('click', triggerNext);
    if (rotateBtn) rotateBtn.addEventListener('click', triggerNext);

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isExpanded = false;
        this.render(this.currentWallpaper);
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wp = this.currentWallpaper;
        if (!wp) return;
        const text = `"${wp.title}" by ${wp.author}, licensed under ${wp.license} (${wp.licenseUrl}). Source: ${wp.sourceName} (${wp.sourceUrl})`;
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = 'Copied! ✓';
          setTimeout(() => { copyBtn.textContent = 'Copy Credit'; }, 2000);
        });
      });
    }
  }
};

window.WallpaperAttributionComponent = WallpaperAttributionComponent;
