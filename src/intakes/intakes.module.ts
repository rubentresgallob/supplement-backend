import { Module } from '@nestjs/common';
import { IntakesController } from './intakes.controller';
import { IntakesService } from './intakes.service';
import { RewardsModule } from '../rewards/rewards.module';

@Module({
  imports: [RewardsModule],
  controllers: [IntakesController],
  providers: [IntakesService],
  exports: [IntakesService],
})
export class IntakesModule {}
