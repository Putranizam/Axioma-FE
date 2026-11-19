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
    <div className="my-3 w-full max-w-full min-w-0 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 dark:bg-[#141416] dark:border-zinc-800 dark:text-zinc-100 overflow-hidden shadow-xs dark:shadow-lg transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
      {/* Code Header Bar */}
      <div className="px-3.5 py-2 bg-zinc-200/70 border-b border-zinc-200 dark:bg-[#1b1b1f] dark:border-zinc-800 flex items-center justify-between text-zinc-600 dark:text-zinc-400 font-mono text-xs select-none">
        <span className="font-medium tracking-tight text-zinc-700 dark:text-zinc-300">
          {displayLanguage}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label={isCopied ? "Kode berhasil disalin" : "Salin seluruh kode"}
          className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-300/60 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 font-sans font-medium tracking-tight text-xs transition-colors active:scale-95 cursor-pointer py-1 px-1.5 min-h-[36px] sm:min-h-0 rounded"
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          )}
          <span>{isCopied ? "Disalin" : "Salin kode"}</span>
        </button>
      </div>

      {/* Code Body */}
      <pre className="p-4 overflow-x-auto text-zinc-900 dark:text-zinc-100 font-mono text-[13px] leading-[1.55] m-0">
        {highlightedHtml ? (
          <code
            className="hljs font-mono text-[13px] leading-[1.55] block"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <code className="font-mono text-[13px] leading-[1.55] block whitespace-pre">
            {rawCode}
          </code>
        )}
      </pre>
    </div>
  );
});

