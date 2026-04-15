-- CreateTable
CREATE TABLE "alarmierung" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "bezeichnung" VARCHAR(200) NOT NULL,
    "beschreibung" TEXT,
    "alarmierungszeit" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aktiv',
    "ursprung_alarmierung_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_by" VARCHAR(100),

    CONSTRAINT "alarmierung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alarmierung_empfaenger" (
    "id" TEXT NOT NULL,
    "alarmierung_id" TEXT NOT NULL,
    "fahrzeug_id" TEXT,
    "person_id" TEXT,
    "einheit_id" TEXT,
    "name_snapshot" VARCHAR(200) NOT NULL,
    "alarmiert_am" TIMESTAMP(3) NOT NULL,
    "ausgerueckt_am" TIMESTAMP(3),
    "vor_ort_am" TIMESTAMP(3),
    "wieder_frei_am" TIMESTAMP(3),
    "letzter_fms_status" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_by" VARCHAR(100),

    CONSTRAINT "alarmierung_empfaenger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alarmierung_einsatz_id_idx" ON "alarmierung"("einsatz_id");

-- CreateIndex
CREATE INDEX "alarmierung_einsatz_id_status_idx" ON "alarmierung"("einsatz_id", "status");

-- CreateIndex
CREATE INDEX "alarmierung_einsatz_id_alarmierungszeit_idx" ON "alarmierung"("einsatz_id", "alarmierungszeit");

-- CreateIndex
CREATE INDEX "alarmierung_ursprung_alarmierung_id_idx" ON "alarmierung"("ursprung_alarmierung_id");

-- CreateIndex
CREATE INDEX "alarmierung_empfaenger_alarmierung_id_idx" ON "alarmierung_empfaenger"("alarmierung_id");

-- CreateIndex
CREATE INDEX "alarmierung_empfaenger_fahrzeug_id_idx" ON "alarmierung_empfaenger"("fahrzeug_id");

-- CreateIndex
CREATE INDEX "alarmierung_empfaenger_person_id_idx" ON "alarmierung_empfaenger"("person_id");

-- CreateIndex
CREATE INDEX "alarmierung_empfaenger_einheit_id_idx" ON "alarmierung_empfaenger"("einheit_id");

-- CreateIndex
CREATE UNIQUE INDEX "alarmierung_empfaenger_alarmierung_id_fahrzeug_id_key" ON "alarmierung_empfaenger"("alarmierung_id", "fahrzeug_id");

-- CreateIndex
CREATE UNIQUE INDEX "alarmierung_empfaenger_alarmierung_id_person_id_key" ON "alarmierung_empfaenger"("alarmierung_id", "person_id");

-- CreateIndex
CREATE UNIQUE INDEX "alarmierung_empfaenger_alarmierung_id_einheit_id_key" ON "alarmierung_empfaenger"("alarmierung_id", "einheit_id");

-- AddForeignKey
ALTER TABLE "alarmierung" ADD CONSTRAINT "alarmierung_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarmierung" ADD CONSTRAINT "alarmierung_ursprung_alarmierung_id_fkey" FOREIGN KEY ("ursprung_alarmierung_id") REFERENCES "alarmierung"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarmierung_empfaenger" ADD CONSTRAINT "alarmierung_empfaenger_alarmierung_id_fkey" FOREIGN KEY ("alarmierung_id") REFERENCES "alarmierung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarmierung_empfaenger" ADD CONSTRAINT "alarmierung_empfaenger_fahrzeug_id_fkey" FOREIGN KEY ("fahrzeug_id") REFERENCES "einsatz_fahrzeuge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarmierung_empfaenger" ADD CONSTRAINT "alarmierung_empfaenger_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "einsatz_personen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarmierung_empfaenger" ADD CONSTRAINT "alarmierung_empfaenger_einheit_id_fkey" FOREIGN KEY ("einheit_id") REFERENCES "einsatz_einheiten"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Invariante: Ein AlarmierungEmpfaenger verweist auf GENAU EINE Kraft (Fahrzeug XOR Person XOR Einheit).
ALTER TABLE "alarmierung_empfaenger"
    ADD CONSTRAINT "alarmierung_empfaenger_genau_eine_kraft"
    CHECK (
        ("fahrzeug_id" IS NOT NULL)::int +
        ("person_id" IS NOT NULL)::int +
        ("einheit_id" IS NOT NULL)::int = 1
    );
