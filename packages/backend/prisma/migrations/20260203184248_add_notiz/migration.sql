-- CreateTable
CREATE TABLE "notizen" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "titel" VARCHAR(100) NOT NULL,
    "inhalt" TEXT,
    "kategorie" VARCHAR(50),
    "erstellt_von" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(100),

    CONSTRAINT "notizen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notizen_einsatz_id_idx" ON "notizen"("einsatz_id");

-- CreateIndex
CREATE INDEX "notizen_einsatz_id_created_at_idx" ON "notizen"("einsatz_id", "created_at");

-- CreateIndex
CREATE INDEX "notizen_is_deleted_idx" ON "notizen"("is_deleted");

-- CreateIndex
CREATE INDEX "notizen_erstellt_von_idx" ON "notizen"("erstellt_von");

-- AddForeignKey
ALTER TABLE "notizen" ADD CONSTRAINT "notizen_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notizen" ADD CONSTRAINT "notizen_erstellt_von_fkey" FOREIGN KEY ("erstellt_von") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notizen" ADD CONSTRAINT "notizen_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
