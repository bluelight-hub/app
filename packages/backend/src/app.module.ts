import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { ConsolaLogger } from './logger/consola.logger';
import { EtbModule } from './modules/etb/etb.module';
import { EinsatzModule } from './modules/einsatz/einsatz.module';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Haupt-Anwendungsmodul, das die Abhängigkeiten und Provider der Anwendung konfiguriert.
 * Richtet Umgebungskonfiguration, Datenbankverbindung und Gesundheitschecks ein.
 * 
 * @class AppModule
 */
@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        HealthModule,
        EinsatzModule,
        EtbModule,
        CommonModule,
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