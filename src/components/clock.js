/* ============================================================
   Devora — Clock Component
   Real-time digital clock with date display.
   ============================================================ */

const ClockComponent = {
  clockEl: null,
  dateEl: null,
  intervalId: null,
  settings: null,

  async init() {
    this.clockEl = document.getElementById('clock-time');
    this.dateEl = document.getElementById('clock-date');
    this.settings = await StorageManager.getSettings();

    this.update();
    this.intervalId = setInterval(() => this.update(), 1000);
  },

  update() {
    const now = new Date();
    const clockSettings = this.settings?.clock || {};

    // Time
    if (this.clockEl) {
      this.clockEl.textContent = Utils.formatTime(
        now,
        clockSettings.format24 !== false,
        clockSettings.showSeconds !== false
      );
    }

    // Date
    if (this.dateEl) {
      if (clockSettings.showDate !== false) {
        const dateInfo = Utils.formatDate(now);
        this.dateEl.textContent = dateInfo.full;
        this.dateEl.style.display = '';
      } else {
        this.dateEl.style.display = 'none';
      }
    }
  },

  updateSettings(newSettings) {
    this.settings = newSettings;
    this.update();
  },

  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};
