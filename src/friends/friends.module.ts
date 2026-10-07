import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { StreaksService } from '../streaks/streaks.service';
import { RewardsModule } from '../rewards/rewards.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [RewardsModule, CalendarModule],
  controllers: [FriendsController],
  providers: [FriendsService, StreaksService],
})
export class FriendsModule {}
