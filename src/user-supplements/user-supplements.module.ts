import { Module } from '@nestjs/common';
import { UserSupplementsController } from './user-supplements.controller';
import { UserSupplementsService } from './user-supplements.service';

@Module({
  controllers: [UserSupplementsController],
  providers: [UserSupplementsService],
  exports: [UserSupplementsService],
})
export class UserSupplementsModule {}
