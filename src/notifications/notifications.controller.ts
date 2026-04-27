import { Controller, Get, Put, Body, Request, UseGuards, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationConfigDto } from './dto/update-notification-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get notification configuration' })
  @ApiResponse({ status: 200, description: 'Notification configuration' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConfig(@Request() req) {
    this.logger.log(`Fetching notification config for user ID: ${req.user.id}`);
    return this.notificationsService.getConfig(req.user.id);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update notification configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateConfig(@Request() req, @Body() dto: UpdateNotificationConfigDto) {
    this.logger.log(`Updating notification config for user ID: ${req.user.id}`);
    return this.notificationsService.updateConfig(req.user.id, dto);
  }
}
