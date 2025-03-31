import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { HealthModule } from './health/health.module';
import { ConsolaLogger } from './logger/consola.logger';
import { EtbModule } from './modules/etb/etb.module';

/**
 * Haupt-Anwendungsmodul, das die Abhängigkeiten und Provider der Anwendung konfiguriert.
 * Richtet Umgebungskonfiguration, Datenbankverbindung und Gesundheitschecks ein.
 * 
 * @class AppModule
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        TypeOrmModule.forRoot({
            type: 'better-sqlite3',
            database: process.env.SQLITE_DB_PATH || join(__dirname, '..', '..', '..', 'data', 'database.sqlite'),
            entities: ['dist/**/*.entity.{ts,js}'],
            synchronize: process.env.NODE_ENV !== 'production',
            logging: process.env.NODE_ENV !== 'production',
            autoLoadEntities: true,
        }),
        HealthModule,
        EtbModule,
    ],
    controllers: [],
    providers: [
        {
            provide: 'Logger',
            useClass: ConsolaLogger,
        },
    ],
})
export class AppModule { } 