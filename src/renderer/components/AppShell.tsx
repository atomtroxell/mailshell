import React, { useEffect, useState, useCallback } from 'react'
import { TabBar } from './TabBar'
import { Sidebar } from './Sidebar'
import { SettingsPanel } from './SettingsPanel'
import type { ServiceTab } from '@shared/ipc-types'

export function AppShell(): React.ReactElement {
  const [tabs, setTabs] = useState<ServiceTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string>('')
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)

  // Load initial state from main process
  useEffect(() => {
    window.mailshell.getTabState().then(({ tabs: t, activeTabId: id }) => {
      setTabs(t)
      setActiveTabId(id)
      // Activate the initial tab so the main process creates and loads its WebContentsView
      if (id) window.mailshell.switchTab(id)
    })
    window.mailshell.getSidebarState().then((isOpen) => {
      setSidebarOpen(isOpen)
    })
  }, [])

  // Handle tab switch
  const handleTabSwitch = useCallback((tabId: string) => {
    window.mailshell.switchTab(tabId)
    setActiveTabId(tabId)
  }, [])

  // Handle tab reorder (drag-and-drop)
  const handleReorder = useCallback((reorderedTabs: ServiceTab[]) => {
    setTabs(reorderedTabs)
    window.mailshell.reorderTabs(reorderedTabs.map((t) => t.id))
  }, [])

  // Handle sidebar toggle
  const handleToggleSidebar = useCallback(() => {
    window.mailshell.toggleSidebar().then((newState) => {
      setSidebarOpen(newState)
    })
  }, [])

  // Listen for shell actions pushed from main process (keyboard shortcuts)
  useEffect(() => {
    const cleanup = window.mailshell.onShellAction((action) => {
      if (action === 'toggle-sidebar') {
        handleToggleSidebar()
      } else if (action === 'open-settings') {
        setSettingsOpen(true)
      } else if (action.startsWith('switch-tab-')) {
        const index = parseInt(action.replace('switch-tab-', ''), 10) - 1
        const target = tabs[index]
        if (target) handleTabSwitch(target.id)
      }
    })
    // Return cleanup to remove the IPC listener on unmount
    return cleanup
  }, [tabs, handleTabSwitch, handleToggleSidebar])

  return (
    <div className="app-shell">
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSwitch={handleTabSwitch}
        onReorder={handleReorder}
        onToggleSidebar={handleToggleSidebar}
        sidebarOpen={sidebarOpen}
      />
      <div className="shell-body">
        <Sidebar isOpen={sidebarOpen} />
        {/* Content area — WebContentsView is positioned here by main process */}
        <div className="content-area" aria-label="Web content" />
      </div>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
