import React, { useState } from 'react';
import { X, ListPlus, Loader2, Image as ImageIcon } from 'lucide-react';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (playlist: any) => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Playlist title is required.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          coverImageUrl: coverImageUrl.trim() || undefined,
          isPublic: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create playlist');
      }

      onSuccess(data);
      setTitle('');
      setDescription('');
      setCoverImageUrl('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while creating playlist.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-denzo-card border border-denzo-border/80 shadow-2xl overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-denzo-gradient opacity-15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-denzo-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-denzo-rose/10 border border-denzo-rose/30 flex items-center justify-center text-denzo-rose">
              <ListPlus size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Playlist</h2>
              <p className="text-xs text-denzo-muted">Curate your favorite tracks</p>
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
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Playlist Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Late Night Vibes"
              className="w-full px-3.5 py-2.5 rounded-xl bg-denzo-surface border border-denzo-border text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-denzo-rose transition-colors"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a mood or description..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-denzo-surface border border-denzo-border text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-denzo-rose transition-colors resize-none"
            />
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
              <span>{isLoading ? 'Creating...' : 'Create Playlist'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
