import { Module } from '@nestjs/common';
import { StreaksModule } from '../streaks/streaks.module';
import { RewardsController, ShopController } from './rewards.controller';
import { RewardsService } from './rewards.service';
import { ShopService } from './shop.service';

@Module({
  imports: [StreaksModule],
  controllers: [RewardsController, ShopController],
  providers: [RewardsService, ShopService],
  exports: [RewardsService],
})
export class RewardsModule {}
