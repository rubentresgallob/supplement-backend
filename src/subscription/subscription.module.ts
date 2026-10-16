import { Global, Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { ProEnabledGuard, ProGuard } from './pro.guard';

/** Global: cualquier módulo puede usar ProGuard o SubscriptionService sin importarlo. */
@Global()
@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, ProGuard, ProEnabledGuard],
  exports: [SubscriptionService, ProGuard, ProEnabledGuard],
})
export class SubscriptionModule {}
