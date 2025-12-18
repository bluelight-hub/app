-- CreateTable
CREATE TABLE "einsatz_fahrzeuge" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "stamm_id" TEXT,
    "funkrufname" VARCHAR(50) NOT NULL,
    "kennzeichen" VARCHAR(20),
    "fahrzeugtyp_id" TEXT NOT NULL,
    "fms_status" INTEGER NOT NULL DEFAULT 0,
    "position" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_by" VARCHAR(100),

    CONSTRAINT "einsatz_fahrzeuge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "einsatz_fahrzeuge_einsatz_id_idx" ON "einsatz_fahrzeuge"("einsatz_id");

-- CreateIndex
CREATE INDEX "einsatz_fahrzeuge_stamm_id_idx" ON "einsatz_fahrzeuge"("stamm_id");

-- CreateIndex
CREATE INDEX "einsatz_fahrzeuge_fms_status_idx" ON "einsatz_fahrzeuge"("fms_status");

-- CreateIndex
CREATE INDEX "einsatz_fahrzeuge_fahrzeugtyp_id_idx" ON "einsatz_fahrzeuge"("fahrzeugtyp_id");

-- CreateIndex
CREATE INDEX "einsatz_fahrzeuge_einsatz_id_fms_status_idx" ON "einsatz_fahrzeuge"("einsatz_id", "fms_status");

-- CreateIndex
CREATE INDEX "einsatz_fahrzeuge_created_by_idx" ON "einsatz_fahrzeuge"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "einsatz_fahrzeuge_einsatz_id_funkrufname_key" ON "einsatz_fahrzeuge"("einsatz_id", "funkrufname");

-- AddForeignKey
ALTER TABLE "einsatz_fahrzeuge" ADD CONSTRAINT "einsatz_fahrzeuge_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_fahrzeuge" ADD CONSTRAINT "einsatz_fahrzeuge_stamm_id_fkey" FOREIGN KEY ("stamm_id") REFERENCES "stamm_fahrzeuge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_fahrzeuge" ADD CONSTRAINT "einsatz_fahrzeuge_fahrzeugtyp_id_fkey" FOREIGN KEY ("fahrzeugtyp_id") REFERENCES "fahrzeugtypen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_fahrzeuge" ADD CONSTRAINT "einsatz_fahrzeuge_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "einsatz_fahrzeuge" ADD CONSTRAINT "einsatz_fahrzeuge_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
