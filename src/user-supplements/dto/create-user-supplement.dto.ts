import {
  IsInt,
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
  IsOptional,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserSupplementDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID from the pre-loaded supplement database (optional)',
  })
  @IsOptional()
  @IsInt()
  supplementDatabaseId?: number;

  @ApiPropertyOptional({
    example: 'Mi vitamina personalizada',
    description: 'Custom name if not using pre-loaded supplement',
  })
  @IsOptional()
  @IsString()
  customName?: string;

  @ApiProperty({
    example: 'cápsula',
    description: 'Form of the supplement',
  })
  @IsString()
  form: string;

  @ApiProperty({
    example: 500,
    description: 'Dosage amount',
  })
  @IsNumber()
  @Min(0)
  dosageAmount: number;

  @ApiProperty({
    example: 'mg',
    description: 'Dosage unit',
  })
  @IsString()
  dosageUnit: string;

  @ApiProperty({
    example: 2,
    description: 'Number of times to take per day',
  })
  @IsInt()
  @Min(1)
  timesPerDay: number;

  @ApiProperty({
    example: ['08:00', '20:00'],
    description: 'Array of scheduled times',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  schedules: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the supplement is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
