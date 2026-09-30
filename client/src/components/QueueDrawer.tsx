import React from 'react';
import { X, Play, Pause, Trash2, ListMusic, Music, Disc3 } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({ isOpen, onClose }) => {
  const {
    currentTrack,
    queue,
    queueIndex,
    isPlaying,
    playTrack,
    togglePlay,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  if (!isOpen) return null;

  const upNextTracks = queue.slice(queueIndex + 1);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Drawer Body */}
      <div className="w-full max-w-md h-full bg-denzo-card/95 backdrop-blur-2xl border-l border-denzo-border/80 flex flex-col shadow-2xl animate-slideLeft">
        {/* Drawer Header */}
        <div className="p-6 border-b border-denzo-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-denzo-rose/10 border border-denzo-rose/30 flex items-center justify-center text-denzo-rose">
              <ListMusic size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Play Queue</h2>
              <p className="text-xs text-denzo-muted">
                {queue.length} track{queue.length !== 1 ? 's' : ''} in queue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="px-2.5 py-1 rounded-lg text-xs text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                title="Clear entire queue"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-denzo-muted hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Now Playing Section */}
          {currentTrack && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-denzo-rose mb-3 flex items-center gap-1.5">
                <Disc3 size={14} className="animate-spin-slow" />
                <span>Now Playing</span>
              </h3>

              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-denzo-surface via-denzo-card to-zinc-900 border border-denzo-rose/30 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl bg-zinc-900 border border-denzo-border overflow-hidden flex-shrink-0">
                    {currentTrack.coverImageUrl ? (
                      <img
                        src={currentTrack.coverImageUrl}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Music size={18} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
                    <p className="text-xs text-denzo-muted truncate">
                      {currentTrack.artist?.name || 'Unknown Artist'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isPlaying ? (
                    <div className="flex items-end gap-0.5 h-4 px-2">
                      <span className="w-1 h-3 bg-denzo-rose animate-bounce" />
                      <span className="w-1 h-4 bg-denzo-pink animate-pulse" />
                      <span className="w-1 h-2 bg-denzo-rose animate-bounce" />
                    </div>
                  ) : null}

                  <button
                    onClick={togglePlay}
                    className="w-9 h-9 rounded-full bg-denzo-gradient hover:bg-denzo-gradient-hover text-white flex items-center justify-center shadow-denzo-glow-sm transition-transform hover:scale-105 active:scale-95"
                  >
                    {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Up Next Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Up Next ({upNextTracks.length})
              </h3>
            </div>

            {upNextTracks.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-denzo-border/60 rounded-xl bg-denzo-surface/30">
                <p className="text-xs text-denzo-muted">Queue is currently empty.</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Play any song or album to populate the queue.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {upNextTracks.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    className="group flex items-center justify-between p-2.5 rounded-xl bg-denzo-surface/40 hover:bg-denzo-surface border border-transparent hover:border-denzo-border/60 transition-all"
                  >
                    <div
                      onClick={() => playTrack(track)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="relative w-10 h-10 rounded-lg bg-zinc-900 border border-denzo-border overflow-hidden flex-shrink-0">
                        {track.coverImageUrl ? (
                          <img
                            src={track.coverImageUrl}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <Music size={14} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play size={14} fill="white" className="text-white ml-0.5" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-denzo-rose transition-colors">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-denzo-muted truncate">
                          {track.artist?.name || 'Unknown Artist'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-zinc-500">
                        {formatDuration(track.duration)}
                      </span>
                      <button
                        onClick={() => removeFromQueue(track.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from queue"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
