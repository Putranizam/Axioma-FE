import type { Metadata } from "next";
import Link from "next/link";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import {
  AXIOMA_APP_VERSION,
  PUBLIC_APP_URL,
  PUBLIC_CONTACT_EMAIL,
} from "@/constants/appInfo";

export const metadata: Metadata = {
  title: {
    absolute: "Tentang Axioma — Ruang Kerja Asisten AI Jernih & Terstruktur",
  },
  description:
    "Mengenal Axioma: platform asisten kecerdasan buatan berbahasa Indonesia untuk penalaran analitis, pemrograman, analisis dokumen, sintesis visual, dan kolaborasi proyek yang cepat serta transparan.",
  alternates: {
    canonical: `${PUBLIC_APP_URL}/about`,
  },
  openGraph: {
    title: "Tentang Axioma — Ruang Kerja Asisten AI Jernih & Terstruktur",
    description:
      "Filosofi, kapabilitas utama, tim pengembang, serta komitmen privasi dan performa di balik platform AI Axioma.",
    url: `${PUBLIC_APP_URL}/about`,
    type: "website",
  },
};

const KEY_CAPABILITIES = [
  {
    title: "Percakapan AI Real-Time (Mode Cepat & Mendalam)",
    description:
      "Streaming respons instan untuk tanya-jawab harian maupun eksplorasi analitis berlapis melalui pilihan profil Axioma Omni, Axioma Pro, dan Axioma Architect.",
  },
  {
    title: "Analisis Dokumen PDF, Gambar, & Pratinjau Kode",
    description:
      "Unggah berkas PDF atau foto untuk dirangkum dan dibedah secara kontekstual, lengkap dengan penyorotan sintaks kode dan Live Preview interaktif.",
  },
  {
    title: "Ruang Proyek & Context Checkpoint",
    description:
      "Kelola instruksi khusus, kunci syarat wajib proyek, dan titik simpan konteks percakapan agar diskusi teknis panjang tetap konsisten dan terarah.",
  },
  {
    title: "Interaksi Suara & Studio Visual Terpadu",
    description:
      "Dukungan pendiktean suara maupun percakapan lisan dua arah yang natural, serta pembuatan ilustrasi visual langsung dari ruang percakapan.",
  },
] as const;

const CREATOR_TEAM = [
  {
    initials: "NR",
    name: "Muhammad Nizam Putra Rasya",
    role: "Lead Developer & System Architect",
  },
  {
    initials: "RR",
    name: "Muhammad Rendy Ramadhani",
    role: "Frontend UI/UX & Cross-Device Engineer",
  },
  {
    initials: "DR",
    name: "Desbellion Seccar Ramis",
    role: "AI Prompt Specialist & Quality Assurance",
  },
] as const;

export default function AboutPage() {
  return (
    <PublicPageShell
      activePage="about"
      eyebrow={`Profil Platform · ${AXIOMA_APP_VERSION}`}
      title="Tentang Axioma"
      subtitle="Ruang kerja kecerdasan buatan yang dirancang agar proses berpikir, menulis kode, menganalisis dokumen, dan menyusun solusi terasa jernih, ringan, serta terstruktur."
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          Makna &amp; Filosofi Axioma
        </h2>
        <p>
          Nama <strong className="text-text-primary">Axioma</strong> berangkat dari istilah{" "}
          <em>aksioma</em>—sebuah landasan pemikiran dasar yang jernih dan menjadi titik bertolak
          bagi penalaran logis. Di tengah banyaknya antarmuka aplikasi AI yang terasa padat dan
          membingungkan, Axioma dibangun dengan prinsip kesederhanaan editorial: menyingkirkan
          gangguan visual yang tidak perlu agar fokus pengguna tetap tertuju pada substansi gagasan,
          akurasi argumen, dan ketepatan eksekusi.
        </p>
        <p>
          Baik saat Anda sedang merancang arsitektur perangkat lunak, menelaah literatur akademik
          dalam berkas PDF, menyusun draf tulisan profesional, maupun berdiskusi santai dalam bahasa
          Indonesia dan bahasa daerah, Axioma menyesuaikan gaya komunikasi secara alami sesuai
          konteks kebutuhan Anda.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          Kapabilitas Utama
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {KEY_CAPABILITIES.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border-subtle bg-bg-elevated p-4 sm:p-5 space-y-1.5"
            >
              <h3 className="text-[15px] font-semibold leading-snug text-text-primary">
                {item.title}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-text-muted">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          Komitmen Transparansi, Privasi, &amp; Performa Ringan
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-text-primary">Kuota Token yang Transparan:</strong> Axioma
            menampilkan pemakaian token harian secara terbuka melalui diagram persentase dan rincian
            komposisi <em>Prompt (Input)</em> dibandingkan <em>Jawaban AI (Output)</em> yang direset
            otomatis setiap pukul 00.00 WIB.
          </li>
          <li>
            <strong className="text-text-primary">Kendali Privasi di Tangan Pengguna:</strong>{" "}
            Lampiran gambar dibersihkan dari metadata lokasi EXIF langsung di peramban sebelum
            dikirim, dan seluruh riwayat percakapan dapat dihapus kapan saja secara mandiri melalui
            menu Setelan.
          </li>
          <li>
            <strong className="text-text-primary">Cepat di Segala Perangkat:</strong> Antarmuka
            Axioma dioptimalkan dengan pemuatan komponen bertahap (<em>code-splitting</em>) dan
            dukungan penuh area aman layar ponsel modern sehingga tetap responsif baik di desktop
            maupun peramban seluler.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          Tim Pengembang
        </h2>
        <div className="divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-bg-elevated px-4 sm:px-5">
          {CREATOR_TEAM.map((member) => (
            <div key={member.initials} className="py-3.5 flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-bg-surface border border-border-subtle text-xs font-semibold text-text-primary flex items-center justify-center shrink-0 select-none">
                {member.initials}
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-text-primary leading-snug">
                  {member.name}
                </div>
                <div className="text-xs text-text-muted leading-snug mt-0.5">
                  {member.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-bg-surface/60 p-5 sm:p-6 space-y-2">
        <h2 className="text-base font-semibold text-text-primary">
          Hubungi Tim Axioma
        </h2>
        <p className="text-[13.5px] leading-relaxed text-text-muted">
          Punya masukan fitur, pertanyaan kemitraan, atau laporan teknis? Silakan hubungi kami
          melalui email{" "}
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
