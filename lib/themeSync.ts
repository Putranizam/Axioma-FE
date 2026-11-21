/**
 * Safari iOS Real-Time Theme-Color & Bar Tinting Repaint Helper
 *
 * Forces WebKit Safari iOS to repaint both top status bar & bottom address bar
 * immediately on theme switch — even while a full-screen Settings modal is open
 * and `body` has `overflow: hidden` / `position: fixed`.
 *
 * Strategy:
 * 1. Synchronously update `html.classList` (`dark`/`light`), `colorScheme`, direct
 *    `backgroundColor` on BOTH `html` and `body`, and `apple-mobile-web-app-status-bar-style`.
 * 2. Two-step `<meta name="theme-color">` replacement: remove all existing tags,
 *    append a fresh `<meta name="theme-color" content={nudgeColor}>`, then update
 *    to `targetColor` inside double `requestAnimationFrame`.
 * 3. Safe WebKit root repaint nudge (synchronous single-tick root reflow with dialog
 *    scroll-position preservation + `window.scrollTo` micro-nudge) so Safari iOS
 *    immediately re-samples edge colors without closing the modal or refreshing.
 * 4. Post-dismiss confirmation pass (~260ms) after native iOS `<select>` menus close.
 */

export const AXIOMA_DARK_THEME_COLOR = "#0e0e10";
export const AXIOMA_DARK_NUDGE_COLOR = "#0f0f11";
export const AXIOMA_LIGHT_THEME_COLOR = "#f9f9f8";
export const AXIOMA_LIGHT_NUDGE_COLOR = "#fafaf9";

let pendingRaf1: number | null = null;
let pendingRaf2: number | null = null;
let pendingScrollRaf: number | null = null;
let pendingConfirmTimer: ReturnType<typeof setTimeout> | null = null;
let pendingConfirmRaf1: number | null = null;
let pendingConfirmRaf2: number | null = null;

function clearPendingRepaints(): void {
  if (typeof window === "undefined") return;
  if (pendingRaf1 !== null) {
    window.cancelAnimationFrame(pendingRaf1);
    pendingRaf1 = null;
  }
  if (pendingRaf2 !== null) {
    window.cancelAnimationFrame(pendingRaf2);
    pendingRaf2 = null;
  }
  if (pendingScrollRaf !== null) {
    window.cancelAnimationFrame(pendingScrollRaf);
    pendingScrollRaf = null;
  }
  if (pendingConfirmTimer !== null) {
    clearTimeout(pendingConfirmTimer);
    pendingConfirmTimer = null;
  }
  if (pendingConfirmRaf1 !== null) {
    window.cancelAnimationFrame(pendingConfirmRaf1);
    pendingConfirmRaf1 = null;
  }
  if (pendingConfirmRaf2 !== null) {
    window.cancelAnimationFrame(pendingConfirmRaf2);
    pendingConfirmRaf2 = null;
  }
}

function applyRootSurface(isDark: boolean, targetColor: string): void {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
  root.style.colorScheme = isDark ? "dark" : "light";
  root.style.backgroundColor = targetColor;
  if (document.body) {
    document.body.style.backgroundColor = targetColor;
  }
}

function syncAppleStatusBarStyle(isDark: boolean): void {
  const statusBarValue = isDark ? "black-translucent" : "default";
  const existing = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  if (existing) {
    existing.setAttribute("content", statusBarValue);
  } else {
    const meta = document.createElement("meta");
    meta.name = "apple-mobile-web-app-status-bar-style";
    meta.content = statusBarValue;
    document.head.appendChild(meta);
  }
}

function removeAllThemeColorMetas(): void {
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((el) => el.remove());
}

/**
 * Safely nudges WebKit Safari iOS compositor to re-sample browser chrome colors
 * immediately even while a modal is open (`body` overflow hidden / fixed),
 * preserving inner modal scroll positions and never blurring active text inputs.
 */
function performSafeSafariChromeRepaintNudge(): void {
  const root = document.documentElement;
  const activeTag = document.activeElement?.tagName;
  const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA";
  const prevScrollY = window.scrollY;

  if (!isTyping) {
    const dialogScrollers = Array.from(
      document.querySelectorAll<HTMLElement>('[role="dialog"] .overflow-y-auto')
    ).map((el) => ({ el, top: el.scrollTop }));

    // Synchronous single-tick display toggle forces WebKit to rebuild its root
    // layer tree and re-sample top/bottom chrome tint before painting the frame.
    const prevDisplay = root.style.display;
    root.style.display = "none";
    void root.offsetHeight;
    root.style.display = prevDisplay;

    for (const item of dialogScrollers) {
      item.el.scrollTop = item.top;
    }
  } else {
    void root.offsetHeight;
  }

  // Safe micro-scroll nudge for Safari iOS when page scroll is available
  try {
    window.scrollTo(0, prevScrollY + 1);
    pendingScrollRaf = window.requestAnimationFrame(() => {
      pendingScrollRaf = null;
      window.scrollTo(0, prevScrollY);
    });
  } catch {
    // Ignore restricted scroll environments
  }
}

function triggerTwoStepMetaRepaint(
  isDark: boolean,
  nudgeColor: string,
  targetColor: string,
  withChromeNudge: boolean,
  onStoreRaf: (r1: number | null, r2: number | null) => void
): void {
  removeAllThemeColorMetas();

  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.setAttribute("content", nudgeColor);
  document.head.appendChild(meta);

  const r1 = window.requestAnimationFrame(() => {
    onStoreRaf(null, null);
    const r2 = window.requestAnimationFrame(() => {
      onStoreRaf(null, null);
      applyRootSurface(isDark, targetColor);
      meta.setAttribute("content", targetColor);
      if (withChromeNudge) {
        performSafeSafariChromeRepaintNudge();
      } else {
        void document.documentElement.offsetHeight;
      }
    });
    onStoreRaf(null, r2);
  });
  onStoreRaf(r1, null);
}

export function syncIosSafariTheme(isDark: boolean): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const targetColor = isDark
    ? AXIOMA_DARK_THEME_COLOR
    : AXIOMA_LIGHT_THEME_COLOR;
  const nudgeColor = isDark
    ? AXIOMA_DARK_NUDGE_COLOR
    : AXIOMA_LIGHT_NUDGE_COLOR;

  clearPendingRepaints();

  // 1. Synchronously sync classList, colorScheme, html/body background, and Apple status bar meta
  applyRootSurface(isDark, targetColor);
  syncAppleStatusBarStyle(isDark);

  // 2. Immediate two-step meta replacement + WebKit chrome repaint nudge
  triggerTwoStepMetaRepaint(isDark, nudgeColor, targetColor, true, (r1, r2) => {
    pendingRaf1 = r1;
    pendingRaf2 = r2;
  });

  // 3. Post-picker confirmation pass (~260ms) so Safari iOS repaints immediately
  //    after native iOS <select> UIMenu finishes dismissing inside Settings modal
  pendingConfirmTimer = setTimeout(() => {
    pendingConfirmTimer = null;
    applyRootSurface(isDark, targetColor);
    syncAppleStatusBarStyle(isDark);
    triggerTwoStepMetaRepaint(isDark, nudgeColor, targetColor, true, (r1, r2) => {
      pendingConfirmRaf1 = r1;
      pendingConfirmRaf2 = r2;
    });
  }, 260);
}
