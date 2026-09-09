import React, { useEffect, useState } from 'react';

interface AccountStatusProps {
  onStatusChange?: (isSaved: boolean) => void;
}

/**
 * AccountStatus: Display the current account save state
 * Shows whether the account credentials are persisted
 */
export const AccountStatus: React.FC<AccountStatusProps> = ({ onStatusChange }) => {
  const [isSaved, setIsSaved] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccountStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const saved = await window.electron.account.isSaved();
        setIsSaved(saved);
        onStatusChange?.(saved);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Failed to check account status:', message);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccountStatus();
  }, [onStatusChange]);

  if (isLoading) {
    return (
      <div style={{ padding: '10px', color: '#666' }}>
        <p>Checking account status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '10px', color: '#d32f2f' }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
      <p style={{ margin: '0 0 5px 0', color: '#333' }}>
        <strong>Account Status:</strong>{' '}
        <span style={{ color: isSaved ? '#2e7d32' : '#f57c00' }}>
          {isSaved ? '✓ Saved' : '○ Not Saved'}
        </span>
      </p>
      <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
        {isSaved
          ? 'Your account credentials are securely stored'
          : 'Your account is not saved. You will need to login again.'}
      </p>
    </div>
  );
};

export default AccountStatus;
