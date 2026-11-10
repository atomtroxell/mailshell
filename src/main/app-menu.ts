// src/main/app-menu.ts
// Application menu with Account management

import { app, Menu, BrowserWindow, dialog, shell } from 'electron'
import { showCredentialsDialog } from './credentials-dialog'
import { createSettingsWindow } from './settings-window'
import { createShortcutsWindow } from './shortcuts-window'
import { acceleratorFor } from '../shared/shortcuts'
import { DONATE_URL } from '../shared/links'
import { openLegalPage } from './legal'

const showLegalError = (): void => {
  dialog.showErrorBox('MailShell', 'The legal pages could not be found. Reinstall MailShell to restore them.')
}

export function setupAppMenu(mainWindow: BrowserWindow): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: acceleratorFor('exit'),
          // Quit for real. Closing the window only hides it to the tray.
          click: () => {
            app.quit()
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', accelerator: acceleratorFor('undo') },
        { role: 'redo', accelerator: acceleratorFor('redo') },
        { type: 'separator' },
        { role: 'cut', accelerator: acceleratorFor('cut') },
        { role: 'copy', accelerator: acceleratorFor('copy') },
        { role: 'paste', accelerator: acceleratorFor('paste') },
        { role: 'selectAll', accelerator: acceleratorFor('selectAll') },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: acceleratorFor('preferences'),
          click: async () => {
            try {
              await createSettingsWindow(mainWindow)
            } catch (error) {
              console.error('Failed to open settings:', error)
            }
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Show or Hide Sidebar',
          accelerator: acceleratorFor('toggleSidebar'),
          // Gmail's own "Main menu" button opens and closes the sidebar
          click: () => {
            void mainWindow.webContents
              .executeJavaScript(`document.querySelector('[aria-label="Main menu"]')?.click()`)
              .catch(() => undefined)
          },
        },
        { type: 'separator' },
        { role: 'reload', accelerator: acceleratorFor('reload') },
        { type: 'separator' },
        { role: 'resetZoom', accelerator: acceleratorFor('resetZoom') },
        { role: 'zoomIn', accelerator: acceleratorFor('zoomIn') },
        { role: 'zoomOut', accelerator: acceleratorFor('zoomOut') },
      ],
    },
    {
      label: 'Account',
      submenu: [
        {
          label: 'Manage Credentials',
          accelerator: acceleratorFor('credentials'),
          click: async () => {
            await showCredentialsDialog(mainWindow)
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          accelerator: acceleratorFor('shortcuts'),
          click: async () => {
            try {
              await createShortcutsWindow(mainWindow)
            } catch (error) {
              console.error('Failed to open keyboard shortcuts:', error)
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Privacy Policy',
          click: async () => {
            if (!(await openLegalPage('privacy.html'))) showLegalError()
          },
        },
        {
          label: 'Terms of Use',
          click: async () => {
            if (!(await openLegalPage('terms.html'))) showLegalError()
          },
        },
        {
          label: 'License and Notices',
          click: async () => {
            if (!(await openLegalPage('third-party.html'))) showLegalError()
          },
        },
        { type: 'separator' },
        {
          label: 'About MailShell',
          click: () => {
            const version = app.getVersion()
            const donate = DONATE_URL.startsWith('https://')
            // Buttons: the optional donation link opens in the browser; the dialog has no other links
            dialog
              .showMessageBox(mainWindow, {
                type: 'info',
                title: 'About MailShell',
                message: 'MailShell',
                detail:
                  `Version ${version}\n\n` +
                  'A free desktop app for Gmail. MIT licensed.\n' +
                  'Donations are optional and do not change your rights or the terms.\n' +
                  'Not affiliated with Google LLC.',
                buttons: donate ? ['OK', 'Buy Me a Coffee'] : ['OK'],
                defaultId: 0,
                cancelId: 0,
              })
              .then(({ response }) => {
                if (donate && response === 1) void shell.openExternal(DONATE_URL)
              })
              .catch((error) => console.error('About dialog failed:', error))
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
