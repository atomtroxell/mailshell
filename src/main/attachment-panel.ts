// src/main/attachment-panel.ts
// Thread attachment panel. Shows every file in the open conversation in a bar at
// the top of the message list. Each chip opens Gmail's own viewer for that file.
// Built in the main process and injected into the Gmail page (not a preload),
// so Gmail's CSP does not apply. Nothing is opened or expanded to build the list.

import type { WebContents } from 'electron';
import { fetchThreadFiles, type ThreadFile } from './thread-attachments';

const PANEL_ID = 'ms-attachments';
const STYLE_ID = 'ms-attachments-style';

// Session cache: thread id -> files. Cleared when the app restarts.
const cache = new Map<string, ThreadFile[]>();
let runSeq = 0;

/**
 * Re-check the page and update the panel. Called on load and on every in-page
 * navigation (Gmail changes threads by changing the URL hash).
 */
export async function refreshAttachmentPanel(contents: WebContents): Promise<void> {
  if (contents.isDestroyed() || !contents.getURL().startsWith('https://mail.google.com')) return;
  const seq = ++runSeq;

  // Gmail renders the thread a moment after the hash changes, so retry briefly
  let threadId: string | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const state = await readThreadState(contents);
    if (seq !== runSeq) return;
    if (state?.threadId) {
      threadId = state.threadId;
      break;
    }
    if (state && !state.inThread) break; // Inbox or search list: no thread open
    await delay(400);
  }

  if (!threadId) {
    await removePanel(contents);
    return;
  }

  let files = cache.get(threadId);
  if (!files) {
    files = (await fetchThreadFiles(contents.session, threadId)) ?? undefined;
    if (!files) {
      await removePanel(contents);
      return;
    }
    cache.set(threadId, files);
  }
  if (seq !== runSeq) return;

  if (files.length === 0) {
    await removePanel(contents);
    return;
  }
  await renderPanel(contents, files);
}

/** Forget cached file lists (for example after a sign-out). */
export function clearAttachmentCache(): void {
  cache.clear();
}

/**
 * Keep the panel in step with the open thread. Gmail's split view (list and
 * reading pane side by side) does not change the URL when a row is opened, so
 * the hash-change hook alone misses it. Checking the open thread's id every
 * 1.5 seconds catches every change.
 */
export function watchOpenThread(contents: WebContents): void {
  let lastThread: string | null | undefined;
  const timer = setInterval(async () => {
    if (contents.isDestroyed()) {
      clearInterval(timer);
      return;
    }
    const state = await readThreadState(contents);
    if (!state) return;
    const threadId = state.threadId ?? null;
    if (threadId !== lastThread) {
      lastThread = threadId;
      void refreshAttachmentPanel(contents);
    }
  }, 1500);
  contents.once('destroyed', () => clearInterval(timer));
}

interface ThreadState {
  threadId: string | null;
  inThread: boolean;
}

const readThreadState = async (contents: WebContents): Promise<ThreadState | null> => {
  try {
    const result = await contents.executeJavaScript(`(() => {
      // Gmail keeps hidden thread views in the page, so use the visible header only
      const header = [...document.querySelectorAll('h2.hP')].find((h) => h.getBoundingClientRect().height > 0) || null;
      const thread = header ? header.getAttribute('data-legacy-thread-id') : null;
      return JSON.stringify({ threadId: thread, inThread: !!header });
    })()`);
    return JSON.parse(result as string) as ThreadState;
  } catch {
    return null;
  }
};

const removePanel = async (contents: WebContents): Promise<void> => {
  try {
    await contents.executeJavaScript(`(() => {
      const el = document.getElementById(${JSON.stringify(PANEL_ID)});
      if (el) el.remove();
    })()`);
  } catch {
    // Page is navigating or gone; nothing to remove
  }
};

