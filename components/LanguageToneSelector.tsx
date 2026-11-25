"use client";

import React, { useState, useRef, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  THINKING_MODES,
  ThinkingMode,
} from "@/constants/language";

export interface ContextControlState {
  useHistory: boolean;
  useProject: boolean;
  useProfile: boolean;
}

export const DEFAULT_CONTEXT_CONTROL: ContextControlState = {
  useHistory: true,
  useProject: true,
  useProfile: true,
};

interface LanguageToneSelectorProps {
  thinkingMode: ThinkingMode;
  contextControl?: ContextControlState;
  isPrivateMode?: boolean;
  onThinkingModeChange: (thinkingMode: ThinkingMode) => void;
  onContextControlChange?: (next: ContextControlState) => void;
  onPrivateModeChange?: (next: boolean) => void;
  disabled?: boolean;
  onBeforeOpen?: () => void;
}

export function LanguageToneSelector({
  thinkingMode,
  contextControl = DEFAULT_CONTEXT_CONTROL,
  isPrivateMode = false,
  onThinkingModeChange,
  onContextControlChange,
  onPrivateModeChange,
  disabled = false,
  onBeforeOpen,
}: LanguageToneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const activeThinking =
    THINKING_MODES.find((item) => item.code === thinkingMode) ??
    THINKING_MODES[0];

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (
        containerRef.current &&
        target &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside, {
      passive: true,
    });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      onBeforeOpen?.();
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className="sm:relative min-w-0 shrink">
      {/* Minimalist borderless mode toggle pill */}
      <div className="inline-flex items-center max-w-[132px] sm:max-w-none bg-transparent hover:bg-zinc-200/60 text-zinc-600 hover:text-zinc-900 dark:bg-transparent dark:hover:bg-white/[0.07] dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg transition-colors">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={`Mode berpikir ${activeThinking.label}`}
          title={`Mode Berpikir: ${activeThinking.label}`}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={handleToggle}
          className={`inline-flex items-center gap-1.5 h-8 min-w-0 px-2 text-xs font-medium tracking-tight whitespace-nowrap active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60 rounded-lg ${
            disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer"
          }`}
        >
          <SlidersHorizontal className="w-[14px] h-[14px] shrink-0" strokeWidth={1.5} />
          <span className="truncate">{activeThinking.label}</span>
        </button>
      </div>

      {/* Compact Upward Popover Menu (zero DOM/overlay when closed) */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Pengaturan mode berpikir dan kontrol konteks"
          className="ios-glass absolute bottom-full left-0 mb-2 z-50 w-[min(17.5rem,calc(100vw-2rem))] max-h-[min(68vh,calc(var(--app-height,100dvh)-140px))] overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] scrollbar-none rounded-2xl p-3 bg-white/95 dark:bg-[#0e0e10]/95 border border-zinc-200 dark:border-white/[0.08] shadow-xl origin-bottom-left animate-axioma-scale-in"
        >
          {/* Section 1: MODE BERPIKIR */}
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 select-none">
              MODE BERPIKIR
            </div>
            <div
              role="radiogroup"
              aria-label="Mode berpikir"
              className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-white/[0.05] p-1 rounded-xl"
            >
              {THINKING_MODES.map((item) => {
                const isActive = item.code === thinkingMode;
                return (
                  <button
                    key={item.code}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => onThinkingModeChange(item.code)}
                    className={`py-1.5 px-2 text-[12px] leading-snug tracking-tight text-center transition-colors cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60 ${
                      isActive
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-medium rounded-lg"
                        : "text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white rounded-lg"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hairline Divider */}
          <div className="border-t border-zinc-200 dark:border-white/[0.08] my-2.5" />

          {/* Section 3: KONTROL KONTEKS */}
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 select-none">
              KONTROL KONTEKS
            </div>
            <div className="space-y-1">
              {(
                [
                  { key: "useHistory" as const, label: "Riwayat Chat" },
                  { key: "useProject" as const, label: "Ruang Proyek" },
                  { key: "useProfile" as const, label: "Profil Saya" },
                ] as const
              ).map((item) => {
                const lockedOffByPrivate =
                  isPrivateMode && (item.key === "useProject" || item.key === "useProfile");
                const enabled = lockedOffByPrivate ? false : contextControl[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    disabled={lockedOffByPrivate}
                    onClick={() =>
                      onContextControlChange?.({
                        ...contextControl,
                        [item.key]: !enabled,
                      })
                    }
                    className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-[12px] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>{item.label}</span>
                    <span
                      aria-hidden="true"
                      className={`inline-flex items-center w-7 h-4 rounded-full p-0.5 transition-colors ${
                        enabled
                          ? "bg-zinc-950 dark:bg-white justify-end"
                          : "bg-zinc-300 dark:bg-zinc-700 justify-start"
                      }`}
                    >
                      <span
                        className={`w-3 h-3 rounded-full ${
                          enabled
                            ? "bg-white dark:bg-zinc-950"
                            : "bg-white dark:bg-zinc-300"
                        }`}
                      />
                    </span>
                  </button>
                );
              })}

              {/* Privacy Boundary Toggle: Mode Privat */}
              <div className="border-t border-zinc-200 dark:border-white/[0.08] my-1" />
              <button
                type="button"
                role="switch"
                aria-checked={isPrivateMode}
                onClick={() => onPrivateModeChange?.(!isPrivateMode)}
                className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-[12px] text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <span className="font-medium">Mode Privat</span>
                <span
                  aria-hidden="true"
                  className={`inline-flex items-center w-7 h-4 rounded-full p-0.5 transition-colors ${
                    isPrivateMode
                      ? "bg-zinc-950 dark:bg-white justify-end"
                      : "bg-zinc-300 dark:bg-zinc-700 justify-start"
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isPrivateMode
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
    </div>
  );
}

export default LanguageToneSelector;
