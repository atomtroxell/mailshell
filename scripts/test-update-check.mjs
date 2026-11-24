// Tests the version rules behind the "update available" notice.
// Run with Node 24 or later (it loads the TypeScript core directly):
//   node scripts/test-update-check.mjs

import { compareVersions, isNewerVersion, pickNewestRelease } from '../src/main/update-check-core.ts';

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

const sign = (n) => Math.sign(n);

check('beta.2 is newer than beta.1', sign(compareVersions('0.2.0-beta.2', '0.2.0-beta.1')), 1);
check('beta.10 is newer than beta.9 (numbers compare as numbers)', sign(compareVersions('0.2.0-beta.10', '0.2.0-beta.9')), 1);
check('0.2.0 is newer than 0.2.0-beta.9', sign(compareVersions('0.2.0', '0.2.0-beta.9')), 1);
check('0.2.0-beta.1 is older than 0.2.0', sign(compareVersions('0.2.0-beta.1', '0.2.0')), -1);
check('0.3.0-beta.1 is newer than 0.2.9', sign(compareVersions('0.3.0-beta.1', '0.2.9')), 1);
check('same version is equal', compareVersions('0.2.0-beta.1', '0.2.0-beta.1'), 0);
check('a leading v is ignored', compareVersions('v0.2.0-beta.2', '0.2.0-beta.1') > 0, true);
check('alpha ranks below beta', sign(compareVersions('0.2.0-beta.1', '0.2.0-alpha.9')), 1);

check('isNewerVersion: newer', isNewerVersion('0.2.0-beta.2', '0.2.0-beta.1'), true);
check('isNewerVersion: same is not newer', isNewerVersion('0.2.0-beta.1', '0.2.0-beta.1'), false);
check('isNewerVersion: older is not newer', isNewerVersion('0.1.0-beta.1', '0.2.0-beta.1'), false);

const releases = [
  { tag_name: 'v0.1.0-beta.1', html_url: 'https://github.com/atomtroxell/mailshell/releases/tag/v0.1.0-beta.1' },
  { tag_name: 'v0.3.0-beta.1', draft: true, html_url: 'https://github.com/atomtroxell/mailshell/releases/tag/v0.3.0-beta.1' },
  { tag_name: 'v0.2.0-beta.1', html_url: 'https://github.com/atomtroxell/mailshell/releases/tag/v0.2.0-beta.1' },
];
check('pickNewestRelease skips drafts and picks the highest', pickNewestRelease(releases), {
  version: '0.2.0-beta.1',
  url: 'https://github.com/atomtroxell/mailshell/releases/tag/v0.2.0-beta.1',
});
check('pickNewestRelease with no releases is null', pickNewestRelease([]), null);
check('pickNewestRelease with only drafts is null', pickNewestRelease([releases[1]]), null);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
