"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  X,
  Cpu,
  Image as ImageIcon,
  AudioWaveform,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Loader2,
  Send,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const AXIOMA_CREATORS = [
  { initials: "NR", name: "Muhammad Nizam Putra Rasya" },
  { initials: "RR", name: "Muhammad Rendy Ramadhani" },
] as const;

export const AXIOMA_ABOUT_SYSTEM_IDENTITY =
  "Axioma Pro (v2.5 Stable) dibuat oleh Muhammad Nizam Putra Rasya dan Muhammad Rendy Ramadhani, dengan kemampuan inti Penalaran & Analisis, Studio Visual Terpadu, Mode Suara Langsung, dan Arsitektur Lintas Perangkat.";

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
    <div className="sticky top-0 z-10 shrink-0 bg-[#131314]/95 backdrop-blur-md -mx-5 sm:-mx-6 px-5 sm:px-6 pt-1 pb-3.5 mb-4 border-b border-white/[0.06] flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 -ml-2 rounded-xl text-[13.5px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] active:scale-95 transition cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4 shrink-0" />
        <span>Kembali</span>
      </button>

      <h2 className="text-[16px] font-semibold tracking-tight text-white truncate">
        {title}
      </h2>

      <button
        type="button"
        onClick={onClose}
        aria-label={`Tutup ${title}`}
        className="w-9 h-9 rounded-full bg-[#1e1f20] hover:bg-zinc-700 active:scale-[0.96] transition flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface AboutSettingsViewProps {
  onBack: () => void;
  onClose: () => void;
}

