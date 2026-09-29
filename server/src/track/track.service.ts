import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { CreateTrackDto } from './dto/create-track.dto';
import { QueryTracksDto } from './dto/query-tracks.dto';

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
