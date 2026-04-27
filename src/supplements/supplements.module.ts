import { Module } from '@nestjs/common';
import { SupplementsController } from './supplements.controller';
import { SupplementsService } from './supplements.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SupplementsController],
  providers: [SupplementsService, PrismaService],
})
export class SupplementsModule {}
