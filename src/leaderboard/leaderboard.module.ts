import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { StreaksService } from '../streaks/streaks.service';

@Module({
  controllers: [LeaderboardController],
  providers: [LeaderboardService, PrismaService, StreaksService],
})
export class LeaderboardModule {}
