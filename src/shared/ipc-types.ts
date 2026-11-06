/**
 * Secure IPC API exposed to renderer process via contextBridge
 * Only safe methods are exposed; ipcRenderer is never directly accessible
 */

export interface Preferences {
  theme: 'light' | 'dark' | 'system';
  autoUpdate: boolean;
  dataRetention: '7days' | '30days' | '90days' | 'never';
  gmailCSSEnabled: boolean;
  version: string;
}

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
  account: {
    /**
     * Check if current account is saved (refresh token exists)
     */
    isSaved: () => Promise<boolean>;

    /**
     * Save current account (confirm credentials are persisted)
     */
    save: () => Promise<void>;

    /**
     * Remove current account (clear stored credentials)
     */
    remove: () => Promise<void>;
  };
  preferences: {
    /**
     * Get current preferences
     */
    get: () => Promise<Preferences>;

    /**
     * Set a preference value
     */
    set: (key: keyof Preferences, value: any) => Promise<void>;

    /**
     * Clear browser cache and session storage
     */
    clearCache: () => Promise<boolean>;
  };
}

// Extend global Window interface for TypeScript support in renderer
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
