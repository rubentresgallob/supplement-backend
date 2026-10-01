import { Injectable, Logger } from '@nestjs/common';
import { startOfDay, startOfISOWeek, subDays, addDays, isAfter } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { StreaksService, DayStatus } from '../streaks/streaks.service';
import { computeStreaks, dayKey } from '../streaks/streak-utils';
import {
  ACHIEVEMENTS,
  Achievement,
  DAILY_COMPLETE_POINTS,
  DAILY_REWARD_WINDOW_DAYS,
  STREAK_REPAIR_WINDOW_DAYS,
  WEEKLY_GOALS,
} from './rewards-catalog';
import { findShopItem, STREAK_FREEZE_CODE } from './shop-catalog';

export interface GrantedReward {
  ref: string;
  reason: string;
  points: number;
  item?: string;
}

/**
 * Días fallados de las últimas 48 h que un protector puede cubrir.
 * Solo hay hueco "reparable" si el día anterior al hueco contaba,
 * es decir, si había una racha que salvar.
 */
export function findRepairGap(
  isDone: (day: string) => boolean,
  today: Date = new Date(),
): string[] {
  const base = startOfDay(today);
  const missed: string[] = [];
  let earliestOffset = 0;

  for (let offset = STREAK_REPAIR_WINDOW_DAYS; offset >= 1; offset--) {
    const day = dayKey(subDays(base, offset));
    if (!isDone(day)) {
      missed.push(day);
      earliestOffset = Math.max(earliestOffset, offset);
    }
  }

  if (missed.length === 0) return [];
  const anchor = dayKey(subDays(base, earliestOffset + 1));
  return isDone(anchor) ? missed : [];
}

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(
    private prisma: PrismaService,
    private streaksService: StreaksService,
  ) {}

  /**
   * Revisa todo lo que el usuario puede haber ganado y lo entrega una sola vez.
   * Es idempotente: se puede llamar tantas veces como se quiera.
   */
  async sync(userId: number) {
    const status = await this.streaksService.getDayStatus(userId);
    const repairedDays = await this.autoRepairStreak(userId, status);

    const isDone = (day: string) =>
      status.completedDays.has(day) || status.frozenDays.has(day);
    const streak =
      status.activeCount > 0
        ? computeStreaks(isDone)
        : { current_streak: 0, longest_streak: 0, last_completed_date: null };

    const existing = await this.prisma.points_transaction.findMany({
      where: { user_id: userId, ref: { not: null } },
      select: { ref: true },
    });
    const grantedRefs = new Set(existing.map((t) => t.ref as string));
    const granted: GrantedReward[] = [];

    const tryGrant = async (reward: GrantedReward) => {
      if (grantedRefs.has(reward.ref)) return;
      if (await this.grant(userId, reward)) {
        grantedRefs.add(reward.ref);
        granted.push(reward);
      }
    };

    // 1. Días completos (solo hoy y ayer)
    const today = startOfDay(new Date());
    for (let offset = 0; offset <= DAILY_REWARD_WINDOW_DAYS; offset++) {
      const day = dayKey(subDays(today, offset));
      if (status.completedDays.has(day)) {
        await tryGrant({
          ref: `day:${day}`,
          reason: 'Día completo',
          points: DAILY_COMPLETE_POINTS,
        });
      }
    }

    // 2. Objetivos semanales
    const week = this.weeklyProgress(status);
    for (const goal of WEEKLY_GOALS) {
      if (week.completedDays >= goal.daysRequired) {
        await tryGrant({
          ref: `${goal.code}:${week.weekStart}`,
          reason: goal.title,
          points: goal.points,
        });
      }
    }

    // 3. Logros (solo se calculan los que faltan)
    const pending = ACHIEVEMENTS.filter((a) => !grantedRefs.has(`ach:${a.code}`));
    if (pending.length > 0) {
      const progress = await this.achievementProgress(
        userId,
        status,
        streak.longest_streak,
        pending,
      );
      for (const achievement of pending) {
        if ((progress[achievement.type] ?? 0) >= achievement.target) {
          await tryGrant({
            ref: `ach:${achievement.code}`,
            reason: `Logro: ${achievement.title}`,
            points: achievement.points,
            item: achievement.rewardItem,
          });
        }
      }
    }

    if (granted.length > 0 || repairedDays.length > 0) {
      this.logger.log(
        `Rewards for user ${userId}: ${granted.map((g) => g.ref).join(', ')}` +
          (repairedDays.length ? ` | racha reparada: ${repairedDays.join(', ')}` : ''),
      );
    }

    return { granted, repairedDays, status, streak };
  }

  /** Resumen para la app: saldo, racha, objetivos, logros y lo nuevo ganado. */
  async getSummary(userId: number) {
    const { granted, repairedDays, status, streak } = await this.sync(userId);

    const [user, items, unlockedRefs] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { points: true },
      }),
      this.prisma.user_item.findMany({ where: { user_id: userId } }),
      this.prisma.points_transaction.findMany({
        where: { user_id: userId, ref: { startsWith: 'ach:' } },
        select: { ref: true, created_at: true },
      }),
    ]);

    const protectors =
      items.find((i) => i.item_code === STREAK_FREEZE_CODE)?.quantity ?? 0;
    const repairGap =
      status.activeCount > 0
        ? findRepairGap(
            (d) => status.completedDays.has(d) || status.frozenDays.has(d),
          )
        : [];

    const week = this.weeklyProgress(status);
    const unlockedAt = new Map(
      unlockedRefs.map((t) => [(t.ref as string).slice(4), t.created_at]),
    );

    const equipped: Record<string, string> = {};
    for (const item of items) {
      const slot = item.equipped ? findShopItem(item.item_code)?.slot : undefined;
      if (slot) equipped[slot] = item.item_code;
    }

    return {
      points: user?.points ?? 0,
      newRewards: granted,
      streak: {
        current: streak.current_streak,
        longest: streak.longest_streak,
        repairedDays,
        // Si hay racha perdida recuperable y faltan protectores, la app puede ofrecer comprarlos
        repair:
          repairGap.length > 0
            ? {
                missedDays: repairGap,
                protectorsNeeded: repairGap.length,
                protectorsOwned: protectors,
              }
            : null,
      },
      protectors,
      weeklyGoals: WEEKLY_GOALS.map((goal) => ({
        code: goal.code,
        title: goal.title,
        progress: Math.min(week.completedDays, goal.daysRequired),
        target: goal.daysRequired,
        points: goal.points,
        completed: week.completedDays >= goal.daysRequired,
      })),
      achievements: ACHIEVEMENTS.map((a) => ({
        code: a.code,
        title: a.title,
        description: a.description,
        icon: a.icon,
        points: a.points,
        rewardItem: a.rewardItem ?? null,
        unlocked: unlockedAt.has(a.code),
        unlockedAt: unlockedAt.get(a.code) ?? null,
      })),
      equipped,
    };
  }

  async getHistory(userId: number) {
    return this.prisma.points_transaction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 100,
      select: { id: true, amount: true, reason: true, created_at: true },
    });
  }

  /** Objetos equipados de varios usuarios (para perfil de amigos y ranking). */
  async getEquippedFor(userIds: number[]) {
    const items = await this.prisma.user_item.findMany({
      where: { user_id: { in: userIds }, equipped: true },
      select: { user_id: true, item_code: true },
    });
    const result = new Map<number, Record<string, string>>();
    for (const item of items) {
      const slot = findShopItem(item.item_code)?.slot;
      if (!slot) continue;
      const equipped = result.get(item.user_id) ?? {};
      equipped[slot] = item.item_code;
      result.set(item.user_id, equipped);
    }
    return result;
  }

  /** Entrega un premio. Devuelve false si ya se había dado (ref repetida). */
  private async grant(userId: number, reward: GrantedReward): Promise<boolean> {
    try {
      await this.prisma.$transaction([
        this.prisma.points_transaction.create({
          data: {
            user_id: userId,
            amount: reward.points,
            reason: reward.reason,
            ref: reward.ref,
          },
        }),
        this.prisma.user.update({
          where: { id: userId },
          data: { points: { increment: reward.points } },
        }),
        ...(reward.item
          ? [
              this.prisma.user_item.upsert({
                where: {
                  user_id_item_code: { user_id: userId, item_code: reward.item },
                },
                create: { user_id: userId, item_code: reward.item },
                update: {},
              }),
            ]
          : []),
      ]);
      return true;
    } catch (error) {
      // P2002 = unique violado: otra petición ya entregó este premio
      if (error?.code === 'P2002') return false;
      throw error;
    }
  }

  /**
   * Si el usuario falló algún día de las últimas 48 h y tiene protectores,
   * se gastan automáticamente para salvar la racha.
   */
  private async autoRepairStreak(userId: number, status: DayStatus) {
    if (status.activeCount === 0) return [];

    const gap = findRepairGap(
      (d) => status.completedDays.has(d) || status.frozenDays.has(d),
    );
    if (gap.length === 0) return [];

    const repaired = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.user_item.updateMany({
        where: {
          user_id: userId,
          item_code: STREAK_FREEZE_CODE,
          quantity: { gte: gap.length },
        },
        data: { quantity: { decrement: gap.length } },
      });
      if (consumed.count === 0) return false;

      await tx.streak_freeze.createMany({
        data: gap.map((day) => ({ user_id: userId, day })),
        skipDuplicates: true,
      });
      return true;
    });

    if (!repaired) return [];
    gap.forEach((day) => status.frozenDays.add(day));
    return gap;
  }

  /** Días completos (con tomas reales) en la semana actual, de lunes a hoy. */
  private weeklyProgress(status: DayStatus) {
    const today = startOfDay(new Date());
    const weekStart = startOfISOWeek(today);
    let completedDays = 0;
    for (let d = weekStart; !isAfter(d, today); d = addDays(d, 1)) {
      if (status.completedDays.has(dayKey(d))) completedDays++;
    }
    return { weekStart: dayKey(weekStart), completedDays };
  }

  private async achievementProgress(
    userId: number,
    status: DayStatus,
    longestStreak: number,
    pending: Achievement[],
  ) {
    const needs = new Set(pending.map((a) => a.type));
    const [intakes, friends, items] = await Promise.all([
      needs.has('first_intake')
        ? this.prisma.intake.count({ where: { user_id: userId } })
        : 0,
      needs.has('friends')
        ? this.prisma.friendship.count({
            where: {
              status: 'accepted',
              OR: [{ requester_id: userId }, { receiver_id: userId }],
            },
          })
        : 0,
      needs.has('items')
        ? this.prisma.user_item.count({ where: { user_id: userId } })
        : 0,
    ]);

    return {
      streak: longestStreak,
      first_intake: intakes,
      first_day: status.completedDays.size,
      friends,
      active_supplements: status.activeCount,
      items,
    } as Record<string, number>;
  }
}
