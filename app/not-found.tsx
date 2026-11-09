import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] w-full bg-bg-primary text-text-primary flex flex-col items-center justify-center p-6 font-sans antialiased selection:bg-border-strong selection:text-text-primary">
      <div className="w-full max-w-md rounded-2xl bg-bg-elevated border border-border-subtle p-7 shadow-2xl text-center space-y-6">
        <div className="flex items-center justify-center gap-2.5">
          <Image
            src="/brand/axioma-logo.png"
            alt="Axioma"
            width={32}
            height={32}
            className="w-8 h-8 object-contain rounded-lg shrink-0 dark:ring-1 dark:ring-white/10"
            priority
          />
          <span className="font-semibold text-xs tracking-wider uppercase text-text-primary">
            Axioma
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-bg-surface border border-border-subtle text-text-muted mb-1">
            <Compass className="w-6 h-6" />
          </div>
          <div className="text-xs font-mono uppercase tracking-widest text-text-muted">
            Kesalahan 404
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-text-primary">
            Halaman tidak ditemukan
          </h1>
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
            Maaf, halaman atau tautan yang Anda tuju tidak tersedia, telah dipindahkan, atau alamat URL tidak valid.
          </p>
        </div>

        <div className="pt-1">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-text-primary hover:opacity-90 text-bg-primary text-xs sm:text-sm font-semibold tracking-tight transition-all active:scale-[0.98] shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke beranda</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

