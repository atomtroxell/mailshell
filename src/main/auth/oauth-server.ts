// src/main/auth/oauth-server.ts
import http from 'node:http'

export const CALLBACK_PATH = '/oauth/callback'
const CANDIDATE_PORTS = [9000, 9001, 9002]

export interface OAuthCallbackResult {
  code: string
  state: string
}

export async function startOAuthCallbackServer(): Promise<{
  port: number
  waitForCallback: (timeoutMs?: number) => Promise<OAuthCallbackResult>
  stop: () => Promise<void>
}> {
  let server: http.Server | null = null
  let actualPort: number | null = null

  for (const port of CANDIDATE_PORTS) {
    try {
      await new Promise<void>((resolve, reject) => {
        const s = http.createServer()
        s.listen(port, '127.0.0.1', () => { server = s; resolve() })
        s.on('error', reject)
      })
      actualPort = port
      break
    } catch {
      // port in use, try next
    }
  }

  if (!server || actualPort === null) {
    throw new Error('All OAuth callback ports (9000, 9001, 9002) are in use. Close conflicting apps and retry.')
  }

  const port = actualPort
  const srv = server as http.Server

  const waitForCallback = (timeoutMs = 120_000): Promise<OAuthCallbackResult> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        srv.close()
        reject(new Error('OAuth sign-in timed out. Please try again.'))
      }, timeoutMs)

      srv.on('request', (req, res) => {
        const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
        if (url.pathname !== CALLBACK_PATH) {
          res.writeHead(404)
          res.end()
          return
        }

        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const error = url.searchParams.get('error')

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(
          '<!DOCTYPE html><html><head><title>Mailshell</title></head>' +
          '<body style="font-family:system-ui;text-align:center;padding:60px">' +
          '<h1>Sign-in complete</h1>' +
          '<p>You can close this tab and return to Mailshell.</p>' +
          '</body></html>'
        )

        clearTimeout(timer)
        srv.close()

        if (error) {
          reject(new Error(error === 'access_denied' ? 'Sign-in was cancelled' : `Auth error: ${error}`))
        } else if (!code || !state) {
          reject(new Error('Invalid OAuth callback: missing code or state'))
        } else {
          resolve({ code, state })
        }
      })
    })

  const stop = (): Promise<void> =>
    new Promise((resolve) => srv.close(() => resolve()))

  return { port, waitForCallback, stop }
}

export function buildCallbackUri(port: number): string {
  return `http://127.0.0.1:${port}${CALLBACK_PATH}`
}
