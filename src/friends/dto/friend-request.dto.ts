import { IsBoolean, IsOptional } from 'class-validator';
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

/** Interruptores de privacidad: se mandan solo los que cambian. */
export class SharingDto {
  @IsOptional()
  @IsBoolean()
  progress?: boolean;

  @IsOptional()
  @IsBoolean()
  supplements?: boolean;

  /** Ya vio la pantalla que explica qué ven sus amigos */
  @IsOptional()
  @IsBoolean()
  introSeen?: boolean;
}
