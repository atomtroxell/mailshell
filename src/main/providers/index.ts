// src/main/providers/index.ts
// The mail service MailShell opens. Shared code imports `provider` and nothing
// provider-specific. The choice is made at startup (see selectProvider).

import type { MailProvider } from './types'
import { gmail } from './gmail'
import { exchange } from './exchange'

export type { MailProvider } from './types'

export const PROVIDER_IDS = ['gmail', 'exchange'] as const
export type ProviderId = (typeof PROVIDER_IDS)[number]

const PROVIDERS: Record<ProviderId, MailProvider> = { gmail, exchange }

/** The provider in use. Changed only by selectProvider, at startup. */
export let provider: MailProvider = gmail

/** Use the provider with this id. Unknown or missing ids keep the current one. */
export function selectProvider(id: string | null): void {
  if (id !== null && (PROVIDER_IDS as readonly string[]).includes(id)) {
    provider = PROVIDERS[id as ProviderId]
  }
}
