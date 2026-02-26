// src/main/css-injection.ts
// CSS injection pipeline: reads provider CSS from disk, injects into WebContentsViews,
// runs sentinel checks to detect stale selectors, and sets up dev hot-reload via fs.watch.

import { app, BrowserWindow, WebContents, WebContentsView } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { store } from './store'

type Provider = 'gmail' | 'infomaniak'

/**
 * Returns the path to the CSS file for the given provider.
 * In production, CSS lives in resourcesPath/css (outside ASAR, readable at runtime).
 * In dev, CSS lives in resources/css relative to the project root.
 */
function getCssPath(provider: Provider): string {
  const cssDir = app.isPackaged
    ? path.join(process.resourcesPath, 'css')
    : path.join(__dirname, '../../resources/css')
  return path.join(cssDir, `${provider}.css`)
}

/**
 * Reads the provider's CSS from disk and injects it into the given webContents
 * with cssOrigin 'user' so it applies at the user stylesheet layer (highest specificity).
 */
export async function injectCss(webContents: WebContents, provider: Provider): Promise<void> {
  try {
    const css = fs.readFileSync(getCssPath(provider), 'utf-8')
    await webContents.insertCSS(css, { cssOrigin: 'user' })
  } catch (err) {
    console.error(`[css-injection] Failed to inject ${provider} CSS:`, err)
  }
}

/**
 * Sentinel selectors — one per provider.
 * These target an element that should be hidden by the injected CSS.
 * If the element is visible, the CSS is not working (stale).
 * If the element is missing, we cannot determine state (selector may be outdated).
 */
const SENTINELS: Record<Provider, string> = {
  gmail: '[gh="tl"]',                      // Gmail top nav bar - stable semantic attribute
  infomaniak: 'header.header-app-content', // Infomaniak header
}

/**
 * Runs a three-state visibility check on the provider's sentinel element:
 *   'hidden'  -> CSS is working; mark provider fresh
 *   'visible' -> CSS is not working; mark provider stale
 *   'missing' -> element not in DOM; uncertain (selector may be outdated); leave stale state unchanged
 */
export async function runSentinelCheck(
  webContents: WebContents,
  provider: Provider,
  win: BrowserWindow
): Promise<void> {
  const selector = SENTINELS[provider]
  try {
    const result: string = await webContents.executeJavaScript(`
      (function() {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return 'missing';
        const style = window.getComputedStyle(el);
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        return visible ? 'visible' : 'hidden';
      })()
    `)

    if (result === 'visible') {
      markProviderStale(provider, win)
    } else if (result === 'hidden') {
      markProviderFresh(provider, win)
    } else {
      // 'missing' — element not in DOM; uncertain, log and leave stale state unchanged
      console.warn(
        `[css-injection] Sentinel element not found for ${provider}: ${selector} — selector may be outdated or page not loaded`
      )
    }
  } catch {
    // Page navigated away during check; ignore
  }
}

/**
 * Adds provider to the staleCssProviders list in the store and pushes
 * CSS_STALE_STATUS to the renderer so the stale banner appears immediately.
 */
function markProviderStale(provider: Provider, win: BrowserWindow): void {
  const current = store.get('staleCssProviders')
  if (!current.includes(provider)) {
    store.set('staleCssProviders', [...current, provider])
  }
  win.webContents.send(IPC_CHANNELS.CSS_STALE_STATUS, provider, true)
}

/**
 * Removes provider from the staleCssProviders list in the store and pushes
 * CSS_STALE_STATUS to the renderer so the stale banner is dismissed.
 */
function markProviderFresh(provider: Provider, win: BrowserWindow): void {
  const current = store.get('staleCssProviders')
  if (current.includes(provider)) {
    store.set('staleCssProviders', current.filter(p => p !== provider))
  }
  win.webContents.send(IPC_CHANNELS.CSS_STALE_STATUS, provider, false)
}

/**
 * Sets up fs.watch on the CSS directory for dev hot-reload.
 * When a provider CSS file changes on disk, immediately re-injects into all
 * matching active views so changes are visible without restarting the app.
 *
 * Guards on app.isPackaged — no-op in production builds.
 * Safe to call unconditionally; the guard is internal.
 */
export function watchCssFiles(getViewPool: () => Map<string, WebContentsView>): void {
  if (app.isPackaged) return

  const cssDir = path.join(__dirname, '../../resources/css')
  try {
    fs.watch(cssDir, (_eventType, filename) => {
      if (!filename?.endsWith('.css')) return
      const provider = filename.replace('.css', '') as Provider
      if (provider !== 'gmail' && provider !== 'infomaniak') return

      const pool = getViewPool()
      for (const [tabId, view] of pool) {
        if (tabId.startsWith(provider) && !view.webContents.isDestroyed()) {
          void injectCss(view.webContents, provider)
        }
      }
    })
  } catch (err) {
    // resources/css may not exist yet in a fresh checkout
    console.warn('[css-injection] Could not watch CSS directory:', err)
  }
}
