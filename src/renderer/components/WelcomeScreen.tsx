import React from 'react'

export function WelcomeScreen(): React.ReactElement {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-logo">Mailshell</h1>
        <button className="welcome-cta" type="button" disabled>
          Get started
        </button>
      </div>
    </div>
  )
}
