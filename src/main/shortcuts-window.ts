// src/main/shortcuts-window.ts
// Keyboard Shortcuts reference window: singleton, non-modal, no preload (zero IPC surface)

import { BrowserWindow } from 'electron'
import { SHORTCUTS, formatAccelerator, ShortcutGroup } from '../shared/shortcuts'
import { escapeHtml } from '../shared/html'

const GROUP_ORDER: ShortcutGroup[] = ['App', 'Edit', 'View', 'Account', 'Help']

export function buildShortcutsHtml(platform: string): string {
  const sections = GROUP_ORDER.map((group) => {
    const entries = SHORTCUTS.filter((s) => s.group === group)
    if (entries.length === 0) return ''
    const rows = entries
      .map((entry) => {
        const keys = formatAccelerator(entry.accelerator, platform)
          .map((key) => `<kbd>${escapeHtml(key)}</kbd>`)
          .join(' + ')
        return `<tr data-shortcut-id="${escapeHtml(entry.id)}"><td class="label">${escapeHtml(entry.label)}</td><td class="keys">${keys}</td></tr>`
      })
      .join('')
    return `<section><h2>${escapeHtml(group)}</h2><table>${rows}</table></section>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Keyboard Shortcuts</title>
<style>
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
    background: #f5f5f5;
    color: #202124;
    padding: 16px 20px;
    box-sizing: border-box;
    overflow-y: auto;
  }
  h1 { font-size: 18px; margin: 0 0 12px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #5f6368; margin: 16px 0 6px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 6px; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  td.keys { text-align: right; white-space: nowrap; }
  kbd {
    display: inline-block; min-width: 18px; padding: 2px 6px; text-align: center;
    font: 12px 'Segoe UI', sans-serif; background: #fafafa; border: 1px solid #ccc;
    border-bottom-width: 2px; border-radius: 4px;
  }
  p { font-size: 13px; color: #3c4043; line-height: 1.4; }
  .hint { font-size: 12px; color: #5f6368; }
</style>
</head>
<body>
<h1>Keyboard Shortcuts</h1>
${sections}
<section>
<h2>Gmail shortcuts</h2>
<p>Gmail has its own keyboard shortcuts. Turn on "Keyboard shortcuts" in Gmail Settings, then press ? inside Gmail to see them.</p>
</section>
<p class="hint">Press Esc to close.</p>
</body>
</html>`
}

let shortcutsWindow: BrowserWindow | null = null

export async function createShortcutsWindow(parent: BrowserWindow): Promise<void> {
  if (shortcutsWindow && !shortcutsWindow.isDestroyed()) {
    shortcutsWindow.focus()
    return
  }

  const win = new BrowserWindow({
    width: 460,
    height: 640,
    parent,
    modal: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    title: 'Keyboard Shortcuts',
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })
  shortcutsWindow = win

  win.removeMenu()

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault()
      win.close()
    }
  })

  win.on('closed', () => {
    if (shortcutsWindow === win) shortcutsWindow = null
  })

  try {
    await win.loadURL(
      'data:text/html;charset=utf-8,' + encodeURIComponent(buildShortcutsHtml(process.platform)),
    )
    if (!win.isDestroyed()) win.show()
  } catch (error) {
    console.error('Failed to load shortcuts window:', error)
    if (!win.isDestroyed()) win.destroy()
    throw error
  }
}
