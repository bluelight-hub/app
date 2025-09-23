import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { User, EtbStatus } from '@prisma/client';
import { EtbRepository } from './etb.repository';
import { CreateEtbDto } from './dto/create-etb.dto';
import { CreateEtbEintragDto } from './dto/create-etb-eintrag.dto';
import { UpdateEtbEintragDto } from './dto/update-etb-eintrag.dto';

@Injectable()
export class EtbService {
  constructor(private readonly etbRepository: EtbRepository) {}

  async createEtb(createEtbDto: CreateEtbDto, user: User) {
    // Check if ETB already exists for this Einsatz
    const existingEtb = await this.etbRepository.findByEinsatzId(createEtbDto.einsatzId);
    if (existingEtb) {
      throw new ConflictException('ETB already exists for this Einsatz');
    }

    return this.etbRepository.create({
      einsatzId: createEtbDto.einsatzId,
      status: EtbStatus.DRAFT,
      createdBy: user.id,
    });
  }

  async getEtbByEinsatzId(einsatzId: string, limit?: number, offset?: number) {
    const etb = await this.etbRepository.findByEinsatzIdWithEntries(einsatzId, limit, offset);
    if (!etb) {
      throw new NotFoundException('ETB not found for this Einsatz');
    }
    return etb;
  }

  async createEintrag(etbId: string, createEintragDto: CreateEtbEintragDto, user: User) {
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

    return this.etbRepository.createEintrag({
      etbId,
      timestamp: createEintragDto.timestamp || new Date(),
      sequenceNumber: nextSequence,
      kategorie: createEintragDto.kategorie,
      text: createEintragDto.text,
      createdBy: user.id,
      version: 1,
    });
  }

  async updateEintrag(eintragId: string, updateEintragDto: UpdateEtbEintragDto, user: User) {
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
      changedBy: user.id,
    });

    // Update the entry with incremented version
    return this.etbRepository.updateEintrag(eintragId, {
      ...updateEintragDto,
      version: eintrag.version + 1,
      updatedBy: user.id,
    });
  }

  async deleteEintrag(eintragId: string, user: User) {
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
    await this.etbRepository.softDeleteEintrag(eintragId, user.id);
  }

  async getTextbausteine() {
    return this.etbRepository.findAllTextbausteine();
  }
}
