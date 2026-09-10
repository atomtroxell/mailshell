/**
 * Gmail CSS Presets
 * Curated CSS rules to improve Gmail UI appearance
 * Focuses on: cleaner layout, better spacing, improved readability
 */

export const GMAIL_CSS_PRESETS = `
/* Overall improvements */
body {
  line-height: 1.5;
}

/* Sidebar improvements - compact and clean */
div[role="navigation"] {
  background-color: #f8f9fa;
  border-right: 1px solid #dadce0;
}

/* Compose area - better spacing */
div[data-tooltip="Compose"] {
  margin-bottom: 12px;
}

/* Mail list improvements - better readability */
table tbody tr {
  border-bottom: 1px solid #f0f0f0;
}

table tbody tr:hover {
  background-color: #f9f9f9;
}

/* Thread list - cleaner appearance */
div[role="listbox"] {
  background-color: #ffffff;
}

/* Header/toolbar improvements */
div[role="toolbar"] {
  border-bottom: 1px solid #dadce0;
  padding: 8px 12px;
}

/* Button styling - subtle improvement */
button[aria-label],
div[role="button"] {
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

button[aria-label]:hover,
div[role="button"]:hover {
  background-color: #f1f3f4;
}

/* Text improvements - better font rendering */
div.gs {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
}

/* Remove excessive padding in various areas */
div[role="main"] {
  padding: 0 12px;
}

/* Subject line - clearer typography */
span[data-subject-line] {
  font-size: 15px;
  font-weight: 500;
  color: #202124;
}

/* Sender name - better contrast */
span[email] {
  font-size: 13px;
  color: #5f6368;
}

/* Thread timestamp - subtle styling */
span.ZW {
  color: #80868b;
  font-size: 12px;
}

/* Reduce unnecessary spacing in compose */
div.I4 {
  margin: 8px 0;
}

/* Better spacing for labels */
span[role="img"] {
  margin-right: 6px;
}

/* Attachment area - cleaner */
div[role="img"][data-tooltip*="attachment"] {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 4px 8px;
  margin: 4px 0;
}

/* Search bar improvements */
input[role="combobox"][aria-label*="Search"] {
  border: 1px solid #dadce0;
  border-radius: 24px;
  padding: 10px 16px;
  background-color: #f1f3f4;
}

input[role="combobox"][aria-label*="Search"]:focus {
  background-color: #ffffff;
  box-shadow: 0 1px 6px rgba(32, 33, 36, 0.28);
}

/* Reduce excessive whitespace in email view */
div[role="presentation"] div[style*="height"] {
  margin: 4px 0;
}

/* Better spacing for email body text */
div[data-is-quoted-text="false"] {
  word-break: break-word;
  padding: 12px 0;
}

/* Conversation list - cleaner separators */
div[role="listitem"] {
  border-bottom: 1px solid #efefef;
  padding: 8px 0;
}

div[role="listitem"]:last-child {
  border-bottom: none;
}

/* Labels and tags - better styling */
a[data-label-id] {
  background-color: #e8eaed;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  margin-right: 4px;
}

/* Unread indicator - subtle highlight */
div[data-is-read="false"] {
  font-weight: 500;
}

/* Archive/delete buttons - cleaner appearance */
div[aria-label*="Delete"],
div[aria-label*="Archive"],
div[aria-label*="Spam"] {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

div[aria-label*="Delete"]:hover,
div[aria-label*="Archive"]:hover,
div[aria-label*="Spam"]:hover {
  opacity: 1;
  background-color: #f1f3f4;
}

/* Scrollbar styling - subtle */
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 6px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
`;

/**
 * Inject Gmail CSS presets into the page
 * Creates a <style> tag with all preset rules
 */
export function injectGmailCSS(): void {
  try {
    // Check if CSS is already injected
    if (document.getElementById('mailshell-gmail-presets')) {
      return;
    }

    // Create and inject style tag
    const styleTag = document.createElement('style');
    styleTag.id = 'mailshell-gmail-presets';
    styleTag.textContent = GMAIL_CSS_PRESETS;
    document.head.appendChild(styleTag);

    console.log('Mailshell Gmail CSS presets injected');
  } catch (error) {
    console.error('Failed to inject Gmail CSS presets:', error);
  }
}

/**
 * Remove Gmail CSS presets from the page
 */
export function removeGmailCSS(): void {
  try {
    const styleTag = document.getElementById('mailshell-gmail-presets');
    if (styleTag) {
      styleTag.remove();
      console.log('Mailshell Gmail CSS presets removed');
    }
  } catch (error) {
    console.error('Failed to remove Gmail CSS presets:', error);
  }
}
