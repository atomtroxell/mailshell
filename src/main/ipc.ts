// src/main/ipc.ts
import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { store } from './store'
import type { InitialState, TabState, ShortcutAction } from '@shared/ipc-types'
import { DEV_TABS, activateTab, resizeActiveView } from './webviews'
import { wireAllShortcuts, registerNewViewCallback, attachShortcutInterceptor } from './shortcuts'

export function registerIpcHandlers(win: BrowserWindow): void {
  // GET_INITIAL_STATE: hasAccounts + lastActiveTab
  ipcMain.handle(IPC_CHANNELS.GET_INITIAL_STATE, (): InitialState => {
    const accounts = store.get('accounts')
    const lastActiveTab = store.get('lastActiveTab')
    return {
      hasAccounts: accounts.length > 0,
      lastActiveTab,
    }
  })

  // GET_TAB_STATE: return current tab order + active tab
  ipcMain.handle(IPC_CHANNELS.GET_TAB_STATE, (): TabState => {
    const storedOrder = store.get('tabOrder')
    // Merge DEV_TABS order with stored order; tabs not in store get appended
    const ordered =
      storedOrder.length > 0
        ? (storedOrder.map(id => DEV_TABS.find(t => t.id === id)).filter(Boolean) as typeof DEV_TABS)
        : DEV_TABS
    const lastActiveTab = store.get('lastActiveTab') || (ordered[0]?.id ?? '')
    return { tabs: ordered, activeTabId: lastActiveTab }
  })

  // SWITCH_TAB: activate a tab by ID and persist as lastActiveTab
  ipcMain.handle(IPC_CHANNELS.SWITCH_TAB, (_event, tabId: string): void => {
    const sidebarOpen = store.get('sidebarOpen')
    activateTab(tabId, win, sidebarOpen)
  })

  // REORDER_TABS: persist new tab order
  ipcMain.handle(IPC_CHANNELS.REORDER_TABS, (_event, orderedIds: string[]): void => {
    store.set('tabOrder', orderedIds)
  })

  // TOGGLE_SIDEBAR: flip sidebarOpen, resize active view, return new state
  ipcMain.handle(IPC_CHANNELS.TOGGLE_SIDEBAR, (): boolean => {
    const current = store.get('sidebarOpen')
    const next = !current
    store.set('sidebarOpen', next)
    resizeActiveView(win, next)
    return next
  })

  // GET_SIDEBAR_STATE: return current sidebar open state
  ipcMain.handle(IPC_CHANNELS.GET_SIDEBAR_STATE, (): boolean => {
    return store.get('sidebarOpen')
  })

  // GET_SHORTCUTS: return current shortcut map
  ipcMain.handle(IPC_CHANNELS.GET_SHORTCUTS, () => {
    return store.get('shortcuts')
  })

  // SET_SHORTCUT: remap one action to a new accelerator, return updated map
  ipcMain.handle(IPC_CHANNELS.SET_SHORTCUT, (_event, action: ShortcutAction, accelerator: string) => {
    const shortcuts = { ...store.get('shortcuts') }
    // Remove any existing binding for this action
    for (const [key, val] of Object.entries(shortcuts)) {
      if (val === action) delete shortcuts[key]
    }
    shortcuts[accelerator] = action
    store.set('shortcuts', shortcuts)
    return shortcuts
  })

  // Wire keyboard shortcut interceptors to main window + all pool views
  wireAllShortcuts(win)
  // Register callback so new views created later also get the interceptor
  registerNewViewCallback(attachShortcutInterceptor)

  // Resize active WebContentsView when window resizes
  win.on('resize', () => {
    const sidebarOpen = store.get('sidebarOpen')
    resizeActiveView(win, sidebarOpen)
  })
}
