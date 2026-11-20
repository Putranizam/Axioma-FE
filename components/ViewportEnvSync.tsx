"use client";

import { useEffect, useRef } from "react";

type ViewportEnv =
  | "pwa-ios"
  | "browser-google"
  | "browser-chrome"
  | "browser-safari"
  | "browser-mobile"
  | "desktop";

export function ViewportEnvSync() {
  const baseHeightRef = useRef<number>(0);

  useEffect(() => {
    const root = document.documentElement;
    const ua = navigator.userAgent;

    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const isStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true || window.matchMedia("(display-mode: standalone)").matches;

    let env: ViewportEnv = "desktop";
    if (isIOS && isStandalone) {
      env = "pwa-ios";
    } else if (/GSA\//.test(ua)) {
      env = "browser-google";
    } else if (
      /CriOS|Chrome|Chromium/.test(ua) &&
      /Mobile|Android|iPhone|iPad/.test(ua)
    ) {
      env = "browser-chrome";
    } else if (isIOS && /Safari/.test(ua)) {
      env = "browser-safari";
    } else if (/Mobile|Android/.test(ua)) {
      env = "browser-mobile";
    }

    root.setAttribute("data-env", env);

    const getViewportHeight = () =>
      window.visualViewport?.height ?? window.innerHeight;

    baseHeightRef.current = getViewportHeight();

    let rafId = 0;

    const syncViewport = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const vv = window.visualViewport;
        const vvHeight = vv?.height ?? window.innerHeight;
        const vvOffsetTop = vv?.offsetTop ?? 0;

        const activeTag = document.activeElement?.tagName;
        const isInputFocused =
          activeTag === "INPUT" || activeTag === "TEXTAREA";

        if (!isInputFocused) {
          const fullHeight = Math.max(vvHeight, window.innerHeight);
          if (fullHeight > baseHeightRef.current) {
            baseHeightRef.current = fullHeight;
          }
        }

        const kbOpen =
          isInputFocused && baseHeightRef.current - vvHeight > 120;

        root.setAttribute("data-kb", kbOpen ? "open" : "closed");

        if (env === "pwa-ios") {
          if (kbOpen) {
            root.style.setProperty("--app-height", `${vvHeight}px`);
            root.style.setProperty("--app-offset-top", `${vvOffsetTop}px`);
            if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
          } else {
            root.style.setProperty("--app-height", "100lvh");
            root.style.setProperty("--app-offset-top", "0px");
            if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
          }
        } else if (env === "desktop") {
          root.style.setProperty("--app-height", "100dvh");
          root.style.setProperty("--app-offset-top", "0px");
        } else {
          root.style.setProperty("--app-height", `${vvHeight}px`);
          root.style.setProperty(
            "--app-offset-top",
            kbOpen ? `${vvOffsetTop}px` : "0px"
          );
          if (kbOpen && window.scrollY !== 0) window.scrollTo(0, 0);
        }
      });
    };

    const handleOrientationChange = () => {
      setTimeout(() => {
        baseHeightRef.current = getViewportHeight();
        syncViewport();
      }, 150);
    };

    syncViewport();

    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", handleOrientationChange);
    document.addEventListener("focusin", syncViewport);
    document.addEventListener("focusout", syncViewport);

    return () => {
      cancelAnimationFrame(rafId);
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", handleOrientationChange);
      document.removeEventListener("focusin", syncViewport);
      document.removeEventListener("focusout", syncViewport);
    };
  }, []);

  return null;
}
