"use client";

import React from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Pencil, Settings } from "lucide-react";
import { AxiomaLogoMark } from "../AxiomaLogoMark";

export interface ProfileSheetProps {
  isEntered: boolean;
  profileDropdownRef: React.RefObject<HTMLDivElement | null>;
  profileSwipeStartYRef: React.MutableRefObject<number | null>;
  profileSwipeDeltaY: number;
  onChangeProfileSwipeDeltaY: (value: number) => void;
  profilePopoverStyle?: React.CSSProperties;
  profileAnchor: "header" | "sidebar";
  isAuthenticated: boolean;
  authUserEmail?: string | null;
  formattedDisplayName: string;
  avatarInitial: string;
  onClose: () => void;
  onOpenSettings: (expandedSection?: string | null) => void;
  onOpenAuthModal: () => void;
  onSignOut: () => Promise<void>;
}

export function ProfileSheet({
  isEntered,
  profileDropdownRef,
  profileSwipeStartYRef,
  profileSwipeDeltaY,
  onChangeProfileSwipeDeltaY,
  profilePopoverStyle,
  profileAnchor,
  isAuthenticated,
  authUserEmail,
  formattedDisplayName,
  avatarInitial,
  onClose,
  onOpenSettings,
  onOpenAuthModal,
  onSignOut,
}: ProfileSheetProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed top-0 left-0 right-0 h-[var(--app-height)] z-50 flex items-end justify-center p-0 overflow-hidden ${
        isEntered ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Sibling Dim Backdrop (keeps dialog wrapper free of opacity transition so Safari iOS renders -webkit-backdrop-filter) */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 md:bg-transparent transition-opacity duration-300 md:duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isEntered ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Popup Container (Mobile: Bottom-sheet with swipe-down | Desktop md+: Frosted Floating Popover near trigger) */}
      <div
        ref={profileDropdownRef}
        style={
          profileSwipeDeltaY > 0
            ? { transform: `translate3d(0, ${profileSwipeDeltaY}px, 0)`, transition: "none" }
            : profilePopoverStyle
        }
        className={`ios-glass relative z-10 w-full h-auto max-h-[90%] rounded-t-[28px] border-x-0 border-b-0 px-5 pt-3 pb-[calc(var(--safe-bottom)+16px)] flex flex-col overflow-y-auto overscroll-contain touch-auto [-webkit-overflow-scrolling:touch] scrollbar-none transition-[opacity,transform] duration-300 md:duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] md:fixed md:z-50 md:w-[310px] md:max-h-[82vh] md:rounded-2xl md:border md:p-3 ${
          profileAnchor === "sidebar"
            ? "md:inset-auto md:bottom-16 md:left-4 md:origin-bottom-left"
            : "md:inset-auto md:top-16 md:right-4 md:origin-top-right"
        } ${
          isEntered
            ? "translate-y-0 opacity-100 md:scale-100"
            : "translate-y-full opacity-0 md:translate-y-0 md:scale-95 pointer-events-none"
        }`}
      >
        {/* Top Area: Mobile Drag handle & "Selesai" (hidden on Desktop Popover) */}
        <div className="shrink-0">
          <div
            onTouchStart={(e) => {
              if (typeof window !== "undefined" && window.innerWidth >= 768) return;
              profileSwipeStartYRef.current = e.touches[0]?.clientY ?? null;
            }}
            onTouchMove={(e) => {
              if (profileSwipeStartYRef.current === null) return;
              const currentY = e.touches[0]?.clientY ?? profileSwipeStartYRef.current;
              const delta = currentY - profileSwipeStartYRef.current;
              if (delta > 0) {
                onChangeProfileSwipeDeltaY(Math.min(delta, 240));
              }
            }}
            onTouchEnd={() => {
              if (profileSwipeStartYRef.current === null) return;
              const shouldClose = profileSwipeDeltaY > 70;
              profileSwipeStartYRef.current = null;
              onChangeProfileSwipeDeltaY(0);
              if (shouldClose) {
                onClose();
              }
            }}
            onTouchCancel={() => {
              profileSwipeStartYRef.current = null;
              onChangeProfileSwipeDeltaY(0);
            }}
            className="touch-none select-none md:hidden"
          >
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700/60 mx-auto mb-2" />

            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <AxiomaLogoMark className="w-5 h-5 shrink-0" />
                <span className="font-heading text-[14px] font-bold tracking-[0.06em] uppercase text-zinc-900 dark:text-zinc-100">
                  Axioma
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] inline-flex items-center px-1 text-[15px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 active:scale-[0.96] transition-[color,transform] duration-200 ease-out cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>

          {/* Card 1: Main User Account Card */}
          <div className="bg-white/90 dark:bg-[#1c1c1f]/90 rounded-3xl md:rounded-xl p-4 md:p-3 flex items-center justify-between gap-4 md:gap-3 mb-3.5 md:mb-2.5 border border-zinc-200/80 dark:border-white/[0.06] shadow-sm md:shadow-none">
            <div className="flex items-center min-w-0 flex-1">
              <div className="relative w-14 h-14 md:w-10 md:h-10 rounded-full shrink-0">
                <div className="w-14 h-14 md:w-10 md:h-10 rounded-full font-semibold text-2xl md:text-base flex items-center justify-center overflow-hidden bg-zinc-200 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-white/10">
                  <span className="text-2xl md:text-base font-semibold uppercase">
                    {avatarInitial}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings("account");
                  }}
                  title="Ubah nama tampilan"
                  aria-label="Ubah nama tampilan"
                  className="absolute -bottom-1 -right-1 w-6 h-6 md:w-5 md:h-5 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:bg-[#1e1f20] dark:border-zinc-700 dark:text-zinc-300 flex items-center justify-center dark:hover:bg-zinc-700 cursor-pointer transition-colors shadow-sm"
                >
                  <Pencil className="w-3 h-3 md:w-2.5 md:h-2.5" />
                </button>
              </div>

              <div className="min-w-0 flex-1 ml-4 md:ml-3">
                <div className="text-[18px] md:text-[14px] font-semibold text-zinc-900 dark:text-white truncate">
                  {formattedDisplayName}
                </div>
                <div className="text-[13px] md:text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400 truncate mt-0.5 md:mt-0">
                  {authUserEmail || "Mode Tamu (Lokal)"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings("account");
              }}
              aria-label="Pengaturan akun"
              className="w-8 h-8 md:w-7 md:h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center shrink-0 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronDown className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </button>
          </div>

          {/* Separate Standalone Capsule Buttons */}
          <div className="space-y-2.5 md:space-y-1.5">
            {/* Button 1: Kelola Akun Google Anda / Masuk dengan Google */}
            <button
              type="button"
              onClick={() => {
                onClose();
                if (!isAuthenticated) {
                  onOpenAuthModal();
                } else {
                  onOpenSettings("account");
                }
              }}
              className="w-full bg-white/90 hover:bg-zinc-50 dark:bg-[#1c1c1f]/90 dark:hover:bg-zinc-800 active:scale-[0.98] rounded-2xl md:rounded-xl px-5 py-4 md:px-3.5 md:py-2.5 flex items-center justify-between text-[15px] md:text-[13.5px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 transition-[background-color,transform] duration-150 cursor-pointer text-left border border-zinc-200/80 dark:border-white/[0.06] shadow-sm md:shadow-none"
            >
              <div className="flex items-center gap-3.5 md:gap-2.5 min-w-0">
                <svg className="w-5 h-5 md:w-4 md:h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="text-[15px] md:text-[13.5px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 truncate">
                  {isAuthenticated ? "Kelola Akun Google Anda" : "Masuk dengan Google"}
                </span>
              </div>
            </button>

            {/* Button 2: Setelan */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings(null);
              }}
              className="w-full bg-white/90 hover:bg-zinc-50 dark:bg-[#1c1c1f]/90 dark:hover:bg-zinc-800 active:scale-[0.98] rounded-2xl md:rounded-xl px-5 py-4 md:px-3.5 md:py-2.5 flex items-center justify-between text-[15px] md:text-[13.5px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 transition-[background-color,transform] duration-150 cursor-pointer text-left border border-zinc-200/80 dark:border-white/[0.06] shadow-sm md:shadow-none"
            >
              <div className="flex items-center gap-3.5 md:gap-2.5">
                <Settings
                  className="w-5 h-5 md:w-4 md:h-4 text-zinc-600 dark:text-zinc-300 shrink-0"
                  strokeWidth={1.75}
                />
                <span className="text-[15px] md:text-[13.5px] font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                  Setelan
                </span>
              </div>
            </button>

            {/* Button 3: Keluar dari Akun (when authenticated) */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  void onSignOut();
                }}
                className="w-full bg-white/90 hover:bg-red-50 dark:bg-[#1c1c1f]/90 dark:hover:bg-red-950/30 active:scale-[0.98] rounded-2xl md:rounded-xl px-5 py-4 md:px-3.5 md:py-2.5 flex items-center gap-3.5 md:gap-2.5 text-[15px] md:text-[13.5px] font-medium leading-snug text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-[color,background-color,transform] duration-150 cursor-pointer text-left border border-zinc-200/80 dark:border-white/[0.06] shadow-sm md:shadow-none"
              >
                <LogOut
                  className="w-5 h-5 md:w-4 md:h-4 text-red-600 dark:text-red-400 shrink-0"
                  strokeWidth={1.75}
                />
                <span>Keluar dari Akun</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Footer Links (1-line horizontal layout) */}
        <div className="mt-6 md:mt-3 flex items-center justify-center gap-2 text-[12px] md:text-[11px] text-zinc-500 shrink-0">
          <Link
            href="/privasi"
            onClick={onClose}
            className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors"
          >
            Kebijakan Privasi
          </Link>
          <span aria-hidden="true">•</span>
          <Link
            href="/ketentuan"
            onClick={onClose}
            className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors"
          >
            Persyaratan Layanan
          </Link>
        </div>
      </div>
    </div>
  );
}
