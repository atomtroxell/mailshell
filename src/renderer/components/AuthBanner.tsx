import React from 'react'
import type { Provider } from '@shared/ipc-types'

interface AuthBannerProps {
  accountId: string
  email: string
  provider: Provider
  onDismiss: (accountId: string) => void
  onReconnect: (accountId: string) => void
}

export function AuthBanner({ accountId, email, provider, onDismiss, onReconnect }: AuthBannerProps): React.ReactElement {
  const providerName = provider === 'google' ? 'Google' : 'Infomaniak'
  return (
    <div className="auth-banner" role="alert">
      <span className="auth-banner-message">
        {email} ({providerName}): Session expired.
      </span>
      <button className="auth-banner-reconnect-btn" onClick={() => onReconnect(accountId)}>
        Re-connect
      </button>
      <button className="auth-banner-dismiss-btn" onClick={() => onDismiss(accountId)} aria-label="Dismiss">
        &times;
      </button>
    </div>
  )
}
