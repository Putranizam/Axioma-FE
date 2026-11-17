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

/**
 * Selects the clearest Indonesian voice available on the user's OS/browser
 * (e.g., Damayanti on iOS/macOS, Google Bahasa Indonesia on Android/Chrome).
 */
export function pickBestIndonesianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices?.() || [];
  if (!voices.length) return null;

  const preferred = voices.find(
    (v) =>
      v.lang.toLowerCase().replace("_", "-").startsWith("id") &&
      /google|damayanti|ardi|gadis|natural|wavenet|neural/i.test(v.name)
  );
  if (preferred) return preferred;

  const exactId = voices.find(
    (v) => v.lang.toLowerCase().replace("_", "-") === "id-id"
  );
  if (exactId) return exactId;

  return voices.find((v) => v.lang.toLowerCase().startsWith("id")) || null;
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
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
  } catch {}

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = options?.lang || "id-ID";
  utterance.rate = options?.rate ?? 1.05;
  utterance.pitch = options?.pitch ?? 1.0;

  const bestVoice = pickBestIndonesianVoice();
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


