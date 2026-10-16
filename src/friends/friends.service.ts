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
import { startOfDay, endOfDay } from 'date-fns';

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

  async sendRequest(userId: number, identifier: string) {
    // Find user by username or email
    const targetUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!targetUser) {
      this.logger.warn(`Friend request from user ${userId}: target not found`);
      // Con un email no se confirma si existe cuenta: así no se puede usar este
      // endpoint para averiguar quién está registrado. Con un nombre de usuario
      // sí se avisa (es un dato público dentro de la app y evita erratas).
      if (identifier.includes('@')) {
        return { message: 'Friend request sent' };
      }
      throw new NotFoundException('User not found');
    }

    if (targetUser.id === userId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if friendship already exists
    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requester_id: userId, receiver_id: targetUser.id },
          { requester_id: targetUser.id, receiver_id: userId },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        throw new BadRequestException('Already friends with this user');
      }
      if (existingFriendship.status === 'pending') {
        throw new BadRequestException('Friend request already pending');
      }
      // If rejected, allow to send again by updating
      const updated = await this.prisma.friendship.update({
        where: { id: existingFriendship.id },
        data: {
          status: 'pending',
          requester_id: userId,
          receiver_id: targetUser.id,
        },
      });
      this.logger.log(
        `Friend request updated: ${userId} -> ${targetUser.id}`,
      );
      return {
        message: 'Friend request sent',
        friendship: updated,
      };
    }

    // Create new friendship request
    const friendship = await this.prisma.friendship.create({
      data: {
        requester_id: userId,
        receiver_id: targetUser.id,
        status: 'pending',
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    this.logger.log(`Friend request sent: ${userId} -> ${targetUser.id}`);
    return {
      message: 'Friend request sent',
      friendship,
    };
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

  async getFriends(userId: number) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ requester_id: userId }, { receiver_id: userId }],
        status: 'accepted',
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            created_at: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            created_at: true,
          },
        },
      },
    });

    // Format to return the friend (not the current user)
    const friends = friendships.map((friendship) => {
      const friend =
        friendship.requester_id === userId
          ? friendship.receiver
          : friendship.requester;
      return {
        friendshipId: friendship.id,
        friend,
        friendsSince: friendship.created_at,
      };
    });

    return friends;
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
        requester: {
          select: {
            id: true,
            username: true,
            created_at: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return requests.map((request) => ({
      requestId: request.id,
      from: request.requester,
      receivedAt: request.created_at,
    }));
  }

  async getFriendProgress(userId: number, friendId: number) {
    // Verify friendship
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
        `User ${userId} attempted to view progress of non-friend ${friendId}`,
      );
      throw new ForbiddenException(
        'Can only view progress of accepted friends',
      );
    }

    // Get friend's basic info
    const friend = await this.prisma.user.findUnique({
      where: { id: friendId },
      select: {
        id: true,
        username: true,
      },
    });

    if (!friend) {
      throw new NotFoundException('Friend not found');
    }

    // Get friend's streak
    const streak = await this.streaksService.getUserStreak(friendId);

    // Get active supplements count
    const activeSupplementsCount = await this.prisma.user_supplement.count({
      where: {
        user_id: friendId,
        active: true,
      },
    });

    // Calculate adherence for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeSupplements = await this.prisma.user_supplement.findMany({
      where: {
        user_id: friendId,
        active: true,
      },
    });

    let totalExpected = 0;
    let totalTaken = 0;

    for (const supplement of activeSupplements) {
      const expectedFor30Days = 30 * supplement.times_per_day;
      totalExpected += expectedFor30Days;

      const intakeCount = await this.prisma.intake.count({
        where: {
          user_supplement_id: supplement.id,
          taken_at: {
            gte: thirtyDaysAgo,
          },
        },
      });

      totalTaken += intakeCount;
    }

    const adherencePercent =
      totalExpected > 0 ? Math.round((totalTaken / totalExpected) * 100) : 0;

    return {
      user: friend,
      streak: {
        current: streak.current_streak,
        longest: streak.longest_streak,
      },
      activeSupplements: activeSupplementsCount,
      last30DaysAdherence: adherencePercent,
    };
  }

  // ── Perfil de un amigo ────────────────────────────────────────────────────

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
    });
    if (!friendship) {
      throw new ForbiddenException('Can only view progress of accepted friends');
    }
  }

  /** ¿Deja este usuario que sus amigos vean su stack y su calendario? */
  async getSharing(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { share_with_friends: true },
    });
    return { enabled: user?.share_with_friends ?? true };
  }

  async setSharing(userId: number, enabled: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { share_with_friends: enabled },
    });
    return { enabled };
  }

  /**
   * Perfil de un amigo: su Capsu (objetos equipados), racha y cumplimiento.
   * Su stack y lo que ha tomado hoy solo van si él lo comparte (`sharing`).
   */
  async getFriendProfile(userId: number, friendId: number) {
    const progress = await this.getFriendProgress(userId, friendId); // comprueba la amistad
    const [friend, equipped] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: friendId },
        select: { share_with_friends: true, created_at: true },
      }),
      this.rewardsService.getEquippedFor([friendId]),
    ]);
    const sharing = friend?.share_with_friends ?? true;

    return {
      ...progress,
      memberSince: friend?.created_at ?? null,
      equipped: equipped.get(friendId) ?? {},
      sharing,
      today: sharing ? await this.todayOf(friendId) : null,
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

  /** Calendario mensual de un amigo (solo si lo comparte). */
  async getFriendCalendar(userId: number, friendId: number, year: number, month: number) {
    await this.assertFriends(userId, friendId);
    const { enabled } = await this.getSharing(friendId);
    if (!enabled) {
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
