import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global con UNA sola instancia de PrismaService para toda la app.
 * Antes cada módulo creaba la suya (9 clientes, cada uno con su propio pool),
 * lo que agota el límite de conexiones de Supabase (15 en el plan gratuito).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
