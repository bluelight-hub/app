import { Injectable } from '@nestjs/common';
import type { IHazardZoneRepository } from '@domain/hazard-zone/repositories/i-hazard-zone.repository';
import { HazardZone } from '@domain/hazard-zone/entities/hazard-zone.entity';
import { HazardZoneId } from '@domain/hazard-zone/value-objects/hazard-zone-id';
import { type HazardZoneGeometry, HazardZoneGeometryType } from '@domain/hazard-zone/value-objects/hazard-zone-geometry';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class PrismaHazardZoneRepository implements IHazardZoneRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown): typeof this.prisma {
    return (tx as typeof this.prisma) ?? this.prisma;
  }

  async save(zone: HazardZone, tx?: unknown): Promise<void> {
    const client = this.getClient(tx);
    await client.hazardZone.upsert({
      where: { id: zone.id.value },
      create: {
        id: zone.id.value,
        einsatzId: zone.einsatzId,
        gefahrentyp: zone.gefahrentyp,
        geometryType: zone.geometryType,
        geometry: zone.geometry as unknown as object,
        radiusMeters: zone.radiusMeters,
        label: zone.label,
        beschreibung: zone.beschreibung,
        createdBy: zone.createdBy,
        updatedBy: zone.updatedBy,
      },
      update: {
        gefahrentyp: zone.gefahrentyp,
        geometryType: zone.geometryType,
        geometry: zone.geometry as unknown as object,
        radiusMeters: zone.radiusMeters,
        label: zone.label,
        beschreibung: zone.beschreibung,
        updatedBy: zone.updatedBy,
      },
    });
  }

  async findByEinsatzId(einsatzId: string, tx?: unknown): Promise<HazardZone[]> {
    const client = this.getClient(tx);
    const rows = await client.hazardZone.findMany({
      where: { einsatzId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.mapRowToZone(row));
  }

  async findById(id: string, tx?: unknown): Promise<HazardZone | null> {
    const client = this.getClient(tx);
    const row = await client.hazardZone.findUnique({ where: { id } });
    return row ? this.mapRowToZone(row) : null;
  }

  async deleteById(id: string, tx?: unknown): Promise<void> {
    const client = this.getClient(tx);
    await client.hazardZone.deleteMany({ where: { id } });
  }

  private mapRowToZone(row: {
    id: string;
    einsatzId: string;
    gefahrentyp: string;
    geometryType: string;
    geometry: unknown;
    radiusMeters: number | null;
    label: string | null;
    beschreibung: string | null;
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): HazardZone {
    const idResult = HazardZoneId.create(row.id);
    return HazardZone.reconstruct({
      id: idResult.value! as HazardZoneId,
      einsatzId: row.einsatzId,
      gefahrentyp: row.gefahrentyp as Gefahrentyp,
      geometryType: row.geometryType as HazardZoneGeometryType,
      geometry: row.geometry as HazardZoneGeometry,
      radiusMeters: row.radiusMeters,
      label: row.label,
      beschreibung: row.beschreibung,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
