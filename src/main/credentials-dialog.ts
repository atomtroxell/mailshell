// src/main/credentials-dialog.ts
// Display and manage saved credentials via native dialogs

import { BrowserWindow, dialog } from 'electron'
import { clearRefreshToken } from './auth/token-store'
import { provider } from './providers'

export async function showCredentialsDialog(mainWindow: BrowserWindow): Promise<void> {
  // Check if user has an active mail session by looking for auth cookies
  const cookies = await mainWindow.webContents.session.cookies.get({ url: provider.homeUrl })
  const hasSavedCredentials = cookies.length > 0

  if (!hasSavedCredentials) {
    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'No Saved Credentials',
      message: 'You are not logged in.',
      detail: `Log in to ${provider.name} to save your account.`,
    })
    return
  }

  // Show credentials management dialog
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Manage Credentials',
    message: `${provider.name} Account Saved`,
    detail: `Your ${provider.name} credentials are securely stored on this device.`,
    buttons: ['Change Account', 'Remove Account', 'Close'],
    defaultId: 2, // Default to Close
  })

  switch (result.response) {
    case 0: // Change Account
      await handleChangeAccount(mainWindow)
      break
    case 1: // Remove Account
      await handleRemoveAccount(mainWindow)
      break
    case 2: // Close
      // Do nothing
      break
  }
}

async function handleChangeAccount(mainWindow: BrowserWindow): Promise<void> {
  const confirmResult = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Change Account',
    message: 'Log in with a different account?',
    detail: `Your current credentials will be removed, and you can log in with a different ${provider.name} account.`,
    buttons: ['Change', 'Cancel'],
    defaultId: 1,
  })

  if (confirmResult.response === 0) {
    try {
      // Clear current credentials
      clearRefreshToken()

      // Clear session data
      const session = mainWindow.webContents.session
      if (session) {
        await session.clearStorageData({
          storages: ['cookies', 'localstorage'],
        })
      }

      // Reload the mail page to show the login screen
      mainWindow.webContents.reload()

      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Account Changed',
        message: `Please log in with your new ${provider.name} account.`,
      })
    } catch (error) {
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Error',
        message: 'Unable to change account. Please try again.',
      })
    }
  }
}

async function handleRemoveAccount(mainWindow: BrowserWindow): Promise<void> {
  const confirmResult = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Remove Account',
    message: 'Remove saved account?',
    detail: 'This will delete your stored credentials. You will need to log in again next time.',
    buttons: ['Remove', 'Cancel'],
    defaultId: 1, // Default to Cancel
  })

  if (confirmResult.response === 0) {
    try {
      clearRefreshToken()

      // Update window title when account is removed
      mainWindow.setTitle(`MailShell - ${provider.name} Client`)

      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Account Removed',
        message: 'Your saved credentials have been deleted.',
      })
    } catch (error) {
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Error',
        message: 'Unable to remove account. Please try again.',
      })
    }
  }
}
