"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, ArrowRight, Clock } from "lucide-react";

export interface QuotaModalInfo {
  plan?: "free" | "pro";
  unlimited?: boolean;
  remainingCredits?: number;
  remaining?: number;
  dailyCredits?: number;
  dailyLimit?: number;
  usedToday?: number;
  bonusCredits?: number;
  required?: number;
  resetAt?: string;
  expiresAt?: string;
  suggestedModel?: string;
  message?: string;
  triggeredByLimit?: boolean;
}

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotaInfo: QuotaModalInfo | null;
  onSwitchToOmni: () => void;
  triggerReason?: "manual" | "quota_exceeded";
}

const FREE_BENEFITS = [
  "Kuota chat harian standar",
  "Akses model AI cepat",
  "Riwayat chat tersimpan",
] as const;

const PRO_BENEFITS = [
  "Kuota chat harian hingga 15x lebih besar",
  "Akses semua model AI premium (coding & analisis mendalam)",
  "Upload file & gambar lebih leluasa",
  "Prioritas kecepatan respons",
] as const;

const TOPUP_OPTIONS = [
  {
    id: "topup-50",
    creditsLabel: "+50 Kredit",
    priceLabel: "Rp 15.000",
  },
  {
    id: "topup-150",
    creditsLabel: "+150 Kredit",
    priceLabel: "Rp 35.000",
  },
] as const;

