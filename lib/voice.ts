// Audio & Voice helper utilities for Axioma Voice Mode & Dictation
// Fully optimized for Safari iOS (iPhone), Android Chrome, and In-App WebViews

export interface VoiceSupportStatus {
  isSupported: boolean;
  hasMediaDevices: boolean;
  hasMediaRecorder: boolean;
  hasAudioContext: boolean;
  isInAppBrowser: boolean;
}

export function checkVoiceSupport(): VoiceSupportStatus {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isSupported: false,
      hasMediaDevices: false,
      hasMediaRecorder: false,
      hasAudioContext: false,
      isInAppBrowser: false,
    };
  }

  const hasMediaDevices = Boolean(
    navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"
  );
  const hasMediaRecorder = typeof window.MediaRecorder !== "undefined";
  const hasAudioContext = Boolean(
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );

  const userAgent = navigator.userAgent || "";
  const isInAppBrowser = /FBAN|FBAV|Instagram|WhatsApp|Line|Messenger/i.test(userAgent);

  return {
    isSupported: hasMediaDevices && hasMediaRecorder && hasAudioContext && !isInAppBrowser,
    hasMediaDevices,
    hasMediaRecorder,
    hasAudioContext,
    isInAppBrowser,
  };
}

export function getSupportedAudioMimeType(): string {
  if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
    return "audio/webm";
  }

  const candidateTypes = [
    "audio/webm;codecs=opus",
    "audio/mp4", // Native on iOS Safari
    "audio/aac",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/wav",
  ];

  for (const type of candidateTypes) {
    if (typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "";
}

// iOS AudioContext & AudioElement unlocker triggered strictly within user gesture
export async function unlockAudioSystem(
  audioCtx?: AudioContext | null,
  audioEl?: HTMLAudioElement | null
): Promise<void> {
  try {
    if (audioCtx && audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
  } catch (err) {
    console.warn("Failed to resume AudioContext:", err);
  }

  try {
    if (audioEl) {
      // Play a short silent data uri to unlock HTMLAudioElement for automated plays on iOS
      const currentSrc = audioEl.src;
      if (!currentSrc || currentSrc.startsWith("data:")) {
        audioEl.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
        await audioEl.play().catch(() => {});
        audioEl.pause();
      }
    }
  } catch (err) {
    console.warn("Failed to unlock AudioElement:", err);
  }
}

// Calculates RMS volume level (0.0 to 1.0) for Voice Activity Detection & Orb animation
export function calculateRms(analyser: AnalyserNode, dataArray: Uint8Array): number {
  analyser.getByteTimeDomainData(dataArray as any);
  let sumSquares = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = (dataArray[i] - 128) / 128;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / dataArray.length);
}

// Transcribes recorded audio blob via backend /api/voice/transcribe
export async function transcribeAudioBlob(
  backendUrl: string,
  audioBlob: Blob,
  headers: Record<string, string>,
  turnstileToken?: string
): Promise<string> {
  const formData = new FormData();
  const extension = audioBlob.type.includes("mp4") ? "mp4" : audioBlob.type.includes("aac") ? "aac" : "webm";
  formData.append("file", audioBlob, `recording.${extension}`);

  const reqHeaders: Record<string, string> = { ...headers };
  // Let browser set multipart boundary
  delete reqHeaders["Content-Type"];

  if (turnstileToken) {
    reqHeaders["X-Turnstile-Token"] = turnstileToken;
  }

  const response = await fetch(`${backendUrl}/api/voice/transcribe`, {
    method: "POST",
    headers: reqHeaders,
    body: formData,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(errorJson?.error || `Gagal mentranskripsikan suara (${response.status})`);
  }

  const result = (await response.json()) as { success: boolean; text?: string };
  return (result.text || "").trim();
}

// Synthesizes speech via backend /api/voice/speak and returns playable audio Blob
export async function fetchTtsAudioBlob(
  backendUrl: string,
  text: string,
  headers: Record<string, string>,
  voice?: string
): Promise<Blob> {
  const reqHeaders: Record<string, string> = {
    ...headers,
    "Content-Type": "application/json",
  };

  const response = await fetch(`${backendUrl}/api/voice/speak`, {
    method: "POST",
    headers: reqHeaders,
    body: JSON.stringify({
      text,
      voice: voice || "nova",
      language: "id",
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(errorJson?.error || `Gagal menghasilkan suara (${response.status})`);
  }

  const blob = await response.blob();
  return blob;
}

// Splits text into complete sentences for incremental TTS pipelining
export function extractReadySentences(text: string): { sentences: string[]; remaining: string } {
  if (!text) return { sentences: [], remaining: "" };

  // Match sentence ending with punctuation (. ! ? \n) followed by space or newline
  const sentenceRegex = /([^.!?\n]+[.!?\n]+)\s*/g;
  const sentences: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = sentenceRegex.exec(text)) !== null) {
    const sentence = match[1].trim();
    if (sentence.length > 0) {
      sentences.push(sentence);
    }
    lastIndex = sentenceRegex.lastIndex;
  }

  const remaining = text.slice(lastIndex);
  return { sentences, remaining };
}

/**
 * Cleans Markdown symbols, code blocks, links, bullet markers, and URLs so TTS
 * reads natural conversational Indonesian without spelling punctuation.
 */
export function stripMarkdownForTts(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/^[^\w\n]*Mengoptimalkan prompt visual[^\n]*\n*/gim, "")
    .replace(/^[^\w\n]*Sedang merender[^\n]*\n*/gim, "")
    .replace(/.*Gemini AI\.\.\..*\n*/gi, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_]{1,3}(.*?)[*_]{1,3}/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^\s*[-*+•]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/[*_#~`|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

let cachedIndonesianVoice: SpeechSynthesisVoice | null = null;
let voicesChangedBound = false;

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Selects the clearest Indonesian voice available on the user's OS/browser
 * (prioritizes lang starting with "id-ID", then "id"; e.g. Damayanti on iOS/macOS,
 * Google Bahasa Indonesia on Android/Chrome).
 */
export function pickBestIndonesianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices?.() || [];
  if (!voices.length) return cachedIndonesianVoice;

  const normalizeLang = (lang: string) => lang.toLowerCase().replace("_", "-");
  const isNaturalVoice = (name: string) =>
    /google|damayanti|ardi|gadis|natural|wavenet|neural|enhanced|premium/i.test(name);

  const preferredIdId = voices.find(
    (v) => normalizeLang(v.lang).startsWith("id-id") && isNaturalVoice(v.name)
  );
  if (preferredIdId) return preferredIdId;

  const exactIdId = voices.find((v) => normalizeLang(v.lang).startsWith("id-id"));
  if (exactIdId) return exactIdId;

  const preferredId = voices.find(
    (v) => normalizeLang(v.lang).startsWith("id") && isNaturalVoice(v.name)
  );
  if (preferredId) return preferredId;

  return voices.find((v) => normalizeLang(v.lang).startsWith("id")) || null;
}

/**
 * Preloads & caches the best Indonesian SpeechSynthesisVoice and binds voiceschanged
 * once so asynchronous voice lists (Chrome/iOS) are captured automatically.
 */
export function preloadIndonesianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const synth = window.speechSynthesis;
  const refresh = () => {
    const picked = pickBestIndonesianVoice();
    if (picked) {
      cachedIndonesianVoice = picked;
    }
  };

  refresh();

  if (!voicesChangedBound) {
    voicesChangedBound = true;
    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", refresh);
    } else {
      synth.onvoiceschanged = refresh;
    }
  }

  return cachedIndonesianVoice;
}

/**
 * Synchronously unlocks iOS Safari / iOS PWA Web Speech synthesis inside a user click gesture
 * by calling cancel() and speaking a zero-volume space utterance at rate 10, then preloading
 * the Indonesian voice list.
 */
export function unlockSpeechSynthesis(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(" ");
    u.lang = "id-ID";
    u.volume = 0;
    u.rate = 10;
    u.pitch = 1.0;
    synth.speak(u);
  } catch {}

  return preloadIndonesianVoice();
}

