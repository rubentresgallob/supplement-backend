import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, subDays, format } from 'date-fns';

@Injectable()
export class StreaksService {
  private readonly logger = new Logger(StreaksService.name);

  constructor(private prisma: PrismaService) {}

  async getUserStreak(userId: number) {
    // Get all active supplements for the user
    const activeSupplements = await this.prisma.user_supplement.findMany({
      where: {
        user_id: userId,
        active: true,
      },
    });

    if (activeSupplements.length === 0) {
      return {
        current_streak: 0,
        longest_streak: 0,
        last_completed_date: null,
        message: 'No active supplements',
      };
    }

    // Calculate global streak (all supplements must be completed)
    const streakData = await this.calculateGlobalStreak(
      userId,
      activeSupplements,
    );

    return streakData;
  }

  async getSupplementStreak(userId: number, supplementId: number) {
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
        `User ${userId} attempted to access streak for supplement ${supplementId} owned by user ${supplement.user_id}`,
      );
      throw new ForbiddenException(
        'You do not have permission to access this streak',
      );
    }

    const streakData = await this.calculateSupplementStreak(
      userId,
      supplement,
    );

    return {
      supplementId: supplement.id,
      supplementName:
        supplement.supplement_database?.name || supplement.custom_name,
      ...streakData,
    };
  }

  private async calculateGlobalStreak(
    userId: number,
    activeSupplements: any[],
  ) {
    let currentStreak = 0;
    let longestStreak = 0;
    let lastCompletedDate: string | null = null;
    let checkDate = startOfDay(new Date());

    // Check today first
    const todayComplete = await this.isDayCompleteForUser(
      userId,
      checkDate,
      activeSupplements,
    );

    if (todayComplete) {
      lastCompletedDate = format(checkDate, 'yyyy-MM-dd');
      currentStreak = 1;
      checkDate = subDays(checkDate, 1);
    } else {
      // Check yesterday
      checkDate = subDays(checkDate, 1);
      const yesterdayComplete = await this.isDayCompleteForUser(
        userId,
        checkDate,
        activeSupplements,
      );

      if (!yesterdayComplete) {
        // Streak is broken
        return {
          current_streak: 0,
          longest_streak: await this.calculateLongestStreak(
            userId,
            activeSupplements,
          ),
          last_completed_date: lastCompletedDate,
        };
      }

      lastCompletedDate = format(checkDate, 'yyyy-MM-dd');
      currentStreak = 1;
      checkDate = subDays(checkDate, 1);
    }

    // Go back in time to find the full current streak
    let maxDaysToCheck = 365; // Limit to prevent infinite loops
    while (maxDaysToCheck > 0) {
      const dayComplete = await this.isDayCompleteForUser(
        userId,
        checkDate,
        activeSupplements,
      );

      if (!dayComplete) {
        break;
      }

      currentStreak++;
      checkDate = subDays(checkDate, 1);
      maxDaysToCheck--;
    }

    // Calculate longest streak
    longestStreak = await this.calculateLongestStreak(
      userId,
      activeSupplements,
    );
    longestStreak = Math.max(longestStreak, currentStreak);

    return {
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_completed_date: lastCompletedDate,
    };
  }

  private async calculateSupplementStreak(
    userId: number,
    supplement: any,
  ) {
    let currentStreak = 0;
    let longestStreak = 0;
    let lastCompletedDate: string | null = null;
    let checkDate = startOfDay(new Date());

    // Check today first
    const todayComplete = await this.isDayCompleteForSupplement(
      userId,
      checkDate,
      supplement,
    );

    if (todayComplete) {
      lastCompletedDate = format(checkDate, 'yyyy-MM-dd');
      currentStreak = 1;
      checkDate = subDays(checkDate, 1);
    } else {
      // Check yesterday
      checkDate = subDays(checkDate, 1);
      const yesterdayComplete = await this.isDayCompleteForSupplement(
        userId,
        checkDate,
        supplement,
      );

      if (!yesterdayComplete) {
        // Streak is broken
        return {
          current_streak: 0,
          longest_streak: await this.calculateLongestStreakForSupplement(
            userId,
            supplement,
          ),
          last_completed_date: lastCompletedDate,
        };
      }

      lastCompletedDate = format(checkDate, 'yyyy-MM-dd');
      currentStreak = 1;
      checkDate = subDays(checkDate, 1);
    }

    // Go back in time to find the full current streak
    let maxDaysToCheck = 365;
    while (maxDaysToCheck > 0) {
      const dayComplete = await this.isDayCompleteForSupplement(
        userId,
        checkDate,
        supplement,
      );

      if (!dayComplete) {
        break;
      }

      currentStreak++;
      checkDate = subDays(checkDate, 1);
      maxDaysToCheck--;
    }

    // Calculate longest streak
    longestStreak = await this.calculateLongestStreakForSupplement(
      userId,
      supplement,
    );
    longestStreak = Math.max(longestStreak, currentStreak);

    return {
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_completed_date: lastCompletedDate,
    };
  }

  private async isDayCompleteForUser(
    userId: number,
    date: Date,
    activeSupplements: any[],
  ): Promise<boolean> {
    const startDate = startOfDay(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    for (const supplement of activeSupplements) {
      const intakeCount = await this.prisma.intake.count({
        where: {
          user_id: userId,
          user_supplement_id: supplement.id,
          taken_at: {
            gte: startDate,
            lt: endDate,
          },
        },
      });

      if (intakeCount < supplement.times_per_day) {
        return false;
      }
    }

    return true;
  }

  private async isDayCompleteForSupplement(
    userId: number,
    date: Date,
    supplement: any,
  ): Promise<boolean> {
    const startDate = startOfDay(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const intakeCount = await this.prisma.intake.count({
      where: {
        user_id: userId,
        user_supplement_id: supplement.id,
        taken_at: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    return intakeCount >= supplement.times_per_day;
  }

  private async calculateLongestStreak(
    userId: number,
    activeSupplements: any[],
  ): Promise<number> {
    // This is a simplified calculation
    // For production, you'd want to cache this or calculate more efficiently
    let longestStreak = 0;
    let currentStreakCalc = 0;
    let checkDate = startOfDay(new Date());
    let maxDaysToCheck = 365;

    while (maxDaysToCheck > 0) {
      const dayComplete = await this.isDayCompleteForUser(
        userId,
        checkDate,
        activeSupplements,
      );

      if (dayComplete) {
        currentStreakCalc++;
        longestStreak = Math.max(longestStreak, currentStreakCalc);
      } else {
        currentStreakCalc = 0;
      }

      checkDate = subDays(checkDate, 1);
      maxDaysToCheck--;
    }

    return longestStreak;
  }

  private async calculateLongestStreakForSupplement(
    userId: number,
    supplement: any,
  ): Promise<number> {
    let longestStreak = 0;
    let currentStreakCalc = 0;
    let checkDate = startOfDay(new Date());
    let maxDaysToCheck = 365;

    while (maxDaysToCheck > 0) {
      const dayComplete = await this.isDayCompleteForSupplement(
        userId,
        checkDate,
        supplement,
      );

      if (dayComplete) {
        currentStreakCalc++;
        longestStreak = Math.max(longestStreak, currentStreakCalc);
      } else {
        currentStreakCalc = 0;
      }

      checkDate = subDays(checkDate, 1);
      maxDaysToCheck--;
    }

    return longestStreak;
  }
}
