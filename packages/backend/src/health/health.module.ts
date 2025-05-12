import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { EtbModule } from '../modules/etb/etb.module';
import { HealthController } from './health.controller';

/**
 * Modul, das Gesundheitscheck-Funktionalität für die Anwendung bereitstellt.
 * Konfiguriert die Terminus-Gesundheitscheck-Bibliothek und stellt Gesundheitscheck-Endpunkte bereit.
 * 
 * @class HealthModule
 */
@Module({
    imports: [
        TerminusModule,
        EtbModule
    ],
    controllers: [HealthController],
})
export class HealthModule { } 