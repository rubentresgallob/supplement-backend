import { Module } from '@nestjs/common';
import { IntakesController } from './intakes.controller';
import { IntakesService } from './intakes.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [IntakesController],
  providers: [IntakesService, PrismaService],
  exports: [IntakesService],
})
export class IntakesModule {}
