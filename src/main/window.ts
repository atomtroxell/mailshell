// src/main/window.ts
// BrowserWindow creation with persistent session partition for Gmail

import { BrowserWindow, app, dialog, net, nativeTheme } from 'electron'
import path from 'path'
import { applyGmailCSS } from './gmail-css'
import { showErrorPage, classifyLoadError, sanitizeUrlForLog, NET_ERROR } from './error-page'
import { loadPreferences } from './preferences'
import { applyGmailDark, darkAwareBackground, isThemePreference } from './gmail-dark'

// Global reference to the main window
let mainWindow: BrowserWindow | null = null
// Guards against stacking not-responding dialogs
let unresponsiveDialogOpen = false
// The nativeTheme 'updated' listener is registered once for the app lifetime
let themeListenerRegistered = false
// Last effective dark state seen, so high-contrast/inverted changes are ignored
let lastDark: boolean | null = null

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
  // Apply the saved theme before any window exists so a Dark preference
  // does not flash white. Invalid stored values fall back to 'system'.
  const startupPrefs = await loadPreferences()
  if (isThemePreference(startupPrefs.theme)) {
    nativeTheme.themeSource = startupPrefs.theme
  } else {
    nativeTheme.themeSource = 'system'
    console.warn('Invalid theme preference; using system')
  }
  console.info('Theme source:', nativeTheme.themeSource)
  lastDark = nativeTheme.shouldUseDarkColors

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready-to-show
    backgroundColor: darkAwareBackground(nativeTheme.shouldUseDarkColors),
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

  const contents = mainWindow.webContents

  // Main-frame load failures show the error page. Subframes, aborted
  // navigations (redirects) and the error page itself are ignored.
  contents.on('did-fail-load', (_event, errorCode, _errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return
    if (errorCode === NET_ERROR.ABORTED) return
    if (validatedURL.startsWith('data:')) return
    console.error('Main frame load failed:', errorCode, sanitizeUrlForLog(validatedURL))
    if (mainWindow) showErrorPage(mainWindow, classifyLoadError(errorCode, net.isOnline()), errorCode)
  })

  // Apply CSS presets on every page load (dom-ready fires again after a
  // reload or full navigation, and inserted CSS is dropped by navigation)
  contents.on('dom-ready', async () => {
    if (contents.getURL().startsWith('data:')) return
    try {
      const prefs = await loadPreferences()
      // gmailCSSEnabled defaults to true if not set
      await applyGmailCSS(contents, prefs.gmailCSSEnabled !== false)
    } catch (error) {
      console.error('Failed to load preferences for CSS injection:', error)
    }
    // Dark layer is independent of the presets; never throws
    await applyGmailDark(contents, nativeTheme.shouldUseDarkColors)
  })

  // Follow theme changes (preference or OS) once, for whichever window is current
  if (!themeListenerRegistered) {
    themeListenerRegistered = true
    nativeTheme.on('updated', () => {
      const dark = nativeTheme.shouldUseDarkColors
      if (dark === lastDark) return
      lastDark = dark
      if (!mainWindow || mainWindow.isDestroyed()) return
      mainWindow.setBackgroundColor(darkAwareBackground(dark))
      void applyGmailDark(mainWindow.webContents, dark)
    })
  }

  // Load Gmail (rejection ignored: did-fail-load owns the UI)
  mainWindow.loadURL('https://mail.google.com').catch(() => undefined)

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle unresponsive renderer: ask the user instead of force-crashing
  contents.on('unresponsive', () => {
    console.warn('Gmail became unresponsive')
    if (unresponsiveDialogOpen || !mainWindow || mainWindow.isDestroyed()) return
    unresponsiveDialogOpen = true
    const win = mainWindow
    dialog
      .showMessageBox(win, {
        type: 'warning',
        buttons: ['Wait', 'Reload Gmail'],
        defaultId: 0,
        cancelId: 0,
        title: 'Gmail is not responding',
        message: 'Gmail is not responding.',
        detail: 'Wait for it to recover, or reload Gmail. Unsaved drafts in Gmail may be lost if you reload.',
      })
      .then(({ response }) => {
        if (response === 1 && !win.isDestroyed()) win.webContents.reload()
      })
      .catch((e) => console.error('Not-responding dialog failed:', e))
      .finally(() => {
        unresponsiveDialogOpen = false
      })
  })

  contents.on('responsive', () => {
    console.info('Gmail is responsive again')
  })

  // Handle crashed or killed renderer ('crashed' event no longer exists in Electron)
  contents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details.reason)
    if (details.reason === 'clean-exit') return
    if (mainWindow && !mainWindow.isDestroyed()) showErrorPage(mainWindow, 'crash')
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
