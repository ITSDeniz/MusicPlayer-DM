import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { RedisService } from '../redis/redis.service';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { CreateTrackDto } from './dto/create-track.dto';
import { QueryTracksDto } from './dto/query-tracks.dto';
import { UpdateTrackDto } from './dto/update-track.dto';

export interface PaginatedTracksResult {
  items: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class TrackService {
  private readonly logger = new Logger(TrackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Generates a direct-to-S3 Presigned PUT URL.
   * Client uploads media directly without touching backend memory buffers.
   */
  async requestUploadUrl(userId: string, dto: RequestUploadUrlDto) {
    this.logger.log(`User ${userId} requested upload URL for ${dto.filename} (${dto.folder})`);
    return this.storageService.getUploadPresignedUrl(dto.folder, dto.filename, dto.contentType);
  }

  /**
   * Registers a new track record after the client uploads the file to S3.
   */
  async createTrack(uploaderId: string, dto: CreateTrackDto) {
    // 1. Find or create the artist by name
    let artist = await this.prisma.artist.findFirst({
      where: { name: { equals: dto.artistName.trim(), mode: 'insensitive' } },
    });

    if (!artist) {
      artist = await this.prisma.artist.create({
        data: {
          name: dto.artistName.trim(),
        },
      });
    }

    // 2. Persist track metadata in PostgreSQL
    const track = await this.prisma.track.create({
      data: {
        title: dto.title.trim(),
        duration: dto.duration,
        audioStorageKey: dto.audioStorageKey,
        audioFormat: dto.audioFormat ?? 'MP3',
        fileSize: BigInt(dto.fileSize),
        bitRate: dto.bitRate,
        coverImageUrl: dto.coverImageUrl,
        genre: dto.genre?.trim(),
        isExplicit: dto.isExplicit ?? false,
        waveformData: dto.waveformData ? (dto.waveformData as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        artistId: artist.id,
        uploaderId,
      },
      include: {
        artist: true,
      },
    });

    const streamUrl = await this.storageService.getStreamPresignedUrl(track.audioStorageKey);

    // Invalidate Redis feed & top caches
    await this.redis.delByPattern('tracks:*');

    return {
      ...track,
      fileSize: track.fileSize.toString(),
      playCount: track.playCount.toString(),
      streamUrl,
    };
  }

  /**
   * High-performance Cursor-based Pagination feed for tracks.
   * Supports search across indexed title, artist, and genre.
   */
  async getTracks(dto: QueryTracksDto, currentUserId?: string): Promise<PaginatedTracksResult> {
    const limit = dto.limit ?? 20;

    // 1. Check Redis cache for first-page public feed requests
    const isFirstPagePublic = !dto.cursor && !currentUserId;
    const cacheKey = `tracks:feed:${dto.genre || 'all'}:${dto.search || ''}:${limit}`;

    if (isFirstPagePublic) {
      const cached = await this.redis.get<PaginatedTracksResult>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const where: Prisma.TrackWhereInput = {};

    if (dto.genre) {
      where.genre = { equals: dto.genre, mode: 'insensitive' };
    }

    if (dto.artistId) {
      where.artistId = dto.artistId;
    }

    if (dto.search) {
      const search = dto.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { name: { contains: search, mode: 'insensitive' } } },
        { genre: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch limit + 1 items to determine if a next page exists without extra COUNT queries
    const tracks = await this.prisma.track.findMany({
      where,
      take: limit + 1,
      cursor: dto.cursor ? { id: dto.cursor } : undefined,
      skip: dto.cursor ? 1 : 0,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        artist: {
          select: { id: true, name: true, avatarUrl: true },
        },
        likes: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { userId: true },
            }
          : false,
      },
    });

    const hasMore = tracks.length > limit;
    const items = hasMore ? tracks.slice(0, limit) : tracks;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Attach fresh signed streaming URLs in parallel
    const tracksWithUrls = await Promise.all(
      items.map(async (t) => {
        let streamUrl: string;
        try {
          streamUrl = await this.storageService.getStreamPresignedUrl(t.audioStorageKey);
        } catch {
          streamUrl = '';
        }

        const isLiked = currentUserId && Array.isArray((t as any).likes)
          ? (t as any).likes.length > 0
          : false;

        return {
          id: t.id,
          title: t.title,
          duration: t.duration,
          audioFormat: t.audioFormat,
          coverImageUrl: t.coverImageUrl,
          genre: t.genre,
          playCount: t.playCount.toString(),
          isExplicit: t.isExplicit,
          waveformData: t.waveformData,
          createdAt: t.createdAt,
          artist: t.artist,
          streamUrl,
          isLiked,
          uploaderId: t.uploaderId,
        };
      }),
    );

    const result: PaginatedTracksResult = {
      items: tracksWithUrls,
      nextCursor,
      hasMore,
    };

    // Cache first-page public queries for 60 seconds
    if (isFirstPagePublic) {
      await this.redis.set(cacheKey, result, 60);
    }

    return result;
  }

  /**
   * Retrieves tracks liked by the user.
   */
  async getLikedTracks(userId: string, dto: QueryTracksDto): Promise<PaginatedTracksResult> {
    const limit = dto.limit ?? 20;
    const where: Prisma.TrackWhereInput = {
      likes: {
        some: {
          userId,
        },
      },
    };

    if (dto.search) {
      const search = dto.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { name: { contains: search, mode: 'insensitive' } } },
        { genre: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tracks = await this.prisma.track.findMany({
      where,
      take: limit + 1,
      cursor: dto.cursor ? { id: dto.cursor } : undefined,
      skip: dto.cursor ? 1 : 0,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        artist: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    const hasMore = tracks.length > limit;
    const items = hasMore ? tracks.slice(0, limit) : tracks;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const tracksWithUrls = await Promise.all(
      items.map(async (t) => {
        let streamUrl: string;
        try {
          streamUrl = await this.storageService.getStreamPresignedUrl(t.audioStorageKey);
        } catch {
          streamUrl = '';
        }

        return {
          id: t.id,
          title: t.title,
          duration: t.duration,
          audioFormat: t.audioFormat,
          coverImageUrl: t.coverImageUrl,
          genre: t.genre,
          playCount: t.playCount.toString(),
          isExplicit: t.isExplicit,
          waveformData: t.waveformData,
          createdAt: t.createdAt,
          artist: t.artist,
          streamUrl,
          isLiked: true,
          uploaderId: t.uploaderId,
        };
      }),
    );

    return {
      items: tracksWithUrls,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Updates track metadata (title, artist, genre, coverImageUrl).
   * Only the track's uploader or an ADMIN can perform updates.
   */
  async updateTrack(userId: string, trackId: string, dto: UpdateTrackDto, userRole?: string) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: { artist: true },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.uploaderId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only edit your own tracks');
    }

    let artistId = track.artistId;
    if (dto.artistName && dto.artistName.trim() !== track.artist?.name) {
      let artist = await this.prisma.artist.findFirst({
        where: { name: { equals: dto.artistName.trim(), mode: 'insensitive' } },
      });

      if (!artist) {
        artist = await this.prisma.artist.create({
          data: { name: dto.artistName.trim() },
        });
      }
      artistId = artist.id;
    }

    const updated = await this.prisma.track.update({
      where: { id: trackId },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.genre !== undefined ? { genre: dto.genre?.trim() } : {}),
        ...(dto.coverImageUrl !== undefined ? { coverImageUrl: dto.coverImageUrl } : {}),
        artistId,
      },
      include: {
        artist: true,
      },
    });

    let streamUrl: string;
    try {
      streamUrl = await this.storageService.getStreamPresignedUrl(updated.audioStorageKey);
    } catch {
      streamUrl = '';
    }

    return {
      ...updated,
      fileSize: updated.fileSize.toString(),
      playCount: updated.playCount.toString(),
      streamUrl,
      uploaderId: updated.uploaderId,
    };
  }

  /**
   * Deletes a track record and cleans up the associated S3 audio file.
   * Only the track's uploader or an ADMIN can delete the track.
   */
  async deleteTrack(userId: string, trackId: string, userRole?: string) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.uploaderId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own tracks');
    }

    // Clean up S3 audio file
    try {
      await this.storageService.deleteFile(track.audioStorageKey);
    } catch (err: any) {
      this.logger.warn(`Failed to delete S3 file ${track.audioStorageKey}: ${err?.message}`);
    }

    // Decrement playlist counters for playlists containing this track
    try {
      const playlistTracks = await this.prisma.playlistTrack.findMany({
        where: { trackId },
        include: { playlist: true },
      });
      for (const pt of playlistTracks) {
        await this.prisma.playlist.update({
          where: { id: pt.playlistId },
          data: {
            trackCount: { decrement: 1 },
            totalDuration: { decrement: Math.min(pt.playlist.totalDuration, track.duration || 0) },
          },
        }).catch(() => {});
      }
    } catch (err: any) {
      this.logger.warn(`Failed to update playlist stats on track deletion: ${err?.message}`);
    }

    await this.prisma.track.delete({
      where: { id: trackId },
    });

    // Invalidate Redis cache
    await this.redis.delByPattern('tracks:*');

    return { success: true, message: 'Track deleted successfully' };
  }

  /**
   * Retrieves Top Charts (most played tracks) with Redis caching.
   */
  async getTopTracks(limit: number = 10) {
    const cacheKey = `tracks:top:${limit}`;
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) return cached;

    const tracks = await this.prisma.track.findMany({
      take: limit,
      orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
      include: {
        artist: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const withUrls = await Promise.all(
      tracks.map(async (t) => {
        let streamUrl = '';
        try {
          streamUrl = await this.storageService.getStreamPresignedUrl(t.audioStorageKey);
        } catch {}
        return {
          id: t.id,
          title: t.title,
          duration: t.duration,
          audioFormat: t.audioFormat,
          coverImageUrl: t.coverImageUrl,
          genre: t.genre,
          playCount: t.playCount.toString(),
          isExplicit: t.isExplicit,
          waveformData: t.waveformData,
          createdAt: t.createdAt,
          artist: t.artist,
          streamUrl,
          uploaderId: t.uploaderId,
        };
      }),
    );

    await this.redis.set(cacheKey, withUrls, 120); // 2 minutes TTL
    return withUrls;
  }

  /**
   * Records a track play and persists listen history.
   */
  async recordPlay(trackId: string, userId?: string, durationPlayed: number = 0) {
    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track) throw new NotFoundException('Track not found');

    const updated = await this.prisma.track.update({
      where: { id: trackId },
      data: { playCount: { increment: 1 } },
      select: { id: true, playCount: true },
    });

    if (userId) {
      await this.prisma.listenHistory.create({
        data: {
          userId,
          trackId,
          durationPlayed,
          completed:
            track.duration && track.duration < 30
              ? durationPlayed >= Math.max(5, track.duration * 0.8)
              : durationPlayed >= 30,
        },
      }).catch((err) => {
        this.logger.warn(`Failed to create listen history: ${err.message}`);
      });
    }

    return { success: true, playCount: updated.playCount.toString() };
  }

  /**
   * Retrieves recently listened tracks for the user.
   */
  async getListenHistory(userId: string, limit: number = 20) {
    const history = await this.prisma.listenHistory.findMany({
      where: { userId },
      take: limit,
      orderBy: { listenedAt: 'desc' },
      include: {
        track: {
          include: {
            artist: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    const items = await Promise.all(
      history.map(async (h) => {
        let streamUrl = '';
        try {
          streamUrl = await this.storageService.getStreamPresignedUrl(h.track.audioStorageKey);
        } catch {}
        return {
          id: h.track.id,
          title: h.track.title,
          duration: h.track.duration,
          audioFormat: h.track.audioFormat,
          coverImageUrl: h.track.coverImageUrl,
          genre: h.track.genre,
          playCount: h.track.playCount.toString(),
          isExplicit: h.track.isExplicit,
          waveformData: h.track.waveformData,
          createdAt: h.track.createdAt,
          artist: h.track.artist,
          streamUrl,
          uploaderId: h.track.uploaderId,
          listenedAt: h.listenedAt,
        };
      }),
    );

    return items;
  }

  /**
   * Retrieves single track with fresh streaming URL and increments play counter.
   */
  async getTrackById(id: string, currentUserId?: string) {
    const track = await this.prisma.track.update({
      where: { id },
      data: {
        playCount: { increment: 1 },
      },
      include: {
        artist: true,
        album: true,
        likes: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { userId: true },
            }
          : false,
      },
    }).catch(() => null);

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const streamUrl = await this.storageService.getStreamPresignedUrl(track.audioStorageKey);
    const isLiked = currentUserId && Array.isArray((track as any).likes)
      ? (track as any).likes.length > 0
      : false;

    return {
      ...track,
      fileSize: track.fileSize.toString(),
      playCount: track.playCount.toString(),
      streamUrl,
      isLiked,
    };
  }

  /**
   * Toggles like/favorite state for the given user and track.
   */
  async toggleLike(userId: string, trackId: string) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const existingLike = await this.prisma.trackLike.findUnique({
      where: {
        userId_trackId: {
          userId,
          trackId,
        },
      },
    });

    if (existingLike) {
      await this.prisma.trackLike.delete({
        where: {
          userId_trackId: {
            userId,
            trackId,
          },
        },
      });
      return { isLiked: false };
    } else {
      await this.prisma.trackLike.create({
        data: {
          userId,
          trackId,
        },
      });
      return { isLiked: true };
    }
  }
}
