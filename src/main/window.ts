// src/main/window.ts
import { BrowserWindow, app } from 'electron'
import path from 'path'
import { store } from './store'

// Keep in sync with titleBarOverlay.height and CSS .tab-bar height
export const TAB_BAR_HEIGHT = 40

// Forge Vite injects these at build time
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string
declare const MAIN_WINDOW_VITE_NAME: string

const isMac = process.platform === 'darwin'

function getPreloadPath(): string {
  // In dev, Forge outputs preload to .vite/build/shell.js (by entry basename)
  // In production, same path relative to app root
  return path.join(app.getAppPath(), '.vite/build/shell.js')
}

function saveWindowState(win: BrowserWindow): void {
  if (win.isDestroyed()) return
  const bounds = win.getBounds()
  store.set('windowState', {
    ...bounds,
    isMaximized: win.isMaximized(),
  })
}

export function createMainWindow(): BrowserWindow {
  const savedState = store.get('windowState')

  const win = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    minWidth: 800,
    minHeight: 600,
    title: 'Mailshell',
    show: false, // show after ready-to-show to prevent flash
    // On all platforms, titleBarStyle: 'hidden' hides the default title bar
    // but preserves native controls. On Windows/Linux, titleBarOverlay restores
    // the native minimize/maximize/close buttons as an overlay in the drag region.
    // frame: false is NOT used — it removes all native chrome including the overlay.
    titleBarStyle: 'hidden' as const,
    ...(isMac
      ? {
          trafficLightPosition: { x: 12, y: 12 },
        }
      : {
          titleBarOverlay: {
            color: '#1a1a1a',
            symbolColor: '#e0e0e0',
            height: TAB_BAR_HEIGHT,
          },
        }),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false,
      sandbox: true,
      preload: getPreloadPath(),
    },
  })

  // Restore maximized state
  if (savedState.isMaximized) {
    win.maximize()
  }

  // Show window without flash
  win.once('ready-to-show', () => {
    win.show()
  })

  // Save window state on close
  win.on('close', () => {
    saveWindowState(win)
  })

  // Load the renderer
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(
      path.join(app.getAppPath(), `.vite/renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    )
  }

  return win
}
