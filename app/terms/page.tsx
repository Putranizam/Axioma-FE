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
    absolute: "Syarat & Ketentuan — Axioma",
  },
  description:
    "Syarat dan Ketentuan penggunaan platform asisten AI Axioma, mencakup ruang lingkup layanan, batasan akurasi output AI, sistem kuota token harian, larangan penyalahgunaan, dan hak kekayaan intelektual.",
  alternates: {
    canonical: `${PUBLIC_APP_URL}/terms`,
  },
  openGraph: {
    title: "Syarat & Ketentuan — Axioma",
    description:
      "Ketentuan resmi penggunaan layanan asisten cerdas, pemrograman, analisis dokumen, dan kuota token di Axioma.",
    url: `${PUBLIC_APP_URL}/terms`,
    type: "article",
  },
};

export default function TermsPage() {
  return (
    <PublicPageShell
      activePage="terms"
      eyebrow="Ketentuan Penggunaan"
      title="Syarat & Ketentuan"
      subtitle="Ketentuan ini mengatur hak dan kewajiban Anda saat mengakses serta menggunakan seluruh fitur asisten kecerdasan buatan di platform Axioma."
      updatedLabel={PUBLIC_LEGAL_UPDATED_LABEL}
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          1. Penerimaan Ketentuan
        </h2>
        <p>
          Dengan mengakses situs web <strong className="text-text-primary">{PUBLIC_APP_URL}</strong>,
          membuat akun, atau menggunakan fitur percakapan di dalamnya, Anda menyatakan telah membaca,
          memahami, dan menyetujui untuk terikat pada Syarat &amp; Ketentuan ini beserta{" "}
          <Link
            href="/privacy-policy"
            className="font-medium text-text-primary underline underline-offset-4"
          >
            Kebijakan Privasi
          </Link>{" "}
          Axioma. Apabila Anda tidak menyetujui bagian mana pun dari ketentuan ini, mohon hentikan
          penggunaan layanan.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          2. Deskripsi Layanan AI Axioma
        </h2>
        <p>
          Axioma menyediakan ruang kerja kecerdasan buatan terpadu yang membantu pengguna melakukan
          penalaran analitis, penulisan dan peninjauan kode program, pembacaan lampiran dokumen PDF
          maupun gambar, percakapan suara dua arah, pengelolaan konteks proyek, serta pembuatan
          ilustrasi visual. Fitur dan pilihan model dapat berkembang dari waktu ke waktu seiring
          peningkatan kualitas platform.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-border-subtle bg-bg-elevated p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          3. Batasan Tanggung Jawab &amp; Akurasi Output AI
        </h2>
        <p>
          Seluruh jawaban teks, rangkuman dokumen, cuplikan kode, maupun media visual di Axioma
          dihasilkan secara otomatis menggunakan model kecerdasan buatan generatif yang bersifat
          probabilistik. Oleh karena itu:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Output AI <strong className="text-text-primary">dapat mengandung kesalahan faktual, bias,
            ketidaklengkapan, atau informasi yang belum mutakhir</strong>.
          </li>
          <li>
            Jawaban yang diberikan Axioma bukan merupakan nasihat profesional resmi di bidang medis,
            hukum, perpajakan, keuangan, rekayasa keselamatan, atau keamanan sistem kritis.
          </li>
          <li>
            Anda bertanggung jawab penuh untuk melakukan verifikasi mandiri, pengujian ulang kode,
            dan penilaian profesional sebelum menerapkan atau mempublikasikan hasil keluaran dari
            Axioma. Pengelola Axioma tidak bertanggung jawab atas kerugian langsung maupun tidak
            langsung yang timbul akibat ketergantungan penuh tanpa verifikasi atas output AI.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          4. Sistem Kuota Token Harian &amp; Layanan Berbayar
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-text-primary">Kuota Token Harian:</strong> Pengguna terdaftar
            memperoleh alokasi kuota token gratis harian yang dihitung secara dinamis berdasarkan
            jumlah token masukan (<em>prompt</em>) dan keluaran jawaban AI, serta direset secara
            otomatis setiap hari pada pukul <strong>00.00 WIB</strong>. Pengguna <em>Mode Tamu</em>{" "}
            dibatasi pada sejumlah pesan percobaan sebelum diminta menghubungkan akun.
          </li>
          <li>
            <strong className="text-text-primary">Bobot Model &amp; Media:</strong> Setiap profil
            agen atau fitur generasi media visual dapat memiliki bobot pemakaian token yang berbeda
            sesuai beban komputasi yang ditampilkan secara transparan pada menu{" "}
            <em>Setelan → Batas penggunaan</em>.
          </li>
          <li>
            <strong className="text-text-primary">Paket Langganan &amp; Top-Up:</strong> Apabila
            fitur peningkatan kapasitas berbayar (seperti paket Pro atau Top-Up Token Ekstra) telah
            dibuka secara resmi, rincian harga, masa aktif, dan ketentuan pembayaran akan ditampilkan
            dengan jelas sebelum transaksi dikonfirmasi.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          5. Penggunaan yang Dilarang
        </h2>
        <p>Dalam menggunakan Axioma, Anda dilarang keras untuk:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Menggunakan layanan untuk tujuan yang melanggar hukum Republik Indonesia maupun hukum
            internasional yang berlaku, termasuk penipuan, peretasan, pembuatan <em>malware</em>,
            atau penyebaran materi eksploitasi dan kekerasan.
          </li>
          <li>
            Melakukan pengiriman permintaan massal secara otomatis (<em>scraping</em>,{" "}
            <em>flooding</em>, penyalahgunaan API), mengakali pembatasan kuota menggunakan banyak
            akun palsu, atau berupaya melewati perlindungan keamanan Cloudflare Turnstile.
          </li>
          <li>
            Mengunggah dokumen, gambar, atau teks yang melanggar hak cipta, rahasia dagang, maupun
            privasi pihak ketiga tanpa izin yang sah.
          </li>
          <li>
            Mengganggu, membebani secara tidak wajar, atau mencoba mengakses sistem internal dan
            basis data Axioma tanpa otorisasi.
          </li>
        </ul>
        <p>
          Kami berhak membatasi sementara atau menangguhkan akses akun yang terbukti melanggar
          ketentuan keamanan dan kewajaran pemakaian di atas.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          6. Hak Kekayaan Intelektual
        </h2>
        <p>
          Seluruh elemen antarmuka, merek dagang, logo <strong>Axioma</strong>, rancangan visual,
          dan kode sumber aplikasi merupakan milik tim pengembang Axioma dan dilindungi oleh
          ketentuan hak kekayaan intelektual yang berlaku. Anda tetap memegang hak atas materi asli
          yang Anda masukkan sebagai <em>prompt</em> atau lampiran, dengan memberikan izin teknis
          terbatas kepada sistem kami semata-mata untuk memproses permintaan Anda.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          7. Perubahan Ketentuan &amp; Kontak Resmi
        </h2>
        <p>
          Axioma berhak memperbarui Syarat &amp; Ketentuan ini sejalan dengan penambahan fitur baru,
          perubahan kebijakan penyedia model, atau penyesuaian regulasi. Penggunaan berkelanjutan
          atas layanan setelah pembaruan berlaku menandakan persetujuan Anda terhadap ketentuan yang
          diperbarui.
        </p>
        <p>
          Pertanyaan terkait ketentuan layanan ini dapat disampaikan melalui email resmi{" "}
          <a
            href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
            className="font-medium text-text-primary underline underline-offset-4"
          >
            {PUBLIC_CONTACT_EMAIL}
          </a>{" "}
          atau melalui halaman{" "}
          <Link href="/contact" className="font-medium text-text-primary underline underline-offset-4">
            Kontak &amp; Bantuan
          </Link>
          .
        </p>
      </section>
    </PublicPageShell>
  );
}
