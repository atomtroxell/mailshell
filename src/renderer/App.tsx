// src/renderer/App.tsx
// Main application component

import React, { useState } from 'react'
import AccountStatus from './components/AccountStatus'
import AccountControls from './components/AccountControls'

function App() {
  const [accountStatus, setAccountStatus] = useState<boolean | null>(null)

  return (
    <div style={{ width: '100%', height: '100%', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <h1 style={{ margin: '0 0 10px 0' }}>Mailshell</h1>
        <p style={{ margin: 0, color: '#666' }}>Secure Gmail client with account management</p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2>Account Management</h2>
          <AccountStatus onStatusChange={setAccountStatus} />
          <AccountControls
            onStatusChange={setAccountStatus}
            onSave={() => console.log('Account saved')}
            onRemove={() => console.log('Account removed')}
          />

          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
            <h3>Status Information</h3>
            <p style={{ margin: '10px 0', color: '#666' }}>
              Current account state: {accountStatus === null ? 'checking...' : accountStatus ? 'Saved' : 'Not saved'}
            </p>
            <p style={{ margin: '10px 0', fontSize: '12px', color: '#999' }}>
              The account management system allows you to explicitly control whether your Gmail credentials are persisted locally.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
