import React, { useEffect, useState, useCallback } from 'react'
import { TabBar } from './TabBar'
import { Sidebar } from './Sidebar'
import { StaleCssBanner } from './StaleCssBanner'
import { AuthBanner } from './AuthBanner'
import type { ServiceTab, AccountRecord } from '@shared/ipc-types'

interface AppShellProps {
  onSignedOut: () => void
}

export function AppShell({ onSignedOut }: AppShellProps): React.ReactElement {
  const [tabs, setTabs] = useState<ServiceTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string>('')
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  const [failedAuthIds, setFailedAuthIds] = useState<string[]>([])
  const [accounts, setAccounts] = useState<AccountRecord[]>([])

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

  // Load accounts and subscribe to auth refresh failures
  useEffect(() => {
    window.mailshell.getAccounts().then(setAccounts)
    const cleanup = window.mailshell.onAuthRefreshFailed((accountId) => {
      setFailedAuthIds(prev => prev.includes(accountId) ? prev : [...prev, accountId])
    })
    return cleanup
  }, [])

  // Listen for signed-out push from main process (last account removed via settings window)
  useEffect(() => {
    const cleanup = window.mailshell.onSignedOut(() => {
      onSignedOut()
    })
    return cleanup
  }, [onSignedOut])

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
        void window.mailshell.openSettingsWindow()
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
      <StaleCssBanner />
      {failedAuthIds.map(accountId => {
        const account = accounts.find(a => a.id === accountId)
        if (!account) return null
        return (
          <AuthBanner
            key={accountId}
            accountId={accountId}
            email={account.email}
            provider={account.provider}
            onDismiss={(id) => setFailedAuthIds(prev => prev.filter(x => x !== id))}
            onReconnect={async (id) => {
              const acct = accounts.find(a => a.id === id)
              if (!acct) return
              const result = await window.mailshell.startAuth(acct.provider)
              if (result.success) {
                setFailedAuthIds(prev => prev.filter(x => x !== id))
                const updated = await window.mailshell.getAccounts()
                setAccounts(updated)
              }
            }}
          />
        )
      })}
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
    </div>
  )
}
