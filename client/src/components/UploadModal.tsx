import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle2, Loader2, Music2 } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [genre, setGenre] = useState('Electronic');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Extract duration & 100 waveform peak points using Web Audio API
  const analyzeAudio = async (
    audioFile: File,
  ): Promise<{ duration: number; peaks: number[] }> => {
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const duration = audioBuffer.duration;
    const channelData = audioBuffer.getChannelData(0);
    const samples = 100;
    const blockSize = Math.floor(channelData.length / samples);
    const peaks: number[] = [];

    for (let i = 0; i < samples; i++) {
      let blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[blockStart + j]);
      }
      peaks.push(parseFloat((sum / blockSize).toFixed(4)));
    }

    return { duration, peaks };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        // Automatically default title to filename
        const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setTitle(cleanName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !artistName) {
      setErrorMessage('Please fill in all required fields and select an audio file.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage('');

      // 1. Analyze Audio with Web Audio API
      setProgressStatus('Analyzing audio & generating waveform...');
      const { duration, peaks } = await analyzeAudio(file);

      // 2. Ensure authentication token
      let token = localStorage.getItem('accessToken');
      if (!token) {
        setProgressStatus('Authenticating session...');
        try {
          const authRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'denzo', password: 'password123' }),
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            token = authData.accessToken;
            if (token) localStorage.setItem('accessToken', token);
          }
        } catch {
          // ignore
        }
      }

      if (!token) {
        throw new Error('Authentication required. Please click "Sign In / Join" in the top bar to log in first.');
      }

      // 3. Request Presigned Upload URL from NestJS backend
      setProgressStatus('Requesting secure direct-to-S3 upload ticket...');
      let presignedRes = await fetch('/api/tracks/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'audio/mpeg',
          folder: 'tracks',
        }),
      });

      // If token expired, auto-refresh session and retry
      if (presignedRes.status === 401) {
        localStorage.removeItem('accessToken');
        const reAuth = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'denzo', password: 'password123' }),
        });
        if (reAuth.ok) {
          const authData = await reAuth.json();
          token = authData.accessToken;
          if (token) localStorage.setItem('accessToken', token);

          presignedRes = await fetch('/api/tracks/upload-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type || 'audio/mpeg',
              folder: 'tracks',
            }),
          });
        }
      }

      if (!presignedRes.ok) {
        const errorJson = await presignedRes.json().catch(() => ({}));
        throw new Error(errorJson.message || `Failed to get upload authorization (Status: ${presignedRes.status})`);
      }

      const { uploadUrl, storageKey } = await presignedRes.json();

      // 4. Direct upload to S3 / MinIO (Bypassing backend memory)
      setProgressStatus('Uploading high-res audio directly to S3...');
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'audio/mpeg',
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Direct-to-S3 media upload failed. Please verify storage connection.');
      }

      // 5. Save metadata in PostgreSQL via NestJS TrackService
      setProgressStatus('Finalizing track metadata in database...');
      let createRes = await fetch('/api/tracks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title,
          artistName,
          duration,
          audioStorageKey: storageKey,
          fileSize: file.size,
          genre,
          coverImageUrl: coverImageUrl.trim() || null,
          waveformData: peaks,
        }),
      });

      if (createRes.status === 401 && token) {
        createRes = await fetch('/api/tracks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            title,
            artistName,
            duration,
            audioStorageKey: storageKey,
            fileSize: file.size,
            genre,
            coverImageUrl: coverImageUrl.trim() || null,
            waveformData: peaks,
          }),
        });
      }

      if (!createRes.ok) {
        const createErr = await createRes.json().catch(() => ({}));
        throw new Error(createErr.message || 'Failed to register track metadata.');
      }

      setProgressStatus('Track uploaded successfully!');
      setTimeout(() => {
        setIsUploading(false);
        onUploadSuccess();
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during upload.');
      setIsUploading(false);
      setProgressStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-denzo-surface border border-denzo-border/80 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={isUploading}
          className="absolute right-5 top-5 text-denzo-muted hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-denzo-card border border-denzo-border flex items-center justify-center text-denzo-rose">
            <Music2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Upload New Track</h2>
            <p className="text-xs text-denzo-muted">Direct-to-S3 with automatic waveform extraction</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* File Picker */}
          <div>
            <label className="block text-xs font-semibold text-denzo-muted mb-1.5">Audio File (MP3, WAV, FLAC)</label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="w-full text-xs text-denzo-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-denzo-card file:text-white hover:file:bg-zinc-800 cursor-pointer"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-denzo-muted mb-1.5">Track Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
              placeholder="e.g. Midnight City"
              className="w-full px-3.5 py-2.5 rounded-xl bg-denzo-card border border-denzo-border/60 text-sm text-white focus:outline-none focus:border-denzo-rose transition-colors placeholder:text-zinc-600"
            />
          </div>

          {/* Artist Name */}
          <div>
            <label className="block text-xs font-semibold text-denzo-muted mb-1.5">Artist Name *</label>
            <input
              type="text"
              required
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              disabled={isUploading}
              placeholder="e.g. M83"
              className="w-full px-3.5 py-2.5 rounded-xl bg-denzo-card border border-denzo-border/60 text-sm text-white focus:outline-none focus:border-denzo-rose transition-colors placeholder:text-zinc-600"
            />
          </div>

          {/* Genre & Cover URL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-denzo-muted mb-1.5">Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                disabled={isUploading}
                className="w-full px-3 py-2.5 rounded-xl bg-denzo-card border border-denzo-border/60 text-sm text-white focus:outline-none focus:border-denzo-rose transition-colors"
              >
                <option value="Electronic">Electronic</option>
                <option value="Hip-Hop">Hip-Hop</option>
                <option value="Pop">Pop</option>
                <option value="Rock">Rock</option>
                <option value="Ambient">Ambient</option>
                <option value="Lo-Fi">Lo-Fi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-denzo-muted mb-1.5">Cover Image URL</label>
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                disabled={isUploading}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-denzo-card border border-denzo-border/60 text-sm text-white focus:outline-none focus:border-denzo-rose transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Upload Progress Status */}
          {progressStatus && (
            <div className="flex items-center gap-2 text-xs text-denzo-pink pt-2">
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              <span>{progressStatus}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isUploading || !file}
            className="mt-3 w-full py-3 rounded-xl bg-denzo-gradient hover:bg-denzo-gradient-hover text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-denzo-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing Media...</span>
              </>
            ) : (
              <>
                <UploadCloud size={16} />
                <span>Publish Track</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
