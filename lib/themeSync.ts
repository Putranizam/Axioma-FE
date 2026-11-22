/**
 * Safari iOS Real-Time Theme-Color & Bar Tinting Sync Helper
 *
 * Keeps a single `<meta name="theme-color">` and a single
 * `<meta name="apple-mobile-web-app-status-bar-style">` in `<head>`, updating
 * their `content` attribute and `html`/`body` root surfaces 100% synchronously
 * inside the user click handler (no rAF / setTimeout tag removal-reinsertion).
 */

export const AXIOMA_DARK_THEME_COLOR = "#0e0e10";
export const AXIOMA_LIGHT_THEME_COLOR = "#f9f9f8";

function getOrCreateSingleMeta(name: string): HTMLMetaElement {
  const existing = Array.from(
    document.querySelectorAll<HTMLMetaElement>(`meta[name="${name}"]`)
  );
  let primary = existing[0];
  if (!primary) {
    primary = document.createElement("meta");
    primary.name = name;
    document.head.appendChild(primary);
  } else {
    primary.removeAttribute("media");
    for (let i = 1; i < existing.length; i += 1) {
      existing[i].remove();
    }
  }
  return primary;
}

export function syncIosSafariTheme(isDark: boolean): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const targetColor = isDark
    ? AXIOMA_DARK_THEME_COLOR
    : AXIOMA_LIGHT_THEME_COLOR;
  const colorScheme = isDark ? "dark" : "light";
  const statusBarStyle = isDark ? "black-translucent" : "default";

  // a. Synchronous update on html & body surfaces
  const root = document.documentElement;
  if (isDark) {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
  root.style.colorScheme = colorScheme;
  root.style.backgroundColor = targetColor;
  if (document.body) {
    document.body.style.backgroundColor = targetColor;
  }

  // b. Update single <meta name="theme-color"> synchronously in-place
  const themeMeta = getOrCreateSingleMeta("theme-color");
  themeMeta.setAttribute("content", targetColor);

  // c. Update single <meta name="apple-mobile-web-app-status-bar-style"> synchronously
  const appleMeta = getOrCreateSingleMeta("apple-mobile-web-app-status-bar-style");
  appleMeta.setAttribute("content", statusBarStyle);
}
