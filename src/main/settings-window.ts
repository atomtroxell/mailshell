import { BrowserWindow, app, type WebContents } from 'electron';
import path from 'path';
import { THEME_VARS } from './theme-css';

const GMAIL_THEMES_URL = 'https://mail.google.com/mail/u/0/#settings/themes';

let settingsWindow: BrowserWindow | null = null;

function getPreloadPath(): string {
  return path.join(app.getAppPath(), '.vite/build/shell.js');
}

// Embedded settings HTML
const SETTINGS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Settings - MailShell</title>
  <style>
${THEME_VARS}
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: var(--bg);
      color: var(--fg);
      padding: 20px;
      font-size: 14px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
      margin-top: 0;
    }
    h2 {
      font-size: 16px;
      font-weight: 600;
      color: var(--fg-strong);
      margin-bottom: 12px;
      margin-top: 0;
    }
    section {
      margin-bottom: 24px;
    }
    .message {
      padding: 12px;
      margin-bottom: 16px;
      border-radius: 4px;
      font-size: 13px;
      display: none;
    }
    .error {
      background-color: var(--err-bg);
      color: var(--err-fg);
    }
    .success {
      background-color: var(--ok-bg);
      color: var(--ok-fg);
    }
    .help-text {
      color: var(--muted);
      font-size: 13px;
      margin: 0 0 12px 0;
    }
    label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: background-color 0.2s;
      margin-bottom: 8px;
    }
    label:hover {
      background-color: var(--hover);
    }
    input[type="radio"], input[type="checkbox"] {
      cursor: pointer;
    }
    select {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      cursor: pointer;
      background-color: var(--surface);
      color: var(--fg);
      margin-bottom: 8px;
    }
    button {
      padding: 8px 16px;
      background-color: var(--btn-bg);
      color: var(--btn-fg);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .btn-link {
      display: inline-block;
      padding: 8px 16px;
      background-color: var(--btn-bg);
      color: var(--btn-fg);
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .btn-link:hover {
      background-color: var(--btn-hover);
    }
    button:hover:not(:disabled) {
      background-color: var(--btn-hover);
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .button-desc {
      margin-top: 8px;
      font-size: 12px;
      color: var(--muted);
    }
    .version {
      color: var(--faint);
      font-size: 12px;
      margin: 0;
    }
  </style>
</head>
<body>
  <h1>Settings</h1>

  <div id="error" class="message error"></div>
  <div id="success" class="message success"></div>

  <!-- Appearance section -->
  <section>
    <h2>Appearance</h2>
    <label><input type="radio" name="theme" value="system" id="themeSystem" /> Use system setting</label>
    <label><input type="radio" name="theme" value="light" id="themeLight" /> Light</label>
    <label><input type="radio" name="theme" value="dark" id="themeDark" /> Dark</label>
    <p class="help-text">Applies to MailShell, Gmail and Windows dialogs. System follows your Windows setting.</p>
    <a id="gmail-themes" class="btn-link" href="https://mail.google.com/mail/u/0/#settings/themes">Open Gmail themes</a>
  </section>

  <!-- Gmail Customization section -->
  <section>
    <h2>Gmail Customization</h2>
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; margin: 0;">
      <input type="checkbox" id="gmailCSSEnabled" style="cursor: pointer;" />
      <span>Enable Gmail UI presets</span>
    </label>
    <p class="help-text" style="margin-left: 32px;">Applies CSS improvements for cleaner, more readable Gmail interface</p>
  </section>

  <!-- Data Management section -->
  <section>
    <h2>Data Management</h2>
    <div>
      <button id="clearCacheBtn" type="button">Clear Cache</button>
      <p class="button-desc">Clears browsing data and cached files</p>
    </div>
  </section>

  <!-- About section -->
  <section>
    <h2>About</h2>
    <p class="help-text">MailShell - Gmail Client</p>
    <p class="version" id="version">Version <span></span></p>
  </section>

  <script>
    // IPC communication (from preload)
    const { preferences, app } = window.electron || {};

    if (!preferences || !app) {
      showError('Settings API not available');
    }

    // Load preferences
    async function loadPreferences() {
      try {
        const prefs = await preferences.get();
        document.getElementById('gmailCSSEnabled').checked = prefs.gmailCSSEnabled;
        const theme = ['light', 'dark', 'system'].includes(prefs.theme) ? prefs.theme : 'system';
        const themeRadio = document.querySelector('input[name="theme"][value="' + theme + '"]');
        if (themeRadio) themeRadio.checked = true;
      } catch (error) {
        showError(\`Failed to load preferences: \${error.message}\`);
        console.error('Failed to load preferences:', error);
      }
    }

    // Load version
    async function loadVersion() {
      try {
        const version = await app.getVersion();
        document.querySelector('#version span').textContent = version;
      } catch (error) {
        console.error('Failed to get version:', error);
      }
    }

    // Handle Gmail CSS toggle
    document.getElementById('gmailCSSEnabled').addEventListener('change', async (e) => {
      try {
        await preferences.set('gmailCSSEnabled', e.target.checked);
        showSuccess(e.target.checked ? 'Gmail UI presets enabled' : 'Gmail UI presets disabled');
      } catch (error) {
        showError(\`Failed to update Gmail CSS setting: \${error.message}\`);
      }
    });

    // Handle theme radios (fixed messages only; the value is never put in HTML)
    const THEME_MESSAGES = { system: 'Theme: system setting', light: 'Theme: light', dark: 'Theme: dark' };
    document.querySelectorAll('input[name="theme"]').forEach((radio) => {
      radio.addEventListener('change', async (e) => {
        try {
          await preferences.set('theme', e.target.value);
          showSuccess(THEME_MESSAGES[e.target.value] || 'Theme updated');
        } catch (error) {
          showError('Failed to update theme');
          loadPreferences();
        }
      });
    });

    // Handle clear cache
    document.getElementById('clearCacheBtn').addEventListener('click', async () => {
      if (!confirm('This will clear all cached data and browsing history. Your Gmail session will remain active.')) {
        return;
      }

      const btn = document.getElementById('clearCacheBtn');
      btn.disabled = true;

      try {
        await preferences.clearCache();
        showSuccess('Cache cleared successfully');
      } catch (error) {
        showError(\`Failed to clear cache: \${error.message}\`);
      } finally {
        btn.disabled = false;
      }
    });

    function showError(message) {
      const errorEl = document.getElementById('error');
      errorEl.textContent = message;
      errorEl.style.display = 'block';
      setTimeout(() => {
        errorEl.style.display = 'none';
      }, 3000);
    }

    function showSuccess(message) {
      const successEl = document.getElementById('success');
      successEl.textContent = message;
      successEl.style.display = 'block';
      setTimeout(() => {
        successEl.style.display = 'none';
      }, 3000);
    }

    // Load on startup
    loadPreferences();
    loadVersion();
  </script>
</body>
</html>`;

/**
 * Create and manage settings dialog window
 * Prevents multiple instances using singleton pattern
 */
export const createSettingsWindow = async (mainWindow: BrowserWindow): Promise<void> => {
  // Prevent multiple instances
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 720,
    modal: true,
    parent: mainWindow,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: getPreloadPath(),
    },
  });

  // Hide menu bar in settings window
  settingsWindow.removeMenu();

  // The only allowed navigation is the Gmail Themes link, which opens in the
  // main window. Everything else is blocked; no new windows.
  settingsWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    if (url === GMAIL_THEMES_URL && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(GMAIL_THEMES_URL).catch(() => undefined);
      mainWindow.focus();
    }
  });
  settingsWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Load embedded HTML as data URL
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(SETTINGS_HTML)}`;

  try {
    await settingsWindow.loadURL(dataUrl);
    settingsWindow.show();
  } catch (error) {
    console.error('Failed to load settings window:', error);
    throw error;
  }

  // Clean up reference when window closes
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
};

// Used by ipc.ts to authorise IPC senders by webContents identity
export const getSettingsWebContents = (): WebContents | null =>
  settingsWindow && !settingsWindow.isDestroyed() ? settingsWindow.webContents : null;

/**
 * Close settings window if open
 */
export const closeSettingsWindow = (): void => {
  if (settingsWindow) {
    settingsWindow.close();
  }
};
