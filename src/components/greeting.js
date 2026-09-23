/* ============================================================
   Devora — Greeting Component
   Time-based greeting with customizable name.
   ============================================================ */

const GreetingComponent = {
  greetingEl: null,
  settings: null,

  async init() {
    this.greetingEl = document.getElementById('greeting');
    this.settings = await StorageManager.getSettings();
    this.update();

    // Update greeting every minute
    setInterval(() => this.update(), 60000);
  },

  update() {
    if (!this.greetingEl) return;
    const name = this.settings?.greeting?.name || 'SOHAG SHEIK';
    this.greetingEl.textContent = Utils.getGreeting(name);
  },

  updateSettings(newSettings) {
    this.settings = newSettings;
    this.update();
  }
};
