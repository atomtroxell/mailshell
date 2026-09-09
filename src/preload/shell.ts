// src/preload/shell.ts
// Preload script for secure context isolation

import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/ipc-types';

// Context isolation: This preload script runs in a privileged context
// and can safely expose limited APIs to the renderer process via contextBridge.
// NO raw ipcRenderer is exposed; only whitelisted safe methods.

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
};

// Expose only the safe API surface to renderer
contextBridge.exposeInMainWorld('electron', electronAPI);
