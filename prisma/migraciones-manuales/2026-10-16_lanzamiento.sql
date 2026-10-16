-- Migración del lanzamiento gratuito (rama lanzamiento-gratuito). NO ejecutada.
-- Solo AÑADE columnas y tablas: no borra ni cambia datos.
-- Los usuarios que ya existen quedan con share_progress = false y share_supplements = false
-- (privacidad por defecto) y sin versiones aceptadas (verán la pantalla de reaceptación).
-- Ejecutar (desde nodejs_space, con la DATABASE_URL de producción en .env):
--   npx prisma db execute --file prisma/migraciones-manuales/2026-10-16_lanzamiento.sql --schema prisma/schema.prisma
-- Comprobar después que no queda nada pendiente:
--   npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script

BEGIN;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "age_confirmed_at" TIMESTAMP(3),
ADD COLUMN     "health_consent_at" TIMESTAMP(3),
ADD COLUMN     "inactivity_warned_at" TIMESTAMP(3),
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "privacy_accepted_at" TIMESTAMP(3),
ADD COLUMN     "privacy_version" TEXT,
ADD COLUMN     "share_progress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "share_supplements" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "social_intro_seen_at" TIMESTAMP(3),
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspension_reason" TEXT,
ADD COLUMN     "terms_accepted_at" TIMESTAMP(3),
ADD COLUMN     "terms_version" TEXT;

-- CreateTable
CREATE TABLE "sharing_event" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "setting" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sharing_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_block" (
    "id" SERIAL NOT NULL,
    "blocker_id" INTEGER NOT NULL,
    "blocked_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_report" (
    "id" SERIAL NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "reported_id" INTEGER,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sharing_event_user_id_idx" ON "sharing_event"("user_id");

-- CreateIndex
CREATE INDEX "user_block_blocked_id_idx" ON "user_block"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_block_blocker_id_blocked_id_key" ON "user_block"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "user_report_reporter_id_idx" ON "user_report"("reporter_id");

-- CreateIndex
CREATE INDEX "user_report_reported_id_idx" ON "user_report"("reported_id");

-- CreateIndex
CREATE INDEX "user_report_status_idx" ON "user_report"("status");

-- AddForeignKey
ALTER TABLE "sharing_event" ADD CONSTRAINT "sharing_event_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_reported_id_fkey" FOREIGN KEY ("reported_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;


COMMIT;
