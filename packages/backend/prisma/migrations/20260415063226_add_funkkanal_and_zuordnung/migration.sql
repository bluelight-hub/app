-- CreateTable
CREATE TABLE "funkkanal" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "details_type" TEXT NOT NULL,
    "details_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aktiv',
    "zweck" TEXT,
    "sort_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "funkkanal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funkkanal_zuordnung" (
    "id" TEXT NOT NULL,
    "kanal_id" TEXT NOT NULL,
    "fahrzeug_id" TEXT,
    "person_id" TEXT,
    "einheit_id" TEXT,
    "rufname_snapshot" TEXT NOT NULL,
    "rolle" TEXT NOT NULL DEFAULT 'primaer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "funkkanal_zuordnung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "funkkanal_einsatz_id_status_sort_index_idx" ON "funkkanal"("einsatz_id", "status", "sort_index");

-- CreateIndex
CREATE UNIQUE INDEX "funkkanal_einsatz_id_name_key" ON "funkkanal"("einsatz_id", "name");

-- CreateIndex
CREATE INDEX "funkkanal_zuordnung_kanal_id_idx" ON "funkkanal_zuordnung"("kanal_id");

-- CreateIndex
CREATE INDEX "funkkanal_zuordnung_fahrzeug_id_idx" ON "funkkanal_zuordnung"("fahrzeug_id");

-- CreateIndex
CREATE INDEX "funkkanal_zuordnung_person_id_idx" ON "funkkanal_zuordnung"("person_id");

-- CreateIndex
CREATE INDEX "funkkanal_zuordnung_einheit_id_idx" ON "funkkanal_zuordnung"("einheit_id");

-- CreateIndex
CREATE UNIQUE INDEX "funkkanal_zuordnung_kanal_id_fahrzeug_id_key" ON "funkkanal_zuordnung"("kanal_id", "fahrzeug_id");

-- CreateIndex
CREATE UNIQUE INDEX "funkkanal_zuordnung_kanal_id_person_id_key" ON "funkkanal_zuordnung"("kanal_id", "person_id");

-- CreateIndex
CREATE UNIQUE INDEX "funkkanal_zuordnung_kanal_id_einheit_id_key" ON "funkkanal_zuordnung"("kanal_id", "einheit_id");

-- AddForeignKey
ALTER TABLE "funkkanal" ADD CONSTRAINT "funkkanal_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funkkanal_zuordnung" ADD CONSTRAINT "funkkanal_zuordnung_kanal_id_fkey" FOREIGN KEY ("kanal_id") REFERENCES "funkkanal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funkkanal_zuordnung" ADD CONSTRAINT "funkkanal_zuordnung_fahrzeug_id_fkey" FOREIGN KEY ("fahrzeug_id") REFERENCES "einsatz_fahrzeuge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funkkanal_zuordnung" ADD CONSTRAINT "funkkanal_zuordnung_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "einsatz_personen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funkkanal_zuordnung" ADD CONSTRAINT "funkkanal_zuordnung_einheit_id_fkey" FOREIGN KEY ("einheit_id") REFERENCES "einsatz_einheiten"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariante: Eine FunkkanalZuordnung verweist auf GENAU EINE Kraft (Fahrzeug XOR Person XOR Einheit).
ALTER TABLE "funkkanal_zuordnung"
    ADD CONSTRAINT "funkkanal_zuordnung_genau_eine_kraft"
    CHECK (
        ("fahrzeug_id" IS NOT NULL)::int +
        ("person_id" IS NOT NULL)::int +
        ("einheit_id" IS NOT NULL)::int = 1
    );
