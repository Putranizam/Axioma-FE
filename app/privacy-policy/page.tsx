import type { Metadata } from "next";
import Link from "next/link";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import {
  PUBLIC_APP_URL,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_LEGAL_UPDATED_LABEL,
} from "@/constants/appInfo";

export const metadata: Metadata = {
  title: {
    absolute: "Kebijakan Privasi — Axioma",
  },
  description:
    "Kebijakan Privasi resmi Axioma mengenai pengumpulan data akun, pemrosesan kecerdasan buatan (AI), penggunaan cookie iklan pihak ketiga (Google AdSense), penyimpanan lokal, dan hak privasi pengguna.",
  alternates: {
    canonical: `${PUBLIC_APP_URL}/privacy-policy`,
  },
  openGraph: {
    title: "Kebijakan Privasi — Axioma",
    description:
      "Informasi transparan tentang cara Axioma mengumpulkan, memproses, melindungi data pengguna, serta pengelolaan cookie dan preferensi iklan.",
    url: `${PUBLIC_APP_URL}/privacy-policy`,
    type: "article",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <PublicPageShell
      activePage="privacy"
      eyebrow="Dokumen Resmi"
      title="Kebijakan Privasi"
      subtitle="Kebijakan ini menjelaskan secara transparan bagaimana Axioma mengumpulkan, menggunakan, menyimpan, dan melindungi informasi Anda saat mengakses layanan asisten AI kami."
      updatedLabel={PUBLIC_LEGAL_UPDATED_LABEL}
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          1. Data yang Kami Kumpulkan
        </h2>
        <p>
          Axioma merancang pengumpulan data secara minimal dan proporsional sesuai fungsi yang Anda
          gunakan di platform <strong className="text-text-primary">{PUBLIC_APP_URL}</strong>:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-text-primary">Informasi Akun &amp; Autentikasi:</strong> Apabila
            Anda masuk menggunakan email atau Google OAuth melalui layanan autentikasi Supabase, kami
            menyimpan pengenal akun unik (User ID), alamat email, dan nama tampilan profil agar
            riwayat percakapan serta kuota token Anda dapat disinkronkan lintas perangkat. Anda juga
            dapat mencoba Axioma melalui <em>Mode Tamu</em> tanpa mendaftarkan akun.
          </li>
          <li>
            <strong className="text-text-primary">Riwayat Percakapan &amp; Masukan:</strong> Teks
            pertanyaan (<em>prompt</em>), jawaban asisten AI, judul sesi percakapan, pilihan model,
            serta masukan kualitas atau formulir <em>Kirim Masukan</em> yang Anda kirimkan disimpan
            untuk menampilkan kembali percakapan Anda dan meningkatkan keandalan layanan.
          </li>
          <li>
            <strong className="text-text-primary">Lampiran Gambar &amp; Dokumen Sementara:</strong>{" "}
            Saat Anda mengunggah gambar (JPG, PNG, WebP, HEIC) atau dokumen PDF untuk dianalisis,
            berkas gambar diproses terlebih dahulu di peramban untuk kompresi ukuran dan penghapusan
            metadata lokasi EXIF/GPS. Berkas disimpan pada ruang penyimpanan privat dan diakses
            menggunakan tautan bertanda tangan (<em>signed URL</em>) berbatas waktu singkat.
          </li>
          <li>
            <strong className="text-text-primary">Log Teknis &amp; Pencatatan Kuota:</strong> Kami
            mencatat informasi teknis dasar seperti alamat IP, jenis peramban, waktu permintaan,
            status kesehatan koneksi, serta jumlah pemakaian token harian (<em>prompt</em> dan{" "}
            <em>output</em>) guna mencegah penyalahgunaan, menerapkan batas pemakaian wajar, dan
            menjaga stabilitas peladen.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          2. Penggunaan Data &amp; Pemrosesan Kecerdasan Buatan (AI)
        </h2>
        <p>
          Data yang dikumpulkan digunakan untuk mengoperasikan fitur inti Axioma, menyajikan balasan
          kontekstual, menjaga keamanan ruang kerja, dan menanggapi kendala teknis pengguna.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-text-primary">Pemrosesan melalui API AI Pihak Ketiga:</strong>{" "}
            Untuk menghasilkan jawaban teks, analisis kode, pemrosesan dokumen, sintesis visual, dan
            interaksi suara, isi pesan serta konteks percakapan yang relevan dikirimkan melalui
            jalur terenkripsi (HTTPS/TLS) dari peladen Axioma ke penyedia infrastruktur model bahasa
            pihak ketiga (termasuk Google Gemini API). Kami menyarankan pengguna untuk tidak
            memasukkan informasi rahasia yang bersifat sangat sensitif seperti kata sandi, kunci
            privat, nomor kartu pembayaran, atau rekam medis rahasia ke dalam kolom percakapan.
          </li>
          <li>
            <strong className="text-text-primary">Perlindungan Keamanan Cloudflare Turnstile:</strong>{" "}
            Axioma menggunakan layanan verifikasi otomatis <strong>Cloudflare Turnstile</strong>{" "}
            untuk membedakan pengguna manusia dari lalu lintas bot berbahaya tanpa mengganggu
            kenyamanan interaksi maupun melacak aktivitas penjelajahan lintas situs untuk tujuan
            pemasaran.
          </li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-border-subtle bg-bg-elevated p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          3. Iklan &amp; Cookie Pihak Ketiga (Google AdSense)
        </h2>
        <p>
          Untuk mendukung keberlanjutan operasional dan penyediaan kuota token gratis harian bagi
          pengguna, Axioma dapat menayangkan iklan yang dikelola oleh jaringan periklanan pihak
          ketiga, termasuk <strong className="text-text-primary">Google AdSense</strong>.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Vendor pihak ketiga, termasuk <strong className="text-text-primary">Google</strong>,
            menggunakan <em>cookie</em> (termasuk cookie periklanan Google) untuk menayangkan iklan
            berdasarkan kunjungan pengguna sebelumnya ke situs web Axioma dan/atau situs web lainnya
            di internet.
          </li>
          <li>
            Penggunaan cookie iklan oleh Google memungkinkan Google dan mitranya menayangkan iklan
            yang lebih relevan bagi Anda berdasarkan kunjungan Anda ke situs ini maupun situs lain
            di internet.
          </li>
          <li>
            <strong className="text-text-primary">Cara Menonaktifkan Personalisasi Iklan:</strong>{" "}
            Anda berhak menonaktifkan penggunaan cookie untuk periklanan yang dipersonalisasi oleh
            Google kapan saja dengan mengunjungi halaman resmi{" "}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-text-primary underline underline-offset-4"
            >
              Pengaturan Iklan Google (adssettings.google.com)
            </a>
            . Sebagai alternatif, Anda juga dapat menonaktifkan penggunaan cookie dari berbagai
            vendor periklanan pihak ketiga lainnya untuk iklan yang dipersonalisasi dengan
            mengunjungi{" "}
            <a
              href="https://www.aboutads.info"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-text-primary underline underline-offset-4"
            >
              www.aboutads.info
            </a>
            .
          </li>
          <li>
            Anda tetap dapat mengatur peramban Anda untuk menolak semua atau sebagian cookie, namun
            penonaktifan cookie esensial autentikasi dapat memengaruhi fungsi masuk akun (login) di
            Axioma.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          4. Penyimpanan Lokal, Keamanan Data, &amp; Hak Pengguna
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-text-primary">Penyimpanan Lokal Peramban (localStorage):</strong>{" "}
            Axioma menyimpan preferensi antarmuka secara lokal pada perangkat Anda, seperti pilihan
            tema Gelap/Terang, draf pesan yang belum dikirim, status notifikasi toast, konfigurasi{" "}
            <em>Ruang Proyek</em>, <em>Context Checkpoint</em>, serta profil singkat lokal yang
            sepenuhnya berada di bawah kendali Anda.
          </li>
          <li>
            <strong className="text-text-primary">Standar Keamanan:</strong> Seluruh lalu lintas data
            antara peramban pengguna, peladen aplikasi, basis data Supabase, dan penyedia model AI
            dienkripsi menggunakan protokol HTTPS/TLS. Basis data kami menerapkan kontrol kepemilikan
            ketat sehingga pengguna hanya dapat membaca atau mengubah riwayat miliknya sendiri.
          </li>
          <li>
            <strong className="text-text-primary">Hak Akses, Koreksi, &amp; Penghapusan Mandiri:</strong>{" "}
            Anda memegang kendali penuh atas data Anda. Anda dapat mengubah nama tampilan kapan saja,
            menghapus percakapan tertentu beserta berkas lampirannya melalui menu opsi pada daftar
            riwayat, atau menghapus seluruh riwayat percakapan sekaligus melalui menu{" "}
            <strong>Setelan → Penyimpanan Riwayat → Hapus Semua</strong>. Untuk permintaan
            penghapusan akun secara menyeluruh, Anda dapat menghubungi tim kami melalui email resmi
            di bawah ini.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          5. Pembaruan Kebijakan &amp; Kontak Privasi
        </h2>
        <p>
          Kebijakan Privasi ini dapat diperbarui sewaktu-waktu apabila terdapat penyesuaian fitur,
          infrastruktur teknis, atau ketentuan regulasi yang berlaku. Tanggal pembaruan terakhir
          selalu dicantumkan pada bagian atas halaman ini.
        </p>
        <p>
          Apabila Anda memiliki pertanyaan, keluhan, atau permintaan terkait perlindungan data
          pribadi dan privasi di Axioma, silakan hubungi kami melalui email{" "}
          <a
            href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
            className="font-medium text-text-primary underline underline-offset-4"
          >
            {PUBLIC_CONTACT_EMAIL}
          </a>{" "}
          atau kunjungi halaman{" "}
          <Link href="/contact" className="font-medium text-text-primary underline underline-offset-4">
            Kontak &amp; Bantuan
          </Link>
          .
        </p>
      </section>
    </PublicPageShell>
  );
}
