import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

/**
 * Konfigurationsmodul für die Anwendung
 *
 * Dieses Modul stellt zentrale Konfigurationsdienste bereit,
 * einschließlich Umgebungsvariablen und datenbankspezifische Konfigurationen.
 * Es nutzt das NestJS ConfigModule für globalen Zugriff auf Konfigurationswerte.
 *
 * @module ConfigModule
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
})
export class ConfigModule {}
