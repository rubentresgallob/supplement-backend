import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { PrismaService } from '../prisma/prisma.service';
import { StreaksService } from '../streaks/streaks.service';

@Module({
  controllers: [FriendsController],
  providers: [FriendsService, PrismaService, StreaksService],
})
export class FriendsModule {}
