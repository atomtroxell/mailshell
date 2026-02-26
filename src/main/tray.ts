// src/main/tray.ts
// System tray creation and window restore/hide lifecycle.
// The module-level `tray` reference prevents the Tray instance from being
// garbage collected (Electron will crash if the Tray is GC'd).

import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import path from 'path'

let tray: Tray | null = null

export function createTray(win: BrowserWindow): void {
  // Locate the tray icon relative to app root.
  // macOS "Template" naming (trayTemplate.png) enables adaptive light/dark rendering.
  const iconPath = path.join(app.getAppPath(), 'assets/icons/trayTemplate.png')
  let icon = nativeImage.createFromPath(iconPath)

  // Fallback: if icon file is missing, use an empty image to prevent crash
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('Mailshell')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Restore',
      click: () => restoreWindow(win),
    },
    {
      label: 'Mute notifications',
      type: 'checkbox',
      checked: false,
      click: (_item) => {
        // Phase 5 will read _item.checked to toggle notification state
        // Store the mute preference for Phase 5 to read
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        // CRITICAL: set isQuitting flag BEFORE app.quit().
        // The win.on('close') handler checks this flag — without it, Quit
        // from the tray menu silently calls win.hide() instead of quitting.
        ;(app as typeof app & { isQuitting: boolean }).isQuitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(contextMenu)

  // Single click restores window.
  // On macOS single click normally shows context menu — override to restore instead.
  tray.on('click', () => restoreWindow(win))
}

function restoreWindow(win: BrowserWindow): void {
  if (process.platform === 'darwin') {
    app.dock?.show()
  }
  win.show()
  win.focus()
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
