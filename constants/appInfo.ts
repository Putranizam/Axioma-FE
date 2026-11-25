export const AXIOMA_APP_VERSION = "v1.0 Beta" as const;
export const AXIOMA_ENGINE_LABEL = "Axioma Engine" as const;

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
