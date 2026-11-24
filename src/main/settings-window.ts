import { BrowserWindow, app, type WebContents } from 'electron';
import path from 'path';
import { THEME_VARS } from './theme-css';
import { provider } from './providers';
import { appUpdatesSupported } from './app-updates';


let settingsWindow: BrowserWindow | null = null;

function getPreloadPath(): string {
  return path.join(app.getAppPath(), '.vite/build/shell.js');
}

// Embedded settings HTML
function settingsHtml(): string {
  const isGmail = provider.id === 'gmail'
  const appUpdates = appUpdatesSupported()
  return `<!DOCTYPE html>
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

  <!-- Mail service section -->
  <section>
    <h2>Mail service</h2>
    <label><input type="radio" name="mailProvider" value="gmail" id="mailGmail" /> Gmail</label>
    <label><input type="radio" name="mailProvider" value="exchange" id="mailExchange" /> Exchange / Microsoft 365</label>
    <p class="help-text">Restart MailShell after changing this.</p>
  </section>

  <!-- Appearance section -->
  ${
    isGmail
      ? `<section>
    <h2>Appearance</h2>
    <p class="help-text">Gmail's own theme is chosen in Gmail. MailShell's other windows follow your Windows setting.</p>
    ${provider.themesUrl ? `<a id="gmail-themes" class="btn-link" href="${provider.themesUrl}">Open Gmail themes</a>` : ''}
  </section>`
      : ''
  }

  ${
    isGmail
      ? `<!-- Gmail Customization section -->
  <section>
    <h2>Gmail Customization</h2>
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; margin: 0;">
      <input type="checkbox" id="gmailCSSEnabled" style="cursor: pointer;" />
      <span>Enable Gmail UI presets</span>
    </label>
    <p class="help-text" style="margin-left: 32px;">Applies CSS improvements for cleaner, more readable Gmail interface</p>
  </section>`
      : ''
  }

  <!-- Updates section -->
  <section>
    <h2>Updates</h2>
    ${
      isGmail
        ? '<label><input type="checkbox" id="autoUpdateStyles" /> <span>Update Gmail styles automatically</span></label><p class="help-text">Checks every 6 hours and applies new styles as soon as they change. No restart needed.</p>'
        : ''
    }
    <label><input type="checkbox" id="autoUpdateApp"${appUpdates ? '' : ' disabled'} /> <span>Update MailShell automatically</span></label>
    <p class="help-text">${appUpdates ? 'Checks every 6 hours. When an update is ready, MailShell asks you to restart.' : 'Available in the Windows installer build only. Other builds still tell you when a new version is out.'}</p>
    <div id="releaseNotice" role="status" hidden style="padding: 12px; border-radius: 4px; margin-bottom: 16px; background-color: var(--ok-bg); color: var(--ok-fg);">
      <p id="releaseText"></p>
      <button id="downloadBtn" type="button">Download</button>
    </div>
    <div>
      <button id="checkUpdatesBtn" type="button">Check for updates now</button>
      <p class="button-desc" id="updateStatus" aria-live="polite"></p>
    </div>
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
    <p class="help-text">MailShell - ${provider.name} Client</p>
    <p class="version" id="version">Version <span></span></p>
  </section>

  <script>
    // IPC communication (from preload)
    const { preferences, app, updates } = window.electron || {};

    if (!preferences || !app) {
      showError('Settings API not available');
    }

    // Load preferences
    async function loadPreferences() {
      try {
        const prefs = await preferences.get();
        const gmailToggle = document.getElementById('gmailCSSEnabled');
        if (gmailToggle) gmailToggle.checked = prefs.gmailCSSEnabled;
        const styleUpdates = document.getElementById('autoUpdateStyles');
        if (styleUpdates) styleUpdates.checked = prefs.autoUpdateStyles !== false;
        const appUpdatesBox = document.getElementById('autoUpdateApp');
        if (appUpdatesBox) appUpdatesBox.checked = !appUpdatesBox.disabled && prefs.autoUpdateApp !== false;
        const service = document.querySelector('input[name="mailProvider"][value="' + prefs.mailProvider + '"]');
        if (service) service.checked = true;
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
    const gmailToggleInput = document.getElementById('gmailCSSEnabled');
    if (gmailToggleInput) gmailToggleInput.addEventListener('change', async (e) => {
      try {
        await preferences.set('gmailCSSEnabled', e.target.checked);
        showSuccess(e.target.checked ? 'Gmail UI presets enabled' : 'Gmail UI presets disabled');
      } catch (error) {
        showError(\`Failed to update Gmail CSS setting: \${error.message}\`);
      }
    });


    // Handle mail service radios (takes effect after a restart)
    const SERVICE_MESSAGES = { gmail: 'Restart MailShell to use Gmail', exchange: 'Restart MailShell to use Exchange / Microsoft 365' };
    document.querySelectorAll('input[name="mailProvider"]').forEach((radio) => {
      radio.addEventListener('change', async (e) => {
        try {
          await preferences.set('mailProvider', e.target.value);
          showSuccess(SERVICE_MESSAGES[e.target.value] || 'Mail service updated');
        } catch (error) {
          showError('Failed to update mail service');
          loadPreferences();
        }
      });
    });

    // Handle clear cache
    document.getElementById('clearCacheBtn').addEventListener('click', async () => {
      if (!confirm('This will clear all cached data and browsing history. Your sign-in will remain active.')) {
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

    // Update settings
    const styleUpdatesToggle = document.getElementById('autoUpdateStyles');
    if (styleUpdatesToggle) styleUpdatesToggle.addEventListener('change', async (e) => {
      try {
        await preferences.set('autoUpdateStyles', e.target.checked);
        showSuccess(e.target.checked ? 'Automatic Gmail style updates on' : 'Automatic Gmail style updates off');
      } catch (error) {
        showError('Failed to update the Gmail style setting');
        loadPreferences();
      }
    });
    const appUpdatesToggle = document.getElementById('autoUpdateApp');
    if (appUpdatesToggle) appUpdatesToggle.addEventListener('change', async (e) => {
      try {
        await preferences.set('autoUpdateApp', e.target.checked);
        showSuccess(e.target.checked ? 'Automatic MailShell updates on' : 'Automatic MailShell updates off');
      } catch (error) {
        showError('Failed to update the MailShell update setting');
        loadPreferences();
      }
    });
    const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
    const updateStatus = document.getElementById('updateStatus');
    checkUpdatesBtn.addEventListener('click', async () => {
      checkUpdatesBtn.disabled = true;
      updateStatus.textContent = 'Checking...';
      try {
        updateStatus.textContent = await updates.checkNow();
      } catch (error) {
        updateStatus.textContent = 'The update check failed.';
      } finally {
        checkUpdatesBtn.disabled = false;
        loadLatestRelease();
      }
    });

    // Show a newer release found by the last check, with a Download button
    async function loadLatestRelease() {
      const notice = document.getElementById('releaseNotice');
      const text = document.getElementById('releaseText');
      try {
        const latest = await updates.latest();
        notice.hidden = !latest;
        if (latest) text.textContent = 'MailShell ' + latest.version + ' is available.';
      } catch (error) {
        notice.hidden = true;
      }
    }
    document.getElementById('downloadBtn').addEventListener('click', async () => {
      try {
        await updates.openDownload();
      } catch (error) {
        showError('Could not open the download page.');
      }
    });

    // Load on startup
    loadPreferences();
    loadVersion();
    loadLatestRelease();
  </script>
</body>
</html>`
}

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
    const themesUrl = provider.themesUrl;
    if (themesUrl && url === themesUrl && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(themesUrl).catch(() => undefined);
      mainWindow.focus();
    }
  });
  settingsWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Load embedded HTML as data URL
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(settingsHtml())}`;

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
