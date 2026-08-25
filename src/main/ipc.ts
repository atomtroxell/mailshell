import { ipcMain, BrowserWindow } from 'electron';
import { getRefreshToken, clearRefreshToken } from './auth/token-store';

let mainWindow: BrowserWindow | null = null;

/**
 * Register all IPC handlers for secure communication with renderer process
 * All handlers validate that requests come from the main window
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
};

/**
 * Validate that an IPC event came from the main window
 * Prevents malicious scripts from other windows from accessing IPC handlers
 */
function validateSender(event: any): boolean {
  if (!mainWindow) {
    return false;
  }

  // Check that the event came from the main window's main frame
  return event.senderFrame === mainWindow.webContents.mainFrame;
}
