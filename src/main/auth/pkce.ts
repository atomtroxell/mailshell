// src/main/auth/pkce.ts
// PKCE (Proof Key for Code Exchange) helpers per RFC 7636 and Google OAuth Native App guide.
// Both Google and Infomaniak flows use S256 method.
import { randomBytes, createHash } from 'node:crypto'

/** Generate a cryptographically random code verifier (43 chars of base64url). */
export function generateCodeVerifier(): string {
  // randomBytes(32) -> 32 bytes -> 43 base64url chars (no padding)
  return randomBytes(32).toString('base64url')
}

/** Compute the S256 code challenge: Base64URL(SHA256(verifier)). */
export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

/** Generate a random state string for CSRF protection. */
export function generateState(): string {
  return randomBytes(16).toString('hex')
}
