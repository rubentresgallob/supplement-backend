import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIntakeDto } from './dto/create-intake.dto';
import { startOfDay, endOfDay } from 'date-fns';
import { RewardsService, GrantedReward } from '../rewards/rewards.service';

/** Antigüedad máxima de una toma registrada a posteriori (evita inventarse rachas). */
export const MAX_INTAKE_AGE_HOURS = 48;

/**
 * Fecha de la toma: "ahora" si no viene, nunca en el futuro (reloj del móvil
 * adelantado) y como mucho de hace 48 h. Devuelve null si es demasiado antigua.
 */
export function resolveTakenAt(takenAt: string | undefined, now = new Date()): Date | null {
  if (!takenAt) return now;
  const date = new Date(takenAt);
  if (date > now) return now;
  const ageHours = (now.getTime() - date.getTime()) / 3_600_000;
  return ageHours > MAX_INTAKE_AGE_HOURS ? null : date;
}

@Injectable()
export class IntakesService {
  private readonly logger = new Logger(IntakesService.name);

  constructor(
    private prisma: PrismaService,
    private rewardsService: RewardsService,
  ) {}

  async create(userId: number, dto: CreateIntakeDto) {
    // Verify the user supplement exists and belongs to the user
    const userSupplement = await this.prisma.user_supplement.findUnique({
      where: { id: dto.userSupplementId },
    });

    if (!userSupplement || userSupplement.deleted_at) {
      this.logger.warn(
        `User supplement not found: ${dto.userSupplementId}`,
      );
      throw new NotFoundException('User supplement not found');
    }

    if (userSupplement.user_id !== userId) {
      this.logger.warn(
        `User ${userId} attempted to record intake for supplement ${dto.userSupplementId} owned by user ${userSupplement.user_id}`,
      );
      throw new ForbiddenException(
        'You do not have permission to record intake for this supplement',
      );
    }

    const takenAt = resolveTakenAt(dto.takenAt);
    if (!takenAt) {
      throw new BadRequestException(
        `Solo puedes registrar tomas de las últimas ${MAX_INTAKE_AGE_HOURS} horas`,
      );
    }

    const intake = await this.prisma.intake.create({
      data: {
        user_id: userId,
        user_supplement_id: dto.userSupplementId,
        taken_at: takenAt,
      },
      include: {
        user_supplement: {
          include: {
            supplement_database: true,
          },
        },
      },
    });

    this.logger.log(
      `Intake recorded: ${intake.id} for user ${userId}, supplement ${dto.userSupplementId}`,
    );

    // Stock (Pro): cada toma gasta sus unidades, sin bajar de 0
    if (userSupplement.stock_units !== null) {
      await this.prisma.user_supplement.update({
        where: { id: userSupplement.id },
        data: {
          stock_units: Math.max(
            0,
            userSupplement.stock_units - userSupplement.units_per_intake,
          ),
        },
      });
    }

    // Premios ganados con esta toma (día completo, logros...). Si falla, la toma ya está guardada.
    let rewards: GrantedReward[] = [];
    try {
      rewards = (await this.rewardsService.sync(userId)).granted;
    } catch (error) {
      this.logger.error(`Error al calcular premios del usuario ${userId}`, error);
    }

    return { ...intake, rewards };
  }

  /**
   * Deshace la última toma de HOY de un suplemento (un toque por error).
   * Devuelve el stock gastado. Los puntos ya ganados no se quitan: cada premio
   * se concede una sola vez, así que volver a completar el día no da más.
   */
  async undoLast(userId: number, userSupplementId: number) {
    const userSupplement = await this.prisma.user_supplement.findUnique({
      where: { id: userSupplementId },
    });
    if (!userSupplement) {
      throw new NotFoundException('User supplement not found');
    }
    if (userSupplement.user_id !== userId) {
      throw new ForbiddenException(
        'You do not have permission to change intakes of this supplement',
      );
    }

    const now = new Date();
    const last = await this.prisma.intake.findFirst({
      where: {
        user_id: userId,
        user_supplement_id: userSupplementId,
        taken_at: { gte: startOfDay(now), lte: endOfDay(now) },
      },
      orderBy: { taken_at: 'desc' },
    });
    if (!last) {
      throw new BadRequestException('No hay tomas de hoy que deshacer');
    }

    await this.prisma.intake.delete({ where: { id: last.id } });
    if (userSupplement.stock_units !== null) {
      await this.prisma.user_supplement.update({
        where: { id: userSupplement.id },
        data: { stock_units: userSupplement.stock_units + userSupplement.units_per_intake },
      });
    }

    this.logger.log(`Intake undone: ${last.id} for user ${userId}, supplement ${userSupplementId}`);
    return { undone: true, intakeId: last.id };
  }

