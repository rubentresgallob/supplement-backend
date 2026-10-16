import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendRequestDto, SharingDto } from './dto/friend-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('Friends')
@Controller('friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendsController {
  private readonly logger = new Logger(FriendsController.name);

  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Send friend request by username or email' })
  @ApiResponse({ status: 201, description: 'Friend request sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendRequest(@Request() req, @Body() dto: FriendRequestDto) {
    // Sin el destinatario: puede ser un email (dato personal)
    this.logger.log(`Friend request from user ID ${req.user.id}`);
    return this.friendsService.sendRequest(req.user.id, dto.identifier);
  }

  @Post('accept/:requestId')
  @ApiOperation({ summary: 'Accept friend request' })
  @ApiParam({ name: 'requestId', example: 1, description: 'Friend request ID' })
  @ApiResponse({ status: 200, description: 'Friend request accepted' })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async acceptRequest(
    @Request() req,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    this.logger.log(
      `User ID ${req.user.id} accepting friend request ${requestId}`,
    );
    return this.friendsService.acceptRequest(req.user.id, requestId);
  }

  @Post('reject/:requestId')
  @ApiOperation({ summary: 'Reject friend request' })
  @ApiParam({ name: 'requestId', example: 1, description: 'Friend request ID' })
  @ApiResponse({ status: 200, description: 'Friend request rejected' })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async rejectRequest(
    @Request() req,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    this.logger.log(
      `User ID ${req.user.id} rejecting friend request ${requestId}`,
    );
    return this.friendsService.rejectRequest(req.user.id, requestId);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of accepted friends' })
  @ApiResponse({ status: 200, description: 'List of friends' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFriends(@Request() req) {
    this.logger.log(`Fetching friends for user ID: ${req.user.id}`);
    return this.friendsService.getFriends(req.user.id);
  }

  @Delete(':friendId')
  @ApiOperation({ summary: 'Remove friend' })
  @ApiParam({ name: 'friendId', example: 1, description: 'Friend user ID' })
  @ApiResponse({ status: 200, description: 'Friend removed successfully' })
  @ApiResponse({ status: 404, description: 'Friendship not found' })
  async removeFriend(
    @Request() req,
    @Param('friendId', ParseIntPipe) friendId: number,
  ) {
    this.logger.log(
      `User ID ${req.user.id} removing friend ${friendId}`,
    );
    return this.friendsService.removeFriend(req.user.id, friendId);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get pending friend requests received' })
  @ApiResponse({ status: 200, description: 'List of pending requests' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPendingRequests(@Request() req) {
    this.logger.log(
      `Fetching pending requests for user ID: ${req.user.id}`,
    );
    return this.friendsService.getPendingRequests(req.user.id);
  }

  @Get(':friendId/progress')
  @ApiOperation({ summary: 'View friend\'s public progress' })
  @ApiParam({ name: 'friendId', example: 1, description: 'Friend user ID' })
  @ApiResponse({ status: 200, description: 'Friend progress data' })
  @ApiResponse({ status: 403, description: 'Not friends or friendship not accepted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getFriendProgress(
    @Request() req,
    @Param('friendId', ParseIntPipe) friendId: number,
  ) {
    this.logger.log(
      `User ID ${req.user.id} viewing progress of friend ${friendId}`,
    );
    return this.friendsService.getFriendProgress(req.user.id, friendId);
  }

  @Get('sharing')
  @ApiOperation({ summary: 'Mis interruptores: compartir progreso y compartir suplementos' })
  getSharing(@Request() req) {
    return this.friendsService.getSharing(req.user.id);
  }

  @Put('sharing')
  @ApiOperation({ summary: 'Cambiar los interruptores (efecto inmediato; se guarda cada cambio)' })
  setSharing(@Request() req, @Body() dto: SharingDto) {
    return this.friendsService.setSharing(req.user.id, dto);
  }

  @Get(':friendId/profile')
  @ApiOperation({ summary: 'Perfil de un amigo: siempre su Capsu y mes de alta; progreso y stack si los comparte' })
  @ApiResponse({ status: 403, description: 'No sois amigos' })
  getFriendProfile(@Request() req, @Param('friendId', ParseIntPipe) friendId: number) {
    return this.friendsService.getFriendProfile(req.user.id, friendId);
  }

  @Post(':friendId/motivate')
  @ApiOperation({ summary: 'Motivar a un amigo: le llega una notificación push (1 al día)' })
  @ApiResponse({ status: 403, description: 'No sois amigos' })
  @ApiResponse({ status: 429, description: 'Ya le has motivado hoy' })
  motivate(@Request() req, @Param('friendId', ParseIntPipe) friendId: number) {
    return this.friendsService.motivate(req.user.id, friendId);
  }

  @Get(':friendId/calendar')
  @ApiOperation({ summary: 'Calendario mensual de un amigo (si lo comparte)' })
  @ApiResponse({ status: 403, description: 'No sois amigos, o SHARING_DISABLED' })
  getFriendCalendar(
    @Request() req,
    @Param('friendId', ParseIntPipe) friendId: number,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    let year = now.getFullYear();
    let m = now.getMonth() + 1;
    if (month) {
      const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
      if (!match) throw new BadRequestException('month debe tener el formato AAAA-MM');
      year = Number(match[1]);
      m = Number(match[2]);
    }
    return this.friendsService.getFriendCalendar(req.user.id, friendId, year, m);
  }
}