export function AboutSettingsView({ onBack, onClose }: AboutSettingsViewProps) {
  return (
    <div className="flex flex-col animate-fade-in">
      <SubViewHeader title="Tentang Axioma" onBack={onBack} onClose={onClose} />

      {/* a) Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#18181c] to-[#121215] border border-white/[0.07] p-5 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 inset-x-0 mx-auto w-56 h-56 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.16) 0%, transparent 70%)",
          }}
        />

        <div className="relative w-14 h-14 rounded-2xl bg-[#1e1f24] border border-white/[0.1] flex items-center justify-center mx-auto mb-3 shadow-lg p-2.5">
          <Image
            src="/brand/axioma-logo.png"
            alt="Axioma"
            width={36}
            height={36}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="relative flex flex-col items-center">
          <h3 className="text-[20px] font-semibold tracking-tight text-white">
            Axioma Pro
          </h3>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>v2.5 Stable</span>
          </span>

          <p className="text-[13px] text-zinc-400 leading-relaxed mt-2.5">
            Platform asisten cerdas generasi baru yang menyatukan penalaran
            analitis tingkat lanjut, eksplorasi kode, sintesis visual, dan
            interaksi suara real-time dalam satu ruang kerja terpadu.
          </p>
        </div>
      </div>

      {/* b) Bento Grid 4 Kemampuan Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5">
        {CORE_CAPABILITIES.map(({ id, title, description, Icon }) => (
          <div
            key={id}
            className="p-3.5 rounded-2xl bg-[#151518] border border-white/[0.06] flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-zinc-300" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium text-white leading-snug">
                {title}
              </div>
              <p className="text-[12px] text-zinc-400 leading-snug mt-1">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* c) Kartu Kredit Pembuat (Highlight Utama) */}
      <div className="mt-3.5 p-4 rounded-2xl bg-gradient-to-br from-[#18191e] to-[#131316] border border-white/[0.09]">
        <div className="text-[10.5px] font-semibold tracking-[0.08em] text-zinc-400 uppercase mb-3 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>DIBUAT OLEH</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {AXIOMA_CREATORS.map((creator) => (
            <div
              key={creator.initials}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.025] border border-white/[0.05]"
            >
              <div className="w-9 h-9 rounded-full bg-[#24262b] border border-white/[0.1] text-[12px] font-semibold text-white flex items-center justify-center shrink-0">
                {creator.initials}
              </div>
              <div className="text-[13.5px] font-medium text-white leading-snug min-w-0">
                {creator.name}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 pt-2.5 border-t border-white/[0.05] text-[12px] text-zinc-400 text-center">
          Dibuat oleh Muhammad Nizam Putra Rasya &amp; Muhammad Rendy Ramadhani
        </p>
      </div>

      {/* d) Spesifikasi Sistem & Footer */}
      <div className="grid grid-cols-3 gap-2 mt-3.5 text-center">
        {TECH_SPECS.map((spec) => (
          <div
            key={spec.label}
            className="py-2 px-2 rounded-xl bg-[#141417] border border-white/[0.05]"
          >
            <div className="text-[10.5px] text-zinc-500">{spec.label}</div>
            <div className="text-[12.5px] font-medium text-zinc-200 mt-0.5">
              {spec.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-[11.5px] text-zinc-500">
        <span>© 2026 Axioma</span>
        <span>Hak cipta dilindungi</span>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 w-full h-11 rounded-xl bg-white text-black font-medium text-[14px] hover:bg-zinc-200 transition active:scale-[0.98] cursor-pointer"
      >
        Kembali ke Setelan
      </button>
    </div>
  );
}

interface FeedbackSettingsViewProps {
  defaultEmail: string;
  userName: string;
  onBack: () => void;
  onClose: () => void;
}

export function FeedbackSettingsView({
  defaultEmail,
  userName,
  onBack,
  onClose,
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
    if (!trimmedMessage) {
      setSubmitError("Mohon tuliskan pesan masukan Anda terlebih dahulu.");
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

      const emailPromise = fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: trimmedMessage,
          userEmail: finalUserEmail,
          userName: finalUserName,
          deviceInfo,
        }),
      }).then(async (res) => {
        const data = (await res.json().catch(() => null)) as {
          success?: boolean;
          error?: string;
        } | null;
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Gagal mengirim email masukan.");
        }
        return data;
      });

      const [supabaseRes, emailRes] = await Promise.allSettled([
        supabasePromise,
        emailPromise,
      ]);

      const supabaseOk =
        supabaseRes.status === "fulfilled" && !supabaseRes.value?.error;
      const emailOk = emailRes.status === "fulfilled";

      if (!supabaseOk) {
        console.warn(
          "[Feedback] Supabase insert fallback notice:",
          supabaseRes.status === "rejected"
            ? supabaseRes.reason
            : supabaseRes.value?.error
        );
      }
      if (!emailOk) {
        console.warn("[Feedback] Email delivery notice:", emailRes.reason);
      }

      if (!supabaseOk && !emailOk) {
        throw new Error(
          "Gagal mengirim masukan saat ini. Silakan periksa koneksi Anda dan coba lagi."
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

  return (
    <div className="flex flex-col animate-fade-in">
      <SubViewHeader title="Kirim Masukan" onBack={onBack} onClose={onClose} />

      <p className="text-[13px] text-zinc-400 leading-relaxed mb-4">
        Bagikan ide fitur baru, masukan desain, atau kendala yang Anda temui agar
        Axioma terus berkembang lebih baik.
      </p>

      {submitSuccess && (
        <div className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3 animate-fade-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[13.5px] text-emerald-200 leading-relaxed">
            Terima kasih! Masukan Anda telah dikirim ke tim pengembang Axioma.
          </div>
        </div>
      )}

      {submitError && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-[13px] text-red-300"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* a) Pilihan Kategori (4 Pill Monokrom) */}
        <div>
          <div className="text-[12px] font-medium text-zinc-400 mb-2">
            Kategori Masukan
          </div>
          <div className="flex flex-wrap gap-2">
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
                  className={`px-3.5 py-2 rounded-full text-[13px] transition active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-white text-black font-medium shadow-xs"
                      : "bg-[#18181c] text-zinc-400 border border-white/[0.06] hover:text-zinc-200"
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
            className="block text-[12px] font-medium text-zinc-400 mb-1.5"
          >
            Email (Opsional)
          </label>
          <input
            id="feedback-user-email"
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="Email Anda (opsional, untuk balasan)"
            className="w-full rounded-xl bg-[#16161a] border border-white/[0.08] focus:border-white/25 px-3.5 py-2.5 text-[16px] md:text-[14.5px] text-white placeholder:text-zinc-500 outline-none transition-colors"
          />
        </div>

        {/* c) Textarea Pesan Masukan */}
        <div>
          <label
            htmlFor="feedback-message-text"
            className="block text-[12px] font-medium text-zinc-400 mb-1.5"
          >
            Pesan Masukan
          </label>
          <textarea
            id="feedback-message-text"
            required
            rows={4}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (submitError) setSubmitError(null);
              if (submitSuccess) setSubmitSuccess(false);
            }}
            placeholder="Tuliskan saran fitur, masukan desain, atau kendala yang Anda alami..."
            className="w-full rounded-2xl bg-[#16161a] border border-white/[0.08] focus:border-white/25 p-3.5 text-[16px] md:text-[15px] text-white placeholder:text-zinc-500 outline-none resize-none transition-colors"
          />
        </div>

        {/* d) Tombol Submit */}
        <button
          type="submit"
          disabled={isSending || !message.trim()}
          className="w-full h-11 rounded-xl bg-white text-black font-medium text-[14px] hover:bg-zinc-200 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
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
      </form>
    </div>
  );
}
