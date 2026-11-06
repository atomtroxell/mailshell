// src/preload/shell.ts
// Preload script for secure context isolation

import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/ipc-types';

// Context isolation: This preload script runs in a privileged context
// and can safely expose limited APIs to the renderer process via contextBridge.
// NO raw ipcRenderer is exposed; only whitelisted safe methods.
// The bridge is exposed only on data: pages (see the guard at the bottom); the
// main process also re-checks every sender (validateSender in src/main/ipc.ts).

// Define the secure API surface for the renderer
const electronAPI: ElectronAPI = {
  auth: {
    getAccessToken: () => ipcRenderer.invoke('auth:getAccessToken'),
    logout: () => ipcRenderer.invoke('auth:logout'),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
  account: {
    isSaved: () => ipcRenderer.invoke('account:isSaved'),
    save: () => ipcRenderer.invoke('account:save'),
    remove: () => ipcRenderer.invoke('account:remove'),
  },
  preferences: {
    get: () => ipcRenderer.invoke('preferences:get'),
    set: (key: string, value: any) => ipcRenderer.invoke('preferences:set', key, value),
    clearCache: () => ipcRenderer.invoke('preferences:clearCache'),
  },
};

// Only Mailshell's own data: pages (Settings window, error page) get the bridge.
// Gmail and every other origin must never see it. Fail closed: any other
// protocol (https:, about:, file:) gets nothing. Do not replace this with an
// origin test: the origin of a data: document is the string 'null', and other
// Google origins (e.g. accounts.google.com) also load in the main window.
if (window.location.protocol === 'data:') {
  contextBridge.exposeInMainWorld('electron', electronAPI);
}
