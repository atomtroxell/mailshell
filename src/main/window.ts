// src/main/window.ts
// BrowserWindow creation with persistent session partition for the mail app

import { BrowserWindow, app, dialog, nativeImage, net, nativeTheme, shell, type WebContents } from 'electron'
import path from 'path'
import fs from 'fs'
import { provider } from './providers'
import { openAttachment } from './attachment-open'
import { showErrorPage, classifyLoadError, sanitizeUrlForLog, NET_ERROR } from './error-page'
import { loadPreferences } from './preferences'
import { darkAwareBackground, isThemePreference } from './theme-css'
import { renderBadgePng } from './unread-count'
import { notifyNewMail } from './notify'
import { createTray, isQuitting, setTrayUnread } from './tray'

// Global reference to the main window
let mainWindow: BrowserWindow | null = null
// Guards against stacking not-responding dialogs
let unresponsiveDialogOpen = false
// The nativeTheme 'updated' listener is registered once for the app lifetime
let themeListenerRegistered = false
// Last effective dark state seen, so high-contrast/inverted changes are ignored
let lastDark: boolean | null = null
// How often a provider's unreadScript is run (providers without a count in the title)
const UNREAD_POLL_MS = 5000

/**
 * Get the preload script path.
 * Forge Vite outputs preload to .vite/build/shell.js
 */
/**
 * Preload for a window. The Settings window gets the full settings bridge
 * (shell.js). The main window gets only the error-page bridge (error.js),
 * because Gmail runs in that window.
 */
function getPreloadPath(name: 'shell.js' | 'error.js' = 'shell.js'): string {
  return path.join(app.getAppPath(), '.vite/build', name)
}

/**
 * Show the unread count on the app's icon. Each OS has its own mechanism:
 * Windows: a small overlay on the taskbar button (drawn in unread-count.ts)
 * macOS: the number on the Dock icon
 * Linux: the launcher count, which only some desktop environments show
 */
function setUnreadBadge(win: BrowserWindow, count: number): void {
  const shown = Math.max(0, Math.floor(count))
  try {
    if (process.platform === 'win32') {
      const png = renderBadgePng(shown)
      if (png) {
        win.setOverlayIcon(nativeImage.createFromBuffer(png), `${shown} unread`)
      } else {
        win.setOverlayIcon(null, '')
      }
    } else if (process.platform === 'darwin') {
      app.dock?.setBadge(shown > 0 ? String(shown) : '')
    } else {
      app.setBadgeCount(shown)
    }
  } catch (error) {
    console.error('Failed to update unread badge:', error)
  }
}

/**
 * Window icon. Windows uses the .ico; Linux needs a PNG (macOS takes its icon
 * from the app bundle, so the PNG is harmless there). In a packaged build the
 * icons ship as extraResources (see forge.config.ts) and sit in the resources
 * root; in development they are read from the project folder.
 */
function windowIconPath(): string {
  const file = process.platform === 'win32' ? 'icon.ico' : 'icon-256.png'
  return app.isPackaged
    ? path.join(process.resourcesPath, file)
    : path.join(app.getAppPath(), 'assets/icons', file)
}

// Hosts that stay inside MailShell: the provider's sign-in and its own pop-outs
function isInAppUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return provider.inAppHosts.some((domain) => host === domain || host.endsWith('.' + domain))
  } catch {
    return false
  }
}

/**
 * For providers with federated sign-in (Exchange): while the window is on a
 * sign-in page, the organization's sign-in host is not on the fixed list, so any
 * https address stays in the window until the mail app is reached.
 */
function isSignInFlow(contents: WebContents, target: string): boolean {
  if (!provider.federatedSignIn) return false
  const current = contents.getURL()
  if (!current.startsWith('https://') || provider.isMailPage(current)) return false
  return target.startsWith('https://')
}

/** Open a web link in the user's default browser. Other schemes are ignored. */
function openExternalIfWeb(url: string): void {
  try {
    const { protocol } = new URL(url)
    if (protocol === 'https:' || protocol === 'http:') {
      shell.openExternal(url).catch((error) => console.error('Failed to open link:', error))
    }
  } catch {
    // Not a parseable URL: nothing to open
  }
}

