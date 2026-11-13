// src/main/thread-attachments.ts
// Lists every attachment in a Gmail thread without opening or expanding it.
//
// Gmail's print view (view=pt) renders the whole thread on the server, with an
// attachment table for each message: file name, size, and the same direct link
// the attachment card uses. The request uses the app's own signed-in session
// (persist:mailshell), so no Google sign-in or API access is needed.

import type { Session } from 'electron';

const GMAIL_BASE = 'https://mail.google.com/mail/u/0/';

export interface ThreadFile {
  name: string;
  size: string; // as Gmail shows it, e.g. "2K"
  attid: string;
  url: string; // Gmail's own viewer link for this file
}

/**
 * Fetch and parse the attachment list for one thread.
 * Returns null if the request fails or the session is signed out.
 */
export async function fetchThreadFiles(session: Session, threadId: string): Promise<ThreadFile[] | null> {
  if (!/^[0-9a-f]{8,32}$/i.test(threadId)) return null;
  const url = `${GMAIL_BASE}?ui=2&view=pt&search=all&th=${encodeURIComponent(threadId)}`;
  try {
    const res = await session.fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      console.error(`Thread print view returned ${res.status}`);
      return null;
    }
    const html = await res.text();
    // Signed out, Gmail sends the login page instead of the thread
    if (!html.includes('class="att"') && !html.includes('view=pt')) {
      return html.includes('accounts.google.com') ? null : [];
    }
    return parseThreadFiles(html);
  } catch (error) {
    console.error('Thread attachment request failed:', (error as Error).message);
    return null;
  }
}

/**
 * Pull the file entries out of the print-view HTML.
 * Each entry is a link with view=att and attid, followed closely by the bold file
 * name and the size. Matches are limited to a short distance so body links to
 * inline images are not picked up.
 */
export function parseThreadFiles(html: string): ThreadFile[] {
  const out: ThreadFile[] = [];
  const seen = new Set<string>();
  const segments = html.split('<table class="att"').slice(1);
  const entry = /href="([^"]*?view=att[^"]*?)"[\s\S]{0,300}?<b>([\s\S]*?)<\/b>\s*<br\s*\/?>\s*([^<]*)/g;

  for (const segment of segments) {
    let m: RegExpExecArray | null;
    entry.lastIndex = 0;
    while ((m = entry.exec(segment)) !== null) {
      const href = decodeEntities(m[1]);
      const attid = (href.match(/[?&]attid=([^&]+)/) || [])[1];
      if (!attid || seen.has(attid)) continue;
      seen.add(attid);
      out.push({
        name: decodeEntities(m[2].replace(/<wbr\s*\/?>/gi, '').replace(/<[^>]+>/g, '')).trim(),
        size: decodeEntities(m[3]).trim(),
        attid,
        // inline: viewable files (PDF, images) open in the window; others still download
        url: GMAIL_BASE + href.replace(/disp=attd/, "disp=inline"),
      });
    }
  }
  return out;
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
