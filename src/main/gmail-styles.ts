// Gmail style sheet (layout presets only). The built-in copy ships inside the
// app. A newer copy is fetched from the project's site, checked, and kept in the
// user's data folder. The app only replaces the cached copy when the content
// actually changed.

import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import bundled from '../../resources/css/gmail-presets.css?raw';
import {
  conditionalHeaders,
  MAX_STYLE_BYTES,
  presetsOnly,
  rejectReason,
  sha256Hex,
  type StyleMeta,
} from './gmail-styles-core';

/** Published copy of resources/css/gmail-presets.css (GitHub Pages, from docs/). */
const STYLES_URL = 'https://atomtroxell.github.io/mailshell/gmail-styles.css';
const FETCH_TIMEOUT_MS = 15_000;

export type StyleCheckResult = 'unchanged' | 'updated' | 'unavailable' | 'rejected';

let active: string = presetsOnly(bundled);

export const getGmailPresetCss = (): string => active;

const cacheDir = (): string => path.join(app.getPath('userData'), 'gmail-styles');
const cssFile = (): string => path.join(cacheDir(), 'styles.css');
const metaFile = (): string => path.join(cacheDir(), 'meta.json');

async function readMeta(): Promise<StyleMeta> {
  try {
    return JSON.parse(await fs.readFile(metaFile(), 'utf8')) as StyleMeta;
  } catch {
    return {};
  }
}

async function writeMeta(meta: StyleMeta): Promise<void> {
  await fs.writeFile(metaFile(), JSON.stringify(meta, null, 2), 'utf8');
}

/**
 * At startup, use the cached copy if it still passes the checks and its hash
 * matches what was recorded when it was saved. Otherwise keep the built-in copy.
 */
export async function loadCachedGmailStyles(): Promise<void> {
  try {
    const css = await fs.readFile(cssFile(), 'utf8');
    const meta = await readMeta();
    if (!meta.sha256) return;
    if (meta.sha256 !== sha256Hex(css) || rejectReason(css) !== null) {
      console.warn('Cached Gmail styles failed the check; using built-in styles');
      return;
    }
    active = presetsOnly(css);
  } catch {
    // No cache yet: the built-in copy stays in use
  }
}

/** The URL to check. A dev run can point at a local copy for testing; packaged builds never can. */
function stylesUrl(): string {
  const override = app.isPackaged ? undefined : process.env.MAILSHELL_GMAIL_STYLES_URL;
  return override || STYLES_URL;
}

/**
 * Ask the site for the current stylesheet. Sends the saved ETag and date, so an
 * unchanged file comes back as 304 with no body. A body whose hash matches the
 * cache is not written again. Anything that fails the checks is ignored.
 */
export async function checkForGmailStyles(): Promise<StyleCheckResult> {
  const meta = await readMeta();
  let response: Response;
  try {
    response = await fetch(stylesUrl(), {
      headers: conditionalHeaders(meta),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    console.warn('Gmail style check could not reach the site:', (error as Error).message);
    return 'unavailable';
  }

  const checkedAt = new Date().toISOString();
  if (response.status === 304) {
    await writeMeta({ ...meta, checkedAt }).catch(() => undefined);
    return 'unchanged';
  }
  if (!response.ok) return 'unavailable';

  const declared = Number(response.headers.get('content-length') ?? '0');
  if (declared > MAX_STYLE_BYTES) return 'rejected';

  const text = await response.text();
  const reason = rejectReason(text);
  if (reason !== null) {
    console.warn('Rejected Gmail styles from the site:', reason);
    return 'rejected';
  }

  const validators: StyleMeta = {
    etag: response.headers.get('etag') ?? undefined,
    lastModified: response.headers.get('last-modified') ?? undefined,
  };
  const hash = sha256Hex(text);

  if (hash === meta.sha256) {
    // Same content as the cache: refresh the validators, leave the file alone
    await writeMeta({ ...meta, ...validators, checkedAt }).catch(() => undefined);
    return 'unchanged';
  }

  // Changed: write a temporary file and rename it, so a crash never leaves a half-written cache
  await fs.mkdir(cacheDir(), { recursive: true });
  const temp = `${cssFile()}.tmp`;
  await fs.writeFile(temp, text, 'utf8');
  await fs.rename(temp, cssFile());
  await writeMeta({ ...validators, sha256: hash, checkedAt });
  active = presetsOnly(text);
  return 'updated';
}
