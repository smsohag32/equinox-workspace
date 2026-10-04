/* ============================================================
   Devora / Equinox Workspace — Central Configuration
   Unified configuration for application defaults, storage keys,
   API endpoints, dynamic wallpaper providers, and quotes.
   ============================================================ */

const CONFIG = {
   // Application Metadata
   APP: {
      NAME: "Equinox Workspace",
      VERSION: "1.0.1",
      REPOSITORY: "https://github.com/smsohag32/equinox-workspace",
      DESCRIPTION: "A premium, open-source productivity dashboard for modern developers.",
   },

   // Storage Keys for chrome.storage.local
   STORAGE_KEYS: {
      SETTINGS: "devora_settings",
      TASKS: "devora_tasks",
      STICKY_NOTES: "devora_sticky_notes",
      QUICK_LINKS: "devora_quicklinks",
      ACTIVE_WALLPAPER: "devora_active_wallpaper",
      WALLPAPER_POOL: "devora_wallpaper_pool",
      LAST_QUOTE: "devora_last_quote",
      POMO_STATE: "devora_pomo_state",
      GOOGLE_USER: "devora_google_user",
      LAST_RESET: "devora_last_reset",
   },

   // Default User Settings
   DEFAULTS: {
      theme: "dark",
      greeting: {
         name: "Developer",
      },
      clock: {
         format24: true,
         showSeconds: true,
         showDate: true,
      },
      search: {},
      tasks: {
         dailyReset: true,
         notifications: false,
      },
      pomodoro: {
         workMinutes: 25,
         breakMinutes: 5,
         longBreakMinutes: 15,
         sessionsBeforeLongBreak: 4,
      },
      quotes: {
         enabled: true,
         rotateOnNewTab: true,
      },
      background: {
         preset: "particles",
         customImage: null,
         animation: true,
         opacity: 0.4,
      },
      dynamicWallpaper: {
         enabled: true,
         provider: "wikimedia",
         category: "landscapes",
         interval: "newtab",
         cacheSize: 5,
         fallbackTheme: "cosmic",
         overlayOpacity: 0.35,
         blur: 0,
         showAttribution: true,
      },
   },

   // Search Engine Providers
   SEARCH_ENGINES: {
      google: {
         name: "Google",
         searchUrl: "https://www.google.com/search?q=",
         suggestUrl: "https://suggestqueries.google.com/complete/search?client=chrome&q=",
      },
      duckduckgo: {
         name: "DuckDuckGo",
         searchUrl: "https://duckduckgo.com/?q=",
         suggestUrl: "https://duckduckgo.com/ac/?q=",
      },
      bing: {
         name: "Bing",
         searchUrl: "https://www.bing.com/search?q=",
      },
      github: {
         name: "GitHub",
         searchUrl: "https://github.com/search?q=",
      },
   },

   // Dynamic Open-Source Wallpaper Providers
   WALLPAPERS: {
      TIMEOUT_MS: 7000,
      PRELOAD_TIMEOUT_MS: 3500,
      PROVIDERS: {
         wikimedia: {
            id: "wikimedia",
            name: "Wikimedia Commons",
            endpoint: "https://commons.wikimedia.org/w/api.php",
            width: 1920,
            licenseType: "CC BY-SA / CC0 / Public Domain",
            categories: [
               {
                  id: "landscapes",
                  label: "Scenic Landscapes",
                  title: "Category:Featured_pictures_of_landscapes",
               },
               {
                  id: "nature",
                  label: "Nature & Wildlife",
                  title: "Category:Featured_pictures_of_nature",
               },
               {
                  id: "architecture",
                  label: "World Architecture",
                  title: "Category:Featured_pictures_of_architecture",
               },
               {
                  id: "astronomy",
                  label: "Night Skies & Astronomy",
                  title: "Category:Featured_pictures_of_astronomy",
               },
               {
                  id: "featured",
                  label: "Featured Masterpieces",
                  title: "Category:Featured_pictures_on_Wikimedia_Commons",
               },
            ],
         },
         nasa: {
            id: "nasa",
            name: "NASA Earth & Cosmos",
            endpoint: "https://images-api.nasa.gov/search",
            licenseType: "Public Domain (US Govt)",
            categories: [
               { id: "space", label: "Nebulae & Deep Space", query: "nebula OR galaxy OR hubble" },
               { id: "earth", label: "Earth from Orbit", query: "earth from space OR iss earth" },
               { id: "mars", label: "Mars Exploration", query: "mars surface OR mars rover" },
            ],
         },
         local: {
            id: "local",
            name: "Curated Offline Themes",
            licenseType: "Open Source (MIT / CC0)",
            categories: [
               { id: "cosmic", label: "Deep Cosmic Night" },
               { id: "aurora", label: "Emerald Borealis" },
               { id: "obsidian", label: "Obsidian Minimal" },
               { id: "sunset", label: "Sunset Horizon" },
               { id: "nebula", label: "Violet Nebula" },
            ],
            themes: {
               cosmic: {
                  title: "Deep Cosmic Night",
                  author: "Equinox Studio",
                  cssBackground:
                     "radial-gradient(ellipse at top, #1e1b4b 0%, #0c0a20 50%, #030712 100%), linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.05))",
                  license: "CC0 / Public Domain",
                  licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
               },
               aurora: {
                  title: "Emerald Borealis",
                  author: "Equinox Studio",
                  cssBackground:
                     "radial-gradient(ellipse at bottom left, #064e3b 0%, #022c22 45%, #020b08 100%), radial-gradient(circle at top right, rgba(20, 184, 166, 0.25) 0%, transparent 60%)",
                  license: "CC0 / Public Domain",
                  licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
               },
               obsidian: {
                  title: "Obsidian Minimal Slate",
                  author: "Equinox Studio",
                  cssBackground:
                     "radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 50%, #020617 100%)",
                  license: "CC0 / Public Domain",
                  licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
               },
               sunset: {
                  title: "Sunset Horizon Dusk",
                  author: "Equinox Studio",
                  cssBackground:
                     "radial-gradient(ellipse at bottom, #451a03 0%, #2e0854 45%, #090314 100%), linear-gradient(180deg, rgba(244, 63, 94, 0.1), transparent)",
                  license: "CC0 / Public Domain",
                  licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
               },
               nebula: {
                  title: "Violet Starlight Nebula",
                  author: "Equinox Studio",
                  cssBackground:
                     "radial-gradient(ellipse at 70% 20%, #4c0519 0%, #1e1138 50%, #04020a 100%), radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)",
                  license: "CC0 / Public Domain",
                  licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
               },
            },
         },
      },
   },

   // Quotes Configuration & APIs
   QUOTES: {
      TIMEOUT_MS: 3500,
      PRIMARY_API: "https://dummyjson.com/quotes/random",
      SECONDARY_API: "https://zenquotes.io/api/random",
      FALLBACK_QUOTES: [
         { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
         {
            text: "Code is like humor. When you have to explain it, it's bad.",
            author: "Cory House",
         },
         { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
         {
            text: "Clean code always looks like it was written by someone who cares.",
            author: "Robert C. Martin",
         },
         {
            text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
            author: "Martin Fowler",
         },
         { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
         { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
         {
            text: "Programs must be written for people to read, and only incidentally for machines to execute.",
            author: "Harold Abelson",
         },
         { text: "It's not a bug — it's an undocumented feature.", author: "Anonymous" },
         { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
         {
            text: "The only way to learn a new programming language is by writing programs in it.",
            author: "Dennis Ritchie",
         },
         {
            text: "Perfection is achieved not when there is nothing more to add, but rather when there is nothing more to take away.",
            author: "Antoine de Saint-Exupéry",
         },
         {
            text: "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.",
            author: "Bill Gates",
         },
         {
            text: "The function of good software is to make the complex appear to be simple.",
            author: "Grady Booch",
         },
         {
            text: "Before software can be reusable it first has to be usable.",
            author: "Ralph Johnson",
         },
         {
            text: "In theory, there is no difference between theory and practice. But in practice, there is.",
            author: "Jan L. A. van de Snepscheut",
         },
         {
            text: "Walking on water and developing software from a specification are easy if both are frozen.",
            author: "Edward V. Berard",
         },
         {
            text: "The best thing about a boolean is even if you are wrong, you are only off by a bit.",
            author: "Anonymous",
         },
         {
            text: "Experience is the name everyone gives to their mistakes.",
            author: "Oscar Wilde",
         },
         { text: "Java is to JavaScript what car is to carpet.", author: "Chris Heilmann" },
         {
            text: "A language that doesn't affect the way you think about programming is not worth knowing.",
            author: "Alan Perlis",
         },
         {
            text: "Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday's code.",
            author: "Dan Salomon",
         },
         { text: "Deleted code is debugged code.", author: "Jeff Sickel" },
         {
            text: "If debugging is the process of removing software bugs, then programming must be the process of putting them in.",
            author: "Edsger Dijkstra",
         },
         {
            text: "Software is like entropy: it is difficult to grasp, weighs nothing, and obeys the Second Law of Thermodynamics; i.e., it always increases.",
            author: "Norman Augustine",
         },
         {
            text: "There are only two kinds of languages: the ones people complain about and the ones nobody uses.",
            author: "Bjarne Stroustrup",
         },
         {
            text: "One man's crappy software is another man's full-time job.",
            author: "Jessica Gaston",
         },
         {
            text: "Don't worry if it doesn't work right. If everything did, you'd be out of a job.",
            author: "Mosher's Law of Software Engineering",
         },
         {
            text: "Debugging is twice as hard as writing the code in the first place.",
            author: "Brian Kernighan",
         },
         { text: "Computers are fast; developers are slow.", author: "Anonymous" },
         {
            text: "Optimism is an occupational hazard of programming: testing is the treatment.",
            author: "Kent Beck",
         },
         { text: "Simplicity is prerequisite for reliability.", author: "Edsger W. Dijkstra" },
         { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
         {
            text: "The future belongs to those who believe in the beauty of their dreams.",
            author: "Eleanor Roosevelt",
         },
      ],
   },

   // Default Quick Links
   DEFAULT_QUICK_LINKS: [
      {
         id: "1",
         name: "GitHub",
         url: "https://github.com",
         icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`,
      },
      {
         id: "2",
         name: "Stack Overflow",
         url: "https://stackoverflow.com",
         icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 21h-10v-2h10v2zm6-11.665l-1.621-9.335-1.993.346 1.621 9.335 1.993-.346zm-5.964 6.937l-9.746-.975-.186 2.016 9.746.975.186-2.016zm.538-2.587l-9.276-2.608-.526 1.954 9.276 2.608.526-1.954zm1.204-2.413l-8.297-4.676-.994 1.738 8.297 4.676.994-1.738zm2.118-1.904l-6.63-6.976-1.452 1.38 6.63 6.976 1.452-1.38zM18 21v-6h-2v6h-2v-8h6v8h-2z"/></svg>`,
      },
      {
         id: "3",
         name: "MDN",
         url: "https://developer.mozilla.org",
         icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 2.5h-7.497v4.608h2.247v-2.358h2.996v12.5h-2.996v-2.358h-2.247v4.608h7.497c.277 0 .502-.225.502-.502v-16.996c0-.277-.225-.502-.502-.502zm-10.997 0h-7.497c-.278 0-.504.225-.504.502v16.996c0 .277.226.502.504.502h7.497v-4.608h-2.247v2.358h-2.996v-12.5h2.996v2.358h2.247v-4.608z"/></svg>`,
      },
      {
         id: "4",
         name: "npm",
         url: "https://www.npmjs.com",
         icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z"/></svg>`,
      },
      {
         id: "5",
         name: "ChatGPT",
         url: "https://chat.openai.com",
         icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>`,
      },
      {
         id: "6",
         name: "Dev.to",
         url: "https://dev.to",
         icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.42 10.05c-.18-.16-.46-.23-.84-.23H6v4.36h.58c.37 0 .65-.08.84-.23.2-.16.3-.46.3-.88v-2.13c0-.42-.1-.72-.3-.89zm15.54-2.68H1.04C.47 7.37 0 7.84 0 8.41v7.18c0 .57.47 1.04 1.04 1.04h21.92c.57 0 1.04-.47 1.04-1.04V8.41c0-.57-.47-1.04-1.04-1.04zM8.66 13.5c0 .85-.35 1.51-.99 1.98-.33.24-.79.36-1.39.36H4.5V8.16h1.78c.6 0 1.06.12 1.39.36.64.47.99 1.13.99 1.98v3zm3.56 2.34H10.2V8.16h2.02v5.08l2.63-5.08h2.02v7.68h-2.02v-5.08l-2.63 5.08zm7.36-.84c-.2.26-.57.49-.96.62-.37.12-.79.18-1.26.18-.41 0-.79-.05-1.16-.18-.37-.12-.65-.3-.84-.53-.2-.24-.31-.53-.31-.87V14h1.94v.39c0 .17.06.3.18.39.12.08.29.13.5.13s.38-.04.5-.13c.12-.08.18-.21.18-.37 0-.18-.08-.33-.24-.45-.16-.12-.42-.27-.78-.43-.63-.27-1.09-.56-1.38-.87-.3-.31-.44-.72-.44-1.24 0-.68.23-1.21.68-1.57.46-.37 1.05-.55 1.78-.55.72 0 1.3.18 1.74.53.44.35.66.84.66 1.48V11h-1.94v-.24c0-.15-.06-.27-.17-.37-.11-.1-.27-.14-.48-.14-.18 0-.33.05-.44.14-.11.1-.17.24-.17.43 0 .16.08.3.24.42.16.12.43.27.8.46.63.3 1.08.59 1.37.88.28.3.43.7.43 1.22 0 .72-.24 1.27-.68 1.64z"/></svg>`,
      },
      {
         id: "7",
         name: "CodePen",
         url: "https://codepen.io",
         icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.144 13.067v-2.134L16.55 12zm1.857 1.151L12 19.848l-7.993-5.622V9.782L12 4.16l7.993 5.615v4.643h.008zM12 0L0 8.441v7.094l12 8.452 12-8.452V8.441L12 0zM5.856 13.067l1.594-1.067-1.594-1.067v2.134zm6.144 2.9l-4.288-3.026L5.856 14l6.144 4.324L18.144 14l-1.856-1.059-4.288 3.026zM12 8.033l-4.288 3.026 4.288 3.026 4.288-3.026L12 8.033z"/></svg>`,
      },
   ],
};

// Export globally for all extension contexts
if (typeof window !== "undefined") {
   window.CONFIG = CONFIG;
}
if (typeof globalThis !== "undefined") {
   globalThis.CONFIG = CONFIG;
}
