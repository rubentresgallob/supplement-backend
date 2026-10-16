import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, subDays } from 'date-fns';
import { computeStreaks, dayKey, STREAK_LOOKBACK_DAYS } from './streak-utils';
import { CATALOG_PUBLIC } from '../supplements/catalog-fields';

export interface DayStatus {
  /** Nº de suplementos activos (si es 0 no hay racha posible). */
  activeCount: number;
  /** Días con todas las tomas hechas. */
  completedDays: Set<string>;
  /** Días cubiertos por un protector de racha. */
  frozenDays: Set<string>;
}

@Injectable()
export class StreaksService {
  private readonly logger = new Logger(StreaksService.name);

  constructor(private prisma: PrismaService) {}

  async getUserStreak(userId: number) {
    const status = await this.getDayStatus(userId);

    if (status.activeCount === 0) {
      return {
        current_streak: 0,
        longest_streak: 0,
        last_completed_date: null,
        message: 'No active supplements',
      };
    }

    return computeStreaks(
      (day) => status.completedDays.has(day) || status.frozenDays.has(day),
    );
  }

  async getSupplementStreak(userId: number, supplementId: number) {
    // Verify ownership
    const supplement = await this.prisma.user_supplement.findUnique({
      where: { id: supplementId },
      include: {
        supplement_database: { select: CATALOG_PUBLIC },
      },
    });

    if (!supplement) {
      this.logger.warn(`User supplement not found: ${supplementId}`);
      throw new NotFoundException('Supplement not found');
    }

    if (supplement.user_id !== userId) {
      this.logger.warn(
        `User ${userId} attempted to access streak for supplement ${supplementId} owned by user ${supplement.user_id}`,
      );
      throw new ForbiddenException(
        'You do not have permission to access this streak',
      );
    }

    const counts = await this.countIntakesByDay(userId, [supplementId]);
    const streakData = computeStreaks(
      (day) =>
        (counts.get(day)?.get(supplementId) ?? 0) >= supplement.times_per_day,
    );

    return {
      supplementId: supplement.id,
      supplementName:
        supplement.supplement_database?.name || supplement.custom_name,
      ...streakData,
    };
  }

  /**
   * Estado de cada día del último año con solo 3 consultas
   * (antes se hacía una consulta por día y suplemento).
   * Un día está completo si TODOS los suplementos activos tienen sus tomas.
   */
  async getDayStatus(userId: number): Promise<DayStatus> {
    const [activeSupplements, freezes] = await Promise.all([
      this.prisma.user_supplement.findMany({
        where: { user_id: userId, active: true },
        select: { id: true, times_per_day: true },
      }),
      this.prisma.streak_freeze.findMany({
        where: { user_id: userId },
        select: { day: true },
      }),
    ]);

    const completedDays = new Set<string>();
    if (activeSupplements.length > 0) {
      const counts = await this.countIntakesByDay(
        userId,
        activeSupplements.map((s) => s.id),
      );
      for (const [day, perSupplement] of counts) {
        const complete = activeSupplements.every(
          (s) => (perSupplement.get(s.id) ?? 0) >= s.times_per_day,
        );
        if (complete) completedDays.add(day);
      }
    }

    return {
      activeCount: activeSupplements.length,
      completedDays,
      frozenDays: new Set(freezes.map((f) => f.day)),
    };
  }

  /** Mapa día → (suplemento → nº de tomas) del último año. */
  private async countIntakesByDay(userId: number, supplementIds: number[]) {
    const intakes = await this.prisma.intake.findMany({
      where: {
        user_id: userId,
        user_supplement_id: { in: supplementIds },
        taken_at: {
          gte: subDays(startOfDay(new Date()), STREAK_LOOKBACK_DAYS + 1),
        },
      },
      select: { user_supplement_id: true, taken_at: true },
    });

    const counts = new Map<string, Map<number, number>>();
    for (const intake of intakes) {
      const day = dayKey(intake.taken_at);
      const perSupplement = counts.get(day) ?? new Map<number, number>();
      perSupplement.set(
        intake.user_supplement_id,
        (perSupplement.get(intake.user_supplement_id) ?? 0) + 1,
      );
      counts.set(day, perSupplement);
    }
    return counts;
  }
}