  async findAll(
    userId: number,
    startDate?: string,
    endDate?: string,
    userSupplementId?: number,
  ) {
    const where: any = {
      user_id: userId,
    };

    if (startDate || endDate) {
      where.taken_at = {};
      if (startDate) {
        where.taken_at.gte = new Date(startDate);
      }
      if (endDate) {
        where.taken_at.lte = new Date(endDate);
      }
    }

    if (userSupplementId) {
      where.user_supplement_id = userSupplementId;
    }

    const intakes = await this.prisma.intake.findMany({
      where,
      include: {
        user_supplement: {
          include: {
            supplement_database: true,
          },
        },
      },
      orderBy: { taken_at: 'desc' },
    });

    return intakes;
  }

  async getToday(userId: number) {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const intakes = await this.prisma.intake.findMany({
      where: {
        user_id: userId,
        taken_at: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        user_supplement: {
          include: {
            supplement_database: true,
          },
        },
      },
      orderBy: { taken_at: 'desc' },
    });

    return intakes;
  }

  async getDailyProgress(userId: number) {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    // Get all active supplements for the user
    const activeSupplements = await this.prisma.user_supplement.findMany({
      where: {
        user_id: userId,
        active: true,
      },
      include: {
        supplement_database: true,
        intakes: {
          where: {
            taken_at: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        },
      },
    });

    // Calculate progress for each supplement
    const progress = activeSupplements.map((supplement) => {
      const takenToday = supplement.intakes.length;
      const shouldTake = supplement.times_per_day;
      const percentComplete = Math.min(
        100,
        Math.round((takenToday / shouldTake) * 100),
      );

      return {
        supplementId: supplement.id,
        supplementName:
          supplement.supplement_database?.name || supplement.custom_name,
        takenToday,
        shouldTake,
        percentComplete,
        isComplete: takenToday >= shouldTake,
        schedules: supplement.schedules,
      };
    });

    const totalComplete = progress.filter((p) => p.isComplete).length;
    const totalActive = activeSupplements.length;

    return {
      date: today.toISOString().split('T')[0],
      supplements: progress,
      summary: {
        totalActive,
        totalComplete,
        overallPercentComplete:
          totalActive > 0
            ? Math.round((totalComplete / totalActive) * 100)
            : 0,
      },
    };
  }

  async getSupplementStats(userId: number, supplementId: number) {
    // Verify ownership
    const supplement = await this.prisma.user_supplement.findUnique({
      where: { id: supplementId },
      include: {
        supplement_database: true,
      },
    });

    if (!supplement) {
      this.logger.warn(`User supplement not found: ${supplementId}`);
      throw new NotFoundException('Supplement not found');
    }

    if (supplement.user_id !== userId) {
      this.logger.warn(
        `User ${userId} attempted to access stats for supplement ${supplementId} owned by user ${supplement.user_id}`,
      );
      throw new ForbiddenException(
        'You do not have permission to access these stats',
      );
    }

    // Get all intakes for this supplement
    const intakes = await this.prisma.intake.findMany({
      where: {
        user_supplement_id: supplementId,
        user_id: userId,
      },
      orderBy: { taken_at: 'desc' },
    });

    // Calculate stats
    const totalIntakes = intakes.length;
    const firstIntake = intakes[intakes.length - 1];
    const lastIntake = intakes[0];

    // Calculate last 30 days adherence
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30DaysIntakes = intakes.filter(
      (intake) => new Date(intake.taken_at) >= thirtyDaysAgo,
    );

    const expectedIntakes30Days = 30 * supplement.times_per_day;
    const adherence30Days =
      expectedIntakes30Days > 0
        ? Math.round((last30DaysIntakes.length / expectedIntakes30Days) * 100)
        : 0;

    return {
      supplementId: supplement.id,
      supplementName:
        supplement.supplement_database?.name || supplement.custom_name,
      totalIntakes,
      firstIntake: firstIntake?.taken_at,
      lastIntake: lastIntake?.taken_at,
      last30Days: {
        intakes: last30DaysIntakes.length,
        expected: expectedIntakes30Days,
        adherencePercent: adherence30Days,
      },
    };
  }
}
