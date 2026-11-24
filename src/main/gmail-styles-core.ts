// Pure helpers for the Gmail style cache. No Electron imports, so they can be
// tested with plain Node (see scripts/test-gmail-styles.mjs).

import { createHash } from 'crypto';

/** Largest stylesheet the app will accept. */
export const MAX_STYLE_BYTES = 256 * 1024;

/** A file must contain this text, so an HTML error page served with status 200 is never used. */
export const STYLE_MARKER = 'MailShell Gmail styles';

/**
 * Older copies had a dark-theme section after this line. MailShell no longer
 * styles Gmail's theme, so anything after it is dropped.
 */
export const LEGACY_DARK_MARKER = '/* @@dark-theme */';

/** What the cache remembers about the last accepted download. */
export interface StyleMeta {
  etag?: string;
  lastModified?: string;
  sha256?: string;
  checkedAt?: string;
}

/**
 * Why a downloaded stylesheet must not be used, or null when it passes.
 * The CSS runs with full access to the mail page, so the checks are strict:
 * no URLs, no imports, no fonts, no script-like constructs, no HTML.
 */
export function rejectReason(css: string): string | null {
  if (Buffer.byteLength(css, 'utf8') > MAX_STYLE_BYTES) return 'too large';
  if (!css.includes(STYLE_MARKER)) return 'missing marker';
  if (
    /url\s*\(|@import|@font-face|expression\s*\(|javascript:|behavior\s*:|<\s*\/?\s*(script|style|html|body|iframe)/i.test(
      css
    )
  ) {
    return 'contains a forbidden construct';
  }
  return null;
}

/** The layout presets only: everything before the legacy dark marker, if there is one. */
export function presetsOnly(css: string): string {
  return css.split(LEGACY_DARK_MARKER)[0];
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Headers that let the server answer 304 Not Modified when nothing has changed. */
export function conditionalHeaders(meta: StyleMeta): Record<string, string> {
  const headers: Record<string, string> = {};
  if (meta.etag) headers['If-None-Match'] = meta.etag;
  if (meta.lastModified) headers['If-Modified-Since'] = meta.lastModified;
  return headers;
}
