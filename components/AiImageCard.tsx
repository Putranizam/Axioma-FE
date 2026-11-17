"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Download, Eye, Palette, Loader2, CircleAlert, RotateCw } from "lucide-react";

interface AiImageCardProps {
  src: string;
  alt: string;
  onOpenLightbox?: (url: string, name: string) => void;
}

function sanitizeVisualPrompt(raw: string): string {
  const cleaned = (raw || "")
    .replace(/[\r\n\[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "scenic cinematic landscape artwork";
}

function cleanRawImageUrl(rawUrl: string): string {
  let cleaned = (rawUrl || "").trim().replace(/^['"`]+|['"`]+$/g, "");
  // Hapus tanda kurung penutup nyasar hasil parsing markdown
  if (cleaned.startsWith("http")) {
    const openParens = (cleaned.match(/\(/g) || []).length;
    const closeParens = (cleaned.match(/\)/g) || []).length;
    if (closeParens > openParens) {
      cleaned = cleaned.replace(/\)+$/, "");
    }
    cleaned = cleaned.replace(/ /g, "%20");
  }
  return cleaned;
}

function buildInternalProxyUrl(
  prompt: string,
  options?: { seed?: string; width?: number; height?: number; engine?: string; fresh?: boolean }
): string {
  const params = new URLSearchParams();
  params.set("prompt", sanitizeVisualPrompt(prompt).slice(0, 400));
  params.set("seed", options?.seed || "42");
  if (options?.width) params.set("width", String(options.width));
  if (options?.height) params.set("height", String(options.height));
  if (options?.engine) params.set("engine", options.engine);
  if (options?.fresh) params.set("fresh", "1");
  return `/api/image?${params.toString()}`;
}

function extractPromptAndParams(
  rawSrc: string,
  alt: string
): {
  initialSrc: string;
  promptForFallback: string;
  width: number;
  height: number;
} {
  const cleanedUrl = cleanRawImageUrl(rawSrc);
  const altPrompt = sanitizeVisualPrompt(alt);

  if (
    !cleanedUrl ||
    cleanedUrl.startsWith("data:") ||
    cleanedUrl.startsWith("blob:") ||
    cleanedUrl.startsWith("/api/image")
  ) {
    return {
      initialSrc: cleanedUrl || buildInternalProxyUrl(altPrompt),
      promptForFallback: altPrompt,
      width: 1024,
      height: 1024,
    };
  }

  try {
    const parsed = new URL(cleanedUrl);
    const isPollinations = parsed.hostname.toLowerCase().includes("pollinations.ai");
    if (isPollinations) {
      const pathMatch = parsed.pathname.match(/\/(?:prompt|p)\/(.+)/i);
      let decodedPrompt = altPrompt;
      if (pathMatch?.[1]) {
        try {
          decodedPrompt = sanitizeVisualPrompt(decodeURIComponent(pathMatch[1]));
        } catch {
          decodedPrompt = sanitizeVisualPrompt(pathMatch[1]);
        }
      }

      const rawWidth = Number(parsed.searchParams.get("width"));
      const rawHeight = Number(parsed.searchParams.get("height"));
      const width =
        Number.isFinite(rawWidth) && rawWidth >= 256 && rawWidth <= 1024
          ? Math.round(rawWidth)
          : 1024;
      const height =
        Number.isFinite(rawHeight) && rawHeight >= 256 && rawHeight <= 1024
          ? Math.round(rawHeight)
          : 1024;
      const seed = parsed.searchParams.get("seed") || "42";

      return {
        initialSrc: buildInternalProxyUrl(decodedPrompt, { seed, width, height }),
        promptForFallback: decodedPrompt,
        width,
        height,
      };
    }
  } catch {
    // Jika URL rusak dan tidak bisa diparse, alihkan langsung lewat proxy prompt alt
    if (cleanedUrl.toLowerCase().includes("pollinations.ai")) {
      return {
        initialSrc: buildInternalProxyUrl(altPrompt),
        promptForFallback: altPrompt,
        width: 1024,
        height: 1024,
      };
    }
  }

  return {
    initialSrc: cleanedUrl,
    promptForFallback: altPrompt,
    width: 1024,
    height: 1024,
  };
}

function AiImageCardInner({ src, alt, onOpenLightbox }: AiImageCardProps) {
  const descriptor = useMemo(() => extractPromptAndParams(src, alt), [src, alt]);
  const [currentSrc, setCurrentSrc] = useState<string>(descriptor.initialSrc);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryAttempt, setRetryAttempt] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const triggerFallback = useCallback(() => {
    if (retryAttempt === 0) {
      setRetryAttempt(1);
      setIsLoaded(false);
      setHasError(false);
      setCurrentSrc(
        buildInternalProxyUrl(descriptor.promptForFallback, {
          seed: String(Date.now()),
          width: Math.min(descriptor.width, 800),
          height: Math.min(descriptor.height, 800),
          engine: "fallback",
        })
      );
    } else {
      setIsLoaded(false);
      setHasError(true);
    }
  }, [retryAttempt, descriptor]);

  // Jika browser sudah menyimpan gambar dalam cache sebelum event onLoad terpasang
  useEffect(() => {
    const imgEl = imgRef.current;
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0 && !isLoaded && !hasError) {
      const raf = requestAnimationFrame(() => {
        setIsLoaded(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [currentSrc, isLoaded, hasError]);

  // Safety Timeout: 15 detik pada percobaan awal (auto-retry seed/engine),
  // lalu 20 detik pada percobaan fallback sebelum menghentikan spinner secara bersih.
  useEffect(() => {
    if (isLoaded || hasError) return;

    const timeoutMs = retryAttempt === 0 ? 15_000 : 20_000;
    const timer = setTimeout(() => {
      triggerFallback();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [currentSrc, isLoaded, hasError, retryAttempt, triggerFallback]);

  const handleManualRetry = () => {
    setHasError(false);
    setIsLoaded(false);
    setRetryAttempt(0);
    setCurrentSrc(
      buildInternalProxyUrl(descriptor.promptForFallback, {
        seed: String(Date.now()),
        width: descriptor.width,
        height: descriptor.height,
        engine: "fallback",
        fresh: true,
      })
    );
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      if (currentSrc.startsWith("data:")) {
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
        const fetchOpts: RequestInit = currentSrc.startsWith("/")
          ? {}
          : { mode: "cors" };
        const response = await fetch(currentSrc, fetchOpts);
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
    <div
      className={`my-3 max-w-xl w-full group/ai-img relative rounded-2xl overflow-hidden border border-border-subtle bg-bg-surface shadow-md transition-all hover:border-border-strong hover:shadow-lg ${
        !isLoaded && !hasError ? "aspect-square sm:aspect-[4/3]" : ""
      }`}
    >
      {/* Loading Skeleton Overlay (mengizinkan <img> tetap mounted tanpa display:none agar onLoad selalu terpanggil) */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 z-10 bg-bg-elevated/80 animate-pulse flex flex-col items-center justify-center gap-2.5 text-text-muted select-none">
          <Loader2 className="w-6 h-6 animate-spin text-icon-muted" />
          <span className="text-xs font-medium tracking-tight">Menyiapkan visual...</span>
        </div>
      )}

      {/* Render Image: gunakan opacity-0 saat loading (BUKAN hidden/display:none) */}
      {!hasError && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth > 0) {
              setIsLoaded(true);
            } else {
              triggerFallback();
            }
          }}
          onError={() => triggerFallback()}
          onClick={() => isLoaded && onOpenLightbox?.(currentSrc, alt)}
          className={`w-full object-cover rounded-2xl transition-opacity duration-500 ${
            isLoaded
              ? "max-h-[520px] opacity-100 cursor-pointer transition-transform group-hover/ai-img:scale-[1.01]"
              : "h-full opacity-0 pointer-events-none"
          }`}
        />
      )}

      {/* Top Badge Overlay */}
      {isLoaded && !hasError && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-zinc-200 text-[11px] font-medium border border-white/10 pointer-events-none shadow-sm">
          <Palette className="w-3.5 h-3.5 text-zinc-300" />
          <span>Studio Visual</span>
        </div>
      )}

      {/* Bottom Action Bar */}
      {isLoaded && !hasError && (
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

      {/* Error Fallback with "Muat Ulang Visual" Button */}
      {hasError && (
        <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle flex flex-col gap-3 text-text-muted">
          <div className="flex items-center gap-3">
            <CircleAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="text-xs leading-relaxed">
              Visual gagal dimuat karena batas antrean server gambar sementara penuh.{" "}
              <a
                href={currentSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-primary underline font-medium hover:text-text-primary"
              >
                Buka tautan gambar
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualRetry}
            className="self-start flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bg-surface hover:bg-bg-subtle text-text-primary text-xs font-medium border border-border-strong cursor-pointer transition-colors active:scale-95"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Muat Ulang Visual</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function AiImageCard(props: AiImageCardProps) {
  return <AiImageCardInner key={`${props.src}::${props.alt}`} {...props} />;
}

export default AiImageCard;
