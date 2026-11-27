import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Clock, MessageSquarePlus, ShieldCheck } from "lucide-react";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PUBLIC_APP_URL, PUBLIC_CONTACT_EMAIL } from "@/constants/appInfo";

export const metadata: Metadata = {
  title: {
    absolute: "Kontak & Bantuan — Axioma",
  },
  description:
    "Saluran kontak resmi dan pusat bantuan pengguna Axioma untuk pelaporan kendala teknis, saran pengembangan fitur, serta pertanyaan privasi dan ketentuan layanan.",
  alternates: {
    canonical: `${PUBLIC_APP_URL}/contact`,
  },
  openGraph: {
    title: "Kontak & Bantuan — Axioma",
    description:
      "Hubungi tim pengembang Axioma melalui email resmi atau fitur Kirim Masukan langsung dari dalam aplikasi.",
    url: `${PUBLIC_APP_URL}/contact`,
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <PublicPageShell
      activePage="contact"
      eyebrow="Dukungan & Komunikasi"
      title="Kontak & Bantuan"
      subtitle="Kami terbuka terhadap laporan kendala teknis, masukan pengalaman pengguna, pertanyaan privasi data, maupun peluang kolaborasi."
    >
      {/* Primary Contact Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border-subtle bg-bg-elevated p-5 space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-bg-surface border border-border-subtle flex items-center justify-center text-text-primary">
            <Mail className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <h2 className="text-[15.5px] font-semibold text-text-primary">
            Email Resmi Axioma
          </h2>
          <p className="text-[13.5px] leading-relaxed text-text-muted">
            Untuk pertanyaan akun, permintaan terkait privasi data, kerja sama, atau kendala yang
            memerlukan lampiran tangkapan layar:
          </p>
          <p className="pt-1">
            <a
              href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
              className="inline-flex items-center font-medium text-[14px] text-text-primary underline underline-offset-4 break-all"
            >
              {PUBLIC_CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-bg-elevated p-5 space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-bg-surface border border-border-subtle flex items-center justify-center text-text-primary">
            <Clock className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <h2 className="text-[15.5px] font-semibold text-text-primary">
            Estimasi Waktu Respons
          </h2>
          <p className="text-[13.5px] leading-relaxed text-text-muted">
            Tim kami meninjau pesan masuk setiap hari kerja (Senin–Jumat, pukul 09.00–18.00 WIB) dan
            berupaya membalas dalam waktu <strong className="text-text-primary">1–2 hari kerja</strong>.
          </p>
          <p className="text-xs text-text-muted pt-1">
            Laporan gangguan kritis layanan dan keamanan diprioritaskan lebih awal.
          </p>
        </div>
      </section>

      {/* In-App Feedback Guide */}
      <section className="rounded-2xl border border-border-subtle bg-bg-elevated p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <MessageSquarePlus className="w-4 h-4 text-text-primary shrink-0" strokeWidth={1.75} />
          <h2 className="text-lg font-semibold tracking-tight text-text-primary">
            Melaporkan Bug atau Saran Langsung dari Aplikasi
          </h2>
        </div>
        <p>
          Selain melalui email, Anda dapat mengirimkan masukan produk atau laporan kendala teknis
          secara langsung tanpa keluar dari ruang percakapan:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-[14px]">
          <li>
            Buka aplikasi utama di{" "}
            <Link href="/" className="font-medium text-text-primary underline underline-offset-4">
              Beranda Axioma
            </Link>
            , lalu buka menu <strong>Setelan</strong> melalui panel profil di pojok kiri bawah.
          </li>
          <li>
            Pilih menu <strong>Kirim Masukan</strong> dan tentukan kategori yang sesuai (<em>Saran Fitur</em>,{" "}
            <em>Laporan Bug</em>, <em>Tampilan UI</em>, atau <em>Lainnya</em>).
          </li>
          <li>
            Jelaskan langkah kejadian secara singkat beserta perangkat/peramban yang Anda gunakan
            agar tim pengembang dapat mereproduksi dan memperbaikinya lebih cepat.
          </li>
        </ol>
      </section>

      {/* Quick Legal & Privacy Links */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-text-primary shrink-0" strokeWidth={1.75} />
          <h2 className="text-lg font-semibold tracking-tight text-text-primary">
            Dokumen Hukum &amp; Informasi Terkait
          </h2>
        </div>
        <p>
          Sebelum menghubungi kami mengenai pengelolaan riwayat percakapan, sistem kuota token
          harian, atau pengaturan personalisasi iklan, Anda juga dapat meninjau panduan resmi
          berikut:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <Link
            href="/privacy-policy"
            className="rounded-xl border border-border-subtle bg-bg-elevated hover:bg-bg-surface p-4 transition-colors space-y-1"
          >
            <div className="text-[14px] font-semibold text-text-primary">Kebijakan Privasi</div>
            <p className="text-xs leading-relaxed text-text-muted">
              Pengelolaan data akun, cookie Google AdSense, dan cara menghapus riwayat chat.
            </p>
          </Link>
          <Link
            href="/terms"
            className="rounded-xl border border-border-subtle bg-bg-elevated hover:bg-bg-surface p-4 transition-colors space-y-1"
          >
            <div className="text-[14px] font-semibold text-text-primary">Syarat &amp; Ketentuan</div>
            <p className="text-xs leading-relaxed text-text-muted">
              Aturan pemakaian wajar, batasan akurasi AI, dan mekanisme kuota token harian.
            </p>
          </Link>
          <Link
            href="/about"
            className="rounded-xl border border-border-subtle bg-bg-elevated hover:bg-bg-surface p-4 transition-colors space-y-1"
          >
            <div className="text-[14px] font-semibold text-text-primary">Tentang Axioma</div>
            <p className="text-xs leading-relaxed text-text-muted">
              Visi produk, fitur unggulan ruang kerja AI, dan profil tim pengembang.
            </p>
          </Link>
        </div>
      </section>
    </PublicPageShell>
  );
}
