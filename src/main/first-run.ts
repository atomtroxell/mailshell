// src/main/first-run.ts
// The first-run choice of mail service. It is shown inside the MailShell window,
// not as a system dialog, until the user picks Gmail or Exchange. There is no
// skip option. A pick is saved, and MailShell restarts so the window is set up
// for that service.

import { app } from 'electron'
import { loadPreferences, savePreferences } from './preferences'
import { THEME_VARS } from './theme-css'

export type ProviderChoice = 'gmail' | 'exchange'

// The chooser's links point here. The main window's navigation handler catches
// them, so the address never loads.
const CHOOSE_PREFIX = 'https://mailshell.invalid/choose?provider='

/** The choice a navigation address stands for, or null when it is not a choice. */
export function parseChoice(url: string): ProviderChoice | null {
  if (!url.startsWith(CHOOSE_PREFIX)) return null
  const value = url.slice(CHOOSE_PREFIX.length)
  return value === 'gmail' || value === 'exchange' ? value : null
}

/** Address of the chooser page, for the main window to load. */
export function chooserUrl(): string {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MailShell - Choose your mail</title>
<style>
${THEME_VARS}
  body { font-family: system-ui, sans-serif; background: var(--bg-alt); color: var(--fg-strong); margin: 0; display: flex; justify-content: center; padding: 64px 16px; }
  main { max-width: 440px; width: 100%; }
  h1 { font-size: 24px; font-weight: 500; margin: 0 0 8px; }
  p { color: var(--muted); margin: 0 0 24px; line-height: 1.5; }
  a.choice { display: block; text-decoration: none; color: var(--fg-strong); background: var(--surface); border: 1px solid var(--border-soft); border-radius: 10px; padding: 16px 18px; margin-bottom: 12px; }
  a.choice:hover { border-color: var(--link); }
  a.choice strong { display: block; font-size: 16px; margin-bottom: 4px; }
  a.choice span { color: var(--muted); font-size: 13px; }
  .small { color: var(--muted-alt); font-size: 12px; margin-top: 20px; }
</style>
</head>
<body>
<main>
<h1>Which mail do you use?</h1>
<p>Choose the service MailShell should open. You can change this later in Settings.</p>
<a class="choice" href="${CHOOSE_PREFIX}gmail"><strong>Gmail</strong><span>Personal and Google Workspace accounts</span></a>
<a class="choice" href="${CHOOSE_PREFIX}exchange"><strong>Exchange / Microsoft 365</strong><span>Work and school accounts on Outlook on the web</span></a>
<p class="small">MailShell restarts after you choose.</p>
</main>
</body>
</html>`
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html)
}

/** Save the choice and restart MailShell, so the window opens for that service. */
export async function chooseProvider(choice: ProviderChoice): Promise<void> {
  const prefs = await loadPreferences()
  await savePreferences({ ...prefs, mailProvider: choice })
  app.relaunch()
  app.exit(0)
}
