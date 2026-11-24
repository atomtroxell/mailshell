// src/main/whats-new-core.ts
// The rules for the "What's new" notice. Pure functions with no Electron imports, so
// scripts/test-whats-new.mjs can check them directly.

export type WhatsNewNotes = Record<string, string[]>;

export interface WhatsNewInput {
  /** The version running now. */
  current: string;
  /** The version the notice was last recorded for. null if never recorded. */
  lastSeen: string | null;
  /** True once the user has picked Gmail or Exchange. An existing user has a choice. */
  hasChoice: boolean;
  /** Hand-written notes, keyed by version. */
  notes: WhatsNewNotes;
}

export interface WhatsNewDecision {
  /** Save `current` as the last version seen. */
  record: boolean;
  /** The lines to show, or null to show nothing. */
  show: string[] | null;
}

export function decideWhatsNew(input: WhatsNewInput): WhatsNewDecision {
  const { current, lastSeen, hasChoice, notes } = input;
  // Already recorded for this version: nothing to do
  if (lastSeen === current) return { record: false, show: null };
  // A new install has nothing to explain. Just remember this version.
  if (lastSeen === null && !hasChoice) return { record: true, show: null };
  // An update (or an existing install from before this feature): show the notes if there are any
  const items = notes[current];
  return { record: true, show: items && items.length > 0 ? items : null };
}
