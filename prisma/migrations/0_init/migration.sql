-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "pro_until" TIMESTAMP(3),
    "pro_source" TEXT,
    "reset_code_hash" TEXT,
    "reset_expires" TIMESTAMP(3),
    "reset_attempts" INTEGER NOT NULL DEFAULT 0,
    "share_with_friends" BOOLEAN NOT NULL DEFAULT true,
    "consent_at" TIMESTAMP(3),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verify_code_hash" TEXT,
    "verify_sent_at" TIMESTAMP(3),
    "verify_attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplement_database" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "forms" TEXT[],
    "typical_dosage" TEXT NOT NULL,
    "functions" TEXT[],
    "benefits" TEXT[],
    "notes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplement_database_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_supplement" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "supplement_database_id" INTEGER,
    "custom_name" TEXT,
    "form" TEXT NOT NULL,
    "dosage_amount" DOUBLE PRECISION NOT NULL,
    "dosage_unit" TEXT NOT NULL,
    "times_per_day" INTEGER NOT NULL,
    "schedules" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stock_units" DOUBLE PRECISION,
    "units_per_intake" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_supplement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_supplement_id" INTEGER NOT NULL,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendship" (
    "id" SERIAL NOT NULL,
    "requester_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_config" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "global_enabled" BOOLEAN NOT NULL DEFAULT true,
    "supplement_configs" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_transaction" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_item" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "item_code" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streak_freeze" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streak_freeze_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_token" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motivation" (
    "id" SERIAL NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motivation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE INDEX "user_supplement_user_id_idx" ON "user_supplement"("user_id");

-- CreateIndex
CREATE INDEX "user_supplement_supplement_database_id_idx" ON "user_supplement"("supplement_database_id");

-- CreateIndex
CREATE INDEX "intake_user_id_idx" ON "intake"("user_id");

-- CreateIndex
CREATE INDEX "intake_user_supplement_id_idx" ON "intake"("user_supplement_id");

-- CreateIndex
CREATE INDEX "intake_taken_at_idx" ON "intake"("taken_at");

-- CreateIndex
CREATE INDEX "friendship_requester_id_idx" ON "friendship"("requester_id");

-- CreateIndex
CREATE INDEX "friendship_receiver_id_idx" ON "friendship"("receiver_id");

-- CreateIndex
CREATE INDEX "friendship_status_idx" ON "friendship"("status");

-- CreateIndex
CREATE UNIQUE INDEX "friendship_requester_id_receiver_id_key" ON "friendship"("requester_id", "receiver_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_config_user_id_key" ON "notification_config"("user_id");

-- CreateIndex
CREATE INDEX "points_transaction_user_id_idx" ON "points_transaction"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "points_transaction_user_id_ref_key" ON "points_transaction"("user_id", "ref");

-- CreateIndex
CREATE INDEX "user_item_user_id_idx" ON "user_item"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_item_user_id_item_code_key" ON "user_item"("user_id", "item_code");

-- CreateIndex
CREATE INDEX "streak_freeze_user_id_idx" ON "streak_freeze"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "streak_freeze_user_id_day_key" ON "streak_freeze"("user_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "push_token_token_key" ON "push_token"("token");

-- CreateIndex
CREATE INDEX "push_token_user_id_idx" ON "push_token"("user_id");

-- CreateIndex
CREATE INDEX "motivation_sender_id_receiver_id_created_at_idx" ON "motivation"("sender_id", "receiver_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_supplement" ADD CONSTRAINT "user_supplement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_supplement" ADD CONSTRAINT "user_supplement_supplement_database_id_fkey" FOREIGN KEY ("supplement_database_id") REFERENCES "supplement_database"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake" ADD CONSTRAINT "intake_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake" ADD CONSTRAINT "intake_user_supplement_id_fkey" FOREIGN KEY ("user_supplement_id") REFERENCES "user_supplement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_config" ADD CONSTRAINT "notification_config_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_transaction" ADD CONSTRAINT "points_transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_item" ADD CONSTRAINT "user_item_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_freeze" ADD CONSTRAINT "streak_freeze_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_token" ADD CONSTRAINT "push_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motivation" ADD CONSTRAINT "motivation_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motivation" ADD CONSTRAINT "motivation_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

