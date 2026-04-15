import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { Funkkanal, type FunkkanalStatus, FUNKKANAL_STATUS_VALUES } from '@domain/aggregates/funkkanal/funkkanal.entity';
import { FunkkanalZuordnung, FUNKKANAL_ROLLEN, type FunkkanalRolle, type FunkkanalZuordnungKraftRef } from '@domain/aggregates/funkkanal/funkkanal-zuordnung.entity';
import { KanalDetails } from '@domain/aggregates/funkkanal/kanal-details.vo';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { FunkkanalZuordnungId } from '@domain/value-objects/funkkanal-zuordnung-id';
import type { Funkkanal as PrismaFunkkanal, FunkkanalZuordnung as PrismaFunkkanalZuordnung } from '@/generated/prisma/client';

/**
 * Prisma-Shape des Funkkanals mit eager-loaded Zuordnungen — wird vom
 * Repository beim Laden (`findById`, `findByEinsatzId`) gereicht.
 */
export type FunkkanalWithZuordnungen = PrismaFunkkanal & {
  zuordnungen: PrismaFunkkanalZuordnung[];
};

/**
 * Persistenz-Shape eines Funkkanals ohne Discriminator (Prisma `upsert` Input).
 * Der Discriminator ist in `detailsType` enthalten; `detailsData` speichert den
 * typabhängigen Payload ohne das `type`-Feld (siehe `KanalDetails.toPersistence`).
 */
export interface FunkkanalPersistenceData {
  id: string;
  einsatzId: string;
  name: string;
  detailsType: string;
  detailsData: Record<string, unknown>;
  status: FunkkanalStatus;
  zweck: string | null;
  sortIndex: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Persistenz-Shape einer Zuordnung. Genau einer von `fahrzeugId | personId |
 * einheitId` ist gesetzt — das wird vom Check-Constraint
 * `funkkanal_zuordnung_genau_eine_kraft` erzwungen.
 */
export interface FunkkanalZuordnungPersistenceData {
  id: string;
  kanalId: string;
  fahrzeugId: string | null;
  personId: string | null;
  einheitId: string | null;
  rufnameSnapshot: string;
  rolle: FunkkanalRolle;
  createdAt: Date;
  createdBy: string | null;
}

/**
 * Mapper zwischen `FunkkanalAggregate` und Prisma-Shapes.
 *
 * Zweiseitig:
 * - `toPersistence(aggregate)`: Aggregat → Prisma-Upsert-Input (Root + Zuordnungen).
 * - `toAggregate(row)`: Prisma-Zeile → rekonstruiertes Aggregat (ohne Event-Emission).
 *
 * Der Mapper ist stateless und hat keine Framework-Abhängigkeiten außer den
 * generierten Prisma-Typen.
 */
export class PrismaFunkkanalMapper {
  static toPersistence(aggregate: FunkkanalAggregate): {
    kanal: FunkkanalPersistenceData;
    zuordnungen: FunkkanalZuordnungPersistenceData[];
  } {
    const kanal: FunkkanalPersistenceData = {
      id: aggregate.kanal.id.value,
      einsatzId: aggregate.kanal.einsatzId.value,
      name: aggregate.kanal.name,
      detailsType: aggregate.kanal.details.type,
      detailsData: KanalDetails.toPersistence(aggregate.kanal.details) as Record<string, unknown>,
      status: aggregate.kanal.status,
      zweck: aggregate.kanal.zweck ?? null,
      sortIndex: aggregate.kanal.sortIndex,
      createdBy: aggregate.kanal.createdBy ?? null,
      updatedBy: aggregate.kanal.updatedBy ?? null,
      createdAt: aggregate.kanal.createdAt,
      updatedAt: aggregate.kanal.updatedAt,
    };

    const zuordnungen: FunkkanalZuordnungPersistenceData[] = aggregate.zuordnungen.map((z) => ({
      id: z.id.value,
      kanalId: aggregate.kanal.id.value,
      fahrzeugId: z.kraftRef.kind === 'fahrzeug' ? z.kraftRef.fahrzeugId : null,
      personId: z.kraftRef.kind === 'person' ? z.kraftRef.personId : null,
      einheitId: z.kraftRef.kind === 'einheit' ? z.kraftRef.einheitId : null,
      rufnameSnapshot: z.rufnameSnapshot,
      rolle: z.rolle,
      createdAt: z.createdAt,
      createdBy: z.createdBy ?? null,
    }));

    return { kanal, zuordnungen };
  }

