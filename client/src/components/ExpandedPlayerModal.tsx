import React from 'react';
import {
  Minimize2,
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
  RotateCcw,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { WaveformScrubber } from './WaveformScrubber';

interface ExpandedPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQueue: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const ExpandedPlayerModal: React.FC<ExpandedPlayerModalProps> = ({
  isOpen,
  onClose,
  onOpenQueue,
}) => {
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

  if (!isOpen || !currentTrack) return null;

  const handleToggleLike = async () => {
    const newStatus = !currentTrack.isLiked;
    setLikeStatus(currentTrack.id, newStatus);
    try {
      await fetch(`/api/tracks/${currentTrack.id}/like`, { method: 'POST' });
    } catch {
      setLikeStatus(currentTrack.id, !newStatus);
    }
  };

  const handleSkipSeconds = (delta: number) => {
    seek(Math.max(0, Math.min(duration, currentTime + delta)));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white overflow-hidden animate-fadeIn">
      {/* Dynamic Ambient Background Blur */}
      {currentTrack.coverImageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 blur-3xl scale-125 pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${currentTrack.coverImageUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-rose-950/40 via-zinc-950 to-black pointer-events-none" />
      )}

      {/* Top Bar */}
      <header className="relative z-10 h-20 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-xs font-semibold text-denzo-rose">
            <Sparkles size={13} />
            <span>High Fidelity Streaming</span>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {currentTrack.audioFormat || 'MP3 320 KBPS'}
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-zinc-300 hover:text-white transition-all hover:scale-105 active:scale-95"
          title="Minimize Player"
        >
          <Minimize2 size={18} />
        </button>
      </header>

      {/* Center Display: Cover Artwork & Info */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start sm:justify-center px-4 sm:px-8 py-3 max-w-2xl mx-auto w-full overflow-y-auto no-scrollbar">
        {/* Cover Art with Shadow Glow */}
        <div className="relative w-40 h-40 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-2xl sm:rounded-3xl bg-zinc-900 border border-white/10 overflow-hidden shadow-2xl mb-4 sm:mb-8 group flex-shrink-0">
          {currentTrack.coverImageUrl ? (
            <img
              src={currentTrack.coverImageUrl}
              alt={currentTrack.title}
              className={`w-full h-full object-cover transition-transform duration-700 ${
                isPlaying ? 'scale-105' : 'scale-100'
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
              <Music size={60} />
            </div>
          )}

          {/* Playing Status Pill */}
          {isPlaying && (
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-1 text-[11px] text-denzo-pink">
              <span className="w-1.5 h-1.5 rounded-full bg-denzo-rose animate-ping" />
              <span>Playing</span>
            </div>
          )}
        </div>

        {/* Track Title, Artist, & Like Button */}
        <div className="w-full flex items-center justify-between mb-3 sm:mb-6">
          <div className="min-w-0 pr-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white truncate mb-1">
              {currentTrack.title}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-zinc-400 truncate">
              {currentTrack.artist?.name || 'Unknown Artist'}
              {currentTrack.genre && (
                <span className="ml-2.5 px-2.5 py-0.5 rounded-full bg-white/10 text-xs text-zinc-300 font-medium">
                  {currentTrack.genre}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={handleToggleLike}
            className={`p-2.5 sm:p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-transform hover:scale-110 active:scale-95 ${
              currentTrack.isLiked ? 'text-denzo-rose' : 'text-zinc-400 hover:text-white'
            }`}
            title={currentTrack.isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={20} fill={currentTrack.isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Interactive Large Waveform Scrubber */}
        <div className="w-full mb-4 sm:mb-8">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 mb-2">
            <WaveformScrubber
              waveformData={currentTrack.waveformData}
              currentTime={currentTime}
              duration={duration}
              bufferedTime={bufferedTime}
              onSeek={seek}
              height={36}
              barCount={70}
            />
          </div>
          <div className="flex justify-between items-center px-1 text-xs font-mono text-zinc-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="w-full flex items-center justify-between mb-4">
          <button
            onClick={toggleShuffle}
            className={`p-2.5 rounded-xl transition-all ${
              isShuffled ? 'text-denzo-pink bg-denzo-pink/10' : 'text-zinc-400 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle size={20} />
          </button>

          <button
            onClick={() => handleSkipSeconds(-10)}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            title="Rewind 10 seconds"
          >
            <RotateCcw size={20} />
          </button>

          <button
            onClick={prevTrack}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
            title="Previous Track"
          >
            <SkipBack size={24} />
          </button>

          {/* Master Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-denzo-gradient hover:bg-denzo-gradient-hover text-white flex items-center justify-center shadow-denzo-glow transition-all hover:scale-110 active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" className="ml-1" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
            title="Next Track"
          >
            <SkipForward size={24} />
          </button>

          <button
            onClick={() => handleSkipSeconds(10)}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            title="Forward 10 seconds"
          >
            <RotateCw size={20} />
          </button>

          <button
            onClick={toggleRepeat}
            className={`p-2.5 rounded-xl transition-all ${
              repeatMode !== 'off' ? 'text-denzo-rose bg-denzo-rose/10' : 'text-zinc-400 hover:text-white'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </button>
        </div>
      </main>

      {/* Bottom Bar: Volume and Up Next shortcut */}
      <footer className="relative z-10 h-20 px-8 flex items-center justify-between border-t border-white/10 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-28 h-1.5 bg-zinc-800 accent-denzo-rose rounded-lg cursor-pointer"
          />
        </div>

        <button
          onClick={() => {
            onClose();
            onOpenQueue();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all"
        >
          <span>View Queue</span>
        </button>
      </footer>
    </div>
  );
};
