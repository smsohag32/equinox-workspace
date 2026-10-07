/* ============================================================
   Devora — Pomodoro Timer Component v2.0
   Fully dynamic focus & break timer with:
   - Circular SVG countdown ring with smooth animation
   - Focus / Short Break / Long Break modes
   - Session dots tracking (4 rounds → long break)
   - Custom work label / task tagging
   - Auto-start next session toggle
   - Ambient sound toggle (white noise oscillator)
   - Desktop notification on completion
   - Today's total focus time stats
   - Keyboard shortcut: Space to play/pause
   ============================================================ */

const PomodoroComponent = {
  container: null,
  state: null,
  settings: null,
  intervalId: null,
  isExpanded: false,
  audioCtx: null,
  noiseNode: null,
  gainNode: null,
  soundOn: false,
  RING_RADIUS: 62,
  _boundKeyHandler: null,
  _boundOutsideClick: null,
  _totalFocusToday: 0,

  /* ── Init ─────────────────────────────────────────── */
  async init() {
    this.container = document.getElementById('pomodoro-container');
    this.settings  = await StorageManager.getSettings();
    this.state     = await StorageManager.getPomodoroState();

    if (!this.state.isRunning && this.state.timeRemaining === 25 * 60) {
      this.state.timeRemaining = this._totalSeconds(this.state.mode);
    }

    const stats = await StorageManager.get('devora_pomo_stats');
    if (stats && stats.date === this._today()) {
      this._totalFocusToday = stats.focusSeconds || 0;
    }

    if (this.state.isRunning && this.state.startedAt) {
      const elapsed = Math.floor((Date.now() - this.state.startedAt) / 1000);
      this.state.timeRemaining = Math.max(0, this.state.timeRemaining - elapsed);
      if (this.state.timeRemaining <= 0) this.state.isRunning = false;
    }

    this._bindKeyboard();
    this._bindOutsideClick();
    this.render();
    if (this.state.isRunning) this._startTick();
  },

  /* ── Helpers ──────────────────────────────────────── */
  _today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  _totalSeconds(mode) {
    const p = this.settings.pomodoro || {};
    if (mode === 'work')      return (p.workMinutes      || 25) * 60;
    if (mode === 'longBreak') return (p.longBreakMinutes || 15) * 60;
    return                           (p.breakMinutes     ||  5) * 60;
  },

  _formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },

  _formatFocusTotal(secs) {
    if (secs < 60) return `${secs}s`;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  },

  _modeConfig() {
    const focusSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
    const breakSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`;
    const longSvg  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;

    const cfg = {
      work:      { label:'Focus',       icon: focusSvg, emoji:'🎯', gradStart:'#6366f1', gradEnd:'#818cf8' },
      break:     { label:'Short Break', icon: breakSvg, emoji:'☕', gradStart:'#10b981', gradEnd:'#34d399' },
      longBreak: { label:'Long Break',  icon: longSvg,  emoji:'🌿', gradStart:'#22d3ee', gradEnd:'#67e8f9' }
    };
    return cfg[this.state.mode] || cfg.work;
  },

  /* ── Render ───────────────────────────────────────── */
  render() {
    if (!this.container) return;

    const { isRunning, mode, timeRemaining, sessionsCompleted, taskLabel } = this.state;
    const cfg      = this._modeConfig();
    const total    = this._totalSeconds(mode);
    const progress = Math.min((total - timeRemaining) / total, 1);
    const R        = this.RING_RADIUS;
    const C        = 2 * Math.PI * R;
    const dash     = C - progress * C;
    const sessInCycle = sessionsCompleted % 4;
    const dots = Array.from({length:4}, (_,i) =>
      `<span class="pomo-dot ${i < sessInCycle ? 'done' : ''}" title="Session ${i+1}"></span>`
    ).join('');

    const focusSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
    const breakSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`;
    const longSvg  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;

    this.container.innerHTML = `
      <div class="pomo-widget ${isRunning ? 'running' : ''} mode-${mode}" id="pomo-root">
        <button class="pomo-pill" id="pomo-pill" title="Focus Timer (Space = play/pause)">
          <span class="pomo-pill-icon">${cfg.icon}</span>
          <span class="pomo-pill-time">${this._formatTime(timeRemaining)}</span>
          ${isRunning ? '<span class="pomo-pill-pulse"></span>' : ''}
        </button>

        ${this.isExpanded ? `
        <div class="pomo-panel" id="pomo-panel">
          <div class="pomo-panel-header">
            <div class="pomo-panel-title">
              <span class="pomo-panel-badge">${cfg.icon}<span>${cfg.label}</span></span>
            </div>
            <button class="pomo-panel-close" id="pomo-close" title="Close Focus Box (Esc)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="pomo-tabs">
            <button class="pomo-tab ${mode==='work'?'active':''}" data-mode="work" title="25m Focus Session">
              <span class="pomo-tab-svg">${focusSvg}</span>
              <span class="pomo-tab-text">Focus</span>
            </button>
            <button class="pomo-tab ${mode==='break'?'active':''}" data-mode="break" title="5m Short Break">
              <span class="pomo-tab-svg">${breakSvg}</span>
              <span class="pomo-tab-text">Break</span>
            </button>
            <button class="pomo-tab ${mode==='longBreak'?'active':''}" data-mode="longBreak" title="15m Long Break">
              <span class="pomo-tab-svg">${longSvg}</span>
              <span class="pomo-tab-text">Long</span>
            </button>
          </div>

          <div class="pomo-ring-wrap">
            <svg class="pomo-ring" viewBox="0 0 144 144" width="190" height="190">
              <defs>
                <linearGradient id="pomoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="${cfg.gradStart}"/>
                  <stop offset="100%" stop-color="${cfg.gradEnd}"/>
                </linearGradient>
              </defs>
              <circle cx="72" cy="72" r="${R}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
              <circle cx="72" cy="72" r="${R}" fill="none"
                stroke="url(#pomoGrad)"
                stroke-width="8"
                stroke-linecap="round"
                stroke-dasharray="${C.toFixed(2)}"
                stroke-dashoffset="${dash.toFixed(2)}"
                transform="rotate(-90 72 72)"
                class="pomo-ring-arc"
                style="filter:drop-shadow(0 0 12px ${cfg.gradStart}bb);transition:stroke-dashoffset 1s linear;"/>
            </svg>
            <div class="pomo-ring-center">
              <div class="pomo-ring-badge-icon">${cfg.icon}</div>
              <div class="pomo-ring-time" id="pomo-display-time">${this._formatTime(timeRemaining)}</div>
              <div class="pomo-ring-label">${cfg.label}</div>
            </div>
          </div>

          <div class="pomo-task-wrap">
            <div class="pomo-task-input-box">
              <svg class="pomo-task-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <input class="pomo-task-input" id="pomo-task-input" type="text"
                maxlength="50" placeholder="What are you focusing on?"
                value="${(taskLabel||'').replace(/"/g,'&quot;')}" />
              ${taskLabel ? `
                <button class="pomo-task-clear-btn" id="pomo-task-clear" title="Clear task label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>` : ''}
            </div>
          </div>

          <div class="pomo-controls">
            <button class="pomo-icon-btn" id="pomo-reset" title="Reset Session (R)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>
            </button>
            <button class="pomo-main-btn ${isRunning?'pause':'play'}" id="pomo-playpause" title="${isRunning?'Pause (Space)':'Start Focus (Space)'}">
              ${isRunning
                ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>`
                : `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="margin-left:3px;"><polygon points="6 3 20 12 6 21 6 3"/></svg>`}
            </button>
            <button class="pomo-icon-btn" id="pomo-skip" title="Skip to Next (S)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
            </button>
          </div>

          <div class="pomo-sessions-row">
            <span class="pomo-stat-label">Round ${Math.floor(sessionsCompleted/4)+1} of 4</span>
            <div class="pomo-dots">${dots}</div>
            <span class="pomo-stat-label">${sessionsCompleted} completed</span>
          </div>

          <div class="pomo-footer">
            <div class="pomo-focus-stat" title="Total focus time today">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>${this._formatFocusTotal(this._totalFocusToday)} today</span>
            </div>
            <div class="pomo-footer-btns">
              <button class="pomo-foot-btn ${this.soundOn?'on':''}" id="pomo-sound" title="${this.soundOn?'Sound on (ambient focus sound)':'Sound off'}">
                ${this.soundOn
                  ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg><span>Sound</span>`
                  : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg><span>Muted</span>`}
              </button>
              <button class="pomo-foot-btn ${this.state.autoStart?'on':''}" id="pomo-auto" title="${this.state.autoStart?'Auto-start next session is ON':'Auto-start next session is OFF'}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/><line x1="19" y1="3" x2="19" y2="21"/></svg>
                <span>Auto</span>
              </button>
            </div>
          </div>
        </div>` : ''}
      </div>`;

    this._bindEvents();
  },

  /* ── Events ───────────────────────────────────────── */
  _bindEvents() {
    const pill = document.getElementById('pomo-pill');
    if (pill) {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isExpanded = !this.isExpanded;
        this.render();
      });
    }

    if (!this.isExpanded) return;

    const panel = document.getElementById('pomo-panel');
    if (panel) {
      panel.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    const closeBtn = document.getElementById('pomo-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isExpanded = false;
        this.render();
      });
    }

    document.querySelectorAll('.pomo-tab').forEach(b =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this._switchMode(e.currentTarget.dataset.mode);
      }));

    const pp = document.getElementById('pomo-playpause');
    if (pp) {
      pp.addEventListener('click', (e) => {
        e.stopPropagation();
        this.state.isRunning ? this.pause() : this.start();
      });
    }

    const rst = document.getElementById('pomo-reset');
    if (rst) {
      rst.addEventListener('click', (e) => {
        e.stopPropagation();
        this.reset();
      });
    }

    const skp = document.getElementById('pomo-skip');
    if (skp) {
      skp.addEventListener('click', (e) => {
        e.stopPropagation();
        this.skip();
      });
    }

    const inp = document.getElementById('pomo-task-input');
    if (inp) {
      inp.addEventListener('click', e => e.stopPropagation());
      inp.addEventListener('input', e => {
        this.state.taskLabel = e.target.value;
        this.save();
      });
    }

    const clearBtn = document.getElementById('pomo-task-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.state.taskLabel = '';
        this.save();
        this.render();
      });
    }

    const snd = document.getElementById('pomo-sound');
    if (snd) {
      snd.addEventListener('click', e => {
        e.stopPropagation();
        this._toggleSound();
      });
    }

    const ast = document.getElementById('pomo-auto');
    if (ast) {
      ast.addEventListener('click', e => {
        e.stopPropagation();
        this.state.autoStart = !this.state.autoStart;
        this.save();
        this.render();
      });
    }
  },

  _bindOutsideClick() {
    if (this._boundOutsideClick) return;
    this._boundOutsideClick = (e) => {
      if (!this.isExpanded) return;
      // If clicked inside the container or root widget, do not close
      const root = document.getElementById('pomo-root');
      if (root && root.contains(e.target)) return;
      if (this.container && this.container.contains(e.target)) return;

      this.isExpanded = false;
      this.render();
    };
    document.addEventListener('click', this._boundOutsideClick);
  },

  _bindKeyboard() {
    if (this._boundKeyHandler) return;
    this._boundKeyHandler = e => {
      if (e.code === 'Escape' && this.isExpanded) {
        this.isExpanded = false;
        this.render();
        return;
      }
      if (e.code === 'Space' && this.isExpanded) {
        const tag = document.activeElement?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          this.state.isRunning ? this.pause() : this.start();
        }
      }
    };
    document.addEventListener('keydown', this._boundKeyHandler);
  },

  /* ── Timer ────────────────────────────────────────── */
  _switchMode(mode) {
    this.pause();
    this.state.mode = mode;
    this.state.timeRemaining = this._totalSeconds(mode);
    this.save(); this.render();
  },

  start() {
    this.state.isRunning = true;
    this.state.startedAt = Date.now();
    this.save();
    this._startTick();
    if (this.soundOn) this._startSound();
    this.render();
  },

  _startTick() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      if (this.state.timeRemaining > 0) {
        this.state.timeRemaining--;
        if (this.state.mode === 'work') { this._totalFocusToday++; this._saveStats(); }
        this._patchDisplay();
      } else {
        this._complete();
      }
    }, 1000);
  },

  pause() {
    this.state.isRunning = false;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this._stopSound();
    this.save(); this.render();
  },

  reset() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.state.isRunning = false;
    this.state.timeRemaining = this._totalSeconds(this.state.mode);
    this._stopSound();
    this.save(); this.render();
  },

  skip() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this._complete();
  },

  _complete() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.state.isRunning = false;
    this._notify();
    this._playChime();
    this._stopSound();

    if (this.state.mode === 'work') {
      this.state.sessionsCompleted++;
      const sbl = this.settings.pomodoro?.sessionsBeforeLongBreak || 4;
      this.state.mode = this.state.sessionsCompleted % sbl === 0 ? 'longBreak' : 'break';
    } else {
      this.state.mode = 'work';
    }
    this.state.timeRemaining = this._totalSeconds(this.state.mode);
    this.save();

    if (this.state.autoStart) {
      setTimeout(() => this.start(), 1500);
    } else {
      this.render();
    }
  },

  /* Patch just the time & ring without full re-render */
  _patchDisplay() {
    const t = this._formatTime(this.state.timeRemaining);
    const d = document.getElementById('pomo-display-time');
    if (d) d.textContent = t;
    const p = document.querySelector('.pomo-pill-time');
    if (p) p.textContent = t;

    const arc = document.querySelector('.pomo-ring-arc');
    if (arc) {
      const total = this._totalSeconds(this.state.mode);
      const prog  = Math.min((total - this.state.timeRemaining) / total, 1);
      const C     = 2 * Math.PI * this.RING_RADIUS;
      arc.style.strokeDashoffset = (C - prog * C).toFixed(2);
    }
  },

  /* ── Stats ────────────────────────────────────────── */
  async _saveStats() {
    await StorageManager.set('devora_pomo_stats', {
      date: this._today(),
      focusSeconds: this._totalFocusToday
    });
  },

  /* ── Notifications ────────────────────────────────── */
  _notify() {
    const msgs = {
      work:      '🎯 Focus session complete! Take a break.',
      break:     '⏰ Break over! Time to focus.',
      longBreak: '🌿 Long break done! Ready to work?'
    };
    try {
      if (typeof chrome !== 'undefined' && chrome?.notifications) {
        chrome.notifications.create(`pomo_${Date.now()}`, {
          type: 'basic',
          iconUrl: '../../assets/icons/icon128.png',
          title: 'Devora — Pomodoro',
          message: msgs[this.state.mode] || 'Timer complete!',
          priority: 2
        });
      }
    } catch (e) {}
  },

  /* ── Audio ────────────────────────────────────────── */
  _ctx() {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return this.audioCtx;
  },

  _toggleSound() {
    this.soundOn = !this.soundOn;
    if (this.soundOn && this.state.isRunning) this._startSound();
    else this._stopSound();
    this.render();
  },

  _startSound() {
    try {
      const ctx = this._ctx();
      if (ctx.state === 'suspended') ctx.resume();
      const bufSize = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      this.noiseNode = ctx.createBufferSource();
      this.noiseNode.buffer = buf;
      this.noiseNode.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 380;
      this.gainNode = ctx.createGain();
      this.gainNode.gain.value = 0.035;
      this.noiseNode.connect(filter);
      filter.connect(this.gainNode);
      this.gainNode.connect(ctx.destination);
      this.noiseNode.start();
    } catch (e) {}
  },

  _stopSound() {
    try { if (this.noiseNode) { this.noiseNode.stop(); this.noiseNode = null; } } catch (e) {}
  },

  _playChime() {
    try {
      const ctx = this._ctx();
      if (ctx.state === 'suspended') ctx.resume();
      [880, 1108].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.3;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.65);
      });
    } catch (e) {}
  },

  /* ── Persist ──────────────────────────────────────── */
  async save() {
    await StorageManager.savePomodoroState(this.state);
  },

  destroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this._boundKeyHandler) document.removeEventListener('keydown', this._boundKeyHandler);
    this._stopSound();
    try { if (this.audioCtx) this.audioCtx.close(); } catch (e) {}
  }
};
