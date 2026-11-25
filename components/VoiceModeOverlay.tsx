"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Plus,
  Video,
  Mic,
  MicOff,
  X,
  Copy,
  Check,
  Share2,
  Volume2,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  Camera,
  RotateCw,
} from "lucide-react";
import { AttachmentItem, PendingAttachment } from "../lib/attachments";
import {
  SpeechQueue,
  calculateRms,
  preloadIndonesianVoice,
  unlockSpeechSynthesis,
} from "../lib/voice";

// 0.1s silent placeholder removed cleanly — global unlocked voiceAudioRef lives in ChatInterface

export interface VoiceTurnItem {
  id: string;
  sender: "user" | "ai";
  text: string;
  attachments?: AttachmentItem[];
  revealedWordCount: number;
  totalWords: number;
  isCompleted: boolean;
  rating?: "up" | "down" | null;
}

export interface VoiceModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  showTranscript: boolean;
  speechRate?: number;
  voiceName?: string;
  agentName?: string;
  voiceAudioRef: React.RefObject<HTMLAudioElement | null>;
  sharedAudioContextRef: React.MutableRefObject<AudioContext | null>;
  ttsAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  ttsMediaSourceConnectedRef: React.MutableRefObject<boolean>;
  pendingAttachments?: PendingAttachment[];
  onOpenImagePicker?: () => void;
  onOpenPdfPicker?: () => void;
  onOpenCameraPicker?: () => void;
  onCaptureFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  onSendMessage: (
    userText: string,
    voiceMode: boolean,
    signal?: AbortSignal
  ) => Promise<{
    aiReplyText: string;
    streamReader?: ReadableStreamDefaultReader<Uint8Array> | null;
    sentAttachments?: AttachmentItem[];
  }>;
  onTurnComplete?: (
    userText: string,
    aiText: string,
    sentAttachments?: AttachmentItem[]
  ) => void;
  onCopyText?: (text: string, id: string) => void;
  copiedId?: string | null;
  onToast?: (message: string) => void;
}

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

