/**
 * Secure IPC API exposed to renderer process via contextBridge
 * Only safe methods are exposed; ipcRenderer is never directly accessible
 */

export interface Preferences {
  gmailCSSEnabled: boolean;
  mailProvider: 'gmail' | 'exchange' | null;
  autoUpdateStyles: boolean;
  autoUpdateApp: boolean;
  lastSeenVersion: string | null;
  lastNoticeVersion: string | null;
  version: string;
}

/** A newer MailShell release found on GitHub. */
export interface NewerRelease {
  version: string;
  url: string;
}

export interface ElectronAPI {
  updates: {
    /**
     * Check now for new Gmail styles and a new MailShell version.
     * Resolves to a short line of text for the Settings window.
     */
    checkNow: () => Promise<string>;
    /** The newer release from the last check, or null. */
    latest: () => Promise<NewerRelease | null>;
    /** Open the newer release's download page in the browser. */
    openDownload: () => Promise<void>;
  };
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
