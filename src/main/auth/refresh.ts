// src/main/auth/refresh.ts
// Silent token refresh scheduler. Runs every 30 minutes and refreshes tokens
// expiring within the next 5 minutes. Only triggers re-auth on explicit auth
// failures (4xx), not network errors — per locked design decision.
import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getAllAccounts, saveAccount, encryptToken } from './token-store'
import { refreshGoogleToken, GOOGLE_CLIENT_ID } from './google'

const REFRESH_INTERVAL_MS = 30 * 60 * 1000   // 30 minutes
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000   // refresh if expiring within 5 min

let refreshTimer: ReturnType<typeof setInterval> | null = null

export function startSilentRefreshScheduler(win: BrowserWindow): void {
  if (refreshTimer) return
  refreshTimer = setInterval(() => void runRefreshCycle(win), REFRESH_INTERVAL_MS)
}

export function stopSilentRefreshScheduler(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function runRefreshCycle(win: BrowserWindow): Promise<void> {
  const accounts = getAllAccounts()
  for (const account of accounts) {
    const expiresAt = account.tokens.expiresAt
    if (Date.now() + REFRESH_THRESHOLD_MS < expiresAt) continue  // not expiring soon

    if (!account.tokens.refreshToken) continue  // no refresh token, skip

    try {
      if (account.provider === 'google') {
        const { accessToken, expiresIn } = await refreshGoogleToken(account.tokens.refreshToken, GOOGLE_CLIENT_ID)
        saveAccount({
          ...account,
          tokens: {
            ...account.tokens,
            accessToken: encryptToken(accessToken),
            expiresAt: Date.now() + expiresIn * 1000,
          },
        })
      }
      // Infomaniak refresh added in Plan 05
    } catch (err) {
      // Per locked decision: only notify renderer on auth failure (not network errors)
      const isNetworkError = err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network'))
      if (!isNetworkError) {
        win.webContents.send(IPC_CHANNELS.AUTH_REFRESH_FAILED, account.id)
      }
    }
  }
}
