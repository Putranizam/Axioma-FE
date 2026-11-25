"use client";

import React from "react";
import Link from "next/link";
import { ArrowDown } from "lucide-react";

interface ChatComposerProps {
  hasMessages: boolean;
  isDesktopEmptyState: boolean;
  isUserScrolledUp: boolean;
  onScrollToBottom: () => void;
  heroSlot?: React.ReactNode;
  aboveInputSlot?: React.ReactNode;
  inputFieldSlot: React.ReactNode;
  leftToolbarSlot: React.ReactNode;
  rightToolbarSlot: React.ReactNode;
  showDisclaimer: boolean;
}

export const ChatComposer = React.memo(function ChatComposer({
  hasMessages,
  isDesktopEmptyState,
  isUserScrolledUp,
  onScrollToBottom,
  heroSlot,
  aboveInputSlot,
  inputFieldSlot,
  leftToolbarSlot,
  rightToolbarSlot,
  showDisclaimer,
}: ChatComposerProps) {
  return (
    <div
      className={`w-full bg-transparent px-3 sm:px-4 md:px-6 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-3 [[data-kb="open"]_&]:pt-1.5 ${
        hasMessages
          ? "absolute bottom-0 inset-x-0 z-20 pointer-events-none"
          : isDesktopEmptyState
          ? "relative z-20 shrink-0 md:shrink md:flex-1 md:min-h-0 md:overflow-y-auto scrollbar-none overscroll-y-contain md:flex md:flex-col"
          : "relative z-20 shrink-0"
      }`}
    >
      {/* Floating "Scroll to Bottom" button anchored above input card */}
      {hasMessages && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-30">
          <button
            type="button"
            tabIndex={isUserScrolledUp ? 0 : -1}
            aria-hidden={!isUserScrolledUp}
            onClick={onScrollToBottom}
            title="Kembali ke pesan terbaru"
            aria-label="Gulir ke bawah"
            className={`ios-glass w-9 h-9 rounded-full text-zinc-800 dark:text-zinc-100 flex items-center justify-center transition-[opacity,transform] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe-transform active:scale-[0.95] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60 ${
              isUserScrolledUp
                ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                : "opacity-0 translate-y-2 scale-90 pointer-events-none"
            }`}
          >
            <ArrowDown className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      )}

      <div
        className={`w-full max-w-[680px] lg:max-w-[720px] mx-auto flex flex-col items-center ${
          isDesktopEmptyState ? "md:flex-1 md:justify-center" : ""
        }`}
      >
        <div
          className={`relative w-full flex flex-col items-center ${
            isDesktopEmptyState ? "md:-mt-8" : ""
          }`}
        >
          {heroSlot}
          {aboveInputSlot}

          {/* Rounded Floating Composer Card */}
          <div
            style={!hasMessages ? { animationDelay: "120ms" } : undefined}
            className={`group/input relative pointer-events-auto max-w-[720px] mx-auto w-full rounded-[24px] px-3.5 sm:px-4 pt-3 pb-2.5 flex flex-col gap-2 ${
              !hasMessages ? "animate-axioma-fade-up" : ""
            }`}
          >
            {/* Dedicated backdrop layer (keeps parent free of backdrop-filter for iOS Safari nested menus) */}
            <div
              aria-hidden="true"
              className="ios-glass absolute inset-0 rounded-[24px] bg-white/95 md:bg-white/90 dark:bg-[#17171b]/95 md:dark:bg-[#17171b]/90 border border-zinc-200/90 dark:border-white/10 shadow-[0_6px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)] pointer-events-none transition-colors duration-200 group-focus-within/input:border-zinc-400/50 dark:group-focus-within/input:border-white/20"
            />

            {/* Top Row: Textarea / Recording Waveform / Transcribing */}
            <div className="relative z-10 w-full min-w-0 flex items-center">
              {inputFieldSlot}
            </div>

            {/* Bottom Row: Minimalist Left (+, Mode) | Right (Model, Mic, Voice/Send) */}
            <div className="relative z-10 w-full flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2 min-w-0">
              <div className="flex items-center gap-1 min-w-0 shrink">
                {leftToolbarSlot}
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink-0">
                {rightToolbarSlot}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Disclaimer Footer */}
      <p
        className={`pointer-events-none shrink-0 mt-2 mb-0 py-0.5 md:pt-1.5 md:pb-2 w-full overflow-visible text-center text-[11px] sm:text-xs leading-normal text-zinc-400 dark:text-zinc-500 tracking-normal [[data-kb="open"]_&]:hidden ${
          !showDisclaimer
            ? "hidden"
            : "block md:flex md:flex-wrap md:items-center md:justify-center md:gap-x-2 md:gap-y-0.5"
        }`}
      >
        <span className="md:hidden">Axioma dapat membuat kesalahan.</span>
        <span className="hidden md:inline">
          Axioma dapat membuat kesalahan. Periksa kembali informasi penting.
        </span>
        <span className="hidden md:inline text-border-strong">•</span>
        <span className="hidden md:inline-flex items-center gap-2 pointer-events-auto">
          <Link
            href="/privasi"
            className="py-1 px-1.5 inline-block underline underline-offset-2 decoration-border-strong hover:text-text-primary hover:decoration-text-primary transition-colors"
          >
            Privasi
          </Link>
          <span className="text-border-strong">·</span>
          <Link
            href="/ketentuan"
            className="py-1 px-1.5 inline-block underline underline-offset-2 decoration-border-strong hover:text-text-primary hover:decoration-text-primary transition-colors"
          >
            Ketentuan
          </Link>
        </span>
      </p>
    </div>
  );
});
