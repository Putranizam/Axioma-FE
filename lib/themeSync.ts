/**
 * Safari iOS Real-Time Theme-Color & Chrome Repaint Helper
 *
 * WebKit Safari iOS often ignores in-place `setAttribute("content", ...)` mutations
 * on existing `<meta name="theme-color">` elements and can coalesce same-tick
 * remove+append operations (especially while a native iOS `<select>` menu is dismissing).
 *
 * This helper:
 * 1. Syncs `colorScheme` and solid root background colors (`html` + `body`) immediately.
 * 2. Removes all existing `<meta name="theme-color">` tags, then recreates and appends
 *    a fresh `<meta name="theme-color">` (without any `media` attribute) on the next
 *    `requestAnimationFrame` so Safari iOS repaints top status bar & bottom toolbar live.
 * 3. Schedules a flicker-free post-dismiss confirmation pass after native iOS menus close.
 */

export const AXIOMA_DARK_THEME_COLOR = "#0e0e10";
export const AXIOMA_LIGHT_THEME_COLOR = "#f9f9f8";

let pendingRaf1: number | null = null;
let pendingRaf2: number | null = null;
let pendingConfirmTimer: ReturnType<typeof setTimeout> | null = null;

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
  if (pendingConfirmTimer !== null) {
    clearTimeout(pendingConfirmTimer);
    pendingConfirmTimer = null;
  }
}

function applyRootSurface(isDark: boolean, activeColor: string): void {
  const root = document.documentElement;
  root.style.colorScheme = isDark ? "dark" : "light";
  root.style.backgroundColor = activeColor;
  if (document.body) {
    document.body.style.backgroundColor = activeColor;
  }
}

function removeAllThemeColorMetas(): void {
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((el) => el.remove());
}

function appendFreshThemeColorMeta(activeColor: string): void {
  removeAllThemeColorMetas();
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = activeColor;
  document.head.appendChild(meta);
}

export function syncIosSafariTheme(isDark: boolean): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const activeColor = isDark
    ? AXIOMA_DARK_THEME_COLOR
    : AXIOMA_LIGHT_THEME_COLOR;

  clearPendingRepaints();

  // 1. Immediately sync root color-scheme + html/body background and clear old theme-color tags
  applyRootSurface(isDark, activeColor);
  removeAllThemeColorMetas();

  // 2. Trigger micro-repaint inside requestAnimationFrame so Safari iOS re-evaluates
  //    a brand-new <meta name="theme-color"> node on a fresh frame without page refresh
  pendingRaf1 = window.requestAnimationFrame(() => {
    pendingRaf1 = null;
    applyRootSurface(isDark, activeColor);
    appendFreshThemeColorMeta(activeColor);
    // Force lightweight style/layout flush for WebKit under-page background sampling
    void document.documentElement.offsetHeight;
  });

  // 3. Post-picker confirmation pass (~180ms): ensures Safari iOS updates chrome tint
  //    even if theme was switched from inside a native iOS <select> menu while UIKit dismissed it
  pendingConfirmTimer = setTimeout(() => {
    pendingConfirmTimer = null;
    applyRootSurface(isDark, activeColor);
    removeAllThemeColorMetas();
    pendingRaf2 = window.requestAnimationFrame(() => {
      pendingRaf2 = null;
      applyRootSurface(isDark, activeColor);
      appendFreshThemeColorMeta(activeColor);
    });
  }, 180);
}
