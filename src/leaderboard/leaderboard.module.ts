import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { StreaksService } from '../streaks/streaks.service';
import { RewardsModule } from '../rewards/rewards.module';

@Module({
  imports: [RewardsModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService, StreaksService],
})
export class LeaderboardModule {}
