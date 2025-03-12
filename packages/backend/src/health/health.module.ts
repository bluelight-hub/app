import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

/**
 * Modul, das Gesundheitscheck-Funktionalität für die Anwendung bereitstellt.
 * Konfiguriert die Terminus-Gesundheitscheck-Bibliothek und stellt Gesundheitscheck-Endpunkte bereit.
 * 
 * @class HealthModule
 */
@Module({
    imports: [TerminusModule],
    controllers: [HealthController],
})
export class HealthModule { } 