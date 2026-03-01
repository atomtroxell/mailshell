import React, { useEffect, useState } from 'react'
import { OnboardingScreen } from './components/OnboardingScreen'
import { AppShell } from './components/AppShell'
import { SettingsPanel } from './components/SettingsPanel'

type AppState = 'loading' | 'onboarding' | 'shell'

// Detect settings window mode: loaded with ?view=settings by createSettingsWindow()
const isSettingsWindow = new URLSearchParams(window.location.search).get('view') === 'settings'

export function App(): React.ReactElement {
  if (isSettingsWindow) {
    // Render settings panel as a standalone full-window overlay.
    // onClose and onSignedOut both close this child window; main process
    // handles routing the main window to onboarding via SIGNED_OUT push.
    return (
      <SettingsPanel
        onClose={() => window.close()}
        onSignedOut={() => window.close()}
      />
    )
  }

  return <MainApp />
}

function MainApp(): React.ReactElement {
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

  return <AppShell onSignedOut={() => setAppState('onboarding')} />
}
