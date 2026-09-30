"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { KlineData } from "@/lib/api/market";

export type ReplayStatus = "idle" | "loading" | "ready" | "playing" | "paused" | "finished";

export interface ReplayEngineState {
  status: ReplayStatus;
  buffer: KlineData[];
  cursor: number;
  visibleCandles: KlineData[];
  currentPrice: number;
  speed: number;
  progress: number;
  totalCandles: number;
}

const SPEED_OPTIONS = [1, 2, 5, 10, 25, 50];

export function useReplayEngine() {
  const [status, setStatus] = useState<ReplayStatus>("idle");
  const [buffer, setBuffer] = useState<KlineData[]>([]);
  const [cursor, setCursor] = useState(0);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const visibleCandles = buffer.slice(0, cursor + 1);
  const currentPrice = cursor >= 0 && cursor < buffer.length ? buffer[cursor].close : 0;
  const progress = buffer.length > 0 ? ((cursor + 1) / buffer.length) * 100 : 0;
  const totalCandles = buffer.length;

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const load = useCallback((data: KlineData[]) => {
    stopInterval();
    setBuffer(data);
    // Start with first 10 candles visible so user sees some context
    const initialCursor = Math.min(9, data.length - 1);
    setCursor(initialCursor);
    setStatus("ready");
  }, [stopInterval]);

  const advanceCursor = useCallback(() => {
    setCursor(prev => {
      const next = prev + 1;
      if (next >= buffer.length) {
        stopInterval();
        setStatus("finished");
        return prev;
      }
      return next;
    });
  }, [buffer.length, stopInterval]);

  const play = useCallback(() => {
    if (buffer.length === 0) return;
    if (cursor >= buffer.length - 1) return; // Already at end

    stopInterval();
    setStatus("playing");

    // Base interval = 500ms at 1x speed
    const baseMs = 500;
    const ms = Math.max(baseMs / speed, 10);

    intervalRef.current = setInterval(() => {
      setCursor(prev => {
        const next = prev + 1;
        if (next >= buffer.length) {
          stopInterval();
          setStatus("finished");
          return prev;
        }
        return next;
      });
    }, ms);
  }, [buffer.length, cursor, speed, stopInterval]);

  // Re-create interval when speed changes during play
  useEffect(() => {
    if (status === "playing") {
      stopInterval();
      const baseMs = 500;
      const ms = Math.max(baseMs / speed, 10);
      intervalRef.current = setInterval(() => {
        setCursor(prev => {
          const next = prev + 1;
          if (next >= buffer.length) {
            stopInterval();
            setStatus("finished");
            return prev;
          }
          return next;
        });
      }, ms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  const pause = useCallback(() => {
    stopInterval();
    if (status === "playing") setStatus("paused");
  }, [stopInterval, status]);

  const step = useCallback(() => {
    if (cursor >= buffer.length - 1) {
      setStatus("finished");
      return;
    }
    stopInterval();
    setCursor(prev => prev + 1);
    if (status === "playing") setStatus("paused");
    else if (status === "ready" || status === "finished") setStatus("paused");
  }, [cursor, buffer.length, stopInterval, status]);

  const stepBack = useCallback(() => {
    if (cursor <= 0) return;
    stopInterval();
    setCursor(prev => prev - 1);
    if (status === "playing" || status === "finished") setStatus("paused");
  }, [cursor, stopInterval, status]);

  const reset = useCallback(() => {
    stopInterval();
    const initialCursor = Math.min(9, buffer.length - 1);
    setCursor(initialCursor);
    setStatus("ready");
  }, [stopInterval, buffer.length]);

  const seekTo = useCallback((index: number) => {
    stopInterval();
    setCursor(Math.max(0, Math.min(index, buffer.length - 1)));
    if (status === "playing") setStatus("paused");
  }, [stopInterval, buffer.length, status]);

  return {
    // State
    status,
    buffer,
    cursor,
    visibleCandles,
    currentPrice,
    speed,
    progress,
    totalCandles,
    // Actions
    load,
    play,
    pause,
    step,
    stepBack,
    reset,
    setSpeed,
    seekTo,
    SPEED_OPTIONS,
  };
}
