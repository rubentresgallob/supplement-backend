import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiProperty({ example: 'SecurePass123', description: 'Contraseña actual, para confirmar' })
  @IsString()
  @MinLength(1)
  password: string;
}

export class DeleteAccountWithPasswordDto extends DeleteAccountDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}
