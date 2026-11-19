"use client";

import React, { useState, useEffect, useRef } from "react";
import { AxiomaLogoMark } from "./AxiomaLogoMark";
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  CircleAlert,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import {
  supabase,
  isSupabaseConfigured,
  SupabaseUser,
} from "../lib/supabaseClient";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: SupabaseUser) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<"signin" | "signup" | "magiclink">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessNotice(null);
        setIsLoading(false);
        emailInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, tab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const configured = isSupabaseConfigured();

  const handleGoogleLogin = () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessNotice(null);

      const clientId =
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        "664336778701-gqrpatehv6pvliigpdoilk7et8fo0cdi.apps.googleusercontent.com";
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectUri = `${origin}/api/auth/google/callback`;

      // Nonce acak untuk OpenID Connect (karena Skip nonce checks sudah aktif di Supabase)
      const nonce =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15) +
        Date.now().toString(36);

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "id_token",
        scope: "openid email profile",
        nonce: nonce,
        prompt: "select_account",
      });

      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      // Arahkan user langsung ke Google OAuth2 endpoint
      window.location.href = googleAuthUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengarahkan ke login Google.";
      setError(msg);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || isLoading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Silakan masukkan alamat email.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      if (tab === "signin") {
        if (!password) {
          setError("Silakan masukkan kata sandi.");
          setIsLoading(false);
          return;
        }
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) throw signInError;
        if (data.user) {
          onSuccess?.(data.user);
          onClose();
        }
      } else if (tab === "signup") {
        if (!password || password.length < 6) {
          setError("Kata sandi minimal 6 karakter.");
          setIsLoading(false);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim() || undefined,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (data.session && data.user) {
          onSuccess?.(data.user);
          onClose();
        } else {
          setSuccessNotice(
            "Tautan konfirmasi pendaftaran telah dikirim ke email Anda. Silakan periksa kotak masuk."
          );
        }
      } else if (tab === "magiclink") {
        const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            emailRedirectTo: redirectTo,
          },
        });
        if (otpError) throw otpError;
        setSuccessNotice(
          "Tautan masuk (Magic Link) telah dikirim ke email Anda! Buka tautan tersebut untuk masuk otomatis."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat autentikasi.";
      if (msg.includes("Invalid login credentials")) {
        setError("Email atau kata sandi tidak cocok. Silakan periksa kembali.");
      } else if (msg.includes("User already registered")) {
        setError("Email ini sudah terdaftar. Silakan pilih tab 'Masuk'.");
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed top-0 left-0 right-0 w-full h-[var(--app-height)] z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-6 bg-[#fafafa] dark:bg-[#0c0c0e] sm:bg-black/70 sm:dark:bg-black/70 overflow-hidden animate-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="fixed top-0 left-0 right-0 w-full h-[var(--app-height)] overflow-y-auto overscroll-contain touch-auto sm:static sm:w-full sm:h-auto sm:max-h-[90vh] sm:overflow-hidden bg-[#fafafa] dark:bg-[#0c0c0e] sm:max-w-[420px] sm:mx-auto sm:my-auto sm:rounded-2xl sm:bg-white sm:dark:bg-[#141416] sm:border sm:border-zinc-200 sm:dark:border-zinc-800 sm:shadow-2xl sm:p-6 flex flex-col focus:outline-none animate-modal-pop text-text-primary"
      >
        {/* Header (solid, tanpa backdrop-blur, aman di bawah notch / punch-hole) */}
        <div className="shrink-0 flex items-start justify-between gap-3 pt-[calc(var(--safe-top)+16px)] pb-4 px-5 sm:p-0 sm:pb-5 bg-[#fafafa] dark:bg-[#0c0c0e] sm:bg-transparent sm:dark:bg-transparent border-b border-zinc-200/70 dark:border-zinc-800/70 sm:border-b-0">
          <div className="flex items-center gap-3 min-w-0">
            <AxiomaLogoMark className="w-8 h-8 shrink-0" />
            <div className="min-w-0">
              <h2 id="auth-modal-title" className="font-heading text-[18px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-[-0.015em] leading-snug">
                {tab === "signin" ? "Masuk ke Axioma" : tab === "signup" ? "Buat Akun Axioma" : "Masuk Tanpa Sandi"}
              </h2>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Simpan riwayat percakapan di cloud dengan aman
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Tutup modal masuk"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content + Footer Body */}
        <div className="flex-1 sm:min-h-0 sm:overflow-y-auto sm:overscroll-contain touch-auto px-5 sm:px-0 pt-5 pb-[calc(var(--safe-bottom)+20px)] sm:pb-0 space-y-4">
          <div className="space-y-4">
          {!configured && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500 dark:text-amber-400 flex items-start gap-2.5"
            >
              <CircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Kredensial Supabase Belum Terhubung</p>
                <p className="text-[11px] mt-0.5 text-text-muted">
                  Atur <code className="text-amber-300">NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
                  <code className="text-amber-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di environment frontend untuk mengaktifkan login cloud.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-500 dark:text-red-400 flex items-start gap-2 animate-shake"
            >
              <CircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          {successNotice && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-500 dark:text-emerald-400 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{successNotice}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading || !configured}
            className="w-full h-12 rounded-2xl bg-bg-surface hover:bg-bg-subtle dark:bg-[#1e1f22] dark:hover:bg-[#27282b] text-text-primary dark:text-white border border-border-subtle dark:border-white/[0.06] text-[14.5px] font-medium flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Lanjutkan dengan Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1" aria-hidden="true">
            <div className="flex-1 h-px bg-border-subtle dark:bg-white/[0.06]" />
            <span className="text-[11px] text-text-muted uppercase tracking-wider">atau dengan email</span>
            <div className="flex-1 h-px bg-border-subtle dark:bg-white/[0.06]" />
          </div>

          {/* Navigation Tabs */}
          <div className="flex rounded-xl bg-bg-surface dark:bg-[#18181b] p-1 border border-border-subtle dark:border-white/[0.04] text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setTab("signin");
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === "signin"
                  ? "bg-bg-elevated text-text-primary dark:bg-[#27272a] dark:text-white shadow-sm font-medium"
                  : "text-text-muted dark:text-zinc-400 hover:text-text-primary dark:hover:text-zinc-200"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("signup");
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === "signup"
                  ? "bg-bg-elevated text-text-primary dark:bg-[#27272a] dark:text-white shadow-sm font-medium"
                  : "text-text-muted dark:text-zinc-400 hover:text-text-primary dark:hover:text-zinc-200"
              }`}
            >
              Daftar
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("magiclink");
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === "magiclink"
                  ? "bg-bg-elevated text-text-primary dark:bg-[#27272a] dark:text-white shadow-sm font-medium"
                  : "text-text-muted dark:text-zinc-400 hover:text-text-primary dark:hover:text-zinc-200"
              }`}
            >
              Magic Link
            </button>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary">Nama Lengkap</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama Anda"
                    disabled={isLoading}
                    className="w-full h-11 pl-9 pr-3.5 rounded-xl bg-bg-surface dark:bg-[#18181b] border border-border-subtle dark:border-white/[0.06] text-text-primary dark:text-white text-[16px] sm:text-[15px] placeholder:text-text-muted dark:placeholder:text-zinc-500 focus:outline-none focus:border-border-strong dark:focus:border-white/20 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">Alamat Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={emailInputRef}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  disabled={isLoading}
                  autoComplete="email"
                  className="w-full h-11 pl-9 pr-3.5 rounded-xl bg-bg-surface dark:bg-[#18181b] border border-border-subtle dark:border-white/[0.06] text-text-primary dark:text-white text-[16px] sm:text-[15px] placeholder:text-text-muted dark:placeholder:text-zinc-500 focus:outline-none focus:border-border-strong dark:focus:border-white/20 transition-all"
                />
              </div>
            </div>

            {tab !== "magiclink" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-text-secondary">Kata Sandi</label>
                  {tab === "signin" && (
                    <button
                      type="button"
                      onClick={() => setTab("magiclink")}
                      className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      Lupa sandi?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === "signup" ? "Minimal 6 karakter" : "••••••••"}
                    disabled={isLoading}
                    minLength={6}
                    autoComplete={tab === "signup" ? "new-password" : "current-password"}
                    className="w-full h-11 pl-9 pr-3.5 rounded-xl bg-bg-surface dark:bg-[#18181b] border border-border-subtle dark:border-white/[0.06] text-text-primary dark:text-white text-[16px] sm:text-[15px] placeholder:text-text-muted dark:placeholder:text-zinc-500 focus:outline-none focus:border-border-strong dark:focus:border-white/20 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !configured}
              className="w-full h-11 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-medium text-[14.5px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses…</span>
                </>
              ) : tab === "signin" ? (
                <>
                  <span>Masuk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : tab === "signup" ? (
                <>
                  <span>Daftar Akun</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Kirim Tautan Masuk</span>
                  <Mail className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          </div>

          {/* Footer info */}
          <div className="pt-4 mt-5 border-t border-border-subtle dark:border-white/[0.06] text-center">
            <p className="text-[12px] text-text-muted">
              Tetap ingin menggunakan tanpa akun?{" "}
              <button
                type="button"
                onClick={onClose}
                className="text-text-primary underline underline-offset-2 hover:text-blue-400 transition-colors cursor-pointer font-medium"
              >
                Lanjutkan sebagai Tamu
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

