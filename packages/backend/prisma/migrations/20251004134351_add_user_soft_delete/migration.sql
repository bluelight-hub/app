-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" VARCHAR(100),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "idx_user_is_deleted" ON "public"."User"("isDeleted");

-- CreateIndex
CREATE INDEX "idx_user_username_deleted" ON "public"."User"("username", "isDeleted");
