import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { isProEnabled } from './pro-plan';

/** Con PRO_ENABLED distinto de "true", las rutas de Pro responden 404 (como si no existieran). */
@Injectable()
export class ProEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!isProEnabled()) throw new NotFoundException();
    return true;
  }
}

/**
 * Protege endpoints de funciones Pro. Usar siempre DESPUÉS de JwtAuthGuard:
 *   @UseGuards(JwtAuthGuard, ProGuard)
 * Responde 403 con code "PRO_REQUIRED" para que la app muestre "Hazte Pro".
 */
@Injectable()
export class ProGuard implements CanActivate {
  constructor(private subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!isProEnabled()) throw new NotFoundException();
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
