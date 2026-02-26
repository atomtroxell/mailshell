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
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
