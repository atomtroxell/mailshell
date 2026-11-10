; build/installer.nsh
; Custom NSIS settings for the MailShell installer (electron-builder includes this file).
; The last installer page shows an optional donation link. It opens the donation
; page in the user's browser and is not required.

!define MUI_FINISHPAGE_LINK "Buy me a coffee (optional, opens in your browser)"
!define MUI_FINISHPAGE_LINK_LOCATION "https://buymeacoffee.com/atomtroxell"

; Welcome page: a short what's-new note in place of the default text.
; $\r$\n is a line break in NSIS text.
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to MailShell"
  !define MUI_WELCOMEPAGE_TEXT "MailShell is a free desktop app for Gmail.$\r$\n$\r$\nWhat's new in this beta:$\r$\n   - Attachments listed at the top of each conversation$\r$\n   - Unread count on the taskbar (Dock on Mac)$\r$\n   - New-mail notifications$\r$\n   - System tray icon: closing the window keeps MailShell running$\r$\n   - Dark theme that follows your system setting$\r$\n   - Cleaner email list$\r$\n   - Ctrl+Shift+B shows or hides the sidebar$\r$\n$\r$\nClick Next to read the license."
  !insertmacro MUI_PAGE_WELCOME
!macroend
