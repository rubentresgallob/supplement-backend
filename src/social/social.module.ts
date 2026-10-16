import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Module,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { REPORT_REASONS, SocialService } from './social.service';
import type { ReportReason } from './social.service';

class ReportDto {
  @ApiProperty({ enum: Object.keys(REPORT_REASONS), example: 'offensive_name' })
  @IsIn(Object.keys(REPORT_REASONS))
  reason: ReportReason;

  @ApiPropertyOptional({ example: 'Me insulta en su nombre de usuario', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}

@ApiTags('Users (bloquear y denunciar)')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get('blocked')
  @ApiOperation({ summary: 'Personas que he bloqueado' })
  listBlocked(@Request() req) {
    return this.social.listBlocked(req.user.id);
  }

  @Post(':userId/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bloquear: borra la amistad, impide solicitudes y oculta los perfiles' })
  block(@Request() req, @Param('userId', ParseIntPipe) userId: number) {
    return this.social.block(req.user.id, userId);
  }

  @Delete(':userId/block')
  @ApiOperation({ summary: 'Desbloquear' })
  unblock(@Request() req, @Param('userId', ParseIntPipe) userId: number) {
    return this.social.unblock(req.user.id, userId);
  }

  @Post(':userId/report')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Denunciar a un usuario (se avisa al administrador)' })
  report(@Request() req, @Param('userId', ParseIntPipe) userId: number, @Body() dto: ReportDto) {
    return this.social.report(req.user.id, userId, dto.reason, dto.details);
  }
}

@Module({
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
