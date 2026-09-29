import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RequestUploadUrlDto {
  @IsString()
  @IsNotEmpty({ message: 'Filename is required' })
  filename!: string;

  @IsString()
  @IsNotEmpty({ message: 'Content type is required' })
  contentType!: string; // e.g. "audio/mpeg", "audio/flac", "image/jpeg"

  @IsIn(['tracks', 'covers'], { message: 'Folder must be either tracks or covers' })
  folder!: 'tracks' | 'covers';
}
