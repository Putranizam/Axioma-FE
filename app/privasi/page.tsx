import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Kebijakan Privasi (Draf) — Axioma",
  description:
    "Kebijakan Privasi Axioma terkait pemrosesan pesan melalui Google Gemini, penyimpanan data percakapan, dan hak penghapusan data pengguna.",
};

export default function PrivasiPage() {
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
              Dokumen Kebijakan Privasi ini merupakan draf awal untuk kesiapan produksi. Harap
              tinjau dan sesuaikan nama entitas pengelola, alamat kontak resmi, serta kebijakan
              retensi sesuai kebutuhan hukum organisasi Anda.
            </p>
          </div>
        </div>

        {/* Title */}
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary">
            Kebijakan Privasi Axioma
          </h1>
          <p className="text-xs text-text-muted">
            Terakhir diperbarui: 9 November 2026 · Status: Draf Peninjauan
          </p>
        </header>

        {/* Content Sections */}
        <div className="space-y-6 text-sm leading-relaxed text-text-secondary">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-text-primary">
              1. Ringkasan Pemrosesan Data
            </h2>
            <p>
              Axioma adalah layanan asisten kecerdasan buatan (AI) interaktif. Saat Anda mengirim
              pesan di Axioma, data Anda diproses untuk menghasilkan jawaban yang relevan dan
              menyimpan riwayat percakapan Anda agar dapat diakses kembali.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-text-primary">
              2. Data yang Kami Kumpulkan dan Simpan
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
              <li>
                <strong className="text-text-primary">Isi Percakapan &amp; Pesan:</strong> Teks
                pertanyaan yang Anda kirimkan, balasan AI, judul percakapan, serta mode asisten yang
                dipilih (Axioma Pro, Axioma Omni, atau Axioma Architect) disimpan secara aman di
                peladen awan terisolasi kami dengan perlindungan akses ketat.
              </li>
              <li>
                <strong className="text-text-primary">Lampiran Foto &amp; Dokumen:</strong> Saat
                Anda melampirkan berkas gambar (JPG, PNG, WebP, HEIC) atau dokumen PDF untuk dianalisis
                oleh AI, gambar diproses secara lokal di peramban Anda untuk mengompresi ukuran dan
                menghapus metadata EXIF sensitif (termasuk koordinat lokasi GPS). Berkas disimpan di
                penyimpanan awan privat dan hanya dapat diakses melalui tautan bertanda tangan (signed URL)
                dengan masa kedaluwarsa 10 menit.
              </li>
              <li>
                <strong className="text-text-primary">Masukan Kualitas (Feedback 👍/👎):</strong>{" "}
                Penilaian suka/tidak suka beserta catatan opsional yang Anda berikan pada balasan AI
                disimpan secara internal untuk membantu meningkatkan mutu dan akurasi jawaban asisten.
              </li>
              <li>
                <strong className="text-text-primary">Penyimpanan Peramban &amp; Identitas Sesi:</strong>{" "}
                Riwayat percakapan tersimpan untuk perangkat &amp; peramban ini. Pengenal sesi aman (user ID)
                disimpan di penyimpanan lokal peramban (localStorage) untuk menautkan riwayat obrolan Anda tanpa memerlukan
                pendaftaran akun manual. <em>Penting: Menghapus data peramban (clear site data / cache) pada perangkat ini akan
                menghilangkan pengenal sesi dan menghilangkan akses Anda ke riwayat percakapan sebelumnya.</em> Preferensi
                tampilan (mode tema, draf pesan belum terkirim, dan model bawaan) juga disimpan di peramban ini.
              </li>
              <li>
                <strong className="text-text-primary">Data Teknis &amp; Keamanan:</strong> Alamat IP
                dan catatan waktu permintaan digunakan secara terbatas untuk melindungi sistem dari
                penyalahgunaan dan menjaga kelancaran akses bersama.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-text-primary">
              3. Pengiriman Pesan ke Google Gemini
            </h2>
            <p>
              Untuk menghasilkan balasan AI, teks pesan Anda beserta konteks riwayat percakapan
              terkait dikirimkan melalui koneksi terenkripsi (HTTPS) dari peladen Axioma ke{" "}
              <strong className="text-text-primary">Google Gemini</strong> (Google LLC). Jangan
              memasukkan informasi rahasia yang sangat sensitif (seperti kata sandi, kunci privat,
              nomor kartu pembayaran, atau data medis rahasia) ke dalam ruang percakapan.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-text-primary">
              4. Cara Menghapus Data Anda
            </h2>
            <p>
              Anda memegang kendali penuh atas riwayat percakapan Anda di Axioma dan dapat
              menghapusnya kapan saja secara mandiri:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
              <li>
                <strong className="text-text-primary">Menghapus Satu Percakapan:</strong> Arahkan
                kursor ke judul percakapan di bilah sisi (sidebar), klik ikon opsi{" "}
                <code className="px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-xs text-text-primary">
                  ⋯
                </code>
                , lalu pilih <strong>Hapus</strong>. Percakapan, seluruh pesan, dan berkas fisik lampiran (foto/PDF) di dalamnya
                akan dihapus secara permanen dari basis data dan penyimpanan awan.
              </li>
              <li>
                <strong className="text-text-primary">Menghapus Semua Percakapan:</strong> Klik menu
                profil di pojok kiri bawah bilah sisi, lalu pilih{" "}
                <strong>Hapus semua percakapan</strong> dan konfirmasi. Seluruh percakapan, pesan, dan
                seluruh berkas fisik lampiran akan dihapus secara bersih dari sistem tanpa menyisakan data yatim.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-text-primary">
              5. Keamanan Data
            </h2>
            <p>
              Seluruh komunikasi antara peramban Anda, peladen Axioma, dan Google Gemini terenkripsi
              standar industri (HTTPS/TLS). Sistem menerapkan kontrol akses ketat sehingga setiap
              pengguna hanya dapat mengakses dan mengelola percakapan miliknya sendiri.
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <footer className="pt-6 border-t border-border-subtle flex flex-wrap items-center justify-between gap-4 text-xs text-text-muted">
          <Link href="/ketentuan" className="hover:text-text-primary underline underline-offset-4">
            Baca Ketentuan Layanan →
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

