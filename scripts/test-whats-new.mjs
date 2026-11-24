// Tests the rules that decide when the "What's new" notice shows.
// Run with Node 24 or later (it loads the TypeScript core directly):
//   node scripts/test-whats-new.mjs

import { decideWhatsNew } from '../src/main/whats-new-core.ts';

const notes = { '0.2.0-beta.2': ['Line one', 'Line two'] };
let failures = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`ok   ${name}`);
  } else {
    failures++;
    console.log(`FAIL ${name}\n     got      ${JSON.stringify(actual)}\n     expected ${JSON.stringify(expected)}`);
  }
}

// Fresh install: no choice yet, nothing recorded. Record silently.
check(
  'fresh install records and shows nothing',
  decideWhatsNew({ current: '0.2.0-beta.2', lastSeen: null, hasChoice: false, notes }),
  { record: true, show: null },
);

// Updated: last seen was the old version, notes exist for the new one.
check(
  'update shows notes and records',
  decideWhatsNew({ current: '0.2.0-beta.2', lastSeen: '0.2.0-beta.1', hasChoice: true, notes }),
  { record: true, show: ['Line one', 'Line two'] },
);

// Existing install from before this feature: no lastSeen, but a provider was chosen.
check(
  'existing install from before the feature shows notes once',
  decideWhatsNew({ current: '0.2.0-beta.2', lastSeen: null, hasChoice: true, notes }),
  { record: true, show: ['Line one', 'Line two'] },
);

// Same version again (every normal start): nothing.
check(
  'same version does nothing',
  decideWhatsNew({ current: '0.2.0-beta.2', lastSeen: '0.2.0-beta.2', hasChoice: true, notes }),
  { record: false, show: null },
);

// Updated to a version with no notes: record, but show nothing.
check(
  'update with no notes records without showing',
  decideWhatsNew({ current: '0.2.0-beta.3', lastSeen: '0.2.0-beta.2', hasChoice: true, notes }),
  { record: true, show: null },
);

// Empty notes list is treated as no notes.
check(
  'empty notes list shows nothing',
  decideWhatsNew({ current: '0.2.0-beta.2', lastSeen: '0.2.0-beta.1', hasChoice: true, notes: { '0.2.0-beta.2': [] } }),
  { record: true, show: null },
);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
