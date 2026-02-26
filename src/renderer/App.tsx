import React, { useEffect, useState } from 'react'
import { OnboardingScreen } from './components/OnboardingScreen'
import { AppShell } from './components/AppShell'

type AppState = 'loading' | 'onboarding' | 'shell'

export function App(): React.ReactElement {
  const [appState, setAppState] = useState<AppState>('loading')

  useEffect(() => {
    window.mailshell
      .getInitialState()
      .then(({ hasAccounts }) => {
        setAppState(hasAccounts ? 'shell' : 'onboarding')
      })
      .catch(() => {
        setAppState('onboarding')
      })
  }, [])

  if (appState === 'loading') {
    return <div className="app-loading" />
  }

  if (appState === 'onboarding') {
    return <OnboardingScreen onSuccess={() => setAppState('shell')} />
  }

  return <AppShell />
}
