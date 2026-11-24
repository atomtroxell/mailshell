/**
 * Gmail CSS Presets
 * Curated CSS rules to improve Gmail UI appearance
 * Focuses on: cleaner layout, better spacing, improved readability
 */

import type { WebContents } from 'electron';
import { getGmailPresetCss } from '../../gmail-styles';


/**
 * Icon sizing. Gmail's toolbar and row icons are 20px bitmaps, which look soft
 * and heavy at this display scale. CSS cannot target elements by their
 * background image, so this script sets each 20px icon to 16px, which lines up
 * with the bitmap's pixels at 125% scaling. It watches for new nodes so icons
 * drawn later are sized too. Runs in the page; the disable script undoes it.
 */
const ICON_SIZE_ON = `(() => {
  if (window.__msIconScale) return 'already on';
  const RE = /icons\\/mail\\/gm3\\/1x\\/[^"')]*_20dp\\.png/;
  const SIZE = 16;
  const scaleEl = (el) => {
    if (!(el instanceof HTMLElement) || el.dataset.msIcon) return;
    if (!RE.test(getComputedStyle(el).backgroundImage)) return;
    const r = el.getBoundingClientRect();
    if (Math.round(r.width) !== 20 || Math.round(r.height) !== 20) return;
    el.style.setProperty('width', SIZE + 'px', 'important');
    el.style.setProperty('height', SIZE + 'px', 'important');
    el.style.setProperty('background-size', SIZE + 'px ' + SIZE + 'px', 'important');
    el.dataset.msIcon = '1';
  };
  const scanTree = (root) => {
    if (!(root instanceof Element)) return;
    scaleEl(root);
    root.querySelectorAll('*').forEach(scaleEl);
  };
  scanTree(document.body);
  let queued = [];
  let scheduled = false;
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) for (const n of m.addedNodes) queued.push(n);
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const batch = queued;
        queued = [];
        batch.forEach(scanTree);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.__msIconScale = observer;
  return 'on';
})()`;

const ICON_SIZE_OFF = `(() => {
  const observer = window.__msIconScale;
  if (observer && observer.disconnect) observer.disconnect();
  window.__msIconScale = undefined;
  document.querySelectorAll('[data-ms-icon]').forEach((el) => {
    el.style.removeProperty('width');
    el.style.removeProperty('height');
    el.style.removeProperty('background-size');
    delete el.dataset.msIcon;
  });
  return 'off';
})()`;



/**
 * insertCSS keys, one per Gmail window (keyed by webContents id), so the main
 * window and a compose window can each be styled and restyled on their own.
 */
const presetKeys = new Map<number, string>();
const tracked = new WeakSet<WebContents>();

/** Forget a window's keys when the window goes away. */
function trackWindow(contents: WebContents): void {
  if (tracked.has(contents)) return;
  tracked.add(contents);
  contents.once('destroyed', () => {
    presetKeys.delete(contents.id);
  });
}

/**
 * Apply or remove the Gmail CSS presets on the given page.
 *
 * Uses webContents.insertCSS, so the CSS is added from the main process and
 * is not blocked by Gmail's page CSP. removeInsertedCSS lets the Settings
 * toggle take effect without a reload.
 *
 * Call on every dom-ready: inserted CSS is dropped when the page navigates.
 */
export async function applyGmailCSS(contents: WebContents, enabled: boolean): Promise<void> {
  try {
    trackWindow(contents);
    const old = presetKeys.get(contents.id);
    if (old) {
      // Old key may already be gone after a navigation; ignore that failure.
      await contents.removeInsertedCSS(old).catch(() => undefined);
      presetKeys.delete(contents.id);
    }
    if (enabled) {
      presetKeys.set(contents.id, await contents.insertCSS(getGmailPresetCss()));
    }
  } catch (error) {
    console.error('Failed to apply Gmail CSS presets:', error);
  }
  // Icon sizing runs in the page, so it is applied and removed here as well
  await contents
    .executeJavaScript(enabled ? ICON_SIZE_ON : ICON_SIZE_OFF)
    .catch((error: Error) => console.error('Icon sizing failed:', error.message));
}
