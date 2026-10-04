/* ============================================================
   Devora — Omni-Search & Quick Task Component
   Professional, user-friendly suggestions box with dual-action
   (Task creation & Google web search), autocomplete & shortcuts
   ============================================================ */

const SearchComponent = {
  searchInput: null,
  searchForm: null,
  searchHintTag: null,
  suggestionsContainer: null,
  rawGoogleSuggestions: [],
  activeItems: [], // Array of { type: 'task'|'url'|'search'|'suggestion'|'guide', query, text, action }
  selectedIndex: -1,
  debounceTimer: null,
  isOpen: false,

  async init() {
    this.searchForm = document.getElementById('search-form');
    this.searchInput = document.getElementById('search-input');
    this.searchHintTag = document.getElementById('search-hint-tag');

    if (!this.searchForm || !this.searchInput) return;

    this.createSuggestionsContainer();

    // Search button triggers search if present
    const searchBtn = document.getElementById('search-google-btn') || document.getElementById('search-web-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        this.performSearch(this.searchInput.value);
      });
    }

    // Form submit handler
    this.searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const query = this.searchInput.value.trim();
      if (!query) return;

      const isShift = e.shiftKey || (e.submitter && e.submitter.id === 'search-google-btn');
      if (isShift) {
        this.performSearch(query);
        return;
      }

      // If user navigated with arrows and selected an item, trigger that
      if (this.selectedIndex >= 0 && this.activeItems[this.selectedIndex]) {
        this.activeItems[this.selectedIndex].action();
        return;
      }

      // Default action based on content
      if (Utils.isUrl(query) || query.startsWith('http://') || query.startsWith('https://') || query.startsWith('www.')) {
        this.openUrl(query);
      } else if (query.startsWith('g ') || query.startsWith('?')) {
        const q = query.startsWith('g ') ? query.substring(2) : query.substring(1);
        this.performSearch(q.trim());
      } else {
        await this.createTask(query);
      }
    });

    // Real-time suggestions & dynamic UI
    this.searchInput.addEventListener('input', () => {
      clearTimeout(this.debounceTimer);
      const query = this.searchInput.value.trim();
      this.updateHintTag(query);

      if (!query) {
        this.renderEmptyStateGuide();
        return;
      }

      // Render immediate action items (Task + Google Search / URL)
      this.renderActions(query, this.rawGoogleSuggestions.length ? this.rawGoogleSuggestions : []);

      // Fetch Google suggestions
      this.debounceTimer = setTimeout(() => {
        this.fetchSuggestions(query);
      }, 120);
    });

    // Keyboard navigation
    this.searchInput.addEventListener('keydown', (e) => {
      if (!this.isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        this.showSuggestions();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!this.activeItems.length) return;
        this.selectedIndex = (this.selectedIndex + 1) % this.activeItems.length;
        this.updateSelectedElement();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!this.activeItems.length) return;
        this.selectedIndex = (this.selectedIndex - 1 + this.activeItems.length) % this.activeItems.length;
        this.updateSelectedElement();
      } else if (e.key === 'Tab') {
        // Autocomplete suggestion into search input
        if (this.selectedIndex >= 0 && this.activeItems[this.selectedIndex]) {
          const item = this.activeItems[this.selectedIndex];
          if (item.fillQuery) {
            e.preventDefault();
            this.searchInput.value = item.fillQuery;
            this.updateHintTag(item.fillQuery);
            this.fetchSuggestions(item.fillQuery);
          }
        } else if (this.activeItems.length > 0) {
          const firstSuggestion = this.activeItems.find(it => it.type === 'suggestion');
          if (firstSuggestion && firstSuggestion.fillQuery) {
            e.preventDefault();
            this.searchInput.value = firstSuggestion.fillQuery;
            this.updateHintTag(firstSuggestion.fillQuery);
            this.fetchSuggestions(firstSuggestion.fillQuery);
          }
        }
      } else if (e.key === 'Escape') {
        this.hideSuggestions();
      }
    });

    // Focus & Blur
    this.searchInput.addEventListener('focus', () => {
      this.searchForm.classList.add('search--focused');
      const query = this.searchInput.value.trim();
      this.updateHintTag(query);
      if (query) {
        this.renderActions(query, this.rawGoogleSuggestions);
      } else {
        this.renderEmptyStateGuide();
      }
      this.showSuggestions();
    });

    this.searchInput.addEventListener('blur', () => {
      this.searchForm.classList.remove('search--focused');
      // Delay closing so clicks on dropdown items can register
      setTimeout(() => {
        this.hideSuggestions();
      }, 200);
    });

    // Search Hint Tag click: execute primary action
    if (this.searchHintTag) {
      this.searchHintTag.addEventListener('click', () => {
        const query = this.searchInput.value.trim();
        if (!query) {
          this.searchInput.focus();
          return;
        }
        if (Utils.isUrl(query)) {
          this.openUrl(query);
        } else {
          this.createTask(query);
        }
      });
    }

    // Dismiss on outside click
    document.addEventListener('click', (e) => {
      if (this.searchForm && !this.searchForm.contains(e.target) &&
          this.suggestionsContainer && !this.suggestionsContainer.contains(e.target)) {
        this.hideSuggestions();
      }
    });
  },

  createSuggestionsContainer() {
    this.suggestionsContainer = document.createElement('div');
    this.suggestionsContainer.className = 'search-suggestions';
    this.suggestionsContainer.id = 'search-suggestions';
    this.searchForm.parentNode.appendChild(this.suggestionsContainer);
  },

  updateHintTag(query) {
    if (!this.searchHintTag) return;
    if (!query) {
      this.searchHintTag.innerHTML = '↵ Add Task';
      this.searchHintTag.title = 'Type a task and press Enter to save';
      return;
    }

    if (Utils.isUrl(query) || query.startsWith('http://') || query.startsWith('https://') || query.startsWith('www.')) {
      this.searchHintTag.innerHTML = '🌐 Open URL';
      this.searchHintTag.title = 'Press Enter to open this website';
    } else if (query.startsWith('g ') || query.startsWith('?')) {
      this.searchHintTag.innerHTML = '🔍 Search Web';
      this.searchHintTag.title = 'Press Enter to search the web';
    } else {
      this.searchHintTag.innerHTML = '↵ Add Task';
      this.searchHintTag.title = 'Press Enter to create task • Shift+Enter to search web';
    }
  },

  async fetchSuggestions(query) {
    if (!query) return;
    try {
      const res = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`);
      if (!res.ok) return;
      const data = await res.json();
      this.rawGoogleSuggestions = (data && data[1]) ? data[1].slice(0, 6) : [];
      if (this.searchInput && this.searchInput.value.trim()) {
        this.renderActions(this.searchInput.value.trim(), this.rawGoogleSuggestions);
      }
    } catch (err) {
      this.renderActions(query, []);
    }
  },

  renderActions(query, googleSuggestions = []) {
    this.activeItems = [];
    let itemsHtml = '';
    const isUrl = Utils.isUrl(query) || query.startsWith('http://') || query.startsWith('https://') || query.startsWith('www.');

    // 1. Primary Action: Add to Tasks
    const taskItemIdx = this.activeItems.length;
    this.activeItems.push({
      type: 'task',
      query: query,
      fillQuery: query,
      action: () => this.createTask(query)
    });

    itemsHtml += `
      <div class="suggestion-section-title">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
        <span>Actions</span>
      </div>
      <div class="suggestion-item suggestion-item--primary" data-item-idx="${taskItemIdx}">
        <div class="suggestion-icon-wrap icon-wrap--task">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
        <div class="suggestion-content">
          <div class="suggestion-title">
            <span>Add Task</span>
            <span class="suggestion-quote">“${Utils.escapeHtml(query)}”</span>
          </div>
          <div class="suggestion-subtext">Save to today's workspace task manager</div>
        </div>
        <div class="suggestion-badge">
          <kbd class="suggestion-kbd">↵ Enter</kbd>
        </div>
      </div>
    `;

    // 2. Secondary Action: Google Search OR Open URL
    const webItemIdx = this.activeItems.length;
    if (isUrl) {
      this.activeItems.push({
        type: 'url',
        query: query,
        fillQuery: query,
        action: () => this.openUrl(query)
      });

      itemsHtml += `
        <div class="suggestion-item" data-item-idx="${webItemIdx}">
          <div class="suggestion-icon-wrap icon-wrap--url">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <div class="suggestion-content">
            <div class="suggestion-title">
              <span>Open Website</span>
              <span class="suggestion-quote">${Utils.escapeHtml(query)}</span>
            </div>
            <div class="suggestion-subtext">Direct browser navigation</div>
          </div>
          <div class="suggestion-badge">
            <kbd class="suggestion-kbd">Shift ↵</kbd>
          </div>
        </div>
      `;
    } else {
      const cleanSearchQuery = query.startsWith('g ') ? query.substring(2).trim() : query;
      this.activeItems.push({
        type: 'search',
        query: cleanSearchQuery,
        fillQuery: cleanSearchQuery,
        action: () => this.performSearch(cleanSearchQuery)
      });

      itemsHtml += `
        <div class="suggestion-item" data-item-idx="${webItemIdx}">
          <div class="suggestion-icon-wrap icon-wrap--search">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div class="suggestion-content">
            <div class="suggestion-title">
              <span>Search Web</span>
              <span class="suggestion-quote">“${Utils.escapeHtml(cleanSearchQuery)}”</span>
            </div>
            <div class="suggestion-subtext">Search web results using default browser search engine</div>
          </div>
          <div class="suggestion-badge">
            <kbd class="suggestion-kbd">Shift ↵</kbd>
          </div>
        </div>
      `;
    }

    // 3. Google Search Suggestions
    if (googleSuggestions && googleSuggestions.length) {
      itemsHtml += `
        <div class="suggestion-section-title suggestion-section-title--spaced">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span>Search Suggestions</span>
        </div>
      `;

      googleSuggestions.forEach((sugg) => {
        const suggIdx = this.activeItems.length;
        this.activeItems.push({
          type: 'suggestion',
          query: sugg,
          fillQuery: sugg,
          action: () => this.performSearch(sugg)
        });

        itemsHtml += `
          <div class="suggestion-item suggestion-item--query" data-item-idx="${suggIdx}">
            <div class="suggestion-icon-wrap icon-wrap--query">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <div class="suggestion-content">
              <div class="suggestion-text">${this.highlightMatch(sugg, query)}</div>
            </div>
            <div class="suggestion-badge suggestion-hover-only">
              <span class="suggestion-action-pill">Search ↗</span>
              <kbd class="suggestion-kbd mini" title="Tab to autocomplete">Tab ⇥</kbd>
            </div>
          </div>
        `;
      });
    }

    // Render container with header list + sleek footer
    this.suggestionsContainer.innerHTML = `
      <div class="search-suggestions-list">
        ${itemsHtml}
      </div>
      <div class="search-suggestions-footer">
        <span class="footer-hint"><kbd class="suggestion-kbd mini">↑↓</kbd> Navigate</span>
        <span class="footer-hint"><kbd class="suggestion-kbd mini">↵</kbd> Select</span>
        <span class="footer-hint"><kbd class="suggestion-kbd mini">Tab</kbd> Autocomplete</span>
        <span class="footer-hint"><kbd class="suggestion-kbd mini">Shift ↵</kbd> Search Web</span>
        <span class="footer-hint"><kbd class="suggestion-kbd mini">Esc</kbd> Close</span>
      </div>
    `;

    this.bindItemEvents();
    this.showSuggestions();
    this.updateSelectedElement();
  },

  renderEmptyStateGuide() {
    this.activeItems = [];
    const guideItems = [
      {
        title: 'Add a Quick Task',
        desc: 'Type what you need to do and hit Enter to pin it to today’s dashboard',
        icon: 'task',
        badge: '↵ Enter',
        preset: ''
      },
      {
        title: 'Search the Web',
        desc: 'Hold Shift + Enter to search the web, or prefix with "g <term>"',
        icon: 'search',
        badge: 'Shift ↵',
        preset: 'g '
      },
      {
        title: 'Open Website Directly',
        desc: 'Paste or type any domain (e.g. github.com, youtube.com) to navigate',
        icon: 'url',
        badge: 'Domain',
        preset: 'https://'
      }
    ];

    let itemsHtml = `
      <div class="suggestion-section-title">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        <span>Quick Inspiration & Actions</span>
      </div>
    `;

    guideItems.forEach((guide) => {
      const idx = this.activeItems.length;
      this.activeItems.push({
        type: 'guide',
        query: guide.preset,
        fillQuery: guide.preset,
        action: () => {
          if (guide.preset) {
            this.searchInput.value = guide.preset;
            this.searchInput.focus();
            this.updateHintTag(guide.preset);
          } else {
            this.searchInput.focus();
          }
        }
      });

      const iconWrapClass = guide.icon === 'task' ? 'icon-wrap--task' : (guide.icon === 'url' ? 'icon-wrap--url' : 'icon-wrap--search');
      const iconSvg = guide.icon === 'task'
        ? `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`
        : (guide.icon === 'url'
          ? `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
          : `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`);

      itemsHtml += `
        <div class="suggestion-item" data-item-idx="${idx}">
          <div class="suggestion-icon-wrap ${iconWrapClass}">
            ${iconSvg}
          </div>
          <div class="suggestion-content">
            <div class="suggestion-title">
              <span>${guide.title}</span>
            </div>
            <div class="suggestion-subtext">${guide.desc}</div>
          </div>
          <div class="suggestion-badge">
            <kbd class="suggestion-kbd">${guide.badge}</kbd>
          </div>
        </div>
      `;
    });

    itemsHtml += `
      <div class="suggestion-section-title suggestion-section-title--spaced">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"></path></svg>
        <span>Keyboard Pro-Tips</span>
      </div>
      <div class="suggestion-shortcut-row">
        <div class="shortcut-pill"><kbd class="suggestion-kbd mini">/</kbd> <span>Focus search anytime</span></div>
        <div class="shortcut-pill"><kbd class="suggestion-kbd mini">T</kbd> <span>Open tasks panel</span></div>
        <div class="shortcut-pill"><kbd class="suggestion-kbd mini">Esc</kbd> <span>Close active modal</span></div>
      </div>
    `;

    this.suggestionsContainer.innerHTML = `
      <div class="search-suggestions-list">
        ${itemsHtml}
      </div>
      <div class="search-suggestions-footer">
        <span class="footer-hint"><kbd class="suggestion-kbd mini">↑↓</kbd> Select Tip</span>
        <span class="footer-hint"><kbd class="suggestion-kbd mini">↵</kbd> Use</span>
        <span class="footer-hint"><kbd class="suggestion-kbd mini">Esc</kbd> Dismiss</span>
      </div>
    `;

    this.bindItemEvents();
    this.showSuggestions();
    this.selectedIndex = -1;
  },

  bindItemEvents() {
    const items = this.suggestionsContainer.querySelectorAll('.suggestion-item');
    items.forEach(el => {
      const idx = parseInt(el.dataset.itemIdx, 10);

      // On mousedown: execute action (mousedown triggers before input blur)
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (this.activeItems[idx]) {
          this.activeItems[idx].action();
        }
      });

      // Hover sets selected index
      el.addEventListener('mouseenter', () => {
        this.selectedIndex = idx;
        this.updateSelectedElement(false);
      });
    });
  },

  updateSelectedElement(shouldScroll = true) {
    const items = this.suggestionsContainer.querySelectorAll('.suggestion-item');
    items.forEach(item => {
      const idx = parseInt(item.dataset.itemIdx, 10);
      if (idx === this.selectedIndex) {
        item.classList.add('active');
        if (shouldScroll) {
          item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else {
        item.classList.remove('active');
      }
    });
  },

  highlightMatch(text, query) {
    if (!query) return Utils.escapeHtml(text);
    const escapedText = Utils.escapeHtml(text);
    const trimmed = query.trim();
    if (!trimmed) return escapedText;

    const regex = new RegExp(`(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escapedText.replace(regex, '<span class="suggestion-query-match">$1</span>');
  },

  showSuggestions() {
    if (this.suggestionsContainer) {
      this.suggestionsContainer.classList.add('active');
      this.isOpen = true;
      document.body.classList.add('suggestions-open');
      const centerSec = document.querySelector('.center-section');
      if (centerSec) centerSec.classList.add('has-active-suggestions');
      const searchSec = document.querySelector('.search-section');
      if (searchSec) searchSec.classList.add('has-active-suggestions');
    }
  },

  hideSuggestions() {
    if (this.suggestionsContainer) {
      this.suggestionsContainer.classList.remove('active');
      this.isOpen = false;
      document.body.classList.remove('suggestions-open');
      const centerSec = document.querySelector('.center-section');
      if (centerSec) centerSec.classList.remove('has-active-suggestions');
      const searchSec = document.querySelector('.search-section');
      if (searchSec) searchSec.classList.remove('has-active-suggestions');
    }
    this.selectedIndex = -1;
  },

  async createTask(title) {
    const cleanTitle = (title || this.searchInput.value).trim();
    if (!cleanTitle) return;

    try {
      const todayDate = (typeof Utils !== 'undefined' && Utils.getDateKey) ? Utils.getDateKey() : new Date().toISOString().split('T')[0];
      await StorageManager.addTask({
        title: cleanTitle,
        priority: 'medium',
        dueDate: todayDate,
        pinned: true,
        x: Math.round(window.innerWidth / 2 - 140),
        y: 120
      });

      // Refresh Tasks component if present
      if (typeof TasksComponent !== 'undefined') {
        TasksComponent.tasks = await StorageManager.getTasks();
        TasksComponent.render();
        if (TasksComponent.isPanelOpen) TasksComponent.renderPanelBox();
        TasksComponent.updateLauncherBadge();
      }

      this.clear();
      this.showToast(`✓ Task created: "${cleanTitle}"`);
    } catch (err) {
      console.error('Failed to create task', err);
      this.showToast('Could not save task');
    }
  },

  async performSearch(queryText) {
    const query = (queryText || this.searchInput.value).trim();
    if (!query) return;

    this.clear();

    // Respect user's selected search provider using official Chrome Search API
    if (typeof chrome !== 'undefined' && chrome.search && typeof chrome.search.query === 'function') {
      try {
        chrome.search.query({
          text: query,
          disposition: 'CURRENT_TAB'
        });
        return;
      } catch (err) {
        console.warn('[SearchComponent] chrome.search.query error, falling back:', err);
      }
    }

    // Fallback if not running in Chrome extension context
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  },

  openUrl(urlText) {
    let url = (urlText || this.searchInput.value).trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    this.clear();
    window.location.href = url;
  },

  focus() {
    if (this.searchInput) {
      this.searchInput.focus();
    }
  },

  clear() {
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    this.updateHintTag('');
    this.hideSuggestions();
  },

  showToast(message) {
    let toast = document.getElementById('search-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'search-toast';
      toast.className = 'search-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="toast-text">${Utils.escapeHtml(message)}</span>`;
    toast.classList.add('active');
    setTimeout(() => {
      toast.classList.remove('active');
    }, 2600);
  }
};
