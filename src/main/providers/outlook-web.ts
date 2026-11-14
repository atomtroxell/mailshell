// src/main/providers/outlook-web.ts
// The two Microsoft web mail services: outlook.com (personal accounts) and
// Exchange Online / Microsoft 365 (work and school accounts). They are different
// sites with different pages, so each one is its own provider and passes its
// host and page script here. The rest is shared.

import type { MailProvider } from './types'
import type { ComposeFields } from '../mailto'

export interface OutlookWebConfig {
  id: 'exchange'
  /** Name shown to the user */
  name: string
  /** The service's own web address, for example outlook.cloud.microsoft */
  host: string
  /** Page script for the inbox unread count (see MailProvider.unreadScript). Omit when not yet known. */
  unreadScript?: string
}

// Microsoft sign-in pages. They stay inside MailShell so sign-in can finish.
const MICROSOFT_SIGNIN_HOSTS = [
  'login.microsoftonline.com',
  'login.microsoft.com',
  'login.live.com',
  'account.live.com',
  'aadcdn.msftauth.net',
  'aadcdn.msauth.net',
]

// No new-mail row details: the notification shows the count only
const COUNT_ONLY = 'null'

function parseUrl(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

/** Compose link for the service's own compose screen (deep link). */
function composeUrl(host: string, fields: ComposeFields): string {
  const params = new URLSearchParams()
  if (fields.to.length) params.set('to', fields.to.join(','))
  if (fields.cc.length) params.set('cc', fields.cc.join(','))
  if (fields.bcc.length) params.set('bcc', fields.bcc.join(','))
  if (fields.subject) params.set('subject', fields.subject)
  if (fields.body) params.set('body', fields.body)
  return `https://${host}/mail/deeplink/compose?${params.toString()}`
}

export function createOutlookWebProvider(config: OutlookWebConfig): MailProvider {
  const startUrl = `https://${config.host}/mail/`
  return {
    id: config.id,
    name: config.name,
    startUrl,
    homeUrl: startUrl,
    inAppHosts: [config.host, ...MICROSOFT_SIGNIN_HOSTS],
    // Work accounts sign in on their organization's own host
    federatedSignIn: true,
    newestUnreadScript: COUNT_ONLY,
    unreadScript: config.unreadScript,

    isMailPage(url) {
      const parsed = parseUrl(url)
      return (
        parsed !== null &&
        parsed.protocol === 'https:' &&
        parsed.hostname === config.host &&
        parsed.pathname.startsWith('/mail')
      )
    },

    isComposeScreen(url) {
      const parsed = parseUrl(url)
      return parsed !== null && parsed.hostname === config.host && parsed.pathname.startsWith('/mail/deeplink/compose')
    },

    composeUrl: (fields) => composeUrl(config.host, fields),

    // Outlook shows and downloads attachments itself, so MailShell does nothing extra
    isAttachmentUrl: () => false,

    // The title has no count on these services, so the count comes from unreadScript
    parseUnread: () => null,

    watchWindow: () => undefined,
    onPageChange: () => undefined,

    // Outlook follows the system theme; MailShell adds no styling of its own
    applyLook: async () => undefined,
    applyTheme: async () => undefined,
  }
}
