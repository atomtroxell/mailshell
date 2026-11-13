// src/main/attachment-open.ts
// Opens an attachment link from the attachment bar. Which links count as
// attachments is up to the provider (providers/).
//
// Google decides how a file is served. This module asks Google for the content
// type first (headers only). PDFs and common images open in the user's default
// browser, which shows them with Google's own viewer. Everything else (HTML,
// SVG, Office files, archives) is downloaded to the Downloads folder and is
// never rendered inside MailShell.
//
// An in-app viewer was tried and removed: Google serves attachments as
// downloads when they are opened as a page, so the viewer could not show them,
// and any file rendered in the app would run in the app's Google session.

import { session, shell, type WebContents } from 'electron'
import { provider } from './providers'

const PARTITION = 'persist:mailshell'

// Content types that open in the browser instead of downloading
const VIEWABLE_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
])

const withDisposition = (url: string, disp: 'inline' | 'attd'): string => {
  const u = new URL(url)
  u.searchParams.set('disp', disp)
  return u.toString()
}

/**
 * Open one attachment. `owner` is the main window; it starts the download when
 * the file is not viewable.
 */
export async function openAttachment(owner: WebContents, url: string): Promise<void> {
  if (!provider.isAttachmentUrl(url)) return

  const inlineUrl = withDisposition(url, 'inline')
  const downloadUrl = withDisposition(url, 'attd')

  // Ask Google what it would serve, reading headers only
  let viewable = false
  try {
    const res = await session.fromPartition(PARTITION).fetch(inlineUrl, { redirect: 'follow' })
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    viewable = res.ok && VIEWABLE_TYPES.has(type)
    try {
      await res.body?.cancel()
    } catch {
      // Body already closed; nothing to do
    }
  } catch (error) {
    console.error('Attachment check failed:', (error as Error).message)
  }

  if (viewable) {
    // Only Google's own https address is passed to the browser
    await shell.openExternal(inlineUrl).catch((error) => console.error('Failed to open attachment:', error))
  } else {
    owner.downloadURL(downloadUrl)
  }
}
