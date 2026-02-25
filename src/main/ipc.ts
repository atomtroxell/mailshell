// src/main/ipc.ts
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { store } from './store'
import type { InitialState } from '@shared/ipc-types'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_INITIAL_STATE, (): InitialState => {
    const accounts = store.get('accounts')
    const lastActiveTab = store.get('lastActiveTab')
    return {
      hasAccounts: accounts.length > 0,
      lastActiveTab,
    }
  })
}
