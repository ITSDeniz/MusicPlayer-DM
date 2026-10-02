import React, { useRef, useState, useMemo } from 'react';

interface WaveformScrubberProps {
  waveformData?: number[] | null;
  currentTime: number;
  duration: number;
  bufferedTime?: number;
  onSeek: (seconds: number) => void;
  height?: number; // e.g. 28 or 48 px
  barCount?: number; // e.g. 70 or 100 bars
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const WaveformScrubber: React.FC<WaveformScrubberProps> = ({
  waveformData,
  currentTime,
  duration,
  bufferedTime = 0,
  onSeek,
  height = 30,
  barCount = 75,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const dragRatioRef = useRef<number | null>(null);

  // Normalize or generate deterministic waveform peaks
  const normalizedPeaks = useMemo(() => {
    if (waveformData && Array.isArray(waveformData) && waveformData.length > 0) {
      // Resample data to target barCount
      const step = waveformData.length / barCount;
      const peaks: number[] = [];
      for (let i = 0; i < barCount; i++) {
        const start = Math.floor(i * step);
        const end = Math.floor((i + 1) * step);
        let sum = 0;
        let count = 0;
        for (let j = start; j < end && j < waveformData.length; j++) {
          sum += waveformData[j];
          count++;
        }
        const avg = count > 0 ? sum / count : 0.2;
        // Clamp height between 0.15 and 1.0
        peaks.push(Math.max(0.15, Math.min(1.0, avg * 2.2)));
      }
      return peaks;
    }

    // Fallback: Generate aesthetic dynamic sound wave if track doesn't have peaks yet
    const fallback: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const sin1 = Math.sin(i * 0.18) * 0.35;
      const sin2 = Math.cos(i * 0.42) * 0.25;
      const noise = (Math.sin(i * 3.7) * 0.15 + 0.15);
      const val = Math.max(0.18, Math.min(0.95, 0.4 + sin1 + sin2 + noise));
      fallback.push(val);
    }
    return fallback;
  }, [waveformData, barCount]);

  const effectiveProgressRatio =
    dragRatio !== null
      ? dragRatio
      : duration > 0
      ? Math.min(1, Math.max(0, currentTime / duration))
      : 0;
  const bufferPercent = duration > 0 ? Math.min(1, Math.max(0, bufferedTime / duration)) : 0;

  const getRatioFromClientX = (clientX: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0 || duration <= 0) return;
    const ratio = getRatioFromClientX(e.touches[0].clientX);
    dragRatioRef.current = ratio;
    setIsDragging(true);
    setDragRatio(ratio);
    setHoverPosition(ratio);
    setHoverTime(ratio * duration);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0 || duration <= 0) return;
    const ratio = getRatioFromClientX(e.touches[0].clientX);
    dragRatioRef.current = ratio;
    setDragRatio(ratio);
    setHoverPosition(ratio);
    setHoverTime(ratio * duration);
  };

  const handleTouchEnd = () => {
    const finalRatio = dragRatioRef.current;
    dragRatioRef.current = null;
    setIsDragging(false);
    setDragRatio(null);
    setHoverPosition(null);
    setHoverTime(null);
    if (finalRatio !== null && duration > 0) {
      onSeek(finalRatio * duration);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const ratio = getRatioFromClientX(e.clientX);
    setHoverPosition(ratio);
    setHoverTime(ratio * duration);

    if (isDragging) {
      dragRatioRef.current = ratio;
      setDragRatio(ratio);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const ratio = getRatioFromClientX(e.clientX);
    dragRatioRef.current = ratio;
    setIsDragging(true);
    setDragRatio(ratio);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      const finalRatio = dragRatioRef.current;
      dragRatioRef.current = null;
      setIsDragging(false);
      setDragRatio(null);
      if (finalRatio !== null && duration > 0) {
        onSeek(finalRatio * duration);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
    setHoverTime(null);
    if (isDragging) {
      const finalRatio = dragRatioRef.current;
      dragRatioRef.current = null;
      setIsDragging(false);
      setDragRatio(null);
      if (finalRatio !== null && duration > 0) {
        onSeek(finalRatio * duration);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative w-full flex items-center cursor-pointer select-none touch-none group py-1"
      style={{ height: `${height}px` }}
      title="Click or drag to seek"
    >
      {/* Waveform Bars Container */}
      <div className="w-full h-full flex items-center justify-between gap-[2px]">
        {normalizedPeaks.map((peak, index) => {
          const barRatio = index / normalizedPeaks.length;
          const isPlayed = barRatio <= effectiveProgressRatio;
          const isBuffered = barRatio <= bufferPercent;
          const isHovered = hoverPosition !== null && barRatio <= hoverPosition;

          // Bar Height in percentage
          const barHeightPercent = Math.max(15, Math.round(peak * 100));

          return (
            <div
              key={index}
              className={`flex-1 rounded-full transition-all duration-75 ${
                isPlayed
                  ? 'bg-gradient-to-t from-denzo-pink to-denzo-rose shadow-denzo-glow-sm'
                  : isHovered
                  ? 'bg-rose-400/80'
                  : isBuffered
                  ? 'bg-zinc-700'
                  : 'bg-zinc-800/90 group-hover:bg-zinc-700/70'
              }`}
              style={{
                height: `${barHeightPercent}%`,
                transform: isHovered ? 'scaleY(1.08)' : 'scaleY(1)',
              }}
            />
          );
        })}
      </div>

      {/* Hover Time Tooltip */}
      {hoverPosition !== null && hoverTime !== null && (
        <div
          className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-zinc-900 border border-denzo-border/80 text-[10px] font-mono text-white pointer-events-none shadow-xl z-20"
          style={{ left: `${hoverPosition * 100}%` }}
        >
          {formatTime(hoverTime)}
        </div>
      )}
    </div>
  );
};
