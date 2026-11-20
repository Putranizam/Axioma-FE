"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  X,
  Cpu,
  Image as ImageIcon,
  AudioWaveform,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Send,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { AxiomaLogoMark } from "./AxiomaLogoMark";

export const AXIOMA_CREATORS = [
  {
    initials: "NR",
    name: "Muhammad Nizam Putra Rasya",
    role: "Lead Developer & System Architect",
  },
  {
    initials: "RR",
    name: "Muhammad Rendy Ramadhani",
    role: "Frontend UI/UX & Cross-Device Engineer",
  },
  {
    initials: "DR",
    name: "Desbellion Seccar Ramis",
    role: "AI Prompt Specialist & Quality Assurance",
  },
] as const;

export const AXIOMA_ABOUT_SYSTEM_IDENTITY =
  "Axioma Pro (v2.5 Stable) dibuat oleh Muhammad Nizam Putra Rasya, Muhammad Rendy Ramadhani, dan Desbellion Seccar Ramis, dengan kemampuan inti Penalaran & Analisis, Studio Visual Terpadu, Mode Suara Langsung, dan Arsitektur Lintas Perangkat.";

const CORE_CAPABILITIES = [
  {
    id: "reasoning",
    title: "Penalaran & Analisis",
    description:
      "Pemecahan masalah kompleks, penulisan kode, dan sintesis dokumen secara presisi.",
    Icon: Cpu,
  },
  {
    id: "visual",
    title: "Studio Visual Terpadu",
    description:
      "Pembuatan ilustrasi gambar beresolusi tinggi dan render adegan video langsung dari chat.",
    Icon: ImageIcon,
  },
  {
    id: "voice",
    title: "Mode Suara Langsung",
    description:
      "Percakapan suara dua arah yang responsif dan alami layaknya berdiskusi langsung.",
    Icon: AudioWaveform,
  },
  {
    id: "sync",
    title: "Arsitektur Lintas Perangkat",
    description:
      "Sinkronisasi riwayat real-time dengan perlindungan privasi dan tampilan adaptif.",
    Icon: ShieldCheck,
  },
] as const;

const TECH_SPECS = [
  { label: "Engine", value: "Axioma 2.5" },
  { label: "Mode", value: "Multimodal" },
  { label: "Status", value: "Optimal" },
] as const;

const FEEDBACK_CATEGORIES = [
  "Saran Fitur",
  "Laporan Bug",
  "Tampilan UI",
  "Lainnya",
] as const;

type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

interface SettingsHeaderProps {
  title: string;
  onBack: () => void;
  onClose: () => void;
}

