import { Injectable } from '@nestjs/common';
import { Prisma, Warnstufe as PrismaWarnstufe, GefahrenzoneGeometryType as PrismaGeometryType, Gefahrentyp as PrismaGefahrentyp, Schutzobjekt as PrismaSchutzobjekt } from '@/generated/prisma/client';
import type { IGefahrenzoneRepository, GefahrenzoneWithWarnstufe } from '@domain/gefahr/repositories/i-gefahrenzone.repository';
import { Gefahrenzone } from '@domain/gefahr/entities/gefahrenzone.entity';
import { GefahrenzoneId } from '@domain/gefahr/value-objects/gefahrenzone-id';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { Schutzobjekt } from '@domain/gefahr/value-objects/schutzobjekt';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import { GefahrenzoneGeometry, GefahrenzoneGeometryType } from '@domain/gefahr/value-objects/gefahrenzone-geometry';
import { PrismaService } from '@/infrastructure/database/prisma.service';

type GefahrenzoneRow = {
  id: string;
  einsatzId: string;
  gefahrentyp: PrismaGefahrentyp;
  schutzobjekt: PrismaSchutzobjekt;
  geometryType: PrismaGeometryType;
  geometry: Prisma.JsonValue;
  bezeichnung: string | null;
  erstelltVon: string;
  aktualisiertVon: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Repository für Gefahrenzonen (Issue #627).
 *
 * Der Matrix-Upsert (Auto-Erstellen der Zelle mit KEINE, wenn nicht vorhanden) läuft
 * hier, weil die composite FK im Schema das zur Laufzeit erzwingt. Der Application-Layer
 * übergibt nur den semantischen Schlüssel und die Transaction.
 */
@Injectable()
export class PrismaGefahrenzoneRepository implements IGefahrenzoneRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown): typeof this.prisma {
    return (tx as typeof this.prisma) ?? this.prisma;
  }

  async save(zone: Gefahrenzone, tx?: unknown): Promise<void> {
    const client = this.getClient(tx);
    // Matrix-Zelle lazy anlegen, falls sie noch nicht existiert (ADR-010).
    // Ohne diesen Upsert würde die composite FK das Insert blockieren, sobald eine Zone
    // für eine noch nicht bewertete Matrix-Kombination gezeichnet wird.
    await client.gefahrenmatrixBewertung.upsert({
      where: {
        einsatzId_gefahrentyp_schutzobjekt: {
          einsatzId: zone.einsatzId,
          gefahrentyp: zone.gefahrentyp as unknown as PrismaGefahrentyp,
          schutzobjekt: zone.schutzobjekt as unknown as PrismaSchutzobjekt,
        },
      },
      create: {
        einsatzId: zone.einsatzId,
        gefahrentyp: zone.gefahrentyp as unknown as PrismaGefahrentyp,
        schutzobjekt: zone.schutzobjekt as unknown as PrismaSchutzobjekt,
        warnstufe: PrismaWarnstufe.KEINE,
        aktualisiertVon: zone.erstelltVon,
      },
      update: {},
    });

    await client.gefahrenzone.upsert({
      where: { id: zone.id.value },
      create: {
        id: zone.id.value,
        einsatzId: zone.einsatzId,
        gefahrentyp: zone.gefahrentyp as unknown as PrismaGefahrentyp,
        schutzobjekt: zone.schutzobjekt as unknown as PrismaSchutzobjekt,
        geometryType: zone.geometryType as unknown as PrismaGeometryType,
        geometry: zone.geometry.toJSON() as unknown as Prisma.InputJsonValue,
        bezeichnung: zone.bezeichnung,
        erstelltVon: zone.erstelltVon,
        aktualisiertVon: zone.aktualisiertVon,
      },
      update: {
        geometryType: zone.geometryType as unknown as PrismaGeometryType,
        geometry: zone.geometry.toJSON() as unknown as Prisma.InputJsonValue,
        bezeichnung: zone.bezeichnung,
        aktualisiertVon: zone.aktualisiertVon,
      },
    });
  }

  async findById(einsatzId: string, zoneId: string, tx?: unknown): Promise<Gefahrenzone | null> {
    const client = this.getClient(tx);
    const row = await client.gefahrenzone.findFirst({
      where: { id: zoneId, einsatzId },
    });
    return row ? toDomain(row) : null;
  }

  async findByEinsatzIdWithWarnstufe(einsatzId: string, tx?: unknown): Promise<GefahrenzoneWithWarnstufe[]> {
    const client = this.getClient(tx);
    const rows = await client.gefahrenzone.findMany({
      where: { einsatzId },
      include: { matrixZelle: { select: { warnstufe: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => {
      const warnstufePrisma = row.matrixZelle?.warnstufe ?? null;
      return {
        zone: toDomain(row),
        warnstufe: warnstufePrisma ? (warnstufePrisma as unknown as Warnstufe) : null,
      };
    });
  }

  async delete(einsatzId: string, zoneId: string, tx?: unknown): Promise<void> {
    const client = this.getClient(tx);
    await client.gefahrenzone.deleteMany({
      where: { id: zoneId, einsatzId },
    });
  }
}

function toDomain(row: GefahrenzoneRow): Gefahrenzone {
  const idResult = GefahrenzoneId.create(row.id);
  if (idResult.isFailure || !idResult.value) {
    throw new Error(`Invalid Gefahrenzone ID in database: ${row.id}`);
  }
  const geometryResult = GefahrenzoneGeometry.fromFeature(row.geometry);
  if (geometryResult.isFailure || !geometryResult.value) {
    throw new Error(`Invalid Gefahrenzone geometry in database (id=${row.id}): ${geometryResult.error}`);
  }

  return Gefahrenzone.reconstruct({
    id: idResult.value as GefahrenzoneId,
    einsatzId: row.einsatzId,
    gefahrentyp: row.gefahrentyp as unknown as Gefahrentyp,
    schutzobjekt: row.schutzobjekt as unknown as Schutzobjekt,
    geometryType: row.geometryType as unknown as GefahrenzoneGeometryType,
    geometry: geometryResult.value,
    bezeichnung: row.bezeichnung,
    erstelltVon: row.erstelltVon,
    aktualisiertVon: row.aktualisiertVon,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
