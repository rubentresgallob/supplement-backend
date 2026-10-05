import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * IP real del usuario. En Render todo entra por Cloudflare, que pone la IP del
 * cliente en CF-Connecting-IP (y la sobrescribe si el cliente intenta falsearla).
 * NO usar X-Forwarded-For: el cliente puede mandarla inventada y saltarse los límites.
 * En local no hay Cloudflare: se usa la IP de la conexión.
 */
export function clientIp(req: { headers: Record<string, unknown>; ip?: string }) {
  const cf = req.headers['cf-connecting-ip'];
  return (typeof cf === 'string' && cf) || req.ip || 'desconocida';
}

/** Los límites (@Throttle) se cuentan por la IP real, no por la del proxy. */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return clientIp(req as any);
  }
}
