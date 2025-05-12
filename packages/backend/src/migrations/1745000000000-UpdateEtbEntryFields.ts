import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration zum Aktualisieren der Felder in ETB-Einträgen.
 * Kombiniert 'titel' und 'beschreibung' zu 'inhalt' und konvertiert 'kategorie' zu einem Enum.
 * 
 * @class UpdateEtbEntryFields1745000000000
 * @implements {MigrationInterface}
 */
export class UpdateEtbEntryFields1745000000000 implements MigrationInterface {

    /**
     * Führt die Migration aus, um die Felder der ETB-Einträge zu aktualisieren.
     * Fügt ein neues 'inhalt'-Feld hinzu und konvertiert die bestehenden Daten.
     * 
     * @param {QueryRunner} queryRunner - TypeORM QueryRunner zur Ausführung der SQL-Befehle
     * @returns {Promise<void>} Promise, das nach erfolgreicher Ausführung aufgelöst wird
     */
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Schritt 1: Hinzufügen des inhalt-Felds, erlaubt zunächst NULL
        await queryRunner.query(`ALTER TABLE "etb_entry" ADD "inhalt" TEXT DEFAULT ''`);

        // Schritt 2: Kombinieren von titel und beschreibung zu inhalt
        await queryRunner.query(`
            UPDATE "etb_entry" 
            SET "inhalt" = CASE
                WHEN "titel" IS NOT NULL AND "beschreibung" IS NOT NULL THEN "titel" || ': ' || "beschreibung"
                WHEN "titel" IS NULL AND "beschreibung" IS NOT NULL THEN "beschreibung"
                WHEN "titel" IS NOT NULL AND "beschreibung" IS NULL THEN "titel"
                ELSE ''
            END
        `);

        // Schritt 3: Sicherstellen, dass inhalt nicht NULL ist (falls leere Datensätze existieren)
        await queryRunner.query(`UPDATE "etb_entry" SET "inhalt" = '' WHERE "inhalt" IS NULL`);

        // Schritt 4: NOT NULL Constraint hinzufügen
        await queryRunner.query(`ALTER TABLE "etb_entry" ALTER COLUMN "inhalt" SET NOT NULL`);

        // Konvertieren der kategorie zu standardisierten Werten
        // Hier nehmen wir an, dass bestehende Werte konvertiert werden müssen
        await queryRunner.query(`
            UPDATE "etb_entry" 
            SET "kategorie" = CASE
                WHEN "kategorie" LIKE '%lagemeld%' THEN 'Lagemeldung'
                WHEN "kategorie" LIKE '%anforder%' THEN 'Anforderung'
                WHEN "kategorie" LIKE '%auto%kraefte%' THEN 'Meldung (automatisiert) - Kräfte'
                WHEN "kategorie" LIKE '%auto%patient%' THEN 'Meldung (automatisiert) - Patienten'
                WHEN "kategorie" LIKE '%auto%tech%' THEN 'Meldung (automatisiert) - Technisch'
                WHEN "kategorie" LIKE '%auto%' THEN 'Meldung (automatisiert) - Sonstiges'
                ELSE 'Meldung'
            END
        `);

        // Entfernen der alten Felder
        await queryRunner.query(`ALTER TABLE "etb_entry" DROP COLUMN "titel"`);
        await queryRunner.query(`ALTER TABLE "etb_entry" DROP COLUMN "beschreibung"`);
    }

    /**
     * Macht die Migration rückgängig.
     * Stellt die ursprünglichen Felder wieder her und verteilt den Inhalt.
     * 
     * @param {QueryRunner} queryRunner - TypeORM QueryRunner zur Ausführung der SQL-Befehle
     * @returns {Promise<void>} Promise, das nach erfolgreicher Ausführung aufgelöst wird
     */
    public async down(queryRunner: QueryRunner): Promise<void> {
        // Hinzufügen der alten Felder
        await queryRunner.query(`ALTER TABLE "etb_entry" ADD "titel" varchar`);
        await queryRunner.query(`ALTER TABLE "etb_entry" ADD "beschreibung" TEXT`);

        // Extrahieren des Titels und der Beschreibung aus dem Inhalt
        // Vereinfachte Annahme: wenn Inhalt einen Doppelpunkt enthält, ist alles davor der Titel
        await queryRunner.query(`
            UPDATE "etb_entry" 
            SET 
                "titel" = CASE
                    WHEN instr("inhalt", ':') > 0 THEN substr("inhalt", 1, instr("inhalt", ':') - 1)
                    ELSE NULL
                END,
                "beschreibung" = CASE
                    WHEN instr("inhalt", ':') > 0 THEN substr("inhalt", instr("inhalt", ':') + 1)
                    ELSE "inhalt"
                END
        `);

        // Zurückkonvertieren der kategorie zu allgemeinen Strings
        // Da wir nicht genau wissen, welche Werte ursprünglich verwendet wurden, behalten wir die standardisierten

        // Entfernen des inhalt-Felds
        await queryRunner.query(`ALTER TABLE "etb_entry" DROP COLUMN "inhalt"`);
    }
} 