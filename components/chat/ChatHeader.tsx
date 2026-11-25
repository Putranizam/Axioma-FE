"use client";

import React from "react";
import {
  Bookmark,
  Ellipsis,
  Menu,
  PanelLeft,
  PanelLeftClose,
  Settings,
  SquarePen,
  User,
  X,
} from "lucide-react";

interface ChatHeaderProps {
  isVoiceModeOpen: boolean;
  isDesktopSidebarCollapsed: boolean;
  hasMessages: boolean;
  messageCount: number;
  activeChatTitle?: string;
  activeWorkspace?: { name: string; instructions?: string } | null;
  hasActiveContext: boolean;
  isAuthenticated: boolean;
  userName: string;
  headerProfileTriggerRef: React.RefObject<HTMLButtonElement | null>;
  onOpenMobileSidebar: () => void;
  onToggleDesktopSidebar: () => void;
  onCreateNewChat: () => void;
  onOpenCheckpointModal: () => void;
  onToggleProfileDropdown: () => void;
  // Voice mode header controls
  showVoiceTranscript: boolean;
  onToggleVoiceTranscript: () => void;
  isVoiceOptionsMenuOpen: boolean;
  onToggleVoiceOptionsMenu: () => void;
  voiceOptionsMenuRef: React.RefObject<HTMLDivElement | null>;
  voiceNeuralName: "id-ID-ArdiNeural" | "id-ID-GadisNeural";
  onChangeVoiceNeuralName: (name: "id-ID-ArdiNeural" | "id-ID-GadisNeural") => void;
  voiceSpeechRate: number;
  onChangeVoiceSpeechRate: (rate: number) => void;
  onOpenProfileFromVoice: () => void;
  onOpenSettingsFromVoice: () => void;
  onCloseVoiceMode: () => void;
}

