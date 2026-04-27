import {
  Controller,
  Get,
  Param,
  Request,
  UseGuards,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { StreaksService } from './streaks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('Streaks')
@Controller('streaks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StreaksController {
  private readonly logger = new Logger(StreaksController.name);

  constructor(private readonly streaksService: StreaksService) {}

  @Get('user')
  @ApiOperation({ summary: 'Get user\'s global streak' })
  @ApiResponse({ status: 200, description: 'User global streak data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserStreak(@Request() req) {
    this.logger.log(`Fetching global streak for user ID: ${req.user.id}`);
    return this.streaksService.getUserStreak(req.user.id);
  }

  @Get('supplement/:id')
  @ApiOperation({ summary: 'Get streak for a specific supplement' })
  @ApiParam({ name: 'id', example: 1, description: 'User supplement ID' })
  @ApiResponse({ status: 200, description: 'Supplement streak data' })
  @ApiResponse({ status: 404, description: 'Supplement not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSupplementStreak(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.logger.log(
      `Fetching streak for supplement ${id}, user ID: ${req.user.id}`,
    );
    return this.streaksService.getSupplementStreak(req.user.id, id);
  }
}
