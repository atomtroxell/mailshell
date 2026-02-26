// src/main/index.ts
import { app, BrowserWindow } from 'electron'
import started from 'electron-squirrel-startup'
import { registerIpcHandlers } from './ipc'
import { createMainWindow } from './window'
import { createTray } from './tray'
import { destroyAllViews } from './webviews'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

// Single instance lock — prevent multiple app windows
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  app.on('second-instance', () => {
    // Focus existing window if user tries to open a second instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  // Register IPC handlers before window creation
  registerIpcHandlers()

  app.whenReady().then(() => {
    mainWindow = createMainWindow()
    createTray(mainWindow)

    // macOS: re-create window when dock icon is clicked and no windows are open
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow()
      }
    })
  })

  // Tray keeps the app alive on all platforms.
  // Quit only happens from: tray menu Quit, or OS-level Cmd+Q / Alt+F4.
  app.on('window-all-closed', () => {
    // Do not quit — tray keeps the app alive.
  })

  // Set isQuitting flag and clean up WebContentsViews before quit
  app.on('before-quit', () => {
    const appExt = app as typeof app & { isQuitting: boolean }
    appExt.isQuitting = true
    destroyAllViews()
  })
}
