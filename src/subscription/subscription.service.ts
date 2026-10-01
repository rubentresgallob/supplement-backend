import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { addDays } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import {
  isProActive,
  isProTestMode,
  PRO_FEATURES,
  PRO_PRICES,
  PRO_TRIAL_DAYS,
} from './pro-plan';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private prisma: PrismaService) {}

  async isPro(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pro_until: true },
    });
    return isProActive(user?.pro_until);
  }

  async getStatus(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pro_until: true, pro_source: true },
    });
    const isPro = isProActive(user?.pro_until);
    return {
      isPro,
      proUntil: isPro ? user?.pro_until : null,
      source: isPro ? user?.pro_source : null,
      testMode: isProTestMode(),
      trialDays: PRO_TRIAL_DAYS,
      prices: PRO_PRICES,
      features: PRO_FEATURES,
    };
  }

  /** Solo con PRO_TEST_MODE=true: activa Pro sin pagar para poder probarlo. */
  async activateTest(userId: number, days = 30) {
    this.assertTestMode();
    await this.prisma.user.update({
      where: { id: userId },
      data: { pro_until: addDays(new Date(), days), pro_source: 'test' },
    });
    this.logger.log(`Pro de prueba activado para el usuario ${userId} (${days} días)`);
    return this.getStatus(userId);
  }

  async deactivateTest(userId: number) {
    this.assertTestMode();
    await this.prisma.user.update({
      where: { id: userId },
      data: { pro_until: null, pro_source: null },
    });
    return this.getStatus(userId);
  }

  private assertTestMode() {
    if (!isProTestMode()) {
      throw new ForbiddenException('El modo de prueba de Pro está desactivado');
    }
  }
}
