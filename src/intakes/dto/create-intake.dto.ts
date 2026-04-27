import { IsInt, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIntakeDto {
  @ApiProperty({
    example: 1,
    description: 'User supplement ID',
  })
  @IsInt()
  userSupplementId: number;

  @ApiPropertyOptional({
    example: '2024-12-11T10:30:00Z',
    description: 'Timestamp when supplement was taken (defaults to now)',
  })
  @IsOptional()
  @IsDateString()
  takenAt?: string;
}
