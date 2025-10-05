import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Repository für Datenbankoperationen auf der User-Tabelle
 *
 * Kapselt alle direkten Prisma-Zugriffe und stellt
 * wiederverwendbare Datenbankoperationen zur Verfügung
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Findet alle nicht gelöschten Benutzer (inkl. gesperrte) mit reduzierten Feldern
   *
   * @returns Liste aller nicht-gelöschten Benutzer mit Basis-Informationen und Lock-Status
   */
  findAllLite() {
    return this.prisma.user.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isLocked: true,
        lockReason: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Findet einen aktiven (nicht gelöschten, nicht gesperrten) Benutzer anhand der ID mit reduzierten Feldern
   *
   * @param id - Benutzer-ID
   * @returns Benutzer mit Basis-Informationen oder null (wenn gelöscht, gesperrt oder nicht vorhanden)
   */
  findByIdLite(id: string) {
    return this.prisma.user.findFirst({
      where: {
        id,
        isDeleted: false,
        isLocked: false,
      },
      select: {
        id: true,
        role: true,
      },
    });
  }

  /**
   * Findet einen Benutzer anhand der ID mit spezifischen Feldern
   *
   * @param id - Benutzer-ID
   * @param select - Prisma Select-Objekt für gewünschte Felder
   * @returns Benutzer mit ausgewählten Feldern oder null
   */
  findById(id: string, select: Prisma.UserSelect) {
    return this.prisma.user.findUnique({
      where: { id },
      select,
    });
  }

  /**
   * Erstellt einen neuen Benutzer
   *
   * @param data - Prisma UserCreateInput
   * @param select - Prisma Select-Objekt für Rückgabe-Felder
   * @returns Der erstellte Benutzer mit ausgewählten Feldern
   */
  create(data: Prisma.UserCreateInput, select: Prisma.UserSelect) {
    return this.prisma.user.create({
      data,
      select,
    });
  }

  /**
   * Aktualisiert einen Benutzer anhand der ID
   *
   * @param id - Benutzer-ID
   * @param data - Prisma UserUpdateInput
   * @param select - Prisma Select-Objekt für Rückgabe-Felder
   * @returns Der aktualisierte Benutzer mit ausgewählten Feldern
   */
  updateById(id: string, data: Prisma.UserUpdateInput, select: Prisma.UserSelect) {
    return this.prisma.user.update({
      where: { id },
      data,
      select,
    });
  }

  /**
   * Aktualisiert mehrere Benutzer basierend auf Bedingungen
   *
   * @param where - Prisma UserWhereInput für Filter
   * @param data - Prisma UserUpdateManyMutationInput
   * @returns Anzahl der aktualisierten Datensätze
   */
  updateMany(where: Prisma.UserWhereInput, data: Prisma.UserUpdateManyMutationInput) {
    return this.prisma.user.updateMany({
      where,
      data,
    });
  }

  /**
   * Zählt Benutzer basierend auf Bedingungen
   *
   * @param where - Prisma UserWhereInput für Filter
   * @returns Anzahl der gefundenen Benutzer
   */
  count(where: Prisma.UserWhereInput) {
    return this.prisma.user.count({
      where,
    });
  }

  /**
   * Löscht einen Benutzer anhand der ID
   *
   * @param id - Benutzer-ID
   * @returns Der gelöschte Benutzer
   */
  deleteById(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Führt eine Transaktion aus
   *
   * @param fn - Funktion, die innerhalb der Transaktion ausgeführt wird
   * @returns Ergebnis der Transaktion
   */
  async transaction<T>(fn: (prisma: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /**
   * Direkter Zugriff auf Prisma für spezielle Fälle
   * Sollte nur in Ausnahmefällen verwendet werden
   *
   * @returns PrismaService Instanz
   */
  getPrismaClient() {
    return this.prisma;
  }
}
