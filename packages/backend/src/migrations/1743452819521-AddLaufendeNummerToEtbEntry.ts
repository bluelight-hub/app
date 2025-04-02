import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLaufendeNummerToEtbEntry1743452819521 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Spalte hinzufügen
        await queryRunner.query(`ALTER TABLE "etb_entry" ADD "laufendeNummer" integer`);

        // Bestehende Einträge nummerieren, nach timestampErstellung sortiert
        await queryRunner.query(`
            WITH numbered AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY "timestampErstellung") as row_num
                FROM "etb_entry"
            )
            UPDATE "etb_entry"
            SET "laufendeNummer" = numbered.row_num
            FROM numbered
            WHERE "etb_entry".id = numbered.id
        `);

        // NOT NULL Constraint hinzufügen
        await queryRunner.query(`ALTER TABLE "etb_entry" ALTER COLUMN "laufendeNummer" SET NOT NULL`);

        // Index für schnelle Suche erstellen
        await queryRunner.query(`CREATE INDEX "idx_etb_entry_laufende_nummer" ON "etb_entry" ("laufendeNummer")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rückgängig machen
        await queryRunner.query(`DROP INDEX "idx_etb_entry_laufende_nummer"`);
        await queryRunner.query(`ALTER TABLE "etb_entry" DROP COLUMN "laufendeNummer"`);
    }

}
