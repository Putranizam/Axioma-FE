"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Users,
  Send,
  Loader2,
  Copy,
  Check,
  RotateCw,
  FileCheck2,
  Printer,
} from "lucide-react";
import { LanguageCode } from "@/constants/language";
import { exportRoleplayReportPdf } from "@/utils/exportPrintable";

export type RoleplayPersona =
  | "hrd"
  | "dosen_sidang"
  | "pembeli_umkm"
  | "klien_kritis";

interface RoleplayTurn {
  role: "user" | "model";
  text: string;
}

interface RoleplayReport {
  overallScore: number;
  grade: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  actionableTips: string[];
}

const PERSONA_OPTIONS: Array<{
  code: RoleplayPersona;
  label: string;
  desc: string;
  opener: string;
}> = [
  {
    code: "hrd",
    label: "Pewawancara HRD",
    desc: "Studi kasus, kelemahan, & ekspektasi kerja",
    opener:
      "Halo, terima kasih sudah meluangkan waktu untuk wawancara hari ini. Boleh perkenalkan diri Anda secara singkat dan jelaskan kenapa Anda tertarik dengan peran ini?",
  },
  {
    code: "dosen_sidang",
    label: "Dosen Penguji Sidang",
    desc: "Uji metodologi, data, & celah argumen",
    opener:
      "Baik, silakan mulai. Dalam 2–3 kalimat, apa masalah utama yang Anda angkat dan mengapa pendekatan Anda lebih tepat dibanding solusi yang sudah ada?",
  },
  {
    code: "pembeli_umkm",
    label: "Pembeli UMKM",
    desc: "Tawar harga, kualitas, & banding kompetitor",
    opener:
      "Halo kak, mau tanya dulu dong soal produknya. Harganya kok lumayan ya dibanding toko sebelah, kelebihannya apa nih?",
  },
  {
    code: "klien_kritis",
    label: "Klien Kritis",
    desc: "ROI, timeline, risiko, & nilai bisnis",
    opener:
      "Langsung ke intinya saja ya. Kalau kami setuju dengan proposal Anda, hasil konkret apa yang kami dapat dan berapa lama sampai terlihat dampaknya?",
  },
];

export interface RoleplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  backendUrl: string;
  language: LanguageCode;
}

