/* ============================================================
   Devora — Wallpaper Manager Service
   Orchestrates dynamic wallpaper rotation, multi-image caching pool,
   preloading, interval tracking, and offline local fallback.
   ============================================================ */

const WallpaperManager = {
  config: null,
  currentWallpaper: null,
  cachePool: [],
  listeners: [],
  isLoading: false,

  CACHE_KEY_POOL: (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.WALLPAPER_POOL) || 'devora_wallpaper_pool',
  CACHE_KEY_ACTIVE: (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.ACTIVE_WALLPAPER) || 'devora_active_wallpaper',

  async init() {
    try {
      const settings = await StorageManager.getSettings();
      this.config = settings?.dynamicWallpaper || (typeof CONFIG !== 'undefined' && CONFIG.DEFAULTS?.dynamicWallpaper) || {
        enabled: true,
        provider: 'wikimedia',
        category: 'landscapes',
        interval: 'newtab',
        cacheSize: 5,
        fallbackTheme: 'cosmic',
        overlayOpacity: 0.35,
        blur: 0,
        showAttribution: true
      };

      // If dynamic wallpaper is disabled in settings, do nothing
      if (!this.config.enabled) {
        return;
      }

      // Load active wallpaper and cache pool from local storage
      const [savedActive, savedPool] = await Promise.all([
        StorageManager.get(this.CACHE_KEY_ACTIVE),
        StorageManager.get(this.CACHE_KEY_POOL)
      ]);

      this.currentWallpaper = savedActive;
      this.cachePool = Array.isArray(savedPool) ? savedPool : [];

      // Check if we should rotate based on interval
      const shouldRotate = this.checkShouldRotate(this.currentWallpaper?.timestamp, this.config.interval);

      if (!this.currentWallpaper || shouldRotate) {
        await this.nextWallpaper(false);
      } else {
        // Apply existing active wallpaper
        this.notify(this.currentWallpaper);
        // Pre-fill cache in background if needed
        this.refillCachePool().catch(() => {});
      }
    } catch (err) {
      console.warn('⚠️ WallpaperManager init error, using local fallback:', err);
      this.applyLocalFallback();
    }
  },

  /**
   * Determine if interval dictates a background change
   */
  checkShouldRotate(timestamp, interval) {
    if (!timestamp) return true;
    const now = Date.now();
    const elapsed = now - timestamp;

    switch (interval) {
      case 'newtab':
        return true;
      case 'hourly':
        return elapsed >= 60 * 60 * 1000;
      case '6hours':
        return elapsed >= 6 * 60 * 60 * 1000;
      case 'daily':
        return elapsed >= 24 * 60 * 60 * 1000;
      case 'manual':
        return false;
      default:
        return true;
    }
  },

  /**
   * Cycle to the next wallpaper.
   * Pulls from local pre-cached pool or fetches fresh from the active provider.
   */
  async nextWallpaper(forceNetwork = false) {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const providerId = this.config.provider || 'wikimedia';
      const category = this.config.category || 'landscapes';
      const provider = ImageProviderRegistry.get(providerId);

      let nextItem = null;

      // 1. Try to pop an item from the pre-cached pool if valid and not forcing network
      if (!forceNetwork && this.cachePool.length > 0) {
        const poolIndex = this.cachePool.findIndex(
          item => item.providerId === providerId && item.category === category && item.id !== this.currentWallpaper?.id
        );

        if (poolIndex !== -1) {
          nextItem = this.cachePool.splice(poolIndex, 1)[0];
          await StorageManager.set(this.CACHE_KEY_POOL, this.cachePool);
        }
      }

      // 2. If no cached item, fetch fresh from provider
      if (!nextItem) {
        if (provider) {
          try {
            const fetched = await provider.fetchImages(category, Math.max(3, this.config.cacheSize || 5));
            if (fetched && fetched.length > 0) {
              nextItem = fetched[0];
              // Put remaining in cache pool
              const remaining = fetched.slice(1);
              this.cachePool = [...this.cachePool.filter(i => i.providerId !== providerId), ...remaining].slice(0, this.config.cacheSize || 5);
              await StorageManager.set(this.CACHE_KEY_POOL, this.cachePool);
            }
          } catch (netErr) {
            console.warn('⚠️ Remote provider fetch failed, falling back gracefully:', netErr.message);
          }
        }
      }

      // 3. Fallback to offline local provider if remote fetch failed or returned nothing
      if (!nextItem) {
        nextItem = ImageProviderRegistry.get('local').getFallback(this.config.fallbackTheme || 'cosmic');
      }

      // 4. Preload remote image in background before applying to avoid blank / flash
      if (nextItem && !nextItem.isLocal && nextItem.url) {
        await this.preloadImage(nextItem.url);
      }

      // 5. Commit active wallpaper
      nextItem.timestamp = Date.now();
      this.currentWallpaper = nextItem;
      await StorageManager.set(this.CACHE_KEY_ACTIVE, nextItem);

      this.notify(this.currentWallpaper);

      // 6. Asynchronously refill cache pool in background for instant next load
      this.refillCachePool().catch(() => {});
    } catch (err) {
      console.error('⚠️ WallpaperManager.nextWallpaper failure:', err);
      this.applyLocalFallback();
    } finally {
      this.isLoading = false;
    }
  },

  /**
   * Preload an image URL into browser cache
   */
  preloadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => resolve(), 3500); // 3.5s timeout safeguard
      img.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve();
      };
      img.src = url;
    });
  },

  /**
   * Refill the pre-cached pool in background
   */
  async refillCachePool() {
    if (!this.config?.enabled || this.config.provider === 'local') return;

    const providerId = this.config.provider || 'wikimedia';
    const category = this.config.category || 'landscapes';
    const needed = (this.config.cacheSize || 5) - this.cachePool.filter(i => i.providerId === providerId && i.category === category).length;

    if (needed <= 0) return;

    try {
      const provider = ImageProviderRegistry.get(providerId);
      if (!provider) return;

      const items = await provider.fetchImages(category, needed + 1);
      if (items && items.length > 0) {
        const unique = items.filter(newItem =>
          newItem.id !== this.currentWallpaper?.id &&
          !this.cachePool.some(cached => cached.id === newItem.id)
        );

        this.cachePool = [...this.cachePool, ...unique].slice(0, this.config.cacheSize || 5);
        await StorageManager.set(this.CACHE_KEY_POOL, this.cachePool);
      }
    } catch (err) {
      // Quiet fail on background pre-caching
    }
  },

  /**
   * Fallback to local offline wallpaper theme
   */
  applyLocalFallback(themeKey) {
    const localProvider = ImageProviderRegistry.get('local');
    const fallback = localProvider.getFallback(themeKey || this.config?.fallbackTheme || 'cosmic');
    fallback.timestamp = Date.now();
    this.currentWallpaper = fallback;
    this.notify(this.currentWallpaper);
  },

  /**
   * Update configuration and apply changes immediately
   */
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await StorageManager.updateSetting('dynamicWallpaper', this.config);

    if (!this.config.enabled) {
      // Revert to default canvas / custom background
      window.dispatchEvent(new CustomEvent('devora-wallpaper-disabled'));
      return;
    }

    // Force rotation if provider or category changed
    await this.nextWallpaper(true);
  },

  /**
   * Subscribe to wallpaper changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
    if (this.currentWallpaper) {
      callback(this.currentWallpaper);
    }
  },

  notify(wallpaper) {
    this.listeners.forEach(cb => {
      try { cb(wallpaper); } catch (e) { console.error(e); }
    });

    window.dispatchEvent(new CustomEvent('devora-wallpaper-changed', {
      detail: { wallpaper, config: this.config }
    }));
  }
};

// Export globally
window.WallpaperManager = WallpaperManager;
