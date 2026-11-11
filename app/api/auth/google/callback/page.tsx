"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

export default function GoogleAuthCallbackPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState("Menghubungkan ke Axioma...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function handleGoogleCallback() {
      try {
        if (typeof window === "undefined") return;

        // Parse hash fragment (#id_token=...&...)
        const rawHash = window.location.hash || "";
        const hash = rawHash.startsWith("#") ? rawHash.substring(1) : rawHash;
        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(window.location.search);

        const idToken = hashParams.get("id_token") || searchParams.get("id_token");
        const error = hashParams.get("error") || searchParams.get("error");
        const errorDesc =
          hashParams.get("error_description") ||
          searchParams.get("error_description") ||
          error;

        if (error) {
          if (!isCancelled) {
            setErrorMessage(`Autentikasi Google dibatalkan atau gagal: ${errorDesc}`);
          }
          setTimeout(() => {
            if (window.opener && !window.opener.closed) {
              window.close();
            } else {
              window.location.replace("/");
            }
          }, 1500);
          return;
        }

        if (!idToken) {
          // If no token in URL, redirect directly to home
          window.location.replace("/");
          return;
        }

        if (!supabase) {
          if (!isCancelled) {
            setErrorMessage("Koneksi Supabase belum dikonfigurasi.");
          }
          setTimeout(() => {
            window.location.replace("/");
          }, 2000);
          return;
        }

        if (!isCancelled) {
          setStatusMessage("Menyelesaikan autentikasi akun Google...");
        }

        // Authenticate with Supabase Auth using the Google ID Token
        const { error: signInError } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });

        if (signInError) {
          console.error("Supabase signInWithIdToken error:", signInError);
          if (!isCancelled) {
            setErrorMessage(`Gagal masuk ke Supabase: ${signInError.message}`);
          }
          setTimeout(() => {
            window.location.replace("/");
          }, 2500);
          return;
        }

        if (!isCancelled) {
          setStatusMessage("Berhasil! Mengalihkan ke halaman utama...");
        }

        // If opened as a popup, update opener and close
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.location.href = "/";
            window.close();
            return;
          } catch {}
        }

        // Full page redirect back to home
        window.location.replace("/");
      } catch (err: unknown) {
        console.error("Callback exception:", err);
        const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses login.";
        if (!isCancelled) {
          setErrorMessage(errMsg);
        }
        setTimeout(() => {
          window.location.replace("/");
        }, 2000);
      }
    }

    handleGoogleCallback();

    return () => {
      isCancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white p-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        {errorMessage ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <p className="font-semibold mb-1">Gagal Masuk</p>
            <p className="text-xs text-zinc-400">{errorMessage}</p>
            <p className="text-[11px] text-zinc-500 mt-2">Mengalihkan kembali ke halaman utama...</p>
          </div>
        ) : (
          <>
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <h2 className="text-base font-semibold tracking-tight">Masuk dengan Google</h2>
            <p className="text-xs text-zinc-400 mt-1">{statusMessage}</p>
          </>
        )}
      </div>
    </div>
  );
}

