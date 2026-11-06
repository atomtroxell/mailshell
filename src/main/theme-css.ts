// src/main/theme-css.ts
// Shared light/dark CSS variables for Mailshell's own data: pages (Settings,
// Keyboard Shortcuts, error page). Static string, interpolated into each
// page's <style> block. Pages follow nativeTheme.themeSource through
// prefers-color-scheme; no JS is involved.

export const THEME_VARS = `
  :root { color-scheme: light dark; --bg:#ffffff; --bg-alt:#f6f8fc; --fg:#333333; --fg-strong:#202124; --muted:#666666; --muted-alt:#5f6368; --faint:#999999; --surface:#ffffff; --hover:#f0f0f0; --border:#cccccc; --border-soft:#eeeeee; --kbd-bg:#fafafa; --btn-bg:#1f2937; --btn-hover:#111827; --btn-fg:#ffffff; --link:#1a73e8; --link-fg:#ffffff; --err-bg:#ffebee; --err-fg:#c62828; --ok-bg:#e8f5e9; --ok-fg:#2e7d32; }
  @media (prefers-color-scheme: dark) { :root { --bg:#202124; --bg-alt:#202124; --fg:#e8eaed; --fg-strong:#e8eaed; --muted:#9aa0a6; --muted-alt:#9aa0a6; --faint:#80868b; --surface:#2d2e31; --hover:#3c4043; --border:#5f6368; --border-soft:#3c4043; --kbd-bg:#3c4043; --btn-bg:#8ab4f8; --btn-hover:#aecbfa; --btn-fg:#202124; --link:#8ab4f8; --link-fg:#202124; --err-bg:#3c1f1f; --err-fg:#f28b82; --ok-bg:#1e3a2a; --ok-fg:#81c995; } }
`
