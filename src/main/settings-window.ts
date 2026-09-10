import { BrowserWindow, app } from 'electron';
import path from 'path';

let settingsWindow: BrowserWindow | null = null;

function getPreloadPath(): string {
  return path.join(app.getAppPath(), '.vite/build/shell.js');
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
    height: 600,
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

  // Load URL - use file:// protocol with app path
  const htmlPath = app.isPackaged
    ? path.join(app.getAppPath(), 'dist', 'index.html')
    : path.join(app.getAppPath(), '.vite', 'build', 'index.html');

  const url = `file://${htmlPath}#/settings`;

  await settingsWindow.loadURL(url);

  settingsWindow.show();

  // Clean up reference when window closes
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
};

/**
 * Close settings window if open
 */
export const closeSettingsWindow = (): void => {
  if (settingsWindow) {
    settingsWindow.close();
  }
};
