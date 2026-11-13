// src/main/notify.ts
// New-mail notifications. Called when the inbox unread count goes up while the
// MailShell window is not in focus. The newest unread row supplies the sender
// and subject; if the page cannot be read, the notification shows the count only.

import { Notification, type BrowserWindow } from 'electron'
import { provider } from './providers'

/** Show a notification for `added` new messages. Clicking it brings the window forward. */
export async function notifyNewMail(win: BrowserWindow, added: number): Promise<void> {
  if (!Notification.isSupported() || win.isDestroyed()) return

  let sender = ''
  let subject = ''
  try {
    const raw = await win.webContents.executeJavaScript(provider.newestUnreadScript)
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw) as { sender?: unknown; subject?: unknown }
      sender = typeof parsed.sender === 'string' ? parsed.sender : ''
      subject = typeof parsed.subject === 'string' ? parsed.subject : ''
    }
  } catch {
    // Page busy or navigating: fall back to the count below
  }

  const others = added > 1 ? ` (and ${added - 1} more)` : ''
  const note = new Notification({
    title: sender ? `New mail from ${sender}` : 'New mail',
    body: subject ? `${subject}${others}` : `${added} new message${added === 1 ? '' : 's'}`,
  })
  note.on('click', () => {
    if (win.isDestroyed()) return
    win.show()
    win.focus()
  })
  note.show()
}
