-- CreateTable
CREATE TABLE "einsatz_rollen_besetzung"
(
    "id"                   TEXT         NOT NULL,
    "einsatz_id"           TEXT         NOT NULL,
    "rollen_definition_id" TEXT         NOT NULL,
    "person_id"            TEXT         NOT NULL,
    "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP(3) NOT NULL,
    "created_by"           VARCHAR(100) NOT NULL,
    "updated_by"           VARCHAR(100),

    CONSTRAINT "einsatz_rollen_besetzung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "einsatz_rollen_besetzung_einsatz_id_idx" ON "einsatz_rollen_besetzung" ("einsatz_id");

-- CreateIndex
CREATE INDEX "einsatz_rollen_besetzung_person_id_idx" ON "einsatz_rollen_besetzung" ("person_id");

-- CreateIndex
CREATE INDEX "einsatz_rollen_besetzung_rollen_definition_id_idx" ON "einsatz_rollen_besetzung" ("rollen_definition_id");

-- CreateIndex
CREATE INDEX "einsatz_rollen_besetzung_einsatz_id_rollen_definition_id_idx" ON "einsatz_rollen_besetzung" ("einsatz_id", "rollen_definition_id");

-- CreateIndex
CREATE INDEX "einsatz_rollen_besetzung_created_by_idx" ON "einsatz_rollen_besetzung" ("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "einsatz_rollen_besetzung_einsatz_id_rollen_definition_id_key" ON "einsatz_rollen_besetzung" ("einsatz_id", "rollen_definition_id");

-- AddForeignKey
ALTER TABLE "einsatz_rollen_besetzung"
    ADD CONSTRAINT "einsatz_rollen_besetzung_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_rollen_besetzung"
    ADD CONSTRAINT "einsatz_rollen_besetzung_rollen_definition_id_fkey" FOREIGN KEY ("rollen_definition_id") REFERENCES "rollen_definitionen" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_rollen_besetzung"
    ADD CONSTRAINT "einsatz_rollen_besetzung_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "einsatz_personen" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "einsatz_rollen_besetzung"
    ADD CONSTRAINT "einsatz_rollen_besetzung_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "einsatz_rollen_besetzung"
    ADD CONSTRAINT "einsatz_rollen_besetzung_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
