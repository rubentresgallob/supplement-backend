import {
  BadRequestException,
  Controller,
  Get,
  Module,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';

@ApiTags('Calendar')
@Controller('calendar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOperation({ summary: 'Progreso de un mes, día a día (para todos los usuarios)' })
  @ApiQuery({ name: 'month', required: false, example: '2026-10', description: 'AAAA-MM; por defecto el mes actual' })
  getMonth(@Request() req, @Query('month') month?: string) {
    const now = new Date();
    if (!month) {
      return this.calendarService.getMonth(req.user.id, now.getFullYear(), now.getMonth() + 1);
    }
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
    if (!match) throw new BadRequestException('month debe tener el formato AAAA-MM');
    return this.calendarService.getMonth(req.user.id, Number(match[1]), Number(match[2]));
  }
}

@Module({
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
