import { Module } from '@nestjs/common';
import { StreaksController } from './streaks.controller';
import { StreaksService } from './streaks.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [StreaksController],
  providers: [StreaksService, PrismaService],
})
export class StreaksModule {}
