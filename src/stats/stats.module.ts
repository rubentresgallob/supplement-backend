import {
  Controller,
  Get,
  Module,
  ParseIntPipe,
  DefaultValuePipe,
  Query,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProEnabledGuard, ProGuard } from '../subscription/pro.guard';
import { StreaksModule } from '../streaks/streaks.module';
import { StatsService } from './stats.service';

@ApiTags('Stats (Pro)')
@Controller('stats')
@UseGuards(ProEnabledGuard, JwtAuthGuard, ProGuard) // con Pro apagado: 404 antes que 401
@ApiBearerAuth()
class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Estadísticas avanzadas (solo Pro)' })
  @ApiQuery({ name: 'days', required: false, example: 30, description: '7, 30, 90 o 365' })
  @ApiResponse({ status: 403, description: 'PRO_REQUIRED' })
  getStats(
    @Request() req,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    if (![7, 30, 90, 365].includes(days)) {
      throw new BadRequestException('days debe ser 7, 30, 90 o 365');
    }
    return this.statsService.getStats(req.user.id, days);
  }
}

@Module({
  imports: [StreaksModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
