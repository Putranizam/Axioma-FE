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
import { calculateRms, unlockAudioSystem } from "../lib/voice";

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
  backendUrl: _backendUrl,
  authHeaders: _authHeaders,
  chatId: _chatId,
  agentName,
  onSendMessage,
  onTurnComplete,
  getTurnstileToken: _getTurnstileToken,
}: VoiceModeOverlayProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [unsupportedNotice, setUnsupportedNotice] = useState<string | null>(null);
  const [inAppNotice, setInAppNotice] = useState<boolean>(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [activeSpeechText, setActiveSpeechText] = useState<string>("");

  // Refs for Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Speech Recognition & Speech Synthesis refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTranscriptRef = useRef<string>("");
  const hasSpokenRef = useRef<boolean>(false);
  const shouldListenRef = useRef<boolean>(false);
  const isProcessingTurnRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const voiceStateRef = useRef<VoiceState>("idle");

  // Keep state refs in sync
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Teardown all hardware tracks, recognition, speech synthesis, and timers
  const cleanupHardware = useCallback(() => {
    console.log("[VoiceMode] Cleaning up hardware, recognition, and audio contexts");
    shouldListenRef.current = false;
    isProcessingTurnRef.current = false;
    isSpeakingRef.current = false;
    hasSpokenRef.current = false;
    accumulatedTranscriptRef.current = "";

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop SpeechRecognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    // Stop SpeechSynthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    currentUtteranceRef.current = null;

    // Stop all media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }

    // Pause audio element
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
      } catch {}
    }

    // Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        void audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }, []);

  // Graceful exit: stops hardware and closes modal
  const handleEndCall = useCallback(() => {
    console.log("[VoiceMode] Ending voice session");
    cleanupHardware();
    setVoiceState("idle");
    setVolumeLevel(0);
    onClose();
  }, [cleanupHardware, onClose]);

  // Get Indonesian voice for SpeechSynthesis
  const getIndonesianVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Exact id-ID voice
    const exactId = voices.find(
      (v) =>
        v.lang.toLowerCase() === "id-id" ||
        v.lang.toLowerCase().replace("_", "-") === "id-id"
    );
    if (exactId) return exactId;

    // 2. Starts with "id"
    const prefixId = voices.find((v) => v.lang.toLowerCase().startsWith("id"));
    if (prefixId) return prefixId;

    // 3. Fallback to default
    return voices.find((v) => v.default) || voices[0] || null;
  }, []);

  // Resume listening state after AI speaks or on initial start
  const resumeListening = useCallback(() => {
    if (!shouldListenRef.current && voiceStateRef.current !== "speaking" && voiceStateRef.current !== "processing") {
      // If voice session was closed, do nothing
      return;
    }

    console.log("[VoiceMode] Resuming listening state...");
    isSpeakingRef.current = false;
    isProcessingTurnRef.current = false;
    shouldListenRef.current = true;
    hasSpokenRef.current = false;
    accumulatedTranscriptRef.current = "";
    setActiveSpeechText("");
    setVoiceState("listening");

    if (recognitionRef.current && !isMutedRef.current) {
      try {
        recognitionRef.current.start();
        console.log("[VoiceMode] Recognition started for listening turn");
      } catch (e: any) {
        // Recognition might already be running
        if (e?.name !== "InvalidStateError") {
          console.warn("[VoiceMode] Error starting recognition:", e);
        }
      }
    }
  }, []);

  // Speak AI reply via browser window.speechSynthesis (Text-to-Speech)
  const speakResponse = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        console.warn("[VoiceMode] window.speechSynthesis not supported on this platform");
        resumeListening();
        return;
      }

      // Clean text: strip markdown syntax, links, code blocks, excessive symbols
      const cleanText = text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_#~>]/g, "")
        .replace(/^[•\-*]\s+/gm, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!cleanText) {
        resumeListening();
        return;
      }

      console.log("[VoiceMode] Speaking AI reply with SpeechSynthesis:", cleanText);

      // Resume audio state if paused or suspended (iOS Safari & Android Chrome)
      try {
        window.speechSynthesis.resume();
      } catch {}

      try {
        window.speechSynthesis.cancel(); // Hentikan suara sebelumnya
      } catch {}

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "id-ID"; // Atur bahasa Indonesia
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const indonesianVoice = getIndonesianVoice();
      if (indonesianVoice) {
        utterance.voice = indonesianVoice;
      }

      let keepAliveTimer: NodeJS.Timeout | null = null;

      utterance.onstart = () => {
        console.log("[VoiceMode] SpeechSynthesis started speaking");
        isSpeakingRef.current = true;
        setVoiceState("speaking");

        if (keepAliveTimer) clearInterval(keepAliveTimer);
        keepAliveTimer = setInterval(() => {
          if (!isSpeakingRef.current) {
            if (keepAliveTimer) clearInterval(keepAliveTimer);
            return;
          }
          try {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          } catch {}
        }, 10000);
      };

      utterance.onend = () => {
        console.log("[VoiceMode] SpeechSynthesis finished speaking. Hands-free resuming listening...");
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        isSpeakingRef.current = false;
        resumeListening();
      };

      utterance.onerror = (e) => {
        console.warn("[VoiceMode] SpeechSynthesis utterance error:", e);
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        isSpeakingRef.current = false;
        resumeListening();
      };

      currentUtteranceRef.current = utterance;

      // Jeda 50ms agar pembatalan cancel() selesai pada level OS sebelum speak()
      setTimeout(() => {
        try {
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn("[VoiceMode] Failed to execute window.speechSynthesis.speak:", err);
          resumeListening();
        }
      }, 50);
    },
    [getIndonesianVoice, resumeListening]
  );

  const speakAiReply = speakResponse;

  // Send completed user transcript to Gemini backend
  const handleSendTurn = useCallback(
    async (userText: string) => {
      const cleanUserText = userText.trim();
      if (!cleanUserText || isProcessingTurnRef.current) return;
      isProcessingTurnRef.current = true;

      console.log("[VoiceMode] Auto-sending transcript to AI backend:", cleanUserText);

      // Stop recognition while thinking
      shouldListenRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      setVoiceState("processing");
      setActiveSpeechText(cleanUserText);

      try {
        // Send message to Gemini backend with voice_mode = true
        const { aiReplyText, streamReader } = await onSendMessage(cleanUserText, true);

        let fullAiText = "";
        if (streamReader) {
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { value, done } = await streamReader.read();
            if (done) {
              const remainder = buffer + decoder.decode();
              if (remainder.trim()) {
                const events = remainder.split(/\r?\n\r?\n/);
                for (const event of events) {
                  const line = event.split(/\r?\n/).find((l) => l.startsWith("data:"));
                  if (!line) continue;
                  const jsonStr = line.slice(5).trim();
                  if (!jsonStr) continue;

                  try {
                    const payload = JSON.parse(jsonStr);
                    if (payload.type === "chunk" && typeof payload.text === "string") {
                      fullAiText += payload.text;
                    } else if (payload.type === "done" && typeof payload.data === "string" && !fullAiText) {
                      fullAiText = payload.data;
                    }
                  } catch {}
                }
              }
              break;
            }

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
                  setActiveSpeechText(fullAiText);
                } else if (payload.type === "done" && typeof payload.data === "string" && !fullAiText) {
                  fullAiText = payload.data;
                  setActiveSpeechText(fullAiText);
                }
              } catch {}
            }
          }
        } else {
          fullAiText = aiReplyText;
        }

        if (!fullAiText && aiReplyText) {
          fullAiText = aiReplyText;
        }

        const cleanReply = fullAiText.trim();
        if (!cleanReply) {
          throw new Error("Balasan AI kosong");
        }

        console.log("[VoiceMode] Balasan AI diterima penuh, memicu Text-to-Speech:", cleanReply);
        setActiveSpeechText(cleanReply);

        // Notify parent ChatInterface to persist message in chat session
        if (onTurnComplete) {
          onTurnComplete(cleanUserText, cleanReply);
        }

        // Panggil fungsi pemutar suara (Text-to-Speech)
        speakResponse(cleanReply);
      } catch (err: unknown) {
        console.error("[VoiceMode] Error processing voice turn:", err);
        setErrorMessage("Gagal menyusun balasan AI. Mencoba mendengarkan kembali…");
        setTimeout(() => {
          setErrorMessage(null);
          resumeListening();
        }, 2200);
      } finally {
        isProcessingTurnRef.current = false;
      }
    },
    [onSendMessage, onTurnComplete, speakResponse, resumeListening]
  );

  // Initialize SpeechRecognition instance
  const setupSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn("[VoiceMode] Web Speech API SpeechRecognition is NOT available in this browser");
      setUnsupportedNotice(
        "Browser ini belum mendukung pengenalan suara langsung. Silakan gunakan Google Chrome atau ketik pesan teks."
      );
      setVoiceState("error");
      return null;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "id-ID";
    recognition.maxAlternatives = 1;

    recognition.onaudiostart = () => {
      console.log("[VoiceMode] onaudiostart: Audio capture started by browser");
    };

    recognition.onsoundstart = () => {
      console.log("[VoiceMode] onsoundstart: Sound detected");
    };

    recognition.onspeechstart = () => {
      console.log("[VoiceMode] onspeechstart: Human speech recognized");
      // Handle Barge-in: if user starts speaking while AI is speaking, interrupt AI
      if (isSpeakingRef.current) {
        console.log("[VoiceMode] Barge-in! User interrupted AI speech");
        if (typeof window !== "undefined" && window.speechSynthesis) {
          try {
            window.speechSynthesis.cancel();
          } catch {}
        }
        isSpeakingRef.current = false;
        setVoiceState("listening");
      }
    };

    recognition.onspeechend = () => {
      console.log("[VoiceMode] onspeechend: Human speech pause/end");
    };

    recognition.onnomatch = () => {
      console.warn("[VoiceMode] onnomatch: Speech heard but no transcript matched");
    };

    recognition.onerror = (event: any) => {
      console.error("[VoiceMode] SpeechRecognition onerror:", event?.error, event);
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setPermissionNotice(
          "Izin mikrofon belum diberikan atau diblokir. Silakan aktifkan izin mikrofon di Pengaturan Browser."
        );
        setVoiceState("error");
      } else if (event?.error === "network") {
        console.warn("[VoiceMode] Speech recognition network warning");
      }
    };

    // iOS Safari auto-restart handler
    recognition.onend = () => {
      console.log(
        "[VoiceMode] SpeechRecognition onend. shouldListen:",
        shouldListenRef.current,
        "isMuted:",
        isMutedRef.current,
        "voiceState:",
        voiceStateRef.current
      );

      // If we are still supposed to be listening and not muted, immediately restart recognition
      if (
        shouldListenRef.current &&
        !isMutedRef.current &&
        voiceStateRef.current === "listening"
      ) {
        try {
          recognition.start();
          console.log("[VoiceMode] SpeechRecognition restarted successfully onend");
        } catch (err: any) {
          if (err?.name !== "InvalidStateError") {
            console.warn("[VoiceMode] Auto-restart warning:", err);
            // Brief delayed retry in case it was transitioning
            setTimeout(() => {
              if (
                shouldListenRef.current &&
                !isMutedRef.current &&
                voiceStateRef.current === "listening"
              ) {
                try {
                  recognition.start();
                } catch {}
              }
            }, 300);
          }
        }
      }
    };

    // Live result handling & silence auto-send detection (1.5 - 2s)
    recognition.onresult = (event: any) => {
      if (
        !shouldListenRef.current ||
        isMutedRef.current ||
        voiceStateRef.current !== "listening"
      ) {
        return;
      }

      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      if (finalTranscript.trim()) {
        accumulatedTranscriptRef.current = (
          accumulatedTranscriptRef.current +
          " " +
          finalTranscript.trim()
        ).trim();
      }

      const currentLiveSpokenText = (
        accumulatedTranscriptRef.current +
        " " +
        interimTranscript.trim()
      ).trim();

      if (currentLiveSpokenText) {
        hasSpokenRef.current = true;
        setActiveSpeechText(currentLiveSpokenText);

        // Reset silence timer every time user produces speech
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        // Auto-send on silence (1.6 seconds)
        silenceTimerRef.current = setTimeout(() => {
          const textToSend = (
            accumulatedTranscriptRef.current || currentLiveSpokenText
          ).trim();
          if (textToSend && voiceStateRef.current === "listening") {
            console.log("[VoiceMode] Silence detected (1.6s). Auto-sending:", textToSend);
            accumulatedTranscriptRef.current = "";
            void handleSendTurn(textToSend);
          }
        }, 1600);
      }
    };

    return recognition;
  }, [handleSendTurn]);

  // Audio Analyser VAD loop for orb volume visualizer
  const runAudioVisualizerLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const updateVolume = () => {
      if (!analyserRef.current) return;

      if (voiceStateRef.current === "speaking") {
        // While AI is speaking, pulse volume with a gentle speaking cadence
        const time = Date.now() / 150;
        const wave = (Math.sin(time) + 1) * 0.5;
        setVolumeLevel(0.25 + wave * 0.45);
      } else if (voiceStateRef.current === "processing") {
        setVolumeLevel(0.15);
      } else if (!isMutedRef.current) {
        // Calculate microphone RMS volume
        const rms = calculateRms(analyserRef.current, dataArray);
        setVolumeLevel(Math.min(1, rms * 4.5));
      } else {
        setVolumeLevel(0);
      }

      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    animationFrameRef.current = requestAnimationFrame(updateVolume);
  }, []);

  // Initialize Voice Session on Modal Open
  const initializeVoiceSession = useCallback(async () => {
    console.log("[VoiceMode] Initializing voice session...");
    setErrorMessage(null);
    setPermissionNotice(null);
    setUnsupportedNotice(null);
    setInAppNotice(false);

    // 0. Detect in-app webview
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent || "";
      if (/FBAN|FBAV|Instagram|WhatsApp|Line|Messenger/i.test(ua)) {
        setInAppNotice(true);
        return;
      }
    }

    try {
      // 1. Audio unlock & resume for iOS Safari & Android Chrome (Crucial!)
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        if (audioCtx.state === "suspended") {
          await audioCtx.resume().catch(() => {});
        }
        await unlockAudioSystem(audioCtx, audioElementRef.current);
      }

      // Pre-warm & unlock SpeechSynthesis voices
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.resume();
          const prime = new SpeechSynthesisUtterance(" ");
          prime.volume = 0.01;
          prime.rate = 2.0;
          prime.lang = "id-ID";
          window.speechSynthesis.speak(prime);
          window.speechSynthesis.getVoices();
        } catch {}
      }

      // 2. Explicit microphone permission request via getUserMedia
      console.log("[VoiceMode] Requesting getUserMedia stream...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Setup Audio Analyser for visualizer
      if (audioContextRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.35;
        source.connect(analyser);
        analyserRef.current = analyser;
        runAudioVisualizerLoop();
      }

      // 4. Setup SpeechRecognition
      const recognition = setupSpeechRecognition();
      if (!recognition) {
        return;
      }
      recognitionRef.current = recognition;

      // 5. Start listening turn
      shouldListenRef.current = true;
      setVoiceState("listening");
      try {
        recognition.start();
        console.log("[VoiceMode] SpeechRecognition started successfully on initial session");
      } catch (err: any) {
        console.warn("[VoiceMode] Initial recognition.start warning:", err);
      }
    } catch (err: any) {
      console.error("[VoiceMode] Voice session initialization failed:", err);
      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.name === "SecurityError"
      ) {
        setPermissionNotice(
          "Izin mikrofon belum diberikan. Silakan izinkan akses mikrofon di Pengaturan Browser Anda untuk menggunakan Mode Suara."
        );
      } else {
        setErrorMessage("Tidak dapat mengakses mikrofon. Pastikan mikrofon terpasang dan aktif.");
      }
      setVoiceState("error");
    }
  }, [runAudioVisualizerLoop, setupSpeechRecognition]);

  // Toggle Mute / Unmute
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      console.log("[VoiceMode] Toggle mute:", next);

      // Disable/enable microphone track
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }

      if (next) {
        // Muting: stop recognition
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
        }
      } else {
        // Unmuting: restart recognition if listening
        if (voiceStateRef.current === "listening" && shouldListenRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {}
        }
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
        console.log("[VoiceMode] Page hidden/backgrounded, releasing mic");
        cleanupHardware();
        if (isOpen) {
          onClose();
        }
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", cleanupHardware);

    // Warm up speech synthesis voices on voice change
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        console.log("[VoiceMode] SpeechSynthesis voices loaded:", window.speechSynthesis.getVoices().length);
      };
    }

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
      {/* Hidden reusable audio player for iOS audio context bridge */}
      <audio
        ref={audioElementRef}
        playsInline
        preload="auto"
        className="hidden"
        aria-hidden="true"
      />

      {/* Top Header */}
      <div className="w-full flex items-center justify-between z-20 px-2 sm:px-4">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              voiceState === "speaking"
                ? "bg-emerald-400 animate-ping"
                : voiceState === "processing"
                ? "bg-amber-400 animate-pulse"
                : isMuted
                ? "bg-zinc-500"
                : "bg-emerald-500 animate-pulse"
            }`}
          />
          <span className="text-sm font-semibold tracking-wide text-white/95">Axioma Voice</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 font-medium">
            {agentName || "Axioma Pro"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleEndCall}
          aria-label="Tutup Mode Suara"
          title="Tutup Mode Suara"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white/80 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Interactive Glowing Orb */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-auto z-10 px-4">
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
        <div className="mt-8 text-center space-y-1.5 px-4 max-w-sm">
          <p className="text-xl sm:text-2xl font-semibold tracking-tight text-white/95">
            {voiceState === "speaking"
              ? "Axioma berbicara…"
              : voiceState === "processing"
              ? "Axioma berpikir…"
              : isMuted
              ? "Mikrofon dibisukan"
              : "Mendengarkan…"}
          </p>
          <p className="text-xs sm:text-sm text-white/60 font-normal">
            {voiceState === "speaking"
              ? "Bicara kapan saja untuk memotong"
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

        {/* Unsupported Browser Notice (Item 5) */}
        {unsupportedNotice && (
          <div className="mt-6 max-w-sm mx-4 p-4 rounded-2xl bg-amber-950/80 border border-amber-600/50 text-amber-200 text-xs space-y-2 text-center shadow-xl">
            <div className="flex items-center justify-center gap-1.5 font-semibold text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Browser Belum Mendukung</span>
            </div>
            <p>{unsupportedNotice}</p>
          </div>
        )}

        {/* In-App Browser Notice */}
        {inAppNotice && (
          <div className="mt-6 max-w-sm mx-4 p-4 rounded-2xl bg-amber-950/80 border border-amber-600/50 text-amber-200 text-xs space-y-2 text-center shadow-xl">
            <div className="flex items-center justify-center gap-1.5 font-semibold text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Buka di Browser Utama</span>
            </div>
            <p>
              Browser in-app memblokir mikrofon. Salin tautan dan buka di{" "}
              <strong>Safari</strong> (iOS) atau <strong>Chrome</strong> (Android).
            </p>
          </div>
        )}

        {/* Permission Denied Notice */}
        {permissionNotice && (
          <div className="mt-6 max-w-sm mx-4 p-4 rounded-2xl bg-red-950/80 border border-red-700/50 text-red-200 text-xs space-y-2 text-center shadow-xl">
            <div className="flex items-center justify-center gap-1.5 font-semibold text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Izin Mikrofon Ditolak</span>
            </div>
            <p>{permissionNotice}</p>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && !permissionNotice && (
          <div className="mt-6 max-w-sm mx-4 p-3 rounded-xl bg-red-900/50 border border-red-700 text-red-200 text-xs text-center shadow-lg">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Bottom Controls Bar (Item 4) */}
      <div className="w-full flex items-center justify-center gap-6 sm:gap-8 z-20 pb-2">
        {/* Chat / Keyboard Button: Closes voice mode and returns to text chat with session history */}
        <button
          type="button"
          onClick={handleEndCall}
          title="Kembali ke Percakapan Teks"
          aria-label="Kembali ke Percakapan Teks"
          className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white/80 hover:text-white cursor-pointer border border-white/20"
        >
          <MessageSquare className="w-6 h-6" />
        </button>

        {/* End Call Button (Prominent Red) */}
        <button
          type="button"
          onClick={handleEndCall}
          title="Akhiri Mode Suara"
          aria-label="Akhiri Mode Suara"
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
