/* ============================================================
   Devora — Productivity Component
   Daily progress overview with animated circular/bar display.
   ============================================================ */

const ProductivityComponent = {
  container: null,
  tasks: [],

  async init() {
    this.container = document.getElementById('productivity-container');
    const today = Utils.getDateKey();
    this.tasks = await StorageManager.getTasks(today);
    this.render();
  },

  update(tasks) {
    this.tasks = tasks || [];
    this.render();
  },

  render() {
    if (!this.container) return;

    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.completed).length;
    const remaining = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate circumference for SVG circle
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    this.container.innerHTML = `
      <div class="productivity-card glass-card">
        <div class="productivity-header">
          <h2 class="productivity-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
            Progress
          </h2>
        </div>

        <div class="productivity-body">
          <div class="productivity-circle-wrap">
            <svg class="productivity-circle" viewBox="0 0 120 120">
              <circle class="productivity-circle-bg" cx="60" cy="60" r="${radius}" />
              <circle class="productivity-circle-progress" cx="60" cy="60" r="${radius}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
                style="--target-offset: ${offset}" />
            </svg>
            <div class="productivity-percentage">
              <span class="productivity-percent-value">${percentage}</span>
              <span class="productivity-percent-sign">%</span>
            </div>
          </div>

          <div class="productivity-stats">
            <div class="productivity-stat">
              <span class="stat-value">${total}</span>
              <span class="stat-label">Total</span>
            </div>
            <div class="productivity-stat stat-completed">
              <span class="stat-value">${completed}</span>
              <span class="stat-label">Done</span>
            </div>
            <div class="productivity-stat stat-remaining">
              <span class="stat-value">${remaining}</span>
              <span class="stat-label">Left</span>
            </div>
          </div>
        </div>

        ${total > 0 ? `
        <div class="productivity-bar-wrap">
          <div class="productivity-bar">
            <div class="productivity-bar-fill" style="width: ${percentage}%"></div>
          </div>
        </div>` : ''}
      </div>
    `;
  }
};
