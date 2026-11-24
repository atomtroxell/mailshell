// Writes resources/app-update.yml into the packaged Windows app. electron-updater
// reads this file to find the GitHub release it updates from.
//
// electron-builder writes this file itself when it packs the app, but the Windows
// installer build runs with --prepackaged (the app is already packed by Electron Forge),
// so electron-builder skips that step. Run this after packaging and before electron-builder.
// Keep the values in step with the publish block in electron-builder.yml.

import { existsSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const resources = join(root, 'out/MailShell-win32-x64/resources');

if (!existsSync(resources)) {
  console.error(`No packaged app at ${resources}. Run "npm run package" first.`);
  process.exit(1);
}

writeFileSync(
  join(resources, 'app-update.yml'),
  [
    'provider: github',
    'owner: atomtroxell',
    'repo: mailshell',
    'updaterCacheDirName: mailshell-updater',
    '',
  ].join('\n'),
  'utf8',
);
console.log('Wrote app-update.yml for the Windows installer build.');
