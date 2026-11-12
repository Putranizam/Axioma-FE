"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
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
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Bell,
  Database,
  Bot,
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
  Sparkles,
  Film,
  Palette,
  Video,
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
  transcribeAudioBlob,
} from "../lib/voice";

// Dynamic imports for code splitting & faster First Load JS
const CodeBlock = dynamic(() => import("./CodeBlock").then((mod) => mod.CodeBlock), {
  ssr: false,
});

const VoiceModeOverlay = dynamic(() => import("./VoiceModeOverlay"), {
  ssr: false,
});

const AuthModal = dynamic(() => import("./AuthModal"), {
  ssr: false,
});

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

interface StarterPrompt {
  id: string;
  label: string;
  mode: "send" | "prefill";
  prefillText?: string;
  icon: "lightbulb" | "mail" | "table" | "code" | "image" | "video";
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: "create-image",
    label: "Buatkan gambar pemandangan kota futuristik HD",
    mode: "prefill",
    prefillText: "Buatkan gambar: pemandangan kota futuristik Jakarta dengan pencahayaan neon sinematik, 8k",
    icon: "image",
  },
  {
    id: "create-video",
    label: "Buatkan video drone sinematik pegunungan",
    mode: "prefill",
    prefillText: "Buatkan video: kamera drone sinematik terbang di atas puncak pegunungan berkabut saat fajar",
    icon: "video",
  },
  {
    id: "explain-simple",
    label: "Jelaskan cara kerja blockchain dengan bahasa sederhana",
    mode: "send",
    icon: "lightbulb",
  },
  {
    id: "professional-email",
    label: "Bantu saya menulis email profesional",
    mode: "send",
    icon: "mail",
  },
  {
    id: "analyze-table",
    label: "Analisis data dari tabel berikut",
    mode: "prefill",
    prefillText: "Analisis data dari tabel berikut:\n\n",
    icon: "table",
  },
  {
    id: "write-code",
    label: "Buatkan kode untuk…",
    mode: "prefill",
    prefillText: "Buatkan kode untuk: ",
    icon: "code",
  },
];

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
      <span className="text-[11px] sm:text-xs text-text-muted/70 font-mono tracking-wider tabular-nums select-none">
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
      `Halo ${formattedName}, apa yang Anda pikirkan?`,
      `Apa yang sebaiknya kita fokuskan, ${formattedName}?`,
      `Ada ide atau rencana baru hari ini, ${formattedName}?`,
      `Halo ${formattedName}, apa yang bisa saya bantu?`,
      `Siap menganalisis sesuatu hari ini, ${formattedName}?`,
    ];
    return userGreetings[Math.floor(Math.random() * userGreetings.length)];
  }

  const guestGreetings = [
    "Halo, apa yang Anda pikirkan?",
    "Apa yang sebaiknya kita fokuskan hari ini?",
    "Ada topik menarik yang ingin kita bahas?",
    "Halo, apa yang bisa saya bantu hari ini?",
  ];
  return guestGreetings[Math.floor(Math.random() * guestGreetings.length)];
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

