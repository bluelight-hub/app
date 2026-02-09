-- CreateEnum
CREATE TYPE "FuehrungsrhythmusTemplateScope" AS ENUM ('PERSOENLICH', 'ORGANISATIONSWEIT');

-- AlterTable
ALTER TABLE "fuehrungsrhythmus_templates" ADD COLUMN     "scope" "FuehrungsrhythmusTemplateScope" NOT NULL DEFAULT 'PERSOENLICH';

-- CreateIndex
CREATE INDEX "fuehrungsrhythmus_templates_scope_idx" ON "fuehrungsrhythmus_templates"("scope");