export interface SpeechQueueCallbacks {
  onSpeechStart?: () => void;
  onSentenceStart?: (info: {
    sentence: string;
    spokenCharsBefore: number;
  }) => void;
  onBoundary?: (globalCharIndex: number) => void;
  onQueueEmpty?: () => void;
}

export interface SpeechQueueOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  minSentenceLength?: number;
  callbacks?: SpeechQueueCallbacks;
}

const SENTENCE_END_REGEX = /(?:[.!?](?![0-9])(?:\s+|$)|\n+)/g;

/**
 * Streaming sentence-by-sentence Web Speech queue for low-latency voice responses.
 */
export class SpeechQueue {
  private lang: string;
  private rate: number;
  private pitch: number;
  private minSentenceLength: number;
  private callbacks: SpeechQueueCallbacks;

  private rawBuffer = "";
  private queue: string[] = [];
  private isSpeaking = false;
  private hasNotifiedStart = false;
  private isStreamFinished = false;
  private hasNotifiedEmpty = false;
  private generation = 0;
  private spokenCharsBeforeCurrent = 0;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options?: SpeechQueueOptions) {
    this.lang = options?.lang ?? "id-ID";
    this.rate = options?.rate ?? 1.08;
    this.pitch = options?.pitch ?? 1.0;
    this.minSentenceLength = options?.minSentenceLength ?? 15;
    this.callbacks = options?.callbacks ?? {};
    preloadIndonesianVoice();
  }

  public setRate(nextRate: number): void {
    if (Number.isFinite(nextRate) && nextRate > 0) {
      this.rate = nextRate;
    }
  }

  public pushChunk(chunk: string): void {
    if (!chunk) return;
    this.rawBuffer += chunk;
    this.extractCompletedSentences(this.minSentenceLength);
    if (!this.isSpeaking && this.queue.length > 0) {
      this.speakNext();
    }
  }

  public finish(): void {
    this.isStreamFinished = true;
    this.extractCompletedSentences(1);

    const remainingClean = stripMarkdownForTts(this.rawBuffer);
    this.rawBuffer = "";
    if (remainingClean) {
      this.queue.push(remainingClean);
    }

    if (!this.isSpeaking) {
      if (this.queue.length > 0) {
        this.speakNext();
      } else {
        this.notifyQueueEmpty();
      }
    }
  }

  public cancel(): void {
    this.generation += 1;
    this.clearTimers();
    this.rawBuffer = "";
    this.queue = [];
    this.isSpeaking = false;
    this.hasNotifiedStart = false;
    this.isStreamFinished = false;
    this.hasNotifiedEmpty = true;
    this.spokenCharsBeforeCurrent = 0;
    this.activeUtterance = null;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  private extractCompletedSentences(minChars: number): void {
    while (this.rawBuffer.length > 0) {
      SENTENCE_END_REGEX.lastIndex = 0;
      let matchedCut = -1;
      let match: RegExpExecArray | null;

      while ((match = SENTENCE_END_REGEX.exec(this.rawBuffer)) !== null) {
        const endPos = match.index + match[0].length;
        const candidateRaw = this.rawBuffer.slice(0, endPos);
        if (candidateRaw.trim().length >= minChars) {
          const cleaned = stripMarkdownForTts(candidateRaw);
          if (cleaned.length >= minChars) {
            matchedCut = endPos;
            this.queue.push(cleaned);
            break;
          }
        }
      }

      if (matchedCut > 0) {
        this.rawBuffer = this.rawBuffer.slice(matchedCut);
      } else {
        break;
      }
    }
  }

  private clearTimers(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private notifyQueueEmpty(): void {
    if (this.hasNotifiedEmpty) return;
    this.hasNotifiedEmpty = true;
    this.clearTimers();
    this.isSpeaking = false;
    this.activeUtterance = null;
    this.callbacks.onQueueEmpty?.();
  }

  private speakNext(): void {
    this.clearTimers();
    const nextSentence = this.queue.shift();

    if (!nextSentence) {
      this.isSpeaking = false;
      this.activeUtterance = null;
      if (this.isStreamFinished) {
        this.notifyQueueEmpty();
      }
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      this.queue = [];
      this.notifyQueueEmpty();
      return;
    }

    this.hasNotifiedEmpty = false;
    this.isSpeaking = true;

    if (!this.hasNotifiedStart) {
      this.hasNotifiedStart = true;
      this.callbacks.onSpeechStart?.();
    }

    const myGen = this.generation;
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(nextSentence);
    utterance.lang = this.lang;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    const voice = preloadIndonesianVoice();
    if (voice) {
      utterance.voice = voice;
    }

    this.activeUtterance = utterance;
    this.callbacks.onSentenceStart?.({
      sentence: nextSentence,
      spokenCharsBefore: this.spokenCharsBeforeCurrent,
    });

    let settled = false;
    let utteranceStarted = false;
    const startTs = Date.now();

    const finishUtterance = () => {
      if (settled || myGen !== this.generation) return;
      settled = true;
      this.clearTimers();
      this.activeUtterance = null;
      this.spokenCharsBeforeCurrent += nextSentence.length + 1;
      this.speakNext();
    };

    utterance.onstart = () => {
      if (settled || myGen !== this.generation) return;
      utteranceStarted = true;
    };

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (settled || myGen !== this.generation) return;
      if (typeof event.charIndex === "number") {
        this.callbacks.onBoundary?.(this.spokenCharsBeforeCurrent + event.charIndex);
      }
    };

    utterance.onend = () => {
      finishUtterance();
    };

    utterance.onerror = () => {
      finishUtterance();
    };

    // Recover gracefully if browser drops onend event (Safari/Chrome workaround)
    this.watchdogTimer = setInterval(() => {
      if (settled || myGen !== this.generation) {
        this.clearTimers();
        return;
      }
      const elapsed = Date.now() - startTs;
      const idleAfterStart = utteranceStarted && elapsed > 600 && !synth.speaking && !synth.pending;
      const stuckBeforeStart = !utteranceStarted && elapsed > 3500 && !synth.speaking && !synth.pending;
      const hardTimeout = elapsed > 25000;
      if (idleAfterStart || stuckBeforeStart || hardTimeout) {
        finishUtterance();
      }
    }, 250);

    // Chrome desktop workaround for long utterances; avoid pause() on iOS Safari
    if (!isIosDevice()) {
      this.keepAliveTimer = setInterval(() => {
        if (settled || myGen !== this.generation) {
          this.clearTimers();
          return;
        }
        try {
          if (synth.speaking) {
            synth.pause();
            synth.resume();
          }
        } catch {}
      }, 9000);
    }

    try {
      synth.resume();
      synth.speak(utterance);
      synth.resume();
    } catch {
      finishUtterance();
    }
  }
}

