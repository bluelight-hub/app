import type { Einsatz as PrismaEinsatz, EinsatzStatus as PrismaEinsatzStatus, Prisma } from '@/generated/prisma/client';
import { Einsatz } from '@domain/aggregates/einsatz.aggregate';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EinsatzStatus } from '@domain/value-objects/einsatz-status';
import { UserId } from '@domain/value-objects/user-id';
import { Address } from '@domain/value-objects/address';

/**
 * Typ-Definition für Einsatz Prisma-Daten mit allen benötigten Relationen.
 * Wird für toAggregate() verwendet.
 */
export type EinsatzWithRelations = PrismaEinsatz;

/**
 * Persistence-Daten Struktur für Prisma Upsert.
 * Enthält alle Felder die für CREATE/UPDATE benötigt werden.
 */
export interface EinsatzPersistenceData {
  id: string;
  nummer: string;
  alarmstichwort: string | null;
  einsatzort: string | null;
  beschreibung: string | null;
  status: PrismaEinsatzStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string | null;
  archivedAt: Date | null;
  archivedBy: string | null;
  // Felder die im Schema vorhanden, aber im Domain Aggregate nicht explizit modelliert sind
  alarmierungszeit: Date | null;
  einsatzleiter: string | null;
  metadata: Prisma.JsonValue | null;
}

/**
 * Statische Utility-Klasse für Domain ↔ Prisma Konvertierungen.
 *
 * Diese Klasse kapselt alle Mapping-Logik zwischen dem Einsatz Aggregate (Domain Layer)
 * und dem Prisma Einsatz Model (Infrastructure Layer).
 *
 * **Warum statische Klasse:**
 * - Keine Instanz-State benötigt (pure functions)
 * - Einfache Testbarkeit ohne DI
 * - Konsistent mit anderen Mappern im Projekt (PrismaEtbMapper)
 *
 * **Mapping-Herausforderungen:**
 * - `einsatzort` ist String in DB, Address Value Object in Domain
 * - `beschreibung` im Schema ↔ `bemerkung` in Domain
 * - `abgeschlossenAt` existiert NUR in Domain, NICHT in Prisma Schema
 *
 * **Design-Entscheidungen:**
 * - Address wird als JSON-String in einsatzort gespeichert (strukturiert)
 * - nummer wird als DB-Spalte persistiert (sequentielle Einsatznummern)
 * - abgeschlossenAt kann nicht aus DB rekonstruiert werden
 */
export class PrismaEinsatzMapper {
  /**
   * Konvertiert ein Einsatz Aggregate zu Prisma Persistence-Daten.
   *
   * Extrahiert alle Properties aus dem Aggregate und mappt sie auf das Prisma Schema.
   * Domain-Only Feld abgeschlossenAt wird NICHT persistiert.
   *
   * @param aggregate - Das Einsatz Aggregate
   * @param createdByUser - User-ID des Erstellers (für Audit Trail)
   * @param updatedByUser - Optional: User-ID des letzten Bearbeiters
   * @returns EinsatzPersistenceData für Prisma Upsert
   */
  static toPersistence(aggregate: Einsatz, createdByUser?: string, updatedByUser?: string): EinsatzPersistenceData {
    // Status Mapping: Domain VO → Prisma Enum String
    const status = PrismaEinsatzMapper.mapDomainStatusToPrisma(aggregate.status);

    // Address Serialization: Address VO → JSON String
    const einsatzortJson = PrismaEinsatzMapper.serializeAddress(aggregate.einsatzort);

    // archivedBy extrahieren falls archiviert
    // HINWEIS: Domain Aggregate speichert archivedBy nicht explizit als Property
    // Es kommt aus dem archive() Call - wir nutzen updatedByUser als Fallback
    const archivedBy = aggregate.archivedAt ? (updatedByUser ?? null) : null;

    return {
      id: aggregate.id.value,
      nummer: aggregate.nummer,
      alarmstichwort: aggregate.alarmstichwort,
      einsatzort: einsatzortJson,
      beschreibung: aggregate.bemerkung ?? null, // Domain: bemerkung → DB: beschreibung
      status,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
      createdBy: createdByUser ?? aggregate.createdBy.value,
      updatedBy: updatedByUser ?? null,
      archivedAt: aggregate.archivedAt ?? null,
      archivedBy,
      // Felder die aktuell nicht im Domain existieren - null Defaults
      alarmierungszeit: null,
      einsatzleiter: null,
      metadata: null,
    };
  }

