import { Module } from '@nestjs/common';
import { RetentionService } from './retention.service';

/** Conservación de datos. El disparador diario está pendiente de decidir (ver INFORME.md). */
@Module({
  providers: [RetentionService],
  exports: [RetentionService],
})
export class RetentionModule {}
