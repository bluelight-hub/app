import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { EtbStatus } from '@prisma/client';
import { ValidatedUser } from '@/auth/strategies/jwt.strategy';
import { EtbRepository } from './etb.repository';
import { CreateEtbDto } from './dto/create-etb.dto';
import { CreateEtbEintragDto } from './dto/create-etb-eintrag.dto';
import { UpdateEtbEintragDto } from './dto/update-etb-eintrag.dto';
import { CreateEtbResponse, GetEtbResponse, CreateEtbEintragResponse, UpdateEtbEintragResponse, TextbausteinListResponse } from './dto/etb-response.dto';

@Injectable()
export class EtbService {
  constructor(private readonly etbRepository: EtbRepository) {}

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
      data: etb,
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
      data: etb,
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

    // Get next sequence number
    const nextSequence = await this.etbRepository.getNextSequenceNumber(etbId);

    const eintrag = await this.etbRepository.createEintrag({
      etbId,
      timestamp: createEintragDto.timestamp || new Date(),
      sequenceNumber: nextSequence,
      kategorie: createEintragDto.kategorie,
      text: createEintragDto.text,
      createdBy: user.userId,
      version: 1,
    });

    return {
      data: eintrag,
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
      data: updatedEintrag,
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
      data: textbausteine,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
