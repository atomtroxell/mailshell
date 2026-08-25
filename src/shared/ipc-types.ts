/**
 * Secure IPC API exposed to renderer process via contextBridge
 * Only safe methods are exposed; ipcRenderer is never directly accessible
 */

export interface ElectronAPI {
  auth: {
    /**
     * Get the current access token for API requests
     * Returns null if no token is available or user is not authenticated
     */
    getAccessToken: () => Promise<string | null>;

    /**
     * Logout: clear all session data and tokens
     */
    logout: () => Promise<void>;
  };
  app: {
    /**
     * Get application version from package.json
     */
    getVersion: () => Promise<string>;
  };
}

// Extend global Window interface for TypeScript support in renderer
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
