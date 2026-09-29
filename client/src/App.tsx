import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Play,
  Pause,
  Heart,
  Clock,
  Music,
  LogOut,
  Flame,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { BottomPlayer } from './components/BottomPlayer';
import { UploadModal } from './components/UploadModal';
import { usePlayerStore, Track } from './store/usePlayerStore';

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

const GENRES = ['All', 'Electronic', 'Hip-Hop', 'Pop', 'Rock', 'Ambient', 'Lo-Fi'];

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const { currentTrack, isPlaying, playTrack, togglePlay, setLikeStatus } = usePlayerStore();

  // Check current session
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => setCurrentUser(user))
      .catch(() => {});
  }, []);

  // Fetch tracks feed with cursor pagination
  const fetchTracks = useCallback(
    async (cursor?: string, append = false) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedGenre !== 'All') params.append('genre', selectedGenre);
        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        if (cursor) params.append('cursor', cursor);

        const res = await fetch(`/api/tracks?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTracks((prev) => (append ? [...prev, ...data.items] : data.items));
          setNextCursor(data.nextCursor);
        }
      } catch (err) {
        console.error('Failed to fetch tracks feed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedGenre, searchQuery],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTracks();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchTracks]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        authMode === 'login'
          ? { identifier: authUsername || authEmail, password: authPassword }
          : { email: authEmail, username: authUsername, password: authPassword };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      setCurrentUser(data.user);
      setIsAuthOpen(false);
      setAuthPassword('');
      fetchTracks();
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during authentication.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
  };

  const handleToggleLike = async (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !track.isLiked;
    setLikeStatus(track.id, newStatus);
    setTracks((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, isLiked: newStatus } : t)),
    );

    try {
      await fetch(`/api/tracks/${track.id}/like`, { method: 'POST' });
    } catch {
      setLikeStatus(track.id, !newStatus);
    }
  };

  return (
    <div className="flex h-screen bg-denzo-dark text-denzo-light overflow-hidden font-sans select-none">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenUpload={() => {
          if (!currentUser) {
            setIsAuthOpen(true);
          } else {
            setIsUploadOpen(true);
          }
        }}
      />

      {/* 2. Main Content Viewport */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-28 relative">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 h-20 px-8 flex items-center justify-between bg-denzo-dark/80 backdrop-blur-xl border-b border-denzo-border/40">
          {/* Search Input */}
          <div className="relative w-96">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-denzo-muted pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracks, artists, genres..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-denzo-surface border border-denzo-border/70 text-sm text-white placeholder:text-denzo-muted focus:outline-none focus:border-denzo-rose focus:shadow-denzo-glow-sm transition-all"
            />
          </div>

          {/* User Profile / Auth Actions */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-denzo-surface border border-denzo-border px-3.5 py-1.5 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-denzo-gradient flex items-center justify-center text-xs font-bold text-white shadow-denzo-glow-sm">
                  {currentUser.username.substring(0, 1).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-white">{currentUser.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-denzo-muted hover:text-rose-400 transition-colors ml-1"
                  title="Logout"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-4 py-2 rounded-xl bg-denzo-gradient hover:bg-denzo-gradient-hover text-white text-xs font-semibold shadow-denzo-glow-sm transition-all hover:scale-105 active:scale-95"
              >
                Sign In / Join
              </button>
            )}
          </div>
        </header>

        {/* Hero Banner */}
        <section className="px-8 pt-6 pb-4">
          <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-denzo-surface via-denzo-card to-zinc-950 border border-denzo-border/70 shadow-2xl">
            <div className="absolute right-0 top-0 bottom-0 w-96 bg-denzo-gradient opacity-10 blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-denzo-rose/10 border border-denzo-rose/30 text-denzo-rose text-xs font-semibold mb-3">
                <Flame size={14} />
                <span>Next-Gen Audio Experience</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-2 leading-tight">
                Stream in Pure <span className="text-transparent bg-clip-text bg-denzo-gradient">Fidelity</span>
              </h1>
              <p className="text-sm text-denzo-muted mb-6 leading-relaxed">
                Direct-to-S3 high-resolution audio streaming with interactive real-time waveforms and zero buffer lag.
              </p>

              {tracks.length > 0 && (
                <button
                  onClick={() => playTrack(tracks[0], tracks)}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-denzo-gradient hover:bg-denzo-gradient-hover text-white font-semibold text-sm shadow-denzo-glow transition-all hover:scale-105 active:scale-95"
                >
                  <Play size={18} fill="currentColor" />
                  <span>Play Featured Mix</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Genre Pill Filters */}
        <section className="px-8 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedGenre === genre
                  ? 'bg-denzo-gradient text-white shadow-denzo-glow-sm'
                  : 'bg-denzo-surface border border-denzo-border/60 text-denzo-muted hover:text-white hover:border-zinc-700'
              }`}
            >
              {genre}
            </button>
          ))}
        </section>

        {/* Tracks Feed Table */}
        <section className="px-8 py-4 flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">Trending Tracks</h2>
            <span className="text-xs text-denzo-muted font-medium">{tracks.length} tracks loaded</span>
          </div>

          {tracks.length === 0 && !isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center border border-dashed border-denzo-border/70 rounded-2xl bg-denzo-surface/30">
              <div className="w-14 h-14 rounded-2xl bg-denzo-card border border-denzo-border flex items-center justify-center text-denzo-muted mb-4">
                <Music size={26} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">No tracks found</h3>
              <p className="text-xs text-denzo-muted max-w-sm mb-5">
                Be the first to upload an audio track directly to the S3 bucket!
              </p>
              <button
                onClick={() => {
                  if (!currentUser) setIsAuthOpen(true);
                  else setIsUploadOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-denzo-gradient text-white text-xs font-semibold shadow-denzo-glow transition-all hover:scale-105"
              >
                Upload First Track
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {tracks.map((track, idx) => {
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                const isThisCurrent = currentTrack?.id === track.id;

                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      if (isThisCurrent) togglePlay();
                      else playTrack(track, tracks);
                    }}
                    className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer border ${
                      isThisCurrent
                        ? 'bg-denzo-card border-denzo-rose/40 shadow-sm'
                        : 'bg-denzo-surface/40 hover:bg-denzo-card border-transparent hover:border-denzo-border/60'
                    }`}
                  >
                    {/* Index & Title */}
                    <div className="flex items-center gap-4 min-w-0 w-2/5">
                      <div className="w-6 text-center text-xs font-mono text-denzo-muted group-hover:hidden flex justify-center">
                        {isThisPlaying ? (
                          <div className="flex items-end gap-0.5 h-3.5">
                            <span className="w-1 h-3 bg-denzo-rose animate-bounce" />
                            <span className="w-1 h-3.5 bg-denzo-pink animate-pulse" />
                            <span className="w-1 h-2 bg-denzo-rose animate-bounce" />
                          </div>
                        ) : (
                          idx + 1
                        )}
                      </div>

                      <button
                        className="w-6 hidden group-hover:flex items-center justify-center text-white"
                        title={isThisPlaying ? 'Pause' : 'Play'}
                      >
                        {isThisPlaying ? (
                          <Pause size={15} fill="currentColor" />
                        ) : (
                          <Play size={15} fill="currentColor" />
                        )}
                      </button>

                      <div className="relative w-11 h-11 rounded-lg bg-zinc-900 border border-denzo-border overflow-hidden flex-shrink-0">
                        {track.coverImageUrl ? (
                          <img
                            src={track.coverImageUrl}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <Music size={16} />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span
                          className={`text-sm font-semibold truncate ${
                            isThisCurrent ? 'text-denzo-rose' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </span>
                        <span className="text-xs text-denzo-muted truncate">
                          {track.artist?.name || 'Unknown Artist'}
                        </span>
                      </div>
                    </div>

                    {/* Genre */}
                    <div className="hidden md:flex items-center w-1/4">
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-denzo-border/60 text-[11px] text-zinc-400 font-medium">
                        {track.genre || 'Electronic'}
                      </span>
                    </div>

                    {/* Duration & Like */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={(e) => handleToggleLike(track, e)}
                        className={`p-1.5 rounded-full transition-colors ${
                          track.isLiked
                            ? 'text-denzo-rose'
                            : 'text-zinc-600 hover:text-white'
                        }`}
                        title={track.isLiked ? 'Unlike' : 'Like'}
                      >
                        <Heart size={16} fill={track.isLiked ? 'currentColor' : 'none'} />
                      </button>

                      <div className="flex items-center gap-1.5 text-xs font-mono text-denzo-muted w-14 justify-end">
                        <Clock size={12} className="opacity-60" />
                        <span>{formatDuration(track.duration)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button for Cursor Pagination */}
          {nextCursor && (
            <div className="pt-6 flex justify-center">
              <button
                onClick={() => fetchTracks(nextCursor, true)}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-denzo-surface hover:bg-denzo-card border border-denzo-border text-xs font-semibold text-white transition-all hover:border-denzo-rose/50"
              >
                {isLoading ? 'Loading more...' : 'Load More Tracks'}
              </button>
            </div>
          )}
        </section>
      </main>

      {/* 3. Sticky Bottom Persistent Audio Player */}
      <BottomPlayer />

      {/* 4. Upload Audio Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => fetchTracks()}
      />

      {/* 5. Auth Modal (Login / Register) */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-denzo-surface border border-denzo-border/80 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-1">
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-xs text-denzo-muted mb-5">
              {authMode === 'login'
                ? 'Sign in to upload and favorite tracks'
                : 'Join Denzo Music community today'}
            </p>

            {authError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-denzo-muted mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="denzo@example.com"
                    className="w-full px-3 py-2 rounded-xl bg-denzo-card border border-denzo-border text-sm text-white focus:outline-none focus:border-denzo-rose"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-denzo-muted mb-1">
                  {authMode === 'login' ? 'Email or Username' : 'Username'}
                </label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="denzo"
                  className="w-full px-3 py-2 rounded-xl bg-denzo-card border border-denzo-border text-sm text-white focus:outline-none focus:border-denzo-rose"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-denzo-muted mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-denzo-card border border-denzo-border text-sm text-white focus:outline-none focus:border-denzo-rose"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full py-2.5 rounded-xl bg-denzo-gradient hover:bg-denzo-gradient-hover text-white text-sm font-semibold shadow-denzo-glow transition-all"
              >
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthError('');
                }}
                className="text-xs text-denzo-muted hover:text-denzo-rose transition-colors"
              >
                {authMode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
