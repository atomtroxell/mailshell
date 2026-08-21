// src/preload/shell.ts
// Preload script for secure context isolation

import { contextBridge } from 'electron'

// Context isolation: This preload script runs in a privileged context
// and can safely expose limited APIs to the renderer process via contextBridge.
// Currently minimal for Phase 1 (foundation only).

// Define API namespace for renderer
const api = {
  // Placeholder for future IPC methods
}

// Expose only the safe API surface to renderer
contextBridge.exposeInMainWorld('api', api)
