// src/main/tray.ts
// System tray icon. Closing the MailShell window hides it to the tray, so new-mail
// notifications keep arriving. "Quit MailShell" in the tray menu (or the app's
// own Exit) really closes the app.

import { app, Menu, nativeImage, Tray, type NativeImage } from 'electron'
import path from 'path'

let tray: Tray | null = null
let quitting = false
// The normal tray icon, and the same icon with an unread dot (made once, then reused)
let baseIcon: NativeImage | null = null
let dotIcon: NativeImage | null = null

/** The base icon with a red dot in its top-right corner (drawn from the icon's pixels). */
function withUnreadDot(base: NativeImage): NativeImage {
  if (dotIcon) return dotIcon
  const size = 16
  const bitmap = Buffer.from(base.resize({ width: size, height: size }).toBitmap())
  const cx = 12
  const cy = 4
  const radius = 3.5
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      if (dx * dx + dy * dy > radius * radius) continue
      const i = (y * size + x) * 4
      // Bitmap pixels are BGRA. Red is #d93025.
      bitmap[i] = 0x25
      bitmap[i + 1] = 0x30
      bitmap[i + 2] = 0xd9
      bitmap[i + 3] = 0xff
    }
  }
  dotIcon = nativeImage.createFromBitmap(bitmap, { width: size, height: size })
  return dotIcon
}

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
  baseIcon = icon
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
  if (baseIcon) tray.setImage(count > 0 ? withUnreadDot(baseIcon) : baseIcon)
}
