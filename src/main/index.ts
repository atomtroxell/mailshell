// src/main/index.ts
// Electron main process entry point

import { app, BrowserWindow } from 'electron'
import started from 'electron-squirrel-startup'
import { createWindow, getMainWindow, showMainWindow } from './window'
import { setupIPC } from './ipc'
import { setupAppMenu } from './app-menu'
import { markQuitting } from './tray'

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (started) {
  app.quit()
}

// One MailShell at a time. A second launch (for example from the Start menu
// while the app sits in the tray) brings the running window back instead.
if (!app.requestSingleInstanceLock()) {
  app.quit()
}
app.on('second-instance', () => showMainWindow())

// Let the window close for real when the app quits (see tray.ts)
app.on('before-quit', () => markQuitting())

// Windows toast notifications take their name and icon from the app's
// AppUserModelID. Use the ID the Squirrel installer gives the Start Menu
// shortcut (com.squirrel.mailshell.mailshell), so toasts say "MailShell" with its icon
// in dev runs too. Without this, a dev run registers as electron.app.Electron.
// Must run before any notification is shown.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.mailshell.app') // matches the installer's shortcut (electron-builder appId)
}

// Security: Enforce ASAR integrity and disable renderer node integration
if (!app.isPackaged) {
  // In development, load from dev server
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'
}

// Main process initialization
let mainWindow: BrowserWindow | null = null

// Create window when app is ready
app.on('ready', async () => {
  try {

    mainWindow = await createWindow()
    if (mainWindow) {
      setupIPC(mainWindow)
      setupAppMenu(mainWindow)
    }
  } catch (error) {
    console.error('Failed to initialize app:', (error as Error).message)
    app.quit()
  }
})

// Quit when all windows are closed (standard Windows/Linux behavior)
// On macOS, keep app running when all windows closed (user can cmd+Q to quit)
app.on('window-all-closed', () => {
  // Only quit on Windows/Linux; macOS apps stay running
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Re-create window when dock icon is clicked (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else {
    showMainWindow()
  }
})

// Export for preload access
export { createWindow, getMainWindow }
