/* ============================================================
   Devora — Popup Script
   Quick task overview and add functionality.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  // Apply theme
  const settings = await StorageManager.getSettings();
  document.documentElement.setAttribute('data-theme', settings.theme || 'dark');

  // Date
  const dateEl = document.getElementById('popup-date');
  const dateInfo = Utils.formatDate();
  dateEl.textContent = `${dateInfo.dayShort}, ${dateInfo.monthShort} ${dateInfo.day}`;

  // Load tasks
  const today = Utils.getDateKey();
  const tasks = await StorageManager.getTasks(today);
  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Progress
  document.getElementById('popup-progress-value').textContent = `${percentage}%`;
  document.getElementById('popup-progress-fill').style.width = `${percentage}%`;
  document.getElementById('popup-stats-text').textContent = `${completed} / ${total} tasks completed`;

  // Task list preview (show up to 5 active tasks)
  const taskListEl = document.getElementById('popup-tasks');
  const activeTasks = tasks.filter(t => !t.completed).slice(0, 5);

  if (activeTasks.length > 0) {
    taskListEl.innerHTML = activeTasks.map(task => {
      const priority = Utils.priorities[task.priority] || Utils.priorities.medium;
      return `
        <div class="popup-task-item">
          <button class="popup-task-check" data-id="${task.id}">
            <span class="popup-task-dot" style="background: ${priority.color}"></span>
          </button>
          <span class="popup-task-title">${Utils.escapeHtml(task.title)}</span>
        </div>
      `;
    }).join('');

    // Toggle tasks from popup
    taskListEl.querySelectorAll('.popup-task-check').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await StorageManager.toggleTask(id);
        // Reload popup
        window.location.reload();
      });
    });
  } else if (total > 0) {
    taskListEl.innerHTML = '<div class="popup-empty">🎉 All tasks completed!</div>';
  } else {
    taskListEl.innerHTML = '<div class="popup-empty">No tasks yet today.</div>';
  }

  // Quick add form
  const form = document.getElementById('popup-add-form');
  const input = document.getElementById('popup-add-input');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) return;

    await StorageManager.addTask({ title, priority: 'medium' });
    input.value = '';
    // Reload to reflect changes
    window.location.reload();
  });

  // Open dashboard
  document.getElementById('popup-dashboard-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/newtab/index.html') });
    window.close();
  });
});
