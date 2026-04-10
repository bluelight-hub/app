-- CreateTable
CREATE TABLE "taktische_zeichen" (
    "id" TEXT NOT NULL,
    "einsatz_id" TEXT NOT NULL,
    "zeichen_definition" JSONB NOT NULL,
    "referenz_typ" VARCHAR(20),
    "referenz_id" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "mgrs" VARCHAR(20),
    "lagekarte_id" TEXT,
    "label" VARCHAR(200),
    "notiz" TEXT,
    "ist_aus_katalog" BOOLEAN NOT NULL DEFAULT false,
    "katalog_eintrag_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_by" VARCHAR(100),

    CONSTRAINT "taktische_zeichen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zeichen_katalog_eintraege" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "kategorie" VARCHAR(50) NOT NULL,
    "beschreibung" TEXT,
    "zeichen_definition" JSONB NOT NULL,
    "tags" TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "ist_standard" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zeichen_katalog_eintraege_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fahrzeugtyp_zeichen_defaults" (
    "id" TEXT NOT NULL,
    "fahrzeugtyp_id" TEXT NOT NULL,
    "zeichen_definition" JSONB NOT NULL,

    CONSTRAINT "fahrzeugtyp_zeichen_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "einheitentyp_zeichen_defaults" (
    "id" TEXT NOT NULL,
    "einheitentyp" "EinsatzEinheitTyp" NOT NULL,
    "zeichen_definition" JSONB NOT NULL,

    CONSTRAINT "einheitentyp_zeichen_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "taktische_zeichen_einsatz_id_idx" ON "taktische_zeichen"("einsatz_id");

-- CreateIndex
CREATE INDEX "taktische_zeichen_lagekarte_id_idx" ON "taktische_zeichen"("lagekarte_id");

-- CreateIndex
CREATE INDEX "taktische_zeichen_referenz_typ_referenz_id_idx" ON "taktische_zeichen"("referenz_typ", "referenz_id");

-- CreateIndex
CREATE INDEX "taktische_zeichen_einsatz_id_lagekarte_id_idx" ON "taktische_zeichen"("einsatz_id", "lagekarte_id");

-- CreateIndex
CREATE INDEX "taktische_zeichen_created_by_idx" ON "taktische_zeichen"("created_by");

-- CreateIndex
CREATE INDEX "zeichen_katalog_eintraege_kategorie_idx" ON "zeichen_katalog_eintraege"("kategorie");

-- CreateIndex
CREATE INDEX "zeichen_katalog_eintraege_kategorie_sort_order_idx" ON "zeichen_katalog_eintraege"("kategorie", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "fahrzeugtyp_zeichen_defaults_fahrzeugtyp_id_key" ON "fahrzeugtyp_zeichen_defaults"("fahrzeugtyp_id");

-- CreateIndex
CREATE UNIQUE INDEX "einheitentyp_zeichen_defaults_einheitentyp_key" ON "einheitentyp_zeichen_defaults"("einheitentyp");

-- AddForeignKey
ALTER TABLE "taktische_zeichen" ADD CONSTRAINT "taktische_zeichen_einsatz_id_fkey" FOREIGN KEY ("einsatz_id") REFERENCES "einsaetze"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taktische_zeichen" ADD CONSTRAINT "taktische_zeichen_lagekarte_id_fkey" FOREIGN KEY ("lagekarte_id") REFERENCES "lagekarte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taktische_zeichen" ADD CONSTRAINT "taktische_zeichen_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "taktische_zeichen" ADD CONSTRAINT "taktische_zeichen_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fahrzeugtyp_zeichen_defaults" ADD CONSTRAINT "fahrzeugtyp_zeichen_defaults_fahrzeugtyp_id_fkey" FOREIGN KEY ("fahrzeugtyp_id") REFERENCES "fahrzeugtypen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
