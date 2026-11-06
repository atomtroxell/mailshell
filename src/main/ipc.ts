import { ipcMain, BrowserWindow, session, nativeTheme, type IpcMainInvokeEvent } from 'electron';
import { getRefreshToken, clearRefreshToken } from './auth/token-store';
import { loadPreferences, savePreferences, type Preferences } from './preferences';
import { applyGmailCSS } from './gmail-css';
import { isThemePreference } from './theme-css';
import { decideSender, type SenderPolicy } from './ipc-sender-policy';
import { getSettingsWebContents } from './settings-window';

let mainWindow: BrowserWindow | null = null;

/**
 * Register all IPC handlers for secure communication with renderer process
 * All handlers validate the sender with validateSender (Settings window; the
 * error page for preferences:clearCache only)
 */
export const setupIPC = (window: BrowserWindow): void => {
  mainWindow = window;

  /**
   * Get current access token
   * In Phase 1, we return null (full OAuth flow in Phase 2)
   */
  ipcMain.handle('auth:getAccessToken', async (event) => {
    // Validate sender is the main window
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC call');
    }

    try {
      // Phase 1: Return null (no token exchange yet)
      // Phase 2 will implement token refresh using refresh token
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        return null;
      }

      // TODO: Implement token refresh when access token expires
      // For now, return null to indicate no access token
      return null;
    } catch (error) {
      console.error('Failed to get access token:', (error as Error).message);
      throw new Error('Failed to retrieve access token');
    }
  });

  /**
   * Logout: clear all session data and cookies
   */
  ipcMain.handle('auth:logout', async (event) => {
    // Validate sender is the main window
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC call');
    }

    try {
      // Clear stored refresh token
      clearRefreshToken();

      // Clear session storage (cookies, localStorage)
      const session = mainWindow?.webContents.session;
      if (session) {
        await session.clearStorageData({
          storages: ['cookies', 'localstorage'],
        });
      }
    } catch (error) {
      console.error('Failed to logout:', (error as Error).message);
      throw new Error('Failed to logout');
    }
  });

  /**
   * Get application version
   */
  ipcMain.handle('app:getVersion', (event) => {
    // Validate sender is the main window
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC call');
    }

    try {
      // eslint-disable-next-line global-require
      const version = require('../../package.json').version;
      return version;
    } catch (error) {
      console.error('Failed to get version:', (error as Error).message);
      throw new Error('Failed to retrieve version');
    }
  });

  /**
   * Check if current account is saved (refresh token exists)
   */
  ipcMain.handle('account:isSaved', async (event) => {
    // Validate sender is the main window
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC call');
    }

    try {
      const refreshToken = getRefreshToken();
      return !!refreshToken;
    } catch (error) {
      console.error('Failed to check account status:', (error as Error).message);
      throw new Error('Failed to check account status');
    }
  });

  /**
   * Save current account (confirm credentials are persisted)
   * In this phase, tokens are already saved via OAuth flow
   * This handler serves as confirmation and future expansion point
   */
  ipcMain.handle('account:save', async (event) => {
    // Validate sender is the main window
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC call');
    }

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available. Please authenticate first.');
      }
      // Token already persisted via OAuth flow
    } catch (error) {
      console.error('Failed to save account:', (error as Error).message);
      throw new Error('Failed to save account');
    }
  });

  /**
   * Remove current account (clear stored credentials)
   */
  ipcMain.handle('account:remove', async (event) => {
    // Validate sender is the main window
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC call');
    }

    try {
      // Clear stored refresh token
      clearRefreshToken();

      // Clear session storage (cookies, localStorage)
      const session = mainWindow?.webContents.session;
      if (session) {
        await session.clearStorageData({
          storages: ['cookies', 'localstorage'],
        });
      }

      // Update window title when account is removed
      if (mainWindow) {
        mainWindow.setTitle('Mailshell - Gmail Client');
      }
    } catch (error) {
      console.error('Failed to remove account:', (error as Error).message);
      throw new Error('Failed to remove account');
    }
  });

  /**
   * Update window title (called when account status changes)
   */
  ipcMain.handle('window:setTitle', (event, title: string) => {
    // Validate sender is the main window
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC call');
    }

    if (mainWindow) {
      mainWindow.setTitle(title);
    }
  });

  /**
   * Get current preferences
   */
  ipcMain.handle('preferences:get', async (event) => {
    // Validate sender is the main window
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC call');
    }

    try {
      return await loadPreferences();
    } catch (error) {
      console.error('Failed to load preferences:', (error as Error).message);
      throw new Error('Failed to load preferences');
    }
  });

  /**
   * Set a preference value
   */
  ipcMain.handle('preferences:set', async (event, key: keyof Preferences, value: any) => {
    // Validate sender is the main window
    if (!validateSender(event)) {
      throw new Error('Unauthorized IPC call');
    }

    // Allowlist the theme before anything is loaded or saved
    if (key === 'theme' && !isThemePreference(value)) {
      throw new Error('Invalid theme preference');
    }

    try {
      const prefs = await loadPreferences();
      Object.assign(prefs, { [key]: value });
      await savePreferences(prefs);

      // Apply the CSS presets change to the open Gmail page immediately
      if (key === 'gmailCSSEnabled' && mainWindow) {
        await applyGmailCSS(mainWindow.webContents, value === true);
      }

      // Theme: drive nativeTheme. The window.ts 'updated' listener owns the
      // window background colour. Gmail itself is not styled (use Gmail's theme).
      if (key === 'theme' && isThemePreference(value)) {
        nativeTheme.themeSource = value;
      }
    } catch (error) {
      console.error('Failed to set preference:', (error as Error).message);
      throw new Error('Failed to set preference');
    }
  });

  /**
   * Clear browser cache and session storage
   */
  ipcMain.handle('preferences:clearCache', async (event) => {
    // Validate sender is the main window
    // The error page's Clear cache button is the only main-window caller allowed
    if (!validateSender(event, 'settings-or-error-page')) {
      throw new Error('Unauthorized IPC call');
    }

    try {
      // Get the persistent session used for Gmail
      const gshellSession = session.fromPartition('persist:gshell');
      await gshellSession.clearCache();
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', (error as Error).message);
      return false;
    }
  });
};

/**
 * Validate the sender of an IPC call. Allowed callers: the Settings window
 * (all channels) and the main window's data: error page (clearCache only,
 * via the 'settings-or-error-page' policy). Gmail is always rejected.
 * Never log the frame URL; only the fixed reason code.
 */
function validateSender(event: IpcMainInvokeEvent, policy: SenderPolicy = 'settings-only'): boolean {
  const decision = decideSender(
    event,
    {
      settingsContents: getSettingsWebContents(),
      mainContents: mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents : null,
    },
    policy
  );
  if (decision !== 'ok') {
    console.warn('Rejected IPC sender:', decision);
    return false;
  }
  return true;
}
