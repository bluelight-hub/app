import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration zum Hinzufügen eines Status-Felds und Überschreibungs-Beziehungen zu ETB-Einträgen.
 * Erweitert die ETB-Einträge um ein Status-Feld und Felder zur Protokollierung von Überschreibungen.
 * 
 * @class AddEtbEntryStatus1743618694268
 * @implements {MigrationInterface}
 */
export class AddEtbEntryStatus1743618694268 implements MigrationInterface {

    /**
     * Führt die Migration aus und fügt Status- und Überschreibungsfelder zur ETB-Tabelle hinzu.
     * Ergänzt die Spalten status, ueberschriebenDurchId, timestampUeberschrieben und ueberschriebenVon.
     * Implementiert aufgrund der SQLite-Einschränkungen keine Fremdschlüsselbeziehung.
     * 
     * @param {QueryRunner} queryRunner - TypeORM QueryRunner zur Ausführung der SQL-Befehle
     * @returns {Promise<void>} Promise, das nach erfolgreicher Ausführung aufgelöst wird
     */
    public async up(queryRunner: QueryRunner): Promise<void> {
        // SQLite unterstützt keine ENUMs, daher verwenden wir VARCHAR
        // SQLite unterstützt auch kein ADD CONSTRAINT in ALTER TABLE

        // Hinzufügen der Status-Spalte
        await queryRunner.query(`ALTER TABLE "etb_entry" ADD "status" varchar NOT NULL DEFAULT 'aktiv'`);

        // Hinzufügen der ueberschriebenDurch-Beziehung 
        await queryRunner.query(`ALTER TABLE "etb_entry" ADD "ueberschriebenDurchId" varchar`);

        // Hinzufügen der Zeitstempel- und Benutzer-Spalten
        await queryRunner.query(`ALTER TABLE "etb_entry" ADD "timestampUeberschrieben" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "etb_entry" ADD "ueberschriebenVon" varchar`);

        // Für SQLite müssten wir die komplette Tabelle neu erstellen, um einen Fremdschlüssel hinzuzufügen
        // Da das zu komplex ist, verzichten wir auf die Fremdschlüsseleinschränkung und verlassen uns auf die Anwendungslogik
        // Die Beziehung wird über TypeORM trotzdem korrekt abgebildet

        // Kommentar: In einer Produktionsumgebung mit einer anderen Datenbank wie PostgreSQL würden wir stattdessen
        // die Constraint hinzufügen:
        // await queryRunner.query(`ALTER TABLE "etb_entry" ADD CONSTRAINT "FK_etb_entry_ueberschrieben_durch" 
        // FOREIGN KEY ("ueberschriebenDurchId") REFERENCES "etb_entry"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    /**
     * Macht die Migration rückgängig und entfernt die Status- und Überschreibungsfelder.
     * Entfernt die Spalten in umgekehrter Reihenfolge ihrer Erstellung.
     * 
     * @param {QueryRunner} queryRunner - TypeORM QueryRunner zur Ausführung der SQL-Befehle
     * @returns {Promise<void>} Promise, das nach erfolgreicher Ausführung aufgelöst wird
     */
    public async down(queryRunner: QueryRunner): Promise<void> {
        // Entfernen der Spalten
        await queryRunner.query(`ALTER TABLE "etb_entry" DROP COLUMN "ueberschriebenVon"`);
        await queryRunner.query(`ALTER TABLE "etb_entry" DROP COLUMN "timestampUeberschrieben"`);
        await queryRunner.query(`ALTER TABLE "etb_entry" DROP COLUMN "ueberschriebenDurchId"`);
        await queryRunner.query(`ALTER TABLE "etb_entry" DROP COLUMN "status"`);

        // Keine Fremdschlüsseleinschränkung zu entfernen, da wir keine hinzugefügt haben
    }
}
