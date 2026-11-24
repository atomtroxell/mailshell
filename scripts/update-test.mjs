// One-command test of MailShell's automatic update, on this machine only.
// Nothing is published. The update feed is a folder served on 127.0.0.1.
//
//   node scripts/update-test.mjs run          build, install the old version, serve the feed, launch
//   node scripts/update-test.mjs run --skip-build   same, reusing the builds from the last run
//   node scripts/update-test.mjs reset        uninstall the test copy and delete its profile (keeps the builds)
//   node scripts/update-test.mjs reset --all  also delete the builds
//
// "run" leaves the feed server in the foreground. Ctrl+C stops the feed; the app keeps running.
// Node 24 or later, from the project folder.

import { spawnSync, spawn } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, createReadStream, writeFileSync } from 'fs';
import { createServer } from 'http';
import { dirname, join, normalize, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'C:\\Temp\\ms-update-test';       // holds the old build and the test install
const APP_DIR = join(TEST, 'app');             // where the old build is installed
const FEED = 'C:\\Temp\\ms-feed';              // the newer build, served as the update
const PROFILE = 'C:\\Temp\\ms-update-profile'; // separate user data, so your real data is not touched
const OLD_VERSION = '0.2.0-beta.0';            // installed first, so it has a newer version to find
const NEW_VERSION = '0.2.0-beta.2';            // served as the update
const PORT = 8099;
const PACKAGE = join(ROOT, 'package.json');
const INSTALLER_DIR = join(ROOT, 'out', 'installer');

const TYPES = {
  '.yml': 'text/yaml; charset=utf-8',
  '.exe': 'application/octet-stream',
  '.blockmap': 'application/octet-stream',
};

function log(message) {
  console.log(`\n== ${message}`);
}

/** Build an installer at `version`. Puts package.json back afterwards. */
function build(version) {
  const original = readFileSync(PACKAGE, 'utf8');
  const pkg = JSON.parse(original);
  pkg.version = version;
  writeFileSync(PACKAGE, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  try {
    log(`Building installer ${version}`);
    const result = spawnSync('npm run installer', { cwd: ROOT, shell: true, stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`npm run installer failed (${version})`);
  } finally {
    writeFileSync(PACKAGE, original, 'utf8');
  }
}

function buildBoth() {
  build(OLD_VERSION);
  mkdirSync(TEST, { recursive: true });
  copyFileSync(join(INSTALLER_DIR, `mailshell-${OLD_VERSION}-Setup.exe`), join(TEST, 'old-Setup.exe'));

  build(NEW_VERSION);
  mkdirSync(FEED, { recursive: true });
  for (const name of [`mailshell-${NEW_VERSION}-Setup.exe`, `mailshell-${NEW_VERSION}-Setup.exe.blockmap`, 'latest.yml']) {
    copyFileSync(join(INSTALLER_DIR, name), join(FEED, name));
  }
}

function installOld() {
  log(`Installing ${OLD_VERSION} silently into ${APP_DIR}`);
  // /S = silent, /D= must be the last argument and has no quotes
  const result = spawnSync(join(TEST, 'old-Setup.exe'), ['/S', `/D=${APP_DIR}`], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('The test install failed');
  if (!existsSync(join(APP_DIR, 'mailshell.exe'))) throw new Error(`No mailshell.exe in ${APP_DIR} after install`);
}

/** Point the installed copy at the local feed instead of GitHub. */
function pointAtFeed() {
  const file = join(APP_DIR, 'resources', 'app-update.yml');
  const cache = existsSync(file)
    ? readFileSync(file, 'utf8').split(/\r?\n/).find((line) => line.startsWith('updaterCacheDirName:'))
    : undefined;
  const lines = ['provider: generic', `url: http://127.0.0.1:${PORT}/`];
  if (cache) lines.push(cache);
  writeFileSync(file, lines.join('\n') + '\n', 'utf8');
  log(`Pointed the test copy at http://127.0.0.1:${PORT}/`);
}

function launch() {
  log('Starting the test copy with its own profile');
  const child = spawn(join(APP_DIR, 'mailshell.exe'), [`--user-data-dir=${PROFILE}`], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

/** Serve the feed folder over HTTP. Only files inside the folder are sent. */
function serveFeed() {
  const root = resolve(FEED);
  const server = createServer((req, res) => {
    const name = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'latest.yml';
    const file = normalize(join(root, name));
    if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
      console.log(`404  ${req.url}`);
      res.writeHead(404).end('not found');
      return;
    }
    console.log(`200  ${req.url}`);
    res.writeHead(200, {
      'Content-Type': TYPES[name.slice(name.lastIndexOf('.'))] || 'application/octet-stream',
      'Content-Length': statSync(file).size,
    });
    createReadStream(file).pipe(res);
  });
  server.listen(PORT, '127.0.0.1', () => {
    log(`Feed ready at http://127.0.0.1:${PORT}/ (serving ${NEW_VERSION}). Ctrl+C stops the feed.`);
    console.log('Test steps: Settings > Check for updates now, then Restart now.');
    console.log(`Notice test: Settings > turn off "Update MailShell automatically", restart the app, and wait ~20 seconds.`);
  });
}

/** Remove the test install and its profile. Keeps the builds unless `all` is true. */
function reset(all) {
  log('Stopping the test copy');
  spawnSync('taskkill', ['/IM', 'mailshell.exe', '/F'], { stdio: 'ignore' });
  const uninstaller = join(APP_DIR, 'Uninstall MailShell.exe');
  if (existsSync(uninstaller)) {
    log('Uninstalling the test copy');
    spawnSync(uninstaller, ['/S'], { stdio: 'inherit' });
  }
  const dirs = all ? [APP_DIR, PROFILE, TEST, FEED] : [APP_DIR, PROFILE];
  for (const dir of dirs) {
    rmSync(dir, { recursive: true, force: true });
    console.log(`Deleted ${dir}`);
  }
  if (!all) console.log(`Kept the builds in ${TEST} and ${FEED}. Use "reset --all" to delete those too.`);
}

const [command, ...flags] = process.argv.slice(2);

if (command === 'run') {
  if (!flags.includes('--skip-build')) buildBoth();
  else log('Reusing the builds from the last run');
  installOld();
  pointAtFeed();
  launch();
  serveFeed();
} else if (command === 'reset') {
  reset(flags.includes('--all'));
} else {
  console.log('Usage:');
  console.log('  node scripts/update-test.mjs run [--skip-build]');
  console.log('  node scripts/update-test.mjs reset [--all]');
  process.exit(command ? 1 : 0);
}
