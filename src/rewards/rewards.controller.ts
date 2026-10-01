import {
  Body,
  Controller,
  Get,
  Logger,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RewardsService } from './rewards.service';
import { ShopService } from './shop.service';
import { ItemCodeDto } from './dto/item-code.dto';

@ApiTags('Rewards')
@Controller('rewards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RewardsController {
  private readonly logger = new Logger(RewardsController.name);

  constructor(private readonly rewardsService: RewardsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Saldo de puntos, racha, objetivos semanales, logros y premios nuevos',
  })
  @ApiResponse({ status: 200, description: 'Resumen de recompensas' })
  async getSummary(@Request() req) {
    return this.rewardsService.getSummary(req.user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historial de puntos ganados y gastados' })
  @ApiResponse({ status: 200, description: 'Últimos 100 movimientos' })
  async getHistory(@Request() req) {
    return this.rewardsService.getHistory(req.user.id);
  }
}

@ApiTags('Shop')
@Controller('shop')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShopController {
  private readonly logger = new Logger(ShopController.name);

  constructor(private readonly shopService: ShopService) {}

  @Get('items')
  @ApiOperation({ summary: 'Catálogo de la tienda con lo que ya tiene el usuario' })
  @ApiResponse({ status: 200, description: 'Objetos de la tienda' })
  async getItems(@Request() req) {
    return this.shopService.getItems(req.user.id);
  }

  @Post('buy')
  @ApiOperation({ summary: 'Comprar un objeto con puntos' })
  @ApiResponse({ status: 201, description: 'Compra realizada' })
  @ApiResponse({ status: 400, description: 'Puntos insuficientes o ya lo tienes' })
  async buy(@Request() req, @Body() dto: ItemCodeDto) {
    this.logger.log(`User ${req.user.id} buying ${dto.itemCode}`);
    return this.shopService.buy(req.user.id, dto.itemCode);
  }

  @Post('equip')
  @ApiOperation({ summary: 'Equipar un objeto (medalla, banner o accesorio de Capsu)' })
  @ApiResponse({ status: 201, description: 'Objeto equipado' })
  async equip(@Request() req, @Body() dto: ItemCodeDto) {
    return this.shopService.equip(req.user.id, dto.itemCode);
  }

  @Post('unequip')
  @ApiOperation({ summary: 'Quitar un objeto equipado' })
  @ApiResponse({ status: 201, description: 'Objeto quitado' })
  async unequip(@Request() req, @Body() dto: ItemCodeDto) {
    return this.shopService.unequip(req.user.id, dto.itemCode);
  }
}
