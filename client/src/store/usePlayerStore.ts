import { create } from 'zustand';

export interface Track {
  id: string;
  title: string;
  duration: number;
  streamUrl: string;
  coverImageUrl?: string | null;
  genre?: string | null;
  playCount?: string | number;
  isExplicit?: boolean;
  waveformData?: number[] | null;
  artist?: {
    id?: string;
    name: string;
    avatarUrl?: string | null;
  };
  isLiked?: boolean;
}

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  queueIndex: number;
  currentTime: number;
  duration: number;
  bufferedTime: number;
  volume: number;
  isMuted: boolean;
  isShuffled: boolean;
  repeatMode: RepeatMode;

  // Actions
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  setLikeStatus: (trackId: string, isLiked: boolean) => void;
}

// Global Singleton HTMLAudioElement instance ensuring audio plays seamlessly across routes
const audio = new Audio();
audio.preload = 'metadata';

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Sync Audio Element Events with Zustand State
  audio.ontimeupdate = () => {
    set({ currentTime: audio.currentTime });

    // Calculate buffer progress
    if (audio.buffered.length > 0) {
      set({ bufferedTime: audio.buffered.end(audio.buffered.length - 1) });
    }
  };

  audio.onloadedmetadata = () => {
    set({ duration: audio.duration || get().currentTrack?.duration || 0 });
  };

  audio.onended = () => {
    const { repeatMode, nextTrack } = get();
    if (repeatMode === 'one') {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      nextTrack();
    }
  };

  audio.onplay = () => set({ isPlaying: true });
  audio.onpause = () => set({ isPlaying: false });

  return {
    currentTrack: null,
    isPlaying: false,
    queue: [],
    queueIndex: -1,
    currentTime: 0,
    duration: 0,
    bufferedTime: 0,
    volume: 0.8,
    isMuted: false,
    isShuffled: false,
    repeatMode: 'off',

    playTrack: (track: Track, newQueue?: Track[]) => {
      let queue = get().queue;
      let queueIndex = get().queueIndex;

      if (newQueue && newQueue.length > 0) {
        queue = newQueue;
        queueIndex = newQueue.findIndex((t) => t.id === track.id);
      } else if (!queue.some((t) => t.id === track.id)) {
        queue = [...queue, track];
        queueIndex = queue.length - 1;
      } else {
        queueIndex = queue.findIndex((t) => t.id === track.id);
      }

      set({
        currentTrack: track,
        queue,
        queueIndex: queueIndex >= 0 ? queueIndex : 0,
        currentTime: 0,
        duration: track.duration || 0,
        isPlaying: true,
      });

      if (audio.src !== track.streamUrl) {
        audio.src = track.streamUrl;
      }
      audio.play().catch((err) => {
        console.warn('Audio playback was prevented by browser autoplay policy:', err);
      });
    },

    togglePlay: () => {
      const { currentTrack, isPlaying } = get();
      if (!currentTrack) return;

      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(() => {});
      }
    },

    pause: () => {
      audio.pause();
    },

    resume: () => {
      if (get().currentTrack) {
        audio.play().catch(() => {});
      }
    },

    seek: (seconds: number) => {
      audio.currentTime = seconds;
      set({ currentTime: seconds });
    },

    nextTrack: () => {
      const { queue, queueIndex, isShuffled, repeatMode, playTrack } = get();
      if (queue.length === 0) return;

      if (isShuffled) {
        const randomIndex = Math.floor(Math.random() * queue.length);
        playTrack(queue[randomIndex]);
        return;
      }

      const nextIndex = queueIndex + 1;
      if (nextIndex < queue.length) {
        playTrack(queue[nextIndex]);
      } else if (repeatMode === 'all') {
        playTrack(queue[0]);
      } else {
        audio.pause();
        set({ isPlaying: false, currentTime: 0 });
      }
    },

    prevTrack: () => {
      const { queue, queueIndex, playTrack, currentTime } = get();
      if (queue.length === 0) return;

      // If already playing for more than 3 seconds, restart the current track
      if (currentTime > 3) {
        audio.currentTime = 0;
        set({ currentTime: 0 });
        return;
      }

      const prevIndex = queueIndex - 1;
      if (prevIndex >= 0) {
        playTrack(queue[prevIndex]);
      } else {
        playTrack(queue[queue.length - 1]);
      }
    },

    setVolume: (volume: number) => {
      const clamped = Math.max(0, Math.min(1, volume));
      audio.volume = clamped;
      audio.muted = clamped === 0;
      set({ volume: clamped, isMuted: clamped === 0 });
    },

    toggleMute: () => {
      const { isMuted, volume } = get();
      if (isMuted) {
        audio.muted = false;
        audio.volume = volume || 0.5;
        set({ isMuted: false });
      } else {
        audio.muted = true;
        set({ isMuted: true });
      }
    },

    toggleShuffle: () => {
      set((state) => ({ isShuffled: !state.isShuffled }));
    },

    toggleRepeat: () => {
      set((state) => {
        const modes: RepeatMode[] = ['off', 'all', 'one'];
        const currentIndex = modes.indexOf(state.repeatMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        return { repeatMode: nextMode };
      });
    },

    addToQueue: (track: Track) => {
      set((state) => ({ queue: [...state.queue, track] }));
    },

    removeFromQueue: (trackId: string) => {
      set((state) => ({
        queue: state.queue.filter((t) => t.id !== trackId),
      }));
    },

    clearQueue: () => {
      set({ queue: [], queueIndex: -1 });
    },

    setLikeStatus: (trackId: string, isLiked: boolean) => {
      set((state) => {
        const updateTrack = (t: Track) => (t.id === trackId ? { ...t, isLiked } : t);
        return {
          currentTrack: state.currentTrack?.id === trackId ? { ...state.currentTrack, isLiked } : state.currentTrack,
          queue: state.queue.map(updateTrack),
        };
      });
    },
  };
});
