import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiProperty({ example: 'SecurePass123', description: 'Contraseña actual, para confirmar' })
  @IsString()
  @MinLength(1)
  password: string;
}
