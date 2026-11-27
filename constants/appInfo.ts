export const AXIOMA_APP_VERSION = "v1.0 Beta" as const;
export const AXIOMA_ENGINE_LABEL = "Axioma Engine" as const;

export const PUBLIC_APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://axioma.my.id"
)
  .trim()
  .replace(/\/+$/, "");

export const PUBLIC_CONTACT_EMAIL = (
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "axiomamyid@gmail.com"
).trim();

export const PUBLIC_LEGAL_UPDATED_LABEL = "27 November 2026" as const;
export const PUBLIC_LEGAL_UPDATED_ISO = "2026-11-27" as const;

export function formatQuotaResetLabel(resetAt?: string): string {
  if (!resetAt) return "pukul 00.00 WIB";
  const parsed = Date.parse(resetAt);
  if (!Number.isFinite(parsed)) return "pukul 00.00 WIB";
  try {
    const timeStr = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(new Date(parsed));
    return `pukul ${timeStr} WIB`;
  } catch {
    return "pukul 00.00 WIB";
  }
}

export function formatTokenNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Math.max(0, Math.round(value)).toLocaleString("id-ID");
}

export function formatUsagePercentLabel(percent: number): string {
  if (!Number.isFinite(percent) || percent <= 0) return "0%";
  const clamped = Math.min(100, Math.max(0, percent));
  if (clamped > 0 && clamped < 1) {
    return `${clamped.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
  }
  return `${Math.round(clamped)}%`;
}
