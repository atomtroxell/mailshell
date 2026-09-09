import React, { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

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
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

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

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save account';
      setError(message);
      console.error('Failed to save account:', message);
      // Clear error message after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveClick = () => {
    setShowConfirmRemove(true);
  };

  const handleConfirmRemove = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      setShowConfirmRemove(false);

      await window.electron.account.remove();
      setSuccess('Account removed successfully');

      // Refresh status
      const isSaved = await window.electron.account.isSaved();
      onStatusChange?.(isSaved);
      onRemove?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove account';
      setError(message);
      console.error('Failed to remove account:', message);
      // Clear error message after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRemove = () => {
    setShowConfirmRemove(false);
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
          onClick={handleRemoveClick}
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

      <ConfirmDialog
        isOpen={showConfirmRemove}
        title="Remove Account?"
        message="This will remove your saved Gmail account from this device. You can re-authenticate and save it again later."
        confirmText="Remove Account"
        cancelText="Keep Account"
        isDangerous={true}
        onConfirm={handleConfirmRemove}
        onCancel={handleCancelRemove}
      />
    </div>
  );
};

export default AccountControls;
