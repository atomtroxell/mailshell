import React, { useEffect, useState } from 'react'
import { WelcomeScreen } from './components/WelcomeScreen'

type AppState = 'loading' | 'welcome' | 'shell'

export function App(): React.ReactElement {
  const [appState, setAppState] = useState<AppState>('loading')

  useEffect(() => {
    window.mailshell
      .getInitialState()
      .then(({ hasAccounts }) => {
        setAppState(hasAccounts ? 'shell' : 'welcome')
      })
      .catch(() => {
        // Fallback to welcome screen on error
        setAppState('welcome')
      })
  }, [])

  if (appState === 'loading') {
    // Blank while loading — avoids flash of wrong screen
    return <div className="app-loading" />
  }

  if (appState === 'welcome') {
    return <WelcomeScreen />
  }

  // appState === 'shell' — placeholder for Phase 2 tab bar + webview shell
  return (
    <div className="app-shell">
      <div className="tab-bar">
        <span className="app-title">Mailshell</span>
      </div>
      <div className="content-area" />
    </div>
  )
}
