// src/main/error-page.ts
// Error recovery page for main-frame load failures and renderer crashes.
// Copy is chosen from a fixed table by ErrorKind. Raw URLs and error
// descriptions are never rendered.

import { BrowserWindow } from 'electron'
import { escapeHtml } from '../shared/html'
import { THEME_VARS } from './theme-css'

export type ErrorKind = 'offline' | 'timeout' | 'cert' | 'crash' | 'unknown'

// Chromium net error codes, from net/base/net_error_list.h (verified 2026-11-05)
export const NET_ERROR = {
  ABORTED: -3,
  TIMED_OUT: -7,
  NETWORK_CHANGED: -21,
  CONNECTION_CLOSED: -100,
  CONNECTION_RESET: -101,
  CONNECTION_REFUSED: -102,
  NAME_NOT_RESOLVED: -105,
  INTERNET_DISCONNECTED: -106,
  ADDRESS_UNREACHABLE: -109,
  CONNECTION_TIMED_OUT: -118,
  PROXY_CONNECTION_FAILED: -130,
  NAME_RESOLUTION_FAILED: -137,
  CERT_FIRST: -200,
  CERT_END: -220,
} as const

export function classifyLoadError(code: number, online: boolean): ErrorKind {
  if (!online) return 'offline'
  if (code <= NET_ERROR.CERT_FIRST && code > NET_ERROR.CERT_END) return 'cert'
  switch (code) {
    case NET_ERROR.INTERNET_DISCONNECTED:
    case NET_ERROR.NAME_NOT_RESOLVED:
    case NET_ERROR.NAME_RESOLUTION_FAILED:
    case NET_ERROR.ADDRESS_UNREACHABLE:
    case NET_ERROR.PROXY_CONNECTION_FAILED:
    case NET_ERROR.NETWORK_CHANGED:
    case NET_ERROR.CONNECTION_REFUSED:
    case NET_ERROR.CONNECTION_RESET:
    case NET_ERROR.CONNECTION_CLOSED:
      return 'offline'
    case NET_ERROR.TIMED_OUT:
    case NET_ERROR.CONNECTION_TIMED_OUT:
      return 'timeout'
    default:
      return 'unknown'
  }
}

const ERROR_COPY: Record<ErrorKind, { title: string; body: string; steps: readonly string[] }> = {
  offline: {
    title: "Can't reach Gmail",
    body: "MailShell couldn't connect to Gmail.",
    steps: [
      'Check your internet connection.',
      'If you use a VPN or proxy, check that it is connected.',
      'MailShell will try again automatically when your connection comes back.',
    ],
  },
  timeout: {
    title: 'Gmail took too long to respond',
    body: 'The connection to Gmail timed out.',
    steps: ['Check your internet connection.', 'Try again in a moment.'],
  },
  cert: {
    title: 'Secure connection failed',
    body: "MailShell couldn't verify Gmail's security certificate.",
    steps: [
      "Check that your computer's date and time are correct.",
      'Security software or network filtering can cause this. Try another network.',
    ],
  },
  crash: {
    title: 'Gmail stopped unexpectedly',
    body: 'The Gmail view stopped working.',
    steps: ['Try again. This usually fixes it.', 'If it keeps happening, use Clear cache and try again.'],
  },
  unknown: {
    title: "Gmail didn't load",
    body: 'Something went wrong while loading Gmail.',
    steps: ['Try again.', 'If it keeps happening, use Clear cache and try again.'],
  },
}

export function buildErrorHtml(kind: ErrorKind, reference: string): string {
  const copy = ERROR_COPY[kind]
  const steps = copy.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')
  const autoRetry =
    kind === 'offline'
      ? `window.addEventListener('online', function () { location.href = 'https://mail.google.com' }, { once: true })`
      : ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<title>MailShell - Gmail unavailable</title>
<style>
${THEME_VARS}
  body { font-family: system-ui, sans-serif; background: var(--bg-alt); color: var(--fg-strong); margin: 0; display: flex; justify-content: center; padding: 64px 16px; }
  main { max-width: 480px; }
  h1 { font-size: 24px; font-weight: 500; }
  a#retry, button { display: inline-block; font-size: 14px; padding: 8px 16px; border-radius: 4px; border: 1px solid var(--link); cursor: pointer; margin-right: 8px; }
  a#retry { background: var(--link); color: var(--link-fg); text-decoration: none; }
  button { background: var(--surface); color: var(--link); }
  .small { color: var(--muted-alt); font-size: 12px; margin-top: 24px; }
</style>
</head>
<body>
<main>
<h1>${escapeHtml(copy.title)}</h1>
<p>${escapeHtml(copy.body)}</p>
<ul>${steps}</ul>
<p><a id="retry" href="https://mail.google.com">Try again</a><button id="clear-cache">Clear cache and try again</button></p>
<p id="cache-msg"></p>
<p class="small">To open Settings, use Edit &gt; Preferences (Ctrl+Shift+P).</p>
<p class="small">Error reference: ${escapeHtml(reference)}</p>
</main>
<script>
(function () {
  var btn = document.getElementById('clear-cache')
  var msg = document.getElementById('cache-msg')
  var api = window.electron ? window.electron.preferences : null
  if (!api || typeof api.clearCache !== 'function') {
    btn.style.display = 'none'
  } else {
    btn.addEventListener('click', async function () {
      btn.disabled = true
      var ok = false
      try {
        ok = await api.clearCache()
      } catch (e) {
        ok = false
      }
      if (ok === true) {
        location.href = 'https://mail.google.com'
      } else {
        msg.textContent = "Couldn't clear the cache from here. Use Edit > Preferences > Clear cache."
      }
    })
  }
  ${autoRetry}
})()
</script>
</body>
</html>`
}

export function showErrorPage(win: BrowserWindow, kind: ErrorKind, code?: number): void {
  if (win.isDestroyed()) return
  const reference =
    typeof code === 'number' ? `NET${Math.abs(code)}` : kind === 'crash' ? 'CRASH' : 'ERR'
  win.webContents
    .loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(buildErrorHtml(kind, reference)))
    .then(() => {
      if (!win.isDestroyed() && !win.isVisible()) win.show()
    })
    .catch((e) => console.error('Failed to show error page:', e))
}

/** For logs only; never put in HTML. */
export function sanitizeUrlForLog(url: string): string {
  try {
    const u = new URL(url)
    return u.origin + u.pathname
  } catch {
    return '<unparseable>'
  }
}
