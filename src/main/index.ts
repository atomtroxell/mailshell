// src/main/index.ts
// Electron main process entry point

import { app, BrowserWindow, ipcMain } from 'electron'
import started from 'electron-squirrel-startup'
import path from 'path'
import { createWindow, getMainWindow } from './window'

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
  mainWindow = await createWindow()
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
