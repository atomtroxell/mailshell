import React, { useState } from 'react'
import { Provider } from '../../shared/ipc-types'

type ScreenState = 'provider-select' | 'waiting'

interface OnboardingScreenProps {
  onSuccess: () => void
}

export function OnboardingScreen({ onSuccess }: OnboardingScreenProps): React.ReactElement {
  const [screen, setScreen] = useState<ScreenState>('provider-select')
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async (provider: Provider): Promise<void> => {
    setScreen('waiting')
    setActiveProvider(provider)
    setError(null)
    try {
      const result = await window.mailshell.startAuth(provider)
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error ?? 'Sign-in failed. Please try again.')
        setScreen('provider-select')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
      setScreen('provider-select')
    }
  }

  const handleCancel = async (): Promise<void> => {
    await window.mailshell.cancelAuth()
    setScreen('provider-select')
    setActiveProvider(null)
  }

  const providerLabel = activeProvider === 'google' ? 'Google' : 'Infomaniak'

  if (screen === 'waiting') {
    return (
      <div className="onboarding-screen">
        <div className="onboarding-content onboarding-waiting">
          <h1 className="onboarding-logo">Mailshell</h1>
          <p className="onboarding-waiting-text">
            Connecting your {providerLabel} account
          </p>
          <p className="onboarding-waiting-hint">
            Complete sign-in in your browser, then return here
          </p>
          <button
            className="onboarding-cancel-btn"
            type="button"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-content">
        <h1 className="onboarding-logo">Mailshell</h1>
        <p className="onboarding-subtitle">Connect an account to get started</p>
        {error != null && (
          <p className="onboarding-error">{error}</p>
        )}
        <div className="onboarding-providers">
          <button
            className="onboarding-btn onboarding-btn--google"
            type="button"
            onClick={() => handleConnect('google')}
          >
            Connect Google account
          </button>
          <button
            className="onboarding-btn onboarding-btn--infomaniak"
            type="button"
            onClick={() => handleConnect('infomaniak')}
          >
            Connect Infomaniak account
          </button>
        </div>
      </div>
    </div>
  )
}
