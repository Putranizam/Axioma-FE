import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AxiomaLogoMark } from "@/components/AxiomaLogoMark";
import { PUBLIC_CONTACT_EMAIL } from "@/constants/appInfo";

export type PublicNavKey = "about" | "privacy" | "terms" | "contact";

interface PublicPageShellProps {
  activePage: PublicNavKey;
  eyebrow: string;
  title: string;
  subtitle: string;
  updatedLabel?: string;
  children: React.ReactNode;
}

const PUBLIC_NAV_ITEMS: ReadonlyArray<{
  key: PublicNavKey;
  label: string;
  shortLabel: string;
  href: string;
}> = [
  { key: "about", label: "Tentang", shortLabel: "Tentang", href: "/about" },
  {
    key: "privacy",
    label: "Kebijakan Privasi",
    shortLabel: "Privasi",
    href: "/privacy-policy",
  },
  {
    key: "terms",
    label: "Syarat & Ketentuan",
    shortLabel: "Ketentuan",
    href: "/terms",
  },
  { key: "contact", label: "Kontak", shortLabel: "Kontak", href: "/contact" },
];

export function PublicPageShell({
  activePage,
  eyebrow,
  title,
  subtitle,
  updatedLabel,
  children,
}: PublicPageShellProps) {
  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch] bg-bg-primary text-text-primary font-sans antialiased selection:bg-border-strong selection:text-text-primary">
      {/* Sticky Minimalist Top Header (Safe-Area Ready) */}
      <header className="sticky top-0 z-30 w-full border-b border-border-subtle/80 bg-bg-primary/90 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-text-primary hover:opacity-85 transition-opacity shrink-0"
          >
            <AxiomaLogoMark className="w-7 h-7 shrink-0" />
            <span className="text-[16px] font-semibold tracking-tight">Axioma</span>
          </Link>

          <nav
            aria-label="Navigasi halaman publik"
            className="hidden sm:flex items-center gap-1"
          >
            {PUBLIC_NAV_ITEMS.map((item) => {
              const isActive = item.key === activePage;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${
                    isActive
                      ? "font-medium text-text-primary bg-bg-surface"
                      : "text-text-muted hover:text-text-primary hover:bg-bg-surface/60"
                  }`}
                >
                  {item.shortLabel}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 px-3.5 py-1.5 text-[12.5px] sm:text-[13px] font-medium transition-colors shrink-0"
          >
            <span>Mulai Chat</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
          </Link>
        </div>
      </header>

      {/* Main Editorial Reading Area */}
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-8 sm:pt-12 pb-12">
        <div className="pb-7 sm:pb-8 border-b border-border-subtle space-y-3">
          <div className="inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            <span>{eyebrow}</span>
            {updatedLabel && (
              <>
                <span aria-hidden="true" className="text-border-strong">
                  •
                </span>
                <span className="font-normal normal-case tracking-normal">
                  Diperbarui {updatedLabel}
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-[32px] font-semibold tracking-tight leading-[1.22] text-text-primary">
            {title}
          </h1>
          <p className="text-[14.5px] sm:text-[15.5px] leading-relaxed text-text-muted">
            {subtitle}
          </p>
        </div>

        <article className="pt-8 space-y-8 text-[14.5px] sm:text-[15px] leading-[1.75] text-text-secondary">
          {children}
        </article>
      </main>

      {/* Public Footer Navigation (Safe-Area Ready) */}
      <footer className="border-t border-border-subtle bg-bg-elevated/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.25rem))] space-y-5">
          <nav
            aria-label="Tautan footer Axioma"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]"
          >
            <Link
              href="/"
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              Beranda
            </Link>
            {PUBLIC_NAV_ITEMS.map((item) => {
              const isActive = item.key === activePage;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`transition-colors ${
                    isActive
                      ? "font-medium text-text-primary"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t border-border-subtle/70 text-xs text-text-muted">
            <p>© 2026 Axioma. Seluruh hak cipta dilindungi.</p>
            <p>
              Kontak resmi:{" "}
              <a
                href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
                className="text-text-secondary hover:text-text-primary underline underline-offset-4"
              >
                {PUBLIC_CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
