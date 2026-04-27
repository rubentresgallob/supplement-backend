import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StreaksService } from '../streaks/streaks.service';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(
    private prisma: PrismaService,
    private streaksService: StreaksService,
  ) {}

  async sendRequest(userId: number, identifier: string) {
    // Find user by username or email
    const targetUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!targetUser) {
      this.logger.warn(`User not found with identifier: ${identifier}`);
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
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            email: true,
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
          select: { id: true, username: true, email: true },
        },
        receiver: {
          select: { id: true, username: true, email: true },
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
          select: { id: true, username: true, email: true },
        },
        receiver: {
          select: { id: true, username: true, email: true },
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
            email: true,
            created_at: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            email: true,
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
            email: true,
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
}
