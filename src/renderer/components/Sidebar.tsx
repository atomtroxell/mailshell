import React from 'react'

interface SidebarProps {
  isOpen: boolean
}

export function Sidebar({ isOpen }: SidebarProps): React.ReactElement | null {
  if (!isOpen) return null
  return (
    <aside className="sidebar" aria-label="Sidebar">
      <div className="sidebar-placeholder">
        {/* Content added in future phases */}
      </div>
    </aside>
  )
}
