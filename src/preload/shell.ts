// src/preload/shell.ts
import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { MailshellAPI, InitialState, TabState, ShortcutMap, ShortcutAction } from '@shared/ipc-types'

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
}

contextBridge.exposeInMainWorld('mailshell', api)
