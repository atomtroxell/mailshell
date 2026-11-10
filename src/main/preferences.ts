import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface Preferences {
  theme: 'light' | 'dark' | 'system';
  gmailCSSEnabled: boolean;
  version: string;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  gmailCSSEnabled: true,
  version: '0.1.0-beta.1',
};

const PREFERENCES_FILE = path.join(app.getPath('userData'), 'preferences.json');

/**
 * Load preferences from disk
 * Returns merged preferences with defaults if file missing or incomplete
 */
export const loadPreferences = async (): Promise<Preferences> => {
  try {
    const data = await fs.readFile(PREFERENCES_FILE, 'utf-8');
    const saved = JSON.parse(data) as Partial<Preferences>;
    // Merge with defaults to handle missing fields
    return { ...DEFAULT_PREFERENCES, ...saved };
  } catch (error) {
    // File doesn't exist or is invalid - use defaults
    console.error('Failed to load preferences, using defaults:', (error as Error).message);
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Save preferences to disk
 */
export const savePreferences = async (prefs: Preferences): Promise<void> => {
  try {
    await fs.writeFile(PREFERENCES_FILE, JSON.stringify(prefs, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save preferences:', (error as Error).message);
    throw new Error('Failed to save preferences');
  }
};
