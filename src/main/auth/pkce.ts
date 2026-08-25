import crypto from 'crypto';

/**
 * Generate a PKCE code verifier
 * PKCE (RFC 7636) prevents authorization code interception attacks
 * Code verifier is a random 128-character string (43-128 per spec)
 */
export const generateCodeVerifier = (): string => {
  // Generate 96 random bytes and convert to base64url
  const randomBytes = crypto.randomBytes(96);
  return base64url(randomBytes);
};

/**
 * Generate a PKCE code challenge from a code verifier
 * Code challenge = BASE64URL(SHA256(code_verifier))
 */
export const generateCodeChallenge = (verifier: string): string => {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64url(hash);
};

/**
 * Convert buffer to base64url encoding (RFC 4648, Section 5)
 * Removes padding and replaces +, / with -, _
 */
function base64url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
