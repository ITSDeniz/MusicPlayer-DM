import React, { useState, useEffect } from 'react';
import { X, Edit3, Loader2, Image as ImageIcon } from 'lucide-react';
import { Track } from '../store/usePlayerStore';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onSuccess: (updatedTrack: Track) => void;
}

const GENRES = ['Electronic', 'Hip-Hop', 'Pop', 'Rock', 'Ambient', 'Lo-Fi', 'Classical', 'Jazz'];

export const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  track,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [genre, setGenre] = useState('Electronic');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (track) {
      setTitle(track.title || '');
      setArtistName(track.artist?.name || '');
      setGenre(track.genre || 'Electronic');
      setCoverImageUrl(track.coverImageUrl || '');
      setErrorMessage('');
    }
  }, [track]);

  if (!isOpen || !track) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Track title is required.');
      return;
    }
    if (!artistName.trim()) {
      setErrorMessage('Artist name is required.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/tracks/${track.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          artistName: artistName.trim(),
          genre: genre.trim(),
          coverImageUrl: coverImageUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update track');
      }

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while updating the track.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-denzo-card border border-denzo-border/80 shadow-2xl overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-denzo-gradient opacity-15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-denzo-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-denzo-rose/10 border border-denzo-rose/30 flex items-center justify-center text-denzo-rose">
              <Edit3 size={17} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Track</h2>
              <p className="text-xs text-denzo-muted">Update title, artist, genre, or cover artwork</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-denzo-muted hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Track Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cyberpunk Nights"
              className="w-full px-3.5 py-2.5 rounded-xl bg-denzo-surface border border-denzo-border text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-denzo-rose transition-colors"
              required
            />
          </div>

          {/* Artist */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Artist Name *
            </label>
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="e.g. Neon Horizon"
              className="w-full px-3.5 py-2.5 rounded-xl bg-denzo-surface border border-denzo-border text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-denzo-rose transition-colors"
              required
            />
          </div>

          {/* Genre */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Genre
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-denzo-surface border border-denzo-border text-sm text-white focus:outline-none focus:border-denzo-rose transition-colors cursor-pointer"
            >
              {GENRES.map((g) => (
                <option key={g} value={g} className="bg-zinc-900 text-white">
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Cover Image URL (Optional)
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-denzo-surface border border-denzo-border text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-denzo-rose transition-colors"
              />
              <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-denzo-border overflow-hidden flex items-center justify-center flex-shrink-0">
                {coverImageUrl ? (
                  <img
                    src={coverImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageIcon size={18} className="text-zinc-600" />
                )}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-denzo-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-denzo-surface border border-denzo-border text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-denzo-gradient hover:bg-denzo-gradient-hover text-white text-xs font-semibold shadow-denzo-glow-sm transition-all disabled:opacity-50"
            >
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              <span>{isLoading ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
