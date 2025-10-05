-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockReason" TEXT,
ADD COLUMN     "lockedManuallyAt" TIMESTAMP(3),
ADD COLUMN     "lockedManuallyBy" VARCHAR(100);

-- CreateIndex
CREATE INDEX "idx_user_is_locked" ON "public"."User"("isLocked");

-- CreateIndex
CREATE INDEX "idx_user_status" ON "public"."User"("isActive", "isDeleted", "isLocked");
