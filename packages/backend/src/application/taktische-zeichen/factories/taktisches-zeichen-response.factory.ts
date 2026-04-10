import { Injectable } from '@nestjs/common';
import type { TaktischesZeichen } from '@domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate';
import type { TaktischesZeichenResponseDto, ZeichenDefinitionDto } from '../dtos/taktisches-zeichen-response.dto';

/**
 * Factory zur Erstellung von TaktischesZeichenResponseDtos.
 * Konvertiert TaktischesZeichen Aggregate in Response DTOs für die API-Schicht.
 */
@Injectable()
export class TaktischesZeichenResponseFactory {
  /**
   * Konvertiert ein TaktischesZeichen Aggregate in ein Response DTO.
   *
   * @param zeichen - Das TaktischesZeichen Aggregate
   * @returns TaktischesZeichenResponseDto für die API-Antwort
   */
  create(zeichen: TaktischesZeichen): TaktischesZeichenResponseDto {
    const zeichenDefinition: ZeichenDefinitionDto = {
      grundzeichen: zeichen.zeichenDefinition.grundzeichen,
      ...(zeichen.zeichenDefinition.organisation !== undefined && { organisation: zeichen.zeichenDefinition.organisation }),
      ...(zeichen.zeichenDefinition.fachaufgabe !== undefined && { fachaufgabe: zeichen.zeichenDefinition.fachaufgabe }),
      ...(zeichen.zeichenDefinition.einheit !== undefined && { einheit: zeichen.zeichenDefinition.einheit }),
      ...(zeichen.zeichenDefinition.verwaltungsstufe !== undefined && { verwaltungsstufe: zeichen.zeichenDefinition.verwaltungsstufe }),
      ...(zeichen.zeichenDefinition.symbol !== undefined && { symbol: zeichen.zeichenDefinition.symbol }),
      ...(zeichen.zeichenDefinition.text !== undefined && { text: zeichen.zeichenDefinition.text }),
    };

    return {
      id: zeichen.id.value,
      einsatzId: zeichen.einsatzId,
      zeichenDefinition,
      ...(zeichen.referenzTyp !== undefined && { referenzTyp: zeichen.referenzTyp }),
      ...(zeichen.referenzId !== undefined && { referenzId: zeichen.referenzId }),
      ...(zeichen.lat !== undefined && { lat: zeichen.lat }),
      ...(zeichen.lng !== undefined && { lng: zeichen.lng }),
      ...(zeichen.mgrs !== undefined && { mgrs: zeichen.mgrs }),
      ...(zeichen.lagekarteId !== undefined && { lagekarteId: zeichen.lagekarteId }),
      ...(zeichen.label !== undefined && { label: zeichen.label }),
      ...(zeichen.notiz !== undefined && { notiz: zeichen.notiz }),
      istAusKatalog: zeichen.istAusKatalog,
      ...(zeichen.katalogEintragId !== undefined && { katalogEintragId: zeichen.katalogEintragId }),
      istPlatziert: zeichen.istPlatziert,
      createdAt: zeichen.createdAt.toISOString(),
      createdBy: zeichen.createdBy,
      updatedAt: zeichen.updatedAt.toISOString(),
      ...(zeichen.updatedBy !== undefined && { updatedBy: zeichen.updatedBy }),
    };
  }
}
