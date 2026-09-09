import React, { useState } from 'react';

interface AccountControlsProps {
  onSave?: () => void;
  onRemove?: () => void;
  onStatusChange?: (isSaved: boolean) => void;
}

/**
 * AccountControls: Buttons to save or remove the account
 * Provides explicit user control over credential persistence
 */
export const AccountControls: React.FC<AccountControlsProps> = ({
  onSave,
  onRemove,
  onStatusChange,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      await window.electron.account.save();
      setSuccess('Account saved successfully');

      // Refresh status
      const isSaved = await window.electron.account.isSaved();
      onStatusChange?.(isSaved);
      onSave?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save account';
      setError(message);
      console.error('Failed to save account:', message);
    } finally {
      setIsLoading(false);
      // Clear success message after 3 seconds
      if (success) {
        setTimeout(() => setSuccess(null), 3000);
      }
    }
  };

  const handleRemove = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      await window.electron.account.remove();
      setSuccess('Account removed successfully');

      // Refresh status
      const isSaved = await window.electron.account.isSaved();
      onStatusChange?.(isSaved);
      onRemove?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove account';
      setError(message);
      console.error('Failed to remove account:', message);
    } finally {
      setIsLoading(false);
      // Clear success message after 3 seconds
      if (success) {
        setTimeout(() => setSuccess(null), 3000);
      }
    }
  };

  return (
    <div style={{ padding: '10px', borderTop: '1px solid #eee' }}>
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={handleSave}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            marginRight: '8px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Processing...' : 'Save Account'}
        </button>
        <button
          onClick={handleRemove}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Processing...' : 'Remove Account'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#d32f2f', margin: '8px 0', fontSize: '14px' }}>
          Error: {error}
        </p>
      )}

      {success && (
        <p style={{ color: '#2e7d32', margin: '8px 0', fontSize: '14px' }}>
          {success}
        </p>
      )}
    </div>
  );
};

export default AccountControls;
