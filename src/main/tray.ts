// src/main/tray.ts
// System tray icon. Closing the MailShell window hides it to the tray, so new-mail
// notifications keep arriving. "Quit MailShell" in the tray menu (or the app's
// own Exit) really closes the app.

import { app, Menu, nativeImage, Tray } from 'electron'
import path from 'path'

let tray: Tray | null = null
let quitting = false

/** Called before the app quits, so the window closes instead of hiding. */
export function markQuitting(): void {
  quitting = true
}

export function isQuitting(): boolean {
  return quitting
}

/**
 * The PNG icon. In a packaged build it ships as an extraResource (see
 * forge.config.ts); in development it is read from the project folder.
 */
function trayIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon-256.png')
    : path.join(app.getAppPath(), 'assets/icons/icon-256.png')
}

/** Create the tray icon once. `showWindow` brings the main window back. */
export function createTray(showWindow: () => void): void {
  if (tray) return
  const icon = nativeImage.createFromPath(trayIconPath()).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('MailShell')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open MailShell', click: showWindow },
      { type: 'separator' },
      { label: 'Quit MailShell', click: () => app.quit() },
    ])
  )
  // A click on the icon opens the window (Windows and Linux; macOS uses the menu)
  tray.on('click', showWindow)
}

/** Show the unread count in the tray tooltip. */
export function setTrayUnread(count: number): void {
  if (!tray) return
  tray.setToolTip(count > 0 ? `MailShell: ${count} unread` : 'MailShell')
}
