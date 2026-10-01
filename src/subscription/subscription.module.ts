import { Global, Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { ProGuard } from './pro.guard';

/** Global: cualquier módulo puede usar ProGuard o SubscriptionService sin importarlo. */
@Global()
@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, ProGuard],
  exports: [SubscriptionService, ProGuard],
})
export class SubscriptionModule {}