/**
 * Fetches neural MP3 speech audio from Next.js /api/tts route.
 */
export async function fetchNeuralTtsBlob(
  text: string,
  options?: {
    voice?: string;
    rate?: number;
    signal?: AbortSignal;
  }
): Promise<Blob> {
  const cleanText = stripMarkdownForTts(text);
  if (!cleanText) {
    throw new Error("Teks kosong");
  }

  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: cleanText,
      voice: options?.voice || "id-ID-ArdiNeural",
      rate: options?.rate ?? 1.05,
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Neural TTS HTTP ${response.status}`);
  }

  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    throw new Error("Audio TTS kosong");
  }
  return blob;
}

/**
 * Speaks text using browser window.speechSynthesis (Text-to-Speech fallback)
 * Picks best Indonesian voice, rate=1.05, pitch=1.0, and unlocks mobile playback.
 */
export function speakResponse(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    lang?: string;
    onStart?: () => void;
    onBoundary?: (event: SpeechSynthesisEvent) => void;
    onEnd?: () => void;
    onError?: (err: unknown) => void;
  }
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("[speakResponse] SpeechSynthesis is not supported in this environment");
    return null;
  }

  const cleanText = stripMarkdownForTts(text);
  if (!cleanText) return null;

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  } catch {}

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = options?.lang || "id-ID";
  utterance.rate = options?.rate ?? 1.08;
  utterance.pitch = options?.pitch ?? 1.0;

  const bestVoice = preloadIndonesianVoice();
  if (bestVoice) {
    utterance.voice = bestVoice;
  }

  if (options?.onStart) utterance.onstart = () => options.onStart?.();
  if (options?.onBoundary) utterance.onboundary = (e) => options.onBoundary?.(e);
  if (options?.onEnd) utterance.onend = () => options.onEnd?.();
  if (options?.onError) utterance.onerror = (e) => options.onError?.(e);

  try {
    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.resume();
  } catch (err) {
    console.warn("[speakResponse] speechSynthesis.speak failed:", err);
  }

  return utterance;
}


