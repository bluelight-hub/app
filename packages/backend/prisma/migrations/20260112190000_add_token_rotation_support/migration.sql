-- AlterTable
ALTER TABLE "server_access_tokens"
    ADD COLUMN "rotatedFromId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "server_access_tokens_rotatedFromId_key" ON "server_access_tokens" ("rotatedFromId");

-- CreateIndex
CREATE INDEX "idx_server_access_token_rotated_from" ON "server_access_tokens" ("rotatedFromId");

-- AddForeignKey
ALTER TABLE "server_access_tokens"
    ADD CONSTRAINT "server_access_tokens_rotatedFromId_fkey" FOREIGN KEY ("rotatedFromId") REFERENCES "server_access_tokens" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
