import type React from "react";

export type DropdownDirection = "up" | "down";

/**
 * Computes whether a dropdown anchored to `triggerEl` should open upward or downward
 * based on available vertical space in the current viewport.
 */
export function computeDropdownDirection(
  triggerEl: HTMLElement | null,
  estimatedHeight = 300
): DropdownDirection {
  if (typeof window === "undefined") return "up";
  if (window.innerWidth < 768) return "up";
  if (!triggerEl) return "up";

  const rect = triggerEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - 16;
  const spaceAbove = rect.top - 16;

  if (spaceBelow >= estimatedHeight) return "down";
  if (spaceAbove >= estimatedHeight) return "up";
  return spaceBelow >= spaceAbove ? "down" : "up";
}

/**
 * Computes clamped viewport-aware fixed positioning for Desktop floating popovers
 * so they never clip outside the viewport even when the window is resized.
 */
export function computeClampedPopoverStyle(
  triggerEl: HTMLElement | null,
  popoverWidth: number,
  preferredAnchor: "bottom-left" | "top-right",
  estimatedHeight = 420
): React.CSSProperties | undefined {
  if (typeof window === "undefined" || window.innerWidth < 768) {
    return undefined;
  }

  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampedWidth = Math.min(popoverWidth, vw - margin * 2);

  if (!triggerEl) {
    return {
      width: `${clampedWidth}px`,
      maxHeight: `${Math.max(200, vh - 80)}px`,
    };
  }

  const rect = triggerEl.getBoundingClientRect();

  if (preferredAnchor === "bottom-left") {
    const rawLeft = Math.max(margin, rect.left);
    const left = Math.min(rawLeft, vw - clampedWidth - margin);
    const spaceAbove = rect.top - margin - 8;
    const spaceBelow = vh - rect.bottom - margin - 8;

    if (spaceAbove >= Math.min(estimatedHeight, 260) || spaceAbove >= spaceBelow) {
      const bottom = Math.max(margin, vh - rect.top + 8);
      const maxHeight = Math.max(180, Math.min(vh * 0.82, vh - bottom - margin));
      return {
        top: "auto",
        right: "auto",
        left: `${Math.round(left)}px`,
        bottom: `${Math.round(bottom)}px`,
        width: `${Math.round(clampedWidth)}px`,
        maxHeight: `${Math.round(maxHeight)}px`,
      };
    }

    const top = Math.max(margin, rect.bottom + 8);
    const maxHeight = Math.max(180, Math.min(vh * 0.82, vh - top - margin));
    return {
      bottom: "auto",
      right: "auto",
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      width: `${Math.round(clampedWidth)}px`,
      maxHeight: `${Math.round(maxHeight)}px`,
    };
  }

  // preferredAnchor === "top-right"
  const rawRight = Math.max(margin, vw - rect.right);
  const right = Math.min(rawRight, vw - clampedWidth - margin);
  const top = Math.min(Math.max(margin, rect.bottom + 8), Math.max(margin, vh - 220));
  const maxHeight = Math.max(180, Math.min(vh * 0.82, vh - top - margin));

  return {
    left: "auto",
    bottom: "auto",
    right: `${Math.round(right)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(clampedWidth)}px`,
    maxHeight: `${Math.round(maxHeight)}px`,
  };
}

/**
 * Formats an epoch timestamp (ms) into natural Indonesian relative time
 * ("Baru saja", "5 menit lalu", "1 jam lalu", "Kemarin", or short date).
 */
export function formatRelativeTimeId(timestampMs: number, now: Date | null): string {
  if (!now || !timestampMs || isNaN(timestampMs)) return "";
  const diffSec = Math.floor((now.getTime() - timestampMs) / 1000);
  if (diffSec < 60) return "Baru saja";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (timestampMs >= startOfToday) {
      return `${diffHours} jam lalu`;
    }
    return "Kemarin";
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  if (timestampMs >= startOfYesterday) return "Kemarin";

  const d = new Date(timestampMs);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
