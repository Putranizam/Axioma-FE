"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  MessageSquare,
  X,
  AlertCircle,
} from "lucide-react";
import {
  checkVoiceSupport,
  getSupportedAudioMimeType,
  unlockAudioSystem,
  calculateRms,
  transcribeAudioBlob,
  fetchTtsAudioBlob,
  extractReadySentences,
} from "../lib/voice";

export interface VoiceMessageItem {
  id: string;
  sender: "user" | "ai";
  text: string;
}

interface VoiceModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  backendUrl: string;
  authHeaders: Record<string, string>;
  chatId: string;
  agentId: string;
  agentName: string;
  onSendMessage: (
    userText: string,
    voiceMode: boolean
  ) => Promise<{ aiReplyText: string; streamReader?: ReadableStreamDefaultReader<Uint8Array> | null }>;
  onTurnComplete?: (userText: string, aiText: string) => void;
  getTurnstileToken?: () => Promise<string>;
}

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

export default function VoiceModeOverlay({
  isOpen,
  onClose,
  backendUrl,
  authHeaders,
  chatId,
  agentName,
  onSendMessage,
  onTurnComplete,
  getTurnstileToken,
}: VoiceModeOverlayProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [inAppNotice, setInAppNotice] = useState<boolean>(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [messages, setMessages] = useState<VoiceMessageItem[]>([]);
  const [activeSpeechText, setActiveSpeechText] = useState<string>("");

  // Refs for Web Audio API & MediaRecorder
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // VAD & State machine refs
  const voiceStateRef = useRef<VoiceState>("idle");
  const isMutedRef = useRef<boolean>(false);
  const hasSpokenRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartTimestampRef = useRef<number>(0);
  const isProcessingTurnRef = useRef<boolean>(false);
  const activeTtsAbortRef = useRef<AbortController | null>(null);
  const audioQueueRef = useRef<Array<{ text: string; audioBlobPromise: Promise<Blob | null> }>>([]);
  const isPlayingAudioRef = useRef<boolean>(false);
  const turnstileTokenGetterRef = useRef(getTurnstileToken);
  const playNextInQueueRef = useRef<() => Promise<void>>(async () => {});
  const startRecordingTurnRef = useRef<() => void>(() => {});

  useEffect(() => {
    turnstileTokenGetterRef.current = getTurnstileToken;
  }, [getTurnstileToken]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Teardown all hardware tracks, audio contexts, and timers
  const cleanupHardware = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (activeTtsAbortRef.current) {
      activeTtsAbortRef.current.abort();
      activeTtsAbortRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }

    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
      } catch {}
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        void audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
    isProcessingTurnRef.current = false;
    hasSpokenRef.current = false;
  }, []);

  // Graceful exit
  const handleEndCall = useCallback(() => {
    cleanupHardware();
    setVoiceState("idle");
    setVolumeLevel(0);
    onClose();
  }, [cleanupHardware, onClose]);

  // Play next audio in TTS queue
  const playNextInQueue = useCallback(async () => {
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    const item = audioQueueRef.current.shift();
    if (!item) return;

    isPlayingAudioRef.current = true;
    try {
      const blob = await item.audioBlobPromise;
      if (!blob || blob.size === 0) {
        isPlayingAudioRef.current = false;
        void playNextInQueueRef.current();
        return;
      }

      const audioUrl = URL.createObjectURL(blob);
      if (audioElementRef.current) {
        const audio = audioElementRef.current;
        audio.src = audioUrl;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          isPlayingAudioRef.current = false;
          if (audioQueueRef.current.length > 0) {
            void playNextInQueueRef.current();
          } else {
            // AI finished speaking, transition back to listening
            setVoiceState("listening");
            startRecordingTurnRef.current();
          }
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          isPlayingAudioRef.current = false;
          void playNextInQueueRef.current();
        };

        await audio.play().catch((err) => {
          console.warn("Audio playback interrupted/rejected:", err);
          isPlayingAudioRef.current = false;
          setVoiceState("listening");
          startRecordingTurnRef.current();
        });
      }
    } catch {
      isPlayingAudioRef.current = false;
      void playNextInQueueRef.current();
    }
  }, []);

  useEffect(() => {
    playNextInQueueRef.current = playNextInQueue;
  }, [playNextInQueue]);

  // Process user speech audio blob into AI voice reply
  const processUserAudioTurn = useCallback(
    async (audioBlob: Blob) => {
      if (isProcessingTurnRef.current) return;
      isProcessingTurnRef.current = true;
      setVoiceState("processing");

      try {
        const token = turnstileTokenGetterRef.current
          ? await turnstileTokenGetterRef.current().catch(() => undefined)
          : undefined;

        // 1. Transcribe audio
        const userText = await transcribeAudioBlob(backendUrl, audioBlob, authHeaders, token);

        if (!userText || !userText.trim()) {
          // If no speech detected, seamlessly resume listening
          isProcessingTurnRef.current = false;
          setVoiceState("listening");
          startRecordingTurnRef.current();
          return;
        }

        // Show user message in live caption
        const userMsgItem: VoiceMessageItem = {
          id: `u-${Date.now()}`,
          sender: "user",
          text: userText,
        };
        setMessages((prev) => [...prev.slice(-6), userMsgItem]);
        setActiveSpeechText(userText);

        // 2. Request concise AI reply in Voice Mode
        const aiMsgItem: VoiceMessageItem = {
          id: `a-${Date.now()}`,
          sender: "ai",
          text: "…",
        };
        setMessages((prev) => [...prev.slice(-6), aiMsgItem]);

        const abortController = new AbortController();
        activeTtsAbortRef.current = abortController;

        const { aiReplyText, streamReader } = await onSendMessage(userText, true);

        // Handle streaming TTS if streamReader is available, or full text
        let fullAiText = "";
        let pendingSentenceBuffer = "";

        const queueSentenceForTts = (sentence: string) => {
          if (!sentence.trim()) return;
          const promise = fetchTtsAudioBlob(backendUrl, sentence, authHeaders);
          audioQueueRef.current.push({ text: sentence, audioBlobPromise: promise });
          if (!isPlayingAudioRef.current) {
            setVoiceState("speaking");
            void playNextInQueue();
          }
        };

        if (streamReader) {
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            if (abortController.signal.aborted) {
              try {
                await streamReader.cancel();
              } catch {}
              break;
            }

            const { value, done } = await streamReader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split(/\r?\n\r?\n/);
            buffer = events.pop() || "";

            for (const event of events) {
              const line = event.split(/\r?\n/).find((l) => l.startsWith("data:"));
              if (!line) continue;
              const jsonStr = line.slice(5).trim();
              if (!jsonStr) continue;

              try {
                const payload = JSON.parse(jsonStr);
                if (payload.type === "chunk" && typeof payload.text === "string") {
                  fullAiText += payload.text;
                  pendingSentenceBuffer += payload.text;

                  // Update caption text
                  setActiveSpeechText(fullAiText);
                  setMessages((prev) =>
                    prev.map((m) => (m.id === aiMsgItem.id ? { ...m, text: fullAiText } : m))
                  );

                  // Extract ready sentences for incremental TTS
                  const { sentences, remaining } = extractReadySentences(pendingSentenceBuffer);
                  if (sentences.length > 0) {
                    for (const s of sentences) {
                      queueSentenceForTts(s);
                    }
                    pendingSentenceBuffer = remaining;
                  }
                }
              } catch {}
            }
          }

          if (pendingSentenceBuffer.trim()) {
            queueSentenceForTts(pendingSentenceBuffer.trim());
          }
        } else {
          fullAiText = aiReplyText;
          setActiveSpeechText(fullAiText);
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgItem.id ? { ...m, text: fullAiText } : m))
          );
          queueSentenceForTts(fullAiText);
        }

        if (onTurnComplete && fullAiText) {
          onTurnComplete(userText, fullAiText);
        }
      } catch (err: any) {
        console.error("Voice turn processing failed:", err);
        setActiveSpeechText("Gagal mengenali suara, coba lagi");
        setErrorMessage("Gagal mengenali suara, coba lagi");
        await new Promise((r) => setTimeout(r, 2200));
        setErrorMessage(null);
        setActiveSpeechText("");
        setVoiceState("listening");
        startRecordingTurnRef.current();
      } finally {
        isProcessingTurnRef.current = false;
      }
    },
    [backendUrl, authHeaders, onSendMessage, onTurnComplete, playNextInQueue]
  );

  // Start recording the user's audio turn
  const startRecordingTurn = useCallback(() => {
    if (voiceStateRef.current === "speaking" || voiceStateRef.current === "processing") {
      return;
    }

    const stream = mediaStreamRef.current;
    if (!stream || !stream.active) return;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    recordedChunksRef.current = [];
    hasSpokenRef.current = false;

    const mimeType = getSupportedAudioMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch {
      recorder = new MediaRecorder(stream);
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      if (recordedChunksRef.current.length > 0 && hasSpokenRef.current) {
        const audioBlob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        recordedChunksRef.current = [];
        void processUserAudioTurn(audioBlob);
      }
    };

    mediaRecorderRef.current = recorder;
    try {
      recorder.start(250); // Collect data every 250ms
      setVoiceState("listening");
    } catch (err) {
      console.warn("Failed to start MediaRecorder:", err);
    }
  }, [processUserAudioTurn]);

  useEffect(() => {
    startRecordingTurnRef.current = startRecordingTurn;
  }, [startRecordingTurn]);

  // VAD loop running on animation frames
  const runVadLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      if (!analyserRef.current) return;

      const rms = calculateRms(analyserRef.current, dataArray);
      setVolumeLevel(Math.min(1, rms * 4)); // Scale for UI responsiveness

      const currentVoiceState = voiceStateRef.current;
      const speechThreshold = 0.032;

      // Handle Barge-in: if user starts speaking while AI is speaking
      if (currentVoiceState === "speaking" && rms > speechThreshold && !isMutedRef.current) {
        if (!speechStartTimestampRef.current) {
          speechStartTimestampRef.current = Date.now();
        } else if (Date.now() - speechStartTimestampRef.current > 200) {
          // Sustained user speech detected -> barge-in!
          if (audioElementRef.current) {
            try {
              audioElementRef.current.pause();
              audioElementRef.current.currentTime = 0;
            } catch {}
          }
          if (activeTtsAbortRef.current) {
            activeTtsAbortRef.current.abort();
            activeTtsAbortRef.current = null;
          }
          audioQueueRef.current = [];
          isPlayingAudioRef.current = false;
          speechStartTimestampRef.current = 0;
          setVoiceState("listening");
          startRecordingTurn();
          animationFrameRef.current = requestAnimationFrame(checkVolume);
          return;
        }
      } else if (currentVoiceState !== "speaking") {
        speechStartTimestampRef.current = 0;
      }

      // Normal turn speech detection (when listening)
      if (currentVoiceState === "listening" && !isMutedRef.current) {
        if (rms > speechThreshold) {
          hasSpokenRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (hasSpokenRef.current) {
          // User spoke and is now silent: start ~1000ms silence timer
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null;
              if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state === "recording" &&
                hasSpokenRef.current
              ) {
                try {
                  mediaRecorderRef.current.stop();
                } catch {}
              }
            }, 1000);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(checkVolume);
    };

    animationFrameRef.current = requestAnimationFrame(checkVolume);
  }, [startRecordingTurn]);

  // Initialize Voice Session on Modal Open
  const initializeVoiceSession = useCallback(async () => {
    setErrorMessage(null);
    setPermissionNotice(null);
    setInAppNotice(false);

    const support = checkVoiceSupport();
    if (support.isInAppBrowser) {
      setInAppNotice(true);
      return;
    }
    if (!support.hasMediaDevices) {
      setErrorMessage("Perangkat Anda tidak mendukung input mikrofon.");
      return;
    }

    try {
      // 1. Synchronous user gesture audio system unlock (Essential for iOS Safari!)
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      await unlockAudioSystem(audioCtx, audioElementRef.current);

      // 2. Request mic stream with echoCancellation and noiseSuppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Setup Analyser for VAD & Orb visualizer
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      // 4. Start VAD loop & first listening turn
      runVadLoop();
      startRecordingTurn();
    } catch (err: any) {
      console.error("Voice session initialization error:", err);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setPermissionNotice(
          "Izin mikrofon belum diberikan. Silakan izinkan akses mikrofon di Pengaturan Browser Anda untuk menggunakan Mode Suara."
        );
      } else {
        setErrorMessage("Tidak dapat mengakses mikrofon. Pastikan mikrofon terpasang dan aktif.");
      }
      setVoiceState("error");
    }
  }, [runVadLoop, startRecordingTurn]);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  // Life-cycle management on open / visibilitychange
  useEffect(() => {
    let initTimer: ReturnType<typeof setTimeout> | null = null;
    if (isOpen) {
      initTimer = setTimeout(() => {
        void initializeVoiceSession();
      }, 0);
    } else {
      cleanupHardware();
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden or backgrounded: release mic immediately
        cleanupHardware();
        if (isOpen) {
          onClose();
        }
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", cleanupHardware);

    return () => {
      if (initTimer) clearTimeout(initTimer);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", cleanupHardware);
      cleanupHardware();
    };
  }, [isOpen, initializeVoiceSession, cleanupHardware, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mode Suara Axioma"
      className="fixed inset-0 z-50 bg-[#08080a] text-white flex flex-col justify-between overflow-hidden select-none animate-fade-in"
      style={{
        paddingTop: "max(1.25rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
        paddingRight: "max(1.25rem, env(safe-area-inset-right))",
        height: "100dvh",
      }}
    >
      {/* Hidden reusable audio player for iOS audio continuity */}
      <audio ref={audioElementRef} playsInline preload="auto" className="hidden" aria-hidden="true" />

      {/* Top Header */}
      <div className="w-full flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold tracking-wide text-white/90">Axioma Voice</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
            {agentName || "Axioma Pro"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleEndCall}
          aria-label="Tutup Mode Suara"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white/80 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Interactive Glowing Orb */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-auto z-10">
        {/* Animated Radial Waves Container */}
        <div className="relative flex items-center justify-center w-72 h-72 sm:w-80 sm:h-80">
          {/* Outer Ripple 1 */}
          <div
            className={`absolute inset-0 rounded-full transition-all duration-300 pointer-events-none ${
              voiceState === "speaking"
                ? "bg-emerald-500/15 animate-ping"
                : voiceState === "processing"
                ? "bg-indigo-500/20 animate-pulse"
                : voiceState === "listening" && volumeLevel > 0.05
                ? "bg-cyan-500/20 animate-pulse"
                : "bg-white/5"
            }`}
            style={{
              transform: `scale(${1 + volumeLevel * 0.45})`,
              opacity: voiceState === "idle" ? 0.2 : 0.6 + volumeLevel * 0.4,
            }}
          />

          {/* Outer Ripple 2 */}
          <div
            className={`absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full transition-all duration-200 pointer-events-none blur-xl ${
              voiceState === "speaking"
                ? "bg-gradient-to-tr from-emerald-500/40 via-teal-400/30 to-cyan-500/40"
                : voiceState === "processing"
                ? "bg-gradient-to-tr from-indigo-500/40 via-purple-500/30 to-pink-500/30 animate-spin"
                : "bg-gradient-to-tr from-cyan-500/30 via-blue-500/20 to-indigo-500/30"
            }`}
            style={{
              transform: `scale(${1 + volumeLevel * 0.3})`,
            }}
          />

          {/* Central Living Sphere Orb */}
          <div
            className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full relative flex items-center justify-center shadow-2xl transition-transform duration-150 ${
              voiceState === "speaking"
                ? "bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 shadow-emerald-500/50"
                : voiceState === "processing"
                ? "bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 shadow-purple-500/50 animate-pulse"
                : isMuted
                ? "bg-gradient-to-br from-zinc-600 via-zinc-700 to-zinc-800 shadow-zinc-700/30"
                : "bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 shadow-sky-500/50"
            }`}
            style={{
              transform: `scale(${0.92 + volumeLevel * 0.22})`,
            }}
          >
            <div className="w-16 h-16 rounded-full bg-white/20 blur-md pointer-events-none" />
            {isMuted && <MicOff className="w-8 h-8 text-white/80 absolute" />}
          </div>
        </div>

        {/* State Label & Guidance */}
        <div className="mt-8 text-center space-y-1.5 px-4">
          <p className="text-xl sm:text-2xl font-semibold tracking-tight text-white/95">
            {voiceState === "speaking"
              ? "Axioma berbicara…"
              : voiceState === "processing"
              ? "Memproses…"
              : isMuted
              ? "Mikrofon dibisukan"
              : "Mendengarkan…"}
          </p>
          <p className="text-xs sm:text-sm text-white/60 font-normal">
            {voiceState === "speaking"
              ? "Bicara kapan saja untuk memotong (Barge-in)"
              : voiceState === "processing"
              ? "Sedang menyusun balasan…"
              : isMuted
              ? "Ketuk ikon mikrofon untuk mengaktifkan kembali"
              : "Bicaralah santai, jeda diam otomatis mengirim"}
          </p>
        </div>

        {/* Real-time Subtitles / Live Captions */}
        {showCaptions && activeSpeechText && (
          <div className="mt-6 max-w-md w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center text-xs sm:text-sm text-white/85 leading-relaxed max-h-24 overflow-y-auto overscroll-contain shadow-lg animate-user-bubble">
            <span>&ldquo;{activeSpeechText}&rdquo;</span>
          </div>
        )}

        {/* Error / In-App Browser Notice */}
        {inAppNotice && (
          <div className="mt-6 max-w-sm mx-4 p-4 rounded-2xl bg-amber-950/80 border border-amber-600/50 text-amber-200 text-xs space-y-2 text-center shadow-xl">
            <div className="flex items-center justify-center gap-1.5 font-semibold text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Buka di Browser Utama</span>
            </div>
            <p>
              Browser in-app (seperti WhatsApp/Instagram) memblokir mikrofon. Salin tautan dan buka di{" "}
              <strong>Safari</strong> (iPhone) atau <strong>Chrome</strong> (Android).
            </p>
          </div>
        )}

        {permissionNotice && (
          <div className="mt-6 max-w-sm mx-4 p-4 rounded-2xl bg-red-950/80 border border-red-700/50 text-red-200 text-xs space-y-2 text-center shadow-xl">
            <div className="flex items-center justify-center gap-1.5 font-semibold text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Izin Mikrofon Ditolak</span>
            </div>
            <p>{permissionNotice}</p>
          </div>
        )}

        {errorMessage && !permissionNotice && (
          <div className="mt-6 max-w-sm mx-4 p-3 rounded-xl bg-red-900/50 border border-red-700 text-red-200 text-xs text-center shadow-lg">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full flex items-center justify-center gap-6 sm:gap-8 z-20 pb-2">
        {/* Toggle Captions / Transcript */}
        <button
          type="button"
          onClick={() => setShowCaptions((prev) => !prev)}
          title={showCaptions ? "Sembunyikan teks" : "Tampilkan teks"}
          aria-label={showCaptions ? "Sembunyikan teks" : "Tampilkan teks"}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
            showCaptions
              ? "bg-white/15 border-white/30 text-white"
              : "bg-white/5 border-white/10 text-white/50 hover:text-white/80"
          }`}
        >
          <MessageSquare className="w-6 h-6" />
        </button>

        {/* End Call Button (Prominent Red) */}
        <button
          type="button"
          onClick={handleEndCall}
          title="Akhiri Panggilan Suara"
          aria-label="Akhiri Panggilan Suara"
          className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-xl shadow-red-600/40 transition-all cursor-pointer"
        >
          <PhoneOff className="w-8 h-8" />
        </button>

        {/* Mute / Unmute Button */}
        <button
          type="button"
          onClick={handleToggleMute}
          title={isMuted ? "Bunyikan Mikrofon" : "Bisukan Mikrofon"}
          aria-label={isMuted ? "Bunyikan Mikrofon" : "Bisukan Mikrofon"}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
            isMuted
              ? "bg-red-500/20 border-red-500/60 text-red-400"
              : "bg-white/10 border-white/20 text-white hover:bg-white/20"
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
}

