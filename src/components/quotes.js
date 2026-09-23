/* ============================================================
   Devora — Quotes Component
   Dynamic open-source quotes rotating display using free
   open quotes APIs with caching, click-to-copy, and offline fallback.
   ============================================================ */

const QuotesComponent = {
  containerEl: null,
  contentEl: null,
  quoteEl: null,
  authorEl: null,
  refreshBtn: null,
  feedbackEl: null,
  isFetching: false,

  get STORAGE_KEY() {
    return (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.LAST_QUOTE) || 'devora_last_quote';
  },

  get fallbackQuotes() {
    return (typeof CONFIG !== 'undefined' && CONFIG.QUOTES?.FALLBACK_QUOTES) ? CONFIG.QUOTES.FALLBACK_QUOTES : [
      { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
      { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
      { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
      { text: "Clean code always looks like it was written by someone who cares.", author: "Robert C. Martin" },
      { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
      { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
      { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
      { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson" },
      { text: "It's not a bug — it's an undocumented feature.", author: "Anonymous" },
      { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
      { text: "The only way to learn a new programming language is by writing programs in it.", author: "Dennis Ritchie" },
      { text: "Perfection is achieved not when there is nothing more to add, but rather when there is nothing more to take away.", author: "Antoine de Saint-Exupéry" },
      { text: "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.", author: "Bill Gates" },
      { text: "The function of good software is to make the complex appear to be simple.", author: "Grady Booch" },
      { text: "Before software can be reusable it first has to be usable.", author: "Ralph Johnson" },
      { text: "In theory, there is no difference between theory and practice. But in practice, there is.", author: "Jan L. A. van de Snepscheut" },
      { text: "Walking on water and developing software from a specification are easy if both are frozen.", author: "Edward V. Berard" },
      { text: "The best thing about a boolean is even if you are wrong, you are only off by a bit.", author: "Anonymous" },
      { text: "Experience is the name everyone gives to their mistakes.", author: "Oscar Wilde" },
      { text: "Java is to JavaScript what car is to carpet.", author: "Chris Heilmann" },
      { text: "A language that doesn't affect the way you think about programming is not worth knowing.", author: "Alan Perlis" },
      { text: "Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday's code.", author: "Dan Salomon" },
      { text: "Deleted code is debugged code.", author: "Jeff Sickel" },
      { text: "If debugging is the process of removing software bugs, then programming must be the process of putting them in.", author: "Edsger Dijkstra" },
      { text: "Software is like entropy: it is difficult to grasp, weighs nothing, and obeys the Second Law of Thermodynamics; i.e., it always increases.", author: "Norman Augustine" },
      { text: "There are only two kinds of languages: the ones people complain about and the ones nobody uses.", author: "Bjarne Stroustrup" },
      { text: "One man's crappy software is another man's full-time job.", author: "Jessica Gaston" },
      { text: "Don't worry if it doesn't work right. If everything did, you'd be out of a job.", author: "Mosher's Law of Software Engineering" },
      { text: "Debugging is twice as hard as writing the code in the first place.", author: "Brian Kernighan" },
      { text: "Computers are fast; developers are slow.", author: "Anonymous" },
      { text: "Optimism is an occupational hazard of programming: testing is the treatment.", author: "Kent Beck" },
      { text: "Simplicity is prerequisite for reliability.", author: "Edsger W. Dijkstra" },
      { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
      { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" }
    ];
  },

  async init() {
    this.containerEl = document.getElementById('quote-container');
    this.contentEl = document.getElementById('quote-content');
    this.quoteEl = document.getElementById('quote-text');
    this.authorEl = document.getElementById('quote-author');
    this.refreshBtn = document.getElementById('quote-refresh-btn');
    this.feedbackEl = document.getElementById('quote-copy-feedback');

    const settings = await StorageManager.getSettings();
    if (settings.quotes?.enabled === false) {
      if (this.containerEl) this.containerEl.style.display = 'none';
      return;
    }

    // 1. Instant 0ms render from local cache if present
    const cachedQuote = await StorageManager.get(this.STORAGE_KEY);
    if (cachedQuote && cachedQuote.text) {
      this.renderQuote(cachedQuote, false);
    } else {
      // Pick random from fallback pool immediately
      const initial = this.getRandomFallback();
      this.renderQuote(initial, false);
    }

    // 2. Fetch fresh dynamic quote from open-source API for this new tab
    this.fetchAndDisplayQuote(true);

    // 3. Bind interactive events
    this.bindEvents();
  },

  getRandomFallback() {
    const list = this.fallbackQuotes;
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  },

  async fetchRemoteQuote() {
    const timeoutMs = (typeof CONFIG !== 'undefined' && CONFIG.QUOTES?.TIMEOUT_MS) || 3500;
    const primaryApi = (typeof CONFIG !== 'undefined' && CONFIG.QUOTES?.PRIMARY_API) || 'https://dummyjson.com/quotes/random';
    const secondaryApi = (typeof CONFIG !== 'undefined' && CONFIG.QUOTES?.SECONDARY_API) || 'https://zenquotes.io/api/random';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Primary: DummyJSON random quote
    try {
      const res = await fetch(primaryApi, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.quote) {
          return {
            text: data.quote.trim(),
            author: data.author ? data.author.trim() : 'Unknown'
          };
        }
      }
    } catch (err) {
      // Fall through to secondary
    }

    // Secondary: ZenQuotes random quote
    try {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), timeoutMs);
      const res = await fetch(secondaryApi, { signal: controller2.signal });
      clearTimeout(timeoutId2);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.q) {
          return {
            text: data[0].q.trim(),
            author: data[0].a ? data[0].a.trim() : 'Unknown'
          };
        }
      }
    } catch (err) {
      // Fall through to fallback
    }

    // Offline fallback: random pick from internal collection
    return this.getRandomFallback();
  },

  async fetchAndDisplayQuote(animate = true) {
    if (this.isFetching) return;
    this.isFetching = true;

    if (this.refreshBtn) this.refreshBtn.classList.add('spinning');

    try {
      const quote = await this.fetchRemoteQuote();
      if (quote && quote.text) {
        this.renderQuote(quote, animate);
        await StorageManager.set(this.STORAGE_KEY, quote);
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch dynamic quote:', err);
    } finally {
      this.isFetching = false;
      if (this.refreshBtn) this.refreshBtn.classList.remove('spinning');
    }
  },

  renderQuote(quote, animate = true) {
    if (!this.quoteEl || !this.authorEl) return;

    if (animate && this.contentEl) {
      this.contentEl.classList.add('fading');
      setTimeout(() => {
        this.quoteEl.textContent = `"${quote.text}"`;
        this.authorEl.textContent = `— ${quote.author}`;
        this.contentEl.classList.remove('fading');
      }, 200);
    } else {
      this.quoteEl.textContent = `"${quote.text}"`;
      this.authorEl.textContent = `— ${quote.author}`;
    }
  },

  bindEvents() {
    // Refresh / Cycle quote button
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.fetchAndDisplayQuote(true);
      });
    }

    // Click on quote text to copy to clipboard
    if (this.quoteEl) {
      this.quoteEl.addEventListener('click', () => this.copyQuoteToClipboard());
    }
  },

  copyQuoteToClipboard() {
    const text = this.quoteEl?.textContent;
    const author = this.authorEl?.textContent;
    if (!text) return;

    const fullText = `${text} ${author || ''}`.trim();
    navigator.clipboard.writeText(fullText).then(() => {
      if (this.feedbackEl) {
        this.feedbackEl.classList.add('show');
        setTimeout(() => this.feedbackEl.classList.remove('show'), 2000);
      }
    }).catch(() => {});
  }
};

window.QuotesComponent = QuotesComponent;
