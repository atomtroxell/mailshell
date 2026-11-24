; build/installer.nsh
; Custom NSIS settings for the MailShell installer (electron-builder includes this file).
; The last installer page shows an optional donation link. It opens the donation
; page in the user's browser and is not required.

!define MUI_FINISHPAGE_LINK "Buy me a coffee (optional, opens in your browser)"
!define MUI_FINISHPAGE_LINK_LOCATION "https://buymeacoffee.com/atomtroxell"

; Welcome page: a short intro. What's new lives in the in-app "What's new" popup
; (src/main/whats-new.ts), so it is not repeated here.
; $\r$\n is a line break in NSIS text.
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to MailShell"
  !define MUI_WELCOMEPAGE_TEXT "MailShell is a free desktop app for Gmail.$\r$\n$\r$\nClick Next to read the license."
  !insertmacro MUI_PAGE_WELCOME
!macroend

; Shortcuts get the AppUserModelID that the packaged app sets (src/main/index.ts).
; electron-builder would use appId (com.mailshell.app) here, but dev runs used that
; ID with Electron's icon, and the taskbar kept that icon. So this uses its own ID.
; Runs after electron-builder makes the shortcuts, on every install and update.
!macro customInstall
  ${if} ${FileExists} "$newStartMenuLink"
    WinShell::SetLnkAUMI "$newStartMenuLink" "com.mailshell.desktop"
  ${endIf}
  ${ifNot} ${isNoDesktopShortcut}
    ${if} ${FileExists} "$newDesktopLink"
      WinShell::SetLnkAUMI "$newDesktopLink" "com.mailshell.desktop"
    ${endIf}
  ${endIf}
  ClearErrors
!macroend
