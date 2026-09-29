import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TrackService } from './track.service';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { CreateTrackDto } from './dto/create-track.dto';
import { QueryTracksDto } from './dto/query-tracks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

@Controller('tracks')
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-url')
  requestUploadUrl(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RequestUploadUrlDto,
  ) {
    return this.trackService.requestUploadUrl(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  createTrack(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateTrackDto,
  ) {
    return this.trackService.createTrack(req.user.id, dto);
  }

  @Get()
  getTracks(@Query() dto: QueryTracksDto) {
    return this.trackService.getTracks(dto);
  }

  @Get(':id')
  getTrackById(@Param('id') id: string) {
    return this.trackService.getTrackById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  toggleLike(
    @Req() req: AuthenticatedRequest,
    @Param('id') trackId: string,
  ) {
    return this.trackService.toggleLike(req.user.id, trackId);
  }
}