function SubViewHeader({ title, onBack, onClose }: SettingsHeaderProps) {
  return (
    <div className="relative z-30 shrink-0 pt-[calc(var(--safe-top)+14px)] sm:pt-4 pb-3 px-5 sm:px-6 bg-[#f9f9f8] sm:bg-white dark:bg-[#0e0e10] dark:sm:bg-[#161618] border-b border-zinc-200/80 dark:border-white/[0.08]">
      <div className="relative flex items-center justify-between w-full min-h-[36px]">
        <button
          type="button"
          onClick={onBack}
          className="relative z-10 inline-flex items-center gap-1.5 py-1 pr-2 -ml-1 rounded-xl text-[14px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white active:scale-95 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          <span>Kembali</span>
        </button>

        <h1
          id="settings-modal-title"
          className="font-heading absolute left-1/2 -translate-x-1/2 text-[18px] font-semibold tracking-[-0.015em] text-zinc-900 dark:text-zinc-100 truncate max-w-[55%]"
        >
          {title}
        </h1>

        <button
          type="button"
          onClick={onClose}
          aria-label={`Tutup ${title}`}
          className="relative z-10 w-9 h-9 rounded-full bg-zinc-200/80 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:hover:text-white active:scale-[0.96] transition flex items-center justify-center cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface AboutSettingsViewProps {
  onBack: () => void;
  onClose: () => void;
  inline?: boolean;
}

export function AboutSettingsView({ onBack, onClose, inline = false }: AboutSettingsViewProps) {
  const content = (
    <>
      {/* a) Hero Banner */}
      <div className={inline ? "pb-6 border-b border-zinc-200/70 dark:border-white/[0.06]" : "relative overflow-hidden rounded-2xl bg-zinc-50/90 dark:bg-[#141416] border border-zinc-200/80 dark:border-zinc-800/80 p-5 text-center"}>
        <div className={inline ? "flex items-center gap-4" : "relative flex flex-col items-center"}>
          <div className={inline ? "shrink-0" : "relative flex items-center justify-center mx-auto mb-3"}>
            <AxiomaLogoMark className={inline ? "w-10 h-10" : "w-12 h-12"} />
          </div>
          <div className={inline ? "min-w-0" : "relative flex flex-col items-center"}>
            <div className={inline ? "flex items-center gap-2.5" : "flex flex-col items-center"}>
              <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-white">
                Axioma Pro
              </h2>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 ${inline ? "" : "mt-1.5"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                <span>v2.5 Stable</span>
              </span>
            </div>
            <p className={`text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed ${inline ? "mt-2" : "mt-3"}`}>
              Platform asisten cerdas generasi baru yang menyatukan penalaran
              analitis tingkat lanjut, eksplorasi kode, sintesis visual, dan
              interaksi suara real-time dalam satu ruang kerja terpadu.
            </p>
          </div>
        </div>
      </div>

      {/* b) Kemampuan Utama */}
      <div className={inline ? "divide-y divide-zinc-200/70 dark:divide-white/[0.06]" : "grid grid-cols-1 sm:grid-cols-2 gap-2.5"}>
        {CORE_CAPABILITIES.map(({ id, title, description, Icon }) => (
          <div
            key={id}
            className={
              inline
                ? "py-4 flex items-start gap-3.5"
                : "p-3.5 rounded-2xl bg-white dark:bg-[#131316] border border-zinc-200/80 dark:border-white/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-none flex items-start gap-3"
            }
          >
            <div className="w-8 h-8 rounded-xl bg-zinc-100/80 dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-zinc-700 dark:text-zinc-300" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium text-zinc-900 dark:text-white leading-snug">
                {title}
              </div>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-snug mt-1">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* c) Kredit Pembuat */}
      <div className={inline ? "pt-4 border-t border-zinc-200/70 dark:border-white/[0.06]" : "p-4 rounded-2xl bg-zinc-50/90 dark:bg-gradient-to-br dark:from-[#16171c] dark:to-[#121215] border border-zinc-200/80 dark:border-white/[0.08]"}>
        <div className="mb-3 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-1 h-3.5 rounded-full bg-zinc-900/75 dark:bg-white/80 shrink-0"
          />
          <span className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 dark:text-zinc-400 uppercase">
            DIBUAT OLEH
          </span>
        </div>

        <div className={inline ? "divide-y divide-zinc-200/70 dark:divide-white/[0.06]" : "flex flex-col gap-2"}>
          {AXIOMA_CREATORS.map((creator) => (
            <div
              key={creator.initials}
              className={
                inline
                  ? "flex items-center gap-3 py-3"
                  : "flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-white/[0.025] border border-zinc-200/70 dark:border-white/[0.05]"
              }
            >
              <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-[#24262b] border border-zinc-200 dark:border-white/[0.1] text-[12px] font-semibold tracking-tight text-zinc-800 dark:text-white flex items-center justify-center shrink-0 select-none">
                {creator.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-zinc-900 dark:text-white leading-snug">
                  {creator.name}
                </div>
                <div className="text-[11.5px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                  {creator.role}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 pt-2.5 border-t border-zinc-200/70 dark:border-white/[0.05] text-[12px] text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
          Dibuat oleh Muhammad Nizam Putra Rasya, Muhammad Rendy Ramadhani, &amp; Desbellion Seccar Ramis
        </p>
      </div>

      {/* d) 3 Spesifikasi Sistem */}
      <div className={inline ? "divide-y divide-zinc-200/70 dark:divide-white/[0.06] border-t border-zinc-200/70 dark:border-white/[0.06]" : "grid grid-cols-3 gap-2 text-center"}>
        {TECH_SPECS.map((spec) => (
          <div
            key={spec.label}
            className={
              inline
                ? "py-3 flex items-center justify-between"
                : "py-2.5 px-2 rounded-xl bg-white dark:bg-[#131316] border border-zinc-200/80 dark:border-white/[0.06]"
            }
          >
            <div className={inline ? "text-[13px] text-zinc-500 dark:text-zinc-400" : "text-[10.5px] text-zinc-500"}>{spec.label}</div>
            <div className="text-[12.5px] font-medium text-zinc-900 dark:text-zinc-200 mt-0.5">
              {spec.value}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-2 flex items-center justify-between text-[11.5px] text-zinc-500">
        <span>© 2026 Axioma</span>
        <span>Hak cipta dilindungi</span>
      </div>

      {!inline && (
        <button
          type="button"
          onClick={onBack}
          className="w-full h-12 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-semibold text-[15px] transition active:scale-[0.98] cursor-pointer"
        >
          Kembali ke Setelan
        </button>
      )}
    </>
  );

  if (inline) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <div className="flex-1 sm:flex-initial min-h-0 w-full flex flex-col overflow-hidden sm:max-h-[85vh] animate-fade-in">
      <SubViewHeader title="Tentang Axioma" onBack={onBack} onClose={onClose} />

      <div className="flex-1 sm:flex-initial min-h-0 overflow-y-auto overscroll-contain touch-auto px-5 sm:px-6 pt-5 pb-[calc(var(--safe-bottom)+28px)] sm:pb-6 space-y-4 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {content}
      </div>
    </div>
  );
}

interface FeedbackSettingsViewProps {
  defaultEmail: string;
  userName: string;
  onBack: () => void;
  onClose: () => void;
  inline?: boolean;
}

export function FeedbackSettingsView({
  defaultEmail,
  userName,
  onBack,
  onClose,
  inline = false,
}: FeedbackSettingsViewProps) {
  const [category, setCategory] = useState<FeedbackCategory>("Saran Fitur");
  const [userEmail, setUserEmail] = useState<string>(defaultEmail);
  const [message, setMessage] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 3) {
      setSubmitError("Mohon tuliskan pesan masukan minimal 3 karakter.");
      return;
    }

    setIsSending(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const deviceInfo =
        typeof navigator !== "undefined" ? navigator.userAgent : "Web Client";
      const finalUserName = userName?.trim() || "Mode Tamu";
      const finalUserEmail = userEmail.trim();

      const supabasePromise = supabase
        ? Promise.resolve(
            supabase.from("feedbacks").insert([
              {
                category,
                message: trimmedMessage,
                user_name: finalUserName,
                user_email: finalUserEmail || null,
                device_info: deviceInfo,
              },
            ])
          )
        : Promise.resolve({ error: new Error("Supabase belum dikonfigurasi") });

      const emailPromise = (async () => {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            message: trimmedMessage,
            userEmail: finalUserEmail,
            userName: finalUserName,
            deviceInfo,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          success?: boolean;
          error?: string;
        } | null;

        if (!res.ok || !data?.success) {
          throw new Error(
            data?.error || `Gagal mengirim email masukan (HTTP ${res.status}).`
          );
        }
        return data;
      })();

      const [supabaseRes, emailRes] = await Promise.allSettled([
        supabasePromise,
        emailPromise,
      ]);

      const supabaseOk =
        supabaseRes.status === "fulfilled" && !supabaseRes.value?.error;

      if (!supabaseOk) {
        console.warn(
          "[Feedback] Supabase insert notice:",
          supabaseRes.status === "rejected"
            ? supabaseRes.reason
            : supabaseRes.value?.error
        );
      }

      const emailOk = emailRes.status === "fulfilled";

      if (!emailOk) {
        console.warn("[Feedback] Email notification notice:", emailRes.reason);
      }

      // Jangan pernah tampilkan error email/SMTP ke pengguna jika data sudah tersimpan di database
      if (!supabaseOk && !emailOk) {
        throw new Error(
          "Gagal mengirim masukan. Periksa koneksi internet Anda lalu coba lagi."
        );
      }

      setSubmitSuccess(true);
      setMessage("");
      setCategory("Saran Fitur");
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Gagal mengirim masukan. Silakan coba lagi."
      );
    } finally {
      setIsSending(false);
    }
  };

  const feedbackBody = (
    <>
      <p className="text-[13.5px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5">
        Bagikan ide fitur baru, masukan desain, atau kendala yang Anda temui agar
        Axioma terus berkembang lebih baik.
      </p>

      {submitSuccess && (
        <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/25 flex items-start gap-3 animate-fade-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[13.5px] text-emerald-800 dark:text-emerald-200 leading-relaxed">
            Terima kasih! Masukan Anda telah dikirim ke tim pengembang Axioma.
          </div>
        </div>
      )}

      {submitError && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/25 flex items-start gap-2.5 text-[13px] text-red-700 dark:text-red-300"
        >
          <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* a) Pilihan Kategori (Grid 2 Kolom Simetris) */}
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-zinc-500 mb-2.5 px-0.5">
            Kategori Masukan
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {FEEDBACK_CATEGORIES.map((item) => {
              const isSelected = category === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setCategory(item);
                    if (submitSuccess) setSubmitSuccess(false);
                  }}
                  className={`h-11 rounded-xl text-[13.5px] font-medium flex items-center justify-center transition active:scale-[0.98] cursor-pointer ${
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-xs"
                      : "bg-white dark:bg-[#131316] text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/[0.07] hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* b) Input Email Pengirim (Opsional) */}
        <div>
          <label
            htmlFor="feedback-user-email"
            className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-zinc-500 mb-2 px-0.5"
          >
            Email (Opsional)
          </label>
          <input
            id="feedback-user-email"
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="Email Anda (opsional, untuk balasan)"
            className="w-full rounded-xl bg-white dark:bg-[#131316] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/25 px-3.5 py-3 text-[16px] md:text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition-colors"
          />
        </div>

        {/* c) Textarea Pesan Masukan */}
        <div>
          <label
            htmlFor="feedback-message-text"
            className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-zinc-500 mb-2 px-0.5"
          >
            Pesan Masukan
          </label>
          <textarea
            id="feedback-message-text"
            required
            rows={5}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (submitError) setSubmitError(null);
              if (submitSuccess) setSubmitSuccess(false);
            }}
            placeholder="Tuliskan saran fitur, masukan desain, atau kendala yang Anda alami..."
            className="w-full min-h-[140px] rounded-2xl bg-white dark:bg-[#131316] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/25 p-4 text-[16px] md:text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none resize-none transition-colors"
          />
        </div>

        {/* d) Tombol Submit */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={isSending || !message.trim()}
            className="w-full h-12 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:disabled:bg-[#27272a] dark:disabled:text-zinc-500 font-semibold text-[15px] disabled:cursor-not-allowed transition flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengirim masukan...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Masukan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );

  if (inline) {
    return <div>{feedbackBody}</div>;
  }

  return (
    <div className="flex-1 sm:flex-initial min-h-0 w-full flex flex-col overflow-hidden sm:max-h-[85vh] animate-fade-in">
      <SubViewHeader title="Kirim Masukan" onBack={onBack} onClose={onClose} />

      <div className="flex-1 sm:flex-initial min-h-0 overflow-y-auto overscroll-contain touch-auto px-5 sm:px-6 pt-5 pb-[calc(var(--safe-bottom)+28px)] sm:pb-6 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {feedbackBody}
      </div>
    </div>
  );
}
