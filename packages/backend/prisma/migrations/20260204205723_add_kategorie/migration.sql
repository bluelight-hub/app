-- CreateTable
CREATE TABLE "kategorien" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "farbe" VARCHAR(7) NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "erstellt_von" VARCHAR(100) NOT NULL,
    "geloescht_am" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kategorien_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kategorien_einsatz_id_geloescht_am_idx" ON "kategorien"("einsatz_id", "geloescht_am");

-- CreateIndex
CREATE UNIQUE INDEX "kategorien_name_einsatz_id_key" ON "kategorien"("name", "einsatz_id");

-- AddForeignKey
ALTER TABLE "kategorien" ADD CONSTRAINT "kategorien_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kategorien" ADD CONSTRAINT "kategorien_erstellt_von_fkey" FOREIGN KEY ("erstellt_von") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
