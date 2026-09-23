/* ============================================================
   Devora — Background Component
   Canvas-based animated developer-themed background with
   floating code particles, gradient mesh, and grid patterns.
   ============================================================ */

const BackgroundComponent = {
  canvas: null,
  ctx: null,
  particles: [],
  animationId: null,
  settings: null,
  mouseX: 0,
  mouseY: 0,

  dynamicLayer: null,
  overlayLayer: null,

  symbols: ['{', '}', '</', '/>', '//', '#', '()', '[]', '=>', '&&', '||', '++', '**', '!=', '===', '0x', 'fn', 'if', '01', '10'],

  async init() {
    this.canvas = document.getElementById('bg-canvas');
    this.settings = await StorageManager.getSettings();

    // Create and setup dynamic photo & overlay layers
    this.setupDynamicLayers();

    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());

      // Track mouse for subtle interaction
      document.addEventListener('mousemove', Utils.throttle((e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
      }, 50));
    }

    // Connect with WallpaperManager
    if (typeof WallpaperManager !== 'undefined') {
      WallpaperManager.subscribe((wp) => this.applyDynamicWallpaper(wp, WallpaperManager.config));
    }

    window.addEventListener('devora-wallpaper-changed', (e) => {
      this.applyDynamicWallpaper(e.detail?.wallpaper, e.detail?.config);
    });

    window.addEventListener('devora-wallpaper-disabled', () => {
      this.removeDynamicWallpaper();
    });

    this.applySettings();
  },

  setupDynamicLayers() {
    let dyn = document.getElementById('bg-dynamic-layer');
    if (!dyn) {
      dyn = document.createElement('div');
      dyn.id = 'bg-dynamic-layer';
      dyn.className = 'bg-dynamic-layer';
      document.body.prepend(dyn);
    }
    this.dynamicLayer = dyn;

    let overlay = document.getElementById('bg-overlay-layer');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'bg-overlay-layer';
      overlay.className = 'bg-overlay-layer';
      document.body.prepend(overlay);
    }
    this.overlayLayer = overlay;
  },

  applyDynamicWallpaper(wallpaper, config) {
    if (!this.dynamicLayer) this.setupDynamicLayers();
    if (!wallpaper || !config?.enabled) {
      this.removeDynamicWallpaper();
      return;
    }

    const overlayOpacity = config.overlayOpacity ?? 0.35;
    const blur = config.blur ?? 0;

    if (this.overlayLayer) {
      this.overlayLayer.style.background = `rgba(0, 0, 0, ${overlayOpacity})`;
      this.overlayLayer.style.opacity = '1';
    }

    if (this.dynamicLayer) {
      if (wallpaper.isLocal && wallpaper.cssBackground) {
        this.dynamicLayer.style.background = wallpaper.cssBackground;
        this.dynamicLayer.style.backgroundImage = '';
        document.body.style.background = wallpaper.cssBackground;
      } else if (wallpaper.url) {
        const cleanUrl = wallpaper.url.split('?')[0];
        this.dynamicLayer.style.background = '';
        this.dynamicLayer.style.backgroundImage = `url("${cleanUrl}")`;
        this.dynamicLayer.style.backgroundSize = 'cover';
        this.dynamicLayer.style.backgroundPosition = 'center';
        document.body.style.backgroundImage = `url("${cleanUrl}")`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
      }
      this.dynamicLayer.style.filter = blur > 0 ? `blur(${blur}px)` : 'none';
      this.dynamicLayer.style.opacity = '1';
      document.body.classList.add('dynamic-bg-active');
    }
  },

  removeDynamicWallpaper() {
    if (this.dynamicLayer) {
      this.dynamicLayer.style.opacity = '0';
      this.dynamicLayer.style.backgroundImage = 'none';
    }
    if (this.overlayLayer) {
      this.overlayLayer.style.opacity = '0';
    }
    document.body.style.backgroundImage = 'none';
    document.body.classList.remove('dynamic-bg-active');
  },

  applySettings() {
    const bgSettings = this.settings?.background || {};
    const dwConfig = this.settings?.dynamicWallpaper || {};

    // Only set or clear body background if dynamic wallpaper is disabled
    if (!dwConfig.enabled) {
      if (bgSettings.customImage) {
        document.body.style.backgroundImage = `url(${bgSettings.customImage})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.classList.add('custom-bg-active');
      } else {
        document.body.style.backgroundImage = 'none';
        document.body.classList.remove('custom-bg-active');
      }
    }

    // Set opacity
    if (this.canvas) {
      this.canvas.style.opacity = bgSettings.opacity ?? 0.4;
    }

    // Start or stop animation
    if (bgSettings.animation !== false) {
      this.createParticles();
      this.animate();
    } else {
      this.stopAnimation();
      this.drawStatic();
    }
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.createParticles();
  },

  createParticles() {
    const count = Math.min(Math.floor((this.canvas.width * this.canvas.height) / 25000), 60);
    this.particles = [];

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2 + 0.1,
        symbol: this.symbols[Math.floor(Math.random() * this.symbols.length)],
        size: Math.random() * 10 + 8,
        opacity: Math.random() * 0.15 + 0.03,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.005,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.01 + 0.005
      });
    }
  },

  drawStatic() {
    if (!this.ctx) return;
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Draw subtle grid
    this.drawGrid();

    // Draw static particles
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillStyle = '#6366f1';
      this.ctx.font = `${p.size}px 'JetBrains Mono', 'Fira Code', monospace`;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillText(p.symbol, 0, 0);
      this.ctx.restore();
    });
  },

  drawGrid() {
    const { ctx, canvas } = this;
    const { width, height } = canvas;
    const gridSize = 60;

    ctx.strokeStyle = 'rgba(99, 102, 241, 0.03)';
    ctx.lineWidth = 0.5;

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  },

  drawGradientOrbs(time) {
    const { ctx, canvas } = this;

    // Orb 1 — indigo
    const x1 = canvas.width * 0.3 + Math.sin(time * 0.0003) * 100;
    const y1 = canvas.height * 0.3 + Math.cos(time * 0.0004) * 80;
    const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, 350);
    grad1.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
    grad1.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Orb 2 — cyan
    const x2 = canvas.width * 0.7 + Math.cos(time * 0.0005) * 120;
    const y2 = canvas.height * 0.6 + Math.sin(time * 0.0003) * 100;
    const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, 300);
    grad2.addColorStop(0, 'rgba(34, 211, 238, 0.06)');
    grad2.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Orb 3 — purple
    const x3 = canvas.width * 0.5 + Math.sin(time * 0.0002) * 150;
    const y3 = canvas.height * 0.8 + Math.cos(time * 0.0006) * 60;
    const grad3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, 250);
    grad3.addColorStop(0, 'rgba(168, 85, 247, 0.05)');
    grad3.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = grad3;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  },

  animate() {
    if (this.animationId) cancelAnimationFrame(this.animationId);

    const draw = (time) => {
      const { ctx, canvas, particles } = this;
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw gradient orbs
      this.drawGradientOrbs(time);

      // Draw subtle grid
      this.drawGrid();

      // Draw and update particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.pulse += p.pulseSpeed;

        // Wrap around edges
        if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;

        // Pulse opacity
        const pulseOpacity = p.opacity + Math.sin(p.pulse) * 0.02;

        // Subtle mouse interaction
        const dx = this.mouseX - p.x;
        const dy = this.mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = dist < 200 ? (1 - dist / 200) * 0.05 : 0;

        ctx.save();
        ctx.globalAlpha = Math.max(0, pulseOpacity + influence);
        ctx.fillStyle = dist < 200 ? '#22d3ee' : '#6366f1';
        ctx.font = `${p.size}px 'JetBrains Mono', 'Fira Code', monospace`;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillText(p.symbol, 0, 0);
        ctx.restore();
      });

      // Draw connection lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.03 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      this.animationId = requestAnimationFrame(draw);
    };

    this.animationId = requestAnimationFrame(draw);
  },

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  },

  updateSettings(newSettings) {
    this.settings = newSettings;
    this.applySettings();
  },

  setCustomBackground(imageDataUrl) {
    document.body.style.backgroundImage = `url(${imageDataUrl})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
  },

  clearCustomBackground() {
    document.body.style.backgroundImage = '';
  }
};
