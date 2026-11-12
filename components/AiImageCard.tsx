"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Download, Eye, Palette, Loader2, CircleAlert, RotateCw } from "lucide-react";

interface AiImageCardProps {
  src: string;
  alt: string;
  onOpenLightbox?: (url: string, name: string) => void;
}

export function AiImageCard({ src, alt, onOpenLightbox }: AiImageCardProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const retryAttemptRef = useRef<number>(0);

  const triggerFallback = useCallback(() => {
    if (retryAttemptRef.current === 0) {
      retryAttemptRef.current = 1;
      const cleanQuery = encodeURIComponent((alt || "visual scenery").replace(/[^a-zA-Z0-9\s]/g, " ").trim().slice(0, 80));
      const fallbackUrl = `https://image.pollinations.ai/prompt/${cleanQuery}?width=800&height=800&model=turbo&nologo=true&seed=${Date.now()}`;
      setCurrentSrc(fallbackUrl);
    } else {
      setHasError(true);
    }
  }, [alt]);

  useEffect(() => {
    setCurrentSrc(src);
    setIsLoaded(false);
    setHasError(false);
    retryAttemptRef.current = 0;
  }, [src]);

  // Anti-stuck watchdog: If image hasn't loaded within 12s, automatically trigger fast fallback
  useEffect(() => {
    if (isLoaded || hasError) return;

    const timer = setTimeout(() => {
      if (!isLoaded && !hasError) {
        triggerFallback();
      }
    }, 12000);

    return () => clearTimeout(timer);
  }, [currentSrc, isLoaded, hasError, triggerFallback]);

  const handleManualRetry = () => {
    setHasError(false);
    setIsLoaded(false);
    retryAttemptRef.current = 0;
    const cleanQuery = encodeURIComponent((alt || "visual").replace(/[^a-zA-Z0-9\s]/g, " ").trim().slice(0, 80));
    setCurrentSrc(`https://image.pollinations.ai/prompt/${cleanQuery}?width=800&height=800&nologo=true&seed=${Date.now()}`);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      if (currentSrc.startsWith("data:")) {
        // Data URL direct download
        const link = document.createElement("a");
        link.href = currentSrc;
        const cleanName = (alt || "axioma-visual")
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, "-")
          .slice(0, 32);
        link.download = `${cleanName}-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Remote URL fetch blob download
        const response = await fetch(currentSrc, { mode: "cors" });
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        const cleanName = (alt || "axioma-visual")
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, "-")
          .slice(0, 32);
        link.download = `${cleanName}-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      }
    } catch {
      // Fallback direct link open
      const link = document.createElement("a");
      link.href = currentSrc;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = `${alt || "axioma-visual"}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="my-3 max-w-xl w-full group/ai-img relative rounded-2xl overflow-hidden border border-border-subtle bg-bg-surface shadow-md transition-all hover:border-border-strong hover:shadow-lg">
      {/* Loading Skeleton */}
      {!isLoaded && !hasError && (
        <div className="w-full aspect-square sm:aspect-[4/3] bg-bg-elevated/70 animate-pulse flex flex-col items-center justify-center gap-2.5 text-text-muted select-none">
          <Loader2 className="w-6 h-6 animate-spin text-icon-muted" />
          <span className="text-xs font-medium tracking-tight">Memuat gambar resolusi tinggi...</span>
        </div>
      )}

      {/* Render Image (Eager loading, no lazy deferral on mobile viewport) */}
      <img
        src={currentSrc}
        alt={alt}
        loading="eager"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => triggerFallback()}
        onClick={() => onOpenLightbox?.(currentSrc, alt)}
        className={`w-full max-h-[520px] object-cover rounded-2xl cursor-pointer transition-transform duration-300 group-hover/ai-img:scale-[1.01] ${
          isLoaded ? "block" : "hidden"
        }`}
      />

      {/* Top Badge Overlay */}
      {isLoaded && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-zinc-200 text-[11px] font-medium border border-white/10 pointer-events-none shadow-sm">
          <Palette className="w-3.5 h-3.5 text-zinc-300" />
          <span>Studio Visual</span>
        </div>
      )}

      {/* Bottom Action Bar */}
      {isLoaded && (
        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex items-center justify-between opacity-95 sm:opacity-0 sm:group-hover/ai-img:opacity-100 transition-opacity">
          <span className="text-xs text-white/95 truncate max-w-[60%] font-medium px-1 drop-shadow-sm select-none">
            {alt}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenLightbox?.(currentSrc, alt)}
              title="Perbesar gambar"
              aria-label="Perbesar gambar"
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              title="Unduh gambar"
              aria-label="Unduh gambar"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-900 font-medium text-xs hover:bg-white/90 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900" />
              ) : (
                <Download className="w-3.5 h-3.5 text-zinc-900" />
              )}
              <span>Unduh Gambar</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Fallback with Retry Option */}
      {hasError && (
        <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle flex flex-col gap-2.5 text-text-muted">
          <div className="flex items-center gap-3">
            <CircleAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="text-xs leading-relaxed">
              Gambar tidak dapat ditampilkan secara langsung di peramban.{" "}
              <a
                href={currentSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-primary underline font-medium hover:text-text-primary"
              >
                Buka gambar di tab baru
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualRetry}
            className="self-start mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-surface hover:bg-bg-subtle text-text-primary text-xs font-medium border border-border-strong cursor-pointer transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Muat Ulang Gambar</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default AiImageCard;

