import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ILagekarteStateRepository } from '@domain/repositories/i-lagekarte-state.repository';

/**
 * Infrastructure Adapter für ILagekarteStateRepository.
 *
 * Kapselt den Prisma-Zugriff für den GeoJSON-Zeichnungs-State einer Lagekarte.
 * Minimaler Adapter, der nur die für State-Persistierung benötigten Methoden
 * implementiert (Issue #638).
 *
 * @see ILagekarteStateRepository
 */
@Injectable()
export class PrismaLagekarteStateAdapter implements ILagekarteStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Findet eine Lagekarte anhand der Einsatz-ID.
   *
   * @param einsatzId - Eindeutige ID des Einsatzes
   * @returns Minimales Lagekarte-Objekt (id, einsatzId) oder null
   */
  async findByEinsatzId(einsatzId: string): Promise<{ id: string; einsatzId: string } | null> {
    return this.prisma.lagekarte.findUnique({
      where: { einsatzId },
      select: { id: true, einsatzId: true },
    });
  }

  /**
   * Lädt den GeoJSON-State einer Lagekarte anhand der Einsatz-ID.
   *
   * @param einsatzId - Eindeutige ID des Einsatzes
   * @returns GeoJSON FeatureCollection als plain object oder null
   */
  async getState(einsatzId: string): Promise<object | null> {
    const lagekarte = await this.prisma.lagekarte.findUnique({
      where: { einsatzId },
      select: { state: true },
    });
    return (lagekarte?.state as object) ?? null;
  }

  /**
   * Aktualisiert den GeoJSON-State einer Lagekarte.
   *
   * @param id - Eindeutige ID der Lagekarte
   * @param state - GeoJSON FeatureCollection als plain object
   */
  async updateState(id: string, state: object): Promise<void> {
    await this.prisma.lagekarte.update({
      where: { id },
      data: { state },
    });
  }
}
