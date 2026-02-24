-- DropForeignKey (authorId wird nullable für DSGVO-Anonymisierung)
ALTER TABLE "befehl_kommentar" DROP CONSTRAINT IF EXISTS "befehl_kommentar_author_id_fkey";

-- AlterTable: authorId nullable machen
ALTER TABLE "befehl_kommentar" ALTER COLUMN "author_id" DROP NOT NULL;

-- Verwaiste author_id-Referenzen bereinigen (dev DB)
UPDATE "befehl_kommentar" SET "author_id" = NULL
  WHERE "author_id" IS NOT NULL
  AND "author_id" NOT IN (SELECT "id" FROM "User");

-- AddForeignKey (mit SET NULL statt RESTRICT)
ALTER TABLE "befehl_kommentar" ADD CONSTRAINT "befehl_kommentar_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
