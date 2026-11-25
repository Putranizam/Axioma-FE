"use client";

import React, { useState, useEffect } from "react";
import { X, RotateCw, Loader2, Check, Trash } from "lucide-react";
import {
  type ConversationCheckpoint,
  type DecisionJournalItem,
  type ChatContextState,
  loadChatContextState,
  saveChatContextState,
  hasActiveChatContext,
} from "@/lib/chatContextStorage";

export {
  type ConversationCheckpoint,
  type DecisionJournalItem,
  type ChatContextState,
  loadChatContextState,
  saveChatContextState,
  hasActiveChatContext,
};

interface ContextCheckpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  backendUrl: string;
  messages: Array<{ role: string; content: string }>;
  contextState: ChatContextState;
  onUpdateContextState: (next: ChatContextState) => void;
}

export function ContextCheckpointModal({
  isOpen,
  onClose,
  backendUrl,
  messages,
  contextState,
  onUpdateContextState,
}: ContextCheckpointModalProps) {
  const [activeTab, setActiveTab] = useState<"checkpoint" | "decisions">("checkpoint");
  const [isGeneratingCheckpoint, setIsGeneratingCheckpoint] = useState(false);
  const [isExtractingDecision, setIsExtractingDecision] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState(
    contextState.contextCorrection
  );
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    setCorrectionDraft(contextState.contextCorrection);
  }, [contextState.contextCorrection, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorText(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRefreshCheckpoint = async () => {
    if (isGeneratingCheckpoint || messages.length === 0) return;
    setIsGeneratingCheckpoint(true);
    setErrorText(null);
    try {
      const payloadMessages = messages
        .filter((m) => m.content && m.content.trim())
        .slice(-12);

      const response = await fetch(`${backendUrl}/api/chat/checkpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.error || "Gagal memperbarui checkpoint percakapan.");
      }

      const rawCp = json.data || json;
      const nextCheckpoint: ConversationCheckpoint = {
        summary: typeof rawCp.summary === "string" ? rawCp.summary.trim() : "",
        goal: typeof rawCp.goal === "string" ? rawCp.goal.trim() : "",
        progress: typeof rawCp.progress === "string" ? rawCp.progress.trim() : "",
        decisions: Array.isArray(rawCp.decisions)
          ? rawCp.decisions.filter((d: unknown): d is string => typeof d === "string" && Boolean(d.trim()))
          : [],
        blockers: Array.isArray(rawCp.blockers)
          ? rawCp.blockers.filter((b: unknown): b is string => typeof b === "string" && Boolean(b.trim()))
          : [],
        nextStep: typeof rawCp.nextStep === "string" ? rawCp.nextStep.trim() : "",
        updatedAt: new Date().toISOString(),
      };

      onUpdateContextState({
        ...contextState,
        checkpoint: nextCheckpoint,
      });
    } catch (err: any) {
      setErrorText(err?.message || "Gagal membuat checkpoint. Coba lagi.");
    } finally {
      setIsGeneratingCheckpoint(false);
    }
  };

  const handleExtractDecision = async () => {
    if (isExtractingDecision || messages.length === 0) return;
    setIsExtractingDecision(true);
    setErrorText(null);
    try {
      const payloadMessages = messages
        .filter((m) => m.content && m.content.trim())
        .slice(-8);

      const response = await fetch(`${backendUrl}/api/chat/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.error || "Gagal mengekstrak keputusan dari percakapan.");
      }

      const raw = json.data || json;
      const decisionText = typeof raw.decision === "string" ? raw.decision.trim() : "";
      if (!decisionText) {
        throw new Error("Belum ditemukan keputusan jelas dari percakapan terakhir.");
      }

      const today = new Date().toISOString().slice(0, 10);
      const newEntry: DecisionJournalItem = {
        id: `dec-${Date.now()}`,
        decision: decisionText,
        reason: typeof raw.reason === "string" ? raw.reason.trim() : "",
        alternatives: Array.isArray(raw.alternatives)
          ? raw.alternatives.filter((a: unknown): a is string => typeof a === "string" && Boolean(a.trim()))
          : [],
        risks: Array.isArray(raw.risks)
          ? raw.risks.filter((r: unknown): r is string => typeof r === "string" && Boolean(r.trim()))
          : [],
        date: today,
      };

      onUpdateContextState({
        ...contextState,
        decisions: [newEntry, ...(contextState.decisions || [])],
      });
    } catch (err: any) {
      setErrorText(err?.message || "Gagal mencatat keputusan. Coba lagi.");
    } finally {
      setIsExtractingDecision(false);
    }
  };

  const handleDeleteDecision = (id: string) => {
    onUpdateContextState({
      ...contextState,
      decisions: (contextState.decisions || []).filter((item) => item.id !== id),
    });
  };

  const handleSaveCorrection = () => {
    const trimmed = correctionDraft.trim();
    onUpdateContextState({
      ...contextState,
      contextCorrection: trimmed,
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  };

  const handleClearCorrection = () => {
    setCorrectionDraft("");
    onUpdateContextState({
      ...contextState,
      contextCorrection: "",
    });
  };

  const cp = contextState.checkpoint;
  const decisions = contextState.decisions || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkpoint-modal-title"
      className="fixed inset-0 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 p-0 md:p-4 z-50 flex items-stretch md:items-center justify-center bg-[#f9f9f8] dark:bg-[#0e0e10] md:bg-transparent md:dark:bg-transparent overflow-hidden font-sans"
    >
      {/* Sibling Dim Backdrop (Desktop only; mobile is solid full-screen edge-to-edge) */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="hidden md:block absolute inset-0 bg-black/40"
      />

      {/* Modal Sheet (Full-Screen on Mobile < md, Centered Card on Desktop >= md) */}
      <div className="relative z-10 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 rounded-none border-0 md:inset-auto md:h-auto md:max-w-[520px] md:max-h-[82dvh] md:rounded-2xl md:border md:border-zinc-200 md:dark:border-white/[0.08] bg-[#f9f9f8] md:bg-white dark:bg-[#0e0e10] md:shadow-2xl flex flex-col overflow-hidden animate-axioma-scale-in">
        {/* Header + 2-Tab Segmented Switch */}
        <div className="shrink-0 px-4 md:px-5 pt-[max(0.875rem,env(safe-area-inset-top))] md:pt-4 pb-3 border-b border-zinc-200 dark:border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="checkpoint-modal-title"
                className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
              >
                Konteks &amp; Keputusan
              </h2>
              <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                Jaga arah percakapan dan catatan keputusan tetap konsisten.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup panel checkpoint"
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:text-zinc-300 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-[0.96]"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* 2 Minimalist Monochrome Tabs: Checkpoint | Keputusan */}
          <div
            role="tablist"
            aria-label="Tab konteks percakapan"
            className="grid grid-cols-2 gap-1 bg-zinc-100 dark:bg-white/[0.05] p-1 rounded-xl"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "checkpoint"}
              onClick={() => {
                setActiveTab("checkpoint");
                setErrorText(null);
              }}
              className={`py-1.5 px-3 text-xs tracking-tight rounded-lg transition-colors cursor-pointer ${
                activeTab === "checkpoint"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-medium"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Checkpoint
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "decisions"}
              onClick={() => {
                setActiveTab("decisions");
                setErrorText(null);
              }}
              className={`py-1.5 px-3 text-xs tracking-tight rounded-lg transition-colors cursor-pointer ${
                activeTab === "decisions"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-medium"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Keputusan{decisions.length > 0 ? ` (${decisions.length})` : ""}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] scrollbar-none px-4 md:px-5 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-5 space-y-5">
          {errorText && (
            <p
              role="alert"
              className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.1] rounded-xl px-3 py-2"
            >
              {errorText}
            </p>
          )}

          {activeTab === "checkpoint" ? (
            <>
              {/* Section 1: Ringkasan & Checkpoint */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 select-none">
                    RINGKASAN &amp; CHECKPOINT
                  </span>
                  <button
                    type="button"
                    disabled={isGeneratingCheckpoint || messages.length === 0}
                    onClick={() => void handleRefreshCheckpoint()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium tracking-tight bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                  >
                    {isGeneratingCheckpoint ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
                    ) : (
                      <RotateCw className="w-3 h-3" strokeWidth={1.75} />
                    )}
                    <span>{isGeneratingCheckpoint ? "Merangkum..." : "Perbarui Checkpoint"}</span>
                  </button>
                </div>

                {cp ? (
                  <div className="space-y-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.08] p-3.5 text-[12.5px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {cp.summary && (
                      <p className="text-zinc-900 dark:text-zinc-100">{cp.summary}</p>
                    )}

                    {cp.goal && (
                      <div>
                        <span className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                          Tujuan
                        </span>
                        <p className="text-zinc-900 dark:text-zinc-100">{cp.goal}</p>
                      </div>
                    )}

                    {cp.progress && (
                      <div>
                        <span className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                          Progres
                        </span>
                        <p>{cp.progress}</p>
                      </div>
                    )}

                    {cp.decisions && cp.decisions.length > 0 && (
                      <div>
                        <span className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                          Keputusan
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                          {cp.decisions.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {cp.blockers && cp.blockers.length > 0 && (
                      <div>
                        <span className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                          Kendala
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                          {cp.blockers.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {cp.nextStep && (
                      <div className="pt-1 border-t border-zinc-200 dark:border-white/[0.08]">
                        <span className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                          Langkah Berikutnya
                        </span>
                        <p className="text-zinc-900 dark:text-zinc-100 font-medium">
                          {cp.nextStep}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-dashed border-zinc-300 dark:border-white/[0.12] px-3.5 py-4 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Belum ada checkpoint untuk percakapan ini. Klik{" "}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      Perbarui Checkpoint
                    </span>{" "}
                    untuk merangkum tujuan, progres, keputusan, dan langkah berikutnya.
                  </div>
                )}
              </section>

              {/* Hairline Divider */}
              <div className="border-t border-zinc-200 dark:border-white/[0.08]" />

              {/* Section 2: Context Correction */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="axioma-context-correction"
                    className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 select-none"
                  >
                    KOREKSI PEMAHAMAN AXIOMA
                  </label>
                  {savedFeedback && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      <Check className="w-3 h-3" strokeWidth={1.75} />
                      Tersimpan
                    </span>
                  )}
                </div>

                <textarea
                  id="axioma-context-correction"
                  rows={3}
                  maxLength={800}
                  value={correctionDraft}
                  onChange={(e) => setCorrectionDraft(e.target.value)}
                  placeholder="Ada yang salah dipahami Axioma? Tulis koreksi singkat di sini..."
                  className="w-full rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.1] focus:border-zinc-400 dark:focus:border-white/25 px-3 py-2.5 text-base md:text-sm leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none resize-none transition-colors"
                />

                <div className="flex items-center justify-end gap-2">
                  {(contextState.contextCorrection || correctionDraft.trim()) && (
                    <button
                      type="button"
                      onClick={handleClearCorrection}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] transition-colors cursor-pointer active:scale-[0.97]"
                    >
                      Hapus
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveCorrection}
                    disabled={correctionDraft.trim() === contextState.contextCorrection.trim()}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                  >
                    Simpan Koreksi
                  </button>
                </div>
              </section>
            </>
          ) : (
            /* Tab 2: Decision Journal */
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 select-none">
                  JURNAL KEPUTUSAN
                </span>
                <button
                  type="button"
                  disabled={isExtractingDecision || messages.length === 0}
                  onClick={() => void handleExtractDecision()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium tracking-tight bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                >
                  {isExtractingDecision ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <RotateCw className="w-3 h-3" strokeWidth={1.75} />
                  )}
                  <span>{isExtractingDecision ? "Mencatat..." : "Catat dari Chat"}</span>
                </button>
              </div>

              {decisions.length > 0 ? (
                <div className="space-y-2.5">
                  {decisions.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.08] p-3.5 space-y-2 text-[12.5px] leading-relaxed text-zinc-700 dark:text-zinc-300"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {item.decision}
                          </p>
                          {item.date && (
                            <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                              {item.date}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDecision(item.id)}
                          aria-label="Hapus catatan keputusan"
                          title="Hapus keputusan"
                          className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
                        >
                          <Trash className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>

                      {item.reason && (
                        <div>
                          <span className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                            Alasan
                          </span>
                          <p>{item.reason}</p>
                        </div>
                      )}

                      {item.alternatives.length > 0 && (
                        <div>
                          <span className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                            Alternatif
                          </span>
                          <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                            {item.alternatives.map((alt, i) => (
                              <li key={i}>{alt}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.risks.length > 0 && (
                        <div>
                          <span className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                            Risiko
                          </span>
                          <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                            {item.risks.map((risk, i) => (
                              <li key={i}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-dashed border-zinc-300 dark:border-white/[0.12] px-3.5 py-4 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Belum ada keputusan tercatat. Klik{" "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    Catat dari Chat
                  </span>{" "}
                  untuk mengekstrak keputusan utama beserta alasan, alternatif, dan risikonya secara otomatis.
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContextCheckpointModal;
