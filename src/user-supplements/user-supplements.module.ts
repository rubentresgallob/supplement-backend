import { Module } from '@nestjs/common';
import { UserSupplementsController } from './user-supplements.controller';
import { UserSupplementsService } from './user-supplements.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [UserSupplementsController],
  providers: [UserSupplementsService, PrismaService],
  exports: [UserSupplementsService],
})
export class UserSupplementsModule {}
