import React, { useState } from 'react'
import type { ServiceTab } from '@shared/ipc-types'

interface TabBarProps {
  tabs: ServiceTab[]
  activeTabId: string
  onTabSwitch: (tabId: string) => void
  onReorder: (reorderedTabs: ServiceTab[]) => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

export function TabBar({
  tabs,
  activeTabId,
  onTabSwitch,
  onReorder,
  onToggleSidebar,
  sidebarOpen,
}: TabBarProps): React.ReactElement {
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault() // Required to allow drop
  }

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    const reordered = [...tabs]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    onReorder(reordered)
    setDragIndex(null)
  }

  const handleDragEnd = () => setDragIndex(null)

  return (
    <div className="tab-bar" role="tablist" aria-label="Service tabs">
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTabId}
          className={`tab ${tab.id === activeTabId ? 'tab--active' : ''} ${dragIndex === i ? 'tab--dragging' : ''}`}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(i)}
          onDragEnd={handleDragEnd}
          onClick={() => onTabSwitch(tab.id)}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTabSwitch(tab.id) }}
        >
          {tab.favicon && (
            <img
              src={tab.favicon}
              className="tab-favicon"
              alt=""
              aria-hidden="true"
              width={14}
              height={14}
            />
          )}
          <span className="tab-label">{tab.name}</span>
        </div>
      ))}

      {/* Spacer pushes sidebar toggle to the right */}
      <div className="tab-bar-spacer" />

      {/* Sidebar toggle button */}
      <button
        className={`tab-bar-btn sidebar-toggle ${sidebarOpen ? 'sidebar-toggle--open' : ''}`}
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        title={sidebarOpen ? 'Close sidebar (Ctrl+\\)' : 'Open sidebar (Ctrl+\\)'}
      >
        {/* Simple 3-line icon */}
        <span className="sidebar-icon" aria-hidden="true">
          <span /><span /><span />
        </span>
      </button>
    </div>
  )
}
