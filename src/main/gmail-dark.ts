// src/main/gmail-dark.ts
// Dark mode for the Gmail page: a static invert-filter stylesheet, kept as a
// separate layer from the UI presets in gmail-css.ts (it works with presets
// off). The CSS is a constant with no interpolation. insertCSS is dropped on
// navigation, so callers must re-apply it on every dom-ready.

import type { WebContents } from 'electron'

export const THEME_VALUES = ['light', 'dark', 'system'] as const
export type ThemePreference = (typeof THEME_VALUES)[number]

/** Strict allowlist check: string equality only, no coercion or trimming. */
export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_VALUES as readonly string[]).includes(value)
}

/** Window background used while the page paints (avoids a white flash). */
export function darkAwareBackground(dark: boolean): string {
  return dark ? '#202124' : '#ffffff'
}

// `picture` is deliberately omitted: its inner img already matches, and
// listing both would invert photos twice.
export const GMAIL_DARK_CSS = `
html { color-scheme: light !important; filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) !important; background-color: #ffffff !important; }
img, video, canvas, svg image, embed, object, [style*="background-image"] { filter: invert(1) hue-rotate(180deg) !important; }
`

let activeDarkKey: string | null = null
let darkQueue: Promise<void> = Promise.resolve()

async function doApply(contents: WebContents, enabled: boolean): Promise<void> {
  if (contents.isDestroyed()) return
  try {
    if (activeDarkKey) {
      const oldKey = activeDarkKey
      activeDarkKey = null
      await contents.removeInsertedCSS(oldKey).catch(() => undefined)
    }
    // Never insert into Mailshell's own data: pages (error page)
    if (enabled && !contents.getURL().startsWith('data:')) {
      activeDarkKey = await contents.insertCSS(GMAIL_DARK_CSS)
    }
  } catch (error) {
    console.error('Failed to apply Gmail dark mode:', error)
  }
}

/**
 * Insert or remove the dark layer. Calls are serialised so the ipc path and
 * the nativeTheme 'updated' path cannot interleave and leak a CSS key.
 */
export function applyGmailDark(contents: WebContents, enabled: boolean): Promise<void> {
  darkQueue = darkQueue.then(() => doApply(contents, enabled))
  return darkQueue
}
