"use client";

import { useEffect, useRef, useState } from "react";

export interface UseSmoothStreamTextOptions {
  /** Full text accumulated from the network stream so far (`incomingTextRef`). */
  incomingText: string;
  /** True while the network stream (`reader.read()`) is still open/active. */
  isStreamingNetwork: boolean;
  /** True for AI replies generated live in this session; false for history loaded from DB/storage. */
  shouldAnimate: boolean;
  /** True if the user pressed Stop so animation halts immediately without draining buffered tail. */
  isStopped?: boolean;
  /** Optional throttled callback (~48ms) fired as characters advance to trigger conditional auto-scroll. */
  onProgressTick?: () => void;
}

export interface SmoothStreamTextResult {
  displayedText: string;
  isBufferDraining: boolean;
  isVisuallyStreaming: boolean;
}

/**
 * Decouples `incomingTextRef` (raw chunks arriving from SSE/network) from `displayedText`
 * (text progressively rendered to the screen) using an adaptive `requestAnimationFrame` loop:
 * - Small backlog (<= 14 chars): 1–2 chars per frame for natural token/character flow.
 * - Medium/large backlog: scales up proportionally so UI never lags far behind fast models.
 * - UTF-16 surrogate-pair safe so emojis and multibyte symbols never split mid-character.
 * - Cleans up cleanly on unmount or when the user presses Stop.
 */
export function useSmoothStreamText({
  incomingText,
  isStreamingNetwork,
  shouldAnimate,
  isStopped = false,
  onProgressTick,
}: UseSmoothStreamTextOptions): SmoothStreamTextResult {
  const prefersReducedMotionRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      prefersReducedMotionRef.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    }
  }, []);

  const incomingTextRef = useRef<string>(incomingText);
  incomingTextRef.current = incomingText;

  const isStreamingNetworkRef = useRef<boolean>(isStreamingNetwork);
  isStreamingNetworkRef.current = isStreamingNetwork;

  const isStoppedRef = useRef<boolean>(isStopped);
  isStoppedRef.current = isStopped;

  const onProgressTickRef = useRef<(() => void) | undefined>(onProgressTick);
  onProgressTickRef.current = onProgressTick;

  const initialDisplayed = shouldAnimate && !isStopped ? "" : incomingText;
  const [displayedText, setDisplayedText] = useState<string>(initialDisplayed);

  const displayedLenRef = useRef<number>(initialDisplayed.length);
  const carryCharsRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameMsRef = useRef<number>(0);
  const lastScrollTickMsRef = useRef<number>(0);

  // Stop rAF loop helper
  const stopRafLoop = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    lastFrameMsRef.current = 0;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRafLoop();
    };
  }, []);

  // Drive or synchronize displayedText whenever incomingText, shouldAnimate, or isStopped changes
  useEffect(() => {
    // 1. Non-animated messages (history) or user-stopped messages or reduced-motion: sync immediately
    if (!shouldAnimate || isStopped || prefersReducedMotionRef.current) {
      stopRafLoop();
      carryCharsRef.current = 0;
      displayedLenRef.current = incomingText.length;
      setDisplayedText((prev) => (prev === incomingText ? prev : incomingText));
      return;
    }

    // 2. If incomingText was shortened/replaced (e.g. fallback overwrite), clamp safely
    if (displayedLenRef.current > incomingText.length) {
      displayedLenRef.current = incomingText.length;
      carryCharsRef.current = 0;
      setDisplayedText(incomingText);
      return;
    }

    // 3. Nothing queued to reveal yet
    if (displayedLenRef.current >= incomingText.length) {
      return;
    }

    // 4. Already running rAF loop — `incomingTextRef.current` is already updated, so running loop will pick it up
    if (rafIdRef.current !== null) {
      return;
    }

    const tick = (timestamp: number) => {
      if (isStoppedRef.current) {
        rafIdRef.current = null;
        lastFrameMsRef.current = 0;
        return;
      }

      const fullText = incomingTextRef.current;
      const currentLen = displayedLenRef.current;

      if (currentLen >= fullText.length) {
        rafIdRef.current = null;
        lastFrameMsRef.current = 0;
        return;
      }

      const dtMs =
        lastFrameMsRef.current > 0
          ? Math.min(50, Math.max(8, timestamp - lastFrameMsRef.current))
          : 16.67;
      lastFrameMsRef.current = timestamp;
      const frameScale = dtMs / 16.67;

      const backlog = fullText.length - currentLen;

      // Adaptive catch-up speed (characters per 60Hz frame):
      // - Small queue: 1–2 chars/frame for smooth, organic reading rhythm
      // - Larger queue: scales up smoothly to prevent falling far behind fast streams
      let charsPer60HzFrame: number;
      if (backlog <= 14) {
        charsPer60HzFrame = 1.5;
      } else if (backlog <= 45) {
        charsPer60HzFrame = 2.6;
      } else if (backlog <= 120) {
        charsPer60HzFrame = Math.max(3.6, backlog * 0.085);
      } else {
        charsPer60HzFrame = Math.max(10, backlog * 0.14);
      }

      // Once network stream ends, ensure remaining tail drains smoothly within ~18–24 frames
      if (!isStreamingNetworkRef.current) {
        charsPer60HzFrame = Math.max(
          charsPer60HzFrame,
          Math.min(32, Math.max(1.8, backlog / 20))
        );
      }

      const totalAdvance = carryCharsRef.current + charsPer60HzFrame * frameScale;
      const wholeChars = Math.floor(totalAdvance);
      carryCharsRef.current = totalAdvance - wholeChars;

      if (wholeChars < 1) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      let nextLen = Math.min(fullText.length, currentLen + wholeChars);

      // UTF-16 surrogate pair safety: never slice between high (0xD800..0xDBFF) & low surrogate
      if (nextLen < fullText.length) {
        const lastCharCode = fullText.charCodeAt(nextLen - 1);
        if (lastCharCode >= 0xd800 && lastCharCode <= 0xdbff) {
          nextLen += 1;
        }
      }

      displayedLenRef.current = nextLen;
      setDisplayedText(fullText.slice(0, nextLen));

      if (
        timestamp - lastScrollTickMsRef.current >= 48 ||
        nextLen >= fullText.length
      ) {
        lastScrollTickMsRef.current = timestamp;
        onProgressTickRef.current?.();
      }

      if (nextLen < incomingTextRef.current.length) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        rafIdRef.current = null;
        lastFrameMsRef.current = 0;
      }
    };

    rafIdRef.current = requestAnimationFrame(tick);
  }, [incomingText, shouldAnimate, isStopped]);

  const isBufferDraining = Boolean(
    shouldAnimate && !isStopped && displayedText.length < incomingText.length
  );
  const isVisuallyStreaming = Boolean(
    !isStopped && (isStreamingNetwork || isBufferDraining)
  );

  return {
    displayedText,
    isBufferDraining,
    isVisuallyStreaming,
  };
}
