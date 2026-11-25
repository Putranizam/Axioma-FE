"use client";

import React from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import {
  Bell,
  ChevronRight,
  Clock,
  Cpu,
  CreditCard,
  Database,
  Info,
  Keyboard,
  Lock,
  MessageSquarePlus,
  Moon,
  Plus,
  Trash,
  User,
  X,
} from "lucide-react";
import { AXIOMA_APP_VERSION } from "@/constants/appInfo";
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

export interface SettingsModalProps {
  isEntered: boolean;
  settingsView: "main" | "feedback" | "about";
  settingsPopoverStyle?: React.CSSProperties;
  expandedSettingsSection: string | null;
  onChangeExpandedSection: React.Dispatch<React.SetStateAction<string | null>>;
  onChangeSettingsView: (view: "main" | "feedback" | "about") => void;
  onClose: () => void;
  onOpenDesktopSettingsPage: (page: DesktopSettingsPageId) => void;
  backendUrl: string;
  buildAuthHeaders: () => Promise<Record<string, string>>;
  authUserEmail?: string | null;
  isAuthenticated: boolean;
  userName: string;
  // Account / display name
  settingsNameInputRef: React.RefObject<HTMLInputElement | null>;
  settingsNameInput: string;
  settingsNameError: string | null;
  onChangeSettingsNameInput: (value: string) => void;
  onClearSettingsNameError: () => void;
  onUpdateDisplayName: (
    rawName: string,
    options?: { silentIfUnchanged?: boolean }
  ) => Promise<void> | void;
  // User profile & requirement lock
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
  // Preferences
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  availableAgents: readonly SettingsAgentOption[];
  defaultAgentId: SettingsAgentId;
  onSelectDefaultAgent: (agentId: string) => void;
  isMacOs: boolean;
  themeMode: ThemeModeOption;
  onSetTheme: (mode: ThemeModeOption) => void;
  onRequestClearAllChats: () => void;
}

