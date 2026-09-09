// src/main/app-menu.ts
// Application menu with Account management

import { Menu, BrowserWindow } from 'electron'
import { showCredentialsDialog } from './credentials-dialog'

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
