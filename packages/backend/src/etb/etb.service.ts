import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { EtbStatus, Einsatztagebuch, EtbEintrag, EtbTextbaustein, Einsatz, User } from '@prisma/client';
import { ValidatedUser } from '@/auth/strategies/jwt.strategy';
import { EtbRepository } from './etb.repository';
import { CreateEtbDto } from './dto/create-etb.dto';
import { CreateEtbEintragDto } from './dto/create-etb-eintrag.dto';
import { UpdateEtbEintragDto } from './dto/update-etb-eintrag.dto';
import { CreateEtbResponse, GetEtbResponse, CreateEtbEintragResponse, UpdateEtbEintragResponse, TextbausteinListResponse, EtbDto, EtbEintragDto, TextbausteinDto } from './dto/etb-response.dto';

@Injectable()
export class EtbService {
  constructor(private readonly etbRepository: EtbRepository) {}

  /**
   * Maps a Prisma EtbEintrag to EtbEintragDto
   */
  private toEtbEintragDto(
    eintrag: EtbEintrag & {
      creator?: Partial<User> | null;
      updater?: Partial<User> | null;
      historie?: Array<{ id: string; version: number; changedAt: Date }> | null;
    },
  ): EtbEintragDto {
    return {
      id: eintrag.id,
      etbId: eintrag.etbId,
      timestamp: eintrag.timestamp,
      sequenceNumber: eintrag.sequenceNumber,
      kategorie: eintrag.kategorie,
      text: eintrag.text,
      version: eintrag.version,
      funkrufname: eintrag.funkrufname ?? undefined,
      standort: eintrag.standort ?? undefined,
      isAutomatic: eintrag.isAutomatic ?? false,
      metadata: eintrag.metadata ? (eintrag.metadata as Record<string, unknown>) : undefined,
      createdBy: eintrag.createdBy,
      createdAt: eintrag.createdAt,
      updatedBy: eintrag.updatedBy ?? undefined,
      updatedAt: eintrag.updatedAt,
      deletedAt: eintrag.deletedAt ?? undefined,
      deletedBy: eintrag.deletedBy ?? undefined,
    };
  }

  /**
   * Maps a Prisma Einsatztagebuch to EtbDto
   */
  private toEtbDto(
    etb: Einsatztagebuch & {
      einsatz?: Partial<Einsatz> | null;
      creator?: Partial<User> | null;
      updater?: Partial<User> | null;
      locker?: Partial<User> | null;
      eintraege?: Array<
        EtbEintrag & {
          creator?: Partial<User> | null;
          updater?: Partial<User> | null;
          historie?: Array<{ id: string; version: number; changedAt: Date }> | null;
        }
      > | null;
    },
  ): EtbDto {
    const dto: EtbDto = {
      id: etb.id,
      einsatzId: etb.einsatzId,
      status: etb.status,
      createdBy: etb.createdBy,
      createdAt: etb.createdAt,
      updatedAt: etb.updatedAt,
    };

    // Only include eintraege if they are loaded
    if (etb.eintraege) {
      dto.eintraege = etb.eintraege.map((e) => this.toEtbEintragDto(e));
    }

    return dto;
  }

  /**
   * Maps a Prisma EtbTextbaustein to TextbausteinDto
   */
  private toTextbausteinDto(
    baustein: EtbTextbaustein & {
      creator?: Partial<User> | null;
      updater?: Partial<User> | null;
    },
  ): TextbausteinDto {
    return {
      id: baustein.id,
      kategorie: baustein.kategorie,
      kurztext: baustein.kurztext,
      volltext: baustein.volltext,
      isActive: baustein.isActive ?? true,
      sortOrder: baustein.sortOrder ?? 0,
      verwendungen: baustein.verwendungen ?? 0,
      letztGenutzt: baustein.letztGenutzt ?? undefined,
    };
  }

  async createEtb(createEtbDto: CreateEtbDto, user: ValidatedUser): Promise<CreateEtbResponse> {
    // Check if ETB already exists for this Einsatz
    const existingEtb = await this.etbRepository.findByEinsatzId(createEtbDto.einsatzId);
    if (existingEtb) {
      throw new ConflictException('ETB already exists for this Einsatz');
    }

    const etb = await this.etbRepository.create({
      einsatzId: createEtbDto.einsatzId,
      status: EtbStatus.DRAFT,
      createdBy: user.userId,
    });

    return {
      data: this.toEtbDto(etb),
      meta: {
        timestamp: new Date().toISOString(),
      },
      message: 'ETB erfolgreich erstellt',
    };
  }

