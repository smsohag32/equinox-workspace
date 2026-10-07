/* ============================================================
   Devora — Widget Dock & Drag-Placement Manager
   Handles drag-to-reposition for the bottom floating dock
   and floating action panels (Notes & Tasks panels).
   ============================================================ */

const WidgetDockManager = {
  dock: null,
  dragHandle: null,
  isDraggingDock: false,
  dockPos: null,
  contextMenuEl: null,

  async init() {
    this.dock = document.getElementById('bottom-right-widgets');
    if (!this.dock) return;

    this.ensureDragHandle();
    await this.loadDockPosition();
    this.bindDockDrag();
    this.bindContextMenu();

    window.addEventListener('resize', () => {
      this.clampDockToViewport();
    });
  },

  ensureDragHandle() {
    if (!this.dock) return;
    this.dragHandle = this.dock.querySelector('.dock-drag-handle');
    if (!this.dragHandle) {
      this.dragHandle = document.createElement('div');
      this.dragHandle.className = 'dock-drag-handle';
      this.dragHandle.id = 'dock-drag-handle';
      this.dragHandle.title = 'Drag to reposition dock (Double-click to reset position)';
      this.dragHandle.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
        </svg>
      `;
      this.dock.prepend(this.dragHandle);
    }
  },

  async loadDockPosition() {
    if (!this.dock) return;
    try {
      this.dockPos = await StorageManager.get('devora_widget_dock_pos');
    } catch(err) {
      this.dockPos = null;
    }

    if (this.dockPos && typeof this.dockPos.x === 'number' && typeof this.dockPos.y === 'number') {
      this.applyDockPosition(this.dockPos.x, this.dockPos.y);
    }
  },

  applyDockPosition(x, y) {
    if (!this.dock) return;
    const maxX = window.innerWidth - this.dock.offsetWidth - 10;
    const maxY = window.innerHeight - this.dock.offsetHeight - 10;
    const clampedX = Math.max(10, Math.min(maxX, x));
    const clampedY = Math.max(10, Math.min(maxY, y));

    this.dock.style.left = `${clampedX}px`;
    this.dock.style.top = `${clampedY}px`;
    this.dock.style.right = 'auto';
    this.dock.style.bottom = 'auto';
    this.dock.classList.add('custom-positioned');
  },

  resetDockPosition() {
    if (!this.dock) return;
    this.dock.style.left = '';
    this.dock.style.top = '';
    this.dock.style.right = '20px';
    this.dock.style.bottom = '20px';
    this.dock.classList.remove('custom-positioned');
    this.dockPos = null;
    StorageManager.remove('devora_widget_dock_pos');
  },

  clampDockToViewport() {
    if (!this.dock || !this.dock.classList.contains('custom-positioned')) return;
    const rect = this.dock.getBoundingClientRect();
    this.applyDockPosition(rect.left, rect.top);
  },

  bindDockDrag() {
    if (!this.dragHandle) return;

    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    const onPointerDown = (e) => {
      // Only drag on left click / main pointer touch
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = this.dock.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = rect.left;
      initialTop = rect.top;

      this.isDraggingDock = true;
      this.dock.classList.add('is-dragging');
      document.body.classList.add('is-widget-dragging');

      if (this.dragHandle.setPointerCapture) {
        try { this.dragHandle.setPointerCapture(e.pointerId); } catch(err) {}
      }

      const onPointerMove = (moveEvt) => {
        if (!this.isDraggingDock) return;
        moveEvt.preventDefault();
        const deltaX = moveEvt.clientX - startX;
        const deltaY = moveEvt.clientY - startY;

        const newX = initialLeft + deltaX;
        const newY = initialTop + deltaY;

        this.applyDockPosition(newX, newY);
      };

      const onPointerUp = async (upEvt) => {
        if (!this.isDraggingDock) return;
        this.isDraggingDock = false;
        this.dock.classList.remove('is-dragging');
        document.body.classList.remove('is-widget-dragging');

        if (this.dragHandle.releasePointerCapture) {
          try { this.dragHandle.releasePointerCapture(upEvt.pointerId); } catch(err) {}
        }

        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        const finalRect = this.dock.getBoundingClientRect();
        this.dockPos = { x: finalRect.left, y: finalRect.top };
        await StorageManager.set('devora_widget_dock_pos', this.dockPos);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    };

    this.dragHandle.addEventListener('pointerdown', onPointerDown);

    // Double-click handle to reset
    this.dragHandle.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.resetDockPosition();
    });
  },

  bindContextMenu() {
    if (!this.dock) return;

    this.dock.addEventListener('contextmenu', (e) => {
      // Allow standard context menu inside inputs if any
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e.clientX, e.clientY);
    });

    document.addEventListener('click', () => {
      this.hideContextMenu();
    });
  },

  showContextMenu(x, y) {
    this.hideContextMenu();

    const menu = document.createElement('div');
    menu.className = 'widget-dock-context-menu glass-card';
    menu.id = 'widget-dock-context-menu';

    menu.innerHTML = `
      <div class="dock-menu-item" id="dock-menu-reset-dock">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        <span>Reset Dock Position</span>
      </div>
      <div class="dock-menu-item" id="dock-menu-reset-panels">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
        <span>Reset Panel Positions</span>
      </div>
      <div class="dock-menu-divider"></div>
      <div class="dock-menu-item" id="dock-menu-toggle-notes">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>Toggle Sticky Notes Panel</span>
      </div>
      <div class="dock-menu-item" id="dock-menu-toggle-tasks">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        <span>Toggle Tasks Panel</span>
      </div>
    `;

    document.body.appendChild(menu);
    this.contextMenuEl = menu;

    // Boundary check for context menu
    const menuWidth = menu.offsetWidth || 210;
    const menuHeight = menu.offsetHeight || 160;
    const left = Math.min(x, window.innerWidth - menuWidth - 10);
    const top = Math.min(y, window.innerHeight - menuHeight - 10);

    menu.style.left = `${Math.max(10, left)}px`;
    menu.style.top = `${Math.max(10, top)}px`;
    menu.classList.add('active');

    // Menu handlers
    document.getElementById('dock-menu-reset-dock')?.addEventListener('click', () => {
      this.resetDockPosition();
      this.hideContextMenu();
    });

    document.getElementById('dock-menu-reset-panels')?.addEventListener('click', async () => {
      await StorageManager.remove('devora_notes_panel_pos');
      await StorageManager.remove('devora_tasks_panel_pos');
      this.resetPanelPosition('notes-floating-panel');
      this.resetPanelPosition('tasks-floating-panel');
      this.hideContextMenu();
    });

    document.getElementById('dock-menu-toggle-notes')?.addEventListener('click', () => {
      if (typeof NotesComponent !== 'undefined') NotesComponent.togglePanelBox();
      this.hideContextMenu();
    });

    document.getElementById('dock-menu-toggle-tasks')?.addEventListener('click', () => {
      if (typeof TasksComponent !== 'undefined') TasksComponent.togglePanelBox();
      this.hideContextMenu();
    });
  },

  hideContextMenu() {
    if (this.contextMenuEl) {
      this.contextMenuEl.remove();
      this.contextMenuEl = null;
    }
  },

  /* ========== PANEL DRAG-TO-MOVE & RESIZE UTILITY ========== */
  async makePanelDraggable(panelEl, storageKey) {
    if (!panelEl) return;

    // Apply saved size & position if present
    try {
      const savedPos = await StorageManager.get(storageKey);
      if (savedPos) {
        if (typeof savedPos.width === 'number' && savedPos.width >= 480) {
          panelEl.style.width = `${Math.min(savedPos.width, window.innerWidth - 20)}px`;
        }
        if (typeof savedPos.height === 'number' && savedPos.height >= 400) {
          panelEl.style.height = `${Math.min(savedPos.height, window.innerHeight - 20)}px`;
        }
        if (typeof savedPos.left === 'number' && typeof savedPos.top === 'number') {
          const maxL = window.innerWidth - panelEl.offsetWidth - 10;
          const maxT = window.innerHeight - panelEl.offsetHeight - 10;
          const clampedL = Math.max(10, Math.min(maxL, savedPos.left));
          const clampedT = Math.max(10, Math.min(maxT, savedPos.top));
          panelEl.style.left = `${clampedL}px`;
          panelEl.style.top = `${clampedT}px`;
          panelEl.style.right = 'auto';
          panelEl.style.bottom = 'auto';
          panelEl.classList.add('custom-panel-positioned');
        } else {
          this.positionPanelNearDock(panelEl);
        }
      } else {
        this.positionPanelNearDock(panelEl);
      }
    } catch(err) {
      this.positionPanelNearDock(panelEl);
    }

    // ResizeObserver size persistence
    if (window.ResizeObserver && !panelEl._hasResizeObs) {
      panelEl._hasResizeObs = true;
      let initialSkip = true;
      const ro = new ResizeObserver(entries => {
        if (initialSkip) { initialSkip = false; return; }
        for (let entry of entries) {
          const w = Math.round(entry.target.offsetWidth);
          const h = Math.round(entry.target.offsetHeight);
          clearTimeout(panelEl._resizeTimer);
          panelEl._resizeTimer = setTimeout(async () => {
            const cur = await StorageManager.get(storageKey) || {};
            await StorageManager.set(storageKey, { ...cur, width: w, height: h });
          }, 300);
        }
      });
      ro.observe(panelEl);
    }

    // Attach drag handles to panel headers if not already attached
    const headers = panelEl.querySelectorAll('.panel-header, .sidebar-header');
    headers.forEach(header => {
      if (header._dragBound) return;
      header._dragBound = true;
      header.classList.add('panel-draggable-header');
      header.title = 'Drag to reposition panel (Double-click to reset position)';

      if (!header.querySelector('.panel-header-drag-icon')) {
        const grip = document.createElement('div');
        grip.className = 'panel-header-drag-icon';
        grip.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
          </svg>
        `;
        header.prepend(grip);
      }

      let pStartX = 0, pStartY = 0;
      let initialPLeft = 0, initialPTop = 0;
      let isDraggingPanel = false;

      const onPDown = (e) => {
        // Ignore clicks on buttons/inputs inside header
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.panel-action-icon-btn')) return;
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const pRect = panelEl.getBoundingClientRect();
        pStartX = e.clientX;
        pStartY = e.clientY;
        initialPLeft = pRect.left;
        initialPTop = pRect.top;

        isDraggingPanel = true;
        panelEl.classList.add('is-panel-dragging');
        document.body.classList.add('is-widget-dragging');

        if (header.setPointerCapture) {
          try { header.setPointerCapture(e.pointerId); } catch(err) {}
        }

        const onPMove = (moveEvt) => {
          if (!isDraggingPanel) return;
          moveEvt.preventDefault();
          const dX = moveEvt.clientX - pStartX;
          const dY = moveEvt.clientY - pStartY;

          const maxL = window.innerWidth - panelEl.offsetWidth - 10;
          const maxT = window.innerHeight - panelEl.offsetHeight - 10;
          const nL = Math.max(10, Math.min(maxL, initialPLeft + dX));
          const nT = Math.max(10, Math.min(maxT, initialPTop + dY));

          panelEl.style.left = `${nL}px`;
          panelEl.style.top = `${nT}px`;
          panelEl.style.right = 'auto';
          panelEl.style.bottom = 'auto';
          panelEl.classList.add('custom-panel-positioned');
        };

        const onPUp = async (upEvt) => {
          if (!isDraggingPanel) return;
          isDraggingPanel = false;
          panelEl.classList.remove('is-panel-dragging');
          document.body.classList.remove('is-widget-dragging');

          if (header.releasePointerCapture) {
            try { header.releasePointerCapture(upEvt.pointerId); } catch(err) {}
          }

          window.removeEventListener('pointermove', onPMove);
          window.removeEventListener('pointerup', onPUp);
          window.removeEventListener('pointercancel', onPUp);

          const finalPRect = panelEl.getBoundingClientRect();
          await StorageManager.set(storageKey, { left: finalPRect.left, top: finalPRect.top });
        };

        window.addEventListener('pointermove', onPMove);
        window.addEventListener('pointerup', onPUp);
        window.addEventListener('pointercancel', onPUp);
      };

      header.addEventListener('pointerdown', onPDown);

      header.addEventListener('dblclick', async (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        e.stopPropagation();
        await StorageManager.remove(storageKey);
        this.resetPanelPosition(panelEl.id);
      });
    });
  },

  positionPanelNearDock(panelEl) {
    if (!panelEl || panelEl.classList.contains('custom-panel-positioned')) return;
    if (this.dock && this.dock.classList.contains('custom-positioned')) {
      const dockRect = this.dock.getBoundingClientRect();
      const pWidth = panelEl.offsetWidth || 500;
      const pHeight = panelEl.offsetHeight || 550;

      let top = dockRect.top - pHeight - 12;
      if (top < 10) top = dockRect.bottom + 12;
      if (top + pHeight > window.innerHeight - 10) top = Math.max(10, window.innerHeight - pHeight - 10);

      let left = dockRect.left;
      if (left + pWidth > window.innerWidth - 10) left = Math.max(10, window.innerWidth - pWidth - 10);

      panelEl.style.left = `${left}px`;
      panelEl.style.top = `${top}px`;
      panelEl.style.right = 'auto';
      panelEl.style.bottom = 'auto';
    }
  },

  resetPanelPosition(panelId) {
    const panelEl = document.getElementById(panelId);
    if (!panelEl) return;
    panelEl.style.left = '';
    panelEl.style.top = '';
    panelEl.style.width = '';
    panelEl.style.height = '';
    panelEl.style.right = panelId === 'tasks-floating-panel' ? '20px' : (panelId === 'notes-floating-panel' ? '20px' : '');
    panelEl.style.bottom = '72px';
    panelEl.classList.remove('custom-panel-positioned');
  }
};
