// src/main/auth/google.ts
// Google OAuth 2.0 for Desktop (Installed) Apps with PKCE.
// No client_secret — Desktop app clients use PKCE only.
// Source: https://developers.google.com/identity/protocols/oauth2/native-app
import { BrowserWindow } from 'electron'
import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce'
import { startOAuthCallbackServer, buildCallbackUri } from './oauth-server'
import { buildAccountRecord, saveAccount, getAllAccounts } from './token-store'
import type { AccountRecord, AuthResult } from '@shared/ipc-types'

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v1/userinfo'
const GOOGLE_SCOPES = 'https://mail.google.com/ email profile'

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

interface GoogleUserInfo {
  email: string
  name?: string
}

export function buildGoogleAuthUrl(params: {
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string
}): string {
  const url = new URL(GOOGLE_AUTH_URL)
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_SCOPES)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', params.state)
  return url.toString()
}

export async function exchangeGoogleCode(params: {
  code: string
  codeVerifier: string
  redirectUri: string
  clientId: string
}): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google token exchange failed (${res.status}): ${body}`)
  }
  return res.json() as Promise<GoogleTokenResponse>
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch Google user info: ${res.status}`)
  return res.json() as Promise<GoogleUserInfo>
}

export async function refreshGoogleToken(encryptedRefreshToken: string, clientId: string): Promise<{ accessToken: string; expiresIn: number }> {
  // Import decryptToken lazily to avoid safeStorage before app ready
  const { decryptToken } = await import('./token-store')
  const refreshToken = decryptToken(encryptedRefreshToken)
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google token refresh failed (${res.status}): ${body}`)
  }
  const data = await res.json() as { access_token: string; expires_in: number }
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}

// In-memory store for the cancel signal — allows CANCEL_AUTH IPC to abort the flow
let cancelCurrentAuth: (() => void) | null = null

export function cancelGoogleAuth(): void {
  cancelCurrentAuth?.()
  cancelCurrentAuth = null
}

/** Full Google OAuth flow. Returns AuthResult. Call from within an IPC handler. */
export async function startGoogleAuthFlow(): Promise<AuthResult> {
  const verifier = generateCodeVerifier()
  const challenge = generateCodeChallenge(verifier)
  const state = generateState()

  let server: Awaited<ReturnType<typeof startOAuthCallbackServer>> | null = null
  let authWin: BrowserWindow | null = null

  try {
    server = await startOAuthCallbackServer()
    const redirectUri = buildCallbackUri(server.port)
    const authUrl = buildGoogleAuthUrl({
      clientId: GOOGLE_CLIENT_ID,
      redirectUri,
      codeChallenge: challenge,
      state,
    })

    let cancelled = false

    authWin = new BrowserWindow({
      width: 800,
      height: 700,
      title: 'Sign in to Google',
      webPreferences: {
        partition: 'persist:google',
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    })

    // Strip "Electron/x.x.x" from the user agent so Google does not flag this
    // as an embedded webview and block the OAuth flow
    authWin.webContents.setUserAgent(
      authWin.webContents.getUserAgent().replace(/\s*Electron\/[\d.]+/, '')
    )

    cancelCurrentAuth = () => {
      cancelled = true
      if (authWin && !authWin.isDestroyed()) authWin.close()
    }

    // Listen for window close before loadURL so the event is never missed
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

    const tokens = await exchangeGoogleCode({ code, codeVerifier: verifier, redirectUri, clientId: GOOGLE_CLIENT_ID })
    const userInfo = await fetchGoogleUserInfo(tokens.access_token)

    // Duplicate account check
    const existing = getAllAccounts()
    if (existing.some((a: AccountRecord) => a.email === userInfo.email)) {
      return { success: false, error: 'This account is already connected.' }
    }

    const record = buildAccountRecord({
      provider: 'google',
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
