import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StreaksService } from '../streaks/streaks.service';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private prisma: PrismaService,
    private streaksService: StreaksService,
  ) {}

  async getFriendsLeaderboard(userId: number) {
    // Get all accepted friends
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ requester_id: userId }, { receiver_id: userId }],
        status: 'accepted',
      },
    });

    // Extract friend IDs
    const friendIds = friendships.map((f) =>
      f.requester_id === userId ? f.receiver_id : f.requester_id,
    );

    // Include current user
    const allUserIds = [userId, ...friendIds];

    // Get streak for each user
    const leaderboard = await Promise.all(
      allUserIds.map(async (id) => {
        const user = await this.prisma.user.findUnique({
          where: { id },
          select: { id: true, username: true },
        });

        const streak = await this.streaksService.getUserStreak(id);

        return {
          userId: id,
          username: user?.username,
          currentStreak: streak.current_streak,
          longestStreak: streak.longest_streak,
          isCurrentUser: id === userId,
        };
      }),
    );

    // Sort by current streak (descending), then by longest streak
    leaderboard.sort((a, b) => {
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak;
      }
      return b.longestStreak - a.longestStreak;
    });

    // Add rank
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    this.logger.log(
      `Friends leaderboard generated for user ${userId}: ${rankedLeaderboard.length} entries`,
    );

    return {
      leaderboard: rankedLeaderboard,
      totalUsers: rankedLeaderboard.length,
    };
  }

  async getAdherenceLeaderboard(userId: number) {
    // Get all accepted friends
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ requester_id: userId }, { receiver_id: userId }],
        status: 'accepted',
      },
    });

    // Extract friend IDs
    const friendIds = friendships.map((f) =>
      f.requester_id === userId ? f.receiver_id : f.requester_id,
    );

    // Include current user
    const allUserIds = [userId, ...friendIds];

    // Calculate adherence for each user
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leaderboard = await Promise.all(
      allUserIds.map(async (id) => {
        const user = await this.prisma.user.findUnique({
          where: { id },
          select: { id: true, username: true },
        });

        const activeSupplements = await this.prisma.user_supplement.findMany({
          where: {
            user_id: id,
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
          totalExpected > 0
            ? Math.round((totalTaken / totalExpected) * 100)
            : 0;

        return {
          userId: id,
          username: user?.username,
          adherencePercent,
          intakesTaken: totalTaken,
          intakesExpected: totalExpected,
          activeSupplements: activeSupplements.length,
          isCurrentUser: id === userId,
        };
      }),
    );

    // Sort by adherence percentage (descending)
    leaderboard.sort((a, b) => b.adherencePercent - a.adherencePercent);

    // Add rank
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    this.logger.log(
      `Adherence leaderboard generated for user ${userId}: ${rankedLeaderboard.length} entries`,
    );

    return {
      leaderboard: rankedLeaderboard,
      totalUsers: rankedLeaderboard.length,
      period: 'Last 30 days',
    };
  }
}
