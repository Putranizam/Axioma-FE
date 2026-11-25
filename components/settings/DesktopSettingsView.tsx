"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Check, ChevronRight, Clock, Lock, Plus, X } from "lucide-react";
import type {
  DesktopSettingsPageId,
  SettingsAgentId,
  SettingsAgentOption,
  ThemeModeOption,
} from "./types";

const AboutSettingsView = dynamic(
  () => import("../AboutAxiomaModal").then((mod) => mod.AboutSettingsView),
  { ssr: false }
);

const FeedbackSettingsView = dynamic(
  () => import("../AboutAxiomaModal").then((mod) => mod.FeedbackSettingsView),
  { ssr: false }
);

export interface DesktopSettingsViewProps {
  page: DesktopSettingsPageId;
  onClose: () => void;
  backendUrl: string;
  buildAuthHeaders: () => Promise<Record<string, string>>;
  isAuthenticated: boolean;
  authUserEmail?: string | null;
  userName: string;
  // Account
  settingsNameInput: string;
  settingsNameError: string | null;
  onChangeSettingsNameInput: (value: string) => void;
  onClearSettingsNameError: () => void;
  onUpdateDisplayName: (
    rawName: string,
    options?: { silentIfUnchanged?: boolean }
  ) => Promise<void> | void;
  userProfile: string;
  onUpdateUserProfile: (value: string) => void;
  requirementLockItems: string[];
  isRequirementLockEnabled: boolean;
  settingsReqDraft: string;
  onChangeSettingsReqDraft: (value: string) => void;
  onToggleRequirementLock: (enabled: boolean) => void;
  onAddRequirementLockItem: () => void;
  onUpdateRequirementLockItems: (items: string[]) => void;
  // Quota
  isQuotaInitialLoading: boolean;
  hasLoadedQuota: boolean;
  isProPlan: boolean;
  quotaExpiresAt?: string;
  remainingCreditsCount: number;
  dailyCreditsRemaining: number;
  dailyCreditLimit: number;
  dailyCreditsPercent: number;
  bonusCreditsCount: number;
  quotaTariffCompact: string;
  quotaResetLabel: string;
  guestFreeDailyLimit: number;
  guestMessageCount: number;
  guestMaxMessages: number;
  onRefreshQuota: () => void;
  onOpenSubscriptionModal: () => void;
  onOpenAuthModal: () => void;
  onSignOut: () => Promise<void>;
  // Preferences
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  availableAgents: readonly SettingsAgentOption[];
  defaultAgentId: SettingsAgentId;
  onSelectDefaultAgent: (agentId: string) => void;
  onRequestClearAllChats: () => void;
  isMacOs: boolean;
  themeMode: ThemeModeOption;
  onSetTheme: (mode: ThemeModeOption) => void;
}

