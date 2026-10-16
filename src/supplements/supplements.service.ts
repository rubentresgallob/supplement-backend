import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CATALOG_PUBLIC } from './catalog-fields';

@Injectable()
export class SupplementsService {
  private readonly logger = new Logger(SupplementsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 100) {
    const skip = (page - 1) * limit;

    const [supplements, total] = await Promise.all([
      this.prisma.supplement_database.findMany({
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: CATALOG_PUBLIC,
      }),
      this.prisma.supplement_database.count(),
    ]);

    return {
      data: supplements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const supplement = await this.prisma.supplement_database.findUnique({
      where: { id },
      select: CATALOG_PUBLIC,
    });

    if (!supplement) {
      this.logger.warn(`Supplement not found with ID: ${id}`);
      throw new NotFoundException(`Supplement with ID ${id} not found`);
    }

    return supplement;
  }

  async search(query: string) {
    const supplements = await this.prisma.supplement_database.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            category: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: { name: 'asc' },
      select: CATALOG_PUBLIC,
    });

    return {
      data: supplements,
      count: supplements.length,
    };
  }
}
