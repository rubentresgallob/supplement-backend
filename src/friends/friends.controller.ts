import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendRequestDto } from './dto/friend-request.dto';
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
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendRequest(@Request() req, @Body() dto: FriendRequestDto) {
    this.logger.log(
      `Friend request from user ID ${req.user.id} to ${dto.identifier}`,
    );
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
}