export function SettingsModal({
  isEntered,
  settingsView,
  settingsPopoverStyle,
  expandedSettingsSection,
  onChangeExpandedSection,
  onChangeSettingsView,
  onClose,
  onOpenDesktopSettingsPage,
  backendUrl,
  buildAuthHeaders,
  authUserEmail,
  isAuthenticated,
  userName,
  settingsNameInputRef,
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
  notificationsEnabled,
  onToggleNotifications,
  availableAgents,
  defaultAgentId,
  onSelectDefaultAgent,
  isMacOs,
  themeMode,
  onSetTheme,
  onRequestClearAllChats,
}: SettingsModalProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className={`fixed inset-0 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 p-0 z-50 flex items-stretch justify-center overflow-hidden font-sans ${
        isEntered
          ? "max-md:bg-[#f9f9f8] max-md:dark:bg-[#0e0e10] pointer-events-auto"
          : "max-md:bg-transparent pointer-events-none"
      }`}
    >
      {/* Sibling backdrop (Desktop only: ZERO dark backdrop on mobile so Safari iOS never samples black at top/bottom safe areas) */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`hidden md:block absolute inset-0 transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          settingsView === "main" ? "md:bg-transparent" : "md:bg-black/60"
        } ${isEntered ? "opacity-100" : "opacity-0"}`}
      />
      <div
        style={settingsView === "main" ? settingsPopoverStyle : undefined}
        className={`fixed z-50 flex flex-col overflow-hidden ${
          settingsView === "main"
            ? `inset-0 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 rounded-none border-0 max-md:bg-[#f9f9f8] max-md:dark:bg-[#0e0e10] md-ios-glass md:inset-auto md:bottom-16 md:left-4 md:w-[290px] md:h-auto md:max-h-[80dvh] md:overflow-y-auto md:rounded-2xl md:p-2 md:origin-bottom-left transition-opacity duration-200 md:transition-[transform,opacity] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isEntered
                  ? "opacity-100 md:scale-100"
                  : "max-md:translate-y-4 opacity-0 md:scale-95 pointer-events-none"
              }`
            : `inset-0 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 rounded-none border-0 bg-[#f9f9f8] md:bg-white dark:bg-[#0e0e10] dark:md:bg-[#161618] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:w-[calc(100vw-3rem)] md:max-w-[540px] md:h-auto md:max-h-[80dvh] md:overflow-y-auto md:rounded-2xl md:border md:border-zinc-200/80 dark:md:border-white/[0.08] md:shadow-2xl transition-opacity duration-200 md:transition-[transform,opacity] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isEntered
                  ? "md:-translate-y-1/2 opacity-100 md:scale-100"
                  : "max-md:translate-y-4 md:-translate-y-[calc(50%-16px)] opacity-0 md:scale-95 pointer-events-none"
              }`
        }`}
      >
        {settingsView === "about" ? (
          <AboutSettingsView
            backendUrl={backendUrl}
            onBack={() => onChangeSettingsView("main")}
            onClose={onClose}
          />
        ) : settingsView === "feedback" ? (
          <FeedbackSettingsView
            backendUrl={backendUrl}
            getAuthHeaders={buildAuthHeaders}
            defaultEmail={authUserEmail || ""}
            userName={userName}
            onBack={() => onChangeSettingsView("main")}
            onClose={onClose}
          />
        ) : (
          <>
            {/* Sticky Top Navigation Bar (Mobile only; hidden on Desktop Popover) */}
            <div className="md:hidden sticky top-0 z-30 shrink-0 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3 px-4 bg-[#f9f9f8] dark:bg-[#0e0e10] border-b border-zinc-200/80 dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1
                  id="settings-modal-title"
                  className="font-heading text-[18px] font-semibold tracking-[-0.015em] text-zinc-900 dark:text-zinc-100"
                >
                  Setelan
                </h1>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400">
                  Beta
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup setelan"
                className="w-9 h-9 rounded-full bg-zinc-200/80 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:hover:text-white active:scale-[0.96] transition-[color,background-color,transform] duration-200 ease-out flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body Area (Full-bleed edge-to-edge on Mobile < md, Popover list on Desktop >= md) */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-auto [-webkit-overflow-scrolling:touch] px-0 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-5 md:p-0 md:space-y-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
              {/* Grup 1: Akun */}
              <div className="w-full">
                <div className="w-full text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400 px-4 pt-2 pb-1.5 md:font-medium md:normal-case md:tracking-normal md:px-3 md:pt-2 md:pb-1">
                  Akun
                </div>
                <div className="w-full h-auto bg-white/80 dark:bg-transparent border-y border-zinc-200/70 dark:border-white/[0.06] rounded-none divide-y divide-zinc-200/70 dark:divide-white/[0.06] md:bg-transparent md:dark:bg-transparent md:border-0 md:rounded-none md:divide-y-0 md:space-y-0.5">
                  {/* Kelola Akun */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.innerWidth >= 768) {
                        onOpenDesktopSettingsPage("account");
                      } else {
                        onChangeExpandedSection((prev) => (prev === "account" ? null : "account"));
                      }
                    }}
                    className="w-full flex items-center justify-between px-4 py-4 min-h-[54px] text-left transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.04] rounded-none cursor-pointer md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:duration-150"
                  >
                    <div className="flex items-center min-w-0">
                      <User
                        className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">
                        Kelola Akun
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 shrink-0 transition-transform ${
                        expandedSettingsSection === "account" ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {/* Expandable Kelola Akun drawer */}
                  {expandedSettingsSection === "account" && (
                    <div className="w-full px-4 py-4 bg-zinc-100/60 dark:bg-white/[0.025] md:px-3 md:py-2.5 md:rounded-xl md:my-1 md:bg-zinc-100/70 md:dark:bg-white/[0.04] space-y-3">
                      <div>
                        <label
                          htmlFor="settings-display-name"
                          className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1.5"
                        >
                          Nama Tampilan
                        </label>
                        <div className="flex gap-2">
                          <input
                            ref={settingsNameInputRef}
                            id="settings-display-name"
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
                            onBlur={() => {
                              void onUpdateDisplayName(settingsNameInput, {
                                silentIfUnchanged: true,
                              });
                            }}
                            placeholder="Masukkan nama tampilan..."
                            className="flex-1 min-w-0 bg-white dark:bg-[#141416] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/20 rounded-xl px-3.5 py-2.5 md:px-2.5 md:py-1.5 text-base md:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => void onUpdateDisplayName(settingsNameInput)}
                            className="shrink-0 rounded-xl px-4 py-2.5 md:px-3 md:py-1.5 text-[14px] md:text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors cursor-pointer active:scale-95"
                          >
                            Simpan
                          </button>
                        </div>
                        {settingsNameError && (
                          <p role="alert" className="text-[11px] text-red-500 dark:text-red-400 mt-1">
                            {settingsNameError}
                          </p>
                        )}
                      </div>
                      {isAuthenticated && (
                        <div className="pt-2 border-t border-zinc-200/70 dark:border-white/[0.06] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                              Paket Langganan
                            </span>
                            {isQuotaInitialLoading ? (
                              <span className="h-4 w-12 rounded-full bg-zinc-200/80 dark:bg-white/[0.08] animate-pulse" />
                            ) : isProPlan ? (
                              <span className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full">
                                Axioma Pro · Aktif
                              </span>
                            ) : (
                              <span className="border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-[10px] font-medium uppercase px-1.5 py-0.5 rounded">
                                FREE
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed tabular-nums">
                            {isQuotaInitialLoading
                              ? "Memuat sisa kuota kredit harian..."
                              : !hasLoadedQuota
                                ? "Gagal memuat status kuota kredit."
                                : isProPlan
                                  ? "Akses penuh tanpa batas kredit harian untuk seluruh model."
                                  : `Paket Gratis (Free) · ${remainingCreditsCount} kredit tersisa · Reset ${quotaResetLabel}`}
                          </p>
                          <button
                            type="button"
                            onClick={onOpenSubscriptionModal}
                            className={`w-full h-9 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                              isProPlan
                                ? "border border-zinc-300 dark:border-white/15 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
                                : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                            }`}
                          >
                            {isProPlan ? "Kelola Paket" : "Upgrade ke Pro — Segera Hadir"}
                          </button>
                        </div>
                      )}
                      {isAuthenticated && authUserEmail && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 break-words">
                          Email terhubung:{" "}
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 break-all">
                            {authUserEmail}
                          </span>
                        </div>
                      )}

                      {/* Stage 6: Tentang Saya (Profil Singkat) */}
                      <div className="pt-2 border-t border-zinc-200/70 dark:border-white/[0.06] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="settings-user-profile"
                            className="block text-xs font-medium text-zinc-600 dark:text-zinc-300"
                          >
                            Tentang Saya (Profil Singkat)
                          </label>
                          <span className="text-[10px] text-zinc-400">{userProfile.length}/500</span>
                        </div>
                        <textarea
                          id="settings-user-profile"
                          rows={3}
                          maxLength={500}
                          value={userProfile}
                          onChange={(e) => onUpdateUserProfile(e.target.value)}
                          placeholder="Contoh: Mahasiswa TI, suka penjelasan to-the-point pakai analogi sederhana..."
                          className="w-full bg-white dark:bg-[#141416] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/20 rounded-xl px-3 py-2 text-base md:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none resize-none transition-colors"
                        />
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Tersimpan lokal &amp; dapat dinonaktifkan kapan saja di Kontrol Konteks.
                        </p>
                      </div>

                      {/* Stage 10A: Kunci Syarat Proyek (Requirement Lock) */}
                      <div className="pt-2.5 border-t border-zinc-200/70 dark:border-white/[0.06] space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200">
                            <Lock
                              className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400"
                              strokeWidth={1.5}
                            />
                            <span>Kunci Syarat Proyek ({requirementLockItems.length}/5)</span>
                          </span>
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
                              className={`inline-flex items-center w-8 h-[18px] rounded-full p-0.5 transition-colors ${
                                isRequirementLockEnabled
                                  ? "bg-zinc-950 dark:bg-white justify-end"
                                  : "bg-zinc-300 dark:bg-zinc-700 justify-start"
                              }`}
                            >
                              <span
                                className={`w-3.5 h-3.5 rounded-full ${
                                  isRequirementLockEnabled
                                    ? "bg-white dark:bg-zinc-950"
                                    : "bg-white dark:bg-zinc-300"
                                }`}
                              />
                            </span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
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
                                : "Tambah syarat wajib proyek..."
                            }
                            className="flex-1 min-w-0 bg-white dark:bg-[#141416] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/20 rounded-xl px-3 py-1.5 text-base md:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none disabled:opacity-45"
                          />
                          <button
                            type="button"
                            disabled={!settingsReqDraft.trim() || requirementLockItems.length >= 5}
                            onClick={onAddRequirementLockItem}
                            aria-label="Tambah syarat proyek"
                            className="w-8 h-8 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 inline-flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Plus className="w-4 h-4" strokeWidth={1.75} />
                          </button>
                        </div>

                        {requirementLockItems.length > 0 && (
                          <ul className="space-y-1.5">
                            {requirementLockItems.map((rule, idx) => (
                              <li
                                key={`${rule}-${idx}`}
                                className="flex items-start justify-between gap-2 rounded-xl border border-zinc-200/80 dark:border-white/[0.06] bg-white dark:bg-[#141416] px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
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
                                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Syarat wajib ini otomatis dipatuhi di setiap jawaban saat aktif.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Paket & Langganan (Segera Hadir — dinonaktifkan) */}
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="w-full flex items-center justify-between gap-3 px-4 py-4 min-h-[54px] text-left font-sans rounded-none opacity-65 cursor-not-allowed select-none md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200"
                  >
                    <div className="flex items-center min-w-0">
                      <CreditCard
                        className="w-5 h-5 text-zinc-500 dark:text-zinc-400 mr-4 md:w-4 md:h-4 md:mr-3 shrink-0"
                        strokeWidth={1.5}
                      />
                      <span className="text-[15px] font-medium leading-snug text-zinc-700 dark:text-zinc-300 md:text-[13.5px] md:font-normal truncate">
                        Paket &amp; Langganan
                      </span>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-zinc-300/90 dark:border-white/[0.12] bg-zinc-100/90 dark:bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap shrink-0">
                      Segera Hadir
                    </span>
                  </button>

                  {/* Batas penggunaan (sisa kredit real-time dari state kuota / GET /api/quota) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.innerWidth >= 768) {
                        onOpenDesktopSettingsPage("quota");
                      } else {
                        onChangeExpandedSection((prev) => (prev === "quota" ? null : "quota"));
                      }
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-4 min-h-[54px] text-left font-sans rounded-none transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.04] cursor-pointer md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:duration-150"
                  >
                    <div className="flex items-center min-w-0">
                      <Clock
                        className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0"
                        strokeWidth={1.5}
                      />
                      <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">
                        Batas penggunaan
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[12.5px] md:text-xs text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                        {isAuthenticated
                          ? isQuotaInitialLoading
                            ? "..."
                            : !hasLoadedQuota
                              ? "—"
                              : isProPlan
                                ? "PRO"
                                : `${remainingCreditsCount} kredit`
                          : `${Math.max(0, guestMaxMessages - guestMessageCount)}/${guestMaxMessages}`}
                      </span>
                      <ChevronRight
                        className={`w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 shrink-0 transition-transform ${
                          expandedSettingsSection === "quota" ? "rotate-90" : ""
                        }`}
                        strokeWidth={1.5}
                      />
                    </div>
                  </button>

                  {/* Expandable Batas penggunaan Body (Mobile full-bleed edge-to-edge) */}
                  {expandedSettingsSection === "quota" && (
                    <div className="w-full px-4 py-4 bg-zinc-100/60 dark:bg-white/[0.025] md:px-3 md:py-3 md:rounded-xl md:my-1 md:bg-zinc-100/70 md:dark:bg-white/[0.04] font-sans">
                      {isAuthenticated ? (
                        isQuotaInitialLoading ? (
                          <div
                            role="status"
                            aria-label="Memuat kuota kredit"
                            className="w-full space-y-3 md:rounded-xl md:border md:border-zinc-200/85 md:dark:border-white/[0.08] md:bg-white md:dark:bg-[#141416] md:p-4"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Status Paket
                              </span>
                              <span className="h-5 w-14 rounded-full bg-zinc-200/85 dark:bg-white/[0.08] animate-pulse" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-6 w-48 rounded-lg bg-zinc-200/85 dark:bg-white/[0.08] animate-pulse" />
                              <div className="h-3.5 w-36 rounded bg-zinc-200/70 dark:bg-white/[0.06] animate-pulse" />
                            </div>
                            <div className="w-full h-2 rounded-full bg-zinc-200/80 dark:bg-white/[0.08] animate-pulse" />
                            <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                              Memuat sisa kuota kredit harian...
                            </p>
                          </div>
                        ) : !hasLoadedQuota ? (
                          <div className="w-full space-y-3 md:rounded-xl md:border md:border-zinc-200/85 md:dark:border-white/[0.08] md:bg-white md:dark:bg-[#141416] md:p-4">
                            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                              Gagal memuat detail kuota kredit dari server.
                            </p>
                            <button
                              type="button"
                              onClick={onRefreshQuota}
                              className="w-full h-9 rounded-xl border border-zinc-300 dark:border-white/15 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                            >
                              Muat Ulang Kuota
                            </button>
                          </div>
                        ) : (
                          <div className="w-full space-y-3.5 md:rounded-xl md:border md:border-zinc-200/85 md:dark:border-white/[0.08] md:bg-white md:dark:bg-[#141416] md:p-4">
                            {/* Status Paket */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Status Paket
                              </span>
                              {isProPlan ? (
                                <span className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10.5px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full">
                                  PRO
                                </span>
                              ) : (
                                <span className="border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10.5px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full">
                                  FREE
                                </span>
                              )}
                            </div>

                            {/* Sisa Kredit Utama */}
                            <div className="space-y-1">
                              <div className="text-[18px] font-semibold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                                {isProPlan
                                  ? "Tanpa batas harian"
                                  : `${dailyCreditsRemaining} / ${dailyCreditLimit} kredit tersisa hari ini`}
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed tabular-nums">
                                {isProPlan
                                  ? "Akses penuh tanpa batas kredit harian untuk seluruh model Axioma."
                                  : `Sisa kredit hari ini: ${dailyCreditsRemaining} dari ${dailyCreditLimit} kredit`}
                              </p>
                            </div>

                            {/* Progress Bar Visual */}
                            <div className="space-y-1.5">
                              <div className="w-full h-2 rounded-full bg-zinc-200/90 dark:bg-white/[0.08] overflow-hidden">
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
                              <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                                <span>{dailyCreditsPercent}% tersisa</span>
                                <span>{quotaTariffCompact}</span>
                              </div>
                            </div>

                            {/* Kredit Tambahan / Bonus (jika > 0) */}
                            {bonusCreditsCount > 0 && (
                              <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] px-3 py-2 text-xs">
                                <div className="min-w-0">
                                  <div className="font-medium text-zinc-800 dark:text-zinc-200">
                                    Kredit Tambahan / Bonus
                                  </div>
                                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                    Saldo permanen, masa aktif selamanya
                                  </div>
                                </div>
                                <span className="font-semibold text-zinc-950 dark:text-white tabular-nums shrink-0">
                                  +{bonusCreditsCount} kredit
                                </span>
                              </div>
                            )}

                            {/* Info Reset Harian */}
                            <div className="flex items-start gap-1.5 text-[11.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed pt-1 border-t border-zinc-200/70 dark:border-white/[0.06]">
                              <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.5} />
                              <span>Kuota harian direset otomatis setiap hari {quotaResetLabel}.</span>
                            </div>

                            {/* Aksi Lanjutan */}
                            <button
                              type="button"
                              onClick={onOpenSubscriptionModal}
                              className="w-full h-9 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] cursor-pointer"
                            >
                              <span>
                                {isProPlan ? "Lihat Rincian Paket" : "Upgrade ke Pro — Segera Hadir"}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="w-full space-y-3 md:rounded-xl md:border md:border-zinc-200/85 md:dark:border-white/[0.08] md:bg-white md:dark:bg-[#141416] md:p-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              Status Paket
                            </span>
                            <span className="border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10.5px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full">
                              TAMU
                            </span>
                          </div>
                          <div className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                            {Math.max(0, guestMaxMessages - guestMessageCount)} / {guestMaxMessages}{" "}
                            pesan tersisa
                          </div>
                          <div className="w-full h-2 rounded-full bg-zinc-200/90 dark:bg-white/[0.08] overflow-hidden">
                            <div
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    Math.round(
                                      ((guestMaxMessages - guestMessageCount) / guestMaxMessages) *
                                        100
                                    )
                                  )
                                )}%`,
                              }}
                              className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-[width] duration-300"
                            />
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Masuk ke akun untuk mendapatkan {guestFreeDailyLimit} kredit gratis setiap
                            hari yang direset otomatis {quotaResetLabel}.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenAuthModal();
                            }}
                            className="w-full h-9 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Hubungkan Akun
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Grup 2: Preferensi */}
              <div className="w-full">
                <div className="w-full text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400 px-4 pt-1 pb-1.5 md:font-medium md:normal-case md:tracking-normal md:px-3 md:pt-2.5 md:pb-1">
                  Preferensi
                </div>
                <div className="w-full h-auto bg-white/80 dark:bg-transparent border-y border-zinc-200/70 dark:border-white/[0.06] rounded-none divide-y divide-zinc-200/70 dark:divide-white/[0.06] md:bg-transparent md:dark:bg-transparent md:border-0 md:rounded-none md:divide-y-0 md:space-y-0.5">
                  {/* Notifikasi */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.innerWidth >= 768) {
                        onOpenDesktopSettingsPage("notifications");
                      } else {
                        onChangeExpandedSection((prev) =>
                          prev === "notifications" ? null : "notifications"
                        );
                      }
                    }}
                    className="w-full px-4 py-4 min-h-[54px] rounded-none flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:duration-150"
                  >
                    <div className="flex items-center min-w-0">
                      <Bell
                        className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">
                        Notifikasi
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[13px] md:text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {notificationsEnabled ? "Aktif" : "Nonaktif"}
                      </span>
                      <ChevronRight
                        className={`w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 shrink-0 transition-transform ${
                          expandedSettingsSection === "notifications" ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expandable Notifikasi Toast Toggle (Mobile) */}
                  {expandedSettingsSection === "notifications" && (
                    <div className="w-full px-4 py-4 bg-zinc-100/60 dark:bg-white/[0.025] md:px-3 md:py-2.5 md:rounded-xl md:my-1 md:bg-zinc-100/70 md:dark:bg-white/[0.04]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
                            Notifikasi Toast
                          </div>
                          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Tampilkan pemberitahuan singkat untuk salin teks, ganti model, dan status
                            aksi di ruang kerja.
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={notificationsEnabled}
                          aria-label="Aktifkan Notifikasi Toast"
                          onClick={onToggleNotifications}
                          className="cursor-pointer shrink-0 p-1"
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
                  )}

                  {/* Model Default */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.innerWidth >= 768) {
                        onOpenDesktopSettingsPage("agent");
                      } else {
                        onChangeExpandedSection((prev) => (prev === "agent" ? null : "agent"));
                      }
                    }}
                    className="w-full px-4 py-4 min-h-[54px] rounded-none flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:duration-150"
                  >
                    <div className="flex items-center min-w-0">
                      <Cpu
                        className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">
                        Model Default
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[13px] md:text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 whitespace-nowrap max-w-[140px] md:max-w-[90px] truncate">
                        {availableAgents.find((a) => a.id === defaultAgentId)?.name || "Axioma Pro"}
                      </span>
                      <ChevronRight
                        className={`w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 shrink-0 transition-transform ${
                          expandedSettingsSection === "agent" ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expandable Model Selector */}
                  {expandedSettingsSection === "agent" && (
                    <div className="w-full px-4 py-4 bg-zinc-100/60 dark:bg-white/[0.025] md:px-2 md:py-2 md:rounded-xl md:my-1 md:bg-zinc-100/70 md:dark:bg-white/[0.04] space-y-2">
                      {availableAgents.map((agent) => {
                        const isChecked = defaultAgentId === agent.id;
                        return (
                          <label
                            key={agent.id}
                            className={`flex items-center justify-between p-3 md:p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? "bg-white dark:bg-zinc-800/90 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white shadow-xs"
                                : "bg-white/60 dark:bg-[#1e1f20]/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="radio"
                                name="defaultAgent"
                                value={agent.id}
                                checked={isChecked}
                                onChange={() => onSelectDefaultAgent(agent.id)}
                                className="w-4 h-4 accent-zinc-900 dark:accent-white cursor-pointer shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-sm md:text-xs text-zinc-900 dark:text-zinc-100">
                                  {agent.name}
                                </div>
                                <div className="text-xs md:text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                                  {agent.description}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs md:text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium border border-zinc-200 dark:border-zinc-700 ml-2 shrink-0">
                              {agent.tag}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Penyimpanan Riwayat */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.innerWidth >= 768) {
                        onOpenDesktopSettingsPage("storage");
                      } else {
                        onChangeExpandedSection((prev) => (prev === "storage" ? null : "storage"));
                      }
                    }}
                    className="w-full px-4 py-4 min-h-[54px] rounded-none flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:duration-150"
                  >
                    <div className="flex items-center min-w-0">
                      <Database
                        className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">
                        Penyimpanan Riwayat
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[13px] md:text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-right">
                        {isAuthenticated ? "Cloud & Lokal" : "Hanya Lokal"}
                      </span>
                      <ChevronRight
                        className={`w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 shrink-0 transition-transform ${
                          expandedSettingsSection === "storage" ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expandable Penyimpanan Riwayat (Mobile) */}
                  {expandedSettingsSection === "storage" && (
                    <div className="w-full px-4 py-4 bg-zinc-100/60 dark:bg-white/[0.025] md:px-3 md:py-2.5 md:rounded-xl md:my-1 md:bg-zinc-100/70 md:dark:bg-white/[0.04] space-y-3">
                      <div>
                        <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                          Mode Penyimpanan Saat Ini: {isAuthenticated ? "Cloud & Lokal" : "Hanya Lokal"}
                        </div>
                        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {isAuthenticated
                            ? "Riwayat percakapan disinkronkan secara aman ke cloud dan cache lokal."
                            : "Riwayat percakapan hanya disimpan di penyimpanan lokal peramban ini."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onRequestClearAllChats();
                        }}
                        className="w-full h-9 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/25 bg-white dark:bg-[#141416] hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        Hapus semua percakapan
                      </button>
                    </div>
                  )}

                  {/* Pintasan Keyboard (Desktop only — tersembunyi di layar mobile) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.innerWidth >= 768) {
                        onOpenDesktopSettingsPage("shortcuts");
                      } else {
                        onChangeExpandedSection((prev) =>
                          prev === "shortcuts" ? null : "shortcuts"
                        );
                      }
                    }}
                    className="hidden md:flex w-full px-3 py-2 min-h-0 rounded-xl items-center justify-between text-left text-[13.5px] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer"
                  >
                    <div className="flex items-center min-w-0">
                      <Keyboard
                        className="w-4 h-4 text-zinc-500 dark:text-zinc-400 mr-3 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="text-[13.5px] font-normal text-zinc-800 dark:text-zinc-200 truncate">
                        Pintasan Keyboard
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform ${
                        expandedSettingsSection === "shortcuts" ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {/* Expandable Keyboard Shortcuts (Desktop only) */}
                  {expandedSettingsSection === "shortcuts" && (
                    <div className="hidden md:block w-full px-3 py-2.5 rounded-xl my-1 bg-zinc-100/70 dark:bg-white/[0.04] space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-zinc-200/70 dark:border-zinc-800/60">
                        <span className="text-zinc-600 dark:text-zinc-400">Cari percakapan</span>
                        <kbd className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                          {isMacOs ? "⌘ K" : "Ctrl+K"}
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-zinc-200/70 dark:border-zinc-800/60">
                        <span className="text-zinc-600 dark:text-zinc-400">Percakapan baru</span>
                        <kbd className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                          {isMacOs ? "⌘ ⇧ O" : "Ctrl+Shift+O"}
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-zinc-200/70 dark:border-zinc-800/60">
                        <span className="text-zinc-600 dark:text-zinc-400">Hentikan balasan</span>
                        <kbd className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px] text-zinc-700 dark:text-zinc-300">
                          Esc
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-zinc-600 dark:text-zinc-400">Kirim pesan</span>
                        <kbd className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px] text-zinc-700 dark:text-zinc-300">
                          Enter
                        </kbd>
                      </div>
                    </div>
                  )}

                  {/* Tema (Mobile monochrome segmented buttons — avoids iOS native <select> UIMenu dimming | Desktop opens flat canvas page) */}
                  <div className="md:hidden w-full px-4 py-3.5 min-h-[54px] flex items-center justify-between gap-3 text-left rounded-none">
                    <div className="flex items-center min-w-0 shrink-0">
                      <Moon
                        className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 truncate">
                        Tema
                      </span>
                    </div>
                    <div
                      role="radiogroup"
                      aria-label="Pilih tema tampilan"
                      className="inline-flex items-center p-0.5 rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/[0.08] shrink-0"
                    >
                      {(
                        [
                          { value: "light" as const, label: "Terang" },
                          { value: "dark" as const, label: "Gelap" },
                          { value: "system" as const, label: "Sistem" },
                        ] as const
                      ).map((opt) => {
                        const active = themeMode === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onSetTheme(opt.value)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                              active
                                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenDesktopSettingsPage("theme")}
                    className="hidden md:flex w-full px-3 py-2 rounded-xl text-[13.5px] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] items-center justify-between text-left transition-colors duration-150 cursor-pointer"
                  >
                    <div className="flex items-center min-w-0">
                      <Moon
                        className="w-4 h-4 text-zinc-500 dark:text-zinc-400 mr-3 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="text-[13.5px] font-normal text-zinc-800 dark:text-zinc-200 truncate">
                        Tema
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {themeMode === "system"
                          ? "Default sistem"
                          : themeMode === "dark"
                            ? "Gelap"
                            : "Terang"}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Grup 3: Bantuan & Informasi */}
              <div className="w-full">
                <div className="w-full text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400 px-4 pt-1 pb-1.5 md:font-medium md:normal-case md:tracking-normal md:px-3 md:pt-2.5 md:pb-1">
                  Bantuan &amp; Informasi
                </div>
                <div className="w-full rounded-none bg-white/80 dark:bg-transparent border-y border-zinc-200/70 dark:border-white/[0.06] divide-y divide-zinc-200/70 dark:divide-white/[0.06] overflow-hidden md:bg-transparent md:dark:bg-transparent md:border-0 md:rounded-none md:divide-y-0 md:space-y-0.5">
                  {/* 1) Kirim Masukan */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.innerWidth >= 768) {
                        onOpenDesktopSettingsPage("feedback");
                      } else {
                        onChangeSettingsView("feedback");
                      }
                    }}
                    className="w-full px-4 py-4 min-h-[54px] rounded-none flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:duration-150"
                  >
                    <div className="flex items-center min-w-0">
                      <MessageSquarePlus
                        className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">
                        Kirim Masukan
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[13px] md:text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        Saran &amp; Bug
                      </span>
                      <ChevronRight className="w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors shrink-0" />
                    </div>
                  </button>

                  {/* 2) Tentang Axioma */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.innerWidth >= 768) {
                        onOpenDesktopSettingsPage("about");
                      } else {
                        onChangeSettingsView("about");
                      }
                    }}
                    className="w-full px-4 py-4 min-h-[54px] rounded-none flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:duration-150"
                  >
                    <div className="flex items-center min-w-0">
                      <Info
                        className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">
                        Tentang Axioma
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[13px] md:text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {AXIOMA_APP_VERSION}
                      </span>
                      <ChevronRight className="w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors shrink-0" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Stage 10B: Apa yang Baru */}
              <div className="w-full rounded-none md:rounded-xl bg-white/80 dark:bg-transparent md:bg-zinc-50/90 md:dark:bg-white/[0.03] border-y md:border border-zinc-200/70 dark:border-white/[0.06] px-4 py-4 md:p-3 space-y-2 md:mx-1 md:w-auto">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Apa yang Baru ({AXIOMA_APP_VERSION})
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400">
                    Beta
                  </span>
                </div>
                <ul className="space-y-1.5 text-[11.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                    <span>
                      <strong className="font-medium text-zinc-900 dark:text-zinc-100">
                        Bedah PDF:
                      </strong>{" "}
                      Ringkas dokumen, istilah kunci, &amp; prediksi pertanyaan kritis.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                    <span>
                      <strong className="font-medium text-zinc-900 dark:text-zinc-100">
                        Axioma Lens:
                      </strong>{" "}
                      Analisis 2 sisi pro, kontra, dan celah pakai{" "}
                      <code className="font-mono text-[10.5px]">/lens</code>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                    <span>
                      <strong className="font-medium text-zinc-900 dark:text-zinc-100">
                        Roleplay + Rapor:
                      </strong>{" "}
                      Simulasi sidang, HRD, atau negosiasi dengan ekspor PDF.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                    <span>
                      <strong className="font-medium text-zinc-900 dark:text-zinc-100">
                        Kontrol Konteks:
                      </strong>{" "}
                      Atur riwayat, profil, mode privat, dan kunci syarat proyek.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Grup 4: Hapus semua percakapan */}
              <div className="w-full rounded-none bg-white/80 dark:bg-transparent border-y border-red-200/70 dark:border-red-500/15 hover:bg-red-50/70 dark:hover:bg-red-500/[0.06] transition overflow-hidden md:bg-transparent md:dark:bg-transparent md:border-0 md:border-t md:border-zinc-200/70 md:dark:border-white/[0.08] md:rounded-none md:mt-1 md:pt-1 md:hover:bg-transparent md:dark:hover:bg-transparent">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestClearAllChats();
                  }}
                  className="w-full px-4 py-4 min-h-[54px] rounded-none flex items-center justify-between text-left cursor-pointer text-red-600 dark:text-red-400 group md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:hover:bg-red-50 md:dark:hover:bg-red-500/10 md:transition-colors md:duration-150"
                >
                  <div className="flex items-center min-w-0">
                    <Trash
                      className="w-5 h-5 text-red-600 dark:text-red-400 mr-4 md:w-4 md:h-4 md:mr-3 shrink-0"
                      strokeWidth={1.75}
                    />
                    <span className="text-[15px] font-medium leading-snug text-red-600 dark:text-red-400 md:text-[13.5px] md:font-normal truncate">
                      Hapus semua percakapan
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 md:w-3.5 md:h-3.5 text-red-400/70 group-hover:text-red-600 dark:text-red-400/50 dark:group-hover:text-red-400 transition-colors shrink-0" />
                </button>
              </div>

              {/* Clean Version Footer (Mobile only) */}
              <div className="md:hidden px-4 pt-2 pb-1 text-center text-xs text-zinc-500 space-y-1">
                <div>Axioma {AXIOMA_APP_VERSION}</div>
                <div className="text-[11px] leading-relaxed">
                  Riwayat percakapan tersimpan secara aman di peramban perangkat ini.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
