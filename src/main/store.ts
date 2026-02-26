// src/main/store.ts
import { Conf } from 'electron-conf/main'
import type { ShortcutMap } from '@shared/ipc-types'

export interface WindowState {
  x: number | undefined
  y: number | undefined
  width: number
  height: number
  isMaximized: boolean
}

export interface AppStore {
  windowState: WindowState
  lastActiveTab: string
  accounts: string[]
  tabOrder: string[]      // ordered array of tab IDs
  sidebarOpen: boolean    // sidebar visible state
  shortcuts: ShortcutMap  // user's shortcut map
}

export const store = new Conf<AppStore>({
  defaults: {
    windowState: {
      x: undefined,
      y: undefined,
      width: 1200,
      height: 800,
      isMaximized: false,
    },
    lastActiveTab: '',
    accounts: [],
    tabOrder: [],
    sidebarOpen: false,
    shortcuts: {
      'Ctrl+1': 'switch-tab-1',
      'Ctrl+2': 'switch-tab-2',
      'Ctrl+3': 'switch-tab-3',
      'Ctrl+4': 'switch-tab-4',
      'Ctrl+Backslash': 'toggle-sidebar',
      'Ctrl+Comma': 'open-settings',
    } as ShortcutMap,
  },
})
