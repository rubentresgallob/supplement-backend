import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

/**
 * Protege endpoints de funciones Pro. Usar siempre DESPUÉS de JwtAuthGuard:
 *   @UseGuards(JwtAuthGuard, ProGuard)
 * Responde 403 con code "PRO_REQUIRED" para que la app muestre "Hazte Pro".
 */
@Injectable()
export class ProGuard implements CanActivate {
  constructor(private subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (req.user && (await this.subscriptionService.isPro(req.user.id))) {
      return true;
    }
    throw new ForbiddenException({
      statusCode: 403,
      code: 'PRO_REQUIRED',
      message: 'Esta función es del plan Pro',
    });
  }
}
