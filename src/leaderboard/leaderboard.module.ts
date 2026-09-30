import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { StreaksService } from '../streaks/streaks.service';

@Module({
  controllers: [LeaderboardController],
  providers: [LeaderboardService, StreaksService],
})
export class LeaderboardModule {}
