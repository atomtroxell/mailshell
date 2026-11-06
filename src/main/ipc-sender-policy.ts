// src/main/ipc-sender-policy.ts
// Pure, electron-free IPC sender policy (layer 2 of the preload exposure fix).
//
// Layer 1 (src/preload/shell.ts) exposes the bridge only on data: pages.
// Layer 2 (this module, used by validateSender in ipc.ts) makes the main
// process authorise the real sender, so it never trusts the preload.
//
// Rules, evaluated in order:
//  1. no senderFrame (navigated or destroyed)         -> 'no-frame'
//  2. frame URL does not start with 'data:text/html'  -> 'not-data-url'
//  3. frame is not a top frame (parent !== null)      -> 'not-top-frame'
//  4. sender is the Settings webContents              -> 'ok' (all channels)
//  5. sender is the main window's webContents         -> 'ok' only for the
//     'settings-or-error-page' policy, else 'main-window-not-allowed'
//  6. anything else                                   -> 'unknown-sender'
//
// The top frame is identified by `parent === null` plus sender identity, not
// by `senderFrame === contents.mainFrame`: electron.d.ts notes that distinct
// WebFrameMain instances can refer to the same underlying frame.
//
// A new channel defaults to 'settings-only'. This module never logs and never
// echoes a URL (data: URLs contain whole pages).

export const DATA_HTML_PREFIX = 'data:text/html';

export type SenderPolicy = 'settings-only' | 'settings-or-error-page';

export interface SenderFrameLike {
  readonly url: string;
  readonly parent: unknown;
}

export interface SenderEventLike {
  readonly sender: unknown;
  readonly senderFrame: SenderFrameLike | null;
}

export interface SenderRefs {
  readonly settingsContents: unknown | null;
  readonly mainContents: unknown | null;
}

export type SenderDecision =
  | 'ok'
  | 'no-frame'
  | 'not-data-url'
  | 'not-top-frame'
  | 'main-window-not-allowed'
  | 'unknown-sender';

export function decideSender(
  event: SenderEventLike,
  refs: SenderRefs,
  policy: SenderPolicy
): SenderDecision {
  if (!event || !event.senderFrame) {
    return 'no-frame';
  }
  const frame = event.senderFrame;
  if (typeof frame.url !== 'string' || !frame.url.startsWith(DATA_HTML_PREFIX)) {
    return 'not-data-url';
  }
  if (frame.parent !== null) {
    return 'not-top-frame';
  }
  if (refs.settingsContents != null && event.sender === refs.settingsContents) {
    return 'ok';
  }
  if (refs.mainContents != null && event.sender === refs.mainContents) {
    return policy === 'settings-or-error-page' ? 'ok' : 'main-window-not-allowed';
  }
  return 'unknown-sender';
}

export function isAllowedSender(
  event: SenderEventLike,
  refs: SenderRefs,
  policy: SenderPolicy
): boolean {
  return decideSender(event, refs, policy) === 'ok';
}
