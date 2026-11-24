// When MailShell looks for updates: Gmail styles and the app itself. Each has
// its own on/off setting in Settings. "Check for updates now" runs both at once.

import { BrowserWindow } from 'electron';
import { appUpdatesSupported, checkForAppUpdate } from './app-updates';
import { checkForGmailStyles, type StyleCheckResult } from './gmail-styles';
import { checkForNewerRelease, noticeForNewerRelease } from './release-notice';
import { loadPreferences, type Preferences } from './preferences';
import { provider } from './providers';

const EVERY_MS = 6 * 60 * 60 * 1000;
const FIRST_CHECK_MS = 20_000;

type Timers = { first: NodeJS.Timeout; repeat: NodeJS.Timeout };
const timers: { styles?: Timers; app?: Timers; notice?: Timers } = {};

const STYLE_TEXT: Record<StyleCheckResult, string> = {
  updated: 'Gmail styles updated.',
  unchanged: 'Gmail styles are up to date.',
  unavailable: 'Could not reach the Gmail style server.',
  rejected: 'The new Gmail styles failed the checks and were not used.',
};

/** Re-apply the Gmail look to every open Gmail page and compose window. */
async function reapplyGmailLooks(): Promise<void> {
  const prefs = await loadPreferences();
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    const contents = win.webContents;
    const url = contents.getURL();
    if (provider.isMailPage(url) || provider.isComposeScreen(url)) {
      await provider.applyLook(contents, prefs).catch((error: Error) =>
        console.error('Could not re-apply Gmail styles:', error.message),
      );
    }
  }
}

/** Check for new Gmail styles. Only Gmail has them. Re-applies the look when they change. */
async function styleCheck(): Promise<StyleCheckResult | 'skipped'> {
  if (provider.id !== 'gmail') return 'skipped';
  const result = await checkForGmailStyles();
  console.info('Gmail style check:', result);
  if (result === 'updated') await reapplyGmailLooks();
  return result;
}

/**
 * Look for a newer release on GitHub and tell the user about it. This runs on
 * every platform, and even when automatic updates are off, because those are the
 * people it is for.
 */
async function noticeCheck(): Promise<void> {
  const found = await checkForNewerRelease();
  if (found) await noticeForNewerRelease(found);
}

function schedule(kind: 'styles' | 'app' | 'notice', enabled: boolean, run: () => Promise<unknown>): void {
  const old = timers[kind];
  if (old) {
    clearTimeout(old.first);
    clearInterval(old.repeat);
    delete timers[kind];
  }
  if (!enabled) return;
  const tick = (): void => {
    run().catch((error: Error) => console.warn(`Scheduled ${kind} check failed:`, error.message));
  };
  timers[kind] = { first: setTimeout(tick, FIRST_CHECK_MS), repeat: setInterval(tick, EVERY_MS) };
}

/** Start or stop the scheduled checks to match the saved settings. Call at startup and after a change. */
export function applyUpdateSettings(prefs: Preferences): void {
  schedule('styles', prefs.autoUpdateStyles !== false && provider.id === 'gmail', styleCheck);
  schedule('app', prefs.autoUpdateApp !== false && appUpdatesSupported(), () => checkForAppUpdate());
  schedule('notice', true, noticeCheck);
}

let checking = false;

/** The Settings button. Runs both checks now, whatever the toggles say. */
export async function checkNow(): Promise<string> {
  if (checking) return 'A check is already running.';
  checking = true;
  try {
    const lines: string[] = [];
    try {
      const styles = await styleCheck();
      if (styles !== 'skipped') lines.push(STYLE_TEXT[styles]);
    } catch (error) {
      lines.push(`Could not check Gmail styles: ${(error as Error).message}`);
    }
    if (appUpdatesSupported()) {
      try {
        lines.push(await checkForAppUpdate());
      } catch (error) {
        lines.push(`Could not check for MailShell updates: ${(error as Error).message}`);
      }
    }
    // Every platform checks the release list, so Mac and Linux users hear about updates too
    try {
      const found = await checkForNewerRelease();
      if (found) lines.push(`MailShell ${found.version} is available. Use Download to get it.`);
      else if (!appUpdatesSupported()) lines.push('MailShell is up to date.');
    } catch (error) {
      lines.push(`Could not check for new MailShell releases: ${(error as Error).message}`);
    }
    return lines.join(' ');
  } finally {
    checking = false;
  }
}
