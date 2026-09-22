import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignedUrlResponse {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME', 'denzo-music-media');

    const endpoint = this.configService.get<string>('S3_ENDPOINT', 'http://localhost:9000');
    const region = this.configService.get<string>('S3_REGION', 'us-east-1');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY', 'minioadmin');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY', 'minioadmin123');
    const forcePathStyle = this.configService.get<string>('S3_FORCE_PATH_STYLE', 'true') === 'true';

    this.s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle, // Required for MinIO local S3
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(`Initialized S3 Storage Service connected to bucket: ${this.bucketName}`);
  }

  /**
   * Generates a Presigned PUT URL allowing the client to upload an audio/image file directly to S3.
   * Backend never buffers raw media files, ensuring maximum scalability.
   */
  async getUploadPresignedUrl(
    folder: 'tracks' | 'covers' | 'avatars',
    filename: string,
    contentType: string,
    expiresInSeconds: number = 900, // 15 minutes TTL
  ): Promise<PresignedUrlResponse> {
    const timestamp = Date.now();
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `${folder}/${timestamp}-${cleanFilename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      uploadUrl,
      storageKey,
      expiresInSeconds,
    };
  }

  /**
   * Generates a Presigned GET URL for streaming audio securely with HTTP 206 Byte-Range support.
   */
  async getStreamPresignedUrl(
    storageKey: string,
    expiresInSeconds: number = 3600, // 1 hour TTL
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  /**
   * Deletes an object from the S3 bucket.
   */
  async deleteFile(storageKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    await this.s3Client.send(command);
  }
}