  async getEtbByEinsatzId(einsatzId: string, limit: number = 10, page: number = 1): Promise<GetEtbResponse> {
    const offset = (page - 1) * limit;
    const etb = await this.etbRepository.findByEinsatzIdWithEntries(einsatzId, limit, offset);
    if (!etb) {
      throw new NotFoundException('ETB not found for this Einsatz');
    }

    // Get total count for pagination
    const total = await this.etbRepository.countEintraege(etb.id);
    const totalPages = Math.ceil(total / limit);

    return {
      data: this.toEtbDto(etb),
      meta: {
        timestamp: new Date().toISOString(),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async createEintrag(etbId: string, createEintragDto: CreateEtbEintragDto, user: ValidatedUser): Promise<CreateEtbEintragResponse> {
    // Verify ETB exists and is not locked
    const etb = await this.etbRepository.findById(etbId);
    if (!etb) {
      throw new NotFoundException('ETB not found');
    }
    if (etb.status === EtbStatus.LOCKED) {
      throw new BadRequestException('Cannot add entries to locked ETB');
    }

    // Use atomic method to prevent race conditions
    const eintrag = await this.etbRepository.createEintragAtomic({
      etbId,
      timestamp: createEintragDto.timestamp || new Date(),
      kategorie: createEintragDto.kategorie,
      text: createEintragDto.text,
      createdBy: user.userId,
      version: 1,
    });

    return {
      data: this.toEtbEintragDto(eintrag),
      meta: {
        timestamp: new Date().toISOString(),
      },
      message: 'ETB-Eintrag erfolgreich erstellt',
    };
  }

  async updateEintrag(eintragId: string, updateEintragDto: UpdateEtbEintragDto, user: ValidatedUser): Promise<UpdateEtbEintragResponse> {
    // Verify entry exists
    const eintrag = await this.etbRepository.findEintragById(eintragId);
    if (!eintrag) {
      throw new NotFoundException('ETB entry not found');
    }

    // Verify ETB is not locked
    const etb = await this.etbRepository.findById(eintrag.etbId);
    if (!etb) {
      throw new NotFoundException('ETB not found');
    }
    if (etb.status === EtbStatus.LOCKED) {
      throw new BadRequestException('Cannot update entries in locked ETB');
    }

    // Create history entry before update
    await this.etbRepository.createEintragHistory({
      eintragId,
      version: eintrag.version,
      timestamp: eintrag.timestamp,
      sequenceNumber: eintrag.sequenceNumber,
      kategorie: eintrag.kategorie,
      text: eintrag.text,
      changeReason: updateEintragDto.changeReason || 'Update',
      changedBy: user.userId,
    });

    // Update the entry with incremented version
    const updatedEintrag = await this.etbRepository.updateEintrag(eintragId, {
      ...updateEintragDto,
      version: eintrag.version + 1,
      updatedBy: user.userId,
    });

    return {
      data: this.toEtbEintragDto(updatedEintrag),
      meta: {
        timestamp: new Date().toISOString(),
      },
      message: 'ETB-Eintrag erfolgreich aktualisiert',
    };
  }

  async deleteEintrag(eintragId: string, user: ValidatedUser): Promise<void> {
    // Verify entry exists
    const eintrag = await this.etbRepository.findEintragById(eintragId);
    if (!eintrag) {
      throw new NotFoundException('ETB entry not found');
    }

    // Verify ETB is not locked
    const etb = await this.etbRepository.findById(eintrag.etbId);
    if (!etb) {
      throw new NotFoundException('ETB not found');
    }
    if (etb.status === EtbStatus.LOCKED) {
      throw new BadRequestException('Cannot delete entries from locked ETB');
    }

    // Soft delete
    await this.etbRepository.softDeleteEintrag(eintragId, user.userId);
  }

  async getTextbausteine(): Promise<TextbausteinListResponse> {
    const textbausteine = await this.etbRepository.findAllTextbausteine();

    return {
      data: textbausteine.map((baustein) => this.toTextbausteinDto(baustein)),
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
