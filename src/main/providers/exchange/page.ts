// src/main/providers/exchange/page.ts
// Page code for the Exchange web mail page. Each part only changes what is on
// screen, and does nothing when its element is not there, so a change to the
// page leaves it working, just less tidy.

/**
 * Hides the Groups folder and Microsoft promotions. Runs in the page, watches
 * for changes (the page updates as you move around), and runs once per page.
 */
export const TIDY_PAGE_JS = String.raw`(() => {
  if (window.__mailshellTidy) return;
  window.__mailshellTidy = true;
  const hide = (el) => el.style.setProperty('display', 'none', 'important');
  const tidy = () => {
    document.querySelectorAll('[role="treeitem"]').forEach((el) => {
      if (/^Go to Groups/i.test(el.getAttribute('aria-label') || '')) hide(el);
    });
    document.querySelectorAll('button, [role="button"], a').forEach((el) => {
      const label = (el.getAttribute('aria-label') || el.textContent || '').trim();
      if (/^(Discover groups|Viva Insights|Buy Microsoft 365)$/i.test(label)) hide(el);
    });
  };
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      tidy();
    });
  }).observe(document.body, { childList: true, subtree: true });
  tidy();
})()`

/** Makes the ribbon a little smaller. */
export const RIBBON_CSS = String.raw`[role="region"][aria-label="Ribbon"] { zoom: 0.9; }`

/**
 * The newest unread message's sender and subject, as JSON, or null when there is
 * none. The sender is the name shown with the address in its title attribute.
 * The subject is the row's accessible label without the sender, the "Unread"
 * and "Has attachments" words, and the time and preview that follow it.
 */
export const NEWEST_UNREAD_JS = String.raw`(() => {
  const list = document.querySelector('[aria-label="Message list"]');
  if (!list) return null;
  const row = [...list.querySelectorAll('[role="option"]')].find((o) => /^Unread/.test(o.getAttribute('aria-label') || ''));
  if (!row) return null;
  // The sender's name sits in an element whose title is the address. Only a short name counts.
  const senderEl = [...row.querySelectorAll('span[title]')].find((s) => {
    const name = (s.textContent || '').trim();
    return /^[^\\s@]+@[^\\s@]+$/.test(s.getAttribute('title') || '') && name.length > 0 && name.length <= 60;
  });
  const sender = senderEl ? (senderEl.textContent || '').trim() : '';
  let subject = (row.getAttribute('aria-label') || '').replace(/^Unread\s+/, '').replace(/^Has attachments\s+/, '');
  if (sender && subject.startsWith(sender)) subject = subject.slice(sender.length).trim();
  subject = subject.split(/\s+\d{1,2}:\d{2}\s*[AP]M|\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/)[0].trim();
  return JSON.stringify({ sender, subject: subject.slice(0, 120) });
})()`
