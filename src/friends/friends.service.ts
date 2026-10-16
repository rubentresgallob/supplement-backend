import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StreaksService } from '../streaks/streaks.service';
import { RewardsService } from '../rewards/rewards.service';
import { CalendarService } from '../calendar/calendar.service';
import { PushService } from '../push/push.service';
import { startOfDay, endOfDay, format } from 'date-fns';
import { isBlockedEitherWay } from '../social/social.service';

/** Respuesta única al enviar una solicitud (no revela si la cuenta existe). */
export const FRIEND_REQUEST_GENERIC = 'Si existe una cuenta con ese dato, le llegará tu solicitud';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(
    private prisma: PrismaService,
    private streaksService: StreaksService,
    private rewardsService: RewardsService,
    private calendarService: CalendarService,
    private pushService: PushService,
  ) {}

  /**
   * Envía una solicitud por nombre de usuario o email exactos. La respuesta es
   * SIEMPRE la misma (exista o no la cuenta, o si ya había una solicitud
   * pendiente), para que nadie pueda usar esto para averiguar quién está registrado.
   */
  async sendRequest(userId: number, identifier: string) {
    const generic = { message: FRIEND_REQUEST_GENERIC };
    const targetUser = await this.prisma.user.findFirst({
      where: {
        email_verified: true,
        suspended_at: null,
        OR: [{ email: identifier }, { username: identifier }],
      },
      select: { id: true },
    });

    if (!targetUser) {
      this.logger.log(`Solicitud de amistad del usuario ${userId}: sin destinatario`);
      return generic;
    }

    if (targetUser.id === userId) {
      throw new BadRequestException('No puedes enviarte una solicitud a ti mismo');
    }

    // Bloqueo en cualquier sentido: no se crea nada, y la respuesta no lo delata
    if (await isBlockedEitherWay(this.prisma, userId, targetUser.id)) {
      this.logger.log(`Solicitud de amistad del usuario ${userId}: bloqueada`);
      return generic;
    }

    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requester_id: userId, receiver_id: targetUser.id },
          { requester_id: targetUser.id, receiver_id: userId },
        ],
      },
    });

    if (existingFriendship?.status === 'accepted') {
      // Ya son amigos: no revela nada que no sepa
      throw new BadRequestException('Ya sois amigos');
    }
    if (existingFriendship?.status === 'pending') {
      if (existingFriendship.requester_id === targetUser.id) {
        // Él ya me la había enviado: la tengo en "Solicitudes"
        throw new BadRequestException('Esa persona ya te ha enviado una solicitud: acéptala en Solicitudes');
      }
      return generic; // ya la había enviado yo
    }

    if (existingFriendship) {
      // Rechazada antes: se puede volver a enviar
      await this.prisma.friendship.update({
        where: { id: existingFriendship.id },
        data: { status: 'pending', requester_id: userId, receiver_id: targetUser.id },
      });
    } else {
      await this.prisma.friendship.create({
        data: { requester_id: userId, receiver_id: targetUser.id, status: 'pending' },
      });
    }
    this.logger.log(`Solicitud de amistad: ${userId} -> ${targetUser.id}`);
    return generic;
  }

  async acceptRequest(userId: number, requestId: number) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, username: true },
        },
        receiver: {
          select: { id: true, username: true },
        },
      },
    });

    if (!friendship) {
      this.logger.warn(`Friend request not found: ${requestId}`);
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.receiver_id !== userId) {
      this.logger.warn(
        `User ${userId} attempted to accept request ${requestId} not addressed to them`,
      );
      throw new ForbiddenException(
        'You can only accept requests sent to you',
      );
    }

    if (friendship.status !== 'pending') {
      throw new BadRequestException('Friend request is not pending');
    }

    const updated = await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'accepted' },
      include: {
        requester: {
          select: { id: true, username: true },
        },
        receiver: {
          select: { id: true, username: true },
        },
      },
    });

    this.logger.log(`Friend request accepted: ${requestId}`);
    return {
      message: 'Friend request accepted',
      friendship: updated,
    };
  }

  async rejectRequest(userId: number, requestId: number) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!friendship) {
      this.logger.warn(`Friend request not found: ${requestId}`);
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.receiver_id !== userId) {
      this.logger.warn(
        `User ${userId} attempted to reject request ${requestId} not addressed to them`,
      );
      throw new ForbiddenException(
        'You can only reject requests sent to you',
      );
    }

    await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });

    this.logger.log(`Friend request rejected: ${requestId}`);
    return { message: 'Friend request rejected' };
  }

  /** Mis amigos: lo que se ve siempre (nombre de usuario, objetos equipados, mes y año de alta). */
  async getFriends(userId: number) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ requester_id: userId }, { receiver_id: userId }],
        status: 'accepted',
      },
      include: {
        requester: { select: { id: true, username: true, created_at: true } },
        receiver: { select: { id: true, username: true, created_at: true } },
      },
    });
    const friends = friendships.map((f) => ({
      friendship: f,
      friend: f.requester_id === userId ? f.receiver : f.requester,
    }));
    const equipped = await this.rewardsService.getEquippedFor(friends.map((f) => f.friend.id));

    return friends.map(({ friendship, friend }) => ({
      friendshipId: friendship.id,
      friend: { id: friend.id, username: friend.username },
      memberSince: memberSinceMonth(friend.created_at),
      equipped: equipped.get(friend.id) ?? {},
      friendsSince: friendship.created_at,
    }));
  }

  async removeFriend(userId: number, friendId: number) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requester_id: userId, receiver_id: friendId },
          { requester_id: friendId, receiver_id: userId },
        ],
        status: 'accepted',
      },
    });

    if (!friendship) {
      this.logger.warn(
        `Friendship not found between ${userId} and ${friendId}`,
      );
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    this.logger.log(`Friendship removed between ${userId} and ${friendId}`);
    return { message: 'Friend removed successfully' };
  }

  async getPendingRequests(userId: number) {
    const requests = await this.prisma.friendship.findMany({
      where: {
        receiver_id: userId,
        status: 'pending',
      },
      include: {
        requester: { select: { id: true, username: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return requests.map((request) => ({
      requestId: request.id,
      from: request.requester,
      receivedAt: request.created_at,
    }));
  }

  /** Lanza 403 si no son amigos (amistad aceptada). */
  private async assertFriends(userId: number, friendId: number) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requester_id: userId, receiver_id: friendId },
          { requester_id: friendId, receiver_id: userId },
        ],
        status: 'accepted',
      },
      select: { id: true },
    });
    if (!friendship) {
      this.logger.warn(`Usuario ${userId} intenta ver a ${friendId}, que no es su amigo`);
      throw new ForbiddenException('Can only view progress of accepted friends');
    }
  }

  /** Racha, cumplimiento de 30 días y nº de suplementos activos de un usuario. */
  async progressOf(userId: number) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [streak, activeSupplements] = await Promise.all([
      this.streaksService.getUserStreak(userId),
      this.prisma.user_supplement.findMany({
        where: { user_id: userId, active: true },
        select: { id: true, times_per_day: true },
      }),
    ]);
    const totalExpected = activeSupplements.reduce((a, s) => a + 30 * s.times_per_day, 0);
    const totalTaken = activeSupplements.length
      ? await this.prisma.intake.count({
          where: {
            user_supplement_id: { in: activeSupplements.map((s) => s.id) },
            taken_at: { gte: thirtyDaysAgo },
          },
        })
      : 0;
    return {
      streak: { current: streak.current_streak, longest: streak.longest_streak },
      activeSupplements: activeSupplements.length,
      last30DaysAdherence:
        totalExpected > 0 ? Math.min(100, Math.round((totalTaken / totalExpected) * 100)) : 0,
    };
  }

  /** Progreso de un amigo: solo si tiene activado "Compartir mi progreso". */
  async getFriendProgress(userId: number, friendId: number) {
    await this.assertFriends(userId, friendId);
    const friend = await this.prisma.user.findUnique({
      where: { id: friendId },
      select: { id: true, username: true, share_progress: true },
    });
    if (!friend) throw new NotFoundException('Friend not found');
    if (!friend.share_progress) {
      throw new ForbiddenException({ message: 'Tu amigo no comparte su progreso', code: 'SHARING_DISABLED' });
    }
    return { user: { id: friend.id, username: friend.username }, ...(await this.progressOf(friendId)) };
  }

  // ── Interruptores de privacidad ───────────────────────────────────────────

  async getSharing(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { share_progress: true, share_supplements: true, social_intro_seen_at: true },
    });
    return {
      progress: user?.share_progress ?? false,
      supplements: user?.share_supplements ?? false,
      introSeen: !!user?.social_intro_seen_at,
    };
  }

  /**
   * Cambia los interruptores (efecto inmediato en la API) y guarda cada
   * activación y desactivación en sharing_event.
   */
  async setSharing(userId: number, changes: { progress?: boolean; supplements?: boolean; introSeen?: boolean }) {
    const current = await this.getSharing(userId);
    const events: { user_id: number; setting: string; enabled: boolean }[] = [];
    if (changes.progress !== undefined && changes.progress !== current.progress) {
      events.push({ user_id: userId, setting: 'progress', enabled: changes.progress });
    }
    if (changes.supplements !== undefined && changes.supplements !== current.supplements) {
      events.push({ user_id: userId, setting: 'supplements', enabled: changes.supplements });
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(changes.progress !== undefined ? { share_progress: changes.progress } : {}),
          ...(changes.supplements !== undefined ? { share_supplements: changes.supplements } : {}),
          ...(changes.introSeen && !current.introSeen ? { social_intro_seen_at: new Date() } : {}),
        },
      }),
      this.prisma.sharing_event.createMany({ data: events }),
    ]);
    return this.getSharing(userId);
  }

  /**
   * Perfil de un amigo. Siempre: nombre de usuario, objetos equipados y mes de alta.
   * Con "Compartir mi progreso": racha, % de 30 días y nº de suplementos.
   * Con "Compartir mis suplementos": stack de hoy (nombre, dosis, forma, tomas).
   */
  async getFriendProfile(userId: number, friendId: number) {
    await this.assertFriends(userId, friendId);
    const [friend, equipped] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: friendId },
        select: {
          id: true,
          username: true,
          created_at: true,
          share_progress: true,
          share_supplements: true,
        },
      }),
      this.rewardsService.getEquippedFor([friendId]),
    ]);
    if (!friend) throw new NotFoundException('Friend not found');

    return {
      user: { id: friend.id, username: friend.username },
      memberSince: memberSinceMonth(friend.created_at),
      equipped: equipped.get(friendId) ?? {},
      sharesProgress: friend.share_progress,
      sharesSupplements: friend.share_supplements,
      progress: friend.share_progress ? await this.progressOf(friendId) : null,
      today: friend.share_supplements ? await this.todayOf(friendId) : null,
    };
  }

  /** Stack activo de un usuario con lo que lleva tomado hoy. */
  private async todayOf(userId: number) {
    const now = new Date();
    const supplements = await this.prisma.user_supplement.findMany({
      where: { user_id: userId, active: true },
      include: {
        supplement_database: { select: { name: true } },
        intakes: {
          where: { taken_at: { gte: startOfDay(now), lte: endOfDay(now) } },
          select: { id: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });
    const list = supplements.map((s) => ({
      id: s.id,
      name: s.supplement_database?.name ?? s.custom_name ?? 'Suplemento',
      form: s.form,
      dosageAmount: s.dosage_amount,
      dosageUnit: s.dosage_unit,
      taken: Math.min(s.intakes.length, s.times_per_day),
      expected: s.times_per_day,
    }));
    const taken = list.reduce((a, s) => a + s.taken, 0);
    const expected = list.reduce((a, s) => a + s.expected, 0);
    return { supplements: list, taken, expected, complete: expected > 0 && taken >= expected };
  }

  /** Calendario mensual de un amigo (solo con "Compartir mis suplementos"). */
  async getFriendCalendar(userId: number, friendId: number, year: number, month: number) {
    await this.assertFriends(userId, friendId);
    const friend = await this.prisma.user.findUnique({
      where: { id: friendId },
      select: { share_supplements: true },
    });
    if (!friend?.share_supplements) {
      throw new ForbiddenException({
        message: 'Tu amigo no comparte su calendario',
        code: 'SHARING_DISABLED',
      });
    }
    return this.calendarService.getMonth(friendId, year, month);
  }

  // ── Motivar ───────────────────────────────────────────────────────────────

  /**
   * Manda un aviso push al amigo. Si le falta algo por tomar hoy, le recuerda
   * ese suplemento ("¡Alex dice que no te olvides de tu creatina!").
   * Uno al día por pareja. `delivered` = si le ha llegado a algún móvil.
   * Al que motiva NO se le dice qué suplemento le falta al otro.
   */
  async motivate(userId: number, friendId: number) {
    await this.assertFriends(userId, friendId);
    const now = new Date();
    const already = await this.prisma.motivation.findFirst({
      where: { sender_id: userId, receiver_id: friendId, created_at: { gte: startOfDay(now) } },
      select: { id: true },
    });
    if (already) {
      throw new HttpException(
        { message: 'Ya le has motivado hoy. Vuelve a intentarlo mañana', code: 'ALREADY_MOTIVATED' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const [sender, today] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { username: true } }),
      this.todayOf(friendId),
    ]);
    await this.prisma.motivation.create({ data: { sender_id: userId, receiver_id: friendId } });

    const pending = today.supplements.find((s) => s.taken < s.expected);
    const delivered = await this.pushService.sendToUser(
      friendId,
      motivationMessage(sender?.username ?? 'Un amigo', pending?.name ?? null, today.complete),
    );
    this.logger.log(`Usuario ${userId} motiva a ${friendId} (entregado: ${delivered > 0})`);
    return { sent: true, delivered: delivered > 0 };
  }
}

/** "Creatina" → "creatina", pero "ZMA" o "BCAA" se quedan igual. */
export function lowerFirst(name: string) {
  if (name.length > 1 && name[1] === name[1].toUpperCase() && name[1] !== name[1].toLowerCase()) {
    return name;
  }
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** Texto del aviso de "Motivar". */
export function motivationMessage(sender: string, pendingSupplement: string | null, dayComplete: boolean) {
  if (pendingSupplement) {
    return {
      title: `¡${sender} dice que no te olvides de tu ${lowerFirst(pendingSupplement)}!`,
      body: 'Toca para registrar la toma de hoy',
      data: { type: 'motivation' },
    };
  }
  return {
    title: `${sender} te manda ánimos 💪`,
    body: dayComplete ? 'Hoy ya lo tienes todo. ¡Sigue así!' : '¡A por el día de hoy!',
    data: { type: 'motivation' },
  };
}

/** Mes y año de alta ("2026-10"): a los amigos no se les da la fecha exacta. */
export function memberSinceMonth(createdAt: Date) {
  return format(createdAt, 'yyyy-MM');
}
