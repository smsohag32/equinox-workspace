/* ============================================================
   Devora — Pluggable Open-Source Image Providers
   Provides cleanly licensed, commercially friendly image sources
   suitable for enterprise use (Wikimedia Commons, NASA, Local).
   ============================================================ */

/**
 * Base abstract image provider interface.
 */
class BaseImageProvider {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.licenseType = config.licenseType;
    this.attributionRequired = !!config.attributionRequired;
    this.categories = config.categories || [];
  }

  /**
   * Fetch an array of WallpaperItem objects.
   * @param {string} category 
   * @param {number} count 
   * @returns {Promise<Array<WallpaperItem>>}
   */
  async fetchImages(category, count = 5) {
    throw new Error('fetchImages() must be implemented by provider');
  }

  /**
   * Helper to strip HTML tags from metadata strings.
   */
  stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /**
   * Random shuffle helper
   */
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

/**
 * Wikimedia Commons Provider
 * Uses Wikimedia Commons Featured Pictures and Categories.
 * Fully open, CC-BY-SA / CC-BY / CC0 / Public Domain licenses.
 */
class WikimediaProvider extends BaseImageProvider {
  constructor() {
    const wmConfig = (typeof CONFIG !== 'undefined' && CONFIG.WALLPAPERS?.PROVIDERS?.wikimedia) || {};
    super({
      id: 'wikimedia',
      name: wmConfig.name || 'Wikimedia Commons',
      description: 'High-resolution open-access photography from Wikimedia Commons (Creative Commons & Public Domain).',
      licenseType: wmConfig.licenseType || 'CC BY-SA / CC0 / Public Domain',
      attributionRequired: true,
      categories: wmConfig.categories || [
        { id: 'landscapes', label: 'Scenic Landscapes', title: 'Category:Featured_pictures_of_landscapes' },
        { id: 'nature', label: 'Nature & Wildlife', title: 'Category:Featured_pictures_of_nature' },
        { id: 'architecture', label: 'World Architecture', title: 'Category:Featured_pictures_of_architecture' },
        { id: 'astronomy', label: 'Night Skies & Astronomy', title: 'Category:Featured_pictures_of_astronomy' },
        { id: 'featured', label: 'Featured Masterpieces', title: 'Category:Featured_pictures_on_Wikimedia_Commons' }
      ]
    });
    this.endpoint = wmConfig.endpoint || 'https://commons.wikimedia.org/w/api.php';
    this.width = wmConfig.width || 1920;
    this.timeoutMs = (typeof CONFIG !== 'undefined' && CONFIG.WALLPAPERS?.TIMEOUT_MS) || 7000;
  }

