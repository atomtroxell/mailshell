// src/main/shortcuts.ts
// Shell-level keyboard shortcut interceptor using before-input-event.
// Uses before-input-event (NOT globalShortcut) — scoped to focused webContents,
// does not fire when the app is backgrounded.

import { WebContents, BrowserWindow } from 'electron'
import type { ShortcutAction, ShortcutMap } from '@shared/ipc-types'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { store } from './store'
import { getViewPool } from './webviews'

// Callback registry — avoids circular import between shortcuts.ts and webviews.ts.
// webviews.ts calls notifyNewView() after creating each view; shortcuts.ts fires this callback.
let _onNewView: ((webContents: WebContents, win: BrowserWindow) => void) | null = null

export function registerNewViewCallback(cb: (webContents: WebContents, win: BrowserWindow) => void): void {
  _onNewView = cb
}

export function notifyNewView(webContents: WebContents, win: BrowserWindow): void {
  _onNewView?.(webContents, win)
}

/**
 * Builds an accelerator string from a before-input-event Input object.
 * Normalizes to the format stored in the shortcut map (e.g., 'Ctrl+Backslash', 'Ctrl+1').
 * Treats Meta (Cmd on macOS) as Ctrl for cross-platform consistency.
 */
function buildAccelerator(input: Electron.Input): string {
  const parts: string[] = []

  // Normalize: use Ctrl for both Ctrl (Win/Linux) and Meta/Cmd (macOS)
  if (input.control || input.meta) parts.push('Ctrl')
  if (input.shift) parts.push('Shift')
  if (input.alt) parts.push('Alt')

  // Normalize special keys to match stored accelerator format
  const keyMap: Record<string, string> = {
    '\\': 'Backslash',
    ',': 'Comma',
    '.': 'Period',
    '/': 'Slash',
    ' ': 'Space',
  }
  const key = keyMap[input.key] ?? input.key.toUpperCase()
  parts.push(key)

  return parts.join('+')
}

/**
 * Attaches the before-input-event shortcut interceptor to a single webContents instance.
 * Must be called for EVERY WebContentsView created (including lazy-created ones).
 * Also called on the main BrowserWindow's webContents (for when no webview has focus).
 */
export function attachShortcutInterceptor(webContents: WebContents, win: BrowserWindow): void {
  webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return

    const accelerator = buildAccelerator(input)
    const map: ShortcutMap = store.get('shortcuts')
    const action: ShortcutAction | undefined = map[accelerator]

    if (action) {
      event.preventDefault()
      // Push the action to the renderer via the main BrowserWindow webContents
      // (renderer runs in BrowserWindow, not in WebContentsView)
      win.webContents.send(IPC_CHANNELS.SHELL_ACTION, action)
    }
  })
}

/**
 * Wires interceptors to all existing views in the pool + the main window renderer.
 * Call this after createMainWindow() and createTray(), once views exist.
 */
export function wireAllShortcuts(win: BrowserWindow): void {
  // Main BrowserWindow renderer — handles shortcuts when no webview has focus
  attachShortcutInterceptor(win.webContents, win)

  // All existing WebContentsViews in the pool
  for (const [, view] of getViewPool()) {
    attachShortcutInterceptor(view.webContents, win)
  }
}
