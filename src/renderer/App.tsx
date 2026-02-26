import React, { useEffect, useState } from 'react'
import { WelcomeScreen } from './components/WelcomeScreen'
import { AppShell } from './components/AppShell'

type AppState = 'loading' | 'welcome' | 'shell'

// DEV: Force shell state for Phase 2 development.
// Phase 4 (Account Onboarding) will remove this flag and let hasAccounts drive routing.
const DEV_FORCE_SHELL = true

export function App(): React.ReactElement {
  const [appState, setAppState] = useState<AppState>('loading')

  useEffect(() => {
    window.mailshell
      .getInitialState()
      .then(({ hasAccounts }) => {
        setAppState(hasAccounts || DEV_FORCE_SHELL ? 'shell' : 'welcome')
      })
      .catch(() => {
        setAppState(DEV_FORCE_SHELL ? 'shell' : 'welcome')
      })
  }, [])

  if (appState === 'loading') {
    return <div className="app-loading" />
  }

  if (appState === 'welcome') {
    return <WelcomeScreen />
  }

  return <AppShell />
}
