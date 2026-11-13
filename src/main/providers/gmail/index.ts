// src/main/providers/gmail/index.ts
// Gmail, as a MailProvider. Everything Gmail-specific lives in this folder: its
// URLs, page checks, title format, compose address and page scripts. The CSS,
// the attachment list and the attachment panel are in sibling files.

import type { MailProvider } from '../types'
import type { ComposeFields } from '../../mailto'
import { applyGmailCSS, applyGmailDarkTheme, darkGmailWanted } from './css'
import { refreshAttachmentPanel, watchOpenThread } from './attachment-panel'

const MAIL_HOST = 'mail.google.com'
const COMPOSE_BASE = 'https://mail.google.com/mail/?view=cm&fs=1'

// Runs in the Gmail page. Reads the first unread row (the newest in the list)
// and returns its sender name and subject as JSON, or null when there is none.
const NEWEST_UNREAD_JS = `(() => {
  const row = document.querySelector('tr.zA.zE');
  if (!row) return null;
  const sender = row.querySelector('td.yX .yW span[email]') || row.querySelector('td.yX .yW');
  const subject = row.querySelector('.bog');
  return JSON.stringify({
    sender: sender ? sender.textContent.trim() : '',
    subject: subject ? subject.textContent.trim() : '',
  });
})()`

function parseUrl(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

/**
 * Read the inbox unread count from Gmail's page title. Gmail writes
 * "Inbox (3) - ..." when mail is unread and "Inbox - ..." when none is.
 * Returns null when the title says nothing about the inbox (for example while
 * another label is open), so the caller keeps the last known count.
 */
function parseInboxUnread(title: string): number | null {
  const match = /^\s*Inbox\b(?:\s*\(([\d,]+)\+?\))?/i.exec(title)
  if (!match) return null
  if (!match[1]) return 0
  const count = Number(match[1].replace(/,/g, ''))
  return Number.isFinite(count) ? count : null
}

/** Gmail compose URL for parsed mailto: fields. The host and path are fixed. */
function gmailComposeUrl(fields: ComposeFields): string {
  const params = new URLSearchParams()
  if (fields.to.length) params.set('to', fields.to.join(','))
  if (fields.cc.length) params.set('cc', fields.cc.join(','))
  if (fields.bcc.length) params.set('bcc', fields.bcc.join(','))
  if (fields.subject) params.set('su', fields.subject)
  if (fields.body) params.set('body', fields.body)
  const query = params.toString()
  return query ? `${COMPOSE_BASE}&${query}` : COMPOSE_BASE
}

export const gmail: MailProvider = {
  id: 'gmail',
  name: 'Gmail',
  // Straight to Google sign-in. Signed-in users are sent on to the inbox.
  startUrl:
    'https://accounts.google.com/ServiceLogin?service=mail&continue=https%3A%2F%2Fmail.google.com%2Fmail%2Fu%2F0%2F%23inbox',
  homeUrl: 'https://mail.google.com',
  themesUrl: 'https://mail.google.com/mail/u/0/#settings/themes',
  inAppHosts: ['mail.google.com', 'accounts.google.com', 'chat.google.com', 'meet.google.com'],
  newestUnreadScript: NEWEST_UNREAD_JS,

  isMailPage(url) {
    const parsed = parseUrl(url)
    return parsed !== null && parsed.protocol === 'https:' && parsed.hostname === MAIL_HOST
  },

  isComposeScreen(url) {
    const parsed = parseUrl(url)
    return parsed !== null && parsed.hostname === MAIL_HOST && parsed.searchParams.get('view') === 'cm'
  },

  composeUrl: gmailComposeUrl,

  isAttachmentUrl(url) {
    // Gmail's attachment link on the mail page (view=att), as listed in a thread
    const parsed = parseUrl(url)
    return (
      parsed !== null &&
      parsed.protocol === 'https:' &&
      parsed.hostname === MAIL_HOST &&
      parsed.searchParams.get('view') === 'att'
    )
  },

  parseUnread: parseInboxUnread,

  watchWindow(contents) {
    // Split view opens threads without changing the URL, so also watch the open thread
    watchOpenThread(contents)
  },

  onPageChange(contents) {
    // Gmail changes threads by changing the URL hash, which is an in-page navigation
    void refreshAttachmentPanel(contents)
  },

  async applyLook(contents, prefs) {
    // gmailCSSEnabled defaults to true if not set
    await applyGmailCSS(contents, prefs.gmailCSSEnabled !== false)
    await applyGmailDarkTheme(contents, darkGmailWanted(prefs))
  },

  async applyTheme(contents, prefs) {
    await applyGmailDarkTheme(contents, darkGmailWanted(prefs))
  },
}
