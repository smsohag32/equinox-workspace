# Equinox Workspace — Ultimate Dashboard

A premium Chrome Extension that replaces your default New Tab page with a beautiful, productivity-focused developer dashboard.

![Equinox Workspace](assets/icons/icon128.png)

## ✨ Features

- **🕐 Real-time Clock** — Large digital clock with 12/24hr format, seconds, and date display
- **🔎 Web Search** — Integrated omni-search respecting your default browser search engine with URL detection and keyboard shortcut (`/`)
- **✅ Task Manager** — Full daily task management with priorities, due times, edit/delete, and filtering
- **📊 Productivity Overview** — Circular progress chart with completion stats
- **📅 Daily Reset** — Date-keyed tasks with history browser for past days
- **🎯 Pomodoro Timer** — Built-in work/break timer with session tracking
- **💬 Developer Quotes** — Curated programming quotes rotating daily
- **🔗 Quick Links** — Customizable quick-access shortcuts to your favorite tools, documentation, and web apps
- **🎨 Themes** — Dark, Light, and Developer themes with glassmorphism design
- **🖼️ Custom Backgrounds** — Animated code particles, gradient orbs, or upload your own image
- **⌨️ Keyboard Shortcuts** — `/` search, `T` add task, `Esc` close modals
- **🔔 Notifications** — Optional task deadline reminders via Chrome notifications
- **💾 Local Storage** — All data stored locally via `chrome.storage.local` — no account needed
- **📱 Responsive** — Works beautifully on all screen sizes

## 🚀 Installation

### Developer Mode (Recommended for Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `ew/` directory
6. Open a new tab — Equinox Workspace should appear!

### Packaging for Distribution

1. Go to `chrome://extensions/`
2. Click **Pack extension**
3. Select the `ew/` directory as the extension root
4. Chrome will generate a `.crx` file for distribution

## 🏗️ Architecture

```
ew/
├── manifest.json               # Chrome Extension Manifest V3
├── README.md
├── src/
│   ├── newtab/
│   │   ├── index.html          # New Tab page (chrome_url_overrides)
│   │   ├── app.js              # Main app orchestrator
│   │   └── styles.css          # Complete design system
│   ├── popup/
│   │   ├── popup.html          # Toolbar popup
│   │   ├── popup.js            # Popup logic
│   │   └── popup.css           # Popup styles
│   ├── background/
│   │   └── service-worker.js   # Background service worker
│   ├── components/
│   │   ├── background.js       # Animated canvas background
│   │   ├── clock.js            # Real-time clock
│   │   ├── search.js           # Web search (Chrome Search API)
│   │   ├── greeting.js         # Time-based greeting
│   │   ├── tasks.js            # Task manager (CRUD + history)
│   │   ├── productivity.js     # Progress overview
│   │   ├── quicklinks.js       # Developer quick links
│   │   ├── quotes.js           # Developer quotes
│   │   ├── pomodoro.js         # Pomodoro timer
│   │   └── settings.js         # Settings panel
│   ├── storage/
│   │   └── storage.js          # chrome.storage.local abstraction
│   └── utils/
│       └── utils.js            # Date, formatting, helpers
└── assets/
    └── icons/
        ├── icon16.png
        ├── icon32.png
        ├── icon48.png
        └── icon128.png
```

### Key Design Decisions

- **Vanilla JS** — No framework or build step for instant load times and zero dependencies
- **Manifest V3** — Modern Chrome Extension standard with service worker
- **Date-keyed tasks** — Tasks stored by date (`devora_tasks_2026-09-10`) for automatic daily reset
- **Component pattern** — Each feature is a self-contained component object with `init()`, `render()`, and `update()` methods
- **CSS custom properties** — Full theme system with dark/light/developer themes

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search bar |
| `T` | Open add task modal |
| `Esc` | Close any open modal or settings panel |
| `Enter` | Submit search or save task |

## 🎨 Themes

- **Dark** — Default dark theme with indigo accents
- **Light** — Clean light theme
- **Developer** — Deep navy with cyan accents

## 🔒 Privacy

- No user registration required
- No external data collection
- All tasks and settings stored locally in the browser
- Google searches performed through your browser's default behavior
- No analytics or tracking

## 🛠️ Technical Stack

- HTML5, CSS3, JavaScript (ES2020+)
- Chrome Extension Manifest V3
- `chrome.storage.local` for persistence
- `chrome.notifications` for optional reminders
- `chrome.alarms` for scheduled checks
- Canvas API for animated background
- Google Fonts (Inter, JetBrains Mono)

## 📄 License

MIT License — free to use, modify, and distribute.
