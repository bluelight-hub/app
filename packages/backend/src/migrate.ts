import { join } from 'path';
import { DataSource } from 'typeorm';
import { CreateEtbTables1743354348523 } from './migrations/1743354348523-CreateEtbTables';
import { AddLaufendeNummerToEtbEntry1743452819521 } from './migrations/1743452819521-AddLaufendeNummerToEtbEntry';
import { AddEtbEntryStatus1743618694268 } from './migrations/1743618694268-AddEtbEntryStatus';

/**
 * Einmalige Ausführung der Migrationen.
 * Diese Datei kann mit `ts-node src/migrate.ts` ausgeführt werden.
 */
async function runMigrations() {
    const dataSource = new DataSource({
        type: 'better-sqlite3',
        database: process.env.SQLITE_DB_PATH || join(__dirname, '..', '..', '..', 'data', 'database.sqlite'),
        synchronize: false,
        logging: true,
        migrations: [
            CreateEtbTables1743354348523,
            AddLaufendeNummerToEtbEntry1743452819521,
            AddEtbEntryStatus1743618694268
        ],
    });

    try {
        await dataSource.initialize();
        console.log('DataSource initialisiert');

        await dataSource.runMigrations();
        console.log('Migrationen erfolgreich ausgeführt');

        await dataSource.destroy();
        console.log('DataSource geschlossen');
    } catch (error) {
        console.error('Fehler beim Ausführen der Migrationen:', error);

        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }

        process.exit(1);
    }
}

runMigrations()
    .then(() => {
        console.log('Migration abgeschlossen');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Unerwarteter Fehler:', error);
        process.exit(1);
    }); 