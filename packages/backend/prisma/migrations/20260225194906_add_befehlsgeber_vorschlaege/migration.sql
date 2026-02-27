-- CreateTable
CREATE TABLE "befehlsgeber_vorschlaege" (
    "id" TEXT NOT NULL,
    "kuerzel" VARCHAR(20) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "ist_aktiv" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_by" VARCHAR(100),

    CONSTRAINT "befehlsgeber_vorschlaege_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "befehlsgeber_vorschlaege_kuerzel_key" ON "befehlsgeber_vorschlaege"("kuerzel");

-- CreateIndex
CREATE INDEX "befehlsgeber_vorschlaege_ist_aktiv_sort_order_idx" ON "befehlsgeber_vorschlaege"("ist_aktiv", "sort_order");

-- AddForeignKey
ALTER TABLE "befehlsgeber_vorschlaege" ADD CONSTRAINT "befehlsgeber_vorschlaege_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "befehlsgeber_vorschlaege" ADD CONSTRAINT "befehlsgeber_vorschlaege_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
