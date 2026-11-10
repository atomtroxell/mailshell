// src/preload/error.ts
// Preload for the main window. The error page (a data: page, shown in the main
// window when Gmail fails to load) gets one call: clear the cache.
//
// Gmail runs in this same window, so the guard below is what keeps the bridge
// off Gmail. Nothing is exposed unless the page is a data: page. The main
// process also checks the sender (preferences:clearCache accepts only the error
// page and the Settings window).

import { contextBridge, ipcRenderer } from 'electron';

const errorPageAPI = {
  preferences: {
    clearCache: () => ipcRenderer.invoke('preferences:clearCache'),
  },
};

// Fail closed, as in shell.ts: other protocols get nothing.
if (window.location.protocol === 'data:') {
  contextBridge.exposeInMainWorld('electron', errorPageAPI);
}
