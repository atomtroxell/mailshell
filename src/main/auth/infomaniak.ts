// src/main/auth/infomaniak.ts
// Infomaniak OAuth 2.0 flow — same PKCE + system browser + localhost callback pattern as Google.
// Infomaniak requires client_secret in the token exchange body even when PKCE is used.
// Endpoints discovered from https://manager.infomaniak.com -> Developer -> Applications.
import { BrowserWindow } from 'electron'
import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce'
import { startOAuthCallbackServer, buildCallbackUri } from './oauth-server'
import { buildAccountRecord, saveAccount, getAllAccounts } from './token-store'
import type { AccountRecord, AuthResult } from '@shared/ipc-types'

// Compile-time constants read from environment variables.
// Set INFOMANIAK_CLIENT_ID and INFOMANIAK_CLIENT_SECRET in .env (see .env.example).
export const INFOMANIAK_CLIENT_ID = process.env.INFOMANIAK_CLIENT_ID ?? 'YOUR_INFOMANIAK_CLIENT_ID'
const INFOMANIAK_CLIENT_SECRET = process.env.INFOMANIAK_CLIENT_SECRET ?? ''

const INFOMANIAK_AUTH_URL = 'https://login.infomaniak.com/authorize'
const INFOMANIAK_TOKEN_URL = 'https://login.infomaniak.com/token'
const INFOMANIAK_USERINFO_URL = 'https://login.infomaniak.com/oauth2/userinfo'
const INFOMANIAK_SCOPES = 'openid email profile'

interface InfomaniakTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

interface InfomaniakUserInfo {
  email: string
  name?: string
}

export function buildInfomaniakAuthUrl(params: {
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string
}): string {
  const url = new URL(INFOMANIAK_AUTH_URL)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', INFOMANIAK_SCOPES)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', params.state)
  return url.toString()
}

export async function exchangeInfomaniakCode(params: {
  code: string
  codeVerifier: string
  redirectUri: string
  clientId: string
}): Promise<InfomaniakTokenResponse> {
  const res = await fetch(INFOMANIAK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      client_secret: INFOMANIAK_CLIENT_SECRET,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Infomaniak token exchange failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<InfomaniakTokenResponse>
}

export async function fetchInfomaniakUserInfo(accessToken: string): Promise<InfomaniakUserInfo> {
  const res = await fetch(INFOMANIAK_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch Infomaniak user info: ${res.status}`)
  return res.json() as Promise<InfomaniakUserInfo>
}

export async function refreshInfomaniakToken(encryptedRefreshToken: string, clientId: string): Promise<{ accessToken: string; expiresIn: number }> {
  // Import decryptToken lazily to avoid safeStorage before app ready
  const { decryptToken } = await import('./token-store')
  const refreshToken = decryptToken(encryptedRefreshToken)
  const res = await fetch(INFOMANIAK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: INFOMANIAK_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Infomaniak token refresh failed (${res.status}): ${body}`)
  }
  const data = await res.json() as { access_token: string; expires_in: number }
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}

// In-memory store for the cancel signal — allows CANCEL_AUTH IPC to abort the flow
let cancelCurrentAuth: (() => void) | null = null

export function cancelInfomaniakAuth(): void {
  cancelCurrentAuth?.()
  cancelCurrentAuth = null
}

/** Full Infomaniak OAuth flow. Returns AuthResult. Call from within an IPC handler. */
export async function startInfomaniakAuthFlow(): Promise<AuthResult> {
  const verifier = generateCodeVerifier()
  const challenge = generateCodeChallenge(verifier)
  const state = generateState()

  let server: Awaited<ReturnType<typeof startOAuthCallbackServer>> | null = null
  let authWin: BrowserWindow | null = null

  try {
    server = await startOAuthCallbackServer()
    const redirectUri = buildCallbackUri(server.port)
    const authUrl = buildInfomaniakAuthUrl({
      clientId: INFOMANIAK_CLIENT_ID,
      redirectUri,
      codeChallenge: challenge,
      state,
    })

    let cancelled = false

    authWin = new BrowserWindow({
      width: 800,
      height: 700,
      title: 'Sign in to Infomaniak',
      webPreferences: {
        partition: 'persist:infomaniak',
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    })

    // Strip "Electron/x.x.x" from the user agent
    authWin.webContents.setUserAgent(
      authWin.webContents.getUserAgent().replace(/\s*Electron\/[\d.]+/, '')
    )

    cancelCurrentAuth = () => {
      cancelled = true
      if (authWin && !authWin.isDestroyed()) authWin.close()
    }

    const windowClosedPromise = new Promise<never>((_, reject) => {
      authWin!.on('closed', () => {
        void server?.stop()
        reject(new Error('Sign-in was cancelled'))
      })
    })

    void authWin.loadURL(authUrl)

    const { code, state: returnedState } = await Promise.race([
      server.waitForCallback(),
      windowClosedPromise,
    ]).finally(() => {
      if (authWin && !authWin.isDestroyed()) authWin.close()
      authWin = null
      cancelCurrentAuth = null
    })

    if (cancelled) {
      return { success: false, error: 'Sign-in was cancelled' }
    }

    // Validate state to prevent CSRF
    if (returnedState !== state) {
      return { success: false, error: 'Security check failed. Please try again.' }
    }

    const tokens = await exchangeInfomaniakCode({ code, codeVerifier: verifier, redirectUri, clientId: INFOMANIAK_CLIENT_ID })
    const userInfo = await fetchInfomaniakUserInfo(tokens.access_token)

    // Duplicate account check
    const existing = getAllAccounts()
    if (existing.some((a: AccountRecord) => a.email === userInfo.email)) {
      return { success: false, error: 'This account is already connected.' }
    }

    const record = buildAccountRecord({
      provider: 'infomaniak',
      email: userInfo.email,
      displayName: userInfo.name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    })
    saveAccount(record)

    return { success: true, accountId: record.id }
  } catch (err) {
    void server?.stop()
    cancelCurrentAuth = null
    const message = err instanceof Error ? err.message : 'Sign-in failed. Please try again.'
    return { success: false, error: message }
  }
}