/**
 * Create the main BrowserWindow with persistent session partition.
 *
 * The 'persist:mailshell' partition enables automatic session storage
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
    // Menu bar stays hidden until Alt is pressed; shortcuts still work
    autoHideMenuBar: true,
    icon: windowIconPath(),
    backgroundColor: darkAwareBackground(nativeTheme.shouldUseDarkColors),
    webPreferences: {
      // Persistent partition: CRITICAL for session persistence
      // Must start with 'persist:' for Electron to treat it as persistent
      partition: 'persist:mailshell',
      // Narrow preload: the error page's clear-cache call only (see error.ts)
      preload: getPreloadPath('error.js'),
      // Security: Context isolation separates renderer and Node.js contexts
      contextIsolation: true,
      // Security: Disable node integration in renderer
      nodeIntegration: false,
      // Security: OS-level process sandbox
      sandbox: true,
    },
  })

  // Set initial window title with app branding
  mainWindow.setTitle(`MailShell - ${provider.name} Client`)

  // Show window when content is ready (prevents visual flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Closing the window hides it to the tray, so the app keeps running for
  // notifications. Quitting (tray menu, Exit, Cmd+Q) closes it for real.
  mainWindow.on('close', (event) => {
    if (isQuitting()) return
    event.preventDefault()
    mainWindow?.hide()
  })

  createTray(showMainWindow)

  const contents = mainWindow.webContents

  // Google sign-in and Gmail's own pop-outs stay in the app. Any other web
  // link opens in the user's default browser.
  contents.setWindowOpenHandler(({ url }) => {
    // Attachment links never open as a window from here. attachment-open.ts
    // checks the file type, then shows PDFs and images in its own locked
    // viewer window and downloads everything else.
    if (provider.isAttachmentUrl(url)) {
      void openAttachment(contents, url)
      return { action: 'deny' }
    }
    if (url === 'about:blank' || isInAppUrl(url) || isSignInFlow(contents, url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { icon: windowIconPath() } }
    }
    openExternalIfWeb(url)
    return { action: 'deny' }
  })

  // Save downloads straight to the Downloads folder (no save dialog), keeping
  // the name and adding "(2)" etc. rather than overwriting an existing file
  contents.session.on('will-download', (_event, item) => {
    const dir = app.getPath('downloads')
    const ext = path.extname(item.getFilename())
    const base = path.basename(item.getFilename(), ext)
    let target = path.join(dir, item.getFilename())
    for (let n = 2; fs.existsSync(target); n++) {
      target = path.join(dir, `${base} (${n})${ext}`)
    }
    item.setSavePath(target)
    item.once('done', (_e, state) => {
      console.info('Download finished:', state, path.basename(target))
    })
  })

  // A link that would navigate the main window to another site opens in the browser
  contents.on('will-navigate', (event, url) => {
    if (isInAppUrl(url) || url.startsWith('data:') || isSignInFlow(contents, url)) return
    event.preventDefault()
    openExternalIfWeb(url)
  })

  // Alt alone toggles the auto-hidden menu bar. Electron's built-in Alt
  // handling does not fire reliably while the page has focus.
  contents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyUp' && input.key === 'Alt' && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setMenuBarVisibility(!mainWindow.isMenuBarVisible())
      console.info('Menu bar toggled by Alt')
    }
  })

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
    await applyPageLook(contents)
    provider.onPageChange(contents)
  })

  // Unread count. The provider reads it from the page title (Gmail), or from its
  // unreadScript on a timer when the title has no count (Outlook services). A
  // null reading keeps the last count. Leaving the mail app (sign-in pages)
  // clears the badge and forgets the count, so returning does not notify again.
  // null = count not known yet (first read after start, or after leaving the mail app).
  let unreadCount: number | null = null
  const leaveMail = (win: BrowserWindow): void => {
    if (unreadCount !== null) {
      unreadCount = null
      setUnreadBadge(win, 0)
      setTrayUnread(0)
    }
  }
  const applyUnread = (win: BrowserWindow, next: number | null): void => {
    if (next === null) return
    const previous = unreadCount
    unreadCount = next
    // Set on every reading, not only on change: Windows can drop the taskbar overlay
    setUnreadBadge(win, next)
    if (next !== previous) setTrayUnread(next)
    // New mail while the window is in the background: tell the user
    if (previous !== null && next > previous && !win.isFocused()) {
      void notifyNewMail(win, next - previous)
    }
  }
  // Windows drops the taskbar badge when the window is hidden to the tray, so
  // show the current count again whenever the window comes back
  const reapplyBadge = (): void => {
    if (mainWindow && !mainWindow.isDestroyed() && unreadCount !== null) setUnreadBadge(mainWindow, unreadCount)
  }
  mainWindow.on('show', () => {
    reapplyBadge()
    // The taskbar button can appear a moment after the window is shown
    setTimeout(reapplyBadge, 300)
  })
  mainWindow.on('restore', reapplyBadge)
  contents.on('page-title-updated', (_event, title) => {
    const win = mainWindow
    if (!win || win.isDestroyed()) return
    if (!provider.isMailPage(contents.getURL())) {
      leaveMail(win)
      return
    }
    applyUnread(win, provider.parseUnread(title))
  })

  // Providers without a count in the title read it from the page on a timer
  const unreadScript = provider.unreadScript
  if (unreadScript) {
    const timer = setInterval(async () => {
      const win = mainWindow
      if (!win || win.isDestroyed() || contents.isDestroyed()) return
      if (!provider.isMailPage(contents.getURL())) {
        leaveMail(win)
        return
      }
      try {
        const raw: unknown = await contents.executeJavaScript(unreadScript)
        applyUnread(win, typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : null)
      } catch {
        // Page busy or navigating: keep the last count
      }
    }, UNREAD_POLL_MS)
    contents.once('destroyed', () => clearInterval(timer))
  }

  // The mail app may change threads with an in-page navigation (no full load)
  contents.on('did-navigate-in-page', () => {
    provider.onPageChange(contents)
  })

  // Provider-specific watchers, such as following the open thread
  provider.watchWindow(contents)

  // Follow theme changes (preference or OS) once, for whichever window is current
  if (!themeListenerRegistered) {
    themeListenerRegistered = true
    nativeTheme.on('updated', () => {
      const dark = nativeTheme.shouldUseDarkColors
      if (dark === lastDark) return
      lastDark = dark
      if (!mainWindow || mainWindow.isDestroyed()) return
      const win = mainWindow
      win.setBackgroundColor(darkAwareBackground(dark))
      void loadPreferences().then((prefs) => provider.applyTheme(win.webContents, prefs))
    })
  }

  // Load the mail app (rejection ignored: did-fail-load owns the UI). The
  // provider's start page goes straight to sign-in when signed out.
  mainWindow.loadURL(provider.startUrl).catch(() => undefined)

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle unresponsive renderer: ask the user instead of force-crashing
  contents.on('unresponsive', () => {
    console.warn(`${provider.name} became unresponsive`)
    if (unresponsiveDialogOpen || !mainWindow || mainWindow.isDestroyed()) return
    unresponsiveDialogOpen = true
    const win = mainWindow
    dialog
      .showMessageBox(win, {
        type: 'warning',
        buttons: ['Wait', `Reload ${provider.name}`],
        defaultId: 0,
        cancelId: 0,
        title: `${provider.name} is not responding`,
        message: `${provider.name} is not responding.`,
        detail: `Wait for it to recover, or reload ${provider.name}. Unsaved drafts may be lost if you reload.`,
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
    console.info(`${provider.name} is responsive again`)
  })

  // Handle crashed or killed renderer ('crashed' event no longer exists in Electron)
  contents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details.reason)
    if (details.reason === 'clean-exit') return
    if (mainWindow && !mainWindow.isDestroyed()) showErrorPage(mainWindow, 'crash')
  })

  return mainWindow
}

/** Apply the provider's presets and theme to one mail page. */
async function applyPageLook(contents: WebContents): Promise<void> {
  try {
    const prefs = await loadPreferences()
    await provider.applyLook(contents, prefs)
  } catch (error) {
    console.error('Failed to load preferences for CSS injection:', error)
  }
}

