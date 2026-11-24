// Tests the rules that decide whether a downloaded Gmail style sheet is used, and
// that the layout presets leave Gmail's own colours alone.
// Run with Node 24 or later (it loads the TypeScript core directly):
//   node scripts/test-gmail-styles.mjs

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  conditionalHeaders,
  LEGACY_DARK_MARKER,
  MAX_STYLE_BYTES,
  presetsOnly,
  rejectReason,
  sha256Hex,
  STYLE_MARKER,
} from '../src/main/gmail-styles-core.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const good = readFileSync(join(root, 'resources/css/gmail-presets.css'), 'utf8');

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`ok   ${name}`);
  } else {
    failures++;
    console.log(`FAIL ${name}`);
  }
}

check('shipped stylesheet passes', rejectReason(good) === null);
check('shipped stylesheet has no dark-theme section', !good.includes(LEGACY_DARK_MARKER));
check('presets keep the header and list layout', good.includes('header#gb') && good.includes('tr.zA'));

// Layout presets must not fix Gmail's colours, or they fight Gmail's own themes.
// Allowed: translucent neutral dividers, and the blue unread bar (same in both themes).
const hexes = [...new Set(good.match(/#[0-9a-fA-F]{3,6}\b/g) || [])];
const solidRgb = (good.match(/rgb\(/g) || []).length;
check('no hard-coded hex colours except the unread bar', hexes.every((h) => h === '#1a73e8'));
check('no solid rgb() colours', solidRgb === 0);

const legacy = good + '\n' + LEGACY_DARK_MARKER + '\nbody { background-color: #202124 !important; }\n';
check('legacy dark section is dropped by presetsOnly', !presetsOnly(legacy).includes('#202124'));
check('presetsOnly keeps the presets', presetsOnly(legacy) === presetsOnly(good) || presetsOnly(legacy).includes('header#gb'));

const bad = {
  'url() is refused': good.replace('header#gb {', 'header#gb { background: url(https://example.com/x.png); '),
  '@import is refused': `${STYLE_MARKER}\n@import url("https://example.com/a.css");\n`,
  '@font-face is refused': `${good}\n@font-face { font-family: x; src: local(x); }`,
  'expression() is refused': good.replace('header#gb {', 'header#gb { width: expression(alert(1)); '),
  'script tag is refused': `${good}\n<script>alert(1)</script>`,
  'HTML error page is refused': '<!doctype html><html><body>Service unavailable</body></html>',
  'missing marker is refused': good.replace(STYLE_MARKER, 'Something else'),
  'oversized file is refused': good + ' '.repeat(MAX_STYLE_BYTES),
};
for (const [name, css] of Object.entries(bad)) {
  check(name, rejectReason(css) !== null);
}

check('hash is stable', sha256Hex(good) === sha256Hex(good));
check('hash changes with one character', sha256Hex(good) !== sha256Hex(good + ' '));

check('no validators: no conditional headers', Object.keys(conditionalHeaders({})).length === 0);
const headers = conditionalHeaders({ etag: '"abc"', lastModified: 'Wed, 01 Jan 2026 00:00:00 GMT' });
check('ETag sent as If-None-Match', headers['If-None-Match'] === '"abc"');
check('date sent as If-Modified-Since', headers['If-Modified-Since'] === 'Wed, 01 Jan 2026 00:00:00 GMT');

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
