import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email no válido' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email no válido' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Código de 6 cifras recibido por email' })
  @IsString()
  @Length(6, 6, { message: 'El código tiene 6 cifras' })
  @Matches(/^\d{6}$/, { message: 'El código tiene 6 cifras' })
  code: string;

  @ApiProperty({ example: 'NuevaClave123' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email no válido' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Código de 6 cifras recibido por email' })
  @IsString()
  @Length(6, 6, { message: 'El código tiene 6 cifras' })
  @Matches(/^\d{6}$/, { message: 'El código tiene 6 cifras' })
  code: string;
}