export function UpgradeModal({
  isOpen,
  onClose,
  quotaInfo,
  onSwitchToOmni,
  triggerReason,
}: UpgradeModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const isProPlan = Boolean(quotaInfo?.plan === "pro" || quotaInfo?.unlimited);
  const effectiveTriggerReason: "manual" | "quota_exceeded" =
    triggerReason ?? (quotaInfo?.triggeredByLimit ? "quota_exceeded" : "manual");
  const isLimitTriggered = effectiveTriggerReason === "quota_exceeded";

  const dailyLimit =
    typeof quotaInfo?.dailyLimit === "number" && Number.isFinite(quotaInfo.dailyLimit)
      ? Math.max(0, quotaInfo.dailyLimit)
      : 30;

  const effectiveRemaining =
    typeof quotaInfo?.remaining === "number" && Number.isFinite(quotaInfo.remaining)
      ? Math.max(0, quotaInfo.remaining)
      : typeof quotaInfo?.remainingCredits === "number" &&
          Number.isFinite(quotaInfo.remainingCredits)
        ? Math.max(0, quotaInfo.remainingCredits)
        : 0;

  const hasExplicitDaily =
    typeof quotaInfo?.dailyCredits === "number" &&
    Number.isFinite(quotaInfo.dailyCredits) &&
    typeof quotaInfo?.bonusCredits === "number" &&
    Number.isFinite(quotaInfo.bonusCredits);

  const hasExplicitUsedSplit =
    typeof quotaInfo?.usedToday === "number" &&
    Number.isFinite(quotaInfo.usedToday) &&
    typeof quotaInfo?.bonusCredits === "number" &&
    Number.isFinite(quotaInfo.bonusCredits);

  let dailyRemaining: number;
  let bonusCredits: number;

  if (isProPlan) {
    dailyRemaining = dailyLimit;
    bonusCredits =
      typeof quotaInfo?.bonusCredits === "number" && Number.isFinite(quotaInfo.bonusCredits)
        ? Math.max(0, quotaInfo.bonusCredits)
        : 0;
  } else if (hasExplicitDaily || hasExplicitUsedSplit) {
    const rawDailyRemaining = hasExplicitDaily
      ? Math.max(0, Math.min(dailyLimit, quotaInfo!.dailyCredits as number))
      : Math.max(0, dailyLimit - (quotaInfo!.usedToday as number));
    const rawBonus = Math.max(0, quotaInfo!.bonusCredits as number);
    if (rawDailyRemaining + rawBonus === effectiveRemaining) {
      dailyRemaining = rawDailyRemaining;
      bonusCredits = rawBonus;
    } else if (effectiveRemaining <= rawBonus) {
      dailyRemaining = 0;
      bonusCredits = effectiveRemaining;
    } else {
      bonusCredits = rawBonus;
      dailyRemaining = Math.min(dailyLimit, Math.max(0, effectiveRemaining - rawBonus));
    }
  } else if (effectiveRemaining > dailyLimit) {
    dailyRemaining = dailyLimit;
    bonusCredits = effectiveRemaining - dailyLimit;
  } else {
    dailyRemaining = Math.min(dailyLimit, effectiveRemaining);
    bonusCredits = 0;
  }

  const canContinueWithOmni =
    isLimitTriggered && !isProPlan && effectiveRemaining >= 1;

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const modalTitle = isLimitTriggered
    ? "Tingkatkan Kapasitas Axioma"
    : "Paket & Langganan Axioma";

  const showSeparatedBalances = !isProPlan && bonusCredits > 0;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[125] flex items-center justify-center p-3 sm:p-4 bg-black/50 dark:bg-black/75 backdrop-blur-xs text-zinc-900 dark:text-zinc-100 font-sans"
    >
      <div className="w-full max-w-[680px] max-h-[90dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] flex flex-col rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141416] shadow-2xl">
        {/* Header */}
        <header className="sticky top-0 z-10 shrink-0 flex items-start justify-between gap-3 sm:gap-4 border-b border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141416] px-4 sm:px-6 py-4 sm:py-5">
          <div className="min-w-0 flex-1">
            <h2
              id="upgrade-modal-title"
              className="text-[18px] sm:text-[19px] font-semibold tracking-tight text-zinc-950 dark:text-white"
            >
              {modalTitle}
            </h2>

            {isProPlan ? (
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Langganan Axioma Pro Anda aktif dengan akses penuh tanpa batas kredit harian.
                {bonusCredits > 0 && (
                  <span className="ml-1.5 font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
                    Saldo Top-Up tersimpan: {bonusCredits} kredit (Aktif selamanya).
                  </span>
                )}
              </p>
            ) : (
              <>
                {isLimitTriggered && (
                  <p className="mt-1 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Kuota harian Anda untuk model ini telah habis. Reset otomatis pukul 00.00 WIB.
                  </p>
                )}

                {showSeparatedBalances ? (
                  <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:gap-2">
                    <div className="inline-flex items-baseline flex-wrap gap-x-1.5 rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] px-2.5 py-1 text-[12px]">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                        Kuota Harian: {dailyRemaining}/{dailyLimit} kredit
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        (Reset otomatis 00.00 WIB)
                      </span>
                    </div>
                    <div className="inline-flex items-baseline flex-wrap gap-x-1.5 rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] px-2.5 py-1 text-[12px]">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                        Saldo Top-Up: {bonusCredits} kredit
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        (Aktif selamanya)
                      </span>
                    </div>
                  </div>
                ) : (
                  !isLimitTriggered && (
                    <p className="mt-1 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">
                        Kuota Harian: {dailyRemaining}/{dailyLimit} kredit
                      </span>{" "}
                      <span>(Reset otomatis 00.00 WIB)</span>
                    </p>
                  )
                )}
              </>
            )}

            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              Tarif penggunaan: Omni 1 kredit · Pro 3 kredit · Architect 4 kredit · Media 5 kredit
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela paket dan langganan"
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </header>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* 2 Main Plan Cards: Free & Pro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kartu 1: Paket Free */}
            <div className="min-w-0 flex flex-col justify-between rounded-2xl border border-zinc-200/90 dark:border-white/[0.08] bg-white dark:bg-[#111113] p-4 sm:p-5 shadow-[0_1px_4px_rgba(0,0,0,0.02)] dark:shadow-none">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[15.5px] font-semibold text-zinc-950 dark:text-white">
                    Paket Free
                  </h3>
                  {!isProPlan && (
                    <span className="text-[10.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shrink-0">
                      Paket Aktif
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-[24px] font-semibold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                    Rp 0
                  </span>
                  <span className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                    / selamanya
                  </span>
                </div>

                <ul className="mt-4 space-y-2.5">
                  {FREE_BENEFITS.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-start gap-2 text-[12.5px] leading-snug text-zinc-600 dark:text-zinc-300"
                    >
                      <Check
                        className="w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-700 dark:text-zinc-300"
                        strokeWidth={1.5}
                      />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                disabled
                aria-disabled="true"
                className="mt-5 w-full h-10 rounded-xl bg-zinc-100 text-zinc-700 border border-zinc-200/90 dark:bg-white/[0.08] dark:text-zinc-200 dark:border-white/15 text-[13.5px] font-medium inline-flex items-center justify-center gap-1.5 cursor-default select-none"
              >
                {!isProPlan ? (
                  <>
                    <Check className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>Paket Aktif</span>
                  </>
                ) : (
                  <span>Paket Dasar</span>
                )}
              </button>
            </div>

            {/* Kartu 2: Paket Pro */}
            <div className="min-w-0 flex flex-col justify-between rounded-2xl border border-zinc-900/20 dark:border-white/20 bg-white dark:bg-[#111113] p-4 sm:p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)] dark:shadow-none">
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-[15.5px] font-semibold text-zinc-950 dark:text-white">
                    Paket Pro
                  </h3>
                  <span className="text-[10.5px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-white/[0.08] dark:text-zinc-200 dark:border-white/10 shrink-0">
                    Harga Perkenalan
                  </span>
                </div>

                <div className="mt-3 space-y-0.5">
                  <div className="text-[12.5px] text-zinc-400 dark:text-zinc-500 line-through tabular-nums">
                    Rp 79.000
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[24px] font-semibold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                      Rp 49.000
                    </span>
                    <span className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                      / bulan
                    </span>
                  </div>
                </div>

                <ul className="mt-4 space-y-2.5">
                  {PRO_BENEFITS.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-start gap-2 text-[12.5px] leading-snug text-zinc-600 dark:text-zinc-300"
                    >
                      <Check
                        className="w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-900 dark:text-zinc-100"
                        strokeWidth={1.5}
                      />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {isProPlan ? (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="mt-5 w-full h-10 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[13.5px] font-medium inline-flex items-center justify-center gap-1.5 cursor-default select-none"
                >
                  <Check className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span>Paket Aktif</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="mt-5 w-full h-10 rounded-xl bg-zinc-100 text-zinc-500 border border-zinc-200/90 dark:bg-white/[0.06] dark:text-zinc-400 dark:border-white/10 text-[13.5px] font-medium inline-flex items-center justify-center cursor-not-allowed select-none"
                >
                  <span>Segera Hadir</span>
                </button>
              )}
            </div>
          </div>

          {/* Bagian Tambahan: Top-Up Kredit Ekstra */}
          <section className="rounded-2xl border border-zinc-200/90 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02] p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <h3 className="text-[14.5px] font-semibold text-zinc-950 dark:text-white">
                Top-Up Kredit Ekstra
              </h3>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Sekali Beli, Masa Aktif Selamanya
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TOPUP_OPTIONS.map((option) => (
                <div
                  key={option.id}
                  className="min-w-0 flex items-center justify-between gap-3 rounded-xl border border-zinc-200/90 dark:border-white/[0.08] bg-white dark:bg-[#111113] px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-zinc-950 dark:text-white tabular-nums">
                      {option.creditsLabel}
                    </div>
                    <div className="text-[12.5px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {option.priceLabel}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="shrink-0 h-8 px-3 rounded-lg bg-zinc-100 text-zinc-500 border border-zinc-200/90 dark:bg-white/[0.06] dark:text-zinc-400 dark:border-white/10 text-xs font-medium inline-flex items-center justify-center cursor-not-allowed select-none"
                  >
                    Segera Hadir
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Keterangan Integrasi Pembayaran */}
          <p className="text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 px-1">
            Pembayaran otomatis sedang dalam tahap integrasi dan akan segera hadir. Gunakan kuota gratis harian Anda sementara waktu.
          </p>
        </div>

        {/* Footer */}
        <footer className="shrink-0 border-t border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141416] px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 dark:text-zinc-400">
            <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span>Kuota gratis direset otomatis setiap pukul 00.00 WIB</span>
          </div>

          {canContinueWithOmni && (
            <button
              type="button"
              onClick={() => {
                onSwitchToOmni();
                onClose();
              }}
              className="inline-flex items-center justify-center sm:justify-end gap-1.5 text-[12.5px] font-medium text-zinc-800 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white py-1.5 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] transition-colors cursor-pointer active:scale-[0.98]"
            >
              <span>Lanjut dengan Axioma Omni (1 kredit)</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body
  );
}
