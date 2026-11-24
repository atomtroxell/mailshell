// Prints a snippet to paste into the DevTools console on mail.google.com (in your own
// browser, signed in). The snippet lists which selectors in the Gmail style sheet match
// nothing on the page. It reads element counts only: no message text, names or addresses
// leave the page.
//
// Usage: node scripts/gmail-selector-probe.mjs
// Zero matches can be normal: hover-only controls, and rows that only exist when a
// conversation is open or selected. Check those by hand before changing anything.

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'resources/css/gmail-presets.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

// Each rule is "selector list { declarations }". Skip at-rules.
const selectors = new Set();
for (const block of css.split('}')) {
  const head = block.split('{')[0];
  if (!head.trim() || head.includes('@')) continue;
  for (const part of head.split(',')) {
    const selector = part.trim();
    if (selector) selectors.add(selector);
  }
}

const list = JSON.stringify([...selectors], null, 1);
console.log(`// Paste into the DevTools console on mail.google.com. ${selectors.size} selectors.
(() => {
  const selectors = ${list};
  const missing = [];
  for (const s of selectors) {
    try {
      if (!document.querySelector(s)) missing.push(s);
    } catch (error) {
      missing.push('INVALID: ' + s);
    }
  }
  console.log('Gmail selector check: ' + missing.length + ' of ' + selectors.length + ' match nothing on this page');
  console.log(missing.join('\\n'));
  return missing;
})();`);
