import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { StreaksService } from '../streaks/streaks.service';

@Module({
  controllers: [FriendsController],
  providers: [FriendsService, StreaksService],
})
export class FriendsModule {}
