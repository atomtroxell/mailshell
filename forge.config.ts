import type { ForgeConfig } from '@electron-forge/shared-types'
import { VitePlugin } from '@electron-forge/plugin-vite'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import MakerSquirrel from '@electron-forge/maker-squirrel'
import MakerZip from '@electron-forge/maker-zip'
import path from 'path'

// Security baseline: These settings are applied in BrowserWindow creation (src/main/window.ts)
// and are enforced by Electron's default secure configuration:
const webPreferences = {
  // contextIsolation: true — renderer cannot access Node.js context
  // sandbox: true — OS-level process sandboxing enabled
  // nodeIntegration: false — require() unavailable in renderer
  // preload: path to shell.js for secure IPC
  // partition: 'persist:gshell' — persistent session storage
}

const config: ForgeConfig = {
  packagerConfig: {
    name: 'gshell',
    executableName: 'gshell',
    appBundleId: 'com.gshell.app',
    appCopyright: 'Copyright 2026 AJ Troxell',
    icon: './assets/icons/icon',
    asar: true,
    extraResource: ['resources/css', 'assets/icons/icon.ico'],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'gshell',
      author: 'AJ Troxell',
      exe: 'gshell.exe',
      setupIcon: './assets/icons/icon.ico',
      setupExe: 'gshell-Setup.exe',
      // msiExec: false,  // Use NSIS by default
      // Code signing: skip for MVP, enable before production
      // certificateFile: undefined,  // Path to .pfx cert for production
      // certificatePassword: undefined,
    }),
    new MakerZip({ platforms: ['darwin', 'linux'] }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main/index.ts', config: 'vite.main.config.ts', target: 'main' },
        { entry: 'src/preload/shell.ts', config: 'vite.preload.config.ts', target: 'preload' },
      ],
      renderer: [
        { name: 'main_window', config: 'vite.renderer.config.mts' },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
}

export default config
