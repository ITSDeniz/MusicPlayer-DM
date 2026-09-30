import React, { useState } from 'react';
import { X, Check, FolderPlus, Plus, Loader2 } from 'lucide-react';
import { Track } from '../store/usePlayerStore';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  playlists: any[];
  onOpenCreatePlaylist: () => void;
  onTrackAdded?: (playlistId: string) => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  track,
  playlists,
  onOpenCreatePlaylist,
  onTrackAdded,
}) => {
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !track) return null;

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      setAddingId(playlistId);
      setErrorMessage('');

      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ trackId: track.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add track to playlist');
      }

      setAddedIds((prev) => [...prev, playlistId]);
      if (onTrackAdded) onTrackAdded(playlistId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error adding track');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-2xl bg-denzo-card border border-denzo-border/80 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-denzo-border/60">
          <div>
            <h2 className="text-base font-bold text-white">Add to Playlist</h2>
            <p className="text-xs text-denzo-muted truncate max-w-[240px]">
              &ldquo;{track.title}&rdquo;
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-denzo-muted hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Playlists List */}
        <div className="p-4 max-h-72 overflow-y-auto space-y-1.5">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs mb-2">
              {errorMessage}
            </div>
          )}

          {playlists.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-denzo-muted mb-3">You don&apos;t have any playlists yet.</p>
              <button
                onClick={() => {
                  onClose();
                  onOpenCreatePlaylist();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-denzo-gradient text-white text-xs font-semibold shadow-denzo-glow-sm"
              >
                <Plus size={14} />
                <span>Create Playlist</span>
              </button>
            </div>
          ) : (
            playlists.map((pl) => {
              const isAdded = addedIds.includes(pl.id);
              const isProcessing = addingId === pl.id;

              return (
                <div
                  key={pl.id}
                  onClick={() => !isAdded && !isProcessing && handleAddToPlaylist(pl.id)}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                    isAdded
                      ? 'bg-denzo-rose/10 border border-denzo-rose/30 text-white'
                      : 'bg-denzo-surface/60 hover:bg-denzo-surface border border-denzo-border/50 text-zinc-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-denzo-border/80 flex items-center justify-center text-denzo-muted flex-shrink-0">
                      {pl.coverImageUrl ? (
                        <img
                          src={pl.coverImageUrl}
                          alt={pl.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <FolderPlus size={16} />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold truncate text-white">{pl.title}</p>
                      <p className="text-[11px] text-denzo-muted">
                        {pl._count?.tracks ?? pl.trackCount ?? 0} tracks
                      </p>
                    </div>
                  </div>

                  <div>
                    {isProcessing ? (
                      <Loader2 size={16} className="animate-spin text-denzo-rose" />
                    ) : isAdded ? (
                      <div className="w-6 h-6 rounded-full bg-denzo-rose flex items-center justify-center text-white">
                        <Check size={14} />
                      </div>
                    ) : (
                      <Plus size={16} className="text-zinc-500 hover:text-white" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Create Button */}
        {playlists.length > 0 && (
          <div className="p-3 border-t border-denzo-border/60 bg-denzo-surface/40 flex justify-between items-center">
            <button
              onClick={() => {
                onClose();
                onOpenCreatePlaylist();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-denzo-rose hover:text-rose-400 transition-colors"
            >
              <Plus size={14} />
              <span>New Playlist</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 text-xs text-white hover:bg-zinc-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
