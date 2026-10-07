import { IsBoolean } from 'class-validator';
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FriendRequestDto {
  @ApiProperty({
    example: 'johndoe',
    description: 'Username or email of the user to send friend request to',
  })
  @IsString()
  @MinLength(3)
  identifier: string;
}

export class SharingDto {
  @IsBoolean()
  enabled: boolean;
}
