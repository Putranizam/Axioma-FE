"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AxiomaLogoMark } from "./AxiomaLogoMark";
import { syncIosSafariTheme } from "@/lib/themeSync";
import {
  LanguageToneSelector,
  ContextControlState,
  DEFAULT_CONTEXT_CONTROL,
} from "./LanguageToneSelector";
import {
  ContextCheckpointModal,
  ChatContextState,
  loadChatContextState,
  saveChatContextState,
  hasActiveChatContext,
} from "./ContextCheckpointModal";
import {
  WorkspaceSidebarSection,
  WorkspaceItem,
  loadWorkspaces,
  saveWorkspaces,
  loadActiveWorkspaceId,
  saveActiveWorkspaceId,
} from "./WorkspaceSidebarSection";
import { AxiomaLensCard, AxiomaLensData } from "./AxiomaLensCard";
import { RoleplayModal } from "./RoleplayModal";
import { LivePreviewModal } from "./LivePreviewModal";
import { UpgradeModal, type QuotaModalInfo } from "./UpgradeModal";
import {
  DEFAULT_LANGUAGE,
  DEFAULT_TONE,
  DEFAULT_THINKING_MODE,
  DEFAULT_ANSWER_STYLE,
  DEFAULT_SOCIAL_TARGET,
  ADAPTIVE_ANSWER_ACTIONS,
  LanguageCode,
  ToneStyle,
  ThinkingMode,
  AnswerStyle,
  SocialTarget,
  isValidLanguageCode,
  isValidToneStyle,
  isValidThinkingMode,
  isValidAnswerStyle,
  isValidSocialTarget,
} from "@/constants/language";
import { formatForWhatsApp } from "@/utils/whatsappFormat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  Plus,
  SquarePen,
  MessageSquare,
  User,
  Settings,
  Menu,
  X,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Paperclip,
  Mic,
  MicOff,
  AudioLines,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Bell,
  Database,
  Cpu,
  CircleAlert,
  RotateCw,
  Ellipsis,
  Pencil,
  Trash,
  Search,
  Square,
  Lightbulb,
  Mail,
  Table,
  Code,
  TriangleAlert,
  LogOut,
  Cloud,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  Monitor,
  Keyboard,
  FileText,
  Camera,
  Image as ImageIcon,
  UploadCloud,
  Eye,
  Download,
  ExternalLink,
  Loader2,
  WifiOff,
  Palette,
  Video,
  Info,
  MessageSquarePlus,
  Bookmark,
  GitBranch,
  Clapperboard,
  PenLine,
  Users,
  MoreHorizontal,
  CornerDownRight,
  Lock,
  Scale,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import {
  AttachmentItem,
  PendingAttachment,
  validateAttachmentFile,
  compressAndOrientImage,
  uploadAttachmentWithProgress,
  refreshAttachmentSignedUrl,
  formatFileSize,
  MAX_FILES_PER_MESSAGE,
} from "../lib/attachments";
import {
  checkVoiceSupport,
  getSupportedAudioMimeType,
  unlockAudioSystem,
  unlockSpeechSynthesis,
  transcribeAudioBlob,
} from "../lib/voice";

// Dynamic imports for code splitting & faster First Load JS
const CodeBlock = dynamic(() => import("./CodeBlock").then((mod) => mod.CodeBlock), {
  ssr: false,
});

const AuthModal = dynamic(() => import("./AuthModal"), {
  ssr: false,
});

import VoiceModeOverlay from "./VoiceModeOverlay";
import { AboutSettingsView, FeedbackSettingsView } from "./AboutAxiomaModal";
import {
  computeDropdownDirection,
  computeClampedPopoverStyle,
  formatRelativeTimeId,
  type DropdownDirection,
} from "@/lib/viewportPlacement";
import { AiImageCard } from "./AiImageCard";
import { AiVideoCard } from "./AiVideoCard";

import {
  supabase,
  isSupabaseConfigured,
  SupabaseUser,
  signInWithGoogleIdToken,
} from "../lib/supabaseClient";

// In-app WebView / older browser polyfills and guards (#6)
if (typeof Array.prototype.at !== "function") {
  Array.prototype.at = function (index: number) {
    const k = index >= 0 ? index : this.length + index;
    return k >= 0 && k < this.length ? this[k] : undefined;
  };
}

if (typeof globalThis.structuredClone !== "function") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).structuredClone = function <T>(val: T): T {
    return JSON.parse(JSON.stringify(val));
  };
}

function fallbackCopyText(text: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

let turnstileScriptLoadingPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptLoadingPromise) return turnstileScriptLoadingPromise;

  const scriptId = "cf-turnstile-script";
  const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (existing) {
    turnstileScriptLoadingPromise = new Promise<void>((resolve) => {
      if (window.turnstile) {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => resolve(), { once: true });
      }
    });
    return turnstileScriptLoadingPromise;
  }

  turnstileScriptLoadingPromise = new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });

  return turnstileScriptLoadingPromise;
}

// Fallback ID generator: crypto.randomUUID -> crypto.getRandomValues v4 -> Math.random fallback (#4)
export function generateId(requireUuid = false): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {}
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    try {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    } catch {}
  }

  if (requireUuid) {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export function generateSafeId(): string {
  return generateId(true);
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, params: any) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
      execute: (containerOrWidgetId?: string | HTMLElement, params?: any) => void;
    };
  }
}

const RAW_ENV_BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
const BACKEND_URL = RAW_ENV_BACKEND_URL
  ? RAW_ENV_BACKEND_URL.replace(/\/+$/, "").replace(/\/api$/, "")
  : process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://axioma-be.onrender.com";
const TURNSTILE_SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();
// Initial response timeout 90s (for Render cold start); idle timeout 30s per chunk (#1)
const INITIAL_RESPONSE_TIMEOUT_MS = 90_000;
const IDLE_STREAM_TIMEOUT_MS = 30_000;
const TEXTAREA_MAX_HEIGHT_PX = 192; // ~8 lines (8 * 24px line-height)
const DEFAULT_DISPLAY_NAME = "";

const STORAGE_KEYS = {
  USER_ID: "axioma_user_id",
  DISPLAY_NAME: "axioma_display_name",
  SELECTED_AGENT: "axioma_selected_agent",
  DEFAULT_AGENT: "axioma_default_agent",
  SIDEBAR_COLLAPSED: "axioma_sidebar_collapsed",
  THEME: "axioma_theme",
  LANGUAGE: "axioma_lang",
  TONE: "axioma_tone",
  THINKING_MODE: "axioma_thinking",
  ANSWER_STYLE: "axioma_style",
  SOCIAL_TARGET: "axioma_social_target",
  USER_PROFILE: "axioma_user_profile",
  CONTEXT_CONTROL: "axioma_context_control",
  CHECKLIST_STATE: "axioma_checklist_state",
  REQUIREMENT_LOCK: "axioma_requirement_lock",
  REQUIREMENT_LOCK_ENABLED: "axioma_requirement_lock_enabled",
  PENDING_DELETES: "axioma_pending_deletes",
  DRAFT_PREFIX: "axioma_draft_",
  GUEST_CHATS: "axioma_guest_chats",
  GUEST_MSG_PREFIX: "axioma_guest_msg_",
  GUEST_MSG_COUNT: "axioma_guest_msg_count",
} as const;

export const GUEST_MAX_MESSAGES = 5;

function getGuestMessageCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GUEST_MSG_COUNT);
    const count = raw ? parseInt(raw, 10) : 0;
    return isNaN(count) ? 0 : count;
  } catch {
    return 0;
  }
}

function incrementGuestMessageCount(): number {
  if (typeof window === "undefined") return 1;
  try {
    const next = getGuestMessageCount() + 1;
    localStorage.setItem(STORAGE_KEYS.GUEST_MSG_COUNT, String(next));
    return next;
  } catch {
    return 1;
  }
}

function resetGuestMessageCount(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.GUEST_MSG_COUNT);
  } catch {}
}

function getGuestChats(): ChatHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GUEST_CHATS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGuestChats(chats: ChatHistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.GUEST_CHATS, JSON.stringify(chats));
  } catch {}
}

function getGuestMessages(chatId: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.GUEST_MSG_PREFIX}${chatId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGuestMessages(chatId: string, messages: Message[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_KEYS.GUEST_MSG_PREFIX}${chatId}`, JSON.stringify(messages));
  } catch {}
}

function deleteGuestChat(chatId: string): void {
  if (typeof window === "undefined") return;
  try {
    const chats = getGuestChats().filter((c) => c.id !== chatId);
    saveGuestChats(chats);
    localStorage.removeItem(`${STORAGE_KEYS.GUEST_MSG_PREFIX}${chatId}`);
  } catch {}
}

function formatMessageTime(isoOrTimestamp?: string): string {
  if (!isoOrTimestamp) return "";
  try {
    const d = new Date(isoOrTimestamp);
    if (isNaN(d.getTime())) return "";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}.${minutes}`;
  } catch {
    return "";
  }
}

const PreBlockContext = React.createContext<boolean>(false);

const UUID_PATH_REGEX = /^\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;
const VALID_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ChatInterfaceProps {
  initialChatId?: string;
}

interface RetryPayload {
  chatId: string;
  sessionId: string;
  content: string;
  regenerate?: boolean;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  content: string;
  created_at?: string;
  agentId?: string;
  agentName?: string;
  attachments?: AttachmentItem[];
  isError?: boolean;
  errorDetail?: string;
  retryPayload?: RetryPayload;
  lensData?: AxiomaLensData;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "image" | "video";
  mediaTitle?: string;
  revisedPrompt?: string;
}

interface ChatSession {
  id: string;
  title: string;
  dateCategory: "TODAY" | "YESTERDAY" | "PREVIOUS 7 DAYS";
  messages: Message[];
}

interface ChatHistoryItem {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  last_activity_at?: string;
}

interface FeedbackItem {
  rating: "up" | "down";
  comment?: string;
}

type TimeGroupLabel =
  | "Hari ini"
  | "Kemarin"
  | "7 hari terakhir"
  | "30 hari terakhir"
  | "Lebih lama";

const TIME_GROUP_ORDER: TimeGroupLabel[] = [
  "Hari ini",
  "Kemarin",
  "7 hari terakhir",
  "30 hari terakhir",
  "Lebih lama",
];

interface Agent {
  id: "axioma-pro" | "axioma-omni" | "axioma-architect";
  name: string;
  shortName: string;
  tag: string;
  description: string;
}

const AVAILABLE_AGENTS: Agent[] = [
  {
    id: "axioma-pro",
    name: "Axioma Pro",
    shortName: "Pro",
    tag: "Mendalam",
    description: "Logika kompleks dan penalaran analitis",
  },
  {
    id: "axioma-omni",
    name: "Axioma Omni",
    shortName: "Omni",
    tag: "Multimodal",
    description: "Multimodal cepat untuk analisis foto, dokumen PDF, dan obrolan harian",
  },
  {
    id: "axioma-architect",
    name: "Axioma Architect",
    shortName: "Architect",
    tag: "Kode",
    description: "Desain sistem dan sintesis kode",
  },
];

const DYNAMIC_PLACEHOLDERS = [
  "Tulis pesan ke Axioma...",
  "Tanyakan ide atau kode...",
  "Ketik atau tekan ikon suara...",
] as const;

function getContextualGreetingByHour(hour: number, firstName?: string | null): string {
  const cleanFirst = firstName?.trim();
  if (cleanFirst) {
    if (hour >= 4 && hour < 11) return `Selamat pagi, ${cleanFirst}. Mau mulai dari mana?`;
    if (hour >= 11 && hour < 15) return `Selamat siang, ${cleanFirst}. Ada yang bisa dibantu?`;
    if (hour >= 15 && hour < 18) return `Selamat sore, ${cleanFirst}. Mau bahas apa hari ini?`;
    return `Selamat malam, ${cleanFirst}. Lagi fokus ngerjain apa?`;
  }
  if (hour >= 4 && hour < 11) return "Selamat pagi, mau mulai dari mana?";
  if (hour >= 11 && hour < 15) return "Selamat siang, ada yang bisa dibantu?";
  if (hour >= 15 && hour < 18) return "Selamat sore, mau bahas apa hari ini?";
  return "Selamat malam, lagi fokus ngerjain apa?";
}

function triggerHaptic(durationMs = 10): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(durationMs);
    }
  } catch {
    // Ignore on unsupported devices / browsers
  }
}

/**
 * Inline voice waveform visualizer for dictation (Gemini-style)
 * Renders 13 thin rounded vertical bars (2px width) that move real-time with
 * microphone volume via Web Audio AnalyserNode in requestAnimationFrame, with 0 React re-renders.
 */
function InlineVoiceWaveform({
  analyser,
  recordingSeconds,
  onSpeechDetected,
}: {
  analyser: AnalyserNode | null;
  recordingSeconds: number;
  onSpeechDetected?: () => void;
}) {
  const NUM_BARS = 13;
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const speechDetectedRef = useRef<boolean>(false);
  const accumulatedSpeechMsRef = useRef<number>(0);
  const lastSampleTimeRef = useRef<number>(0);
  const onSpeechDetectedRef = useRef(onSpeechDetected);

  useEffect(() => {
    onSpeechDetectedRef.current = onSpeechDetected;
  }, [onSpeechDetected]);

  useEffect(() => {
    if (!analyser) return;

    speechDetectedRef.current = false;
    accumulatedSpeechMsRef.current = 0;
    lastSampleTimeRef.current = Date.now();

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateWave = () => {
      const now = Date.now();
      const deltaMs = Math.min(100, Math.max(1, now - lastSampleTimeRef.current));
      lastSampleTimeRef.current = now;

      // Always sample audio volume for Voice Activity Detection
      analyser.getByteTimeDomainData(dataArray);
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const norm = (dataArray[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      // Voice Activity Detection: RMS >= 0.02 for at least ~300 ms total
      if (rms >= 0.02) {
        accumulatedSpeechMsRef.current += deltaMs;
        if (!speechDetectedRef.current && accumulatedSpeechMsRef.current >= 300) {
          speechDetectedRef.current = true;
          onSpeechDetectedRef.current?.();
        }
      }

      if (prefersReducedMotion) {
        const t = now / 600;
        for (let i = 0; i < NUM_BARS; i++) {
          const bar = barRefs.current[i];
          if (bar) {
            const h = 4 + Math.sin(t + i * 0.4) * 4;
            bar.style.height = `${Math.max(4, h)}px`;
          }
        }
        animFrameRef.current = requestAnimationFrame(updateWave);
        return;
      }

      const boostedVolume = Math.min(1, rms * 6);
      for (let i = 0; i < NUM_BARS; i++) {
        const bar = barRefs.current[i];
        if (bar) {
          const distFromCenter = Math.abs(i - 6);
          const centerWeight = Math.max(0.3, 1 - Math.pow(distFromCenter / 6.5, 1.6) * 0.7);
          const variance = 0.85 + Math.sin(i * 1.4 + now * 0.012) * 0.15;
          const targetHeight = 4 + boostedVolume * 22 * centerWeight * variance;
          bar.style.height = `${Math.min(26, Math.max(4, targetHeight))}px`;
        }
      }

      animFrameRef.current = requestAnimationFrame(updateWave);
    };

    animFrameRef.current = requestAnimationFrame(updateWave);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [analyser]);

  const minutes = Math.floor(recordingSeconds / 60);
  const seconds = recordingSeconds % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="flex-1 min-w-0 flex items-center justify-center gap-3 py-1.5 px-2 animate-in fade-in duration-200">
      {/* 13 live vertical bars */}
      <div className="flex items-center gap-[3px] h-7 px-1" aria-hidden="true">
        {Array.from({ length: NUM_BARS }).map((_, idx) => (
          <span
            key={idx}
            ref={(el) => {
              barRefs.current[idx] = el;
            }}
            className="w-[2px] bg-text-secondary/85 rounded-full transition-[height] duration-75 ease-out select-none"
            style={{ height: "4px" }}
          />
        ))}
      </div>

      {/* Timer */}
      <span className="text-[11px] sm:text-xs text-text-muted/70 tracking-wider tabular-nums select-none">
        {formattedTime}
      </span>
    </div>
  );
}

const INITIAL_CHATS: ChatSession[] = [];

function safeGetLocalStorage(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota or private mode errors
  }
}

function safeRemoveLocalStorage(key: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {}
}

function safeGetChatDraft(chatKey: string): string {
  if (!chatKey) return "";
  return safeGetLocalStorage(`${STORAGE_KEYS.DRAFT_PREFIX}${chatKey}`) || "";
}

function safeSetChatDraft(chatKey: string, text: string): void {
  if (!chatKey) return;
  if (!text || !text.trim()) {
    safeRemoveLocalStorage(`${STORAGE_KEYS.DRAFT_PREFIX}${chatKey}`);
  } else {
    safeSetLocalStorage(`${STORAGE_KEYS.DRAFT_PREFIX}${chatKey}`, text);
  }
}

function safeRemoveChatDraft(chatKey: string): void {
  if (!chatKey) return;
  safeRemoveLocalStorage(`${STORAGE_KEYS.DRAFT_PREFIX}${chatKey}`);
}

function safeGetPendingDeletes(): string[] {
  try {
    const raw = safeGetLocalStorage(STORAGE_KEYS.PENDING_DELETES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function safeAddPendingDelete(id: string): void {
  try {
    const current = safeGetPendingDeletes();
    if (!current.includes(id)) {
      safeSetLocalStorage(STORAGE_KEYS.PENDING_DELETES, JSON.stringify([...current, id]));
    }
  } catch {}
}

function safeRemovePendingDelete(id: string): void {
  try {
    const current = safeGetPendingDeletes();
    safeSetLocalStorage(
      STORAGE_KEYS.PENDING_DELETES,
      JSON.stringify(current.filter((item) => item !== id))
    );
  } catch {}
}

function appendStoppedNotice(rawText: string): string {
  const trimmed = rawText.trimEnd();
  if (!trimmed) return "_[Respons dihentikan]_";
  if (trimmed.includes("[Respons dihentikan]")) return trimmed;
  return `${trimmed}\n\n_[Respons dihentikan]_`;
}

function getChatTimestamp(chat: ChatHistoryItem): number {
  const raw = chat.last_activity_at || chat.updated_at || chat.created_at;
  const parsed = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getTimeGroupLabel(timestampMs: number, now: Date): TimeGroupLabel {
  if (!timestampMs) return "Lebih lama";

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startOfYesterday = startOfToday - oneDayMs;
  const startOf7DaysAgo = startOfToday - 7 * oneDayMs;
  const startOf30DaysAgo = startOfToday - 30 * oneDayMs;

  if (timestampMs >= startOfToday) return "Hari ini";
  if (timestampMs >= startOfYesterday) return "Kemarin";
  if (timestampMs >= startOf7DaysAgo) return "7 hari terakhir";
  if (timestampMs >= startOf30DaysAgo) return "30 hari terakhir";
  return "Lebih lama";
}

function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getRandomGreeting(name?: string | null, isAuth?: boolean): string {
  const cleanName = name?.trim();
  const hasValidName = Boolean(
    isAuth && cleanName && cleanName.toLowerCase() !== "pengguna" && cleanName.toLowerCase() !== "mode tamu"
  );

  if (hasValidName && cleanName) {
    const formattedName = toTitleCase(cleanName);
    const userGreetings = [
      `Halo ${formattedName}, apa yang bisa saya bantu hari ini?`,
    ];
    return userGreetings[0];
  }

  return "Halo, apa yang bisa saya bantu hari ini?";
}

function formatGreetingName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  return toTitleCase(trimmed.split(/\s+/)[0]);
}

function getAvatarInitials(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "P";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

function detectMediaIntent(
  text: string,
  hasAttachment = false
): { type: "image" | "video" | null; visualPrompt: string } {
  if (hasAttachment || !text || typeof text !== "string") {
    return { type: null, visualPrompt: "" };
  }
  const raw = text.trim();
  if (!raw || /^\s*\/[a-z0-9_-]+/i.test(raw)) {
    return { type: null, visualPrompt: raw };
  }

  // Negative checks: exclude theory, tutorials, explanations, and text/prompt-only requests
  const negativeExclusions = [
    /\b(cara\s+(mem)?buat(kan)?|cara\s+bikin(in)?|cara\s+menggambar|cara\s+melukis|cara\s+(meng)?edit|cara\s+(mem)?foto|cara\s+memotret|cara\s+(me)?rekam)\b/i,
    /\b(tips|tutorial|panduan|step\s*by\s*step|langkah[\s-]langkah)\b/i,
    /\b(jelaskan|penjelasan|definisi|pengertian|sejarah|perbedaan\s+antara|apa\s+bedanya)\b/i,
    /^(apa\s+itu|apa\s+arti|apa\s+fungsi|mengapa|kenapa|bagaimana\s+cara|gimana\s+cara|rekomendasi\s+(aplikasi|software|tools?))\b/i,
    /\b(buatkan|buatin|buat|bikin|bikinin|tulis|tuliskan|kasih|berikan|generate)\s+(dong\s+|saya\s+|aku\s+|gue\s+|me\s+)?(sebuah\s+|beberapa\s+|contoh\s+|ide\s+|teks\s+|draf\s+|draft\s+)?(prompt|skrip|script|naskah|storyboard|caption|ide\s+konten)\b/i,
    /\bprompt\s+(gambar|foto|image|video|animasi|ilustrasi|poster|logo|midjourney|dall-?e|flux|imagen|veo|sora|runway)\b/i,
    /\b(konsep|naskah|skrip|script|storyboard|ide)\s+(untuk\s+)?(video|foto|gambar|poster|ilustrasi|iklan)\b/i,
  ];
  if (negativeExclusions.some((rgx) => rgx.test(raw))) {
    return { type: null, visualPrompt: raw };
  }

  // Explicit video triggers (checked first for phrases like "animasi video")
  const videoKeywords = [
    /\b(buatin|buatkan|buat|bikin|bikinin|generate|render|ciptakan|hadirkan)\s+(dong\s+|saya\s+|aku\s+|gue\s+|me\s+)?(sebuah\s+|satu\s+|1\s+|a\s+|an\s+)?(animasi\s+video|video\s+animasi|klip\s+video|video\s+klip|video\s+sinematik|motion\s+video|video|klip|clip|animasi)\b/i,
    /\b(tolong|coba|bisa(?:\s+tolong)?)\s+(buatin|buatkan|buat|bikin|bikinin|generate|render)\s+(dong\s+|saya\s+|aku\s+|gue\s+)?(sebuah\s+|satu\s+|1\s+|a\s+|an\s+)?(animasi\s+video|video\s+animasi|klip\s+video|video|animasi|klip)\b/i,
    /\b(animasikan|videokan)\b/i,
    /^\s*\[mode:\s*(video|animasi|klip)\]/i,
    /^\s*(video|animasi\s+video)\s*:\s*\S+/i,
  ];

  if (videoKeywords.some((rgx) => rgx.test(raw))) {
    let cleaned = raw;
    cleaned = cleaned.replace(/^\[mode:\s*(video|animasi|klip)\]\s*:?/i, "");
    cleaned = cleaned.replace(
      /^(tolong|coba|bisa(?:\s+kamu|\s+tolong)?)?\s*(buatin|buatkan|buat|bikin|bikinin|generate|animasikan|videokan|render|ciptakan|hadirkan)\s*(dong|saya|aku|gue)?\s*(animasi\s+video|video\s+animasi|klip\s+video|video|animasi|klip|clip|motion|sinematik)?\s*(bertema|dengan tema|tema|topik|tentang|dari|sebuah|seekor|seorang|suatu|berupa|:)?\s*/i,
      ""
    );
    cleaned = cleaned.replace(
      /^(video|animasi\s+video|animasi|klip|sinematik)\s*(bertema|dengan tema|tema|topik|tentang|dari|sebuah|seekor|seorang|suatu|:)\s*/i,
      ""
    );
    return { type: "video", visualPrompt: cleaned.trim() || raw };
  }

  // Guard figurative uses of "gambarkan" (e.g. "gambarkan konsep ekonomi")
  const isAbstractGambarkan =
    /\bgambarkan\s+(secara\s+(singkat|jelas|ringkas|umum)|bagaimana|cara|konsep|proses|alur|perbedaan|hubungan|dampak|situasi\s+ekonomi|kondisi\s+pasar)\b/i.test(
      raw
    );
  if (
    isAbstractGambarkan &&
    !/\b(buatin|buatkan|bikin|bikinin|generate|desainkan|fotokan|lukiskan)\b/i.test(raw)
  ) {
    return { type: null, visualPrompt: raw };
  }

  // Explicit image triggers
  const imageKeywords = [
    /\b(buatin|buatkan|buat|bikin|bikinin|generate|render|ciptakan|hadirkan|lukis|lukiskan|gambarin|gambari|gambarkan|fotokan|desain|desainkan|desainin|rancangkan)\s+(dong\s+|saya\s+|aku\s+|gue\s+|me\s+)?(sebuah\s+|satu\s+|1\s+|seekor\s+|seorang\s+|a\s+|an\s+)?(foto|gambar|ilustrasi|lukisan|visual|image|photo|picture|artwork|wallpaper|poster|logo|banner|thumbnail|karikatur|sketsa|potret|portrait|stiker|avatar)\b/i,
    /\b(desainkan|desainin)\s+(dong\s+|saya\s+|aku\s+|gue\s+)?(sebuah\s+|satu\s+|1\s+)?(poster|logo|banner|flyer|brosur|spanduk|thumbnail|kemasan|packaging|kaos|baju)\b/i,
    /\b(gambarkan|gambarin|gambari|lukiskan|fotokan)\s+\S+/i,
    /^\s*\[mode:\s*(gambar|image|foto|visual)\]/i,
    /^\s*(gambar|foto|ilustrasi|poster|logo)\s*:\s*\S+/i,
  ];

  if (imageKeywords.some((rgx) => rgx.test(raw))) {
    let cleaned = raw;
    cleaned = cleaned.replace(/^\[mode:\s*(gambar|image|foto|visual)\]\s*:?/i, "");
    cleaned = cleaned.replace(
      /^(tolong|coba|bisa(?:\s+kamu|\s+tolong)?)?\s*(buatin|buatkan|buat|bikin|bikinin|generate|lukiskan|lukis|gambarkan|gambari|gambarin|fotokan|desainkan|desainin|render|ciptakan|hadirkan)\s*(dong|saya|aku|gue)?\s*(gambar|foto|lukisan|ilustrasi|visual|image|photo|artwork|wallpaper|poster|logo)?\s*(bertema|dengan tema|tema|topik|tentang|dari|sebuah|seekor|seorang|suatu|berupa|:)?\s*/i,
      ""
    );
    cleaned = cleaned.replace(
      /^(gambar|foto|lukisan|ilustrasi|visual|poster|logo)\s*(bertema|dengan tema|tema|topik|tentang|dari|sebuah|seekor|seorang|suatu|:)\s*/i,
      ""
    );
    return { type: "image", visualPrompt: cleaned.trim() || raw };
  }

  return { type: null, visualPrompt: raw };
}

function extractStructuredMediaPayload(payload: any): {
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "image" | "video";
  mediaTitle?: string;
  revisedPrompt?: string;
} {
  if (!payload || typeof payload !== "object") return {};

  const rawType = String(payload.mediaType || payload.media_type || payload.type || "")
    .trim()
    .toLowerCase();
  const genericMediaUrl =
    typeof payload.mediaUrl === "string" && payload.mediaUrl.trim()
      ? payload.mediaUrl.trim()
      : typeof payload.media_url === "string" && payload.media_url.trim()
        ? payload.media_url.trim()
        : undefined;
  const isGenericMediaVideo =
    Boolean(genericMediaUrl) &&
    (rawType === "video" || /\.(mp4|webm|mov)(\?.*)?$/i.test(genericMediaUrl || ""));

  const explicitImageUrl =
    typeof payload.imageUrl === "string" && payload.imageUrl.trim()
      ? payload.imageUrl.trim()
      : typeof payload.image_url === "string" && payload.image_url.trim()
        ? payload.image_url.trim()
        : rawType === "image" && typeof payload.url === "string" && payload.url.trim()
          ? payload.url.trim()
          : genericMediaUrl && !isGenericMediaVideo
            ? genericMediaUrl
            : undefined;
  const explicitVideoUrl =
    typeof payload.videoUrl === "string" && payload.videoUrl.trim()
      ? payload.videoUrl.trim()
      : typeof payload.video_url === "string" && payload.video_url.trim()
        ? payload.video_url.trim()
        : rawType === "video" && typeof payload.url === "string" && payload.url.trim()
          ? payload.url.trim()
          : genericMediaUrl && isGenericMediaVideo
            ? genericMediaUrl
            : undefined;
  const mediaType: "image" | "video" | undefined = explicitImageUrl
    ? "image"
    : explicitVideoUrl
      ? "video"
      : rawType === "image" || rawType === "video"
        ? rawType
        : undefined;
  const revisedPrompt =
    typeof payload.revisedPrompt === "string" && payload.revisedPrompt.trim()
      ? payload.revisedPrompt.trim()
      : typeof payload.revised_prompt === "string" && payload.revised_prompt.trim()
        ? payload.revised_prompt.trim()
        : typeof payload.enhanced_prompt === "string" && payload.enhanced_prompt.trim()
          ? payload.enhanced_prompt.trim()
          : undefined;
  const mediaTitle =
    typeof payload.mediaTitle === "string" && payload.mediaTitle.trim()
      ? payload.mediaTitle.trim()
      : typeof payload.title === "string" && payload.title.trim()
        ? payload.title.trim()
        : typeof payload.original_prompt === "string" && payload.original_prompt.trim()
          ? payload.original_prompt.trim()
          : undefined;

  return {
    imageUrl: explicitImageUrl,
    videoUrl: explicitVideoUrl,
    mediaType,
    mediaTitle,
    revisedPrompt,
  };
}

function sanitizeAxiomaMessageContent(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let text = raw;

  // 1. Remove "🎨 Mengoptimalkan prompt visual..." loading status line
  text = text.replace(/^[^\w\n]*Mengoptimalkan prompt visual[^\n]*\n*/gim, "");
  text = text.replace(/^[^\w\n]*Sedang merender[^\n]*\n*/gim, "");
  text = text.replace(/.*Gemini AI\.\.\..*\n*/gi, "");

  // 2. Standardize introduction text to clean format
  text = text.replace(
    /Berikut adalah hasil gambar berkualitas tinggi yang dihasilkan berdasarkan permintaan Anda:/gi,
    "Berikut visualisasi untuk permintaan Anda:"
  );
  text = text.replace(
    /Berikut visual yang telah disiapkan:/gi,
    "Berikut visualisasi untuk permintaan Anda:"
  );
  text = text.replace(
    /Berikut hasil visualnya:/gi,
    "Berikut visualisasi untuk permintaan Anda:"
  );

  // 3. Remove prompt enhancement blocks and machine labels
  text = text.replace(/>\s*\*?\*?✨?\s*Prompt yang Disempurnakan[^\n]*\n*(?:>\s*[^\n]*\n*)*/gi, "");
  text = text.replace(/>\s*\*?Mesin:[^\n]*\n*/gi, "");
  text = text.replace(/>\s*\*?Status Layanan Google Veo[^\n]*\n*(?:[^\n]*\n*)*/gi, "");
  text = text.replace(/💡\s*\*?Tips:[^\n]*\n*/gi, "");

  // 4. Clean consecutive blank lines
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

interface UserAvatarProps {
  url?: string | null;
  name?: string | null;
  className?: string;
}

function UserAvatar({ url, name, className = "" }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const cleanUrl =
    typeof url === "string" &&
    url.trim().length > 0 &&
    url !== "null" &&
    url !== "undefined"
      ? url.trim()
      : null;

  const initial = (name || "P").trim().charAt(0).toUpperCase() || "P";

  useEffect(() => {
    setImgError(false);
  }, [cleanUrl]);

  if (cleanUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cleanUrl}
        alt={name || "Avatar"}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`w-full h-full object-cover rounded-full ${className}`}
      />
    );
  }

  return <span className="uppercase font-semibold select-none">{initial}</span>;
}

function useAnimatedPresence(isOpen: boolean, durationMs = 300) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isEntered, setIsEntered] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isOpen) {
      setShouldRender(true);
      const raf = requestAnimationFrame(() => {
        setIsEntered(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setIsEntered(false);
      timer = setTimeout(() => {
        setShouldRender(false);
      }, durationMs);
    }
    return () => clearTimeout(timer);
  }, [isOpen, durationMs]);

  return { shouldRender, isEntered };
}

export default function ChatInterface({ initialChatId }: ChatInterfaceProps = {}) {
  const [chats, setChats] = useState<ChatSession[]>(INITIAL_CHATS);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>(
    initialChatId && VALID_UUID_REGEX.test(initialChatId) ? initialChatId : "new-chat"
  );
  const [currentSessionChatId, setCurrentSessionChatId] = useState<string>(
    initialChatId && VALID_UUID_REGEX.test(initialChatId) ? initialChatId : ""
  );
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [guestMessageCount, setGuestMessageCount] = useState<number>(0);
  const [isGuestLimitModalOpen, setIsGuestLimitModalOpen] = useState<boolean>(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [hasMessages, setHasMessages] = useState<boolean>(false);

  // Per-chat loading, generating, and streaming message ID states (#8)
  const [loadingByChat, setLoadingByChat] = useState<Record<string, boolean>>({});
  const [generatingByChat, setGeneratingByChat] = useState<Record<string, boolean>>({});
  const [streamingMsgIdByChat, setStreamingMsgIdByChat] = useState<Record<string, string | null>>(
    {}
  );

  // Client-only clock & loading skeleton states (#5, #6, #7, #10)
  const [clientNow, setClientNow] = useState<Date | null>(null);
  const [isSidebarLoading, setIsSidebarLoading] = useState<boolean>(false);
  const [isChatAreaLoading, setIsChatAreaLoading] = useState<boolean>(
    Boolean(initialChatId && initialChatId.trim().length > 0)
  );
  const [isTouchOrMobile, setIsTouchOrMobile] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showThinkingIndicator, setShowThinkingIndicator] = useState<boolean>(false);
  const [isThinkingFadingOut, setIsThinkingFadingOut] = useState<boolean>(false);
  const [showEmptyDecorations, setShowEmptyDecorations] = useState<boolean>(true);
  const [isEmptyDecorationsExiting, setIsEmptyDecorationsExiting] = useState<boolean>(false);
  const [isSendPressed, setIsSendPressed] = useState<boolean>(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState<boolean>(false);
  const [greeting, setGreeting] = useState<string>("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isMacOs, setIsMacOs] = useState<boolean>(false);
  const [agentDropdownDirection, setAgentDropdownDirection] = useState<DropdownDirection>("up");
  const [settingsPopoverStyle, setSettingsPopoverStyle] = useState<React.CSSProperties | undefined>(undefined);
  const [profilePopoverStyle, setProfilePopoverStyle] = useState<React.CSSProperties | undefined>(undefined);
  const [profileAnchor, setProfileAnchor] = useState<"header" | "sidebar">("header");
  const [profileSwipeDeltaY, setProfileSwipeDeltaY] = useState<number>(0);
  const [sidebarSwipeDeltaX, setSidebarSwipeDeltaX] = useState<number>(0);
  const [activeMediaMode, setActiveMediaMode] = useState<"image" | "video" | null>(null);
  const activeMediaModeRef = useRef<"image" | "video" | null>(null);

  // User profile & model selection state (persisted in localStorage)
  const [displayName, setDisplayName] = useState<string>(DEFAULT_DISPLAY_NAME);
  const avatarUrl = authUser
    ? authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null
    : null;
  const rawUserName = authUser
    ? displayName ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split("@")[0] ||
      "Pengguna"
    : "Mode Tamu";
  const userName = toTitleCase(rawUserName);

  const [defaultAgentId, setDefaultAgentId] = useState<Agent["id"]>("axioma-pro");
  const [selectedAgent, setSelectedAgent] = useState<Agent>(AVAILABLE_AGENTS[0]);
  const language: LanguageCode = "auto";
  const [tone, setTone] = useState<ToneStyle>(DEFAULT_TONE);
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>(DEFAULT_THINKING_MODE);
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>(DEFAULT_ANSWER_STYLE);
  const [socialTarget, setSocialTarget] = useState<SocialTarget>(DEFAULT_SOCIAL_TARGET);
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState<boolean>(false);
  const [isRoleplayModalOpen, setIsRoleplayModalOpen] = useState<boolean>(false);
  const [livePreviewCode, setLivePreviewCode] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<QuotaModalInfo | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [isLensLoading, setIsLensLoading] = useState<boolean>(false);
  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(false);
  const [requirementLockItems, setRequirementLockItems] = useState<string[]>([]);
  const [isRequirementLockEnabled, setIsRequirementLockEnabled] = useState<boolean>(false);
  const [settingsReqDraft, setSettingsReqDraft] = useState<string>("");
  const [openAiActionMenuId, setOpenAiActionMenuId] = useState<string | null>(null);
  const [isVisionLoading, setIsVisionLoading] = useState<boolean>(false);
  const [activeLoadingContext, setActiveLoadingContext] = useState<
    "chat" | "lens" | "pdf" | "vision" | "image" | "video" | null
  >(null);
  const [pendingVisionPhoto, setPendingVisionPhoto] = useState<{
    previewUrl: string;
    base64: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    name: string;
    mode: "notes" | "table" | "quiz" | "tasks";
  } | null>(null);
  const [pendingPdfDoc, setPendingPdfDoc] = useState<{
    base64: string;
    fileName: string;
    fileSizeBytes: number;
    mode: "summary" | "glossary" | "critical_questions" | "ask";
  } | null>(null);
  const visionInputRef = useRef<HTMLInputElement>(null);
  const smartPdfInputRef = useRef<HTMLInputElement>(null);
  const [checklistState, setChecklistState] = useState<
    Record<string, Record<number, boolean>>
  >({});
  const [selectionEdit, setSelectionEdit] = useState<{
    messageId: string;
    selectedText: string;
    fullContext: string;
    top: number;
    left: number;
    revisedText: string | null;
    isLoading: boolean;
    error: string | null;
  } | null>(null);
  const [userProfile, setUserProfile] = useState<string>("");
  const [contextControl, setContextControl] = useState<ContextControlState>(
    DEFAULT_CONTEXT_CONTROL
  );
  const [pendingTaskBreakdown, setPendingTaskBreakdown] = useState<boolean>(false);
  const [slashMenuIndex, setSlashMenuIndex] = useState<number>(0);
  const [enhancedPromptPreview, setEnhancedPromptPreview] = useState<string | null>(null);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
  const [structuredFeedbackThanksId, setStructuredFeedbackThanksId] = useState<string | null>(
    null
  );
  const [chatContextState, setChatContextState] = useState<ChatContextState>({
    checkpoint: null,
    contextCorrection: "",
    decisions: [],
  });
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState<boolean>(false);
  const [isHeaderAgentMenuOpen, setIsHeaderAgentMenuOpen] = useState<boolean>(false);
  const [headerMenuTop, setHeaderMenuTop] = useState<number | null>(null);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState<boolean>(false);

  // Settings Modal & Clear All Chats Modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [settingsView, setSettingsView] = useState<"main" | "feedback" | "about">("main");
  const [settingsNameInput, setSettingsNameInput] = useState<string>(DEFAULT_DISPLAY_NAME);
  const [settingsNameError, setSettingsNameError] = useState<string | null>(null);
  const [settingsDefaultAgentInput, setSettingsDefaultAgentInput] =
    useState<Agent["id"]>("axioma-pro");
  const [themeMode, setThemeMode] = useState<"dark" | "light" | "system">("system");
  const [expandedSettingsSection, setExpandedSettingsSection] = useState<string | null>(null);
  const [desktopSettingsPage, setDesktopSettingsPage] = useState<
    | "account"
    | "quota"
    | "notifications"
    | "agent"
    | "storage"
    | "shortcuts"
    | "theme"
    | "feedback"
    | "about"
    | null
  >(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState<boolean>(false);
  const [isClearingAllChats, setIsClearingAllChats] = useState<boolean>(false);

  const openDesktopSettingsPage = useCallback(
    (
      page:
        | "account"
        | "quota"
        | "notifications"
        | "agent"
        | "storage"
        | "shortcuts"
        | "theme"
        | "feedback"
        | "about"
    ) => {
      setSettingsNameInput(displayName);
      setSettingsNameError(null);
      setSettingsDefaultAgentInput(defaultAgentId);
      setIsSettingsModalOpen(false);
      setIsProfileDropdownOpen(false);
      setIsSettingsMenuOpen(false);
      setDesktopSettingsPage(page);
    },
    [displayName, defaultAgentId]
  );

  const openSettingsModal = useCallback(
    (
      view: "main" | "feedback" | "about" = "main",
      expandedSection: string | null = null
    ) => {
      if (typeof window !== "undefined" && window.innerWidth >= 768) {
        if (view === "feedback") {
          openDesktopSettingsPage("feedback");
          return;
        }
        if (view === "about") {
          openDesktopSettingsPage("about");
          return;
        }
        if (expandedSection === "account" || expandedSection === "quota" || expandedSection === "agent" || expandedSection === "shortcuts") {
          openDesktopSettingsPage(expandedSection);
          return;
        }
      }
      setSettingsNameInput(displayName);
      setSettingsNameError(null);
      setSettingsDefaultAgentInput(defaultAgentId);
      setExpandedSettingsSection(expandedSection);
      setSettingsView(view);
      setIsSettingsModalOpen(true);
    },
    [displayName, defaultAgentId, openDesktopSettingsPage]
  );

  // Desktop sidebar collapse state
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(false);

  // User message inline edit & truncate confirmation states
  const [editingUserMsgId, setEditingUserMsgId] = useState<string | null>(null);
  const [editingUserMsgText, setEditingUserMsgText] = useState<string>("");
  const [editConfirmTarget, setEditConfirmTarget] = useState<{
    msgId: string;
    content: string;
    subsequentCount: number;
  } | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  const [inputText, setInputText] = useState<string>("");
  const [contextualGreeting, setContextualGreeting] = useState<string>(
    "Halo, mau bahas apa hari ini?"
  );
  const [placeholderIndex, setPlaceholderIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Attachment state (Stage 2)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const attachmentTriggerRef = useRef<HTMLButtonElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const attachmentItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const refreshedAttachmentsRef = useRef<Set<string>>(new Set());

  // Two-way Animated Presences (Apple Spring Enter & Exit Transitions)
  const { shouldRender: shouldRenderSettings, isEntered: isSettingsEntered } =
    useAnimatedPresence(isSettingsModalOpen, 320);
  const { shouldRender: shouldRenderProfile, isEntered: isProfileEntered } =
    useAnimatedPresence(isProfileDropdownOpen, 320);
  const { shouldRender: shouldRenderAttachmentMenu, isEntered: isAttachmentMenuEntered } =
    useAnimatedPresence(isAttachmentMenuOpen, 220);
  const { shouldRender: shouldRenderHeaderAgentMenu, isEntered: isHeaderAgentMenuEntered } =
    useAnimatedPresence(isHeaderAgentMenuOpen, 220);
  const { shouldRender: shouldRenderDesktopAgentMenu, isEntered: isDesktopAgentMenuEntered } =
    useAnimatedPresence(isAgentMenuOpen, 220);
  const { shouldRender: shouldRenderSidebarBackdrop, isEntered: isSidebarBackdropEntered } =
    useAnimatedPresence(isMobileSidebarOpen, 300);
  const { shouldRender: shouldRenderGuestLimit, isEntered: isGuestLimitEntered } =
    useAnimatedPresence(isGuestLimitModalOpen, 300);
  const { shouldRender: shouldRenderClearAllConfirm, isEntered: isClearAllConfirmEntered } =
    useAnimatedPresence(isClearAllConfirmOpen, 280);
  const { shouldRender: shouldRenderEditConfirm, isEntered: isEditConfirmEntered } =
    useAnimatedPresence(Boolean(editConfirmTarget), 280);
  const { shouldRender: shouldRenderLightbox, isEntered: isLightboxEntered } =
    useAnimatedPresence(Boolean(lightboxImage), 250);

  // Cached display values for exit animations
  const [displayLightbox, setDisplayLightbox] = useState<{ url: string; name: string } | null>(null);
  useEffect(() => {
    if (lightboxImage) setDisplayLightbox(lightboxImage);
  }, [lightboxImage]);

  const [displayEditConfirm, setDisplayEditConfirm] = useState<{
    msgId: string;
    content: string;
    subsequentCount: number;
  } | null>(null);
  useEffect(() => {
    if (editConfirmTarget) setDisplayEditConfirm(editConfirmTarget);
  }, [editConfirmTarget]);

  // Feedback state: rating ("up" | "down") + optional comment box for "down"
  const [feedback, setFeedback] = useState<Record<string, FeedbackItem>>({});
  const [openFeedbackCommentId, setOpenFeedbackCommentId] = useState<string | null>(null);
  const [feedbackCommentDraft, setFeedbackCommentDraft] = useState<Record<string, string>>({});
  const [feedbackSavedNoticeId, setFeedbackSavedNoticeId] = useState<string | null>(null);

  // Cloudflare Turnstile token & widget ref (#9)
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileTokenRef = useRef<string | null>(null);
  const consecutiveTurnstileErrorsRef = useRef<number>(0);
  const pendingTokenResolversRef = useRef<Array<{ resolve: (token: string) => void; reject: (err: any) => void }>>([]);
  const turnstileResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Android keyboard & duplicate submission guards (#3, #6)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  // Voice Mode & Dictation states
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState<boolean>(false);
  const [showVoiceTranscript, setShowVoiceTranscript] = useState<boolean>(true);
  const [voiceSpeechRate, setVoiceSpeechRate] = useState<number>(1.08);
  const [voiceNeuralName, setVoiceNeuralName] = useState<"id-ID-ArdiNeural" | "id-ID-GadisNeural">("id-ID-ArdiNeural");
  const [isVoiceOptionsMenuOpen, setIsVoiceOptionsMenuOpen] = useState<boolean>(false);
  const voiceOptionsMenuRef = useRef<HTMLDivElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioContextRef = useRef<AudioContext | null>(null);
  const voiceTtsAnalyserRef = useRef<AnalyserNode | null>(null);
  const voiceTtsSourceConnectedRef = useRef<boolean>(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [dictationAnalyser, setDictationAnalyser] = useState<AnalyserNode | null>(null);

  const dictationRecorderRef = useRef<MediaRecorder | null>(null);
  const dictationStreamRef = useRef<MediaStream | null>(null);
  const dictationAudioContextRef = useRef<AudioContext | null>(null);
  const dictationAnalyserRef = useRef<AnalyserNode | null>(null);
  const dictationChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dictationActionRef = useRef<"stop" | "send">("stop");
  const hasSpokenRef = useRef<boolean>(false);
  const handleSendMessageRef = useRef<(textOverride?: string) => Promise<void>>(async () => {});

  // Sidebar chat item menu (⋯), inline rename, and undo delete states
  const [openChatMenuId, setOpenChatMenuId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>("");
  const [isSavingTitle, setIsSavingTitle] = useState<boolean>(false);
  const [undoToastChat, setUndoToastChat] = useState<ChatHistoryItem | null>(null);
  const pendingDeleteRef = useRef<{
    chat: ChatHistoryItem;
    originalHistoryIndex: number;
    originalSession?: ChatSession;
    timerId: any;
    expiresAt: number;
    isCancelled: boolean;
  } | null>(null);

  // Offline status & phased waiting timer states (Items 3 & 5)
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [waitingSeconds, setWaitingSeconds] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editUserTextareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const settingsNameInputRef = useRef<HTMLInputElement>(null);

  // Per-chat AbortControllers + stop flags so background streams don't leak across chats (#8)
  const requestControllersByChatRef = useRef<Record<string, AbortController>>({});
  const stoppedByUserByChatRef = useRef<Record<string, boolean>>({});
  const initialRouteLoadedRef = useRef<boolean>(false);
  const isUserScrolledUpRef = useRef<boolean>(false);
  const scrollRafRef = useRef<number | null>(null);
  const profileSwipeStartYRef = useRef<number | null>(null);
  const sidebarSwipeStartRef = useRef<{ x: number; y: number } | null>(null);

  // Trigger and menu refs for keyboard navigation & focus restoration
  const desktopAgentTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopAgentMenuRef = useRef<HTMLDivElement>(null);
  const desktopAgentItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const headerAgentTriggerRef = useRef<HTMLButtonElement>(null);
  const tabletAgentTriggerRef = useRef<HTMLButtonElement>(null);
  const headerAgentMenuRef = useRef<HTMLDivElement>(null);
  const headerAgentItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const chatMenuTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const chatMenuContainerRef = useRef<HTMLDivElement>(null);
  const chatMenuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const gearButtonRef = useRef<HTMLButtonElement>(null);
  const headerProfileTriggerRef = useRef<HTMLButtonElement>(null);
  const wasOfflineRef = useRef<boolean>(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const clearAllCancelButtonRef = useRef<HTMLButtonElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const currentMessages = activeChat ? activeChat.messages : [];

  // Derive current chat's loading, generating, and streaming message ID (#8)
  const currentChatKey = activeChatId === "new-chat" ? currentSessionChatId : activeChatId;
  const isLoading = Boolean(currentChatKey && loadingByChat[currentChatKey]);
  const isGenerating = Boolean(currentChatKey && generatingByChat[currentChatKey]);
  const streamingMessageId =
    (currentChatKey && streamingMsgIdByChat[currentChatKey]) || null;

  const setChatLoading = useCallback((chatId: string, value: boolean) => {
    setLoadingByChat((prev) => {
      if (Boolean(prev[chatId]) === value) return prev;
      const next = { ...prev };
      if (value) next[chatId] = true;
      else delete next[chatId];
      return next;
    });
  }, []);

  const setChatGenerating = useCallback((chatId: string, value: boolean) => {
    setGeneratingByChat((prev) => {
      if (Boolean(prev[chatId]) === value) return prev;
      const next = { ...prev };
      if (value) next[chatId] = true;
      else delete next[chatId];
      return next;
    });
  }, []);

  const setChatStreamingMsgId = useCallback((chatId: string, msgId: string | null) => {
    setStreamingMsgIdByChat((prev) => {
      if ((prev[chatId] || null) === msgId) return prev;
      const next = { ...prev };
      if (msgId) next[chatId] = msgId;
      else delete next[chatId];
      return next;
    });
  }, []);

  const syncBrowserUrl = useCallback((chatId: string | null, mode: "push" | "replace" = "push") => {
    if (typeof window === "undefined") return;
    const targetPath = chatId && chatId !== "new-chat" ? `/c/${chatId}` : "/";
    if (window.location.pathname === targetPath) return;
    if (mode === "replace") {
      window.history.replaceState({ chatId: chatId || "new-chat" }, "", targetPath);
    } else {
      window.history.pushState({ chatId: chatId || "new-chat" }, "", targetPath);
    }
  }, []);

  // Identify the last non-error AI message in the active chat (for the Regenerate 🔄 button)
  const lastAiMessageId = useMemo(() => {
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      const msg = currentMessages[i];
      if (msg.sender === "ai" && !msg.isError) {
        return msg.id;
      }
    }
    return null;
  }, [currentMessages]);

  const showToastNotice = useCallback((message: string, durationMs = 2000) => {
    setToastNotice(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastNotice(null);
      toastTimerRef.current = null;
    }, durationMs);
  }, []);

  const hasLoadedThemeRef = useRef<boolean>(false);

  const applyTheme = useCallback((mode: "dark" | "light" | "system") => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    let isDark = false;
    if (mode === "system") {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    } else {
      isDark = mode === "dark";
    }

    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }

    // Sync html/body surface, color-scheme, apple-mobile-web-app-status-bar-style, and theme-color synchronously + 1 rAF confirmation
    syncIosSafariTheme(isDark);
  }, []);

  const handleSetTheme = useCallback(
    (mode: "dark" | "light" | "system") => {
      hasLoadedThemeRef.current = true;
      setThemeMode(mode);
      safeSetLocalStorage(STORAGE_KEYS.THEME, mode);
      applyTheme(mode);
    },
    [applyTheme]
  );

  // Sync theme on changes, bfcache restore, and follow OS system theme changes in real time when mode is "system"
  useEffect(() => {
    if (hasLoadedThemeRef.current) {
      applyTheme(themeMode);
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        applyTheme(themeMode);
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    if (themeMode !== "system") {
      return () => {
        window.removeEventListener("pageshow", handlePageShow);
      };
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleOsThemeChange = () => {
      applyTheme("system");
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleOsThemeChange);
      return () => {
        window.removeEventListener("pageshow", handlePageShow);
        mediaQuery.removeEventListener("change", handleOsThemeChange);
      };
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleOsThemeChange);
      return () => {
        window.removeEventListener("pageshow", handlePageShow);
        mediaQuery.removeListener(handleOsThemeChange);
      };
    }
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [themeMode, applyTheme]);

  const isModalActiveRef = useRef<boolean>(false);
  useEffect(() => {
    isModalActiveRef.current = Boolean(
      isSettingsModalOpen ||
      isProfileDropdownOpen ||
      isClearAllConfirmOpen ||
      editConfirmTarget ||
      isGuestLimitModalOpen
    );
  }, [
    isSettingsModalOpen,
    isProfileDropdownOpen,
    isClearAllConfirmOpen,
    editConfirmTarget,
    isGuestLimitModalOpen,
  ]);

  const focusDesktopTextarea = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, []);

  const toggleDesktopSidebar = useCallback(() => {
    setIsDesktopSidebarCollapsed((prev) => {
      const next = !prev;
      safeSetLocalStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(next));
      return next;
    });
  }, []);

  // Initialize session UUID, user identity, saved display name, saved model, and Web Speech API support
  useEffect(() => {
    setClientNow(new Date());

    // Load saved sidebar state (default ringkas/mini rail 64px di Tablet/iPad Portrait 768–1023px)
    const savedCollapsed = safeGetLocalStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    if (savedCollapsed === "true") {
      setIsDesktopSidebarCollapsed(true);
    } else if (
      savedCollapsed === null &&
      typeof window !== "undefined" &&
      window.innerWidth >= 768 &&
      window.innerWidth < 1024
    ) {
      setIsDesktopSidebarCollapsed(true);
    }

    // Load saved theme
    const rawSavedTheme = safeGetLocalStorage(STORAGE_KEYS.THEME);
    const savedTheme: "dark" | "light" | "system" =
      rawSavedTheme === "dark" || rawSavedTheme === "light" || rawSavedTheme === "system"
        ? rawSavedTheme
        : "system";
    hasLoadedThemeRef.current = true;
    setThemeMode(savedTheme);
    applyTheme(savedTheme);

    // Auto-focus textarea on desktop
    focusDesktopTextarea();

    if (!initialChatId || !VALID_UUID_REGEX.test(initialChatId)) {
      const initialId = generateId(true);
      setCurrentSessionChatId(initialId);
    }

    // Load saved display name (ignore legacy hardcoded "Alex Vance" placeholder if present)
    const savedName = safeGetLocalStorage(STORAGE_KEYS.DISPLAY_NAME);
    if (savedName && savedName.trim() && savedName.trim() !== "Alex Vance") {
      const formatted = toTitleCase(savedName.trim());
      setDisplayName(formatted);
      setSettingsNameInput(formatted);
    } else if (savedName?.trim() === "Alex Vance") {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.DISPLAY_NAME);
      } catch {
        // Ignore storage errors
      }
    }

    // Load saved default & selected agent
    const savedDefault = safeGetLocalStorage(STORAGE_KEYS.DEFAULT_AGENT);
    const validDefault = AVAILABLE_AGENTS.find((a) => a.id === savedDefault);
    if (validDefault) {
      setDefaultAgentId(validDefault.id);
      setSettingsDefaultAgentInput(validDefault.id);
    }

    const savedSelected =
      safeGetLocalStorage(STORAGE_KEYS.SELECTED_AGENT) || savedDefault;
    const validSelected = AVAILABLE_AGENTS.find((a) => a.id === savedSelected);
    if (validSelected) {
      setSelectedAgent(validSelected);
    }

    // Load saved tone, thinking mode & answer style preferences (language always uses "auto" mirroring)
    const savedTone = safeGetLocalStorage(STORAGE_KEYS.TONE);
    if (isValidToneStyle(savedTone)) {
      setTone(savedTone);
    }
    const savedThinkingMode = safeGetLocalStorage(STORAGE_KEYS.THINKING_MODE);
    if (isValidThinkingMode(savedThinkingMode)) {
      setThinkingMode(savedThinkingMode);
    }
    const savedAnswerStyle = safeGetLocalStorage(STORAGE_KEYS.ANSWER_STYLE);
    if (isValidAnswerStyle(savedAnswerStyle)) {
      setAnswerStyle(savedAnswerStyle);
    }
    const savedSocialTarget = safeGetLocalStorage(STORAGE_KEYS.SOCIAL_TARGET);
    if (isValidSocialTarget(savedSocialTarget)) {
      setSocialTarget(savedSocialTarget);
    }

    // Load saved Workspaces / Project Spaces (SSR-safe localStorage)
    const savedWorkspaces = loadWorkspaces();
    setWorkspaces(savedWorkspaces);
    const savedActiveWsId = loadActiveWorkspaceId();
    if (savedActiveWsId && savedWorkspaces.some((w) => w.id === savedActiveWsId)) {
      setActiveWorkspaceId(savedActiveWsId);
    }

    // Remove legacy localStorage feedback cache so feedback is strictly server-backed (#4)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("axioma_message_feedback");
      }
    } catch {
      // Ignore storage errors
    }

    // Detect OS platform (macOS/iOS vs Windows/Linux) for keyboard shortcut badges (hydration-safe)
    if (typeof navigator !== "undefined") {
      const platformInfo = navigator.platform || navigator.userAgent || "";
      setIsMacOs(/Mac|iPhone|iPad|iPod/i.test(platformInfo));
    }

    // Detect Web Speech API support and touch/mobile viewport size in browser (#7) + tablet/split-screen auto-collapse
    const updateViewportFlag = () => {
      if (typeof window !== "undefined") {
        const w = window.innerWidth;
        const isTouch =
          w < 768 ||
          (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches);
        setIsTouchOrMobile(Boolean(isTouch));

        // Auto-collapse sidebar on narrow desktop/tablet split-screen (768px–1023px)
        if (w >= 768 && w < 1024) {
          setIsDesktopSidebarCollapsed(true);
        } else if (w >= 1024 && safeGetLocalStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED) !== "true") {
          setIsDesktopSidebarCollapsed(false);
        }
      }
    };

    if (typeof window !== "undefined") {
      const voiceSupport = checkVoiceSupport();
      setIsSpeechSupported(voiceSupport.hasMediaDevices && Boolean(getSupportedAudioMimeType()));
      updateViewportFlag();
      window.addEventListener("resize", updateViewportFlag);
    }

    let storedUserId = safeGetLocalStorage(STORAGE_KEYS.USER_ID);
    if (!storedUserId) {
      storedUserId = generateId();
      safeSetLocalStorage(STORAGE_KEYS.USER_ID, storedUserId);
    }
    setCurrentUserId(storedUserId);

    // Track online/offline status in real time with Glass Pill toast feedback
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      wasOfflineRef.current = !navigator.onLine;
      const handleOnline = () => {
        setIsOnline(true);
        if (wasOfflineRef.current) {
          wasOfflineRef.current = false;
          showToastNotice("Terhubung kembali", 2000);
        }
      };
      const handleOffline = () => {
        wasOfflineRef.current = true;
        setIsOnline(false);
        showToastNotice("Koneksi terputus — mencoba menyambung kembali...", 3500);
      };
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Handle delayed single chat deletion if tab is closed/refreshed (Item 4)
      const handlePageUnload = () => {
        const pending = pendingDeleteRef.current;
        if (pending && !pending.isCancelled) {
          const chatId = pending.chat.id;
          safeRemovePendingDelete(chatId);
          const url = `${BACKEND_URL}/api/chats/${chatId}`;
          const effectiveUserId = safeGetLocalStorage(STORAGE_KEYS.USER_ID) || "anon";
          try {
            fetch(url, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                "X-User-Id": effectiveUserId,
              },
              keepalive: true,
            });
          } catch {}
        }
      };
      window.addEventListener("pagehide", handlePageUnload);
      window.addEventListener("beforeunload", handlePageUnload);

      // Process any lingering pending chat deletes from previous sessions (Item 4)
      const pendingDeletes = safeGetPendingDeletes();
      if (pendingDeletes.length > 0) {
        pendingDeletes.forEach(async (id) => {
          try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            const uId = safeGetLocalStorage(STORAGE_KEYS.USER_ID);
            if (uId) headers["X-User-Id"] = uId;
            await fetch(`${BACKEND_URL}/api/chats/${id}`, { method: "DELETE", headers });
            safeRemovePendingDelete(id);
          } catch {}
        });
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("pagehide", handlePageUnload);
        window.removeEventListener("beforeunload", handlePageUnload);
        window.removeEventListener("resize", updateViewportFlag);
        if (toastTimerRef.current) {
          clearTimeout(toastTimerRef.current);
        }
      };
    }

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [initialChatId, showToastNotice]);

  // Supabase Auth session detection & auth state subscriber
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthUser(session.user);
        setAuthToken(session.access_token);
        const name =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split("@")[0];
        if (name) {
          const formatted = toTitleCase(name);
          setDisplayName(formatted);
          setSettingsNameInput(formatted);
          safeSetLocalStorage(STORAGE_KEYS.DISPLAY_NAME, formatted);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthUser(session.user);
        setAuthToken(session.access_token);
        const name =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split("@")[0];
        if (name) {
          const formatted = toTitleCase(name);
          setDisplayName(formatted);
          setSettingsNameInput(formatted);
          safeSetLocalStorage(STORAGE_KEYS.DISPLAY_NAME, formatted);
        }
      } else {
        setAuthUser(null);
        setAuthToken(null);
        setDisplayName(DEFAULT_DISPLAY_NAME);
        safeRemoveLocalStorage(STORAGE_KEYS.DISPLAY_NAME);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Synchronize guest message quota count on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setGuestMessageCount(getGuestMessageCount());
    }
  }, []);

  // When user logs in, reset guest quota count
  useEffect(() => {
    if (authUser) {
      resetGuestMessageCount();
      setGuestMessageCount(0);
    }
  }, [authUser]);

  // Guest Mode: Persist chat history metadata in localStorage (skipped in Mode Privat)
  useEffect(() => {
    if (!authUser && !isPrivateMode && chatHistory.length > 0) {
      saveGuestChats(chatHistory);
    }
  }, [chatHistory, authUser, isPrivateMode]);

  // Guest Mode: Debounced persist chat session messages in localStorage (skipped in Mode Privat)
  useEffect(() => {
    if (!authUser && !isPrivateMode && chats.length > 0) {
      const timer = setTimeout(() => {
        for (const c of chats) {
          if (c.messages && c.messages.length > 0) {
            saveGuestMessages(c.id, c.messages);
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [chats, authUser, isPrivateMode]);

  // Handle click outside Profile Dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(e.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  // Lightweight Render backend warmup on first page load without DB query (#1)
  useEffect(() => {
    if (!BACKEND_URL || typeof window === "undefined") return;
    void fetch(`${BACKEND_URL}/api/health`, {
      method: "GET",
      cache: "no-store",
    }).catch(() => {});
  }, []);

  // Cloudflare Turnstile Invisible Widget Setup (#2, #9)
  const renderTurnstileWidget = useCallback(async () => {
    if (!TURNSTILE_SITE_KEY || typeof window === "undefined") return;
    await loadTurnstileScript();
    if (!window.turnstile) return;

    const container = document.getElementById("turnstile-container");
    if (!container) return;

    // Prevent duplicate widget render in StrictMode / route changes
    if (turnstileWidgetIdRef.current) return;

    container.innerHTML = "";

    try {
      const widgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        size: "invisible",
        callback: (token: string) => {
          turnstileTokenRef.current = token;
          consecutiveTurnstileErrorsRef.current = 0;
          const resolvers = pendingTokenResolversRef.current;
          pendingTokenResolversRef.current = [];
          resolvers.forEach(({ resolve }) => resolve(token));
        },
        "expired-callback": () => {
          turnstileTokenRef.current = null;
          if (turnstileWidgetIdRef.current && window.turnstile) {
            try {
              window.turnstile.reset(turnstileWidgetIdRef.current);
            } catch {}
          }
        },
        "error-callback": () => {
          turnstileTokenRef.current = null;
          consecutiveTurnstileErrorsRef.current += 1;
          if (consecutiveTurnstileErrorsRef.current <= 3) {
            if (turnstileResetTimerRef.current) {
              clearTimeout(turnstileResetTimerRef.current);
            }
            turnstileResetTimerRef.current = setTimeout(() => {
              if (turnstileWidgetIdRef.current && window.turnstile) {
                try {
                  window.turnstile.reset(turnstileWidgetIdRef.current);
                } catch {}
              }
            }, 2000);
          }
        },
      });
      turnstileWidgetIdRef.current = widgetId;
    } catch {
      // Ignore initialization errors
    }
  }, []);

  useEffect(() => {
    void renderTurnstileWidget();

    return () => {
      if (turnstileResetTimerRef.current) {
        clearTimeout(turnstileResetTimerRef.current);
      }
      if (turnstileWidgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } catch {}
        turnstileWidgetIdRef.current = null;
      }
      const resolvers = pendingTokenResolversRef.current;
      pendingTokenResolversRef.current = [];
      resolvers.forEach(({ reject }) => reject(new Error("Turnstile unmounted")));
    };
  }, [renderTurnstileWidget]);

  const executeTurnstileOnce = useCallback((timeoutMs = 10_000): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      if (typeof window === "undefined" || !window.turnstile || !turnstileWidgetIdRef.current) {
        return reject(new Error("Turnstile widget tidak siap"));
      }

      if (turnstileTokenRef.current) {
        return resolve(turnstileTokenRef.current);
      }
      try {
        const resp = window.turnstile.getResponse(turnstileWidgetIdRef.current);
        if (resp) {
          turnstileTokenRef.current = resp;
          return resolve(resp);
        }
      } catch {}

      let timer: ReturnType<typeof setTimeout> | null = null;
      const resolverItem = {
        resolve: (tok: string) => {
          if (timer) clearTimeout(timer);
          resolve(tok);
        },
        reject: (err: any) => {
          if (timer) clearTimeout(timer);
          reject(err);
        },
      };

      pendingTokenResolversRef.current.push(resolverItem);

      timer = setTimeout(() => {
        pendingTokenResolversRef.current = pendingTokenResolversRef.current.filter((item) => item !== resolverItem);
        reject(new Error("Turnstile timeout (10s)"));
      }, timeoutMs);

      try {
        window.turnstile.execute(turnstileWidgetIdRef.current);
      } catch (err) {
        if (timer) clearTimeout(timer);
        pendingTokenResolversRef.current = pendingTokenResolversRef.current.filter((item) => item !== resolverItem);
        reject(err);
      }
    });
  }, []);

  const getTurnstileToken = useCallback(async (): Promise<string> => {
    if (!TURNSTILE_SITE_KEY) return "";

    // a) Return existing token if available
    if (turnstileTokenRef.current) {
      return turnstileTokenRef.current;
    }
    if (turnstileWidgetIdRef.current && window.turnstile) {
      try {
        const existing = window.turnstile.getResponse(turnstileWidgetIdRef.current);
        if (existing) {
          turnstileTokenRef.current = existing;
          return existing;
        }
      } catch {}
    }

    if (!turnstileWidgetIdRef.current || !window.turnstile) {
      await renderTurnstileWidget();
    }

    // b) Call window.turnstile.execute(widgetId) and wait up to 10s
    try {
      const token = await executeTurnstileOnce(10_000);
      if (token) return token;
    } catch {
      // First attempt failed or timed out
    }

    // c) On fail/timeout, reset widget and retry once
    if (turnstileWidgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      } catch {}
    }
    turnstileTokenRef.current = null;

    try {
      const retryToken = await executeTurnstileOnce(10_000);
      if (retryToken) return retryToken;
    } catch {
      // Second attempt failed or timed out
    }

    // d) If still fails, throw error
    throw new Error("Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi.");
  }, [renderTurnstileWidget, executeTurnstileOnce]);

  const handleSelectAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    safeSetLocalStorage(STORAGE_KEYS.SELECTED_AGENT, agent.id);
  }, []);

  const buildAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    let activeToken =
      typeof authToken === "string" &&
      authToken.trim() !== "" &&
      authToken !== "null" &&
      authToken !== "undefined"
        ? authToken.trim()
        : "";
    let activeUserId = authUser?.id ? authUser.id.trim() : "";

    if (supabase && (!activeToken || !activeUserId)) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token && session.user?.id) {
          activeToken = session.access_token.trim();
          activeUserId = session.user.id.trim();
        }
      } catch {
        // Fallback to local state below
      }
    }

    if (activeToken && activeUserId) {
      headers["Authorization"] = `Bearer ${activeToken}`;
      headers["X-User-Id"] = activeUserId;
    } else if (activeUserId) {
      headers["X-User-Id"] = activeUserId;
      delete headers["Authorization"];
    } else {
      headers["X-Guest-Mode"] = "true";
      const effectiveUserId =
        currentUserId && currentUserId !== "null" && currentUserId !== "undefined"
          ? currentUserId
          : safeGetLocalStorage(STORAGE_KEYS.USER_ID) || "guest";
      headers["X-User-Id"] = effectiveUserId;
      delete headers["Authorization"];
    }
    return headers;
  }, [authToken, authUser, currentUserId]);

  // Fetch chats: loads from localStorage if Guest, loads from Supabase backend if authenticated
  const fetchChats = useCallback(async (): Promise<ChatHistoryItem[] | null> => {
    if (!authUser) {
      return getGuestChats();
    }
    try {
      const headers = await buildAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/chats`, {
        method: "GET",
        headers,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        return null;
      }
      return (result.data as ChatHistoryItem[]) || [];
    } catch (error: any) {
      console.error("Backend Chats Fetch Error:", error?.message || error);
      return null;
    }
  }, [authUser, buildAuthHeaders]);

  // Fetch daily credit quota status for authenticated users (`GET /api/quota`)
  const fetchUserQuota = useCallback(async () => {
    if (!authUser) {
      setQuotaInfo(null);
      return;
    }
    try {
      const headers = await buildAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/quota`, {
        method: "GET",
        headers,
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json().catch(() => null);
      if (data && typeof data === "object") {
        const nextCredits =
          typeof data.remainingCredits === "number" && Number.isFinite(data.remainingCredits)
            ? data.remainingCredits
            : undefined;
        setQuotaInfo((prev) => ({
          ...(prev || {}),
          plan: data.plan === "pro" ? "pro" : "free",
          unlimited: Boolean(data.unlimited),
          remainingCredits: nextCredits ?? prev?.remainingCredits,
          remaining: nextCredits ?? prev?.remaining,
          dailyCredits:
            typeof data.dailyCredits === "number" && Number.isFinite(data.dailyCredits)
              ? data.dailyCredits
              : prev?.dailyCredits,
          dailyLimit:
            typeof data.dailyLimit === "number" && Number.isFinite(data.dailyLimit)
              ? data.dailyLimit
              : prev?.dailyLimit ?? 30,
          usedToday:
            typeof data.usedToday === "number" && Number.isFinite(data.usedToday)
              ? data.usedToday
              : prev?.usedToday,
          bonusCredits:
            typeof data.bonusCredits === "number" && Number.isFinite(data.bonusCredits)
              ? data.bonusCredits
              : prev?.bonusCredits,
          resetAt: typeof data.resetAt === "string" ? data.resetAt : prev?.resetAt,
          expiresAt:
            typeof data.expiresAt === "string" ? data.expiresAt : prev?.expiresAt,
          triggeredByLimit: prev?.triggeredByLimit ?? false,
        }));
      }
    } catch {
      // Non-blocking: ignore transient network errors when refreshing quota badge
    }
  }, [authUser, buildAuthHeaders]);

  useEffect(() => {
    if (authUser) {
      void fetchUserQuota();
    } else {
      setQuotaInfo(null);
    }
  }, [authUser, fetchUserQuota]);

  // Real-time quota sync when returning to the browser tab or opening Kelola Akun / Pengaturan
  useEffect(() => {
    if (!authUser || typeof document === "undefined") return;
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        void fetchUserQuota();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [authUser, fetchUserQuota]);

  useEffect(() => {
    if (
      authUser &&
      (desktopSettingsPage === "account" ||
        desktopSettingsPage === "quota" ||
        expandedSettingsSection === "account" ||
        expandedSettingsSection === "quota" ||
        isSettingsModalOpen)
    ) {
      void fetchUserQuota();
    }
  }, [
    authUser,
    desktopSettingsPage,
    expandedSettingsSection,
    isSettingsModalOpen,
    fetchUserQuota,
  ]);

  const isProPlan = Boolean(quotaInfo?.plan === "pro" || quotaInfo?.unlimited);
  const dailyCreditLimit =
    typeof quotaInfo?.dailyLimit === "number" &&
    Number.isFinite(quotaInfo.dailyLimit) &&
    quotaInfo.dailyLimit > 0
      ? quotaInfo.dailyLimit
      : 30;
  const remainingCreditsCount =
    typeof quotaInfo?.remainingCredits === "number" &&
    Number.isFinite(quotaInfo.remainingCredits)
      ? Math.max(0, quotaInfo.remainingCredits)
      : dailyCreditLimit;
  const rawBonusCredits =
    typeof quotaInfo?.bonusCredits === "number" &&
    Number.isFinite(quotaInfo.bonusCredits)
      ? Math.max(0, quotaInfo.bonusCredits)
      : 0;
  const hasConsistentQuotaBreakdown =
    typeof quotaInfo?.dailyCredits === "number" &&
    Number.isFinite(quotaInfo.dailyCredits) &&
    Math.max(0, quotaInfo.dailyCredits) + rawBonusCredits === remainingCreditsCount;
  const bonusCreditsCount = isProPlan
    ? rawBonusCredits
    : hasConsistentQuotaBreakdown
      ? rawBonusCredits
      : Math.min(rawBonusCredits, remainingCreditsCount);
  const dailyCreditsRemaining = isProPlan
    ? dailyCreditLimit
    : hasConsistentQuotaBreakdown && typeof quotaInfo?.dailyCredits === "number"
      ? Math.min(dailyCreditLimit, Math.max(0, quotaInfo.dailyCredits))
      : Math.min(dailyCreditLimit, Math.max(0, remainingCreditsCount - bonusCreditsCount));
  const dailyCreditsPercent = isProPlan
    ? 100
    : Math.max(0, Math.min(100, Math.round((dailyCreditsRemaining / dailyCreditLimit) * 100)));

  const openQuotaSettings = useCallback(() => {
    setIsMobileSidebarOpen(false);
    setIsProfileDropdownOpen(false);
    setIsSettingsMenuOpen(false);
    openSettingsModal("main", "quota");
    if (authUser) {
      void fetchUserQuota();
    }
  }, [authUser, fetchUserQuota, openSettingsModal]);

  const openSubscriptionModal = useCallback(() => {
    setIsSettingsModalOpen(false);
    setDesktopSettingsPage(null);
    setIsMobileSidebarOpen(false);
    setIsProfileDropdownOpen(false);
    setIsSettingsMenuOpen(false);
    setQuotaInfo((prev) => ({
      ...(prev || { plan: "free", remainingCredits: 30, remaining: 30 }),
      triggeredByLimit: false,
    }));
    setIsUpgradeModalOpen(true);
    if (authUser) {
      void fetchUserQuota();
    }
  }, [authUser, fetchUserQuota]);

  // Re-reads the chat list while preserving local activity timestamps so recently replied chats stay on top
  const refreshChatHistory = useCallback(async () => {
    const data = await fetchChats();
    if (!data) return;
    setClientNow(new Date());
    setChatHistory((prev) => {
      const activityById = new Map<string, string>();
      for (const item of prev) {
        if (item.last_activity_at) {
          activityById.set(item.id, item.last_activity_at);
        }
      }
      return data.map((row) => {
        const localActivity = activityById.get(row.id);
        return localActivity ? { ...row, last_activity_at: localActivity } : row;
      });
    });
  }, [fetchChats]);

  // Handle return from Google OAuth redirect flow (mobile / non-popup)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedError =
      sessionStorage.getItem("axioma_google_auth_error") ||
      localStorage.getItem("axioma_google_auth_error");

    if (storedError) {
      try {
        sessionStorage.removeItem("axioma_google_auth_error");
        localStorage.removeItem("axioma_google_auth_error");
      } catch {}
      showToastNotice(`Gagal masuk dengan Google: ${storedError}`);
      if (window.location.search.includes("auth=")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const pendingToken =
      sessionStorage.getItem("axioma_pending_google_id_token") ||
      localStorage.getItem("axioma_pending_google_id_token");

    if (pendingToken) {
      const rawNonce =
        sessionStorage.getItem("axioma_google_raw_nonce") ||
        localStorage.getItem("axioma_google_raw_nonce");

      try {
        sessionStorage.removeItem("axioma_pending_google_id_token");
        localStorage.removeItem("axioma_pending_google_id_token");
        sessionStorage.removeItem("axioma_google_raw_nonce");
        localStorage.removeItem("axioma_google_raw_nonce");
      } catch {}

      if (window.location.search.includes("auth=")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      signInWithGoogleIdToken(pendingToken, rawNonce).then(({ user, error }) => {
        if (error) {
          showToastNotice(`Gagal memproses sesi login: ${error.message}`);
        } else if (user) {
          setAuthUser(user);
          const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0];
          if (name) {
            const formatted = toTitleCase(name);
            setDisplayName(formatted);
            setSettingsNameInput(formatted);
            safeSetLocalStorage(STORAGE_KEYS.DISPLAY_NAME, formatted);
          }
          showToastNotice(`Selamat datang, ${toTitleCase(name) || "Pengguna"}!`);
          void refreshChatHistory();
        }
      });
    }
  }, [refreshChatHistory, showToastNotice]);

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    setIsSidebarLoading(true);
    fetchChats()
      .then((data) => {
        if (cancelled) return;
        setClientNow(new Date());
        if (data) setChatHistory(data);
        setIsSidebarLoading(false);
        // If on the home screen (no initial chat ID in URL), reveal empty state once initial fetch completes (#6)
        const hasInitialChatTarget =
          (initialChatId && initialChatId.trim().length > 0) ||
          (typeof window !== "undefined" && window.location.pathname.startsWith("/c/"));
        if (!hasInitialChatTarget) {
          setIsChatAreaLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsSidebarLoading(false);
          setIsChatAreaLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentUserId, fetchChats, initialChatId]);

  // Dynamic Gemini/Claude-style greeting variations (changes on new chat, mount, or refresh)
  const [dynamicGreeting, setDynamicGreeting] = useState<string>("");

  useEffect(() => {
    const picked = getRandomGreeting(displayName, Boolean(authUser));
    setDynamicGreeting(picked);
    setGreeting(picked);
  }, [activeChatId, displayName, authUser]);

  // Axioma greeting helper (deterministic during SSR, consistent across mobile & desktop)
  const defaultFallbackGreeting = authUser && displayName
    ? `Halo ${toTitleCase(displayName)}, apa yang bisa saya bantu hari ini?`
    : "Halo, apa yang bisa saya bantu hari ini?";

  const mobileGreeting = dynamicGreeting || defaultFallbackGreeting;
  const isLoadingExistingChat =
    isChatAreaLoading &&
    Boolean(initialChatId || (activeChatId && activeChatId !== "new-chat"));
  const isDesktopEmptyState = !hasMessages && !isLoadingExistingChat;

  useEffect(() => {
    const nextHasMessages = Boolean(currentMessages.length > 0);
    setHasMessages(nextHasMessages);
    if (nextHasMessages) {
      setIsEmptyDecorationsExiting(true);
      const timer = setTimeout(() => {
        setShowEmptyDecorations(false);
      }, 210);
      return () => clearTimeout(timer);
    } else {
      setShowEmptyDecorations(true);
      setIsEmptyDecorationsExiting(false);
      isUserScrolledUpRef.current = false;
      setIsUserScrolledUp(false);
    }
  }, [activeChatId, currentMessages.length]);

  // Sync per-chat Checkpoint & Context Correction from localStorage (SSR-safe)
  const effectiveContextChatId =
    activeChatId && activeChatId !== "new-chat" ? activeChatId : currentSessionChatId;

  useEffect(() => {
    setChatContextState(loadChatContextState(effectiveContextChatId));
  }, [effectiveContextChatId]);

  const handleUpdateChatContextState = useCallback(
    (next: ChatContextState) => {
      setChatContextState(next);
      saveChatContextState(effectiveContextChatId, next);
    },
    [effectiveContextChatId]
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) || null,
    [workspaces, activeWorkspaceId]
  );

  const handleSelectWorkspace = useCallback((id: string | null) => {
    setActiveWorkspaceId(id);
    saveActiveWorkspaceId(id);
  }, []);

  const handleCreateWorkspace = useCallback((name: string, instructions: string) => {
    const newWs: WorkspaceItem = {
      id: `ws-${Date.now()}`,
      name,
      instructions,
      createdAt: new Date().toISOString(),
    };
    setWorkspaces((prev) => {
      const next = [newWs, ...prev];
      saveWorkspaces(next);
      return next;
    });
    setActiveWorkspaceId(newWs.id);
    saveActiveWorkspaceId(newWs.id);
    showToastNotice(`Ruang "${name}" aktif`, 2000);
  }, [showToastNotice]);

  const handleDeleteWorkspace = useCallback(
    (id: string) => {
      setWorkspaces((prev) => {
        const next = prev.filter((w) => w.id !== id);
        saveWorkspaces(next);
        return next;
      });
      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(null);
        saveActiveWorkspaceId(null);
      }
    },
    [activeWorkspaceId]
  );

  // Stage 6: Hydrate User Profile, Context Control & Saved Answers from localStorage (SSR-safe)
  useEffect(() => {
    try {
      const storedProfile = window.localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (typeof storedProfile === "string") {
        setUserProfile(storedProfile.slice(0, 500));
      }
      const storedControl = window.localStorage.getItem(STORAGE_KEYS.CONTEXT_CONTROL);
      if (storedControl) {
        const parsed = JSON.parse(storedControl) as Partial<ContextControlState>;
        if (parsed && typeof parsed === "object") {
          setContextControl({
            useHistory: parsed.useHistory !== false,
            useProject: parsed.useProject !== false,
            useProfile: parsed.useProfile !== false,
          });
        }
      }
      const storedChecklist = window.localStorage.getItem(STORAGE_KEYS.CHECKLIST_STATE);
      if (storedChecklist) {
        const parsedChecklist = JSON.parse(storedChecklist);
        if (parsedChecklist && typeof parsedChecklist === "object" && !Array.isArray(parsedChecklist)) {
          setChecklistState(parsedChecklist as Record<string, Record<number, boolean>>);
        }
      }
      const storedReqLock = window.localStorage.getItem(STORAGE_KEYS.REQUIREMENT_LOCK);
      if (storedReqLock) {
        const parsedReqs = JSON.parse(storedReqLock);
        if (Array.isArray(parsedReqs)) {
          const validReqs = parsedReqs
            .filter((r): r is string => typeof r === "string" && Boolean(r.trim()))
            .map((r) => r.trim())
            .slice(0, 5);
          setRequirementLockItems(validReqs);
          const storedReqEnabled = window.localStorage.getItem(
            STORAGE_KEYS.REQUIREMENT_LOCK_ENABLED
          );
          if (storedReqEnabled !== null) {
            setIsRequirementLockEnabled(storedReqEnabled === "true");
          } else if (validReqs.length > 0) {
            setIsRequirementLockEnabled(true);
          }
        }
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleUpdateRequirementLockItems = useCallback((items: string[]) => {
    const clean = items.map((s) => s.trim()).filter(Boolean).slice(0, 5);
    setRequirementLockItems(clean);
    try {
      window.localStorage.setItem(STORAGE_KEYS.REQUIREMENT_LOCK, JSON.stringify(clean));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleUpdateRequirementLockEnabled = useCallback((enabled: boolean) => {
    setIsRequirementLockEnabled(enabled);
    try {
      window.localStorage.setItem(STORAGE_KEYS.REQUIREMENT_LOCK_ENABLED, String(enabled));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleAddRequirementLockItem = useCallback(() => {
    const clean = settingsReqDraft.trim();
    if (!clean || requirementLockItems.length >= 5) return;
    handleUpdateRequirementLockItems([...requirementLockItems, clean]);
    if (!isRequirementLockEnabled) {
      handleUpdateRequirementLockEnabled(true);
    }
    setSettingsReqDraft("");
  }, [
    settingsReqDraft,
    requirementLockItems,
    isRequirementLockEnabled,
    handleUpdateRequirementLockItems,
    handleUpdateRequirementLockEnabled,
  ]);

  // Close AI message overflow popover on outside click or Escape (zero backdrop)
  useEffect(() => {
    if (!openAiActionMenuId) return;
    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest('[data-ai-action-menu="true"]')) {
        setOpenAiActionMenuId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenAiActionMenuId(null);
      }
    };
    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openAiActionMenuId]);

  const handleToggleChecklistItem = useCallback(
    (messageId: string, itemIdx: number, currentChecked: boolean) => {
      setChecklistState((prev) => {
        const nextMsgMap = { ...(prev[messageId] || {}), [itemIdx]: !currentChecked };
        const next = { ...prev, [messageId]: nextMsgMap };
        try {
          window.localStorage.setItem(STORAGE_KEYS.CHECKLIST_STATE, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    },
    []
  );

  const handleAiMessageTextSelect = useCallback(
    (messageId: string, fullContext: string) => {
      if (typeof window === "undefined") return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const selectedText = sel.toString().trim();
      if (selectedText.length < 8) return;
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) return;
        const viewportW = window.innerWidth;
        const toolbarWidth = 310;
        const left = Math.max(
          12,
          Math.min(rect.left + rect.width / 2 - toolbarWidth / 2, viewportW - toolbarWidth - 12)
        );
        const top = Math.max(64, rect.top - 48);
        setSelectionEdit({
          messageId,
          selectedText,
          fullContext,
          top,
          left,
          revisedText: null,
          isLoading: false,
          error: null,
        });
      } catch {
        // Ignore invalid selection range
      }
    },
    []
  );

  const handleRunSelectionEdit = useCallback(
    async (action: "shorten" | "soften" | "formal" | "assertive" | "translate_en" | "translate_id") => {
      if (!selectionEdit || selectionEdit.isLoading) return;
      setSelectionEdit((prev) =>
        prev ? { ...prev, isLoading: true, error: null, revisedText: null } : null
      );

      try {
        const response = await fetch(`${BACKEND_URL}/api/chat/edit-selection`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedText: selectionEdit.selectedText,
            action,
            fullContext: selectionEdit.fullContext,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        const revised =
          typeof payload?.revisedText === "string"
            ? payload.revisedText.trim()
            : typeof payload?.data?.revisedText === "string"
            ? payload.data.revisedText.trim()
            : "";
        if (!response.ok || !revised) {
          throw new Error(payload?.error || "Gagal merevisi teks terpilih.");
        }
        setSelectionEdit((prev) =>
          prev ? { ...prev, isLoading: false, revisedText: revised, error: null } : null
        );
      } catch (err: any) {
        setSelectionEdit((prev) =>
          prev
            ? {
                ...prev,
                isLoading: false,
                error: err?.message || "Gagal merevisi teks terpilih.",
              }
            : null
        );
      }
    },
    [selectionEdit]
  );

  const handleReplaceSelectedText = useCallback(() => {
    if (!selectionEdit || !selectionEdit.revisedText) return;
    const { messageId, selectedText, revisedText } = selectionEdit;
    setChats((prev) =>
      prev.map((chat) => ({
        ...chat,
        messages: chat.messages.map((m) => {
          if (m.id !== messageId) return m;
          const nextContent = m.content.includes(selectedText)
            ? m.content.replace(selectedText, revisedText)
            : `${m.content}\n\n${revisedText}`;
          return { ...m, content: nextContent };
        }),
      }))
    );
    setSelectionEdit(null);
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    showToastNotice("Teks berhasil diperbarui", 1800);
  }, [selectionEdit, showToastNotice]);

  const handleRunAxiomaLens = useCallback(
    async (rawTopic: string) => {
      const topic = rawTopic.trim();
      if (!topic || isLoading || isGenerating || isLensLoading) return;

      const targetChatId =
        activeChatId === "new-chat" ? currentSessionChatId : activeChatId;
      const userMsgId = generateSafeId();
      const aiMsgId = generateSafeId();
      const nowIso = new Date().toISOString();

      const userMsg: Message = {
        id: userMsgId,
        sender: "user",
        content: `/lens ${topic}`,
        created_at: nowIso,
      };

      setInputText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "28px";
      }

      setChats((prev) => {
        const exists = prev.some((c) => c.id === targetChatId);
        if (exists) {
          return prev.map((c) =>
            c.id === targetChatId ? { ...c, messages: [...c.messages, userMsg] } : c
          );
        }
        return [
          {
            id: targetChatId,
            title: `Lens: ${topic}`.slice(0, 48),
            dateCategory: "TODAY",
            messages: [userMsg],
          },
          ...prev,
        ];
      });
      if (activeChatId === "new-chat") {
        setActiveChatId(targetChatId);
      }

      setIsLensLoading(true);
      setActiveLoadingContext("lens");
      try {
        const response = await fetch(`${BACKEND_URL}/api/chat/lens`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            contextSummary: chatContextState.checkpoint?.summary || undefined,
            language,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 429 || payload?.code === "RATE_LIMIT_EXCEEDED") {
          throw new Error(
            payload?.message ||
              "Kuota pemakaian sementara tercapai. Coba lagi beberapa saat lagi atau besok."
          );
        }
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || payload?.error || "Gagal menjalankan Axioma Lens.");
        }
        const data = payload.data || payload;
        const lensData: AxiomaLensData = {
          topic: typeof data.topic === "string" ? data.topic : topic,
          pros: Array.isArray(data.pros) ? data.pros : [],
          cons: Array.isArray(data.cons) ? data.cons : [],
          blindspots: Array.isArray(data.blindspots) ? data.blindspots : [],
          axioma: typeof data.axioma === "string" ? data.axioma : "",
        };

        const markdownFallback = [
          `**Axioma Lens — ${lensData.topic}**`,
          "",
          "**Peluang / Pro:**",
          ...lensData.pros.map((p) => `- ${p}`),
          "",
          "**Celah / Kontra:**",
          ...lensData.cons.map((c) => `- ${c}`),
          "",
          `**AKSIOMA:** ${lensData.axioma}`,
          ...(lensData.blindspots.length > 0
            ? [`\n*Asumsi Tersembunyi:* ${lensData.blindspots.join(" · ")}`]
            : []),
        ].join("\n");

        const aiMsg: Message = {
          id: aiMsgId,
          sender: "ai",
          content: markdownFallback,
          lensData,
          created_at: new Date().toISOString(),
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
        };

        setChats((prev) =>
          prev.map((c) =>
            c.id === targetChatId ? { ...c, messages: [...c.messages, aiMsg] } : c
          )
        );
      } catch (err: any) {
        const friendlyMsg = err?.message || "Gagal menjalankan Axioma Lens.";
        const errMsg: Message = {
          id: aiMsgId,
          sender: "ai",
          content: "Axioma Lens belum dapat diproses",
          errorDetail: friendlyMsg,
          isError: true,
          created_at: new Date().toISOString(),
        };
        setChats((prev) =>
          prev.map((c) =>
            c.id === targetChatId ? { ...c, messages: [...c.messages, errMsg] } : c
          )
        );
        showToastNotice(friendlyMsg, 2600);
      } finally {
        setIsLensLoading(false);
        setActiveLoadingContext(null);
      }
    },
    [
      isLoading,
      isGenerating,
      isLensLoading,
      activeChatId,
      currentSessionChatId,
      chatContextState.checkpoint?.summary,
      language,
      selectedAgent.id,
      selectedAgent.name,
      showToastNotice,
    ]
  );

  // Stage 8 & 9: Unified Multimodal Vision (Image <= 4MB) & Smart PDF (<= 8MB) File Handler
  const handleVisionFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      const isPdf =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        const MAX_PDF_BYTES = 8 * 1024 * 1024; // 8MB client-side cap
        if (file.size > MAX_PDF_BYTES) {
          showToastNotice("Ukuran dokumen PDF maksimal 8 MB.", 2400);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === "string" ? reader.result : "";
          if (!dataUrl) return;
          const commaIdx = dataUrl.indexOf(",");
          const base64 = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
          setPendingVisionPhoto(null);
          setPendingPdfDoc({
            base64,
            fileName: file.name,
            fileSizeBytes: file.size,
            mode: "summary",
          });
        };
        reader.readAsDataURL(file);
        return;
      }

      const allowedMimes = ["image/jpeg", "image/png", "image/webp"] as const;
      if (!allowedMimes.includes(file.type as (typeof allowedMimes)[number])) {
        showToastNotice("Format file harus JPG, PNG, WEBP, atau PDF.", 2400);
        return;
      }

      const MAX_BYTES = 4 * 1024 * 1024; // 4MB client-side cap
      if (file.size > MAX_BYTES) {
        showToastNotice("Ukuran foto maksimal 4 MB.", 2400);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        if (!dataUrl) return;
        const commaIdx = dataUrl.indexOf(",");
        const base64 = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
        setPendingPdfDoc(null);
        setPendingVisionPhoto({
          previewUrl: dataUrl,
          base64,
          mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
          name: file.name,
          mode: "notes",
        });
      };
      reader.readAsDataURL(file);
    },
    [showToastNotice]
  );

  const handleSendPdfDocument = useCallback(
    async (questionText: string) => {
      if (!pendingPdfDoc || isVisionLoading) return;
      const doc = pendingPdfDoc;
      const question = questionText.trim();

      if (doc.mode === "ask" && !question) {
        showToastNotice("Tulis pertanyaan untuk PDF terlebih dahulu.", 2200);
        return;
      }

      const modeLabels: Record<typeof doc.mode, string> = {
        summary: "Ringkas Eksekutif",
        glossary: "Istilah Kunci",
        critical_questions: "Prediksi Pertanyaan",
        ask: "Tanya PDF",
      };

      const targetChatId =
        activeChatId === "new-chat" ? currentSessionChatId : activeChatId;
      const userMsgId = generateSafeId();
      const aiMsgId = generateSafeId();
      const nowIso = new Date().toISOString();

      const userPromptDisplay = question
        ? `[PDF · ${modeLabels[doc.mode]} · ${doc.fileName}] ${question}`
        : `[PDF · ${modeLabels[doc.mode]}] ${doc.fileName}`;

      const userMsg: Message = {
        id: userMsgId,
        sender: "user",
        content: userPromptDisplay,
        created_at: nowIso,
      };

      setPendingPdfDoc(null);
      setInputText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "28px";
      }

      setChats((prev) => {
        const exists = prev.some((c) => c.id === targetChatId);
        if (exists) {
          return prev.map((c) =>
            c.id === targetChatId ? { ...c, messages: [...c.messages, userMsg] } : c
          );
        }
        return [
          {
            id: targetChatId,
            title: `PDF: ${doc.fileName}`.slice(0, 48),
            dateCategory: "TODAY",
            messages: [userMsg],
          },
          ...prev,
        ];
      });
      if (activeChatId === "new-chat") {
        setActiveChatId(targetChatId);
      }

      setIsVisionLoading(true);
      setActiveLoadingContext("pdf");
      try {
        const response = await fetch(`${BACKEND_URL}/api/chat/analyze-pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pdfBase64: doc.base64,
            fileName: doc.fileName,
            mode: doc.mode,
            question: question || undefined,
            language,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 429 || payload?.code === "RATE_LIMIT_EXCEEDED") {
          throw new Error(
            payload?.message ||
              "Kuota pemakaian sementara tercapai. Coba lagi beberapa saat lagi atau besok."
          );
        }
        const resultText =
          typeof payload?.result === "string"
            ? payload.result.trim()
            : typeof payload?.data?.result === "string"
            ? payload.data.result.trim()
            : "";

        if (!response.ok || !resultText) {
          throw new Error(
            payload?.message || payload?.error || "Gagal membedah dokumen PDF. Silakan coba lagi."
          );
        }

        const aiMsg: Message = {
          id: aiMsgId,
          sender: "ai",
          content: resultText,
          created_at: new Date().toISOString(),
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
        };

        setChats((prev) =>
          prev.map((c) =>
            c.id === targetChatId ? { ...c, messages: [...c.messages, aiMsg] } : c
          )
        );
      } catch (err: any) {
        const errMsg: Message = {
          id: aiMsgId,
          sender: "ai",
          content: "Gagal membedah dokumen PDF",
          errorDetail: err?.message || "Terjadi kendala saat menganalisis PDF.",
          isError: true,
          created_at: new Date().toISOString(),
        };
        setChats((prev) =>
          prev.map((c) =>
            c.id === targetChatId ? { ...c, messages: [...c.messages, errMsg] } : c
          )
        );
      } finally {
        setIsVisionLoading(false);
        setActiveLoadingContext(null);
      }
    },
    [
      pendingPdfDoc,
      isVisionLoading,
      activeChatId,
      currentSessionChatId,
      language,
      selectedAgent.id,
      selectedAgent.name,
      showToastNotice,
    ]
  );

  const handleSendVisionPhoto = useCallback(
    async (instructionText: string) => {
      if (!pendingVisionPhoto || isVisionLoading) return;
      const photo = pendingVisionPhoto;
      const instruction = instructionText.trim();
      const modeLabels: Record<typeof photo.mode, string> = {
        notes: "Ringkas Catatan",
        table: "Buat Tabel",
        quiz: "Soal Latihan",
        tasks: "Ekstrak Tugas",
      };

      const targetChatId =
        activeChatId === "new-chat" ? currentSessionChatId : activeChatId;
      const userMsgId = generateSafeId();
      const aiMsgId = generateSafeId();
      const nowIso = new Date().toISOString();

      const userPromptDisplay = instruction
        ? `[Foto · ${modeLabels[photo.mode]}] ${instruction}`
        : `[Foto · ${modeLabels[photo.mode]}] ${photo.name}`;

      const userMsg: Message = {
        id: userMsgId,
        sender: "user",
        content: userPromptDisplay,
        created_at: nowIso,
      };

      setPendingVisionPhoto(null);
      setInputText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "28px";
      }

      setChats((prev) => {
        const exists = prev.some((c) => c.id === targetChatId);
        if (exists) {
          return prev.map((c) =>
            c.id === targetChatId ? { ...c, messages: [...c.messages, userMsg] } : c
          );
        }
        return [
          {
            id: targetChatId,
            title: `${modeLabels[photo.mode]} · Foto`.slice(0, 48),
            dateCategory: "TODAY",
            messages: [userMsg],
          },
          ...prev,
        ];
      });
      if (activeChatId === "new-chat") {
        setActiveChatId(targetChatId);
      }

      setIsVisionLoading(true);
      setActiveLoadingContext("vision");
      try {
        const response = await fetch(`${BACKEND_URL}/api/chat/vision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: photo.base64,
            mimeType: photo.mimeType,
            mode: photo.mode,
            instruction: instruction || undefined,
            language,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 429 || payload?.code === "RATE_LIMIT_EXCEEDED") {
          throw new Error(
            payload?.message ||
              "Kuota pemakaian sementara tercapai. Coba lagi beberapa saat lagi atau besok."
          );
        }
        const resultText =
          typeof payload?.result === "string"
            ? payload.result.trim()
            : typeof payload?.data?.result === "string"
            ? payload.data.result.trim()
            : "";

        if (!response.ok || !resultText) {
          throw new Error(
            payload?.message || payload?.error || "Gagal memproses foto. Silakan coba lagi."
          );
        }

        const aiMsg: Message = {
          id: aiMsgId,
          sender: "ai",
          content: resultText,
          created_at: new Date().toISOString(),
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
        };

        setChats((prev) =>
          prev.map((c) =>
            c.id === targetChatId ? { ...c, messages: [...c.messages, aiMsg] } : c
          )
        );
      } catch (err: any) {
        const errMsg: Message = {
          id: aiMsgId,
          sender: "ai",
          content: "Gagal memproses foto",
          errorDetail: err?.message || "Terjadi kendala saat menganalisis gambar.",
          isError: true,
          created_at: new Date().toISOString(),
        };
        setChats((prev) =>
          prev.map((c) =>
            c.id === targetChatId ? { ...c, messages: [...c.messages, errMsg] } : c
          )
        );
      } finally {
        setIsVisionLoading(false);
        setActiveLoadingContext(null);
      }
    },
    [
      pendingVisionPhoto,
      isVisionLoading,
      activeChatId,
      currentSessionChatId,
      language,
      selectedAgent.id,
      selectedAgent.name,
    ]
  );

  const handleUpdateUserProfile = useCallback((nextValue: string) => {
    const trimmed = nextValue.slice(0, 500);
    setUserProfile(trimmed);
    safeSetLocalStorage(STORAGE_KEYS.USER_PROFILE, trimmed);
  }, []);

  const handleUpdateContextControl = useCallback((next: ContextControlState) => {
    setContextControl(next);
    try {
      window.localStorage.setItem(STORAGE_KEYS.CONTEXT_CONTROL, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Stage 6: Slash Commands definitions & matching
  const SLASH_COMMANDS = useMemo(
    () => [
      {
        cmd: "/wa",
        label: "Format WhatsApp / Kalibrasi Sosial",
      },
      {
        cmd: "/kritis",
        label: "Mode berpikir kritis",
      },
      {
        cmd: "/tabel",
        label: "Format tabel perbandingan",
      },
      {
        cmd: "/ringkas",
        label: "Gaya jawaban ringkas",
      },
      {
        cmd: "/langkah",
        label: "Pecah jadi langkah terstruktur",
      },
      {
        cmd: "/lens",
        label: "Analisis 2 sisi (Axioma Lens)",
      },
    ],
    []
  );

  const matchingSlashCommands = useMemo(() => {
    const trimmed = inputText.trimStart();
    if (!trimmed.startsWith("/")) return [];
    const firstToken = trimmed.split(/\s+/)[0].toLowerCase();
    // Only show menu while typing the slash command token (no space after it yet)
    if (trimmed.includes(" ")) return [];
    return SLASH_COMMANDS.filter((item) => item.cmd.startsWith(firstToken));
  }, [inputText, SLASH_COMMANDS]);

  useEffect(() => {
    if (slashMenuIndex >= matchingSlashCommands.length) {
      setSlashMenuIndex(0);
    }
  }, [matchingSlashCommands.length, slashMenuIndex]);

  const handleApplySlashCommand = useCallback(
    (cmd: string) => {
      const remaining = inputText.replace(/^\s*\/\S*\s*/, "");
      if (cmd === "/wa") {
        const nextSocial = socialTarget === "none" ? "teman" : socialTarget;
        setSocialTarget(nextSocial);
        safeSetLocalStorage(STORAGE_KEYS.SOCIAL_TARGET, nextSocial);
        setInputText(remaining);
        showToastNotice("Kalibrasi Sosial / format WhatsApp aktif", 2000);
      } else if (cmd === "/kritis") {
        setThinkingMode("critical");
        safeSetLocalStorage(STORAGE_KEYS.THINKING_MODE, "critical");
        setInputText(remaining);
        showToastNotice("Mode Berpikir: Kritis", 2000);
      } else if (cmd === "/tabel") {
        const prefix = "Sajikan dalam format tabel perbandingan yang rapi: ";
        setInputText(remaining ? `${prefix}${remaining}` : prefix);
      } else if (cmd === "/ringkas") {
        setAnswerStyle("ringkas");
        safeSetLocalStorage(STORAGE_KEYS.ANSWER_STYLE, "ringkas");
        setInputText(remaining);
        showToastNotice("Gaya Jawaban: Ringkas", 2000);
      } else if (cmd === "/langkah") {
        setPendingTaskBreakdown(true);
        setInputText(remaining);
        showToastNotice("Mode Pecah Langkah aktif untuk pesan berikutnya", 2000);
      } else if (cmd === "/lens") {
        setInputText(remaining ? `/lens ${remaining}` : "/lens ");
      }
      setSlashMenuIndex(0);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          adjustTextareaHeight();
        }
      });
    },
    [inputText, socialTarget, showToastNotice]
  );

  const handleEnhancePrompt = useCallback(async () => {
    const draft = inputText.trim();
    if (draft.length < 12 || isEnhancingPrompt) return;

    setIsEnhancingPrompt(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/enhance-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, language }),
      });
      const payload = await response.json().catch(() => ({}));
      const enhanced =
        typeof payload?.enhancedPrompt === "string"
          ? payload.enhancedPrompt.trim()
          : typeof payload?.data?.enhancedPrompt === "string"
          ? payload.data.enhancedPrompt.trim()
          : "";
      if (!response.ok || !enhanced) {
        throw new Error(payload?.error || "Gagal merapikan prompt.");
      }
      setEnhancedPromptPreview(enhanced);
    } catch (err: any) {
      showToastNotice(err?.message || "Gagal merapikan prompt.", 2200);
    } finally {
      setIsEnhancingPrompt(false);
    }
  }, [inputText, isEnhancingPrompt, language, showToastNotice]);

  const handleSendStructuredFeedback = useCallback(
    async (messageId: string, rating: "up" | "down", reason?: string) => {
      const chatId = activeChatId === "new-chat" ? currentSessionChatId : activeChatId;
      try {
        await fetch(`${BACKEND_URL}/api/chat/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: chatId || undefined,
            messageId,
            rating,
            reason: reason || undefined,
            meta: {
              language,
              tone,
              thinkingMode,
              answerStyle,
            },
          }),
        });
      } catch {
        // Non-blocking feedback logging
      }
      if (rating === "down" && reason) {
        setOpenFeedbackCommentId(null);
        setStructuredFeedbackThanksId(messageId);
        window.setTimeout(() => {
          setStructuredFeedbackThanksId((curr) => (curr === messageId ? null : curr));
        }, 2500);
      }
    },
    [activeChatId, currentSessionChatId, language, tone, thinkingMode, answerStyle]
  );

  const handleBranchFromMessage = useCallback(
    (messageId: string) => {
      const idx = currentMessages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;

      const slicedMessages = currentMessages.slice(0, idx + 1).map((m, i) => ({
        ...m,
        id: `branch-${Date.now()}-${i}`,
      }));

      const newChatId = generateId(true);
      const currentChatObj = chats.find((c) => c.id === activeChatId);
      const rawBaseTitle =
        currentChatObj?.title ||
        chatHistory.find((h) => h.id === activeChatId)?.title ||
        "Percakapan";
      const cleanBaseTitle = rawBaseTitle.replace(/^\[Cabang\]\s*/i, "").trim();
      const branchTitle = `[Cabang] ${cleanBaseTitle}`.slice(0, 60);
      const nowIso = new Date().toISOString();

      const branchedChat: ChatSession = {
        id: newChatId,
        title: branchTitle,
        dateCategory: "TODAY",
        messages: slicedMessages,
      };

      setChats((prev) => [branchedChat, ...prev]);
      setChatHistory((prev) => [
        {
          id: newChatId,
          title: branchTitle,
          created_at: nowIso,
          last_activity_at: nowIso,
        },
        ...prev,
      ]);

      // Carry over current Checkpoint / Context / Decisions to the new branch
      if (hasActiveChatContext(chatContextState)) {
        saveChatContextState(newChatId, chatContextState);
      }

      setCurrentSessionChatId(newChatId);
      setActiveChatId(newChatId);
      setHasMessages(slicedMessages.length > 0);
      setIsChatAreaLoading(false);
      syncBrowserUrl(newChatId, "push");
      showToastNotice("Cabang percakapan dibuat", 2000);
    },
    [
      activeChatId,
      chatContextState,
      chatHistory,
      chats,
      currentMessages,
      showToastNotice,
      syncBrowserUrl,
    ]
  );

  // Smooth fade-in and fade-out for the AI thinking indicator (covers Chat, Lens, PDF & Vision)
  useEffect(() => {
    if (isLoading || isLensLoading || isVisionLoading) {
      setShowThinkingIndicator(true);
      setIsThinkingFadingOut(false);
      return;
    }
    if (showThinkingIndicator) {
      setIsThinkingFadingOut(true);
      const timer = setTimeout(() => {
        setShowThinkingIndicator(false);
        setIsThinkingFadingOut(false);
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isLensLoading, isVisionLoading, showThinkingIndicator]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const minHeight = 28;
    const maxHeight = 140; // auto-grow hingga ~5 baris lalu scroll internal
    const val = textarea.value || "";
    if (!val || (!val.includes("\n") && val.length < 40)) {
      textarea.style.height = `${minHeight}px`;
      textarea.style.overflowY = "hidden";
      return;
    }
    textarea.style.height = "auto";
    const nextHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  // Dictation Cancel & Stop functions (Inline Dictation & Gemini style)
  const cancelVoiceRecording = useCallback(() => {
    if (dictationRecorderRef.current && dictationRecorderRef.current.state !== "inactive") {
      try {
        dictationRecorderRef.current.stop();
      } catch {}
    }
    dictationRecorderRef.current = null;

    if (dictationStreamRef.current) {
      dictationStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      dictationStreamRef.current = null;
    }

    if (dictationAudioContextRef.current && dictationAudioContextRef.current.state !== "closed") {
      try {
        void dictationAudioContextRef.current.close();
      } catch {}
    }
    dictationAudioContextRef.current = null;
    dictationAnalyserRef.current = null;
    setDictationAnalyser(null);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    dictationChunksRef.current = [];
    setIsRecording(false);
    setIsTranscribingVoice(false);
    setRecordingSeconds(0);
  }, []);

  const stopVoiceRecording = useCallback(
    (action: "stop" | "send" = "stop") => {
      dictationActionRef.current = action;

      // Voice Activity Detection: If user hasn't spoken (silence / no speech detected >= 300ms)
      if (!hasSpokenRef.current) {
        cancelVoiceRecording();
        showToastNotice("Suara tidak terdengar, coba lagi");
        return;
      }

      if (dictationRecorderRef.current && dictationRecorderRef.current.state === "recording") {
        try {
          dictationRecorderRef.current.stop();
        } catch {
          cancelVoiceRecording();
        }
      } else {
        cancelVoiceRecording();
      }
    },
    [cancelVoiceRecording, showToastNotice]
  );

  const handleToggleVoiceRecording = useCallback(async () => {
    if (isRecording) {
      stopVoiceRecording("stop");
      return;
    }

    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    // Haptic feedback if supported
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
      }
    } catch {}

    const support = checkVoiceSupport();
    if (support.isInAppBrowser) {
      showToastNotice("Buka di Safari atau Chrome untuk menggunakan mikrofon");
      return;
    }

    if (!support.hasMediaDevices) {
      setIsSpeechSupported(false);
      showToastNotice("Perangkat Anda tidak mendukung perekaman audio.");
      return;
    }

    // AudioContext must be created / resumed inside user gesture for iOS Safari
    let audioCtx: AudioContext | null = null;
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }
        dictationAudioContextRef.current = audioCtx;
      }
    } catch (e) {
      console.warn("Failed to init AudioContext:", e);
    }

    try {
      hasSpokenRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      dictationStreamRef.current = stream;

      if (audioCtx && audioCtx.state !== "closed") {
        try {
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.5;
          source.connect(analyser);
          dictationAnalyserRef.current = analyser;
          setDictationAnalyser(analyser);
        } catch (e) {
          console.warn("Analyser connection error:", e);
        }
      }

      const mimeType = getSupportedAudioMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      dictationRecorderRef.current = recorder;
      dictationChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          dictationChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop audio tracks immediately so microphone icon in phone status bar disappears
        if (dictationStreamRef.current) {
          dictationStreamRef.current.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });
          dictationStreamRef.current = null;
        }

        if (dictationAudioContextRef.current && dictationAudioContextRef.current.state !== "closed") {
          try {
            void dictationAudioContextRef.current.close();
          } catch {}
        }
        dictationAudioContextRef.current = null;
        dictationAnalyserRef.current = null;
        setDictationAnalyser(null);

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        const action = dictationActionRef.current;
        const chunks = dictationChunksRef.current;
        dictationChunksRef.current = [];
        setIsRecording(false);

        if (!hasSpokenRef.current || !chunks || chunks.length === 0) {
          showToastNotice("Suara tidak terdengar, coba lagi");
          return;
        }

        const audioBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (audioBlob.size < 200) {
          showToastNotice("Suara tidak terdengar, coba lagi");
          return;
        }

        setIsTranscribingVoice(true);
        try {
          const headers = await buildAuthHeaders();
          const turnstileToken = await getTurnstileToken().catch(() => undefined);
          const transcript = await transcribeAudioBlob(BACKEND_URL, audioBlob, headers, turnstileToken);

          if (!transcript || !transcript.trim()) {
            showToastNotice("Suara tidak terdengar, coba lagi");
            return;
          }

          const cleanTranscript = transcript.trim();
          const currentText = textareaRef.current ? textareaRef.current.value : inputText;
          const combined = currentText.trim()
            ? `${currentText.trim()} ${cleanTranscript}`
            : cleanTranscript;

          if (action === "send") {
            setInputText("");
            if (currentChatKey) {
              safeSetChatDraft(currentChatKey, "");
            }
            if (handleSendMessageRef.current) {
              await handleSendMessageRef.current(combined);
            }
          } else {
            setInputText(combined);
            if (currentChatKey) {
              safeSetChatDraft(currentChatKey, combined);
            }
            requestAnimationFrame(() => {
              const el = textareaRef.current;
              if (el) {
                el.focus();
                const len = el.value.length;
                el.setSelectionRange(len, len);
                adjustTextareaHeight();
              }
            });
          }
        } catch (err: any) {
          console.error("Transcription failed:", err);
          showToastNotice(err?.message || "Suara tidak terdengar, coba lagi");
        } finally {
          setIsTranscribingVoice(false);
          setRecordingSeconds(0);
        }
      };

      setRecordingSeconds(0);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 119) {
            // Auto stop at 2 minutes (120s)
            stopVoiceRecording("stop");
            return 120;
          }
          return prev + 1;
        });
      }, 1000);

      recorder.start(250);
      setIsRecording(true);
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      cancelVoiceRecording();
      const name = String(err?.name || "");
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        showToastNotice("Izinkan mikrofon di pengaturan browser");
      } else {
        showToastNotice("Suara tidak terdengar, coba lagi");
      }
    }
  }, [
    isRecording,
    stopVoiceRecording,
    cancelVoiceRecording,
    showToastNotice,
    buildAuthHeaders,
    getTurnstileToken,
    inputText,
    currentChatKey,
    adjustTextareaHeight,
  ]);

  // Keep stable refs to avoid re-triggering effects when recording state changes
  const cancelVoiceRecordingRef = useRef(cancelVoiceRecording);
  cancelVoiceRecordingRef.current = cancelVoiceRecording;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  // Clean up recording on visibilitychange (tab switch / browser minimize)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isRecordingRef.current) {
        cancelVoiceRecordingRef.current();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Dedicated unmount-only cleanup strictly with [] dependencies
  useEffect(() => {
    return () => {
      cancelVoiceRecordingRef.current();
    };
  }, []);

  // Creates & caches a valid 0.1s silent PCM WAV data URI for synchronous iOS Safari <audio> unlock
  const silentUnlockWavRef = useRef<string | null>(null);
  const getSilentUnlockWavUri = useCallback((): string => {
    if (silentUnlockWavRef.current) return silentUnlockWavRef.current;
    try {
      const sampleRate = 8000;
      const numSamples = 800; // exact 0.1s at 8000 Hz
      const buffer = new ArrayBuffer(44 + numSamples);
      const view = new DataView(buffer);
      const writeAscii = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      };
      writeAscii(0, "RIFF");
      view.setUint32(4, 36 + numSamples, true);
      writeAscii(8, "WAVE");
      writeAscii(12, "fmt ");
      view.setUint32(16, 16, true); // PCM
      view.setUint16(20, 1, true); // linear PCM
      view.setUint16(22, 1, true); // mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate, true);
      view.setUint16(32, 1, true); // block align
      view.setUint16(34, 8, true); // 8-bit unsigned
      writeAscii(36, "data");
      view.setUint32(40, numSamples, true);
      for (let i = 0; i < numSamples; i++) view.setUint8(44 + i, 128); // 8-bit PCM silence center
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      silentUnlockWavRef.current = `data:audio/wav;base64,${btoa(binary)}`;
    } catch {
      silentUnlockWavRef.current =
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    }
    return silentUnlockWavRef.current;
  }, []);

  // Open Gemini Live In-Place Voice Mode & synchronously unlock iOS/Android audio hardware inside tap gesture
  const handleOpenVoiceMode = useCallback(() => {
    if (isRecording) {
      cancelVoiceRecording();
    }
    textareaRef.current?.blur();
    setIsVoiceOptionsMenuOpen(false);

    try {
      if (typeof window !== "undefined") {
        // 1. Unlock shared HTMLAudioElement synchronously using 0.1s silent WAV
        if (voiceAudioRef.current) {
          voiceAudioRef.current.src = getSilentUnlockWavUri();
          voiceAudioRef.current.muted = false;
          voiceAudioRef.current.volume = 1.0;
          void voiceAudioRef.current.play().catch(() => {});
        }

        // 2. Unlock/resume shared AudioContext synchronously inside user gesture
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          if (!voiceAudioContextRef.current || voiceAudioContextRef.current.state === "closed") {
            voiceAudioContextRef.current = new AudioCtxClass();
          }
          if (voiceAudioContextRef.current.state === "suspended") {
            void voiceAudioContextRef.current.resume().catch(() => {});
          }
          void unlockAudioSystem(voiceAudioContextRef.current);
        }

        // 3. Unlock Web Speech API synchronously in user gesture & preload Indonesian voice
        unlockSpeechSynthesis();
      }
    } catch {}

    setIsVoiceModeOpen(true);
  }, [isRecording, cancelVoiceRecording, getSilentUnlockWavUri]);

  const inputTextRef = useRef<string>("");
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setInputText(nextVal);
    adjustTextareaHeight();
    if (currentChatKey) {
      safeSetChatDraft(currentChatKey, nextVal);
    }
  };

  const prevChatKeyRef = useRef<string>("");
  const isInitialDraftLoadedRef = useRef<boolean>(false);

  // Restore & save drafts per chat_id in localStorage (Item 2)
  useEffect(() => {
    if (!currentChatKey) return;

    if (!isInitialDraftLoadedRef.current) {
      isInitialDraftLoadedRef.current = true;
      const initialDraft = safeGetChatDraft(currentChatKey);
      if (initialDraft) {
        setInputText(initialDraft);
        requestAnimationFrame(() => adjustTextareaHeight());
      }
      prevChatKeyRef.current = currentChatKey;
      return;
    }

    if (prevChatKeyRef.current !== currentChatKey) {
      if (prevChatKeyRef.current) {
        safeSetChatDraft(prevChatKeyRef.current, inputTextRef.current);
      }
      const draft = safeGetChatDraft(currentChatKey);
      setInputText(draft);
      prevChatKeyRef.current = currentChatKey;
      requestAnimationFrame(() => adjustTextareaHeight());
    }
  }, [currentChatKey, adjustTextareaHeight]);

  // Contextual time-based greeting + periodic relative timestamp refresh (hydration-safe via useEffect)
  useEffect(() => {
    const firstName = authUser ? (userName || "").trim().split(/\s+/)[0] : null;
    const updateTimeDrivenUi = () => {
      const now = new Date();
      setClientNow(now);
      setContextualGreeting(getContextualGreetingByHour(now.getHours(), firstName));
    };
    updateTimeDrivenUi();
    const timer = setInterval(updateTimeDrivenUi, 60_000);
    return () => clearInterval(timer);
  }, [authUser, userName]);

  // Dynamic browser tab <title> sync
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (desktopSettingsPage) {
      const pageTitles: Record<NonNullable<typeof desktopSettingsPage>, string> = {
        account: "Kelola Akun",
        quota: "Batas penggunaan",
        notifications: "Notifikasi",
        agent: "Model Default",
        storage: "Penyimpanan Riwayat",
        shortcuts: "Pintasan Keyboard",
        theme: "Tema",
        feedback: "Kirim Masukan",
        about: "Tentang Axioma",
      };
      document.title = `${pageTitles[desktopSettingsPage]} — Axioma`;
      return;
    }
    const activeTitle =
      (activeChatId !== "new-chat" &&
        (activeChat?.title || chatHistory.find((c) => c.id === activeChatId)?.title)) ||
      "";
    if (activeTitle && activeTitle !== "Percakapan Baru" && currentMessages.length > 0) {
      document.title = `${activeTitle} — Axioma`;
    } else {
      document.title = "Axioma";
    }
  }, [desktopSettingsPage, activeChatId, activeChat?.title, chatHistory, currentMessages.length]);

  // Viewport-aware Model Selector direction (recalculated on open, resize, or chat state change)
  useEffect(() => {
    if (!isHeaderAgentMenuOpen) return;
    const updateDirection = () => {
      setAgentDropdownDirection(computeDropdownDirection(headerAgentTriggerRef.current, 320));
    };
    updateDirection();
    window.addEventListener("resize", updateDirection);
    return () => window.removeEventListener("resize", updateDirection);
  }, [isHeaderAgentMenuOpen, hasMessages]);

  // Viewport-aware Desktop Settings Popover clamping (never clips on window resize)
  useEffect(() => {
    if (!isSettingsModalOpen || settingsView !== "main") {
      setSettingsPopoverStyle(undefined);
      return;
    }
    const updatePos = () => {
      setSettingsPopoverStyle(
        computeClampedPopoverStyle(gearButtonRef.current, 290, "bottom-left", 440)
      );
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [isSettingsModalOpen, settingsView, isDesktopSidebarCollapsed]);

  // Viewport-aware Desktop Account Popover clamping (never clips on window resize)
  useEffect(() => {
    if (!isProfileDropdownOpen) {
      setProfilePopoverStyle(undefined);
      return;
    }
    const updatePos = () => {
      const anchorEl =
        profileAnchor === "sidebar" ? settingsTriggerRef.current : headerProfileTriggerRef.current;
      setProfilePopoverStyle(
        computeClampedPopoverStyle(
          anchorEl,
          310,
          profileAnchor === "sidebar" ? "bottom-left" : "top-right",
          360
        )
      );
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [isProfileDropdownOpen, profileAnchor, isDesktopSidebarCollapsed]);

  // Rotating calm placeholder every 4.5s while input is empty in empty state
  useEffect(() => {
    if (inputText.length > 0 || activeMediaMode || hasMessages || isGenerating || isLoading) return;
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % DYNAMIC_PLACEHOLDERS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [inputText.length, activeMediaMode, hasMessages, isGenerating, isLoading]);

  // Phased thinking indicator timer (0-2s, >2s, >=25s)
  useEffect(() => {
    const isAwaitingFirstChunk = Boolean(isGenerating && !streamingMessageId);
    if (!isAwaitingFirstChunk) {
      setWaitingSeconds(0);
      return;
    }

    const intervalId = setInterval(() => {
      setWaitingSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isGenerating, streamingMessageId]);

  const scrollToBottom = useCallback((force = false) => {
    if (!force && isUserScrolledUpRef.current) return;
    if (force) {
      isUserScrolledUpRef.current = false;
      setIsUserScrolledUp(false);
    }
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  }, []);

  const handleChatScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUp = distanceFromBottom >= 100;
    isUserScrolledUpRef.current = scrolledUp;
    setIsUserScrolledUp((prev) => (prev !== scrolledUp ? scrolledUp : prev));
  }, []);

  // Smooth auto-scroll to latest message or typing indicator unless user scrolled up
  useEffect(() => {
    if (hasMessages) {
      scrollToBottom(false);
    }
  }, [currentMessages.length, hasMessages, isLoading, scrollToBottom]);

  // Focus inline rename input when opened
  useEffect(() => {
    if (editingChatId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingChatId]);

  // Focus first item when dropdown menus or modals open
  useEffect(() => {
    if (isAgentMenuOpen) {
      const activeIdx = Math.max(
        0,
        AVAILABLE_AGENTS.findIndex((a) => a.id === selectedAgent.id)
      );
      requestAnimationFrame(() => {
        desktopAgentItemRefs.current[activeIdx]?.focus();
      });
    }
  }, [isAgentMenuOpen, selectedAgent.id]);

  useEffect(() => {
    if (isHeaderAgentMenuOpen) {
      const activeIdx = Math.max(
        0,
        AVAILABLE_AGENTS.findIndex((a) => a.id === selectedAgent.id)
      );
      requestAnimationFrame(() => {
        headerAgentItemRefs.current[activeIdx]?.focus();
      });
    }
  }, [isHeaderAgentMenuOpen, selectedAgent.id]);

  useEffect(() => {
    if (openChatMenuId) {
      requestAnimationFrame(() => {
        chatMenuItemRefs.current[0]?.focus();
      });
    }
  }, [openChatMenuId]);

  useEffect(() => {
    if (isSettingsMenuOpen) {
      requestAnimationFrame(() => {
        settingsMenuItemRefs.current[0]?.focus();
      });
    }
  }, [isSettingsMenuOpen]);

  useEffect(() => {
    if (isSettingsModalOpen) {
      const isTouchOrSmall =
        typeof window !== "undefined" &&
        (window.innerWidth < 768 ||
          (typeof window.matchMedia === "function" &&
            window.matchMedia("(pointer: coarse)").matches));
      if (!isTouchOrSmall) {
        requestAnimationFrame(() => {
          settingsNameInputRef.current?.focus();
        });
      }
    }
  }, [isSettingsModalOpen]);

  useEffect(() => {
    if (isClearAllConfirmOpen) {
      requestAnimationFrame(() => {
        clearAllCancelButtonRef.current?.focus();
      });
    }
  }, [isClearAllConfirmOpen]);

  // Body scroll lock for secondary confirmation dialogs (Settings modal excluded: globals.css already locks html/body and avoids Safari iOS chrome repaint suppression)
  useEffect(() => {
    const isSecondaryDialogOpen = Boolean(
      isClearAllConfirmOpen || editConfirmTarget || isGuestLimitModalOpen
    );
    if (!isSecondaryDialogOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isClearAllConfirmOpen, editConfirmTarget, isGuestLimitModalOpen]);

  const closeDesktopAgentMenu = useCallback((restoreFocus = true) => {
    setIsAgentMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => desktopAgentTriggerRef.current?.focus());
    }
  }, []);

  const getVisibleHeaderAgentTrigger = useCallback(() => {
    const mobileEl = headerAgentTriggerRef.current;
    if (mobileEl && mobileEl.getBoundingClientRect().height > 0) {
      return mobileEl;
    }
    return tabletAgentTriggerRef.current;
  }, []);

  const closeHeaderAgentMenu = useCallback(
    (restoreFocus = true) => {
      setIsHeaderAgentMenuOpen(false);
      setHeaderMenuTop(null);
      if (restoreFocus) {
        const trigger = getVisibleHeaderAgentTrigger();
        requestAnimationFrame(() => trigger?.focus());
      }
    },
    [getVisibleHeaderAgentTrigger]
  );

  const toggleHeaderAgentMenu = useCallback(() => {
    setIsHeaderAgentMenuOpen((prev) => {
      const next = !prev;
      const trigger = getVisibleHeaderAgentTrigger();
      if (next && trigger) {
        const rect = trigger.getBoundingClientRect();
        setHeaderMenuTop(Math.round(rect.bottom + 8));
      } else {
        setHeaderMenuTop(null);
      }
      return next;
    });
  }, [getVisibleHeaderAgentTrigger]);

  const closeChatItemMenu = useCallback((chatId: string | null, restoreFocus = true) => {
    setOpenChatMenuId(null);
    if (restoreFocus && chatId) {
      requestAnimationFrame(() => chatMenuTriggerRefs.current[chatId]?.focus());
    }
  }, []);

  const closeSettingsMenu = useCallback((restoreFocus = true) => {
    setIsSettingsMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => settingsTriggerRef.current?.focus());
    }
  }, []);

  const closeAttachmentMenu = useCallback((restoreFocus = true) => {
    setIsAttachmentMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => {
        if (document.activeElement !== textareaRef.current) {
          attachmentTriggerRef.current?.focus();
        }
      });
    }
  }, []);

  useEffect(() => {
    if (isAttachmentMenuOpen) {
      requestAnimationFrame(() => {
        attachmentItemRefs.current[0]?.focus();
      });
    }
  }, [isAttachmentMenuOpen]);

  const handleStartEditUserMessage = useCallback((msg: Message) => {
    setEditingUserMsgId(msg.id);
    setEditingUserMsgText(msg.content);
  }, []);

  const handleCancelEditUserMessage = useCallback(() => {
    setEditingUserMsgId(null);
    setEditingUserMsgText("");
  }, []);

  // Global Escape and outside-click handlers for menus, drawers, and modals + global shortcuts (#6)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K: Focus search input (Item 6)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (typeof window !== "undefined" && window.innerWidth < 1024) {
          setIsMobileSidebarOpen(true);
        } else if (isDesktopSidebarCollapsed) {
          setIsDesktopSidebarCollapsed(false);
        }
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        });
        return;
      }

      // Ctrl+Shift+O or Cmd+Shift+O: New chat (Item 6)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleCreateNewChat();
        return;
      }

      if (e.key === "Escape") {
        // Stop AI generation if currently streaming (Item 6)
        if (isGenerating) {
          e.preventDefault();
          handleStopGeneration();
          return;
        }

        if (isGuestLimitModalOpen) {
          e.preventDefault();
          setIsGuestLimitModalOpen(false);
          return;
        }

        if (editConfirmTarget) {
          e.preventDefault();
          setEditConfirmTarget(null);
          return;
        }

        if (editingUserMsgId) {
          e.preventDefault();
          setEditingUserMsgId(null);
          setEditingUserMsgText("");
          return;
        }

        if (isClearAllConfirmOpen) {
          e.preventDefault();
          if (!isClearingAllChats) setIsClearAllConfirmOpen(false);
          return;
        }
        if (isSettingsModalOpen) {
          e.preventDefault();
          if (settingsView !== "main") {
            setSettingsView("main");
          } else {
            setIsSettingsModalOpen(false);
          }
          return;
        }
        if (desktopSettingsPage) {
          e.preventDefault();
          setDesktopSettingsPage(null);
          return;
        }
        if (undoToastChat) {
          e.preventDefault();
          const pending = pendingDeleteRef.current;
          if (pending && !pending.isCancelled) {
            clearTimeout(pending.timerId);
            pending.isCancelled = true;
            pendingDeleteRef.current = null;
            setUndoToastChat(null);
            void commitDeleteChatServer(pending.chat.id);
          } else {
            setUndoToastChat(null);
          }
          return;
        }
        if (openFeedbackCommentId) {
          e.preventDefault();
          setOpenFeedbackCommentId(null);
          return;
        }
        if (editingChatId) {
          e.preventDefault();
          setEditingChatId(null);
          setEditingTitleValue("");
          return;
        }
        if (openChatMenuId) {
          e.preventDefault();
          closeChatItemMenu(openChatMenuId, true);
          return;
        }
        if (lightboxImage) {
          e.preventDefault();
          setLightboxImage(null);
          return;
        }
        if (isAttachmentMenuOpen) {
          e.preventDefault();
          closeAttachmentMenu(true);
          return;
        }
        if (isAgentMenuOpen) {
          e.preventDefault();
          closeDesktopAgentMenu(true);
          return;
        }
        if (isHeaderAgentMenuOpen) {
          e.preventDefault();
          closeHeaderAgentMenu(true);
          return;
        }
        if (isSettingsMenuOpen) {
          e.preventDefault();
          closeSettingsMenu(true);
          return;
        }
        if (isVoiceOptionsMenuOpen) {
          e.preventDefault();
          setIsVoiceOptionsMenuOpen(false);
          return;
        }
        if (isMobileSidebarOpen) {
          e.preventDefault();
          setIsMobileSidebarOpen(false);
        }
      }
    };

    const handleGlobalMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        isVoiceOptionsMenuOpen &&
        !voiceOptionsMenuRef.current?.contains(target)
      ) {
        setIsVoiceOptionsMenuOpen(false);
      }

      if (
        isAgentMenuOpen &&
        !desktopAgentMenuRef.current?.contains(target) &&
        !desktopAgentTriggerRef.current?.contains(target)
      ) {
        closeDesktopAgentMenu(false);
      }

      if (
        isAttachmentMenuOpen &&
        !attachmentMenuRef.current?.contains(target) &&
        !attachmentTriggerRef.current?.contains(target)
      ) {
        closeAttachmentMenu(false);
      }

      if (
        isHeaderAgentMenuOpen &&
        !headerAgentMenuRef.current?.contains(target) &&
        !headerAgentTriggerRef.current?.contains(target) &&
        !tabletAgentTriggerRef.current?.contains(target)
      ) {
        closeHeaderAgentMenu(false);
      }

      if (openChatMenuId) {
        const triggerEl = chatMenuTriggerRefs.current[openChatMenuId];
        if (
          !chatMenuContainerRef.current?.contains(target) &&
          !triggerEl?.contains(target)
        ) {
          closeChatItemMenu(openChatMenuId, false);
        }
      }

      if (
        isSettingsMenuOpen &&
        !settingsMenuRef.current?.contains(target) &&
        !settingsTriggerRef.current?.contains(target)
      ) {
        closeSettingsMenu(false);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("mousedown", handleGlobalMouseDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("mousedown", handleGlobalMouseDown);
    };
  }, [
    isClearAllConfirmOpen,
    isClearingAllChats,
    isSettingsModalOpen,
    settingsView,
    undoToastChat,
    openFeedbackCommentId,
    editingChatId,
    openChatMenuId,
    isAgentMenuOpen,
    isHeaderAgentMenuOpen,
    isSettingsMenuOpen,
    isAttachmentMenuOpen,
    isMobileSidebarOpen,
    closeChatItemMenu,
    closeDesktopAgentMenu,
    closeHeaderAgentMenu,
    closeSettingsMenu,
    closeAttachmentMenu,
    isVoiceOptionsMenuOpen,
  ]);

  const handleMenuArrowKeyDown = (
    e: React.KeyboardEvent,
    items: (HTMLButtonElement | null)[],
    onEscape: () => void
  ) => {
    const validItems = items.filter(
      (el): el is HTMLButtonElement => el !== null && !el.disabled
    );
    if (validItems.length === 0) return;
    const currentIndex = validItems.findIndex((el) => el === document.activeElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % validItems.length;
      validItems[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex =
        currentIndex <= 0 ? validItems.length - 1 : currentIndex - 1;
      validItems[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      validItems[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      validItems[validItems.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onEscape();
    }
  };

  // Filtered and time-grouped sidebar chat history; computed client-side after mount (#5)
  const groupedChatHistory = useMemo(() => {
    if (!clientNow) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? chatHistory.filter((c) => (c.title || "").toLowerCase().includes(query))
      : [...chatHistory];

    filtered.sort((a, b) => getChatTimestamp(b) - getChatTimestamp(a));

    const groups = new Map<TimeGroupLabel, ChatHistoryItem[]>();
    for (const label of TIME_GROUP_ORDER) {
      groups.set(label, []);
    }

    for (const chat of filtered) {
      const ts = getChatTimestamp(chat);
      const label = getTimeGroupLabel(ts, clientNow);
      groups.get(label)!.push(chat);
    }

    return TIME_GROUP_ORDER.map((label) => ({
      label,
      items: groups.get(label) || [],
    })).filter((g) => g.items.length > 0);
  }, [chatHistory, searchQuery, clientNow]);

  const handleCreateNewChat = useCallback(
    (options?: { updateUrl?: boolean }) => {
      setDesktopSettingsPage(null);
      setIsVoiceModeOpen(false);
      setIsVoiceOptionsMenuOpen(false);
      setOpenFeedbackCommentId(null);
      isUserScrolledUpRef.current = false;
      setIsUserScrolledUp(false);
      setIsChatAreaLoading(false);
      focusDesktopTextarea();

      // If user is not authenticated (Guest Mode), completely clear in-memory messages
      if (!authUser) {
        setChats([]);
      }

      if (activeChatId === "new-chat" && currentSessionChatId && !hasMessages) {
        setIsMobileSidebarOpen(false);
        if (options?.updateUrl !== false) {
          syncBrowserUrl("new-chat", "push");
        }
        return;
      }

      const newSessionId = generateId(true);
      setCurrentSessionChatId(newSessionId);
      setActiveChatId("new-chat");
      const nextGreeting = getRandomGreeting(displayName, Boolean(authUser));
      setDynamicGreeting(nextGreeting);
      setGreeting(nextGreeting);
      setHasMessages(false);
      setShowEmptyDecorations(true);
      setIsEmptyDecorationsExiting(false);
      setIsMobileSidebarOpen(false);
      if (options?.updateUrl !== false) {
        syncBrowserUrl("new-chat", "push");
      }
    },
    [activeChatId, currentSessionChatId, hasMessages, authUser, displayName, syncBrowserUrl, focusDesktopTextarea]
  );

  const loadChatFeedback = useCallback(
    async (chatId: string) => {
      try {
        const headers = await buildAuthHeaders();
        const res = await fetch(`${BACKEND_URL}/api/chats/${chatId}/feedback`, {
          method: "GET",
          headers,
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success && json.data && typeof json.data === "object") {
          setFeedback((prev) => ({ ...prev, ...json.data }));
        }
      } catch {
        // Ignore network errors while loading feedback
      }
    },
    [buildAuthHeaders]
  );

  const handleSelectChat = useCallback(
    async (chatId: string, options?: { updateUrl?: boolean }) => {
      if (editingChatId === chatId) return;

      if (!VALID_UUID_REGEX.test(chatId)) {
        showToastNotice("Percakapan tidak ditemukan");
        handleCreateNewChat({ updateUrl: false });
        syncBrowserUrl("new-chat", "replace");
        return;
      }

      setDesktopSettingsPage(null);
      setActiveChatId(chatId);
      setCurrentSessionChatId(chatId);
      setIsVoiceModeOpen(false);
      setIsVoiceOptionsMenuOpen(false);
      setIsMobileSidebarOpen(false);
      setOpenChatMenuId(null);
      setOpenFeedbackCommentId(null);
      isUserScrolledUpRef.current = false;
      setIsUserScrolledUp(false);
      focusDesktopTextarea();

      if (options?.updateUrl !== false) {
        syncBrowserUrl(chatId, "push");
      }

      void loadChatFeedback(chatId);

      const existingLocal = chats.find((c) => c.id === chatId);
      if (existingLocal && existingLocal.messages.length > 0) {
        setHasMessages(true);
        setIsChatAreaLoading(false);
        return;
      }

      setIsChatAreaLoading(true);

      if (!authUser) {
        const guestMessagesRaw = getGuestMessages(chatId);
        const guestChat = getGuestChats().find((c) => c.id === chatId);
        if (!guestChat && guestMessagesRaw.length === 0) {
          showToastNotice("Percakapan tidak ditemukan");
          handleCreateNewChat({ updateUrl: false });
          syncBrowserUrl("new-chat", "replace");
          setIsChatAreaLoading(false);
          return;
        }

        const loadedMessages: Message[] = guestMessagesRaw.map((row: any) => ({
          id: String(row.id || `msg-${Math.random()}`),
          sender: row.role === "user" || row.sender === "user" ? "user" : "ai",
          content: String(row.content || ""),
          created_at: typeof row.created_at === "string" ? row.created_at : undefined,
          agentId: typeof row.agent_id === "string" ? row.agent_id : (typeof row.agentId === "string" ? row.agentId : undefined),
          agentName: typeof row.agent_name === "string" ? row.agent_name : (typeof row.agentName === "string" ? row.agentName : undefined),
          attachments: Array.isArray(row.attachments) ? row.attachments : undefined,
        }));

        const returnedTitle = guestChat?.title || "Percakapan";
        setChats((prev) => {
          if (prev.some((c) => c.id === chatId)) {
            return prev.map((c) =>
              c.id === chatId ? { ...c, title: returnedTitle, messages: loadedMessages } : c
            );
          }
          return [
            {
              id: chatId,
              title: returnedTitle,
              dateCategory: "TODAY",
              messages: loadedMessages,
            },
            ...prev,
          ];
        });
        setHasMessages(loadedMessages.length > 0);
        setIsChatAreaLoading(false);
        return;
      }

      try {
        const headers = await buildAuthHeaders();
        const response = await fetch(`${BACKEND_URL}/api/chats/${chatId}/messages`, {
          method: "GET",
          headers,
        });
        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success) {
          // If chat does not exist (404), is invalid (400), or belongs to another user (403), notify & redirect (#10)
          if (response.status === 400 || response.status === 403 || response.status === 404) {
            showToastNotice("Percakapan tidak ditemukan");
            handleCreateNewChat({ updateUrl: false });
            syncBrowserUrl("new-chat", "replace");
          }
          return;
        }

        const loadedMessages: Message[] = (result.data || []).map((row: any) => {
          const msgId = String(row.id || `msg-${Math.random()}`);
          const contentStr = String(row.content || "");
          return {
            id: msgId,
            sender: row.role === "user" ? "user" : "ai",
            content: contentStr,
            created_at: typeof row.created_at === "string" ? row.created_at : undefined,
            agentId: typeof row.agent_id === "string" ? row.agent_id : undefined,
            agentName: typeof row.agent_name === "string" ? row.agent_name : undefined,
            attachments: Array.isArray(row.attachments) ? row.attachments : undefined,
          };
        });

        const returnedTitle =
          result.chat?.title ||
          chatHistory.find((c) => c.id === chatId)?.title ||
          "Percakapan";

        setChats((prev) => {
          if (prev.some((c) => c.id === chatId)) {
            return prev.map((c) =>
              c.id === chatId ? { ...c, title: returnedTitle, messages: loadedMessages } : c
            );
          }
          return [
            {
              id: chatId,
              title: returnedTitle,
              dateCategory: "TODAY",
              messages: loadedMessages,
            },
            ...prev,
          ];
        });
        setHasMessages(loadedMessages.length > 0);
      } catch (err: any) {
        console.error("Backend Messages Fetch Error:", err?.message || err);
      } finally {
        setIsChatAreaLoading(false);
      }
    },
    [
      editingChatId,
      showToastNotice,
      syncBrowserUrl,
      loadChatFeedback,
      chats,
      buildAuthHeaders,
      handleCreateNewChat,
      chatHistory,
      focusDesktopTextarea,
    ]
  );

  // Clean up legacy guest chats from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.GUEST_CHATS);
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(STORAGE_KEYS.GUEST_MSG_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      } catch {}
    }
  }, []);

  // Restore active chat from URL (/c/<chat_id>) on initial load and browser Back/Forward (#10, #11)
  useEffect(() => {
    if (!currentUserId) return;

    if (!initialRouteLoadedRef.current) {
      initialRouteLoadedRef.current = true;

      // In Guest Mode, never restore chats on refresh or initial load - always start with a clean session!
      if (!authUser) {
        setChats([]);
        setHasMessages(false);
        setActiveChatId("new-chat");
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/c/")) {
          syncBrowserUrl("new-chat", "replace");
        }
        return;
      }

      const rawInitial = (initialChatId || "").trim();
      if (rawInitial) {
        if (VALID_UUID_REGEX.test(rawInitial)) {
          void handleSelectChat(rawInitial, { updateUrl: false });
        } else {
          showToastNotice("Percakapan tidak ditemukan");
          handleCreateNewChat({ updateUrl: false });
          syncBrowserUrl("new-chat", "replace");
        }
      } else if (typeof window !== "undefined" && window.location.pathname.startsWith("/c/")) {
        const match = window.location.pathname.match(UUID_PATH_REGEX);
        if (match?.[1]) {
          void handleSelectChat(match[1], { updateUrl: false });
        } else {
          showToastNotice("Percakapan tidak ditemukan");
          handleCreateNewChat({ updateUrl: false });
          syncBrowserUrl("new-chat", "replace");
        }
      }
    }

    const handlePopState = () => {
      if (window.location.pathname.startsWith("/c/")) {
        const match = window.location.pathname.match(UUID_PATH_REGEX);
        if (match?.[1]) {
          void handleSelectChat(match[1], { updateUrl: false });
        } else {
          showToastNotice("Percakapan tidak ditemukan");
          handleCreateNewChat({ updateUrl: false });
          syncBrowserUrl("new-chat", "replace");
        }
      } else {
        handleCreateNewChat({ updateUrl: false });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [
    currentUserId,
    initialChatId,
    handleSelectChat,
    handleCreateNewChat,
    showToastNotice,
    syncBrowserUrl,
  ]);

  // Inline rename handlers
  const startEditingChat = (chat: ChatHistoryItem) => {
    setOpenChatMenuId(null);
    setEditingChatId(chat.id);
    setEditingTitleValue(chat.title || "");
  };

  const cancelEditingChat = () => {
    setEditingChatId(null);
    setEditingTitleValue("");
  };

  const submitRenameChat = async (chatId: string) => {
    if (isSavingTitle) return;
    const trimmed = editingTitleValue.replace(/\s+/g, " ").trim();
    const originalChat = chatHistory.find((c) => c.id === chatId);
    if (!trimmed || trimmed === originalChat?.title) {
      cancelEditingChat();
      return;
    }

    setIsSavingTitle(true);
    const previousTitle = originalChat?.title || "";

    // Optimistic update
    setChatHistory((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title: trimmed } : c))
    );
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title: trimmed } : c))
    );
    setEditingChatId(null);
    setEditingTitleValue("");

    if (!authUser) {
      const guestChats = getGuestChats().map((c) =>
        c.id === chatId ? { ...c, title: trimmed } : c
      );
      saveGuestChats(guestChats);
      setIsSavingTitle(false);
      return;
    }

    try {
      const headers = await buildAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/chats/${chatId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          title: trimmed,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Gagal menyimpan judul percakapan.");
      }
    } catch (err: any) {
      console.error("Rename chat error:", err);
      // Rollback on failure
      setChatHistory((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title: previousTitle } : c))
      );
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title: previousTitle } : c))
      );
    } finally {
      setIsSavingTitle(false);
    }
  };

  // Delayed single chat deletion with 5-second Undo Toast (Item 4)
  const commitDeleteChatServer = useCallback(
    async (targetId: string) => {
      safeRemovePendingDelete(targetId);
      if (!authUser) {
        deleteGuestChat(targetId);
        return;
      }
      try {
        const headers = await buildAuthHeaders();
        const response = await fetch(`${BACKEND_URL}/api/chats/${targetId}`, {
          method: "DELETE",
          headers,
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          console.warn("Delete chat server response:", result);
        }
      } catch (err: any) {
        console.error("Delayed delete chat error:", err);
      }
    },
    [buildAuthHeaders]
  );

  const handleInitiateDeleteChat = useCallback(
    (chat: ChatHistoryItem) => {
      const targetId = chat.id;

      // If another chat was already pending delete, commit it to server immediately
      if (pendingDeleteRef.current && !pendingDeleteRef.current.isCancelled) {
        clearTimeout(pendingDeleteRef.current.timerId);
        pendingDeleteRef.current.isCancelled = true;
        void commitDeleteChatServer(pendingDeleteRef.current.chat.id);
        pendingDeleteRef.current = null;
      }

      // Immediately abort any running AI streaming request for this chat
      if (requestControllersByChatRef.current[targetId]) {
        try {
          requestControllersByChatRef.current[targetId].abort();
        } catch {
          // ignore abort errors
        }
        delete requestControllersByChatRef.current[targetId];
      }
      stoppedByUserByChatRef.current[targetId] = true;

      // Capture original positions to restore accurately on Undo
      const originalHistoryIndex = chatHistory.findIndex((c) => c.id === targetId);
      const originalSession = chats.find((c) => c.id === targetId);

      // Optimistically remove from sidebar immediately
      setChatHistory((prev) => prev.filter((c) => c.id !== targetId));
      setChats((prev) => prev.filter((c) => c.id !== targetId));

      // If active chat is this one, navigate to new chat
      if (activeChatId === targetId) {
        handleCreateNewChat({ updateUrl: true });
      }

      // Clean up draft for this chat
      safeRemoveChatDraft(targetId);

      // Track pending delete in localStorage in case user closes tab
      safeAddPendingDelete(targetId);

      const pendingItem: {
        chat: ChatHistoryItem;
        originalHistoryIndex: number;
        originalSession?: ChatSession;
        timerId: any;
        expiresAt: number;
        isCancelled: boolean;
      } = {
        chat,
        originalHistoryIndex: originalHistoryIndex >= 0 ? originalHistoryIndex : 0,
        originalSession,
        timerId: null as any,
        expiresAt: Date.now() + 5000,
        isCancelled: false,
      };

      // Schedule actual server deletion after 5 seconds
      pendingItem.timerId = setTimeout(() => {
        // Critical: Check isCancelled and pendingDeleteRef match
        if (pendingItem.isCancelled) {
          return;
        }
        if (pendingDeleteRef.current === pendingItem) {
          pendingDeleteRef.current = null;
          setUndoToastChat(null);
        }
        void commitDeleteChatServer(targetId);
      }, 5000);

      pendingDeleteRef.current = pendingItem;
      setUndoToastChat(chat);
    },
    [activeChatId, chatHistory, chats, commitDeleteChatServer, handleCreateNewChat]
  );

  const handleUndoDeleteChat = useCallback(() => {
    const pending = pendingDeleteRef.current;
    if (!pending) return;

    // 1. Mark as cancelled immediately so the timer callback aborts even if triggered
    pending.isCancelled = true;

    // 2. Clear timer
    if (pending.timerId) {
      clearTimeout(pending.timerId);
    }

    // 3. Clear reference & dismiss toast
    pendingDeleteRef.current = null;
    setUndoToastChat(null);

    // 4. Remove from pending deletes in localStorage immediately
    safeRemovePendingDelete(pending.chat.id);

    // 5. Restore chat into history at its EXACT original position
    setChatHistory((prev) => {
      if (prev.some((c) => c.id === pending.chat.id)) return prev;
      const next = [...prev];
      const targetIdx =
        pending.originalHistoryIndex >= 0 && pending.originalHistoryIndex <= next.length
          ? pending.originalHistoryIndex
          : 0;
      next.splice(targetIdx, 0, pending.chat);
      return next;
    });

    // 6. Restore session into chats
    setChats((prev) => {
      if (prev.some((c) => c.id === pending.chat.id)) return prev;
      const restoredSession: ChatSession = pending.originalSession || {
        id: pending.chat.id,
        title: pending.chat.title || "Percakapan",
        dateCategory: "TODAY",
        messages: [],
      };
      return [restoredSession, ...prev];
    });

    // 7. Select restored chat
    handleSelectChat(pending.chat.id);
  }, [handleSelectChat]);

  // Delete all chats confirmation & handler (1d)
  const confirmClearAllChats = async () => {
    if (isClearingAllChats) return;
    setIsClearingAllChats(true);

    if (!authUser) {
      saveGuestChats([]);
      if (typeof window !== "undefined") {
        for (let i = window.localStorage.length - 1; i >= 0; i--) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(STORAGE_KEYS.GUEST_MSG_PREFIX)) {
            window.localStorage.removeItem(key);
          }
        }
      }
      setChatHistory([]);
      setChats([]);
      setFeedback({});
      setIsClearAllConfirmOpen(false);
      setIsClearingAllChats(false);
      handleCreateNewChat();
      return;
    }

    try {
      const headers = await buildAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/chats`, {
        method: "DELETE",
        headers,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Gagal menghapus semua percakapan.");
      }

      setChatHistory([]);
      setChats([]);
      setFeedback({});
      setIsClearAllConfirmOpen(false);
      handleCreateNewChat();
    } catch (err: any) {
      console.error("Clear all chats error:", err);
    } finally {
      setIsClearingAllChats(false);
    }
  };

  // Settings modal save handler (#8, #14)
  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanedName = settingsNameInput.replace(/\s+/g, " ").trim();

    setSettingsNameError(null);
    setDisplayName(cleanedName);
    setSettingsNameInput(cleanedName);
    if (cleanedName) {
      safeSetLocalStorage(STORAGE_KEYS.DISPLAY_NAME, cleanedName);
    } else {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEYS.DISPLAY_NAME);
        }
      } catch {
        // Ignore storage errors
      }
    }

    const chosenDefault =
      AVAILABLE_AGENTS.find((a) => a.id === settingsDefaultAgentInput) || AVAILABLE_AGENTS[0];
    setDefaultAgentId(chosenDefault.id);
    setSelectedAgent(chosenDefault);
    safeSetLocalStorage(STORAGE_KEYS.DEFAULT_AGENT, chosenDefault.id);
    safeSetLocalStorage(STORAGE_KEYS.SELECTED_AGENT, chosenDefault.id);

    setIsSettingsModalOpen(false);
  };

  const handleSelectDefaultAgent = (agentId: string) => {
    const chosenDefault =
      AVAILABLE_AGENTS.find((a) => a.id === agentId) || AVAILABLE_AGENTS[0];
    setSettingsDefaultAgentInput(chosenDefault.id);
    setDefaultAgentId(chosenDefault.id);
    setSelectedAgent(chosenDefault);
    safeSetLocalStorage(STORAGE_KEYS.DEFAULT_AGENT, chosenDefault.id);
    safeSetLocalStorage(STORAGE_KEYS.SELECTED_AGENT, chosenDefault.id);
    showToastNotice(`Model default diubah ke ${chosenDefault.name}`);
  };

  const handleSwitchToOmni = useCallback(() => {
    const omniAgent =
      AVAILABLE_AGENTS.find((a) => a.id === "axioma-omni") || AVAILABLE_AGENTS[0];
    setSelectedAgent(omniAgent);
    safeSetLocalStorage(STORAGE_KEYS.SELECTED_AGENT, omniAgent.id);
    showToastNotice("Beralih ke Axioma Omni (1 kredit / pesan)", 2200);
  }, [showToastNotice]);

  const handleUpdateDisplayName = (rawName: string) => {
    const cleanedName = rawName.replace(/\s+/g, " ").trim();
    setDisplayName(cleanedName);
    setSettingsNameInput(cleanedName);
    if (cleanedName) {
      safeSetLocalStorage(STORAGE_KEYS.DISPLAY_NAME, cleanedName);
    } else {
      safeRemoveLocalStorage(STORAGE_KEYS.DISPLAY_NAME);
    }
    showToastNotice("Nama tampilan disimpan.");
  };

  const appendMessageToChat = (chatId: string, message: Message) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, message],
          };
        }
        return chat;
      })
    );
  };

  // Voice Mode: Send message to /api/chats/message with voice_mode: true (supports attachments & guest history)
  const handleVoiceModeSendMessage = useCallback(
    async (
      userText: string,
      voiceMode: boolean,
      signal?: AbortSignal
    ): Promise<{
      aiReplyText: string;
      streamReader?: ReadableStreamDefaultReader<Uint8Array> | null;
      sentAttachments?: AttachmentItem[];
    }> => {
      if (!authUser) {
        const currentCount = getGuestMessageCount();
        if (currentCount >= GUEST_MAX_MESSAGES) {
          setIsGuestLimitModalOpen(true);
          throw new Error("Batas pesan tamu tercapai. Silakan masuk untuk melanjutkan.");
        }
        const nextCount = incrementGuestMessageCount();
        setGuestMessageCount(nextCount);
      }

      let targetChatId = activeChatId;
      let sessionPayloadId = currentSessionChatId;

      if (!sessionPayloadId) {
        sessionPayloadId = generateId(true);
        setCurrentSessionChatId(sessionPayloadId);
      }

      if (targetChatId === "new-chat") {
        targetChatId = sessionPayloadId;
      }

      const readyPending = pendingAttachments.filter(
        (a) => a.status === "ready" && a.serverAttachment
      );
      const attachmentIds = readyPending.map((a) => a.serverAttachment!.id);
      const sentAttachments = readyPending.map((a) => a.serverAttachment as AttachmentItem);

      if (readyPending.length > 0) {
        setPendingAttachments((prev) => prev.filter((a) => a.status !== "ready"));
      }

      const headers = await buildAuthHeaders();
      headers["Accept"] = "text/event-stream, application/json";

      const turnstileToken = await getTurnstileToken().catch(() => undefined);

      const response = await fetch(`${BACKEND_URL}/api/chats/message`, {
        method: "POST",
        headers,
        signal,
        body: JSON.stringify({
          chat_id: sessionPayloadId,
          content: userText,
          stream: true,
          agent_id: selectedAgent.id,
          language,
          tone,
          thinkingMode,
          answerStyle,
          socialTarget,
          contextSummary: chatContextState.checkpoint?.summary || undefined,
          checkpoint: chatContextState.checkpoint || undefined,
          contextCorrection: chatContextState.contextCorrection.trim() || undefined,
          workspaceContext:
            !isPrivateMode && activeWorkspace
              ? { name: activeWorkspace.name, instructions: activeWorkspace.instructions }
              : undefined,
          decisionHistory:
            chatContextState.decisions.length > 0
              ? chatContextState.decisions.slice(-5).map((d) => ({
                  decision: d.decision,
                  reason: d.reason,
                  date: d.date,
                }))
              : undefined,
          userProfile: !isPrivateMode ? userProfile.trim() || undefined : undefined,
          contextControl: isPrivateMode
            ? { useProject: false, useProfile: false, useHistory: true }
            : contextControl,
          requirementLock:
            isRequirementLockEnabled && requirementLockItems.length > 0
              ? requirementLockItems
              : undefined,
          turnstile_token: turnstileToken || undefined,
          attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
          voice_mode: voiceMode,
          history: !authUser
            ? !contextControl.useHistory
              ? []
              : (chats.find((c) => c.id === targetChatId)?.messages || [])
                .filter((m) => !m.isError && m.content.trim())
                .map((m) => ({
                  id: m.id,
                  role: m.sender === "ai" ? "ai" : "user",
                  content: m.content,
                  created_at: m.created_at,
                }))
            : undefined,
        }),
      });

      if (!response.ok) {
        let errDetail = `Status ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.error) errDetail = errJson.error;
        } catch {}
        throw new Error(errDetail);
      }

      if (response.body) {
        return {
          aiReplyText: "",
          streamReader: response.body.getReader(),
          sentAttachments: sentAttachments.length > 0 ? sentAttachments : undefined,
        };
      }

      const data = await response.json();
      return {
        aiReplyText: data.reply || data.content || "",
        sentAttachments: sentAttachments.length > 0 ? sentAttachments : undefined,
      };
    },
    [
      activeChatId,
      currentSessionChatId,
      selectedAgent,
      language,
      tone,
      thinkingMode,
      answerStyle,
      socialTarget,
      chatContextState,
      activeWorkspace,
      buildAuthHeaders,
      getTurnstileToken,
      authUser,
      pendingAttachments,
      chats,
    ]
  );

  // Voice Mode: Save completed turn to chat history and active session
  const handleVoiceModeTurnComplete = useCallback(
    (userText: string, aiText: string, sentAttachments?: AttachmentItem[]) => {
      if (!userText || !aiText) return;

      const nowIso = new Date().toISOString();
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        sender: "user",
        content: userText,
        created_at: nowIso,
        attachments: sentAttachments && sentAttachments.length > 0 ? sentAttachments : undefined,
      };

      const aiMsg: Message = {
        id: `ai-${Date.now() + 1}`,
        sender: "ai",
        content: aiText,
        created_at: nowIso,
        agentId: selectedAgent.id,
        agentName: selectedAgent.name,
      };

      let targetChatId = activeChatId;
      let sessionPayloadId = currentSessionChatId;

      if (!sessionPayloadId) {
        sessionPayloadId = generateId(true);
        setCurrentSessionChatId(sessionPayloadId);
      }

      const initialTitle = userText.length > 40 ? `${userText.slice(0, 40)}…` : userText;

      if (activeChatId === "new-chat") {
        targetChatId = sessionPayloadId;
        const newChat: ChatSession = {
          id: targetChatId,
          title: initialTitle,
          dateCategory: "TODAY",
          messages: [userMsg, aiMsg],
        };
        setChats((prev) => [newChat, ...prev]);
        setActiveChatId(targetChatId);
        syncBrowserUrl(targetChatId, "push");

        setClientNow(new Date());
        setChatHistory((prev) => [
          {
            id: targetChatId,
            title: initialTitle,
            created_at: nowIso,
            last_activity_at: nowIso,
          },
          ...prev.filter((c) => c.id !== targetChatId),
        ]);
      } else {
        appendMessageToChat(targetChatId, userMsg);
        setTimeout(() => {
          appendMessageToChat(targetChatId, aiMsg);
        }, 50);

        setChatHistory((prev) => {
          const exists = prev.some((c) => c.id === targetChatId);
          if (exists) {
            return prev.map((c) =>
              c.id === targetChatId ? { ...c, last_activity_at: nowIso } : c
            );
          }
          return [
            {
              id: targetChatId,
              title: initialTitle,
              created_at: nowIso,
              last_activity_at: nowIso,
            },
            ...prev,
          ];
        });
      }

      setHasMessages(true);
    },
    [activeChatId, currentSessionChatId, selectedAgent, syncBrowserUrl]
  );

  // Replaces a temporary message ID with the authoritative UUID from backend (#4)
  const replaceMessageIdInState = useCallback(
    (chatId: string, oldId: string, newId: string) => {
      if (!oldId || !newId || oldId === newId) return;
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map((m) =>
                  m.id === oldId ? { ...m, id: newId } : m
                ),
              }
            : chat
        )
      );
      setStreamingMsgIdByChat((prev) => {
        if (prev[chatId] !== oldId) return prev;
        return { ...prev, [chatId]: newId };
      });
      setFeedback((prev) => {
        if (!(oldId in prev)) return prev;
        const next = { ...prev, [newId]: prev[oldId] };
        delete next[oldId];
        return next;
      });
      setFeedbackCommentDraft((prev) => {
        if (!(oldId in prev)) return prev;
        const next = { ...prev, [newId]: prev[oldId] };
        delete next[oldId];
        return next;
      });
      setOpenFeedbackCommentId((prev) => (prev === oldId ? newId : prev));
    },
    []
  );

  const handleStopGeneration = () => {
    if (!currentChatKey) return;
    const activeController = requestControllersByChatRef.current[currentChatKey];
    if (!activeController) return;
    const activeStreamId = streamingMsgIdByChat[currentChatKey];
    stoppedByUserByChatRef.current[currentChatKey] = true;
    activeController.abort();
    delete requestControllersByChatRef.current[currentChatKey];
    setChatLoading(currentChatKey, false);
    setChatGenerating(currentChatKey, false);
    setChatStreamingMsgId(currentChatKey, null);

    // Immediately show "[Respons dihentikan]" in the active chat without waiting for reload (#8)
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChatKey) return chat;
        if (activeStreamId && chat.messages.some((m) => m.id === activeStreamId)) {
          return {
            ...chat,
            messages: chat.messages.map((m) =>
              m.id === activeStreamId
                ? { ...m, content: appendStoppedNotice(m.content) }
                : m
            ),
          };
        }
        const lastMsg = chat.messages[chat.messages.length - 1];
        if (lastMsg && lastMsg.sender === "ai" && !lastMsg.isError) {
          return {
            ...chat,
            messages: chat.messages.map((m, idx) =>
              idx === chat.messages.length - 1
                ? { ...m, content: appendStoppedNotice(m.content) }
                : m
            ),
          };
        }
        return {
          ...chat,
          messages: [
            ...chat.messages,
            {
              id: activeStreamId || `ai-stopped-${Date.now()}`,
              sender: "ai",
              content: "_[Respons dihentikan]_",
              agentId: selectedAgent.id,
              agentName: selectedAgent.name,
            },
          ],
        };
      })
    );
  };

  // Sends a user message to the backend (supports SSE streaming & JSON) and appends either the
  // AI reply or an error bubble with a retry button. Loading state is tracked per `targetChatId` (#4, #8).
  const requestAiReply = async (
    targetChatId: string,
    sessionPayloadId: string,
    userText: string,
    options?: {
      regenerate?: boolean;
      tempUserMsgId?: string;
      attachmentIds?: string[];
      mediaMode?: "image" | "video";
      taskBreakdownMode?: boolean;
    }
  ) => {
    setChatLoading(targetChatId, true);
    setChatGenerating(targetChatId, true);
    stoppedByUserByChatRef.current[targetChatId] = false;

    const activeAgentSnapshot = selectedAgent;
    const controller = new AbortController();
    requestControllersByChatRef.current[targetChatId] = controller;

    let abortReason: "timeout" | "stopped" | null = null;
    let initialTimeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      abortReason = "timeout";
      controller.abort();
    }, INITIAL_RESPONSE_TIMEOUT_MS);

    let idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const resetIdleTimeout = () => {
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
      idleTimeoutId = setTimeout(() => {
        abortReason = "timeout";
        controller.abort();
      }, IDLE_STREAM_TIMEOUT_MS);
    };

    let activeAiMsgId = `ai-${Date.now()}`;
    let currentUserMsgId = options?.tempUserMsgId || "";
    let streamBubbleCreated = false;
    let accumulatedText = "";

    const promoteChatToTop = (chatId: string, title?: string) => {
      const nowIso = new Date().toISOString();
      setClientNow(new Date());
      setChatHistory((prev) => {
        const exists = prev.some((c) => c.id === chatId);
        if (exists) {
          return prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  title: title || c.title,
                  last_activity_at: nowIso,
                }
              : c
          );
        }
        return [
          {
            id: chatId,
            title: title || userText.slice(0, 40),
            created_at: nowIso,
            last_activity_at: nowIso,
          },
          ...prev,
        ];
      });
    };

    try {
      let currentTurnstileToken = await getTurnstileToken().catch((err) => {
        throw err;
      });

      let response: Response | null = null;

      // Attempt sending message with 1 auto-retry if Turnstile verification fails (403 turnstile_failed)
      for (let attempt = 0; attempt < 2; attempt++) {
        const isRetry = attempt > 0;
        const headers = await buildAuthHeaders();
        headers["Accept"] = "text/event-stream, application/json";

        response = await fetch(`${BACKEND_URL}/api/chats/message`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            chat_id: sessionPayloadId,
            content: userText,
            stream: true,
            agent_id: activeAgentSnapshot.id,
            language,
            tone,
            thinkingMode,
            answerStyle,
            socialTarget,
            taskBreakdownMode: options?.taskBreakdownMode || undefined,
            contextSummary: chatContextState.checkpoint?.summary || undefined,
            checkpoint: chatContextState.checkpoint || undefined,
            contextCorrection: chatContextState.contextCorrection.trim() || undefined,
            workspaceContext:
              !isPrivateMode && activeWorkspace
                ? { name: activeWorkspace.name, instructions: activeWorkspace.instructions }
                : undefined,
            decisionHistory:
              chatContextState.decisions.length > 0
                ? chatContextState.decisions.slice(-5).map((d) => ({
                    decision: d.decision,
                    reason: d.reason,
                    date: d.date,
                  }))
                : undefined,
            userProfile: !isPrivateMode ? userProfile.trim() || undefined : undefined,
            contextControl: isPrivateMode
              ? { useProject: false, useProfile: false, useHistory: true }
              : contextControl,
            requirementLock:
              isRequirementLockEnabled && requirementLockItems.length > 0
                ? requirementLockItems
                : undefined,
            regenerate: Boolean(options?.regenerate),
            turnstile_token: currentTurnstileToken || undefined,
            attachment_ids: options?.attachmentIds?.length ? options.attachmentIds : undefined,
            media_mode: options?.mediaMode || undefined,
            history: !authUser
              ? !contextControl.useHistory
                ? []
                : (chats.find((c) => c.id === targetChatId)?.messages || [])
                  .filter((m) => !m.isError && m.content.trim())
                  .map((m) => ({
                    id: m.id,
                    role: m.sender === "ai" ? "ai" : "user",
                    content: m.content,
                    created_at: m.created_at,
                  }))
              : undefined,
          }),
          signal: controller.signal,
        });

        // Reset Turnstile token after use so subsequent messages obtain fresh validation (#2)
        turnstileTokenRef.current = null;
        if (turnstileWidgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.reset(turnstileWidgetIdRef.current);
          } catch {}
        }

        // On 403 turnstile_failed or turnstile_required, reset widget, acquire fresh token, and auto-retry once (#2)
        if (response.status === 403 && !isRetry) {
          const errorBody = await response.clone().json().catch(() => null);
          if (errorBody?.code === "turnstile_failed" || errorBody?.code === "turnstile_required") {
            try {
              currentTurnstileToken = await getTurnstileToken();
              continue;
            } catch {
              break;
            }
          }
        }

        break;
      }

      if (!response) {
        throw new Error("Gagal menghubungkan ke server.");
      }

      // First response received: cancel initial 90s response timeout (#1)
      if (initialTimeoutId) {
        clearTimeout(initialTimeoutId);
        initialTimeoutId = null;
      }

      // Sync remaining credits immediately when exposed by backend header
      const remainingCreditsHeader = response.headers.get("X-Axioma-Remaining-Credits");
      if (remainingCreditsHeader !== null && remainingCreditsHeader.trim() !== "") {
        const parsedCredits = Number(remainingCreditsHeader);
        if (Number.isFinite(parsedCredits) && parsedCredits >= 0) {
          setQuotaInfo((prev) => ({
            ...(prev || {}),
            remainingCredits: parsedCredits,
            remaining: parsedCredits,
            triggeredByLimit: false,
          }));
        }
      }

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const isJsonResponse = contentType.includes("application/json");
      const isSseResponse =
        response.ok &&
        !isJsonResponse &&
        contentType.includes("text/event-stream") &&
        Boolean(response.body);

      if (isSseResponse && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let returnedChat: { id: string; title: string } | undefined;
        let returnedAgentName = activeAgentSnapshot.name;
        let returnedAgentId: string = activeAgentSnapshot.id;
        let returnedMessageId: string | undefined;
        let returnedImageUrl: string | undefined;
        let returnedVideoUrl: string | undefined;
        let returnedMediaType: "image" | "video" | undefined;
        let returnedMediaTitle: string | undefined;
        let returnedRevisedPrompt: string | undefined;
        let hasReceivedContent = false;

        // Initialize 30s idle timeout for active streaming (#1)
        resetIdleTimeout();

        const upsertStreamMediaBubble = () => {
          const fallbackCaption =
            accumulatedText.trim() || "Berikut visualisasi untuk permintaan Anda:";
          if (!streamBubbleCreated) {
            streamBubbleCreated = true;
            setChatLoading(targetChatId, false);
            setChatStreamingMsgId(targetChatId, activeAiMsgId);
            appendMessageToChat(targetChatId, {
              id: activeAiMsgId,
              sender: "ai",
              content: fallbackCaption,
              agentId: returnedAgentId,
              agentName: returnedAgentName,
              imageUrl: returnedImageUrl,
              videoUrl: returnedVideoUrl,
              mediaType: returnedMediaType,
              mediaTitle: returnedMediaTitle,
              revisedPrompt: returnedRevisedPrompt,
            });
            scrollToBottom(false);
          } else {
            const targetMsgId = activeAiMsgId;
            setChats((prev) =>
              prev.map((chat) =>
                chat.id === targetChatId
                  ? {
                      ...chat,
                      messages: chat.messages.map((m) =>
                        m.id === targetMsgId
                          ? {
                              ...m,
                              content: accumulatedText || m.content || fallbackCaption,
                              imageUrl: returnedImageUrl ?? m.imageUrl,
                              videoUrl: returnedVideoUrl ?? m.videoUrl,
                              mediaType: returnedMediaType ?? m.mediaType,
                              mediaTitle: returnedMediaTitle ?? m.mediaTitle,
                              revisedPrompt: returnedRevisedPrompt ?? m.revisedPrompt,
                            }
                          : m
                      ),
                    }
                  : chat
              )
            );
            scrollToBottom(false);
          }
        };

        const processRawSseEvent = (rawEvent: string) => {
          const line = rawEvent.split(/\r?\n/).find((l) => l.startsWith("data:"));
          if (!line) return;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr || jsonStr === "[DONE]") return;

          let payload: any;
          try {
            payload = JSON.parse(jsonStr);
          } catch (parseErr) {
            if (process.env.NODE_ENV !== "production") {
              console.warn("[SSE_PARSE_WARNING]", { rawEvent, parseErr });
            }
            return;
          }

          if (!payload || typeof payload !== "object") {
            return;
          }

          const extractedMedia = extractStructuredMediaPayload(payload);
          const hasEventMedia = Boolean(extractedMedia.imageUrl || extractedMedia.videoUrl);
          if (extractedMedia.imageUrl) returnedImageUrl = extractedMedia.imageUrl;
          if (extractedMedia.videoUrl) returnedVideoUrl = extractedMedia.videoUrl;
          if (extractedMedia.mediaType) returnedMediaType = extractedMedia.mediaType;
          if (extractedMedia.mediaTitle) returnedMediaTitle = extractedMedia.mediaTitle;
          if (extractedMedia.revisedPrompt) returnedRevisedPrompt = extractedMedia.revisedPrompt;

          if (hasEventMedia) {
            hasReceivedContent = true;
          }

          if (payload.type === "status" && typeof payload.text === "string") {
            const lowerStatus = payload.text.toLowerCase();
            if (lowerStatus.includes("gambar") || lowerStatus.includes("foto")) {
              setActiveLoadingContext("image");
            } else if (lowerStatus.includes("video")) {
              setActiveLoadingContext("video");
            }
            return;
          }

          if (payload.type === "meta") {
            if (typeof payload.user_message_id === "string" && payload.user_message_id) {
              if (currentUserMsgId) {
                replaceMessageIdInState(targetChatId, currentUserMsgId, payload.user_message_id);
              }
              currentUserMsgId = payload.user_message_id;
            }
            const realAiId = payload.ai_message_id || payload.message_id;
            if (typeof realAiId === "string" && realAiId) {
              returnedMessageId = realAiId;
              if (streamBubbleCreated && activeAiMsgId !== realAiId) {
                replaceMessageIdInState(targetChatId, activeAiMsgId, realAiId);
              }
              activeAiMsgId = realAiId;
            }
            if (typeof payload.agent_name === "string") returnedAgentName = payload.agent_name;
            if (typeof payload.agent_id === "string") returnedAgentId = payload.agent_id;
            if (payload.chat) returnedChat = payload.chat;
            if (hasEventMedia) {
              upsertStreamMediaBubble();
            }
          } else if (
            payload.type === "image" ||
            payload.type === "video" ||
            payload.type === "media"
          ) {
            if (typeof payload.text === "string" && payload.text.trim() && !accumulatedText) {
              accumulatedText = payload.text;
            }
            if (hasEventMedia) {
              upsertStreamMediaBubble();
            }
          } else if (payload.type === "chunk" && typeof payload.text === "string") {
            if (payload.text.length > 0) {
              hasReceivedContent = true;
            }
            accumulatedText += payload.text;
            if (!streamBubbleCreated) {
              streamBubbleCreated = true;
              setChatLoading(targetChatId, false);
              setChatStreamingMsgId(targetChatId, activeAiMsgId);
              appendMessageToChat(targetChatId, {
                id: activeAiMsgId,
                sender: "ai",
                content: accumulatedText,
                agentId: returnedAgentId,
                agentName: returnedAgentName,
                imageUrl: returnedImageUrl,
                videoUrl: returnedVideoUrl,
                mediaType: returnedMediaType,
                mediaTitle: returnedMediaTitle,
                revisedPrompt: returnedRevisedPrompt,
              });
              scrollToBottom(false);
            } else {
              const currentText = accumulatedText;
              const targetMsgId = activeAiMsgId;
              setChats((prev) =>
                prev.map((chat) =>
                  chat.id === targetChatId
                    ? {
                        ...chat,
                        messages: chat.messages.map((m) =>
                          m.id === targetMsgId
                            ? {
                                ...m,
                                content: currentText,
                                imageUrl: returnedImageUrl ?? m.imageUrl,
                                videoUrl: returnedVideoUrl ?? m.videoUrl,
                                mediaType: returnedMediaType ?? m.mediaType,
                                mediaTitle: returnedMediaTitle ?? m.mediaTitle,
                                revisedPrompt: returnedRevisedPrompt ?? m.revisedPrompt,
                              }
                            : m
                        ),
                      }
                    : chat
                )
              );
              scrollToBottom(false);
            }
          } else if (payload.type === "done") {
            if (
              typeof payload.data === "string" &&
              payload.data.length > accumulatedText.length
            ) {
              accumulatedText = payload.data;
              if (payload.data.trim()) {
                hasReceivedContent = true;
              }
            }
            if (typeof payload.agent_name === "string") returnedAgentName = payload.agent_name;
            if (typeof payload.agent_id === "string") returnedAgentId = payload.agent_id;
            if (typeof payload.user_message_id === "string" && payload.user_message_id) {
              if (currentUserMsgId) {
                replaceMessageIdInState(targetChatId, currentUserMsgId, payload.user_message_id);
              }
              currentUserMsgId = payload.user_message_id;
            }
            const realAiId = payload.ai_message_id || payload.message_id;
            if (typeof realAiId === "string" && realAiId) {
              returnedMessageId = realAiId;
            }
            if (typeof payload.remainingCredits === "number" && Number.isFinite(payload.remainingCredits)) {
              setQuotaInfo((prev) => ({
                ...(prev || {}),
                remainingCredits: payload.remainingCredits,
                remaining: payload.remainingCredits,
                triggeredByLimit: false,
              }));
            }
            if (payload.chat) returnedChat = payload.chat;
            if (hasEventMedia) {
              upsertStreamMediaBubble();
            }
          } else if (payload.type === "error") {
            if (process.env.NODE_ENV !== "production") {
              console.warn("[SSE_EVENT_ERROR]", { rawEvent, payload });
            }
            // If media was already delivered cleanly, do not discard it with a trailing error
            if (hasReceivedContent && (returnedImageUrl || returnedVideoUrl)) {
              return;
            }
            const serverErrorMessage =
              (typeof payload.error === "string" && payload.error.trim()) ||
              (typeof payload.message === "string" && payload.message.trim()) ||
              "Gagal menerima streaming balasan dari server.";
            throw new Error(serverErrorMessage);
          } else if (hasEventMedia) {
            // Handle untyped SSE media payload gracefully
            if (typeof payload.text === "string" && payload.text.trim() && !accumulatedText) {
              accumulatedText = payload.text;
            }
            upsertStreamMediaBubble();
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          // Reset 30s idle timeout on each received chunk (#1)
          resetIdleTimeout();

          if (done) {
            if (idleTimeoutId) {
              clearTimeout(idleTimeoutId);
              idleTimeoutId = null;
            }
            buffer += decoder.decode();
            break;
          }
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() || "";

          for (const rawEvent of events) {
            processRawSseEvent(rawEvent);
          }
        }

        if (buffer.trim()) {
          for (const rawEvent of buffer.split(/\r?\n\r?\n/)) {
            if (rawEvent.trim()) {
              processRawSseEvent(rawEvent);
            }
          }
        }

        const hasStructuredMedia = Boolean(returnedImageUrl || returnedVideoUrl);
        if (hasStructuredMedia) {
          hasReceivedContent = true;
        }
        const finalContent =
          accumulatedText.trim() ||
          (hasStructuredMedia
            ? "Berikut visualisasi untuk permintaan Anda:"
            : hasReceivedContent
              ? accumulatedText
              : "Pesan Anda diterima, tetapi tidak ada balasan yang valid.");
        const finalMsgId = returnedMessageId || activeAiMsgId;

        setChatStreamingMsgId(targetChatId, null);

        if (!streamBubbleCreated) {
          appendMessageToChat(targetChatId, {
            id: finalMsgId,
            sender: "ai",
            content: finalContent,
            agentId: returnedAgentId,
            agentName: returnedAgentName,
            imageUrl: returnedImageUrl,
            videoUrl: returnedVideoUrl,
            mediaType: returnedMediaType,
            mediaTitle: returnedMediaTitle,
            revisedPrompt: returnedRevisedPrompt,
          });
        } else {
          if (activeAiMsgId !== finalMsgId) {
            replaceMessageIdInState(targetChatId, activeAiMsgId, finalMsgId);
          }
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === targetChatId
                ? {
                    ...chat,
                    messages: chat.messages.map((m) =>
                      m.id === finalMsgId || m.id === activeAiMsgId
                        ? {
                            ...m,
                            id: finalMsgId,
                            content: finalContent,
                            agentId: returnedAgentId,
                            agentName: returnedAgentName,
                            imageUrl: returnedImageUrl ?? m.imageUrl,
                            videoUrl: returnedVideoUrl ?? m.videoUrl,
                            mediaType: returnedMediaType ?? m.mediaType,
                            mediaTitle: returnedMediaTitle ?? m.mediaTitle,
                            revisedPrompt: returnedRevisedPrompt ?? m.revisedPrompt,
                          }
                        : m
                    ),
                  }
                : chat
            )
          );
        }

        scrollToBottom(false);
        promoteChatToTop(
          returnedChat?.id || sessionPayloadId,
          returnedChat?.title
        );
      } else {
        const result = await response.json().catch(() => null);
        const jsonMedia = extractStructuredMediaPayload(result);
        const hasJsonMedia = Boolean(jsonMedia.imageUrl || jsonMedia.videoUrl);

        if (!response.ok || (!result?.success && !hasJsonMedia)) {
          if (response.status === 429 && result?.code === "QUOTA_EXCEEDED") {
            const nextRemaining =
              typeof result?.remaining === "number" && Number.isFinite(result.remaining)
                ? result.remaining
                : 0;
            setQuotaInfo((prev) => ({
              ...(prev || {}),
              remainingCredits: nextRemaining,
              remaining: nextRemaining,
              required:
                typeof result?.required === "number" && Number.isFinite(result.required)
                  ? result.required
                  : undefined,
              resetAt:
                typeof result?.resetAt === "string" ? result.resetAt : prev?.resetAt,
              suggestedModel:
                typeof result?.suggestedModel === "string"
                  ? result.suggestedModel
                  : "omni",
              message:
                typeof result?.message === "string"
                  ? result.message
                  : typeof result?.error === "string"
                    ? result.error
                    : undefined,
              triggeredByLimit: true,
            }));
            setIsUpgradeModalOpen(true);
            if (authUser) {
              void fetchUserQuota();
            }
            return;
          }

          console.error("[AXIOMA_BACKEND_HTTP_ERROR]", {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            body: result,
          });

          if (response.status === 429 || result?.code === "RATE_LIMIT_EXCEEDED") {
            throw new Error(
              result?.message ||
                result?.error ||
                "Kuota pemakaian sementara tercapai. Coba lagi beberapa saat lagi atau besok."
            );
          }
          if (
            response.status === 503 ||
            result?.code === "daily_quota_exceeded" ||
            (result?.error && result.error.includes("Kuota AI hari ini"))
          ) {
            throw new Error("Kuota AI hari ini sudah habis. Tersedia lagi pukul 07.00 WIB.");
          }
          const errorDetail =
            result?.error ||
            result?.message ||
            `Server mengembalikan error (${response.status}: ${response.statusText})`;
          throw new Error(errorDetail);
        }

        if (typeof result?.remainingCredits === "number" && Number.isFinite(result.remainingCredits)) {
          setQuotaInfo((prev) => ({
            ...(prev || {}),
            remainingCredits: result.remainingCredits,
            remaining: result.remainingCredits,
            triggeredByLimit: false,
          }));
        }

        if (typeof result?.user_message_id === "string" && result.user_message_id && currentUserMsgId) {
          replaceMessageIdInState(targetChatId, currentUserMsgId, result.user_message_id);
          currentUserMsgId = result.user_message_id;
        }

        const aiResponseContent =
          (typeof result?.data === "string" && result.data.trim()) ||
          (typeof result?.text === "string" && result.text.trim()) ||
          (hasJsonMedia
            ? "Berikut visualisasi untuk permintaan Anda:"
            : "Pesan Anda diterima, tetapi tidak ada balasan yang valid.");
        const finalMsgId =
          typeof (result?.ai_message_id || result?.message_id) === "string"
            ? result.ai_message_id || result.message_id
            : activeAiMsgId;
        const returnedAgentName =
          typeof result?.agent_name === "string" ? result.agent_name : activeAgentSnapshot.name;
        const returnedAgentId =
          typeof result?.agent_id === "string" ? result.agent_id : activeAgentSnapshot.id;

        const newAiMsg: Message = {
          id: finalMsgId,
          sender: "ai",
          content: aiResponseContent,
          agentId: returnedAgentId,
          agentName: returnedAgentName,
          imageUrl: jsonMedia.imageUrl,
          videoUrl: jsonMedia.videoUrl,
          mediaType: jsonMedia.mediaType,
          mediaTitle: jsonMedia.mediaTitle,
          revisedPrompt: jsonMedia.revisedPrompt,
        };

        appendMessageToChat(targetChatId, newAiMsg);
        scrollToBottom(false);

        const returnedChat = result.chat as { id: string; title: string } | undefined;
        promoteChatToTop(
          returnedChat?.id || sessionPayloadId,
          returnedChat?.title
        );
      }
    } catch (error: any) {
      setChatStreamingMsgId(targetChatId, null);
      // If the user explicitly clicked the Stop button for this chat, ensure "[Respons dihentikan]" is displayed (#8)
      if (stoppedByUserByChatRef.current[targetChatId]) {
        const stoppedContent = appendStoppedNotice(accumulatedText);
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== targetChatId) return chat;
            if (chat.messages.some((m) => m.id === activeAiMsgId)) {
              return {
                ...chat,
                messages: chat.messages.map((m) =>
                  m.id === activeAiMsgId
                    ? {
                        ...m,
                        content: stoppedContent,
                        agentId: activeAgentSnapshot.id,
                        agentName: activeAgentSnapshot.name,
                      }
                    : m
                ),
              };
            }
            const lastMsg = chat.messages[chat.messages.length - 1];
            if (lastMsg && lastMsg.sender === "ai" && !lastMsg.isError) {
              return {
                ...chat,
                messages: chat.messages.map((m, idx) =>
                  idx === chat.messages.length - 1
                    ? { ...m, id: activeAiMsgId, content: appendStoppedNotice(m.content) }
                    : m
                ),
              };
            }
            return {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  id: activeAiMsgId,
                  sender: "ai",
                  content: stoppedContent,
                  agentId: activeAgentSnapshot.id,
                  agentName: activeAgentSnapshot.name,
                },
              ],
            };
          })
        );
        promoteChatToTop(sessionPayloadId);
        return;
      }

      console.error("[AXIOMA_CHAT_ERROR]", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        targetChatId,
        backendUrl: BACKEND_URL,
        isOnline: typeof navigator !== "undefined" ? navigator.onLine : undefined,
      });

      let errorDetail: string;
      const isTimeout =
        abortReason === "timeout" ||
        (error?.name === "AbortError" && !stoppedByUserByChatRef.current[targetChatId]);
      
      const isExplicitOffline = typeof navigator !== "undefined" && !navigator.onLine;

      if (isTimeout) {
        errorDetail = "Server terlalu lama merespons. Server mungkin sedang cold-start, silakan coba lagi.";
      } else if (
        error?.message?.includes("Kuota AI hari ini") ||
        error?.message?.toLowerCase().includes("kuota harian") ||
        error?.status === 503 ||
        error?.code === "daily_quota_exceeded"
      ) {
        errorDetail = "Kuota AI hari ini sudah habis. Tersedia lagi pukul 07.00 WIB.";
      } else if (isExplicitOffline) {
        errorDetail = "Koneksi internet Anda terputus. Periksa jaringan Anda.";
      } else if (
        typeof error?.message === "string" &&
        (error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError") ||
          error.message.includes("fetch failed"))
      ) {
        errorDetail = `Tidak dapat terhubung ke server Axioma (${BACKEND_URL}). Pastikan backend aktif.`;
      } else {
        errorDetail = error?.message || "Terjadi kesalahan saat memproses pesan.";
      }

      // If partial text was already streamed before interruption, keep the partial AI message visible above the error retry bubble (#6)
      if (streamBubbleCreated && accumulatedText.trim()) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === targetChatId
              ? {
                  ...chat,
                  messages: chat.messages.map((m) =>
                    m.id === activeAiMsgId
                      ? {
                          ...m,
                          content: accumulatedText,
                          agentId: activeAgentSnapshot.id,
                          agentName: activeAgentSnapshot.name,
                        }
                      : m
                  ),
                }
              : chat
          )
        );
      } else if (streamBubbleCreated) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === targetChatId
              ? { ...chat, messages: chat.messages.filter((m) => m.id !== activeAiMsgId) }
              : chat
          )
        );
      }

      appendMessageToChat(targetChatId, {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        content: "Gagal mendapat balasan, coba lagi.",
        isError: true,
        errorDetail,
        retryPayload: {
          chatId: targetChatId,
          sessionId: sessionPayloadId,
          content: userText,
          regenerate: options?.regenerate,
        },
      });
    } finally {
      if (initialTimeoutId) clearTimeout(initialTimeoutId);
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
      if (requestControllersByChatRef.current[targetChatId] === controller) {
        delete requestControllersByChatRef.current[targetChatId];
      }
      setChatLoading(targetChatId, false);
      setChatGenerating(targetChatId, false);
      setChatStreamingMsgId(targetChatId, null);
      setActiveLoadingContext((prev) =>
        prev === "image" || prev === "video" || prev === "chat" ? null : prev
      );
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      focusDesktopTextarea();
      // Sync sidebar & daily credit quota with backend after AI reply completes
      void refreshChatHistory();
      if (authUser) {
        void fetchUserQuota();
      }
    }
  };

  const handleSubmitEditUserMessage = async (msgId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSubmittingEdit) return;

    if (!authUser) {
      const currentCount = getGuestMessageCount();
      if (currentCount >= GUEST_MAX_MESSAGES) {
        setIsGuestLimitModalOpen(true);
        return;
      }
      const nextCount = incrementGuestMessageCount();
      setGuestMessageCount(nextCount);
    }

    const msgIdx = currentMessages.findIndex((m) => m.id === msgId);
    if (msgIdx === -1) return;

    const subsequentCount = currentMessages.length - 1 - msgIdx;
    if (subsequentCount > 0 && !editConfirmTarget) {
      setEditConfirmTarget({ msgId, content: trimmed, subsequentCount });
      return;
    }

    setEditConfirmTarget(null);
    setIsSubmittingEdit(true);

    try {
      const targetChatId = activeChatId;
      if (targetChatId && VALID_UUID_REGEX.test(targetChatId)) {
        const headers = await buildAuthHeaders();
        await fetch(`${BACKEND_URL}/api/chats/${targetChatId}/messages/${msgId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ content: trimmed }),
        }).catch((err) => console.warn("Backend edit message warning:", err));
      }

      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== currentChatKey) return c;
          const newMsgs = c.messages.slice(0, msgIdx + 1).map((m, i) =>
            i === msgIdx ? { ...m, content: trimmed } : m
          );
          return { ...c, messages: newMsgs };
        })
      );

      setEditingUserMsgId(null);
      setEditingUserMsgText("");

      void requestAiReply(
        currentChatKey,
        currentSessionChatId || activeChatId,
        trimmed,
        { tempUserMsgId: msgId }
      );
    } catch (err: any) {
      console.error("Failed to edit user message:", err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleRetry = (errorMessageId: string, payload: RetryPayload) => {
    if (loadingByChat[payload.chatId] || generatingByChat[payload.chatId]) return;
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === payload.chatId
          ? { ...chat, messages: chat.messages.filter((m) => m.id !== errorMessageId) }
          : chat
      )
    );
    void requestAiReply(payload.chatId, payload.sessionId, payload.content, {
      regenerate: payload.regenerate,
    });
  };

  // Regenerate the last AI reply (1c - Buat ulang jawaban 🔄)
  const handleRegenerateLastReply = (aiMessageId: string) => {
    if (isLoading || isGenerating) return;

    if (!authUser) {
      const currentCount = getGuestMessageCount();
      if (currentCount >= GUEST_MAX_MESSAGES) {
        setIsGuestLimitModalOpen(true);
        return;
      }
      const nextCount = incrementGuestMessageCount();
      setGuestMessageCount(nextCount);
    }

    const targetChat = chats.find((c) => c.id === activeChatId);
    if (!targetChat) return;

    const aiIdx = targetChat.messages.findIndex((m) => m.id === aiMessageId);
    if (aiIdx < 0) return;

    // Find the nearest preceding user message
    let userText = "";
    let precedingUserMsgId = "";
    for (let i = aiIdx - 1; i >= 0; i--) {
      if (targetChat.messages[i].sender === "user") {
        userText = targetChat.messages[i].content;
        precedingUserMsgId = targetChat.messages[i].id;
        break;
      }
    }
    if (!userText) return;

    const sessionPayloadId = currentSessionChatId || activeChatId;

    // Remove the AI message being regenerated from the local chat list
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: chat.messages.filter((m) => m.id !== aiMessageId) }
          : chat
      )
    );

    void requestAiReply(activeChatId, sessionPayloadId, userText, {
      regenerate: true,
      tempUserMsgId: precedingUserMsgId,
    });
  };

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    let currentCount = pendingAttachments.length;
    const toProcess: PendingAttachment[] = [];

    for (const file of files) {
      if (currentCount >= MAX_FILES_PER_MESSAGE) {
        showToastNotice(`Maksimal ${MAX_FILES_PER_MESSAGE} berkas per pesan.`);
        break;
      }

      const validation = validateAttachmentFile(file, currentCount);
      if (!validation.valid) {
        showToastNotice(validation.error || "Berkas tidak valid.");
        continue;
      }

      const localId = `att-temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const previewUrl = isPdf ? "" : URL.createObjectURL(file);

      toProcess.push({
        id: localId,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        type: isPdf ? "pdf" : "image",
        status: "compressing",
        progress: 0,
      });

      currentCount++;
    }

    if (!toProcess.length) return;

    setPendingAttachments((prev) => [...prev, ...toProcess]);

    for (const item of toProcess) {
      void processAndUploadAttachment(item);
    }
  };

  const processAndUploadAttachment = async (item: PendingAttachment) => {
    try {
      const { blob, fileName } = await compressAndOrientImage(item.file);

      setPendingAttachments((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: "uploading", progress: 10 } : a))
      );

      const headers = await buildAuthHeaders();
      const currentTurnstile = (await getTurnstileToken().catch(() => undefined)) || turnstileTokenRef.current || undefined;
      const targetChatId = activeChatId === "new-chat" ? undefined : activeChatId;

      const serverAtt = await uploadAttachmentWithProgress(
        blob,
        fileName,
        BACKEND_URL,
        headers,
        targetChatId || undefined,
        currentTurnstile,
        (progress) => {
          setPendingAttachments((prev) =>
            prev.map((a) => (a.id === item.id ? { ...a, progress } : a))
          );
        }
      );

      setPendingAttachments((prev) =>
        prev.map((a) =>
          a.id === item.id
            ? { ...a, status: "ready", progress: 100, serverAttachment: serverAtt }
            : a
        )
      );
    } catch (err: any) {
      console.warn("Upload backend failed, creating local compressed fallback:", err);
      try {
        const { blob, fileName } = await compressAndOrientImage(item.file).catch(() => ({
          blob: item.file,
          fileName: item.name,
        }));
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string) || item.previewUrl);
          reader.onerror = () => resolve(item.previewUrl);
          reader.readAsDataURL(blob);
        });
        const fallbackAtt: AttachmentItem = {
          id: item.id,
          original_name: fileName || item.name,
          mime_type: blob.type || "image/jpeg",
          size_bytes: blob.size,
          signed_url: base64Data,
        };
        setPendingAttachments((prev) =>
          prev.map((a) =>
            a.id === item.id
              ? { ...a, status: "ready", progress: 100, serverAttachment: fallbackAtt }
              : a
          )
        );
      } catch {
        setPendingAttachments((prev) =>
          prev.map((a) =>
            a.id === item.id
              ? { ...a, status: "error", error: err.message || "Gagal mengunggah berkas." }
              : a
          )
        );
      }
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleRetryAttachment = (id: string) => {
    const item = pendingAttachments.find((a) => a.id === id);
    if (!item) return;
    setPendingAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "compressing", error: undefined, progress: 0 } : a))
    );
    void processAndUploadAttachment(item);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const f = items[i].getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      void handleFilesSelected(files);
    }
  };

  const handleImageLoadError = async (attachment: AttachmentItem, messageId: string) => {
    if (refreshedAttachmentsRef.current.has(attachment.id)) return;
    refreshedAttachmentsRef.current.add(attachment.id);
    try {
      const headers = await buildAuthHeaders();
      const freshUrl = await refreshAttachmentSignedUrl(BACKEND_URL, attachment.id, headers);
      setChats((prev) =>
        prev.map((chat) => ({
          ...chat,
          messages: chat.messages.map((msg) => {
            if (msg.id !== messageId || !msg.attachments) return msg;
            return {
              ...msg,
              attachments: msg.attachments.map((att) =>
                att.id === attachment.id ? { ...att, signed_url: freshUrl } : att
              ),
            };
          }),
        }))
      );
    } catch (err) {
      console.error("Failed to refresh attachment signed URL:", err);
    }
  };

  const sendTextMessage = async (
    rawText: string,
    attachedItems?: AttachmentItem[],
    mediaModeOverride?: "image" | "video",
    extraOptions?: { taskBreakdownMode?: boolean }
  ) => {
    const userText = rawText.trim();
    const effectiveAttachments = attachedItems || [];
    if (
      (!userText && effectiveAttachments.length === 0) ||
      isLoading ||
      isGenerating ||
      isSubmittingRef.current
    ) {
      return;
    }

    if (!authUser) {
      const currentCount = getGuestMessageCount();
      if (currentCount >= GUEST_MAX_MESSAGES) {
        setIsGuestLimitModalOpen(true);
        return;
      }
      const nextCount = incrementGuestMessageCount();
      setGuestMessageCount(nextCount);
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    setIsSendPressed(true);
    setTimeout(() => setIsSendPressed(false), 160);

    if (isRecording) {
      cancelVoiceRecording();
    }

    if (currentChatKey) {
      safeRemoveChatDraft(currentChatKey);
    }
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "40px";
      textareaRef.current.style.overflowY = "hidden";
    }

    setIsChatAreaLoading(false);
    setHasMessages(true);
    scrollToBottom(true);

    const nowIso = new Date().toISOString();
    const tempUserMsgId = `user-${Date.now()}`;
    const newUserMsg: Message = {
      id: tempUserMsgId,
      sender: "user",
      content: userText || "(Lampiran)",
      created_at: nowIso,
      attachments: effectiveAttachments.length > 0 ? effectiveAttachments : undefined,
    };

    let targetChatId = activeChatId;
    let sessionPayloadId = currentSessionChatId;

    if (!sessionPayloadId) {
      sessionPayloadId = generateId(true);
      setCurrentSessionChatId(sessionPayloadId);
    }

    const attachmentSummary =
      effectiveAttachments.length > 0
        ? effectiveAttachments[0].original_name
        : "Analisis Berkas";
    const baseTitle = userText || attachmentSummary;
    const initialTitle = baseTitle.length > 40 ? `${baseTitle.slice(0, 40)}…` : baseTitle;

    if (activeChatId === "new-chat") {
      targetChatId = sessionPayloadId;
      const newChat: ChatSession = {
        id: targetChatId,
        title: initialTitle,
        dateCategory: "TODAY",
        messages: [newUserMsg],
      };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(targetChatId);
      syncBrowserUrl(targetChatId, "push");

      // Item 9: Immediately prepend new chat item into sidebar with temporary title
      setClientNow(new Date());
      setChatHistory((prev) => [
        {
          id: targetChatId,
          title: initialTitle,
          created_at: nowIso,
          last_activity_at: nowIso,
        },
        ...prev.filter((c) => c.id !== targetChatId),
      ]);
    } else if (!chats.some((chat) => chat.id === activeChatId)) {
      const historyChat = chatHistory.find((chat) => chat.id === activeChatId);
      const restoredChat: ChatSession = {
        id: activeChatId,
        title: historyChat?.title || initialTitle,
        dateCategory: "TODAY",
        messages: [newUserMsg],
      };
      setChats((prev) => [restoredChat, ...prev]);
      syncBrowserUrl(activeChatId, "replace");
    } else {
      appendMessageToChat(activeChatId, newUserMsg);
    }

    const hasAttachment = effectiveAttachments.length > 0;
    const detectedIntent = detectMediaIntent(userText, hasAttachment);
    const mediaModeToSend =
      mediaModeOverride ||
      (activeMediaModeRef.current ? activeMediaModeRef.current : detectedIntent.type);

    setActiveLoadingContext(
      mediaModeToSend === "image"
        ? "image"
        : mediaModeToSend === "video"
          ? "video"
          : "chat"
    );
    setChatLoading(targetChatId, true);
    await requestAiReply(targetChatId, sessionPayloadId, userText, {
      tempUserMsgId,
      attachmentIds: effectiveAttachments.map((a) => a.id),
      mediaMode: mediaModeToSend || undefined,
      taskBreakdownMode: extraOptions?.taskBreakdownMode,
    });
  };

  const handleSendMessage = async (
    textOverride?: string,
    sendOptions?: { taskBreakdownMode?: boolean }
  ) => {
    // Prevent duplicate sending: block if request is running (#3)
    if (isLoading || isGenerating || isSubmittingRef.current) {
      return;
    }

    const hasUploading = pendingAttachments.some(
      (a) => a.status === "uploading" || a.status === "compressing"
    );
    if (hasUploading) {
      showToastNotice("Sedang memproses lampiran, mohon tunggu sebentar...");
      return;
    }

    // Read latest uncommitted text directly from DOM element or use explicit textOverride
    const rawInput =
      typeof textOverride === "string"
        ? textOverride
        : textareaRef.current
        ? textareaRef.current.value
        : inputText;

    // Stage 8 & 9: Intercept Multimodal Vision Photo or Smart PDF before standard chat flow
    if (pendingPdfDoc) {
      await handleSendPdfDocument(rawInput);
      return;
    }
    if (pendingVisionPhoto) {
      await handleSendVisionPhoto(rawInput);
      return;
    }

    if (!rawInput.trim() && pendingAttachments.length === 0) {
      return;
    }

    // Stage 7: Intercept `/lens <topic>` to render Axioma Lens 2-sided card
    const lensMatch = rawInput.trim().match(/^\/lens\s+(.+)$/i);
    if (lensMatch && lensMatch[1].trim()) {
      await handleRunAxiomaLens(lensMatch[1].trim());
      return;
    }

    const readyServerAttachments = pendingAttachments
      .filter((a) => a.status === "ready" && a.serverAttachment)
      .map((a) => a.serverAttachment!);

    const currentMediaMode = activeMediaModeRef.current || activeMediaMode;
    const effectiveTaskBreakdownOpt = Boolean(
      sendOptions?.taskBreakdownMode || pendingTaskBreakdown
    );
    if (pendingTaskBreakdown) {
      setPendingTaskBreakdown(false);
    }
    setEnhancedPromptPreview(null);
    setActiveMediaMode(null);
    activeMediaModeRef.current = null;
    setPendingAttachments([]);
    await sendTextMessage(
      rawInput,
      readyServerAttachments,
      currentMediaMode || undefined,
      {
        ...sendOptions,
        taskBreakdownMode: effectiveTaskBreakdownOpt || undefined,
      }
    );
  };

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Ignore IME composition events (Gboard, Samsung keyboard, etc.)
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return;
    }

    // 1b. Slash Commands keyboard navigation & Enter selection
    if (matchingSlashCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashMenuIndex((prev) => (prev + 1) % matchingSlashCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashMenuIndex(
          (prev) => (prev - 1 + matchingSlashCommands.length) % matchingSlashCommands.length
        );
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setInputText("");
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const chosen = matchingSlashCommands[slashMenuIndex] || matchingSlashCommands[0];
        if (chosen) {
          handleApplySlashCommand(chosen.cmd);
        }
        return;
      }
    }

    // 2. Enter sends (Shift+Enter inserts newline), works on desktop and mobile virtual keyboard
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isOnline) return;
      if (isLoading || isGenerating || isSubmittingRef.current) return;
      void handleSendMessage();
      textareaRef.current?.blur();
    }
  };

  const handleCopy = (text: string, id: string, durationMs = 1500) => {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        navigator.clipboard.writeText(text).catch(() => {
          fallbackCopyText(text);
        });
      } else {
        fallbackCopyText(text);
      }
    } catch {
      fallbackCopyText(text);
    }
    setCopiedId(id);
    setCopied(true);
    if (copiedTimerRef.current) {
      clearTimeout(copiedTimerRef.current);
    }
    copiedTimerRef.current = setTimeout(() => {
      setCopiedId(null);
      setCopied(false);
      copiedTimerRef.current = null;
    }, durationMs);
  };

  // Feedback 👍 / 👎 toggle + optional comment for 👎 (server-backed with real UUIDs) (#4)
  const handleFeedback = async (messageId: string, type: "up" | "down") => {
    const existing = feedback[messageId]?.rating;
    const chatId = activeChatId === "new-chat" ? currentSessionChatId : activeChatId;

    // Clicking the same rating again cancels/deletes the feedback
    if (existing === type) {
      setFeedback((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
      if (openFeedbackCommentId === messageId) {
        setOpenFeedbackCommentId(null);
      }

      if (!VALID_UUID_REGEX.test(messageId)) return;

      try {
        const headers = await buildAuthHeaders();
        await fetch(`${BACKEND_URL}/api/messages/${encodeURIComponent(messageId)}/feedback`, {
          method: "DELETE",
          headers,
        });
      } catch (err) {
        console.error("Failed to delete feedback:", err);
      }
      return;
    }

    const existingComment =
      type === "down" ? feedback[messageId]?.comment || feedbackCommentDraft[messageId] : undefined;

    const newEntry: FeedbackItem = {
      rating: type,
      comment: existingComment,
    };

    setFeedback((prev) => ({ ...prev, [messageId]: newEntry }));

    if (type === "down") {
      setFeedbackCommentDraft((prev) => ({
        ...prev,
        [messageId]: prev[messageId] ?? feedback[messageId]?.comment ?? "",
      }));
      setOpenFeedbackCommentId(messageId);
    } else if (openFeedbackCommentId === messageId) {
      setOpenFeedbackCommentId(null);
    }

    // Stage 6: Fire lightweight structured feedback on thumbs up
    if (type === "up") {
      void handleSendStructuredFeedback(messageId, "up");
    }

    if (!VALID_UUID_REGEX.test(messageId)) return;

    try {
      const headers = await buildAuthHeaders();
      await fetch(`${BACKEND_URL}/api/messages/${encodeURIComponent(messageId)}/feedback`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          chat_id: chatId,
          rating: type,
          comment: existingComment,
          user_id: currentUserId || undefined,
        }),
      });
    } catch (err) {
      console.error("Failed to save feedback:", err);
    }
  };

  const handleSubmitFeedbackComment = async (messageId: string) => {
    const commentText = (feedbackCommentDraft[messageId] || "").trim();
    if (commentText.length > 1000) {
      showToastNotice("Komentar masukan maksimal 1.000 karakter.");
      return;
    }
    const chatId = activeChatId === "new-chat" ? currentSessionChatId : activeChatId;

    const updatedEntry: FeedbackItem = {
      rating: "down",
      comment: commentText || undefined,
    };

    setFeedback((prev) => ({ ...prev, [messageId]: updatedEntry }));
    setOpenFeedbackCommentId(null);
    setFeedbackSavedNoticeId(messageId);
    setTimeout(() => {
      setFeedbackSavedNoticeId((prev) => (prev === messageId ? null : prev));
    }, 2500);

    if (!VALID_UUID_REGEX.test(messageId)) return;

    try {
      const headers = await buildAuthHeaders();
      await fetch(`${BACKEND_URL}/api/messages/${encodeURIComponent(messageId)}/feedback`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          chat_id: chatId,
          rating: "down",
          comment: commentText || undefined,
          user_id: currentUserId || undefined,
        }),
      });
    } catch (err) {
      console.error("Failed to submit feedback comment:", err);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!isDraggingOver) setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (e.dataTransfer.files?.length) {
          void handleFilesSelected(e.dataTransfer.files);
        }
      }}
      id="axioma-app-shell"
      style={{ transform: "translate3d(0, var(--app-offset-top), 0)" }}
      className="fixed inset-0 h-[var(--app-height,100dvh)] min-h-[100dvh] w-full max-w-none m-0 p-0 border-0 rounded-none flex flex-col justify-between md:flex-row bg-[#f9f9f8] dark:bg-[#0e0e10] text-text-secondary font-sans antialiased overflow-hidden overflow-x-hidden selection:bg-border-strong selection:text-text-primary select-none !transition-none"
    >
      {/* Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="fixed top-0 left-0 right-0 h-[var(--app-height)] z-50 bg-bg-primary/90 border-2 border-dashed border-border-strong flex flex-col items-center justify-center p-6 pointer-events-none animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-border-subtle flex items-center justify-center mb-3 shadow-xl">
            <UploadCloud className="w-8 h-8 text-text-primary animate-bounce" />
          </div>
          <h3 className="text-base font-semibold text-text-primary">Lepaskan berkas di sini</h3>
          <p className="text-xs text-text-muted mt-1">
            Maksimal {MAX_FILES_PER_MESSAGE} berkas per pesan (foto atau dokumen PDF hingga 10 MB per berkas)
          </p>
        </div>
      )}

      {/* Lightbox Modal for Images (Smooth Enter & Exit Animations) */}
      {shouldRenderLightbox && displayLightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau ${displayLightbox.name}`}
          className={`fixed top-0 left-0 right-0 h-[var(--app-height)] z-50 bg-black/85 flex items-center justify-center p-4 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isLightboxEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setLightboxImage(null)}
        >
          <div
            className={`relative max-w-[95vw] max-h-[92vh] flex flex-col items-center transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
              isLightboxEntered ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-12 left-0 right-0 flex items-center justify-between text-white text-xs px-2">
              <span className="truncate max-w-[70vw] font-medium">{displayLightbox.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (displayLightbox.url.startsWith("data:")) {
                        const link = document.createElement("a");
                        link.href = displayLightbox.url;
                        link.download = `${displayLightbox.name || "axioma-ai-image"}.jpg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } else {
                        const response = await fetch(displayLightbox.url, { mode: "cors" });
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = blobUrl;
                        link.download = `${displayLightbox.name || "axioma-ai-image"}.jpg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
                      }
                    } catch {
                      window.open(displayLightbox.url, "_blank");
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white text-zinc-900 text-xs font-medium hover:bg-white/90 active:scale-[0.96] transition-all duration-200 ease-out shadow cursor-pointer"
                  title="Unduh resolusi tinggi"
                  aria-label="Unduh gambar HD"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-900" />
                  <span>Unduh HD</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-[0.96] transition-all duration-200 ease-out text-white cursor-pointer"
                  title="Tutup (Esc)"
                  aria-label="Tutup pratinjau"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img
              src={displayLightbox.url}
              alt={displayLightbox.name}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
      {/* Floating Undo Toast for Single Chat Deletion (Item 4) */}
      {undoToastChat && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-bg-elevated border border-border-strong text-text-primary shadow-2xl animate-user-bubble text-xs"
        >
          <span className="font-medium">Percakapan dihapus</span>
          <span className="text-text-muted select-none">·</span>
          <button
            type="button"
            onClick={handleUndoDeleteChat}
            className="font-semibold text-text-primary underline underline-offset-4 hover:opacity-80 active:scale-95 transition-all cursor-pointer py-0.5 px-1 rounded hover:bg-bg-surface"
          >
            Urungkan
          </button>
          <button
            type="button"
            onClick={() => {
              const pending = pendingDeleteRef.current;
              if (pending && !pending.isCancelled) {
                clearTimeout(pending.timerId);
                pending.isCancelled = true;
                pendingDeleteRef.current = null;
                setUndoToastChat(null);
                void commitDeleteChatServer(pending.chat.id);
              }
            }}
            aria-label="Tutup notifikasi"
            className="text-icon-muted hover:text-text-primary ml-1 cursor-pointer p-1 rounded-lg hover:bg-bg-surface"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}

      {/* Clear All Chats Confirmation Dialog (Full-Screen on Mobile < md, Centered Card on Desktop >= md) */}
      {shouldRenderClearAllConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-all-dialog-title"
          aria-describedby="clear-all-dialog-desc"
          className={`fixed inset-0 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 p-0 md:p-4 z-50 flex items-stretch md:items-center justify-center bg-[#f9f9f8] dark:bg-[#0e0e10] md:bg-black/70 md:dark:bg-black/70 touch-none font-sans transition-opacity duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isClearAllConfirmEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isClearingAllChats) {
              setIsClearAllConfirmOpen(false);
            }
          }}
        >
          <div
            className={`fixed inset-0 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 rounded-none border-0 bg-[#f9f9f8] dark:bg-[#0e0e10] pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] px-4 flex flex-col justify-between md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[90vw] md:max-w-[440px] md:h-auto md:max-h-[85dvh] md:rounded-[28px] md:bg-bg-elevated md:dark:bg-[#111114] md:border md:border-border-subtle md:dark:border-white/[0.08] md:p-6 md:shadow-2xl md:block md:space-y-4 overflow-y-auto overscroll-y-contain overscroll-contain touch-auto transition-all duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
              isClearAllConfirmEntered ? "translate-y-0 opacity-100 md:scale-100" : "translate-y-4 opacity-0 md:translate-y-0 md:scale-95"
            }`}
          >
            <div className="flex items-start gap-3 pt-4 md:pt-0">
              <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-red-600 dark:bg-red-950/50 dark:border-red-800/50 dark:text-red-400 flex items-center justify-center shrink-0">
                <TriangleAlert className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <h2
                  id="clear-all-dialog-title"
                  className="text-base md:text-sm font-semibold text-text-primary"
                >
                  Hapus semua percakapan?
                </h2>
                <p
                  id="clear-all-dialog-desc"
                  className="text-sm md:text-xs text-text-secondary leading-relaxed"
                >
                  Seluruh riwayat percakapan dan pesan Anda akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-end gap-2 pt-3 border-t border-border-subtle">
              <button
                ref={clearAllCancelButtonRef}
                type="button"
                disabled={isClearingAllChats}
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="w-full md:w-auto min-h-[44px] md:min-h-[40px] px-4 py-2 rounded-xl text-sm md:text-xs font-medium text-text-secondary bg-bg-surface hover:bg-bg-subtle hover:text-text-primary border border-border-subtle transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isClearingAllChats}
                onClick={confirmClearAllChats}
                className="w-full md:w-auto min-h-[44px] md:min-h-[40px] px-4 py-2 rounded-xl text-sm md:text-xs font-medium text-red-100 bg-red-600 hover:bg-red-500 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isClearingAllChats ? "Menghapus..." : "Hapus Semua"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal via Portal to document.body (Mobile < md: Full-Screen Solid inset-0 with transform: none when open | Desktop md+: Floating Popover / Centered Card) */}
      {shouldRenderSettings &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            className={`fixed inset-0 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 p-0 z-50 flex items-stretch justify-center overflow-hidden font-sans ${
              isSettingsEntered
                ? "max-md:bg-[#f9f9f8] max-md:dark:bg-[#0e0e10] pointer-events-auto"
                : "max-md:bg-transparent pointer-events-none"
            }`}
          >
            {/* Sibling backdrop (Desktop only: ZERO dark backdrop on mobile so Safari iOS never samples black at top/bottom safe areas) */}
            <div
              aria-hidden="true"
              onClick={() => setIsSettingsModalOpen(false)}
              className={`hidden md:block absolute inset-0 transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                settingsView === "main" ? "md:bg-transparent" : "md:bg-black/60"
              } ${isSettingsEntered ? "opacity-100" : "opacity-0"}`}
            />
            <div
              style={settingsView === "main" ? settingsPopoverStyle : undefined}
              className={`fixed z-50 flex flex-col overflow-hidden ${
                settingsView === "main"
                  ? `inset-0 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 rounded-none border-0 max-md:bg-[#f9f9f8] max-md:dark:bg-[#0e0e10] md-ios-glass md:inset-auto md:bottom-16 md:left-4 md:w-[290px] md:h-auto md:max-h-[80dvh] md:overflow-y-auto md:rounded-2xl md:p-2 md:origin-bottom-left transition-opacity duration-200 md:transition-[transform,opacity] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isSettingsEntered
                        ? "opacity-100 md:scale-100"
                        : "max-md:translate-y-4 opacity-0 md:scale-95 pointer-events-none"
                    }`
                  : `inset-0 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 rounded-none border-0 bg-[#f9f9f8] md:bg-white dark:bg-[#0e0e10] dark:md:bg-[#161618] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:w-[calc(100vw-3rem)] md:max-w-[540px] md:h-auto md:max-h-[80dvh] md:overflow-y-auto md:rounded-2xl md:border md:border-zinc-200/80 dark:md:border-white/[0.08] md:shadow-2xl transition-opacity duration-200 md:transition-[transform,opacity] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isSettingsEntered
                        ? "md:-translate-y-1/2 opacity-100 md:scale-100"
                        : "max-md:translate-y-4 md:-translate-y-[calc(50%-16px)] opacity-0 md:scale-95 pointer-events-none"
                    }`
              }`}
            >
            {settingsView === "about" ? (
              <AboutSettingsView
                onBack={() => setSettingsView("main")}
                onClose={() => setIsSettingsModalOpen(false)}
              />
            ) : settingsView === "feedback" ? (
              <FeedbackSettingsView
                defaultEmail={authUser?.email || ""}
                userName={userName}
                onBack={() => setSettingsView("main")}
                onClose={() => setIsSettingsModalOpen(false)}
              />
            ) : (
              <>
                {/* Sticky Top Navigation Bar (Mobile only; hidden on Desktop Popover) */}
                <div className="md:hidden sticky top-0 z-30 shrink-0 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3 px-4 bg-[#f9f9f8] dark:bg-[#0e0e10] border-b border-zinc-200/80 dark:border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h1 id="settings-modal-title" className="font-heading text-[18px] font-semibold tracking-[-0.015em] text-zinc-900 dark:text-zinc-100">
                      Setelan
                    </h1>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400">
                      Beta
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(false)}
                    aria-label="Tutup setelan"
                    className="w-9 h-9 rounded-full bg-zinc-200/80 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:hover:text-white active:scale-[0.96] transition-all duration-200 ease-out flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Body Area (Full-bleed edge-to-edge on Mobile < md, Popover list on Desktop >= md) */}
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-auto [-webkit-overflow-scrolling:touch] px-0 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-5 md:p-0 md:space-y-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
                  {/* Grup 1: Akun */}
                  <div className="w-full">
                    <div className="w-full text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400 px-4 pt-2 pb-1.5 md:font-medium md:normal-case md:tracking-normal md:px-3 md:pt-2 md:pb-1">
                      Akun
                    </div>
                    <div className="w-full h-auto bg-white/80 dark:bg-transparent border-y border-zinc-200/70 dark:border-white/[0.06] rounded-none divide-y divide-zinc-200/70 dark:divide-white/[0.06] md:bg-transparent md:dark:bg-transparent md:border-0 md:rounded-none md:divide-y-0 md:space-y-0.5">
                      {/* Kelola Akun */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth >= 768) {
                            openDesktopSettingsPage("account");
                          } else {
                            setExpandedSettingsSection((prev) => (prev === "account" ? null : "account"));
                          }
                        }}
                        className="w-full flex items-center justify-between px-4 py-4 min-h-[54px] text-left transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.04] rounded-none cursor-pointer md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:duration-150"
                      >
                        <div className="flex items-center min-w-0">
                          <User className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0" strokeWidth={1.75} />
                          <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">Kelola Akun</span>
                        </div>
                        <ChevronRight
                          className={`w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 shrink-0 transition-transform ${
                            expandedSettingsSection === "account" ? "rotate-90" : ""
                          }`}
                        />
                      </button>

                      {/* Expandable Kelola Akun drawer */}
                      {expandedSettingsSection === "account" && (
                        <div className="w-full px-4 py-4 bg-zinc-100/60 dark:bg-white/[0.025] md:px-3 md:py-2.5 md:rounded-xl md:my-1 md:bg-zinc-100/70 md:dark:bg-white/[0.04] space-y-3">
                          <div>
                            <label htmlFor="settings-display-name" className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1.5">
                              Nama Tampilan
                            </label>
                            <div className="flex gap-2">
                              <input
                                ref={settingsNameInputRef}
                                id="settings-display-name"
                                type="text"
                                maxLength={60}
                                value={settingsNameInput}
                                aria-invalid={Boolean(settingsNameError)}
                                onChange={(e) => {
                                  setSettingsNameInput(e.target.value);
                                  if (settingsNameError) setSettingsNameError(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleUpdateDisplayName(settingsNameInput);
                                  }
                                }}
                                onBlur={() => {
                                  handleUpdateDisplayName(settingsNameInput);
                                }}
                                placeholder="Masukkan nama tampilan..."
                                className="flex-1 min-w-0 bg-white dark:bg-[#141416] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/20 rounded-xl px-3.5 py-2.5 md:px-2.5 md:py-1.5 text-base md:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateDisplayName(settingsNameInput)}
                                className="shrink-0 rounded-xl px-4 py-2.5 md:px-3 md:py-1.5 text-[14px] md:text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors cursor-pointer active:scale-95"
                              >
                                Simpan
                              </button>
                            </div>
                            {settingsNameError && (
                              <p role="alert" className="text-[11px] text-red-500 dark:text-red-400 mt-1">
                                {settingsNameError}
                              </p>
                            )}
                          </div>
                          {authUser && (
                            <div className="pt-2 border-t border-zinc-200/70 dark:border-white/[0.06] space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                                  Paket Langganan
                                </span>
                                {isProPlan ? (
                                  <span className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full">
                                    Axioma Pro · Aktif
                                  </span>
                                ) : (
                                  <span className="border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-[10px] font-medium uppercase px-1.5 py-0.5 rounded">
                                    FREE
                                  </span>
                                )}
                              </div>
                              <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed tabular-nums">
                                {isProPlan
                                  ? "Akses penuh tanpa batas kredit harian untuk seluruh model."
                                  : `Paket Gratis (Free) · ${remainingCreditsCount} kredit tersisa · Reset pukul 00.00 WIB`}
                              </p>
                              <button
                                type="button"
                                onClick={openSubscriptionModal}
                                className={`w-full h-9 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                                  isProPlan
                                    ? "border border-zinc-300 dark:border-white/15 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
                                    : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                }`}
                              >
                                {isProPlan ? "Kelola Paket" : "Upgrade ke Pro — Segera Hadir"}
                              </button>
                            </div>
                          )}
                          {authUser && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 break-words">
                              Email terhubung: <span className="font-medium text-zinc-800 dark:text-zinc-200 break-all">{authUser.email}</span>
                            </div>
                          )}

                          {/* Stage 6: Tentang Saya (Profil Singkat) */}
                          <div className="pt-2 border-t border-zinc-200/70 dark:border-white/[0.06] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label
                                htmlFor="settings-user-profile"
                                className="block text-xs font-medium text-zinc-600 dark:text-zinc-300"
                              >
                                Tentang Saya (Profil Singkat)
                              </label>
                              <span className="text-[10px] text-zinc-400">
                                {userProfile.length}/500
                              </span>
                            </div>
                            <textarea
                              id="settings-user-profile"
                              rows={3}
                              maxLength={500}
                              value={userProfile}
                              onChange={(e) => handleUpdateUserProfile(e.target.value)}
                              placeholder="Contoh: Mahasiswa TI, suka penjelasan to-the-point pakai analogi sederhana..."
                              className="w-full bg-white dark:bg-[#141416] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/20 rounded-xl px-3 py-2 text-base md:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none resize-none transition-colors"
                            />
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              Tersimpan lokal &amp; dapat dinonaktifkan kapan saja di Kontrol Konteks.
                            </p>
                          </div>

                          {/* Stage 10A: Kunci Syarat Proyek (Requirement Lock) */}
                          <div className="pt-2.5 border-t border-zinc-200/70 dark:border-white/[0.06] space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200">
                                <Lock className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
                                <span>Kunci Syarat Proyek ({requirementLockItems.length}/5)</span>
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isRequirementLockEnabled}
                                aria-label="Aktifkan kunci syarat proyek"
                                onClick={() =>
                                  handleUpdateRequirementLockEnabled(!isRequirementLockEnabled)
                                }
                                className="cursor-pointer"
                              >
                                <span
                                  aria-hidden="true"
                                  className={`inline-flex items-center w-8 h-[18px] rounded-full p-0.5 transition-colors ${
                                    isRequirementLockEnabled
                                      ? "bg-zinc-950 dark:bg-white justify-end"
                                      : "bg-zinc-300 dark:bg-zinc-700 justify-start"
                                  }`}
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded-full ${
                                      isRequirementLockEnabled
                                        ? "bg-white dark:bg-zinc-950"
                                        : "bg-white dark:bg-zinc-300"
                                    }`}
                                  />
                                </span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                maxLength={200}
                                value={settingsReqDraft}
                                disabled={requirementLockItems.length >= 5}
                                onChange={(e) => setSettingsReqDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddRequirementLockItem();
                                  }
                                }}
                                placeholder={
                                  requirementLockItems.length >= 5
                                    ? "Maksimal 5 syarat terkunci"
                                    : "Tambah syarat wajib proyek..."
                                }
                                className="flex-1 min-w-0 bg-white dark:bg-[#141416] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/20 rounded-xl px-3 py-1.5 text-base md:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none disabled:opacity-45"
                              />
                              <button
                                type="button"
                                disabled={!settingsReqDraft.trim() || requirementLockItems.length >= 5}
                                onClick={handleAddRequirementLockItem}
                                aria-label="Tambah syarat proyek"
                                className="w-8 h-8 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 inline-flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <Plus className="w-4 h-4" strokeWidth={1.75} />
                              </button>
                            </div>

                            {requirementLockItems.length > 0 && (
                              <ul className="space-y-1.5">
                                {requirementLockItems.map((rule, idx) => (
                                  <li
                                    key={`${rule}-${idx}`}
                                    className="flex items-start justify-between gap-2 rounded-xl border border-zinc-200/80 dark:border-white/[0.06] bg-white dark:bg-[#141416] px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
                                  >
                                    <span className="leading-snug break-words min-w-0 flex-1">
                                      {idx + 1}. {rule}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateRequirementLockItems(
                                          requirementLockItems.filter((_, i) => i !== idx)
                                        )
                                      }
                                      aria-label="Hapus syarat"
                                      className="p-0.5 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 cursor-pointer shrink-0"
                                    >
                                      <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}

                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              Syarat wajib ini otomatis dipatuhi di setiap jawaban saat aktif.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Paket & Langganan (Segera Hadir — dinonaktifkan) */}
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="w-full flex items-center justify-between gap-3 px-4 py-4 min-h-[54px] text-left font-sans rounded-none opacity-65 cursor-not-allowed select-none md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200"
                      >
                        <div className="flex items-center min-w-0">
                          <CreditCard className="w-5 h-5 text-zinc-500 dark:text-zinc-400 mr-4 md:w-4 md:h-4 md:mr-3 shrink-0" strokeWidth={1.5} />
                          <span className="text-[15px] font-medium leading-snug text-zinc-700 dark:text-zinc-300 md:text-[13.5px] md:font-normal truncate">Paket &amp; Langganan</span>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-zinc-300/90 dark:border-white/[0.12] bg-zinc-100/90 dark:bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap shrink-0">
                          Segera Hadir
                        </span>
                      </button>

                      {/* Batas penggunaan (sisa kredit real-time dari state kuota / GET /api/quota) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth >= 768) {
                            openDesktopSettingsPage("quota");
                          } else {
                            setExpandedSettingsSection((prev) => (prev === "quota" ? null : "quota"));
                          }
                        }}
                        className="w-full flex items-center justify-between gap-3 px-4 py-4 min-h-[54px] text-left font-sans rounded-none transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.04] cursor-pointer md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:duration-150"
                      >
                        <div className="flex items-center min-w-0">
                          <Clock className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0" strokeWidth={1.5} />
                          <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">Batas penggunaan</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[12.5px] md:text-xs text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                            {authUser
                              ? isProPlan
                                ? "PRO"
                                : `${remainingCreditsCount} kredit`
                              : `${Math.max(0, GUEST_MAX_MESSAGES - guestMessageCount)}/${GUEST_MAX_MESSAGES}`}
                          </span>
                          <ChevronRight
                            className={`w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 shrink-0 transition-transform ${
                              expandedSettingsSection === "quota" ? "rotate-90" : ""
                            }`}
                            strokeWidth={1.5}
                          />
                        </div>
                      </button>

                      {/* Expandable Batas penggunaan Body (Mobile full-bleed edge-to-edge) */}
                      {expandedSettingsSection === "quota" && (
                        <div className="w-full px-4 py-4 bg-zinc-100/60 dark:bg-white/[0.025] md:px-3 md:py-3 md:rounded-xl md:my-1 md:bg-zinc-100/70 md:dark:bg-white/[0.04] font-sans">
                          {authUser ? (
                            <div className="w-full space-y-3.5 md:rounded-xl md:border md:border-zinc-200/85 md:dark:border-white/[0.08] md:bg-white md:dark:bg-[#141416] md:p-4">
                              {/* Status Paket */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                  Status Paket
                                </span>
                                {isProPlan ? (
                                  <span className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10.5px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full">
                                    PRO
                                  </span>
                                ) : (
                                  <span className="border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10.5px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full">
                                    FREE
                                  </span>
                                )}
                              </div>

                              {/* Sisa Kredit Utama */}
                              <div className="space-y-1">
                                <div className="text-[18px] font-semibold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                                  {isProPlan
                                    ? "Tanpa batas harian"
                                    : `${dailyCreditsRemaining} / ${dailyCreditLimit} kredit tersisa hari ini`}
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed tabular-nums">
                                  {isProPlan
                                    ? "Akses penuh tanpa batas kredit harian untuk seluruh model Axioma."
                                    : `Sisa kredit hari ini: ${dailyCreditsRemaining} dari ${dailyCreditLimit} kredit`}
                                </p>
                              </div>

                              {/* Progress Bar Visual */}
                              <div className="space-y-1.5">
                                <div className="w-full h-2 rounded-full bg-zinc-200/90 dark:bg-white/[0.08] overflow-hidden">
                                  <div
                                    style={{ width: `${dailyCreditsPercent}%` }}
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      !isProPlan && dailyCreditsPercent <= 20
                                        ? "bg-red-500/85 dark:bg-red-400/85"
                                        : !isProPlan && dailyCreditsPercent <= 40
                                          ? "bg-amber-500/85 dark:bg-amber-400/85"
                                          : "bg-zinc-900 dark:bg-zinc-100"
                                    }`}
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                                  <span>{dailyCreditsPercent}% tersisa</span>
                                  <span>Omni 1 · Pro 3 · Architect 4 · Media 5</span>
                                </div>
                              </div>

                              {/* Kredit Tambahan / Bonus (jika > 0) */}
                              {bonusCreditsCount > 0 && (
                                <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] px-3 py-2 text-xs">
                                  <div className="min-w-0">
                                    <div className="font-medium text-zinc-800 dark:text-zinc-200">
                                      Kredit Tambahan / Bonus
                                    </div>
                                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                      Saldo permanen, masa aktif selamanya
                                    </div>
                                  </div>
                                  <span className="font-semibold text-zinc-950 dark:text-white tabular-nums shrink-0">
                                    +{bonusCreditsCount} kredit
                                  </span>
                                </div>
                              )}

                              {/* Info Reset Harian */}
                              <div className="flex items-start gap-1.5 text-[11.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed pt-1 border-t border-zinc-200/70 dark:border-white/[0.06]">
                                <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.5} />
                                <span>Kuota harian direset otomatis setiap hari pukul 00.00 WIB.</span>
                              </div>

                              {/* Aksi Lanjutan */}
                              <button
                                type="button"
                                onClick={openSubscriptionModal}
                                className="w-full h-9 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] cursor-pointer"
                              >
                                <span>{isProPlan ? "Lihat Rincian Paket" : "Upgrade ke Pro — Segera Hadir"}</span>
                                <ChevronRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                              </button>
                            </div>
                          ) : (
                            <div className="w-full space-y-3 md:rounded-xl md:border md:border-zinc-200/85 md:dark:border-white/[0.08] md:bg-white md:dark:bg-[#141416] md:p-4">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                  Status Paket
                                </span>
                                <span className="border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10.5px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full">
                                  TAMU
                                </span>
                              </div>
                              <div className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                                {Math.max(0, GUEST_MAX_MESSAGES - guestMessageCount)} / {GUEST_MAX_MESSAGES} pesan tersisa
                              </div>
                              <div className="w-full h-2 rounded-full bg-zinc-200/90 dark:bg-white/[0.08] overflow-hidden">
                                <div
                                  style={{
                                    width: `${Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        Math.round(
                                          ((GUEST_MAX_MESSAGES - guestMessageCount) /
                                            GUEST_MAX_MESSAGES) *
                                            100
                                        )
                                      )
                                    )}%`,
                                  }}
                                  className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
                                />
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                Masuk ke akun untuk mendapatkan 30 kredit gratis setiap hari yang direset otomatis pukul 00.00 WIB.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSettingsModalOpen(false);
                                  setIsAuthModalOpen(true);
                                }}
                                className="w-full h-9 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-medium transition-colors cursor-pointer"
                              >
                                Hubungkan Akun
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grup 2: Preferensi */}
                  <div className="w-full">
                    <div className="w-full text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400 px-4 pt-1 pb-1.5 md:font-medium md:normal-case md:tracking-normal md:px-3 md:pt-2.5 md:pb-1">
                      Preferensi
                    </div>
                    <div className="w-full h-auto bg-white/80 dark:bg-transparent border-y border-zinc-200/70 dark:border-white/[0.06] rounded-none divide-y divide-zinc-200/70 dark:divide-white/[0.06] md:bg-transparent md:dark:bg-transparent md:border-0 md:rounded-none md:divide-y-0 md:space-y-0.5">
                      {/* Notifikasi */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth >= 768) {
                            openDesktopSettingsPage("notifications");
                          }
                        }}
                        className="w-full px-4 py-4 min-h-[54px] rounded-none flex items-center justify-between text-left md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:transition-colors md:duration-150 md:cursor-pointer"
                      >
                        <div className="flex items-center min-w-0">
                          <Bell className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0" strokeWidth={1.75} />
                          <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">Notifikasi</span>
                        </div>
                        <ChevronRight className="w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 shrink-0" />
                      </button>

                      {/* Model Default */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth >= 768) {
                            openDesktopSettingsPage("agent");
                          } else {
                            setExpandedSettingsSection((prev) => (prev === "agent" ? null : "agent"));
                          }
                        }}
                        className="w-full px-4 py-4 min-h-[54px] rounded-none flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:duration-150"
                      >
                        <div className="flex items-center min-w-0">
                          <Cpu className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0" strokeWidth={1.75} />
                          <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">Model Default</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[13px] md:text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 whitespace-nowrap max-w-[140px] md:max-w-[90px] truncate">
                            {AVAILABLE_AGENTS.find((a) => a.id === defaultAgentId)?.name || "Axioma Pro"}
                          </span>
                          <ChevronRight
                            className={`w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 shrink-0 transition-transform ${
                              expandedSettingsSection === "agent" ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {/* Expandable Model Selector */}
                      {expandedSettingsSection === "agent" && (
                        <div className="w-full px-4 py-4 bg-zinc-100/60 dark:bg-white/[0.025] md:px-2 md:py-2 md:rounded-xl md:my-1 md:bg-zinc-100/70 md:dark:bg-white/[0.04] space-y-2">
                          {AVAILABLE_AGENTS.map((agent) => {
                            const isChecked = defaultAgentId === agent.id;
                            return (
                              <label
                                key={agent.id}
                                className={`flex items-center justify-between p-3 md:p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                                  isChecked
                                    ? "bg-white dark:bg-zinc-800/90 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white shadow-xs"
                                    : "bg-white/60 dark:bg-[#1e1f20]/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="radio"
                                    name="defaultAgent"
                                    value={agent.id}
                                    checked={isChecked}
                                    onChange={() => handleSelectDefaultAgent(agent.id)}
                                    className="w-4 h-4 accent-zinc-900 dark:accent-white cursor-pointer shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-semibold text-sm md:text-xs text-zinc-900 dark:text-zinc-100">{agent.name}</div>
                                    <div className="text-xs md:text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">{agent.description}</div>
                                  </div>
                                </div>
                                <span className="text-xs md:text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium border border-zinc-200 dark:border-zinc-700 ml-2 shrink-0">
                                  {agent.tag}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* Penyimpanan Riwayat */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth >= 768) {
                            openDesktopSettingsPage("storage");
                          }
                        }}
                        className="w-full px-4 py-4 min-h-[54px] rounded-none flex items-center justify-between gap-3 text-left md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:transition-colors md:duration-150 md:cursor-pointer"
                      >
                        <div className="flex items-center min-w-0">
                          <Database className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0" strokeWidth={1.75} />
                          <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">Penyimpanan Riwayat</span>
                        </div>
                        <span className="text-[13px] md:text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 whitespace-nowrap shrink-0 text-right">
                          {authUser ? "Cloud & Lokal" : "Hanya Lokal"}
                        </span>
                      </button>

                      {/* Pintasan Keyboard */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth >= 768) {
                            openDesktopSettingsPage("shortcuts");
                          } else {
                            setExpandedSettingsSection((prev) => (prev === "shortcuts" ? null : "shortcuts"));
                          }
                        }}
                        className="w-full px-4 py-4 min-h-[54px] rounded-none flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:duration-150"
                      >
                        <div className="flex items-center min-w-0">
                          <Keyboard className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0" strokeWidth={1.75} />
                          <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">Pintasan Keyboard</span>
                        </div>
                        <ChevronRight
                          className={`w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 shrink-0 transition-transform ${
                            expandedSettingsSection === "shortcuts" ? "rotate-90" : ""
                          }`}
                        />
                      </button>

                      {/* Expandable Keyboard Shortcuts */}
                      {expandedSettingsSection === "shortcuts" && (
                        <div className="w-full px-4 py-4 bg-zinc-100/60 dark:bg-white/[0.025] md:px-3 md:py-2.5 md:rounded-xl md:my-1 md:bg-zinc-100/70 md:dark:bg-white/[0.04] space-y-2 text-xs">
                          <div className="flex items-center justify-between py-1 border-b border-zinc-200/70 dark:border-zinc-800/60">
                            <span className="text-zinc-600 dark:text-zinc-400">Cari percakapan</span>
                            <kbd className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                              {isMacOs ? "⌘ K" : "Ctrl+K"}
                            </kbd>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b border-zinc-200/70 dark:border-zinc-800/60">
                            <span className="text-zinc-600 dark:text-zinc-400">Percakapan baru</span>
                            <kbd className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                              {isMacOs ? "⌘ ⇧ O" : "Ctrl+Shift+O"}
                            </kbd>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b border-zinc-200/70 dark:border-zinc-800/60">
                            <span className="text-zinc-600 dark:text-zinc-400">Hentikan balasan</span>
                            <kbd className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px] text-zinc-700 dark:text-zinc-300">
                              Esc
                            </kbd>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-zinc-600 dark:text-zinc-400">Kirim pesan</span>
                            <kbd className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px] text-zinc-700 dark:text-zinc-300">
                              Enter
                            </kbd>
                          </div>
                        </div>
                      )}

                      {/* Tema (Mobile monochrome segmented buttons — avoids iOS native <select> UIMenu dimming | Desktop opens flat canvas page) */}
                      <div className="md:hidden w-full px-4 py-3.5 min-h-[54px] flex items-center justify-between gap-3 text-left rounded-none">
                        <div className="flex items-center min-w-0 shrink-0">
                          <Moon className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 shrink-0" strokeWidth={1.75} />
                          <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 truncate">Tema</span>
                        </div>
                        <div
                          role="radiogroup"
                          aria-label="Pilih tema tampilan"
                          className="inline-flex items-center p-0.5 rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/[0.08] shrink-0"
                        >
                          {(
                            [
                              { value: "light" as const, label: "Terang" },
                              { value: "dark" as const, label: "Gelap" },
                              { value: "system" as const, label: "Sistem" },
                            ] as const
                          ).map((opt) => {
                            const active = themeMode === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => handleSetTheme(opt.value)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                                  active
                                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDesktopSettingsPage("theme")}
                        className="hidden md:flex w-full px-3 py-2 rounded-xl text-[13.5px] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] items-center justify-between text-left transition-colors duration-150 cursor-pointer"
                      >
                        <div className="flex items-center min-w-0">
                          <Moon className="w-4 h-4 text-zinc-500 dark:text-zinc-400 mr-3 shrink-0" strokeWidth={1.75} />
                          <span className="text-[13.5px] font-normal text-zinc-800 dark:text-zinc-200 truncate">Tema</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {themeMode === "system" ? "Default sistem" : themeMode === "dark" ? "Gelap" : "Terang"}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Grup 3: Bantuan & Informasi */}
                  <div className="w-full">
                    <div className="w-full text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400 px-4 pt-1 pb-1.5 md:font-medium md:normal-case md:tracking-normal md:px-3 md:pt-2.5 md:pb-1">
                      Bantuan &amp; Informasi
                    </div>
                    <div className="w-full rounded-none bg-white/80 dark:bg-transparent border-y border-zinc-200/70 dark:border-white/[0.06] divide-y divide-zinc-200/70 dark:divide-white/[0.06] overflow-hidden md:bg-transparent md:dark:bg-transparent md:border-0 md:rounded-none md:divide-y-0 md:space-y-0.5">
                      {/* 1) Kirim Masukan */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth >= 768) {
                            openDesktopSettingsPage("feedback");
                          } else {
                            setSettingsView("feedback");
                          }
                        }}
                        className="w-full px-4 py-4 min-h-[54px] rounded-none flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:duration-150"
                      >
                        <div className="flex items-center min-w-0">
                          <MessageSquarePlus className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0" strokeWidth={1.75} />
                          <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">Kirim Masukan</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[13px] md:text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 whitespace-nowrap">Saran &amp; Bug</span>
                          <ChevronRight className="w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors shrink-0" />
                        </div>
                      </button>

                      {/* 2) Tentang Axioma */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth >= 768) {
                            openDesktopSettingsPage("about");
                          } else {
                            setSettingsView("about");
                          }
                        }}
                        className="w-full px-4 py-4 min-h-[54px] rounded-none flex items-center justify-between gap-3 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:text-zinc-800 md:dark:text-zinc-200 md:hover:bg-zinc-100 md:dark:hover:bg-white/[0.06] md:duration-150"
                      >
                        <div className="flex items-center min-w-0">
                          <Info className="w-5 h-5 text-zinc-600 dark:text-zinc-300 mr-4 md:w-4 md:h-4 md:text-zinc-500 md:dark:text-zinc-400 md:mr-3 shrink-0" strokeWidth={1.75} />
                          <span className="text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 md:text-[13.5px] md:font-normal md:text-zinc-800 md:dark:text-zinc-200 truncate">Tentang Axioma</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[13px] md:text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 whitespace-nowrap">v1.0 Beta</span>
                          <ChevronRight className="w-5 h-5 md:w-3.5 md:h-3.5 text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors shrink-0" />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Stage 10B: Apa yang Baru (v1.0 Beta) */}
                  <div className="w-full rounded-none md:rounded-xl bg-white/80 dark:bg-transparent md:bg-zinc-50/90 md:dark:bg-white/[0.03] border-y md:border border-zinc-200/70 dark:border-white/[0.06] px-4 py-4 md:p-3 space-y-2 md:mx-1 md:w-auto">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        Apa yang Baru (v1.0 Beta)
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400">
                        Beta
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-[11.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                        <span>
                          <strong className="font-medium text-zinc-900 dark:text-zinc-100">Bedah PDF:</strong> Ringkas dokumen, istilah kunci, &amp; prediksi pertanyaan kritis.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                        <span>
                          <strong className="font-medium text-zinc-900 dark:text-zinc-100">Axioma Lens:</strong> Analisis 2 sisi pro, kontra, dan celah pakai <code className="font-mono text-[10.5px]">/lens</code>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                        <span>
                          <strong className="font-medium text-zinc-900 dark:text-zinc-100">Roleplay + Rapor:</strong> Simulasi sidang, HRD, atau negosiasi dengan ekspor PDF.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                        <span>
                          <strong className="font-medium text-zinc-900 dark:text-zinc-100">Kontrol Konteks:</strong> Atur riwayat, profil, mode privat, dan kunci syarat proyek.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Grup 4: Hapus semua percakapan */}
                  <div className="w-full rounded-none bg-white/80 dark:bg-transparent border-y border-red-200/70 dark:border-red-500/15 hover:bg-red-50/70 dark:hover:bg-red-500/[0.06] transition overflow-hidden md:bg-transparent md:dark:bg-transparent md:border-0 md:border-t md:border-zinc-200/70 md:dark:border-white/[0.08] md:rounded-none md:mt-1 md:pt-1 md:hover:bg-transparent md:dark:hover:bg-transparent">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsModalOpen(false);
                        setIsClearAllConfirmOpen(true);
                      }}
                      className="w-full px-4 py-4 min-h-[54px] rounded-none flex items-center justify-between text-left cursor-pointer text-red-600 dark:text-red-400 group md:px-3 md:py-2 md:min-h-0 md:rounded-xl md:text-[13.5px] md:hover:bg-red-50 md:dark:hover:bg-red-500/10 md:transition-colors md:duration-150"
                    >
                      <div className="flex items-center min-w-0">
                        <Trash className="w-5 h-5 text-red-600 dark:text-red-400 mr-4 md:w-4 md:h-4 md:mr-3 shrink-0" strokeWidth={1.75} />
                        <span className="text-[15px] font-medium leading-snug text-red-600 dark:text-red-400 md:text-[13.5px] md:font-normal truncate">Hapus semua percakapan</span>
                      </div>
                      <ChevronRight className="w-5 h-5 md:w-3.5 md:h-3.5 text-red-400/70 group-hover:text-red-600 dark:text-red-400/50 dark:group-hover:text-red-400 transition-colors shrink-0" />
                    </button>
                  </div>

                  {/* Clean Version Footer (Mobile only) */}
                  <div className="md:hidden px-4 pt-2 pb-1 text-center text-xs text-zinc-500 space-y-1">
                    <div>Axioma v1.0 Beta</div>
                    <div className="text-[11px] leading-relaxed">
                      Riwayat percakapan tersimpan secara aman di peramban perangkat ini.
                    </div>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>,
          document.body
        )}

      {/* Shared Profile Sheet / Desktop Floating Popover (immediately unmounted when Settings opens so dark backdrop never lingers) */}
      {shouldRenderProfile && !isSettingsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className={`fixed top-0 left-0 right-0 h-[var(--app-height)] z-50 flex items-end justify-center p-0 overflow-hidden ${
            isProfileEntered ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {/* Sibling Dim Backdrop (keeps dialog wrapper free of opacity transition so Safari iOS renders -webkit-backdrop-filter) */}
          <div
            aria-hidden="true"
            onClick={() => setIsProfileDropdownOpen(false)}
            className={`absolute inset-0 bg-black/45 md:bg-transparent transition-opacity duration-300 md:duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isProfileEntered ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* Popup Container (Mobile: Bottom-sheet with swipe-down | Desktop md+: Frosted Floating Popover near trigger) */}
          <div
            ref={profileDropdownRef}
            style={
              profileSwipeDeltaY > 0
                ? { transform: `translate3d(0, ${profileSwipeDeltaY}px, 0)`, transition: "none" }
                : profilePopoverStyle
            }
            className={`ios-glass relative z-10 w-full h-auto max-h-[90%] rounded-t-[28px] border-x-0 border-b-0 px-5 pt-3 pb-[calc(var(--safe-bottom)+16px)] flex flex-col overflow-y-auto overscroll-contain touch-auto [-webkit-overflow-scrolling:touch] scrollbar-none transition-all duration-300 md:duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] md:fixed md:z-50 md:w-[310px] md:max-h-[82vh] md:rounded-2xl md:border md:p-3 ${
              profileAnchor === "sidebar"
                ? "md:inset-auto md:bottom-16 md:left-4 md:origin-bottom-left"
                : "md:inset-auto md:top-16 md:right-4 md:origin-top-right"
            } ${
              isProfileEntered
                ? "translate-y-0 opacity-100 md:scale-100"
                : "translate-y-full opacity-0 md:translate-y-0 md:scale-95 pointer-events-none"
            }`}
          >
            {/* Top Area: Mobile Drag handle & "Selesai" (hidden on Desktop Popover) */}
            <div className="shrink-0">
              <div
                onTouchStart={(e) => {
                  if (typeof window !== "undefined" && window.innerWidth >= 768) return;
                  profileSwipeStartYRef.current = e.touches[0]?.clientY ?? null;
                }}
                onTouchMove={(e) => {
                  if (profileSwipeStartYRef.current === null) return;
                  const currentY = e.touches[0]?.clientY ?? profileSwipeStartYRef.current;
                  const delta = currentY - profileSwipeStartYRef.current;
                  if (delta > 0) {
                    setProfileSwipeDeltaY(Math.min(delta, 240));
                  }
                }}
                onTouchEnd={() => {
                  if (profileSwipeStartYRef.current === null) return;
                  const shouldClose = profileSwipeDeltaY > 70;
                  profileSwipeStartYRef.current = null;
                  setProfileSwipeDeltaY(0);
                  if (shouldClose) {
                    setIsProfileDropdownOpen(false);
                  }
                }}
                onTouchCancel={() => {
                  profileSwipeStartYRef.current = null;
                  setProfileSwipeDeltaY(0);
                }}
                className="touch-none select-none md:hidden"
              >
                <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700/60 mx-auto mb-2" />

                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <AxiomaLogoMark className="w-5 h-5 shrink-0" />
                    <span className="font-heading text-[14px] font-bold tracking-[0.06em] uppercase text-zinc-900 dark:text-zinc-100">
                      Axioma
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="min-h-[44px] inline-flex items-center px-1 text-[15px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 active:scale-[0.96] transition-all duration-200 ease-out cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>

              {/* Card 1: Main User Account Card */}
              <div className="bg-white/90 dark:bg-[#1c1c1f]/90 rounded-3xl md:rounded-xl p-4 md:p-3 flex items-center justify-between gap-4 md:gap-3 mb-3.5 md:mb-2.5 border border-zinc-200/80 dark:border-white/[0.06] shadow-sm md:shadow-none">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="relative w-14 h-14 md:w-10 md:h-10 rounded-full shrink-0">
                    <div
                      className="w-14 h-14 md:w-10 md:h-10 rounded-full font-semibold text-2xl md:text-base flex items-center justify-center overflow-hidden bg-zinc-200 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-white/10"
                    >
                      {authUser ? (
                        <span className="text-2xl md:text-base font-semibold uppercase">
                          {(userName || "N").trim().charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-2xl md:text-base font-semibold uppercase">{toTitleCase(userName)?.charAt(0) || "T"}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        openSettingsModal("main", "account");
                      }}
                      title="Ubah nama tampilan"
                      aria-label="Ubah nama tampilan"
                      className="absolute -bottom-1 -right-1 w-6 h-6 md:w-5 md:h-5 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:bg-[#1e1f20] dark:border-zinc-700 dark:text-zinc-300 flex items-center justify-center dark:hover:bg-zinc-700 cursor-pointer transition-colors shadow-sm"
                    >
                      <Pencil className="w-3 h-3 md:w-2.5 md:h-2.5" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1 ml-4 md:ml-3">
                    <div className="text-[18px] md:text-[14px] font-semibold text-zinc-900 dark:text-white truncate">
                      {displayName ? toTitleCase(displayName) : (authUser ? "Pengguna" : "Mode Tamu")}
                    </div>
                    <div className="text-[13px] md:text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400 truncate mt-0.5 md:mt-0">
                      {authUser?.email || "Mode Tamu (Lokal)"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    openSettingsModal("main", "account");
                  }}
                  aria-label="Pengaturan akun"
                  className="w-8 h-8 md:w-7 md:h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center shrink-0 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4 md:w-3.5 md:h-3.5" />
                </button>
              </div>

              {/* Separate Standalone Capsule Buttons */}
              <div className="space-y-2.5 md:space-y-1.5">
                {/* Button 1: Kelola Akun Google Anda / Masuk dengan Google */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    if (!authUser) {
                      setIsAuthModalOpen(true);
                    } else {
                      openSettingsModal("main", "account");
                    }
                  }}
                  className="w-full bg-white/90 hover:bg-zinc-50 dark:bg-[#1c1c1f]/90 dark:hover:bg-zinc-800 active:scale-[0.98] rounded-2xl md:rounded-xl px-5 py-4 md:px-3.5 md:py-2.5 flex items-center justify-between text-[15px] md:text-[13.5px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 transition-all duration-150 cursor-pointer text-left border border-zinc-200/80 dark:border-white/[0.06] shadow-sm md:shadow-none"
                >
                  <div className="flex items-center gap-3.5 md:gap-2.5 min-w-0">
                    <svg className="w-5 h-5 md:w-4 md:h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span className="text-[15px] md:text-[13.5px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 truncate">
                      {authUser ? "Kelola Akun Google Anda" : "Masuk dengan Google"}
                    </span>
                  </div>
                </button>

                {/* Button 2: Setelan */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    openSettingsModal("main");
                  }}
                  className="w-full bg-white/90 hover:bg-zinc-50 dark:bg-[#1c1c1f]/90 dark:hover:bg-zinc-800 active:scale-[0.98] rounded-2xl md:rounded-xl px-5 py-4 md:px-3.5 md:py-2.5 flex items-center justify-between text-[15px] md:text-[13.5px] font-medium leading-snug text-zinc-900 dark:text-zinc-100 transition-all duration-150 cursor-pointer text-left border border-zinc-200/80 dark:border-white/[0.06] shadow-sm md:shadow-none"
                >
                  <div className="flex items-center gap-3.5 md:gap-2.5">
                    <Settings className="w-5 h-5 md:w-4 md:h-4 text-zinc-600 dark:text-zinc-300 shrink-0" strokeWidth={1.75} />
                    <span className="text-[15px] md:text-[13.5px] font-medium leading-snug text-zinc-900 dark:text-zinc-100">Setelan</span>
                  </div>
                </button>

                {/* Button 3: Keluar dari Akun (when authUser) */}
                {authUser && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsProfileDropdownOpen(false);
                      if (supabase) {
                        await supabase.auth.signOut();
                      }
                      setAuthUser(null);
                      setAuthToken(null);
                      setDisplayName(DEFAULT_DISPLAY_NAME);
                      safeRemoveLocalStorage(STORAGE_KEYS.DISPLAY_NAME);
                      showToastNotice("Berhasil keluar dari akun.");
                      void refreshChatHistory();
                    }}
                    className="w-full bg-white/90 hover:bg-red-50 dark:bg-[#1c1c1f]/90 dark:hover:bg-red-950/30 active:scale-[0.98] rounded-2xl md:rounded-xl px-5 py-4 md:px-3.5 md:py-2.5 flex items-center gap-3.5 md:gap-2.5 text-[15px] md:text-[13.5px] font-medium leading-snug text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-150 cursor-pointer text-left border border-zinc-200/80 dark:border-white/[0.06] shadow-sm md:shadow-none"
                  >
                    <LogOut className="w-5 h-5 md:w-4 md:h-4 text-red-600 dark:text-red-400 shrink-0" strokeWidth={1.75} />
                    <span>Keluar dari Akun</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Footer Links (1-line horizontal layout) */}
            <div className="mt-6 md:mt-3 flex items-center justify-center gap-2 text-[12px] md:text-[11px] text-zinc-500 shrink-0">
              <Link
                href="/privasi"
                onClick={() => setIsProfileDropdownOpen(false)}
                className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors"
              >
                Kebijakan Privasi
              </Link>
              <span aria-hidden="true">•</span>
              <Link
                href="/ketentuan"
                onClick={() => setIsProfileDropdownOpen(false)}
                className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors"
              >
                Persyaratan Layanan
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Off-canvas Backdrop (Solid Scrim, Zero Blur — immediately unmounted when Settings opens) */}
      {shouldRenderSidebarBackdrop && !isSettingsModalOpen && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsMobileSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
              setIsMobileSidebarOpen(false);
            }
          }}
          className={`fixed inset-0 h-[var(--app-height,100dvh)] min-h-[100dvh] z-40 bg-black/70 md:hidden transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isSidebarBackdropEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          aria-label="Tutup latar bilah sisi"
        />
      )}

      {/* Responsive Sidebar (Mobile Drawer < 768px | Desktop Full 260px / Mini Rail 64px >= 768px) */}
      <aside
        aria-label="Riwayat percakapan"
        className={`fixed inset-y-0 left-0 h-[var(--app-height,100dvh)] min-h-[100dvh] md:static md:h-full md:min-h-0 z-40 w-[82vw] max-w-[320px] md:max-w-none m-0 pt-0 pb-0 bg-[#f3f3f1] dark:bg-[#0a0a0c] border-r-0 md:border-r border-zinc-200/80 dark:border-r dark:border-white/[0.08] flex flex-col shrink-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
          isDesktopSidebarCollapsed
            ? "md:w-[64px] md:opacity-100 md:visible md:translate-x-0"
            : "md:w-[260px] md:opacity-100 md:visible md:translate-x-0"
        } ${isMobileSidebarOpen ? "translate-x-0 visible" : "-translate-x-full invisible md:visible"}`}
      >
        {/* Brand Header */}
        <div
          className={`relative z-30 shrink-0 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3 px-4 md:pt-0 md:pb-0 md:h-14 bg-[#f3f3f1] dark:bg-[#0a0a0c] flex items-center ${
            isDesktopSidebarCollapsed ? "justify-between md:justify-center md:px-0" : "justify-between"
          }`}
        >
          <div className="flex items-center gap-2">
            <AxiomaLogoMark className="w-6 h-6 object-contain shrink-0" />
            <span
              className={`font-heading text-[14px] font-bold tracking-[0.06em] uppercase text-zinc-900 dark:text-zinc-100 ${
                isDesktopSidebarCollapsed ? "md:hidden" : ""
              }`}
            >
              Axioma
            </span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 leading-none select-none ${
                isDesktopSidebarCollapsed ? "md:hidden" : ""
              }`}
            >
              Beta
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden w-9 h-9 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800/80 active:scale-[0.96] transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Sidebar Actions & Navigation */}
        {!authUser ? (
          <div className={`px-3 pb-2 space-y-3 shrink-0 ${isDesktopSidebarCollapsed ? "md:px-2" : ""}`}>
            {/* New Chat Button (+ Sesi Baru) */}
            <button
              type="button"
              onClick={() => {
                handleCreateNewChat();
                if (isTouchOrMobile) setIsMobileSidebarOpen(false);
              }}
              title="Sesi Baru"
              aria-label="Sesi Baru"
              className={`w-full flex items-center rounded-xl bg-white hover:bg-zinc-100/90 dark:bg-[#161618] dark:hover:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none h-10 px-3.5 text-[14px] font-medium leading-snug transition-all duration-200 cursor-pointer active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60 ${
                isDesktopSidebarCollapsed ? "justify-start md:w-10 md:px-0 md:mx-auto md:justify-center" : "justify-between"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span className={isDesktopSidebarCollapsed ? "md:hidden" : ""}>Sesi Baru</span>
              </span>
            </button>

            {/* Guest Mode Cloud Sync Prompt Banner */}
            <div
              className={`bg-white dark:bg-[#161618] border border-zinc-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col gap-3 shrink-0 ${
                isDesktopSidebarCollapsed ? "md:hidden" : ""
              }`}
            >
              <div className="flex items-start gap-2.5">
                <Cloud className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                <div className="min-w-0">
                  <span className="text-[15px] font-semibold leading-snug text-zinc-900 dark:text-zinc-100 block mb-1 tracking-normal">
                    Cadangkan Percakapan
                  </span>
                  <p className="tracking-normal text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Hubungkan akun untuk menyimpan riwayat chat agar bisa diakses dari perangkat lain.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="w-full h-10 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-white/10 text-[14px] font-medium leading-snug transition-all duration-200 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
              >
                <span>Hubungkan Akun</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={`px-3 pb-2 space-y-2.5 shrink-0 ${isDesktopSidebarCollapsed ? "md:px-2" : ""}`}>
            {/* New Chat Button for Authenticated Users (+ Sesi Baru) */}
            <button
              type="button"
              onClick={() => {
                handleCreateNewChat();
                if (isTouchOrMobile) setIsMobileSidebarOpen(false);
              }}
              title="Sesi Baru"
              aria-label="Sesi Baru"
              className={`w-full flex items-center rounded-xl bg-white hover:bg-zinc-100/90 dark:bg-[#161618] dark:hover:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none h-10 px-3.5 text-[14px] font-medium leading-snug transition-all duration-200 cursor-pointer active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60 ${
                isDesktopSidebarCollapsed ? "justify-start md:w-10 md:px-0 md:mx-auto md:justify-center" : "justify-between"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span className={isDesktopSidebarCollapsed ? "md:hidden" : ""}>Sesi Baru</span>
              </span>
            </button>

            {/* Real-time Search Filter for Authenticated Users */}
            <div className={`relative flex items-center ${isDesktopSidebarCollapsed ? "md:hidden" : ""}`}>
              <Search className="w-3.5 h-3.5 text-icon-muted absolute left-2.5 pointer-events-none" strokeWidth={1.75} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isTouchOrMobile ? "Cari percakapan..." : "Cari percakapan..."}
                aria-label="Cari percakapan"
                disabled={!isMobileSidebarOpen && isTouchOrMobile}
                tabIndex={isMobileSidebarOpen || !isTouchOrMobile ? 0 : -1}
                className="w-full pl-8 pr-14 md:pr-14 py-2 min-h-[40px] md:min-h-0 md:py-1.5 rounded-xl bg-white dark:bg-[#161618] border border-zinc-200/80 dark:border-white/[0.08] text-base md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
              />
              {!searchQuery && (
                <kbd className="hidden md:inline-flex items-center absolute right-2 pointer-events-none border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-500">
                  {isMacOs ? "⌘K" : "Ctrl+K"}
                </kbd>
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Bersihkan pencarian"
                  className="absolute right-2 p-1 rounded text-icon-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Compact Collapsible Workspace / Project Spaces Section */}
        <WorkspaceSidebarSection
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          collapsed={isDesktopSidebarCollapsed}
          onSelectWorkspace={handleSelectWorkspace}
          onCreateWorkspace={handleCreateWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
        />

        {/* Grouped Chat History (Only visible when user is logged in) */}
        {authUser ? (
          <>
          <div className={`flex-1 overflow-y-auto overscroll-y-contain overscroll-contain touch-auto scrollbar-none px-2 py-1 space-y-4 ${isDesktopSidebarCollapsed ? "md:hidden" : ""}`}>
          {isSidebarLoading || !clientNow ? (
            <div
              role="status"
              aria-label="Memuat riwayat percakapan"
              className="px-2.5 py-2 space-y-3"
            >
              <div className="h-3 w-20 rounded bg-border-subtle animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-8 w-full rounded-lg bg-border-subtle/80 animate-pulse" />
                <div className="h-8 w-[88%] rounded-lg bg-border-subtle/70 animate-pulse" />
                <div className="h-8 w-[94%] rounded-lg bg-border-subtle/60 animate-pulse" />
              </div>
              <div className="h-3 w-24 rounded bg-border-subtle/80 animate-pulse pt-2" />
              <div className="space-y-1.5">
                <div className="h-8 w-[90%] rounded-lg bg-border-subtle/70 animate-pulse" />
                <div className="h-8 w-[82%] rounded-lg bg-border-subtle/60 animate-pulse" />
              </div>
            </div>
          ) : groupedChatHistory.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-text-muted">
              {searchQuery.trim()
                ? "Tidak ada percakapan yang cocok."
                : "Belum ada riwayat percakapan."}
            </div>
          ) : (
            groupedChatHistory.map((group) => (
              <div key={group.label} className="space-y-0.5">
                <div className="px-2.5 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-text-muted select-none">
                  {group.label}
                </div>
                {group.items.map((chat) => {
                  const isActive = chat.id === activeChatId;
                  const isMenuOpen = openChatMenuId === chat.id;
                  const isEditing = editingChatId === chat.id;

                  return (
                    <div
                      key={chat.id}
                      className={`group relative flex items-center min-h-11 md:min-h-0 rounded-lg transition-colors ${
                        isActive
                          ? "bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-semibold"
                          : "text-text-secondary hover:text-text-primary hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 min-h-11 lg:min-h-0">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-icon-muted" />
                          <input
                            ref={renameInputRef}
                            type="text"
                            value={editingTitleValue}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void submitRenameChat(chat.id);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEditingChat();
                              }
                            }}
                            onBlur={() => void submitRenameChat(chat.id)}
                            aria-label="Ubah judul percakapan"
                            className="flex-1 min-w-0 bg-bg-elevated border border-border-strong rounded px-2 py-0.5 text-[16px] sm:text-[15px] lg:text-xs text-text-primary focus:outline-none focus:border-border-strong"
                          />
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleSelectChat(chat.id)}
                            title={chat.title}
                            className="flex-1 min-w-0 min-h-11 lg:min-h-0 text-left pl-2.5 pr-11 py-2 rounded-lg text-[13px] sm:text-sm tracking-tight flex items-center gap-2.5 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-icon-muted" />
                            <div className="min-w-0 flex-1 flex flex-col">
                              <span
                                className={`truncate ${
                                  isActive
                                    ? "font-semibold text-text-primary"
                                    : "font-medium text-text-secondary group-hover:text-text-primary"
                                }`}
                              >
                                {chat.title}
                              </span>
                              {clientNow && (
                                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate tabular-nums">
                                  {formatRelativeTimeId(getChatTimestamp(chat), clientNow)}
                                </span>
                              )}
                            </div>
                          </button>

                          {/* ⋯ trigger: min 44x44 touch target on mobile/tablet */}
                          <button
                            ref={(el) => {
                              chatMenuTriggerRefs.current[chat.id] = el;
                            }}
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={isMenuOpen}
                            aria-label={`Opsi untuk ${chat.title}`}
                            title={`Opsi untuk ${chat.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenChatMenuId((prev) =>
                                prev === chat.id ? null : chat.id
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenChatMenuId(chat.id);
                              }
                            }}
                            className={`absolute right-1 w-11 h-11 min-w-[44px] min-h-[44px] lg:w-7 lg:h-7 lg:min-w-0 lg:min-h-0 p-2 lg:p-1 rounded-md text-icon-muted hover:text-text-primary hover:bg-bg-surface transition-opacity flex items-center justify-center cursor-pointer ${
                              isActive || isMenuOpen
                                ? "opacity-100"
                                : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100"
                            }`}
                          >
                            <Ellipsis className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div
                              ref={chatMenuContainerRef}
                              role="menu"
                              aria-label="Kelola percakapan"
                              onKeyDown={(e) =>
                                handleMenuArrowKeyDown(e, chatMenuItemRefs.current, () =>
                                  closeChatItemMenu(chat.id, true)
                                )
                              }
                              className="absolute right-1 top-full mt-1 z-50 w-40 rounded-xl bg-bg-elevated border border-border-subtle p-1 shadow-2xl space-y-0.5"
                            >
                              <button
                                ref={(el) => {
                                  chatMenuItemRefs.current[0] = el;
                                }}
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingChat(chat);
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-surface focus:bg-bg-surface focus:text-text-primary focus:outline-none flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5 text-icon-muted" />
                                <span>Ganti nama</span>
                              </button>
                              <button
                                ref={(el) => {
                                  chatMenuItemRefs.current[1] = el;
                                }}
                                type="button"
                                role="menuitem"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenChatMenuId(null);
                                  handleInitiateDeleteChat(chat);
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40 dark:focus:text-red-300 focus:outline-none flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        {isDesktopSidebarCollapsed && <div className="hidden md:block flex-1" />}
        </>
      ) : (
        <div className="flex-1" />
      )}

        {/* User Profile & Settings Menu (Item 4 & Item 7) */}
        <div
          className={`shrink-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] px-4 md:px-2 md:pt-3 md:pb-4 border-t border-zinc-200/80 dark:border-white/[0.07] relative flex items-center gap-1 ${
            isDesktopSidebarCollapsed
              ? "justify-between md:flex-col md:justify-center md:px-1.5 md:gap-1.5"
              : "justify-between"
          }`}
        >
          <div
            className={`flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-white/[0.05] transition-colors group text-left min-w-0 font-sans ${
              isDesktopSidebarCollapsed ? "flex-1 md:flex-none md:justify-center" : "flex-1"
            }`}
          >
            <button
              ref={settingsTriggerRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={
                !isTouchOrMobile
                  ? isProfileDropdownOpen && profileAnchor === "sidebar"
                  : isSettingsMenuOpen
              }
              aria-label="Menu profil"
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth >= 768) {
                  if (isProfileDropdownOpen && profileAnchor === "sidebar") {
                    setIsProfileDropdownOpen(false);
                  } else {
                    setProfileAnchor("sidebar");
                    setIsProfileDropdownOpen(true);
                  }
                } else {
                  setIsSettingsMenuOpen((prev) => !prev);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  e.preventDefault();
                  setIsSettingsMenuOpen(true);
                }
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-semibold tracking-tight select-none overflow-hidden shadow-xs cursor-pointer"
            >
              {authUser ? (
                <div className="w-full h-full rounded-xl bg-zinc-200 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-white/10 flex items-center justify-center">
                  <span className="uppercase font-semibold select-none text-xs">
                    {(userName || "N").trim().charAt(0).toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="w-full h-full rounded-xl bg-zinc-200 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-white/10 flex items-center justify-center transition-colors">
                  <User className="w-4 h-4 text-current" strokeWidth={1.5} />
                </div>
              )}
            </button>
            <div
              className={`min-w-0 flex-1 flex items-center gap-1.5 ${
                isDesktopSidebarCollapsed ? "md:hidden" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && window.innerWidth >= 768) {
                    if (isProfileDropdownOpen && profileAnchor === "sidebar") {
                      setIsProfileDropdownOpen(false);
                    } else {
                      setProfileAnchor("sidebar");
                      setIsProfileDropdownOpen(true);
                    }
                  } else {
                    setIsSettingsMenuOpen((prev) => !prev);
                  }
                }}
                className="min-w-0 flex-1 truncate text-left text-[14.5px] font-medium leading-none text-zinc-900 dark:text-zinc-100 cursor-pointer font-sans"
              >
                {authUser ? userName : "Mode Tamu"}
              </button>
              {authUser &&
                (isProPlan ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openQuotaSettings();
                    }}
                    title="Lihat Batas penggunaan"
                    aria-label="Status paket PRO, buka Batas penggunaan"
                    className="inline-flex items-center bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[10px] font-semibold leading-none tracking-wider uppercase px-1.5 py-1 rounded shrink-0 transition-colors cursor-pointer font-sans"
                  >
                    PRO
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openQuotaSettings();
                    }}
                    title="Lihat Batas penggunaan"
                    aria-label="Status paket FREE, buka Batas penggunaan"
                    className="inline-flex items-center border border-zinc-300 hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 text-[10px] font-medium leading-none uppercase px-1.5 py-1 rounded shrink-0 transition-colors cursor-pointer font-sans"
                  >
                    FREE
                  </button>
                ))}
            </div>
          </div>

          {/* Item 7: Directly open/toggle Settings (Mobile page / Desktop floating popover) */}
          <button
            ref={gearButtonRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isSettingsModalOpen) {
                setIsSettingsModalOpen(false);
              } else {
                openSettingsModal("main");
              }
            }}
            aria-label="Buka Pengaturan"
            title="Pengaturan"
            className="w-11 h-11 min-w-[44px] min-h-[44px] md:w-9 md:h-9 md:min-w-0 md:min-h-0 p-2 rounded-xl text-icon-muted hover:text-text-primary hover:bg-zinc-200/60 dark:hover:bg-white/[0.05] transition-colors flex items-center justify-center cursor-pointer shrink-0"
          >
            <Settings className="w-4 h-4" strokeWidth={1.5} />
          </button>

          {isSettingsMenuOpen && (
            <div
              ref={settingsMenuRef}
              role="menu"
              aria-label="Menu profil dan pengaturan"
              onKeyDown={(e) =>
                handleMenuArrowKeyDown(e, settingsMenuItemRefs.current, () =>
                  closeSettingsMenu(true)
                )
              }
              className="absolute bottom-full left-2 right-2 mb-2 z-50 max-h-[80dvh] overflow-y-auto overscroll-contain rounded-xl bg-bg-elevated border border-border-subtle p-1.5 shadow-2xl space-y-0.5"
            >
              {!authUser ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeSettingsMenu(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-text-primary hover:bg-bg-surface focus:bg-bg-surface focus:text-text-primary focus:outline-none flex items-center gap-2 transition-colors cursor-pointer font-medium"
                >
                  <Cloud className="w-3.5 h-3.5 text-icon-muted" strokeWidth={1.75} />
                  <span>Hubungkan Akun</span>
                </button>
              ) : null}

              <button
                ref={(el) => {
                  settingsMenuItemRefs.current[0] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  closeSettingsMenu(false);
                  openSettingsModal("main");
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-surface focus:bg-bg-surface focus:text-text-primary focus:outline-none flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-icon-muted" />
                <span>Pengaturan</span>
              </button>

              <button
                ref={(el) => {
                  settingsMenuItemRefs.current[1] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  closeSettingsMenu(false);
                  setIsClearAllConfirmOpen(true);
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40 dark:focus:text-red-300 focus:outline-none flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span>Hapus semua percakapan</span>
              </button>

              {authUser ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    closeSettingsMenu(false);
                    if (supabase) {
                      await supabase.auth.signOut();
                    }
                    setAuthUser(null);
                    setAuthToken(null);
                    setDisplayName(DEFAULT_DISPLAY_NAME);
                    safeRemoveLocalStorage(STORAGE_KEYS.DISPLAY_NAME);
                    showToastNotice("Berhasil keluar dari akun.");
                    void refreshChatHistory();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40 dark:focus:text-red-300 focus:outline-none flex items-center gap-2 transition-colors cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>Keluar dari Akun</span>
                </button>
              ) : null}

              <div className="pt-1.5 border-t border-border-subtle space-y-1">
                <p className="px-2.5 py-1 text-[11px] text-text-muted leading-relaxed select-none">
                  Riwayat percakapan tersimpan untuk perangkat &amp; browser ini. Menghapus data browser akan menghilangkan akses ke riwayat.
                </p>
                <div className="px-2.5 py-1 flex items-center justify-between text-[11px] text-text-muted border-t border-border-subtle/50">
                  <Link
                    href="/privasi"
                    onClick={() => closeSettingsMenu(false)}
                    className="py-1.5 px-2 inline-block hover:text-text-primary transition-colors underline underline-offset-2 decoration-border-strong"
                  >
                    Kebijakan Privasi
                  </Link>
                  <span className="text-border-strong">·</span>
                  <Link
                    href="/ketentuan"
                    onClick={() => closeSettingsMenu(false)}
                    className="py-1.5 px-2 inline-block hover:text-text-primary transition-colors underline underline-offset-2 decoration-border-strong"
                  >
                    Ketentuan Layanan
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Workspace Column */}
      <div className="relative z-10 flex-1 flex flex-col h-full min-h-0 min-w-0 pb-0 overflow-hidden bg-[#f9f9f8] dark:bg-[#0e0e10]">
        {/* Header (Sticky full-bleed on Mobile < md with safe-area top, 100% solid opaque) */}
        <header className="sticky top-0 shrink-0 w-full flex items-center justify-between pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 px-3.5 md:relative md:py-0 md:h-14 md:px-5 z-30 bg-[#f9f9f8] dark:bg-[#0e0e10]">
          {isVoiceModeOpen ? (
            /* In-Place Gemini Live Voice Header */
            <div className="flex items-center justify-between w-full animate-fade-in">
              {/* Left: Circular Menu Button (=) across Mobile/Tablet/Desktop */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="lg:hidden w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 hover:text-zinc-900 dark:bg-[#1e1f20] dark:hover:bg-[#27282b] dark:border-transparent dark:text-zinc-300 dark:hover:text-white active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                  aria-label="Buka bilah sisi"
                >
                  <Menu className="w-[18px] h-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={toggleDesktopSidebar}
                  title={isDesktopSidebarCollapsed ? "Tampilkan bilah sisi" : "Sembunyikan bilah sisi"}
                  aria-label={isDesktopSidebarCollapsed ? "Tampilkan bilah sisi" : "Sembunyikan bilah sisi"}
                  className="hidden lg:flex w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 hover:text-zinc-900 dark:bg-[#1e1f20] dark:hover:bg-[#27282b] dark:border-transparent dark:text-zinc-300 dark:hover:text-white active:scale-95 transition-all items-center justify-center cursor-pointer"
                >
                  <Menu className="w-[18px] h-[18px]" />
                </button>
              </div>

              {/* Right: Top-Right Capsule [Toggle Transkrip | •••] */}
              <div className="relative" ref={voiceOptionsMenuRef}>
                <div className="bg-zinc-100 border border-zinc-200 dark:bg-[#1e1f22] dark:border-white/[0.08] rounded-full px-3 py-1.5 flex items-center gap-3 shadow-md">
                  {/* (a) Tombol Toggle Transkrip (ikon dokumen/teks dicoret) */}
                  <button
                    type="button"
                    onClick={() => setShowVoiceTranscript((prev) => !prev)}
                    aria-pressed={showVoiceTranscript}
                    title={
                      showVoiceTranscript
                        ? "Sembunyikan teks percakapan"
                        : "Tampilkan teks percakapan"
                    }
                    aria-label={
                      showVoiceTranscript
                        ? "Sembunyikan teks percakapan"
                        : "Tampilkan teks percakapan"
                    }
                    className={`p-0.5 rounded-full transition-colors cursor-pointer ${
                      showVoiceTranscript
                        ? "text-zinc-900 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-200"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="3" />
                      <path d="M7 10h6" />
                      <path d="M7 14h9" />
                      {!showVoiceTranscript && <path d="M3 3l18 18" />}
                    </svg>
                  </button>

                  {/* (b) Tombol Menu Opsi (•••) */}
                  <button
                    type="button"
                    onClick={() => setIsVoiceOptionsMenuOpen((prev) => !prev)}
                    aria-haspopup="menu"
                    aria-expanded={isVoiceOptionsMenuOpen}
                    title="Opsi Mode Suara"
                    aria-label="Opsi Mode Suara"
                    className="p-0.5 rounded-full text-zinc-700 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Ellipsis className="w-[18px] h-[18px]" />
                  </button>
                </div>

                {/* Voice Options Dropdown Menu */}
                {isVoiceOptionsMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Opsi Mode Suara"
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-zinc-200 dark:bg-[#1e1f20] dark:border-white/[0.08] p-2 shadow-2xl z-50 space-y-1.5 animate-fade-up"
                  >
                    {/* Profil / Akun */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsVoiceOptionsMenuOpen(false);
                        setIsProfileDropdownOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full bg-zinc-200 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-white/10 flex items-center justify-center text-xs font-semibold shrink-0">
                        {authUser ? (
                          (userName || "N").trim().charAt(0).toUpperCase()
                        ) : (
                          <User className="w-3.5 h-3.5 text-current" strokeWidth={1.75} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">
                          {authUser ? userName : "Mode Tamu"}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {authUser ? "Profil Akun" : "Hubungkan Akun"}
                        </div>
                      </div>
                    </button>

                    <div className="border-t border-zinc-200 dark:border-white/[0.06]" />

                    {/* Pilihan Suara Axioma */}
                    <div className="px-3 py-1.5 space-y-1.5">
                      <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        Suara Axioma
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          [
                            { id: "id-ID-ArdiNeural", label: "Ardi" },
                            { id: "id-ID-GadisNeural", label: "Gadis" },
                          ] as const
                        ).map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setVoiceNeuralName(v.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                              voiceNeuralName === v.id
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-[#141416] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Kecepatan Bicara */}
                    <div className="px-3 py-1.5 space-y-1.5">
                      <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        Kecepatan Suara
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[0.95, 1.08, 1.2].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setVoiceSpeechRate(rate)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                              voiceSpeechRate === rate
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-[#141416] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-zinc-200 dark:border-white/[0.06]" />

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsVoiceOptionsMenuOpen(false);
                        openSettingsModal("main");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                      <span>Setelan</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsVoiceOptionsMenuOpen(false);
                        setIsVoiceModeOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors text-left cursor-pointer"
                    >
                      <X className="w-4 h-4 shrink-0" />
                      <span>Tutup Mode Suara</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Unified Minimalist Top Bar (Mobile & Desktop) */}
              <div className="min-h-[36px] w-full flex items-center justify-between gap-2.5">
                {/* Sisi Kiri: Tombol Sidebar (rounded-xl) + Pemilih Model (relative + dropdown rata kiri) */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile Drawer Trigger (< md, Apple HIG 40x40px touch target) */}
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="md:hidden w-10 h-10 min-w-[40px] min-h-[40px] shrink-0 rounded-xl bg-white hover:bg-zinc-100 dark:bg-[#161618] dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 active:scale-[0.96] transition-all duration-150 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
                    aria-label="Buka bilah sisi"
                  >
                    <Menu className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  </button>

                  {/* Desktop Sidebar Toggle (>= md) */}
                  <button
                    type="button"
                    onClick={toggleDesktopSidebar}
                    title={isDesktopSidebarCollapsed ? "Perluas bilah sisi" : "Ciutkan bilah sisi"}
                    aria-label={isDesktopSidebarCollapsed ? "Perluas bilah sisi" : "Ciutkan bilah sisi"}
                    className="hidden md:flex w-9 h-9 shrink-0 rounded-xl bg-white hover:bg-zinc-100 dark:bg-[#161618] dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 active:scale-[0.96] transition-all duration-200 items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
                  >
                    {isDesktopSidebarCollapsed ? (
                      <PanelLeft className="w-4 h-4" strokeWidth={1.75} />
                    ) : (
                      <PanelLeftClose className="w-4 h-4" strokeWidth={1.75} />
                    )}
                  </button>

                  {/* Quiet Active Workspace Label (only when a Project Space is active) */}
                  {activeWorkspace && (
                    <span
                      title={activeWorkspace.instructions || activeWorkspace.name}
                      className="inline-flex items-center gap-1.5 max-w-[150px] sm:max-w-[220px] px-2.5 py-1 rounded-full border border-black/[0.08] dark:border-white/[0.08] text-[11px] font-medium tracking-tight text-zinc-600 dark:text-zinc-300 truncate select-none"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-900/70 dark:bg-white/70 shrink-0" />
                      <span className="truncate">{activeWorkspace.name}</span>
                    </span>
                  )}

                </div>

                {/* Sisi Kanan: Tombol Checkpoint Minimalis (saat >= 2 pesan) + Tombol Profil Mobile */}
                <div className="flex items-center gap-2 shrink-0">
                  {currentMessages.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => setIsCheckpointModalOpen(true)}
                      aria-label="Buka panel konteks dan checkpoint percakapan"
                      title="Konteks & Checkpoint"
                      className="h-9 px-2.5 rounded-full inline-flex items-center gap-1.5 bg-transparent hover:bg-black/[0.05] text-zinc-600 hover:text-zinc-900 border border-black/[0.08] dark:hover:bg-white/[0.06] dark:text-zinc-400 dark:hover:text-zinc-100 dark:border-white/[0.08] text-[11.5px] font-medium tracking-tight transition-colors cursor-pointer active:scale-[0.97] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
                    >
                      <Bookmark className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                      <span className="hidden min-[380px]:inline">Checkpoint</span>
                      {hasActiveChatContext(chatContextState) && (
                        <span
                          aria-hidden="true"
                          className="w-1.5 h-1.5 rounded-full bg-zinc-900/70 dark:bg-white/70 shrink-0"
                        />
                      )}
                    </button>
                  )}

                  <button
                    ref={headerProfileTriggerRef}
                    type="button"
                    onClick={() => {
                      if (isProfileDropdownOpen && profileAnchor === "header") {
                        setIsProfileDropdownOpen(false);
                      } else {
                        setProfileAnchor("header");
                        setIsProfileDropdownOpen(true);
                      }
                    }}
                    aria-label="Buka menu profil dan akun"
                    title={authUser ? "Profil Akun" : "Mode Tamu — Hubungkan Akun"}
                    className="w-10 h-10 min-w-[40px] min-h-[40px] shrink-0 rounded-xl flex md:hidden items-center justify-center cursor-pointer select-none overflow-hidden active:scale-[0.96] transition-all duration-150 text-sm font-semibold uppercase bg-zinc-200 hover:bg-zinc-300/80 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 dark:text-zinc-100 dark:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
                  >
                    {authUser ? (
                      <span className="uppercase font-semibold select-none text-[13.5px]">
                        {(userName || "N").trim().charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <User className="w-4 h-4 text-current" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </header>

        {/* Dynamic Chat Workspace */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* Hidden Native File Inputs (always mounted for both Chat & Live Voice Mode) */}
          <input
            ref={imageInputRef}
            type="file"
            tabIndex={-1}
            aria-hidden="true"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            className="hidden"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.length) {
                void handleFilesSelected(e.target.files);
                e.target.value = "";
              }
            }}
          />
          <input
            ref={pdfInputRef}
            type="file"
            tabIndex={-1}
            aria-hidden="true"
            accept="application/pdf"
            multiple
            className="hidden"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.length) {
                void handleFilesSelected(e.target.files);
                e.target.value = "";
              }
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            tabIndex={-1}
            aria-hidden="true"
            accept="image/*"
            capture="environment"
            className="hidden"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.length) {
                void handleFilesSelected(e.target.files);
                e.target.value = "";
              }
            }}
          />

          {/* Floating Notification Toast (Native iOS Glass Pill — auto-dismiss 2s) */}
          {toastNotice && (
            <div
              role="status"
              aria-live="polite"
              className="ios-glass fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-50 rounded-full px-4 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 animate-axioma-scale-in pointer-events-none select-none whitespace-nowrap max-w-[calc(100vw-2rem)] truncate"
            >
              <span>{toastNotice}</span>
            </div>
          )}

          {/* Floating Toast Feedback "Teks disalin!" */}
          {copied && (
            <div
              role="status"
              aria-live="polite"
              className="ios-glass fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-zinc-900 dark:text-zinc-100 flex items-center gap-2 text-xs font-medium animate-axioma-scale-in pointer-events-none select-none"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Teks disalin!</span>
            </div>
          )}

          {isVoiceModeOpen ? (
            <VoiceModeOverlay
              isOpen={isVoiceModeOpen}
              onClose={() => setIsVoiceModeOpen(false)}
              showTranscript={showVoiceTranscript}
              speechRate={voiceSpeechRate}
              voiceName={voiceNeuralName}
              agentName={selectedAgent.name}
              voiceAudioRef={voiceAudioRef}
              sharedAudioContextRef={voiceAudioContextRef}
              ttsAnalyserRef={voiceTtsAnalyserRef}
              ttsMediaSourceConnectedRef={voiceTtsSourceConnectedRef}
              pendingAttachments={pendingAttachments}
              onOpenImagePicker={() => imageInputRef.current?.click()}
              onOpenPdfPicker={() => pdfInputRef.current?.click()}
              onOpenCameraPicker={() => cameraInputRef.current?.click()}
              onCaptureFiles={(files) => {
                void handleFilesSelected(files);
              }}
              onRemoveAttachment={handleRemoveAttachment}
              onSendMessage={handleVoiceModeSendMessage}
              onTurnComplete={handleVoiceModeTurnComplete}
              onCopyText={handleCopy}
              copiedId={copiedId}
              onToast={showToastNotice}
            />
          ) : desktopSettingsPage ? (
            <div className="hidden md:flex flex-1 min-h-0 w-full overflow-y-auto scrollbar-none bg-[#f9f9f8] dark:bg-[#0e0e10] animate-axioma-fade-up">
              <div className="w-full max-w-[680px] mx-auto px-6 py-8">
                {/* Editorial Flat Header */}
                <div className="border-b border-zinc-200/70 dark:border-white/[0.07] pb-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setDesktopSettingsPage(null)}
                    className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 mb-4 cursor-pointer transition-all duration-150 active:scale-[0.96]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Kembali</span>
                  </button>
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {desktopSettingsPage === "account"
                      ? "Kelola Akun"
                      : desktopSettingsPage === "quota"
                      ? "Batas penggunaan"
                      : desktopSettingsPage === "notifications"
                      ? "Notifikasi"
                      : desktopSettingsPage === "agent"
                      ? "Model Default"
                      : desktopSettingsPage === "storage"
                      ? "Penyimpanan Riwayat"
                      : desktopSettingsPage === "shortcuts"
                      ? "Pintasan Keyboard"
                      : desktopSettingsPage === "theme"
                      ? "Tema"
                      : desktopSettingsPage === "feedback"
                      ? "Kirim Masukan"
                      : "Tentang Axioma"}
                  </h1>
                </div>

                {/* Sub-Menu Body (Flat & Editorial) */}
                {desktopSettingsPage === "account" && (
                  <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
                    <div className="py-4 space-y-3">
                      <label htmlFor="desktop-settings-display-name" className="block text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                        Nama Tampilan
                      </label>
                      <div className="flex gap-2.5">
                        <input
                          id="desktop-settings-display-name"
                          type="text"
                          maxLength={60}
                          value={settingsNameInput}
                          aria-invalid={Boolean(settingsNameError)}
                          onChange={(e) => {
                            setSettingsNameInput(e.target.value);
                            if (settingsNameError) setSettingsNameError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleUpdateDisplayName(settingsNameInput);
                            }
                          }}
                          onBlur={() => handleUpdateDisplayName(settingsNameInput)}
                          placeholder="Masukkan nama tampilan..."
                          className="flex-1 min-w-0 bg-white dark:bg-[#161618] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/25 rounded-xl px-3.5 py-2 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateDisplayName(settingsNameInput)}
                          className="shrink-0 rounded-xl px-4 py-2 text-[13.5px] font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors cursor-pointer active:scale-[0.96]"
                        >
                          Simpan
                        </button>
                      </div>
                      {settingsNameError && (
                        <p role="alert" className="text-[13px] text-red-500 dark:text-red-400">
                          {settingsNameError}
                        </p>
                      )}
                    </div>

                    {/* Stage 6: Tentang Saya (Profil Singkat) */}
                    <div className="py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="desktop-settings-user-profile"
                          className="block text-[15px] font-medium text-zinc-900 dark:text-zinc-100"
                        >
                          Tentang Saya (Profil Singkat)
                        </label>
                        <span className="text-xs text-zinc-400">
                          {userProfile.length}/500
                        </span>
                      </div>
                      <textarea
                        id="desktop-settings-user-profile"
                        rows={3}
                        maxLength={500}
                        value={userProfile}
                        onChange={(e) => handleUpdateUserProfile(e.target.value)}
                        placeholder="Contoh: Mahasiswa TI, suka penjelasan to-the-point pakai analogi sederhana..."
                        className="w-full bg-white dark:bg-[#161618] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/25 rounded-xl px-3.5 py-2.5 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none resize-none transition-colors"
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Membantu Axioma menyesuaikan gaya &amp; konteks jawaban. Tersimpan lokal dan bisa diatur lewat Kontrol Konteks.
                      </p>
                    </div>

                    {/* Stage 10A: Kunci Syarat Proyek (Requirement Lock) */}
                    <div className="py-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" strokeWidth={1.5} />
                          <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                            Kunci Syarat Proyek ({requirementLockItems.length}/5)
                          </span>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isRequirementLockEnabled}
                          aria-label="Aktifkan kunci syarat proyek"
                          onClick={() =>
                            handleUpdateRequirementLockEnabled(!isRequirementLockEnabled)
                          }
                          className="cursor-pointer"
                        >
                          <span
                            aria-hidden="true"
                            className={`inline-flex items-center w-9 h-5 rounded-full p-0.5 transition-colors ${
                              isRequirementLockEnabled
                                ? "bg-zinc-950 dark:bg-white justify-end"
                                : "bg-zinc-300 dark:bg-zinc-700 justify-start"
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full ${
                                isRequirementLockEnabled
                                  ? "bg-white dark:bg-zinc-950"
                                  : "bg-white dark:bg-zinc-300"
                              }`}
                            />
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={200}
                          value={settingsReqDraft}
                          disabled={requirementLockItems.length >= 5}
                          onChange={(e) => setSettingsReqDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddRequirementLockItem();
                            }
                          }}
                          placeholder={
                            requirementLockItems.length >= 5
                              ? "Maksimal 5 syarat terkunci"
                              : "Contoh: Gunakan Bahasa Indonesia formal & sertakan contoh konkret..."
                          }
                          className="flex-1 min-w-0 bg-white dark:bg-[#161618] border border-zinc-200/90 dark:border-white/[0.08] focus:border-zinc-400 dark:focus:border-white/25 rounded-xl px-3.5 py-2 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-colors disabled:opacity-45"
                        />
                        <button
                          type="button"
                          disabled={!settingsReqDraft.trim() || requirementLockItems.length >= 5}
                          onClick={handleAddRequirementLockItem}
                          aria-label="Tambah syarat proyek"
                          className="shrink-0 inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-[13.5px] font-medium bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" strokeWidth={1.75} />
                          <span>Tambah</span>
                        </button>
                      </div>

                      {requirementLockItems.length > 0 && (
                        <ul className="space-y-1.5">
                          {requirementLockItems.map((rule, idx) => (
                            <li
                              key={`${rule}-${idx}`}
                              className="flex items-start justify-between gap-2 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] px-3 py-2 text-[13px] text-zinc-800 dark:text-zinc-200"
                            >
                              <span className="leading-snug break-words min-w-0 flex-1">
                                {idx + 1}. {rule}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateRequirementLockItems(
                                    requirementLockItems.filter((_, i) => i !== idx)
                                  )
                                }
                                aria-label="Hapus syarat"
                                className="p-0.5 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 cursor-pointer shrink-0"
                              >
                                <X className="w-4 h-4" strokeWidth={1.5} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Batasan &amp; aturan wajib proyek yang selalu dipatuhi Axioma di setiap percakapan saat aktif.
                      </p>
                    </div>

                    {/* Paket Langganan (tepat di atas Status Akun) */}
                    <div className="py-4 flex items-center justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                            Paket Langganan
                          </span>
                          {isProPlan && (
                            <span className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10.5px] font-semibold tracking-wide px-2 py-0.5 rounded-full">
                              Axioma Pro · Aktif
                            </span>
                          )}
                        </div>
                        <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {isProPlan ? (
                            <>
                              Akses penuh tanpa batas kredit harian untuk seluruh model &amp; fitur kreatif.
                              {quotaInfo?.expiresAt
                                ? ` Berlaku hingga ${new Intl.DateTimeFormat("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }).format(new Date(quotaInfo.expiresAt))}.`
                                : ""}
                            </>
                          ) : (
                            <>
                              Paket Gratis (Free) · {remainingCreditsCount} kredit tersisa · Reset pukul 00.00 WIB
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openSubscriptionModal}
                        className={`shrink-0 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors cursor-pointer active:scale-[0.98] ${
                          isProPlan
                            ? "border border-zinc-300 dark:border-white/15 bg-transparent hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-800 dark:text-zinc-200"
                            : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                        }`}
                      >
                        {isProPlan ? "Kelola Paket" : "Upgrade ke Pro — Segera Hadir"}
                      </button>
                    </div>

                    <div className="py-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                          Status Akun
                        </div>
                        <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {authUser ? authUser.email : "Mode Tamu (Lokal di perangkat ini)"}
                        </div>
                      </div>
                      {!authUser ? (
                        <button
                          type="button"
                          onClick={() => setIsAuthModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-white/10 text-[13px] font-medium transition-colors cursor-pointer"
                        >
                          Hubungkan Akun
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            if (supabase) {
                              await supabase.auth.signOut();
                            }
                            setAuthUser(null);
                            setAuthToken(null);
                            setDisplayName(DEFAULT_DISPLAY_NAME);
                            safeRemoveLocalStorage(STORAGE_KEYS.DISPLAY_NAME);
                            setDesktopSettingsPage(null);
                            showToastNotice("Berhasil keluar dari akun.");
                            void refreshChatHistory();
                          }}
                          className="px-4 py-2 rounded-xl text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          Keluar dari Akun
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {desktopSettingsPage === "quota" && (
                  <div className="py-4 font-sans space-y-4">
                    {authUser ? (
                      <div className="rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 sm:p-6 space-y-5">
                        {/* Status Paket */}
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              Status Paket
                            </div>
                            <div className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {isProPlan ? "Axioma Pro" : "Paket Free"}
                            </div>
                          </div>
                          {isProPlan ? (
                            <span className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full shrink-0">
                              PRO
                            </span>
                          ) : (
                            <span className="border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full shrink-0">
                              FREE
                            </span>
                          )}
                        </div>

                        {/* Sisa Kredit Utama */}
                        <div className="space-y-1">
                          <div className="text-2xl sm:text-[26px] font-semibold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                            {isProPlan
                              ? "Tanpa batas harian"
                              : `${dailyCreditsRemaining} / ${dailyCreditLimit} kredit tersisa hari ini`}
                          </div>
                          <p className="text-[13.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed tabular-nums">
                            {isProPlan
                              ? "Langganan Axioma Pro aktif dengan akses penuh untuk seluruh model."
                              : `Sisa kredit hari ini: ${dailyCreditsRemaining} dari ${dailyCreditLimit} kredit`}
                          </p>
                        </div>

                        {/* Progress Bar Visual */}
                        <div className="space-y-2">
                          <div className="w-full h-2.5 rounded-full bg-zinc-200/90 dark:bg-white/[0.08] overflow-hidden">
                            <div
                              style={{ width: `${dailyCreditsPercent}%` }}
                              className={`h-full rounded-full transition-all duration-300 ${
                                !isProPlan && dailyCreditsPercent <= 20
                                  ? "bg-red-500/85 dark:bg-red-400/85"
                                  : !isProPlan && dailyCreditsPercent <= 40
                                    ? "bg-amber-500/85 dark:bg-amber-400/85"
                                    : "bg-zinc-900 dark:bg-zinc-100"
                              }`}
                            />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                            <span>{dailyCreditsPercent}% kuota harian tersisa</span>
                            <span>Tarif: Omni 1 · Pro 3 · Architect 4 · Media 5 kredit</span>
                          </div>
                        </div>

                        {/* Kredit Tambahan / Bonus (hanya bila > 0) */}
                        {bonusCreditsCount > 0 && (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.03] px-4 py-3">
                            <div className="min-w-0">
                              <div className="text-[13.5px] font-medium text-zinc-900 dark:text-zinc-100">
                                Kredit Tambahan / Bonus
                              </div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                Saldo permanen, tidak ter-reset saat pergantian hari
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-zinc-950 dark:text-white tabular-nums shrink-0">
                              +{bonusCreditsCount} kredit
                            </span>
                          </div>
                        )}

                        {/* Info Reset Harian */}
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 pt-3 border-t border-zinc-200/70 dark:border-white/[0.06]">
                          <Clock className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                          <span>Kuota harian direset otomatis setiap hari pukul 00.00 WIB.</span>
                        </div>

                        {/* Aksi Lanjutan */}
                        <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {isProPlan
                              ? "Lihat detail seluruh paket dan kapasitas Axioma."
                              : "Butuh kapasitas lebih besar? Lihat paket Pro & Top-Up."}
                          </span>
                          <button
                            type="button"
                            onClick={openSubscriptionModal}
                            className="h-9 px-4 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] cursor-pointer shrink-0"
                          >
                            <span>{isProPlan ? "Lihat Rincian Paket" : "Upgrade ke Pro — Segera Hadir"}</span>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#141416] p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Status Paket
                          </span>
                          <span className="border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full">
                            MODE TAMU
                          </span>
                        </div>
                        <div className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white tabular-nums">
                          {Math.max(0, GUEST_MAX_MESSAGES - guestMessageCount)} / {GUEST_MAX_MESSAGES} pesan tersisa
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-zinc-200/90 dark:bg-white/[0.08] overflow-hidden">
                          <div
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  Math.round(
                                    ((GUEST_MAX_MESSAGES - guestMessageCount) /
                                      GUEST_MAX_MESSAGES) *
                                      100
                                  )
                                )
                              )}%`,
                            }}
                            className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
                          />
                        </div>
                        <p className="text-[13.5px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                          Mode Tamu dibatasi maksimal {GUEST_MAX_MESSAGES} pesan gratis. Masuk ke akun Anda untuk mendapatkan 30 kredit harian yang direset otomatis pukul 00.00 WIB.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsAuthModalOpen(true)}
                          className="h-9 px-4 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[13px] font-medium transition-colors cursor-pointer"
                        >
                          Hubungkan Akun
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {desktopSettingsPage === "notifications" && (
                  <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
                    <div className="py-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                          Notifikasi Dalam Aplikasi
                        </div>
                        <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Umpan balik singkat seperti penyalinan teks, penghapusan sesi, dan status mikrofon ditampilkan langsung di ruang kerja.
                        </div>
                      </div>
                      <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300 shrink-0">
                        Aktif
                      </span>
                    </div>
                  </div>
                )}

                {desktopSettingsPage === "agent" && (
                  <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
                    {AVAILABLE_AGENTS.map((agent) => {
                      const isChecked = defaultAgentId === agent.id;
                      return (
                        <label
                          key={agent.id}
                          className="py-4 flex items-center justify-between gap-4 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <input
                              type="radio"
                              name="desktopDefaultAgent"
                              value={agent.id}
                              checked={isChecked}
                              onChange={() => handleSelectDefaultAgent(agent.id)}
                              className="w-4 h-4 accent-zinc-900 dark:accent-white cursor-pointer shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                                {agent.name}
                              </div>
                              <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {agent.description}
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium shrink-0">
                            {agent.tag}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {desktopSettingsPage === "storage" && (
                  <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
                    <div className="py-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                          Mode Penyimpanan Saat Ini
                        </div>
                        <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {authUser
                            ? "Riwayat percakapan disinkronkan secara aman ke cloud dan cache lokal."
                            : "Riwayat percakapan hanya disimpan di penyimpanan lokal peramban ini."}
                        </div>
                      </div>
                      <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 shrink-0">
                        {authUser ? "Cloud & Lokal" : "Hanya Lokal"}
                      </span>
                    </div>

                    <div className="py-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[15px] font-medium text-red-600 dark:text-red-400">
                          Hapus semua percakapan
                        </div>
                        <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Menghapus seluruh riwayat chat dari perangkat{authUser ? " dan akun Anda" : ""}.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsClearAllConfirmOpen(true)}
                        className="px-4 py-2 rounded-xl text-[13px] font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/25 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  </div>
                )}

                {desktopSettingsPage === "shortcuts" && (
                  <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
                    {[
                      { label: "Cari percakapan", keys: isMacOs ? "⌘ K" : "Ctrl+K" },
                      { label: "Percakapan baru", keys: isMacOs ? "⌘ ⇧ O" : "Ctrl+Shift+O" },
                      { label: "Hentikan balasan", keys: "Esc" },
                      { label: "Kirim pesan", keys: "Enter" },
                      { label: "Baris baru", keys: "Shift + Enter" },
                    ].map((item) => (
                      <div key={item.label} className="py-4 flex items-center justify-between">
                        <span className="text-[15px] font-medium text-zinc-800 dark:text-zinc-200">{item.label}</span>
                        <kbd className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#161618] border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {item.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                )}

                {desktopSettingsPage === "theme" && (
                  <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06]">
                    {(
                      [
                        { value: "system", label: "Default sistem", desc: "Mengikuti pengaturan tampilan perangkat Anda secara otomatis." },
                        { value: "dark", label: "Gelap", desc: "Tampilan gelap tenang untuk fokus di kondisi cahaya redup." },
                        { value: "light", label: "Terang", desc: "Kanvas terang hangat dengan kontras editorial yang tajam." },
                      ] as const
                    ).map((opt) => {
                      const isActive = themeMode === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSetTheme(opt.value)}
                          className="w-full py-4 flex items-center justify-between gap-4 text-left cursor-pointer group"
                        >
                          <div>
                            <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                              {opt.label}
                            </div>
                            <div className="text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {opt.desc}
                            </div>
                          </div>
                          {isActive && (
                            <Check className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0" strokeWidth={1.75} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {desktopSettingsPage === "feedback" && (
                  <FeedbackSettingsView
                    inline
                    defaultEmail={authUser?.email || ""}
                    userName={userName}
                    onBack={() => setDesktopSettingsPage(null)}
                    onClose={() => setDesktopSettingsPage(null)}
                  />
                )}

                {desktopSettingsPage === "about" && (
                  <AboutSettingsView
                    inline
                    onBack={() => setDesktopSettingsPage(null)}
                    onClose={() => setDesktopSettingsPage(null)}
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Empty State Center View (< md) */}
              {showEmptyDecorations &&
                !hasMessages &&
                !(
                  isChatAreaLoading &&
                  Boolean(initialChatId || (activeChatId && activeChatId !== "new-chat"))
                ) && (
                  <div
                    className={`md:hidden flex-1 min-h-0 w-full overflow-hidden flex flex-col items-center justify-center px-5 -mt-6 text-center pointer-events-none ${
                      isEmptyDecorationsExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
                    }`}
                  >
                    <div className="w-full max-w-[340px] mx-auto flex flex-col items-center">
                      {/* Clean Brand Logo */}
                      <div className="mb-3.5 flex items-center justify-center animate-axioma-fade-up select-none">
                        <AxiomaLogoMark className="w-10 h-10" />
                      </div>

                      {/* Sapaan Personal Kontekstual Minimalis */}
                      <h1
                        style={{ animationDelay: "60ms" }}
                        className="font-heading text-[22px] font-medium leading-[1.3] tracking-[-0.02em] text-zinc-900 dark:text-zinc-100 text-center text-balance animate-axioma-fade-up select-none"
                      >
                        {contextualGreeting}
                      </h1>
                    </div>
                  </div>
                )}

              {/* Active State History with Smooth Message Entrance Animations */}
          <div
            key={activeChatId}
            ref={scrollRef}
            onScroll={handleChatScroll}
            className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain overscroll-contain touch-auto [-webkit-overflow-scrolling:touch] scrollbar-none transition-opacity duration-300 ease-out animate-cross-fade will-change-transform ${
              hasMessages || isLoadingExistingChat
                ? "opacity-100 pt-4 md:pt-6 pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))] md:pb-44 px-3.5 md:px-6 flex"
                : "hidden"
            } w-full max-w-none md:max-w-[720px] md:mx-auto flex-col gap-6`}
          >
            {isChatAreaLoading &&
              currentMessages.length === 0 &&
              Boolean(initialChatId || (activeChatId && activeChatId !== "new-chat")) && (
                <div
                  role="status"
                  aria-label="Memuat percakapan"
                  className="space-y-6 pt-2"
                >
                  <div className="flex justify-end">
                    <div className="w-56 sm:w-72 h-11 rounded-2xl bg-border-subtle/80 border border-border-subtle animate-pulse" />
                  </div>
                  <div className="flex justify-start">
                    <div className="w-full max-w-xl space-y-2.5">
                      <div className="h-4 w-3/4 rounded bg-border-subtle/80 animate-pulse" />
                      <div className="h-4 w-full rounded bg-border-subtle/70 animate-pulse" />
                      <div className="h-4 w-5/6 rounded bg-border-subtle/60 animate-pulse" />
                      <div className="h-24 w-full rounded-xl bg-border-subtle/50 border border-border-subtle animate-pulse mt-3" />
                    </div>
                  </div>
                </div>
              )}

            {currentMessages.map((message) => {
              if (message.sender === "user") {
                const isEditingThis = editingUserMsgId === message.id;
                const msgMs = message.created_at ? new Date(message.created_at).getTime() : 0;
                const isRecentMsg =
                  Boolean(clientNow && msgMs && !isNaN(msgMs) && clientNow.getTime() - msgMs < 60 * 60 * 1000);
                const userTime = isRecentMsg
                  ? formatRelativeTimeId(msgMs, clientNow)
                  : formatMessageTime(message.created_at);

                if (isEditingThis) {
                  return (
                    <div
                      key={message.id}
                      className="w-full flex justify-end animate-user-bubble my-0 sm:my-1"
                    >
                      <div className="w-full max-w-[85%] lg:max-w-[70%] p-3 rounded-2xl bg-bg-elevated border border-border-strong shadow-xl space-y-2">
                        <textarea
                          ref={editUserTextareaRef}
                          value={editingUserMsgText}
                          onChange={(e) => setEditingUserMsgText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (editingUserMsgText.trim() && !isSubmittingEdit) {
                                void handleSubmitEditUserMessage(message.id, editingUserMsgText);
                              }
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              handleCancelEditUserMessage();
                            }
                          }}
                          rows={Math.max(2, editingUserMsgText.split("\n").length)}
                          className="w-full bg-transparent text-text-primary text-base md:text-sm leading-relaxed resize-none focus:outline-none"
                          autoFocus
                          aria-label="Edit pesan pengguna"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border-subtle">
                          <button
                            type="button"
                            onClick={handleCancelEditUserMessage}
                            className="min-h-[40px] lg:min-h-0 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary bg-bg-surface hover:bg-bg-subtle hover:text-text-primary border border-border-subtle transition-colors cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={!editingUserMsgText.trim() || isSubmittingEdit}
                            onClick={() => handleSubmitEditUserMessage(message.id, editingUserMsgText)}
                            className="min-h-[40px] lg:min-h-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-text-primary text-bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                          >
                            {isSubmittingEdit ? "Menyimpan…" : "Kirim"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    style={{ animationDuration: "280ms" }}
                    className="w-full flex justify-end animate-axioma-fade-up group relative my-0 sm:my-0.5"
                  >
                    <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] lg:max-w-[70%]">
                      {/* Attachments rendering */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-col gap-2 mb-1.5 w-full items-end">
                          {/* Images Grid */}
                          {message.attachments.filter((a) => a.mime_type.startsWith("image/")).length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-full">
                              {message.attachments
                                .filter((a) => a.mime_type.startsWith("image/"))
                                .map((att) => (
                                  <div
                                    key={att.id}
                                    onClick={() => setLightboxImage({ url: att.signed_url || "", name: att.original_name })}
                                    className="relative group/img overflow-hidden rounded-xl border border-border-subtle bg-bg-surface cursor-pointer shadow-sm hover:ring-2 hover:ring-border-strong transition-all"
                                  >
                                    <img
                                      src={att.signed_url}
                                      alt={att.original_name}
                                      loading="lazy"
                                      onError={() => void handleImageLoadError(att, message.id)}
                                      className="max-h-60 max-w-full w-auto object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-[1.02]"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                      <Eye className="w-5 h-5 text-white drop-shadow" />
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* PDFs List */}
                          {message.attachments
                            .filter((a) => a.mime_type === "application/pdf")
                            .map((att) => (
                              <a
                                key={att.id}
                                href={att.signed_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={att.original_name}
                                className="flex items-center gap-3 p-3 rounded-xl bg-bg-surface border border-border-subtle hover:border-border-strong hover:bg-bg-elevated transition-all group/pdf max-w-full"
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

                      {/* Text bubble */}
                      {message.content && message.content !== "(Lampiran)" && (
                        <div className="relative min-w-0 max-w-full overflow-hidden px-4 py-2.5 rounded-[20px] rounded-br-[6px] bg-zinc-900 text-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 text-[15.5px] leading-[1.6] tracking-[-0.005em] shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none border border-zinc-900/10 dark:border-white/[0.06] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {message.content}
                        </div>
                      )}

                      {/* Compact timestamp + copy/edit actions underneath user bubble */}
                      <div className="flex items-center gap-2 mt-1.5 text-zinc-500 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                        {userTime && (
                          <span className="text-[11.5px] font-normal text-zinc-500 select-none tabular-nums">
                            {userTime}
                          </span>
                        )}
                        <div className="relative flex items-center">
                          <button
                            type="button"
                            onClick={() => handleCopy(message.content, `user-${message.id}`, 1500)}
                            title="Salin pesan"
                            aria-label="Salin pesan pengguna"
                            className="min-w-[40px] min-h-[40px] lg:min-w-0 lg:min-h-0 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.96] transition-all duration-200 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
                          >
                            {copiedId === `user-${message.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                            ) : (
                              <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                            )}
                          </button>
                          {copiedId === `user-${message.id}` && (
                            <span className="absolute right-full mr-1.5 px-2 py-0.5 rounded-md bg-zinc-900 text-white border border-zinc-800 dark:bg-white dark:text-zinc-950 dark:border-zinc-200 text-[11px] font-medium whitespace-nowrap shadow-md animate-in fade-in zoom-in-95 duration-150 z-30 flex items-center gap-1 pointer-events-none">
                              <Check className="w-3 h-3 text-white dark:text-zinc-950" strokeWidth={1.75} />
                              <span>Disalin</span>
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartEditUserMessage(message)}
                          title="Edit pesan"
                          aria-label="Edit pesan pengguna"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.96] transition-all duration-200 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
                        >
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              if (message.isError) {
                const lastUserMsgBeforeError = [...currentMessages]
                  .reverse()
                  .find((m) => m.sender === "user" && m.content.trim());
                return (
                  <div
                    key={message.id}
                    className="flex justify-start animate-error-shake w-full"
                  >
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
                      {(message.retryPayload || lastUserMsgBeforeError) && (
                        <div className="pt-0.5">
                          <button
                            type="button"
                            disabled={isLoading || isGenerating}
                            onClick={() => {
                              if (message.retryPayload) {
                                handleRetry(message.id, message.retryPayload);
                              } else if (lastUserMsgBeforeError) {
                                void handleSendMessage(lastUserMsgBeforeError.content);
                              }
                            }}
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

              const msgFeedback = feedback[message.id]?.rating;
              const isStreamingThisMessage = streamingMessageId === message.id;

              return (
                <div
                  key={message.id}
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

                    {(() => {
                      const checklistMatches = message.content.match(
                        /^\s*[-*+]\s+\[([ xX])\]/gm
                      );
                      const checklistDefaults = checklistMatches
                        ? checklistMatches.map((m) => /\[[xX]\]/.test(m))
                        : [];
                      let checkboxRenderIdx = 0;
                      const savedMap = checklistState[message.id] || {};
                      const completedCount = checklistDefaults.reduce(
                        (acc, defChecked, idx) =>
                          acc + ((savedMap[idx] ?? defChecked) ? 1 : 0),
                        0
                      );

                      if (message.lensData) {
                        return (
                          <div
                            data-ai-message-id={message.id}
                            onMouseUp={() =>
                              handleAiMessageTextSelect(message.id, message.content)
                            }
                          >
                            <AxiomaLensCard data={message.lensData} />
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          <div
                            data-ai-message-id={message.id}
                            onMouseUp={() =>
                              handleAiMessageTextSelect(message.id, message.content)
                            }
                            className={`axioma-markdown w-full max-w-full sm:max-w-[70ch] min-w-0 font-normal text-zinc-900 dark:text-zinc-100 text-[15.5px] leading-[1.7] tracking-[-0.005em] break-words transition-opacity duration-200 ${
                              isStreamingThisMessage ? "streaming-prose" : ""
                            }`}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={{
                                p({ node, children, ...props }) {
                                  const hasBlockChild = (n: any): boolean => {
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
                                  };
                                  if (hasBlockChild(node)) {
                                    return <div className="my-2">{children}</div>;
                                  }
                                  return <p {...props}>{children}</p>;
                                },
                                input({ type, checked, ...props }) {
                                  if (type === "checkbox") {
                                    const currentIdx = checkboxRenderIdx++;
                                    const isChecked =
                                      savedMap[currentIdx] ?? Boolean(checked);
                                    return (
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={false}
                                        onChange={() =>
                                          handleToggleChecklistItem(
                                            message.id,
                                            currentIdx,
                                            isChecked
                                          )
                                        }
                                        aria-label={`Tandai langkah ${currentIdx + 1}`}
                                        className="mr-2 align-middle h-3.5 w-3.5 rounded border border-zinc-400 dark:border-zinc-600 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                                      />
                                    );
                                  }
                                  return <input type={type} checked={checked} {...props} />;
                                },
                                pre({ children }) {
                            return (
                              <PreBlockContext.Provider value={true}>
                                {children}
                              </PreBlockContext.Provider>
                            );
                          },
                          code({ className, children, ...props }) {
                            return (
                              <PreBlockContext.Consumer>
                                {(isInsidePre) => {
                                  const match = /language-([\w+-]+)/.exec(className || "");
                                  const rawCode = String(children ?? "").replace(/\n$/, "");
                                  const isBlockCode =
                                    isInsidePre || Boolean(match) || rawCode.includes("\n");

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
                                      isStreaming={isStreamingThisMessage}
                                      onCopy={() => handleCopy(rawCode, copyKey, 1800)}
                                      isCopied={copiedId === copyKey}
                                      onRunPreview={(htmlCode) => setLivePreviewCode(htmlCode)}
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
                                onOpenLightbox={(url, name) => setLightboxImage({ url, name })}
                              />
                            );
                          },
                        }}
                      >
                        {sanitizeAxiomaMessageContent(message.content)}
                      </ReactMarkdown>

                      {/* Render structured media payload directly when returned separately from markdown */}
                      {message.imageUrl && !message.content.includes(message.imageUrl) && (
                        <AiImageCard
                          src={message.imageUrl}
                          alt={message.mediaTitle || "Visual Axioma"}
                          onOpenLightbox={(url, name) => setLightboxImage({ url, name })}
                        />
                      )}
                      {message.videoUrl && !message.content.includes(message.videoUrl) && (
                        <AiVideoCard
                          src={message.videoUrl}
                          title={message.mediaTitle || "Adegan Video"}
                        />
                      )}
                    </div>

                          {/* Stage 7: Compact Interactive Checklist Progress Indicator */}
                          {checklistDefaults.length > 0 && !isStreamingThisMessage && (
                            <div className="flex items-center gap-2.5 max-w-xs pt-0.5 select-none">
                              <div className="flex-1 h-1 rounded-full bg-black/[0.08] dark:bg-white/[0.08] overflow-hidden">
                                <div
                                  className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-200"
                                  style={{
                                    width: `${Math.round(
                                      (completedCount / checklistDefaults.length) * 100
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[11px] font-medium text-text-muted tabular-nums shrink-0">
                                {completedCount}/{checklistDefaults.length} selesai
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Message Action Icons: fade-in after streaming finishes */}
                    <div
                      aria-hidden={isStreamingThisMessage}
                      className={`w-full flex items-center gap-2 pt-0.5 transition-[opacity,transform] duration-200 ease-out motion-safe-transform ${
                        isStreamingThisMessage
                          ? "opacity-0 translate-y-1 pointer-events-none select-none"
                          : "opacity-100 translate-y-0"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 -ml-1.5 text-zinc-500 dark:text-zinc-400 transition-opacity duration-200">
                        {/* 1. Primary Action: Salin (Copy) */}
                        <div className="relative flex items-center">
                          <button
                            type="button"
                            onClick={() => handleCopy(sanitizeAxiomaMessageContent(message.content), message.id, 1500)}
                            title={copiedId === message.id ? "Disalin" : "Salin jawaban"}
                            className="min-h-[40px] lg:min-h-0 px-2 py-1.5 rounded-lg text-xs font-medium tracking-tight text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.96] transition-all duration-200 cursor-pointer inline-flex items-center gap-1 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
                            aria-label="Salin teks"
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 shrink-0" strokeWidth={1.75} />
                                <span className="text-zinc-900 dark:text-zinc-100">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* 2. Primary Action: Salin WA */}
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              formatForWhatsApp(sanitizeAxiomaMessageContent(message.content)),
                              `wa-${message.id}`,
                              1500
                            )
                          }
                          title={copiedId === `wa-${message.id}` ? "Tersalin untuk WhatsApp" : "Salin format siap WhatsApp"}
                          aria-label="Salin untuk WhatsApp"
                          className="min-h-[40px] lg:min-h-0 px-2 py-1.5 rounded-lg text-xs font-medium tracking-tight text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.96] transition-all duration-200 cursor-pointer inline-flex items-center gap-1 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
                        >
                          {copiedId === `wa-${message.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 shrink-0" strokeWidth={1.75} />
                              <span className="text-zinc-900 dark:text-zinc-100">Tersalin</span>
                            </>
                          ) : (
                            <span>Salin WA</span>
                          )}
                        </button>

                        {/* 3. Secondary Actions Overflow Menu (···) */}
                        <div className="relative" data-ai-action-menu="true">
                          <button
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={openAiActionMenuId === message.id}
                            aria-label="Aksi lainnya"
                            title="Aksi lainnya"
                            onClick={() =>
                              setOpenAiActionMenuId((prev) =>
                                prev === message.id ? null : message.id
                              )
                            }
                            className={`min-w-[36px] min-h-[40px] lg:min-w-0 lg:min-h-0 p-1.5 rounded-lg active:scale-[0.96] transition-all duration-200 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60 ${
                              openAiActionMenuId === message.id
                                ? "bg-zinc-200/80 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
                          </button>

                          {openAiActionMenuId === message.id && (
                            <div
                              role="menu"
                              aria-label="Aksi tambahan balasan"
                              className="ios-glass absolute right-0 sm:left-0 sm:right-auto bottom-full mb-1.5 z-40 min-w-[184px] rounded-xl p-1 bg-white/95 dark:bg-[#0e0e10]/95 border border-zinc-200 dark:border-white/[0.08] shadow-xl animate-axioma-scale-in"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                disabled={isLoading || isGenerating}
                                onClick={() => {
                                  setOpenAiActionMenuId(null);
                                  handleBranchFromMessage(message.id);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <GitBranch className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                                <span>Cabang</span>
                              </button>

                              <button
                                type="button"
                                role="menuitem"
                                disabled={isLoading || isGenerating}
                                onClick={() => {
                                  setOpenAiActionMenuId(null);
                                  void handleSendMessage(
                                    "Lanjutkan penjelasan sebelumnya secara langsung dan runtut dari poin terakhir tanpa mengulang."
                                  );
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <CornerDownRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                                <span>Lanjutkan</span>
                              </button>

                              <button
                                type="button"
                                role="menuitem"
                                disabled={isLoading || isGenerating}
                                onClick={() => {
                                  setOpenAiActionMenuId(null);
                                  handleRegenerateLastReply(message.id);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <RotateCw className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                                <span>Ulangi</span>
                              </button>

                              <div className="border-t border-zinc-200 dark:border-white/[0.08] my-1" />

                              <div className="grid grid-cols-2 gap-1">
                                <button
                                  type="button"
                                  role="menuitem"
                                  aria-pressed={msgFeedback === "up"}
                                  onClick={() => {
                                    setOpenAiActionMenuId(null);
                                    void handleFeedback(message.id, "up");
                                  }}
                                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                                    msgFeedback === "up"
                                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                                      : "text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08]"
                                  }`}
                                >
                                  <ThumbsUp className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                                  <span>Bagus</span>
                                </button>

                                <button
                                  type="button"
                                  role="menuitem"
                                  aria-pressed={msgFeedback === "down"}
                                  onClick={() => {
                                    setOpenAiActionMenuId(null);
                                    void handleFeedback(message.id, "down");
                                  }}
                                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                                    msgFeedback === "down"
                                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                                      : "text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08]"
                                  }`}
                                >
                                  <ThumbsDown className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                                  <span>Kurang</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {feedbackSavedNoticeId === message.id && (
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 pl-1">
                            Masukan tersimpan ✓
                          </span>
                        )}
                        {structuredFeedbackThanksId === message.id && (
                          <span className="text-[11px] text-text-muted pl-1">
                            Terima kasih
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Adaptive Answer Quick Chips (only under the latest non-error AI reply when idle) */}
                    {(() => {
                      const lastAiMsg = [...currentMessages]
                        .reverse()
                        .find((m) => m.sender === "ai" && !m.isError);
                      const isLatestAiReply = lastAiMsg?.id === message.id;
                      if (!isLatestAiReply || isStreamingThisMessage || isLoading || isGenerating) {
                        return null;
                      }
                      return (
                        <div
                          role="group"
                          aria-label="Tindakan lanjutan cepat"
                          className="flex flex-wrap items-center gap-1.5 pt-1.5"
                        >
                          {ADAPTIVE_ANSWER_ACTIONS.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              onClick={() =>
                                void handleSendMessage(action.prompt, {
                                  taskBreakdownMode: action.taskBreakdownMode,
                                })
                              }
                              className="px-2.5 py-1 rounded-full text-[11px] font-medium tracking-tight bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] dark:border-white/[0.08] transition-colors cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Optional input "Apa yang kurang?" when 👎 is selected (1c, Item 5 + Stage 6 quick reason chips) */}
                    {openFeedbackCommentId === message.id && msgFeedback === "down" && (
                      <div className="rounded-xl bg-bg-elevated border border-border-subtle p-2.5 space-y-2 max-w-md">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(["Terlalu panjang", "Salah konteks", "Bahasa kaku"] as const).map(
                            (reason) => (
                              <button
                                key={reason}
                                type="button"
                                onClick={() =>
                                  void handleSendStructuredFeedback(message.id, "down", reason)
                                }
                                className="px-2.5 py-1 rounded-full text-[11px] font-medium text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-bg-surface transition-colors cursor-pointer"
                              >
                                {reason}
                              </button>
                            )
                          )}
                        </div>
                        <label
                          htmlFor={`feedback-comment-${message.id}`}
                          className="block text-xs font-medium text-text-secondary"
                        >
                          Apa yang kurang? <span className="text-text-muted">(opsional, maks 1.000 karakter)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id={`feedback-comment-${message.id}`}
                            type="text"
                            maxLength={1000}
                            value={feedbackCommentDraft[message.id] || ""}
                            onChange={(e) =>
                              setFeedbackCommentDraft((prev) => ({
                                ...prev,
                                [message.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void handleSubmitFeedbackComment(message.id);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                setOpenFeedbackCommentId(null);
                              }
                            }}
                            placeholder="Misal: kurang akurat, terlalu panjang..."
                            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-bg-surface border border-border-subtle text-[16px] md:text-[15px] lg:text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
                          />
                          <button
                            type="button"
                            onClick={() => void handleSubmitFeedbackComment(message.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-text-primary hover:opacity-90 text-bg-primary text-xs font-medium transition-opacity cursor-pointer shrink-0"
                          >
                            Kirim
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenFeedbackCommentId(null)}
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
            })}

            {/* AI Thinking Indicator with Wave Dots + Shimmer Skeleton Loader */}
            {showThinkingIndicator && (() => {
              const currentChat = chats.find((c) => c.id === activeChatId);
              const lastUserMsgObj = currentChat?.messages
                ?.filter((m) => m.sender === "user")
                .slice(-1)[0];
              const lastUserMsg = lastUserMsgObj?.content || "";
              const lastUserHasAttachment = Boolean(lastUserMsgObj?.attachments?.length);
              const mediaIntent = detectMediaIntent(lastUserMsg, lastUserHasAttachment);
              const isImagePending =
                activeLoadingContext === "image" ||
                activeMediaModeRef.current === "image" ||
                (!lastUserHasAttachment && mediaIntent.type === "image");
              const isVideoPending =
                activeLoadingContext === "video" ||
                activeMediaModeRef.current === "video" ||
                (!lastUserHasAttachment && mediaIntent.type === "video");

              let thinkingText = "Menyusun jawaban...";
              if (activeLoadingContext === "pdf") {
                thinkingText = "Membaca struktur dokumen PDF...";
              } else if (activeLoadingContext === "vision") {
                thinkingText = "Mengekstrak informasi dari gambar...";
              } else if (isImagePending) {
                thinkingText = "Membuat gambar sesuai permintaan...";
              } else if (isVideoPending) {
                thinkingText = "Menyiapkan video sesuai permintaan...";
              } else if (activeLoadingContext === "lens" || thinkingMode === "critical") {
                thinkingText = "Menganalisis peluang & celah...";
              } else if (waitingSeconds >= 25) {
                thinkingText =
                  "Jawaban panjang butuh waktu lebih lama. Anda bisa menekan Stop kapan saja.";
              }

              return (
                <div
                  role="status"
                  aria-live="polite"
                  className={`flex flex-col gap-2.5 justify-start transition-[opacity,transform] duration-200 ease-out motion-safe-transform ${
                    isThinkingFadingOut
                      ? "opacity-0 -translate-y-1 pointer-events-none"
                      : "opacity-100 translate-y-0 animate-axioma-fade-up"
                  }`}
                >
                  <div className="flex items-center gap-2.5 px-1 py-1">
                    {isImagePending ? (
                      <div className="w-6 h-6 rounded-md bg-zinc-200/70 border border-zinc-300/80 dark:bg-white/[0.06] dark:border-white/10 flex items-center justify-center shrink-0">
                        <Palette className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 animate-axioma-breathe" strokeWidth={1.5} />
                      </div>
                    ) : isVideoPending ? (
                      <div className="w-6 h-6 rounded-md bg-zinc-200/70 border border-zinc-300/80 dark:bg-white/[0.06] dark:border-white/10 flex items-center justify-center shrink-0">
                        <Video className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 animate-axioma-breathe" strokeWidth={1.5} />
                      </div>
                    ) : (
                      <AxiomaLogoMark className="w-5 h-5 shrink-0 animate-axioma-breathe" />
                    )}
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 animate-pulse select-none">
                      {thinkingText}
                    </span>
                  </div>

                  {/* Elegant Skeleton Shimmer Box during visual/video rendering */}
                  {(isImagePending || isVideoPending) && (
                    <div className="ml-0 sm:ml-9 w-full max-w-[340px] sm:max-w-[440px] aspect-video rounded-2xl bg-zinc-100 border border-zinc-200 dark:bg-zinc-900/80 dark:border-white/10 overflow-hidden relative p-4 flex flex-col justify-between shadow-sm dark:shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isImagePending ? (
                            <Palette className="w-4 h-4 text-zinc-600 dark:text-zinc-400 animate-pulse" strokeWidth={1.5} />
                          ) : (
                            <Video className="w-4 h-4 text-zinc-600 dark:text-zinc-400 animate-pulse" strokeWidth={1.5} />
                          )}
                          <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                            {isImagePending ? "Studio Visual" : "Studio Video"}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-500 animate-pulse">Memproses...</span>
                      </div>
                      <div className="w-full space-y-1.5">
                        <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
                          <div className="w-2/5 h-full rounded-full bg-zinc-500 dark:bg-zinc-400 animate-pulse" />
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-500 text-right">
                          {isImagePending
                            ? "Membuat gambar sesuai permintaan..."
                            : "Menyiapkan video sesuai permintaan..."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} className="h-6 shrink-0" />
          </div>

          {/* Input Console (Rounded floating card on Mobile & Desktop with iPhone safe-area bottom) */}
          <div
            className={`w-full bg-transparent px-3 sm:px-4 md:px-6 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-3 [[data-kb="open"]_&]:pt-1.5 ${
              hasMessages
                ? "absolute bottom-0 inset-x-0 z-20 pointer-events-none"
                : isDesktopEmptyState
                ? "relative z-20 shrink-0 md:shrink md:flex-1 md:min-h-0 md:overflow-y-auto scrollbar-none overscroll-y-contain md:flex md:flex-col"
                : "relative z-20 shrink-0"
            }`}
          >
            {/* Floating "Scroll to Bottom" button anchored dynamically above input box (parent kept free of opacity/scale for Safari iOS backdrop-filter) */}
            {hasMessages && (
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-30">
                <button
                  type="button"
                  tabIndex={isUserScrolledUp ? 0 : -1}
                  aria-hidden={!isUserScrolledUp}
                  onClick={() => scrollToBottom(true)}
                  title="Kembali ke pesan terbaru"
                  aria-label="Gulir ke bawah"
                  className={`ios-glass w-10 h-10 min-w-[40px] min-h-[40px] rounded-full text-zinc-800 dark:text-zinc-100 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe-transform active:scale-[0.96] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60 ${
                    isUserScrolledUp
                      ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                      : "opacity-0 translate-y-2 scale-90 pointer-events-none"
                  }`}
                >
                  <ArrowDown className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            )}
            <div
              className={`w-full max-w-[680px] lg:max-w-[720px] mx-auto flex flex-col items-center ${
                isDesktopEmptyState ? "md:flex-1 md:justify-center" : ""
              }`}
            >
              <div
                className={`relative w-full flex flex-col items-center ${
                  isDesktopEmptyState ? "md:-mt-8" : ""
                }`}
              >
                {/* Desktop Empty State Hero (>= md) */}
                {isDesktopEmptyState && (
                  <div className="hidden md:flex flex-col items-center text-center pointer-events-none select-none w-full mb-6">
                    <div className="mb-3.5 flex items-center justify-center animate-axioma-fade-up">
                      <AxiomaLogoMark className="w-10 h-10" />
                    </div>
                    {isChatAreaLoading ? (
                      <div
                        role="status"
                        aria-label="Memuat ruang kerja"
                        className="flex flex-col items-center"
                      >
                        <div className="h-8 w-[320px] rounded-xl bg-border-subtle animate-pulse" />
                      </div>
                    ) : (
                      <h1
                        style={{ animationDelay: "60ms" }}
                        className="font-heading text-[26px] font-medium leading-[1.3] tracking-[-0.02em] text-zinc-900 dark:text-zinc-100 text-center text-balance animate-axioma-fade-up"
                      >
                        {contextualGreeting}
                      </h1>
                    )}
                  </div>
                )}


                {/* Pending Attachment Chips Preview */}
                {pendingAttachments.length > 0 && (
                  <div className="pointer-events-auto flex items-center gap-2 mb-2 p-1.5 overflow-x-auto max-w-full scrollbar-none animate-fade-in">
                    {pendingAttachments.map((att) => (
                      <div
                        key={att.id}
                        className={`relative group shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs max-w-[220px] transition-all shadow-xs ${
                          att.status === "error"
                            ? "bg-red-950/20 border-red-500/50 text-red-200"
                            : "bg-bg-elevated border-border-subtle text-text-primary"
                        }`}
                      >
                        {att.type === "image" && att.previewUrl ? (
                          <img
                            src={att.previewUrl}
                            alt={att.name}
                            className="w-8 h-8 rounded-lg object-cover shrink-0 border border-border-subtle"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-red-500" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-text-primary" title={att.name}>
                            {att.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                            {att.status === "compressing" && <span>Mengompresi…</span>}
                            {att.status === "uploading" && <span>Unggah {att.progress}%</span>}
                            {att.status === "ready" && <span>{formatFileSize(att.size)} · Siap</span>}
                            {att.status === "error" && (
                              <span className="text-red-400 truncate" title={att.error}>
                                {att.error || "Gagal"}
                              </span>
                            )}
                          </div>
                        </div>

                        {att.status === "error" ? (
                          <button
                            type="button"
                            onClick={() => handleRetryAttachment(att.id)}
                            className="p-1 rounded-md text-red-300 hover:text-red-100 hover:bg-red-900/30 transition-colors cursor-pointer"
                            title="Coba lagi"
                            aria-label="Coba lagi unggah berkas"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="p-1 rounded-md text-icon-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
                          title="Hapus lampiran"
                          aria-label="Hapus lampiran"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        {att.status === "uploading" && (
                          <div className="absolute left-0 bottom-0 right-0 h-0.5 bg-border-subtle rounded-b-xl overflow-hidden">
                            <div
                              className="h-full bg-text-primary transition-all duration-150"
                              style={{ width: `${att.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Offline Status Thin Banner (Item 5) */}
                {!isOnline && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex items-center justify-center gap-2 py-1.5 px-3 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-medium animate-fade-in select-none"
                  >
                    <WifiOff className="w-3.5 h-3.5 shrink-0" />
                    <span>Koneksi internet terputus</span>
                  </div>
                )}

                {/* Active Media Generation Mode Badge */}
                {activeMediaMode && (
                  <div className="pointer-events-auto flex items-center gap-2 mb-2 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-900 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-200 w-fit animate-fade-in shadow-sm dark:shadow-md select-none">
                    {activeMediaMode === "image" ? (
                      <Palette className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />
                    ) : (
                      <Video className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />
                    )}
                    <span className="text-xs font-medium">
                      {activeMediaMode === "image" ? "Mode Buat Gambar" : "Mode Buat Video"}
                    </span>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        setActiveMediaMode(null);
                        activeMediaModeRef.current = null;
                      }}
                      title="Batal mode media"
                      aria-label="Batal mode media"
                      className="ml-1 w-4 h-4 rounded-full hover:bg-zinc-200/80 dark:hover:bg-white/10 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Hidden Vision Image Input (<= 4MB) & Smart PDF Input (<= 8MB) */}
                <input
                  ref={visionInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={handleVisionFileChange}
                />
                <input
                  ref={smartPdfInputRef}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={handleVisionFileChange}
                />

                {/* Stage 8 & 9: Subtle Mode Privat & Requirement Lock Indicators */}
                {(isPrivateMode ||
                  (isRequirementLockEnabled && requirementLockItems.length > 0)) && (
                  <div className="max-w-[720px] mx-auto w-full mb-1.5 px-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 select-none">
                    {isPrivateMode && <span>Privat · Tidak disimpan</span>}
                    {isPrivateMode &&
                      isRequirementLockEnabled &&
                      requirementLockItems.length > 0 && <span>·</span>}
                    {isRequirementLockEnabled && requirementLockItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth >= 768) {
                            openDesktopSettingsPage("account");
                          } else {
                            setExpandedSettingsSection("account");
                            setIsSettingsModalOpen(true);
                          }
                        }}
                        className="pointer-events-auto hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        title="Kelola Kunci Syarat Proyek di Setelan"
                      >
                        {requirementLockItems.length} syarat terkunci
                      </button>
                    )}
                  </div>
                )}

                {/* Stage 9: Smart PDF Preview & Mode Selector Card */}
                {pendingPdfDoc && (
                  <div className="pointer-events-auto max-w-[720px] mx-auto w-full mb-2 rounded-2xl bg-white dark:bg-[#0e0e10] border border-zinc-200 dark:border-white/[0.08] p-2.5 flex items-start gap-3 shadow-lg">
                    <div className="relative shrink-0 w-11 h-11 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.04] flex items-center justify-center">
                      <FileText
                        className="w-5 h-5 text-zinc-700 dark:text-zinc-300"
                        strokeWidth={1.5}
                      />
                      <button
                        type="button"
                        onClick={() => setPendingPdfDoc(null)}
                        aria-label="Hapus dokumen PDF"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shadow cursor-pointer"
                      >
                        <X className="w-3 h-3" strokeWidth={1.75} />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                        <span className="font-medium truncate">
                          {pendingPdfDoc.fileName}
                        </span>
                        <span className="text-zinc-400 dark:text-zinc-500 shrink-0">
                          ·{" "}
                          {pendingPdfDoc.fileSizeBytes >= 1024 * 1024
                            ? `${(pendingPdfDoc.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
                            : `${Math.max(1, Math.round(pendingPdfDoc.fileSizeBytes / 1024))} KB`}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(
                          [
                            { code: "summary" as const, label: "Ringkas Eksekutif" },
                            { code: "glossary" as const, label: "Istilah Kunci" },
                            {
                              code: "critical_questions" as const,
                              label: "Prediksi Pertanyaan",
                            },
                            { code: "ask" as const, label: "Tanya PDF" },
                          ] as const
                        ).map((m) => {
                          const active = pendingPdfDoc.mode === m.code;
                          return (
                            <button
                              key={m.code}
                              type="button"
                              onClick={() =>
                                setPendingPdfDoc((prev) =>
                                  prev ? { ...prev, mode: m.code } : null
                                )
                              }
                              className={`px-2.5 py-1 rounded-full text-[11px] transition-colors cursor-pointer ${
                                active
                                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-medium"
                                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12]"
                              }`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage 8: Multimodal Vision Photo Preview & Mode Selector Card */}
                {pendingVisionPhoto && (
                  <div className="pointer-events-auto max-w-[720px] mx-auto w-full mb-2 rounded-2xl bg-white dark:bg-[#0e0e10] border border-zinc-200 dark:border-white/[0.08] p-2.5 flex items-center gap-3 shadow-lg">
                    <div className="relative shrink-0">
                      <img
                        src={pendingVisionPhoto.previewUrl}
                        alt={pendingVisionPhoto.name}
                        className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-white/[0.08]"
                      />
                      <button
                        type="button"
                        onClick={() => setPendingVisionPhoto(null)}
                        aria-label="Hapus foto"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shadow cursor-pointer"
                      >
                        <X className="w-3 h-3" strokeWidth={1.75} />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {pendingVisionPhoto.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(
                          [
                            { code: "notes" as const, label: "Ringkas Catatan" },
                            { code: "table" as const, label: "Buat Tabel" },
                            { code: "quiz" as const, label: "Soal Latihan" },
                            { code: "tasks" as const, label: "Ekstrak Tugas" },
                          ] as const
                        ).map((m) => {
                          const active = pendingVisionPhoto.mode === m.code;
                          return (
                            <button
                              key={m.code}
                              type="button"
                              onClick={() =>
                                setPendingVisionPhoto((prev) =>
                                  prev ? { ...prev, mode: m.code } : null
                                )
                              }
                              className={`px-2.5 py-1 rounded-full text-[11px] transition-colors cursor-pointer ${
                                active
                                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-medium"
                                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12]"
                              }`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Slash /langkah Mode Pill */}
                {pendingTaskBreakdown && (
                  <div className="pointer-events-auto flex items-center gap-1.5 mb-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 dark:bg-white/[0.08] dark:border-white/[0.1] dark:text-zinc-200 w-fit text-xs font-medium select-none">
                    <span>Mode Pecah Langkah</span>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setPendingTaskBreakdown(false)}
                      aria-label="Matikan mode pecah langkah"
                      className="w-4 h-4 rounded-full hover:bg-zinc-200/80 dark:hover:bg-white/10 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </div>
                )}

                {/* Stage 6: Slash Commands Mini Monochrome Popover (only renders when matching) */}
                {matchingSlashCommands.length > 0 && (
                  <div
                    role="listbox"
                    aria-label="Pintasan perintah cepat"
                    className="pointer-events-auto max-w-[720px] mx-auto w-full mb-2 rounded-2xl bg-white dark:bg-[#0e0e10] border border-zinc-200 dark:border-white/[0.08] p-1.5 space-y-0.5 shadow-lg"
                  >
                    {matchingSlashCommands.map((item, idx) => {
                      const isSelected = idx === slashMenuIndex;
                      return (
                        <button
                          key={item.cmd}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleApplySlashCommand(item.cmd);
                          }}
                          onMouseEnter={() => setSlashMenuIndex(idx)}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-medium"
                              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.06]"
                          }`}
                        >
                          <span className="font-mono font-medium">{item.cmd}</span>
                          <span
                            className={`text-[11px] truncate ${
                              isSelected
                                ? "text-zinc-300 dark:text-zinc-700"
                                : "text-zinc-500 dark:text-zinc-400"
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Stage 6: Prompt Enhancement Preview Card (only renders when preview exists) */}
                {enhancedPromptPreview && (
                  <div className="pointer-events-auto max-w-[720px] mx-auto w-full mb-2 rounded-2xl bg-white dark:bg-[#0e0e10] border border-zinc-200 dark:border-white/[0.08] p-3 space-y-2 shadow-lg">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        <PenLine className="w-3 h-3" strokeWidth={1.5} />
                        <span>Pratinjau Prompt Rapi</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setEnhancedPromptPreview(null)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setInputText(enhancedPromptPreview);
                            setEnhancedPromptPreview(null);
                            requestAnimationFrame(() => {
                              const el = textareaRef.current;
                              if (el) {
                                el.focus();
                                adjustTextareaHeight();
                              }
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
                        >
                          Pakai
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
                      {enhancedPromptPreview}
                    </p>
                  </div>
                )}

                {/* Axioma Organic Minimalist Input Box (rounded-[24px], 2-Row, Native iOS Glass) */}
                <div
                  style={!hasMessages ? { animationDelay: "120ms" } : undefined}
                  className={`group/input relative pointer-events-auto max-w-[720px] mx-auto w-full rounded-[24px] px-4 pt-3 pb-2.5 flex flex-col gap-1.5 ${
                    !hasMessages ? "animate-axioma-fade-up" : ""
                  }`}
                >
                  {/* Dedicated .ios-glass backdrop layer (keeps parent free of backdrop-filter so nested Model Dropdown blurs cleanly in Safari iOS) */}
                  <div
                    aria-hidden="true"
                    className="ios-glass absolute inset-0 rounded-[24px] border border-zinc-200/90 dark:border-white/10 shadow-[0_6px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)] pointer-events-none transition-all duration-200 group-focus-within/input:border-zinc-400/50 dark:group-focus-within/input:border-white/25"
                  />
                  {/* Baris Atas: Textarea Auto-Expand / Recording Waveform / Transcribing */}
                  <div className="relative z-10 w-full min-w-0 flex items-center">
                    {isRecording ? (
                      <InlineVoiceWaveform
                        analyser={dictationAnalyser}
                        recordingSeconds={recordingSeconds}
                        onSpeechDetected={() => {
                          hasSpokenRef.current = true;
                        }}
                      />
                    ) : isTranscribingVoice ? (
                      <div className="flex-1 min-w-0 flex items-center justify-center gap-2 py-1.5 px-2 animate-in fade-in duration-150">
                        <div className="flex items-center gap-1.5" aria-hidden="true">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400 animate-bounce" />
                        </div>
                        <span className="text-xs text-text-muted font-medium select-none">
                          Mentranskripsikan...
                        </span>
                      </div>
                    ) : (
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        tabIndex={0}
                        enterKeyHint="send"
                        autoComplete="off"
                        autoCorrect="on"
                        spellCheck={true}
                        value={inputText}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        onFocus={() => {
                          if (typeof window !== "undefined" && (window.scrollY !== 0 || window.scrollX !== 0)) {
                            window.scrollTo(0, 0);
                          }
                        }}
                        aria-label="Tulis pesan ke Axioma"
                        placeholder={
                          activeMediaMode === "image"
                            ? "Deskripsikan gambar yang ingin dibuat..."
                            : activeMediaMode === "video"
                            ? "Deskripsikan video sinematik yang ingin dibuat..."
                            : isGenerating || isLoading
                            ? "Axioma sedang merespons..."
                            : hasMessages
                            ? "Lanjutkan percakapan..."
                            : DYNAMIC_PLACEHOLDERS[placeholderIndex]
                        }
                        style={{ height: "28px" }}
                        className="flex-1 min-w-0 w-full bg-transparent resize-none border-0 outline-none focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-base md:text-sm leading-[1.45] font-normal py-0.5 px-0.5 min-h-[28px] max-h-[140px] overflow-y-auto tracking-normal transition-colors duration-300 ease-out touch-manipulation"
                      />
                    )}
                  </div>

                  {/* Baris Bawah: Toolbar Kiri (+, Mic, & Pemilih Bahasa/Gaya) | Aksi Utama Kanan (non-wrapping di 360px+) */}
                  <div className="relative z-10 w-full flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2 pt-0.5 min-w-0">
                    {/* Kiri: Tombol + Lampiran, Mikrofon & Pemilih Bahasa/Gaya */}
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink">
                      {/* Active Attachment Button & Popover Menu */}
                      {(() => {
                        const isAttachmentsFull = pendingAttachments.length >= 4;
                        return (
                          <div className="relative shrink-0 group" ref={attachmentMenuRef}>
                            <button
                              ref={attachmentTriggerRef}
                              type="button"
                              aria-haspopup="menu"
                              aria-expanded={isAttachmentMenuOpen}
                              onMouseDown={(e) => {
                                e.preventDefault();
                              }}
                              onClick={() => {
                                if (isAttachmentsFull || isLoading || isGenerating || isRecording || isTranscribingVoice) return;
                                textareaRef.current?.blur();
                                setIsAttachmentMenuOpen((prev) => !prev);
                              }}
                              onKeyDown={(e) => {
                                if (isAttachmentsFull || isLoading || isGenerating || isRecording || isTranscribingVoice) return;
                                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                                  e.preventDefault();
                                  setIsAttachmentMenuOpen(true);
                                }
                              }}
                              disabled={isAttachmentsFull || isLoading || isGenerating || isRecording || isTranscribingVoice}
                              title={isAttachmentsFull ? "Maksimal 4 file per pesan" : "Lampirkan berkas"}
                              aria-label={isAttachmentsFull ? "Maksimal 4 file per pesan" : "Lampirkan berkas"}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                                isAttachmentsFull || isLoading || isGenerating || isRecording || isTranscribingVoice
                                  ? "text-zinc-400 dark:text-zinc-600 opacity-40 cursor-not-allowed pointer-events-none"
                                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.07] active:scale-[0.96] cursor-pointer"
                              }`}
                            >
                              <Plus className="w-[18px] h-[18px]" />
                            </button>

                            {/* Tooltip when 4 attachments reached */}
                            {isAttachmentsFull && (
                              <span
                                role="tooltip"
                                className="pointer-events-none absolute left-0 bottom-full mb-2 px-2.5 py-1 rounded-md bg-bg-elevated border border-border-subtle text-[11px] text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-lg z-30"
                              >
                                Maksimal 4 file per pesan
                              </span>
                            )}

                            {/* Attachment Popover Menu */}
                            {shouldRenderAttachmentMenu && (
                              <>
                                <div
                                  className={`fixed top-0 left-0 right-0 h-[var(--app-height)] z-30 bg-black/70 md:hidden transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                    isAttachmentMenuEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                                  }`}
                                  onClick={() => closeAttachmentMenu(true)}
                                  aria-hidden="true"
                                />
                                <div
                                  role="menu"
                                  aria-label="Pilihan lampiran dan aksi cepat"
                                  onKeyDown={(e) =>
                                    handleMenuArrowKeyDown(e, attachmentItemRefs.current, () =>
                                      closeAttachmentMenu(true)
                                    )
                                  }
                                  className={`absolute -left-2 bottom-full mb-2 md:mb-2.5 z-40 w-[264px] sm:w-72 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto overscroll-contain scrollbar-none rounded-2xl bg-white dark:bg-[#18181d] border border-zinc-200/90 dark:border-white/[0.08] p-1.5 shadow-xl dark:shadow-2xl origin-bottom-left transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform focus:outline-none ${
                                    isAttachmentMenuEntered
                                      ? "scale-100 opacity-100 translate-y-0"
                                      : "scale-95 opacity-0 translate-y-1 pointer-events-none"
                                  }`}
                                >
                                  {/* Grup 1: LAMPIRKAN & MEDIA */}
                                  <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3 pt-2 pb-1 select-none">
                                    LAMPIRKAN &amp; MEDIA
                                  </div>
                                  <div className="space-y-0.5">
                                    {/* 1. Foto & Gambar (Vision / tabel / catatan) */}
                                    <button
                                      ref={(el) => {
                                        attachmentItemRefs.current[0] = el;
                                      }}
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        closeAttachmentMenu(false);
                                        visionInputRef.current?.click();
                                      }}
                                      className="w-full flex items-center gap-3 px-3 py-2 min-h-[40px] rounded-xl text-[13.5px] font-medium text-zinc-800 hover:bg-zinc-100/90 dark:text-zinc-100 dark:hover:bg-white/[0.06] active:bg-zinc-200/70 dark:active:bg-white/[0.1] transition-colors cursor-pointer text-left focus:outline-none focus:bg-zinc-100 dark:focus:bg-white/[0.06]"
                                    >
                                      <ImageIcon
                                        className="w-4 h-4 text-zinc-600 dark:text-zinc-300 shrink-0"
                                        strokeWidth={1.5}
                                      />
                                      <span className="flex-1 truncate">Foto &amp; Gambar</span>
                                    </button>

                                    {/* 2. Bedah Dokumen PDF */}
                                    <button
                                      ref={(el) => {
                                        attachmentItemRefs.current[1] = el;
                                      }}
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        closeAttachmentMenu(false);
                                        smartPdfInputRef.current?.click();
                                      }}
                                      className="w-full flex items-center gap-3 px-3 py-2 min-h-[40px] rounded-xl text-[13.5px] font-medium text-zinc-800 hover:bg-zinc-100/90 dark:text-zinc-100 dark:hover:bg-white/[0.06] active:bg-zinc-200/70 dark:active:bg-white/[0.1] transition-colors cursor-pointer text-left focus:outline-none focus:bg-zinc-100 dark:focus:bg-white/[0.06]"
                                    >
                                      <FileText
                                        className="w-4 h-4 text-zinc-600 dark:text-zinc-300 shrink-0"
                                        strokeWidth={1.5}
                                      />
                                      <span className="flex-1 truncate">Bedah Dokumen PDF</span>
                                    </button>

                                    {/* 3. Buat Gambar */}
                                    <button
                                      ref={(el) => {
                                        attachmentItemRefs.current[2] = el;
                                      }}
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        closeAttachmentMenu(false);
                                        setActiveMediaMode("image");
                                        activeMediaModeRef.current = "image";
                                        setInputText("");
                                        requestAnimationFrame(() => {
                                          const el = textareaRef.current;
                                          if (el) {
                                            el.focus();
                                            adjustTextareaHeight();
                                          }
                                        });
                                      }}
                                      className="w-full flex items-center gap-3 px-3 py-2 min-h-[40px] rounded-xl text-[13.5px] font-medium text-zinc-800 hover:bg-zinc-100/90 dark:text-zinc-100 dark:hover:bg-white/[0.06] active:bg-zinc-200/70 dark:active:bg-white/[0.1] transition-colors cursor-pointer text-left focus:outline-none focus:bg-zinc-100 dark:focus:bg-white/[0.06]"
                                    >
                                      <Palette
                                        className="w-4 h-4 text-zinc-600 dark:text-zinc-300 shrink-0"
                                        strokeWidth={1.5}
                                      />
                                      <span className="flex-1 truncate">Buat Gambar</span>
                                    </button>

                                    {/* 4. Buat Video */}
                                    <button
                                      ref={(el) => {
                                        attachmentItemRefs.current[3] = el;
                                      }}
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        closeAttachmentMenu(false);
                                        setActiveMediaMode("video");
                                        activeMediaModeRef.current = "video";
                                        setInputText("");
                                        requestAnimationFrame(() => {
                                          const el = textareaRef.current;
                                          if (el) {
                                            el.focus();
                                            adjustTextareaHeight();
                                          }
                                        });
                                      }}
                                      className="w-full flex items-center gap-3 px-3 py-2 min-h-[40px] rounded-xl text-[13.5px] font-medium text-zinc-800 hover:bg-zinc-100/90 dark:text-zinc-100 dark:hover:bg-white/[0.06] active:bg-zinc-200/70 dark:active:bg-white/[0.1] transition-colors cursor-pointer text-left focus:outline-none focus:bg-zinc-100 dark:focus:bg-white/[0.06]"
                                    >
                                      <Video
                                        className="w-4 h-4 text-zinc-600 dark:text-zinc-300 shrink-0"
                                        strokeWidth={1.5}
                                      />
                                      <span className="flex-1 truncate">Buat Video</span>
                                    </button>
                                  </div>

                                  <div className="border-t border-zinc-200/80 dark:border-white/[0.08] my-1.5" />

                                  {/* Grup 2: AKSI CEPAT */}
                                  <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3 pt-1 pb-1 select-none">
                                    AKSI CEPAT
                                  </div>
                                  <div className="space-y-0.5">
                                    {/* 5. Bandingkan 2 Opsi (/lens) */}
                                    <button
                                      ref={(el) => {
                                        attachmentItemRefs.current[4] = el;
                                      }}
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        closeAttachmentMenu(false);
                                        const draft = "/lens ";
                                        setInputText(draft);
                                        requestAnimationFrame(() => {
                                          const el = textareaRef.current;
                                          if (el) {
                                            el.value = draft;
                                            el.focus();
                                            el.setSelectionRange(draft.length, draft.length);
                                            adjustTextareaHeight();
                                          }
                                        });
                                      }}
                                      className="w-full flex items-center gap-3 px-3 py-2 min-h-[40px] rounded-xl text-[13.5px] font-medium text-zinc-800 hover:bg-zinc-100/90 dark:text-zinc-100 dark:hover:bg-white/[0.06] active:bg-zinc-200/70 dark:active:bg-white/[0.1] transition-colors cursor-pointer text-left focus:outline-none focus:bg-zinc-100 dark:focus:bg-white/[0.06]"
                                    >
                                      <Scale
                                        className="w-4 h-4 text-zinc-600 dark:text-zinc-300 shrink-0"
                                        strokeWidth={1.5}
                                      />
                                      <span className="flex-1 truncate">Bandingkan 2 Opsi</span>
                                    </button>

                                    {/* 6. Simulasi Roleplay */}
                                    <button
                                      ref={(el) => {
                                        attachmentItemRefs.current[5] = el;
                                      }}
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        closeAttachmentMenu(false);
                                        setIsRoleplayModalOpen(true);
                                      }}
                                      className="w-full flex items-center gap-3 px-3 py-2 min-h-[40px] rounded-xl text-[13.5px] font-medium text-zinc-800 hover:bg-zinc-100/90 dark:text-zinc-100 dark:hover:bg-white/[0.06] active:bg-zinc-200/70 dark:active:bg-white/[0.1] transition-colors cursor-pointer text-left focus:outline-none focus:bg-zinc-100 dark:focus:bg-white/[0.06]"
                                    >
                                      <Users
                                        className="w-4 h-4 text-zinc-600 dark:text-zinc-300 shrink-0"
                                        strokeWidth={1.5}
                                      />
                                      <span className="flex-1 truncate">Simulasi Roleplay</span>
                                    </button>

                                    {/* 7. Bedah Surat / Kontrak */}
                                    <button
                                      ref={(el) => {
                                        attachmentItemRefs.current[6] = el;
                                      }}
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        closeAttachmentMenu(false);
                                        const draft =
                                          "Tolong bedah hak, kewajiban, dan poin yang perlu diwaspadai dari teks ini:\n\n";
                                        setInputText(draft);
                                        requestAnimationFrame(() => {
                                          const el = textareaRef.current;
                                          if (el) {
                                            el.value = draft;
                                            el.focus();
                                            el.setSelectionRange(draft.length, draft.length);
                                            adjustTextareaHeight();
                                          }
                                        });
                                      }}
                                      className="w-full flex items-center gap-3 px-3 py-2 min-h-[40px] rounded-xl text-[13.5px] font-medium text-zinc-800 hover:bg-zinc-100/90 dark:text-zinc-100 dark:hover:bg-white/[0.06] active:bg-zinc-200/70 dark:active:bg-white/[0.1] transition-colors cursor-pointer text-left focus:outline-none focus:bg-zinc-100 dark:focus:bg-white/[0.06]"
                                    >
                                      <ShieldCheck
                                        className="w-4 h-4 text-zinc-600 dark:text-zinc-300 shrink-0"
                                        strokeWidth={1.5}
                                      />
                                      <span className="flex-1 truncate">Bedah Surat / Kontrak</span>
                                    </button>
                                  </div>

                                  <div className="border-t border-zinc-200/80 dark:border-white/[0.08] pt-2 pb-1 px-3 mt-1.5">
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                      Maks. 4 file · 10 MB per file · PDF maks. 30 halaman
                                    </p>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* Voice Input Mic Button (Dikte) */}
                      {!isRecording && !isTranscribingVoice && (
                        <div className="relative group shrink-0">
                          {isSpeechSupported ? (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                              }}
                              onClick={() => {
                                textareaRef.current?.blur();
                                handleToggleVoiceRecording();
                              }}
                              title="Dikte suara (Bahasa Indonesia)"
                              aria-label="Mulai dikte"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.07] transition-all duration-150 cursor-pointer active:scale-[0.96]"
                            >
                              <Mic className="w-[17px] h-[17px]" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled
                                aria-disabled="true"
                                title="Perangkat tidak mendukung input mikrofon"
                                aria-label="Perangkat tidak mendukung input mikrofon"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-icon-muted opacity-50 cursor-not-allowed"
                              >
                                <MicOff className="w-[17px] h-[17px]" />
                              </button>
                              <span
                                role="tooltip"
                                className="pointer-events-none absolute left-0 bottom-full mb-2 px-2 py-1 rounded-md bg-bg-elevated border border-border-subtle text-[11px] text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-lg z-30"
                              >
                                Mikrofon tidak didukung
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Compact Quick Settings Pill Selector (Mode Berpikir & Kontrol Konteks) */}
                      {!isRecording && !isTranscribingVoice && (
                        <LanguageToneSelector
                          thinkingMode={thinkingMode}
                          contextControl={contextControl}
                          isPrivateMode={isPrivateMode}
                          disabled={isLoading || isGenerating}
                          onBeforeOpen={() => {
                            if (typeof window !== "undefined" && window.innerWidth < 768) {
                              textareaRef.current?.blur();
                            }
                          }}
                          onThinkingModeChange={(nextMode) => {
                            setThinkingMode(nextMode);
                            safeSetLocalStorage(STORAGE_KEYS.THINKING_MODE, nextMode);
                          }}
                          onContextControlChange={handleUpdateContextControl}
                          onPrivateModeChange={(nextPrivate) => {
                            setIsPrivateMode(nextPrivate);
                            if (nextPrivate) {
                              showToastNotice("Mode Privat aktif · Tidak disimpan", 2000);
                            }
                          }}
                        />
                      )}

                      {/* Stage 6: Prompt Enhancement Icon Button (only visible when input >= 12 chars) */}
                      {!isRecording &&
                        !isTranscribingVoice &&
                        inputText.trim().length >= 12 && (
                          <button
                            type="button"
                            disabled={isLoading || isGenerating || isEnhancingPrompt}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => void handleEnhancePrompt()}
                            title="Rapikan Prompt"
                            aria-label="Rapikan Prompt"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.07] transition-all duration-150 cursor-pointer active:scale-[0.96] disabled:opacity-45 shrink-0"
                          >
                            {isEnhancingPrompt ? (
                              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                            ) : (
                              <PenLine className="w-4 h-4" strokeWidth={1.5} />
                            )}
                          </button>
                        )}
                    </div>

                    {/* Kanan: Pemilih Model + Tombol Aksi Utama (w-8 h-8 rounded-xl) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
                      {/* Compact Model Selector inside Input Box (opens upward on mobile, viewport-aware on desktop) */}
                      <div className="relative min-w-0">
                        <button
                          ref={headerAgentTriggerRef}
                          type="button"
                          aria-haspopup="menu"
                          aria-expanded={isHeaderAgentMenuOpen}
                          onClick={() => {
                            if (typeof window !== "undefined" && window.innerWidth < 768) {
                              textareaRef.current?.blur();
                            }
                            toggleHeaderAgentMenu();
                          }}
                          aria-label={`Pilih model AI, saat ini ${selectedAgent.name}`}
                          className="h-8 px-2 sm:px-2.5 max-w-[155px] sm:max-w-none rounded-full flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.07] transition-all duration-150 cursor-pointer whitespace-nowrap active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
                        >
                          <span className="truncate">
                            <span className="hidden min-[380px]:inline">Axioma </span>
                            {selectedAgent.shortName}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 opacity-70 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              isHeaderAgentMenuOpen ? "rotate-180" : ""
                            }`}
                            strokeWidth={1.75}
                          />
                        </button>

                        {shouldRenderHeaderAgentMenu && (
                          <>
                            {/* Transparent click-outside backdrop */}
                            <div
                              className={`fixed top-0 left-0 right-0 h-[var(--app-height)] z-40 ${
                                isHeaderAgentMenuEntered ? "pointer-events-auto" : "pointer-events-none"
                              }`}
                              onClick={() => closeHeaderAgentMenu(false)}
                              aria-hidden="true"
                            />

                            {/* Viewport-aware frosted glass dropdown menu (automatically opens down/up based on available space) */}
                            <div
                              ref={headerAgentMenuRef}
                              role="menu"
                              aria-label="Pilih model AI"
                              onKeyDown={(e) =>
                                handleMenuArrowKeyDown(e, headerAgentItemRefs.current, () =>
                                  closeHeaderAgentMenu(true)
                                )
                              }
                              className={`ios-glass absolute right-0 ${
                                agentDropdownDirection === "down"
                                  ? "top-full mt-2 origin-top-right"
                                  : "bottom-full mb-2 origin-bottom-right"
                              } w-[min(280px,calc(100vw-2rem))] sm:w-[310px] max-w-[calc(100vw-2rem)] z-50 max-h-[min(65vh,calc(var(--app-height)-140px))] overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] scrollbar-none rounded-2xl p-1.5 space-y-1 focus:outline-none transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                isHeaderAgentMenuEntered
                                  ? "scale-100 opacity-100 translate-y-0"
                                  : `scale-95 opacity-0 ${
                                      agentDropdownDirection === "down" ? "-translate-y-1" : "translate-y-1"
                                    } pointer-events-none`
                              }`}
                            >
                              {AVAILABLE_AGENTS.map((agent, idx) => {
                                const isSelected = agent.id === selectedAgent.id;
                                return (
                                  <button
                                    ref={(el) => {
                                      headerAgentItemRefs.current[idx] = el;
                                    }}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={isSelected}
                                    key={agent.id}
                                    onClick={() => {
                                      handleSelectAgent(agent);
                                      closeHeaderAgentMenu(true);
                                    }}
                                    className={`w-full text-left p-2.5 rounded-xl text-xs tracking-tight active:scale-[0.99] transition-colors flex flex-col gap-1 focus:outline-none cursor-pointer border ${
                                      isSelected
                                        ? "bg-black/[0.06] dark:bg-white/[0.1] border-black/[0.06] dark:border-white/[0.1] text-zinc-900 dark:text-zinc-100"
                                        : "border-transparent text-zinc-700 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2 w-full">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-[13.5px] tracking-tight truncate">
                                          {agent.name}
                                        </span>
                                        {isSelected && (
                                          <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 shrink-0" />
                                        )}
                                      </div>
                                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium shrink-0 whitespace-nowrap">
                                        {agent.tag}
                                      </span>
                                    </div>
                                    <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 leading-snug break-words">
                                      {agent.description}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                      {isRecording ? (
                        <>
                          <button
                            type="button"
                            onClick={() => stopVoiceRecording("stop")}
                            aria-label="Hentikan rekaman"
                            title="Hentikan rekaman (masukkan teks ke kotak input)"
                            className="w-8 h-8 rounded-xl bg-zinc-200/80 hover:bg-zinc-300 dark:bg-white/10 dark:hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-zinc-700 dark:text-white/90"
                          >
                            <Square className="w-3.5 h-3.5 fill-current rounded-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={() => stopVoiceRecording("send")}
                            aria-label="Kirim rekaman"
                            title="Kirim rekaman langsung"
                            className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-white dark:text-zinc-900"
                          >
                            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </>
                      ) : isTranscribingVoice ? (
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-500 dark:text-zinc-400" />
                        </div>
                      ) : isGenerating ? (
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                          }}
                          onClick={handleStopGeneration}
                          title="Hentikan respons"
                          aria-label="Hentikan respons"
                          className="w-8 h-8 rounded-xl flex items-center justify-center bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                        </button>
                      ) : (() => {
                        const isUploadingAttachment = pendingAttachments.some(
                          (a) => a.status === "uploading" || a.status === "compressing"
                        );
                        const hasReadyAttachments = pendingAttachments.some((a) => a.status === "ready");
                        const hasUserTextOrAttachments =
                          Boolean(inputText.trim()) ||
                          hasReadyAttachments ||
                          Boolean(pendingVisionPhoto) ||
                          Boolean(pendingPdfDoc);
                        const isSendDisabled =
                          !isOnline ||
                          isUploadingAttachment ||
                          isLoading ||
                          isGenerating ||
                          isVisionLoading ||
                          isSubmitting;

                        return (
                          <div className="flex items-center gap-2">
                            {/* Morphing Action Button Container (VN <-> Send: scale-in bounce) */}
                            <div className="relative w-8 h-8">
                              {hasUserTextOrAttachments ? (
                                /* Send Button */
                                <button
                                  key="send-btn"
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                  }}
                                  onTouchEnd={(e) => {
                                    e.preventDefault();
                                    if (!isSendDisabled) {
                                      void handleSendMessage();
                                      textareaRef.current?.blur();
                                    }
                                  }}
                                  onClick={() => {
                                    if (!isSendDisabled) {
                                      void handleSendMessage();
                                      textareaRef.current?.blur();
                                    }
                                  }}
                                  disabled={isSendDisabled}
                                  title={!isOnline ? "Koneksi internet terputus" : "Kirim pesan"}
                                  aria-label={!isOnline ? "Koneksi internet terputus" : "Kirim pesan"}
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center animate-axioma-scale-in transition-all duration-150 select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60 ${
                                    !isSendDisabled
                                      ? `bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 active:scale-[0.96] cursor-pointer ${
                                          isSendPressed ? "scale-[0.94]" : "scale-100"
                                        }`
                                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-60"
                                  }`}
                                >
                                  {isUploadingAttachment ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-current" strokeWidth={1.75} />
                                  ) : (
                                    <ArrowUp className="w-4 h-4 text-current" strokeWidth={2.25} />
                                  )}
                                </button>
                              ) : (
                                /* Voice Mode (VN) Button */
                                <button
                                  key="vn-btn"
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                  }}
                                  onClick={() => {
                                    textareaRef.current?.blur();
                                    handleOpenVoiceMode();
                                  }}
                                  title="Mode Suara (Percakapan langsung)"
                                  aria-label="Mode Suara (Percakapan langsung)"
                                  className="w-8 h-8 rounded-xl flex items-center justify-center animate-axioma-scale-in bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08] active:scale-[0.96] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
                                >
                                  <AudioLines className="w-4 h-4" strokeWidth={1.75} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer + Privacy & Terms Links (#9, WCAG AA >= 4.5:1 via --text-muted #a1a1aa) */}
            <p
              className={`pointer-events-none shrink-0 mt-2 mb-0 py-0.5 md:pt-1.5 md:pb-3 w-full overflow-visible text-center text-[11px] sm:text-xs leading-normal text-zinc-400 dark:text-zinc-500 md:text-zinc-500 md:dark:text-zinc-400 tracking-normal [[data-kb="open"]_&]:hidden ${
                currentMessages.length === 0
                  ? "hidden"
                  : "block md:flex md:flex-wrap md:items-center md:justify-center md:gap-x-2 md:gap-y-0.5"
              }`}
            >
              <span className="md:hidden">Axioma dapat membuat kesalahan.</span>
              <span className="hidden md:inline">Axioma dapat membuat kesalahan. Periksa kembali informasi penting.</span>
              <span className="hidden md:inline text-border-strong">•</span>
              <span className="hidden md:inline-flex items-center gap-2 pointer-events-auto">
                <Link
                  href="/privasi"
                  className="py-1.5 px-2 inline-block underline underline-offset-2 decoration-border-strong hover:text-text-primary hover:decoration-text-primary transition-colors"
                >
                  Privasi
                </Link>
                <span className="text-border-strong">·</span>
                <Link
                  href="/ketentuan"
                  className="py-1.5 px-2 inline-block underline underline-offset-2 decoration-border-strong hover:text-text-primary hover:decoration-text-primary transition-colors"
                >
                  Ketentuan
                </Link>
              </span>
            </p>
          </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Message & Truncate Subsequent Messages Confirmation Modal (Full-Screen on Mobile < md, Centered Card on Desktop >= md) */}
      {shouldRenderEditConfirm && displayEditConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-confirm-title"
          className={`fixed inset-0 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 p-0 md:p-4 z-50 flex items-stretch md:items-center justify-center bg-[#f9f9f8] dark:bg-[#0e0e10] md:bg-black/70 md:dark:bg-black/70 touch-none font-sans transition-opacity duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isEditConfirmEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingEdit) {
              setEditConfirmTarget(null);
            }
          }}
        >
          <div
            className={`fixed inset-0 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 rounded-none border-0 bg-[#f9f9f8] dark:bg-[#0e0e10] pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] px-4 flex flex-col justify-between md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[90vw] md:max-w-[440px] md:h-auto md:max-h-[85dvh] md:rounded-[28px] md:bg-bg-elevated md:dark:bg-[#111114] md:border md:border-border-subtle md:dark:border-white/[0.08] md:p-6 md:shadow-2xl md:block md:space-y-4 overflow-y-auto overscroll-y-contain overscroll-contain touch-auto transition-all duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
              isEditConfirmEntered
                ? "translate-y-0 opacity-100 md:scale-100"
                : "translate-y-4 opacity-0 md:translate-y-0 md:scale-95"
            }`}
          >
            <div className="flex items-start gap-3 pt-4 md:pt-0">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 dark:bg-amber-950/60 dark:border-amber-800/60 dark:text-amber-400 flex items-center justify-center shrink-0">
                <TriangleAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1 min-w-0">
                <h2 id="edit-confirm-title" className="text-base md:text-sm font-semibold text-text-primary">
                  Edit Pesan &amp; Buat Balasan Baru?
                </h2>
                <p className="text-sm md:text-xs text-text-secondary leading-relaxed">
                  Mengedit pesan ini akan menghapus{" "}
                  <strong className="text-text-primary">
                    {displayEditConfirm.subsequentCount} pesan setelahnya
                  </strong>{" "}
                  dalam percakapan ini, lalu meminta jawaban baru dari AI.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-end gap-2 pt-3 border-t border-border-subtle">
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={() => setEditConfirmTarget(null)}
                className="w-full md:w-auto min-h-[44px] md:min-h-[40px] px-4 py-2 rounded-xl text-sm md:text-xs font-medium text-text-secondary bg-bg-surface hover:bg-bg-subtle hover:text-text-primary active:scale-[0.96] border border-border-subtle transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={() =>
                  handleSubmitEditUserMessage(displayEditConfirm.msgId, displayEditConfirm.content)
                }
                className="w-full md:w-auto min-h-[44px] md:min-h-[40px] px-4 py-2 rounded-xl text-sm md:text-xs font-semibold text-bg-primary bg-text-primary hover:opacity-90 active:scale-[0.96] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isSubmittingEdit ? "Menghapus & Mengirim…" : "Lanjutkan & Kirim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Message Limit Modal (Full-Screen on Mobile < md, Centered Card on Desktop >= md) */}
      {shouldRenderGuestLimit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-limit-title"
          className={`fixed inset-0 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 p-0 md:p-4 z-50 flex items-stretch md:items-center justify-center bg-[#f9f9f8] dark:bg-[#0e0e10] md:bg-black/70 md:dark:bg-black/70 font-sans transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isGuestLimitEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsGuestLimitModalOpen(false);
            }
          }}
        >
          <div
            className={`fixed inset-0 w-full h-[var(--app-height,100dvh)] max-w-none max-h-none m-0 rounded-none border-0 bg-[#f9f9f8] dark:bg-[#0e0e10] pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] px-4 flex flex-col justify-between md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[90vw] md:max-w-[480px] md:h-auto md:max-h-[85dvh] md:rounded-[28px] md:bg-bg-elevated md:dark:bg-[#111114] md:border md:border-border-subtle md:dark:border-white/[0.08] md:p-6 md:shadow-2xl md:block md:space-y-5 overflow-y-auto overscroll-y-contain overscroll-contain transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
              isGuestLimitEntered
                ? "translate-y-0 opacity-100 md:scale-100"
                : "translate-y-4 opacity-0 md:translate-y-0 md:scale-95"
            }`}
          >
            <div className="space-y-4 pt-2 md:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-bg-surface border border-border-subtle flex items-center justify-center shrink-0">
                    <Cloud className="w-5 h-5 text-text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <h2 id="guest-limit-title" className="text-base font-semibold text-text-primary">
                      Batas Percakapan Tamu
                    </h2>
                    <p className="text-xs text-text-muted">
                      Kuota {GUEST_MAX_MESSAGES} pesan gratis telah digunakan
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGuestLimitModalOpen(false)}
                  className="p-2 rounded-xl text-icon-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer shrink-0"
                  aria-label="Tutup popup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-text-secondary leading-relaxed">
                Hubungkan akun Anda untuk melanjutkan percakapan tanpa batas dan menyimpan seluruh riwayat percakapan agar dapat diakses dari perangkat lain.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-2.5 pt-3 border-t border-border-subtle md:border-t-0 md:pt-2">
              <button
                type="button"
                onClick={() => setIsGuestLimitModalOpen(false)}
                className="w-full md:w-auto flex-1 min-h-[44px] md:min-h-[42px] px-4 py-2.5 rounded-xl text-sm md:text-xs font-medium text-text-secondary bg-bg-surface hover:bg-bg-subtle hover:text-text-primary border border-border-subtle transition-colors cursor-pointer"
              >
                Nanti Saja
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsGuestLimitModalOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="w-full md:w-auto flex-1 min-h-[44px] md:min-h-[42px] px-4 py-2.5 rounded-xl text-sm md:text-xs font-semibold text-bg-primary bg-text-primary hover:opacity-90 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Cloud className="w-4 h-4" strokeWidth={1.75} />
                <span>Hubungkan Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 2: Context Checkpoint & Context Correction Modal (only mounts when open) */}
      <ContextCheckpointModal
        isOpen={isCheckpointModalOpen}
        onClose={() => setIsCheckpointModalOpen(false)}
        backendUrl={BACKEND_URL}
        messages={currentMessages
          .filter((m) => !m.isError && m.content.trim())
          .map((m) => ({
            role: m.sender === "ai" ? "assistant" : "user",
            content: m.content,
          }))}
        contextState={chatContextState}
        onUpdateContextState={handleUpdateChatContextState}
      />

      {/* Stage 9: Roleplay Simulation & Final Report Modal (only mounts when open) */}
      <RoleplayModal
        isOpen={isRoleplayModalOpen}
        onClose={() => setIsRoleplayModalOpen(false)}
        backendUrl={BACKEND_URL}
        language={language}
      />

      {/* Live Preview / Interactive Sandbox Modal (portal to document.body, only mounts when open) */}
      <LivePreviewModal
        isOpen={livePreviewCode !== null}
        code={livePreviewCode ?? ""}
        onClose={() => setLivePreviewCode(null)}
      />

      {/* Daily Credit Quota Soft Paywall & Upgrade Modal (portal to document.body, only mounts when open) */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        quotaInfo={quotaInfo}
        onSwitchToOmni={handleSwitchToOmni}
        triggerReason={quotaInfo?.triggeredByLimit ? "quota_exceeded" : "manual"}
      />

      {/* Stage 7: Floating Highlight-to-Edit Mini Toolbar (zero DOM when no selection) */}
      {selectionEdit && (
        <div
          role="dialog"
          aria-label="Edit teks terpilih"
          style={{
            top: `${selectionEdit.top}px`,
            left: `${selectionEdit.left}px`,
          }}
          className="fixed z-50 w-[min(320px,calc(100vw-24px))] rounded-2xl bg-white dark:bg-[#0e0e10] border border-zinc-200 dark:border-white/[0.1] p-2 shadow-xl space-y-2"
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { action: "shorten" as const, label: "Perpendek" },
                  { action: "soften" as const, label: "Perhalus" },
                  { action: "assertive" as const, label: "Lebih Tegas" },
                  {
                    action:
                      /\b(the|and|with|for|that|this|is|are)\b/i.test(
                        selectionEdit.selectedText
                      )
                        ? ("translate_id" as const)
                        : ("translate_en" as const),
                    label: "Terjemahkan",
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={selectionEdit.isLoading}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void handleRunSelectionEdit(item.action)}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setSelectionEdit(null)}
              aria-label="Tutup menu edit"
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {selectionEdit.isLoading && (
            <div className="flex items-center gap-1.5 px-1.5 py-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
              <span>Merevisi potongan teks...</span>
            </div>
          )}

          {selectionEdit.error && (
            <p className="px-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
              {selectionEdit.error}
            </p>
          )}

          {selectionEdit.revisedText && (
            <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.08] space-y-2">
              <p className="text-xs text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto px-1">
                {selectionEdit.revisedText}
              </p>
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    handleCopy(
                      selectionEdit.revisedText || "",
                      `sel-${selectionEdit.messageId}`,
                      1500
                    );
                    showToastNotice("Hasil revisi disalin", 1500);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] border border-zinc-200 dark:border-white/[0.08] text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Salin
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleReplaceSelectedText}
                  className="px-2.5 py-1 rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Ganti Teks
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Supabase Authentication Modal (Hybrid Auth) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setAuthUser(user);
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0];
          if (fullName) {
            const formatted = toTitleCase(fullName);
            setDisplayName(formatted);
            safeSetLocalStorage(STORAGE_KEYS.DISPLAY_NAME, formatted);
          }
          setIsAuthModalOpen(false);
          showToastNotice(`Selamat datang, ${toTitleCase(fullName) || "Pengguna"}!`);
          void refreshChatHistory();
        }}
      />

      {/* Persistent Audio Player Element (synchronously unlocked on Mode Suara tap for iOS/Android) */}
      <audio
        ref={voiceAudioRef}
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className="hidden"
        aria-hidden="true"
      />

      {/* Cloudflare Turnstile Invisible Container (#2, #9) */}
      <div id="turnstile-container" className="fixed -bottom-96 -left-96 opacity-0 pointer-events-none" aria-hidden="true" />
    </div>
  );
}
