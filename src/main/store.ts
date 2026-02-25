// src/main/store.ts
import { Conf } from 'electron-conf/main'

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
  },
})
