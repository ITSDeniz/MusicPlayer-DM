import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Play,
  Pause,
  Heart,
  Clock,
  Music,
  LogOut,
  Edit3,
  Trash2,
  FolderPlus,
  Plus,
  ListMusic,
  X,
  TrendingUp,
  History,
  Menu,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { BottomPlayer } from './components/BottomPlayer';
import { UploadModal } from './components/UploadModal';
import { EditModal } from './components/EditModal';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { ToastContainer } from './components/ToastContainer';
import { toast } from './store/useToastStore';
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
  
  // Modals & Navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [trackForPlaylist, setTrackForPlaylist] = useState<Track | null>(null);

  // Auth state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Data state
  const [tracks, setTracks] = useState<Track[]>([]);
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [historyTracks, setHistoryTracks] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    setLikeStatus,
    onTrackDeleted,
    updateTrackData,
  } = usePlayerStore();

  // Check current session
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => setCurrentUser(user))
      .catch(() => {});
  }, []);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAuthOpen) {
          setIsAuthOpen(false);
          setAuthError('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthOpen]);

  // Fetch user's playlists
  const fetchPlaylists = useCallback(async () => {
    if (!currentUser) return;
    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/playlists/my', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
      }
    } catch (err) {
      console.error('Failed to fetch playlists:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchPlaylists();
    } else {
      setPlaylists([]);
    }
  }, [currentUser, fetchPlaylists]);

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

  // Fetch user's liked tracks
  const fetchLikedTracks = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/tracks/liked', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setLikedTracks(data.items);
      }
    } catch (err) {
      console.error('Failed to fetch liked tracks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Fetch single playlist details
  const fetchPlaylistDetails = useCallback(async (playlistId: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/playlists/${playlistId}`, {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedPlaylist(data);
        setPlaylistTracks(data.tracks || []);
      }
    } catch (err) {
      console.error('Failed to fetch playlist details:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch top played tracks (Redis cached)
  const fetchTopTracks = useCallback(async () => {
    try {
      const res = await fetch('/api/tracks/top?limit=6');
      if (res.ok) {
        const data = await res.json();
        setTopTracks(data);
      }
    } catch (err) {
      console.error('Failed to fetch top tracks:', err);
    }
  }, []);

  // Fetch user's listen history
  const fetchHistoryTracks = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/tracks/history', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryTracks(data);
      }
    } catch (err) {
      console.error('Failed to fetch listen history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentTab === 'home' || currentTab === 'discover') {
      const timer = setTimeout(() => {
        fetchTracks();
        fetchTopTracks();
      }, 250);
      return () => clearTimeout(timer);
    } else if (currentTab === 'liked') {
      fetchLikedTracks();
    } else if (currentTab === 'library') {
      fetchPlaylists();
    } else if (currentTab === 'history') {
      fetchHistoryTracks();
    }
  }, [currentTab, fetchTracks, fetchTopTracks, fetchLikedTracks, fetchPlaylists, fetchHistoryTracks]);

  // Play track via audio engine (play count & listen history are recorded at the 30s milestone)
  const handlePlayTrack = (track: Track, newQueue?: Track[]) => {
    playTrack(track, newQueue);
  };

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

      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }

      setCurrentUser(data.user);
      setIsAuthOpen(false);
      setAuthPassword('');
      fetchTracks();
      fetchPlaylists();
      toast.success(
        authMode === 'login'
          ? `Welcome back, ${data.user.username}!`
          : `Account created! Welcome, ${data.user.username}!`,
      );
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during authentication.');
      toast.error(err.message || 'Authentication failed');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('accessToken');
    setCurrentUser(null);
    setPlaylists([]);
    setLikedTracks([]);
    if (currentTab === 'liked' || currentTab === 'library' || currentTab === 'playlist') {
      setCurrentTab('home');
    }
    toast.info('Signed out successfully');
  };

  const handleToggleLike = async (track: Track, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const newStatus = !track.isLiked;
    setLikeStatus(track.id, newStatus);
    setTracks((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, isLiked: newStatus } : t)),
    );
    setLikedTracks((prev) =>
      newStatus
        ? [...prev, { ...track, isLiked: true }]
        : prev.filter((t) => t.id !== track.id),
    );
    setPlaylistTracks((prev) =>
      prev.map((t) => (t.id === track.id ? { ...t, isLiked: newStatus } : t)),
    );

    toast.success(newStatus ? 'Added to Liked Songs ♥' : 'Removed from Liked Songs');

    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/tracks/${track.id}/like`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch {
      setLikeStatus(track.id, !newStatus);
    }
  };

  const handleOpenEdit = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setEditingTrack(track);
    setIsEditOpen(true);
  };

  const handleEditSuccess = (updatedTrack: Track) => {
    updateTrackData(updatedTrack);
    setTracks((prev) =>
      prev.map((t) => (t.id === updatedTrack.id ? { ...t, ...updatedTrack } : t)),
    );
    setLikedTracks((prev) =>
      prev.map((t) => (t.id === updatedTrack.id ? { ...t, ...updatedTrack } : t)),
    );
    setPlaylistTracks((prev) =>
      prev.map((t) => (t.id === updatedTrack.id ? { ...t, ...updatedTrack } : t)),
    );
  };

  const handleDeleteTrack = async (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${track.title}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/tracks/${track.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete track');
      }

      onTrackDeleted(track.id);
      setTracks((prev) => prev.filter((t) => t.id !== track.id));
      setLikedTracks((prev) => prev.filter((t) => t.id !== track.id));
      setPlaylistTracks((prev) => {
        const next = prev.filter((t) => t.id !== track.id);
        const newTotal = next.reduce((sum, t) => sum + (t.duration || 0), 0);
        setSelectedPlaylist((pl: any) =>
          pl ? { ...pl, totalDuration: newTotal, trackCount: next.length } : pl,
        );
        return next;
      });
      toast.info(`"${track.title}" deleted`);
    } catch (err: any) {
      toast.error(err.message || 'Error deleting track');
    }
  };

  const handleOpenAddToPlaylist = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setTrackForPlaylist(track);
    setIsAddToPlaylistOpen(true);
  };

  const handleSelectPlaylist = (playlist: any) => {
    setSelectedPlaylist(playlist);
    setCurrentTab('playlist');
    fetchPlaylistDetails(playlist.id);
  };

  const handleDeletePlaylist = async () => {
    if (!selectedPlaylist) return;
    if (!window.confirm(`Are you sure you want to delete playlist "${selectedPlaylist.title}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/playlists/${selectedPlaylist.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        setPlaylists((prev) => prev.filter((p) => p.id !== selectedPlaylist.id));
        setSelectedPlaylist(null);
        setCurrentTab('home');
        toast.info('Playlist deleted');
      }
    } catch (err) {
      console.error('Failed to delete playlist:', err);
      toast.error('Failed to delete playlist');
    }
  };

  const handleRemoveTrackFromPlaylist = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedPlaylist) return;

    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/playlists/${selectedPlaylist.id}/tracks/${trackId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        setPlaylistTracks((prev) => {
          const next = prev.filter((t) => t.id !== trackId);
          const newTotal = next.reduce((sum, t) => sum + (t.duration || 0), 0);
          setSelectedPlaylist((pl: any) =>
            pl ? { ...pl, totalDuration: newTotal, trackCount: next.length } : pl,
          );
          return next;
        });
        fetchPlaylists();
        toast.info('Track removed from playlist');
      }
    } catch (err) {
      console.error('Failed to remove track from playlist:', err);
      toast.error('Failed to remove track from playlist');
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Space: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        const state = usePlayerStore.getState();
        if (state.currentTrack) {
          state.togglePlay();
        }
      }

      // ArrowRight: +5s Seek
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        const state = usePlayerStore.getState();
        if (state.currentTrack && state.duration > 0) {
          state.seek(Math.min(state.duration, state.currentTime + 5));
        }
      }

      // ArrowLeft: -5s Seek
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const state = usePlayerStore.getState();
        if (state.currentTrack && state.duration > 0) {
          state.seek(Math.max(0, state.currentTime - 5));
        }
      }

      // KeyM: Mute / Unmute
      if (e.code === 'KeyM') {
        e.preventDefault();
        usePlayerStore.getState().toggleMute();
      }

      // KeyL: Like / Unlike current playing track
      if (e.code === 'KeyL') {
        e.preventDefault();
        const currentTrack = usePlayerStore.getState().currentTrack;
        if (currentTrack) {
          handleToggleLike(currentTrack);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleLike]);

  return (
    <div className="flex h-screen bg-denzo-dark text-denzo-light overflow-hidden font-sans select-none">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if ((tab === 'liked' || tab === 'library' || tab === 'history') && !currentUser) {
            setIsAuthOpen(true);
            return;
          }
          setCurrentTab(tab);
        }}
        onOpenUpload={() => {
          if (!currentUser) setIsAuthOpen(true);
          else setIsUploadOpen(true);
        }}
        playlists={playlists}
        onOpenCreatePlaylist={() => {
          if (!currentUser) setIsAuthOpen(true);
          else setIsCreatePlaylistOpen(true);
        }}
        onSelectPlaylist={handleSelectPlaylist}
        selectedPlaylistId={selectedPlaylist?.id}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Content Viewport */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-28 relative">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 h-20 px-4 md:px-8 flex items-center justify-between bg-denzo-dark/80 backdrop-blur-xl border-b border-denzo-border/40 gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-1 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 md:hidden transition-colors flex-shrink-0"
              title="Open Navigation Menu"
            >
              <Menu size={22} />
            </button>

            {/* Search Input */}
            <div className="relative w-full">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-denzo-muted pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracks, artists, genres..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-denzo-surface border border-denzo-border/70 text-xs md:text-sm text-white placeholder:text-denzo-muted focus:outline-none focus:border-denzo-rose focus:shadow-denzo-glow-sm transition-all"
              />
            </div>
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

        {/* ----------------- TAB: HOME & DISCOVER ----------------- */}
        {(currentTab === 'home' || currentTab === 'discover') && (
          <>
            {/* Hero Banner (Only on Home) */}
            {currentTab === 'home' && (
              <section className="px-8 pt-6 pb-4">
                <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-denzo-surface via-denzo-card to-zinc-950 border border-denzo-border/70 shadow-2xl">
                  <div className="absolute right-0 top-0 bottom-0 w-96 bg-denzo-gradient opacity-10 blur-3xl pointer-events-none" />

                  <div className="relative z-10 max-w-xl">
                    <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-2 leading-tight">
                      Stream in Pure <span className="text-transparent bg-clip-text bg-denzo-gradient">Fidelity</span>
                    </h1>
                    <p className="text-sm text-denzo-muted mb-6 leading-relaxed">
                      Direct-to-S3 high-resolution audio streaming with interactive real-time waveforms and zero buffer lag.
                    </p>

                    {tracks.length > 0 && (
                      <button
                        onClick={() => handlePlayTrack(tracks[0], tracks)}
                        className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-denzo-gradient hover:bg-denzo-gradient-hover text-white font-semibold text-sm shadow-denzo-glow transition-all hover:scale-105 active:scale-95"
                      >
                        <Play size={18} fill="currentColor" />
                        <span>Play Featured Mix</span>
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Top Charts Section (Redis Cached) */}
            {topTracks.length > 0 && (
              <section className="px-8 pt-2 pb-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-denzo-rose" />
                    <h2 className="text-base font-bold text-white tracking-tight">Top Charts</h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {topTracks.map((track, i) => (
                    <div
                      key={`top-${track.id}`}
                      onClick={() => handlePlayTrack(track, topTracks)}
                      className="group relative p-3 rounded-2xl bg-denzo-surface/50 hover:bg-denzo-card border border-denzo-border/50 hover:border-denzo-rose/40 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                    >
                      <div className="relative w-full aspect-square rounded-xl bg-zinc-900 border border-denzo-border overflow-hidden mb-2.5">
                        {track.coverImageUrl ? (
                          <img src={track.coverImageUrl} alt={track.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <Music size={24} />
                          </div>
                        )}
                        <span className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-black/75 backdrop-blur-md text-[11px] font-bold text-denzo-rose flex items-center justify-center border border-white/10">
                          #{i + 1}
                        </span>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play size={22} fill="white" className="text-white ml-0.5" />
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-white truncate group-hover:text-denzo-rose transition-colors">
                        {track.title}
                      </p>
                      <p className="text-[11px] text-denzo-muted truncate">
                        {track.artist?.name || 'Unknown Artist'}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-1">
                        ▶ {track.playCount ?? 0} plays
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {currentTab === 'discover' ? 'Discover New Releases' : 'Trending Tracks'}
                </h2>
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
                          else handlePlayTrack(track, tracks);
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

                        {/* Actions, Duration & Like */}
                        <div className="flex items-center gap-2 md:gap-3">
                          {/* Hover action icons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleOpenAddToPlaylist(track, e)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                              title="Add to Playlist"
                            >
                              <FolderPlus size={15} />
                            </button>

                            {currentUser && (currentUser.id === track.uploaderId || currentUser.role === 'ADMIN' || !track.uploaderId) && (
                              <>
                                <button
                                  onClick={(e) => handleOpenEdit(track, e)}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                  title="Edit Track"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteTrack(track, e)}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                                  title="Delete Track"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>

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
          </>
        )}

        {/* ----------------- TAB: LIKED SONGS ----------------- */}
        {currentTab === 'liked' && (
          <section className="px-8 py-6 flex-1 flex flex-col">
            {/* Liked Header Banner */}
            <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-rose-950/60 via-denzo-card to-zinc-950 border border-denzo-border/70 shadow-2xl mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
                <div className="w-24 h-24 rounded-2xl bg-denzo-gradient flex items-center justify-center shadow-denzo-glow flex-shrink-0">
                  <Heart size={44} className="text-white" fill="white" />
                </div>
                <div className="flex-1">
                  <span className="text-xs uppercase font-bold tracking-wider text-denzo-rose">Playlist</span>
                  <h1 className="text-3xl lg:text-4xl font-extrabold text-white mt-1 mb-2">Liked Songs</h1>
                  <p className="text-xs text-denzo-muted">
                    {currentUser?.username || 'You'} • {likedTracks.length} tracks
                  </p>
                </div>
                {likedTracks.length > 0 && (
                  <button
                    onClick={() => playTrack(likedTracks[0], likedTracks)}
                    className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-denzo-gradient hover:bg-denzo-gradient-hover text-white font-semibold text-sm shadow-denzo-glow transition-all hover:scale-105 active:scale-95"
                  >
                    <Play size={18} fill="currentColor" />
                    <span>Play All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Liked Tracks List */}
            {likedTracks.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center border border-dashed border-denzo-border/70 rounded-2xl bg-denzo-surface/30">
                <Heart size={36} className="text-zinc-600 mb-3" />
                <h3 className="text-base font-bold text-white mb-1">Songs you like will appear here</h3>
                <p className="text-xs text-denzo-muted max-w-sm mb-4">
                  Save tracks by clicking the heart icon while listening.
                </p>
                <button
                  onClick={() => setCurrentTab('home')}
                  className="px-4 py-2 rounded-xl bg-denzo-surface hover:bg-denzo-card border border-denzo-border text-xs text-white"
                >
                  Explore Home Feed
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {likedTracks.map((track, idx) => {
                  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                  const isThisCurrent = currentTrack?.id === track.id;

                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        if (isThisCurrent) togglePlay();
                        else playTrack(track, likedTracks);
                      }}
                      className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer border ${
                        isThisCurrent
                          ? 'bg-denzo-card border-denzo-rose/40 shadow-sm'
                          : 'bg-denzo-surface/40 hover:bg-denzo-card border-transparent hover:border-denzo-border/60'
                      }`}
                    >
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

                        <button className="w-6 hidden group-hover:flex items-center justify-center text-white">
                          {isThisPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                        </button>

                        <div className="relative w-11 h-11 rounded-lg bg-zinc-900 border border-denzo-border overflow-hidden flex-shrink-0">
                          {track.coverImageUrl ? (
                            <img src={track.coverImageUrl} alt={track.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Music size={16} />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-semibold truncate ${isThisCurrent ? 'text-denzo-rose' : 'text-white'}`}>
                            {track.title}
                          </span>
                          <span className="text-xs text-denzo-muted truncate">{track.artist?.name || 'Unknown Artist'}</span>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center w-1/4">
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-denzo-border/60 text-[11px] text-zinc-400 font-medium">
                          {track.genre || 'Electronic'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 md:gap-3">
                        <button
                          onClick={(e) => handleOpenAddToPlaylist(track, e)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                          title="Add to Playlist"
                        >
                          <FolderPlus size={15} />
                        </button>

                        <button
                          onClick={(e) => handleToggleLike(track, e)}
                          className="p-1.5 rounded-full text-denzo-rose hover:scale-110 transition-transform"
                          title="Remove from Liked"
                        >
                          <Heart size={16} fill="currentColor" />
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
          </section>
        )}

        {/* ----------------- TAB: PLAYLIST VIEW ----------------- */}
        {currentTab === 'playlist' && selectedPlaylist && (
          <section className="px-8 py-6 flex-1 flex flex-col">
            {/* Playlist Header */}
            <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-denzo-surface via-denzo-card to-zinc-950 border border-denzo-border/70 shadow-2xl mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
                <div className="w-28 h-28 rounded-2xl bg-zinc-900 border border-denzo-border overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg">
                  {selectedPlaylist.coverImageUrl ? (
                    <img src={selectedPlaylist.coverImageUrl} alt={selectedPlaylist.title} className="w-full h-full object-cover" />
                  ) : (
                    <ListMusic size={40} className="text-zinc-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-xs uppercase font-bold tracking-wider text-denzo-rose">Playlist</span>
                  <h1 className="text-3xl lg:text-4xl font-extrabold text-white mt-1 mb-1 truncate">
                    {selectedPlaylist.title}
                  </h1>
                  {selectedPlaylist.description && (
                    <p className="text-xs text-denzo-muted mb-2 max-w-xl">{selectedPlaylist.description}</p>
                  )}
                  <p className="text-xs text-zinc-400">
                    Created by {selectedPlaylist.owner?.username || 'You'} • {playlistTracks.length} tracks • {formatDuration(playlistTracks.reduce((acc, t) => acc + (t.duration || 0), 0))}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {playlistTracks.length > 0 && (
                    <button
                      onClick={() => playTrack(playlistTracks[0], playlistTracks)}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-denzo-gradient hover:bg-denzo-gradient-hover text-white font-semibold text-xs shadow-denzo-glow transition-all hover:scale-105 active:scale-95"
                    >
                      <Play size={16} fill="currentColor" />
                      <span>Play All</span>
                    </button>
                  )}

                  {currentUser?.id === selectedPlaylist.ownerId && (
                    <button
                      onClick={handleDeletePlaylist}
                      className="p-3 rounded-xl bg-denzo-surface border border-denzo-border text-zinc-400 hover:text-rose-400 hover:border-rose-500/50 transition-colors"
                      title="Delete Playlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Playlist Tracks List */}
            {playlistTracks.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center border border-dashed border-denzo-border/70 rounded-2xl bg-denzo-surface/30">
                <ListMusic size={36} className="text-zinc-600 mb-3" />
                <h3 className="text-base font-bold text-white mb-1">This playlist is empty</h3>
                <p className="text-xs text-denzo-muted max-w-sm mb-4">
                  Add tracks to this playlist by clicking the folder icon on any song.
                </p>
                <button
                  onClick={() => setCurrentTab('home')}
                  className="px-4 py-2 rounded-xl bg-denzo-surface hover:bg-denzo-card border border-denzo-border text-xs text-white"
                >
                  Browse Tracks
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {playlistTracks.map((track, idx) => {
                  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                  const isThisCurrent = currentTrack?.id === track.id;

                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        if (isThisCurrent) togglePlay();
                        else playTrack(track, playlistTracks);
                      }}
                      className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer border ${
                        isThisCurrent
                          ? 'bg-denzo-card border-denzo-rose/40 shadow-sm'
                          : 'bg-denzo-surface/40 hover:bg-denzo-card border-transparent hover:border-denzo-border/60'
                      }`}
                    >
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

                        <button className="w-6 hidden group-hover:flex items-center justify-center text-white">
                          {isThisPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                        </button>

                        <div className="relative w-11 h-11 rounded-lg bg-zinc-900 border border-denzo-border overflow-hidden flex-shrink-0">
                          {track.coverImageUrl ? (
                            <img src={track.coverImageUrl} alt={track.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Music size={16} />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-semibold truncate ${isThisCurrent ? 'text-denzo-rose' : 'text-white'}`}>
                            {track.title}
                          </span>
                          <span className="text-xs text-denzo-muted truncate">{track.artist?.name || 'Unknown Artist'}</span>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center w-1/4">
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-denzo-border/60 text-[11px] text-zinc-400 font-medium">
                          {track.genre || 'Electronic'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 md:gap-3">
                        {currentUser?.id === selectedPlaylist.ownerId && (
                          <button
                            onClick={(e) => handleRemoveTrackFromPlaylist(track.id, e)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove from playlist"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}

                        <button
                          onClick={(e) => handleToggleLike(track, e)}
                          className={`p-1.5 rounded-full transition-colors ${
                            track.isLiked ? 'text-denzo-rose' : 'text-zinc-600 hover:text-white'
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
          </section>
        )}

        {/* ----------------- TAB: LIBRARY VIEW ----------------- */}
        {currentTab === 'library' && (
          <section className="px-8 py-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Your Library</h1>
                <p className="text-xs text-denzo-muted mt-0.5">Manage your playlists and saved tracks</p>
              </div>
              <button
                onClick={() => {
                  if (!currentUser) setIsAuthOpen(true);
                  else setIsCreatePlaylistOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-denzo-gradient hover:bg-denzo-gradient-hover text-white text-xs font-semibold shadow-denzo-glow-sm transition-all"
              >
                <Plus size={16} />
                <span>New Playlist</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {/* Liked Songs shortcut card */}
              <div
                onClick={() => setCurrentTab('liked')}
                className="group relative rounded-2xl p-5 bg-gradient-to-br from-denzo-rose/20 via-denzo-card to-zinc-950 border border-denzo-rose/30 hover:border-denzo-rose/60 transition-all cursor-pointer shadow-lg hover:scale-[1.02]"
              >
                <div className="w-12 h-12 rounded-xl bg-denzo-gradient flex items-center justify-center text-white shadow-denzo-glow mb-4">
                  <Heart size={24} fill="currentColor" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Liked Songs</h3>
                <p className="text-xs text-denzo-muted">{likedTracks.length} tracks</p>
              </div>

              {/* User playlists */}
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => handleSelectPlaylist(pl)}
                  className="group relative rounded-2xl p-4 bg-denzo-surface/60 hover:bg-denzo-card border border-denzo-border/60 hover:border-denzo-rose/40 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <div className="w-full aspect-square rounded-xl bg-zinc-900 border border-denzo-border overflow-hidden flex items-center justify-center text-zinc-600 mb-3">
                    {pl.coverImageUrl ? (
                      <img src={pl.coverImageUrl} alt={pl.title} className="w-full h-full object-cover" />
                    ) : (
                      <ListMusic size={32} />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white truncate mb-0.5">{pl.title}</h3>
                  <p className="text-xs text-denzo-muted">
                    {pl._count?.tracks ?? pl.trackCount ?? 0} tracks
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ----------------- TAB: HISTORY VIEW ----------------- */}
        {currentTab === 'history' && (
          <section className="px-8 py-6 flex-1 flex flex-col">
            <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-zinc-900 via-denzo-card to-zinc-950 border border-denzo-border/70 shadow-2xl mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-xl flex-shrink-0">
                  <History size={40} className="text-denzo-rose" />
                </div>
                <div className="flex-1">
                  <span className="text-xs uppercase font-bold tracking-wider text-denzo-rose">Activity</span>
                  <h1 className="text-3xl lg:text-4xl font-extrabold text-white mt-1 mb-2">Listening History</h1>
                  <p className="text-xs text-denzo-muted">
                    {currentUser?.username || 'You'} • {historyTracks.length} tracks recently played
                  </p>
                </div>
                {historyTracks.length > 0 && (
                  <button
                    onClick={() => handlePlayTrack(historyTracks[0], historyTracks)}
                    className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-denzo-gradient hover:bg-denzo-gradient-hover text-white font-semibold text-sm shadow-denzo-glow transition-all hover:scale-105 active:scale-95"
                  >
                    <Play size={18} fill="currentColor" />
                    <span>Replay History</span>
                  </button>
                )}
              </div>
            </div>

            {historyTracks.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center border border-dashed border-denzo-border/70 rounded-2xl bg-denzo-surface/30">
                <History size={36} className="text-zinc-600 mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No listening history yet</h3>
                <p className="text-xs text-denzo-muted max-w-sm mb-4">
                  Tracks you stream will automatically appear in your listening history.
                </p>
                <button
                  onClick={() => setCurrentTab('home')}
                  className="px-4 py-2 rounded-xl bg-denzo-surface hover:bg-denzo-card border border-denzo-border text-xs text-white"
                >
                  Start Listening
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {historyTracks.map((track, idx) => {
                  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                  const isThisCurrent = currentTrack?.id === track.id;

                  return (
                    <div
                      key={`hist-${track.id}-${idx}`}
                      onClick={() => {
                        if (isThisCurrent) togglePlay();
                        else handlePlayTrack(track, historyTracks);
                      }}
                      className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer border ${
                        isThisCurrent
                          ? 'bg-denzo-card border-denzo-rose/40 shadow-sm'
                          : 'bg-denzo-surface/40 hover:bg-denzo-card border-transparent hover:border-denzo-border/60'
                      }`}
                    >
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

                        <button className="w-6 hidden group-hover:flex items-center justify-center text-white">
                          {isThisPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                        </button>

                        <div className="relative w-11 h-11 rounded-lg bg-zinc-900 border border-denzo-border overflow-hidden flex-shrink-0">
                          {track.coverImageUrl ? (
                            <img src={track.coverImageUrl} alt={track.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Music size={16} />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-semibold truncate ${isThisCurrent ? 'text-denzo-rose' : 'text-white'}`}>
                            {track.title}
                          </span>
                          <span className="text-xs text-denzo-muted truncate">{track.artist?.name || 'Unknown Artist'}</span>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center w-1/4">
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-denzo-border/60 text-[11px] text-zinc-400 font-medium">
                          {track.genre || 'Electronic'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 md:gap-3">
                        <button
                          onClick={(e) => handleOpenAddToPlaylist(track, e)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                          title="Add to Playlist"
                        >
                          <FolderPlus size={15} />
                        </button>

                        <button
                          onClick={(e) => handleToggleLike(track, e)}
                          className={`p-1.5 rounded-full transition-colors ${
                            track.isLiked ? 'text-denzo-rose' : 'text-zinc-600 hover:text-white'
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
          </section>
        )}
      </main>

      {/* 3. Sticky Bottom Persistent Audio Player */}
      <BottomPlayer />

      {/* 4. Upload Audio Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchTracks();
          toast.success('Audio track uploaded successfully!');
        }}
      />

      {/* 5. Edit Track Modal */}
      <EditModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingTrack(null);
        }}
        track={editingTrack}
        onSuccess={(updated) => {
          handleEditSuccess(updated);
          toast.success('Track updated successfully!');
        }}
      />

      {/* 6. Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onSuccess={(newPlaylist) => {
          setPlaylists((prev) => [newPlaylist, ...prev]);
          handleSelectPlaylist(newPlaylist);
          toast.success(`Playlist "${newPlaylist.title}" created!`);
        }}
      />

      {/* 7. Add to Playlist Modal */}
      <AddToPlaylistModal
        isOpen={isAddToPlaylistOpen}
        onClose={() => {
          setIsAddToPlaylistOpen(false);
          setTrackForPlaylist(null);
        }}
        track={trackForPlaylist}
        playlists={playlists}
        onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
        onTrackAdded={() => {
          fetchPlaylists();
          toast.success('Track added to playlist!');
        }}
      />

      {/* 8. Auth Modal (Login / Register) */}
      {isAuthOpen && (
        <div
          onClick={() => {
            setIsAuthOpen(false);
            setAuthError('');
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-denzo-surface border border-denzo-border/80 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative animate-scaleUp"
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setIsAuthOpen(false);
                setAuthError('');
              }}
              className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center text-denzo-muted hover:text-white hover:bg-zinc-800 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 pr-8">
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

      {/* 9. Global Toast Notification System */}
      <ToastContainer />
    </div>
  );
}
