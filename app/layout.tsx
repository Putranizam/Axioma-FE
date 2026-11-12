import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const appBaseUrl = (() => {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "https://axioma.my.id").trim();
  try {
    return new URL(raw);
  } catch {
    return new URL("https://axioma.my.id");
  }
})();

export const metadata: Metadata = {
  metadataBase: appBaseUrl,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: "/",
  },
  title: {
    default: "Axioma — Asisten AI Cerdas untuk Analisis, Penulisan & Pemrograman",
    template: "%s | Axioma",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
      className={`${plusJakartaSans.variable} ${geistMono.variable} dark h-full overflow-hidden`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://axioma-be.onrender.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://axioma-be.onrender.com" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var m=window.matchMedia("(prefers-color-scheme: dark)");function apply(){var t=localStorage.getItem("axioma_theme");var isDark=t==="dark"||((!t||t==="system")&&m.matches);var bg=isDark?"#000000":"#ffffff";var bar=isDark?"black-translucent":"default";if(isDark){d.classList.add("dark");d.classList.remove("light");}else{d.classList.remove("dark");d.classList.add("light");}d.style.backgroundColor=bg;if(document.body){document.body.style.backgroundColor=bg;}var metas=document.querySelectorAll('meta[name="theme-color"]');if(metas.length>0){metas.forEach(function(el){el.removeAttribute("media");el.setAttribute("content",bg);});}else{var el=document.createElement("meta");el.name="theme-color";el.content=bg;document.head.appendChild(el);}var ap=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');if(ap){ap.setAttribute("content",bar);}else{var apel=document.createElement("meta");apel.name="apple-mobile-web-app-status-bar-style";apel.content=bar;document.head.appendChild(apel);}}apply();if(m&&m.addEventListener){m.addEventListener("change",function(){var t=localStorage.getItem("axioma_theme");if(!t||t==="system"){apply();}});}else if(m&&m.addListener){m.addListener(function(){var t=localStorage.getItem("axioma_theme");if(!t||t==="system"){apply();}});}}catch(e){}})();`,
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
