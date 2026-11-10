// src/main/legal.ts
// Opens the bundled legal pages (privacy, terms, licence notices) in the user's
// default browser. The pages live in legal/ and ship inside the installed app.

import { app, shell } from 'electron'
import fs from 'fs'
import path from 'path'

export type LegalPage = 'privacy.html' | 'terms.html' | 'third-party.html'

/**
 * Folder that holds the legal pages: resources/legal when installed. In
 * development, build/legal (dated by scripts/stamp-legal.mjs) comes first.
 */
function legalDir(): string | null {
  const candidates = [
    path.join(process.resourcesPath || '', 'legal'),
    path.join(app.getAppPath(), 'build', 'legal'),
    path.join(app.getAppPath(), 'legal'),
    path.join(process.cwd(), 'legal'),
  ]
  return candidates.find((dir) => fs.existsSync(path.join(dir, 'privacy.html'))) ?? null
}

/** Returns true if the page was handed to the browser. */
export async function openLegalPage(page: LegalPage): Promise<boolean> {
  const dir = legalDir()
  if (!dir) {
    console.error('Legal pages not found')
    return false
  }
  const error = await shell.openPath(path.join(dir, page))
  if (error) {
    console.error('Failed to open legal page:', error)
    return false
  }
  return true
}
