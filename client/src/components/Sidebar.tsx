import React from 'react';
import {
  Home,
  Compass,
  Library,
  Heart,
  PlusSquare,
  UploadCloud,
  Disc3,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenUpload: () => void;
  playlists?: any[];
  onOpenCreatePlaylist?: () => void;
  onSelectPlaylist?: (playlist: any) => void;
  selectedPlaylistId?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenUpload,
  playlists = [],
  onOpenCreatePlaylist,
  onSelectPlaylist,
  selectedPlaylistId,
}) => {
  return (
    <aside className="w-64 h-full bg-denzo-surface border-r border-denzo-border/60 flex flex-col justify-between p-6 select-none flex-shrink-0">
      <div className="flex flex-col gap-6 overflow-hidden">
        {/* Brand Logo */}
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

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5">
          <button
            onClick={() => onSelectTab('home')}
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
            onClick={() => onSelectTab('discover')}
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
            onClick={() => onSelectTab('library')}
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
            onClick={() => onSelectTab('liked')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentTab === 'liked'
                ? 'bg-denzo-card text-white border-l-2 border-denzo-rose shadow-sm'
                : 'text-denzo-muted hover:text-white hover:bg-denzo-card/50'
            }`}
          >
            <Heart size={18} className={currentTab === 'liked' ? 'text-denzo-rose' : ''} />
            <span>Liked Songs</span>
          </button>
        </nav>

        {/* Playlists Divider */}
        <div className="pt-2 border-t border-denzo-border/40 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-2 mb-2 flex-shrink-0">
            <span className="text-xs font-semibold text-denzo-muted uppercase tracking-wider">Playlists</span>
            <button
              onClick={onOpenCreatePlaylist}
              className="text-denzo-muted hover:text-white hover:scale-110 transition-all"
              title="Create Playlist"
            >
              <PlusSquare size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-1 text-sm overflow-y-auto no-scrollbar pr-1">
            {playlists.length === 0 ? (
              <button
                onClick={onOpenCreatePlaylist}
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
                    onClick={() => onSelectPlaylist && onSelectPlaylist(pl)}
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
        onClick={onOpenUpload}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-denzo-card to-zinc-900 border border-denzo-border/80 hover:border-denzo-rose/60 text-sm font-medium text-white transition-all shadow-sm hover:shadow-denzo-glow-sm group"
      >
        <UploadCloud size={18} className="text-denzo-rose group-hover:scale-110 transition-transform" />
        <span>Upload Audio</span>
      </button>
    </aside>
  );
};
