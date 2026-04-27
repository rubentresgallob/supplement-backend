import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Request,
  UseGuards,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { IntakesService } from './intakes.service';
import { CreateIntakeDto } from './dto/create-intake.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';

@ApiTags('Intakes')
@Controller('intakes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntakesController {
  private readonly logger = new Logger(IntakesController.name);

  constructor(private readonly intakesService: IntakesService) {}

  @Post()
  @ApiOperation({ summary: 'Record a supplement intake' })
  @ApiResponse({ status: 201, description: 'Intake recorded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Request() req, @Body() createIntakeDto: CreateIntakeDto) {
    this.logger.log(`Recording intake for user ID: ${req.user.id}`);
    return this.intakesService.create(req.user.id, createIntakeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get intake history with optional filters' })
  @ApiQuery({ name: 'startDate', required: false, example: '2024-01-01', description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, example: '2024-12-31', description: 'Filter to date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'userSupplementId', required: false, example: 1, description: 'Filter by supplement ID' })
  @ApiResponse({ status: 200, description: 'Intake history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userSupplementId') userSupplementId?: string,
  ) {
    this.logger.log(`Fetching intakes for user ID: ${req.user.id}`);
    return this.intakesService.findAll(
      req.user.id,
      startDate,
      endDate,
      userSupplementId ? parseInt(userSupplementId) : undefined,
    );
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today\'s intakes' })
  @ApiResponse({ status: 200, description: 'Today\'s intakes' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getToday(@Request() req) {
    this.logger.log(`Fetching today's intakes for user ID: ${req.user.id}`);
    return this.intakesService.getToday(req.user.id);
  }

  @Get('progress/today')
  @ApiOperation({ summary: 'Get daily progress for active supplements' })
  @ApiResponse({ status: 200, description: 'Daily progress summary' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDailyProgress(@Request() req) {
    this.logger.log(`Fetching daily progress for user ID: ${req.user.id}`);
    return this.intakesService.getDailyProgress(req.user.id);
  }

  @Get('stats/:supplementId')
  @ApiOperation({ summary: 'Get statistics for a specific supplement' })
  @ApiParam({ name: 'supplementId', example: 1, description: 'User supplement ID' })
  @ApiResponse({ status: 200, description: 'Supplement statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats(
    @Request() req,
    @Param('supplementId', ParseIntPipe) supplementId: number,
  ) {
    this.logger.log(
      `Fetching stats for supplement ${supplementId}, user ID: ${req.user.id}`,
    );
    return this.intakesService.getSupplementStats(req.user.id, supplementId);
  }
}