// Compose windows are kept here: Electron closes a window that nothing references
const composeWindows = new Set<BrowserWindow>()

/**
 * Open a compose screen (from a mailto: link) in its own window. Each link
 * gets a new window, so a draft already open elsewhere is never replaced.
 * Returns false when the app is not ready yet.
 */
export function openCompose(composeUrl: string): boolean {
  if (!app.isReady()) return false

  const win = new BrowserWindow({
    width: 900,
    height: 760,
    minWidth: 600,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    icon: windowIconPath(),
    title: 'MailShell - Compose',
    backgroundColor: darkAwareBackground(nativeTheme.shouldUseDarkColors),
    webPreferences: {
      // Same session as the main window, so the same Google sign-in applies.
      // No preload: this window gets no bridge to the app.
      partition: 'persist:mailshell',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  composeWindows.add(win)
  win.once('closed', () => composeWindows.delete(win))
  win.once('ready-to-show', () => win.show())

  const contents = win.webContents

  // The same link rules as the main window
  contents.setWindowOpenHandler(({ url }) => {
    if (provider.isAttachmentUrl(url)) {
      void openAttachment(contents, url)
      return { action: 'deny' }
    }
    if (url === 'about:blank' || isInAppUrl(url) || isSignInFlow(contents, url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { icon: windowIconPath() } }
    }
    openExternalIfWeb(url)
    return { action: 'deny' }
  })
  contents.on('will-navigate', (event, url) => {
    if (isInAppUrl(url) || url.startsWith('data:') || isSignInFlow(contents, url)) return
    event.preventDefault()
    openExternalIfWeb(url)
  })
  contents.on('dom-ready', () => {
    if (contents.getURL().startsWith('data:')) return
    void applyPageLook(contents)
  })

  // Close the window once Gmail leaves the compose screen: after Send, after
  // Discard, or when the user moves on. The window must have shown compose
  // first, so the sign-in page does not close it.
  let sawCompose = false
  const checkLeftCompose = () => {
    if (win.isDestroyed()) return
    const current = contents.getURL()
    if (!provider.isMailPage(current)) return
    if (provider.isComposeScreen(current)) {
      sawCompose = true
    } else if (sawCompose) {
      win.close()
    }
  }
  contents.on('did-navigate', checkLeftCompose)
  contents.on('did-navigate-in-page', checkLeftCompose)

  win.loadURL(composeUrl).catch(() => undefined)
  return true
}

/** Bring the main window back from the tray (or the background). */
export function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.show()
  mainWindow.focus()
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
