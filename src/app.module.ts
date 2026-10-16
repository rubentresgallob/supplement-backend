import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClientIpThrottlerGuard } from './common/client-ip';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SupplementsModule } from './supplements/supplements.module';
import { UserSupplementsModule } from './user-supplements/user-supplements.module';
import { IntakesModule } from './intakes/intakes.module';
import { StreaksModule } from './streaks/streaks.module';
import { FriendsModule } from './friends/friends.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { RewardsModule } from './rewards/rewards.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { MailModule } from './mail/mail.service';
import { StatsModule } from './stats/stats.module';
import { CalendarModule } from './calendar/calendar.module';
import { PushModule } from './push/push.module';
import { SocialModule } from './social/social.module';
import { RetentionModule } from './retention/retention.module';

@Module({
  imports: [
    PrismaModule,
    SubscriptionModule,
    MailModule,
    PushModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    AuthModule,
    SupplementsModule,
    UserSupplementsModule,
    IntakesModule,
    StreaksModule,
    FriendsModule,
    LeaderboardModule,
    NotificationsModule,
    RewardsModule,
    StatsModule,
    CalendarModule,
    SocialModule,
    RetentionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ClientIpThrottlerGuard },
  ],
})
export class AppModule {}
