/** State returned by get-initial-state IPC call */
export interface InitialState {
  /** true if at least one account exists in the store */
  hasAccounts: boolean
  /** ID of the last active tab, empty string if none */
  lastActiveTab: string
}

/** API surface exposed via contextBridge as window.mailshell */
export interface MailshellAPI {
  getInitialState: () => Promise<InitialState>
}

/** Extend Window to make window.mailshell type-safe in renderer */
declare global {
  interface Window {
    mailshell: MailshellAPI
  }
}
