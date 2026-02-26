// src/main/webviews.ts
// WebContentsView pool: manages a Map from tab ID to WebContentsView.
// Views are created lazily on first activation and kept alive until app quit
// (or explicit destroyAllViews call). Uses setVisible for switching — NOT removeChildView.

import { BrowserWindow, WebContentsView, session, shell } from 'electron'
import type { ServiceTab, AccountRecord } from '@shared/ipc-types'
import { TAB_BAR_HEIGHT } from './window'
import { store } from './store'
import { notifyNewView } from './shortcuts'
import { injectCss, runSentinelCheck } from './css-injection'

export const SIDEBAR_WIDTH = 240
export const TAB_BAR_HEIGHT_PX = TAB_BAR_HEIGHT  // matches TAB_BAR_HEIGHT in window.ts

/** Build ServiceTab[] from the current AccountRecord[]. One tab per account for Mail. */
export function getTabsFromAccounts(accounts: AccountRecord[]): ServiceTab[] {
  return accounts.map(account => {
    if (account.provider === 'google') {
      return {
        id: `gmail-${account.email}`,
        name: `Gmail (${account.email})`,
        url: 'https://mail.google.com',
      }
    } else {
      return {
        id: `infomaniak-${account.email}`,
        name: `Infomaniak (${account.email})`,
        url: 'https://mail.infomaniak.com',
      }
    }
  })
}

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

  // Send all new-window / target=_blank navigations to the system browser
  view.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Notify shortcuts module so the interceptor is attached to this new view
  notifyNewView(view.webContents, win)

  // Determine provider from tab ID convention: 'gmail-*' or 'infomaniak-*'
  const provider = tab.id.startsWith('gmail') ? 'gmail' : 'infomaniak'

  view.webContents.on('did-finish-load', () => {
    void injectCss(view.webContents, provider).then(() => {
      // 500ms delay to let DOM settle before sentinel visibility check
      setTimeout(() => {
        void runSentinelCheck(view.webContents, provider, win)
      }, 500)
    })
  })

  // Start invisible — activateTab makes the target visible
  view.setVisible(false)

  viewPool.set(tab.id, view)
  return view
}

/**
 * Makes the given tab's view visible at the correct bounds, hides all others.
 * Also persists the active tab to the store.
 */
export function activateTab(tabId: string, win: BrowserWindow, _sidebarOpen: boolean): void {
  const [winWidth, winHeight] = win.getContentSize()
  // Sidebar overlays the webview — always use full content width
  const x = 0
  const y = TAB_BAR_HEIGHT_PX
  const width = winWidth
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
export function resizeActiveView(win: BrowserWindow, _sidebarOpen: boolean): void {
  if (!activeTabId) return

  const [winWidth, winHeight] = win.getContentSize()
  const x = 0
  const y = TAB_BAR_HEIGHT_PX
  const width = winWidth
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
 * Remove a single view from the pool and close its WebContents.
 * Called when an account is removed via REMOVE_ACCOUNT IPC.
 */
export function destroyView(tabId: string, win: BrowserWindow): void {
  const view = viewPool.get(tabId)
  if (view) {
    win.contentView.removeChildView(view)
    view.webContents.close()
    viewPool.delete(tabId)
  }
  // If the removed view was active, clear activeTabId
  if (activeTabId === tabId) activeTabId = ''
}

/**
 * Returns the raw pool Map — used by Plan 03 shortcut interceptor
 * to attach listeners to each view's webContents.
 */
export function getViewPool(): Map<string, WebContentsView> {
  return viewPool
}
