import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Benutzerverwaltungsmodul für BlueLight Hub
 *
 * Dieses Modul verwaltet CRUD-Operationen für Benutzer.
 * Es bietet Funktionalität für das Erstellen, Lesen, Aktualisieren
 * und Löschen von Benutzern durch autorisierte Administratoren.
 *
 * Features:
 * - Benutzerliste abrufen
 * - Neue Benutzer erstellen (nur durch Admins)
 * - Benutzer löschen (nur durch Admins)
 * - Benutzerdetails abrufen
 */
@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
