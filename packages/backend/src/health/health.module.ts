import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { EtbModule } from '../modules/etb/etb.module';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma-health.indicator';

/**
 * Modul für Gesundheitschecks der Anwendung.
 * Enthält Controller und Indikatoren für verschiedene Gesundheitschecks.
 *
 * @class HealthModule
 */
@Module({
  imports: [TerminusModule, EtbModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
  exports: [PrismaHealthIndicator],
})
export class HealthModule {}
