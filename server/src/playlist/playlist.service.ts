import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';

@Injectable()
export class PlaylistService {
  private readonly logger = new Logger(PlaylistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Creates a new playlist for the authenticated user.
   */
  async createPlaylist(userId: string, dto: CreatePlaylistDto) {
    return this.prisma.playlist.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        coverImageUrl: dto.coverImageUrl,
        isPublic: dto.isPublic ?? true,
        ownerId: userId,
      },
      include: {
        owner: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * Retrieves all playlists owned by the authenticated user.
   */
  async getUserPlaylists(userId: string) {
    return this.prisma.playlist.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { tracks: true },
        },
      },
    });
  }

  /**
   * Retrieves a single playlist by ID along with its ordered tracks and signed audio stream URLs.
   */
  async getPlaylistById(id: string, currentUserId?: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, username: true, avatarUrl: true },
        },
        tracks: {
          orderBy: { order: 'asc' },
          include: {
            track: {
              include: {
                artist: true,
                likes: currentUserId
                  ? {
                      where: { userId: currentUserId },
                      select: { userId: true },
                    }
                  : false,
              },
            },
          },
        },
      },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (!playlist.isPublic && playlist.ownerId !== currentUserId) {
      throw new ForbiddenException('This playlist is private');
    }

    // Attach fresh signed streaming URLs to tracks in parallel
    const tracksWithUrls = await Promise.all(
      playlist.tracks.map(async (pt) => {
        let streamUrl = '';
        try {
          streamUrl = await this.storageService.getStreamPresignedUrl(pt.track.audioStorageKey);
        } catch {
          streamUrl = '';
        }

        const isLiked = currentUserId && Array.isArray((pt.track as any).likes)
          ? (pt.track as any).likes.length > 0
          : false;

        return {
          id: pt.track.id,
          title: pt.track.title,
          duration: pt.track.duration,
          audioFormat: pt.track.audioFormat,
          coverImageUrl: pt.track.coverImageUrl,
          genre: pt.track.genre,
          playCount: pt.track.playCount.toString(),
          isExplicit: pt.track.isExplicit,
          waveformData: pt.track.waveformData,
          createdAt: pt.track.createdAt,
          artist: pt.track.artist,
          streamUrl,
          isLiked,
          uploaderId: pt.track.uploaderId,
          order: pt.order,
          addedAt: pt.addedAt,
        };
      }),
    );

    const calculatedDuration = tracksWithUrls.reduce((acc, t) => acc + (t.duration || 0), 0);

    return {
      ...playlist,
      totalDuration: calculatedDuration,
      trackCount: tracksWithUrls.length,
      tracks: tracksWithUrls,
    };
  }

  /**
   * Updates playlist metadata (title, description, cover image, visibility).
   */
  async updatePlaylist(userId: string, id: string, dto: UpdatePlaylistDto) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.ownerId !== userId) {
      throw new ForbiddenException('You can only edit your own playlist');
    }

    return this.prisma.playlist.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() } : {}),
        ...(dto.coverImageUrl !== undefined ? { coverImageUrl: dto.coverImageUrl } : {}),
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
      },
      include: {
        owner: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * Deletes a playlist.
   */
  async deletePlaylist(userId: string, id: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own playlist');
    }

    await this.prisma.playlist.delete({
      where: { id },
    });

    return { success: true, message: 'Playlist deleted successfully' };
  }

  /**
   * Atomically adds a track to a playlist and increments track count & duration.
   */
  async addTrackToPlaylist(userId: string, playlistId: string, trackId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.ownerId !== userId) {
      throw new ForbiddenException('You can only add tracks to your own playlist');
    }

    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    // Check if track is already in playlist
    const existing = await this.prisma.playlistTrack.findUnique({
      where: {
        playlistId_trackId: {
          playlistId,
          trackId,
        },
      },
    });

    if (existing) {
      return { success: true, message: 'Track is already in playlist' };
    }

    // Determine highest order
    const lastItem = await this.prisma.playlistTrack.findFirst({
      where: { playlistId },
      orderBy: { order: 'desc' },
    });

    const nextOrder = (lastItem?.order ?? -1) + 1;

    // Atomic transaction
    await this.prisma.$transaction([
      this.prisma.playlistTrack.create({
        data: {
          playlistId,
          trackId,
          order: nextOrder,
        },
      }),
      this.prisma.playlist.update({
        where: { id: playlistId },
        data: {
          trackCount: { increment: 1 },
          totalDuration: { increment: track.duration },
        },
      }),
    ]);

    return { success: true, message: 'Track added to playlist' };
  }

  /**
   * Removes a track from a playlist and decrements track count & duration.
   */
  async removeTrackFromPlaylist(userId: string, playlistId: string, trackId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.ownerId !== userId) {
      throw new ForbiddenException('You can only remove tracks from your own playlist');
    }

    const playlistTrack = await this.prisma.playlistTrack.findUnique({
      where: {
        playlistId_trackId: {
          playlistId,
          trackId,
        },
      },
      include: { track: true },
    });

    if (!playlistTrack) {
      throw new NotFoundException('Track is not in this playlist');
    }

    const newTrackCount = Math.max(0, playlist.trackCount - 1);
    const newTotalDuration = Math.max(0, playlist.totalDuration - (playlistTrack.track.duration || 0));

    // Atomic transaction
    await this.prisma.$transaction([
      this.prisma.playlistTrack.delete({
        where: {
          playlistId_trackId: {
            playlistId,
            trackId,
          },
        },
      }),
      this.prisma.playlist.update({
        where: { id: playlistId },
        data: {
          trackCount: newTrackCount,
          totalDuration: newTotalDuration,
        },
      }),
    ]);

    return { success: true, message: 'Track removed from playlist' };
  }
}
