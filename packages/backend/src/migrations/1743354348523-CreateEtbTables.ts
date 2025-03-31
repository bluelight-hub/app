import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEtbTables1743354348523 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // EtbEntry-Tabelle erstellen
        await queryRunner.query(`
            CREATE TABLE "etb_entry" (
                "id" varchar PRIMARY KEY,
                "timestampErstellung" datetime NOT NULL,
                "timestampEreignis" datetime NOT NULL,
                "autorId" varchar NOT NULL,
                "autorName" varchar,
                "autorRolle" varchar,
                "kategorie" varchar NOT NULL,
                "titel" varchar,
                "beschreibung" text NOT NULL,
                "referenzEinsatzId" varchar,
                "referenzPatientId" varchar,
                "referenzEinsatzmittelId" varchar,
                "systemQuelle" varchar,
                "version" integer NOT NULL DEFAULT (1),
                "istAbgeschlossen" boolean NOT NULL DEFAULT (0),
                "timestampAbschluss" datetime,
                "abgeschlossenVon" varchar
            )
        `);

        // Index für häufige Abfragen erstellen
        await queryRunner.query(`
            CREATE INDEX "idx_etb_entry_timestamp_ereignis" ON "etb_entry" ("timestampEreignis")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_etb_entry_autor_id" ON "etb_entry" ("autorId")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_etb_entry_kategorie" ON "etb_entry" ("kategorie")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_etb_entry_referenz_einsatz_id" ON "etb_entry" ("referenzEinsatzId")
        `);

        // EtbAttachment-Tabelle erstellen
        await queryRunner.query(`
            CREATE TABLE "etb_attachment" (
                "id" varchar PRIMARY KEY,
                "etbEntryId" varchar NOT NULL,
                "dateiname" varchar NOT NULL,
                "dateityp" varchar NOT NULL,
                "speicherOrt" varchar NOT NULL,
                "beschreibung" text,
                CONSTRAINT "fk_etb_attachment_etb_entry" FOREIGN KEY ("etbEntryId") REFERENCES "etb_entry" ("id") ON DELETE CASCADE
            )
        `);

        // Index für EtbAttachment
        await queryRunner.query(`
            CREATE INDEX "idx_etb_attachment_etb_entry_id" ON "etb_attachment" ("etbEntryId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Tabellen in umgekehrter Reihenfolge löschen
        await queryRunner.query(`DROP INDEX "idx_etb_attachment_etb_entry_id"`);
        await queryRunner.query(`DROP TABLE "etb_attachment"`);

        await queryRunner.query(`DROP INDEX "idx_etb_entry_referenz_einsatz_id"`);
        await queryRunner.query(`DROP INDEX "idx_etb_entry_kategorie"`);
        await queryRunner.query(`DROP INDEX "idx_etb_entry_autor_id"`);
        await queryRunner.query(`DROP INDEX "idx_etb_entry_timestamp_ereignis"`);
        await queryRunner.query(`DROP TABLE "etb_entry"`);
    }

}
