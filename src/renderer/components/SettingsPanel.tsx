import React, { useEffect, useState, useCallback } from 'react'
import type { ShortcutAction, ShortcutMap } from '@shared/ipc-types'

interface SettingsPanelProps {
  onClose: () => void
}

const ACTION_LABELS: Record<ShortcutAction, string> = {
  'switch-tab-1': 'Switch to Tab 1',
  'switch-tab-2': 'Switch to Tab 2',
  'switch-tab-3': 'Switch to Tab 3',
  'switch-tab-4': 'Switch to Tab 4',
  'toggle-sidebar': 'Toggle Sidebar',
  'open-settings': 'Open Settings',
}

const SHORTCUT_ACTIONS: ShortcutAction[] = [
  'switch-tab-1', 'switch-tab-2', 'switch-tab-3', 'switch-tab-4',
  'toggle-sidebar', 'open-settings',
]

export function SettingsPanel({ onClose }: SettingsPanelProps): React.ReactElement {
  const [shortcuts, setShortcuts] = useState<ShortcutMap>({})
  const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(null)

  useEffect(() => {
    window.mailshell.getShortcuts().then(setShortcuts)
  }, [])

  // Reverse map: action -> accelerator
  const actionToAccelerator = Object.fromEntries(
    Object.entries(shortcuts).map(([acc, action]) => [action, acc])
  ) as Record<ShortcutAction, string>

  const handleRowClick = (action: ShortcutAction) => {
    setRecordingAction(action)
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!recordingAction) return
      if (e.key === 'Escape') { setRecordingAction(null); return }
      if (['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) return
      e.preventDefault()
      const parts: string[] = []
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
      if (e.shiftKey) parts.push('Shift')
      if (e.altKey) parts.push('Alt')
      const keyMap: Record<string, string> = {
        '\\': 'Backslash', ',': 'Comma', '.': 'Period', '/': 'Slash', ' ': 'Space',
      }
      parts.push(keyMap[e.key] ?? e.key.toUpperCase())
      const accelerator = parts.join('+')
      window.mailshell.setShortcut(recordingAction, accelerator).then((updated) => {
        setShortcuts(updated)
        setRecordingAction(null)
      })
    },
    [recordingAction]
  )

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="settings-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="settings-panel">
        <div className="settings-header">
          <h2 className="settings-title">Keyboard Shortcuts</h2>
          <button className="settings-close" onClick={onClose} aria-label="Close settings">
            &times;
          </button>
        </div>
        <div className="settings-body">
          {SHORTCUT_ACTIONS.map((action) => {
            const isRecording = recordingAction === action
            const currentAccelerator = actionToAccelerator[action] ?? ''
            return (
              <div
                key={action}
                className={`settings-shortcut-row ${isRecording ? 'settings-shortcut-row--recording' : ''}`}
                onClick={() => handleRowClick(action)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick(action) }}
              >
                <span className="settings-action-label">{ACTION_LABELS[action]}</span>
                <span className="settings-accelerator">
                  {isRecording ? 'Press a key...' : (currentAccelerator || 'unbound')}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
