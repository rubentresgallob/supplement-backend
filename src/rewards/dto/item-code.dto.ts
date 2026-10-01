import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ItemCodeDto {
  @ApiProperty({ example: 'streak_freeze', description: 'Código del objeto' })
  @IsString()
  @IsNotEmpty()
  itemCode: string;
}
