// src/main/ipc.ts
import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { store } from './store'
import type { InitialState, TabState, ShortcutAction, AccountRecord, AuthResult, Provider } from '@shared/ipc-types'
import { activateTab, resizeActiveView, getOrCreateView, getTabsFromAccounts, destroyView, hideActiveView, showActiveView } from './webviews'
import { wireAllShortcuts, registerNewViewCallback, attachShortcutInterceptor } from './shortcuts'
import { startGoogleAuthFlow, cancelGoogleAuth } from './auth/google'
import { startInfomaniakAuthFlow, cancelInfomaniakAuth } from './auth/infomaniak'
import { getAllAccounts, deleteAccount } from './auth/token-store'
import { startSilentRefreshScheduler } from './auth/refresh'

export function registerIpcHandlers(win: BrowserWindow): void {
  // GET_INITIAL_STATE: hasAccounts + lastActiveTab + staleCssProviders
  ipcMain.handle(IPC_CHANNELS.GET_INITIAL_STATE, (): InitialState => {
    const accounts = store.get('accounts') as AccountRecord[]
    const lastActiveTab = store.get('lastActiveTab')
    const staleCssProviders = store.get('staleCssProviders') as string[]
    return {
      hasAccounts: accounts.length > 0,
      lastActiveTab,
      staleCssProviders,
    }
  })

  // GET_CSS_STALENESS: return current stale provider list from store
  ipcMain.handle(IPC_CHANNELS.GET_CSS_STALENESS, (): string[] => {
    return store.get('staleCssProviders') as string[]
  })

  // GET_TAB_STATE: return current tab order + active tab
  ipcMain.handle(IPC_CHANNELS.GET_TAB_STATE, (): TabState => {
    const storedOrder = store.get('tabOrder')
    const allTabs = getTabsFromAccounts(getAllAccounts())
    // Merge stored order with account tabs; tabs not in store get appended
    const ordered =
      storedOrder.length > 0
        ? (storedOrder.map(id => allTabs.find(t => t.id === id)).filter(Boolean) as typeof allTabs)
        : allTabs
    const lastActiveTab = store.get('lastActiveTab') || (ordered[0]?.id ?? '')
    return { tabs: ordered, activeTabId: lastActiveTab }
  })

  // SWITCH_TAB: create view if not yet in pool, then activate
  ipcMain.handle(IPC_CHANNELS.SWITCH_TAB, (_event, tabId: string): void => {
    const sidebarOpen = store.get('sidebarOpen')
    const tab = getTabsFromAccounts(getAllAccounts()).find(t => t.id === tabId)
    if (tab) getOrCreateView(tab, win)
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

  // START_AUTH: start auth flow for given provider; returns AuthResult
  ipcMain.handle(IPC_CHANNELS.START_AUTH, async (_event, provider: Provider): Promise<AuthResult> => {
    if (provider === 'google') {
      const result = await startGoogleAuthFlow()
      if (result.success) {
        // Load tabs from new account data
        const accounts = getAllAccounts()
        const tabs = getTabsFromAccounts(accounts)
        const firstTab = tabs[0]
        if (firstTab) getOrCreateView(firstTab, win)
      }
      return result
    }
    if (provider === 'infomaniak') {
      const result = await startInfomaniakAuthFlow()
      if (result.success) {
        const accounts = getAllAccounts()
        const tabs = getTabsFromAccounts(accounts)
        const firstNewTab = tabs.find(t => t.id.startsWith('infomaniak-'))
        if (firstNewTab) getOrCreateView(firstNewTab, win)
      }
      return result
    }
    return { success: false, error: `Unknown provider: ${provider}` }
  })

  // CANCEL_AUTH: cancel the current in-progress auth flow
  ipcMain.handle(IPC_CHANNELS.CANCEL_AUTH, (): void => {
    cancelGoogleAuth()
    cancelInfomaniakAuth()
  })

  // GET_ACCOUNTS: return all account records (tokens remain encrypted)
  ipcMain.handle(IPC_CHANNELS.GET_ACCOUNTS, (): AccountRecord[] => {
    return getAllAccounts()
  })

  // REMOVE_ACCOUNT: remove account, destroy its WebContentsView, notify renderer
  ipcMain.handle(IPC_CHANNELS.REMOVE_ACCOUNT, (_event, accountId: string): void => {
    deleteAccount(accountId)
    destroyView(accountId, win)
    // If no accounts remain, the renderer's onSuccess callback won't fire;
    // the renderer detects zero accounts via GET_ACCOUNTS and routes to onboarding
  })

  // SET_OVERLAY_OPEN: hide/show active webview while a renderer modal is open
  ipcMain.handle(IPC_CHANNELS.SET_OVERLAY_OPEN, (_event, open: boolean): void => {
    if (open) {
      hideActiveView(win)
    } else {
      showActiveView(win, store.get('sidebarOpen'))
    }
  })

  // Start silent token refresh scheduler
  startSilentRefreshScheduler(win)

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
