// src/main/index.ts
// Electron main process entry point

import { app, BrowserWindow, ipcMain } from 'electron'
import started from 'electron-squirrel-startup'
import path from 'path'
import { createWindow, getMainWindow } from './window'
import { setupIPC } from './ipc'
import { validateOAuthConfig } from './auth/oauth-server'
import { setupAppMenu } from './app-menu'

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (started) {
  app.quit()
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
    // Validate OAuth config (logs warnings if missing, but doesn't block startup)
    const oauthConfigValid = validateOAuthConfig()
    if (!oauthConfigValid) {
      console.log('App starting without OAuth credentials. Gmail login may be unavailable.')
    }

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
  }
})

// Export for preload access
export { createWindow, getMainWindow }
