// src/main/providers/exchange/index.ts
// Exchange Online / Microsoft 365 web mail (work and school accounts), as a
// MailProvider. The unread count reads the Inbox folder row, because the count
// has no accessible label there. It was checked on the live page with unread
// mail (650 unread).

import type { MailProvider } from '../types'
import { createOutlookWebProvider } from '../outlook-web'

// Finds the Inbox folder row and reads its unread count from the row's text.
// Returns null when no Inbox row is on the page. The row text starts with icon
// characters, so the match is "Inbox" anywhere in the row, not at the start.
const UNREAD_JS = `(() => {
  const rows = [...document.querySelectorAll('[role="treeitem"]')]
    .filter((row) => /(^|[^A-Za-z])Inbox/i.test(row.textContent || ''));
  if (rows.length === 0) return null;
  for (const row of rows) {
    const text = (row.textContent || '').replace(/\\s+/g, ' ');
    const fromText = text.match(/(\\d[\\d,]*)\\s*unread/i);
    if (fromText) return Number(fromText[1].replace(/,/g, ''));
    const count = [...row.querySelectorAll('span')].find((s) => /^\\s*\\d[\\d,]*\\s*$/.test(s.textContent || ''));
    if (count) return Number(count.textContent.replace(/[,\\s]/g, ''));
  }
  return 0;
})()`;

export const exchange: MailProvider = createOutlookWebProvider({
  id: 'exchange',
  name: 'Exchange',
  host: 'outlook.cloud.microsoft',
  unreadScript: UNREAD_JS,
});
