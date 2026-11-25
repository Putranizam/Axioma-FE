"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Monitor,
  Smartphone,
  RotateCcw,
  Download,
  Copy,
  Check,
} from "lucide-react";

export interface LivePreviewModalProps {
  isOpen: boolean;
  code: string;
  onClose: () => void;
}

type PreviewTab = "preview" | "code";
type ViewportMode = "desktop" | "mobile";

function fallbackCopyHtml(text: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function LivePreviewModal({
  isOpen,
  code,
  onClose,
}: LivePreviewModalProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>("preview");
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Reset to clean preview state whenever modal opens with new code
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("preview");
    setReloadKey((prev) => prev + 1);
    setIsCopied(false);
  }, [isOpen, code]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleReload = useCallback(() => {
    setActiveTab("preview");
    setReloadKey((prev) => prev + 1);
  }, []);

  const handleDownloadHtml = useCallback(() => {
    if (typeof document === "undefined") return;
    try {
      const blob = new Blob([code], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "axioma-preview.html";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Ignore download errors in restricted environments
    }
  }, [code]);

  const handleCopyCode = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        fallbackCopyHtml(code);
      }
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);
    } catch {
      if (fallbackCopyHtml(code)) {
        setIsCopied(true);
        window.setTimeout(() => setIsCopied(false), 1800);
      }
    }
  }, [code]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-preview-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[120] w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 p-0 flex flex-col bg-[#f9f9f8] dark:bg-[#0e0e10] text-zinc-900 dark:text-zinc-100 font-sans md:p-4 md:bg-black/45 md:dark:bg-black/70 md:backdrop-blur-xs md:items-center md:justify-center overflow-hidden"
    >
      <div className="w-full h-full max-w-none max-h-none m-0 rounded-none border-0 flex flex-col overflow-hidden bg-[#f9f9f8] dark:bg-[#0e0e10] md:max-w-[1180px] md:h-[min(88dvh,860px)] md:rounded-2xl md:border md:border-zinc-200/80 md:dark:border-white/[0.1] md:shadow-2xl">
        {/* Compact Monochrome Header */}
        <header className="shrink-0 flex items-center justify-between gap-2 border-b border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141416] pt-[max(0.625rem,env(safe-area-inset-top))] md:pt-2.5 pb-2.5 px-3.5 md:px-5">
          {/* Left: Title + Segmented Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <h2
              id="live-preview-modal-title"
              className="text-[13.5px] sm:text-[14.5px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 truncate"
            >
              Pratinjau Langsung
            </h2>

            <div
              role="tablist"
              aria-label="Mode tampilan pratinjau"
              className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/[0.08] shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "preview"}
                onClick={() => setActiveTab("preview")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "preview"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                Pratinjau
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "code"}
                onClick={() => setActiveTab("code")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "code"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                Kode
              </button>
            </div>
          </div>

          {/* Right: Viewport Toggle (Desktop), Reload, Download, Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {activeTab === "preview" && (
              <div
                role="group"
                aria-label="Ukuran layar pratinjau"
                className="hidden md:flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/[0.08] mr-1"
              >
                <button
                  type="button"
                  onClick={() => setViewportMode("desktop")}
                  aria-label="Tampilan desktop penuh"
                  aria-pressed={viewportMode === "desktop"}
                  title="Tampilan desktop"
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewportMode === "desktop"
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewportMode("mobile")}
                  aria-label="Simulasi tampilan seluler 390px"
                  aria-pressed={viewportMode === "mobile"}
                  title="Tampilan seluler (390px)"
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewportMode === "mobile"
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleReload}
              aria-label="Muat ulang pratinjau"
              title="Muat ulang"
              className="w-8 h-8 rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              aria-label="Unduh file HTML"
              title="Unduh HTML"
              className="w-8 h-8 rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratinjau langsung"
              title="Tutup"
              className="w-8 h-8 rounded-lg bg-zinc-200/80 hover:bg-zinc-200 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-zinc-100/90 dark:bg-[#09090b]">
          {activeTab === "preview" ? (
            <div
              className={`flex-1 min-h-0 w-full flex items-center justify-center overflow-auto ${
                viewportMode === "mobile" ? "md:p-5" : ""
              }`}
            >
              <div
                className={
                  viewportMode === "mobile"
                    ? "w-full h-full md:w-[390px] md:max-w-full md:h-full md:rounded-2xl md:border md:border-zinc-300/90 md:dark:border-white/[0.12] md:shadow-xl overflow-hidden bg-white transition-[width] duration-200"
                    : "w-full h-full bg-white"
                }
              >
                <iframe
                  key={reloadKey}
                  srcDoc={code}
                  sandbox="allow-scripts allow-forms allow-modals"
                  title="Axioma Live Preview"
                  className="w-full h-full border-0 bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col bg-[#f4f4f2] dark:bg-[#111113]">
              <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-zinc-200/80 dark:border-white/[0.08] bg-[#ebebea]/80 dark:bg-[#18181b]">
                <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">
                  HTML · axioma-preview.html
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  aria-label={isCopied ? "Kode berhasil disalin" : "Salin kode HTML"}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] dark:text-zinc-200 dark:border-white/[0.08] transition-colors active:scale-95 cursor-pointer"
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                  ) : (
                    <Copy className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                  )}
                  <span>{isCopied ? "Disalin" : "Salin"}</span>
                </button>
              </div>
              <pre className="flex-1 min-h-0 overflow-auto p-4 sm:p-5 pb-[calc(var(--safe-bottom,env(safe-area-inset-bottom,0px))+24px)] m-0 font-mono text-[12.5px] sm:text-[13px] leading-[1.65] text-zinc-900 dark:text-zinc-100 whitespace-pre">
                <code>{code}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
