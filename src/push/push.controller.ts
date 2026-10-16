import { Body, Controller, Delete, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PushService } from './push.service';

export class PushTokenDto {
  @ApiProperty({ description: 'Token de Firebase Cloud Messaging del móvil' })
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  token: string;

  @ApiProperty({ example: 'android', enum: ['android', 'ios'] })
  @IsIn(['android', 'ios'])
  platform: string;
}

export class RemovePushTokenDto {
  @IsString()
  @MaxLength(4096)
  token: string;
}

@ApiTags('Push')
@Controller('push')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('token')
  @ApiOperation({ summary: 'Registrar el móvil para recibir notificaciones push' })
  saveToken(@Request() req, @Body() dto: PushTokenDto) {
    return this.push.saveToken(req.user.id, dto.token, dto.platform);
  }

  @Delete('token')
  @ApiOperation({ summary: 'Dejar de recibir push en este móvil (al cerrar sesión)' })
  removeToken(@Request() req, @Body() dto: RemovePushTokenDto) {
    return this.push.removeToken(req.user.id, dto.token);
  }
}
