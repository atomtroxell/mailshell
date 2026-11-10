// src/renderer/App.tsx
// Main application component with hash-based routing

import React, { useState, useEffect } from 'react'
import { SettingsPanel } from './components/SettingsPanel'

function App() {
  const [route, setRoute] = useState<string>(window.location.hash.slice(1) || '/')

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash.slice(1) || '/')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Render Settings panel if route is /settings
  if (route === '/settings') {
    return <SettingsPanel />
  }

  // Default: show placeholder (this is for the main window which loads Gmail directly)
  return (
    <div style={{ width: '100%', height: '100%', margin: 0, padding: 0 }}>
      <h1>MailShell</h1>
      <p>Loading Gmail...</p>
    </div>
  )
}

export default App
