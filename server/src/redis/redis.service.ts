import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    try {
      this.client = new Redis({
        host,
        port,
        maxRetriesPerRequest: 2,
        lazyConnect: false,
        enableOfflineQueue: false,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Connected to Redis at ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection warning: ${err.message}`);
      });
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`Failed to initialize Redis client: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // ignore on exit
      }
    }
  }

  /**
   * Retrieves parsed JSON value from Redis.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      const data = await this.client.get(key);
      return data ? (JSON.parse(data) as T) : null;
    } catch (err: any) {
      this.logger.warn(`Redis GET error for key ${key}: ${err.message}`);
      return null;
    }
  }

  /**
   * Serializes and sets a value in Redis with optional TTL in seconds.
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err: any) {
      this.logger.warn(`Redis SET error for key ${key}: ${err.message}`);
    }
  }

  /**
   * Deletes a specific key.
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.del(key);
    } catch (err: any) {
      this.logger.warn(`Redis DEL error for key ${key}: ${err.message}`);
    }
  }

  /**
   * Deletes all keys matching a glob pattern using SCAN for zero latency impact.
   */
  async delByPattern(pattern: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      const stream = this.client.scanStream({
        match: pattern,
        count: 100,
      });

      stream.on('data', async (keys: string[]) => {
        if (keys.length > 0 && this.client) {
          const pipeline = this.client.pipeline();
          keys.forEach((key) => pipeline.del(key));
          await pipeline.exec();
        }
      });
    } catch (err: any) {
      this.logger.warn(`Redis DEL pattern error for ${pattern}: ${err.message}`);
    }
  }
}