interface SpeechRecognitionResultAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionResultAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudiostart: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onnomatch: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function cleanSpokenDisplayText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/^[^\w\n]*Mengoptimalkan prompt visual[^\n]*\n*/gim, "")
    .replace(/^[^\w\n]*Sedang merender[^\n]*\n*/gim, "")
    .replace(/.*Gemini AI\.\.\..*\n*/gi, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/[*_#~>]/g, "")
    .replace(/^\s*[•\-]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function VoiceModeOverlay({
  isOpen,
  onClose,
  showTranscript,
  speechRate = 1.08,
  voiceName = "id-ID-ArdiNeural",
  voiceAudioRef,
  sharedAudioContextRef,
  ttsAnalyserRef,
  ttsMediaSourceConnectedRef,
  onSendMessage,
  onTurnComplete,
  pendingAttachments = [],
  onOpenImagePicker,
  onOpenPdfPicker,
  onOpenCameraPicker,
  onCaptureFiles,
  onRemoveAttachment,
  onCopyText,
  copiedId,
  onToast,
}: VoiceModeOverlayProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [voiceTurns, setVoiceTurns] = useState<VoiceTurnItem[]>([]);
  const [liveUserDraft, setLiveUserDraft] = useState<string>("");
  const [activeAiTurnId, setActiveAiTurnId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [unsupportedNotice, setUnsupportedNotice] = useState<string | null>(null);
  const [inAppNotice, setInAppNotice] = useState<boolean>(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState<boolean>(false);

  // Live Camera Preview State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);

  // DOM Refs for 60fps Audio-Reactive Liquid Aurora Glow without React re-renders
  const ambientGlowRef = useRef<HTMLDivElement | null>(null);
  const centerPillRef = useRef<HTMLButtonElement | null>(null);
  const indigoWaveRef = useRef<HTMLDivElement | null>(null);
  const blueWaveLeftRef = useRef<HTMLDivElement | null>(null);
  const blueWaveRightRef = useRef<HTMLDivElement | null>(null);
  const whiteCoreRef = useRef<HTMLDivElement | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const plusMenuContainerRef = useRef<HTMLDivElement | null>(null);

  // Audio & Recognition Refs
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const smoothedVolumeRef = useRef<number>(0);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechQueueRef = useRef<SpeechQueue | null>(null);
  const turnAbortControllerRef = useRef<AbortController | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTranscriptRef = useRef<string>("");
  const latestCapturedTranscriptRef = useRef<string>("");
  const shouldListenRef = useRef<boolean>(false);
  const isProcessingTurnRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const voiceStateRef = useRef<VoiceState>("idle");
  const speechRateRef = useRef<number>(speechRate);
  const voiceNameRef = useRef<string>(voiceName);
  const activeAiTurnIdRef = useRef<string | null>(null);

  // Stable callback/prop refs so session lifecycle never restarts mid-call on prop updates
  const onCloseRef = useRef(onClose);
  const onSendMessageRef = useRef(onSendMessage);
  const onTurnCompleteRef = useRef(onTurnComplete);
  const pendingAttachmentsRef = useRef(pendingAttachments);
  const handleSendTurnRef = useRef<(userText: string) => Promise<void>>(async () => {});
  const handleInterruptSpeechRef = useRef<() => void>(() => {});

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onSendMessageRef.current = onSendMessage;
  }, [onSendMessage]);

  useEffect(() => {
    onTurnCompleteRef.current = onTurnComplete;
  }, [onTurnComplete]);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    speechRateRef.current = speechRate;
    speechQueueRef.current?.setRate(speechRate);
  }, [speechRate]);

  useEffect(() => {
    voiceNameRef.current = voiceName;
  }, [voiceName]);

  useEffect(() => {
    activeAiTurnIdRef.current = activeAiTurnId;
  }, [activeAiTurnId]);

  // Close '+' popover on outside click
  useEffect(() => {
    if (!isPlusMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        plusMenuContainerRef.current &&
        !plusMenuContainerRef.current.contains(e.target as Node)
      ) {
        setIsPlusMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [isPlusMenuOpen]);

  // Auto-scroll transcript to bottom when turns/words/draft change
  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [voiceTurns, liveUserDraft, showTranscript]);

  // Stop live camera hardware tracks purely (safe inside effect cleanups without synchronous setState)
  const stopCameraHardwareTracks = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }, []);

  // Stop live camera stream & close viewfinder UI
  const stopCameraStream = useCallback(() => {
    stopCameraHardwareTracks();
    setIsCameraActive(false);
  }, [stopCameraHardwareTracks]);

  const clearSpeechTimers = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, []);

  const stopAllTtsPlayback = useCallback(() => {
    clearSpeechTimers();

    if (turnAbortControllerRef.current) {
      try {
        turnAbortControllerRef.current.abort();
      } catch {}
      turnAbortControllerRef.current = null;
    }

    if (speechQueueRef.current) {
      speechQueueRef.current.cancel();
      speechQueueRef.current = null;
    }

    const audioEl = voiceAudioRef.current;
    if (audioEl) {
      try {
        audioEl.ontimeupdate = null;
        audioEl.onended = null;
        audioEl.onerror = null;
        audioEl.pause();
        audioEl.currentTime = 0;
      } catch {}
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }, [clearSpeechTimers, voiceAudioRef]);

  // Full teardown on exit / unmount (preserves unlocked shared AudioContext & voiceAudioRef across sessions)
  const cleanupHardware = useCallback(() => {
    shouldListenRef.current = false;
    isProcessingTurnRef.current = false;
    isSpeakingRef.current = false;
    accumulatedTranscriptRef.current = "";
    latestCapturedTranscriptRef.current = "";

    stopAllTtsPlayback();
    stopCameraHardwareTracks();

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }

    analyserRef.current = null;
  }, [stopAllTtsPlayback, stopCameraHardwareTracks]);

  const handleEndCall = useCallback(() => {
    cleanupHardware();
    setVoiceState("idle");
    onCloseRef.current();
  }, [cleanupHardware]);

  const markTurnCompleted = useCallback((turnId: string | null) => {
    if (!turnId) return;
    setVoiceTurns((prev) =>
      prev.map((t) =>
        t.id === turnId
          ? {
              ...t,
              revealedWordCount: t.totalWords,
              isCompleted: true,
            }
          : t
      )
    );
  }, []);

  const resumeListening = useCallback(() => {
    if (!isOpen) return;
    clearSpeechTimers();
    isSpeakingRef.current = false;
    isProcessingTurnRef.current = false;
    shouldListenRef.current = true;
    accumulatedTranscriptRef.current = "";
    latestCapturedTranscriptRef.current = "";
    setLiveUserDraft("");

    if (activeAiTurnIdRef.current) {
      markTurnCompleted(activeAiTurnIdRef.current);
      setActiveAiTurnId(null);
    }

    setVoiceState("listening");

    if (recognitionRef.current && !isMutedRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (name !== "InvalidStateError") {
          setTimeout(() => {
            if (
              shouldListenRef.current &&
              !isMutedRef.current &&
              voiceStateRef.current === "listening" &&
              recognitionRef.current
            ) {
              try {
                recognitionRef.current.start();
              } catch {}
            }
          }, 250);
        }
      }
    }
  }, [isOpen, clearSpeechTimers, markTurnCompleted]);

  // Interrupt TTS / streaming AI & return immediately to listening state ("Ketuk untuk menyela" / barge-in)
  const handleInterruptSpeech = useCallback(() => {
    if (
      !isSpeakingRef.current &&
      !isProcessingTurnRef.current &&
      voiceStateRef.current !== "speaking" &&
      voiceStateRef.current !== "processing"
    ) {
      return;
    }
    isMutedRef.current = false;
    setIsMuted(false);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }
    stopAllTtsPlayback();
    resumeListening();
  }, [stopAllTtsPlayback, resumeListening]);

  useEffect(() => {
    handleInterruptSpeechRef.current = handleInterruptSpeech;
  }, [handleInterruptSpeech]);

  const ensureTtsAnalyserConnected = useCallback(() => {
    const audioEl = voiceAudioRef.current;
    const ctx = sharedAudioContextRef.current;
    if (!audioEl || !ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    if (ttsMediaSourceConnectedRef.current) return;
    try {
      const source = ctx.createMediaElementSource(audioEl);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.35;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ttsAnalyserRef.current = analyser;
      ttsMediaSourceConnectedRef.current = true;
    } catch {
      // Some mobile WebViews disallow MediaElementSource reuse; audio still plays directly
    }
  }, [voiceAudioRef, sharedAudioContextRef, ttsAnalyserRef, ttsMediaSourceConnectedRef]);

  // Shared SpeechQueue builder for both live SSE streaming and replay button
  const createQueueForTurn = useCallback(
    (turnId: string, getDisplayText: () => string): SpeechQueue => {
      let revealedSoFar = 1;
      return new SpeechQueue({
        lang: "id-ID",
        rate: speechRateRef.current || 1.08,
        pitch: 1.0,
        minSentenceLength: 15,
        callbacks: {
          onSpeechStart: () => {
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
            isSpeakingRef.current = true;
            setVoiceState("speaking");
            setActiveAiTurnId(turnId);
          },
          onSentenceStart: ({ sentence, spokenCharsBefore }) => {
            const text = getDisplayText();
            const words = text.split(/\s+/).filter(Boolean);
            if (!words.length || text.length === 0) return;
            const approxChars = spokenCharsBefore + Math.min(sentence.length, 24);
            const ratio = Math.min(1, approxChars / text.length);
            const nextCount = Math.min(
              words.length,
              Math.max(revealedSoFar, Math.ceil(ratio * words.length))
            );
            if (nextCount > revealedSoFar) {
              revealedSoFar = nextCount;
              setVoiceTurns((prev) =>
                prev.map((t) =>
                  t.id === turnId
                    ? { ...t, revealedWordCount: Math.max(t.revealedWordCount, nextCount) }
                    : t
                )
              );
            }
          },
          onBoundary: (globalCharIndex) => {
            const text = getDisplayText();
            const words = text.split(/\s+/).filter(Boolean);
            if (!words.length || text.length === 0) return;
            const ratio = Math.min(1, (globalCharIndex + 12) / text.length);
            const nextCount = Math.min(words.length, Math.max(1, Math.ceil(ratio * words.length)));
            if (nextCount > revealedSoFar) {
              revealedSoFar = nextCount;
              setVoiceTurns((prev) =>
                prev.map((t) =>
                  t.id === turnId
                    ? { ...t, revealedWordCount: Math.max(t.revealedWordCount, nextCount) }
                    : t
                )
              );
            }
          },
          onQueueEmpty: () => {
            speechQueueRef.current = null;
            isSpeakingRef.current = false;
            markTurnCompleted(turnId);
            setActiveAiTurnId(null);
            clearSpeechTimers();
            // 250ms tail buffer so device speaker echo finishes before reopening mic
            resumeTimeoutRef.current = setTimeout(() => {
              resumeListening();
            }, 250);
          },
        },
      });
    },
    [clearSpeechTimers, markTurnCompleted, resumeListening]
  );

  // Instant Replay Web Speech TTS (breaks at first sentence cleanly via SpeechQueue)
  const speakResponseForTurn = useCallback(
    (turnId: string, fullDisplayText: string) => {
      const cleanText = fullDisplayText.trim();
      if (!cleanText) {
        markTurnCompleted(turnId);
        resumeTimeoutRef.current = setTimeout(() => resumeListening(), 250);
        return;
      }

      stopAllTtsPlayback();
      unlockSpeechSynthesis();
      shouldListenRef.current = false;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      isSpeakingRef.current = true;
      setVoiceState("speaking");
      setActiveAiTurnId(turnId);
      setVoiceTurns((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, revealedWordCount: 1 } : t))
      );

      const queue = createQueueForTurn(turnId, () => cleanText);
      speechQueueRef.current = queue;
      queue.pushChunk(cleanText);
      queue.finish();
    },
    [stopAllTtsPlayback, markTurnCompleted, resumeListening, createQueueForTurn]
  );

  // Send completed user utterance & stream AI response + sentence-by-sentence TTS in real time
  const handleSendTurn = useCallback(
    async (userText: string) => {
      const cleanUserText = userText.trim();
      if (!cleanUserText || isProcessingTurnRef.current) return;
      isProcessingTurnRef.current = true;

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

      if (turnAbortControllerRef.current) {
        try {
          turnAbortControllerRef.current.abort();
        } catch {}
      }

      if (speechQueueRef.current) {
        speechQueueRef.current.cancel();
        speechQueueRef.current = null;
      }

      const abortController = new AbortController();
      turnAbortControllerRef.current = abortController;

      setLiveUserDraft("");
      setVoiceState("processing");

      const userTurnId = `v-user-${Date.now()}`;
      const readyLocalAttachments: AttachmentItem[] = pendingAttachmentsRef.current
        .filter((a) => a.status === "ready" && a.serverAttachment)
        .map((a) => a.serverAttachment as AttachmentItem);

      setVoiceTurns((prev) => [
        ...prev,
        {
          id: userTurnId,
          sender: "user",
          text: cleanUserText,
          attachments: readyLocalAttachments.length > 0 ? readyLocalAttachments : undefined,
          revealedWordCount: 1,
          totalWords: 1,
          isCompleted: true,
        },
      ]);

      const aiTurnId = `v-ai-${Date.now() + 1}`;
      let latestCleanReply = "";
      let turnAdded = false;

      const upsertAiTurn = (cleanText: string) => {
        if (!cleanText || abortController.signal.aborted) return;
        latestCleanReply = cleanText;
        const replyWords = cleanText.split(/\s+/).filter(Boolean);
        if (!turnAdded) {
          turnAdded = true;
          setVoiceTurns((prev) => [
            ...prev,
            {
              id: aiTurnId,
              sender: "ai",
              text: cleanText,
              revealedWordCount: 1,
              totalWords: replyWords.length,
              isCompleted: false,
              rating: null,
            },
          ]);
        } else {
          setVoiceTurns((prev) =>
            prev.map((t) =>
              t.id === aiTurnId
                ? { ...t, text: cleanText, totalWords: replyWords.length }
                : t
            )
          );
        }
      };

      const speechQueue = createQueueForTurn(aiTurnId, () => latestCleanReply);
      speechQueueRef.current = speechQueue;

      let fullAiText = "";

      const processSseEvent = (eventBlock: string) => {
        const line = eventBlock.split(/\r?\n/).find((l) => l.startsWith("data:"));
        if (!line) return;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) return;
        try {
          const payload = JSON.parse(jsonStr) as {
            type?: string;
            text?: unknown;
            data?: unknown;
          };
          if (payload.type === "chunk" && typeof payload.text === "string" && payload.text) {
            fullAiText += payload.text;
            const partialClean = cleanSpokenDisplayText(fullAiText);
            if (partialClean) {
              upsertAiTurn(partialClean);
            }
            speechQueue.pushChunk(payload.text);
          } else if (
            payload.type === "done" &&
            typeof payload.data === "string" &&
            !fullAiText
          ) {
            fullAiText = payload.data;
            const partialClean = cleanSpokenDisplayText(fullAiText);
            if (partialClean) {
              upsertAiTurn(partialClean);
            }
            speechQueue.pushChunk(payload.data);
          }
        } catch {}
      };

      try {
        const { aiReplyText, streamReader, sentAttachments } = await onSendMessageRef.current(
          cleanUserText,
          true,
          abortController.signal
        );

        if (abortController.signal.aborted) {
          speechQueue.cancel();
          return;
        }

        if (streamReader) {
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            if (abortController.signal.aborted) {
              try {
                await streamReader.cancel();
              } catch {}
              speechQueue.cancel();
              return;
            }

            const { value, done } = await streamReader.read();
            if (done) {
              const remainder = buffer + decoder.decode();
              if (remainder.trim()) {
                const events = remainder.split(/\r?\n\r?\n/);
                for (const event of events) {
                  processSseEvent(event);
                }
              }
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split(/\r?\n\r?\n/);
            buffer = events.pop() || "";

            for (const event of events) {
              processSseEvent(event);
            }
          }
        } else if (aiReplyText) {
          fullAiText = aiReplyText;
          const partialClean = cleanSpokenDisplayText(fullAiText);
          if (partialClean) {
            upsertAiTurn(partialClean);
          }
          speechQueue.pushChunk(aiReplyText);
        }

        if (abortController.signal.aborted) {
          speechQueue.cancel();
          return;
        }

        if (!fullAiText && aiReplyText) {
          fullAiText = aiReplyText;
          speechQueue.pushChunk(aiReplyText);
        }

        const cleanReply = cleanSpokenDisplayText(fullAiText);
        if (!cleanReply) {
          speechQueue.cancel();
          throw new Error("Respons suara kosong");
        }

        upsertAiTurn(cleanReply);

        if (onTurnCompleteRef.current) {
          onTurnCompleteRef.current(
            cleanUserText,
            cleanReply,
            sentAttachments || (readyLocalAttachments.length > 0 ? readyLocalAttachments : undefined)
          );
        }

        speechQueue.finish();
      } catch (err) {
        const isAborted =
          abortController.signal.aborted ||
          (err as { name?: string })?.name === "AbortError";
        speechQueue.cancel();
        if (isAborted) {
          return;
        }
        console.error("[VoiceMode] Error processing voice turn:", err);
        setErrorMessage("Gagal memproses respons suara. Mencoba mendengarkan kembali…");
        setTimeout(() => {
          setErrorMessage(null);
          resumeListening();
        }, 2000);
      } finally {
        if (turnAbortControllerRef.current === abortController) {
          turnAbortControllerRef.current = null;
        }
        isProcessingTurnRef.current = false;
      }
    },
    [createQueueForTurn, resumeListening]
  );

  useEffect(() => {
    handleSendTurnRef.current = handleSendTurn;
  }, [handleSendTurn]);

  // Setup Web Speech API SpeechRecognition (id-ID) with 750ms fast endpointing
  const setupSpeechRecognition = useCallback((): SpeechRecognitionInstance | null => {
    if (typeof window === "undefined") return null;

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setUnsupportedNotice(
        "Browser ini belum mendukung pengenalan suara langsung. Silakan gunakan Google Chrome atau Safari terbaru."
      );
      setVoiceState("error");
      return null;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "id-ID";
    recognition.maxAlternatives = 1;

    recognition.onaudiostart = null;
    recognition.onsoundstart = null;
    recognition.onspeechend = null;
    recognition.onnomatch = null;

    recognition.onspeechstart = () => {
      if (isSpeakingRef.current) {
        handleInterruptSpeechRef.current();
      }
    };

    recognition.onerror = (event) => {
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setPermissionNotice(
          "Izin mikrofon belum diberikan atau diblokir. Silakan izinkan akses mikrofon di Pengaturan Browser."
        );
        setVoiceState("error");
      }
    };

    recognition.onend = () => {
      if (
        shouldListenRef.current &&
        !isMutedRef.current &&
        voiceStateRef.current === "listening"
      ) {
        try {
          recognition.start();
        } catch (err) {
          const name = (err as { name?: string })?.name;
          if (name !== "InvalidStateError") {
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
            }, 250);
          }
        }
      }
    };

    recognition.onresult = (event) => {
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

      const currentLiveText = (
        accumulatedTranscriptRef.current +
        " " +
        interimTranscript.trim()
      ).trim();

      if (currentLiveText) {
        latestCapturedTranscriptRef.current = currentLiveText;
        setLiveUserDraft(currentLiveText);

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        // Fast endpointing: auto-stop recognition and send immediately after 750ms silence
        silenceTimerRef.current = setTimeout(() => {
          const textToSend = (
            latestCapturedTranscriptRef.current || accumulatedTranscriptRef.current
          ).trim();
          if (textToSend && voiceStateRef.current === "listening") {
            shouldListenRef.current = false;
            accumulatedTranscriptRef.current = "";
            latestCapturedTranscriptRef.current = "";
            try {
              recognition.stop();
            } catch {}
            void handleSendTurnRef.current(textToSend);
          }
        }, 750);
      }
    };

    return recognition;
  }, []);

  // 60fps Liquid Aurora Animator via direct DOM transforms (zero React re-renders)
  const runAudioVisualizerLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const timeData = new Uint8Array(analyser.fftSize);
    const freqData = new Uint8Array(analyser.frequencyBinCount);

    const updateFrame = () => {
      if (!analyserRef.current) return;

      const t = performance.now() * 0.001;
      let targetAmp = 0.08;
      let bassShift = 0;

      if (voiceStateRef.current === "speaking") {
        // Sample real Neural TTS <audio> amplitude when routed through ttsAnalyserRef
        const ttsAnalyser = ttsAnalyserRef.current;
        const audioEl = voiceAudioRef.current;
        let liveAudioRms = 0;
        let liveBassDiff = 0;
        if (ttsAnalyser && audioEl && !audioEl.paused) {
          liveAudioRms = calculateRms(ttsAnalyser, timeData);
          ttsAnalyser.getByteFrequencyData(freqData);
          const ttsBass =
            freqData.length >= 6
              ? (freqData[1] + freqData[2] + freqData[3] + freqData[4]) / (4 * 255)
              : 0;
          const ttsMid =
            freqData.length >= 16
              ? (freqData[6] + freqData[8] + freqData[10] + freqData[12]) / (4 * 255)
              : 0;
          liveBassDiff = (ttsMid - ttsBass) * 32;
        }

        if (liveAudioRms > 0.004) {
          targetAmp = Math.min(1, Math.max(0.18, liveAudioRms * 5.2));
          bassShift = liveBassDiff + Math.sin(t * 2.7) * 6;
        } else {
          // Smooth multi-harmonic speaking cadence (also covers Web Speech API fallback)
          const syllableWave = (Math.sin(t * 7.2) + 1) * 0.5;
          const phraseWave = (Math.sin(t * 2.4 + 0.9) + 1) * 0.5;
          targetAmp = 0.34 + syllableWave * 0.42 + phraseWave * 0.18;
          bassShift = Math.sin(t * 3.1) * 14;
        }
      } else if (voiceStateRef.current === "processing") {
        targetAmp = 0.22 + ((Math.sin(t * 4) + 1) * 0.5) * 0.14;
        bassShift = Math.sin(t * 2) * 8;
      } else if (!isMutedRef.current) {
        const rms = calculateRms(analyserRef.current, timeData);
        analyserRef.current.getByteFrequencyData(freqData);
        const bassAvg =
          freqData.length >= 6
            ? (freqData[1] + freqData[2] + freqData[3] + freqData[4]) / (4 * 255)
            : 0;
        const midAvg =
          freqData.length >= 16
            ? (freqData[6] + freqData[8] + freqData[10] + freqData[12]) / (4 * 255)
            : 0;
        targetAmp = Math.min(1, Math.max(0.08, rms * 5.0 + bassAvg * 0.35));
        bassShift = (midAvg - bassAvg) * 28 + Math.sin(t * 1.8) * 5;
      } else {
        targetAmp = 0.04;
        bassShift = 0;
      }

      // Smooth asymmetric envelope (snappy attack, fluid decay)
      const prev = smoothedVolumeRef.current;
      const coeff = targetAmp > prev ? 0.34 : 0.15;
      const amp = prev + (targetAmp - prev) * coeff;
      smoothedVolumeRef.current = amp;

      const driftA = Math.sin(t * 1.9) * (6 + amp * 10) + bassShift;
      const driftB = Math.cos(t * 2.3) * (6 + amp * 9) - bassShift * 0.7;

      if (indigoWaveRef.current) {
        indigoWaveRef.current.style.transform = `translate3d(${driftA * 0.4}px, 0, 0) scale(${1 + amp * 0.45}, ${0.7 + amp * 0.95})`;
        indigoWaveRef.current.style.opacity = `${isMutedRef.current ? 0.25 : 0.65 + amp * 0.35}`;
      }
      if (blueWaveLeftRef.current) {
        blueWaveLeftRef.current.style.transform = `translate3d(${-10 + driftA}px, ${4 - amp * 10}px, 0) scale(${0.95 + amp * 0.35}, ${0.75 + amp * 0.95})`;
        blueWaveLeftRef.current.style.opacity = `${isMutedRef.current ? 0.25 : 0.78 + amp * 0.22}`;
      }
      if (blueWaveRightRef.current) {
        blueWaveRightRef.current.style.transform = `translate3d(${10 + driftB}px, ${4 - amp * 9}px, 0) scale(${0.92 + amp * 0.4}, ${0.72 + amp * 0.9})`;
        blueWaveRightRef.current.style.opacity = `${isMutedRef.current ? 0.25 : 0.75 + amp * 0.25}`;
      }
      if (whiteCoreRef.current) {
        whiteCoreRef.current.style.transform = `translate3d(${driftA * 0.25}px, ${2 - amp * 5}px, 0) scale(${0.88 + amp * 0.45}, ${0.7 + amp * 0.85})`;
        whiteCoreRef.current.style.opacity = `${isMutedRef.current ? 0.2 : 0.8 + amp * 0.2}`;
      }
      if (centerPillRef.current) {
        const glowBlur = Math.round(32 + amp * 28);
        const glowAlpha = (isMutedRef.current ? 0.14 : 0.28 + amp * 0.38).toFixed(2);
        centerPillRef.current.style.boxShadow = `0 0 ${glowBlur}px rgba(37, 99, 235, ${glowAlpha})`;
      }
      if (ambientGlowRef.current) {
        ambientGlowRef.current.style.opacity = `${isMutedRef.current ? 0.4 : Math.min(1, 0.75 + amp * 0.35)}`;
      }

      animationFrameRef.current = requestAnimationFrame(updateFrame);
    };

    animationFrameRef.current = requestAnimationFrame(updateFrame);
  }, [ttsAnalyserRef, voiceAudioRef]);

  const initializeVoiceSession = useCallback(async () => {
    setErrorMessage(null);
    setPermissionNotice(null);
    setUnsupportedNotice(null);
    setInAppNotice(false);

    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent || "";
      if (/FBAN|FBAV|Instagram|WhatsApp|Line|Messenger/i.test(ua)) {
        setInAppNotice(true);
        return;
      }
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        if (!sharedAudioContextRef.current || sharedAudioContextRef.current.state === "closed") {
          sharedAudioContextRef.current = new AudioCtx();
        }
        if (sharedAudioContextRef.current.state === "suspended") {
          await sharedAudioContextRef.current.resume().catch(() => {});
        }
      }

      ensureTtsAnalyserConnected();

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.resume();
          preloadIndonesianVoice();
        } catch {}
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      if (sharedAudioContextRef.current) {
        const source = sharedAudioContextRef.current.createMediaStreamSource(stream);
        const analyser = sharedAudioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.35;
        source.connect(analyser);
        analyserRef.current = analyser;
        runAudioVisualizerLoop();
      }

      const recognition = setupSpeechRecognition();
      if (!recognition) return;
      recognitionRef.current = recognition;

      shouldListenRef.current = true;
      setVoiceState("listening");
      try {
        recognition.start();
      } catch {}
    } catch (err) {
      const errName = (err as { name?: string })?.name;
      if (
        errName === "NotAllowedError" ||
        errName === "PermissionDeniedError" ||
        errName === "SecurityError"
      ) {
        setPermissionNotice(
          "Izin mikrofon belum diberikan. Silakan izinkan akses mikrofon di Pengaturan Browser Anda untuk menggunakan Mode Suara."
        );
      } else {
        setErrorMessage("Tidak dapat mengakses mikrofon. Pastikan mikrofon terpasang dan aktif.");
      }
      setVoiceState("error");
    }
  }, [runAudioVisualizerLoop, setupSpeechRecognition, sharedAudioContextRef, ensureTtsAnalyserConnected]);

  const handleToggleMute = useCallback(() => {
    // Barge-in: pressing microphone button while AI is speaking/thinking stops TTS queue & resumes listening
    if (
      isSpeakingRef.current ||
      isProcessingTurnRef.current ||
      voiceStateRef.current === "speaking" ||
      voiceStateRef.current === "processing"
    ) {
      unlockSpeechSynthesis();
      handleInterruptSpeech();
      return;
    }

    setIsMuted((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }

      if (next) {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
        }
      } else {
        unlockSpeechSynthesis();
        if (
          voiceStateRef.current === "listening" &&
          shouldListenRef.current &&
          recognitionRef.current
        ) {
          try {
            recognitionRef.current.start();
          } catch {}
        }
      }
      return next;
    });
  }, [handleInterruptSpeech]);

  // Toggle inline live camera preview
  const startCameraPreview = useCallback(
    async (facing: "environment" | "user") => {
      try {
        stopCameraStream();
        if (!navigator.mediaDevices?.getUserMedia) {
          onOpenCameraPicker?.();
          return;
        }
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        cameraStreamRef.current = videoStream;
        setIsCameraActive(true);
        requestAnimationFrame(() => {
          if (cameraVideoRef.current) {
            cameraVideoRef.current.srcObject = videoStream;
          }
        });
      } catch {
        stopCameraStream();
        onOpenCameraPicker?.();
      }
    },
    [onOpenCameraPicker, stopCameraStream]
  );

  const handleToggleCamera = useCallback(() => {
    if (isCameraActive) {
      stopCameraStream();
    } else {
      void startCameraPreview(cameraFacingMode);
    }
  }, [isCameraActive, stopCameraStream, startCameraPreview, cameraFacingMode]);

  const handleCaptureCameraFrame = useCallback(() => {
    const videoEl = cameraVideoRef.current;
    if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `axioma-kamera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCaptureFiles?.([capturedFile]);
        stopCameraStream();
        onToast?.("Foto kamera dilampirkan. Bicara sekarang untuk bertanya!");
      },
      "image/jpeg",
      0.9
    );
  }, [onCaptureFiles, stopCameraStream, onToast]);

  const handleTurnShare = useCallback(
    async (text: string) => {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({ text });
          return;
        } catch {}
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(text);
          onToast?.("Teks disalin untuk dibagikan!");
        } catch {}
      }
    },
    [onToast]
  );

  const handleTurnRating = useCallback((turnId: string, dir: "up" | "down") => {
    setVoiceTurns((prev) =>
      prev.map((t) =>
        t.id === turnId
          ? { ...t, rating: t.rating === dir ? null : dir }
          : t
      )
    );
  }, []);

  // Session lifecycle
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
      if (document.hidden && isOpen) {
        cleanupHardware();
        onCloseRef.current();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", cleanupHardware);

    if (typeof window !== "undefined" && window.speechSynthesis) {
      preloadIndonesianVoice();
    }

    return () => {
      if (initTimer) clearTimeout(initTimer);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", cleanupHardware);
      cleanupHardware();
    };
  }, [isOpen, initializeVoiceSession, cleanupHardware]);

  if (!isOpen) return null;

  const isSpeaking = voiceState === "speaking";

  return (
    <div
      aria-label="Mode Suara Langsung Axioma"
      className="flex-1 flex flex-col min-h-0 overflow-hidden relative select-none animate-fade-in bg-transparent"
    >
      {/* Ambient Blue-Indigo Glow at bottom of screen */}
      <div
        ref={ambientGlowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[340px] bg-[radial-gradient(75%_65%_at_50%_100%,rgba(29,78,216,0.28)_0%,rgba(30,58,138,0.10)_50%,transparent_100%)] transition-opacity duration-500 z-0"
      />

      {/* Middle / Upper Live Transcript & Camera Area */}
      <div className="flex-1 min-h-0 w-full relative overflow-hidden z-10 flex flex-col">
        {/* Inline Live Camera Preview when Video button is active */}
        {isCameraActive && (
          <div className="shrink-0 px-4 pt-3 pb-1 z-20 animate-fade-up">
            <div className="max-w-[360px] w-full mx-auto rounded-3xl overflow-hidden bg-[#0c0d10] border border-white/[0.1] shadow-2xl relative">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[4/3] object-cover bg-black"
              />
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextFacing =
                      cameraFacingMode === "environment" ? "user" : "environment";
                    setCameraFacingMode(nextFacing);
                    void startCameraPreview(nextFacing);
                  }}
                  title="Balik kamera"
                  aria-label="Balik kamera"
                  className="w-9 h-9 rounded-full bg-black/75 hover:bg-black/90 text-white flex items-center justify-center border border-white/10 transition active:scale-95 cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={stopCameraStream}
                  title="Tutup kamera"
                  aria-label="Tutup kamera"
                  className="w-9 h-9 rounded-full bg-black/75 hover:bg-black/90 text-white flex items-center justify-center border border-white/10 transition active:scale-95 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute inset-x-0 bottom-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleCaptureCameraFrame}
                  className="px-4 py-2 rounded-full bg-white text-black text-[13px] font-medium shadow-lg hover:bg-zinc-200 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Ambil Foto</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transcript Stream with Smooth Top Fade-Out Mask */}
        {showTranscript && (
          <div
            ref={transcriptScrollRef}
            className="flex-1 min-h-0 overflow-y-auto touch-auto px-4 md:px-6 pt-24 sm:pt-28 pb-24 scrollbar-none"
            style={{
              maskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 100%)",
            }}
          >
            <div className="max-w-[680px] md:max-w-[720px] mx-auto w-full flex flex-col gap-6">
              {voiceTurns.map((turn) => {
                if (turn.sender === "user") {
                  return (
                    <div
                      key={turn.id}
                      className="w-full flex flex-col items-end gap-2 animate-user-bubble"
                    >
                      {turn.attachments && turn.attachments.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-2 max-w-[82%]">
                          {turn.attachments.map((att) =>
                            att.mime_type.startsWith("image/") && att.signed_url ? (
                              <img
                                key={att.id}
                                src={att.signed_url}
                                alt={att.original_name}
                                className="h-24 w-auto rounded-2xl object-cover border border-white/10 shadow-md"
                              />
                            ) : (
                              <div
                                key={att.id}
                                className="px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-700 dark:bg-[#18181b] dark:border-white/[0.08] dark:text-zinc-300 flex items-center gap-1.5"
                              >
                                <FileText className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                                <span className="truncate max-w-[160px]">{att.original_name}</span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                      <div className="max-w-[84%] sm:max-w-[72%] rounded-[22px] bg-zinc-100 border border-zinc-200/80 text-zinc-900 dark:bg-[#1e1f22] dark:border-white/[0.06] dark:text-zinc-100 px-4 py-2.5 text-[15.5px] leading-relaxed shadow-sm">
                        {turn.text}
                      </div>
                    </div>
                  );
                }

                const words = turn.text.split(/\s+/).filter(Boolean);
                const visibleWords = turn.isCompleted
                  ? words
                  : words.slice(0, Math.max(1, turn.revealedWordCount));
                const showActions = turn.isCompleted && activeAiTurnId !== turn.id;

                return (
                  <div key={turn.id} className="w-full flex flex-col items-start">
                    <div className="text-zinc-900 dark:text-zinc-100 text-[18px] sm:text-[20px] font-medium leading-[1.45] tracking-[-0.01em] break-words">
                      {visibleWords.map((word, idx) => (
                        <React.Fragment key={`${turn.id}-w-${idx}`}>
                          <span
                            className={
                              turn.isCompleted ? "text-zinc-900 dark:text-zinc-100" : "animate-voice-word"
                            }
                          >
                            {word}
                          </span>
                          {idx < visibleWords.length - 1 ? " " : ""}
                        </React.Fragment>
                      ))}
                    </div>

                    {showActions && (
                      <div className="w-full mt-3.5 animate-fade-in">
                        <div className="flex items-center gap-1.5 -ml-2 text-zinc-500 dark:text-zinc-400">
                          <button
                            type="button"
                            onClick={() => onCopyText?.(turn.text, turn.id)}
                            title={copiedId === turn.id ? "Tersalin" : "Salin"}
                            aria-label="Salin teks"
                            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition cursor-pointer"
                          >
                            {copiedId === turn.id ? (
                              <Check className="w-[17px] h-[17px] text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-[17px] h-[17px]" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleTurnShare(turn.text)}
                            title="Bagikan"
                            aria-label="Bagikan respons"
                            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition cursor-pointer"
                          >
                            <Share2 className="w-[17px] h-[17px]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isSpeakingRef.current) {
                                handleInterruptSpeech();
                              } else {
                                speakResponseForTurn(turn.id, turn.text);
                              }
                            }}
                            title="Putar ulang suara"
                            aria-label="Putar ulang suara"
                            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition cursor-pointer"
                          >
                            <Volume2 className="w-[17px] h-[17px]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTurnRating(turn.id, "up")}
                            title="Suka"
                            aria-label="Suka"
                            aria-pressed={turn.rating === "up"}
                            className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition cursor-pointer ${
                              turn.rating === "up"
                                ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50"
                                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <ThumbsUp className="w-[17px] h-[17px]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTurnRating(turn.id, "down")}
                            title="Tidak suka"
                            aria-label="Tidak suka"
                            aria-pressed={turn.rating === "down"}
                            className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition cursor-pointer ${
                              turn.rating === "down"
                                ? "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/50"
                                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <ThumbsDown className="w-[17px] h-[17px]" />
                          </button>
                        </div>

                        <p className="mt-2 text-[12px] text-zinc-600 dark:text-zinc-400">
                          Axioma dapat membuat kesalahan.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Live user interim speech preview while speaking */}
              {liveUserDraft && (
                <div className="w-full flex justify-end animate-fade-in">
                  <div className="max-w-[82%] rounded-[22px] bg-zinc-100/90 border border-zinc-200/80 text-zinc-700 dark:bg-[#1e1f22]/70 dark:border-white/[0.05] dark:text-zinc-300 px-4 py-2 text-[15px]">
                    {liveUserDraft}
                  </div>
                </div>
              )}

              {/* Subtle processing indicator right before AI speech starts */}
              {voiceState === "processing" && (
                <div className="flex items-center gap-1.5 py-2 animate-fade-in" aria-label="Memproses jawaban">
                  <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 animate-bounce" />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 ml-1.5">Axioma sedang berpikir...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voice Notices (Unsupported / In-App / Permission Denied / Error) */}
        {(unsupportedNotice || inAppNotice || permissionNotice || errorMessage) && (
          <div className="px-4 pb-3 flex justify-center z-20 shrink-0">
            {unsupportedNotice && (
              <div className="max-w-sm w-full p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/85 dark:border-amber-600/40 dark:text-amber-200 text-xs space-y-1 text-center shadow-xl">
                <div className="flex items-center justify-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Browser Belum Mendukung</span>
                </div>
                <p>{unsupportedNotice}</p>
              </div>
            )}

            {inAppNotice && (
              <div className="max-w-sm w-full p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/85 dark:border-amber-600/40 dark:text-amber-200 text-xs space-y-1 text-center shadow-xl">
                <div className="flex items-center justify-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Buka di Browser Utama</span>
                </div>
                <p>
                  Browser in-app memblokir mikrofon. Buka di <strong>Safari</strong> (iOS) atau{" "}
                  <strong>Chrome</strong> (Android).
                </p>
              </div>
            )}

            {permissionNotice && (
              <div className="max-w-sm w-full p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 dark:bg-red-950/85 dark:border-red-700/40 dark:text-red-200 text-xs space-y-1 text-center shadow-xl">
                <div className="flex items-center justify-center gap-1.5 font-semibold text-red-800 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Izin Mikrofon Ditolak</span>
                </div>
                <p>{permissionNotice}</p>
              </div>
            )}

            {errorMessage && !permissionNotice && !unsupportedNotice && !inAppNotice && (
              <div className="max-w-sm px-4 py-2 rounded-full bg-red-50 border border-red-200 text-red-900 dark:bg-red-950/80 dark:border-red-700/40 dark:text-red-200 text-xs text-center shadow-lg">
                {errorMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Live Voice Control Bar (5 Elements Aligned + Tap-to-Interrupt Pill) */}
      <div className="shrink-0 w-full px-5 pb-[calc(var(--safe-bottom)+16px)] pt-2 z-30 flex flex-col items-center relative animate-voice-morph">
        {/* Pending attachment chips if attached inside Voice Mode */}
        {pendingAttachments.length > 0 && (
          <div className="max-w-[380px] w-full flex items-center gap-2 mb-3 overflow-x-auto scrollbar-none px-1">
            {pendingAttachments.map((att) => (
              <div
                key={att.id}
                className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-800 dark:bg-[#18181b] dark:border-white/[0.08] dark:text-zinc-200"
              >
                {att.type === "image" && att.previewUrl ? (
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    className="w-6 h-6 rounded-md object-cover"
                  />
                ) : (
                  <FileText className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                )}
                <span className="truncate max-w-[100px]">{att.name}</span>
                {att.status === "uploading" || att.status === "compressing" ? (
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{att.progress}%</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemoveAttachment?.(att.id)}
                  aria-label="Hapus lampiran"
                  className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="w-full max-w-[380px] relative flex flex-col items-center">
          {/* Dynamic Monochrome Voice Wave Visualizer (5 organic bars when listening or speaking) */}
          {((voiceState === "listening" && !isMuted) || isSpeaking) && (
            <div
              aria-hidden="true"
              className="mb-3.5 flex items-center justify-center gap-1 h-5 animate-fade-in"
            >
              {[
                { delay: "0ms", duration: "0.95s", height: "12px" },
                { delay: "140ms", duration: "0.78s", height: "18px" },
                { delay: "60ms", duration: "0.86s", height: "20px" },
                { delay: "220ms", duration: "0.74s", height: "16px" },
                { delay: "110ms", duration: "0.92s", height: "11px" },
              ].map((bar, idx) => (
                <span
                  key={idx}
                  className="w-[3px] rounded-full bg-zinc-800 dark:bg-zinc-200 animate-voice-bar"
                  style={{
                    height: bar.height,
                    animationDelay: bar.delay,
                    animationDuration: bar.duration,
                  }}
                />
              ))}
            </div>
          )}

          {/* "Ketuk untuk menyela" Capsule — ONLY visible when Axioma is speaking */}
          {isSpeaking && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 flex justify-center pointer-events-none z-40">
              <button
                type="button"
                onClick={handleInterruptSpeech}
                className="pointer-events-auto mb-3 px-4 py-1.5 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200/80 text-[13px] font-medium text-zinc-800 dark:bg-[#1c1c1f] dark:hover:bg-[#27282c] dark:border-white/[0.08] dark:text-zinc-200 shadow-lg animate-fade-up active:scale-[0.96] transition-all duration-200 whitespace-nowrap cursor-pointer"
              >
                Ketuk untuk menyela
              </button>
            </div>
          )}

          {/* Row of 5 Controls Aligned Identical to Reference */}
          <div className="w-full max-w-[380px] flex items-center justify-between gap-2">
            {/* 1. Tombol '+' (Kiri Luar) — Attachment Menu */}
            <div className="relative" ref={plusMenuContainerRef}>
              <button
                type="button"
                onClick={() => setIsPlusMenuOpen((prev) => !prev)}
                aria-label="Lampirkan foto atau file"
                title="Lampirkan foto atau file"
                className="w-12 h-12 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 dark:bg-[#18181b] dark:hover:bg-[#222327] dark:border-white/[0.06] dark:text-zinc-200 flex items-center justify-center active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </button>

              {isPlusMenuOpen && (
                <div
                  role="menu"
                  aria-label="Lampiran Mode Suara"
                  className="absolute left-0 bottom-full mb-3 w-52 rounded-2xl bg-white border border-zinc-200 dark:bg-[#1e1f20] dark:border-white/[0.08] p-1.5 shadow-2xl space-y-1 z-50 animate-fade-up"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsPlusMenuOpen(false);
                      onOpenImagePicker?.();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-300 shrink-0" />
                    <span>Foto &amp; Gambar</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsPlusMenuOpen(false);
                      onOpenPdfPicker?.();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-zinc-600 dark:text-zinc-300 shrink-0" />
                    <span>Dokumen PDF</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsPlusMenuOpen(false);
                      onOpenCameraPicker?.();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-zinc-600 dark:text-zinc-300 shrink-0" />
                    <span>Ambil Foto</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Tombol Kamera/Video (Kiri Dalam) */}
            <button
              type="button"
              onClick={handleToggleCamera}
              aria-label={isCameraActive ? "Tutup kamera" : "Aktifkan kamera langsung"}
              title={isCameraActive ? "Tutup kamera" : "Kamera langsung"}
              className={`w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition cursor-pointer border ${
                isCameraActive
                  ? "bg-zinc-950 border-zinc-950 text-white dark:bg-white dark:border-white dark:text-zinc-950"
                  : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700 dark:bg-[#18181b] dark:hover:bg-[#222327] dark:border-white/[0.06] dark:text-zinc-200"
              }`}
            >
              <Video className="w-5 h-5" />
            </button>

            {/* 3. Kapsul Visualizer Suara Tengah (Center Pill Liquid Aurora Glow) */}
            <button
              ref={centerPillRef}
              type="button"
              onClick={() => {
                if (
                  isSpeakingRef.current ||
                  isProcessingTurnRef.current ||
                  voiceState === "speaking" ||
                  voiceState === "processing"
                ) {
                  unlockSpeechSynthesis();
                  handleInterruptSpeech();
                } else if (voiceState === "error") {
                  void initializeVoiceSession();
                }
              }}
              aria-label={
                isSpeaking
                  ? "Ketuk untuk menyela Axioma"
                  : isMuted
                  ? "Mikrofon dibisukan"
                  : "Visualizer suara aktif"
              }
              title={isSpeaking ? "Ketuk untuk menyela" : "Axioma mendengarkan"}
              className="w-[116px] h-[54px] rounded-full bg-[#0a0a0e] border border-white/[0.07] relative overflow-hidden flex items-end justify-center shadow-[0_0_40px_rgba(37,99,235,0.35)] cursor-pointer active:scale-[0.97] transition-transform"
            >
              {/* Layer 1: Outer Indigo Aura */}
              <div
                ref={indigoWaveRef}
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-3 inset-x-0 mx-auto w-[108px] h-[34px] rounded-full will-change-transform"
                style={{
                  background: "rgba(79, 70, 229, 0.4)",
                  filter: "blur(8px)",
                }}
              />

              {/* Layer 2A & 2B: Dual Flowing Electric Blue Liquid Blobs */}
              <div
                ref={blueWaveLeftRef}
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-2 left-[14%] w-[64px] h-[28px] rounded-full will-change-transform"
                style={{
                  background: "rgba(59, 130, 246, 0.85)",
                  filter: "blur(8px)",
                }}
              />
              <div
                ref={blueWaveRightRef}
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-2 right-[14%] w-[60px] h-[26px] rounded-full will-change-transform"
                style={{
                  background: "rgba(59, 130, 246, 0.85)",
                  filter: "blur(8px)",
                }}
              />

              {/* Layer 3: Bright White Bottom Core */}
              <div
                ref={whiteCoreRef}
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-2.5 inset-x-0 mx-auto w-[56px] h-[18px] rounded-full will-change-transform"
                style={{
                  background: "rgba(255, 255, 255, 0.95)",
                  filter: "blur(8px)",
                }}
              />
            </button>

            {/* 4. Tombol Mikrofon Mute/Unmute (Kanan Dalam) */}
            <button
              type="button"
              onClick={handleToggleMute}
              title={isMuted ? "Aktifkan mikrofon" : "Bisukan mikrofon"}
              aria-label={isMuted ? "Aktifkan mikrofon" : "Bisukan mikrofon"}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                isMuted
                  ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/30"
                  : "bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 dark:bg-[#18181b] dark:hover:bg-[#222327] dark:text-zinc-200 dark:border-white/[0.06]"
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* 5. Tombol X Tutup Mode Suara (Kanan Luar) */}
            <button
              type="button"
              onClick={handleEndCall}
              title="Tutup Mode Suara"
              aria-label="Tutup Mode Suara"
              className="w-12 h-12 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 dark:bg-[#18181b] dark:hover:bg-[#222327] dark:border-white/[0.06] dark:text-zinc-200 flex items-center justify-center active:scale-95 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
