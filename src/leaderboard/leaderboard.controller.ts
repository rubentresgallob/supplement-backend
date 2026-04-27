import { Controller, Get, Request, UseGuards, Logger } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Leaderboard')
@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeaderboardController {
  private readonly logger = new Logger(LeaderboardController.name);

  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('friends')
  @ApiOperation({ summary: 'Get friends leaderboard ranked by global streak' })
  @ApiResponse({ status: 200, description: 'Friends leaderboard with current user included' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFriendsLeaderboard(@Request() req) {
    this.logger.log(
      `Fetching friends leaderboard for user ID: ${req.user.id}`,
    );
    return this.leaderboardService.getFriendsLeaderboard(req.user.id);
  }

  @Get('adherence')
  @ApiOperation({ summary: 'Get friends leaderboard ranked by adherence percentage (last 30 days)' })
  @ApiResponse({ status: 200, description: 'Adherence leaderboard with current user included' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAdherenceLeaderboard(@Request() req) {
    this.logger.log(
      `Fetching adherence leaderboard for user ID: ${req.user.id}`,
    );
    return this.leaderboardService.getAdherenceLeaderboard(req.user.id);
  }
}
