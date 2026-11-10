// src/preload/shell.ts
// Preload for the Settings window only. The Settings page is a data: page, and
// it gets just the calls it makes: preferences and the app version.
//
// Gmail never gets this bridge: the guard at the bottom exposes nothing unless
// the page is a data: page. Logout, account and token calls are not exposed here.
// The main process also checks every sender (validateSender in src/main/ipc.ts),
// so this file is not the only line of defence.

import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/ipc-types';

type SettingsBridge = Pick<ElectronAPI, 'app' | 'preferences'>;

const settingsAPI: SettingsBridge = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
  preferences: {
    get: () => ipcRenderer.invoke('preferences:get'),
    set: (key: string, value: any) => ipcRenderer.invoke('preferences:set', key, value),
    clearCache: () => ipcRenderer.invoke('preferences:clearCache'),
  },
};

// Fail closed: any other protocol (https:, about:, file:) gets nothing. Do not
// replace this with an origin test: the origin of a data: document is the
// string 'null', and other Google origins load in the main window too.
if (window.location.protocol === 'data:') {
  contextBridge.exposeInMainWorld('electron', settingsAPI);
}
