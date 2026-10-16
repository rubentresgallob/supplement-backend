import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserSupplementDto } from './dto/create-user-supplement.dto';
import { UpdateUserSupplementDto } from './dto/update-user-supplement.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { CATALOG_PUBLIC } from '../supplements/catalog-fields';

@Injectable()
export class UserSupplementsService {
  private readonly logger = new Logger(UserSupplementsService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateUserSupplementDto) {
    // If supplement_database_id is provided, verify it exists
    if (dto.supplementDatabaseId) {
      const supplementExists = await this.prisma.supplement_database.findUnique(
        {
          where: { id: dto.supplementDatabaseId },
        },
      );

      if (!supplementExists) {
        this.logger.warn(
          `Invalid supplement database ID: ${dto.supplementDatabaseId}`,
        );
        throw new BadRequestException(
          'Invalid supplement database ID provided',
        );
      }
    }

    // If it's a custom supplement, customName is required
    if (!dto.supplementDatabaseId && !dto.customName) {
      throw new BadRequestException(
        'customName is required for custom supplements',
      );
    }

    const userSupplement = await this.prisma.user_supplement.create({
      data: {
        user_id: userId,
        supplement_database_id: dto.supplementDatabaseId,
        custom_name: dto.customName,
        form: dto.form,
        dosage_amount: dto.dosageAmount,
        dosage_unit: dto.dosageUnit,
        times_per_day: dto.timesPerDay,
        schedules: dto.schedules,
        active: dto.active !== undefined ? dto.active : true,
      },
      include: {
        supplement_database: { select: CATALOG_PUBLIC },
      },
    });

    this.logger.log(
      `User supplement created: ${userSupplement.id} for user ${userId}`,
    );
    return userSupplement;
  }

  async findAll(userId: number) {
    const supplements = await this.prisma.user_supplement.findMany({
      // Los retirados se conservan solo para el historial (calendario)
      where: { user_id: userId, deleted_at: null },
      include: {
        supplement_database: { select: CATALOG_PUBLIC },
      },
      orderBy: { created_at: 'desc' },
    });

    return supplements;
  }

  async findOne(userId: number, id: number) {
    const supplement = await this.prisma.user_supplement.findUnique({
      where: { id },
      include: {
        supplement_database: { select: CATALOG_PUBLIC },
      },
    });

    if (!supplement || supplement.deleted_at) {
      this.logger.warn(`User supplement not found: ${id}`);
      throw new NotFoundException('Supplement not found');
    }

    if (supplement.user_id !== userId) {
      this.logger.warn(
        `User ${userId} attempted to access supplement ${id} owned by user ${supplement.user_id}`,
      );
      throw new ForbiddenException(
        'You do not have permission to access this supplement',
      );
    }

    return supplement;
  }

  async update(userId: number, id: number, dto: UpdateUserSupplementDto) {
    // Verify ownership
    const existing = await this.findOne(userId, id);

    const updated = await this.prisma.user_supplement.update({
      where: { id },
      data: {
        custom_name: dto.customName,
        form: dto.form,
        dosage_amount: dto.dosageAmount,
        dosage_unit: dto.dosageUnit,
        times_per_day: dto.timesPerDay,
        schedules: dto.schedules,
        active: dto.active,
      },
      include: {
        supplement_database: { select: CATALOG_PUBLIC },
      },
    });

    this.logger.log(`User supplement updated: ${id} by user ${userId}`);
    return updated;
  }

  /** Pro: unidades que quedan y cuántas se gastan por toma. */
  async updateStock(userId: number, id: number, dto: UpdateStockDto) {
    await this.findOne(userId, id);
    return this.prisma.user_supplement.update({
      where: { id },
      data: {
        stock_units: dto.stockUnits,
        units_per_intake: dto.unitsPerIntake,
      },
      include: { supplement_database: { select: CATALOG_PUBLIC } },
    });
  }

  async remove(userId: number, id: number) {
    // Verify ownership
    await this.findOne(userId, id);

    // No se borra de verdad: así el calendario sigue mostrando lo que se tomó
    // mientras estuvo en la rutina. Deja de contar desde hoy.
    await this.prisma.user_supplement.update({
      where: { id },
      data: { active: false, deleted_at: new Date() },
    });

    this.logger.log(`User supplement deleted: ${id} by user ${userId}`);
    return { message: 'Supplement deleted successfully' };
  }
}
