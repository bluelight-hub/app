import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { BefehlsgeberVorschlagDto } from '../../dto/befehlsgeber-vorschlag.dto';
import { UpdateBefehlsgeberVorschlagCommand } from './update-befehlsgeber-vorschlag.command';

/** Handler fuer UpdateBefehlsgeberVorschlagCommand. */
@Injectable()
export class UpdateBefehlsgeberVorschlagHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateBefehlsgeberVorschlagCommand): Promise<BefehlsgeberVorschlagDto> {
    const existing = await this.prisma.befehlsgeberVorschlag.findUnique({
      where: { id: command.id },
    });

    if (!existing) {
      throw new NotFoundException(`BefehlsgeberVorschlag mit ID "${command.id}" nicht gefunden`);
    }

    if (command.kuerzel && command.kuerzel !== existing.kuerzel) {
      const duplicate = await this.prisma.befehlsgeberVorschlag.findUnique({
        where: { kuerzel: command.kuerzel },
      });
      if (duplicate) {
        throw new ConflictException(`Kuerzel "${command.kuerzel}" ist bereits vergeben`);
      }
    }

    const data: Record<string, unknown> = { updatedBy: command.updatedBy };
    if (command.kuerzel !== undefined) data.kuerzel = command.kuerzel;
    if (command.label !== undefined) data.label = command.label;
    if (command.sortOrder !== undefined) data.sortOrder = command.sortOrder;
    if (command.istAktiv !== undefined) data.istAktiv = command.istAktiv;

    const updated = await this.prisma.befehlsgeberVorschlag.update({
      where: { id: command.id },
      data,
    });

    return this.toDto(updated);
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
