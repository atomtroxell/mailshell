// Copies the Gmail style sheet that the app downloads (resources/css/gmail-presets.css)
// into docs/gmail-styles.css, where GitHub Pages serves it. Run it after editing the
// style sheet, then commit both files and push to main. Installed copies pick the change
// up within 6 hours, or straight away with "Check for updates now" in Settings.

import { copyFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'resources/css/gmail-presets.css');
const to = join(root, 'docs/gmail-styles.css');

const css = readFileSync(from, 'utf8');
if (!css.includes("MailShell Gmail styles")) {
  console.error('The style sheet is missing its markers, so nothing was copied. Run scripts/test-gmail-styles.mjs.');
  process.exit(1);
}

copyFileSync(from, to);
console.log(`Copied to docs/gmail-styles.css (${css.length} characters). Commit it and push to main to publish.`);
