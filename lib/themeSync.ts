/**
 * Safari iOS Real-Time Theme-Color & Bar Tinting Sync Helper
 *
 * Updates `html`/`body` root surfaces, `color-scheme`,
 * `apple-mobile-web-app-status-bar-style`, and `<meta name="theme-color">`
 * synchronously inside the user click handler, followed by a single clean
 * `requestAnimationFrame` confirmation re-insert so Safari iOS repaints top
 * status bar & bottom toolbar immediately without closing modals or refreshing.
 */

export const AXIOMA_DARK_THEME_COLOR = "#0e0e10";
export const AXIOMA_LIGHT_THEME_COLOR = "#f9f9f8";

let pendingRafId: number | null = null;

function clearPendingRaf(): void {
  if (typeof window === "undefined") return;
  if (pendingRafId !== null) {
    window.cancelAnimationFrame(pendingRafId);
    pendingRafId = null;
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

function replaceThemeColorMeta(targetColor: string): void {
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((el) => el.remove());

  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.setAttribute("content", targetColor);
  document.head.appendChild(meta);
}

export function syncIosSafariTheme(isDark: boolean): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const targetColor = isDark
    ? AXIOMA_DARK_THEME_COLOR
    : AXIOMA_LIGHT_THEME_COLOR;

  clearPendingRaf();

  // 1. Synchronous update inside user click handler
  applyRootSurface(isDark, targetColor);
  syncAppleStatusBarStyle(isDark);
  replaceThemeColorMeta(targetColor);

  // 2. Single clean re-insert on next animation frame to confirm Safari iOS chrome repaint
  pendingRafId = window.requestAnimationFrame(() => {
    pendingRafId = null;
    applyRootSurface(isDark, targetColor);
    syncAppleStatusBarStyle(isDark);
    replaceThemeColorMeta(targetColor);
  });
}
