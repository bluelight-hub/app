-- CreateEnum
CREATE TYPE "EinsatzRolle" AS ENUM ('BEFEHLSGEBER', 'ERSTELLER', 'EMPFAENGER', 'BEOBACHTER');

-- DropIndex
DROP INDEX "befehl_empfaenger_befehl_id_empfaenger_id_key";

-- CreateTable
CREATE TABLE "einsatz_rollenzuweisung" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rolle" "EinsatzRolle" NOT NULL,
    "zugewiesen_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "einsatz_rollenzuweisung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "einsatz_rollenzuweisung_einsatz_id_idx" ON "einsatz_rollenzuweisung"("einsatz_id");

-- CreateIndex
CREATE UNIQUE INDEX "einsatz_rollenzuweisung_einsatz_id_user_id_key" ON "einsatz_rollenzuweisung"("einsatz_id", "user_id");

-- AddForeignKey
ALTER TABLE "einsatz_rollenzuweisung" ADD CONSTRAINT "einsatz_rollenzuweisung_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_rollenzuweisung" ADD CONSTRAINT "einsatz_rollenzuweisung_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