  /**
   * Rekonstruiert ein Einsatz Aggregate aus Prisma-Daten.
   *
   * Nutzt Einsatz.reconstitute() für saubere Aggregate-Rekonstruktion
   * ohne Object.defineProperty-Hacks. reconstitute() emittiert keine
   * Domain Events, daher ist kein clearDomainEvents() nötig.
   *
   * @param prismaData - Einsatz Daten aus Prisma findFirst/findUnique
   * @returns Vollständig rekonstruiertes Einsatz Aggregate
   * @throws Error wenn ID oder Status Validierung fehlschlägt
   */
  static toAggregate(prismaData: EinsatzWithRelations): Einsatz {
    const einsatzIdResult = EinsatzId.create(prismaData.id);
    if (einsatzIdResult.isFailure) {
      throw new Error(`Invalid EinsatzId: ${einsatzIdResult.error}`);
    }
    const einsatzId = einsatzIdResult.value as EinsatzId;

    const createdByResult = UserId.create(prismaData.createdBy);
    if (createdByResult.isFailure) {
      throw new Error(`Invalid UserId for createdBy: ${createdByResult.error}`);
    }
    const createdBy = createdByResult.value as UserId;

    const status = PrismaEinsatzMapper.mapPrismaStatusToDomain(prismaData.status);
    const einsatzort = PrismaEinsatzMapper.deserializeAddress(prismaData.einsatzort);

    return Einsatz.reconstitute({
      id: einsatzId,
      nummer: prismaData.nummer,
      alarmstichwort: prismaData.alarmstichwort ?? 'Unbekannt',
      status,
      createdBy,
      einsatzort,
      bemerkung: prismaData.beschreibung ?? undefined,
      createdAt: prismaData.createdAt,
      updatedAt: prismaData.updatedAt,
      archivedAt: prismaData.archivedAt ?? undefined,
    });
  }

  /**
   * Serialisiert ein Address Value Object zu JSON-String für DB-Speicherung.
   *
   * @param address - Optional: Address Value Object
   * @returns JSON-String oder null wenn keine Address
   */
  private static serializeAddress(address?: Address): string | null {
    if (!address) return null;

    const addressData = {
      strasse: address.strasse,
      hausnummer: address.hausnummer,
      plz: address.plz,
      ort: address.ort,
    };

    return JSON.stringify(addressData);
  }

  /**
   * Deserialisiert JSON-String zu Address Value Object.
   *
   * @param json - JSON-String aus DB (einsatzort Feld) oder null
   * @returns Address Value Object oder undefined
   */
  private static deserializeAddress(json: string | null): Address | undefined {
    if (!json) return undefined;

    try {
      const data = JSON.parse(json);

      // Erstelle Address VO mit den deserialisierten Daten
      const addressResult = Address.create({
        strasse: data.strasse,
        hausnummer: data.hausnummer,
        plz: data.plz,
        ort: data.ort,
      });

      if (addressResult.isFailure) {
        // Bei ungültigen Daten (z.B. falsche PLZ) → undefined
        return undefined;
      }

      return addressResult.value as Address;
    } catch {
      // JSON Parse Fehler → undefined (graceful degradation)
      return undefined;
    }
  }

  /**
   * Mappt Domain EinsatzStatus Value Object zu Prisma Enum String.
   *
   * @param status - Domain EinsatzStatus Value Object
   * @returns Prisma EinsatzStatus Enum Wert
   */
  private static mapDomainStatusToPrisma(status: EinsatzStatus): PrismaEinsatzStatus {
    // Domain VO hat .value Property die den String-Wert enthält
    // Das stimmt 1:1 mit Prisma Enum überein
    return status.value as PrismaEinsatzStatus;
  }

  /**
   * Mappt Prisma EinsatzStatus Enum zu Domain Value Object.
   *
   * @param status - Prisma EinsatzStatus Enum Wert
   * @returns Domain EinsatzStatus Value Object
   * @throws Error wenn unbekannter Status
   */
  private static mapPrismaStatusToDomain(status: PrismaEinsatzStatus): EinsatzStatus {
    switch (status) {
      case 'ANGELEGT':
        return EinsatzStatus.ANGELEGT();
      case 'IN_BEARBEITUNG':
        return EinsatzStatus.IN_BEARBEITUNG();
      case 'ABGESCHLOSSEN':
        return EinsatzStatus.ABGESCHLOSSEN();
      case 'ARCHIVIERT':
        return EinsatzStatus.ARCHIVIERT();
      default:
        throw new Error(`Unknown EinsatzStatus: ${status}`);
    }
  }
}
