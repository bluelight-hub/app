-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('EMAIL', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRY');

-- CreateTable
CREATE TABLE "NotificationChannel" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "ChannelType" NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "healthStatus" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "channelType" "ChannelType" NOT NULL,
    "subject" VARCHAR(255),
    "bodyHtml" TEXT,
    "bodyText" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "language" VARCHAR(10) NOT NULL DEFAULT 'de',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelType" "ChannelType" NOT NULL,
    "recipient" VARCHAR(255),
    "templateId" TEXT,
    "payload" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationChannel_name_key" ON "NotificationChannel"("name");

-- CreateIndex
CREATE INDEX "idx_notification_channel_type_active" ON "NotificationChannel"("type", "isActive");

-- CreateIndex
CREATE INDEX "idx_notification_channel_priority" ON "NotificationChannel"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_name_key" ON "NotificationTemplate"("name");

-- CreateIndex
CREATE INDEX "idx_notification_template_type_active" ON "NotificationTemplate"("channelType", "isActive");

-- CreateIndex
CREATE INDEX "idx_notification_template_name_lang" ON "NotificationTemplate"("name", "language");

-- CreateIndex
CREATE INDEX "idx_notification_log_status_time" ON "NotificationLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_notification_log_channel_time" ON "NotificationLog"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_notification_log_recipient_time" ON "NotificationLog"("recipient", "createdAt");

-- CreateIndex
CREATE INDEX "idx_notification_log_template" ON "NotificationLog"("templateId");

-- CreateIndex
CREATE INDEX "idx_notification_log_sent" ON "NotificationLog"("sentAt");

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "NotificationChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
