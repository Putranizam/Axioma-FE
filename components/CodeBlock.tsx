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
    <div className="my-3 rounded-xl bg-bg-surface border border-border-subtle overflow-hidden shadow-lg transition-all hover:border-border-strong">
      {/* Code Header Bar */}
      <div className="px-3.5 py-2 bg-bg-elevated border-b border-border-subtle flex items-center justify-between text-text-muted font-mono text-xs select-none">
        <span className="font-medium tracking-tight text-text-secondary">
          {displayLanguage}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label={isCopied ? "Kode berhasil disalin" : "Salin seluruh kode"}
          className="text-text-secondary hover:text-text-primary flex items-center gap-1.5 font-sans font-medium tracking-tight text-xs transition-colors active:scale-95 cursor-pointer py-0.5 px-1 rounded hover:bg-bg-surface"
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-icon-muted" />
          )}
          <span>{isCopied ? "Disalin" : "Salin kode"}</span>
        </button>
      </div>

      {/* Code Body */}
      <pre className="p-4 overflow-x-auto text-text-primary font-mono text-[13px] leading-relaxed m-0">
        {highlightedHtml ? (
          <code
            className="hljs font-mono text-[13px] leading-relaxed block"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <code className="font-mono text-[13px] leading-relaxed block whitespace-pre">
            {rawCode}
          </code>
        )}
      </pre>
    </div>
  );
});

