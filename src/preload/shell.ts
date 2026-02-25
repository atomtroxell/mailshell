import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { MailshellAPI } from '../shared/ipc-types'

const api: MailshellAPI = {
  getInitialState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_INITIAL_STATE),
}

contextBridge.exposeInMainWorld('mailshell', api)
