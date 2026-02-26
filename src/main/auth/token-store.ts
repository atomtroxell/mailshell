// src/main/auth/token-store.ts
import { safeStorage } from 'electron'
import { store } from '../store'
import type { AccountRecord, Provider } from '@shared/ipc-types'

/** Encrypt a plaintext token string. Call only from IPC handlers or app.whenReady callbacks. */
export function encryptToken(plainText: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS keychain encryption is not available. Mailshell cannot store credentials securely.')
  }
  return safeStorage.encryptString(plainText).toString('latin1')
}

/** Decrypt a latin1-encoded encrypted token string. */
export function decryptToken(encrypted: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS keychain encryption is not available.')
  }
  return safeStorage.decryptString(Buffer.from(encrypted, 'latin1'))
}

/** Save or update an account record in the store. Tokens must already be encrypted. */
export function saveAccount(record: AccountRecord): void {
  const accounts = store.get('accounts') as AccountRecord[]
  const idx = accounts.findIndex(a => a.id === record.id)
  if (idx >= 0) {
    accounts[idx] = record
  } else {
    accounts.push(record)
  }
  store.set('accounts', accounts)
}

/** Return all stored account records (tokens remain encrypted). */
export function getAllAccounts(): AccountRecord[] {
  return store.get('accounts') as AccountRecord[]
}

/** Remove an account by ID. Returns true if found and removed, false if not found. */
export function deleteAccount(accountId: string): boolean {
  const accounts = store.get('accounts') as AccountRecord[]
  const filtered = accounts.filter(a => a.id !== accountId)
  if (filtered.length === accounts.length) return false
  store.set('accounts', filtered)
  return true
}

/** Build a fully-typed AccountRecord with encrypted tokens. Call from within an IPC handler. */
export function buildAccountRecord(params: {
  provider: Provider
  email: string
  displayName?: string
  accessToken: string      // plaintext — will be encrypted here
  refreshToken?: string    // plaintext — will be encrypted here
  expiresIn: number        // seconds from now
}): AccountRecord {
  return {
    id: `${params.provider}-${params.email}`,
    provider: params.provider,
    email: params.email,
    displayName: params.displayName,
    tokens: {
      accessToken: encryptToken(params.accessToken),
      refreshToken: params.refreshToken ? encryptToken(params.refreshToken) : undefined,
      expiresAt: Date.now() + params.expiresIn * 1000,
    },
  }
}
