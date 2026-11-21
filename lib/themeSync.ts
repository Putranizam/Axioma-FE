/**
 * Safari iOS Real-Time Theme-Color & Bar Tinting Repaint Helper
 *
 * WebKit Safari iOS frequently ignores single-step `<meta name="theme-color">` mutations
 * and caches the top status bar & bottom address bar tint until a full page reload.
 *
 * This helper forces an immediate live repaint without refresh via:
 * 1. Syncing `document.documentElement.style.colorScheme` and direct `backgroundColor`
 *    on both `document.documentElement` and `document.body`.
 * 2. Syncing `<meta name="apple-mobile-web-app-status-bar-style">` (`default` in light,
 *    `black-translucent` in dark).
 * 3. Two-step meta replacement: remove all existing `meta[name="theme-color"]`, append
 *    a fresh `<meta name="theme-color" content={nudgeColor}>`, then update `content` to
 *    `targetColor` inside a double `requestAnimationFrame` so WebKit commits a new color
 *    transition and repaints both top & bottom Safari bars in real time.
 */

export const AXIOMA_DARK_THEME_COLOR = "#0e0e10";
export const AXIOMA_DARK_NUDGE_COLOR = "#0f0f11";
export const AXIOMA_LIGHT_THEME_COLOR = "#f9f9f8";
export const AXIOMA_LIGHT_NUDGE_COLOR = "#fafaf9";

let pendingRaf1: number | null = null;
let pendingRaf2: number | null = null;
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

function triggerTwoStepMetaRepaint(
  isDark: boolean,
  nudgeColor: string,
  targetColor: string,
  onStoreRaf: (r1: number | null, r2: number | null) => void
): void {
  removeAllThemeColorMetas();

  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.setAttribute("content", nudgeColor);
  document.head.appendChild(meta);

  // Double requestAnimationFrame ensures WebKit paints the nudge value on a real frame
  // before committing the final targetColor, forcing Safari iOS bar tinting to update live.
  const r1 = window.requestAnimationFrame(() => {
    onStoreRaf(null, null);
    const r2 = window.requestAnimationFrame(() => {
      onStoreRaf(null, null);
      applyRootSurface(isDark, targetColor);
      meta.setAttribute("content", targetColor);
      void document.documentElement.offsetHeight;
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

  // 1. Immediately sync color-scheme, html/body solid background, and Apple status bar meta
  applyRootSurface(isDark, targetColor);
  syncAppleStatusBarStyle(isDark);

  // 2. Two-step meta replacement (nudge -> double rAF -> targetColor)
  triggerTwoStepMetaRepaint(isDark, nudgeColor, targetColor, (r1, r2) => {
    pendingRaf1 = r1;
    pendingRaf2 = r2;
  });

  // 3. Post-picker confirmation pass (~180ms) for native iOS <select> / sheet dismissal
  pendingConfirmTimer = setTimeout(() => {
    pendingConfirmTimer = null;
    applyRootSurface(isDark, targetColor);
    syncAppleStatusBarStyle(isDark);
    triggerTwoStepMetaRepaint(isDark, nudgeColor, targetColor, (r1, r2) => {
      pendingConfirmRaf1 = r1;
      pendingConfirmRaf2 = r2;
    });
  }, 180);
}
