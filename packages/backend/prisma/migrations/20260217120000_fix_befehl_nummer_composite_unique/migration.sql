-- DropIndex (global unique on nummer)
DROP INDEX "befehl_nummer_key";

-- CreateIndex (composite unique per Einsatz statt global)
CREATE UNIQUE INDEX "befehl_einsatz_id_nummer_key" ON "befehl"("einsatz_id", "nummer");