export function ChatHeader({
  isVoiceModeOpen,
  isDesktopSidebarCollapsed,
  hasMessages,
  messageCount,
  activeChatTitle,
  activeWorkspace,
  hasActiveContext,
  isAuthenticated,
  userName,
  headerProfileTriggerRef,
  onOpenMobileSidebar,
  onToggleDesktopSidebar,
  onCreateNewChat,
  onOpenCheckpointModal,
  onToggleProfileDropdown,
  showVoiceTranscript,
  onToggleVoiceTranscript,
  isVoiceOptionsMenuOpen,
  onToggleVoiceOptionsMenu,
  voiceOptionsMenuRef,
  voiceNeuralName,
  onChangeVoiceNeuralName,
  voiceSpeechRate,
  onChangeVoiceSpeechRate,
  onOpenProfileFromVoice,
  onOpenSettingsFromVoice,
  onCloseVoiceMode,
}: ChatHeaderProps) {
  const cleanTitle = (activeChatTitle || "").trim();
  const showCenterTitle = hasMessages && Boolean(cleanTitle) && cleanTitle !== "Percakapan Baru";

  return (
    <header className="sticky top-0 shrink-0 w-full flex items-center justify-between pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 px-3 md:relative md:py-0 md:h-14 md:px-4 z-30 bg-[#f9f9f8]/90 dark:bg-[#0e0e10]/90 backdrop-blur-md md:bg-[#f9f9f8] md:dark:bg-[#0e0e10] md:backdrop-blur-none">
      {isVoiceModeOpen ? (
        /* In-Place Voice Mode Header */
        <div className="flex items-center justify-between w-full min-h-[40px] animate-fade-in">
          <div className="flex items-center">
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              className="lg:hidden w-9 h-9 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              aria-label="Buka bilah sisi"
            >
              <Menu className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={onToggleDesktopSidebar}
              title={isDesktopSidebarCollapsed ? "Tampilkan bilah sisi" : "Sembunyikan bilah sisi"}
              aria-label={isDesktopSidebarCollapsed ? "Tampilkan bilah sisi" : "Sembunyikan bilah sisi"}
              className="hidden lg:flex w-9 h-9 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06] active:scale-95 transition-all items-center justify-center cursor-pointer"
            >
              <Menu className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>
          </div>

          <div className="relative" ref={voiceOptionsMenuRef}>
            <div className="bg-zinc-100 border border-zinc-200 dark:bg-[#1e1f22] dark:border-white/[0.08] rounded-full px-3 py-1.5 flex items-center gap-3 shadow-sm">
              <button
                type="button"
                onClick={onToggleVoiceTranscript}
                aria-pressed={showVoiceTranscript}
                title={
                  showVoiceTranscript
                    ? "Sembunyikan teks percakapan"
                    : "Tampilkan teks percakapan"
                }
                aria-label={
                  showVoiceTranscript
                    ? "Sembunyikan teks percakapan"
                    : "Tampilkan teks percakapan"
                }
                className={`p-0.5 rounded-full transition-colors cursor-pointer ${
                  showVoiceTranscript
                    ? "text-zinc-900 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="M7 10h6" />
                  <path d="M7 14h9" />
                  {!showVoiceTranscript && <path d="M3 3l18 18" />}
                </svg>
              </button>

              <button
                type="button"
                onClick={onToggleVoiceOptionsMenu}
                aria-haspopup="menu"
                aria-expanded={isVoiceOptionsMenuOpen}
                title="Opsi Mode Suara"
                aria-label="Opsi Mode Suara"
                className="p-0.5 rounded-full text-zinc-700 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Ellipsis className="w-[18px] h-[18px]" />
              </button>
            </div>

            {isVoiceOptionsMenuOpen && (
              <div
                role="menu"
                aria-label="Opsi Mode Suara"
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-zinc-200 dark:bg-[#1e1f20] dark:border-white/[0.08] p-2 shadow-2xl z-50 space-y-1.5 animate-fade-up"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={onOpenProfileFromVoice}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-zinc-200 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-white/10 flex items-center justify-center text-xs font-semibold shrink-0">
                    {isAuthenticated ? (
                      (userName || "N").trim().charAt(0).toUpperCase()
                    ) : (
                      <User className="w-3.5 h-3.5 text-current" strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">
                      {isAuthenticated ? userName : "Mode Tamu"}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {isAuthenticated ? "Profil Akun" : "Hubungkan Akun"}
                    </div>
                  </div>
                </button>

                <div className="border-t border-zinc-200 dark:border-white/[0.06]" />

                <div className="px-3 py-1.5 space-y-1.5">
                  <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    Suara Axioma
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: "id-ID-ArdiNeural", label: "Ardi" },
                        { id: "id-ID-GadisNeural", label: "Gadis" },
                      ] as const
                    ).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => onChangeVoiceNeuralName(v.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          voiceNeuralName === v.id
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-[#141416] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-3 py-1.5 space-y-1.5">
                  <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    Kecepatan Suara
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[0.95, 1.08, 1.2].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => onChangeVoiceSpeechRate(rate)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          voiceSpeechRate === rate
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-[#141416] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-white/[0.06]" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={onOpenSettingsFromVoice}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>Setelan</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={onCloseVoiceMode}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors text-left cursor-pointer"
                >
                  <X className="w-4 h-4 shrink-0" />
                  <span>Tutup Mode Suara</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Streamlined Minimalist Chat Top Bar (Mobile & Desktop) */
        <div className="min-h-[40px] w-full flex items-center justify-between gap-2 min-w-0">
          {/* Left: Sidebar Toggle + Optional Quiet Workspace Tag */}
          <div className="flex items-center gap-1.5 min-w-0 shrink-0">
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              className="md:hidden w-9 h-9 shrink-0 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06] active:scale-[0.95] transition-all duration-150 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
              aria-label="Buka bilah sisi"
            >
              <Menu className="w-[19px] h-[19px]" strokeWidth={1.75} />
            </button>

            <button
              type="button"
              onClick={onToggleDesktopSidebar}
              title={isDesktopSidebarCollapsed ? "Perluas bilah sisi" : "Ciutkan bilah sisi"}
              aria-label={isDesktopSidebarCollapsed ? "Perluas bilah sisi" : "Ciutkan bilah sisi"}
              className="hidden md:flex w-9 h-9 shrink-0 rounded-xl text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.06] active:scale-[0.95] transition-all duration-150 items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
            >
              {isDesktopSidebarCollapsed ? (
                <PanelLeft className="w-[18px] h-[18px]" strokeWidth={1.6} />
              ) : (
                <PanelLeftClose className="w-[18px] h-[18px]" strokeWidth={1.6} />
              )}
            </button>

            {activeWorkspace && (
              <span
                title={activeWorkspace.instructions || activeWorkspace.name}
                className="hidden sm:inline-flex items-center gap-1.5 max-w-[160px] md:max-w-[200px] px-2.5 py-1 rounded-full bg-zinc-200/60 dark:bg-white/[0.06] text-[11px] font-medium tracking-tight text-zinc-700 dark:text-zinc-300 truncate select-none"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900/70 dark:bg-white/70 shrink-0" />
                <span className="truncate">{activeWorkspace.name}</span>
              </span>
            )}
          </div>

          {/* Center: Clean Truncated Active Chat Title (empty during Empty State) */}
          <div className="flex-1 min-w-0 flex items-center justify-center px-1">
            {showCenterTitle && (
              <span
                title={cleanTitle}
                className="truncate max-w-full text-[13.5px] font-medium tracking-tight text-zinc-700 dark:text-zinc-300 select-none"
              >
                {cleanTitle}
              </span>
            )}
          </div>

          {/* Right: Compact Checkpoint + Mobile New Chat + Mobile Profile */}
          <div className="flex items-center gap-1 shrink-0">
            {messageCount >= 2 && (
              <button
                type="button"
                onClick={onOpenCheckpointModal}
                aria-label="Buka panel konteks dan checkpoint percakapan"
                title="Konteks & Checkpoint"
                className="relative w-9 h-9 md:w-auto md:h-8 md:px-2.5 rounded-xl inline-flex items-center justify-center gap-1.5 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.06] text-xs font-medium tracking-tight transition-colors cursor-pointer active:scale-[0.96] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
              >
                <Bookmark className="w-[17px] h-[17px] md:w-3.5 md:h-3.5 shrink-0" strokeWidth={1.6} />
                <span className="hidden md:inline">Checkpoint</span>
                {hasActiveContext && (
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white shrink-0 max-md:absolute max-md:top-2 max-md:right-2"
                  />
                )}
              </button>
            )}

            {/* Mobile Quick New Chat Icon Button */}
            <button
              type="button"
              onClick={onCreateNewChat}
              title="Sesi Baru"
              aria-label="Mulai percakapan baru"
              className="md:hidden w-9 h-9 shrink-0 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06] active:scale-[0.95] transition-all duration-150 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
            >
              <SquarePen className="w-[18px] h-[18px]" strokeWidth={1.7} />
            </button>

            {/* Mobile Compact Profile Avatar */}
            <button
              ref={headerProfileTriggerRef}
              type="button"
              onClick={onToggleProfileDropdown}
              aria-label="Buka menu profil dan akun"
              title={isAuthenticated ? "Profil Akun" : "Mode Tamu — Hubungkan Akun"}
              className="w-8 h-8 ml-0.5 shrink-0 rounded-full flex md:hidden items-center justify-center cursor-pointer select-none overflow-hidden active:scale-[0.95] transition-all duration-150 text-xs font-semibold uppercase bg-zinc-200/90 hover:bg-zinc-300/80 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
            >
              {isAuthenticated ? (
                <span className="uppercase font-semibold select-none text-[12px]">
                  {(userName || "N").trim().charAt(0).toUpperCase()}
                </span>
              ) : (
                <User className="w-3.5 h-3.5 text-current" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
