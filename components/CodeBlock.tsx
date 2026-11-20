"use client";

import React, { memo, useMemo } from "react";
import hljs from "highlight.js/lib/common";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language: string;
  rawCode: string;
  isStreaming?: boolean;
  onCopy: () => void;
  isCopied: boolean;
}

export const CodeBlock = memo(function CodeBlock({
  language,
  rawCode,
  isStreaming = false,
  onCopy,
  isCopied,
}: CodeBlockProps) {
  const displayLanguage = language || "code";

  // During active streaming of this message, avoid syntax highlight parsing
  // on every single chunk to ensure 60fps smooth rendering without stutter.
  // Syntax highlighting is applied once the block/streaming completes.
  const highlightedHtml = useMemo(() => {
    if (isStreaming) {
      return null;
    }

    try {
      const cleanLang = (language || "").trim().toLowerCase();
      if (cleanLang && hljs.getLanguage(cleanLang)) {
        return hljs.highlight(rawCode, {
          language: cleanLang,
          ignoreIllegals: true,
        }).value;
      }
      // Auto-detect language if unspecified or unknown
      return hljs.highlightAuto(rawCode).value;
    } catch {
      return null;
    }
  }, [rawCode, language, isStreaming]);

  return (
    <div className="my-3.5 w-full max-w-full min-w-0 rounded-xl bg-[#f4f4f2] border border-zinc-200/80 text-zinc-900 dark:bg-[#161618] dark:border-white/[0.08] dark:text-zinc-100 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.28)] transition-colors duration-200 hover:border-zinc-300/90 dark:hover:border-white/[0.14]">
      {/* Slim Code Header Bar */}
      <div className="px-3.5 py-1.5 bg-[#ebebea]/80 border-b border-zinc-200/80 dark:bg-[#1c1c1f] dark:border-white/[0.08] flex items-center justify-between select-none">
        <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">
          {displayLanguage}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label={isCopied ? "Kode berhasil disalin" : "Salin kode"}
          className="inline-flex items-center gap-1.5 font-sans font-medium tracking-tight text-[11.5px] text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.06] transition-all duration-200 active:scale-[0.96] cursor-pointer py-1 px-2 min-h-[32px] sm:min-h-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
          ) : (
            <Copy className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" strokeWidth={1.75} />
          )}
          <span className={isCopied ? "text-emerald-700 dark:text-emerald-400" : ""}>
            {isCopied ? "Disalin" : "Salin"}
          </span>
        </button>
      </div>

      {/* Code Body */}
      <pre className="p-4 overflow-x-auto text-zinc-900 dark:text-zinc-100 font-mono text-[13px] leading-[1.6] m-0">
        {highlightedHtml ? (
          <code
            className="hljs font-mono text-[13px] leading-[1.6] block"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <code className="font-mono text-[13px] leading-[1.6] block whitespace-pre">
            {rawCode}
          </code>
        )}
      </pre>
    </div>
  );
});

