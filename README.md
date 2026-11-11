# MailShell

A free, open-source desktop app for Gmail. It keeps Gmail in its own window, with the attachments and unread count you need at a glance.

**Website:** https://atomtroxell.github.io/mailshell/
**Download (Windows):** https://github.com/atomtroxell/mailshell/releases/latest

## Features

- Attachments listed at the top of each conversation
- Unread count on the Windows taskbar (Dock on Mac, launcher on Linux)
- New-mail notifications when MailShell is in the background
- System tray: closing the window keeps MailShell running; Exit quits
- Light, dark or system theme, applied to MailShell and Gmail
- Two-line email list with a compact sidebar

## Status

Early beta, version 0.1.0-beta.1, so expect rough edges. The Windows installer is the most tested build. The Mac and Linux builds are new and may not be stable.

Report problems or see known issues at https://github.com/atomtroxell/mailshell/issues.

## Build from source

Requirements: a current Node.js LTS release, and Windows for the installer.

```sh
npm install
npm start            # run in development
npm run package      # build the app into out/
npm run installer    # build the Windows installer into out/installer/
```

The legal pages are copied into `build/legal/` with the build date each time the app starts or packages (`scripts/stamp-legal.mjs`).

## Privacy and terms

- [Privacy policy](https://atomtroxell.github.io/mailshell/privacy.html)
- [Terms of use](https://atomtroxell.github.io/mailshell/terms.html)
- Third-party notices: [Licenses](https://atomtroxell.github.io/mailshell/third-party.html)

## License

MIT. See [LICENSE](LICENSE).

MailShell is free. Donations are optional: https://buymeacoffee.com/atomtroxell

MailShell is not affiliated with Google LLC. Gmail is a trademark of Google LLC.
