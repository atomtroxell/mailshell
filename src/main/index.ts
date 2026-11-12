// src/main/index.ts
// Electron main process entry point

import { app, BrowserWindow } from 'electron'
import started from 'electron-squirrel-startup'
import { createWindow, getMainWindow, openCompose, showMainWindow } from './window'
import { composeUrlFromMailto, findMailtoArg } from './mailto'
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
// A mailto: link opens Gmail's compose screen. The link arrives on the command
// line (Windows, Linux, and a second launch) or as an open-url event (macOS).
// If the window is not ready yet, the link waits for it.
let pendingMailto: string | null = findMailtoArg(process.argv)

function handleMailto(url: string): void {
  const compose = composeUrlFromMailto(url)
  if (!compose) {
    showMainWindow()
    return
  }
  if (!openCompose(compose)) pendingMailto = url
}

app.on('second-instance', (_event, argv) => {
  const mailto = findMailtoArg(argv)
  if (mailto) handleMailto(mailto)
  else showMainWindow()
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  handleMailto(url)
})

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

    const launchCompose = pendingMailto ? composeUrlFromMailto(pendingMailto) : null
    pendingMailto = null
    mainWindow = await createWindow(launchCompose)
    // A link that arrived while the window was starting
    if (pendingMailto) {
      const late = pendingMailto
      pendingMailto = null
      handleMailto(late)
    }
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
