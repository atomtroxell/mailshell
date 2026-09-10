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

  // Load URL - in dev mode use Vite dev server, in production use built files
  let url: string;
  if (process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Dev mode: load from Vite dev server
    url = `${process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL}#/settings`;
  } else {
    // Production: load from built files
    const htmlPath = path.join(app.getAppPath(), '.vite/renderer/main_window/index.html');
    url = `file://${htmlPath}#/settings`;
  }

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
