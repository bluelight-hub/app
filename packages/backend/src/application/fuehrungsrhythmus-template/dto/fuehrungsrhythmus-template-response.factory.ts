import { Injectable } from '@nestjs/common';
import type { FuehrungsrhythmusTemplate } from '@domain/fuehrungsrhythmus/entities/fuehrungsrhythmus-template.entity';
import type { FuehrungsrhythmusTemplateResponseDto } from './fuehrungsrhythmus-template-response.dto';

/**
 * Factory zur Erstellung von FuehrungsrhythmusTemplateResponseDtos.
 */
@Injectable()
export class FuehrungsrhythmusTemplateResponseFactory {
  /**
   * Konvertiert eine Domain Entity in ein Response DTO.
   */
  create(template: FuehrungsrhythmusTemplate): FuehrungsrhythmusTemplateResponseDto {
    return {
      id: template.id.toString(),
      name: template.name.value,
      beschreibung: template.beschreibung,
      eintraege: template.eintraege.map((e) => ({
        id: e.id,
        titel: e.titel,
        intervallMinuten: e.intervallMinuten,
        offsetMinuten: e.offsetMinuten,
        sortOrder: e.sortOrder,
      })),
      createdBy: template.createdBy.toString(),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }
}
