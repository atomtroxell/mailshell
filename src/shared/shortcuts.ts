// src/shared/shortcuts.ts
// Single source of truth for app keyboard shortcuts (menu accelerators and the shortcuts panel)

export type ShortcutGroup = 'App' | 'Edit' | 'View' | 'Account' | 'Help'

export interface ShortcutDef {
  id: string
  accelerator: string
  label: string
  group: ShortcutGroup
}

// Ids for undo..zoomOut match Electron role names so the menu can use them for both role and accelerator.
export const SHORTCUTS = [
  { id: 'exit', accelerator: 'CmdOrCtrl+Q', label: 'Exit MailShell', group: 'App' },
  { id: 'preferences', accelerator: 'CmdOrCtrl+Shift+P', label: 'Open Settings', group: 'App' },
  { id: 'undo', accelerator: 'CmdOrCtrl+Z', label: 'Undo', group: 'Edit' },
  { id: 'redo', accelerator: 'CmdOrCtrl+Y', label: 'Redo', group: 'Edit' },
  { id: 'cut', accelerator: 'CmdOrCtrl+X', label: 'Cut', group: 'Edit' },
  { id: 'copy', accelerator: 'CmdOrCtrl+C', label: 'Copy', group: 'Edit' },
  { id: 'paste', accelerator: 'CmdOrCtrl+V', label: 'Paste', group: 'Edit' },
  { id: 'selectAll', accelerator: 'CmdOrCtrl+A', label: 'Select All', group: 'Edit' },
  { id: 'toggleSidebar', accelerator: 'CmdOrCtrl+Shift+B', label: 'Show or Hide Sidebar', group: 'View' },
  { id: 'reload', accelerator: 'CmdOrCtrl+R', label: 'Reload', group: 'View' },
  { id: 'resetZoom', accelerator: 'CmdOrCtrl+0', label: 'Actual Size', group: 'View' },
  { id: 'zoomIn', accelerator: 'CmdOrCtrl+=', label: 'Zoom In', group: 'View' },
  { id: 'zoomOut', accelerator: 'CmdOrCtrl+-', label: 'Zoom Out', group: 'View' },
  { id: 'credentials', accelerator: 'CmdOrCtrl+Shift+A', label: 'Manage Credentials', group: 'Account' },
  { id: 'shortcuts', accelerator: 'F1', label: 'Show Keyboard Shortcuts', group: 'Help' },
] as const satisfies readonly ShortcutDef[]

export type ShortcutId = (typeof SHORTCUTS)[number]['id']

export function acceleratorFor(id: ShortcutId): string {
  const entry = SHORTCUTS.find((s) => s.id === id)
  if (!entry) {
    throw new Error('Unknown shortcut id')
  }
  return entry.accelerator
}

export function formatAccelerator(accelerator: string, platform: string): string[] {
  return accelerator
    .split('+')
    .map((token) => (token === 'CmdOrCtrl' ? (platform === 'darwin' ? 'Cmd' : 'Ctrl') : token))
}
