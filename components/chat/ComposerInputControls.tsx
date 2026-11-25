"use client";

import React, { memo, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowUp, AudioLines, Loader2, PenLine } from "lucide-react";

export interface SlashCommandItem {
  cmd: string;
  label: string;
}

export interface SlashMenuRuntimeRef {
  matches: SlashCommandItem[];
  selectedIndex: number;
  setSelectedIndex: (next: number) => void;
}

/**
 * Lightweight external store for composer input text.
 * Isolates every keystroke from the parent ChatInterface component so typing
 * triggers ZERO re-renders of messages, sidebar, or modals.
 */
export class ComposerTextStore {
  private value = "";
  private listeners = new Set<() => void>();

  get = (): string => this.value;

  set = (next: string): void => {
    if (this.value === next) return;
    this.value = next;
    for (const listener of this.listeners) {
      listener();
    }
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

interface ComposerTextareaProps {
  store: ComposerTextStore;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  placeholder: string;
  onChangeValue: (nextVal: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onFocusInput?: () => void;
}

export const ComposerTextarea = memo(function ComposerTextarea({
  store,
  textareaRef,
  placeholder,
  onChangeValue,
  onKeyDown,
  onPaste,
  onFocusInput,
}: ComposerTextareaProps) {
  const value = useSyncExternalStore(store.subscribe, store.get, () => "");

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      tabIndex={0}
      enterKeyHint="send"
      autoComplete="off"
      autoCorrect="on"
      spellCheck={true}
      value={value}
      onChange={(e) => onChangeValue(e.target.value)}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onFocus={() => {
        onFocusInput?.();
        if (typeof window !== "undefined" && (window.scrollY !== 0 || window.scrollX !== 0)) {
          window.scrollTo(0, 0);
        }
      }}
      aria-label="Tulis pesan ke Axioma"
      placeholder={placeholder}
      style={{ height: "28px" }}
      className="flex-1 min-w-0 w-full bg-transparent resize-none border-0 outline-none focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-base md:text-sm leading-[1.45] font-normal py-0.5 px-0.5 min-h-[28px] max-h-[140px] overflow-y-auto tracking-normal transition-colors duration-300 ease-out touch-manipulation"
    />
  );
});

interface ComposerSlashMenuProps {
  store: ComposerTextStore;
  commands: SlashCommandItem[];
  runtimeRef: React.MutableRefObject<SlashMenuRuntimeRef>;
  onApplyCommand: (cmd: string) => void;
}

export const ComposerSlashMenu = memo(function ComposerSlashMenu({
  store,
  commands,
  runtimeRef,
  onApplyCommand,
}: ComposerSlashMenuProps) {
  // Selector returns ONLY the active slash token string (or "" when not typing a slash command),
  // so normal typing triggers ZERO re-renders of this component.
  const slashToken = useSyncExternalStore(
    store.subscribe,
    () => {
      const trimmed = store.get().trimStart();
      if (!trimmed.startsWith("/") || trimmed.includes(" ")) return "";
      return trimmed.split(/\s+/)[0].toLowerCase();
    },
    () => ""
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const matches = useMemo(() => {
    if (!slashToken) return [];
    return commands.filter((item) => item.cmd.startsWith(slashToken));
  }, [slashToken, commands]);

  useEffect(() => {
    if (selectedIndex >= matches.length && matches.length > 0) {
      setSelectedIndex(0);
    } else if (matches.length === 0 && selectedIndex !== 0) {
      setSelectedIndex(0);
    }
  }, [matches.length, selectedIndex]);

  runtimeRef.current = {
    matches,
    selectedIndex,
    setSelectedIndex,
  };

  if (matches.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Pintasan perintah cepat"
      className="pointer-events-auto max-w-[720px] mx-auto w-full mb-2 rounded-2xl bg-white dark:bg-[#0e0e10] border border-zinc-200 dark:border-white/[0.08] p-1.5 space-y-0.5 shadow-lg"
    >
      {matches.map((item, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <button
            key={item.cmd}
            type="button"
            role="option"
            aria-selected={isSelected}
            onMouseDown={(e) => {
              e.preventDefault();
              onApplyCommand(item.cmd);
            }}
            onMouseEnter={() => setSelectedIndex(idx)}
            className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
              isSelected
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-medium"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.06]"
            }`}
          >
            <span className="font-mono font-medium">{item.cmd}</span>
            <span
              className={`text-[11px] truncate ${
                isSelected
                  ? "text-zinc-300 dark:text-zinc-700"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
});

interface ComposerEnhanceButtonProps {
  store: ComposerTextStore;
  disabled: boolean;
  isEnhancing: boolean;
  onEnhance: () => void;
}

export const ComposerEnhanceButton = memo(function ComposerEnhanceButton({
  store,
  disabled,
  isEnhancing,
  onEnhance,
}: ComposerEnhanceButtonProps) {
  // Only re-renders when input length crosses the 12-char threshold
  const canShow = useSyncExternalStore(
    store.subscribe,
    () => store.get().trim().length >= 12,
    () => false
  );

  if (!canShow) return null;

  return (
    <button
      type="button"
      disabled={disabled || isEnhancing}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onEnhance}
      title="Rapikan Prompt"
      aria-label="Rapikan Prompt"
      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.07] transition-[color,background-color,transform] duration-150 cursor-pointer active:scale-[0.96] disabled:opacity-45 shrink-0"
    >
      {isEnhancing ? (
        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
      ) : (
        <PenLine className="w-4 h-4" strokeWidth={1.5} />
      )}
    </button>
  );
});

interface ComposerSendOrVoiceButtonProps {
  store: ComposerTextStore;
  hasOtherSendablePayload: boolean;
  isSendDisabled: boolean;
  isOnline: boolean;
  isUploadingAttachment: boolean;
  isSendPressed: boolean;
  onSend: () => void;
  onOpenVoiceMode: () => void;
}

export const ComposerSendOrVoiceButton = memo(function ComposerSendOrVoiceButton({
  store,
  hasOtherSendablePayload,
  isSendDisabled,
  isOnline,
  isUploadingAttachment,
  isSendPressed,
  onSend,
  onOpenVoiceMode,
}: ComposerSendOrVoiceButtonProps) {
  // Only re-renders when trimmed input transitions between empty and non-empty
  const hasTypedText = useSyncExternalStore(
    store.subscribe,
    () => Boolean(store.get().trim()),
    () => false
  );

  const hasUserTextOrAttachments = hasTypedText || hasOtherSendablePayload;

  return (
    <div className="relative w-8 h-8 shrink-0">
      {hasUserTextOrAttachments ? (
        <button
          key="send-btn"
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (!isSendDisabled) {
              onSend();
            }
          }}
          onClick={() => {
            if (!isSendDisabled) {
              onSend();
            }
          }}
          disabled={isSendDisabled}
          title={!isOnline ? "Koneksi internet terputus" : "Kirim pesan"}
          aria-label={!isOnline ? "Koneksi internet terputus" : "Kirim pesan"}
          className={`w-8 h-8 rounded-full flex items-center justify-center animate-axioma-scale-in transition-[color,background-color,transform,opacity] duration-150 select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60 ${
            !isSendDisabled
              ? `bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 active:scale-[0.95] cursor-pointer ${
                  isSendPressed ? "scale-[0.94]" : "scale-100"
                }`
              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-60"
          }`}
        >
          {isUploadingAttachment ? (
            <Loader2 className="w-4 h-4 animate-spin text-current" strokeWidth={1.75} />
          ) : (
            <ArrowUp className="w-4 h-4 text-current" strokeWidth={2.25} />
          )}
        </button>
      ) : (
        <button
          key="vn-btn"
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={onOpenVoiceMode}
          title="Mode Suara (Percakapan langsung)"
          aria-label="Mode Suara (Percakapan langsung)"
          className="w-8 h-8 rounded-full flex items-center justify-center animate-axioma-scale-in bg-zinc-200/75 hover:bg-zinc-300/80 text-zinc-800 dark:bg-white/[0.09] dark:hover:bg-white/[0.15] dark:text-zinc-100 active:scale-[0.95] transition-[color,background-color,transform] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
        >
          <AudioLines className="w-4 h-4" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
});
