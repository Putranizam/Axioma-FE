"use client";

import React, { useState } from "react";
import { Download, Video, Loader2, CircleAlert } from "lucide-react";

interface AiVideoCardProps {
  src: string;
  title?: string;
}

export function AiVideoCard({ src, title }: AiVideoCardProps) {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const cleanTitle = (title || "video-axioma")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .slice(0, 32);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      if (src.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = src;
        link.download = `${cleanTitle}-${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const response = await fetch(src, { mode: "cors" });
        if (!response.ok) throw new Error("Fetch failed");
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${cleanTitle}-${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
      }
    } catch {
      // Fallback direct link download
      const link = document.createElement("a");
      link.href = src;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = `${cleanTitle}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="my-3 max-w-xl w-full group/ai-video relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-lg transition-all hover:border-white/20">
      {/* Top Badge Overlay */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-zinc-200 text-[11px] font-medium border border-white/10 pointer-events-none shadow-sm">
        <Video className="w-3.5 h-3.5 text-zinc-300" />
        <span>Studio Video</span>
      </div>

      {/* Loading Skeleton */}
      {!isLoaded && !hasError && (
        <div className="w-full aspect-video bg-zinc-900/80 animate-pulse flex flex-col items-center justify-center gap-2.5 text-zinc-400 select-none">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          <span className="text-xs font-medium tracking-tight">Memuat video...</span>
        </div>
      )}

      {/* HTML5 Video Player */}
      <video
        src={src}
        controls
        playsInline
        autoPlay
        loop
        muted
        onLoadedData={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full rounded-2xl border border-white/10 shadow-lg bg-zinc-900 aspect-video object-cover ${
          isLoaded ? "block" : "hidden"
        }`}
      />

      {/* Bottom Action Bar */}
      {isLoaded && (
        <div className="p-3 bg-zinc-900/90 border-t border-white/5 flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-300 truncate max-w-[65%] font-medium">
            {title || "Adegan Video Selesai"}
          </span>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            title="Unduh video"
            aria-label="Unduh video"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-zinc-900 font-medium text-xs hover:bg-zinc-200 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900" />
            ) : (
              <Download className="w-3.5 h-3.5 text-zinc-900" />
            )}
            <span>Unduh Video</span>
          </button>
        </div>
      )}

      {/* Error Fallback */}
      {hasError && (
        <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 flex items-center gap-3 text-zinc-400">
          <CircleAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs leading-relaxed">
            Format video tidak dapat diputar langsung di peramban.{" "}
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline font-medium hover:text-blue-400"
            >
              Unduh atau putar video di tab baru
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default AiVideoCard;

