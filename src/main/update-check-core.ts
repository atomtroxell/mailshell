// src/main/update-check-core.ts
// Pure version rules for the update notice: compare versions and pick the newest
// GitHub release. No Electron imports, so scripts/test-update-check.mjs can test them.

/** The fields of a GitHub release that the notice uses. */
export interface ReleaseLike {
  tag_name: string;
  draft?: boolean;
  html_url: string;
}

export interface NewestRelease {
  version: string;
  url: string;
}

type Part = number | string;

function parseVersion(version: string): { core: number[]; pre: Part[] } {
  const clean = version.trim().replace(/^v/, '');
  const [corePart, ...preParts] = clean.split('-');
  const core = corePart.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pre = preParts
    .join('-')
    .split('.')
    .filter((p) => p.length > 0)
    .map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  return { core, pre };
}

/** Compare two versions like semver: negative if a < b, 0 if equal, positive if a > b. */
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a);
  const y = parseVersion(b);
  for (let i = 0; i < Math.max(x.core.length, y.core.length); i++) {
    const diff = (x.core[i] ?? 0) - (y.core[i] ?? 0);
    if (diff !== 0) return diff;
  }
  // A release with no pre-release tag is newer than the same version with one (1.0.0 > 1.0.0-beta.1)
  if (x.pre.length === 0 && y.pre.length === 0) return 0;
  if (x.pre.length === 0) return 1;
  if (y.pre.length === 0) return -1;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i];
    const q = y.pre[i];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    if (p === q) continue;
    // Numbers compare as numbers and rank below text, as in semver
    if (typeof p === 'number' && typeof q === 'number') return p - q;
    if (typeof p === 'number') return -1;
    if (typeof q === 'number') return 1;
    return p < q ? -1 : 1;
  }
  return 0;
}

/** True when `latest` is a newer version than `current`. */
export function isNewerVersion(latest: string, current: string): boolean {
  return compareVersions(latest, current) > 0;
}

/** The newest published release, drafts left out. Pre-releases count (the app is in beta). */
export function pickNewestRelease(releases: ReleaseLike[]): NewestRelease | null {
  let best: NewestRelease | null = null;
  for (const release of releases) {
    if (release.draft || !release.tag_name) continue;
    const version = release.tag_name.replace(/^v/, '');
    if (!best || compareVersions(version, best.version) > 0) {
      best = { version, url: release.html_url };
    }
  }
  return best;
}
