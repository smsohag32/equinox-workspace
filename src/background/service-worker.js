/* ============================================================
   Devora — Background Service Worker
   Handles alarms for notifications, daily reset, and
   first-install setup.
   ============================================================ */

try {
  importScripts('../config.js');
} catch (e) {
  console.warn('Devora: Unable to load config.js in service worker:', e);
}

// First install — set default settings
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Devora installed — setting up defaults');

    // Set default settings
    const settingsKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.SETTINGS) || 'devora_settings';
    const defaultSettings = (typeof CONFIG !== 'undefined' && CONFIG.DEFAULTS) ? CONFIG.DEFAULTS : {
      theme: 'dark',
      clock: {
        format24: true,
        showSeconds: true,
        showDate: true
      },
      background: {
        preset: 'particles',
        customImage: null,
        animation: true,
        opacity: 0.4
      },
      search: {
        engine: 'google'
      },
      tasks: {
        dailyReset: true,
        notifications: false
      },
      greeting: {
        name: 'Developer'
      },
      pomodoro: {
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        sessionsBeforeLongBreak: 4
      },
      quotes: {
        enabled: true,
        rotateOnNewTab: true
      }
    };

    chrome.storage.local.set({ [settingsKey]: defaultSettings });
  }

  // Setup daily alarm for midnight reset check
  chrome.alarms.create('devora-daily-reset', {
    periodInMinutes: 60 // Check every hour
  });
});



// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'devora-daily-reset') {
    // Daily reset is handled automatically by date-keyed storage.
    // This alarm can be used for notification reminders.
    await checkTaskReminders();
  }

  if (alarm.name.startsWith('devora-task-reminder-')) {
    const taskId = alarm.name.replace('devora-task-reminder-', '');
    await sendTaskReminder(taskId);
  }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  // Open the new tab page
  chrome.tabs.create({ url: chrome.runtime.getURL('src/newtab/index.html') });
  chrome.notifications.clear(notificationId);
});

// ---- Helper Functions ----

async function checkTaskReminders() {
  try {
    const settingsKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.SETTINGS) || 'devora_settings';
    const result = await chrome.storage.local.get(settingsKey);
    const settings = result[settingsKey];

    if (!settings?.tasks?.notifications) return;

    // Get today's tasks
    const today = getDateKey();
    const taskPrefix = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.TASKS) || 'devora_tasks';
    const taskKey = `${taskPrefix}_${today}`;
    const taskResult = await chrome.storage.local.get(taskKey);
    const tasks = taskResult[taskKey] || [];

    const remaining = tasks.filter(t => !t.completed);

    if (remaining.length > 0) {
      const hour = new Date().getHours();

      // Send a reminder at midday and evening if tasks remain
      if (hour === 12 || hour === 18) {
        chrome.notifications.create(`devora-reminder-${today}-${hour}`, {
          type: 'basic',
          iconUrl: 'assets/icons/icon128.png',
          title: 'Devora — Task Reminder',
          message: `You have ${remaining.length} task${remaining.length > 1 ? 's' : ''} remaining today.`,
          priority: 1
        });
      }
    }
  } catch (e) {
    console.error('Devora: Error checking task reminders', e);
  }
}

async function sendTaskReminder(taskId) {
  try {
    const today = getDateKey();
    const taskPrefix = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS?.TASKS) || 'devora_tasks';
    const taskKey = `${taskPrefix}_${today}`;
    const result = await chrome.storage.local.get(taskKey);
    const tasks = result[taskKey] || [];
    const task = tasks.find(t => t.id === taskId);

    if (task && !task.completed) {
      chrome.notifications.create(`devora-task-${taskId}`, {
        type: 'basic',
        iconUrl: 'assets/icons/icon128.png',
        title: 'Devora — Task Due',
        message: `"${task.title}" is due now.`,
        priority: 2
      });
    }
  } catch (e) {
    console.error('Devora: Error sending task reminder', e);
  }
}

function getDateKey(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
