import React, { useEffect, useState } from 'react'

export function StaleCssBanner(): React.ReactElement | null {
  const [staleProviders, setStaleProviders] = useState<string[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Load initial stale state from store (prevents banner flicker on restart)
    window.mailshell.getCssStaleness().then(setStaleProviders)

    // Listen for live sentinel check results from main process
    const cleanup = window.mailshell.onCssStale((provider, isStale) => {
      setStaleProviders(prev =>
        isStale
          ? prev.includes(provider) ? prev : [...prev, provider]
          : prev.filter(p => p !== provider)
      )
    })
    return cleanup
  }, [])

  if (dismissed || staleProviders.length === 0) return null

  return (
    <div className="stale-css-banner" role="status" aria-live="polite">
      <span>CSS selectors may be outdated - an update is on the way.</span>
      <button
        className="stale-css-banner__dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        x
      </button>
    </div>
  )
}
