import { Injectable, Logger } from '@nestjs/common';
import { addDays, subDays, subHours, subMonths } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

/** Plazos de conservación (Política de privacidad). */
export const UNVERIFIED_TTL_HOURS = 24; // cuentas sin verificar
export const INACTIVE_MONTHS = 24; // sin iniciar sesión → aviso
export const INACTIVE_WARNING_DAYS = 30; // del aviso al borrado

/** Fechas límite de cada regla para "ahora". */
export function retentionCutoffs(now = new Date()) {
  return {
    unverifiedBefore: subHours(now, UNVERIFIED_TTL_HOURS),
    inactiveBefore: subMonths(now, INACTIVE_MONTHS),
    warnedBefore: subDays(now, INACTIVE_WARNING_DAYS),
  };
}

/**
 * Conservación de datos:
 * 1. Borra las cuentas sin verificar de más de 24 h.
 * 2. Avisa por email a quien lleva 24 meses sin entrar: se borrará en 30 días.
 * 3. Borra (en cascada, como un borrado normal) a quien recibió el aviso hace
 *    30 días o más y no ha vuelto a entrar. Entrar después del aviso lo anula.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async run(now = new Date()) {
    const { unverifiedBefore, inactiveBefore, warnedBefore } = retentionCutoffs(now);

    const unverified = await this.prisma.user.deleteMany({
      where: { email_verified: false, created_at: { lt: unverifiedBefore } },
    });

    // Último acceso = last_login_at o, si nunca se registró, la fecha de alta
    const toWarn = await this.prisma.user.findMany({
      where: {
        email_verified: true,
        inactivity_warned_at: null,
        OR: [
          { last_login_at: { lt: inactiveBefore } },
          { last_login_at: null, created_at: { lt: inactiveBefore } },
        ],
      },
      select: { id: true, email: true, username: true },
      take: 100, // el límite diario de emails es de 250
    });
    let warned = 0;
    for (const user of toWarn) {
      try {
        await this.sendWarning(user, addDays(now, INACTIVE_WARNING_DAYS));
        await this.prisma.user.update({ where: { id: user.id }, data: { inactivity_warned_at: now } });
        warned++;
      } catch {
        this.logger.error(`No se pudo avisar de inactividad al usuario ${user.id}`);
      }
    }

    const deleted = await this.prisma.user.deleteMany({
      where: { inactivity_warned_at: { lt: warnedBefore } },
    });

    const result = { unverifiedDeleted: unverified.count, warned, inactiveDeleted: deleted.count };
    this.logger.log(`Conservación: ${JSON.stringify(result)}`);
    return result;
  }

  private async sendWarning(user: { email: string; username: string }, deleteOn: Date) {
    const date = deleteOn.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    await this.mail.send(
      user.email,
      'Tu cuenta se borrará en 30 días',
      `<div style="font-family:system-ui,sans-serif;max-width:420px">
        <h2>¿Sigues ahí?</h2>
        <p>Hola ${user.username}, hace ${INACTIVE_MONTHS} meses que no entras en Supplement Tracker.</p>
        <p>Para no guardar datos que ya no usas, <strong>borraremos tu cuenta y todos sus datos el ${date}</strong>.</p>
        <p>Si quieres conservarla, solo tienes que iniciar sesión en la app antes de esa fecha.</p>
        <p style="color:#888">Supplement Tracker</p>
      </div>`,
      `Hace ${INACTIVE_MONTHS} meses que no entras en Supplement Tracker. Borraremos tu cuenta y todos sus datos el ${date}. Para conservarla, inicia sesión en la app antes de esa fecha.`,
    );
  }
}
