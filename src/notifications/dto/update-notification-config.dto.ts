import { IsBoolean, IsArray, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationConfigDto {
  @ApiPropertyOptional({ example: true, description: 'Enable/disable all notifications globally' })
  @IsOptional()
  @IsBoolean()
  globalEnabled?: boolean;

  @ApiPropertyOptional({ example: [{ userSupplementId: 1, enabled: true, reminderTimes: ['08:00', '20:00'] }], description: 'Array of notification configurations per supplement' })
  @IsOptional()
  @IsArray()
  supplementConfigs?: any[];
}
