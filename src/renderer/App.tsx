import { useEffect, useState } from 'react'
import type { InitialState } from '../shared/ipc-types'
import WelcomeScreen from './components/WelcomeScreen'

export default function App() {
  const [initialState, setInitialState] = useState<InitialState | null>(null)

  useEffect(() => {
    window.mailshell.getInitialState().then(setInitialState)
  }, [])

  if (!initialState) return null

  if (!initialState.hasAccounts) {
    return <WelcomeScreen />
  }

  return (
    <div className="app-shell">
      <p>App shell (Phase 2+)</p>
    </div>
  )
}
