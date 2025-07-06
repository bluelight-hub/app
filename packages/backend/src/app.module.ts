import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { IpWhitelistMiddleware } from './common/middleware/ip-whitelist.middleware';
import { HealthModule } from './health/health.module';
import { ConsolaLogger } from './logger/consola.logger';
import { AdminModule } from './modules/admin/admin.module';
import { EinsatzModule } from './modules/einsatz/einsatz.module';
import { EtbModule } from './modules/etb/etb.module';
import { SeedModule } from './modules/seed/seed.module';
import { PrismaModule } from './prisma/prisma.module';

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
        }),
        PrismaModule,
        HealthModule,
        AdminModule,
        EinsatzModule,
        EtbModule,
        CommonModule,
        SeedModule.registerAsync(),
    ],
    controllers: [],
    providers: [
        {
            provide: 'Logger',
            useClass: ConsolaLogger,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(IpWhitelistMiddleware)
            .forRoutes('*'); // Apply to all routes
    }
} 