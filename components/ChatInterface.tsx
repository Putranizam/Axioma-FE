"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
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
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Sparkles,
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
} from "lucide-react";
import { CodeBlock } from "./CodeBlock";
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

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, params: any) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
    };
  }
}

const RAW_ENV_BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
const BACKEND_URL = RAW_ENV_BACKEND_URL
  ? RAW_ENV_BACKEND_URL.replace(/\/+$/, "")
  : process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "";
const TURNSTILE_SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();
// Must be longer than the backend's own AI budget (50s) / watchdog (55s) so the clear
// backend error message arrives before the browser gives up.
const REQUEST_TIMEOUT_MS = 60_000;
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
} as const;

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
  icon: "lightbulb" | "mail" | "table" | "code";
}

const STARTER_PROMPTS: StarterPrompt[] = [
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

function formatGreetingName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0];
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

  // User profile & model selection state (persisted in localStorage)
  const [displayName, setDisplayName] = useState<string>(DEFAULT_DISPLAY_NAME);
  const [defaultAgentId, setDefaultAgentId] = useState<Agent["id"]>("axioma-pro");
  const [selectedAgent, setSelectedAgent] = useState<Agent>(AVAILABLE_AGENTS[0]);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState<boolean>(false);
  const [isHeaderAgentMenuOpen, setIsHeaderAgentMenuOpen] = useState<boolean>(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState<boolean>(false);

  // Settings Modal & Clear All Chats Modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [settingsNameInput, setSettingsNameInput] = useState<string>(DEFAULT_DISPLAY_NAME);
  const [settingsNameError, setSettingsNameError] = useState<string | null>(null);
  const [settingsDefaultAgentInput, setSettingsDefaultAgentInput] =
    useState<Agent["id"]>("axioma-pro");
  const [themeMode, setThemeMode] = useState<"dark" | "light" | "system">("system");
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

  // Feedback state: rating ("up" | "down") + optional comment box for "down"
  const [feedback, setFeedback] = useState<Record<string, FeedbackItem>>({});
  const [openFeedbackCommentId, setOpenFeedbackCommentId] = useState<string | null>(null);
  const [feedbackCommentDraft, setFeedbackCommentDraft] = useState<Record<string, string>>({});
  const [feedbackSavedNoticeId, setFeedbackSavedNoticeId] = useState<string | null>(null);

  // Cloudflare Turnstile token & widget ref (#9)
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileTokenRef = useRef<string | null>(null);

  // Web Speech API (Voice input 🎤) state
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const speechBaseTextRef = useRef<string>("");

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
    if (mode === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }
    } else if (mode === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
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
      const initialId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "00000000-0000-0000-0000-000000000001";
      setCurrentSessionChatId(initialId);
    }

    // Load saved display name (ignore legacy hardcoded "Alex Vance" placeholder if present)
    const savedName = safeGetLocalStorage(STORAGE_KEYS.DISPLAY_NAME);
    if (savedName && savedName.trim() && savedName.trim() !== "Alex Vance") {
      setDisplayName(savedName.trim());
      setSettingsNameInput(savedName.trim());
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
      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSpeechSupported(Boolean(SpeechRecognitionAPI));
      updateViewportFlag();
      window.addEventListener("resize", updateViewportFlag);
    }

    let storedUserId = safeGetLocalStorage(STORAGE_KEYS.USER_ID);
    if (!storedUserId) {
      storedUserId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `user-${Date.now()}`;
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
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            // Ignore stop errors on unmount
          }
        }
      };
    }

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [initialChatId]);

  // Cloudflare Turnstile Invisible Widget Setup (#9)
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || typeof window === "undefined") return;

    const renderTurnstile = () => {
      if (!window.turnstile || turnstileWidgetIdRef.current) return;
      const container = document.getElementById("turnstile-container");
      if (!container) return;

      try {
        turnstileWidgetIdRef.current = window.turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          size: "invisible",
          callback: (token: string) => {
            turnstileTokenRef.current = token;
          },
          "expired-callback": () => {
            turnstileTokenRef.current = null;
            if (turnstileWidgetIdRef.current && window.turnstile) {
              window.turnstile.reset(turnstileWidgetIdRef.current);
            }
          },
          "error-callback": () => {
            turnstileTokenRef.current = null;
          },
        });
      } catch {
        // Ignore initialization errors
      }
    };

    if (window.turnstile) {
      renderTurnstile();
    } else {
      const scriptId = "cf-turnstile-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          renderTurnstile();
        };
        document.head.appendChild(script);
      }
    }

    return () => {
      if (turnstileWidgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } catch {
          // Ignore removal errors
        }
        turnstileWidgetIdRef.current = null;
      }
    };
  }, []);

  const handleSelectAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    safeSetLocalStorage(STORAGE_KEYS.SELECTED_AGENT, agent.id);
  }, []);

  const buildAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const effectiveUserId = currentUserId || safeGetLocalStorage(STORAGE_KEYS.USER_ID) || "";
    if (effectiveUserId) {
      headers["X-User-Id"] = effectiveUserId;
    }
    return headers;
  }, [currentUserId]);

  // Fetch chats strictly via backend endpoint with ownership verification (#2)
  const fetchChats = useCallback(async (): Promise<ChatHistoryItem[] | null> => {
    try {
      const headers = await buildAuthHeaders();
      if (!headers["X-User-Id"] && !headers["Authorization"]) {
        return null;
      }
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
  }, [buildAuthHeaders]);

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

  // Friendly, natural greeting based on time of day and optional user displayName (#8)
  useEffect(() => {
    const hour = new Date().getHours();
    let timeWord = "malam";
    if (hour >= 4 && hour < 11) {
      timeWord = "pagi";
    } else if (hour >= 11 && hour < 15) {
      timeWord = "siang";
    } else if (hour >= 15 && hour < 18) {
      timeWord = "sore";
    }
    const shortGreetingName = formatGreetingName(displayName);
    if (shortGreetingName) {
      setGreeting(`Selamat ${timeWord}, ${shortGreetingName}. Ada yang bisa dibantu?`);
    } else {
      setGreeting(`Selamat ${timeWord}. Ada yang bisa dibantu?`);
    }
  }, [displayName]);

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
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT_PX);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, []);

  const stopVoiceRecording = useCallback((focusInput = false) => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
    if (focusInput) {
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
  }, [adjustTextareaHeight]);

  const handleToggleVoiceRecording = useCallback(() => {
    setSpeechError(null);

    if (isRecording) {
      stopVoiceRecording(true);
      return;
    }

    if (typeof window === "undefined") return;
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSpeechSupported(false);
      setSpeechError("Browser tidak mendukung input suara.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = "id-ID";
      recognition.interimResults = true;
      recognition.continuous = true;

      speechBaseTextRef.current = inputText.trim() ? `${inputText.trimEnd()} ` : "";

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalPart = "";
        let interimPart = "";
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalPart += res[0].transcript;
          } else {
            interimPart += res[0].transcript;
          }
        }
        const combined = `${speechBaseTextRef.current}${finalPart}${interimPart}`;
        setInputText(combined);
        requestAnimationFrame(() => {
          adjustTextareaHeight();
        });
      };

      recognition.onerror = (event: any) => {
        const errCode = String(event?.error || "");
        if (errCode === "not-allowed" || errCode === "service-not-allowed") {
          setSpeechError(
            "Izin mikrofon ditolak. Silakan izinkan akses mikrofon di pengaturan browser Anda untuk menggunakan input suara."
          );
        } else if (errCode === "audio-capture") {
          setSpeechError(
            "Mikrofon tidak ditemukan. Pastikan perangkat mikrofon Anda terhubung dan aktif."
          );
        } else if (errCode === "network") {
          setSpeechError("Gagal memproses input suara karena kendala jaringan.");
        } else if (errCode !== "no-speech" && errCode !== "aborted") {
          setSpeechError("Gagal mengenali suara. Silakan coba lagi.");
        }
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (el) {
            el.focus();
            const len = el.value.length;
            el.setSelectionRange(len, len);
            adjustTextareaHeight();
          }
        });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setSpeechError("Tidak dapat memulai perekaman suara di browser ini.");
      setIsRecording(false);
    }
  }, [isRecording, inputText, stopVoiceRecording, adjustTextareaHeight]);

  const inputTextRef = useRef<string>("");
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    if (isRecording) {
      speechBaseTextRef.current = nextVal;
    }
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

  // Body scroll lock when any dialog or modal is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      isSettingsModalOpen || isClearAllConfirmOpen || editConfirmTarget
    );
    if (!isAnyModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isSettingsModalOpen, isClearAllConfirmOpen, editConfirmTarget]);

  const closeDesktopAgentMenu = useCallback((restoreFocus = true) => {
    setIsAgentMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => desktopAgentTriggerRef.current?.focus());
    }
  }, []);

  const closeHeaderAgentMenu = useCallback((restoreFocus = true) => {
    setIsHeaderAgentMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => headerAgentTriggerRef.current?.focus());
    }
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
      requestAnimationFrame(() => attachmentTriggerRef.current?.focus());
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
        !headerAgentTriggerRef.current?.contains(target)
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

      if (activeChatId === "new-chat" && currentSessionChatId && !hasMessages) {
        setIsMobileSidebarOpen(false);
        if (options?.updateUrl !== false) {
          syncBrowserUrl("new-chat", "push");
        }
        return;
      }

      const newSessionId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `00000000-0000-4000-8000-${String(Date.now()).padStart(12, "0").slice(-12)}`;
      setCurrentSessionChatId(newSessionId);
      setActiveChatId("new-chat");
      setHasMessages(false);
      setIsMobileSidebarOpen(false);
      if (options?.updateUrl !== false) {
        syncBrowserUrl("new-chat", "push");
      }
    },
    [activeChatId, currentSessionChatId, hasMessages, syncBrowserUrl, focusDesktopTextarea]
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

  // Restore active chat from URL (/c/<chat_id>) on initial load and browser Back/Forward (#10, #11)
  useEffect(() => {
    if (!currentUserId) return;

    if (!initialRouteLoadedRef.current) {
      initialRouteLoadedRef.current = true;
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
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
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
    options?: { regenerate?: boolean; tempUserMsgId?: string; attachmentIds?: string[] }
  ) => {
    setChatLoading(targetChatId, true);
    setChatGenerating(targetChatId, true);
    stoppedByUserByChatRef.current[targetChatId] = false;

    const activeAgentSnapshot = selectedAgent;
    const controller = new AbortController();
    requestControllersByChatRef.current[targetChatId] = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
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
      const headers = await buildAuthHeaders();
      headers["Accept"] = "text/event-stream, application/json";

      const currentTurnstileToken = turnstileTokenRef.current;
      const response = await fetch(`${BACKEND_URL}/api/chats/message`, {
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
        }),
        signal: controller.signal,
      });

      // Reset Turnstile token so a fresh one is generated if needed again
      if (turnstileWidgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(turnstileWidgetIdRef.current);
          turnstileTokenRef.current = null;
        } catch {
          // Ignore reset errors
        }
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
          if (done) {
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
          if (
            response.status === 503 ||
            result?.code === "daily_quota_exceeded" ||
            (result?.error && result.error.includes("Kuota"))
          ) {
            throw new Error("Kuota AI hari ini sudah habis. Tersedia lagi pukul 07.00 WIB.");
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

      console.error("Axioma Backend Connection Error:", error);

      let errorDetail: string;
      if (error?.name === "AbortError") {
        errorDetail = `Permintaan melebihi batas waktu ${REQUEST_TIMEOUT_MS / 1000} detik. Silakan coba lagi.`;
      } else if (
        error?.message?.includes("Kuota AI hari ini") ||
        error?.message?.toLowerCase().includes("kuota harian") ||
        error?.status === 503 ||
        error?.code === "daily_quota_exceeded"
      ) {
        errorDetail = "Kuota AI hari ini sudah habis. Tersedia lagi pukul 07.00 WIB.";
      } else if (
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        error?.message?.includes("Koneksi internet terputus")
      ) {
        errorDetail = "Koneksi internet terputus. Silakan periksa jaringan Anda.";
      } else if (
        error instanceof TypeError ||
        error?.name === "TypeError" ||
        (error?.message && error.message.includes("Failed to fetch")) ||
        (error?.message && error.message.includes("NetworkError")) ||
        (error?.message && error.message.includes("Pastikan backend berjalan"))
      ) {
        errorDetail = "Server sedang tidak dapat dihubungi. Coba lagi sebentar.";
      } else {
        errorDetail = error?.message || "Terjadi kesalahan yang tidak diketahui.";
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
      clearTimeout(timeoutId);
      if (requestControllersByChatRef.current[targetChatId] === controller) {
        delete requestControllersByChatRef.current[targetChatId];
      }
      setChatLoading(targetChatId, false);
      setChatGenerating(targetChatId, false);
      setChatStreamingMsgId(targetChatId, null);
      focusDesktopTextarea();
      // Sync sidebar with backend so new/updated chat titles are reflected
      void refreshChatHistory();
    }
  };

  const handleSubmitEditUserMessage = async (msgId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSubmittingEdit) return;

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
      const currentTurnstile = turnstileTokenRef.current || undefined;
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
      setPendingAttachments((prev) =>
        prev.map((a) =>
          a.id === item.id
            ? { ...a, status: "error", error: err.message || "Gagal mengunggah berkas." }
            : a
        )
      );
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

  const sendTextMessage = async (rawText: string, attachedItems?: AttachmentItem[]) => {
    const userText = rawText.trim();
    const effectiveAttachments = attachedItems || [];
    if ((!userText && effectiveAttachments.length === 0) || isLoading || isGenerating) return;

    setIsSendPressed(true);
    setTimeout(() => setIsSendPressed(false), 160);

    if (isRecording) {
      stopVoiceRecording(false);
    }

    if (currentChatKey) {
      safeRemoveChatDraft(currentChatKey);
    }
    setInputText("");
    if (textareaRef.current) {
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
      sessionPayloadId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "00000000-0000-0000-0000-000000000001";
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

    setChatLoading(targetChatId, true);
    await requestAiReply(targetChatId, sessionPayloadId, userText, {
      tempUserMsgId,
      attachmentIds: effectiveAttachments.map((a) => a.id),
    });
  };

  const handleSendMessage = async () => {
    const hasUploading = pendingAttachments.some(
      (a) => a.status === "uploading" || a.status === "compressing"
    );
    if (hasUploading) {
      showToastNotice("Sedang memproses lampiran, mohon tunggu sebentar...");
      return;
    }

    const readyServerAttachments = pendingAttachments
      .filter((a) => a.status === "ready" && a.serverAttachment)
      .map((a) => a.serverAttachment!);

    setPendingAttachments([]);
    await sendTextMessage(inputText, readyServerAttachments);
  };

  const handleStarterPromptClick = (prompt: StarterPrompt) => {
    if (isLoading || isGenerating) return;
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isOnline) return;
      const hasReadyAttachments = pendingAttachments.some((a) => a.status === "ready");
      if (!isLoading && !isGenerating && (inputText.trim() || hasReadyAttachments)) {
        void handleSendMessage();
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    try {
      void navigator.clipboard.writeText(text);
    } catch {
      // Ignore clipboard permission errors
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      className="flex h-[100dvh] w-full max-w-full bg-bg-primary text-text-secondary font-sans antialiased overflow-hidden selection:bg-border-strong selection:text-text-primary relative"
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

      {/* Lightbox Modal for Images */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau ${lightboxImage.name}`}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-[95vw] max-h-[92vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-12 left-0 right-0 flex items-center justify-between text-white text-xs px-2">
              <span className="truncate max-w-[70vw] font-medium">{lightboxImage.name}</span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  download={lightboxImage.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                  title="Unduh gambar"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                  title="Tutup (Esc)"
                  aria-label="Tutup pratinjau"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
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

      {/* Clear All Chats Confirmation Dialog (1d) */}
      {isClearAllConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-all-dialog-title"
          aria-describedby="clear-all-dialog-desc"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm touch-none"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isClearingAllChats) {
              setIsClearAllConfirmOpen(false);
            }
          }}
        >
          <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-bg-elevated border-t sm:border border-border-subtle p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 shadow-2xl space-y-4 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain touch-auto animate-user-bubble">
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

      {/* Settings Modal (1d: Display Name + Default Model) */}
      {isSettingsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          className="fixed inset-0 z-50 flex flex-col md:flex-row items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4 touch-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSettingsModalOpen(false);
            }
          }}
        >
          <form
            onSubmit={handleSaveSettings}
            className="w-full h-[100dvh] md:h-auto md:max-h-[calc(100dvh-2rem)] md:max-w-md bg-bg-elevated md:rounded-2xl md:border md:border-border-subtle shadow-2xl flex flex-col overflow-hidden touch-auto animate-user-bubble"
          >
            {/* Pinned Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-border-subtle px-4 sm:px-5 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3 bg-bg-elevated z-10">
              <div>
                <h2 id="settings-modal-title" className="text-sm font-semibold text-text-primary">
                  Pengaturan
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Sesuaikan profil tampilan dan model AI default Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                aria-label="Tutup pengaturan"
                className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-icon-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer flex items-center justify-center shrink-0 -mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Middle Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
              {/* Display Name Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="settings-display-name"
                  className="block text-xs font-medium text-text-primary"
                >
                  Nama Tampilan
                </label>
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
                  placeholder="Masukkan nama tampilan Anda..."
                  className={`w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-bg-surface border text-base lg:text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-colors ${
                    settingsNameError
                      ? "border-red-500/80 focus:border-red-400"
                      : "border-border-subtle focus:border-border-strong"
                  }`}
                />
                {settingsNameError ? (
                  <p role="alert" className="text-[11px] text-red-400 font-medium">
                    {settingsNameError}
                  </p>
                ) : (
                  <p className="text-[11px] text-text-muted">
                    Disimpan secara aman di peramban perangkat ini.
                  </p>
                )}
              </div>

              {/* Theme Mode Selector (Item 13) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-primary">
                  Tema Tampilan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "dark" as const, label: "Gelap", icon: Moon },
                    { id: "light" as const, label: "Terang", icon: Sun },
                    { id: "system" as const, label: "Sistem", icon: Monitor },
                  ].map((item) => {
                    const isSelected = themeMode === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSetTheme(item.id)}
                        className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-bg-surface border-border-strong text-text-primary shadow-xs font-semibold"
                            : "bg-bg-elevated border-border-subtle text-text-secondary hover:border-border-strong"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Default Model Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-primary">
                  Model Default
                </label>
                <div className="space-y-2">
                  {AVAILABLE_AGENTS.map((agent) => {
                    const isChecked = settingsDefaultAgentInput === agent.id;
                    return (
                      <label
                        key={agent.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-colors min-h-[48px] ${
                          isChecked
                            ? "bg-bg-surface border-border-strong text-text-primary"
                            : "bg-bg-elevated border-border-subtle text-text-secondary hover:border-border-strong"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="radio"
                            name="defaultAgent"
                            value={agent.id}
                            checked={isChecked}
                            onChange={() => setSettingsDefaultAgentInput(agent.id)}
                            className="w-4 h-4 accent-zinc-900 dark:accent-zinc-100 cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-text-primary leading-tight">{agent.name}</div>
                            <div className="text-[11px] text-text-muted leading-relaxed line-clamp-2 mt-0.5">{agent.description}</div>
                          </div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-surface text-text-secondary font-medium border border-border-subtle ml-2 shrink-0">
                          {agent.tag}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Keyboard Shortcuts List - desktop only / hidden on touch & mobile */}
              <div className="hidden md:block touch-hidden space-y-2 pt-2 border-t border-border-subtle">
                <div className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
                  <Keyboard className="w-3.5 h-3.5 text-icon-muted" />
                  <span>Pintasan Keyboard</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2 py-0.5 min-w-0">
                    <span className="text-text-muted truncate">Cari percakapan</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-mono text-[10px] whitespace-nowrap shrink-0 shadow-2xs">
                      Ctrl / ⌘ K
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-0.5 min-w-0">
                    <span className="text-text-muted truncate">Percakapan baru</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-mono text-[10px] whitespace-nowrap shrink-0 shadow-2xs">
                      Ctrl / ⌘ ⇧ O
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-0.5 min-w-0">
                    <span className="text-text-muted truncate">Hentikan balasan</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-mono text-[10px] whitespace-nowrap shrink-0 shadow-2xs">
                      Esc
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-0.5 min-w-0">
                    <span className="text-text-muted truncate">Kirim pesan</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-mono text-[10px] whitespace-nowrap shrink-0 shadow-2xs">
                      Enter
                    </kbd>
                  </div>
                </div>
              </div>

              {/* App Version Info (Item 4: at bottom of settings modal only) */}
              <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-xs">
                <span className="text-text-muted">Versi Aplikasi</span>
                <span className="px-2 py-0.5 rounded text-[11px] bg-bg-surface text-text-secondary font-mono border border-border-subtle">
                  Axioma v2.5
                </span>
              </div>

              {/* Storage Transparency Notice (Item 3) */}
              <div className="pt-2 border-t border-border-subtle">
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Riwayat percakapan tersimpan untuk perangkat &amp; browser ini. Menghapus data browser akan menghilangkan akses ke riwayat.
                </p>
              </div>
            </div>

            {/* Pinned Footer */}
            <div className="shrink-0 flex items-center justify-end gap-2 px-4 sm:px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-border-subtle bg-bg-elevated z-10">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-medium text-text-secondary bg-bg-surface hover:bg-bg-subtle hover:text-text-primary border border-border-subtle transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-5 py-2 rounded-xl text-xs font-semibold text-bg-primary bg-text-primary hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile Off-canvas Backdrop */}
      {isMobileSidebarOpen && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsMobileSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
              setIsMobileSidebarOpen(false);
            }
          }}
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm lg:hidden"
          aria-label="Tutup latar bilah sisi"
        />
      )}

      {/* Responsive Sidebar */}
      <aside
        aria-label="Riwayat percakapan"
        className={`fixed inset-y-0 left-0 z-40 w-[272px] max-w-[85vw] bg-bg-primary border-r border-border-subtle flex flex-col transition-all duration-300 ease-in-out lg:static ${
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

        {/* New Chat Button + Real-time Search Filter */}
        <div className="px-3 pb-2 space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => handleCreateNewChat()}
            className="w-full min-h-11 lg:min-h-0 flex items-center justify-between px-3 py-2 rounded-lg bg-bg-surface hover:bg-bg-subtle active:scale-[0.99] text-text-primary text-xs font-medium tracking-tight transition-all duration-200 border border-border-subtle shadow-xs hover:border-border-strong cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-icon-muted" />
              <span>Percakapan Baru</span>
            </span>
          </button>

          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-icon-muted absolute left-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTouchOrMobile ? "Cari percakapan..." : "Cari percakapan... (Ctrl+K)"}
              aria-label="Cari percakapan"
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

        {/* Grouped Chat History */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
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
            <div className="w-8 h-8 rounded-full bg-bg-surface border border-border-subtle flex items-center justify-center shrink-0 text-text-primary text-xs font-semibold tracking-tight select-none">
              {getAvatarInitials(displayName)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium tracking-tight text-text-primary truncate">
                {displayName || "Pengguna"}
              </div>
              <div className="text-xs text-text-muted truncate">
                {displayName ? "Ruang Kerja Pro" : "Atur nama di Pengaturan"}
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
        <header className="sticky top-0 z-20 h-14 flex items-center justify-between px-4 bg-bg-primary/85 backdrop-blur-md border-b border-border-subtle shrink-0">
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

            {/* Mobile Hamburger Menu (Item 3: >= 44x44px) */}
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

            {/* Mobile Header Model Selector */}
            <div className="relative lg:hidden">
              <button
                ref={headerAgentTriggerRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={isHeaderAgentMenuOpen}
                onClick={() => setIsHeaderAgentMenuOpen((prev) => !prev)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIsHeaderAgentMenuOpen(true);
                  }
                }}
                className="text-xs font-medium tracking-tight text-text-secondary hover:text-text-primary bg-bg-surface border border-border-subtle min-h-[44px] px-3.5 py-2.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer hover:bg-bg-subtle"
                aria-label="Pilih model"
              >
                <span>{selectedAgent.shortName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-icon-muted" />
              </button>

              {isHeaderAgentMenuOpen && (
                <div
                  ref={headerAgentMenuRef}
                  role="menu"
                  aria-label="Pilih model AI"
                  onKeyDown={(e) =>
                    handleMenuArrowKeyDown(e, headerAgentItemRefs.current, () =>
                      closeHeaderAgentMenu(true)
                    )
                  }
                  className="fixed left-4 right-4 top-14 w-auto sm:absolute sm:top-full sm:mt-2 sm:left-0 sm:right-auto sm:w-80 z-40 rounded-xl bg-bg-elevated border border-border-subtle p-1.5 shadow-2xl space-y-1"
                >
                  {AVAILABLE_AGENTS.map((agent, idx) => (
                    <button
                      ref={(el) => {
                        headerAgentItemRefs.current[idx] = el;
                      }}
                      type="button"
                      role="menuitemradio"
                      aria-checked={agent.id === selectedAgent.id}
                      key={agent.id}
                      onClick={() => {
                        handleSelectAgent(agent);
                        closeHeaderAgentMenu(true);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs tracking-tight transition-colors flex items-center justify-between gap-2.5 focus:outline-none focus:ring-1 focus:ring-border-strong cursor-pointer ${
                        agent.id === selectedAgent.id
                          ? "bg-bg-surface text-text-primary font-medium"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-surface/50"
                      }`}
                    >
                      <div className="min-w-0 pr-1 flex-1">
                        <div className="text-text-primary font-medium">{agent.name}</div>
                        <div className="text-[11px] text-text-muted line-clamp-2 leading-relaxed break-words">{agent.description}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-surface text-text-secondary font-medium border border-border-subtle shrink-0 whitespace-nowrap">
                          {agent.tag}
                        </span>
                        {agent.id === selectedAgent.id && (
                          <Check className="w-3.5 h-3.5 text-text-primary shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Header Actions: Mobile New Chat Button (+) & Hidden Share button (Item 10) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleCreateNewChat()}
              aria-label="Percakapan Baru"
              title="Percakapan Baru"
              className="lg:hidden w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic Chat Workspace */}
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative">
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

          {/* Active State History with Smooth Message Entrance Animations */}
          <div
            ref={scrollRef}
            onScroll={handleChatScroll}
            className={`flex-1 overflow-y-auto transition-opacity duration-200 ease-out ${
              hasMessages ||
              (isChatAreaLoading &&
                Boolean(initialChatId || (activeChatId && activeChatId !== "new-chat")))
                ? "opacity-100 py-6 px-4"
                : "opacity-0 pointer-events-none py-0"
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
                    className="flex justify-start animate-error-shake"
                  >
                    <div className="w-full rounded-2xl bg-red-950/30 border border-red-800/50 px-4 py-3.5 space-y-2.5">
                      <div className="flex items-start gap-2.5 text-red-200 text-sm font-medium">
                        <CircleAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div>{message.content}</div>
                          {message.errorDetail && (
                            <div className="text-xs text-red-200/90 font-normal leading-relaxed">
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/50 hover:bg-red-900/70 text-red-100 border border-red-700/50 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                  className="w-full flex justify-start animate-ai-bubble group relative"
                >
                  <div className="w-full space-y-2 sm:space-y-3 min-w-0">
                    <div
                      className={`axioma-markdown max-w-[70ch] text-text-secondary text-[15px] leading-[1.7] tracking-normal break-words ${
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

            {/* AI Thinking Indicator with Wave Dots + Fade-in / Fade-out */}
            {showThinkingIndicator && (
              <div
                role="status"
                aria-live="polite"
                className={`flex justify-start transition-[opacity,transform] duration-180 ease-out motion-safe-transform ${
                  isThinkingFadingOut
                    ? "opacity-0 -translate-y-1 pointer-events-none"
                    : "opacity-100 translate-y-0 animate-ai-bubble"
                }`}
              >
                <div className="flex items-center gap-3 px-1 py-1">
                  <Image
                    src="/brand/axioma-logo.png"
                    alt="Axioma"
                    width={28}
                    height={28}
                    className="w-6 h-6 object-contain rounded-md shrink-0 dark:ring-1 dark:ring-white/10"
                  />
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 h-5" aria-hidden="true">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-text-muted animate-thinking-dot"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-text-muted animate-thinking-dot"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-text-muted animate-thinking-dot"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                    <span className="text-xs text-text-muted font-medium tracking-tight animate-thinking-label select-none">
                      {waitingSeconds >= 25
                        ? "Jawaban panjang butuh waktu lebih lama. Anda bisa menekan Stop kapan saja."
                        : waitingSeconds >= 8
                        ? "Menyusun jawaban, mohon tunggu…"
                        : "Axioma sedang berpikir…"}
                    </span>
                  </div>
                </div>
              </div>
            )}

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

          {/* Subtle gradient overlay above input console so scrolling text fades gracefully (Item 11) */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/80 to-transparent z-10" />

          {/* Input Console: Smoothly Glides from Center (Welcome) to Bottom Dock (Active) via GPU transform */}
          <div className="w-full px-4 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)] to-transparent relative z-20">
            <div className="w-full max-w-2xl lg:max-w-3xl mx-auto flex flex-col items-center">
              <div
                className={`relative w-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe-transform ${
                  hasMessages ||
                  (isChatAreaLoading &&
                    Boolean(initialChatId || (activeChatId && activeChatId !== "new-chat")))
                    ? "translate-y-0"
                    : "-translate-y-[max(180px,28vh)] sm:-translate-y-[30vh]"
                }`}
              >
                {/* Friendly Greeting or Loading Skeleton (#6: fades out & slides up slightly when first message is sent) */}
                {showEmptyDecorations &&
                  !(
                    isChatAreaLoading &&
                    Boolean(initialChatId || (activeChatId && activeChatId !== "new-chat"))
                  ) && (
                    <div
                      className={`absolute bottom-full left-0 right-0 mb-5 sm:mb-6 pointer-events-none transition-[opacity,transform] duration-200 ease-out motion-safe-transform ${
                        isEmptyDecorationsExiting
                          ? "opacity-0 -translate-y-2.5"
                          : "opacity-100 translate-y-0"
                      }`}
                    >
                      <div className="w-full max-w-2xl mx-auto text-center">
                        {isChatAreaLoading || greeting === "" ? (
                          <div
                            role="status"
                            aria-label="Memuat ruang kerja"
                            className="flex flex-col items-center gap-2.5"
                          >
                            <div className="h-7 sm:h-8 w-64 sm:w-96 rounded-xl bg-border-subtle animate-pulse" />
                          </div>
                        ) : (
                          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-balance text-text-primary tracking-tight leading-relaxed">
                            {greeting}
                          </h1>
                        )}
                      </div>
                    </div>
                  )}

                {/* Voice Input Permission / Error Banner (1a) */}
                {speechError && (
                  <div
                    role="alert"
                    className="w-full mb-2.5 px-3.5 py-2 rounded-xl bg-amber-950/50 border border-amber-800/60 flex items-center justify-between gap-2 text-xs text-amber-200"
                  >
                    <span className="flex items-center gap-2">
                      <CircleAlert className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{speechError}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSpeechError(null)}
                      aria-label="Tutup peringatan suara"
                      className="p-1 rounded hover:bg-amber-900/50 text-amber-300 hover:text-amber-100 cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Active Voice Recording Indicator (1a) */}
                {isRecording && (
                  <div className="w-full mb-2 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center justify-between text-xs text-red-200">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span>
                        Mendengarkan (Bahasa Indonesia)... Klik ikon mikrofon untuk berhenti.
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => stopVoiceRecording(true)}
                      className="text-xs font-medium text-red-300 hover:text-red-100 underline cursor-pointer"
                    >
                      Selesai
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

                {/* Polished Input Box */}
                <div className="bg-bg-elevated border border-border-subtle rounded-[20px] p-2 shadow-2xl flex items-center w-full gap-1.5 sm:gap-2 transition-[border-color,box-shadow] duration-200 hover:border-border-strong focus-within:border-border-strong focus-within:ring-2 focus-within:ring-border-subtle">
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
                          onClick={() => {
                            if (isAttachmentsFull || isLoading || isGenerating) return;
                            setIsAttachmentMenuOpen((prev) => !prev);
                          }}
                          onKeyDown={(e) => {
                            if (isAttachmentsFull || isLoading || isGenerating) return;
                            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                              e.preventDefault();
                              setIsAttachmentMenuOpen(true);
                            }
                          }}
                          disabled={isAttachmentsFull || isLoading || isGenerating}
                          title={isAttachmentsFull ? "Maksimal 4 file per pesan" : "Lampirkan berkas"}
                          aria-label={isAttachmentsFull ? "Maksimal 4 file per pesan" : "Lampirkan berkas"}
                          className={`w-11 h-11 min-w-[44px] min-h-[44px] lg:w-8 lg:h-8 lg:min-w-0 lg:min-h-0 p-2 lg:p-1.5 rounded-xl flex items-center justify-center transition-all ${
                            isAttachmentsFull || isLoading || isGenerating
                              ? "text-icon-muted opacity-40 cursor-not-allowed"
                              : "text-icon-muted hover:text-text-primary hover:bg-bg-surface active:scale-95 cursor-pointer"
                          }`}
                        >
                          <Paperclip className="w-4 h-4" />
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

                        {/* Attachment Popover Menu (All Devices) */}
                        {isAttachmentMenuOpen && (
                          <div
                            role="menu"
                            aria-label="Pilihan lampiran"
                            onKeyDown={(e) =>
                              handleMenuArrowKeyDown(e, attachmentItemRefs.current, () =>
                                closeAttachmentMenu(true)
                              )
                            }
                            className="absolute left-0 bottom-full mb-2.5 z-40 w-64 sm:w-72 rounded-2xl bg-bg-elevated border border-border-strong p-1.5 shadow-2xl space-y-1 animate-user-bubble focus:outline-none"
                          >
                            {/* 1. Foto & Gambar */}
                            <button
                              ref={(el) => {
                                attachmentItemRefs.current[0] = el;
                              }}
                              role="menuitem"
                              type="button"
                              onClick={() => {
                                closeAttachmentMenu(true);
                                imageInputRef.current?.click();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-medium text-text-primary hover:bg-bg-surface active:bg-bg-subtle transition-colors cursor-pointer text-left focus:outline-none focus:bg-bg-surface"
                            >
                              <div className="w-7 h-7 rounded-lg bg-bg-surface border border-border-subtle flex items-center justify-center shrink-0">
                                <ImageIcon className="w-4 h-4 text-icon-muted" />
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
                                closeAttachmentMenu(true);
                                pdfInputRef.current?.click();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-medium text-text-primary hover:bg-bg-surface active:bg-bg-subtle transition-colors cursor-pointer text-left focus:outline-none focus:bg-bg-surface"
                            >
                              <div className="w-7 h-7 rounded-lg bg-bg-surface border border-border-subtle flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-icon-muted" />
                              </div>
                              <span className="flex-1">Dokumen PDF</span>
                            </button>

                            {/* 3. Ambil Foto (Touchscreen only) */}
                            <button
                              ref={(el) => {
                                attachmentItemRefs.current[2] = el;
                              }}
                              role="menuitem"
                              type="button"
                              onClick={() => {
                                closeAttachmentMenu(true);
                                cameraInputRef.current?.click();
                              }}
                              className="hidden [@media(pointer:coarse)]:flex w-full items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-medium text-text-primary hover:bg-bg-surface active:bg-bg-subtle transition-colors cursor-pointer text-left focus:outline-none focus:bg-bg-surface"
                            >
                              <div className="w-7 h-7 rounded-lg bg-bg-surface border border-border-subtle flex items-center justify-center shrink-0">
                                <Camera className="w-4 h-4 text-icon-muted" />
                              </div>
                              <span className="flex-1">Ambil Foto</span>
                            </button>

                            {/* Footer limitation note */}
                            <div className="border-t border-border-subtle pt-2 pb-1 px-2.5 mt-1">
                              <p className="text-[10px] text-text-muted leading-relaxed">
                                Maks. 4 file · 10 MB per file · PDF maks. 30 halaman
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Hidden Native File Inputs */}
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                          multiple
                          className="hidden"
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
                          accept="application/pdf"
                          multiple
                          className="hidden"
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
                          accept="image/*"
                          capture="environment"
                          className="hidden"
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

                  <div className="flex-1 min-w-0 flex items-center">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={inputText}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      onFocus={() => {
                        if (typeof window !== "undefined" && window.innerWidth < 1024) {
                          setTimeout(() => {
                            textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                          }, 300);
                        }
                      }}
                      aria-label="Ketik pesan untuk Axioma"
                      placeholder="Tanya apa saja…"
                      className="flex-1 w-full self-center resize-none overflow-y-hidden bg-transparent text-text-primary placeholder:text-text-muted text-base focus:outline-none px-1 py-2.5 max-h-48 leading-6 tracking-normal transition-[height,color] duration-150 ease-out"
                    />
                  </div>

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

                      {isAgentMenuOpen && (
                        <div
                          ref={desktopAgentMenuRef}
                          role="menu"
                          aria-label="Pilih model AI"
                          onKeyDown={(e) =>
                            handleMenuArrowKeyDown(e, desktopAgentItemRefs.current, () =>
                              closeDesktopAgentMenu(true)
                            )
                          }
                          className="absolute bottom-full mb-2 right-0 z-40 w-72 sm:w-80 rounded-xl bg-bg-elevated border border-border-subtle p-1.5 shadow-2xl space-y-1"
                        >
                          {AVAILABLE_AGENTS.map((agent, idx) => (
                            <button
                              ref={(el) => {
                                desktopAgentItemRefs.current[idx] = el;
                              }}
                              type="button"
                              role="menuitemradio"
                              aria-checked={agent.id === selectedAgent.id}
                              key={agent.id}
                              onClick={() => {
                                handleSelectAgent(agent);
                                closeDesktopAgentMenu(true);
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs tracking-tight transition-colors flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-border-strong cursor-pointer ${
                                agent.id === selectedAgent.id
                                  ? "bg-bg-surface text-text-primary font-medium"
                                  : "text-text-secondary hover:text-text-primary hover:bg-bg-surface/50"
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-text-primary font-medium">{agent.name}</div>
                                <div className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                                  {agent.description}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-surface text-text-secondary font-medium border border-border-subtle">
                                  {agent.tag}
                                </span>
                                {agent.id === selectedAgent.id && (
                                  <Check className="w-3.5 h-3.5 text-text-primary" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Voice Input Mic Button (Item 3: >= 40x40px on mobile) */}
                    <div className="relative group shrink-0">
                      {isSpeechSupported ? (
                        <button
                          type="button"
                          onClick={handleToggleVoiceRecording}
                          aria-pressed={isRecording}
                          title={
                            isRecording
                              ? "Klik untuk berhenti merekam"
                              : "Input suara (Bahasa Indonesia)"
                          }
                          aria-label={
                            isRecording ? "Hentikan perekaman suara" : "Mulai input suara"
                          }
                          className={`w-11 h-11 min-w-[44px] min-h-[44px] lg:w-8 lg:h-8 lg:min-w-0 lg:min-h-0 p-2 lg:p-1.5 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                            isRecording
                              ? "bg-red-500/20 text-red-400 border-red-500/60 animate-pulse shadow-sm"
                              : "text-icon-muted hover:text-text-primary hover:bg-bg-surface border-transparent"
                          }`}
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            title="Browser tidak mendukung input suara"
                            aria-label="Browser tidak mendukung input suara"
                            className="w-11 h-11 min-w-[44px] min-h-[44px] lg:w-8 lg:h-8 lg:min-w-0 lg:min-h-0 p-2 lg:p-1.5 rounded-xl flex items-center justify-center text-icon-muted opacity-50 cursor-not-allowed"
                          >
                            <MicOff className="w-4 h-4" />
                          </button>
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute right-0 bottom-full mb-2 px-2 py-1 rounded-md bg-bg-elevated border border-border-subtle text-[11px] text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-lg z-30"
                          >
                            Browser tidak mendukung input suara
                          </span>
                        </>
                      )}
                    </div>

                    {/* Send / Stop button (Item 3: >= 44x44px on mobile/tablet, 32x32px on desktop) */}
                    {isGenerating ? (
                      <button
                        type="button"
                        onClick={handleStopGeneration}
                        title="Hentikan respons"
                        aria-label="Hentikan respons"
                        className="w-11 h-11 min-w-[44px] min-h-[44px] lg:w-8 lg:h-8 lg:min-w-0 lg:min-h-0 rounded-full flex items-center justify-center bg-text-primary text-bg-primary hover:opacity-90 active:scale-[0.94] transition-[opacity] duration-150 ease-out shadow-md cursor-pointer"
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
                        isLoading;

                      return (
                        <button
                          type="button"
                          onClick={() => void handleSendMessage()}
                          onPointerDown={() => {
                            if (!isSendDisabled) {
                              setIsSendPressed(true);
                            }
                          }}
                          onPointerUp={() => setIsSendPressed(false)}
                          onPointerLeave={() => setIsSendPressed(false)}
                          disabled={isSendDisabled}
                          title={!isOnline ? "Koneksi internet terputus" : "Kirim pesan"}
                          aria-label={!isOnline ? "Koneksi internet terputus" : "Kirim pesan"}
                          className={`w-11 h-11 min-w-[44px] min-h-[44px] lg:w-8 lg:h-8 lg:min-w-0 lg:min-h-0 rounded-full flex items-center justify-center transition-[background-color,color,box-shadow,opacity] duration-200 ease-out ${
                            !isSendDisabled
                              ? `bg-text-primary text-bg-primary hover:opacity-90 shadow-md cursor-pointer ${
                                  isSendPressed ? "scale-[0.94]" : "scale-100"
                                }`
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

                {/* 4 Starter Prompt Cards (Empty State only: 2x2 grid on mobile & desktop so 4th card never overlaps disclaimer) */}
                {showEmptyDecorations &&
                  !(
                    isChatAreaLoading &&
                    Boolean(initialChatId || (activeChatId && activeChatId !== "new-chat"))
                  ) && (
                    <div
                      className={`absolute top-full left-0 right-0 mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-2.5 transition-[opacity,transform] duration-200 ease-out motion-safe-transform ${
                        isEmptyDecorationsExiting
                          ? "opacity-0 -translate-y-2.5 pointer-events-none"
                          : "opacity-100 translate-y-0"
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
              <div className="text-center text-[11px] sm:text-xs text-text-muted pt-2.5 tracking-normal flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                <span>Axioma dapat membuat kesalahan. Periksa kembali informasi penting.</span>
                <span className="hidden sm:inline text-border-strong">•</span>
                <span className="inline-flex items-center gap-2">
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

      {/* Edit Message & Truncate Subsequent Messages Confirmation Modal (Item 2) */}
      {editConfirmTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-confirm-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm touch-none"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingEdit) {
              setEditConfirmTarget(null);
            }
          }}
        >
          <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-bg-elevated border-t sm:border border-border-subtle p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 shadow-2xl space-y-4 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain touch-auto animate-user-bubble">
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
                    {editConfirmTarget.subsequentCount} pesan setelahnya
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
                className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-medium text-text-secondary bg-bg-surface hover:bg-bg-subtle hover:text-text-primary border border-border-subtle transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={() =>
                  handleSubmitEditUserMessage(editConfirmTarget.msgId, editConfirmTarget.content)
                }
                className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-bg-primary bg-text-primary hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isSubmittingEdit ? "Menghapus & Mengirim…" : "Lanjutkan & Kirim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloudflare Turnstile Invisible Container (#9) */}
      <div id="turnstile-container" className="hidden" aria-hidden="true" />
    </div>
  );
}
