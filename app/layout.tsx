import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ViewportEnvSync } from "@/components/ViewportEnvSync";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500"],
});

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://axioma.my.id")
  .trim()
  .replace(/\/+$/, "");

const BACKEND_ORIGIN = (() => {
  const raw = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://axioma-be.onrender.com")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
  try {
    return new URL(raw).origin;
  } catch {
    return "https://axioma-be.onrender.com";
  }
})();

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
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
    default: "Axioma — Asisten Cerdas & Studio Visual",
    template: "%s | Axioma",
  },
  description:
    "Platform asisten AI terpadu untuk penalaran analitis, pemrograman, sintesis visual, dan interaksi suara real-time.",
  applicationName: "Axioma",
  appleWebApp: {
    capable: true,
    title: "Axioma",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Axioma",
    locale: "id_ID",
    title: "Axioma — Asisten Cerdas & Studio Visual",
    description:
      "Platform asisten AI terpadu untuk penalaran analitis, pemrograman, dan sintesis visual.",
    url: APP_URL,
    images: [
      {
        url: "/og-image.png?v=2",
        width: 1200,
        height: 630,
        alt: "Axioma AI Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Axioma — Asisten Cerdas & Studio Visual",
    description:
      "Platform asisten AI terpadu untuk penalaran analitis, pemrograman, dan sintesis visual.",
    images: ["/og-image.png?v=2"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      {
        url: "/brand/light/favicon.ico?v=3",
        sizes: "any",
        type: "image/x-icon",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/brand/dark/favicon.ico?v=3",
        sizes: "any",
        type: "image/x-icon",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/brand/light/icon-192.png?v=3",
        sizes: "192x192",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/brand/dark/icon-192.png?v=3",
        sizes: "192x192",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e10" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} dark antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href={BACKEND_ORIGIN} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={BACKEND_ORIGIN} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var m=window.matchMedia("(prefers-color-scheme: dark)");function apply(){var t=localStorage.getItem("axioma_theme");var isDark=t==="dark"||((!t||t==="system")&&m.matches);var bg=isDark?"#0e0e10":"#f9f9f8";var bar=isDark?"black-translucent":"default";if(isDark){d.classList.add("dark");d.classList.remove("light");}else{d.classList.remove("dark");d.classList.add("light");}d.style.colorScheme=isDark?"dark":"light";d.style.backgroundColor=bg;if(document.body){document.body.style.backgroundColor=bg;}document.querySelectorAll('meta[name="theme-color"]').forEach(function(el){el.remove();});var el=document.createElement("meta");el.name="theme-color";el.setAttribute("content",bg);document.head.appendChild(el);var ap=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');if(ap){ap.setAttribute("content",bar);}else{var apel=document.createElement("meta");apel.name="apple-mobile-web-app-status-bar-style";apel.setAttribute("content",bar);document.head.appendChild(apel);}}apply();if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",apply,{once:true});}if(m&&m.addEventListener){m.addEventListener("change",function(){var t=localStorage.getItem("axioma_theme");if(!t||t==="system"){apply();}});}else if(m&&m.addListener){m.addListener(function(){var t=localStorage.getItem("axioma_theme");if(!t||t==="system"){apply();}});}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className="fixed inset-0 w-full min-h-[100dvh] h-[var(--app-height,100dvh)] m-0 p-0 overflow-hidden overflow-x-hidden overscroll-none bg-[#f9f9f8] dark:bg-[#0e0e10] text-text-primary font-sans antialiased"
        suppressHydrationWarning
      >
        <ViewportEnvSync />
        {children}
      </body>
    </html>
  );
}
