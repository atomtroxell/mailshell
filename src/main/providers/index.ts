// src/main/providers/index.ts
// The mail app MailShell wraps. Shared code imports `provider` and nothing
// provider-specific. Outlook and other providers are added here later.

import type { MailProvider } from './types'
import { gmail } from './gmail'

export type { MailProvider } from './types'

export const provider: MailProvider = gmail
