import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import { ViewportEnvSync } from "@/components/ViewportEnvSync";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://axioma.my.id"),
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
    url: "https://axioma.my.id",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.className} ${plusJakarta.variable} ${inter.variable} ${jetbrainsMono.variable} dark antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://axioma-be.onrender.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://axioma-be.onrender.com" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var m=window.matchMedia("(prefers-color-scheme: dark)");function apply(useRaf){var t=localStorage.getItem("axioma_theme");var isDark=t==="dark"||((!t||t==="system")&&m.matches);var bg=isDark?"#0e0e10":"#f9f9f8";var bar="black-translucent";if(isDark){d.classList.add("dark");d.classList.remove("light");}else{d.classList.remove("dark");d.classList.add("light");}d.style.colorScheme=isDark?"dark":"light";d.style.backgroundColor=bg;if(document.body){document.body.style.backgroundColor=bg;}document.querySelectorAll('meta[name="theme-color"]').forEach(function(el){el.remove();});function appendMeta(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(el){el.remove();});var el=document.createElement("meta");el.name="theme-color";el.content=bg;document.head.appendChild(el);}if(useRaf&&window.requestAnimationFrame){window.requestAnimationFrame(function(){d.style.colorScheme=isDark?"dark":"light";d.style.backgroundColor=bg;if(document.body){document.body.style.backgroundColor=bg;}appendMeta();});}else{appendMeta();}var ap=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');if(ap){ap.setAttribute("content",bar);}else{var apel=document.createElement("meta");apel.name="apple-mobile-web-app-status-bar-style";apel.content=bar;document.head.appendChild(apel);}}apply(false);if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",function(){apply(false);},{once:true});}if(m&&m.addEventListener){m.addEventListener("change",function(){var t=localStorage.getItem("axioma_theme");if(!t||t==="system"){apply(true);}});}else if(m&&m.addListener){m.addListener(function(){var t=localStorage.getItem("axioma_theme");if(!t||t==="system"){apply(true);}});}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${inter.className} ${plusJakarta.variable} ${inter.variable} ${jetbrainsMono.variable} fixed inset-0 w-full h-[var(--app-height)] m-0 p-0 overflow-hidden overscroll-none bg-[#f9f9f8] dark:bg-[#0e0e10] text-text-primary font-sans antialiased`}
        suppressHydrationWarning
      >
        <ViewportEnvSync />
        {children}
      </body>
    </html>
  );
}
