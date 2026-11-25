"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Folder, Plus, X } from "lucide-react";

export interface WorkspaceItem {
  id: string;
  name: string;
  instructions: string;
  createdAt: string;
}

const WORKSPACES_STORAGE_KEY = "axioma_workspaces";
const ACTIVE_WORKSPACE_STORAGE_KEY = "axioma_active_workspace_id";

export function loadWorkspaces(): WorkspaceItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WORKSPACES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (w): w is WorkspaceItem =>
          Boolean(w && typeof w === "object" && typeof w.id === "string" && typeof w.name === "string" && w.name.trim())
      )
      .map((w) => ({
        id: w.id,
        name: w.name.trim(),
        instructions: typeof w.instructions === "string" ? w.instructions.trim() : "",
        createdAt: typeof w.createdAt === "string" ? w.createdAt : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

export function saveWorkspaces(workspaces: WorkspaceItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces));
  } catch {
    // Ignore storage errors
  }
}

export function loadActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function saveActiveWorkspaceId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!id) {
      window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    } else {
      window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, id);
    }
  } catch {
    // Ignore storage errors
  }
}

interface WorkspaceSidebarSectionProps {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string | null;
  collapsed?: boolean;
  onSelectWorkspace: (id: string | null) => void;
  onCreateWorkspace: (name: string, instructions: string) => void;
  onDeleteWorkspace: (id: string) => void;
}

export function WorkspaceSidebarSection({
  workspaces,
  activeWorkspaceId,
  collapsed = false,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
}: WorkspaceSidebarSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [instructionsInput, setInstructionsInput] = useState("");

  if (collapsed) return null;

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim();
    if (!cleanName) return;
    onCreateWorkspace(cleanName, instructionsInput.trim());
    setNameInput("");
    setInstructionsInput("");
    setIsCreating(false);
    setIsExpanded(true);
  };

  return (
    <div className="px-3 pb-2.5 mb-1.5 border-b border-zinc-200/80 dark:border-white/[0.06] shrink-0">
      {/* Collapsible Header */}
      <div className="flex items-center justify-between gap-1 py-1">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer select-none min-w-0"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          )}
          <span className="truncate">Ruang Proyek</span>
          {activeWorkspace && !isExpanded && (
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900/70 dark:bg-white/70 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsExpanded(true);
            setIsCreating((prev) => !prev);
          }}
          aria-label="Buat ruang proyek baru"
          title="Buat ruang proyek baru"
          className="w-6 h-6 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.07] flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-[0.95]"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Compact Active Label when collapsed */}
      {activeWorkspace && !isExpanded && (
        <div className="mt-1 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-200/60 dark:bg-white/[0.06] text-[12px] text-zinc-800 dark:text-zinc-200">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <Folder className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" strokeWidth={1.5} />
            <span className="truncate font-medium">{activeWorkspace.name}</span>
          </span>
          <button
            type="button"
            onClick={() => onSelectWorkspace(null)}
            aria-label="Nonaktifkan ruang proyek"
            title="Keluar dari ruang proyek"
            className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3 h-3" strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Expanded List + Inline Create Form */}
      {isExpanded && (
        <div className="mt-1 space-y-1.5">
          {isCreating && (
            <form
              onSubmit={handleSubmit}
              className="rounded-xl bg-white dark:bg-[#161618] border border-zinc-200/80 dark:border-white/[0.08] p-2.5 space-y-2"
            >
              <input
                type="text"
                maxLength={60}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Nama ruang proyek..."
                className="w-full rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/90 dark:border-white/[0.08] px-2.5 py-1.5 text-[16px] md:text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-white/20"
              />
              <textarea
                rows={2}
                maxLength={600}
                value={instructionsInput}
                onChange={(e) => setInstructionsInput(e.target.value)}
                placeholder="Aturan tetap / konteks proyek (2-3 baris)..."
                className="w-full rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/90 dark:border-white/[0.08] px-2.5 py-1.5 text-[16px] md:text-xs leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none resize-none focus:border-zinc-400 dark:focus:border-white/20"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNameInput("");
                    setInstructionsInput("");
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!nameInput.trim()}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          )}

          {workspaces.length === 0 && !isCreating ? (
            <p className="px-2 py-1 text-[11.5px] text-zinc-500 dark:text-zinc-500">
              Belum ada ruang proyek. Klik + untuk membuat.
            </p>
          ) : (
            <div className="space-y-0.5 max-h-36 overflow-y-auto scrollbar-none">
              {workspaces.map((ws) => {
                const isActive = ws.id === activeWorkspaceId;
                return (
                  <div
                    key={ws.id}
                    className={`group flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors ${
                      isActive
                        ? "bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectWorkspace(isActive ? null : ws.id)}
                      title={ws.instructions || ws.name}
                      className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer"
                    >
                      <Folder className="w-3.5 h-3.5 shrink-0 opacity-75" strokeWidth={1.5} />
                      <span className="truncate">{ws.name}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-900/70 dark:bg-white/70 shrink-0" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteWorkspace(ws.id);
                      }}
                      aria-label={`Hapus ruang ${ws.name}`}
                      title="Hapus ruang"
                      className="p-0.5 rounded text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                    >
                      <X className="w-3 h-3" strokeWidth={1.75} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WorkspaceSidebarSection;
