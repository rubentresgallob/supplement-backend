import { IsNumber, IsOptional, Max, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty({
    example: 60,
    nullable: true,
    description: 'Unidades que te quedan (cápsulas, cacitos...). null = desactivar el control de stock',
  })
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  @Max(100000)
  stockUnits: number | null;

  @ApiPropertyOptional({ example: 1, description: 'Unidades que gastas en cada toma' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1000)
  unitsPerIntake?: number;
}
