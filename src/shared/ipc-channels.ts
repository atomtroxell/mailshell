export const IPC_CHANNELS = {
  GET_INITIAL_STATE: 'get-initial-state',

  // Tab management
  SWITCH_TAB: 'switch-tab',          // renderer -> main: activate tab by id
  REORDER_TABS: 'reorder-tabs',      // renderer -> main: persist new tab order
  GET_TAB_STATE: 'get-tab-state',    // renderer -> main: get current tab order + active tab

  // Sidebar
  TOGGLE_SIDEBAR: 'toggle-sidebar',          // renderer -> main: toggle sidebar open/closed
  GET_SIDEBAR_STATE: 'get-sidebar-state',    // renderer -> main: get current sidebar state

  // Shortcuts
  GET_SHORTCUTS: 'get-shortcuts',    // renderer -> main: get current shortcut map
  SET_SHORTCUT: 'set-shortcut',      // renderer -> main: remap one action to a new accelerator

  // Shell action push (main -> renderer)
  SHELL_ACTION: 'shell-action',      // main -> renderer: push a ShortcutAction (e.g., from before-input-event)

  // CSS injection staleness
  GET_CSS_STALENESS: 'get-css-staleness',    // renderer -> main: get current stale provider list
  CSS_STALE_STATUS: 'css-stale-status',      // main -> renderer push: provider staleness changed

  // Auth (Phase 4)
  START_AUTH: 'start-auth',              // renderer -> main: { provider: Provider }; returns AuthResult
  CANCEL_AUTH: 'cancel-auth',            // renderer -> main: cancel in-progress auth
  GET_ACCOUNTS: 'get-accounts',          // renderer -> main: returns AccountRecord[]
  REMOVE_ACCOUNT: 'remove-account',      // renderer -> main: { accountId: string }
  AUTH_REFRESH_FAILED: 'auth-refresh-failed', // main -> renderer push: accountId string

  // Overlay management — renderer tells main to hide/show webviews while modal is open
  SET_OVERLAY_OPEN: 'set-overlay-open',      // renderer -> main: boolean (true = overlay opened, hide webview)
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
