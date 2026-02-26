// src/main/webviews.ts
// WebContentsView pool: manages a Map from tab ID to WebContentsView.
// Views are created lazily on first activation and kept alive until app quit
// (or explicit destroyAllViews call). Uses setVisible for switching — NOT removeChildView.

import { BrowserWindow, WebContentsView, session } from 'electron'
import type { ServiceTab } from '@shared/ipc-types'
import { TAB_BAR_HEIGHT } from './window'
import { store } from './store'
import { notifyNewView } from './shortcuts'

export const SIDEBAR_WIDTH = 240
export const TAB_BAR_HEIGHT_PX = TAB_BAR_HEIGHT  // matches TAB_BAR_HEIGHT in window.ts

// Hardcoded dev tabs for Phase 2 — Phase 4 will replace with dynamic accounts
export const DEV_TABS: ServiceTab[] = [
  { id: 'gmail-mail', name: 'Gmail Mail', url: 'https://mail.google.com' },
  { id: 'infomaniak-mail', name: 'Infomaniak Mail', url: 'https://mail.infomaniak.com' },
]

// Module-level pool — prevents GC of WebContentsView instances
const viewPool = new Map<string, WebContentsView>()

// Track which tab is currently active (setVisible is used instead of getVisible)
let activeTabId: string = ''

/**
 * Returns an existing WebContentsView for the given tab, or creates one.
 * Each view uses a persistent session partition so cookies survive restarts.
 */
export function getOrCreateView(tab: ServiceTab, win: BrowserWindow): WebContentsView {
  const existing = viewPool.get(tab.id)
  if (existing) return existing

  const view = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      session: session.fromPartition('persist:' + tab.id),
    },
  })

  win.contentView.addChildView(view)
  void view.webContents.loadURL(tab.url)

  // Notify shortcuts module so the interceptor is attached to this new view
  notifyNewView(view.webContents, win)

  // Start invisible — activateTab makes the target visible
  view.setVisible(false)

  viewPool.set(tab.id, view)
  return view
}

/**
 * Makes the given tab's view visible at the correct bounds, hides all others.
 * Also persists the active tab to the store.
 */
export function activateTab(tabId: string, win: BrowserWindow, sidebarOpen: boolean): void {
  const [winWidth, winHeight] = win.getContentSize()
  const x = sidebarOpen ? SIDEBAR_WIDTH : 0
  const y = TAB_BAR_HEIGHT_PX
  const width = winWidth - x
  const height = winHeight - TAB_BAR_HEIGHT_PX

  const contentBounds = { x, y, width, height }

  for (const [id, view] of viewPool) {
    view.setVisible(id === tabId)
  }

  const activeView = viewPool.get(tabId)
  if (activeView) {
    activeView.setBounds(contentBounds)
  }

  activeTabId = tabId
  store.set('lastActiveTab', tabId)
}

/**
 * Resizes the currently active view to fill the content area.
 * Called on window resize events.
 */
export function resizeActiveView(win: BrowserWindow, sidebarOpen: boolean): void {
  if (!activeTabId) return

  const [winWidth, winHeight] = win.getContentSize()
  const x = sidebarOpen ? SIDEBAR_WIDTH : 0
  const y = TAB_BAR_HEIGHT_PX
  const width = winWidth - x
  const height = winHeight - TAB_BAR_HEIGHT_PX

  const contentBounds = { x, y, width, height }

  viewPool.get(activeTabId)?.setBounds(contentBounds)
}

/**
 * Closes all WebContents and clears the pool. Call on app quit.
 */
export function destroyAllViews(): void {
  for (const view of viewPool.values()) {
    view.webContents.close()
  }
  viewPool.clear()
}

/**
 * Returns the raw pool Map — used by Plan 03 shortcut interceptor
 * to attach listeners to each view's webContents.
 */
export function getViewPool(): Map<string, WebContentsView> {
  return viewPool
}
