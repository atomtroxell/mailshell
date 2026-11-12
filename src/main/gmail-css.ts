/**
 * Gmail CSS Presets
 * Curated CSS rules to improve Gmail UI appearance
 * Focuses on: cleaner layout, better spacing, improved readability
 */

import { nativeTheme, type WebContents } from 'electron';
import type { Preferences } from './preferences';

/**
 * Whether Gmail should show its dark theme now. It follows the app's theme
 * setting (light, dark or system) through nativeTheme, and only applies while
 * the Gmail display changes are on.
 */
export function darkGmailWanted(prefs: Pick<Preferences, 'gmailCSSEnabled'>): boolean {
  return prefs.gmailCSSEnabled !== false && nativeTheme.shouldUseDarkColors;
}

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

/* --- Minimal header: hide Studio and the Active status. The Gemini button stays. --- */
div[aria-label="Studio"],
div[aria-label^="Status:"] {
  display: none !important;
}

/* --- Shorter header bar (64px -> 48px); header row scaled to fit --- */
header#gb {
  height: 48px !important;
  min-height: 48px !important;
}

header#gb .gb_Vd {
  zoom: 0.75;
}

/* --- Compact left rail (Mail / Chat) and compose button --- */
div[role="navigation"] {
  zoom: 0.85;
}

/* --- Divider between the slim icon rail (Mail / Chat) and the list --- */
div[role="navigation"].aeN {
  border-right: 1px solid #e0e3e7 !important;
  box-sizing: border-box !important;
}

/* --- Divider between the folder pane (Inbox, Starred, Labels) and the email list.
   A border, not an inset shadow: the pane's scrollbar covers a shadow. When the
   pane is collapsed it is 1px wide and sits on the rail's divider. --- */
.aqn {
  border-right: 1px solid #e0e3e7 !important;
}

div.T-I.T-I-KE {
  zoom: 0.7;
}

/* --- Compact right side panel (Calendar, Keep, Tasks, Contacts) --- */
div[role="complementary"][aria-label="Side panel"] {
  zoom: 0.8;
}

/* --- Compact reply bar at the bottom of an open thread --- */
div.nH.btDi4d {
  zoom: 0.8;
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
  font-size: 0.8125rem !important;
}

/* --- No left padding on search form container --- */
.gb_Te {
  padding-left: 0 !important;
}

/* --- Hover and selected/open row: keep the row divider visible (Gmail's hover
   state drops it, which left a white gap between rows) --- */
tr.zA:hover,
tr.zA.btb {
  box-shadow: inset 0 -1px 0 #d5d9de !important;
}

/* --- Subject is never bold, even on unread emails (sender stays bold) --- */
tr.zA .bqe {
  font-weight: 400 !important;
}

/* --- Off-white background on emails in the list, whether read or unread --- */
tr.zA,
tr.zA.yO {
  background-color: #fafbfc !important;
}

/* --- Open/selected row gets the old "read" tint instead --- */
tr.zA.btb {
  background-color: rgb(242, 246, 252) !important;
}

/* --- Lighter row divider (replaces Gmail's default bottom shadow) --- */
tr.zA {
  box-shadow: inset 0 -1px 0 #d5d9de !important;
}

/* --- Two-line rows ---
   Line 1: sender, attachment icon, date, star.
   Line 2: label dots, subject, snippet.
   The subject cell (td.a4W) is moved to its own line with order and
   flex-wrap. The 43px left padding lines the subject and its label dot up
   with the sender, after the 3px bar and the 40px marker cell (see the
   checkbox block below). */
tr.zA {
  flex-wrap: wrap !important;
  align-items: center !important;
}

tr.zA > td.yX {
  flex: 1 1 0 !important;
  min-width: 0 !important;
}

tr.zA > td.a4W {
  order: 10 !important;
  flex: 0 0 100% !important;
  box-sizing: border-box !important;
  min-width: 0 !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding-left: 43px !important;
}

tr.zA .xT {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: baseline !important;
  height: auto !important;
  min-width: 0 !important;
}

