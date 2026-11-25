"use client";

import React from "react";
import {
  Check,
  Copy,
  CornerDownRight,
  GitBranch,
  MoreHorizontal,
  RotateCw,
  Share2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

interface MessageActionBarProps {
  messageId: string;
  isStreaming: boolean;
  isBusy: boolean;
  isCopied: boolean;
  isWaCopied: boolean;
  isMenuOpen: boolean;
  feedback?: "up" | "down";
  showFeedbackSavedNotice: boolean;
  showStructuredFeedbackThanks: boolean;
  onCopy: () => void;
  onCopyWhatsApp: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onBranch: () => void;
  onContinue: () => void;
  onRegenerate: () => void;
  onFeedback: (rating: "up" | "down") => void;
}

export function MessageActionBar({
  isStreaming,
  isBusy,
  isCopied,
  isWaCopied,
  isMenuOpen,
  feedback,
  showFeedbackSavedNotice,
  showStructuredFeedbackThanks,
  onCopy,
  onCopyWhatsApp,
  onToggleMenu,
  onCloseMenu,
  onBranch,
  onContinue,
  onRegenerate,
  onFeedback,
}: MessageActionBarProps) {
  return (
    <div
      aria-hidden={isStreaming}
      className={`w-full flex items-center gap-2 pt-0.5 transition-[opacity,transform] duration-200 ease-out motion-safe-transform ${
        isStreaming
          ? "opacity-0 translate-y-1 pointer-events-none select-none"
          : "opacity-100 translate-y-0"
      }`}
    >
      <div className="flex items-center gap-1 -ml-1.5 text-zinc-500 dark:text-zinc-400">
        {/* Primary Action: Salin */}
        <button
          type="button"
          onClick={onCopy}
          title={isCopied ? "Disalin" : "Salin jawaban"}
          aria-label="Salin jawaban"
          className="h-8 px-2 rounded-lg text-xs font-medium tracking-tight text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.06] active:scale-[0.96] transition-all duration-150 cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 shrink-0" strokeWidth={1.75} />
              <span className="text-zinc-900 dark:text-zinc-100">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span>Salin</span>
            </>
          )}
        </button>

        {/* Secondary Actions Overflow Menu (···) */}
        <div className="relative" data-ai-action-menu="true">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label="Aksi lainnya"
            title="Aksi lainnya"
            onClick={onToggleMenu}
            className={`w-8 h-8 rounded-lg active:scale-[0.96] transition-all duration-150 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60 ${
              isMenuOpen
                ? "bg-zinc-200/70 text-zinc-900 dark:bg-white/[0.09] dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.06]"
            }`}
          >
            <MoreHorizontal className="w-4 h-4" strokeWidth={1.6} />
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              aria-label="Aksi tambahan balasan"
              className="ios-glass absolute left-0 bottom-full mb-1.5 z-40 min-w-[192px] rounded-xl p-1 bg-white/95 dark:bg-[#141417]/95 border border-zinc-200 dark:border-white/[0.08] shadow-xl animate-axioma-scale-in"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onCopyWhatsApp();
                  onCloseMenu();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                {isWaCopied ? (
                  <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                ) : (
                  <Share2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                )}
                <span>{isWaCopied ? "Tersalin untuk WA" : "Salin format WA"}</span>
              </button>

              <button
                type="button"
                role="menuitem"
                disabled={isBusy}
                onClick={() => {
                  onCloseMenu();
                  onRegenerate();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCw className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span>Ulangi jawaban</span>
              </button>

              <button
                type="button"
                role="menuitem"
                disabled={isBusy}
                onClick={() => {
                  onCloseMenu();
                  onContinue();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CornerDownRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span>Lanjutkan</span>
              </button>

              <button
                type="button"
                role="menuitem"
                disabled={isBusy}
                onClick={() => {
                  onCloseMenu();
                  onBranch();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <GitBranch className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span>Buat cabang</span>
              </button>

              <div className="border-t border-zinc-200 dark:border-white/[0.08] my-1" />

              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  role="menuitem"
                  aria-pressed={feedback === "up"}
                  onClick={() => {
                    onCloseMenu();
                    onFeedback("up");
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    feedback === "up"
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                  <span>Bagus</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  aria-pressed={feedback === "down"}
                  onClick={() => {
                    onCloseMenu();
                    onFeedback("down");
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    feedback === "down"
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                  <span>Kurang</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {isWaCopied && (
          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 pl-1">
            Disalin (WA)
          </span>
        )}
        {showFeedbackSavedNotice && (
          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 pl-1">
            Masukan tersimpan
          </span>
        )}
        {showStructuredFeedbackThanks && (
          <span className="text-[11px] text-text-muted pl-1">
            Terima kasih
          </span>
        )}
      </div>
    </div>
  );
}
