"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  CircleAlert,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  supabase,
  isSupabaseConfigured,
  SupabaseUser,
  GOOGLE_CLIENT_ID,
  generateNoncePair,
  signInWithGoogleIdToken,
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
      setError(null);
      setSuccessNotice(null);
      setIsLoading(false);
      setTimeout(() => emailInputRef.current?.focus(), 100);
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

  const handleGoogleLogin = async () => {
    if (!supabase || isLoading) return;
    setIsLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const clientId = GOOGLE_CLIENT_ID;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectUri = `${origin}/api/auth/google/callback`;

      const { rawNonce, hashedNonce } = await generateNoncePair();

      // Store rawNonce in session & local storage for cross-page retrieval
      try {
        sessionStorage.setItem("axioma_google_raw_nonce", rawNonce);
        localStorage.setItem("axioma_google_raw_nonce", rawNonce);
      } catch {}

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=id_token&` +
        `scope=${encodeURIComponent("openid email profile")}&` +
        `nonce=${encodeURIComponent(hashedNonce)}&` +
        `prompt=select_account`;

      // Check if user is on mobile
      const isMobile =
        typeof window !== "undefined" &&
        (window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

      if (isMobile) {
        // Direct redirect on mobile avoids Safari/Chrome popup blocker
        window.location.href = authUrl;
        return;
      }

      // Desktop: Open centered popup
      const width = 500;
      const height = 620;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        authUrl,
        "axioma_google_login",
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        // Popup was blocked by browser, fallback to redirect
        window.location.href = authUrl;
        return;
      }

      let completed = false;

      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === "AXIOMA_GOOGLE_AUTH") {
          completed = true;
          window.removeEventListener("message", messageHandler);
          clearInterval(pollTimer);

          const { idToken, error: authErr } = event.data;
          if (authErr) {
            setError(`Gagal masuk dengan Google: ${authErr}`);
            setIsLoading(false);
            return;
          }

          if (idToken) {
            const { user, error: signInErr } = await signInWithGoogleIdToken(idToken, rawNonce);
            if (signInErr) {
              setError(signInErr.message || "Gagal memproses sesi login dengan Google.");
              setIsLoading(false);
              return;
            }
            if (user) {
              onSuccess?.(user);
              onClose();
            }
          }
          setIsLoading(false);
        }
      };

      window.addEventListener("message", messageHandler);

      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener("message", messageHandler);
          setTimeout(() => {
            if (!completed) {
              setIsLoading(false);
            }
          }, 600);
        }
      }, 500);
    } catch (err: any) {
      setError(err?.message || "Gagal masuk dengan Google. Silakan coba lagi.");
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
    } catch (err: any) {
      const msg = err?.message || "Terjadi kesalahan saat autentikasi.";
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-2xl bg-bg-elevated border border-border-strong shadow-2xl overflow-hidden flex flex-col focus:outline-none animate-in fade-in zoom-in-95 duration-150 relative text-text-primary"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-sky-500/20 rounded-xl blur-sm" />
              <Image
                src="/brand/axioma-logo.png"
                alt="Axioma"
                width={32}
                height={32}
                className="relative w-8 h-8 rounded-lg object-contain dark:ring-1 dark:ring-white/10"
              />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-lg font-semibold text-text-primary tracking-tight">
                {tab === "signin" ? "Masuk ke Axioma" : tab === "signup" ? "Buat Akun Axioma" : "Masuk Tanpa Sandi"}
              </h2>
              <p className="text-xs text-text-muted">
                Simpan riwayat percakapan di cloud dengan aman
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Tutup modal masuk"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
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
            className="w-full min-h-[46px] rounded-xl bg-bg-surface hover:bg-bg-subtle text-text-primary border border-border-strong font-medium text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="flex items-center gap-3 my-2" aria-hidden="true">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-[11px] text-text-muted uppercase tracking-wider">atau dengan email</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          {/* Navigation Tabs */}
          <div className="flex rounded-xl bg-bg-surface p-1 border border-border-subtle text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setTab("signin");
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === "signin"
                  ? "bg-bg-elevated text-text-primary shadow-xs font-semibold"
                  : "text-text-muted hover:text-text-primary"
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
                  ? "bg-bg-elevated text-text-primary shadow-xs font-semibold"
                  : "text-text-muted hover:text-text-primary"
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
                  ? "bg-bg-elevated text-text-primary shadow-xs font-semibold"
                  : "text-text-muted hover:text-text-primary"
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
                    className="w-full min-h-[42px] pl-9 pr-3 rounded-xl bg-bg-surface border border-border-subtle text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong transition-all"
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
                  className="w-full min-h-[42px] pl-9 pr-3 rounded-xl bg-bg-surface border border-border-subtle text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong transition-all"
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
                    className="w-full min-h-[42px] pl-9 pr-3 rounded-xl bg-bg-surface border border-border-subtle text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !configured}
              className="w-full min-h-[44px] rounded-xl bg-text-primary text-bg-primary hover:opacity-90 font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
                  <Sparkles className="w-4 h-4 text-blue-400" />
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
        <div className="px-6 py-3.5 bg-bg-surface border-t border-border-subtle text-center">
          <p className="text-[11px] text-text-muted">
            Tetap ingin menggunakan tanpa akun?{" "}
            <button
              type="button"
              onClick={onClose}
              className="text-text-primary underline hover:text-blue-400 transition-colors cursor-pointer font-medium"
            >
              Lanjutkan sebagai Tamu
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

