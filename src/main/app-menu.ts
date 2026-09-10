// src/main/app-menu.ts
// Application menu with Account management

import { Menu, BrowserWindow } from 'electron'
import { showCredentialsDialog } from './credentials-dialog'
import { createSettingsWindow } from './settings-window'

export function setupAppMenu(mainWindow: BrowserWindow): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            mainWindow.close()
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+Shift+P',
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
      label: 'Account',
      submenu: [
        {
          label: 'Manage Credentials',
          accelerator: 'CmdOrCtrl+Shift+A',
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
          label: 'About Mailshell',
          click: () => {
            // eslint-disable-next-line global-require
            const { version } = require('../../package.json')
            require('electron').dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Mailshell',
              message: 'Mailshell',
              detail: `Secure Gmail client v${version}\n\nA desktop wrapper for Gmail with credential management.`,
            })
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
