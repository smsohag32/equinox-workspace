/* ============================================================
   Devora — Utility Helpers
   Date formatting, greeting logic, ID generation, etc.
   ============================================================ */

const Utils = {
  /* ---- Date Formatting ---- */
  formatDate(date, options = {}) {
    const d = date || new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return {
      dayName: dayNames[d.getDay()],
      dayShort: dayNames[d.getDay()].slice(0, 3),
      monthName: monthNames[d.getMonth()],
      monthShort: monthNames[d.getMonth()].slice(0, 3),
      day: d.getDate(),
      year: d.getFullYear(),
      full: `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
      short: `${monthNames[d.getMonth()]} ${d.getDate()}`
    };
  },

  formatTime(date, format24 = false, showSeconds = false) {
    const d = date || new Date();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    let period = '';

    if (!format24) {
      period = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
    }

    const h = format24 ? String(hours).padStart(2, '0') : String(hours);
    const time = showSeconds ? `${h}:${minutes}:${seconds}` : `${h}:${minutes}`;
    return time + period;
  },

  /* ---- Greeting ---- */
  getGreeting(name = 'Developer') {
    const hour = new Date().getHours();
    let timeGreeting;
    if (hour < 5) timeGreeting = 'Good night';
    else if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 17) timeGreeting = 'Good afternoon';
    else if (hour < 21) timeGreeting = 'Good evening';
    else timeGreeting = 'Good night';
    return `${timeGreeting}, ${name}.`;
  },

  /* ---- Date Key for Storage ---- */
  getDateKey(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  /* ---- Debounce ---- */
  debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  },

  /* ---- Throttle ---- */
  throttle(fn, ms = 100) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= ms) {
        lastCall = now;
        fn.apply(this, args);
      }
    };
  },

  /* ---- Escape HTML ---- */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /* ---- Relative Time ---- */
  relativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  },

  /* ---- Format Duration ---- */
  formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  /* ---- URL Detection ---- */
  isUrl(str) {
    const urlPattern = /^(https?:\/\/|www\.)/i;
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+/;
    return urlPattern.test(str) || domainPattern.test(str);
  },

  /* ---- Priority Config ---- */
  priorities: {
    low: { label: 'Low', color: '#10b981', icon: '◇' },
    medium: { label: 'Medium', color: '#f59e0b', icon: '◆' },
    high: { label: 'High', color: '#f97316', icon: '▲' },
    critical: { label: 'Critical', color: '#ef4444', icon: '⬥' }
  },

  /* ---- Custom Theme-Based Confirmation Alert Dialog ---- */
  confirm(options = {}) {
    return new Promise((resolve) => {
      let title = 'Confirmation';
      let message = 'Are you sure you want to proceed?';
      let confirmText = 'Confirm';
      let cancelText = 'Cancel';
      let type = 'danger'; // 'danger' | 'warning' | 'info'

      if (typeof options === 'string') {
        message = options;
        if (options.toLowerCase().includes('delete') || options.toLowerCase().includes('remove') || options.toLowerCase().includes('trash')) {
          title = 'Confirm Deletion';
          confirmText = 'Delete';
          type = 'danger';
        }
      } else if (options && typeof options === 'object') {
        title = options.title || (options.type === 'danger' ? 'Confirm Action' : 'Confirmation');
        message = options.message || message;
        confirmText = options.confirmText || (options.type === 'danger' ? 'Delete' : 'Confirm');
        cancelText = options.cancelText || 'Cancel';
        type = options.type || 'danger';
      }

      // Clean up any existing confirm dialogs
      const existing = document.getElementById('devora-confirm-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.className = 'devora-confirm-overlay';
      overlay.id = 'devora-confirm-overlay';

      const iconSvg = type === 'danger'
        ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

      overlay.innerHTML = `
        <div class="devora-confirm-card devora-confirm-${type}" role="dialog" aria-modal="true">
          <button class="devora-confirm-close" id="devora-confirm-x" title="Close">✕</button>
          <div class="devora-confirm-header">
            <div class="devora-confirm-icon-wrap devora-confirm-icon-${type}">
              ${iconSvg}
            </div>
            <div class="devora-confirm-heading">
              <h3 class="devora-confirm-title">${Utils.escapeHtml(title)}</h3>
              <p class="devora-confirm-msg">${Utils.escapeHtml(message)}</p>
            </div>
          </div>
          <div class="devora-confirm-actions">
            <button type="button" class="devora-confirm-btn devora-confirm-btn-cancel" id="devora-confirm-cancel">${Utils.escapeHtml(cancelText)}</button>
            <button type="button" class="devora-confirm-btn devora-confirm-btn-action devora-confirm-btn-${type}" id="devora-confirm-ok">${Utils.escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Animate in and focus action button
      requestAnimationFrame(() => {
        overlay.classList.add('active');
        document.getElementById('devora-confirm-ok')?.focus();
      });

      let resolved = false;
      const cleanup = (result) => {
        if (resolved) return;
        resolved = true;
        overlay.classList.remove('active');
        document.removeEventListener('keydown', keyHandler);
        setTimeout(() => {
          overlay.remove();
        }, 220);
        resolve(result);
      };

      const keyHandler = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          cleanup(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          cleanup(true);
        }
      };

      document.addEventListener('keydown', keyHandler);

      document.getElementById('devora-confirm-cancel')?.addEventListener('click', () => cleanup(false));
      document.getElementById('devora-confirm-x')?.addEventListener('click', () => cleanup(false));
      document.getElementById('devora-confirm-ok')?.addEventListener('click', () => cleanup(true));

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup(false);
      });
    });
  }
};
