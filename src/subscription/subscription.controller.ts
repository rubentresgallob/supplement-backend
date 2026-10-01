import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';

class ActivateTestDto {
  @ApiPropertyOptional({ example: 30, description: 'Días de Pro de prueba' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

@ApiTags('Subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ApiOperation({ summary: 'Estado del plan Pro, precios y funciones' })
  @ApiResponse({ status: 200, description: 'Estado de la suscripción' })
  getStatus(@Request() req) {
    return this.subscriptionService.getStatus(req.user.id);
  }

  @Post('test/activate')
  @ApiOperation({ summary: 'Activar Pro sin pagar (solo con PRO_TEST_MODE=true)' })
  @ApiResponse({ status: 403, description: 'Modo de prueba desactivado' })
  activateTest(@Request() req, @Body() dto: ActivateTestDto) {
    return this.subscriptionService.activateTest(req.user.id, dto.days);
  }

  @Post('test/deactivate')
  @ApiOperation({ summary: 'Quitar el Pro de prueba (solo con PRO_TEST_MODE=true)' })
  deactivateTest(@Request() req) {
    return this.subscriptionService.deactivateTest(req.user.id);
  }
}
