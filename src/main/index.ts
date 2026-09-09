// src/main/index.ts
// Electron main process entry point

import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import started from 'electron-squirrel-startup'
import path from 'path'
import { createWindow, getMainWindow } from './window'
import { setupIPC } from './ipc'
import { validateOAuthConfig } from './auth/oauth-server'
import { setupAccountManager, handleSaveAccount, handleRemoveAccount } from './account-manager'

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
      setupAccountManager(mainWindow)

      // Register keyboard shortcuts for account management
      globalShortcut.register('Ctrl+Shift+S', () => {
        handleSaveAccount(mainWindow!).catch(err => console.error('Save failed:', err))
      })

      globalShortcut.register('Ctrl+Shift+D', () => {
        handleRemoveAccount(mainWindow!).catch(err => console.error('Remove failed:', err))
      })
    }
  } catch (error) {
    console.error('Failed to initialize app:', (error as Error).message)
    app.quit()
  }
})

// Unregister shortcuts on quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// Quit when all windows are closed (standard Windows/Linux behavior)
app.on('window-all-closed', () => {
  app.quit()
})

// Re-create window when dock icon is clicked (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Export for preload access
export { createWindow, getMainWindow }
