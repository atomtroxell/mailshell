// src/main/window.ts
// BrowserWindow creation with persistent session partition for Gmail

import { BrowserWindow, app } from 'electron'
import path from 'path'
import { applyGmailCSS } from './gmail-css'
import { loadPreferences } from './preferences'

// Global reference to the main window
let mainWindow: BrowserWindow | null = null

/**
 * Get the preload script path.
 * Forge Vite outputs preload to .vite/build/shell.js
 */
function getPreloadPath(): string {
  return path.join(app.getAppPath(), '.vite/build/shell.js')
}

/**
 * Create the main BrowserWindow with persistent session partition.
 *
 * The 'persist:gshell' partition enables automatic session storage
 * (cookies, localStorage, cache) across app restarts. When the user
 * logs into Gmail once, the session persists until they explicitly
 * log out.
 */
export async function createWindow(): Promise<BrowserWindow> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready-to-show
    webPreferences: {
      // Persistent partition: CRITICAL for session persistence
      // Must start with 'persist:' for Electron to treat it as persistent
      partition: 'persist:gshell',
      // Preload script for secure IPC
      preload: getPreloadPath(),
      // Security: Context isolation separates renderer and Node.js contexts
      contextIsolation: true,
      // Security: Disable node integration in renderer
      nodeIntegration: false,
      // Security: OS-level process sandbox
      sandbox: true,
    },
  })

  // Set initial window title with app branding
  mainWindow.setTitle('Mailshell - Gmail Client')

  // Show window when content is ready (prevents visual flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Load Gmail
  mainWindow.loadURL('https://mail.google.com')

  // Apply CSS presets on every page load (dom-ready fires again after a
  // reload or full navigation, and inserted CSS is dropped by navigation)
  const contents = mainWindow.webContents
  contents.on('dom-ready', async () => {
    try {
      const prefs = await loadPreferences()
      // gmailCSSEnabled defaults to true if not set
      await applyGmailCSS(contents, prefs.gmailCSSEnabled !== false)
    } catch (error) {
      console.error('Failed to load preferences for CSS injection:', error)
    }
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle unresponsive renderer
  mainWindow.webContents.on('unresponsive', () => {
    console.warn('Window became unresponsive, offering reload...')
    mainWindow?.webContents.forcefullyCrashRenderer()
  })

  // Handle crashed or killed renderer ('crashed' event no longer exists in Electron)
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details.reason)
  })

  return mainWindow
}

/**
 * Get the main window instance.
 * Throws error if window is not initialized.
 */
export function getMainWindow(): BrowserWindow {
  if (!mainWindow) {
    throw new Error('Main window not initialized')
  }
  return mainWindow
}
