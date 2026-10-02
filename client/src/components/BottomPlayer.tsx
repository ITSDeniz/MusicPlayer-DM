import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  Music,
  ListMusic,
  Maximize2,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { WaveformScrubber } from './WaveformScrubber';
import { QueueDrawer } from './QueueDrawer';
import { ExpandedPlayerModal } from './ExpandedPlayerModal';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const BottomPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    bufferedTime,
    volume,
    isMuted,
    isShuffled,
    repeatMode,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    setLikeStatus,
  } = usePlayerStore();

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isExpandedOpen, setIsExpandedOpen] = useState(false);
  const mobileBarRef = useRef<HTMLDivElement>(null);
  const [isHoveringMobileBar, setIsHoveringMobileBar] = useState(false);
  const [hoverMobileTime, setHoverMobileTime] = useState<number | null>(null);
  const [hoverMobileX, setHoverMobileX] = useState<number>(0);

  // Smooth mobile touch scrubbing state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPercent, setScrubPercent] = useState<number | null>(null);
  const scrubPercentRef = useRef<number | null>(null);
  const justScrubbedRef = useRef(false);

  if (!currentTrack) {
    return null; // Hidden until the first track starts playing
  }

  const effectiveProgressPercent =
    isScrubbing && scrubPercent !== null
      ? scrubPercent * 100
      : duration > 0
      ? (currentTime / duration) * 100
      : 0;

  const effectiveCurrentTime =
    isScrubbing && scrubPercent !== null
      ? scrubPercent * duration
      : currentTime;

  const bufferPercent = duration > 0 ? (bufferedTime / duration) * 100 : 0;

  const getPercentFromClientX = (clientX: number) => {
    if (!mobileBarRef.current) return 0;
    const rect = mobileBarRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleMobileBarSeek = (clientX: number) => {
    if (duration <= 0) return;
    const percent = getPercentFromClientX(clientX);
    seek(percent * duration);
  };

  const handleMobileTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0 || duration <= 0) return;
    const percent = getPercentFromClientX(e.touches[0].clientX);
    scrubPercentRef.current = percent;
    setIsScrubbing(true);
    setScrubPercent(percent);
  };

  const handleMobileTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0 || duration <= 0) return;
    const percent = getPercentFromClientX(e.touches[0].clientX);
    scrubPercentRef.current = percent;
    setScrubPercent(percent);
  };

  const handleMobileTouchEnd = () => {
    const finalPercent = scrubPercentRef.current;
    scrubPercentRef.current = null;
    setIsScrubbing(false);
    setScrubPercent(null);
    justScrubbedRef.current = true;
    setTimeout(() => {
      justScrubbedRef.current = false;
    }, 200);

    if (finalPercent !== null && duration > 0) {
      seek(finalPercent * duration);
    }
  };

  const handleSkipSeconds = (delta: number) => {
    seek(Math.max(0, Math.min(duration, currentTime + delta)));
  };

  const handleToggleLike = async () => {
    if (!currentTrack) return;
    const newStatus = !currentTrack.isLiked;
    setLikeStatus(currentTrack.id, newStatus);

    try {
      await fetch(`/api/tracks/${currentTrack.id}/like`, { method: 'POST' });
    } catch {
      // Optimistic UI fallback
      setLikeStatus(currentTrack.id, !newStatus);
    }
  };

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 h-20 md:h-24 bg-denzo-surface/95 backdrop-blur-xl border-t border-denzo-border/70 px-3 md:px-8 flex items-center justify-between z-40 shadow-2xl">
        {/* Interactive Mobile Top Progress & Scrubber Line */}
        <div
          ref={mobileBarRef}
          onClick={(e) => {
            if (justScrubbedRef.current) return;
            handleMobileBarSeek(e.clientX);
          }}
          onTouchStart={handleMobileTouchStart}
          onTouchMove={handleMobileTouchMove}
          onTouchEnd={handleMobileTouchEnd}
          onTouchCancel={handleMobileTouchEnd}
          onMouseMove={(e) => {
            if (!mobileBarRef.current || duration <= 0) return;
            const rect = mobileBarRef.current.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setHoverMobileTime(percent * duration);
            setHoverMobileX(e.clientX - rect.left);
            setIsHoveringMobileBar(true);
          }}
          onMouseEnter={() => setIsHoveringMobileBar(true)}
          onMouseLeave={() => {
            setIsHoveringMobileBar(false);
            setHoverMobileTime(null);
          }}
          className="absolute -top-3.5 left-0 right-0 h-7 md:hidden flex items-center cursor-pointer group z-50 select-none touch-none"
          title="Tap or drag to seek"
        >
          {/* Floating Timestamp Tooltip */}
          {isHoveringMobileBar && hoverMobileTime !== null && (
            <div
              className="absolute -top-6 px-2 py-0.5 rounded-md bg-zinc-950 border border-denzo-rose/50 text-[10px] font-mono text-white shadow-xl pointer-events-none transform -translate-x-1/2"
              style={{ left: `${hoverMobileX}px` }}
            >
              {formatTime(hoverMobileTime)}
            </div>
          )}

          {/* Scrubber Track */}
          <div className="w-full h-1.5 group-hover:h-2.5 bg-zinc-800 rounded-full relative transition-all overflow-visible">
            {/* Buffer progress (grey) */}
            <div
              className="absolute left-0 top-0 h-full bg-zinc-700/60 rounded-full transition-all pointer-events-none"
              style={{ width: `${bufferPercent}%` }}
            />
            {/* Playback progress (red-to-pink gradient) */}
            <div
              className={`absolute left-0 top-0 h-full bg-rose-500 bg-denzo-gradient rounded-full pointer-events-none z-10 ${
                isScrubbing ? 'transition-none' : 'transition-[width] duration-150 ease-linear'
              }`}
              style={{ width: `${effectiveProgressPercent}%` }}
            >
              {/* Scrub thumb dot */}
              <div
                className={`absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-denzo-glow translate-x-1/2 ${
                  isScrubbing ? 'scale-125' : 'scale-100 group-hover:scale-125'
                } transition-transform`}
              />
            </div>
          </div>
        </div>

        {/* 1. Track Info (Left) */}
        <div className="flex items-center gap-2.5 md:gap-4 flex-1 md:flex-initial md:w-1/4 min-w-0 pr-1">
          <div
            onClick={() => setIsExpandedOpen(true)}
            className="relative w-12 h-12 md:w-14 md:h-14 rounded-xl bg-denzo-card border border-denzo-border/80 overflow-hidden flex-shrink-0 group cursor-pointer shadow-md hover:border-denzo-rose/50 transition-colors"
            title="Expand player"
          >
            {currentTrack.coverImageUrl ? (
              <img
                src={currentTrack.coverImageUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-denzo-card to-zinc-900 text-denzo-muted">
                <Music size={20} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 size={16} className="text-white" />
            </div>
          </div>

          <div
            className="flex flex-col min-w-0 flex-1 cursor-pointer"
            onClick={() => setIsExpandedOpen(true)}
          >
            <span className="text-xs md:text-sm font-semibold text-denzo-light truncate hover:text-denzo-rose transition-colors">
              {currentTrack.title}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-denzo-muted truncate">
              <span className="truncate">{currentTrack.artist?.name || 'Unknown Artist'}</span>
              <span className="text-zinc-600 md:hidden">•</span>
              <span className="font-mono text-zinc-400 md:hidden flex-shrink-0">
                {formatTime(effectiveCurrentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>

          <button
            onClick={handleToggleLike}
            className={`p-1.5 rounded-full transition-colors flex-shrink-0 touch-manipulation select-none ${
              currentTrack.isLiked
                ? 'text-denzo-rose hover:text-denzo-pink'
                : 'text-denzo-muted hover:text-white'
            }`}
            title={currentTrack.isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={16} fill={currentTrack.isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Mobile Quick Action Buttons (shown only on < md) */}
        <div className="flex items-center gap-0.5 sm:gap-1 md:hidden flex-shrink-0">
          {/* Rewind 10s */}
          <button
            type="button"
            onClick={() => handleSkipSeconds(-10)}
            className="p-1.5 text-denzo-muted hover:text-white active:scale-90 transition-transform touch-manipulation select-none"
            title="Rewind 10 seconds"
          >
            <RotateCcw size={16} />
          </button>

          {/* Prev Track */}
          <button
            type="button"
            onClick={prevTrack}
            className="p-1.5 text-denzo-muted hover:text-white active:scale-90 transition-transform hidden xs:block touch-manipulation select-none"
            title="Previous Track"
          >
            <SkipBack size={17} />
          </button>

          {/* Master Play/Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-denzo-gradient hover:bg-denzo-gradient-hover text-white flex items-center justify-center shadow-denzo-glow transition-transform active:scale-95 mx-0.5 touch-manipulation select-none"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={17} fill="currentColor" />
            ) : (
              <Play size={17} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          {/* Forward 10s */}
          <button
            type="button"
            onClick={() => handleSkipSeconds(10)}
            className="p-1.5 text-denzo-muted hover:text-white active:scale-90 transition-transform touch-manipulation select-none"
            title="Forward 10 seconds"
          >
            <RotateCw size={16} />
          </button>

          {/* Next Track */}
          <button
            type="button"
            onClick={nextTrack}
            className="p-1.5 text-denzo-muted hover:text-white active:scale-90 transition-transform touch-manipulation select-none"
            title="Next Track"
          >
            <SkipForward size={17} />
          </button>

          {/* Expand Full Player */}
          <button
            type="button"
            onClick={() => setIsExpandedOpen(true)}
            className="p-1.5 text-denzo-muted hover:text-white active:scale-90 transition-transform ml-0.5 touch-manipulation select-none"
            title="Expand Full Player"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* 2. Controls & Scrubber (Desktop Center) */}
        <div className="hidden md:flex flex-col items-center gap-1.5 max-w-xl w-2/4">
          {/* Playback Buttons */}
          <div className="flex items-center gap-5">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 transition-colors ${
                isShuffled ? 'text-denzo-pink' : 'text-denzo-muted hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle size={16} />
            </button>

            <button
              onClick={prevTrack}
              className="text-denzo-muted hover:text-white transition-colors"
              title="Previous"
            >
              <SkipBack size={19} />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-denzo-gradient hover:bg-denzo-gradient-hover text-white flex items-center justify-center shadow-denzo-glow transition-transform hover:scale-105 active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="text-denzo-muted hover:text-white transition-colors"
              title="Next"
            >
              <SkipForward size={19} />
            </button>

            <button
              onClick={toggleRepeat}
              className={`p-1.5 transition-colors ${
                repeatMode !== 'off' ? 'text-denzo-rose' : 'text-denzo-muted hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={16} />}
            </button>
          </div>

          {/* Scrubber: Waveform vs Standard Bar */}
          <div className="w-full flex items-center gap-3">
            <span className="text-[11px] font-mono text-denzo-muted w-9 text-right select-none">
              {formatTime(currentTime)}
            </span>

            <div className="flex-1">
              <WaveformScrubber
                waveformData={currentTrack.waveformData}
                currentTime={currentTime}
                duration={duration}
                bufferedTime={bufferedTime}
                onSeek={seek}
                height={24}
                barCount={70}
              />
            </div>

            <span className="text-[11px] font-mono text-denzo-muted w-9 select-none">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* 3. Volume & Extras (Desktop Right) */}
        <div className="hidden md:flex items-center justify-end gap-3 w-1/4 min-w-[150px]">

          {/* Queue Drawer Button */}
          <button
            onClick={() => setIsQueueOpen(true)}
            className={`p-1.5 rounded-lg transition-colors ${
              isQueueOpen
                ? 'text-denzo-rose bg-denzo-rose/10'
                : 'text-denzo-muted hover:text-white'
            }`}
            title="Open Queue"
          >
            <ListMusic size={18} />
          </button>

          {/* Expand Full Player Button */}
          <button
            onClick={() => setIsExpandedOpen(true)}
            className="p-1.5 rounded-lg text-denzo-muted hover:text-white transition-colors"
            title="Expand Full Player"
          >
            <Maximize2 size={16} />
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 ml-1">
            <button
              onClick={toggleMute}
              className="text-denzo-muted hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1.5 bg-zinc-800 accent-denzo-rose rounded-lg cursor-pointer transition-all"
            />
          </div>
        </div>
      </footer>

      {/* Slide-in Queue Drawer */}
      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />

      {/* High-Fidelity Expanded Player Modal */}
      <ExpandedPlayerModal
        isOpen={isExpandedOpen}
        onClose={() => setIsExpandedOpen(false)}
        onOpenQueue={() => setIsQueueOpen(true)}
      />
    </>
  );
};