tr.zA .xT .y6,
tr.zA .xT .y2 {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

tr.zA .xT .y6 {
  flex: 0 1 auto !important;
  width: auto !important;
  min-width: 0 !important;
}

tr.zA .xT .y2 {
  flex: 1 1 0 !important;
  width: auto !important;
  min-width: 0 !important;
  margin-left: 6px !important;
}

/* --- Labels as small colour dots, not text chips ---
   Gmail's chip keeps its background colour in an inline style, so only the
   size and text are changed. The label name stays in the DOM (font-size 0). */
tr.zA .xT .yi {
  order: -1 !important;
  flex: 0 0 auto !important;
  width: auto !important;
  align-self: center !important;
  gap: 5px !important;
  margin: 0 6px 0 0 !important;
}

tr.zA .xT .ar.as {
  display: inline-block !important;
  margin: 0 !important;
}

tr.zA .xT .at {
  display: inline-block !important;
  width: 8px !important;
  height: 8px !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 50% !important;
  overflow: hidden !important;
  vertical-align: middle !important;
  font-size: 0 !important;
  color: transparent !important;
}

tr.zA .xT .at .av {
  font-size: 0 !important;
}

/* --- Checkbox: no column space; it appears in the marker slot ---
   The checkbox cell (td.oZ-x3) is collapsed to zero width, so no gap is left
   before the sender. The importance-marker cell (td.WA) is widened to 40px to
   make room for Gmail's drag grip (the ::before on td.oZ-x3, which stays where
   it is) and the checkbox beside it. On hover, or when the checkbox is ticked,
   the checkbox shows and the importance marker fades out. Opacity, not
   display, keeps Gmail's click handling intact. */
tr.zA td.WA {
  box-sizing: border-box !important;
  width: 40px !important;
  min-width: 40px !important;
  max-width: 40px !important;
}

tr.zA td.oZ-x3 {
  position: relative !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
}

tr.zA td.oZ-x3 > * {
  position: absolute !important;
  left: 16px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  z-index: 2 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

tr.zA:hover td.oZ-x3 > *,
tr.zA:has([role="checkbox"][aria-checked="true"]) td.oZ-x3 > * {
  opacity: 1 !important;
  pointer-events: auto !important;
}

tr.zA:hover td.WA > *,
tr.zA:has([role="checkbox"][aria-checked="true"]) td.WA > * {
  opacity: 0 !important;
}

/* --- Layout: remove the gap beside and below the message list ---
   The list sits flush against the left rail; the reading pane card has no
   bottom margin. The side-panel strip keeps its 16px max width but no min. */
.a3W+.bkK,
.aBA+.bkK {
  margin-left: 0 !important;
}

.bkK>.nH {
  margin-bottom: 0 !important;
}

.bAw.it {
  max-width: 16px !important;
  min-width: 0 !important;
}

/* --- Toolbar icons (top bar and hover bar: archive, delete, select, move to...) ---
   Gmail's icons are 20px PNGs. At 16px they are drawn at the bitmap's own
   pixel size on 125% scaling, so they look sharper and less heavy. */
.T-I-ax7 .T-I-J3 {
  width: 16px !important;
  height: 16px !important;
  background-size: 16px 16px !important;
}

/* --- Hover bar icons (archive, delete, mark as read, snooze shown on a row) ---
   Gmail draws these as <li class="bqX"> with a 20px background. They are sized
   with background-size only, so the 20px hit area stays the same. Sizes below
   16px look soft at 125% scaling (the bitmap is not a whole number of device
   pixels), so 16px is the smallest crisp size. */
tr.zA li.bqX {
  background-size: 16px 16px !important;
  background-position: center !important;
}

/* Gmail's hover circle behind each icon is 40px and reaches into the row above.
   28px keeps it inside the row; it stays centred on the 20px icon. */
tr.zA li.bqX::before {
  width: 28px !important;
  height: 28px !important;
  top: -4px !important;
  left: -4px !important;
}

.bzn .T-I-ax7 .T-I-J3 {
  width: 16px !important;
  height: 16px !important;
  background-size: 16px 16px !important;
}

/* --- "Summarize this email" pill: smaller --- */
.DC5CAd.kSjt3c {
  zoom: 0.8 !important;
}

/* --- Icons in an open message (star, add reaction, reply, more, open in new window): 16px --- */
button[aria-label="Add reaction"] svg,
button[aria-label="Reply"] svg,
button[aria-label="More message options"] svg,
button[aria-label="In new window"] svg {
  width: 16px !important;
  height: 16px !important;
}

/* --- Star: Gmail draws the star on ::before (20px bitmap) --- */
.T-KT,
.T-KT span {
  width: 16px !important;
  height: 16px !important;
}

.T-KT::before {
  width: 16px !important;
  height: 16px !important;
  background-size: 16px 16px !important;
}

/* --- Email list row: padding, line 1 (date, attachment icon, star) ---
   Gmail's star cell is 40px tall, which pushed the first line down and left
   about 20px of space above every row. The cell is held to one line so the
   star sits level with the date. The date is right-aligned in a fixed column
   so dates line up. The attachment icon is 16px (Gmail draws it at 20px).
   The star's image box is hidden, and must stay 0px: at 16px it takes the
   room the star picture needs and the picture shrinks to nothing. */
tr.zA {
  padding-top: 14px !important;
  padding-bottom: 12px !important;
}

tr.zA td.apU {
  height: 20px !important;
  min-height: 0 !important;
  align-self: center !important;
}

tr.zA td.apU .T-KT::before {
  flex: 0 0 16px !important;
}

/* Gmail's star sits 2px below the date and attachment icon; lift it to match */
tr.zA td.apU .T-KT {
  position: relative !important;
  top: -2px !important;
}

tr.zA td.apU .T-KT img.T-KT-JX {
  width: 0 !important;
  height: 0 !important;
}

tr.zA td.xW {
  width: 56px !important;
  justify-content: flex-end !important;
  text-align: right !important;
}

tr.zA td.yf img.yE {
  width: 16px !important;
  height: 16px !important;
  background-size: 16px 16px !important;
}

/* --- Unread: thin blue bar on the left, bold sender only ---
   Date is not bold on unread rows. Subject stays regular (see above).
   The bar is an inset box-shadow, so it does not use the importance cell
   that Gmail uses for the selected-row marker. */
tr.zA.zE {
  box-shadow: inset 3px 0 0 #1a73e8, inset 0 -1px 0 #d5d9de !important;
}

tr.zA.zE .xW,
tr.zA.zE .xW * {
  font-weight: 400 !important;
}

/* --- Sender is always bold (read and unread); colour is set per state below --- */
tr.zA .yW,
tr.zA .yW .bA4 {
  font-weight: 700 !important;
}

/* --- Email list text: darker than Gmail's default grey (sender, date, subject, snippet),
   on read and unread rows alike. Bold unread senders keep Gmail's near-black. --- */
tr.zA .yW,
tr.zA .xW,
tr.zA .bog,
tr.zA .y2 {
  color: #3c4043 !important;
}

tr.zA.zE .yW {
  color: #202124 !important;
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

/* --- Undo the forced full-width lines for labels, subject and snippet ---
   Gmail puts each of these on its own line in split view. The two-line
   row layout in section 1 needs them to sit side by side on line 2. */
.ae4.aDM.aAF tr.zA .xT .yi,
.ae4.aDM.aAF tr.zA .xT .y6,
.ae4.Zs tr.zA .xT .yi,
.ae4.Zs tr.zA .xT .y6 {
  flex: 0 1 auto !important;
  width: auto !important;
}

.ae4.aDM.aAF tr.zA .xT .y2,
.ae4.Zs tr.zA .xT .y2 {
  flex: 1 1 0 !important;
  width: auto !important;
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

/* ============ 4. FULL-HEIGHT PANES ============
   Gmail sizes its panes 16px short of the window bottom, which leaves a strip
   under the list, the reading pane and the left rail. The header is 48px.
   The left rail is zoomed to 0.85, so its height is divided by 0.85 to fill. */
.nH.aqk,
.aeF,
.bGI.nH,
.Tm,
.AO,
.bkK > .nH {
  height: calc(100vh - 48px) !important;
}

.Nu.tf.aZ6,
.Tm.aeJ {
  height: calc(100vh - 96px) !important;
}

div[role="navigation"].aeN {
  height: calc((100vh - 48px) / 0.85) !important;
}
`;

/**
 * Icon sizing. Gmail's toolbar and row icons are 20px bitmaps, which look soft
 * and heavy at this display scale. CSS cannot target elements by their
 * background image, so this script sets each 20px icon to 16px, which lines up
 * with the bitmap's pixels at 125% scaling. It watches for new nodes so icons
 * drawn later are sized too. Runs in the page; the disable script undoes it.
 */
const ICON_SIZE_ON = `(() => {
  if (window.__msIconScale) return 'already on';
  const RE = /icons\\/mail\\/gm3\\/1x\\/[^"')]*_20dp\\.png/;
  const SIZE = 16;
  const scaleEl = (el) => {
    if (!(el instanceof HTMLElement) || el.dataset.msIcon) return;
    if (!RE.test(getComputedStyle(el).backgroundImage)) return;
    const r = el.getBoundingClientRect();
    if (Math.round(r.width) !== 20 || Math.round(r.height) !== 20) return;
    el.style.setProperty('width', SIZE + 'px', 'important');
    el.style.setProperty('height', SIZE + 'px', 'important');
    el.style.setProperty('background-size', SIZE + 'px ' + SIZE + 'px', 'important');
    el.dataset.msIcon = '1';
  };
  const scanTree = (root) => {
    if (!(root instanceof Element)) return;
    scaleEl(root);
    root.querySelectorAll('*').forEach(scaleEl);
  };
  scanTree(document.body);
  let queued = [];
  let scheduled = false;
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) for (const n of m.addedNodes) queued.push(n);
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const batch = queued;
        queued = [];
        batch.forEach(scanTree);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.__msIconScale = observer;
  return 'on';
})()`;

const ICON_SIZE_OFF = `(() => {
  const observer = window.__msIconScale;
  if (observer && observer.disconnect) observer.disconnect();
  window.__msIconScale = undefined;
  document.querySelectorAll('[data-ms-icon]').forEach((el) => {
    el.style.removeProperty('width');
    el.style.removeProperty('height');
    el.style.removeProperty('background-size');
    delete el.dataset.msIcon;
  });
  return 'off';
})()`;


/**
 * Dark theme for Gmail, used while the app's theme is dark (see
 * applyGmailDarkTheme). Covers the parts this app styles: page, header, rail,
 * list, toolbar, reading-pane chrome. Email bodies stay on white cards, so
 * HTML mail keeps the colours its sender chose.
 */
export const GMAIL_DARK_CSS = `
body.aAU,
body {
  background-color: #202124 !important;
}

header#gb {
  background-color: #202124 !important;
  box-shadow: 0 1px 0 #3c4043 !important;
}

div[role="navigation"].aeN,
div[role="navigation"],
div.nH,
.gb_kd,
.wl {
  background-color: #202124 !important;
}

form[role="search"] {
  background-color: #35363a !important;
}

form[role="search"] input {
  color: #e8eaed !important;
}

.T-I.T-I-KE {
  background-color: #8ab4f8 !important;
}

/* Email list rows */
tr.zA,
tr.zA.yO {
  background-color: #202124 !important;
}

tr.zA.btb {
  background-color: #303134 !important;
}

tr.zA,
tr.zA:hover,
tr.zA.btb {
  box-shadow: inset 0 -1px 0 #3c4043 !important;
}

tr.zA.zE {
  box-shadow: inset 3px 0 0 #8ab4f8, inset 0 -1px 0 #3c4043 !important;
}

tr.zA .yW,
tr.zA .xW,
tr.zA .bog,
tr.zA .y2 {
  color: #bdc1c6 !important;
}

tr.zA.zE .yW,
tr.zA.zE .bqe {
  color: #e8eaed !important;
}

/* Thread header and sender lines */
h2.hP,
.hP,
.gD,
.gD span,
.go,
.ajy,
.hb,
.iY {
  color: #e8eaed !important;
}

.g3,
.iA {
  color: #9aa0a6 !important;
}

/* Email bodies stay light */
.a3s,
.a3s.aXjCPb {
  background-color: #ffffff !important;
  color: #202124 !important;
  border-radius: 8px !important;
}

.nr.wR {
  background-color: #202124 !important;
}

/* Slim icon rail: divider and label text */
div[role="navigation"].aeN {
  border-right-color: #3c4043 !important;
}

/* Folder pane divider */
.aqn {
  border-right-color: #3c4043 !important;
}

div[role="navigation"] .apW {
  color: #e8eaed !important;
}

/* Expanded sidebar: text, active item, icons */
.aqn .J-Ke,
.aqn .CJ,
.aqn .aWk,
.aqn .aAv,
.aqn .n4 {
  color: #e8eaed !important;
}

.aqn .TO.aiq {
  background-color: #394457 !important;
}

.aqn .TO.aiq,
.aqn .TO.aiq * {
  color: #d3e3fd !important;
}

/* Right side panel (Calendar, Keep, Tasks, Contacts) */
div[role="complementary"][aria-label="Side panel"],
.brC-aT5-aOt-Jw {
  background-color: #202124 !important;
}

/* Gmail's icons are black bitmaps; invert them so they show on dark */
.T-I-J3,
li.bqX,
.T-KT::before,
img.yE,
.oZ-jc,
.vOtjfb,
.aqn .qj,
.aqn .TH,
.aqn .G-asx,
.aqn .aAu {
  filter: invert(1) !important;
}
`;

/**
 * insertCSS keys, one per Gmail window (keyed by webContents id), so the main
 * window and a compose window can each be styled and restyled on their own.
 */
const presetKeys = new Map<number, string>();
const darkKeys = new Map<number, string>();
const tracked = new WeakSet<WebContents>();

/** Forget a window's keys when the window goes away. */
function trackWindow(contents: WebContents): void {
  if (tracked.has(contents)) return;
  tracked.add(contents);
  contents.once('destroyed', () => {
    presetKeys.delete(contents.id);
    darkKeys.delete(contents.id);
  });
}

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
    trackWindow(contents);
    const old = presetKeys.get(contents.id);
    if (old) {
      // Old key may already be gone after a navigation; ignore that failure.
      await contents.removeInsertedCSS(old).catch(() => undefined);
      presetKeys.delete(contents.id);
    }
    if (enabled) {
      presetKeys.set(contents.id, await contents.insertCSS(GMAIL_CSS_PRESETS));
    }
  } catch (error) {
    console.error('Failed to apply Gmail CSS presets:', error);
  }
  // Icon sizing runs in the page, so it is applied and removed here as well
  await contents
    .executeJavaScript(enabled ? ICON_SIZE_ON : ICON_SIZE_OFF)
    .catch((error: Error) => console.error('Icon sizing failed:', error.message));
}

/**
 * Turn the dark Gmail theme on or off. Call after applyGmailCSS on every
 * dom-ready (inserted CSS is dropped on navigation) and when the theme changes.
 */
export async function applyGmailDarkTheme(contents: WebContents, dark: boolean): Promise<void> {
  try {
    trackWindow(contents);
    const old = darkKeys.get(contents.id);
    if (old) {
      await contents.removeInsertedCSS(old).catch(() => undefined);
      darkKeys.delete(contents.id);
    }
    if (dark) {
      darkKeys.set(contents.id, await contents.insertCSS(GMAIL_DARK_CSS));
    }
  } catch (error) {
    console.error('Failed to apply Gmail dark theme:', error);
  }
}
