"use client";

import React from "react";
import { Play, Pause, SkipForward, SkipBack, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReplayStatus } from "@/hooks/useReplayEngine";

interface ReplayControlsProps {
  status: ReplayStatus;
  progress: number;
  cursor: number;
  totalCandles: number;
  speed: number;
  speedOptions: number[];
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onSetSpeed: (s: number) => void;
  onSeek: (index: number) => void;
}

export function ReplayControls({
  status,
  progress,
  cursor,
  totalCandles,
  speed,
  speedOptions,
  onPlay,
  onPause,
  onStep,
  onStepBack,
  onReset,
  onSetSpeed,
  onSeek,
}: ReplayControlsProps) {
  const isPlaying = status === "playing";
  const canPlay = status === "ready" || status === "paused";
  const canStep = status !== "idle" && status !== "loading" && status !== "finished";

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1d26] border-t border-[#1f2937]">
      {/* Transport Controls */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onReset}
          disabled={status === "idle" || status === "loading"}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2b3139]"
          title="Quay lại đầu"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onStepBack}
          disabled={!canStep || cursor <= 0}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2b3139]"
          title="Lùi 1 nến"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={isPlaying ? onPause : onPlay}
          disabled={status === "idle" || status === "loading" || status === "finished"}
          className={`h-9 w-9 p-0 rounded-full ${
            isPlaying
              ? "bg-[#FCD535] text-black hover:bg-[#e5c22f]"
              : "bg-[#0ECB81] text-white hover:bg-[#0bb573]"
          }`}
          title={isPlaying ? "Tạm dừng" : "Phát"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onStep}
          disabled={!canStep}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#2b3139]"
          title="Tiến 1 nến"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="flex-1 mx-3">
        <input
          type="range"
          min={0}
          max={Math.max(totalCandles - 1, 0)}
          value={cursor}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          className="w-full h-1 accent-[#FCD535] cursor-pointer"
          disabled={status === "idle" || status === "loading"}
        />
      </div>

      {/* Progress Text */}
      <span className="text-xs text-gray-400 tabular-nums min-w-[70px] text-right">
        {cursor + 1} / {totalCandles}
      </span>

      {/* Speed Selector */}
      <div className="flex items-center gap-1 ml-2 border-l border-[#1f2937] pl-3">
        {speedOptions.map((s) => (
          <button
            key={s}
            onClick={() => onSetSpeed(s)}
            className={`px-2 py-1 text-[10px] rounded font-mono transition-colors ${
              speed === s
                ? "bg-[#FCD535] text-black font-bold"
                : "bg-[#2b3139] text-gray-400 hover:text-white"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Status Badge */}
      <div className="ml-2">
        {status === "finished" && (
          <span className="text-xs bg-[#0ECB81]/20 text-[#0ECB81] px-2 py-1 rounded font-medium">
            Hoàn thành
          </span>
        )}
        {status === "playing" && (
          <span className="text-xs bg-[#FCD535]/20 text-[#FCD535] px-2 py-1 rounded font-medium animate-pulse">
            Đang phát
          </span>
        )}
        {status === "loading" && (
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded font-medium animate-pulse">
            Đang tải...
          </span>
        )}
      </div>
    </div>
  );
}
