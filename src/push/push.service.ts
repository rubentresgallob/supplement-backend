import { Injectable, Logger } from '@nestjs/common';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';

export interface PushMessage {
  title: string;
  body: string;
  /** Datos extra para la app (solo texto). */
  data?: Record<string, string>;
}

/** Errores de FCM que significan que el token ya no sirve (app desinstalada, etc.). */
const DEAD_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/**
 * Notificaciones push con Firebase Cloud Messaging.
 *
 * Variable de entorno:
 *   FIREBASE_SERVICE_ACCOUNT  JSON de la cuenta de servicio de Firebase (en una línea).
 *                             Firebase > Configuración del proyecto > Cuentas de servicio >
 *                             Generar nueva clave privada.
 *
 * Sin ella no se envía nada: el aviso se escribe en el log (útil para probar en local).
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private app: App | null | undefined;

  constructor(private prisma: PrismaService) {}

  private get firebase(): App | null {
    if (this.app !== undefined) return this.app;
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) return (this.app = null);
    try {
      this.app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(raw)) });
    } catch (e) {
      this.logger.error(`FIREBASE_SERVICE_ACCOUNT no es válido: ${(e as Error).message}`);
      this.app = null;
    }
    return this.app;
  }

  /** Guarda el token de un móvil. Si el móvil era de otra cuenta, pasa a esta. */
  async saveToken(userId: number, token: string, platform: string) {
    await this.prisma.push_token.upsert({
      where: { token },
      create: { user_id: userId, token, platform },
      update: { user_id: userId, platform },
    });
    return { saved: true };
  }

  /** Al cerrar sesión: ese móvil deja de recibir avisos de esta cuenta. */
  async removeToken(userId: number, token: string) {
    await this.prisma.push_token.deleteMany({ where: { user_id: userId, token } });
    return { removed: true };
  }

  /**
   * Envía un aviso a todos los móviles del usuario.
   * Devuelve cuántos lo han recibido (0 si no tiene la app con avisos activados).
   */
  async sendToUser(userId: number, message: PushMessage): Promise<number> {
    const tokens = (
      await this.prisma.push_token.findMany({ where: { user_id: userId }, select: { token: true } })
    ).map((t) => t.token);
    if (tokens.length === 0) return 0;

    const app = this.firebase;
    if (!app) {
      // Sin datos personales en el log: solo IDs
      this.logger.warn(`[SIN FIREBASE] Push a usuario ${userId} (${tokens.length} móviles)`);
      return 0;
    }

    const result = await getMessaging(app).sendEachForMulticast({
      tokens,
      notification: { title: message.title, body: message.body },
      data: message.data,
      android: {
        priority: 'high',
        notification: { channelId: 'friends', icon: 'ic_stat_capsu', color: '#FF6B35' },
      },
      apns: { payload: { aps: { sound: 'default' } } },
    });

    const dead = result.responses
      .map((r, i) => (!r.success && DEAD_TOKEN_ERRORS.has(r.error?.code ?? '') ? tokens[i] : null))
      .filter((t): t is string => t !== null);
    if (dead.length) {
      await this.prisma.push_token.deleteMany({ where: { token: { in: dead } } });
    }
    return result.successCount;
  }
}

