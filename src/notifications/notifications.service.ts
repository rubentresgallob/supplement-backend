import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationConfigDto } from './dto/update-notification-config.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async getConfig(userId: number) {
    let config = await this.prisma.notification_config.findUnique({ where: { user_id: userId } });

    if (!config) {
      config = await this.prisma.notification_config.create({
        data: { user_id: userId, global_enabled: true, supplement_configs: '[]' },
      });
      this.logger.log(`Created default notification config for user ${userId}`);
    }

    return { globalEnabled: config.global_enabled, supplementConfigs: JSON.parse(config.supplement_configs) };
  }

  async updateConfig(userId: number, dto: UpdateNotificationConfigDto) {
    let config = await this.prisma.notification_config.findUnique({ where: { user_id: userId } });
    const supplementConfigsJson = dto.supplementConfigs ? JSON.stringify(dto.supplementConfigs) : undefined;

    if (!config) {
      config = await this.prisma.notification_config.create({
        data: { user_id: userId, global_enabled: dto.globalEnabled ?? true, supplement_configs: supplementConfigsJson || '[]' },
      });
    } else {
      config = await this.prisma.notification_config.update({
        where: { user_id: userId },
        data: { global_enabled: dto.globalEnabled, supplement_configs: supplementConfigsJson },
      });
    }

    this.logger.log(`Notification config updated for user ${userId}`);
    return { globalEnabled: config.global_enabled, supplementConfigs: JSON.parse(config.supplement_configs) };
  }
}
