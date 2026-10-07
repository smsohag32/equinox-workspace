/* ============================================================
   Devora — Task Manager Component v2
   Full-featured with right-click context menu,
   expandable full-window mode, smooth animations.
   ============================================================ */

const TasksComponent = {
  container: null,
  tasks: [],
  filter: 'all',
  editingTaskId: null,
  currentDate: null,
  isExpanded: false,
  isPanelOpen: false,
  panelCategory: 'inbox',
  contextMenuTaskId: null,

  async init() {
    this.container = document.getElementById('tasks-container');
    this.currentDate = Utils.getDateKey();

    await this.loadTasks();

    // Auto-pin today's active tasks on tab/browser open
    const todayStr = this.currentDate;
    let modified = false;
    this.tasks.forEach(t => {
      if (!t.completed && (!t.dueDate || t.dueDate <= todayStr)) {
        if (t.pinned !== true) {
          t.pinned = true;
          modified = true;
        }
      }
    });
    if (modified) {
      await StorageManager.saveTasks(this.currentDate, this.tasks);
    }

    this.render();
    this.bindEvents();
    this.bindLauncherButton();
    this._initContextMenu();
    this.updateLauncherBadge();
    this.startTimers();
  },

  _getTaskRemainingTime(task) {
    if (!task.dueDate && !task.dueTime) return Infinity;
    const dStr = task.dueDate || Utils.getDateKey();
    const tStr = task.dueTime || '23:59';
    const ts = new Date(`${dStr}T${tStr}`).getTime();
    return isNaN(ts) ? Infinity : ts;
  },

  _getRemainingTimeInfo(targetTimestamp) {
    if (!targetTimestamp || isNaN(targetTimestamp)) return null;
    const now = Date.now();
    const diff = targetTimestamp - now;

    if (diff <= 0) {
      const overdueSecs = Math.floor(Math.abs(diff) / 1000);
      const d = Math.floor(overdueSecs / 86400);
      const h = Math.floor((overdueSecs % 86400) / 3600);
      const m = Math.floor((overdueSecs % 3600) / 60);
      let text = 'Overdue';
      if (d > 0) text = `Overdue by ${d}d ${h}h`;
      else if (h > 0) text = `Overdue by ${h}h ${m}m`;
      else if (m > 0) text = `Overdue by ${m}m`;
      else text = 'Overdue';
      return { isOverdue: true, isUrgent: true, text };
    }

    const totalSecs = Math.floor(diff / 1000);
    const d = Math.floor(totalSecs / 86400);
    const h = Math.floor((totalSecs % 86400) / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;

    let text = '';
    if (d > 0) {
      text = `${d}d ${h}h remaining`;
    } else if (h > 0) {
      text = `${h}h ${m}m remaining`;
    } else if (m > 0) {
      text = `${m}m ${s}s remaining`;
    } else {
      text = `${s}s remaining`;
    }
    const isUrgent = diff <= 3600 * 1000;
    return { isOverdue: false, isUrgent, text };
  },

  startTimers() {
    if (this._timerInterval) clearInterval(this._timerInterval);
    this._timerInterval = setInterval(() => {
      document.querySelectorAll('.task-countdown').forEach(el => {
        const deadline = parseInt(el.dataset.deadline, 10);
        if (isNaN(deadline)) return;
        const info = this._getRemainingTimeInfo(deadline);
        if (!info) return;

        const iconSvg = info.isOverdue ?
          `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;vertical-align:-1px;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` :
          `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;vertical-align:-1px;margin-right:4px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

        el.innerHTML = `${iconSvg}<span>${info.text}</span>`;
        if (info.isOverdue) {
          el.classList.add('overdue');
          el.classList.remove('urgent');
        } else if (info.isUrgent) {
          el.classList.remove('overdue');
          el.classList.add('urgent');
        } else {
          el.classList.remove('overdue', 'urgent');
        }
      });
    }, 1000);
  },

  async loadTasks(date) {
    this.currentDate = date || Utils.getDateKey();
    this.tasks = await StorageManager.getTasks(this.currentDate);
  },

  /* ========== RENDER ========== */
  render() {
    if (!this.container) return;

    // Desktop canvas only displays PINNED and INCOMPLETE tasks
    const pinnedTasks = this.tasks.filter(t => !t.completed && t.pinned !== false);

    // Sort: earliest remaining deadline first (most urgent/least remaining time first)
    const priorityScore = { critical: 4, high: 3, medium: 2, low: 1 };
    pinnedTasks.sort((a, b) => {
      const timeA = this._getTaskRemainingTime(a);
      const timeB = this._getTaskRemainingTime(b);
      if (timeA !== timeB) return timeA - timeB;
      return (priorityScore[b.priority] || 2) - (priorityScore[a.priority] || 2);
    });

    let currentX = 28;
    let currentY = 95;
    const cardGap = 12;
    const defaultWidth = 320;
    const defaultHeight = 110;
    const maxY = (window.innerHeight || 800) - 90;

    const cardsHtml = pinnedTasks.map((task, idx) => {
      const w = task.width;
      const h = task.height || defaultHeight;
      const calcW = w || defaultWidth;

      let x, y;
      if (task.x !== undefined && task.y !== undefined && task.isCustomPlaced) {
        x = task.x;
        y = task.y;
      } else {
        if (currentY + h > maxY && idx > 0) {
          currentX += calcW + 16;
          currentY = 95;
        }
        x = currentX;
        y = currentY;
        currentY += h + cardGap;
      }

      return this._renderTask(task, idx, false, x, y, w, h);
    }).join('');

    this.container.innerHTML = `
      <div class="tasks-canvas-workspace" id="tasks-workspace">
        <div class="tasks-list" id="tasks-list">
          ${cardsHtml}
        </div>
      </div>
    `;

    this.bindTaskEvents();
  },

  _renderTask(task, index = 0, isExpanded = false, posX, posY, posW, posH) {
    const priority = Utils.priorities[task.priority] || Utils.priorities.medium;
    
    let dueTimeStr = '';
    let countdownStr = '';
    if (task.dueDate || task.dueTime) {
      const dStr = task.dueDate || Utils.getDateKey(); 
      const tStr = task.dueTime || '23:59';
      const targetTimestamp = new Date(`${dStr}T${tStr}`).getTime();
      
      let displayTime = '';
      if (task.dueTime) {
        let [h, m] = task.dueTime.split(':');
        let isPm = h >= 12;
        h = h % 12 || 12;
        displayTime = `${h}:${m} ${isPm ? 'PM' : 'AM'}`;
      }
      
      let [y, mo, d] = dStr.split('-');
      let dateObj = new Date(y, mo - 1, d);
      let isToday = dStr === Utils.getDateKey();
      let displayDate = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      let combinedDisplay = displayTime ? `${displayDate}, ${displayTime}` : displayDate;
      const clockSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;vertical-align:-1px;margin-right:4px"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
      dueTimeStr = `<span class="task-due" title="Due on ${combinedDisplay}">${clockSvg}${combinedDisplay}</span>`;
      
      if (!task.completed && !isNaN(targetTimestamp)) {
        const info = this._getRemainingTimeInfo(targetTimestamp);
        if (info) {
          const iconSvg = info.isOverdue ?
            `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;vertical-align:-1px;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` :
            `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;vertical-align:-1px;margin-right:4px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
          countdownStr = `<span class="task-countdown ${info.isOverdue ? 'overdue' : ''} ${info.isUrgent ? 'urgent' : ''}" data-deadline="${targetTimestamp}">${iconSvg}<span>${info.text}</span></span>`;
        } else {
          countdownStr = `<span class="task-countdown" data-deadline="${targetTimestamp}"></span>`;
        }
      }
    }

    const cleanDesc = (task.description || '').trim();
    const hasDesc = cleanDesc.length > 0;
    const hasMeta = !!(dueTimeStr || countdownStr || task.completedAt);
    const isLongDesc = cleanDesc.length > 55 || cleanDesc.includes('\n');

    if (isExpanded) {
      return `
        <div class="task-item task-item--expanded ${task.completed ? 'task-completed' : ''}" data-id="${task.id}" data-priority="${task.priority}" title="Double-click to edit">
          <button class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle" data-id="${task.id}" title="Toggle completion">
            ${task.completed ?
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' :
              ''
            }
          </button>
          <div class="task-content">
            <div class="task-title-row">
              <span class="task-title">${Utils.escapeHtml(task.title)}</span>
              ${task.pinned !== false ? '<span class="panel-pinned-badge" title="Pinned to desktop screen">📌</span>' : ''}
            </div>
            ${hasDesc ? `
              <div class="task-description-wrapper">
                <div class="task-description task-desc-collapsed" id="task-desc-exp-${task.id}">${Utils.escapeHtml(cleanDesc)}</div>
                ${isLongDesc ? `
                  <button type="button" class="task-desc-toggle-btn" data-action="toggle-desc" data-id="${task.id}">See more</button>
                ` : ''}
              </div>
            ` : ''}
            ${hasMeta ? `
              <div class="task-meta">
                ${dueTimeStr}
                ${countdownStr}
                ${task.completedAt ? `<span class="task-completed-at">✓ ${Utils.relativeTime(task.completedAt)}</span>` : ''}
              </div>
            ` : ''}
          </div>
          <div class="task-actions">
            <button class="btn-icon task-pin-btn ${task.pinned !== false ? 'active-pin' : ''}" data-action="toggle-pin" data-id="${task.id}" title="${task.pinned !== false ? 'Unpin from desktop screen' : 'Pin to desktop screen'}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="${task.pinned !== false ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24z"></path>
              </svg>
            </button>
            <button class="btn-icon task-edit-btn" data-action="edit" data-id="${task.id}" title="Edit Task">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-icon task-delete-btn" data-action="delete" data-id="${task.id}" title="Delete Task">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }

    const x = posX !== undefined ? posX : (task.x !== undefined ? task.x : Math.min(window.innerWidth - 320, 28 + (index * 20)));
    const y = posY !== undefined ? posY : (task.y !== undefined ? task.y : Math.min(window.innerHeight - 120, 95 + (index * 95)));
    const widthStyle = posW ? `width: ${posW}px;` : (task.width ? `width: ${task.width}px;` : 'width: fit-content; min-width: 240px;');
    const heightStyle = posH ? `height: ${posH}px;` : (task.height ? `height: ${task.height}px;` : '');

    const stylePos = `style="position: fixed; left: ${x}px; top: ${y}px; z-index: 60; ${widthStyle} ${heightStyle}"`;

    return `
      <div class="task-item task-card-resizable ${task.completed ? 'task-completed' : ''}" data-id="${task.id}" data-priority="${task.priority}" title="Double-click to edit" ${stylePos}>
        <!-- Sticky Header: Drag handle, Checkbox, Title, and Actions -->
        <div class="task-card-header">
          <div class="task-card-header-left">
            <div class="task-drag-handle" title="Click and drag to place anywhere on screen">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="5" r="1.2" fill="currentColor"></circle>
                <circle cx="9" cy="12" r="1.2" fill="currentColor"></circle>
                <circle cx="9" cy="19" r="1.2" fill="currentColor"></circle>
                <circle cx="15" cy="5" r="1.2" fill="currentColor"></circle>
                <circle cx="15" cy="12" r="1.2" fill="currentColor"></circle>
                <circle cx="15" cy="19" r="1.2" fill="currentColor"></circle>
              </svg>
            </div>
            <button class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle" data-id="${task.id}" title="Toggle completion">
              ${task.completed ?
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' :
                ''
              }
            </button>
            <span class="task-title" title="${Utils.escapeHtml(task.title)}">${Utils.escapeHtml(task.title)}</span>
          </div>
          <div class="task-actions">
            <button class="btn-icon task-edit-btn" data-action="edit" data-id="${task.id}" title="Edit Task">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-icon task-delete-btn" data-action="delete" data-id="${task.id}" title="Delete Task">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              </svg>
            </button>
            <button class="btn-icon task-unpin-btn" data-action="unpin" data-id="${task.id}" title="Close / Unpin from desktop (remains in Tasks panel)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Body: only rendered if description or meta exists -->
        ${(hasDesc || hasMeta) ? `
          <div class="task-card-scrollable-body ${!hasDesc ? 'task-card-body--compact' : ''}">
            ${hasDesc ? `
              <div class="task-description-wrapper">
                <div class="task-description task-desc-collapsed" id="task-desc-${task.id}">${Utils.escapeHtml(cleanDesc)}</div>
                ${isLongDesc ? `
                  <button type="button" class="task-desc-toggle-btn" data-action="toggle-desc" data-id="${task.id}">See more</button>
                ` : ''}
              </div>
            ` : ''}
            ${hasMeta ? `
              <div class="task-meta">
                ${dueTimeStr}
                ${countdownStr}
                ${task.completedAt ? `<span class="task-completed-at">✓ ${Utils.relativeTime(task.completedAt)}</span>` : ''}
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  },

  _renderEmpty() {
    return `
     
    `;
  },

  _renderExpandedEmpty() {
    let emptyMsg = 'No tasks found';
    let subMsg = 'Click "+ Add Task" below to create your first task';
    if (this.filter === 'active') {
      emptyMsg = 'All caught up!';
      subMsg = 'No active tasks remaining';
    } else if (this.filter === 'completed') {
      emptyMsg = 'No completed tasks';
      subMsg = 'Tasks you complete will appear here';
    }

    return `
      <div class="tasks-expanded-empty">
        <div class="tasks-expanded-empty-icon">✓</div>
        <p class="tasks-expanded-empty-title">${emptyMsg}</p>
        <p class="tasks-expanded-empty-subtitle">${subMsg}</p>
        ${this.filter !== 'completed' ? `
          <button type="button" class="tasks-empty-add-btn" id="empty-add-task-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Task
          </button>
        ` : ''}
      </div>
    `;
  },

  _parseDateString(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const info = Utils.formatDate(date);
    return `${info.monthName} ${info.day}`;
  },

  getFilteredTasks() {
    switch (this.filter) {
      case 'active': return this.tasks.filter(t => !t.completed);
      case 'completed': return this.tasks.filter(t => t.completed);
      default: return [...this.tasks];
    }
  },

  /* ========== EVENTS ========== */
  bindEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 't' || e.key === 'T') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        e.preventDefault();
        this.showAddModal();
      }
    });

    // Page-wide Right-Click Toolbox Listener
    document.addEventListener('contextmenu', (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
      const isModal = e.target.closest('#modal-overlay') || e.target.closest('.context-menu');
      if (isInput || isModal) return;

      const taskEl = e.target.closest('.task-item');
      e.preventDefault();

      if (taskEl) {
        this.showContextMenu(e.clientX, e.clientY, taskEl.dataset.id);
      } else {
        this.showWorkspaceContextMenu(e.clientX, e.clientY);
      }
    });
  },

  bindTaskEvents() {
    // Task action delegation
    const taskList = document.getElementById('tasks-list');
    if (taskList) {
      taskList.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        switch (action) {
          case 'toggle':
            this.tasks = await StorageManager.toggleTask(id);
            btn.style.animation = 'checkBounce 0.3s ease';
            this.render();
            if (this.isExpanded) this.renderExpanded();
            if (this.isPanelOpen) this.renderPanelBox();
            this.updateLauncherBadge();
            break;
          case 'edit':
            this.showEditModal(id);
            break;
          case 'unpin':
            await this.togglePin(id);
            break;
          case 'delete': {
            const confirmed = await Utils.confirm({
              title: 'Delete Task',
              message: 'Are you sure you want to delete this task? It will be moved to the Trash box.',
              confirmText: 'Delete Task',
              type: 'danger'
            });
            if (confirmed) {
              await this.deleteTask(id);
            }
            break;
          }
          case 'toggle-desc': {
            const wrapper = btn.closest('.task-description-wrapper');
            const desc = wrapper ? wrapper.querySelector('.task-description') : null;
            if (desc) {
              const isCollapsed = desc.classList.contains('task-desc-collapsed');
              if (isCollapsed) {
                desc.classList.remove('task-desc-collapsed');
                desc.classList.add('task-desc-expanded');
                btn.textContent = 'See less';
              } else {
                desc.scrollTop = 0;
                desc.classList.remove('task-desc-expanded');
                desc.classList.add('task-desc-collapsed');
                btn.textContent = 'See more';
                const body = btn.closest('.task-card-scrollable-body');
                if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }
            break;
          }
        }
      });

      // Double-click to edit task
      taskList.addEventListener('dblclick', (e) => {
        if (e.target.closest('button') || e.target.closest('[data-action]') || e.target.closest('.task-checkbox') || e.target.closest('input') || e.target.closest('textarea')) {
          return;
        }
        const card = e.target.closest('.task-item');
        if (card && card.dataset.id) {
          this.showEditModal(card.dataset.id);
        }
      });

      // Free-form Drag positioning
      this.initFreeFormDrag(taskList);
    }
  },

  async togglePin(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    const isCurrentlyPinned = task.pinned !== false;
    const newPinned = !isCurrentlyPinned;
    this.tasks = await StorageManager.updateTask(taskId, { pinned: newPinned });
    this.render();
    if (this.isExpanded) this.renderExpanded();
    if (this.isPanelOpen) this.renderPanelBox();
    this.updateLauncherBadge();
  },

  /* ========== FREE-FORM DRAG & POSITIONING ========== */
  initFreeFormDrag(listEl) {
    if (!listEl) return;

    listEl.querySelectorAll('.task-item').forEach(card => {
      card.addEventListener('mousedown', (e) => {
        // Ignore right clicks or clicks on buttons/interactive controls
        if (e.button !== 0) return;
        if (e.target.closest('button') || e.target.closest('[data-action]') || e.target.closest('.task-checkbox') || e.target.closest('input') || e.target.closest('textarea')) {
          return;
        }

        // Allow resize corner dragging: Do not trigger move drag if clicked near bottom-right corner
        const rect = card.getBoundingClientRect();
        const isResizeCorner = (e.clientX >= rect.right - 24) && (e.clientY >= rect.bottom - 24);
        if (isResizeCorner) {
          return; // Let native CSS resize work cleanly!
        }

        e.preventDefault();

        const cardRect = card.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;

        card.style.position = 'fixed';
        card.style.left = `${cardRect.left}px`;
        card.style.top = `${cardRect.top}px`;
        card.style.zIndex = '10000';

        const initialLeft = parseFloat(card.style.left) || cardRect.left;
        const initialTop = parseFloat(card.style.top) || cardRect.top;

        card.classList.add('task-dragging-free');

        const onMouseMove = (moveEv) => {
          const deltaX = moveEv.clientX - startX;
          const deltaY = moveEv.clientY - startY;

          const maxLeft = Math.max(0, window.innerWidth - 60);
          const maxTop = Math.max(0, window.innerHeight - 30);

          const newLeft = Math.max(0, Math.min(maxLeft, initialLeft + deltaX));
          const newTop = Math.max(0, Math.min(maxTop, initialTop + deltaY));

          card.style.position = 'fixed';
          card.style.left = `${newLeft}px`;
          card.style.top = `${newTop}px`;
        };

        const onMouseUp = async () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);

          card.classList.remove('task-dragging-free');
          card.style.zIndex = '60';

          const finalLeft = Math.round(parseFloat(card.style.left));
          const finalTop = Math.round(parseFloat(card.style.top));
          const taskId = card.dataset.id;

          this.tasks = await StorageManager.updateTask(taskId, {
            x: finalLeft,
            y: finalTop,
            isCustomPlaced: true
          });
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      // ResizeObserver to save size on card resize
      if (window.ResizeObserver && !card._hasResizeObs) {
        card._hasResizeObs = true;
        let initialSkip = true;
        const ro = new ResizeObserver(entries => {
          if (initialSkip) {
            initialSkip = false;
            return;
          }
          for (let entry of entries) {
            const w = Math.round(entry.target.offsetWidth);
            const h = Math.round(entry.target.offsetHeight);
            const taskId = card.dataset.id;
            clearTimeout(card._resizeTimer);
            card._resizeTimer = setTimeout(async () => {
              await StorageManager.updateTask(taskId, { width: w, height: h });
            }, 400);
          }
        });
        ro.observe(card);
      }
    });
  },

  /* ========== DRAG AND DROP REORDERING ========== */
  initDragAndDrop(listEl) {
    if (!listEl) return;
    let draggedItem = null;

    listEl.querySelectorAll('.task-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        item.classList.add('task-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.id);
      });

      item.addEventListener('dragend', () => {
        if (draggedItem) draggedItem.classList.remove('task-dragging');
        draggedItem = null;
        listEl.querySelectorAll('.task-item').forEach(el => {
          el.classList.remove('task-drag-over', 'task-drop-top', 'task-drop-bottom');
        });
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (item !== draggedItem) {
          const rect = item.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            item.classList.add('task-drop-top');
            item.classList.remove('task-drop-bottom');
          } else {
            item.classList.add('task-drop-bottom');
            item.classList.remove('task-drop-top');
          }
        }
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('task-drag-over', 'task-drop-top', 'task-drop-bottom');
      });

      item.addEventListener('drop', async (e) => {
        e.preventDefault();
        const isTop = item.classList.contains('task-drop-top');
        item.classList.remove('task-drag-over', 'task-drop-top', 'task-drop-bottom');
        if (!draggedItem || draggedItem === item) return;

        const draggedId = draggedItem.dataset.id;
        const targetId = item.dataset.id;

        const draggedIdx = this.tasks.findIndex(t => t.id === draggedId);
        let targetIdx = this.tasks.findIndex(t => t.id === targetId);

        if (draggedIdx !== -1 && targetIdx !== -1) {
          const [movedTask] = this.tasks.splice(draggedIdx, 1);
          if (!isTop) targetIdx += (draggedIdx < targetIdx ? 0 : 1);
          else targetIdx -= (draggedIdx > targetIdx ? 0 : 1);

          if (targetIdx < 0) targetIdx = 0;
          if (targetIdx > this.tasks.length) targetIdx = this.tasks.length;

          this.tasks.splice(targetIdx, 0, movedTask);

          await StorageManager.saveTasks(this.currentDate, this.tasks);
          this.render();
          if (this.isExpanded) this.renderExpanded();
        }
      });
    });
  },

  /* ========== CONTEXT MENU ========== */
  _initContextMenu() {
    // Create context menu element once
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'task-context-menu';
    document.body.appendChild(menu);

    // Close on click outside
    document.addEventListener('click', () => this.hideContextMenu());
    document.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('.task-item')) {
        this.hideContextMenu();
      }
    });
  },

  showContextMenu(x, y, taskId) {
    this.lastRightClickPos = { x, y };
    this.contextMenuTaskId = taskId;
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    const menu = document.getElementById('task-context-menu');

    menu.innerHTML = `
      <button class="context-menu-item" data-ctx="toggle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${task.completed ?
            '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>' :
            '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>'
          }
        </svg>
        ${task.completed ? 'Mark as Active' : 'Mark as Complete'}
        <span class="context-shortcut">Space</span>
      </button>
      <button class="context-menu-item" data-ctx="edit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Edit Task
        <span class="context-shortcut">E</span>
      </button>
      <button class="context-menu-item" data-ctx="toggle-pin">
        <svg viewBox="0 0 24 24" fill="${task.pinned !== false ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24z"></path>
        </svg>
        ${task.pinned !== false ? 'Unpin from Screen' : 'Pin to Screen'}
        <span class="context-shortcut">P</span>
      </button>
      <div class="context-menu-separator"></div>
      <div class="context-menu-label">Priority</div>
      <button class="context-menu-item" data-ctx="priority" data-priority="low">
        <span class="context-priority-dot" style="background: #10b981"></span>
        Low
        ${task.priority === 'low' ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </button>
      <button class="context-menu-item" data-ctx="priority" data-priority="medium">
        <span class="context-priority-dot" style="background: #f59e0b"></span>
        Medium
        ${task.priority === 'medium' ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </button>
      <button class="context-menu-item" data-ctx="priority" data-priority="high">
        <span class="context-priority-dot" style="background: #f97316"></span>
        High
        ${task.priority === 'high' ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </button>
      <button class="context-menu-item" data-ctx="priority" data-priority="critical">
        <span class="context-priority-dot" style="background: #ef4444"></span>
        Critical
        ${task.priority === 'critical' ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </button>
      <div class="context-menu-separator"></div>
      <button class="context-menu-item danger" data-ctx="delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
        Delete Task
        <span class="context-shortcut">Del</span>
      </button>
    `;

    // Position — keep within viewport
    const menuW = 220;
    const menuH = menu.scrollHeight || 340;
    let posX = x;
    let posY = y;

    if (x + menuW > window.innerWidth) posX = window.innerWidth - menuW - 10;
    if (y + menuH > window.innerHeight) posY = window.innerHeight - menuH - 10;

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;
    menu.style.transformOrigin = `${x > window.innerWidth / 2 ? 'right' : 'left'} top`;

    requestAnimationFrame(() => menu.classList.add('active'));

    // Bind context menu actions
    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        const ctx = item.dataset.ctx;
        const id = this.contextMenuTaskId;

        switch (ctx) {
          case 'toggle':
            this.tasks = await StorageManager.toggleTask(id);
            break;
          case 'toggle-pin':
            await this.togglePin(id);
            break;
          case 'edit':
            this.showEditModal(id);
            break;
          case 'priority':
            const newPriority = item.dataset.priority;
            this.tasks = await StorageManager.updateTask(id, { priority: newPriority });
            break;
          case 'delete': {
            const confirmed = await Utils.confirm({
              title: 'Delete Task',
              message: 'Are you sure you want to delete this task? It will be moved to the Trash box.',
              confirmText: 'Delete Task',
              type: 'danger'
            });
            if (confirmed) {
              await this.deleteTask(id);
            }
            break;
          }
        }

        this.hideContextMenu();
        this.render();
        if (this.isExpanded) this.renderExpanded();
      });
    });
  },

  hideContextMenu() {
    const menu = document.getElementById('task-context-menu');
    if (menu) menu.classList.remove('active');
    this.contextMenuTaskId = null;
  },

  showWorkspaceContextMenu(x, y) {
    this.lastRightClickPos = { x, y };
    const menu = document.getElementById('task-context-menu');
    if (!menu) return;

    const completedCount = this.tasks.filter(t => t.completed).length;

    menu.innerHTML = `
      <div class="context-menu-header">WORKSPACE TOOLBOX</div>
      <button class="context-menu-item primary-action" data-wctx="add">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        New Task
        <span class="context-shortcut">T</span>
      </button>
      <button class="context-menu-item" data-wctx="add-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        New Sticky Note
        <span class="context-shortcut">N</span>
      </button>
      <div class="context-menu-separator"></div>
      <button class="context-menu-item" data-wctx="sort">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M6 12h12M9 18h6"/>
        </svg>
        Sort by Priority
      </button>
      <button class="context-menu-item" data-wctx="clear" ${completedCount === 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
        </svg>
        Clear Completed (${completedCount})
      </button>
      <div class="context-menu-separator"></div>
      <button class="context-menu-item" data-wctx="history">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        Task History
      </button>
      <button class="context-menu-item" data-wctx="expand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 3 21 3 21 9"></polyline>
          <polyline points="9 21 3 21 3 15"></polyline>
          <line x1="21" y1="3" x2="14" y2="10"></line>
          <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
        Full Window Workspace
      </button>
    `;

    const menuW = 220;
    const menuH = menu.scrollHeight || 290;
    let posX = x;
    let posY = y;

    if (x + menuW > window.innerWidth) posX = window.innerWidth - menuW - 10;
    if (y + menuH > window.innerHeight) posY = window.innerHeight - menuH - 10;

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;

    requestAnimationFrame(() => menu.classList.add('active'));

    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        const wctx = item.dataset.wctx;
        this.hideContextMenu();

        switch (wctx) {
          case 'add':
            this.showAddModal();
            break;
          case 'add-note':
            if (typeof NotesComponent !== 'undefined') {
              NotesComponent.addNote({
                x: Math.max(0, Math.min(window.innerWidth - 300, Math.round(x))),
                y: Math.max(0, Math.min(window.innerHeight - 220, Math.round(y)))
              });
            }
            break;
          case 'sort':
            await this.sortByPriority();
            break;
          case 'clear':
            await this.clearCompleted();
            break;
          case 'history':
            this.showHistoryModal();
            break;
          case 'expand':
            this.openExpandedView();
            break;
        }
      });
    });
  },

  async clearCompleted() {
    this.tasks = this.tasks.filter(t => !t.completed);
    await StorageManager.saveTasks(this.currentDate, this.tasks);
    this.render();
    if (this.isExpanded) this.renderExpanded();
  },

  async sortByPriority() {
    const priorityScore = { critical: 4, high: 3, medium: 2, low: 1 };
    this.tasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (priorityScore[b.priority] || 2) - (priorityScore[a.priority] || 2);
    });
    await StorageManager.saveTasks(this.currentDate, this.tasks);
    this.render();
    if (this.isExpanded) this.renderExpanded();
  },

  /* ========== EXPANDED FULL-WINDOW VIEW ========== */
  openExpandedView() {
    this.isExpanded = true;

    // Create overlay and panel
    let overlay = document.getElementById('task-expanded-overlay');
    let panel = document.getElementById('task-expanded-panel');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'task-expanded-overlay';
      overlay.id = 'task-expanded-overlay';
      document.body.appendChild(overlay);
    }

    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'task-expanded-panel';
      panel.id = 'task-expanded-panel';
      document.body.appendChild(panel);
    }

    this.renderExpanded();

    requestAnimationFrame(() => {
      overlay.classList.add('active');
      panel.classList.add('active');
    });

    // Close on overlay click
    overlay.addEventListener('click', () => this.closeExpandedView());
  },

  _renderFilters() {
    const activeCount = this.tasks.filter(t => !t.completed).length;
    const completedCount = this.tasks.filter(t => t.completed).length;
    return `
      <div class="tasks-filters">
        <button class="tasks-filter ${this.filter === 'all' ? 'active' : ''}" data-filter="all">All (${this.tasks.length})</button>
        <button class="tasks-filter ${this.filter === 'active' ? 'active' : ''}" data-filter="active">Active (${activeCount})</button>
        <button class="tasks-filter ${this.filter === 'completed' ? 'active' : ''}" data-filter="completed">Completed (${completedCount})</button>
      </div>
    `;
  },

  renderExpanded() {
    const panel = document.getElementById('task-expanded-panel');
    if (!panel) return;

    const isToday = this.currentDate === Utils.getDateKey();
    const dateInfo = this._parseDateString(this.currentDate);
    const filtered = this.getFilteredTasks();
    const completed = this.tasks.filter(t => t.completed).length;
    const total = this.tasks.length;

    panel.innerHTML = `
      <div class="task-expanded-header">
        <h2>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
          </svg>
          ${isToday ? "Today's Tasks" : dateInfo}
          <span class="tasks-count">${completed}/${total}</span>
        </h2>
        <button class="btn-icon task-expanded-close" id="expanded-close-btn" title="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="task-expanded-body">
        ${this._renderFilters()}
        <div class="task-expanded-list" id="expanded-tasks-list">
          ${filtered.length === 0 ? this._renderExpandedEmpty() : filtered.map((task, idx) => this._renderTask(task, idx, true)).join('')}
        </div>
      </div>

      ${isToday ? `
      <div class="task-expanded-footer">
        <button class="tasks-add-btn" id="expanded-add-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Task
        </button>
      </div>` : ''}
    `;

    // Bind expanded events
    document.getElementById('expanded-close-btn')?.addEventListener('click', () => this.closeExpandedView());

    document.getElementById('empty-add-task-btn')?.addEventListener('click', () => this.showAddModal());

    const expandedAddBtn = document.getElementById('expanded-add-btn');
    if (expandedAddBtn) {
      expandedAddBtn.addEventListener('click', () => this.showAddModal());
    }

    // Filters in expanded
    panel.querySelectorAll('.tasks-filter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.filter = e.target.dataset.filter;
        this.render();
        this.renderExpanded();
      });
    });

    // Task actions in expanded
    const expandedList = document.getElementById('expanded-tasks-list');
    if (expandedList) {
      expandedList.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        switch (action) {
          case 'toggle':
            this.tasks = await StorageManager.toggleTask(id);
            this.render();
            this.renderExpanded();
            if (this.isPanelOpen) this.renderPanelBox();
            this.updateLauncherBadge();
            break;
          case 'toggle-pin':
            await this.togglePin(id);
            break;
          case 'toggle-desc': {
            const wrapper = btn.closest('.task-description-wrapper');
            const desc = wrapper ? wrapper.querySelector('.task-description') : null;
            if (desc) {
              const isCollapsed = desc.classList.contains('task-desc-collapsed');
              if (isCollapsed) {
                desc.classList.remove('task-desc-collapsed');
                desc.classList.add('task-desc-expanded');
                btn.textContent = 'See less';
              } else {
                desc.scrollTop = 0;
                desc.classList.remove('task-desc-expanded');
                desc.classList.add('task-desc-collapsed');
                btn.textContent = 'See more';
              }
            }
            break;
          }
          case 'edit':
            this.showEditModal(id);
            break;
          case 'delete': {
            const confirmed = await Utils.confirm({
              title: 'Delete Task',
              message: 'Are you sure you want to delete this task? It will be moved to the Trash box.',
              confirmText: 'Delete Task',
              type: 'danger'
            });
            if (confirmed) {
              this.tasks = await StorageManager.deleteTask(id);
              this.render();
              this.renderExpanded();
              if (this.isPanelOpen) this.renderPanelBox();
              this.updateLauncherBadge();
            }
            break;
          }
        }
      });

      // Right-click in expanded view
      expandedList.addEventListener('contextmenu', (e) => {
        const taskEl = e.target.closest('.task-item');
        if (taskEl) {
          e.preventDefault();
          this.showContextMenu(e.clientX, e.clientY, taskEl.dataset.id);
        }
      });

      this.initDragAndDrop(expandedList);
    }
  },

  closeExpandedView() {
    this.isExpanded = false;
    const overlay = document.getElementById('task-expanded-overlay');
    const panel = document.getElementById('task-expanded-panel');
    if (overlay) overlay.classList.remove('active');
    if (panel) panel.classList.remove('active');

    setTimeout(() => {
      overlay?.remove();
      panel?.remove();
    }, 400);
  },

  /* ========== FLOATING TASK PANEL WIDGET (SIDEBAR & INBOX) ========== */
  bindLauncherButton() {
    const launcher = document.getElementById('tasks-widget-launcher');
    const widgetsContainer = document.getElementById('bottom-right-widgets');
    if (launcher) {
      if (widgetsContainer && launcher.parentElement !== widgetsContainer) {
        widgetsContainer.appendChild(launcher);
      }
      launcher.addEventListener('click', () => this.togglePanelBox());
    }
  },

  updateLauncherBadge() {
    const launcher = document.getElementById('tasks-widget-launcher');
    if (!launcher) return;
    const activeCount = this.tasks.filter(t => !t.completed).length;
    launcher.classList.toggle('active', this.isPanelOpen);
    launcher.title = `Task Manager — ${activeCount} active task${activeCount === 1 ? '' : 's'} (Alt+T / Ctrl+Shift+T)`;

    let badge = launcher.querySelector('.badge-tasks');
    if (!badge) {
      launcher.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 11l3 3L22 4"></path>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
        </svg>
        <span class="launcher-label">Tasks</span>
        <span class="widget-badge badge-tasks" id="tasks-launcher-badge">${activeCount}</span>
      `;
    } else {
      badge.textContent = activeCount;
    }
  },

  togglePanelBox() {
    if (this.isPanelOpen) {
      this.closePanelBox();
    } else {
      this.openPanelBox();
    }
  },

  openPanelBox() {
    this.isPanelOpen = true;
    this.updateLauncherBadge();
    this.renderPanelBox();
  },

  closePanelBox() {
    this.isPanelOpen = false;
    this.updateLauncherBadge();
    const panel = document.getElementById('tasks-floating-panel');
    if (panel) {
      if (panel._outsideHandler) {
        document.removeEventListener('click', panel._outsideHandler);
        panel._outsideHandler = null;
      }
      panel.classList.remove('active');
      setTimeout(() => panel.remove(), 250);
    }
  },

  async renderPanelBox() {
    let panel = document.getElementById('tasks-floating-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'tasks-floating-panel';
      panel.className = 'tasks-floating-panel glass-card';
      document.body.appendChild(panel);
    }

    const todayDateStr = Utils.getDateKey();
    const inboxTasks = this.tasks.filter(t => !t.completed);
    const todayTasks = this.tasks.filter(t => !t.completed && (!t.dueDate || t.dueDate <= todayDateStr));
    const upcomingTasks = this.tasks.filter(t => !t.completed && t.dueDate && t.dueDate > todayDateStr);
    const pinnedTasks = this.tasks.filter(t => !t.completed && t.pinned !== false);
    const completedTasks = this.tasks.filter(t => t.completed);
    const trashTasks = await StorageManager.getTrashTasks();

    const sortByRemaining = (a, b) => {
      const timeA = this._getTaskRemainingTime(a);
      const timeB = this._getTaskRemainingTime(b);
      if (timeA !== timeB) return timeA - timeB;
      const priorityScore = { critical: 4, high: 3, medium: 2, low: 1 };
      return (priorityScore[b.priority] || 2) - (priorityScore[a.priority] || 2);
    };

    todayTasks.sort(sortByRemaining);
    upcomingTasks.sort(sortByRemaining);
    pinnedTasks.sort(sortByRemaining);
    inboxTasks.sort(sortByRemaining);

    const counts = {
      today: todayTasks.length,
      upcoming: upcomingTasks.length,
      pinned: pinnedTasks.length,
      inbox: inboxTasks.length,
      completed: completedTasks.length,
      trash: trashTasks.length
    };

    const icons = {
      today: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
      upcoming: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
      pinned: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24z"/></svg>`,
      inbox: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
      completed: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`
    };

    let displayTasks = [];
    let categoryTitle = 'All Tasks';
    let categoryIcon = icons.inbox;
    const isTrashMode = this.panelCategory === 'trash';

    switch (this.panelCategory) {
      case 'today':
        displayTasks = todayTasks; categoryTitle = 'Today'; categoryIcon = icons.today; break;
      case 'upcoming':
        displayTasks = upcomingTasks; categoryTitle = 'Upcoming'; categoryIcon = icons.upcoming; break;
      case 'pinned':
        displayTasks = pinnedTasks; categoryTitle = 'Pinned on Screen'; categoryIcon = icons.pinned; break;
      case 'completed':
        displayTasks = completedTasks; categoryTitle = 'Completed'; categoryIcon = icons.completed; break;
      case 'trash':
        displayTasks = trashTasks; categoryTitle = 'Trash Box'; categoryIcon = icons.trash; break;
      default:
        displayTasks = inboxTasks; categoryTitle = 'All Tasks'; categoryIcon = icons.inbox; break;
    }

    panel.innerHTML = `
      <div class="panel-layout">
        <!-- Sidebar -->
        <aside class="panel-sidebar">
          <div class="sidebar-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
            </svg>
            <span class="sidebar-title">My Tasks</span>
          </div>
          <nav class="sidebar-menu">
            <button class="sidebar-menu-item ${this.panelCategory === 'today' || (!this.panelCategory && counts.today > 0) ? 'active' : ''}" data-cat="today">
              <span class="sidebar-item-icon">${icons.today}</span>
              <span class="sidebar-item-label">Today</span>
              ${counts.today > 0 ? `<span class="sidebar-item-count">${counts.today}</span>` : ''}
            </button>
            <button class="sidebar-menu-item ${this.panelCategory === 'upcoming' ? 'active' : ''}" data-cat="upcoming">
              <span class="sidebar-item-icon">${icons.upcoming}</span>
              <span class="sidebar-item-label">Upcoming</span>
              ${counts.upcoming > 0 ? `<span class="sidebar-item-count">${counts.upcoming}</span>` : ''}
            </button>
            <button class="sidebar-menu-item ${this.panelCategory === 'pinned' ? 'active' : ''}" data-cat="pinned">
              <span class="sidebar-item-icon">${icons.pinned}</span>
              <span class="sidebar-item-label">Pinned</span>
              ${counts.pinned > 0 ? `<span class="sidebar-item-count sidebar-item-count--pinned">${counts.pinned}</span>` : ''}
            </button>
            <button class="sidebar-menu-item ${this.panelCategory === 'inbox' || (!this.panelCategory && counts.today === 0) ? 'active' : ''}" data-cat="inbox">
              <span class="sidebar-item-icon">${icons.inbox}</span>
              <span class="sidebar-item-label">All Tasks</span>
              ${counts.inbox > 0 ? `<span class="sidebar-item-count">${counts.inbox}</span>` : ''}
            </button>
            <button class="sidebar-menu-item ${this.panelCategory === 'completed' ? 'active' : ''}" data-cat="completed">
              <span class="sidebar-item-icon">${icons.completed}</span>
              <span class="sidebar-item-label">Completed</span>
              ${counts.completed > 0 ? `<span class="sidebar-item-count">${counts.completed}</span>` : ''}
            </button>
            <button class="sidebar-menu-item ${this.panelCategory === 'trash' ? 'active' : ''}" data-cat="trash">
              <span class="sidebar-item-icon">${icons.trash}</span>
              <span class="sidebar-item-label">Trash</span>
              ${counts.trash > 0 ? `<span class="sidebar-item-count sidebar-item-count--red">${counts.trash}</span>` : ''}
            </button>
          </nav>
        </aside>

        <!-- Main Content -->
        <main class="panel-main">
          <header class="panel-header">
            <div class="panel-header-left">
              <span class="panel-header-icon">${categoryIcon}</span>
              <h3 class="panel-header-title">${categoryTitle}</h3>
            </div>
            <div class="panel-header-right">
              ${isTrashMode && trashTasks.length > 0 ? `
                <button class="panel-hdr-action panel-hdr-danger" id="empty-trash-btn" title="Permanently delete all trash">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  Empty
                </button>
              ` : ''}
              ${!isTrashMode ? `
                <button class="panel-hdr-icon-btn" id="panel-add-modal-btn" title="Add task with details">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              ` : ''}
              <button class="panel-hdr-icon-btn" id="panel-expand-btn" title="Open full workspace">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              </button>
              <button class="panel-hdr-icon-btn" id="panel-close-x" title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </header>

          <div class="panel-content-body">
            ${displayTasks.length === 0 ? `
              <div class="panel-empty-inbox">
                <div class="inbox-graphic-icon">${isTrashMode ? icons.trash : icons.inbox}</div>
                <p>${isTrashMode ? 'Trash is empty' : `No tasks in ${categoryTitle}`}</p>
                ${!isTrashMode ? `<p style="font-size:0.78rem;opacity:0.5">Use the form below or right-click the workspace</p>` : ''}
              </div>` : `
              <div class="panel-tasks-list">
                ${displayTasks.map(t => isTrashMode ? `
                  <div class="panel-task-row trash-row" data-id="${t.id}">
                    <div class="trash-row-info">
                      <span class="panel-task-text">${Utils.escapeHtml(t.title)}</span>
                      <span class="trash-row-meta">${t.deletedAt ? Utils.relativeTime(t.deletedAt) : 'Deleted'}</span>
                    </div>
                    <div class="trash-row-actions">
                      <button class="trash-restore-btn" data-paction="restore" data-id="${t.id}" title="Restore task">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.62"/></svg>
                        Restore
                      </button>
                      <button class="trash-perm-del-btn" data-paction="perm-delete" data-id="${t.id}" title="Delete permanently">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </div>
                ` : `
                  <div class="panel-task-row ${t.completed ? 'completed' : ''}" data-id="${t.id}">
                    <button class="task-checkbox ${t.completed ? 'checked' : ''}" data-paction="toggle" data-id="${t.id}" title="${t.completed ? 'Mark incomplete' : 'Mark complete'}">
                      ${t.completed ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                    </button>
                    <div class="panel-task-info">
                      <div class="panel-task-title-line">
                        <span class="panel-task-text">${Utils.escapeHtml(t.title)}</span>
                        ${t.pinned !== false ? `<span class="panel-pinned-badge" title="Pinned to desktop screen"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg></span>` : ''}
                      </div>
                      ${(t.description && t.description.trim()) ? `<span class="panel-task-desc">${Utils.escapeHtml(t.description.trim().slice(0, 55))}${t.description.trim().length > 55 ? '…' : ''}</span>` : ''}
                      ${(() => {
                        if (!t.dueDate && !t.dueTime) return '';
                        const ts = this._getTaskRemainingTime(t);
                        const info = this._getRemainingTimeInfo(ts);
                        return `<span class="panel-task-due ${info?.isOverdue ? 'overdue' : ''}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;vertical-align:-1px;margin-right:3px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${t.dueDate || 'Today'}${t.dueTime ? ' ' + t.dueTime : ''}${info ? ` • ${info.text}` : ''}</span>`;
                      })()}
                    </div>
                    ${t.priority === 'high' || t.priority === 'critical' ? '<span class="task-priority-dot priority-high"></span>' : ''}
                    <div class="panel-row-actions">
                      <button class="panel-action-icon-btn ${t.pinned !== false ? 'active-pin' : ''}" data-paction="toggle-pin" data-id="${t.id}" title="${t.pinned !== false ? 'Unpin from desktop screen' : 'Pin to desktop screen'}">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="${t.pinned !== false ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="12" y1="17" x2="12" y2="22"></line>
                          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24z"></path>
                        </svg>
                      </button>
                      <button class="panel-action-icon-btn" data-paction="edit" data-id="${t.id}" title="Edit task details">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button class="panel-task-del" data-paction="delete" data-id="${t.id}" title="Delete task">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>`
            }
          </div>

          <footer class="panel-footer">
            ${isTrashMode ? `
              <div class="panel-trash-footer-note">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
                <span>Items here are permanently removed after 30 days</span>
              </div>
            ` : `
              <form class="panel-add-form" id="panel-add-form">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--accent-primary);flex-shrink:0"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <input type="text" id="panel-add-input" class="panel-add-input" placeholder="Add a task… (Enter to save)" autocomplete="off" required>
                <button type="submit" class="panel-add-btn">Add</button>
              </form>
            `}
          </footer>
        </main>
      </div>
    `;

    requestAnimationFrame(() => panel.classList.add('active'));

    if (typeof WidgetDockManager !== 'undefined') {
      WidgetDockManager.makePanelDraggable(panel, 'devora_tasks_panel_pos');
    }

    // Outside-click to close
    if (panel._outsideHandler) {
      document.removeEventListener('click', panel._outsideHandler);
      panel._outsideHandler = null;
    }
    setTimeout(() => {
      const outsideHandler = (e) => {
        const launcher = document.getElementById('tasks-widget-launcher');
        if (panel.contains(e.target)) return;
        if (launcher && launcher.contains(e.target)) return;
        this.closePanelBox();
      };
      document.addEventListener('click', outsideHandler);
      panel._outsideHandler = outsideHandler;
    }, 50);

    // Bind sidebar category switching
    panel.querySelectorAll('.sidebar-menu-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.panelCategory = btn.dataset.cat;
        this.renderPanelBox();
      });
    });

    // Close, add modal, and expand buttons
    document.getElementById('panel-close-x')?.addEventListener('click', () => this.closePanelBox());
    document.getElementById('panel-add-modal-btn')?.addEventListener('click', () => this.showAddModal());
    document.getElementById('panel-expand-btn')?.addEventListener('click', () => {
      this.closePanelBox();
      this.openExpandedView();
    });

    // Clean / Empty Trash button
    document.getElementById('empty-trash-btn')?.addEventListener('click', async () => {
      const confirmed = await Utils.confirm({
        title: 'Empty Trash Box',
        message: 'Are you sure you want to permanently delete all items in Trash Box? This action cannot be undone.',
        confirmText: 'Empty Trash',
        type: 'danger'
      });
      if (confirmed) {
        await StorageManager.emptyTrash();
        this.renderPanelBox();
      }
    });

    // Double-click to edit task inside panel box (only when not in trash mode)
    if (!isTrashMode) {
      panel.querySelector('.panel-content-body')?.addEventListener('dblclick', (e) => {
        if (e.target.closest('button') || e.target.closest('.task-checkbox') || e.target.closest('.panel-task-del') || e.target.closest('.panel-action-icon-btn')) {
          return;
        }
        const row = e.target.closest('.panel-task-row');
        if (row && row.dataset.id) {
          this.showEditModal(row.dataset.id);
        }
      });
    }

    // Action delegation inside panel list
    panel.querySelector('.panel-content-body')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-paction]');
      if (!btn) return;
      const action = btn.dataset.paction;
      const id = btn.dataset.id;
      if (action === 'toggle') {
        this.tasks = await StorageManager.toggleTask(id);
        this.render();
        this.renderPanelBox();
        this.updateLauncherBadge();
      } else if (action === 'toggle-pin') {
        await this.togglePin(id);
      } else if (action === 'edit') {
        this.showEditModal(id);
      } else if (action === 'delete') {
        const confirmed = await Utils.confirm({
          title: 'Move to Trash',
          message: 'Are you sure you want to delete this task? It will be moved to the Trash box.',
          confirmText: 'Delete',
          type: 'danger'
        });
        if (confirmed) {
          await this.deleteTask(id);
          this.renderPanelBox();
          this.updateLauncherBadge();
        }
      } else if (action === 'restore') {
        await StorageManager.restoreTaskFromTrash(id);
        this.tasks = await StorageManager.getTasks();
        this.render();
        this.renderPanelBox();
        this.updateLauncherBadge();
      } else if (action === 'perm-delete') {
        const confirmed = await Utils.confirm({
          title: 'Permanently Delete Task',
          message: 'Are you sure you want to permanently delete this task? This action cannot be undone.',
          confirmText: 'Delete Permanently',
          type: 'danger'
        });
        if (confirmed) {
          await StorageManager.deleteTaskPermanently(id);
          this.renderPanelBox();
        }
      }
    });

    // Inline New Task Form submit
    if (!isTrashMode) {
      document.getElementById('panel-add-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('panel-add-input');
        const title = input.value.trim();
        const todayDate = Utils.getDateKey();
        input.value = '';
        await StorageManager.addTask({
          title,
          priority: 'medium',
          dueDate: todayDate,
          pinned: true,
          x: Math.round(window.innerWidth / 2 - 140),
          y: 120
        });
        this.tasks = await StorageManager.getTasks();
        this.render();
        this.renderPanelBox();
        this.updateLauncherBadge();
      });
    }
  },

  /* ========== ADD/EDIT MODAL ========== */
  showAddModal() {
    this._showTaskModal(null);
  },

  showEditModal(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) this._showTaskModal(task);
  },

  _showTaskModal(task) {
    const isEdit = !!task;
    const modal = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');

    modalContent.innerHTML = `
      <div class="modal-card glass-card">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Task' : 'New Task'}</h3>
          <button class="btn-icon modal-close-btn" id="modal-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form id="task-form" class="modal-form">
          <div class="form-group">
            <label for="task-title-input">Task Name</label>
            <input type="text" id="task-title-input" class="form-input" placeholder="What needs to be done?" value="${isEdit ? Utils.escapeHtml(task.title) : ''}" required autofocus>
          </div>
          <div class="form-group">
            <label for="task-desc-input">Details <span class="form-optional">(optional)</span></label>
            <textarea id="task-desc-input" class="form-input form-textarea" placeholder="Additional context…" rows="2">${isEdit ? Utils.escapeHtml(task.description || '') : ''}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="task-priority-input">Priority</label>
              <select id="task-priority-input" class="form-input form-select">
                <option value="low" ${isEdit && task.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
                <option value="medium" ${(!isEdit || task.priority === 'medium') ? 'selected' : ''}>🟡 Medium</option>
                <option value="high" ${isEdit && task.priority === 'high' ? 'selected' : ''}>🟠 High</option>
                <option value="critical" ${isEdit && task.priority === 'critical' ? 'selected' : ''}>🔴 Critical</option>
              </select>
            </div>
            <div class="form-group">
              <label for="task-due-date-input">Due Date <span class="form-optional">(optional)</span></label>
              <input type="date" id="task-due-date-input" class="form-input" value="${isEdit && task.dueDate ? task.dueDate : Utils.getDateKey()}">
            </div>
            <div class="form-group">
              <label for="task-due-input">Due Time <span class="form-optional">(optional)</span></label>
              <input type="time" id="task-due-input" class="form-input" value="${isEdit && task.dueTime ? task.dueTime : ''}">
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Task'}</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.add('active');

    setTimeout(() => {
      document.getElementById('task-title-input')?.focus();
    }, 150);

    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });

    document.getElementById('task-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('task-title-input').value.trim();
      const description = document.getElementById('task-desc-input').value.trim();
      const priority = document.getElementById('task-priority-input').value;
      const dueTime = document.getElementById('task-due-input').value || null;
      const dueDate = document.getElementById('task-due-date-input').value || null;

      if (!title) return;

      const newTaskData = { title, description, priority, dueTime, dueDate };

      if (!isEdit) {
        if (this.lastRightClickPos) {
          newTaskData.x = Math.max(0, Math.min(window.innerWidth - 300, Math.round(this.lastRightClickPos.x)));
          newTaskData.y = Math.max(0, Math.min(window.innerHeight - 100, Math.round(this.lastRightClickPos.y)));
        } else {
          newTaskData.x = Math.round(window.innerWidth / 2 - 140);
          newTaskData.y = 120;
        }
      }

      if (isEdit) {
        this.tasks = await StorageManager.updateTask(task.id, { title, description, priority, dueTime });
      } else {
        this.tasks = await StorageManager.addTask(newTaskData);
      }

      this.closeModal();
      this.render();
      if (this.isExpanded) this.renderExpanded();
      if (this.isPanelOpen) this.renderPanelBox();
      this.updateLauncherBadge();
    });
  },

  /* ========== HISTORY MODAL ========== */
  async showHistoryModal() {
    const history = await StorageManager.getTaskHistory(14);
    const modal = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');

    const historyHtml = history.length === 0 ?
      '<div class="tasks-empty"><span class="tasks-empty-icon">📅</span><p>No task history yet.</p></div>' :
      history.map(day => {
        const completed = day.tasks.filter(t => t.completed).length;
        const total = day.tasks.length;
        const dateInfo = this._parseDateString(day.date);
        const isToday = day.date === Utils.getDateKey();
        return `
          <button class="history-day-btn" data-date="${day.date}">
            <div class="history-day-info">
              <span class="history-day-name">${isToday ? 'Today' : dateInfo}</span>
              <span class="history-day-stats">${completed}/${total} completed</span>
            </div>
            <div class="history-day-bar">
              <div class="history-day-progress" style="width: ${total > 0 ? (completed / total * 100) : 0}%"></div>
            </div>
          </button>
        `;
      }).join('');

    modalContent.innerHTML = `
      <div class="modal-card glass-card">
        <div class="modal-header">
          <h3>Task History</h3>
          <button class="btn-icon modal-close-btn" id="modal-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="history-list">${historyHtml}</div>
      </div>
    `;

    modal.classList.add('active');

    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });

    modalContent.querySelectorAll('.history-day-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await this.loadTasks(btn.dataset.date);
        this.closeModal();
        this.render();
      });
    });
  },

  closeModal() {
    const modal = document.getElementById('modal-overlay');
    modal.classList.remove('active');
  },

  /* ========== DELETE ========== */
  async deleteTask(taskId) {
    const el = this.container.querySelector(`[data-id="${taskId}"]`);
    if (el) {
      el.classList.add('task-removing');
      await new Promise(r => setTimeout(r, 250));
    }
    await StorageManager.deleteTask(taskId);
    await this.loadTasks();
    this.render();
    if (this.isExpanded) this.renderExpanded();
  },

  /* ========== EXTERNAL API ========== */
  async refresh() {
    await this.loadTasks();
    this.render();
  }
};
