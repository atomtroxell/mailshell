// src/main/app-menu.ts
// Application menu with Account management

import { Menu, BrowserWindow } from 'electron'
import { showCredentialsDialog } from './credentials-dialog'
import { createSettingsWindow } from './settings-window'
import { createShortcutsWindow } from './shortcuts-window'
import { acceleratorFor } from '../shared/shortcuts'

export function setupAppMenu(mainWindow: BrowserWindow): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: acceleratorFor('exit'),
          click: () => {
            mainWindow.close()
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
