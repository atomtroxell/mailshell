// src/main/index.ts
// Electron main process entry point

import { app, BrowserWindow } from 'electron'
import started from 'electron-squirrel-startup'
import { createWindow, getMainWindow, openCompose, showMainWindow } from './window'
import { findMailtoArg, parseMailto } from './mailto'
import { provider, selectProvider } from './providers'
import { loadPreferences } from './preferences'
import { setupIPC } from './ipc'
import { setupAppMenu } from './app-menu'
import { markQuitting } from './tray'
import { loadCachedGmailStyles } from './gmail-styles'
import { applyUpdateSettings } from './updates'
import { showWhatsNewIfUpdated } from './whats-new'

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (started) {
  app.quit()
}

// One MailShell at a time. A second launch (for example from the Start menu
// while the app sits in the tray) brings the running window back instead.
if (!app.requestSingleInstanceLock()) {
  app.quit()
}
// A mailto: link opens the mail app's compose screen. The link arrives on the command
// line (Windows, Linux, and a second launch) or as an open-url event (macOS).
// If the window is not ready yet, the link waits for it.
let pendingMailto: string | null = findMailtoArg(process.argv)

function handleMailto(url: string): void {
  const fields = parseMailto(url)
  const compose = fields ? provider.composeUrl(fields) : null
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

// Windows toast notifications and the taskbar button take their name and icon from the
// app's AppUserModelID, which Windows matches to a shortcut with the same ID. The installer
// sets that ID on MailShell's Start Menu and desktop shortcuts (build/installer.nsh,
// customInstall). Only the installed app sets it. Dev runs must not: they show Electron's
// icon, and that icon stuck to com.mailshell.app on the taskbar, so the installed app lost its icon.
// Must run before any notification is shown.
if (process.platform === 'win32' && app.isPackaged) {
  app.setAppUserModelId('com.mailshell.desktop') // must match build/installer.nsh
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

    // No saved choice yet (or an unknown one): the window shows the chooser instead
    const prefs = await loadPreferences()
    const hasChoice = prefs.mailProvider === 'gmail' || prefs.mailProvider === 'exchange'
    selectProvider(prefs.mailProvider)
    // Use the last good Gmail styles downloaded earlier, if any, before the first page loads
    await loadCachedGmailStyles()
    mainWindow = await createWindow({ chooser: !hasChoice })
    // A mailto: link that arrived before the app was ready opens its own compose window
    if (pendingMailto) {
      const early = pendingMailto
      pendingMailto = null
      handleMailto(early)
    }
    if (mainWindow) {
      setupIPC(mainWindow)
      setupAppMenu(mainWindow)
      applyUpdateSettings(prefs)
      // Show the "What's new" popup once, after the first page has loaded
      const win = mainWindow
      const showNotice = (): void => {
        showWhatsNewIfUpdated(win, prefs).catch((error: Error) =>
          console.error("What's new notice failed:", error.message),
        )
      }
      if (win.webContents.isLoading()) win.webContents.once('did-finish-load', showNotice)
      else showNotice()
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
