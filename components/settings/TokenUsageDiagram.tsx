"use client";

import React from "react";
import { ChevronRight, Clock } from "lucide-react";
import { formatTokenNumber, formatUsagePercentLabel } from "@/constants/appInfo";

export interface TokenUsageDiagramProps {
  plan: "free" | "pro";
  dailyLimit: number;
  usedTokens: number;
  remainingTokens: number;
  bonusTokens: number;
  usagePercent: number;
  promptTokensUsed: number;
  completionTokensUsed: number;
  resetLabel: string;
  tariffNote?: string;
  compact?: boolean;
  onOpenSubscriptionModal?: () => void;
}

export function TokenUsageDiagram({
  plan,
  dailyLimit,
  usedTokens,
  remainingTokens,
  bonusTokens,
  usagePercent,
  promptTokensUsed,
  completionTokensUsed,
  resetLabel,
  tariffNote,
  compact = false,
  onOpenSubscriptionModal,
}: TokenUsageDiagramProps) {
  const isProPlan = plan === "pro";
  const clampedPercent = Number.isFinite(usagePercent)
    ? Math.min(100, Math.max(0, usagePercent))
    : 0;
  const percentDisplay = formatUsagePercentLabel(clampedPercent);

  // Pure SVG ring geometry (viewBox 120x120, radius 48, stroke 10)
  const radius = 48;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clampedPercent / 100);

  // Dynamic stroke & status tone by usage percentage:
  // < 70%: calm indigo accent · 70%-89%: amber warning · >= 90%: soft red critical
  const ringAccentClass =
    clampedPercent >= 90
      ? "text-red-500 dark:text-red-400"
      : clampedPercent >= 70
        ? "text-amber-500 dark:text-amber-400"
        : "text-indigo-500 dark:text-indigo-400";

  const statusPillClass =
    clampedPercent >= 90
      ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      : clampedPercent >= 70
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
        : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20";

  const statusText =
    clampedPercent >= 100
      ? "Kuota harian terpakai penuh"
      : clampedPercent >= 90
        ? "Hampir mencapai batas harian"
        : clampedPercent >= 70
          ? "Mendekati batas harian"
          : "Kapasitas harian aman";

  // Prompt (Input) vs AI Output (Completion) mini stacked bar split
  const safePrompt = Math.max(0, Math.round(promptTokensUsed));
  const safeCompletion = Math.max(0, Math.round(completionTokensUsed));
  const splitTotal = safePrompt + safeCompletion;
  const promptSharePct =
    splitTotal > 0 ? Math.round((safePrompt / splitTotal) * 100) : 0;
  const completionSharePct =
    splitTotal > 0 ? Math.max(0, 100 - promptSharePct) : 0;

  return (
    <div
      className={`w-full font-sans ${
        compact
          ? "space-y-4 md:rounded-xl md:border md:border-zinc-200/85 md:dark:border-white/[0.08] md:bg-white md:dark:bg-[#141416] md:p-4"
          : "rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 sm:p-6 space-y-5"
      }`}
    >
      {/* Header: Status Paket & Indikator */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Status Paket
          </div>
          <div className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {isProPlan ? "Axioma Pro" : "Paket Free"}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${statusPillClass}`}
          >
            {statusText}
          </span>
          {isProPlan ? (
            <span className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10.5px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full">
              PRO
            </span>
          ) : (
            <span className="border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10.5px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full">
              FREE
            </span>
          )}
        </div>
      </div>

      {/* Main Visualization: Pure SVG Donut Chart + Key Token Stats */}
      <div
        className={`flex flex-col ${
          compact ? "items-center gap-4" : "sm:flex-row sm:items-center gap-5 sm:gap-6"
        }`}
      >
        {/* Pure SVG Radial Ring / Donut */}
        <div
          role="img"
          aria-label={`Pemakaian kuota token harian ${percentDisplay} terpakai, ${formatTokenNumber(
            usedTokens
          )} dari ${formatTokenNumber(dailyLimit)} token`}
          className={`relative shrink-0 flex items-center justify-center ${
            compact ? "w-[124px] h-[124px]" : "w-[136px] h-[136px] self-center sm:self-auto"
          }`}
        >
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full -rotate-90 overflow-visible"
            aria-hidden="true"
          >
            {/* Background Track */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-zinc-200/85 dark:text-white/[0.08]"
            />
            {/* Dynamic Progress Arc */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap={clampedPercent > 0 ? "round" : "butt"}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={`${ringAccentClass} transition-[stroke-dashoffset,color] duration-500 ease-out`}
            />
          </svg>
          {/* Center Percentage Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 select-none">
            <span
              className={`${
                compact ? "text-[22px]" : "text-[26px]"
              } font-bold leading-none tracking-tight text-zinc-950 dark:text-white tabular-nums`}
            >
              {percentDisplay}
            </span>
            <span className="mt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Terpakai
            </span>
          </div>
        </div>

        {/* Numeric Token Breakdown */}
        <div className="w-full flex-1 min-w-0 divide-y divide-zinc-200/70 dark:divide-white/[0.06] rounded-xl border border-zinc-200/80 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-white/[0.025] px-3.5">
          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Token Terpakai
            </span>
            <span className="text-[13.5px] font-semibold text-zinc-950 dark:text-white tabular-nums text-right">
              {formatTokenNumber(usedTokens)} token
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Token Tersisa
            </span>
            <span className="text-[13.5px] font-semibold text-zinc-950 dark:text-white tabular-nums text-right">
              {formatTokenNumber(remainingTokens)} token
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Total Kuota Harian
            </span>
            <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 tabular-nums text-right">
              {formatTokenNumber(dailyLimit)} token / hari
            </span>
          </div>
        </div>
      </div>

      {/* Token Bonus Row (hanya tampil jika bonusTokens > 0) */}
      {bonusTokens > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] dark:bg-indigo-400/[0.08] px-3.5 py-2.5">
          <div className="min-w-0">
            <div className="text-xs sm:text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
              Token Bonus
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Saldo permanen, tidak ter-reset saat pergantian hari
            </div>
          </div>
          <span className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-300 tabular-nums shrink-0">
            +{formatTokenNumber(bonusTokens)} token
          </span>
        </div>
      )}

      {/* Mini Stacked Bar: Komposisi Pemakaian (Prompt Input vs Jawaban AI Output) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Proporsi Pemakaian Hari Ini
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            {splitTotal > 0 ? `${formatTokenNumber(splitTotal)} token tercatat` : "Belum ada pemakaian"}
          </span>
        </div>

        {/* Slender Horizontal Stacked Bar */}
        <div
          role="img"
          aria-label={`Proporsi pemakaian: Prompt ${promptSharePct}% (${formatTokenNumber(
            safePrompt
          )} token), Jawaban AI ${completionSharePct}% (${formatTokenNumber(
            safeCompletion
          )} token)`}
          className="w-full h-2 rounded-full bg-zinc-200/90 dark:bg-white/[0.08] overflow-hidden flex"
        >
          {splitTotal > 0 && promptSharePct > 0 && (
            <div
              style={{ width: `${promptSharePct}%` }}
              className="h-full bg-indigo-500 dark:bg-indigo-400 transition-[width] duration-300 ease-out"
            />
          )}
          {splitTotal > 0 && completionSharePct > 0 && (
            <div
              style={{ width: `${completionSharePct}%` }}
              className="h-full bg-emerald-500 dark:bg-emerald-400 transition-[width] duration-300 ease-out"
            />
          )}
        </div>

        {/* Legend Prompt vs Jawaban AI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3 pt-0.5">
          <div className="flex items-center justify-between sm:justify-start gap-2 text-[11.5px] text-zinc-600 dark:text-zinc-300">
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
              <span className="truncate">Prompt (Input)</span>
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums shrink-0">
              {formatTokenNumber(safePrompt)} ({promptSharePct}%)
            </span>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 text-[11.5px] text-zinc-600 dark:text-zinc-300">
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
              <span className="truncate">Jawaban AI (Output)</span>
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums shrink-0">
              {formatTokenNumber(safeCompletion)} ({completionSharePct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Info Reset Otomatis & Bobot Model */}
      <div className="space-y-1.5 pt-3 border-t border-zinc-200/70 dark:border-white/[0.06] text-[11.5px] text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5 leading-relaxed">
          <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          <span>Reset otomatis setiap hari {resetLabel}.</span>
        </div>
        {tariffNote && (
          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 tabular-nums pl-5">
            {tariffNote}
          </p>
        )}
      </div>

      {/* Aksi Lanjutan */}
      {onOpenSubscriptionModal && (
        <div
          className={
            compact
              ? "pt-0.5"
              : "pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          }
        >
          {!compact && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {isProPlan
                ? "Lihat detail seluruh paket dan kapasitas token Axioma."
                : "Butuh kapasitas token lebih besar? Lihat paket Pro & Top-Up."}
            </span>
          )}
          <button
            type="button"
            onClick={onOpenSubscriptionModal}
            className={`${
              compact ? "w-full" : "shrink-0 px-4"
            } h-9 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs sm:text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] cursor-pointer`}
          >
            <span>
              {isProPlan ? "Lihat Rincian Paket" : "Upgrade ke Pro — Segera Hadir"}
            </span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
}