function detectMediaIntent(text: string): { type: "image" | "video" | null; visualPrompt: string } {
  if (!text || typeof text !== "string") return { type: null, visualPrompt: "" };
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // Negative checks: educational/explanatory questions about images/art should NOT trigger generation
  if (
    /^(apa|kenapa|mengapa|bagaimana|jelaskan|apakah|siapa|kapan|di mana|dimana)\b/i.test(lower) &&
    /\b(cara\s+menggambar|cara\s+melukis|cara\s+membuat\s+video|definisi|pengertian|sejarah|arti|fungsi|maksud)\b/i.test(lower)
  ) {
    return { type: null, visualPrompt: raw };
  }

  // Video triggers
  const videoKeywords = [
    /\b(buatkan|buat|bikin|generate|render|ciptakan|hadirkan|desainkan)\s+(video|animasi|klip|clip|motion|sinematik)\b/i,
    /\b(animasikan|videokan)\b/i,
    /\b(minta|mau|ingin|butuh|perlu|tolong|coba|bisa\s+(tolong\s+)?(buatkan|bikin|buat)?)\s+(video|animasi|klip|sinematik)\b/i,
    /^(video|animasi|klip|sinematik)\s+(tentang|dari|bertema|sebuah|seekor|seorang|suatu|suasana|pemandangan|karakter|[a-zA-Z0-9\s]+)$/i,
    /\b(dalam bentuk|sebagai|berupa|menjadi)\s+(video|animasi|klip)\b/i,
    /\[mode:\s*(video|animasi|klip)\]/i,
    /^(video|animasi|klip)\s*:\s*.+/i,
  ];

  const isVideo = videoKeywords.some((rgx) => rgx.test(lower));
  if (isVideo) {
    let cleaned = raw;
    cleaned = cleaned.replace(/^\[mode:\s*(video|animasi|klip)\]\s*:?/i, "");
    cleaned = cleaned.replace(/^(tolong|coba|bisa\s+(kamu\s+)?)?\s*(buatkan|buat|bikin|generate|animasikan|videokan|render|ciptakan|hadirkan)\s*(video|animasi|klip|clip|motion|sinematik)?\s*(bertema|dengan tema|tema|topik|tentang|dari|sebuah|seekor|seorang|suatu|berupa|:)?\s*/i, "");
    cleaned = cleaned.replace(/^(video|animasi|klip|sinematik)\s*(bertema|dengan tema|tema|topik|tentang|dari|sebuah|seekor|seorang|suatu|:)\s*/i, "");
    return { type: "video", visualPrompt: cleaned.trim() || raw };
  }

  // Image triggers
  const imageKeywords = [
    /\b(buatkan|buat|bikin|generate|lukiskan|lukis|gambarkan|gambari|gambarin|fotokan|render|ciptakan|hadirkan|desainkan)\s+(gambar|foto|lukisan|ilustrasi|visual|image|artwork|wallpaper|poster)\b/i,
    /\b(lukiskan|gambarkan|gambari|gambarin|fotokan)\b/i,
    /\b(minta|mau|ingin|butuh|perlu|tolong|coba|bisa\s+(tolong\s+)?(buatkan|bikin|buat)?)\s+(gambar|foto|lukisan|ilustrasi|visual)\b/i,
    /^(gambar|foto|lukisan|ilustrasi|visual)\s+(tentang|dari|bertema|sebuah|seekor|seorang|suatu|suasana|pemandangan|karakter|[a-zA-Z0-9\s]+)$/i,
    /\b(dalam bentuk|sebagai|berupa|menjadi)\s+(gambar|foto|lukisan|ilustrasi|visual)\b/i,
    /\[mode:\s*(gambar|image|foto|visual)\]/i,
    /^(gambar|foto|lukisan|ilustrasi|visual)\s*:\s*.+/i,
  ];

  const isImage = imageKeywords.some((rgx) => rgx.test(lower));
  if (isImage) {
    let cleaned = raw;
    cleaned = cleaned.replace(/^\[mode:\s*(gambar|image|foto|visual)\]\s*:?/i, "");
    cleaned = cleaned.replace(/^(tolong|coba|bisa\s+(kamu\s+)?)?\s*(buatkan|buat|bikin|generate|lukiskan|lukis|gambarkan|gambari|gambarin|fotokan|render|ciptakan|hadirkan)\s*(gambar|foto|lukisan|ilustrasi|visual|image|artwork|wallpaper|poster)?\s*(bertema|dengan tema|tema|topik|tentang|dari|sebuah|seekor|seorang|suatu|berupa|:)?\s*/i, "");
    cleaned = cleaned.replace(/^(gambar|foto|lukisan|ilustrasi|visual)\s*(bertema|dengan tema|tema|topik|tentang|dari|sebuah|seekor|seorang|suatu|:)\s*/i, "");
    return { type: "image", visualPrompt: cleaned.trim() || raw };
  }

  return { type: null, visualPrompt: raw };
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
  const [isSidebarLoading, setIsSidebarLoading] = useState<boolean>(true);
  const [isChatAreaLoading, setIsChatAreaLoading] = useState<boolean>(true);
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
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
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
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState<boolean>(false);
  const [isHeaderAgentMenuOpen, setIsHeaderAgentMenuOpen] = useState<boolean>(false);
  const [headerMenuTop, setHeaderMenuTop] = useState<number | null>(null);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState<boolean>(false);

  // Settings Modal & Clear All Chats Modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [settingsNameInput, setSettingsNameInput] = useState<string>(DEFAULT_DISPLAY_NAME);
  const [settingsNameError, setSettingsNameError] = useState<string | null>(null);
  const [settingsDefaultAgentInput, setSettingsDefaultAgentInput] =
    useState<Agent["id"]>("axioma-pro");
  const [themeMode, setThemeMode] = useState<"dark" | "light" | "system">("system");
  const [expandedSettingsSection, setExpandedSettingsSection] = useState<string | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState<boolean>(false);
  const [isClearingAllChats, setIsClearingAllChats] = useState<boolean>(false);

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

  const showToastNotice = useCallback((message: string) => {
    setToastNotice(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastNotice(null);
      toastTimerRef.current = null;
    }, 3600);
  }, []);

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

    const themeColor = isDark ? "#000000" : "#ffffff";
    const barStyle = isDark ? "black-translucent" : "default";

    root.style.backgroundColor = themeColor;
    if (document.body) {
      document.body.style.backgroundColor = themeColor;
    }

    const metaTags = document.querySelectorAll('meta[name="theme-color"]');
    if (metaTags.length > 0) {
      metaTags.forEach((el) => {
        el.removeAttribute("media");
        el.setAttribute("content", themeColor);
      });
    } else {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = themeColor;
      document.head.appendChild(meta);
    }

    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleMeta) {
      appleMeta = document.createElement("meta");
      appleMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
      document.head.appendChild(appleMeta);
    }
    appleMeta.setAttribute("content", barStyle);
  }, []);

  const handleSetTheme = useCallback(
    (mode: "dark" | "light" | "system") => {
      setThemeMode(mode);
      safeSetLocalStorage(STORAGE_KEYS.THEME, mode);
      applyTheme(mode);
    },
    [applyTheme]
  );

  // Follow OS system theme changes in real time when mode is "system"
  useEffect(() => {
    if (themeMode !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleOsThemeChange = () => {
      applyTheme("system");
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleOsThemeChange);
      return () => mediaQuery.removeEventListener("change", handleOsThemeChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleOsThemeChange);
      return () => mediaQuery.removeListener(handleOsThemeChange);
    }
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


  // Sinkronisasi Viewport iOS & Android (60fps requestAnimationFrame polling saat focusin/focusout + visualViewport)
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    let rafId: number;
    const syncViewport = () => {
      const el = document.getElementById("axioma-viewport-lock");
      if (!el) return;
      // Kunci tinggi dan posisi top dengan layout coordinates visualViewport
      const offsetTop = Math.max(0, Math.round(vv.offsetTop));
      const height = Math.round(vv.height);
      el.style.height = `${height}px`;
      el.style.top = `${offsetTop}px`;
      el.style.transform = "none";
    };

    // Polling 60fps selama 450ms saat input focus/blur agar transisi keyboard iOS mulus seperti Gemini
    const startSmoothSync = () => {
      const start = performance.now();
      const tick = (now: number) => {
        syncViewport();
        if (now - start < 450) {
          rafId = requestAnimationFrame(tick);
        }
      };
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    };

    vv.addEventListener("resize", syncViewport);
    vv.addEventListener("scroll", syncViewport);
    window.addEventListener("focusin", startSmoothSync);
    window.addEventListener("focusout", startSmoothSync);
    syncViewport();

    return () => {
      cancelAnimationFrame(rafId);
      vv.removeEventListener("resize", syncViewport);
      vv.removeEventListener("scroll", syncViewport);
      window.removeEventListener("focusin", startSmoothSync);
      window.removeEventListener("focusout", startSmoothSync);
    };
  }, []);

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

    // Load saved sidebar state
    const savedCollapsed = safeGetLocalStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    if (savedCollapsed === "true") {
      setIsDesktopSidebarCollapsed(true);
    }

    // Load saved theme
    const savedTheme =
      (safeGetLocalStorage(STORAGE_KEYS.THEME) as "dark" | "light" | "system") || "system";
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

    // Remove legacy localStorage feedback cache so feedback is strictly server-backed (#4)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("axioma_message_feedback");
      }
    } catch {
      // Ignore storage errors
    }

    // Detect Web Speech API support and touch/mobile viewport size in browser (#7)
    const updateViewportFlag = () => {
      if (typeof window !== "undefined") {
        const isTouch =
          window.innerWidth < 768 ||
          (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches);
        setIsTouchOrMobile(Boolean(isTouch));
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

    // Track online/offline status in real time (Item 5)
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
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
  }, [initialChatId]);

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

  // Guest Mode: Persist chat history metadata in localStorage
  useEffect(() => {
    if (!authUser && chatHistory.length > 0) {
      saveGuestChats(chatHistory);
    }
  }, [chatHistory, authUser]);

  // Guest Mode: Debounced persist chat session messages in localStorage
  useEffect(() => {
    if (!authUser && chats.length > 0) {
      const timer = setTimeout(() => {
        for (const c of chats) {
          if (c.messages && c.messages.length > 0) {
            saveGuestMessages(c.id, c.messages);
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [chats, authUser]);

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
    const isValidToken =
      typeof authToken === "string" &&
      authToken.trim() !== "" &&
      authToken !== "null" &&
      authToken !== "undefined";

    if (isValidToken && authUser && authUser.id) {
      headers["Authorization"] = `Bearer ${authToken.trim()}`;
      headers["X-User-Id"] = authUser.id;
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

  // Dynamic browser tab title showing active chat title (#13)
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (activeChatId && activeChatId !== "new-chat") {
      const titleFromHistory = chatHistory.find((c) => c.id === activeChatId)?.title;
      const titleFromSession = activeChat?.title;
      const resolvedTitle = (titleFromHistory || titleFromSession || "").trim();
      if (resolvedTitle && resolvedTitle !== "New Chat") {
        document.title = `${resolvedTitle} — Axioma`;
        return;
      }
    }
    document.title = "Axioma — Ruang Kerja Agen Cerdas";
  }, [activeChatId, chatHistory, activeChat?.title]);

  // Dynamic Gemini/Claude-style greeting variations (changes on new chat, mount, or refresh)
  const [dynamicGreeting, setDynamicGreeting] = useState<string>("");

  useEffect(() => {
    const picked = getRandomGreeting(displayName, Boolean(authUser));
    setDynamicGreeting(picked);
    setGreeting(picked);
  }, [activeChatId, displayName, authUser]);

  // Axioma mobile greeting helper (deterministic during SSR, randomized in useEffect on client)
  const defaultFallbackGreeting = authUser && displayName
    ? `Halo ${toTitleCase(displayName)}, apa yang Anda pikirkan?`
    : "Halo, apa yang Anda pikirkan?";

  const mobileGreeting = dynamicGreeting || defaultFallbackGreeting;

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

  // Smooth fade-in and fade-out for the AI thinking indicator
  useEffect(() => {
    if (isLoading) {
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
  }, [isLoading, showThinkingIndicator]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const val = textarea.value || "";
    if (!val || (!val.includes("\n") && val.length < 45)) {
      textarea.style.height = "24px";
      textarea.style.overflowY = "hidden";
      return;
    }
    textarea.style.height = "auto";
    const nextHeight = Math.max(24, Math.min(textarea.scrollHeight, 120));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > 120 ? "auto" : "hidden";
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

  // Open ChatGPT-style Voice Mode
  const handleOpenVoiceMode = useCallback(() => {
    if (isRecording) {
      cancelVoiceRecording();
    }
    // Synchronously unlock audio system and speech synthesis in user gesture for iOS Safari & Android compatibility
    try {
      if (typeof window !== "undefined") {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          const dummyCtx = new AudioCtxClass();
          if (dummyCtx.state === "suspended") {
            void dummyCtx.resume().catch(() => {});
          }
          void unlockAudioSystem(dummyCtx);
        }
        if ("speechSynthesis" in window) {
          window.speechSynthesis.resume();
          window.speechSynthesis.cancel();
          window.speechSynthesis.getVoices?.();
        }
      }
    } catch {}

    setIsVoiceModeOpen(true);
  }, [isRecording, cancelVoiceRecording]);

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

  // Phased thinking indicator timer (Item 3: 8s, 25s)
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
    const scrolledUp = distanceFromBottom > 96;
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

  // Body scroll lock when any dialog or modal is open (without touchAction: none which breaks iOS Safari inner scrolling)
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      isSettingsModalOpen || isClearAllConfirmOpen || editConfirmTarget || isGuestLimitModalOpen
    );
    if (!isAnyModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isSettingsModalOpen, isClearAllConfirmOpen, editConfirmTarget, isGuestLimitModalOpen]);

  const closeDesktopAgentMenu = useCallback((restoreFocus = true) => {
    setIsAgentMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => desktopAgentTriggerRef.current?.focus());
    }
  }, []);

  const closeHeaderAgentMenu = useCallback((restoreFocus = true) => {
    setIsHeaderAgentMenuOpen(false);
    setHeaderMenuTop(null);
    if (restoreFocus) {
      const trigger = headerAgentTriggerRef.current || tabletAgentTriggerRef.current;
      requestAnimationFrame(() => trigger?.focus());
    }
  }, []);

  const toggleHeaderAgentMenu = useCallback(() => {
    setIsHeaderAgentMenuOpen((prev) => {
      const next = !prev;
      const trigger = headerAgentTriggerRef.current || tabletAgentTriggerRef.current;
      if (next && trigger) {
        const rect = trigger.getBoundingClientRect();
        setHeaderMenuTop(Math.round(rect.bottom + 8));
      } else {
        setHeaderMenuTop(null);
      }
      return next;
    });
  }, []);

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
          setIsSettingsModalOpen(false);
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
        if (isMobileSidebarOpen) {
          e.preventDefault();
          setIsMobileSidebarOpen(false);
        }
      }
    };

    const handleGlobalMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;

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

      setActiveChatId(chatId);
      setCurrentSessionChatId(chatId);
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

  // Voice Mode: Send message to /api/chats/message with voice_mode: true
  const handleVoiceModeSendMessage = useCallback(
    async (
      userText: string,
      voiceMode: boolean
    ): Promise<{ aiReplyText: string; streamReader?: ReadableStreamDefaultReader<Uint8Array> | null }> => {
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

      const headers = await buildAuthHeaders();
      headers["Accept"] = "text/event-stream, application/json";

      const turnstileToken = await getTurnstileToken().catch(() => undefined);

      const response = await fetch(`${BACKEND_URL}/api/chats/message`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          chat_id: sessionPayloadId,
          content: userText,
          stream: true,
          agent_id: selectedAgent.id,
          turnstile_token: turnstileToken || undefined,
          voice_mode: voiceMode,
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
        };
      }

      const data = await response.json();
      return {
        aiReplyText: data.reply || data.content || "",
      };
    },
    [activeChatId, currentSessionChatId, selectedAgent, buildAuthHeaders, getTurnstileToken, authUser]
  );

  // Voice Mode: Save completed turn to chat history and active session
  const handleVoiceModeTurnComplete = useCallback(
    (userText: string, aiText: string) => {
      if (!userText || !aiText) return;

      const nowIso = new Date().toISOString();
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        sender: "user",
        content: userText,
        created_at: nowIso,
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
    options?: { regenerate?: boolean; tempUserMsgId?: string; attachmentIds?: string[]; mediaMode?: "image" | "video" }
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
            regenerate: Boolean(options?.regenerate),
            turnstile_token: currentTurnstileToken || undefined,
            attachment_ids: options?.attachmentIds?.length ? options.attachmentIds : undefined,
            media_mode: options?.mediaMode || undefined,
            history: !authUser
              ? (chats.find((c) => c.id === targetChatId)?.messages || [])
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

      const contentType = (response.headers.get("content-type") || "").toLowerCase();

      if (response.ok && contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let returnedChat: { id: string; title: string } | undefined;
        let returnedAgentName = activeAgentSnapshot.name;
        let returnedAgentId: string = activeAgentSnapshot.id;
        let returnedMessageId: string | undefined;

        // Initialize 30s idle timeout for active streaming (#1)
        resetIdleTimeout();

        const processRawSseEvent = (rawEvent: string) => {
          const line = rawEvent.split(/\r?\n/).find((l) => l.startsWith("data:"));
          if (!line) return;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) return;

          let payload: any;
          try {
            payload = JSON.parse(jsonStr);
          } catch {
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
          } else if (payload.type === "chunk" && typeof payload.text === "string") {
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
                          m.id === targetMsgId ? { ...m, content: currentText } : m
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
            if (payload.chat) returnedChat = payload.chat;
          } else if (payload.type === "error") {
            throw new Error(payload.error || "Gagal menerima streaming balasan dari server.");
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

        const finalContent =
          accumulatedText.trim() || "Pesan Anda diterima, tetapi tidak ada balasan yang valid.";
        const finalMsgId = returnedMessageId || activeAiMsgId;

        setChatStreamingMsgId(targetChatId, null);

        if (!streamBubbleCreated) {
          appendMessageToChat(targetChatId, {
            id: finalMsgId,
            sender: "ai",
            content: finalContent,
            agentId: returnedAgentId,
            agentName: returnedAgentName,
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

        if (!response.ok || !result?.success) {
          console.error("[AXIOMA_BACKEND_HTTP_ERROR]", {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            body: result,
          });

          if (
            response.status === 503 ||
            result?.code === "daily_quota_exceeded" ||
            (result?.error && result.error.includes("Kuota"))
          ) {
            throw new Error("Kuota AI hari ini sudah habis. Tersedia lagi pukul 07.00 WIB.");
          }
          if (response.status === 429) {
            throw new Error(
              result?.error || "Terlalu banyak permintaan pesan. Silakan tunggu sebentar lalu coba lagi."
            );
          }
          const errorDetail =
            result?.error ||
            result?.message ||
            `Server mengembalikan error (${response.status}: ${response.statusText})`;
          throw new Error(errorDetail);
        }

        if (typeof result.user_message_id === "string" && result.user_message_id && currentUserMsgId) {
          replaceMessageIdInState(targetChatId, currentUserMsgId, result.user_message_id);
          currentUserMsgId = result.user_message_id;
        }

        const aiResponseContent =
          result.data || "Pesan Anda diterima, tetapi tidak ada balasan yang valid.";
        const finalMsgId =
          typeof (result.ai_message_id || result.message_id) === "string"
            ? result.ai_message_id || result.message_id
            : activeAiMsgId;
        const returnedAgentName =
          typeof result.agent_name === "string" ? result.agent_name : activeAgentSnapshot.name;
        const returnedAgentId =
          typeof result.agent_id === "string" ? result.agent_id : activeAgentSnapshot.id;

        const newAiMsg: Message = {
          id: finalMsgId,
          sender: "ai",
          content: aiResponseContent,
          agentId: returnedAgentId,
          agentName: returnedAgentName,
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
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      focusDesktopTextarea();
      // Sync sidebar with backend so new/updated chat titles are reflected
      void refreshChatHistory();
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
    mediaModeOverride?: "image" | "video"
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
      textareaRef.current.style.height = "auto";
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

    const detectedIntent = detectMediaIntent(userText);
    const mediaModeToSend = mediaModeOverride || (activeMediaModeRef.current ? activeMediaModeRef.current : detectedIntent.type);

    setChatLoading(targetChatId, true);
    await requestAiReply(targetChatId, sessionPayloadId, userText, {
      tempUserMsgId,
      attachmentIds: effectiveAttachments.map((a) => a.id),
      mediaMode: mediaModeToSend || undefined,
    });
  };

  const handleSendMessage = async (textOverride?: string) => {
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

    if (!rawInput.trim() && pendingAttachments.length === 0) {
      return;
    }

    const readyServerAttachments = pendingAttachments
      .filter((a) => a.status === "ready" && a.serverAttachment)
      .map((a) => a.serverAttachment!);

    const currentMediaMode = activeMediaModeRef.current || activeMediaMode;
    setActiveMediaMode(null);
    activeMediaModeRef.current = null;
    setPendingAttachments([]);
    await sendTextMessage(rawInput, readyServerAttachments, currentMediaMode || undefined);
  };

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  const handleStarterPromptClick = (prompt: StarterPrompt) => {
    if (isLoading || isGenerating || isSubmittingRef.current) return;
    if (prompt.mode === "prefill") {
      const text = prompt.prefillText || prompt.label;
      setInputText(text);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(text.length, text.length);
          adjustTextareaHeight();
        }
      });
      return;
    }
    void sendTextMessage(prompt.label);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Ignore IME composition events (Gboard, Samsung keyboard, etc.)
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return;
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

  const handleCopy = (text: string, id: string) => {
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
    }, 2000);
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

  const renderStarterIcon = (icon: StarterPrompt["icon"]) => {
    switch (icon) {
      case "lightbulb":
        return <Lightbulb className="w-4 h-4 text-text-muted shrink-0" />;
      case "mail":
        return <Mail className="w-4 h-4 text-text-muted shrink-0" />;
      case "table":
        return <Table className="w-4 h-4 text-text-muted shrink-0" />;
      case "code":
        return <Code className="w-4 h-4 text-text-muted shrink-0" />;
      case "image":
        return <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />;
      case "video":
        return <Film className="w-4 h-4 text-purple-400 shrink-0" />;
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
      id="axioma-viewport-lock"
      style={{ height: "100dvh", transition: "none" }}
      className="fixed top-0 left-0 right-0 w-full flex flex-col justify-between lg:flex-row bg-black text-text-secondary font-sans antialiased overflow-hidden selection:bg-border-strong selection:text-text-primary select-none !transition-none will-change-[height,top]"
    >
      {/* Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-bg-primary/80 backdrop-blur-sm border-2 border-dashed border-border-strong flex flex-col items-center justify-center p-6 pointer-events-none animate-fade-in">
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
          className={`fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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

      {/* Clear All Chats Confirmation Dialog (Smooth Enter & Exit Animations) */}
      {shouldRenderClearAllConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-all-dialog-title"
          aria-describedby="clear-all-dialog-desc"
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md touch-none transition-opacity duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isClearAllConfirmEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isClearingAllChats) {
              setIsClearAllConfirmOpen(false);
            }
          }}
        >
          <div
            className={`w-full sm:max-w-sm rounded-t-[28px] sm:rounded-2xl bg-bg-elevated border-t sm:border border-border-subtle p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 shadow-2xl space-y-4 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain touch-auto transition-all duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
              isClearAllConfirmEntered ? "translate-y-0 opacity-100 sm:scale-100" : "translate-y-full opacity-0 sm:scale-95"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-950/50 border border-red-800/50 flex items-center justify-center shrink-0 text-red-400">
                <TriangleAlert className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <h2
                  id="clear-all-dialog-title"
                  className="text-sm font-semibold text-text-primary"
                >
                  Hapus semua percakapan?
                </h2>
                <p
                  id="clear-all-dialog-desc"
                  className="text-xs text-text-secondary leading-relaxed"
                >
                  Seluruh riwayat percakapan dan pesan Anda akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <button
                ref={clearAllCancelButtonRef}
                type="button"
                disabled={isClearingAllChats}
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-medium text-text-secondary bg-bg-surface hover:bg-bg-subtle hover:text-text-primary border border-border-subtle transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isClearingAllChats}
                onClick={confirmClearAllChats}
                className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-medium text-red-100 bg-red-600 hover:bg-red-500 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isClearingAllChats ? "Menghapus..." : "Hapus Semua"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (Enter & Exit Animated Bottom Sheet / Centered Modal) */}
      {shouldRenderSettings && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 overflow-hidden transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isSettingsEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSettingsModalOpen(false);
            }
          }}
        >
          <div
            className={`fixed sm:static inset-x-0 bottom-0 top-6 sm:inset-auto sm:top-auto sm:bottom-auto sm:my-auto z-50 sm:max-w-lg sm:w-full sm:max-h-[88vh] rounded-t-[28px] sm:rounded-[28px] bg-[#131314] px-5 pt-3 pb-8 overflow-y-auto touch-auto flex flex-col shadow-2xl border-t sm:border border-zinc-800/60 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
              isSettingsEntered
                ? "translate-y-0 opacity-100 sm:scale-100"
                : "translate-y-full opacity-0 sm:translate-y-6 sm:scale-95"
            }`}
          >
            {/* Grab handle for mobile */}
            <div className="w-10 h-1 rounded-full bg-zinc-700/80 mx-auto mb-2 shrink-0 sm:hidden" />

            {/* Circular Close Button Row (Aligned to right) */}
            <div className="flex justify-end shrink-0 mb-1">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                aria-label="Tutup setelan"
                className="w-10 h-10 rounded-full bg-[#1e1f20] hover:bg-zinc-700 active:scale-[0.96] transition-all duration-200 ease-out flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title "Setelan" (Below close button, left-aligned, adaptif & font-medium) */}
            <h1 id="settings-modal-title" className="text-[26px] sm:text-[30px] font-medium tracking-[-0.02em] text-[#e3e3e3] mt-1 mb-6">
              Setelan
            </h1>

            {/* Category 1: Account */}
            <div className="text-[14px] font-medium text-zinc-400 mb-2.5 px-1">
              Account
            </div>
            <div className="bg-[#1e1f20] rounded-[24px] py-1 mb-6 divide-y divide-white/[0.06] overflow-hidden">
              {/* Manage account */}
              <button
                type="button"
                onClick={() => setExpandedSettingsSection((prev) => (prev === "account" ? null : "account"))}
                className="w-full flex items-center justify-between px-5 py-4 min-h-[56px] text-left transition-colors hover:bg-white/[0.04] cursor-pointer"
              >
                <div className="flex items-center min-w-0">
                  <User className="w-5 h-5 text-zinc-300 mr-4 shrink-0" strokeWidth={1.75} />
                  <span className="text-[15.5px] font-normal text-[#e3e3e3] truncate">Manage account</span>
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform ${
                    expandedSettingsSection === "account" ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Expandable Manage account drawer */}
              {expandedSettingsSection === "account" && (
                <div className="px-5 py-4 bg-[#171819] space-y-3 border-t border-white/[0.06]">
                  <div>
                    <label htmlFor="settings-display-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
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
                        className="flex-1 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#1e1f20] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateDisplayName(settingsNameInput)}
                        className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-white text-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Simpan
                      </button>
                    </div>
                    {settingsNameError && (
                      <p role="alert" className="text-[11px] text-red-400 mt-1">
                        {settingsNameError}
                      </p>
                    )}
                  </div>
                  {authUser && (
                    <div className="text-xs text-zinc-400">
                      Email terhubung: <span className="font-mono text-zinc-200">{authUser.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Batas penggunaan */}
              <button
                type="button"
                onClick={() => setExpandedSettingsSection((prev) => (prev === "quota" ? null : "quota"))}
                className="w-full flex items-center justify-between px-5 py-4 min-h-[56px] text-left transition-colors hover:bg-white/[0.04] cursor-pointer"
              >
                <div className="flex items-center min-w-0">
                  <Clock className="w-5 h-5 text-zinc-300 mr-4 shrink-0" strokeWidth={1.75} />
                  <span className="text-[15.5px] font-normal text-[#e3e3e3] truncate">Batas penggunaan</span>
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform ${
                    expandedSettingsSection === "quota" ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Expandable Quota Details */}
              {expandedSettingsSection === "quota" && (
                <div className="px-5 py-4 bg-[#171819] space-y-2 text-xs border-t border-white/[0.06]">
                  <p className="text-zinc-300 leading-relaxed text-sm">
                    {authUser
                      ? "Akun Anda memiliki akses tanpa batas untuk percakapan dan inferensi model AI Axioma Pro."
                      : `Mode Tamu dibatasi maksimal ${GUEST_MAX_MESSAGES} pesan gratis (${Math.max(0, GUEST_MAX_MESSAGES - guestMessageCount)} tersisa). Masuk untuk menikmati akses tanpa batas.`}
                  </p>
                  {!authUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsModalOpen(false);
                        setIsAuthModalOpen(true);
                      }}
                      className="mt-2 px-4 py-2 rounded-xl bg-zinc-200 hover:bg-white text-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Hubungkan Akun
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Category 2: Preferensi */}
            <div className="text-[14px] font-medium text-zinc-400 mb-2.5 px-1">
              Preferensi
            </div>
            <div className="bg-[#1e1f20] rounded-[24px] py-1 mb-6 divide-y divide-white/[0.06] overflow-hidden">
              {/* Notifikasi */}
              <div className="w-full px-5 py-4 min-h-[56px] flex items-center justify-between text-left">
                <div className="flex items-center min-w-0">
                  <Bell className="w-5 h-5 text-zinc-300 mr-4 shrink-0" strokeWidth={1.75} />
                  <span className="text-[15.5px] font-normal text-[#e3e3e3] truncate">Notifikasi</span>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
              </div>

              {/* Model Default */}
              <button
                type="button"
                onClick={() => setExpandedSettingsSection((prev) => (prev === "agent" ? null : "agent"))}
                className="w-full px-5 py-4 min-h-[56px] flex items-center justify-between gap-3 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <div className="flex items-center min-w-0">
                  <Bot className="w-5 h-5 text-zinc-300 mr-4 shrink-0" strokeWidth={1.75} />
                  <span className="text-[15.5px] font-normal text-[#e3e3e3] truncate">Model Default</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[14px] text-zinc-400 whitespace-nowrap max-w-[140px] sm:max-w-[180px] truncate">
                    {AVAILABLE_AGENTS.find((a) => a.id === defaultAgentId)?.name || "Axioma Pro"}
                  </span>
                  <ChevronRight
                    className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform ${
                      expandedSettingsSection === "agent" ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Expandable Model Selector (Auto-save) */}
              {expandedSettingsSection === "agent" && (
                <div className="px-5 py-4 bg-[#171819] space-y-2 border-t border-white/[0.06]">
                  {AVAILABLE_AGENTS.map((agent) => {
                    const isChecked = defaultAgentId === agent.id;
                    return (
                      <label
                        key={agent.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-zinc-800/90 border-zinc-600 text-white shadow-xs"
                            : "bg-[#1e1f20]/60 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="radio"
                            name="defaultAgent"
                            value={agent.id}
                            checked={isChecked}
                            onChange={() => handleSelectDefaultAgent(agent.id)}
                            className="w-4 h-4 accent-white cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-zinc-100">{agent.name}</div>
                            <div className="text-xs text-zinc-400 line-clamp-1">{agent.description}</div>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium border border-zinc-700 ml-2 shrink-0">
                          {agent.tag}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Penyimpanan Riwayat */}
              <div className="w-full px-5 py-4 min-h-[56px] flex items-center justify-between gap-3 text-left">
                <div className="flex items-center shrink-0">
                  <Database className="w-5 h-5 text-zinc-300 mr-4 shrink-0" strokeWidth={1.75} />
                  <span className="text-[15.5px] font-normal text-[#e3e3e3] whitespace-nowrap">Penyimpanan Riwayat</span>
                </div>
                <span className="text-[14px] text-zinc-400 whitespace-nowrap shrink-0 text-right">
                  {authUser ? "Cloud & Lokal" : "Hanya Lokal"}
                </span>
              </div>

              {/* Pintasan Keyboard */}
              <button
                type="button"
                onClick={() => setExpandedSettingsSection((prev) => (prev === "shortcuts" ? null : "shortcuts"))}
                className="w-full px-5 py-4 min-h-[56px] flex items-center justify-between text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <div className="flex items-center min-w-0">
                  <Keyboard className="w-5 h-5 text-zinc-300 mr-4 shrink-0" strokeWidth={1.75} />
                  <span className="text-[15.5px] font-normal text-[#e3e3e3] truncate">Pintasan Keyboard</span>
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform ${
                    expandedSettingsSection === "shortcuts" ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Expandable Keyboard Shortcuts */}
              {expandedSettingsSection === "shortcuts" && (
                <div className="px-5 py-4 bg-[#171819] space-y-2 text-xs border-t border-white/[0.06]">
                  <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-400">Cari percakapan</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[11px] text-zinc-300">
                      Ctrl / ⌘ K
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-400">Percakapan baru</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[11px] text-zinc-300">
                      Ctrl / ⌘ ⇧ O
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-400">Hentikan balasan</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px] text-zinc-300">
                      Esc
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-zinc-400">Kirim pesan</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px] text-zinc-300">
                      Enter
                    </kbd>
                  </div>
                </div>
              )}

              {/* Tema Row (Menyerupai Referensi Gambar 1) */}
              <div className="w-full px-5 py-4 min-h-[56px] flex items-center justify-between text-left">
                <div className="flex items-center min-w-0">
                  <Moon className="w-5 h-5 text-zinc-300 mr-4 shrink-0" strokeWidth={1.75} />
                  <span className="text-[15.5px] font-normal text-[#e3e3e3] truncate">Tema</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={themeMode}
                    onChange={(e) => handleSetTheme(e.target.value as "dark" | "light" | "system")}
                    className="appearance-none bg-transparent text-[14px] font-normal text-zinc-400 border-0 cursor-pointer focus:outline-none pr-1 text-right"
                  >
                    <option value="system" className="bg-[#1e1f20] text-white">Default sistem</option>
                    <option value="dark" className="bg-[#1e1f20] text-white">Gelap</option>
                    <option value="light" className="bg-[#1e1f20] text-white">Terang</option>
                  </select>
                  <ChevronsUpDown className="w-4 h-4 text-zinc-400 shrink-0 pointer-events-none" />
                </div>
              </div>

              {/* Hapus Semua Percakapan */}
              <button
                type="button"
                onClick={() => {
                  setIsSettingsModalOpen(false);
                  setIsClearAllConfirmOpen(true);
                }}
                className="w-full px-5 py-4 min-h-[56px] flex items-center justify-between text-left hover:bg-red-950/20 transition-colors cursor-pointer text-red-400 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Trash className="w-5 h-5 text-red-400 mr-4 shrink-0" strokeWidth={1.75} />
                  <span className="text-[15.5px] font-normal text-red-400 truncate">Hapus semua percakapan</span>
                </div>
                <ChevronRight className="w-5 h-5 text-red-400/50 group-hover:text-red-400 transition-colors shrink-0" />
              </button>
            </div>

            {/* Clean Version Footer */}
            <div className="pt-2 pb-6 text-center text-xs text-zinc-500 space-y-1">
              <div>Axioma v2.5</div>
              <div className="text-[11px] leading-relaxed">
                Riwayat percakapan tersimpan secara aman di peramban perangkat ini.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared Profile Sheet / Modal (Enter & Exit Animated Bottom Sheet / Centered Modal) */}
      {shouldRenderProfile && (
        <div
          role="dialog"
          aria-modal="true"
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 overflow-hidden transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isProfileEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsProfileDropdownOpen(false);
            }
          }}
        >
          {/* Popup Container (Bottom-sheet on mobile, centered modal on sm+) */}
          <div
            ref={profileDropdownRef}
            className={`fixed sm:static inset-x-0 bottom-0 sm:inset-auto sm:top-auto sm:bottom-auto sm:my-auto z-50 sm:max-w-md w-full rounded-t-[28px] sm:rounded-[28px] bg-[#1e1f20] p-5 min-h-[80vh] sm:min-h-0 sm:max-h-[88vh] max-h-[92dvh] flex flex-col justify-between shadow-2xl border-t sm:border border-zinc-800/60 overflow-y-auto touch-auto transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
              isProfileEntered
                ? "translate-y-0 opacity-100 sm:scale-100"
                : "translate-y-full opacity-0 sm:translate-y-6 sm:scale-95"
            }`}
          >
            {/* Top Area: Drag handle & "Selesai" Action */}
            <div className="shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-700/60 mx-auto -mt-1 mb-2 sm:hidden" />

              <div className="flex justify-end pb-3">
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="text-[16px] font-medium text-blue-300 hover:text-blue-200 active:scale-[0.96] transition-all duration-200 ease-out cursor-pointer"
                >
                  Selesai
                </button>
              </div>

              {/* Card 1: Main User Account Card */}
              <div className="bg-[#131314] rounded-3xl p-4 flex items-center justify-between gap-4 mb-3.5 border border-zinc-800/40 shadow-sm">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="relative w-14 h-14 rounded-full shrink-0">
                    <div className="w-14 h-14 rounded-full bg-purple-600 text-white font-bold text-2xl flex items-center justify-center overflow-hidden shadow-inner">
                      {authUser ? (
                        <span className="text-2xl font-bold uppercase">
                          {(userName || "N").trim().charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-2xl font-bold uppercase">{toTitleCase(userName)?.charAt(0) || "T"}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        setSettingsNameInput(displayName);
                        setSettingsNameError(null);
                        setSettingsDefaultAgentInput(defaultAgentId);
                        setExpandedSettingsSection("account");
                        setIsSettingsModalOpen(true);
                      }}
                      title="Ubah nama tampilan"
                      aria-label="Ubah nama tampilan"
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1e1f20] border border-zinc-700 text-zinc-300 flex items-center justify-center hover:bg-zinc-700 cursor-pointer transition-colors shadow-sm"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1 ml-4">
                    <div className="text-[18px] font-semibold text-white truncate">
                      {displayName ? toTitleCase(displayName) : (authUser ? "Pengguna" : "Mode Tamu")}
                    </div>
                    <div className="text-[14px] text-zinc-400 truncate mt-0.5">
                      {authUser?.email || "Mode Tamu (Lokal)"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    setSettingsNameInput(displayName);
                    setSettingsNameError(null);
                    setSettingsDefaultAgentInput(defaultAgentId);
                    setExpandedSettingsSection("account");
                    setIsSettingsModalOpen(true);
                  }}
                  aria-label="Pengaturan akun"
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center shrink-0 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Separate Standalone Capsule Buttons */}
              <div className="space-y-2.5">
                {/* Button 1: Kelola Akun Google Anda / Masuk dengan Google */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    if (!authUser) {
                      setIsAuthModalOpen(true);
                    } else {
                      setSettingsNameInput(displayName);
                      setSettingsNameError(null);
                      setSettingsDefaultAgentInput(defaultAgentId);
                      setExpandedSettingsSection("account");
                      setIsSettingsModalOpen(true);
                    }
                  }}
                  className="w-full bg-[#131314] hover:bg-zinc-800 active:scale-[0.98] rounded-2xl px-5 py-4 flex items-center justify-between text-[16px] font-medium text-white transition-all duration-150 cursor-pointer text-left border border-zinc-800/40 shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span className="text-[16px] font-medium text-white truncate">
                      {authUser ? "Kelola Akun Google Anda" : "Masuk dengan Google"}
                    </span>
                  </div>
                </button>

                {/* Button 2: Setelan */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    setSettingsNameInput(displayName);
                    setSettingsNameError(null);
                    setSettingsDefaultAgentInput(defaultAgentId);
                    setIsSettingsModalOpen(true);
                  }}
                  className="w-full bg-[#131314] hover:bg-zinc-800 active:scale-[0.98] rounded-2xl px-5 py-4 flex items-center justify-between text-[16px] font-medium text-white transition-all duration-150 cursor-pointer text-left border border-zinc-800/40 shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <Settings className="w-5 h-5 text-zinc-300 shrink-0" strokeWidth={1.75} />
                    <span className="text-[16px] font-medium text-white">Setelan</span>
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
                    className="w-full bg-[#131314] hover:bg-red-950/30 active:scale-[0.98] rounded-2xl px-5 py-4 flex items-center gap-3.5 text-[16px] font-medium text-red-400 hover:text-red-300 transition-all duration-150 cursor-pointer text-left border border-zinc-800/40 shadow-sm"
                  >
                    <LogOut className="w-5 h-5 text-red-400 shrink-0" strokeWidth={1.75} />
                    <span>Keluar dari Akun</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Footer Links (Exact to Reference Image 2) */}
            <div className="text-center text-xs text-zinc-400 space-y-2 mt-auto pt-6 pb-2">
              <div>
                <Link
                  href="/privasi"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="hover:text-zinc-200 transition-colors"
                >
                  Kebijakan Privasi
                </Link>
              </div>
              <div className="text-zinc-600 font-bold">•</div>
              <div>
                <Link
                  href="/ketentuan"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="hover:text-zinc-200 transition-colors"
                >
                  Persyaratan Layanan
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Off-canvas Backdrop (Smooth Enter & Exit Blur Transition) */}
      {shouldRenderSidebarBackdrop && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsMobileSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
              setIsMobileSidebarOpen(false);
            }
          }}
          className={`fixed inset-0 z-40 bg-black/65 backdrop-blur-xs lg:hidden transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isSidebarBackdropEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          aria-label="Tutup latar bilah sisi"
        />
      )}

      {/* Responsive Sidebar */}
      <aside
        aria-label="Riwayat percakapan"
        className={`fixed inset-y-0 left-0 z-40 w-[272px] max-w-[85vw] bg-bg-primary border-r border-border-subtle flex flex-col transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:static ${
          isDesktopSidebarCollapsed
            ? "lg:w-0 lg:opacity-0 lg:pointer-events-none lg:border-r-0 lg:p-0 overflow-hidden"
            : "lg:w-[268px] lg:opacity-100 lg:translate-x-0"
        } ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/axioma-logo.png"
              alt="Axioma"
              width={32}
              height={32}
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-lg shrink-0 dark:ring-1 dark:ring-white/10"
              priority
            />
            <span className="font-semibold text-xs tracking-tight uppercase text-text-primary">
              Axioma
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden w-11 h-11 min-w-[44px] min-h-[44px] p-2.5 rounded-lg text-icon-muted hover:text-text-primary hover:bg-bg-surface transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Actions & Navigation */}
        {!authUser ? (
          <div className="px-3 pb-2 space-y-3 shrink-0">
            {/* New Chat Button */}
            <button
              type="button"
              onClick={() => {
                handleCreateNewChat();
                if (isTouchOrMobile) setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-full bg-[#1e1f20] hover:bg-[#282a2c] border-none px-4 py-3 text-[14.5px] font-medium text-[#e3e3e3] transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <span className="flex items-center gap-2.5">
                <Plus className="w-4 h-4 text-zinc-300" />
                <span>Percakapan Baru</span>
              </span>
            </button>

            {/* Guest Mode Cloud Sync Prompt Banner */}
            <div className="bg-[#161718] border border-white/[0.05] rounded-[22px] p-4 flex flex-col gap-3 shrink-0">
              <div className="flex items-start gap-2.5">
                <Cloud className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                <div className="text-[13px] leading-relaxed text-zinc-400">
                  <span className="text-[14.5px] font-medium text-white block mb-0.5">Cadangkan Percakapan</span>
                  Hubungkan akun untuk menyimpan riwayat chat agar bisa diakses dari perangkat lain.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="w-full rounded-full py-2.5 text-[14px] font-medium bg-white text-black hover:bg-zinc-200 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Hubungkan Akun</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="px-3 pb-2 space-y-2.5 shrink-0">
            {/* New Chat Button for Authenticated Users */}
            <button
              type="button"
              onClick={() => {
                handleCreateNewChat();
                if (isTouchOrMobile) setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-full bg-[#1e1f20] hover:bg-[#282a2c] border-none px-4 py-3 text-[14.5px] font-medium text-[#e3e3e3] transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <span className="flex items-center gap-2.5">
                <Plus className="w-4 h-4 text-zinc-300" />
                <span>Percakapan Baru</span>
              </span>
            </button>

            {/* Real-time Search Filter for Authenticated Users */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-icon-muted absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isTouchOrMobile ? "Cari percakapan..." : "Cari percakapan... (Ctrl+K)"}
                aria-label="Cari percakapan"
                disabled={!isMobileSidebarOpen && (isTouchOrMobile || (typeof window !== "undefined" && window.innerWidth < 1024))}
                tabIndex={isMobileSidebarOpen || (!isTouchOrMobile && (typeof window === "undefined" || window.innerWidth >= 1024)) ? 0 : -1}
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-bg-surface border border-border-subtle text-base lg:text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Bersihkan pencarian"
                  className="absolute right-2 p-0.5 rounded text-icon-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Grouped Chat History (Only visible when user is logged in) */}
        {authUser ? (
          <div className="flex-1 overflow-y-auto touch-auto px-2 py-1 space-y-4">
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
                      className={`group relative flex items-center min-h-11 lg:min-h-0 rounded-lg transition-colors ${
                        isActive
                          ? "bg-bg-surface text-text-primary font-semibold shadow-xs"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-surface/60"
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
                            className="flex-1 min-w-0 bg-bg-elevated border border-border-strong rounded px-2 py-0.5 text-base lg:text-xs text-text-primary focus:outline-none focus:border-border-strong"
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
                            <span
                              className={`truncate ${
                                isActive
                                  ? "font-semibold text-text-primary"
                                  : "font-medium text-text-secondary group-hover:text-text-primary"
                              }`}
                            >
                              {chat.title}
                            </span>
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
                                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 focus:bg-red-950/40 focus:text-red-300 focus:outline-none flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash className="w-3.5 h-3.5 text-red-400" />
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
      ) : (
        <div className="flex-1" />
      )}

        {/* User Profile & Settings Menu (Item 4 & Item 7) */}
        <div className="p-2 border-t border-border-subtle shrink-0 relative flex items-center justify-between gap-1">
          <button
            ref={settingsTriggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={isSettingsMenuOpen}
            onClick={() => setIsSettingsMenuOpen((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                setIsSettingsMenuOpen(true);
              }
            }}
            className="flex-1 flex items-center gap-2.5 p-2 rounded-xl hover:bg-bg-surface transition-colors cursor-pointer group text-left min-w-0"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold tracking-tight select-none overflow-hidden shadow-xs">
              {authUser ? (
                <div className="w-full h-full rounded-full bg-purple-600 text-white flex items-center justify-center">
                  <span className="uppercase font-semibold select-none text-white text-xs">
                    {(userName || "N").trim().charAt(0).toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="w-full h-full rounded-full bg-bg-surface border border-border-subtle text-text-secondary flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium tracking-tight text-text-primary truncate">
                {authUser ? userName : "Mode Tamu"}
              </div>
              <div className="text-xs text-text-muted truncate">
                {authUser
                  ? (authUser?.email || "Akun terhubung")
                  : `${Math.max(0, GUEST_MAX_MESSAGES - guestMessageCount)} pesan tamu tersisa`}
              </div>
            </div>
          </button>

          {/* Item 7: Directly open Settings Modal on clicking gear icon */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSettingsNameInput(displayName);
              setSettingsNameError(null);
              setSettingsDefaultAgentInput(defaultAgentId);
              setIsSettingsModalOpen(true);
            }}
            aria-label="Buka Pengaturan"
            title="Pengaturan"
            className="w-11 h-11 min-w-[44px] min-h-[44px] lg:w-9 lg:h-9 lg:min-w-0 lg:min-h-0 p-2 rounded-xl text-icon-muted hover:text-text-primary hover:bg-bg-surface transition-colors flex items-center justify-center cursor-pointer shrink-0"
          >
            <Settings className="w-4 h-4" />
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
              className="absolute bottom-full left-2 right-2 mb-2 z-50 rounded-xl bg-bg-elevated border border-border-subtle p-1.5 shadow-2xl space-y-0.5"
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
                  setSettingsNameInput(displayName);
                  setSettingsNameError(null);
                  setSettingsDefaultAgentInput(defaultAgentId);
                  setIsSettingsModalOpen(true);
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
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 focus:bg-red-950/40 focus:text-red-300 focus:outline-none flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5 text-red-400" />
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
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 focus:bg-red-950/40 focus:text-red-300 focus:outline-none flex items-center gap-2 transition-colors cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
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
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="shrink-0 w-full flex items-center justify-between px-4 py-2.5 z-20 bg-black border-b-0 md:border-b md:border-border-subtle md:h-14">
          {/* Mobile Header (< md) - Modern AI Pattern */}
          <div className="flex md:hidden items-center justify-between w-full">
            {/* Left: 36px (w-9 h-9) circular hamburger menu */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="w-9 h-9 rounded-full bg-[#1e1f20] border-none text-zinc-300 hover:text-white active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              aria-label="Buka bilah sisi"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>

            {/* Center: Axioma + model name without border box (Persis Gemini) */}
            <button
              ref={headerAgentTriggerRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={isHeaderAgentMenuOpen}
              onClick={toggleHeaderAgentMenu}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full active:opacity-75 transition-opacity cursor-pointer focus:outline-none"
              aria-label={`Pilih model AI, saat ini ${selectedAgent.name}`}
            >
              <span className="text-[17px] font-medium tracking-[-0.01em] text-[#e3e3e3] flex items-center">
                <span>Axioma {selectedAgent.shortName}</span>
                <ChevronDown className="w-4 h-4 text-zinc-400 ml-1" />
              </span>
            </button>

            {/* Right: Circular New Chat (w-9 h-9) + Circular Avatar Initial (w-9 h-9) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCreateNewChat()}
                aria-label="Percakapan Baru"
                title="Percakapan Baru"
                className="w-9 h-9 rounded-full bg-[#1e1f20] border-none text-zinc-300 hover:text-white active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              >
                <SquarePen className="w-[18px] h-[18px]" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
                  aria-label="Buka menu profil dan akun"
                  title={authUser ? "Profil Akun" : "Mode Tamu — Hubungkan Akun"}
                  className="w-9 h-9 rounded-full bg-purple-600 border-none flex items-center justify-center cursor-pointer select-none overflow-hidden active:scale-95 transition-all text-white text-sm font-semibold uppercase"
                >
                  {authUser ? (
                    <span className="uppercase font-semibold select-none text-white text-[15px]">
                      {(userName || "N").trim().charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="w-4 h-4 text-zinc-300" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Desktop & Tablet Header (>= md) */}
          <div className="hidden md:flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {/* Desktop Sidebar Toggle Button (Item 8) */}
              <button
                type="button"
                onClick={toggleDesktopSidebar}
                title={isDesktopSidebarCollapsed ? "Tampilkan bilah sisi" : "Sembunyikan bilah sisi"}
                aria-label={isDesktopSidebarCollapsed ? "Tampilkan bilah sisi" : "Sembunyikan bilah sisi"}
                className="hidden lg:flex min-w-[36px] min-h-[36px] items-center justify-center p-2 rounded-lg text-icon-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
              >
                {isDesktopSidebarCollapsed ? (
                  <PanelLeft className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>

              {/* New Chat icon button in Header when desktop sidebar is collapsed (UI Bug 3) */}
              {isDesktopSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => handleCreateNewChat()}
                  title="Percakapan Baru (Ctrl+Shift+O)"
                  aria-label="Percakapan Baru"
                  className="hidden lg:flex min-w-[36px] min-h-[36px] items-center justify-center p-2 rounded-lg text-icon-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
                >
                  <SquarePen className="w-4 h-4" />
                </button>
              )}

              {/* Tablet Hamburger Menu (md to lg) */}
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden w-11 h-11 min-w-[44px] min-h-[44px] p-2.5 rounded-lg text-icon-muted hover:text-text-primary active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                aria-label="Buka bilah sisi"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 lg:hidden">
                <Image
                  src="/brand/axioma-logo.png"
                  alt="Axioma"
                  width={28}
                  height={28}
                  className="w-7 h-7 object-contain rounded-lg shrink-0 dark:ring-1 dark:ring-white/10"
                  priority
                />
                <span className="text-sm font-semibold tracking-tight text-text-primary">
                  Axioma
                </span>
              </div>

              {/* Tablet Header Model Selector (md to lg) */}
              <div className="relative lg:hidden">
                <button
                  ref={tabletAgentTriggerRef}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isHeaderAgentMenuOpen}
                  onClick={toggleHeaderAgentMenu}
                  className="text-xs font-medium tracking-tight text-text-secondary hover:text-text-primary bg-bg-surface border border-border-subtle min-h-[44px] px-3.5 py-2.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer hover:bg-bg-subtle"
                  aria-label="Pilih model"
                >
                  <span>{selectedAgent.shortName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-icon-muted" />
                </button>
              </div>
            </div>

            {/* Desktop & Tablet Right Action */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCreateNewChat()}
                aria-label="Percakapan Baru"
                title="Percakapan Baru"
                className="lg:hidden w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
                aria-label="Buka menu profil dan akun"
                title={authUser ? "Profil Akun" : "Mode Tamu — Hubungkan Akun"}
                className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center cursor-pointer shadow-xs select-none overflow-hidden active:scale-95 transition-all ${
                  authUser
                    ? "bg-purple-600 text-white font-semibold text-xs uppercase"
                    : "bg-bg-surface border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                }`}
              >
                {authUser ? (
                  <span className="uppercase font-semibold select-none text-white text-sm">
                    {(userName || "N").trim().charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="w-4 h-4 text-text-secondary" />
                )}
              </button>
            </div>
          </div>

          {/* Shared Header Agent Menu Dropdown (Smooth Enter & Exit Two-Way Animation) */}
          {shouldRenderHeaderAgentMenu && (
            <>
              {/* Backdrop */}
              <div
                className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isHeaderAgentMenuEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => closeHeaderAgentMenu(true)}
                aria-hidden="true"
              />

              {/* Mobile Fixed Model Menu */}
              <div
                ref={headerAgentMenuRef}
                role="menu"
                aria-label="Pilih model AI"
                onKeyDown={(e) =>
                  handleMenuArrowKeyDown(e, headerAgentItemRefs.current, () =>
                    closeHeaderAgentMenu(true)
                  )
                }
                style={headerMenuTop ? { top: `${headerMenuTop}px` } : undefined}
                className={`fixed left-4 right-4 top-[calc(env(safe-area-inset-top,0px)+64px)] z-50 max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto max-h-[70dvh] overflow-y-auto rounded-2xl bg-bg-elevated border border-border-strong p-2 shadow-2xl space-y-1.5 focus:outline-none origin-top transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
                  isHeaderAgentMenuEntered
                    ? "scale-100 opacity-100 translate-y-0"
                    : "scale-95 opacity-0 -translate-y-2 pointer-events-none"
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
                      className={`w-full text-left p-3 rounded-lg text-xs tracking-tight active:scale-[0.98] transition-all duration-150 flex flex-col gap-1.5 focus:outline-none focus:ring-1 focus:ring-border-strong cursor-pointer border ${
                        isSelected
                          ? "bg-bg-surface border-border-subtle text-text-primary font-medium"
                          : "border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-surface/50"
                      }`}
                    >
                      {/* Baris atas: nama model (kiri) & badge (kanan) */}
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-text-primary text-sm tracking-tight truncate">
                            {agent.name}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-text-primary shrink-0" />
                          )}
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-bg-surface text-text-secondary font-medium border border-border-subtle shrink-0 whitespace-nowrap">
                          {agent.tag}
                        </span>
                      </div>

                      {/* Baris bawah: deskripsi selebar penuh */}
                      <p className="text-sm text-text-muted leading-snug break-words">
                        {agent.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </header>

        {/* Dynamic Chat Workspace */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* Mobile Empty State Center View (< md) */}
          {!hasMessages &&
            !(
              isChatAreaLoading &&
              Boolean(initialChatId || (activeChatId && activeChatId !== "new-chat"))
            ) && (
              <div
                className={`md:hidden flex-1 min-h-0 w-full overflow-y-auto flex flex-col items-center justify-center px-6 text-center pointer-events-none ${
                  isEmptyDecorationsExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
                }`}
              >
                <div className="w-full max-w-[340px] mx-auto flex flex-col items-center">
                  {/* Brand Logo with subtle glow (Ukuran proporsional ala Gemini Star) */}
                  <div className="relative group mb-2.5 sm:mb-4">
                    <div className="absolute -inset-3 bg-gradient-to-tr from-blue-600/40 via-indigo-600/30 to-cyan-500/25 rounded-full blur-xl opacity-80 pointer-events-none" />
                    <div className="relative rounded-2xl bg-zinc-900/90 dark:bg-[#141416]/95 border border-zinc-700/60 dark:border-white/10 flex items-center justify-center shadow-2xl p-2 backdrop-blur-md w-11 h-11 sm:w-14 sm:h-14">
                      <Image
                        src="/brand/axioma-logo.png"
                        alt="Axioma"
                        width={48}
                        height={48}
                        className="w-full h-full object-contain"
                        priority
                      />
                    </div>
                  </div>

                  {/* Sapaan besar (Persis ukuran dan ketebalan font Gemini, selalu muat utuh di ruang tersisa) */}
                  <h1 className="text-[24px] sm:text-[28px] leading-[1.28] font-normal sm:font-medium tracking-[-0.015em] text-[#e3e3e3] text-center max-w-[310px] mx-auto text-balance whitespace-pre-line animate-fade-in">
                    {mobileGreeting}
                  </h1>
                </div>
              </div>
            )}

          {/* Floating Notification Toast (#10: e.g. "Percakapan tidak ditemukan") */}
          {toastNotice && (
            <div
              role="status"
              aria-live="polite"
              className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-bg-elevated border border-border-strong text-xs font-medium text-text-primary shadow-2xl flex items-center gap-2 animate-user-bubble"
            >
              <CircleAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{toastNotice}</span>
            </div>
          )}

          {/* Floating Toast Feedback "Teks disalin!" */}
          {copied && (
            <div
              role="status"
              aria-live="polite"
              className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-zinc-900/95 dark:bg-zinc-800/95 text-white border border-zinc-700/60 shadow-2xl flex items-center gap-2 text-xs font-medium backdrop-blur-md animate-modal-pop duration-200 pointer-events-none select-none will-change-transform"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Teks disalin!</span>
            </div>
          )}

          {/* Active State History with Smooth Message Entrance Animations */}
          <div
            key={activeChatId}
            ref={scrollRef}
            onScroll={handleChatScroll}
            className={`flex-1 min-h-0 overflow-y-auto touch-auto transition-opacity duration-300 ease-out animate-cross-fade will-change-transform ${
              hasMessages ||
              (isChatAreaLoading &&
                Boolean(initialChatId || (activeChatId && activeChatId !== "new-chat")))
                ? "opacity-100 py-6 px-4"
                : "opacity-0 pointer-events-none py-0 hidden md:flex"
            } max-w-2xl lg:max-w-3xl mx-auto w-full flex flex-col gap-5 sm:gap-6 md:gap-8`}
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
                const userTime = formatMessageTime(message.created_at);

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
                          className="w-full bg-transparent text-text-primary text-base lg:text-[15px] leading-relaxed resize-none focus:outline-none"
                          autoFocus
                          aria-label="Edit pesan pengguna"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border-subtle">
                          <button
                            type="button"
                            onClick={handleCancelEditUserMessage}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary bg-bg-surface hover:bg-bg-subtle hover:text-text-primary border border-border-subtle transition-colors cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={!editingUserMsgText.trim() || isSubmittingEdit}
                            onClick={() => handleSubmitEditUserMessage(message.id, editingUserMsgText)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-text-primary text-bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer"
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
                    className="w-full flex justify-end animate-user-bubble group relative my-0 sm:my-1"
                  >
                    <div className="flex flex-col items-end max-w-[85%] lg:max-w-[70%]">
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
                        <div className="relative px-4 py-2.5 rounded-2xl bg-bg-surface text-text-primary text-[15px] leading-relaxed tracking-normal shadow-xs border border-border-subtle whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      )}

                      {/* Action bar on hover (Item 2) & Timestamp (Item 12) */}
                      <div className="flex items-center gap-1 mt-0.5 sm:mt-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {userTime && (
                          <span className="text-[11px] text-text-muted mr-1.5 select-none font-mono">
                            {userTime}
                          </span>
                        )}
                        <div className="relative flex items-center">
                          <button
                            type="button"
                            onClick={() => handleCopy(message.content, `user-${message.id}`)}
                            title="Salin pesan"
                            aria-label="Salin pesan pengguna"
                            className="w-11 h-11 min-w-[44px] min-h-[44px] lg:w-7 lg:h-7 lg:min-w-0 lg:min-h-0 p-2 lg:p-1.5 rounded-lg text-icon-muted hover:text-text-primary hover:bg-bg-surface transition-colors flex items-center justify-center cursor-pointer"
                          >
                            {copiedId === `user-${message.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {copiedId === `user-${message.id}` && (
                            <span className="absolute right-full mr-1.5 px-2 py-0.5 rounded-md bg-zinc-900 text-white text-[11px] font-medium whitespace-nowrap shadow-md border border-zinc-800 animate-in fade-in zoom-in-95 duration-150 z-30 flex items-center gap-1 pointer-events-none">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Teks disalin!</span>
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartEditUserMessage(message)}
                          title="Edit pesan"
                          aria-label="Edit pesan pengguna"
                          className="w-11 h-11 min-w-[44px] min-h-[44px] lg:w-7 lg:h-7 lg:min-w-0 lg:min-h-0 p-2 lg:p-1.5 rounded-lg text-icon-muted hover:text-text-primary hover:bg-bg-surface transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              if (message.isError) {
                return (
                  <div
                    key={message.id}
                    className="flex justify-start animate-error-shake w-full"
                  >
                    <div className="w-full rounded-2xl bg-red-50 border border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-200 px-4 py-3.5 space-y-2.5 shadow-xs">
                      <div className="flex items-start gap-2.5 text-sm font-medium">
                        <CircleAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="font-semibold text-red-900 dark:text-red-200">{message.content}</div>
                          {message.errorDetail && (
                            <div className="text-xs text-red-700 dark:text-red-300 font-normal leading-relaxed">
                              {message.errorDetail}
                            </div>
                          )}
                        </div>
                      </div>
                      {message.retryPayload && (
                        <div className="pt-1">
                          <button
                            type="button"
                            disabled={isLoading || isGenerating}
                            onClick={() => handleRetry(message.id, message.retryPayload!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 text-white dark:bg-red-900/60 dark:hover:bg-red-900/80 dark:text-red-100 border border-red-600 dark:border-red-700/50 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Coba lagi</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              const msgFeedback = feedback[message.id]?.rating;
              const isLastAi = message.id === lastAiMessageId;
              const isStreamingThisMessage = streamingMessageId === message.id;
              const agentBadgeText = message.agentName || selectedAgent.name;

              return (
                <div
                  key={message.id}
                  className="w-full flex justify-start animate-ai-bubble group relative transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-2"
                >
                  <div className="w-full space-y-2 sm:space-y-3 min-w-0">
                    <div
                      className={`axioma-markdown max-w-[70ch] text-text-secondary text-[15px] leading-[1.7] tracking-normal break-words transition-opacity duration-200 ${
                        isStreamingThisMessage ? "streaming-prose" : ""
                      }`}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
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
                                        className="px-1.5 py-0.5 mx-0.5 rounded-md bg-bg-surface border border-border-subtle text-text-primary font-mono text-[13px]"
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
                                      onCopy={() => handleCopy(rawCode, copyKey)}
                                      isCopied={copiedId === copyKey}
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
                                className="text-text-primary underline underline-offset-4 decoration-border-strong hover:decoration-text-primary transition-colors"
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
                                alt={String(alt || "Gambar Hasil AI")}
                                onOpenLightbox={(url, name) => setLightboxImage({ url, name })}
                              />
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    {/* Message Action Icons + Agent Label: fade-in after streaming finishes */}
                    <div
                      aria-hidden={isStreamingThisMessage}
                      className={`w-full flex items-center gap-2 pt-0.5 transition-[opacity,transform] duration-200 ease-out motion-safe-transform ${
                        isStreamingThisMessage
                          ? "opacity-0 translate-y-1 pointer-events-none select-none"
                          : "opacity-100 translate-y-0"
                      }`}
                    >
                      <div className="flex items-center gap-1 text-icon-muted">
                        {/* Copy button */}
                        <div className="relative flex items-center">
                          <button
                            type="button"
                            onClick={() => handleCopy(message.content, message.id)}
                            title={copiedId === message.id ? "Tersalin" : "Salin jawaban"}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] lg:w-7 lg:h-7 lg:min-w-0 lg:min-h-0 p-2 lg:p-1.5 rounded-lg hover:text-text-primary hover:bg-bg-surface active:scale-90 transition-all cursor-pointer flex items-center justify-center"
                            aria-label="Salin teks"
                          >
                            {copiedId === message.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {copiedId === message.id && (
                            <span className="absolute left-full ml-1.5 px-2 py-0.5 rounded-md bg-zinc-900 text-white text-[11px] font-medium whitespace-nowrap shadow-md border border-zinc-800 animate-in fade-in zoom-in-95 duration-150 z-30 flex items-center gap-1 pointer-events-none">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Teks disalin!</span>
                            </span>
                          )}
                        </div>

                        {/* Thumbs Up 👍 */}
                        <button
                          type="button"
                          onClick={() => void handleFeedback(message.id, "up")}
                          title={msgFeedback === "up" ? "Batalkan suka" : "Jawaban membantu"}
                          aria-pressed={msgFeedback === "up"}
                          className={`w-11 h-11 min-w-[44px] min-h-[44px] lg:w-7 lg:h-7 lg:min-w-0 lg:min-h-0 p-2 lg:p-1.5 rounded-lg active:scale-90 transition-all cursor-pointer flex items-center justify-center border ${
                            msgFeedback === "up"
                              ? "text-emerald-400 bg-emerald-950/60 border-emerald-700/60"
                              : "border-transparent hover:text-text-primary hover:bg-bg-surface"
                          }`}
                          aria-label="Suka"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Thumbs Down 👎 */}
                        <button
                          type="button"
                          onClick={() => void handleFeedback(message.id, "down")}
                          title={
                            msgFeedback === "down" ? "Batalkan tidak suka" : "Jawaban kurang tepat"
                          }
                          aria-pressed={msgFeedback === "down"}
                          className={`w-11 h-11 min-w-[44px] min-h-[44px] lg:w-7 lg:h-7 lg:min-w-0 lg:min-h-0 p-2 lg:p-1.5 rounded-lg active:scale-90 transition-all cursor-pointer flex items-center justify-center border ${
                            msgFeedback === "down"
                              ? "text-amber-400 bg-amber-950/60 border-amber-700/60"
                              : "border-transparent hover:text-text-primary hover:bg-bg-surface"
                          }`}
                          aria-label="Tidak suka"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Regenerate Last AI Reply 🔄 */}
                        {isLastAi && (
                          <button
                            type="button"
                            disabled={isLoading || isGenerating}
                            onClick={() => handleRegenerateLastReply(message.id)}
                            title="Buat ulang jawaban"
                            aria-label="Buat ulang jawaban"
                            className="w-11 h-11 min-w-[44px] min-h-[44px] lg:w-7 lg:h-7 lg:min-w-0 lg:min-h-0 p-2 lg:p-1.5 rounded-lg hover:text-text-primary hover:bg-bg-surface active:scale-90 transition-all cursor-pointer flex items-center justify-center disabled:opacity-45 disabled:cursor-not-allowed"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {feedbackSavedNoticeId === message.id && (
                          <span className="text-[11px] text-emerald-400 pl-1">
                            Masukan tersimpan ✓
                          </span>
                        )}
                      </div>

                      {/* Small agent label underneath AI response & Timestamp (Item 12) */}
                      <div className="ml-auto flex items-center shrink-0">
                        {formatMessageTime(message.created_at) && (
                          <span className="hidden lg:group-hover:inline text-[11px] text-text-muted font-mono select-none mr-1.5">
                            {formatMessageTime(message.created_at)} ·
                          </span>
                        )}
                        <span
                          className="text-[11px] text-text-muted font-medium select-none text-right"
                          title="Mode Axioma"
                        >
                          {agentBadgeText}
                        </span>
                      </div>
                    </div>

                    {/* Optional input "Apa yang kurang?" when 👎 is selected (1c, Item 5) */}
                    {openFeedbackCommentId === message.id && msgFeedback === "down" && (
                      <div className="rounded-xl bg-bg-elevated border border-border-subtle p-2.5 space-y-2 max-w-md">
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
                            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-bg-surface border border-border-subtle text-base lg:text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
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
              const lastUserMsg =
                currentChat?.messages
                  ?.filter((m) => m.sender === "user")
                  .slice(-1)[0]?.content || "";
              const mediaIntent = detectMediaIntent(lastUserMsg);
              const isImagePending = mediaIntent.type === "image" || activeMediaModeRef.current === "image";
              const isVideoPending = mediaIntent.type === "video" || activeMediaModeRef.current === "video";

              let thinkingText = "Axioma sedang berpikir…";
              if (isImagePending) {
                thinkingText = "Merender gambar...";
              } else if (isVideoPending) {
                thinkingText = "Merender video...";
              } else {
                thinkingText =
                  waitingSeconds >= 25
                    ? "Jawaban panjang butuh waktu lebih lama. Anda bisa menekan Stop kapan saja."
                    : waitingSeconds >= 8
                    ? "Server sedang disiapkan, mohon tunggu…"
                    : "Axioma sedang berpikir…";
              }

              return (
                <div
                  role="status"
                  aria-live="polite"
                  className={`flex flex-col gap-2.5 justify-start transition-[opacity,transform] duration-180 ease-out motion-safe-transform ${
                    isThinkingFadingOut
                      ? "opacity-0 -translate-y-1 pointer-events-none"
                      : "opacity-100 translate-y-0 animate-ai-bubble"
                  }`}
                >
                  <div className="flex items-center gap-3 px-1 py-1">
                    {isImagePending ? (
                      <div className="w-6 h-6 rounded-md bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                        <Palette className="w-3.5 h-3.5 text-zinc-300 animate-pulse" />
                      </div>
                    ) : isVideoPending ? (
                      <div className="w-6 h-6 rounded-md bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                        <Video className="w-3.5 h-3.5 text-zinc-300 animate-pulse" />
                      </div>
                    ) : (
                      <Image
                        src="/brand/axioma-logo.png"
                        alt="Axioma"
                        width={28}
                        height={28}
                        className="w-6 h-6 object-contain rounded-md shrink-0 dark:ring-1 dark:ring-white/10"
                      />
                    )}
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1 h-5" aria-hidden="true">
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-thinking-dot bg-zinc-400"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-thinking-dot bg-zinc-400"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-thinking-dot bg-zinc-400"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      <span className="text-xs text-text-muted font-medium tracking-tight animate-thinking-label select-none">
                        {thinkingText}
                      </span>
                    </div>
                  </div>

                  {/* Elegant Skeleton Shimmer Box during visual/video rendering */}
                  {(isImagePending || isVideoPending) && (
                    <div className="ml-9 w-full max-w-sm sm:max-w-md aspect-video rounded-2xl bg-zinc-900/80 border border-white/10 overflow-hidden relative p-4 flex flex-col justify-between shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isImagePending ? (
                            <Palette className="w-4 h-4 text-zinc-400 animate-pulse" />
                          ) : (
                            <Video className="w-4 h-4 text-zinc-400 animate-pulse" />
                          )}
                          <span className="text-xs text-zinc-400 font-medium">
                            {isImagePending ? "Studio Visual" : "Studio Video"}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 font-mono animate-pulse">Memproses...</span>
                      </div>
                      <div className="w-full space-y-1.5">
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="w-2/5 h-full rounded-full bg-zinc-400 animate-pulse" />
                        </div>
                        <p className="text-[11px] text-zinc-500 text-right font-mono">
                          {isImagePending ? "Merender gambar..." : "Merender adegan video..."}
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

          {/* Floating "Scroll to Bottom" button when user scrolls up (Item 3: >= 40x40px) */}
          {hasMessages && (
            <div
              className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-24 z-30 transition-[opacity,transform] duration-200 ease-out motion-safe-transform ${
                isUserScrolledUp
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 translate-y-2 scale-90"
              }`}
            >
              <button
                type="button"
                tabIndex={isUserScrolledUp ? 0 : -1}
                aria-hidden={!isUserScrolledUp}
                onClick={() => scrollToBottom(true)}
                title="Kembali ke pesan terbaru"
                aria-label="Gulir ke bawah"
                className={`${
                  isUserScrolledUp ? "pointer-events-auto" : "pointer-events-none"
                } w-11 h-11 min-w-[44px] min-h-[44px] lg:w-10 lg:h-10 lg:min-w-0 lg:min-h-0 rounded-full bg-bg-surface hover:bg-bg-subtle text-text-primary border border-border-strong shadow-xl flex items-center justify-center transition-colors active:scale-95 cursor-pointer`}
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Subtle gradient overlay above input console so scrolling text fades gracefully (Item 11, only when messages exist) */}
          {hasMessages && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/80 to-transparent z-10" />
          )}

          {/* Input Console (Anak 3) */}
          <div
            className="shrink-0 w-full px-4 pt-1 pb-1.5 bg-transparent z-20 relative"
          >
            {/* Seamless Radial Blue Glow (Menyatu halus tanpa garis patah) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[280px] -z-10"
              style={{
                background:
                  "radial-gradient(80% 60% at 50% 85%, rgba(29, 78, 216, 0.22) 0%, rgba(30, 58, 138, 0.08) 45%, rgba(0, 0, 0, 0) 100%)",
              }}
            />
            <div className="w-full max-w-2xl lg:max-w-3xl mx-auto flex flex-col items-center">
              <div
                className={`relative w-full ${
                  hasMessages ||
                  (isChatAreaLoading &&
                    Boolean(initialChatId || (activeChatId && activeChatId !== "new-chat")))
                    ? "translate-y-0"
                    : "translate-y-0 md:-translate-y-[30vh] md:transition-transform md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)]"
                }`}
              >
                {/* Desktop Greeting (Hidden on mobile where greeting is vertically centered in the viewport) */}
                {showEmptyDecorations &&
                  !(
                    isChatAreaLoading &&
                    Boolean(initialChatId || (activeChatId && activeChatId !== "new-chat"))
                  ) && (
                    <div
                      className={`hidden md:block absolute bottom-full left-0 right-0 mb-5 sm:mb-6 pointer-events-none transition-[opacity,transform] duration-200 ease-out motion-safe-transform ${
                        isEmptyDecorationsExiting
                          ? "opacity-0 -translate-y-2.5"
                          : "opacity-100 translate-y-0"
                      }`}
                    >
                      <div className="w-full max-w-2xl mx-auto text-center">
                        {isChatAreaLoading || (!dynamicGreeting && greeting === "") ? (
                          <div
                            role="status"
                            aria-label="Memuat ruang kerja"
                            className="flex flex-col items-center gap-2.5"
                          >
                            <div className="h-7 sm:h-8 w-64 sm:w-96 rounded-xl bg-border-subtle animate-pulse" />
                          </div>
                        ) : (
                          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-balance text-text-primary tracking-tight leading-relaxed animate-fade-in">
                            {dynamicGreeting || greeting}
                          </h1>
                        )}
                      </div>
                    </div>
                  )}

                {/* Mobile Gemini-style Mode Tabs above Composer (< md, only in empty state & hidden when recording) */}
                {!hasMessages &&
                  !isRecording &&
                  showEmptyDecorations &&
                  !(
                    isChatAreaLoading &&
                    Boolean(initialChatId || (activeChatId && activeChatId !== "new-chat"))
                  ) && (
                    <div
                      className={`md:hidden w-full mb-2 sm:mb-2.5 flex items-center justify-center gap-2.5 px-1 text-xs font-medium transition-all duration-200 ${
                        isEmptyDecorationsExiting
                          ? "opacity-0 -translate-y-2 pointer-events-none"
                          : "opacity-100 translate-y-0"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => textareaRef.current?.focus()}
                        aria-label="Mode Percakapan Teks"
                        className="bg-[#0b0b0c]/90 text-[#e3e3e3] text-[13.5px] font-medium px-4 py-1.5 rounded-full border border-white/[0.05] shadow-sm cursor-pointer active:scale-95 transition-all"
                      >
                        Percakapan
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenVoiceMode}
                        aria-label="Buka Mode Suara"
                        className="px-4 py-1.5 rounded-full text-zinc-400 hover:text-white font-medium text-[13.5px] cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <AudioLines className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Mode Suara</span>
                      </button>
                    </div>
                  )}


                {/* Pending Attachment Chips Preview */}
                {pendingAttachments.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 p-1.5 overflow-x-auto max-w-full scrollbar-none animate-fade-in">
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
                  <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-full bg-zinc-900/95 border border-white/10 w-fit backdrop-blur-md animate-fade-in shadow-md select-none">
                    {activeMediaMode === "image" ? (
                      <Palette className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                    ) : (
                      <Video className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                    )}
                    <span className="text-xs text-zinc-200 font-medium">
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
                      className="ml-1 w-4 h-4 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Polished Input Box (Menyerupai Kapsul Minta Gemini: min-h-[56px] rounded-[30px] px-4 bg-[#1e1f22]) */}
                <div
                  className="bg-[#1e1f22] border border-white/[0.03] rounded-[30px] min-h-[56px] px-4 flex items-center shadow-lg w-full gap-2.5 transition-colors focus-within:border-white/[0.06]"
                >
                  {/* Active Attachment Button & Popover Menu */}
                  {(() => {
                    const isAttachmentsFull = pendingAttachments.length >= 4;
                    return (
                      <div className="relative shrink-0 self-center group" ref={attachmentMenuRef}>
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
                          className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center transition-all ${
                            isAttachmentsFull || isLoading || isGenerating || isRecording || isTranscribingVoice
                              ? "text-zinc-600 opacity-40 cursor-not-allowed pointer-events-none"
                              : "text-zinc-300 hover:text-white hover:bg-white/10 active:scale-95 cursor-pointer -ml-1"
                          }`}
                        >
                          <Plus className="w-6 h-6" />
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

                        {/* Attachment Popover Menu (Smooth Enter & Exit Two-Way Animation) */}
                        {shouldRenderAttachmentMenu && (
                          <>
                            {/* Mobile backdrop */}
                            <div
                              className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-xs sm:hidden transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                isAttachmentMenuEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                              }`}
                              onClick={() => closeAttachmentMenu(true)}
                              aria-hidden="true"
                            />
                            <div
                              role="menu"
                              aria-label="Pilihan lampiran"
                              onKeyDown={(e) =>
                                handleMenuArrowKeyDown(e, attachmentItemRefs.current, () =>
                                  closeAttachmentMenu(true)
                                )
                              }
                              className={`absolute left-0 bottom-full mb-2.5 z-40 w-64 sm:w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#1e1f20] border border-white/[0.06] p-1.5 shadow-2xl space-y-1 origin-bottom-left transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform focus:outline-none ${
                                isAttachmentMenuEntered
                                  ? "scale-100 opacity-100 translate-y-0"
                                  : "scale-95 opacity-0 translate-y-1 pointer-events-none"
                              }`}
                            >
                            {/* 1. Foto & Gambar */}
                            <button
                              ref={(el) => {
                                attachmentItemRefs.current[0] = el;
                              }}
                              role="menuitem"
                              type="button"
                              onClick={() => {
                                closeAttachmentMenu(false);
                                imageInputRef.current?.click();
                              }}
                              className="w-full flex items-center gap-3.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-[15px] font-normal text-zinc-100 hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors cursor-pointer text-left focus:outline-none focus:bg-white/[0.06]"
                            >
                              <div className="w-9 h-9 rounded-xl bg-white/[0.06] text-zinc-300 flex items-center justify-center shrink-0">
                                <ImageIcon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                              </div>
                              <span className="flex-1">Foto &amp; Gambar</span>
                            </button>

                            {/* 2. Dokumen PDF */}
                            <button
                              ref={(el) => {
                                attachmentItemRefs.current[1] = el;
                              }}
                              role="menuitem"
                              type="button"
                              onClick={() => {
                                closeAttachmentMenu(false);
                                pdfInputRef.current?.click();
                              }}
                              className="w-full flex items-center gap-3.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-[15px] font-normal text-zinc-100 hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors cursor-pointer text-left focus:outline-none focus:bg-white/[0.06]"
                            >
                              <div className="w-9 h-9 rounded-xl bg-white/[0.06] text-zinc-300 flex items-center justify-center shrink-0">
                                <FileText className="w-[18px] h-[18px]" strokeWidth={1.75} />
                              </div>
                              <span className="flex-1">Dokumen PDF</span>
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
                              className="w-full flex items-center gap-3.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-[15px] font-normal text-zinc-100 hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors cursor-pointer text-left focus:outline-none focus:bg-white/[0.06]"
                            >
                              <div className="w-9 h-9 rounded-xl bg-white/[0.06] text-zinc-300 flex items-center justify-center shrink-0">
                                <Palette className="w-[18px] h-[18px]" strokeWidth={1.75} />
                              </div>
                              <span className="flex-1">Buat Gambar</span>
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
                              className="w-full flex items-center gap-3.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-[15px] font-normal text-zinc-100 hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors cursor-pointer text-left focus:outline-none focus:bg-white/[0.06]"
                            >
                              <div className="w-9 h-9 rounded-xl bg-white/[0.06] text-zinc-300 flex items-center justify-center shrink-0">
                                <Video className="w-[18px] h-[18px]" strokeWidth={1.75} />
                              </div>
                              <span className="flex-1">Buat Video</span>
                            </button>

                            {/* 5. Ambil Foto (Touchscreen only) */}
                            <button
                              ref={(el) => {
                                attachmentItemRefs.current[4] = el;
                              }}
                              role="menuitem"
                              type="button"
                              onClick={() => {
                                closeAttachmentMenu(false);
                                cameraInputRef.current?.click();
                              }}
                              className="hidden [@media(pointer:coarse)]:flex w-full items-center gap-3.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-[15px] font-normal text-zinc-100 hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors cursor-pointer text-left focus:outline-none focus:bg-white/[0.06]"
                            >
                              <div className="w-9 h-9 rounded-xl bg-white/[0.06] text-zinc-300 flex items-center justify-center shrink-0">
                                <Camera className="w-[18px] h-[18px]" strokeWidth={1.75} />
                              </div>
                              <span className="flex-1">Ambil Foto</span>
                            </button>

                            {/* Footer limitation note */}
                            <div className="border-t border-white/[0.06] pt-2 pb-1 px-3.5 mt-1">
                              <p className="text-[11px] text-zinc-400 leading-relaxed">
                                Maks. 4 file · 10 MB per file · PDF maks. 30 halaman
                              </p>
                            </div>
                          </div>
                        </>
                      )}

                        {/* Hidden Native File Inputs (tabIndex -1 and aria-hidden to prevent iOS accessory bar ^ v navigation) */}
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
                      </div>
                    );
                  })()}

                  {isRecording ? (
                    <InlineVoiceWaveform
                      analyser={dictationAnalyser}
                      recordingSeconds={recordingSeconds}
                      onSpeechDetected={() => {
                        hasSpokenRef.current = true;
                      }}
                    />
                  ) : isTranscribingVoice ? (
                    <div className="flex-1 min-w-0 flex items-center justify-center gap-2 py-2 px-3 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5" aria-hidden="true">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                      </div>
                      <span className="text-xs text-text-muted font-medium select-none">
                        Mentranskripsikan...
                      </span>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0 flex items-center">
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        enterKeyHint="send"
                        autoComplete="off"
                        autoCorrect="off"
                        value={inputText}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        onFocus={() => {
                          setIsInputFocused(true);
                        }}
                        onBlur={() => {
                          setIsInputFocused(false);
                        }}
                        aria-label="Ketik pesan untuk Axioma"
                        placeholder={
                          activeMediaMode === "image"
                            ? "Deskripsikan gambar yang ingin dibuat..."
                            : activeMediaMode === "video"
                            ? "Deskripsikan video sinematik yang ingin dibuat..."
                            : "Minta Axioma..."
                        }
                        style={{ height: "24px" }}
                        className="flex-1 w-full self-center resize-none overflow-y-hidden bg-transparent text-white placeholder:text-[#8e918f] text-[16px] sm:text-[17px] font-normal focus:outline-none px-2 py-1 min-h-[24px] max-h-[120px] leading-6 tracking-normal transition-colors duration-150 ease-out touch-manipulation"
                      />
                    </div>
                  )}

                  {isRecording ? (
                    <div className="flex items-center gap-2 shrink-0 self-center animate-in fade-in duration-150">
                      {/* STOP Button (grey circular button with square stop icon) */}
                      <button
                        type="button"
                        onClick={() => stopVoiceRecording("stop")}
                        aria-label="Hentikan rekaman"
                        title="Hentikan rekaman (masukkan teks ke kotak input)"
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-white/90 shadow-xs"
                      >
                        <Square className="w-4 h-4 fill-current rounded-xs" />
                      </button>

                      {/* KIRIM Button (blue accent circular button with arrow up) */}
                      <button
                        type="button"
                        onClick={() => stopVoiceRecording("send")}
                        aria-label="Kirim rekaman"
                        title="Kirim rekaman langsung"
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-white shadow-md shadow-blue-500/25"
                      >
                        <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    </div>
                  ) : isTranscribingVoice ? (
                    <div className="flex items-center shrink-0 self-center px-2 animate-in fade-in duration-150">
                      <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-bg-surface/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-center">
                      {/* Desktop Engine Selector (Item 5, UI Bug 2) */}
                      <div className="relative hidden lg:block">
                        <button
                          ref={desktopAgentTriggerRef}
                          type="button"
                          aria-haspopup="menu"
                          aria-expanded={isAgentMenuOpen}
                          onClick={() => setIsAgentMenuOpen((prev) => !prev)}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                              e.preventDefault();
                              setIsAgentMenuOpen(true);
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight text-text-secondary hover:text-text-primary hover:bg-bg-surface active:scale-95 transition-all cursor-pointer"
                          aria-label="Pilih model"
                        >
                          <span>{selectedAgent.shortName}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-icon-muted" />
                        </button>

                        {shouldRenderDesktopAgentMenu && (
                          <div
                            ref={desktopAgentMenuRef}
                            role="menu"
                            aria-label="Pilih model AI"
                            onKeyDown={(e) =>
                              handleMenuArrowKeyDown(e, desktopAgentItemRefs.current, () =>
                                closeDesktopAgentMenu(true)
                              )
                            }
                            className={`absolute bottom-full mb-2 right-0 z-50 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-bg-elevated border border-border-subtle p-2 shadow-2xl space-y-1.5 focus:outline-none origin-bottom-right transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
                              isDesktopAgentMenuEntered
                                ? "scale-100 opacity-100 translate-y-0"
                                : "scale-95 opacity-0 translate-y-2 pointer-events-none"
                            }`}
                          >
                            {AVAILABLE_AGENTS.map((agent, idx) => {
                              const isSelected = agent.id === selectedAgent.id;
                              return (
                                <button
                                  ref={(el) => {
                                    desktopAgentItemRefs.current[idx] = el;
                                  }}
                                  type="button"
                                  role="menuitemradio"
                                  aria-checked={isSelected}
                                  key={agent.id}
                                  onClick={() => {
                                    handleSelectAgent(agent);
                                    closeDesktopAgentMenu(true);
                                  }}
                                  className={`w-full text-left p-3 rounded-lg text-xs tracking-tight active:scale-[0.98] transition-all duration-150 flex flex-col gap-1.5 focus:outline-none focus:ring-1 focus:ring-border-strong cursor-pointer border ${
                                    isSelected
                                      ? "bg-bg-surface border-border-subtle text-text-primary font-medium"
                                      : "border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-surface/50"
                                  }`}
                                >
                                  {/* Baris atas: nama model & badge */}
                                  <div className="flex items-start justify-between gap-2 w-full">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-semibold text-text-primary text-sm tracking-tight truncate">
                                        {agent.name}
                                      </span>
                                      {isSelected && (
                                        <Check className="w-4 h-4 text-text-primary shrink-0" />
                                      )}
                                    </div>
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-bg-surface text-text-secondary font-medium border border-border-subtle shrink-0 whitespace-nowrap">
                                      {agent.tag}
                                    </span>
                                  </div>

                                  {/* Baris bawah: deskripsi selebar penuh */}
                                  <p className="text-sm text-text-muted leading-snug break-words">
                                    {agent.description}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Voice Input Mic Button (Dikte) */}
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
                            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer border border-transparent active:scale-95"
                          >
                            <Mic className="w-5 h-5" />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled
                              aria-disabled="true"
                              title="Perangkat tidak mendukung input mikrofon"
                              aria-label="Perangkat tidak mendukung input mikrofon"
                              className="w-11 h-11 min-w-[44px] min-h-[44px] lg:w-8 lg:h-8 lg:min-w-0 lg:min-h-0 rounded-full md:rounded-xl flex items-center justify-center text-icon-muted opacity-50 cursor-not-allowed"
                            >
                              <MicOff className="w-5 h-5 lg:w-4 lg:h-4" />
                            </button>
                            <span
                              role="tooltip"
                              className="pointer-events-none absolute right-0 bottom-full mb-2 px-2 py-1 rounded-md bg-bg-elevated border border-border-subtle text-[11px] text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-lg z-30"
                            >
                              Mikrofon tidak didukung
                            </span>
                          </>
                        )}
                      </div>

                      {/* MOBILE ACTION BUTTON: Morphing Mode Suara <-> Send / Stop (< md) */}
                      <div className="md:hidden shrink-0 flex items-center">
                        {isGenerating ? (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                            }}
                            onClick={handleStopGeneration}
                            title="Hentikan respons"
                            aria-label="Hentikan respons"
                            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center bg-text-primary text-bg-primary hover:opacity-90 active:scale-[0.92] transition-transform duration-150 ease-out shadow-md cursor-pointer"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                          </button>
                        ) : (() => {
                          const isUploadingAttachment = pendingAttachments.some(
                            (a) => a.status === "uploading" || a.status === "compressing"
                          );
                          const hasReadyAttachments = pendingAttachments.some((a) => a.status === "ready");
                          const hasUserTextOrAttachments = Boolean(inputText.trim()) || hasReadyAttachments;

                          if (hasUserTextOrAttachments) {
                            const isSendDisabled =
                              !isOnline ||
                              isUploadingAttachment ||
                              isLoading ||
                              isGenerating ||
                              isSubmitting;

                            return (
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  // Cegah textarea kehilangan fokus sebelum klik tereksekusi di iOS
                                  e.preventDefault();
                                }}
                                onTouchEnd={(e) => {
                                  e.preventDefault();
                                  if (!isSendDisabled) {
                                    void handleSendMessage();
                                    // Tutup keyboard secara halus setelah pesan terkirim
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
                                className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center transition-all duration-200 ease-out select-none touch-manipulation ${
                                  !isSendDisabled
                                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 active:scale-[0.92] cursor-pointer"
                                    : "bg-bg-surface text-text-muted border border-border-subtle cursor-not-allowed opacity-50"
                                }`}
                              >
                                {isUploadingAttachment ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                ) : (
                                  <ArrowUp className="w-5 h-5 text-white stroke-[2.5]" />
                                )}
                              </button>
                            );
                          }

                          // Mode Suara button (default when no text/attachment, sleek dark-navy pill matching Gemini)
                          return (
                            <button
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
                              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center bg-blue-950/70 hover:bg-blue-900/80 text-blue-400 border border-blue-500/30 dark:bg-[#1a273e] dark:hover:bg-[#233452] dark:text-[#60a5fa] dark:border-blue-400/25 shadow-md active:scale-[0.92] transition-all duration-200 cursor-pointer"
                            >
                              <AudioLines className="w-5 h-5 text-blue-500 dark:text-[#60a5fa]" />
                            </button>
                          );
                        })()}
                      </div>

                      {/* DESKTOP ACTIONS: Mode Suara + Send / Stop (>= md) */}
                      <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Mode Suara (ChatGPT-style Voice Mode) Button */}
                        <div className="relative group shrink-0">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                            }}
                            onClick={handleOpenVoiceMode}
                            title="Mode Suara (Percakapan langsung)"
                            aria-label="Mode Suara (Percakapan langsung)"
                            className="w-8 h-8 p-1.5 rounded-xl flex items-center justify-center text-icon-muted hover:text-text-primary hover:bg-bg-surface transition-all cursor-pointer border border-transparent active:scale-[0.94]"
                          >
                            <AudioLines className="w-4 h-4" />
                          </button>
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute right-0 bottom-full mb-2 px-2 py-1 rounded-md bg-bg-elevated border border-border-subtle text-[11px] text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-lg z-30"
                          >
                            Mode Suara
                          </span>
                        </div>

                        {/* Desktop Send / Stop button */}
                        {isGenerating ? (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                            }}
                            onClick={handleStopGeneration}
                            title="Hentikan respons"
                            aria-label="Hentikan respons"
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-text-primary text-bg-primary hover:opacity-90 active:scale-[0.94] transition-[opacity] duration-150 ease-out shadow-md cursor-pointer"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                          </button>
                        ) : (() => {
                          const isUploadingAttachment = pendingAttachments.some(
                            (a) => a.status === "uploading" || a.status === "compressing"
                          );
                          const hasReadyAttachments = pendingAttachments.some((a) => a.status === "ready");
                          const isSendDisabled =
                            !isOnline ||
                            (!inputText.trim() && !hasReadyAttachments) ||
                            isUploadingAttachment ||
                            isLoading ||
                            isGenerating ||
                            isSubmitting;

                          return (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
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
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-[background-color,color,box-shadow,opacity] duration-200 ease-out ${
                                !isSendDisabled
                                  ? "bg-text-primary text-bg-primary hover:opacity-90 shadow-md cursor-pointer active:scale-[0.94]"
                                  : "bg-bg-surface text-text-muted border border-border-subtle cursor-not-allowed opacity-50"
                              }`}
                            >
                              {isUploadingAttachment ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-text-muted" />
                              ) : (
                                <ArrowUp className="w-4 h-4" />
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4 Starter Prompt Cards (Empty State only: 2x2 grid on desktop, hidden on mobile) */}
                {showEmptyDecorations &&
                  !(
                    isChatAreaLoading &&
                    Boolean(initialChatId || (activeChatId && activeChatId !== "new-chat"))
                  ) && (
                    <div
                      className={`hidden md:grid absolute top-full left-0 right-0 mt-3 sm:mt-4 grid-cols-2 gap-2 sm:gap-2.5 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe-transform will-change-transform ${
                        isEmptyDecorationsExiting
                          ? "opacity-0 -translate-y-2.5 pointer-events-none"
                          : "opacity-100 translate-y-0 animate-fade-up"
                      }`}
                    >
                      {isChatAreaLoading || greeting === ""
                        ? STARTER_PROMPTS.map((prompt) => (
                            <div
                              key={prompt.id}
                              className="w-full h-12 sm:h-14 rounded-xl bg-border-subtle animate-pulse"
                            />
                          ))
                        : STARTER_PROMPTS.map((prompt) => (
                            <button
                              key={prompt.id}
                              type="button"
                              onClick={() => handleStarterPromptClick(prompt)}
                              className="w-full text-left px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-xl bg-bg-elevated hover:bg-bg-surface border border-border-subtle hover:border-border-strong active:scale-[0.99] transition-[background-color,border-color,transform] duration-150 flex items-center gap-2.5 sm:gap-3 group cursor-pointer"
                            >
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-bg-surface border border-border-subtle flex items-center justify-center shrink-0 group-hover:border-border-strong transition-colors">
                                {renderStarterIcon(prompt.icon)}
                              </div>
                              <span className="text-xs sm:text-sm font-medium text-text-secondary group-hover:text-text-primary leading-snug">
                                {prompt.label}
                              </span>
                            </button>
                          ))}
                    </div>
                  )}
              </div>

              {/* Disclaimer + Privacy & Terms Links (#9, WCAG AA >= 4.5:1 via --text-muted #a1a1aa) */}
              <div
                className={`text-center text-[11px] sm:text-xs text-text-muted pt-1.5 sm:pt-2.5 pb-1 tracking-normal flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 ${
                  isInputFocused ? "hidden" : "flex"
                }`}
              >
                <span className="md:hidden">Axioma dapat membuat kesalahan.</span>
                <span className="hidden md:inline">Axioma dapat membuat kesalahan. Periksa kembali informasi penting.</span>
                <span className="hidden md:inline text-border-strong">•</span>
                <span className="hidden md:inline-flex items-center gap-2">
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Message & Truncate Subsequent Messages Confirmation Modal (Smooth Enter & Exit Two-Way Animation) */}
      {shouldRenderEditConfirm && displayEditConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-confirm-title"
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm touch-none transition-opacity duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isEditConfirmEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingEdit) {
              setEditConfirmTarget(null);
            }
          }}
        >
          <div
            className={`w-full sm:max-w-sm rounded-t-[28px] sm:rounded-2xl bg-bg-elevated border-t sm:border border-border-subtle p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 shadow-2xl space-y-4 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain touch-auto transition-all duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
              isEditConfirmEntered
                ? "translate-y-0 opacity-100 sm:scale-100"
                : "translate-y-full opacity-0 sm:scale-95"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center shrink-0">
                <TriangleAlert className="w-4 h-4 text-amber-400" />
              </div>
              <div className="space-y-1 min-w-0">
                <h2 id="edit-confirm-title" className="text-sm font-semibold text-text-primary">
                  Edit Pesan &amp; Buat Balasan Baru?
                </h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Mengedit pesan ini akan menghapus{" "}
                  <strong className="text-text-primary">
                    {displayEditConfirm.subsequentCount} pesan setelahnya
                  </strong>{" "}
                  dalam percakapan ini, lalu meminta jawaban baru dari AI.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={() => setEditConfirmTarget(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-medium text-text-secondary bg-bg-surface hover:bg-bg-subtle hover:text-text-primary active:scale-[0.96] border border-border-subtle transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={() =>
                  handleSubmitEditUserMessage(displayEditConfirm.msgId, displayEditConfirm.content)
                }
                className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-bg-primary bg-text-primary hover:opacity-90 active:scale-[0.96] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isSubmittingEdit ? "Menghapus & Mengirim…" : "Lanjutkan & Kirim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ChatGPT-style Voice Mode Fullscreen Overlay (Item 10) */}
      {isVoiceModeOpen && (
        <VoiceModeOverlay
          isOpen={isVoiceModeOpen}
          onClose={() => setIsVoiceModeOpen(false)}
          backendUrl={BACKEND_URL}
          authHeaders={(() => {
            const h: Record<string, string> = {};
            if (authToken && authUser) {
              h["Authorization"] = `Bearer ${authToken}`;
              h["X-User-Id"] = authUser.id;
            } else {
              h["X-Guest-Mode"] = "true";
              const uid = currentUserId || safeGetLocalStorage(STORAGE_KEYS.USER_ID) || "guest";
              h["X-User-Id"] = uid;
            }
            return h;
          })()}
          chatId={activeChatId === "new-chat" ? currentSessionChatId : activeChatId}
          agentId={selectedAgent.id}
          agentName={selectedAgent.name}
          getTurnstileToken={async () => {
            const token = await getTurnstileToken().catch(() => "");
            return token || "";
          }}
          onSendMessage={handleVoiceModeSendMessage}
          onTurnComplete={handleVoiceModeTurnComplete}
        />
      )}

      {/* Guest Message Limit Modal (Smooth Enter & Exit Two-Way Animation) */}
      {shouldRenderGuestLimit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-limit-title"
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isGuestLimitEntered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsGuestLimitModalOpen(false);
            }
          }}
        >
          <div
            className={`w-full sm:max-w-md rounded-t-[28px] sm:rounded-2xl bg-bg-elevated border-t sm:border border-border-subtle p-6 shadow-2xl space-y-5 relative transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
              isGuestLimitEntered
                ? "translate-y-0 opacity-100 sm:scale-100"
                : "translate-y-full opacity-0 sm:scale-95"
            }`}
          >
            <button
              type="button"
              onClick={() => setIsGuestLimitModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-icon-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
              aria-label="Tutup popup"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5">
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

            <p className="text-sm text-text-secondary leading-relaxed">
              Hubungkan akun Anda untuk melanjutkan percakapan tanpa batas dan menyimpan seluruh riwayat percakapan agar dapat diakses dari perangkat lain.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsGuestLimitModalOpen(false)}
                className="w-full sm:w-auto flex-1 min-h-[42px] px-4 py-2.5 rounded-xl text-xs font-medium text-text-secondary bg-bg-surface hover:bg-bg-subtle hover:text-text-primary border border-border-subtle transition-colors cursor-pointer"
              >
                Nanti Saja
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsGuestLimitModalOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="w-full sm:w-auto flex-1 min-h-[42px] px-4 py-2.5 rounded-xl text-xs font-semibold text-bg-primary bg-text-primary hover:opacity-90 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Cloud className="w-4 h-4" strokeWidth={1.75} />
                <span>Hubungkan Akun</span>
              </button>
            </div>
          </div>
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

      {/* Cloudflare Turnstile Invisible Container (#2, #9) */}
      <div id="turnstile-container" className="fixed -bottom-96 -left-96 opacity-0 pointer-events-none" aria-hidden="true" />
    </div>
  );
}
