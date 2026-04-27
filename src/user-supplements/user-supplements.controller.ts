import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { UserSupplementsService } from './user-supplements.service';
import { CreateUserSupplementDto } from './dto/create-user-supplement.dto';
import { UpdateUserSupplementDto } from './dto/update-user-supplement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('User Supplements')
@Controller('user-supplements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserSupplementsController {
  private readonly logger = new Logger(UserSupplementsController.name);

  constructor(
    private readonly userSupplementsService: UserSupplementsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user supplement' })
  @ApiResponse({ status: 201, description: 'Supplement created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Request() req,
    @Body() createUserSupplementDto: CreateUserSupplementDto,
  ) {
    this.logger.log(`Creating supplement for user ID: ${req.user.id}`);
    return this.userSupplementsService.create(
      req.user.id,
      createUserSupplementDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all supplements for authenticated user' })
  @ApiResponse({ status: 200, description: 'List of user supplements' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Request() req) {
    this.logger.log(`Fetching supplements for user ID: ${req.user.id}`);
    return this.userSupplementsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific user supplement by ID' })
  @ApiParam({ name: 'id', example: 1, description: 'User supplement ID' })
  @ApiResponse({ status: 200, description: 'User supplement details' })
  @ApiResponse({ status: 404, description: 'Supplement not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  async findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Fetching supplement ${id} for user ID: ${req.user.id}`);
    return this.userSupplementsService.findOne(req.user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user supplement' })
  @ApiParam({ name: 'id', example: 1, description: 'User supplement ID' })
  @ApiResponse({ status: 200, description: 'Supplement updated successfully' })
  @ApiResponse({ status: 404, description: 'Supplement not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserSupplementDto: UpdateUserSupplementDto,
  ) {
    this.logger.log(`Updating supplement ${id} for user ID: ${req.user.id}`);
    return this.userSupplementsService.update(
      req.user.id,
      id,
      updateUserSupplementDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user supplement' })
  @ApiParam({ name: 'id', example: 1, description: 'User supplement ID' })
  @ApiResponse({ status: 200, description: 'Supplement deleted successfully' })
  @ApiResponse({ status: 404, description: 'Supplement not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  async remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Deleting supplement ${id} for user ID: ${req.user.id}`);
    return this.userSupplementsService.remove(req.user.id, id);
  }
}
