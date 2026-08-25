import { safeStorage, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const tokenFilePath = path.join(app.getPath('userData'), 'tokens.json');

/**
 * Store a refresh token securely using Electron's safeStorage (DPAPI on Windows)
 * Token is encrypted before written to disk; only current user can decrypt
 */
export const storeRefreshToken = (token: string): void => {
  try {
    const encrypted = safeStorage.encryptString(token);
    const data = {
      refreshToken: encrypted.toString('base64'),
      expiresAt: Date.now() + 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
    };
    fs.writeFileSync(tokenFilePath, JSON.stringify(data), {
      mode: 0o600, // Owner-only permissions
      encoding: 'utf-8',
    });
  } catch (error) {
    console.error('Failed to store refresh token:', (error as Error).message);
    throw new Error('Failed to securely store refresh token');
  }
};

/**
 * Retrieve and decrypt the refresh token from disk
 * Returns null if token doesn't exist, is expired, or cannot be decrypted
 */
export const getRefreshToken = (): string | null => {
  try {
    if (!fs.existsSync(tokenFilePath)) {
      return null;
    }

    const fileContent = fs.readFileSync(tokenFilePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Check expiry
    if (data.expiresAt && data.expiresAt < Date.now()) {
      fs.unlinkSync(tokenFilePath);
      return null;
    }

    if (!data.refreshToken) {
      return null;
    }

    const decrypted = safeStorage.decryptString(Buffer.from(data.refreshToken, 'base64'));
    return decrypted;
  } catch (error) {
    // Graceful degradation: log error but don't throw
    // Token may have been corrupted or user key may be unavailable
    console.error('Failed to retrieve refresh token:', (error as Error).message);
    return null;
  }
};

/**
 * Clear the stored refresh token (e.g., on logout)
 */
export const clearRefreshToken = (): void => {
  try {
    if (fs.existsSync(tokenFilePath)) {
      fs.unlinkSync(tokenFilePath);
    }
  } catch (error) {
    // Silent failure - file may not exist or permissions may be restricted
    console.error('Failed to clear refresh token:', (error as Error).message);
  }
};
