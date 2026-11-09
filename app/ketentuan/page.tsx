import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Ketentuan Layanan (Draf) — Axioma",
  description:
    "Ketentuan Layanan penggunaan asisten AI Axioma, batasan tanggung jawab akurasi AI, dan aturan penggunaan yang wajar.",
};

export default function KetentuanPage() {
  return (
    <main className="h-full w-full overflow-y-auto bg-bg-primary text-text-secondary font-sans antialiased selection:bg-border-strong selection:text-text-primary">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Axioma</span>
          </Link>
          <div className="flex items-center gap-2">
            <Image
              src="/brand/axioma-logo.png"
              alt="Axioma"
              width={28}
              height={28}
              className="w-7 h-7 object-contain rounded-lg shrink-0 dark:ring-1 dark:ring-white/10"
              priority
            />
            <span className="text-xs font-semibold uppercase tracking-tight text-text-primary">
              Axioma
            </span>
          </div>
        </div>

        {/* Draft Review Banner */}
        <div
          role="note"
          className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 flex items-start gap-3 shadow-xs"
        >
          <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs leading-relaxed">
            <p className="font-semibold text-amber-950 dark:text-amber-100">
              DRAF DOKUMEN — Perlu Ditinjau Sebelum Publikasi Resmi
            </p>
            <p className="text-amber-900/90 dark:text-amber-200/90 font-normal">
              Dokumen Ketentuan Layanan ini merupakan draf awal untuk kesiapan produksi. Harap
              tinjau dan sesuaikan klausul hukum serta yurisdiksi sebelum layanan dipublikasikan.
            </p>
          </div>
        </div>

        {/* Title */}
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary">
            Ketentuan Layanan Axioma
          </h1>
          <p className="text-xs text-text-muted">
            Terakhir diperbarui: 9 November 2026 · Status: Draf Peninjauan
          </p>
        </header>

        {/* Content Sections */}
        <div className="space-y-6 text-sm leading-relaxed text-text-secondary">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-text-primary">
              1. Penerimaan Ketentuan
            </h2>
            <p>
              Dengan mengakses dan menggunakan Axioma, Anda menyetujui Ketentuan Layanan ini serta{" "}
              <Link href="/privasi" className="text-text-primary underline underline-offset-4">
                Kebijakan Privasi
              </Link>{" "}
              kami.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-text-primary">
              2. Sifat Layanan &amp; Keterbatasan Akurasi AI
            </h2>
            <p>
              Axioma menggunakan model bahasa besar (Google Gemini) untuk menghasilkan teks,
              analisis, dan kode secara otomatis. Respons yang dihasilkan oleh AI bersifat
              probabilistik dan <strong className="text-text-primary">dapat mengandung ketidakakuratan atau kesalahan</strong>.
              Jawaban Axioma tidak menggantikan nasihat profesional di bidang hukum, medis,
              keuangan, atau keamanan kritis. Anda wajib memeriksa kembali informasi atau kode
              penting sebelum menerapkannya.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-text-primary">
              3. Penggunaan yang Diperbolehkan &amp; Pembatasan Kuota
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
              <li>
                Anda setuju untuk tidak menggunakan Axioma untuk aktivitas melanggar hukum,
                pembuatan konten berbahaya, serangan siber, atau penyalahgunaan otomatis (<em>bot scraping</em>).
              </li>
              <li>
                Untuk menjaga keandalan dan ketersediaan layanan bagi seluruh pengguna, Axioma
                menerapkan batas pengiriman pesan per menit serta kuota harian yang wajar.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-text-primary">
              4. Pengelolaan &amp; Penghapusan Data
            </h2>
            <p>
              Anda bertanggung jawab atas konten yang Anda kirimkan ke dalam percakapan. Anda dapat
              mengganti judul atau menghapus riwayat percakapan Anda kapan saja melalui antarmuka
              aplikasi sebagaimana dijelaskan dalam{" "}
              <Link href="/privasi" className="text-text-primary underline underline-offset-4">
                Kebijakan Privasi
              </Link>
              .
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <footer className="pt-6 border-t border-border-subtle flex flex-wrap items-center justify-between gap-4 text-xs text-text-muted">
          <Link href="/privasi" className="hover:text-text-primary underline underline-offset-4">
            ← Baca Kebijakan Privasi
          </Link>
          <Link
            href="/"
            className="px-3.5 py-2 rounded-xl bg-bg-surface hover:bg-bg-subtle text-text-primary border border-border-subtle transition-colors"
          >
            Kembali ke Ruang Kerja
          </Link>
        </footer>
      </div>
    </main>
  );
}

