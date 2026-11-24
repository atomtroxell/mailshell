// src/main/release-notice.ts
// Tells people when a newer MailShell release is out. This covers everyone who
// cannot update themselves: Mac and Linux, Windows with automatic updates turned
// off, and any build that has no update feed. The check reads the public release
// list from GitHub. It sends no account details.

import { app, BrowserWindow, dialog, shell } from 'electron';
import { appUpdatesSupported } from './app-updates';
import { loadPreferences, savePreferences } from './preferences';
import { isNewerVersion, pickNewestRelease, type NewestRelease, type ReleaseLike } from './update-check-core';

const RELEASES_API = 'https://api.github.com/repos/atomtroxell/mailshell/releases?per_page=10';
const RELEASE_PAGE_PREFIX = 'https://github.com/atomtroxell/mailshell/releases/';

/** The newest release found by the last check, if it is newer than this app. */
let newer: NewestRelease | null = null;

/** The newer release from the last check, or null. */
export function newerRelease(): NewestRelease | null {
  return newer;
}

/** Ask GitHub for the newest release. Returns it only if it is newer than this app. */
export async function checkForNewerRelease(): Promise<NewestRelease | null> {
  const response = await fetch(RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'MailShell' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  const releases = (await response.json()) as ReleaseLike[];
  const latest = pickNewestRelease(releases);
  newer = latest && isNewerVersion(latest.version, app.getVersion()) ? latest : null;
  return newer;
}

/** Open the release page of the newer version. Only pages on this project's GitHub releases. */
export async function openNewerRelease(): Promise<void> {
  if (!newer || !newer.url.startsWith(RELEASE_PAGE_PREFIX)) return;
  await shell.openExternal(newer.url);
}

/**
 * Show the popup for a newer release, once per version. Skipped when the app
 * installs updates itself (Windows, with automatic updates on): that path shows its own prompt.
 */
export async function noticeForNewerRelease(release: NewestRelease): Promise<void> {
  const prefs = await loadPreferences();
  if (appUpdatesSupported() && prefs.autoUpdateApp) return;
  if (prefs.lastNoticeVersion === release.version) return;

  // Record first, so the popup is not repeated on every check
  await savePreferences({ ...prefs, lastNoticeVersion: release.version });

  const selfUpdating = appUpdatesSupported();
  const detail = selfUpdating
    ? 'Automatic updates are turned off. Download the new version from the release page, or turn them on in Settings.'
    : "This version of MailShell can't install updates by itself yet. Download the new version from the release page.";
  const options = {
    type: 'info' as const,
    buttons: ['Download', 'Later'],
    defaultId: 0,
    cancelId: 1,
    title: 'MailShell update',
    message: `MailShell ${release.version} is available`,
    detail: `You have ${app.getVersion()}.\n\n${detail}`,
  };
  const parent = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  const { response } = parent ? await dialog.showMessageBox(parent, options) : await dialog.showMessageBox(options);
  if (response === 0) await openNewerRelease();
}
