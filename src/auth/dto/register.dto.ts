import { IsEmail, IsString, MinLength, MaxLength, Equals } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Las tres casillas del registro (y de la reaceptación): obligatorias y por separado. */
export class LegalAcceptanceDto {
  @ApiProperty({ example: true, description: 'Tengo 18 años o más' })
  @Equals(true, { message: 'Debes tener 18 años o más' })
  ageConfirmed: boolean;

  @ApiProperty({ example: true, description: 'Acepto los Términos de uso y la Política de privacidad' })
  @Equals(true, { message: 'Debes aceptar los Términos y la Política de privacidad' })
  acceptTerms: boolean;

  @ApiProperty({ example: true, description: 'Consiento el tratamiento de mis datos de salud (art. 9 RGPD)' })
  @Equals(true, { message: 'Sin tratar tus datos de salud la app no puede funcionar' })
  healthConsent: boolean;
}

export class RegisterDto extends LegalAcceptanceDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: 'SecurePass123', description: 'User password (min 6 characters)' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'johndoe', description: 'Unique username (3-30 characters)' })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  username: string;
}
