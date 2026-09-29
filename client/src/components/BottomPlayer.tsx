import React, { useRef } from 'react';
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
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

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

  const progressRef = useRef<HTMLDivElement>(null);

  if (!currentTrack) {
    return null; // Hidden until the first track starts playing
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (bufferedTime / duration) * 100 : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = Math.max(0, Math.min(1, clickX / rect.width));
    seek(clickPercent * duration);
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
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-denzo-surface/95 backdrop-blur-md border-t border-denzo-border/60 px-6 flex items-center justify-between z-50 shadow-2xl">
      {/* 1. Track Info (Left) */}
      <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
        <div className="relative w-14 h-14 rounded-lg bg-denzo-card border border-denzo-border/80 overflow-hidden flex-shrink-0 group">
          {currentTrack.coverImageUrl ? (
            <img
              src={currentTrack.coverImageUrl}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-denzo-card to-zinc-900 text-denzo-muted">
              <Music size={22} />
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-denzo-light truncate hover:underline cursor-pointer">
            {currentTrack.title}
          </span>
          <span className="text-xs text-denzo-muted truncate hover:text-zinc-300 cursor-pointer">
            {currentTrack.artist?.name || 'Unknown Artist'}
          </span>
        </div>

        <button
          onClick={handleToggleLike}
          className={`ml-2 p-1.5 rounded-full transition-colors ${
            currentTrack.isLiked
              ? 'text-denzo-rose hover:text-denzo-pink'
              : 'text-denzo-muted hover:text-white'
          }`}
          title={currentTrack.isLiked ? 'Unlike' : 'Like'}
        >
          <Heart size={18} fill={currentTrack.isLiked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* 2. Controls & Scrubber (Center) */}
      <div className="flex flex-col items-center gap-2 max-w-xl w-2/4">
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
            <SkipBack size={20} />
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-denzo-gradient hover:bg-denzo-gradient-hover text-white flex items-center justify-center shadow-denzo-glow transition-transform hover:scale-105 active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>

          <button
            onClick={nextTrack}
            className="text-denzo-muted hover:text-white transition-colors"
            title="Next"
          >
            <SkipForward size={20} />
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

        {/* Scrubber Time Bar */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[11px] font-mono text-denzo-muted w-9 text-right select-none">
            {formatTime(currentTime)}
          </span>

          <div
            ref={progressRef}
            onClick={handleSeekClick}
            className="relative flex-1 h-1.5 bg-denzo-card hover:h-2 rounded-full cursor-pointer transition-all group overflow-hidden"
          >
            {/* Buffer Progress */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-zinc-800 rounded-full transition-all"
              style={{ width: `${bufferPercent}%` }}
            />
            {/* Playback Progress */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-denzo-gradient rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="text-[11px] font-mono text-denzo-muted w-9 select-none">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* 3. Volume & Extras (Right) */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[150px]">
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
          className="w-24 h-1.5 bg-zinc-800 accent-denzo-rose rounded-lg cursor-pointer transition-all"
        />
      </div>
    </div>
  );
};
