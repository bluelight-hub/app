import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { BefehlsgeberVorschlagDto } from '../../dto/befehlsgeber-vorschlag.dto';
import { GetAllBefehlsgeberVorschlaegeQuery } from './get-all-befehlsgeber-vorschlaege.query';

/** Handler fuer GetAllBefehlsgeberVorschlaegeQuery. Read-Only, Prisma direkt. */
@Injectable()
export class GetAllBefehlsgeberVorschlaegeHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAllBefehlsgeberVorschlaegeQuery): Promise<BefehlsgeberVorschlagDto[]> {
    const where = query.istAktiv !== undefined ? { istAktiv: query.istAktiv } : undefined;

    const results = await this.prisma.befehlsgeberVorschlag.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return results.map((entity) => {
      const dto = new BefehlsgeberVorschlagDto();
      dto.id = entity.id;
      dto.kuerzel = entity.kuerzel;
      dto.label = entity.label;
      dto.istAktiv = entity.istAktiv;
      dto.sortOrder = entity.sortOrder;
      dto.createdAt = entity.createdAt;
      dto.updatedAt = entity.updatedAt;
      dto.createdBy = entity.createdBy;
      dto.updatedBy = entity.updatedBy ?? undefined;
      return dto;
    });
  }
}