  async fetchImages(category = 'landscapes', count = 5) {
    const cat = this.categories.find(c => c.id === category) || this.categories[0];
    const categoryTitle = cat.title;

    // We use generator=categorymembers to fetch files, requesting 1920px pre-rendered thumbnail
    // for ultra-fast, low-bandwidth loading without downloading 50MB raw TIFF/PNG originals.
    const url = `${this.endpoint}?action=query&format=json&generator=categorymembers` +
      `&gcmtitle=${encodeURIComponent(categoryTitle)}` +
      `&gcmlimit=35&gcmtype=file` +
      `&prop=imageinfo&iiprop=url|extmetadata|dimensions` +
      `&iiurlwidth=${this.width}&origin=*`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Wikimedia API responded with HTTP ${response.status}`);
      const data = await response.json();

      if (!data?.query?.pages) {
        throw new Error('No images returned by Wikimedia Commons');
      }

      const pages = Object.values(data.query.pages)
        .filter(page => {
          const info = page.imageinfo?.[0];
          // Filter out tiny icons, SVGs or non-photographic assets
          return info && info.thumburl && info.width >= 1200 && (info.width >= info.height);
        });

      if (pages.length === 0) {
        throw new Error('No suitable landscape photographs found in category');
      }

      const shuffled = this.shuffle(pages).slice(0, count);

      return shuffled.map(page => {
        const info = page.imageinfo[0];
        const meta = info.extmetadata || {};

        // Parse artist name and clean HTML
        let author = this.stripHtml(meta.Artist?.value || 'Wikimedia Contributor').trim();
        if (!author || author.length > 50) author = 'Wikimedia Contributor';

        // Parse title
        let title = this.stripHtml(meta.ObjectName?.value || '').trim();
        if (!title) {
          title = page.title.replace(/^File:/i, '').replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        }
        if (title.length > 60) title = title.substring(0, 57) + '…';

        // License
        const license = meta.LicenseShortName?.value || 'CC BY-SA 4.0';
        const licenseUrl = meta.LicenseUrl?.value || 'https://creativecommons.org/licenses/by-sa/4.0/';

        const cleanThumb = (info.thumburl || '').split('?')[0];
        return {
          id: `wiki_${page.pageid}`,
          url: cleanThumb,
          fullUrl: info.url,
          thumbUrl: cleanThumb,
          title: title,
          author: author,
          sourceName: 'Wikimedia Commons',
          sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
          license: license,
          licenseUrl: licenseUrl,
          providerId: this.id,
          category: cat.id,
          timestamp: Date.now()
        };
      });
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('⚠️ WikimediaProvider fetch failed, falling back to offline provider:', err.message);
      throw err;
    }
  }
}

/**
 * NASA Earth & Cosmos Imagery Provider
 * 100% US Public Domain, open for enterprise and commercial redistribution.
 */
class NasaProvider extends BaseImageProvider {
  constructor() {
    const nasaConfig = (typeof CONFIG !== 'undefined' && CONFIG.WALLPAPERS?.PROVIDERS?.nasa) || {};
    super({
      id: 'nasa',
      name: nasaConfig.name || 'NASA Earth & Cosmos',
      description: 'Hubble, James Webb, and ISS Earth observations (100% US Public Domain).',
      licenseType: nasaConfig.licenseType || 'Public Domain (US Govt)',
      attributionRequired: true,
      categories: nasaConfig.categories || [
        { id: 'space', label: 'Nebulae & Deep Space', query: 'nebula OR galaxy OR hubble' },
        { id: 'earth', label: 'Earth from Orbit', query: 'earth from space OR iss earth' },
        { id: 'mars', label: 'Mars Exploration', query: 'mars surface OR mars rover' }
      ]
    });
    this.endpoint = nasaConfig.endpoint || 'https://images-api.nasa.gov/search';
    this.timeoutMs = (typeof CONFIG !== 'undefined' && CONFIG.WALLPAPERS?.TIMEOUT_MS) || 7000;
  }

  async fetchImages(category = 'space', count = 5) {
    const cat = this.categories.find(c => c.id === category) || this.categories[0];
    const url = `${this.endpoint}?q=${encodeURIComponent(cat.query)}&media_type=image`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`NASA API HTTP ${response.status}`);
      const data = await response.json();
      const items = data?.collection?.items || [];

      const validItems = items.filter(item => {
        const d = item.data?.[0];
        const link = item.links?.[0];
        return d && link && link.href;
      });

      if (validItems.length === 0) throw new Error('No NASA images found');

      const shuffled = this.shuffle(validItems).slice(0, count);

      return shuffled.map(item => {
        const d = item.data[0];
        const link = item.links[0];
        const title = d.title ? (d.title.length > 55 ? d.title.substring(0, 52) + '…' : d.title) : 'NASA Mission Observation';
        const author = d.photographer || d.center || 'NASA / JPL';

        return {
          id: `nasa_${d.nasa_id || Math.random().toString(36).substr(2, 9)}`,
          url: link.href,
          fullUrl: link.href,
          thumbUrl: link.href,
          title: title,
          author: author,
          sourceName: 'NASA Open Archive',
          sourceUrl: 'https://images.nasa.gov',
          license: 'Public Domain (US Govt)',
          licenseUrl: 'https://www.nasa.gov/multimedia/guidelines/index.html',
          providerId: this.id,
          category: cat.id,
          timestamp: Date.now()
        };
      });
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('⚠️ NasaProvider fetch failed:', err.message);
      throw err;
    }
  }
}

/**
 * Local Curated Offline Provider
 * 100% offline, zero-network requests, privacy and enterprise intranet friendly.
 * Pure SVG mesh gradients and generative cosmic visuals.
 */
class LocalCuratedProvider extends BaseImageProvider {
  constructor() {
    const localConfig = (typeof CONFIG !== 'undefined' && CONFIG.WALLPAPERS?.PROVIDERS?.local) || {};
    super({
      id: 'local',
      name: localConfig.name || 'Curated Offline Themes',
      description: 'Zero-network local gradient themes. Instant loading, air-gapped security, zero external requests.',
      licenseType: localConfig.licenseType || 'Open Source (MIT / CC0)',
      attributionRequired: false,
      categories: localConfig.categories || [
        { id: 'cosmic', label: 'Deep Cosmic Night' },
        { id: 'aurora', label: 'Emerald Borealis' },
        { id: 'obsidian', label: 'Obsidian Minimal' },
        { id: 'sunset', label: 'Sunset Horizon' },
        { id: 'nebula', label: 'Violet Nebula' }
      ]
    });

    // High aesthetic SVG / CSS background templates
    this.wallpapers = localConfig.themes || {
      cosmic: {
        title: 'Deep Cosmic Night',
        author: 'Equinox Studio',
        cssBackground: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0c0a20 50%, #030712 100%), linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.05))',
        license: 'CC0 / Public Domain',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
      },
      aurora: {
        title: 'Emerald Borealis',
        author: 'Equinox Studio',
        cssBackground: 'radial-gradient(ellipse at bottom left, #064e3b 0%, #022c22 45%, #020b08 100%), radial-gradient(circle at top right, rgba(20, 184, 166, 0.25) 0%, transparent 60%)',
        license: 'CC0 / Public Domain',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
      },
      obsidian: {
        title: 'Obsidian Minimal Slate',
        author: 'Equinox Studio',
        cssBackground: 'radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 50%, #020617 100%)',
        license: 'CC0 / Public Domain',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
      },
      sunset: {
        title: 'Sunset Horizon Dusk',
        author: 'Equinox Studio',
        cssBackground: 'radial-gradient(ellipse at bottom, #451a03 0%, #2e0854 45%, #090314 100%), linear-gradient(180deg, rgba(244, 63, 94, 0.1), transparent)',
        license: 'CC0 / Public Domain',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
      },
      nebula: {
        title: 'Violet Starlight Nebula',
        author: 'Equinox Studio',
        cssBackground: 'radial-gradient(ellipse at 70% 20%, #4c0519 0%, #1e1138 50%, #04020a 100%), radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)',
        license: 'CC0 / Public Domain',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
      }
    };
  }

  async fetchImages(category = 'cosmic', count = 1) {
    const selectedKey = this.wallpapers[category] ? category : 'cosmic';
    const item = this.wallpapers[selectedKey];

    return [{
      id: `local_${selectedKey}`,
      isLocal: true,
      cssBackground: item.cssBackground,
      url: '', // Local uses CSS gradient directly
      title: item.title,
      author: item.author,
      sourceName: 'Equinox Offline Bundle',
      sourceUrl: 'https://github.com/project2morrow-software-ltd/devora',
      license: item.license,
      licenseUrl: item.licenseUrl,
      providerId: this.id,
      category: selectedKey,
      timestamp: Date.now()
    }];
  }

  /**
   * Directly get a specific fallback wallpaper by theme key
   */
  getFallback(themeKey = 'cosmic') {
    const item = this.wallpapers[themeKey] || this.wallpapers.cosmic;
    return {
      id: `local_${themeKey}`,
      isLocal: true,
      cssBackground: item.cssBackground,
      url: '',
      title: item.title,
      author: item.author,
      sourceName: 'Equinox Offline Fallback',
      sourceUrl: 'https://github.com/project2morrow-software-ltd/devora',
      license: item.license,
      licenseUrl: item.licenseUrl,
      providerId: this.id,
      category: themeKey,
      timestamp: Date.now()
    };
  }
}

/**
 * Central Provider Registry
 * Allows easily registering new providers in the future (e.g. enterprise internal photo server).
 */
const ImageProviderRegistry = {
  providers: new Map(),

  init() {
    this.register(new WikimediaProvider());
    this.register(new NasaProvider());
    this.register(new LocalCuratedProvider());
  },

  register(provider) {
    if (!provider?.id) throw new Error('Provider must have a valid id');
    this.providers.set(provider.id, provider);
  },

  get(id) {
    return this.providers.get(id) || this.providers.get('wikimedia') || this.providers.get('local');
  },

  getAll() {
    return Array.from(this.providers.values());
  }
};

// Initialize providers immediately
ImageProviderRegistry.init();

// Export for global browser extension context
window.BaseImageProvider = BaseImageProvider;
window.WikimediaProvider = WikimediaProvider;
window.NasaProvider = NasaProvider;
window.LocalCuratedProvider = LocalCuratedProvider;
window.ImageProviderRegistry = ImageProviderRegistry;
