import React, { useState, useEffect } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import type { Preferences } from '../../shared/ipc-types';

/**
 * SettingsPanel: Settings UI with appearance, data management, and about sections
 * Manages preferences persistence and cache clearing
 */
export const SettingsPanel: React.FC = () => {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>('');
  const [showConfirmClearCache, setShowConfirmClearCache] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        setIsLoading(true);
        const prefs = await window.electron.preferences.get();
        setPreferences(prefs);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load preferences';
        setError(message);
        console.error('Failed to load preferences:', message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPrefs();
  }, []);

  // Load app version on mount
  useEffect(() => {
    const getVersion = async () => {
      try {
        const version = await window.electron.app.getVersion();
        setAppVersion(version);
      } catch (err) {
        console.error('Failed to get app version:', err);
      }
    };

    getVersion();
  }, []);

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      await window.electron.preferences.set('theme', newTheme);
      setPreferences((prev) => (prev ? { ...prev, theme: newTheme } : null));
      setSuccess('Theme updated');

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update theme';
      setError(message);
      console.error('Failed to update theme:', message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmClearCache = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      setShowConfirmClearCache(false);

      const cleared = await window.electron.preferences.clearCache();
      if (cleared) {
        setSuccess('Cache cleared successfully');
      } else {
        setError('Failed to clear cache');
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear cache';
      setError(message);
      console.error('Failed to clear cache:', message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !preferences) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        fontSize: '14px',
        color: '#333',
        height: '100vh',
        overflowY: 'auto',
      }}
    >
      <h1 style={{ marginTop: 0, fontSize: '20px', fontWeight: 600 }}>Settings</h1>

      {/* Error message */}
      {error && (
        <div
          style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div
          style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        >
          {success}
        </div>
      )}

      {/* Appearance section */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
          Appearance
        </h2>
        <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '13px' }}>
          Choose your preferred theme
        </p>

        {preferences && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(['light', 'dark', 'system'] as const).map((themeOption) => (
              <label
                key={themeOption}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                <input
                  type="radio"
                  name="theme"
                  value={themeOption}
                  checked={preferences.theme === themeOption}
                  onChange={() => handleThemeChange(themeOption)}
                  disabled={isLoading}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ textTransform: 'capitalize' }}>{themeOption}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* Data Management section */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
          Data Management
        </h2>

        {preferences && (
          <>
            <div>
              <button
                onClick={() => setShowConfirmClearCache(true)}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1f2937',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'background-color 0.2s',
                  opacity: isLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#111827';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#1f2937';
                }}
              >
                Clear Cache
              </button>
              <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                Clears browsing data and cached files
              </p>
            </div>
          </>
        )}
      </section>

      {/* About section */}
      <section>
        <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
          About
        </h2>
        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '13px' }}>
          MailShell - Gmail Client
        </p>
        <p style={{ margin: 0, color: '#999', fontSize: '12px' }}>Version {appVersion}</p>
      </section>

      {/* Confirm clear cache dialog */}
      <ConfirmDialog
        isOpen={showConfirmClearCache}
        title="Clear Cache?"
        message="This will clear all cached data and browsing history. Your Gmail session will remain active."
        confirmText="Clear"
        cancelText="Cancel"
        onConfirm={handleConfirmClearCache}
        onCancel={() => setShowConfirmClearCache(false)}
        isDangerous={true}
      />
    </div>
  );
};

export default SettingsPanel;
