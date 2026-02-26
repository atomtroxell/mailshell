/** State returned by get-initial-state IPC call */
export interface InitialState {
  /** true if at least one account exists in the store */
  hasAccounts: boolean
  /** ID of the last active tab, empty string if none */
  lastActiveTab: string
}

/** A service tab definition - one per provider service (e.g., Gmail Mail, Infomaniak Calendar) */
export interface ServiceTab {
  id: string          // e.g. 'gmail-mail', 'infomaniak-mail'
  name: string        // Display name: 'Gmail Mail', 'Infomaniak Mail'
  url: string         // The URL to load in the WebContentsView
  favicon?: string    // URL or data URI of the favicon (populated after webview loads)
}

/** Actions the shell can perform - dispatched via keyboard shortcuts */
export type ShortcutAction =
  | 'switch-tab-1'
  | 'switch-tab-2'
  | 'switch-tab-3'
  | 'switch-tab-4'
  | 'toggle-sidebar'
  | 'open-settings'

/** Maps accelerator strings to ShortcutActions. Accelerator format: 'Ctrl+1', 'Cmd+Backslash' */
export type ShortcutMap = Record<string, ShortcutAction>

/** Full tab state returned from get-tab-state */
export interface TabState {
  tabs: ServiceTab[]
  activeTabId: string
}

/** API surface exposed via contextBridge as window.mailshell */
export interface MailshellAPI {
  getInitialState: () => Promise<InitialState>

  // Tab management
  getTabState: () => Promise<TabState>
  switchTab: (tabId: string) => Promise<void>
  reorderTabs: (orderedIds: string[]) => Promise<void>

  // Sidebar
  getSidebarState: () => Promise<boolean>  // returns isOpen
  toggleSidebar: () => Promise<boolean>    // returns new isOpen state

  // Shortcuts
  getShortcuts: () => Promise<ShortcutMap>
  setShortcut: (action: ShortcutAction, accelerator: string) => Promise<ShortcutMap>

  // Event listener for shell actions pushed from main process
  onShellAction: (callback: (action: ShortcutAction) => void) => () => void  // returns cleanup fn
}

/** Extend Window to make window.mailshell type-safe in renderer */
declare global {
  interface Window {
    mailshell: MailshellAPI
  }
}
