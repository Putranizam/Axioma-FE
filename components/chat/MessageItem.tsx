"use client";

import React, { createContext, memo, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "./markdown.css";
import {
  sanitizeAxiomaMessageContent,
  stabilizeStreamingMarkdown,
  type RetryPayloadRecord,
} from "@/lib/sanitizeMessage";
import { useSmoothStreamText } from "@/hooks/useSmoothStreamText";

export { sanitizeAxiomaMessageContent, type RetryPayloadRecord };
import {
  Check,
  CircleAlert,
  Copy,
  Download,
  Eye,
  FileText,
  Pencil,
  RotateCw,
} from "lucide-react";
import { AxiomaLogoMark } from "../AxiomaLogoMark";
import { MessageActionBar } from "./MessageActionBar";
import { FollowUpChips } from "./FollowUpChips";
import { formatFileSize, type AttachmentItem } from "@/lib/attachments";
import { formatForWhatsApp } from "@/utils/whatsappFormat";
import type { AxiomaLensData } from "../AxiomaLensCard";
import type { AdaptiveAnswerAction } from "@/constants/language";

// Module-level plugin arrays so ReactMarkdown never sees fresh array references on re-render
const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

const PreBlockContext = createContext(false);

const CodeBlock = dynamic(() => import("../CodeBlock").then((mod) => mod.CodeBlock), {
  ssr: false,
});

const AxiomaLensCard = dynamic(
  () => import("../AxiomaLensCard").then((mod) => mod.AxiomaLensCard),
  { ssr: false }
);

const AiImageCard = dynamic(
  () => import("../AiImageCard").then((mod) => mod.AiImageCard),
  { ssr: false }
);

const AiVideoCard = dynamic(
  () => import("../AiVideoCard").then((mod) => mod.AiVideoCard),
  { ssr: false }
);

export interface ChatMessageRecord {
  id: string;
  clientRenderKey?: string;
  liveEpoch?: number;
  streamStopped?: boolean;
  sender: "user" | "ai";
  content: string;
  created_at?: string;
  agentId?: string;
  agentName?: string;
  attachments?: AttachmentItem[];
  isError?: boolean;
  errorDetail?: string;
  retryPayload?: RetryPayloadRecord;
  lensData?: AxiomaLensData;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "image" | "video";
  mediaTitle?: string;
  mediaPrompt?: string;
  revisedPrompt?: string;
  detectedLanguage?: string;
  videoJobId?: string;
}

function hasBlockChild(n: any): boolean {
  if (!n || !Array.isArray(n.children)) return false;
  return n.children.some((child: any) => {
    if (child?.type === "element") {
      const tag = String(child.tagName || "").toLowerCase();
      if (
        tag === "img" ||
        tag === "div" ||
        tag === "video" ||
        tag === "figure" ||
        tag === "pre" ||
        tag === "table"
      ) {
        return true;
      }
      return hasBlockChild(child);
    }
    return false;
  });
}

interface MessageItemProps {
  message: ChatMessageRecord;
  isStreaming: boolean;
  shouldAnimateStream?: boolean;
  isBusy: boolean;
  isLatestAiReply: boolean;
  userTimeLabel: string;
  isEditingUser: boolean;
  editingUserText: string;
  isSubmittingEdit: boolean;
  editUserTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  activeCopiedId: string | null;
  isActionMenuOpen: boolean;
  msgFeedback?: "up" | "down";
  showFeedbackSavedNotice: boolean;
  showStructuredFeedbackThanks: boolean;
  isFeedbackCommentOpen: boolean;
  feedbackCommentDraftValue: string;
  savedChecklistMap?: Record<number, boolean>;
  fallbackRetryUserContent: string | null;
  onStreamProgressTick?: () => void;
  onCopy: (text: string, id: string, durationMs?: number) => void;
  onOpenLightbox: (url: string, name: string) => void;
  onImageLoadError: (att: AttachmentItem, messageId: string) => void;
  onStartEditUser: (msg: ChatMessageRecord) => void;
  onEditingUserTextChange: (next: string) => void;
  onCancelEditUser: () => void;
  onSubmitEditUser: (messageId: string, nextText: string) => void;
  onRetryError: (
    messageId: string,
    retryPayload?: RetryPayloadRecord,
    fallbackUserContent?: string | null
  ) => void;
  onAiTextSelect: (messageId: string, content: string) => void;
  onToggleChecklistItem: (messageId: string, idx: number, isChecked: boolean) => void;
  onRunPreview: (htmlCode: string) => void;
  onToggleActionMenu: (messageId: string) => void;
  onCloseActionMenu: () => void;
  onBranchFromMessage: (messageId: string) => void;
  onContinueMessage: () => void;
  onRegenerateMessage: (messageId: string) => void;
  onFeedback: (messageId: string, rating: "up" | "down") => void;
  onSelectFollowUpAction: (action: AdaptiveAnswerAction) => void;
  onSendStructuredFeedback: (messageId: string, rating: "up" | "down", reason: string) => void;
  onFeedbackCommentDraftChange: (messageId: string, value: string) => void;
  onSubmitFeedbackComment: (messageId: string) => void;
  onCloseFeedbackComment: () => void;
}

export const MessageItem = memo(function MessageItem({
  message,
  isStreaming,
  shouldAnimateStream = false,
  isBusy,
  isLatestAiReply,
  userTimeLabel,
  isEditingUser,
  editingUserText,
  isSubmittingEdit,
  editUserTextareaRef,
  activeCopiedId,
  isActionMenuOpen,
  msgFeedback,
  showFeedbackSavedNotice,
  showStructuredFeedbackThanks,
  isFeedbackCommentOpen,
  feedbackCommentDraftValue,
  savedChecklistMap,
  fallbackRetryUserContent,
  onStreamProgressTick,
  onCopy,
  onOpenLightbox,
  onImageLoadError,
  onStartEditUser,
  onEditingUserTextChange,
  onCancelEditUser,
  onSubmitEditUser,
  onRetryError,
  onAiTextSelect,
  onToggleChecklistItem,
  onRunPreview,
  onToggleActionMenu,
  onCloseActionMenu,
  onBranchFromMessage,
  onContinueMessage,
  onRegenerateMessage,
  onFeedback,
  onSelectFollowUpAction,
  onSendStructuredFeedback,
  onFeedbackCommentDraftChange,
  onSubmitFeedbackComment,
  onCloseFeedbackComment,
}: MessageItemProps) {
  const checkboxCounterRef = useRef(0);

  const isAiStandardReply =
    message.sender === "ai" && !message.isError && !message.lensData;

  const { displayedText, isVisuallyStreaming } = useSmoothStreamText({
    incomingText: isAiStandardReply ? message.content : "",
    isStreamingNetwork: isStreaming,
    shouldAnimate: Boolean(isAiStandardReply && (shouldAnimateStream || isStreaming)),
    isStopped: Boolean(message.streamStopped),
    onProgressTick: onStreamProgressTick,
  });

  const fullSanitizedContent = useMemo(
    () =>
      message.sender === "ai" && !message.isError
        ? sanitizeAxiomaMessageContent(message.content)
        : "",
    [message.sender, message.isError, message.content]
  );

  const renderedMarkdownContent = useMemo(() => {
    if (message.sender !== "ai" || message.isError) return "";
    if (!isVisuallyStreaming) {
      return fullSanitizedContent;
    }
    const cleanPartial = sanitizeAxiomaMessageContent(displayedText, {
      preserveTrailingSpace: true,
    });
    return stabilizeStreamingMarkdown(cleanPartial, true);
  }, [
    message.sender,
    message.isError,
    isVisuallyStreaming,
    displayedText,
    fullSanitizedContent,
  ]);

  const checklistDefaults = useMemo(() => {
    if (message.sender !== "ai" || message.isError || message.lensData) return [];
    const checklistMatches = message.content.match(/^\s*[-*+]\s+\[([ xX])\]/gm);
    return checklistMatches ? checklistMatches.map((m) => /\[[xX]\]/.test(m)) : [];
  }, [message.sender, message.isError, message.lensData, message.content]);

  const completedCount = useMemo(() => {
    if (checklistDefaults.length === 0) return 0;
    const saved = savedChecklistMap || {};
    return checklistDefaults.reduce(
      (acc, defChecked, idx) => acc + ((saved[idx] ?? defChecked) ? 1 : 0),
      0
    );
  }, [checklistDefaults, savedChecklistMap]);

  const handleCodeCopy = useCallback(
    (rawCode: string, copyKey: string) => {
      onCopy(rawCode, copyKey, 1800);
    },
    [onCopy]
  );

  const handleCopyAiReply = useCallback(() => {
    onCopy(fullSanitizedContent, message.id, 1500);
  }, [onCopy, fullSanitizedContent, message.id]);

  const handleCopyAiWhatsApp = useCallback(() => {
    onCopy(formatForWhatsApp(fullSanitizedContent), `wa-${message.id}`, 1500);
  }, [onCopy, fullSanitizedContent, message.id]);

  const handleToggleThisMenu = useCallback(() => {
    onToggleActionMenu(message.id);
  }, [onToggleActionMenu, message.id]);

  const handleBranchThis = useCallback(() => {
    onBranchFromMessage(message.id);
  }, [onBranchFromMessage, message.id]);

  const handleRegenerateThis = useCallback(() => {
    onRegenerateMessage(message.id);
  }, [onRegenerateMessage, message.id]);

  const handleFeedbackThis = useCallback(
    (rating: "up" | "down") => {
      onFeedback(message.id, rating);
    },
    [onFeedback, message.id]
  );

  const markdownComponents = useMemo<Components>(() => {
    const savedMap = savedChecklistMap || {};
    return {
      p({ node, children, ...props }) {
        if (hasBlockChild(node)) {
          return <div className="my-2">{children}</div>;
        }
        return <p {...props}>{children}</p>;
      },
      input({ type, checked, ...props }) {
        if (type === "checkbox") {
          const currentIdx = checkboxCounterRef.current++;
          const isChecked = savedMap[currentIdx] ?? Boolean(checked);
          return (
            <input
              type="checkbox"
              checked={isChecked}
              disabled={false}
              onChange={() => onToggleChecklistItem(message.id, currentIdx, isChecked)}
              aria-label={`Tandai langkah ${currentIdx + 1}`}
              className="mr-2 align-middle h-3.5 w-3.5 rounded border border-zinc-400 dark:border-zinc-600 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
            />
          );
        }
        return <input type={type} checked={checked} {...props} />;
      },
      pre({ children }) {
        return <PreBlockContext.Provider value={true}>{children}</PreBlockContext.Provider>;
      },
      code({ className, children, ...props }) {
        return (
          <PreBlockContext.Consumer>
            {(isInsidePre) => {
              const match = /language-([\w+-]+)/.exec(className || "");
              const rawCode = String(children ?? "").replace(/\n$/, "");
              const isBlockCode = isInsidePre || Boolean(match) || rawCode.includes("\n");

              if (!isBlockCode) {
                return (
                  <code
                    className="px-1.5 py-0.5 mx-0.5 rounded-md bg-zinc-200/80 text-zinc-900 border border-zinc-300/60 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700/60 font-mono text-[13px] leading-[1.55]"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              const language = (match?.[1] || "code").toLowerCase();
              const copyKey = `${message.id}-code-${rawCode.length}-${rawCode.slice(0, 16)}`;

              return (
                <CodeBlock
                  language={language}
                  rawCode={rawCode}
                  isStreaming={isVisuallyStreaming}
                  copyKey={copyKey}
                  onCopyCode={handleCodeCopy}
                  isCopied={activeCopiedId === copyKey}
                  onRunPreview={onRunPreview}
                />
              );
            }}
          </PreBlockContext.Consumer>
        );
      },
      table({ children }) {
        return (
          <div className="axioma-table-scroll">
            <table>{children}</table>
          </div>
        );
      },
      a({ href, children, ...props }) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-4 decoration-blue-600/40 dark:decoration-blue-400/40 hover:decoration-current transition-colors break-words [overflow-wrap:anywhere]"
            {...props}
          >
            {children}
          </a>
        );
      },
      img({ src, alt }) {
        if (!src) return null;
        const isVideo =
          String(alt || "").toLowerCase().startsWith("video:") ||
          /\.(mp4|webm|mov)(\?.*)?$/i.test(String(src));
        if (isVideo) {
          const videoTitle =
            String(alt || "").replace(/^video:\s*/i, "") || "Adegan Video";
          return <AiVideoCard src={String(src)} title={videoTitle} />;
        }
        return (
          <AiImageCard
            src={String(src)}
            alt={String(alt || "Visual Axioma")}
            onOpenLightbox={onOpenLightbox}
          />
        );
      },
    };
  }, [
    message.id,
    isVisuallyStreaming,
    activeCopiedId,
    savedChecklistMap,
    handleCodeCopy,
    onRunPreview,
    onOpenLightbox,
    onToggleChecklistItem,
  ]);

  // 1. User Message
  if (message.sender === "user") {
    if (isEditingUser) {
      return (
        <div className="w-full flex justify-end animate-user-bubble my-0 sm:my-1">
          <div className="w-full max-w-[85%] lg:max-w-[70%] p-3 rounded-2xl bg-bg-elevated border border-border-strong shadow-xl space-y-2">
            <textarea
              ref={editUserTextareaRef}
              value={editingUserText}
              onChange={(e) => onEditingUserTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (editingUserText.trim() && !isSubmittingEdit) {
                    onSubmitEditUser(message.id, editingUserText);
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onCancelEditUser();
                }
              }}
              rows={Math.max(2, editingUserText.split("\n").length)}
              className="w-full bg-transparent text-text-primary text-base md:text-sm leading-relaxed resize-none focus:outline-none"
              autoFocus
              aria-label="Edit pesan pengguna"
            />
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border-subtle">
              <button
                type="button"
                onClick={onCancelEditUser}
                className="min-h-[40px] lg:min-h-0 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary bg-bg-surface hover:bg-bg-subtle hover:text-text-primary border border-border-subtle transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!editingUserText.trim() || isSubmittingEdit}
                onClick={() => onSubmitEditUser(message.id, editingUserText)}
                className="min-h-[40px] lg:min-h-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-text-primary text-bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer"
              >
                {isSubmittingEdit ? "Menyimpan…" : "Kirim"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const imageAttachments = message.attachments?.filter((a) => a.mime_type.startsWith("image/")) || [];
    const pdfAttachments = message.attachments?.filter((a) => a.mime_type === "application/pdf") || [];
    const isUserCopied = activeCopiedId === `user-${message.id}`;

    return (
      <div
        style={{ animationDuration: "280ms" }}
        className="w-full flex justify-end animate-axioma-fade-up group relative my-0 sm:my-0.5"
      >
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] lg:max-w-[70%]">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-col gap-2 mb-1.5 w-full items-end">
              {imageAttachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-full">
                  {imageAttachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => onOpenLightbox(att.signed_url || "", att.original_name)}
                      className="relative group/img overflow-hidden rounded-xl border border-border-subtle bg-bg-surface cursor-pointer shadow-sm hover:ring-2 hover:ring-border-strong transition-shadow"
                    >
                      <img
                        src={att.signed_url}
                        alt={att.original_name}
                        loading="lazy"
                        onError={() => onImageLoadError(att, message.id)}
                        className="max-h-60 max-w-full w-auto object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white drop-shadow" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pdfAttachments.map((att) => (
                <a
                  key={att.id}
                  href={att.signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={att.original_name}
                  className="flex items-center gap-3 p-3 rounded-xl bg-bg-surface border border-border-subtle hover:border-border-strong hover:bg-bg-elevated transition-colors group/pdf max-w-full"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-semibold text-text-primary truncate" title={att.original_name}>
                      {att.original_name}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {formatFileSize(att.size_bytes)} {att.page_count ? `· ${att.page_count} hal` : ""}
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-icon-muted group-hover/pdf:text-text-primary shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          )}

          {message.content && message.content !== "(Lampiran)" && (
            <div className="relative min-w-0 max-w-full overflow-hidden px-4 py-2.5 rounded-[20px] rounded-br-[6px] bg-zinc-900 text-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 text-[15.5px] leading-[1.6] tracking-[-0.005em] shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none border border-zinc-900/10 dark:border-white/[0.06] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {message.content}
            </div>
          )}

          <div className="flex items-center gap-1 mt-1 text-zinc-400 dark:text-zinc-500 opacity-65 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
            {userTimeLabel && (
              <span className="hidden md:inline text-[11px] font-normal text-zinc-500 dark:text-zinc-500 pr-1 select-none tabular-nums">
                {userTimeLabel}
              </span>
            )}
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => onCopy(message.content, `user-${message.id}`, 1500)}
                title="Salin pesan"
                aria-label="Salin pesan pengguna"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/60 dark:text-zinc-500 dark:hover:text-zinc-100 dark:hover:bg-white/[0.06] active:scale-[0.95] transition-[color,background-color,transform] duration-150 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
              >
                {isUserCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                ) : (
                  <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                )}
              </button>
              {isUserCopied && (
                <span className="absolute right-full mr-1.5 px-2 py-0.5 rounded-md bg-zinc-900 text-white border border-zinc-800 dark:bg-white dark:text-zinc-950 dark:border-zinc-200 text-[11px] font-medium whitespace-nowrap shadow-md animate-in fade-in zoom-in-95 duration-150 z-30 flex items-center gap-1 pointer-events-none">
                  <Check className="w-3 h-3 text-white dark:text-zinc-950" strokeWidth={1.75} />
                  <span>Disalin</span>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onStartEditUser(message)}
              title="Edit pesan"
              aria-label="Edit pesan pengguna"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/60 dark:text-zinc-500 dark:hover:text-zinc-100 dark:hover:bg-white/[0.06] active:scale-[0.95] transition-[color,background-color,transform] duration-150 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
            >
              <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Error Message Card
  if (message.isError) {
    return (
      <div className="flex justify-start animate-error-shake w-full">
        <div className="w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#0e0e10] px-4 py-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-start gap-2.5 text-sm">
            <CircleAlert
              className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5"
              strokeWidth={1.5}
            />
            <div className="space-y-1 min-w-0">
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                {message.content}
              </div>
              {message.errorDetail && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed">
                  {message.errorDetail}
                </div>
              )}
            </div>
          </div>
          {(message.retryPayload || fallbackRetryUserContent) && (
            <div className="pt-0.5">
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  onRetryError(message.id, message.retryPayload, fallbackRetryUserContent)
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Coba Lagi</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Standard AI Reply
  checkboxCounterRef.current = 0;

  return (
    <div
      style={{ animationDuration: "280ms" }}
      className="w-full flex justify-start animate-axioma-fade-up group relative"
    >
      <div className="w-full space-y-2 sm:space-y-2.5 min-w-0">
        {/* Axioma Identity Header */}
        <div className="inline-flex items-center gap-2 mb-1.5 select-none">
          <AxiomaLogoMark className="w-4 h-4 shrink-0" />
          <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-300">
            Axioma
          </span>
        </div>

        {message.lensData ? (
          <div
            data-ai-message-id={message.id}
            onMouseUp={() => onAiTextSelect(message.id, message.content)}
          >
            <AxiomaLensCard data={message.lensData} />
          </div>
        ) : (
          <div className="space-y-2">
            <div
              data-ai-message-id={message.id}
              onMouseUp={() => onAiTextSelect(message.id, message.content)}
              className={`axioma-markdown w-full max-w-full sm:max-w-[70ch] min-w-0 font-normal text-zinc-900 dark:text-zinc-100 text-[15.5px] leading-relaxed tracking-[-0.005em] break-words transition-opacity duration-200 ${
                isVisuallyStreaming ? "streaming-prose" : ""
              }`}
            >
              <ReactMarkdown
                remarkPlugins={REMARK_PLUGINS}
                rehypePlugins={REHYPE_PLUGINS}
                components={markdownComponents}
              >
                {renderedMarkdownContent}
              </ReactMarkdown>

              {!isVisuallyStreaming &&
                message.imageUrl &&
                !message.content.includes(message.imageUrl) && (
                  <AiImageCard
                    src={message.imageUrl}
                    alt={message.mediaTitle || "Visual Axioma"}
                    onOpenLightbox={onOpenLightbox}
                  />
                )}
              {!isVisuallyStreaming &&
                message.videoUrl &&
                !message.content.includes(message.videoUrl) && (
                  <AiVideoCard
                    src={message.videoUrl}
                    title={message.mediaTitle || "Adegan Video"}
                  />
                )}
            </div>

            {checklistDefaults.length > 0 && !isVisuallyStreaming && (
              <div className="flex items-center gap-2.5 max-w-xs pt-0.5 select-none">
                <div className="flex-1 h-1 rounded-full bg-black/[0.08] dark:bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 dark:bg-zinc-100 transition-[width] duration-200"
                    style={{
                      width: `${Math.round((completedCount / checklistDefaults.length) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] font-medium text-text-muted tabular-nums shrink-0">
                  {completedCount}/{checklistDefaults.length} selesai
                </span>
              </div>
            )}
          </div>
        )}

        <MessageActionBar
          messageId={message.id}
          isStreaming={isVisuallyStreaming}
          isBusy={isBusy}
          isCopied={activeCopiedId === message.id}
          isWaCopied={activeCopiedId === `wa-${message.id}`}
          isMenuOpen={isActionMenuOpen}
          feedback={msgFeedback}
          showFeedbackSavedNotice={showFeedbackSavedNotice}
          showStructuredFeedbackThanks={showStructuredFeedbackThanks}
          onCopy={handleCopyAiReply}
          onCopyWhatsApp={handleCopyAiWhatsApp}
          onToggleMenu={handleToggleThisMenu}
          onCloseMenu={onCloseActionMenu}
          onBranch={handleBranchThis}
          onContinue={onContinueMessage}
          onRegenerate={handleRegenerateThis}
          onFeedback={handleFeedbackThis}
        />

        {isLatestAiReply && !isVisuallyStreaming && !isBusy && (
          <FollowUpChips onSelectAction={onSelectFollowUpAction} />
        )}

        {isFeedbackCommentOpen && msgFeedback === "down" && (
          <div className="rounded-xl bg-bg-elevated border border-border-subtle p-2.5 space-y-2 max-w-md">
            <div className="flex flex-wrap items-center gap-1.5">
              {(["Terlalu panjang", "Salah konteks", "Bahasa kaku"] as const).map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => onSendStructuredFeedback(message.id, "down", reason)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-bg-surface transition-colors cursor-pointer"
                >
                  {reason}
                </button>
              ))}
            </div>
            <label
              htmlFor={`feedback-comment-${message.id}`}
              className="block text-xs font-medium text-text-secondary"
            >
              Apa yang kurang?{" "}
              <span className="text-text-muted">(opsional, maks 1.000 karakter)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`feedback-comment-${message.id}`}
                type="text"
                maxLength={1000}
                value={feedbackCommentDraftValue}
                onChange={(e) => onFeedbackCommentDraftChange(message.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSubmitFeedbackComment(message.id);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    onCloseFeedbackComment();
                  }
                }}
                placeholder="Misal: kurang akurat, terlalu panjang..."
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-bg-surface border border-border-subtle text-[16px] md:text-[15px] lg:text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
              />
              <button
                type="button"
                onClick={() => onSubmitFeedbackComment(message.id)}
                className="px-2.5 py-1.5 rounded-lg bg-text-primary hover:opacity-90 text-bg-primary text-xs font-medium transition-opacity cursor-pointer shrink-0"
              >
                Kirim
              </button>
              <button
                type="button"
                onClick={onCloseFeedbackComment}
                className="px-2 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer shrink-0"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
