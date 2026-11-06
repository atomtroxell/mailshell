/**
 * Gmail CSS Presets
 * Curated CSS rules to improve Gmail UI appearance
 * Focuses on: cleaner layout, better spacing, improved readability
 */

import type { WebContents } from 'electron';

export const GMAIL_CSS_PRESETS = `
/* ==========================================================================
   Gmail Custom Stylesheet
   Built by inspecting the live DOM — selectors verified working.
   Style: clean / minimal

   Structure:
   1. Shared rules       — apply everywhere, no known divergence
   2. Split-view-scoped  — only fire when a reading pane is active
                            (split view), not "No split" mode; each
                            Gmail build marks split-view differently,
                            so both known markers are listed explicitly
   3. Header search      — search form margin and column alignment;
                            matched on form[role="search"] and .gb_af
                            because the variant-specific chains don't match
   ========================================================================== */

/* ============ 1. SHARED RULES ============ */

/* --- Overall page background --- */
body.aAU {
  background-color: #f5f6f8 !important;
}

/* --- Top header bar (logo, search, icons) --- */
header#gb {
  background-color: #ffffff !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08) !important;
}

/* --- Left icon rail (nav) --- */
div[role="navigation"].aeN {
  background-color: #ffffff !important;
}

/* --- Hide Gmail logo ---
   The visible logo is an <a aria-label="Gmail"> wrapping an <img>. The
   previous .gb_3c class does not exist on this Gmail build. The hidden
   duplicate link in the header is also matched; it is already invisible. */
header#gb a[aria-label="Gmail"] {
  display: none !important;
}

/* --- Collapse the reserved logo column so search isn't pushed right --- */
header#gb .gb_2d.gb_Ad.gb_Bd {
  min-width: 0 !important;
  flex: 0 0 auto !important;
}

/* --- Hide Support (?) button --- */
a[aria-label="Support"] {
  display: none !important;
}

/* --- Hide Upgrade button/link (and its tooltip) --- */
div.s1rbBe {
  display: none !important;
}

/* --- Hide account-activity / Terms / Privacy / Program Policies footer --- */
div.apO {
  display: none !important;
}

/* --- Sidebar item typography --- */
.TO .nU > .n0,
.TO.NQ .nU > .n0,
.TO.nZ .nU > .n0,
.ah9 > .CJ,
.n3 > .CL > .CK {
  font-size: 0.8rem !important;
  letter-spacing: -0.3px !important;
}

/* --- Remove empty spacer cell in inbox rows (read + unread variants) --- */
td.xY.bnk.aZ5.aHR,
td.xY.bnk.aZ5 {
  display: none !important;
}

/* --- Uniform font size across email list rows (sender, subject, snippet, date) --- */
tr.zA .yW,
tr.zA .yW *,
tr.zA .y6,
tr.zA .y6 *,
tr.zA td.xW,
tr.zA td.xW * {
  font-size: 0.875rem !important;
}

/* --- No left padding on search form container --- */
.gb_Te {
  padding-left: 0 !important;
}

/* --- Remove box-shadow on email rows: hover state and selected/open row --- */
tr.zA:hover,
tr.zA.btb {
  box-shadow: none !important;
}

/* --- Subject is never bold, even on unread emails (sender stays bold) --- */
tr.zA .bqe {
  font-weight: 400 !important;
}

/* --- White background on emails in the list, whether read or unread --- */
tr.zA,
tr.zA.yO {
  background-color: #ffffff !important;
}

/* --- Open/selected row gets the old "read" tint instead --- */
tr.zA.btb {
  background-color: rgb(242, 246, 252) !important;
}

/* ============ 2. SPLIT-VIEW-SCOPED RULES ============
   These only apply when a reading pane is active (split view), not
   "No split" mode. Different Gmail builds mark split-view differently
   on the same .ae4 wrapper:
     - personal-account build: .ae4.aDM.aAF
     - Workspace-account build: .ae4.Zs
   Both are listed explicitly so each build is targeted independently;
   if a future build uses yet another marker, add it here rather than
   changing the shared rules above. */

/* --- Force labels, subject, and snippet each onto their own line --- */
.ae4.aDM.aAF tr.zA .xT .yi,
.ae4.aDM.aAF tr.zA .xT .y6,
.ae4.aDM.aAF tr.zA .xT .y2,
.ae4.Zs tr.zA .xT .yi,
.ae4.Zs tr.zA .xT .y6,
.ae4.Zs tr.zA .xT .y2 {
  flex: 1 1 100% !important;
  width: 100% !important;
}

/* --- Remove left margin on label chip container --- */
.ae4.aDM.aAF tr.zA .xT .yi,
.ae4.Zs tr.zA .xT .yi {
  margin-left: 0 !important;
}

/* ============ 3. HEADER SEARCH ALIGNMENT ============
   The search form carries a 68px margin-left on this build. The earlier
   variant-scoped selectors (gb_2d.gb_ae.gb_Ue.gb_8e + gb_af / gb_bf) never
   matched, because the header markup does not have those class chains.
   Target the form and its column directly. */

/* --- Left-align the search column (was centered) --- */
header#gb .gb_af {
  justify-content: flex-start !important;
}

/* --- Remove the extra 68px margin pushing the search bar right --- */
header#gb form[role="search"] {
  margin-left: 0 !important;
}
`;

/** Key from the last insertCSS call, needed to remove the presets later. */
let activeCSSKey: string | null = null;

/**
 * Apply or remove the Gmail CSS presets on the given page.
 *
 * Uses webContents.insertCSS, so the CSS is added from the main process and
 * is not blocked by Gmail's page CSP. removeInsertedCSS lets the Settings
 * toggle take effect without a reload.
 *
 * Call on every dom-ready: inserted CSS is dropped when the page navigates.
 */
export async function applyGmailCSS(contents: WebContents, enabled: boolean): Promise<void> {
  try {
    if (activeCSSKey) {
      // Old key may already be gone after a navigation; ignore that failure.
      await contents.removeInsertedCSS(activeCSSKey).catch(() => undefined);
      activeCSSKey = null;
    }
    if (enabled) {
      activeCSSKey = await contents.insertCSS(GMAIL_CSS_PRESETS);
    }
  } catch (error) {
    console.error('Failed to apply Gmail CSS presets:', error);
  }
}