export const RoleplayModal: React.FC<RoleplayModalProps> = ({
  isOpen,
  onClose,
  backendUrl,
  language,
}) => {
  const [stage, setStage] = useState<"setup" | "practice" | "report">("setup");
  const [persona, setPersona] = useState<RoleplayPersona>("hrd");
  const [scenario, setScenario] = useState<string>("");
  const [turns, setTurns] = useState<RoleplayTurn[]>([]);
  const [draftMsg, setDraftMsg] = useState<string>("");
  const [isSendingTurn, setIsSendingTurn] = useState<boolean>(false);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [report, setReport] = useState<RoleplayReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const activePersona =
    PERSONA_OPTIONS.find((p) => p.code === persona) || PERSONA_OPTIONS[0];
  const userTurnCount = turns.filter((t) => t.role === "user").length;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (stage === "practice") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [turns, stage]);

  const handleStartSimulation = useCallback(() => {
    const cleanScenario = scenario.trim();
    if (!cleanScenario) return;
    setErrorMsg(null);
    setReport(null);
    setDraftMsg("");
    setTurns([{ role: "model", text: activePersona.opener }]);
    setStage("practice");
  }, [scenario, activePersona.opener]);

  const handleSendTurn = useCallback(async () => {
    const text = draftMsg.trim();
    if (!text || isSendingTurn || isLoadingReport) return;

    const historySnapshot = [...turns];
    const nextTurns: RoleplayTurn[] = [...turns, { role: "user", text }];
    setTurns(nextTurns);
    setDraftMsg("");
    setIsSendingTurn(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${backendUrl}/api/chat/roleplay/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona,
          scenario: scenario.trim(),
          history: historySnapshot,
          message: text,
          language,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 429 || payload?.code === "RATE_LIMIT_EXCEEDED") {
        throw new Error(
          payload?.message ||
            "Kuota pemakaian sementara tercapai. Coba lagi beberapa saat lagi atau besok."
        );
      }
      const reply =
        typeof payload?.reply === "string"
          ? payload.reply.trim()
          : typeof payload?.data?.reply === "string"
          ? payload.data.reply.trim()
          : "";
      if (!response.ok || !reply) {
        throw new Error(
          payload?.message || payload?.error || "Gagal menerima respons simulasi."
        );
      }
      setTurns((prev) => [...prev, { role: "model", text: reply }]);
    } catch (err: any) {
      setErrorMsg(err?.message || "Kendala koneksi saat simulasi. Coba kirim ulang.");
    } finally {
      setIsSendingTurn(false);
    }
  }, [draftMsg, isSendingTurn, isLoadingReport, turns, backendUrl, persona, scenario, language]);

  const handleFinishAndReport = useCallback(async () => {
    if (userTurnCount < 2 || isLoadingReport || isSendingTurn) return;
    setIsLoadingReport(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${backendUrl}/api/chat/roleplay/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: activePersona.label,
          scenario: scenario.trim(),
          history: turns,
          language,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 429 || payload?.code === "RATE_LIMIT_EXCEEDED") {
        throw new Error(
          payload?.message ||
            "Kuota pemakaian sementara tercapai. Coba lagi beberapa saat lagi atau besok."
        );
      }
      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message || payload?.error || "Gagal menyusun rapor evaluasi."
        );
      }
      const data = payload.data || payload;
      setReport({
        overallScore: typeof data.overallScore === "number" ? data.overallScore : 75,
        grade: typeof data.grade === "string" ? data.grade : "B",
        summary: typeof data.summary === "string" ? data.summary : "",
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
        actionableTips: Array.isArray(data.actionableTips) ? data.actionableTips : [],
      });
      setStage("report");
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal membuat rapor evaluasi.");
    } finally {
      setIsLoadingReport(false);
    }
  }, [
    userTurnCount,
    isLoadingReport,
    isSendingTurn,
    backendUrl,
    activePersona.label,
    scenario,
    turns,
    language,
  ]);

  const handleCopyReport = useCallback(() => {
    if (!report) return;
    const text = [
      `Rapor Simulasi Roleplay — ${activePersona.label}`,
      `Skenario: ${scenario.trim()}`,
      `Skor: ${report.overallScore} · ${report.grade}`,
      "",
      `Ringkasan: ${report.summary}`,
      "",
      "Kelebihan:",
      ...report.strengths.map((s) => `- ${s}`),
      "",
      "Celah:",
      ...report.weaknesses.map((w) => `- ${w}`),
      "",
      "Saran Perbaikan:",
      ...report.actionableTips.map((t) => `- ${t}`),
    ].join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
    }
    setCopiedReport(true);
    window.setTimeout(() => setCopiedReport(false), 1800);
  }, [report, activePersona.label, scenario]);

  const handleResetToSetup = useCallback(() => {
    setStage("setup");
    setTurns([]);
    setReport(null);
    setDraftMsg("");
    setErrorMsg(null);
  }, []);

  // STRICT RULE: Render ZERO overlay/backdrop in DOM when closed
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-white dark:bg-[#0e0e10] md:bg-black/45 md:dark:bg-black/55 md:flex md:items-center md:justify-center md:p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Simulasi Roleplay Axioma"
      onClick={onClose}
    >
      <div
        className="w-full h-[var(--app-height,100dvh)] md:max-w-2xl md:h-auto md:max-h-[86dvh] bg-white dark:bg-[#0e0e10] md:rounded-3xl md:border md:border-zinc-200 dark:md:border-white/[0.08] md:shadow-2xl flex flex-col overflow-hidden"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Users
              className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0"
              strokeWidth={1.5}
            />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
                Simulasi Roleplay
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {stage === "setup"
                  ? "Latihan realistis + rapor evaluasi objektif"
                  : `${activePersona.label} · ${scenario.trim()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {stage === "practice" && (
              <button
                type="button"
                disabled={userTurnCount < 2 || isLoadingReport || isSendingTurn}
                onClick={() => void handleFinishAndReport()}
                title={
                  userTurnCount < 2
                    ? "Kirim minimal 2 balasan untuk melihat rapor"
                    : "Akhiri simulasi dan lihat rapor evaluasi"
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoadingReport ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
                    <span>Menilai...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Akhiri &amp; Lihat Rapor</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Simulasi Roleplay"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Body by Stage */}
        {stage === "setup" && (
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">
            <div className="space-y-2">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Pilih Lawan Simulasi
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERSONA_OPTIONS.map((item) => {
                  const active = persona === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setPersona(item.code)}
                      className={`text-left p-3 rounded-2xl border transition-colors cursor-pointer ${
                        active
                          ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white"
                          : "bg-zinc-50 text-zinc-900 border-zinc-200 hover:bg-zinc-100 dark:bg-white/[0.03] dark:text-zinc-100 dark:border-white/[0.08] dark:hover:bg-white/[0.07]"
                      }`}
                    >
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div
                        className={`text-[11px] mt-0.5 ${
                          active
                            ? "text-zinc-300 dark:text-zinc-700"
                            : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="roleplay-scenario-input"
                className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              >
                Skenario Latihan
              </label>
              <textarea
                id="roleplay-scenario-input"
                rows={2}
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="Contoh: Sidang skripsi sistem rekomendasi / Jualan kopi literan Rp85rb / Wawancara Frontend Engineer..."
                className="w-full rounded-2xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-white/[0.03] px-3.5 py-2.5 text-[16px] md:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-white/25 resize-none transition-colors"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!scenario.trim()}
                onClick={handleStartSimulation}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Mulai Simulasi
              </button>
            </div>
          </div>
        )}

        {stage === "practice" && (
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3">
              {turns.map((turn, idx) => {
                const isUser = turn.role === "user";
                return (
                  <div
                    key={idx}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                          : "bg-zinc-100 text-zinc-900 border border-zinc-200 dark:bg-white/[0.05] dark:text-zinc-100 dark:border-white/[0.08]"
                      }`}
                    >
                      {!isUser && (
                        <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                          {activePersona.label}
                        </div>
                      )}
                      {turn.text}
                    </div>
                  </div>
                );
              })}

              {isSendingTurn && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 bg-zinc-100 dark:bg-white/[0.05]">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 animate-pulse">
                      Menyiapkan skenario...
                    </span>
                  </div>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/[0.1] rounded-xl px-3 py-2 bg-zinc-50 dark:bg-white/[0.03]">
                  {errorMsg}
                </p>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Bottom Input */}
            <div className="shrink-0 px-4 py-3 border-t border-zinc-200 dark:border-white/[0.08] flex items-center gap-2">
              <input
                type="text"
                value={draftMsg}
                onChange={(e) => setDraftMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendTurn();
                  }
                }}
                disabled={isSendingTurn || isLoadingReport}
                placeholder="Tulis jawabanmu..."
                className="flex-1 min-w-0 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-white/[0.03] px-3.5 py-2 text-[16px] md:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-white/25 transition-colors"
              />
              <button
                type="button"
                disabled={!draftMsg.trim() || isSendingTurn || isLoadingReport}
                onClick={() => void handleSendTurn()}
                aria-label="Kirim jawaban simulasi"
                className="w-9 h-9 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 inline-flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </>
        )}

        {stage === "report" && report && (
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
            {/* Score Hero Card */}
            <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] p-5 space-y-2">
              <span className="block text-[10px] font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                RAPOR EVALUASI AKHIR
              </span>
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {report.overallScore}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500 text-xl">·</span>
                <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {report.grade}
                </span>
              </div>
              {report.summary && (
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed pt-1">
                  {report.summary}
                </p>
              )}
            </section>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 space-y-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Kelebihan
                </h3>
                <ul className="space-y-1.5 text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed">
                  {report.strengths.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-700 dark:bg-zinc-300 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 space-y-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Celah
                </h3>
                <ul className="space-y-1.5 text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed">
                  {report.weaknesses.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Actionable Tips */}
            {report.actionableTips.length > 0 && (
              <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] p-4 space-y-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Saran Perbaikan
                </h3>
                <ul className="space-y-1.5 text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed">
                  {report.actionableTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0">
                        {i + 1}.
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  exportRoleplayReportPdf({
                    personaLabel: activePersona.label,
                    scenario: scenario.trim(),
                    overallScore: report.overallScore,
                    grade: report.grade,
                    summary: report.summary,
                    strengths: report.strengths,
                    weaknesses: report.weaknesses,
                    actionableTips: report.actionableTips,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] border border-zinc-200 dark:border-white/[0.08] transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Ekspor PDF</span>
              </button>
              <button
                type="button"
                onClick={handleCopyReport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] border border-zinc-200 dark:border-white/[0.08] transition-colors cursor-pointer"
              >
                {copiedReport ? (
                  <>
                    <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Salin Rapor</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleResetToSetup}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Latihan Lagi</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