export function DesktopSettingsView({
  page,
  onClose,
  backendUrl,
  buildAuthHeaders,
  isAuthenticated,
  authUserEmail,
  userName,
  settingsNameInput,
  settingsNameError,
  onChangeSettingsNameInput,
  onClearSettingsNameError,
  onUpdateDisplayName,
  userProfile,
  onUpdateUserProfile,
  requirementLockItems,
  isRequirementLockEnabled,
  settingsReqDraft,
  onChangeSettingsReqDraft,
  onToggleRequirementLock,
  onAddRequirementLockItem,
  onUpdateRequirementLockItems,
  isQuotaInitialLoading,
  hasLoadedQuota,
  isProPlan,
  quotaExpiresAt,
  remainingCreditsCount,
  dailyCreditsRemaining,
  dailyCreditLimit,
  dailyCreditsPercent,
  bonusCreditsCount,
  quotaTariffCompact,
  quotaResetLabel,
  guestFreeDailyLimit,
  guestMessageCount,
  guestMaxMessages,
  onRefreshQuota,
  onOpenSubscriptionModal,
  onOpenAuthModal,
  onSignOut,
  notificationsEnabled,
  onToggleNotifications,
  availableAgents,
  defaultAgentId,
  onSelectDefaultAgent,
  onRequestClearAllChats,
  isMacOs,
  themeMode,
  onSetTheme,
}: DesktopSettingsViewProps) {
  return (
    <div className="hidden md:flex flex-1 min-h-0 w-full overflow-y-auto scrollbar-none bg-[#f9f9f8] dark:bg-[#0e0e10] animate-axioma-fade-up">
      <div className="w-full max-w-[680px] mx-auto px-6 py-8">
        {/* Editorial Flat Header */}
        <div className="border-b border-zinc-200/70 dark:border-white/[0.07] pb-4 mb-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 mb-4 cursor-pointer transition-[color,transform] duration-150 active:scale-[0.96]"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Kembali</span>
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {page === "account"
              ? "Kelola Akun"
              : page === "quota"
                ? "Batas penggunaan"
                : page === "notifications"
                  ? "Notifikasi"
                  : page === "agent"
                    ? "Model Default"
                    : page === "storage"
                      ? "Penyimpanan Riwayat"
                      : page === "shortcuts"
                        ? "Pintasan Keyboard"
                        : page === "theme"
                          ? "Tema"
                          : page === "feedback"
                            ? "Kirim Masukan"
                            : "Tentang Axioma"}
          </h1>
        </div>

        {/* Sub-Menu Body (Flat & Editorial) */}
        {page === "account" && (
          <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
            <div className="py-4 space-y-3">
              <label
                htmlFor="desktop-settings-display-name"
                className="block text-[15px] font-medium text-zinc-900 dark:text-zinc-100"
              >
                Nama Tampilan
              </label>
              <div className="flex gap-2.5">
                <input
                  id="desktop-settings-display-name"
                  type="text"
                  maxLength={60}
                  value={settingsNameInput}
                  aria-invalid={Boolean(settingsNameError)}
                  onChange={(e) => {
                    onChangeSettingsNameInput(e.target.value);
                    if (settingsNameError) onClearSettingsNameError();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void onUpdateDisplayName(settingsNameInput);
                    }
                  }}
                  onBlur={() =>
                    void onUpdateDisplayName(settingsNameInput, {
                      silentIfUnchanged: true,
                    })
                  }
                  placeholder="Masukkan nama tampilan..."
                  className="flex-1 min-w-0 bg-white dark:bg-[#161618] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/25 rounded-xl px-3.5 py-2 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => void onUpdateDisplayName(settingsNameInput)}
                  className="shrink-0 rounded-xl px-4 py-2 text-[13.5px] font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors cursor-pointer active:scale-[0.96]"
                >
                  Simpan
                </button>
              </div>
              {settingsNameError && (
                <p role="alert" className="text-[13px] text-red-500 dark:text-red-400">
                  {settingsNameError}
                </p>
              )}
            </div>

            {/* Stage 6: Tentang Saya (Profil Singkat) */}
            <div className="py-4 space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="desktop-settings-user-profile"
                  className="block text-[15px] font-medium text-zinc-900 dark:text-zinc-100"
                >
                  Tentang Saya (Profil Singkat)
                </label>
                <span className="text-xs text-zinc-400">{userProfile.length}/500</span>
              </div>
              <textarea
                id="desktop-settings-user-profile"
                rows={3}
                maxLength={500}
                value={userProfile}
                onChange={(e) => onUpdateUserProfile(e.target.value)}
                placeholder="Contoh: Mahasiswa TI, suka penjelasan to-the-point pakai analogi sederhana..."
                className="w-full bg-white dark:bg-[#161618] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/25 rounded-xl px-3.5 py-2.5 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none resize-none transition-colors"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Membantu Axioma menyesuaikan gaya &amp; konteks jawaban. Tersimpan lokal dan bisa
                diatur lewat Kontrol Konteks.
              </p>
            </div>

            {/* Stage 10A: Kunci Syarat Proyek (Requirement Lock) */}
            <div className="py-4 space-y-2.5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" strokeWidth={1.5} />
                  <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                    Kunci Syarat Proyek ({requirementLockItems.length}/5)
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isRequirementLockEnabled}
                  aria-label="Aktifkan kunci syarat proyek"
                  onClick={() => onToggleRequirementLock(!isRequirementLockEnabled)}
                  className="cursor-pointer"
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex items-center w-9 h-5 rounded-full p-0.5 transition-colors ${
                      isRequirementLockEnabled
                        ? "bg-zinc-950 dark:bg-white justify-end"
                        : "bg-zinc-300 dark:bg-zinc-700 justify-start"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full ${
                        isRequirementLockEnabled
                          ? "bg-white dark:bg-zinc-950"
                          : "bg-white dark:bg-zinc-300"
                      }`}
                    />
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={200}
                  value={settingsReqDraft}
                  disabled={requirementLockItems.length >= 5}
                  onChange={(e) => onChangeSettingsReqDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddRequirementLockItem();
                    }
                  }}
                  placeholder={
                    requirementLockItems.length >= 5
                      ? "Maksimal 5 syarat terkunci"
                      : "Contoh: Gunakan Bahasa Indonesia formal & sertakan contoh konkret..."
                  }
                  className="flex-1 min-w-0 bg-white dark:bg-[#161618] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/25 rounded-xl px-3.5 py-2 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-colors disabled:opacity-45"
                />
                <button
                  type="button"
                  disabled={!settingsReqDraft.trim() || requirementLockItems.length >= 5}
                  onClick={onAddRequirementLockItem}
                  aria-label="Tambah syarat proyek"
                  className="shrink-0 inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-[13.5px] font-medium bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.75} />
                  <span>Tambah</span>
                </button>
              </div>

              {requirementLockItems.length > 0 && (
                <ul className="space-y-1.5">
                  {requirementLockItems.map((rule, idx) => (
                    <li
                      key={`${rule}-${idx}`}
                      className="flex items-start justify-between gap-2 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] px-3 py-2 text-[13px] text-zinc-800 dark:text-zinc-200"
                    >
                      <span className="leading-snug break-words min-w-0 flex-1">
                        {idx + 1}. {rule}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateRequirementLockItems(
                            requirementLockItems.filter((_, i) => i !== idx)
                          )
                        }
                        aria-label="Hapus syarat"
                        className="p-0.5 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Batasan &amp; aturan wajib proyek yang selalu dipatuhi Axioma di setiap percakapan
                saat aktif.
              </p>
            </div>

            {/* Paket Langganan (tepat di atas Status Akun) */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                    Paket Langganan
                  </span>
                  {isProPlan && (
                    <span className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10.5px] font-semibold tracking-wide px-2 py-0.5 rounded-full">
                      Axioma Pro · Aktif
                    </span>
                  )}
                </div>
                <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {isQuotaInitialLoading ? (
                    "Memuat sisa kuota kredit harian..."
                  ) : !hasLoadedQuota ? (
                    "Gagal memuat status kuota kredit."
                  ) : isProPlan ? (
                    <>
                      Akses penuh tanpa batas kredit harian untuk seluruh model &amp; fitur kreatif.
                      {quotaExpiresAt
                        ? ` Berlaku hingga ${new Intl.DateTimeFormat("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(quotaExpiresAt))}.`
                        : ""}
                    </>
                  ) : (
                    <>
                      Paket Gratis (Free) · {remainingCreditsCount} kredit tersisa · Reset{" "}
                      {quotaResetLabel}
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenSubscriptionModal}
                className={`shrink-0 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors cursor-pointer active:scale-[0.98] ${
                  isProPlan
                    ? "border border-zinc-300 dark:border-white/15 bg-transparent hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-800 dark:text-zinc-200"
                    : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                }`}
              >
                {isProPlan ? "Kelola Paket" : "Upgrade ke Pro — Segera Hadir"}
              </button>
            </div>

            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                  Status Akun
                </div>
                <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isAuthenticated ? authUserEmail : "Mode Tamu (Lokal di perangkat ini)"}
                </div>
              </div>
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-white/10 text-[13px] font-medium transition-colors cursor-pointer"
                >
                  Hubungkan Akun
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    void onSignOut();
                  }}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  Keluar dari Akun
                </button>
              )}
            </div>
          </div>
        )}

        {page === "quota" && (
          <div className="py-4 font-sans space-y-4">
            {isAuthenticated ? (
              isQuotaInitialLoading ? (
                <div
                  role="status"
                  aria-label="Memuat kuota kredit"
                  className="rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 sm:p-6 space-y-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Status Paket
                      </div>
                      <div className="h-4 w-24 rounded bg-zinc-200/80 dark:bg-white/[0.08] animate-pulse" />
                    </div>
                    <span className="h-6 w-14 rounded-full bg-zinc-200/80 dark:bg-white/[0.08] animate-pulse shrink-0" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-7 w-64 rounded-lg bg-zinc-200/80 dark:bg-white/[0.08] animate-pulse" />
                    <div className="h-4 w-48 rounded bg-zinc-200/65 dark:bg-white/[0.06] animate-pulse" />
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-zinc-200/80 dark:bg-white/[0.08] animate-pulse" />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Memuat sisa kuota kredit harian...
                  </p>
                </div>
              ) : !hasLoadedQuota ? (
                <div className="rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 sm:p-6 space-y-4">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Gagal memuat data kuota kredit
                  </div>
                  <p className="text-[13.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Tidak dapat mengambil status kuota terbaru dari server. Silakan coba lagi.
                  </p>
                  <button
                    type="button"
                    onClick={onRefreshQuota}
                    className="h-9 px-4 rounded-xl border border-zinc-300 dark:border-white/15 text-[13px] font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    Muat Ulang Kuota
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 sm:p-6 space-y-5">
                  {/* Status Paket */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Status Paket
                      </div>
                      <div className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {isProPlan ? "Axioma Pro" : "Paket Free"}
                      </div>
                    </div>
                    {isProPlan ? (
                      <span className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full shrink-0">
                        PRO
                      </span>
                    ) : (
                      <span className="border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full shrink-0">
                        FREE
                      </span>
                    )}
                  </div>

                  {/* Sisa Kredit Utama */}
                  <div className="space-y-1">
                    <div className="text-2xl sm:text-[26px] font-semibold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                      {isProPlan
                        ? "Tanpa batas harian"
                        : `${dailyCreditsRemaining} / ${dailyCreditLimit} kredit tersisa hari ini`}
                    </div>
                    <p className="text-[13.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed tabular-nums">
                      {isProPlan
                        ? "Langganan Axioma Pro aktif dengan akses penuh untuk seluruh model."
                        : `Sisa kredit hari ini: ${dailyCreditsRemaining} dari ${dailyCreditLimit} kredit`}
                    </p>
                  </div>

                  {/* Progress Bar Visual */}
                  <div className="space-y-2">
                    <div className="w-full h-2.5 rounded-full bg-zinc-200/90 dark:bg-white/[0.08] overflow-hidden">
                      <div
                        style={{ width: `${dailyCreditsPercent}%` }}
                        className={`h-full rounded-full transition-[width] duration-300 ${
                          !isProPlan && dailyCreditsPercent <= 20
                            ? "bg-red-500/85 dark:bg-red-400/85"
                            : !isProPlan && dailyCreditsPercent <= 40
                              ? "bg-amber-500/85 dark:bg-amber-400/85"
                              : "bg-zinc-900 dark:bg-zinc-100"
                        }`}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                      <span>{dailyCreditsPercent}% kuota harian tersisa</span>
                      <span>Tarif: {quotaTariffCompact} kredit</span>
                    </div>
                  </div>

                  {/* Kredit Tambahan / Bonus (hanya bila > 0) */}
                  {bonusCreditsCount > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-medium text-zinc-900 dark:text-zinc-100">
                          Kredit Tambahan / Bonus
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Saldo permanen, tidak ter-reset saat pergantian hari
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-zinc-950 dark:text-white tabular-nums shrink-0">
                        +{bonusCreditsCount} kredit
                      </span>
                    </div>
                  )}

                  {/* Info Reset Harian */}
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 pt-3 border-t border-zinc-200/70 dark:border-white/[0.06]">
                    <Clock className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>Kuota harian direset otomatis setiap hari {quotaResetLabel}.</span>
                  </div>

                  {/* Aksi Lanjutan */}
                  <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {isProPlan
                        ? "Lihat detail seluruh paket dan kapasitas Axioma."
                        : "Butuh kapasitas lebih besar? Lihat paket Pro & Top-Up."}
                    </span>
                    <button
                      type="button"
                      onClick={onOpenSubscriptionModal}
                      className="h-9 px-4 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] cursor-pointer shrink-0"
                    >
                      <span>
                        {isProPlan ? "Lihat Rincian Paket" : "Upgrade ke Pro — Segera Hadir"}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Status Paket
                  </span>
                  <span className="border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full">
                    MODE TAMU
                  </span>
                </div>
                <div className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                  {Math.max(0, guestMaxMessages - guestMessageCount)} / {guestMaxMessages} pesan
                  tersisa
                </div>
                <div className="w-full h-2.5 rounded-full bg-zinc-200/90 dark:bg-white/[0.08] overflow-hidden">
                  <div
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          Math.round(
                            ((guestMaxMessages - guestMessageCount) / guestMaxMessages) * 100
                          )
                        )
                      )}%`,
                    }}
                    className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-[width] duration-300"
                  />
                </div>
                <p className="text-[13.5px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  Mode Tamu dibatasi maksimal {guestMaxMessages} pesan gratis. Masuk ke akun Anda
                  untuk mendapatkan {guestFreeDailyLimit} kredit harian yang direset otomatis{" "}
                  {quotaResetLabel}.
                </p>
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="h-9 px-4 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[13px] font-medium transition-colors cursor-pointer"
                >
                  Hubungkan Akun
                </button>
              </div>
            )}
          </div>
        )}

        {page === "notifications" && (
          <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                  Notifikasi Toast
                </div>
                <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Umpan balik singkat seperti penyalinan teks, penggantian model, dan status aksi
                  non-kritis di ruang kerja.
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300">
                  {notificationsEnabled ? "Aktif" : "Nonaktif"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationsEnabled}
                  aria-label="Aktifkan Notifikasi Toast"
                  onClick={onToggleNotifications}
                  className="cursor-pointer"
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex items-center w-10 h-6 rounded-full p-0.5 transition-colors ${
                      notificationsEnabled
                        ? "bg-zinc-950 dark:bg-white justify-end"
                        : "bg-zinc-300 dark:bg-zinc-700 justify-start"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full transition-transform ${
                        notificationsEnabled
                          ? "bg-white dark:bg-zinc-950"
                          : "bg-white dark:bg-zinc-300"
                      }`}
                    />
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {page === "agent" && (
          <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
            {availableAgents.map((agent) => {
              const isChecked = defaultAgentId === agent.id;
              return (
                <label
                  key={agent.id}
                  className="py-4 flex items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <input
                      type="radio"
                      name="desktopDefaultAgent"
                      value={agent.id}
                      checked={isChecked}
                      onChange={() => onSelectDefaultAgent(agent.id)}
                      className="w-4 h-4 accent-zinc-900 dark:accent-white cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                        {agent.name}
                      </div>
                      <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {agent.description}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium shrink-0">
                    {agent.tag}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {page === "storage" && (
          <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                  Mode Penyimpanan Saat Ini
                </div>
                <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isAuthenticated
                    ? "Riwayat percakapan disinkronkan secara aman ke cloud dan cache lokal."
                    : "Riwayat percakapan hanya disimpan di penyimpanan lokal peramban ini."}
                </div>
              </div>
              <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 shrink-0">
                {isAuthenticated ? "Cloud & Lokal" : "Hanya Lokal"}
              </span>
            </div>

            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-[15px] font-medium text-red-600 dark:text-red-400">
                  Hapus semua percakapan
                </div>
                <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Menghapus seluruh riwayat chat dari perangkat
                  {isAuthenticated ? " dan akun Anda" : ""}.
                </div>
              </div>
              <button
                type="button"
                onClick={onRequestClearAllChats}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/25 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        )}

        {page === "shortcuts" && (
          <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
            {[
              { label: "Cari percakapan", keys: isMacOs ? "⌘ K" : "Ctrl+K" },
              { label: "Percakapan baru", keys: isMacOs ? "⌘ ⇧ O" : "Ctrl+Shift+O" },
              { label: "Hentikan balasan", keys: "Esc" },
              { label: "Kirim pesan", keys: "Enter" },
              { label: "Baris baru", keys: "Shift + Enter" },
            ].map((item) => (
              <div key={item.label} className="py-4 flex items-center justify-between">
                <span className="text-[15px] font-medium text-zinc-800 dark:text-zinc-200">
                  {item.label}
                </span>
                <kbd className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#161618] border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {item.keys}
                </kbd>
              </div>
            ))}
          </div>
        )}

        {page === "theme" && (
          <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
            {(
              [
                {
                  value: "system",
                  label: "Default sistem",
                  desc: "Mengikuti pengaturan tampilan perangkat Anda secara otomatis.",
                },
                {
                  value: "dark",
                  label: "Gelap",
                  desc: "Tampilan gelap tenang untuk fokus di kondisi cahaya redup.",
                },
                {
                  value: "light",
                  label: "Terang",
                  desc: "Kanvas terang hangat dengan kontras editorial yang tajam.",
                },
              ] as const
            ).map((opt) => {
              const isActive = themeMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSetTheme(opt.value)}
                  className="w-full py-4 flex items-center justify-between gap-4 text-left cursor-pointer group"
                >
                  <div>
                    <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                      {opt.label}
                    </div>
                    <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {opt.desc}
                    </div>
                  </div>
                  {isActive && (
                    <Check
                      className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0"
                      strokeWidth={1.75}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {page === "feedback" && (
          <FeedbackSettingsView
            inline
            backendUrl={backendUrl}
            getAuthHeaders={buildAuthHeaders}
            defaultEmail={authUserEmail || ""}
            userName={userName}
            onBack={onClose}
            onClose={onClose}
          />
        )}

        {page === "about" && (
          <AboutSettingsView
            inline
            backendUrl={backendUrl}
            onBack={onClose}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
