import React from 'react';
import {
  Home,
  Compass,
  Library,
  Heart,
  History,
  PlusSquare,
  UploadCloud,
  Disc3,
  X,
} from 'lucide-react';

import { usePlayerStore } from '../store/usePlayerStore';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenUpload: () => void;
  playlists?: any[];
  onOpenCreatePlaylist?: () => void;
  onSelectPlaylist?: (playlist: any) => void;
  selectedPlaylistId?: string | null;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenUpload,
  playlists = [],
  onOpenCreatePlaylist,
  onSelectPlaylist,
  selectedPlaylistId,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const handleSelectTab = (tab: string) => {
    onSelectTab(tab);
    onMobileClose?.();
  };

  const handleSelectPlaylist = (pl: any) => {
    onSelectPlaylist?.(pl);
    onMobileClose?.();
  };

  const handleOpenUpload = () => {
    onOpenUpload();
    onMobileClose?.();
  };

  const handleOpenCreatePlaylist = () => {
    onOpenCreatePlaylist?.();
    onMobileClose?.();
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full px-6 pt-6 select-none">
      <div className="flex flex-col gap-5 overflow-hidden flex-1 min-h-0">
        {/* Brand Logo & Mobile Close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-denzo-gradient flex items-center justify-center shadow-denzo-glow">
              <Disc3 size={24} className="text-white animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Denzo <span className="text-transparent bg-clip-text bg-denzo-gradient">Music</span>
              </h1>
              <p className="text-[11px] text-denzo-muted">High-Fidelity Audio</p>
            </div>
          </div>
          {/* Close button on mobile */}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 md:hidden transition-colors"
              title="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5">
          <button
            onClick={() => handleSelectTab('home')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentTab === 'home'
                ? 'bg-denzo-card text-white border-l-2 border-denzo-rose shadow-sm'
                : 'text-denzo-muted hover:text-white hover:bg-denzo-card/50'
            }`}
          >
            <Home size={18} className={currentTab === 'home' ? 'text-denzo-rose' : ''} />
            <span>Home Feed</span>
          </button>

          <button
            onClick={() => handleSelectTab('discover')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentTab === 'discover'
                ? 'bg-denzo-card text-white border-l-2 border-denzo-rose shadow-sm'
                : 'text-denzo-muted hover:text-white hover:bg-denzo-card/50'
            }`}
          >
            <Compass size={18} className={currentTab === 'discover' ? 'text-denzo-rose' : ''} />
            <span>Discover</span>
          </button>

          <button
            onClick={() => handleSelectTab('library')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentTab === 'library'
                ? 'bg-denzo-card text-white border-l-2 border-denzo-rose shadow-sm'
                : 'text-denzo-muted hover:text-white hover:bg-denzo-card/50'
            }`}
          >
            <Library size={18} className={currentTab === 'library' ? 'text-denzo-rose' : ''} />
            <span>Library</span>
          </button>

          <button
            onClick={() => handleSelectTab('liked')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentTab === 'liked'
                ? 'bg-denzo-card text-white border-l-2 border-denzo-rose shadow-sm'
                : 'text-denzo-muted hover:text-white hover:bg-denzo-card/50'
            }`}
          >
            <Heart size={18} className={currentTab === 'liked' ? 'text-denzo-rose' : ''} />
            <span>Liked Songs</span>
          </button>

          <button
            onClick={() => handleSelectTab('history')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentTab === 'history'
                ? 'bg-denzo-card text-white border-l-2 border-denzo-rose shadow-sm'
                : 'text-denzo-muted hover:text-white hover:bg-denzo-card/50'
            }`}
          >
            <History size={18} className={currentTab === 'history' ? 'text-denzo-rose' : ''} />
            <span>History</span>
          </button>
        </nav>

        {/* Playlists Divider */}
        <div className="pt-2 border-t border-denzo-border/40 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-2 mb-2 flex-shrink-0">
            <span className="text-xs font-semibold text-denzo-muted uppercase tracking-wider">Playlists</span>
            <button
              onClick={handleOpenCreatePlaylist}
              className="text-denzo-muted hover:text-white hover:scale-110 transition-all"
              title="Create Playlist"
            >
              <PlusSquare size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-1 text-sm overflow-y-auto no-scrollbar pr-1">
            {playlists.length === 0 ? (
              <button
                onClick={handleOpenCreatePlaylist}
                className="px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-denzo-rose hover:bg-denzo-card/40 text-left transition-colors"
              >
                + Create first playlist
              </button>
            ) : (
              playlists.map((pl) => {
                const isSelected = currentTab === 'playlist' && selectedPlaylistId === pl.id;
                return (
                  <button
                    key={pl.id}
                    onClick={() => handleSelectPlaylist(pl)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium truncate transition-all ${
                      isSelected
                        ? 'bg-denzo-card text-denzo-rose border-l-2 border-denzo-rose font-semibold'
                        : 'text-denzo-muted hover:text-white hover:bg-denzo-card/40'
                    }`}
                    title={pl.title}
                  >
                    🎵 {pl.title}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Upload Track Button */}
      <button
        onClick={handleOpenUpload}
        className="w-full flex-shrink-0 mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-denzo-card to-zinc-900 border border-denzo-border/80 hover:border-denzo-rose/60 text-sm font-medium text-white transition-all shadow-sm hover:shadow-denzo-glow-sm group"
      >
        <UploadCloud size={18} className="text-denzo-rose group-hover:scale-110 transition-transform" />
        <span>Upload Audio</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex w-64 h-full bg-denzo-surface border-r border-denzo-border/60 flex-col justify-between flex-shrink-0 transition-all z-30 ${
          currentTrack ? 'pb-28' : 'pb-6'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Slide-in Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
          />
          <aside
            className={`relative w-72 max-w-[85vw] h-full bg-denzo-surface border-r border-denzo-border flex flex-col justify-between z-10 shadow-2xl animate-in slide-in-from-left duration-300 ${
              currentTrack ? 'pb-28' : 'pb-6'
            }`}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
