import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration zum Hinzufügen einer laufenden Nummer zu ETB-Einträgen.
 * Ergänzt die ETB-Einträge um eine fortlaufende Nummerierung für bessere Nachverfolgbarkeit.
 * 
 * @class AddLaufendeNummerToEtbEntry1743452819521
 * @implements {MigrationInterface}
 */
export class AddLaufendeNummerToEtbEntry1743452819521 implements MigrationInterface {

    /**
     * Führt die Migration aus und fügt die laufende Nummer zur ETB-Tabelle hinzu.
     * Ergänzt die Spalte, nummeriert bestehende Einträge basierend auf dem Erstellungszeitpunkt,
     * und erstellt einen Index für die Spalte.
     * 
     * @param {QueryRunner} queryRunner - TypeORM QueryRunner zur Ausführung der SQL-Befehle
     * @returns {Promise<void>} Promise, das nach erfolgreicher Ausführung aufgelöst wird
     */
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

    /**
     * Macht die Migration rückgängig und entfernt die laufende Nummer aus der ETB-Tabelle.
     * Entfernt zunächst den Index und dann die Spalte selbst.
     * 
     * @param {QueryRunner} queryRunner - TypeORM QueryRunner zur Ausführung der SQL-Befehle
     * @returns {Promise<void>} Promise, das nach erfolgreicher Ausführung aufgelöst wird
     */
    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rückgängig machen
        await queryRunner.query(`DROP INDEX "idx_etb_entry_laufende_nummer"`);
        await queryRunner.query(`ALTER TABLE "etb_entry" DROP COLUMN "laufendeNummer"`);
    }

}
