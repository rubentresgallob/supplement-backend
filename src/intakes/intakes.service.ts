import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIntakeDto } from './dto/create-intake.dto';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class IntakesService {
  private readonly logger = new Logger(IntakesService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateIntakeDto) {
    // Verify the user supplement exists and belongs to the user
    const userSupplement = await this.prisma.user_supplement.findUnique({
      where: { id: dto.userSupplementId },
    });

    if (!userSupplement) {
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

    const intake = await this.prisma.intake.create({
      data: {
        user_id: userId,
        user_supplement_id: dto.userSupplementId,
        taken_at: dto.takenAt ? new Date(dto.takenAt) : new Date(),
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
    return intake;
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
