import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AudioFormat } from '@prisma/client';

export class CreateTrackDto {
  @IsString()
  @IsNotEmpty({ message: 'Track title is required' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Artist name is required' })
  artistName!: string;

  @IsNumber()
  @Min(1, { message: 'Duration must be greater than 0 seconds' })
  duration!: number;

  @IsString()
  @IsNotEmpty({ message: 'Audio storage key is required' })
  audioStorageKey!: string;

  @IsEnum(AudioFormat, { message: 'Invalid audio format' })
  @IsOptional()
  audioFormat?: AudioFormat;

  @IsNumber()
  @Min(1, { message: 'File size must be greater than 0' })
  fileSize!: number;

  @IsNumber()
  @IsOptional()
  bitRate?: number;

  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @IsString()
  @IsOptional()
  genre?: string;

  @IsBoolean()
  @IsOptional()
  isExplicit?: boolean;

  @IsArray()
  @IsOptional()
  waveformData?: number[]; // Pre-computed waveform peaks (0.0 to 1.0)
}
