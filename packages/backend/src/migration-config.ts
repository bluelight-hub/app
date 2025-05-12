import { join } from 'path';
import { DataSource } from 'typeorm';
import { EtbAttachment } from './modules/etb/entities/etb-attachment.entity';
import { EtbEntry } from './modules/etb/entities/etb-entry.entity';

/**
 * Konfiguration für TypeORM-Migrationen.
 * Diese Konfiguration wird für die Ausführung von Migrations-Befehlen verwendet.
 */
export default new DataSource({
    type: 'better-sqlite3',
    database: process.env.SQLITE_DB_PATH || join(__dirname, '..', '..', '..', '..', 'data', 'database.sqlite'),
    entities: [EtbEntry, EtbAttachment],
    migrations: [join(__dirname, 'migrations', '*')],
    synchronize: false,
    logging: true,
}); 