"use client";

import React, { memo } from "react";
import { Ellipsis, MessageSquare, Pencil, Trash } from "lucide-react";

export interface SidebarChatRecord {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  last_activity_at?: string;
}

interface SidebarChatItemProps {
  chat: SidebarChatRecord;
  isActive: boolean;
  isMenuOpen: boolean;
  isEditing: boolean;
  editingTitleValue: string;
  relativeTimeLabel: string | null;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  chatMenuContainerRef: React.RefObject<HTMLDivElement | null>;
  chatMenuItemRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  onRegisterTriggerRef: (chatId: string, el: HTMLButtonElement | null) => void;
  onSelect: (chatId: string) => void;
  onToggleMenu: (chatId: string) => void;
  onOpenMenu: (chatId: string) => void;
  onCloseMenu: (chatId: string, restoreFocus?: boolean) => void;
  onStartRename: (chat: SidebarChatRecord) => void;
  onEditingTitleChange: (next: string) => void;
  onSubmitRename: (chatId: string) => void;
  onCancelRename: () => void;
  onDelete: (chat: SidebarChatRecord) => void;
  onMenuArrowKeyDown: (
    e: React.KeyboardEvent,
    items: (HTMLButtonElement | null)[],
    onEscape: () => void
  ) => void;
}

export const SidebarChatItem = memo(function SidebarChatItem({
  chat,
  isActive,
  isMenuOpen,
  isEditing,
  editingTitleValue,
  relativeTimeLabel,
  renameInputRef,
  chatMenuContainerRef,
  chatMenuItemRefs,
  onRegisterTriggerRef,
  onSelect,
  onToggleMenu,
  onOpenMenu,
  onCloseMenu,
  onStartRename,
  onEditingTitleChange,
  onSubmitRename,
  onCancelRename,
  onDelete,
  onMenuArrowKeyDown,
}: SidebarChatItemProps) {
  return (
    <div
      className={`group relative flex items-center min-h-11 md:min-h-0 rounded-lg transition-colors ${
        isActive
          ? "bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-semibold"
          : "text-text-secondary hover:text-text-primary hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
      }`}
    >
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 min-h-11 lg:min-h-0">
          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-icon-muted" />
          <input
            ref={renameInputRef}
            type="text"
            value={editingTitleValue}
            onChange={(e) => onEditingTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmitRename(chat.id);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancelRename();
              }
            }}
            onBlur={() => onSubmitRename(chat.id)}
            aria-label="Ubah judul percakapan"
            className="flex-1 min-w-0 bg-bg-elevated border border-border-strong rounded px-2 py-0.5 text-[16px] sm:text-[15px] lg:text-xs text-text-primary focus:outline-none focus:border-border-strong"
          />
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onSelect(chat.id)}
            title={chat.title}
            className="flex-1 min-w-0 min-h-11 lg:min-h-0 text-left pl-2.5 pr-11 py-2 rounded-lg text-[13px] sm:text-sm tracking-tight flex items-center gap-2.5 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-icon-muted" />
            <div className="min-w-0 flex-1 flex flex-col">
              <span
                className={`truncate ${
                  isActive
                    ? "font-semibold text-text-primary"
                    : "font-medium text-text-secondary group-hover:text-text-primary"
                }`}
              >
                {chat.title}
              </span>
              {relativeTimeLabel && (
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate tabular-nums">
                  {relativeTimeLabel}
                </span>
              )}
            </div>
          </button>

          {/* ⋯ trigger: min 44x44 touch target on mobile/tablet */}
          <button
            ref={(el) => onRegisterTriggerRef(chat.id, el)}
            type="button"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label={`Opsi untuk ${chat.title}`}
            title={`Opsi untuk ${chat.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu(chat.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onOpenMenu(chat.id);
              }
            }}
            className={`absolute right-1 w-11 h-11 min-w-[44px] min-h-[44px] lg:w-7 lg:h-7 lg:min-w-0 lg:min-h-0 p-2 lg:p-1 rounded-md text-icon-muted hover:text-text-primary hover:bg-bg-surface transition-opacity flex items-center justify-center cursor-pointer ${
              isActive || isMenuOpen
                ? "opacity-100"
                : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100"
            }`}
          >
            <Ellipsis className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div
              ref={chatMenuContainerRef}
              role="menu"
              aria-label="Kelola percakapan"
              onKeyDown={(e) =>
                onMenuArrowKeyDown(e, chatMenuItemRefs.current, () =>
                  onCloseMenu(chat.id, true)
                )
              }
              className="absolute right-1 top-full mt-1 z-50 w-40 rounded-xl bg-bg-elevated border border-border-subtle p-1 shadow-2xl space-y-0.5"
            >
              <button
                ref={(el) => {
                  chatMenuItemRefs.current[0] = el;
                }}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRename(chat);
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-surface focus:bg-bg-surface focus:text-text-primary focus:outline-none flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-icon-muted" />
                <span>Ganti nama</span>
              </button>
              <button
                ref={(el) => {
                  chatMenuItemRefs.current[1] = el;
                }}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseMenu(chat.id, false);
                  onDelete(chat);
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40 dark:focus:text-red-300 focus:outline-none flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span>Hapus</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
});
