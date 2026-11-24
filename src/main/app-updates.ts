// MailShell's own updates, through electron-updater and the project's GitHub
// releases. Only the Windows installer build can update itself for now: the Mac
// build is not signed (macOS will not apply unsigned updates) and the Linux
// AppImage is not wired up yet.

import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

export const appUpdatesSupported = (): boolean => app.isPackaged && process.platform === 'win32';

let configured = false;

function configure(): void {
  if (configured) return;
  configured = true;
  autoUpdater.autoDownload = true;
  // If the user chooses "Later", the update is installed the next time they quit
  autoUpdater.autoInstallOnAppQuit = true;
  // Releases are marked as pre-releases during the beta
  autoUpdater.allowPrerelease = true;
  autoUpdater.logger = console;
  autoUpdater.on('error', (error) => console.error('App update error:', error.message));
  autoUpdater.on('update-downloaded', (info) => {
    void askToRestart(info.version);
  });
}

async function askToRestart(version: string): Promise<void> {
  const parent = BrowserWindow.getAllWindows()[0];
  const options = {
    type: 'info' as const,
    buttons: ['Restart now', 'Later'],
    defaultId: 0,
    cancelId: 1,
    message: `MailShell ${version} is ready to install.`,
    detail: 'Restart MailShell to install it now. If you choose Later, it installs the next time you quit.',
  };
  const { response } = parent && !parent.isDestroyed()
    ? await dialog.showMessageBox(parent, options)
    : await dialog.showMessageBox(options);
  if (response === 0) autoUpdater.quitAndInstall();
}

/**
 * Check GitHub for a newer MailShell. A newer version downloads in the
 * background and then asks the user to restart. Returns a line for the Settings window.
 */
export async function checkForAppUpdate(): Promise<string> {
  if (!appUpdatesSupported()) {
    return 'App updates are available in the Windows installer build only.';
  }
  configure();
  const result = await autoUpdater.checkForUpdates();
  const latest = result?.updateInfo.version;
  if (!latest || latest === app.getVersion()) return 'MailShell is up to date.';
  return `MailShell ${latest} is available and downloading.`;
}
