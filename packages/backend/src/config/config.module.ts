import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { DatabaseConfig } from './database.config';

/**
 * Konfigurationsmodul, das Zugriff auf Umgebungsvariablen und
 * spezifische Konfigurationsklassen wie DatabaseConfig bietet.
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  providers: [DatabaseConfig],
  exports: [DatabaseConfig],
})
export class ConfigModule {}
