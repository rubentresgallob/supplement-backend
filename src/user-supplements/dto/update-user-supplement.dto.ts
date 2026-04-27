import {
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
  IsOptional,
  Min,
  IsInt,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserSupplementDto {
  @ApiPropertyOptional({
    example: 'Mi vitamina actualizada',
    description: 'Custom name',
  })
  @IsOptional()
  @IsString()
  customName?: string;

  @ApiPropertyOptional({
    example: 'pastilla',
    description: 'Form of the supplement',
  })
  @IsOptional()
  @IsString()
  form?: string;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Dosage amount',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dosageAmount?: number;

  @ApiPropertyOptional({
    example: 'mg',
    description: 'Dosage unit',
  })
  @IsOptional()
  @IsString()
  dosageUnit?: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'Number of times to take per day',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  timesPerDay?: number;

  @ApiPropertyOptional({
    example: ['08:00', '14:00', '20:00'],
    description: 'Array of scheduled times',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  schedules?: string[];

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the supplement is active',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
