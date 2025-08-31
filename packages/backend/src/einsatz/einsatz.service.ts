import { CreateEinsatzDto, EinsatzCompleteness, EinsatzQueryDto, EinsatzResponseDto, UpdateEinsatzDto } from '@/einsatz/dto';
import type { PaginatedData } from '@/common/interceptors/transform.interceptor';
import { Injectable, Logger } from '@nestjs/common';
import { Einsatz, Prisma } from '@prisma/client';
import { EinsatzRepository } from './einsatz.repository';
import { EinsatzNotFoundException } from './exceptions/einsatz-not-found.exception';
import { EinsatzCompletenessCalculator } from './utils/completeness.util';
import { EinsatzNameGenerator } from './utils/name-generator.util';

@Injectable()
export class EinsatzService {
  private readonly logger = new Logger(EinsatzService.name);
  private readonly completenessCache = new Map<string, { data: EinsatzCompleteness; expires: number }>();
  private readonly CACHE_TTL = 60000; // 60 seconds

  constructor(private readonly repository: EinsatzRepository) {}

  /**
   * Erstellt einen neuen Einsatz mit automatisch generiertem Namen
   */
  async create(dto: CreateEinsatzDto, userId: string): Promise<EinsatzResponseDto> {
    const einsatzData = {
      alarmstichwort: dto.alarmstichwort || null,
      alarmierungszeit: dto.alarmierungszeit ? new Date(dto.alarmierungszeit) : null,
      creator: {
        connect: {
          id: userId,
        },
      },
    };

    const einsatz = await this.repository.create(einsatzData);
    this.logger.log(`🚨 Einsatz ${einsatz.id} erstellt von User ${userId}`);

    return this.toResponseDto(einsatz);
  }

  /**
   * Gibt alle Einsätze zurück mit optionalem Status-Filter, Suchbegriff und Pagination
   */
  async findAll(params?: EinsatzQueryDto): Promise<PaginatedData<EinsatzResponseDto>> {
    const { status, search, includeCompleteness = false, page = 1, limit = 10 } = params || {};

    // Build where conditions
    const where: Prisma.EinsatzWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      const searchTerm = search.trim();
      if (searchTerm) {
        // Note: Since 'name' is generated, we search in the fields that compose it
        where.OR = [{ alarmstichwort: { contains: searchTerm, mode: 'insensitive' } }, { id: { contains: searchTerm, mode: 'insensitive' } }];
      }
    }

    const result = await this.repository.findWithPagination(page, limit, where);
    const items = await Promise.all(result.items.map((e: Einsatz) => this.toResponseDto(e, includeCompleteness)));

    this.logger.log(`Found ${result.total} Einsätze (showing ${items.length}) with filters: status=${status}, search='${search}'`);

    return {
      items,
      total: result.total,
      page,
      limit,
    };
  }

  /**
   * Gibt einen einzelnen Einsatz zurück
   */
  async findOne(id: string, includeCompleteness = true): Promise<EinsatzResponseDto> {
    const einsatz = await this.repository.findOne(id);

    if (!einsatz) {
      throw new EinsatzNotFoundException(id);
    }

    return this.toResponseDto(einsatz, includeCompleteness);
  }

  /**
   * Aktualisiert einen Einsatz und generiert den Namen neu
   */
  async update(id: string, dto: UpdateEinsatzDto, userId: string): Promise<EinsatzResponseDto> {
    const existing = await this.repository.findOne(id);

    if (!existing) {
      throw new EinsatzNotFoundException(id);
    }

    const updateData: Prisma.EinsatzUpdateInput = {
      alarmstichwort: dto.alarmstichwort,
      status: dto.status,
      metadata: dto.metadata as Prisma.InputJsonValue,
      updater: {
        connect: {
          id: userId,
        },
      },
    };

    if (dto.alarmierungszeit) {
      updateData.alarmierungszeit = new Date(dto.alarmierungszeit);
    }

    const updated = await this.repository.update(id, updateData);
    this.logger.log(`Einsatz ${id} aktualisiert von User ${userId}`);

    // Cache invalidieren
    this.completenessCache.delete(id);

    return this.toResponseDto(updated);
  }

  /**
   * Berechnet die Vollständigkeit eines Einsatzes
   */
  async getCompleteness(id: string, refresh = false) {
    if (!refresh) {
      const cached = this.completenessCache.get(id);
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      }
    }

    const einsatz = await this.repository.findOne(id);
    if (!einsatz) {
      throw new EinsatzNotFoundException(id);
    }

    const completeness = EinsatzCompletenessCalculator.calculate(einsatz);

    // Cache speichern
    this.completenessCache.set(id, {
      data: completeness,
      expires: Date.now() + this.CACHE_TTL,
    });

    // Cleanup bei zu vielen Einträgen
    if (this.completenessCache.size > 100) {
      this.cleanupExpiredCacheEntries();
    }

    return completeness;
  }

  /**
   * Konvertiert ein Einsatz-Entity zu einem ResponseDTO mit computed fields
   */
  private async toResponseDto(einsatz: Einsatz, includeCompleteness = false): Promise<EinsatzResponseDto> {
    const name = EinsatzNameGenerator.generate(einsatz);
    const nameComponents = EinsatzNameGenerator.getNameComponents(einsatz);

    const response: EinsatzResponseDto = {
      ...einsatz,
      name,
      nameComponents,
    };

    if (includeCompleteness) {
      response.completeness = await this.getCompleteness(einsatz.id);
    }

    return response;
  }

  /**
   * Bereinigt abgelaufene Cache-Einträge
   */
  private cleanupExpiredCacheEntries(): void {
    const now = Date.now();
    for (const [key, value] of this.completenessCache.entries()) {
      if (value.expires < now) {
        this.completenessCache.delete(key);
      }
    }
  }
}
