// src/main/whats-new.ts
// Shows a short "What's new" popup the first time MailShell runs after an update.
// The notes for each release are written here by hand, keyed by version. A version
// with no notes shows nothing. Rules are in whats-new-core.ts.

import { app, BrowserWindow, dialog } from 'electron';
import { savePreferences, type Preferences } from './preferences';
import { decideWhatsNew, type WhatsNewNotes } from './whats-new-core';

// Add an entry here for each release, with the version exactly as in package.json.
export const WHATS_NEW: WhatsNewNotes = {
  '0.2.0-beta.2': [
    "Google changed its page and the Gmail layout had gone wrong. The header and mail rows fit again.",
    "Dark mode is Gmail's own now. Pick it in Gmail's Themes setting. I took out MailShell's own dark theme and its theme setting.",
    "Gmail style fixes reach you between releases. MailShell checks every 6 hours. You can turn that off in Settings.",
    "On Windows, MailShell can update itself. It asks before it restarts.",
    "There's a new Updates section in Settings, with a Check for updates now button. If a newer version is out, it'll tell you there too.",
  ],
};

/**
 * Call once the main window has loaded. Shows the notes if this is the first run
 * since an update, and records the version so the notice does not repeat.
 */
export async function showWhatsNewIfUpdated(win: BrowserWindow, prefs: Preferences): Promise<void> {
  const current = app.getVersion();
  const decision = decideWhatsNew({
    current,
    lastSeen: prefs.lastSeenVersion,
    hasChoice: prefs.mailProvider !== null,
    notes: WHATS_NEW,
  });

  // Record first, so a crash or a closed popup cannot make it repeat on every start
  if (decision.record) {
    await savePreferences({ ...prefs, lastSeenVersion: current });
  }
  if (!decision.show) return;

  const options = {
    type: 'info' as const,
    buttons: ['OK'],
    defaultId: 0,
    title: "What's new",
    message: `MailShell ${current}`,
    detail: decision.show.map((line) => `• ${line}`).join('\n'),
  };
  if (win.isDestroyed()) {
    await dialog.showMessageBox(options);
  } else {
    await dialog.showMessageBox(win, options);
  }
}