  static toAggregate(row: FunkkanalWithZuordnungen): FunkkanalAggregate {
    const kanal = PrismaFunkkanalMapper.toEntity(row);
    const zuordnungen = row.zuordnungen.map((z) => PrismaFunkkanalMapper.toZuordnungEntity(z, kanal.id));
    return FunkkanalAggregate.reconstitute(kanal, zuordnungen);
  }

  private static toEntity(row: PrismaFunkkanal): Funkkanal {
    const idResult = FunkkanalId.create(row.id);
    if (idResult.isFailure) {
      throw new Error(`Ungültige FunkkanalId in DB: ${idResult.error}`);
    }
    const einsatzIdResult = EinsatzId.create(row.einsatzId);
    if (einsatzIdResult.isFailure) {
      throw new Error(`Ungültige EinsatzId in DB: ${einsatzIdResult.error}`);
    }

    const details = KanalDetails.fromPersistence(row.detailsType, row.detailsData);
    const status = PrismaFunkkanalMapper.parseStatus(row.status);

    return new Funkkanal(
      idResult.value as FunkkanalId,
      einsatzIdResult.value as EinsatzId,
      row.name,
      details,
      status,
      row.zweck ?? undefined,
      row.sortIndex,
      row.createdAt,
      row.updatedAt,
      row.createdBy ?? undefined,
      row.updatedBy ?? undefined,
    );
  }

  private static toZuordnungEntity(row: PrismaFunkkanalZuordnung, kanalId: FunkkanalId): FunkkanalZuordnung {
    const idResult = FunkkanalZuordnungId.create(row.id);
    if (idResult.isFailure) {
      throw new Error(`Ungültige FunkkanalZuordnungId in DB: ${idResult.error}`);
    }
    const rolle = PrismaFunkkanalMapper.parseRolle(row.rolle);
    const kraftRef = PrismaFunkkanalMapper.deriveKraftRef(row);
    return new FunkkanalZuordnung(idResult.value as FunkkanalZuordnungId, kanalId, kraftRef, row.rufnameSnapshot, rolle, row.createdAt, row.createdBy ?? undefined);
  }

  private static deriveKraftRef(row: PrismaFunkkanalZuordnung): FunkkanalZuordnungKraftRef {
    const set = [row.fahrzeugId, row.personId, row.einheitId].filter((v): v is string => typeof v === 'string' && v.length > 0);
    if (set.length !== 1) {
      throw new Error(`FunkkanalZuordnung ${row.id}: exakt eine Kraft-Referenz erwartet, gefunden ${set.length}`);
    }
    if (row.fahrzeugId) return { kind: 'fahrzeug', fahrzeugId: row.fahrzeugId };
    if (row.personId) return { kind: 'person', personId: row.personId };
    return { kind: 'einheit', einheitId: row.einheitId as string };
  }

  private static parseStatus(value: string): FunkkanalStatus {
    if (!FUNKKANAL_STATUS_VALUES.includes(value as FunkkanalStatus)) {
      throw new Error(`Ungültiger FunkkanalStatus in DB: ${value}`);
    }
    return value as FunkkanalStatus;
  }

  private static parseRolle(value: string): FunkkanalRolle {
    if (!FUNKKANAL_ROLLEN.includes(value as FunkkanalRolle)) {
      throw new Error(`Ungültige FunkkanalRolle in DB: ${value}`);
    }
    return value as FunkkanalRolle;
  }
}
