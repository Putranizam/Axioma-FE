import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appBaseUrl = (() => {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
})();

const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export const metadata: Metadata = {
  metadataBase: appBaseUrl,
  robots: allowIndexing
    ? {
        index: true,
        follow: true,
      }
    : {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
        },
      },
  title: {
    default: "Axioma — Asisten AI Cerdas untuk Analisis, Penulisan & Pemrograman",
    template: "%s",
  },
  description:
    "Axioma adalah ruang kerja asisten AI cerdas berbahasa Indonesia untuk penalaran strategis, penulisan profesional, eksplorasi ide, dan arsitektur perangkat lunak.",
  applicationName: "Axioma",
  openGraph: {
    title: "Axioma — Ruang Kerja Agen AI Cerdas",
    description:
      "Selesaikan riset, analisis mendalam, penulisan dokumen, dan perancangan kode lebih cepat bersama asisten AI berbahasa Indonesia.",
    url: "/",
    siteName: "Axioma",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Axioma — Ruang Kerja Agen AI Cerdas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Axioma — Ruang Kerja Agen AI Cerdas",
    description:
      "Asisten AI berbahasa Indonesia untuk analisis strategis, penulisan profesional, dan arsitektur perangkat lunak.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/brand/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var m=window.matchMedia("(prefers-color-scheme: dark)");function apply(){var t=localStorage.getItem("axioma_theme");var isDark=t==="dark"||((!t||t==="system")&&m.matches);if(isDark){d.classList.add("dark");d.classList.remove("light");}else{d.classList.remove("dark");d.classList.add("light");}}apply();if(m&&m.addEventListener){m.addEventListener("change",function(){var t=localStorage.getItem("axioma_theme");if(!t||t==="system"){apply();}});}else if(m&&m.addListener){m.addListener(function(){var t=localStorage.getItem("axioma_theme");if(!t||t==="system"){apply();}});}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className="h-full w-full overflow-hidden bg-bg-primary text-text-primary font-sans antialiased selection:bg-border-strong selection:text-text-primary"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