const renderPanel = async (contents: WebContents, files: ThreadFile[]): Promise<void> => {
  const data = files.map((file) => ({ name: file.name, size: file.size, url: file.url }));
  try {
    await contents.executeJavaScript(`(${renderInPage.toString()})(${JSON.stringify(data)}, ${JSON.stringify({
      panelId: PANEL_ID,
      styleId: STYLE_ID,
      css: PANEL_CSS,
    })})`);
  } catch (error) {
    console.error('Failed to render attachment panel:', (error as Error).message);
  }
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const PANEL_CSS = `
#ms-attachments { box-sizing: border-box; position: sticky; top: 0; z-index: 3; display: flex; align-items: center;
  gap: 10px; margin: 0 0 8px; padding: 6px 12px; background: #ffffff; border-bottom: 1px solid #e0e3e7;
  font-family: "Google Sans", Roboto, Arial, sans-serif; color: #1f1f1f; font-size: 13px; }
#ms-attachments .ms-att-head { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
#ms-attachments .ms-att-title { font-weight: 500; white-space: nowrap; }
#ms-attachments .ms-att-toggle { border: 0; background: none; color: #0b57d0; cursor: pointer; font: inherit; padding: 2px 4px; white-space: nowrap; }
#ms-attachments .ms-att-strip { display: flex; gap: 6px; flex: 1 1 auto; min-width: 0; overflow-x: auto; padding: 2px 0; scrollbar-width: none; }
#ms-attachments .ms-att-strip::-webkit-scrollbar { display: none; }
#ms-attachments.ms-att-open { align-items: flex-start; }
#ms-attachments.ms-att-open .ms-att-strip { flex-wrap: wrap; overflow-x: visible; max-height: 40vh; overflow-y: auto; }
#ms-attachments .ms-att-chip { flex: 0 0 auto; display: inline-flex; align-items: baseline; gap: 6px; max-width: 260px;
  padding: 5px 10px; border: 1px solid #dadce0; border-radius: 16px; background: #f8f9fa; color: #1f1f1f;
  text-decoration: none; cursor: pointer; font: inherit; }
#ms-attachments .ms-att-chip:hover { background: #eef3fb; border-color: #c4d7f5; }
#ms-attachments .ms-att-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#ms-attachments .ms-att-size { color: #5f6368; flex: 0 0 auto; font-size: 12px; }
`;

/**
 * Runs inside the Gmail page. Keep this self-contained: it is serialized with
 * toString() and sent through executeJavaScript. Text is set with textContent,
 * so file names cannot inject markup.
 */
function renderInPage(
  items: { name: string; size: string; url: string }[],
  opts: { panelId: string; styleId: string; css: string }
): void {
  if (!document.getElementById(opts.styleId)) {
    const style = document.createElement('style');
    style.id = opts.styleId;
    style.textContent = opts.css;
    document.documentElement.appendChild(style);
  }

  const old = document.getElementById(opts.panelId);
  if (old) old.remove();

  const panel = document.createElement('div');
  panel.id = opts.panelId;

  const head = document.createElement('div');
  head.className = 'ms-att-head';
  const title = document.createElement('span');
  title.className = 'ms-att-title';
  title.textContent = items.length === 1 ? '1 attachment' : `${items.length} attachments`;
  const toggle = document.createElement('button');
  toggle.className = 'ms-att-toggle';
  toggle.type = 'button';
  toggle.textContent = 'Show all';
  head.appendChild(title);
  head.appendChild(toggle);

  const strip = document.createElement('div');
  strip.className = 'ms-att-strip';
  for (const item of items) {
    const chip = document.createElement('button');
    chip.className = 'ms-att-chip';
    chip.type = 'button';
    chip.title = [item.name, item.size].filter(Boolean).join(' · ');
    const name = document.createElement('span');
    name.className = 'ms-att-name';
    name.textContent = item.name;
    chip.appendChild(name);
    if (item.size) {
      const size = document.createElement('span');
      size.className = 'ms-att-size';
      size.textContent = item.size;
      chip.appendChild(size);
    }
    chip.addEventListener('click', () => {
      window.open(item.url, '_blank');
    });
    strip.appendChild(chip);
  }

  toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('ms-att-open');
    toggle.textContent = open ? 'Show less' : 'Show all';
  });

  panel.appendChild(head);
  panel.appendChild(strip);

  // Put the bar at the top of the scroll container that holds the messages.
  // Inside that container it can use position: sticky, so it stays in view
  // while the thread scrolls. Fall back to just under the subject line.
  const visible = (e: Element) => e.getBoundingClientRect().height > 0;
  const msg = [...document.querySelectorAll('.adn')].find(visible) || null;
  let scroller = msg ? msg.parentElement : null;
  while (scroller && scroller !== document.body) {
    const cs = getComputedStyle(scroller);
    if (/(auto|scroll)/.test(cs.overflowY) && scroller.scrollHeight > scroller.clientHeight + 10) break;
    scroller = scroller.parentElement;
  }
  if (scroller && scroller !== document.body) {
    scroller.insertBefore(panel, scroller.firstChild);
  } else {
    const header = [...document.querySelectorAll('h2.hP')].find(visible) || null;
    const anchor = header ? header.closest('.ha') || header.parentElement : null;
    if (anchor && anchor.parentElement) anchor.insertAdjacentElement('afterend', panel);
  }
}
