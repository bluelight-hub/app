import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: Fügt die Felder 'sender' und 'receiver' zur EtbEntry-Tabelle hinzu.
 * 
 * Diese Felder werden verwendet, um den Absender und Empfänger eines ETB-Eintrags separat 
 * von den Autor- und Abschlussfeldern zu speichern.
 */
export class AddSenderReceiverToEtbEntry1745100000000 implements MigrationInterface {

    /**
     * Führt die Migration aus: Fügt die neuen Spalten hinzu.
     * 
     * @param queryRunner Der QueryRunner für den Datenbankzugriff
     */
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "etb_entry" ADD "sender" varchar NULL;
        `);

        await queryRunner.query(`
            ALTER TABLE "etb_entry" ADD "receiver" varchar NULL;
        `);

        // Migrationslogs
        console.log('Migration 1745100000000-AddSenderReceiverToEtbEntry ausgeführt');
        console.log('- Spalte "sender" zur Tabelle "etb_entry" hinzugefügt');
        console.log('- Spalte "receiver" zur Tabelle "etb_entry" hinzugefügt');
    }

    /**
     * Macht die Migration rückgängig: Entfernt die hinzugefügten Spalten.
     * 
     * @param queryRunner Der QueryRunner für den Datenbankzugriff
     */
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "etb_entry" DROP COLUMN "receiver";
        `);

        await queryRunner.query(`
            ALTER TABLE "etb_entry" DROP COLUMN "sender";
        `);

        // Migrationslogs
        console.log('Migration 1745100000000-AddSenderReceiverToEtbEntry rückgängig gemacht');
        console.log('- Spalte "receiver" aus Tabelle "etb_entry" entfernt');
        console.log('- Spalte "sender" aus Tabelle "etb_entry" entfernt');
    }
} 