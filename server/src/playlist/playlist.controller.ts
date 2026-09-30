import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PlaylistService } from './playlist.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

@Controller('playlists')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createPlaylist(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePlaylistDto,
  ) {
    return this.playlistService.createPlaylist(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getUserPlaylists(@Req() req: AuthenticatedRequest) {
    return this.playlistService.getUserPlaylists(req.user.id);
  }

  @Get(':id')
  getPlaylistById(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const user = (req as any).user;
    return this.playlistService.getPlaylistById(id, user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updatePlaylist(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePlaylistDto,
  ) {
    return this.playlistService.updatePlaylist(req.user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deletePlaylist(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.playlistService.deletePlaylist(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/tracks')
  addTrackToPlaylist(
    @Req() req: AuthenticatedRequest,
    @Param('id') playlistId: string,
    @Body('trackId') trackId: string,
  ) {
    return this.playlistService.addTrackToPlaylist(req.user.id, playlistId, trackId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/tracks/:trackId')
  removeTrackFromPlaylist(
    @Req() req: AuthenticatedRequest,
    @Param('id') playlistId: string,
    @Param('trackId') trackId: string,
  ) {
    return this.playlistService.removeTrackFromPlaylist(req.user.id, playlistId, trackId);
  }
}
