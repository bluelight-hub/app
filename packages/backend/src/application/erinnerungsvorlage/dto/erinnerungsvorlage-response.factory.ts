import { Injectable } from '@nestjs/common';
import type { Erinnerungsvorlage } from '@domain/erinnerungsvorlage/entities/erinnerungsvorlage.entity';
import type { ErinnerungsvorlageResponseDto } from './erinnerungsvorlage-response.dto';

/**
 * Factory zur Erstellung von ErinnerungsvorlageResponseDtos.
 */
@Injectable()
export class ErinnerungsvorlageResponseFactory {
  /**
   * Konvertiert eine Domain Entity in ein Response DTO.
   */
  create(vorlage: Erinnerungsvorlage): ErinnerungsvorlageResponseDto {
    return {
      id: vorlage.id.toString(),
      titel: vorlage.titel.value,
      minuten: vorlage.minuten,
      beschreibung: vorlage.beschreibung,
      createdBy: vorlage.createdBy.toString(),
      createdAt: vorlage.createdAt.toISOString(),
      updatedAt: vorlage.updatedAt.toISOString(),
    };
  }
}
