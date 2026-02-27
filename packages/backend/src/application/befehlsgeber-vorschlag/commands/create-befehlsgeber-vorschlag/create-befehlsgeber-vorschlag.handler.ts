import { Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { BefehlsgeberVorschlagDto } from '../../dto/befehlsgeber-vorschlag.dto';
import { CreateBefehlsgeberVorschlagCommand } from './create-befehlsgeber-vorschlag.command';

/** Handler fuer CreateBefehlsgeberVorschlagCommand. Nutzt PrismaService direkt (Stammdaten). */
@Injectable()
export class CreateBefehlsgeberVorschlagHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateBefehlsgeberVorschlagCommand): Promise<Result<BefehlsgeberVorschlagDto>> {
    const existing = await this.prisma.befehlsgeberVorschlag.findUnique({
      where: { kuerzel: command.kuerzel },
    });

    if (existing) {
      return Result.fail(`Kuerzel "${command.kuerzel}" ist bereits vergeben`);
    }

    const created = await this.prisma.befehlsgeberVorschlag.create({
      data: {
        kuerzel: command.kuerzel,
        label: command.label,
        sortOrder: command.sortOrder ?? 0,
        createdBy: command.createdBy,
      },
    });

    return Result.ok(this.toDto(created));
  }

  private toDto(entity: {
    id: string;
    kuerzel: string;
    label: string;
    istAktiv: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string | null;
  }): BefehlsgeberVorschlagDto {
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
  }
}
