import React, { useEffect, useState, useCallback } from 'react'
import type { AccountRecord } from '@shared/ipc-types'

interface AccountsSectionProps {
  onLastAccountRemoved: () => void
}

function providerLabel(provider: AccountRecord['provider']): string {
  return provider === 'google' ? 'Google' : 'Infomaniak'
}

export function AccountsSection({ onLastAccountRemoved }: AccountsSectionProps): React.ReactElement {
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [addingProvider, setAddingProvider] = useState<AccountRecord['provider'] | null>(null)

  useEffect(() => {
    window.mailshell.getAccounts().then(setAccounts)
  }, [])

  const handleRemoveClick = (accountId: string) => {
    setConfirmingId(accountId)
  }

  const handleConfirmRemove = useCallback(async (account: AccountRecord) => {
    await window.mailshell.removeAccount(account.id)
    const updated = await window.mailshell.getAccounts()
    setAccounts(updated)
    setConfirmingId(null)
    if (updated.length === 0) {
      onLastAccountRemoved()
    }
  }, [onLastAccountRemoved])

  const handleCancelRemove = () => {
    setConfirmingId(null)
  }

  const handleAddAccount = async (provider: AccountRecord['provider']) => {
    setAddingProvider(provider)
    try {
      const result = await window.mailshell.startAuth(provider)
      if (result.success) {
        const updated = await window.mailshell.getAccounts()
        setAccounts(updated)
      }
    } finally {
      setAddingProvider(null)
    }
  }

  return (
    <div className="accounts-section">
      <h3 className="accounts-section-title">Connected Accounts</h3>
      {accounts.length === 0 && (
        <p className="accounts-empty">No accounts connected.</p>
      )}
      {accounts.map((account) => {
        const isConfirming = confirmingId === account.id
        const providerName = providerLabel(account.provider)
        return (
          <div key={account.id} className="account-row">
            <span className={`account-provider-badge account-provider-badge--${account.provider}`}>
              {account.provider === 'google' ? 'G' : 'I'}
            </span>
            <span className="account-email" title={account.email}>
              {account.email}
            </span>
            {isConfirming ? (
              <>
                <span className="account-confirm-text">
                  Remove this account? This will close the {providerName} tab.
                </span>
                <button
                  className="account-confirm-yes-btn"
                  onClick={() => handleConfirmRemove(account)}
                >
                  Yes
                </button>
                <button
                  className="account-confirm-cancel-btn"
                  onClick={handleCancelRemove}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="account-remove-btn"
                onClick={() => handleRemoveClick(account.id)}
              >
                Remove
              </button>
            )}
          </div>
        )
      })}
      <button
        className="accounts-add-btn"
        onClick={() => handleAddAccount('google')}
        disabled={addingProvider !== null}
      >
        {addingProvider === 'google' ? 'Connecting...' : '+ Add Google account'}
      </button>
      <button
        className="accounts-add-btn"
        onClick={() => handleAddAccount('infomaniak')}
        disabled={addingProvider !== null}
      >
        {addingProvider === 'infomaniak' ? 'Connecting...' : '+ Add Infomaniak account'}
      </button>
    </div>
  )
}
