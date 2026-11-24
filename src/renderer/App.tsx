// src/renderer/App.tsx
// Renderer placeholder. The main window loads Gmail directly, and Settings is its
// own window (see src/main/settings-window.ts), so this page is only a fallback.

import React from 'react'

function App() {
  return (
    <div style={{ width: '100%', height: '100%', margin: 0, padding: 0 }}>
      <h1>MailShell</h1>
      <p>Loading Gmail...</p>
    </div>
  )
}

export default App
