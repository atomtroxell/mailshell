// src/preload/shell.ts
import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { MailshellAPI, InitialState, TabState, ShortcutMap, ShortcutAction, AccountRecord, AuthResult, Provider } from '@shared/ipc-types'

const api: MailshellAPI = {
  getInitialState: (): Promise<InitialState> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_INITIAL_STATE),

  // Tab management
  getTabState: (): Promise<TabState> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TAB_STATE),
  switchTab: (tabId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SWITCH_TAB, tabId),
  reorderTabs: (orderedIds: string[]): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.REORDER_TABS, orderedIds),

  // Sidebar
  getSidebarState: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SIDEBAR_STATE),
  toggleSidebar: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_SIDEBAR),

  // Shortcuts
  getShortcuts: (): Promise<ShortcutMap> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SHORTCUTS),
  setShortcut: (action: ShortcutAction, accelerator: string): Promise<ShortcutMap> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_SHORTCUT, action, accelerator),

  // Shell action event listener
  onShellAction: (callback: (action: ShortcutAction) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: ShortcutAction): void => {
      callback(action)
    }
    ipcRenderer.on(IPC_CHANNELS.SHELL_ACTION, listener)
    return () => {
      ipcRenderer.off(IPC_CHANNELS.SHELL_ACTION, listener)
    }
  },

  // CSS staleness
  getCssStaleness: (): Promise<string[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CSS_STALENESS) as Promise<string[]>,
  onCssStale: (callback: (provider: string, isStale: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, provider: string, isStale: boolean): void => {
      callback(provider, isStale)
    }
    ipcRenderer.on(IPC_CHANNELS.CSS_STALE_STATUS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CSS_STALE_STATUS, handler)
  },

  // Auth (Phase 4)
  startAuth: (provider: Provider): Promise<AuthResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.START_AUTH, provider),
  cancelAuth: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.CANCEL_AUTH),
  getAccounts: (): Promise<AccountRecord[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ACCOUNTS),
  removeAccount: (accountId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.REMOVE_ACCOUNT, accountId),

  onAuthRefreshFailed: (callback: (accountId: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, accountId: string): void => {
      callback(accountId)
    }
    ipcRenderer.on(IPC_CHANNELS.AUTH_REFRESH_FAILED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AUTH_REFRESH_FAILED, handler)
  },

  openSettingsWindow: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_SETTINGS_WINDOW),

  onSignedOut: (callback: () => void): (() => void) => {
    const handler = (): void => { callback() }
    ipcRenderer.on(IPC_CHANNELS.SIGNED_OUT, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SIGNED_OUT, handler)
  },
}

contextBridge.exposeInMainWorld('mailshell', api)
