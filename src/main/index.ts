import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import started from 'electron-squirrel-startup'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { InitialState } from '../shared/ipc-types'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

const isMac = process.platform === 'darwin'
const TAB_BAR_HEIGHT = 40

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Mailshell',
    ...(isMac
      ? {
          titleBarStyle: 'hidden' as const,
          trafficLightPosition: { x: 12, y: 12 },
        }
      : {
          frame: false,
          titleBarOverlay: {
            color: '#1a1a1a',
            symbolColor: '#e0e0e0',
            height: TAB_BAR_HEIGHT,
          },
        }),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false,
      preload: path.join(__dirname, '../preload/shell.js'),
    },
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    )
  }
}

// IPC handler for initial state
ipcMain.handle(IPC_CHANNELS.GET_INITIAL_STATE, async (): Promise<InitialState> => {
  return {
    hasAccounts: false,
    lastActiveTab: '',
  }
})

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
