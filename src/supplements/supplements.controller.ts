import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { SupplementsService } from './supplements.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';

@ApiTags('Supplements Database')
@Controller('supplements/database')
export class SupplementsController {
  private readonly logger = new Logger(SupplementsController.name);

  constructor(private readonly supplementsService: SupplementsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all pre-loaded supplements with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'List of supplements with pagination' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 100;
    this.logger.log(`Fetching supplements: page=${pageNum}, limit=${limitNum}`);
    return this.supplementsService.findAll(pageNum, limitNum);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search supplements by name or category' })
  @ApiQuery({ name: 'q', required: true, example: 'Vitamina', description: 'Search query' })
  @ApiResponse({ status: 200, description: 'List of matching supplements' })
  async search(@Query('q') query: string) {
    return this.supplementsService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplement details by ID' })
  @ApiParam({ name: 'id', example: 1, description: 'Supplement ID' })
  @ApiResponse({ status: 200, description: 'Supplement details' })
  @ApiResponse({ status: 404, description: 'Supplement not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Fetching supplement with ID: ${id}`);
    return this.supplementsService.findOne(id);
  }
}
