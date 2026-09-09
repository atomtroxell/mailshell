// src/main/account-manager.ts
// Account save/remove operations using Electron native dialogs

import { BrowserWindow, dialog, ipcMain } from 'electron'
import { storeRefreshToken, getRefreshToken, clearRefreshToken } from './auth/token-store'

// Export handler functions that can be called directly or via IPC
export async function handleSaveAccount(mainWindow: BrowserWindow): Promise<boolean> {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Save Account',
    message: 'Save current Gmail account?',
    detail: 'Your Gmail credentials will be securely stored locally and restored when you open the app next time.',
    buttons: ['Save', 'Cancel'],
    defaultId: 0,
  })

  if (result.response === 0) {
    try {
      // Check if there's an existing refresh token to save
      const token = getRefreshToken()
      if (!token) {
        await dialog.showMessageBox(mainWindow, {
          type: 'warning',
          title: 'No Account',
          message: 'You are not logged in.',
          detail: 'Please log in to Gmail first, then use this option to save your account.',
        })
        return false
      }

      // Token is already saved, just confirm
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Account Saved',
        message: 'Your account credentials are securely saved.',
      })
      return true
    } catch (error) {
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Error',
        message: 'Unable to save account. Please try again.',
      })
      return false
    }
  }
  return false
}

export async function handleRemoveAccount(mainWindow: BrowserWindow): Promise<boolean> {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Remove Account',
    message: 'Remove saved account?',
    detail: 'This will delete your stored Gmail credentials. You will need to log in again when you reopen the app.',
    buttons: ['Remove', 'Cancel'],
    defaultId: 1, // Default to Cancel
  })

  if (result.response === 0) {
    try {
      clearRefreshToken()
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Account Removed',
        message: 'Your saved account has been removed.',
      })
      return true
    } catch (error) {
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Error',
        message: 'Unable to remove account. Please try again.',
      })
      return false
    }
  }
  return false
}

export function setupAccountManager(mainWindow: BrowserWindow) {
  // IPC handlers for account management (can be called from renderer or keyboard shortcuts)

  ipcMain.handle('account:save-with-dialog', async () => {
    return await handleSaveAccount(mainWindow)
  })

  ipcMain.handle('account:remove-with-dialog', async () => {
    return await handleRemoveAccount(mainWindow)
  })

  ipcMain.handle('account:check-saved', async () => {
    try {
      return getRefreshToken() !== null
    } catch (error) {
      console.error('Error checking saved account:', error)
      return false
    }
  })
}
