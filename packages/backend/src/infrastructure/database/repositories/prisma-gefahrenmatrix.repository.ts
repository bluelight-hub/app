import { Injectable } from '@nestjs/common';
import type { IGefahrenmatrixRepository } from '@domain/gefahr/repositories/i-gefahrenmatrix.repository';
import { GefahrenmatrixBewertung } from '@domain/gefahr/entities/gefahrenmatrix.entity';
import { GefahrId } from '@domain/gefahr/value-objects/gefahr-id';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { Schutzobjekt } from '@domain/gefahr/value-objects/schutzobjekt';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class PrismaGefahrenmatrixRepository implements IGefahrenmatrixRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown): typeof this.prisma {
    return (tx as typeof this.prisma) ?? this.prisma;
  }

  async save(bewertung: GefahrenmatrixBewertung, tx?: unknown): Promise<void> {
    const client = this.getClient(tx);
    await client.gefahrenmatrixBewertung.upsert({
      where: {
        einsatzId_gefahrentyp_schutzobjekt: {
          einsatzId: bewertung.einsatzId,
          gefahrentyp: bewertung.gefahrentyp,
          schutzobjekt: bewertung.schutzobjekt,
        },
      },
      create: {
        id: bewertung.id.value,
        einsatzId: bewertung.einsatzId,
        gefahrentyp: bewertung.gefahrentyp,
        schutzobjekt: bewertung.schutzobjekt,
        warnstufe: bewertung.warnstufe,
        beschreibung: bewertung.beschreibung,
        gemeldetVon: bewertung.gemeldetVon,
        aktualisiertVon: bewertung.aktualisiertVon,
      },
      update: {
        warnstufe: bewertung.warnstufe,
        beschreibung: bewertung.beschreibung,
        gemeldetVon: bewertung.gemeldetVon,
        aktualisiertVon: bewertung.aktualisiertVon,
      },
    });
  }

  async findByEinsatzId(einsatzId: string, tx?: unknown): Promise<GefahrenmatrixBewertung[]> {
    const client = this.getClient(tx);
    const rows = await client.gefahrenmatrixBewertung.findMany({
      where: { einsatzId },
    });
    return rows.map((row) => {
      const idResult = GefahrId.create(row.id);
      return GefahrenmatrixBewertung.reconstruct({
        id: idResult.value! as GefahrId,
        einsatzId: row.einsatzId,
        gefahrentyp: row.gefahrentyp as Gefahrentyp,
        schutzobjekt: row.schutzobjekt as Schutzobjekt,
        warnstufe: row.warnstufe as Warnstufe,
        beschreibung: row.beschreibung,
        gemeldetVon: row.gemeldetVon,
        aktualisiertVon: row.aktualisiertVon,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    });
  }

  async deleteByKey(einsatzId: string, gefahrentyp: string, schutzobjekt: string, tx?: unknown): Promise<void> {
    const client = this.getClient(tx);
    await client.gefahrenmatrixBewertung.deleteMany({
      where: {
        einsatzId,
        gefahrentyp: gefahrentyp as Gefahrentyp,
        schutzobjekt: schutzobjekt as Schutzobjekt,
      },
    });
  }
}
