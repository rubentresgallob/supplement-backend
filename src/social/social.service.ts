import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

export const REPORT_REASONS = {
  offensive_name: 'Nombre ofensivo',
  impersonation: 'Suplantación',
  harassment: 'Acoso',
  other: 'Otro',
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;

/** ¿Alguno de los dos ha bloqueado al otro? */
export async function isBlockedEitherWay(prisma: PrismaService, a: number, b: number) {
  const block = await prisma.user_block.findFirst({
    where: {
      OR: [
        { blocker_id: a, blocked_id: b },
        { blocker_id: b, blocked_id: a },
      ],
    },
    select: { id: true },
  });
  return !!block;
}

/**
 * Bloquear y denunciar usuarios (norma 1.2 de Apple y política de contenido
 * generado por usuarios de Google Play).
 */
@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  private async assertUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, username: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /** Bloquear: borra la amistad (o la solicitud) y oculta mutuamente los perfiles. */
  async block(userId: number, targetId: number) {
    if (userId === targetId) throw new BadRequestException('No puedes bloquearte a ti mismo');
    await this.assertUser(targetId);
    await this.prisma.$transaction([
      this.prisma.friendship.deleteMany({
        where: {
          OR: [
            { requester_id: userId, receiver_id: targetId },
            { requester_id: targetId, receiver_id: userId },
          ],
        },
      }),
      this.prisma.user_block.upsert({
        where: { blocker_id_blocked_id: { blocker_id: userId, blocked_id: targetId } },
        create: { blocker_id: userId, blocked_id: targetId },
        update: {},
      }),
    ]);
    this.logger.log(`Usuario ${userId} bloquea a ${targetId}`);
    return { blocked: true };
  }

  async unblock(userId: number, targetId: number) {
    await this.prisma.user_block.deleteMany({ where: { blocker_id: userId, blocked_id: targetId } });
    this.logger.log(`Usuario ${userId} desbloquea a ${targetId}`);
    return { blocked: false };
  }

  /** Personas que he bloqueado (para deshacerlo desde Perfil). */
  async listBlocked(userId: number) {
    const blocks = await this.prisma.user_block.findMany({
      where: { blocker_id: userId },
      include: { blocked: { select: { id: true, username: true } } },
      orderBy: { created_at: 'desc' },
    });
    return blocks.map((b) => ({ id: b.blocked.id, username: b.blocked.username, since: b.created_at }));
  }

  /**
   * Denuncia: se guarda y se avisa por email al administrador (ADMIN_EMAIL).
   * El email lleva ids, nombre de usuario, motivo y el texto del denunciante:
   * nunca datos de salud.
   */
  async report(userId: number, targetId: number, reason: ReportReason, details?: string) {
    if (userId === targetId) throw new BadRequestException('No puedes denunciarte a ti mismo');
    const target = await this.assertUser(targetId);
    const text = details?.trim() || null;
    const report = await this.prisma.user_report.create({
      data: { reporter_id: userId, reported_id: targetId, reason, details: text },
    });
    this.logger.log(`Denuncia ${report.id}: usuario ${userId} denuncia a ${targetId} (${reason})`);

    const admin = process.env.ADMIN_EMAIL;
    if (admin) {
      const lines = [
        `Denuncia n.º ${report.id}`,
        `Denunciado: ${target.username} (id ${target.id})`,
        `Denunciante: id ${userId}`,
        `Motivo: ${REPORT_REASONS[reason]}`,
        `Detalles: ${text ?? '(sin texto)'}`,
        '',
        'Moderar: npx tsx --env-file=.env scripts/moderar.ts (ver el README del script).',
      ];
      try {
        await this.mail.send(
          admin,
          `Denuncia n.º ${report.id}: ${REPORT_REASONS[reason]}`,
          `<pre style="font-family:system-ui,sans-serif">${lines.map(escapeHtml).join('\n')}</pre>`,
          lines.join('\n'),
        );
      } catch {
        // La denuncia ya está guardada; el aviso por email es un extra
        this.logger.error(`No se pudo enviar el aviso de la denuncia ${report.id}`);
      }
    } else {
      this.logger.warn(`Denuncia ${report.id} sin aviso: falta ADMIN_EMAIL`);
    }
    return { message: 'Gracias. Revisaremos tu denuncia' };
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
