// src/main/providers/types.ts
// What MailShell needs from a mail web app. The shared code (the main window,
// the taskbar badge, notifications, mailto links, the error page) calls only
// these members. Each provider implements them in its own folder.

import type { WebContents } from 'electron'
import type { ComposeFields } from '../mailto'
import type { Preferences } from '../preferences'

export interface MailProvider {
  /** Short id used in code: 'gmail' */
  readonly id: string
  /** Name shown to the user: 'Gmail' */
  readonly name: string
  /** Page the main window opens. Signed-out users sign in there first. */
  readonly startUrl: string
  /** Mail app home page, used for retry links and the error page */
  readonly homeUrl: string
  /** Settings page for the provider's own theme, when it has one */
  readonly themesUrl?: string
  /** Hosts that stay inside MailShell: sign-in and the mail app's own windows */
  readonly inAppHosts: readonly string[]
  /** Script run in the mail page. Returns JSON {sender, subject} for the newest unread mail, or null. */
  readonly newestUnreadScript: string

  /** True for the mail app itself (not a sign-in page) */
  isMailPage(url: string): boolean
  /** True for the compose screen */
  isComposeScreen(url: string): boolean
  /** Compose URL for the fields of a mailto: link */
  composeUrl(fields: ComposeFields): string
  /** True for an attachment link that MailShell opens itself (see attachment-open.ts) */
  isAttachmentUrl(url: string): boolean
  /** Unread inbox count from the page title, or null when the title says nothing about the inbox */
  parseUnread(title: string): number | null

  /** Called once for each main window, after it is created */
  watchWindow(contents: WebContents): void
  /** Called after each page load and in-page navigation */
  onPageChange(contents: WebContents): void
  /** Apply the presets and the theme (on page load) */
  applyLook(contents: WebContents, prefs: Preferences): Promise<void>
  /** Apply the theme only (when the theme changes) */
  applyTheme(contents: WebContents, prefs: Preferences): Promise<void>
}
