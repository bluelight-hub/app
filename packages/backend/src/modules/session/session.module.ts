import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Modul für Session-Management und -Überwachung
 *
 * Dieses Modul stellt Funktionalitäten für die Verwaltung von Benutzersitzungen bereit:
 * - Tracking und Überwachung aktiver Sessions
 * - Risikobewertung und Anomalieerkennung
 * - Session-Aktivitätsverfolgung
 * - Administrative Session-Verwaltung
 *
 * @module SessionModule
 */
@Module({
  imports: [PrismaModule, ConfigModule, EventEmitterModule],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
