/**
 * Interner API-Accessor für taktische Zeichen.
 *
 * Kapselt den Zugriff auf den generierten API-Client.
 * Alle Methoden extrahieren die Nutzdaten aus dem wrapped Response-Format.
 */

import { api } from '@/shared';
import type { CreateTaktischesZeichenDto, PlatziereZeichenDto, TaktischesZeichenResponseDto, UpdateTaktischesZeichenDto, ZeichenKatalogEintragResponseDto } from '@bluelight-hub/shared/client';

export async function apiFindZeichenFuerEinsatz(einsatzId: string): Promise<TaktischesZeichenResponseDto[]> {
  const response = await api.taktischeZeichen().taktischeZeichenControllerFindAllVAlpha({ einsatzId });
  return response.data;
}

export async function apiCreateZeichen(einsatzId: string, dto: CreateTaktischesZeichenDto): Promise<TaktischesZeichenResponseDto> {
  const response = await api.taktischeZeichen().taktischeZeichenControllerCreateVAlpha({
    einsatzId,
    createTaktischesZeichenDto: dto,
  });
  return response.data;
}

export async function apiUpdateZeichen(einsatzId: string, zeichenId: string, dto: UpdateTaktischesZeichenDto): Promise<TaktischesZeichenResponseDto> {
  const response = await api.taktischeZeichen().taktischeZeichenControllerUpdateVAlpha({
    einsatzId,
    zeichenId,
    updateTaktischesZeichenDto: dto,
  });
  return response.data;
}

export async function apiPlaceZeichen(einsatzId: string, zeichenId: string, dto: PlatziereZeichenDto): Promise<TaktischesZeichenResponseDto> {
  const response = await api.taktischeZeichen().taktischeZeichenControllerPlaceOrMoveVAlpha({
    einsatzId,
    zeichenId,
    platziereZeichenDto: dto,
  });
  return response.data;
}

export async function apiRemoveZeichen(einsatzId: string, zeichenId: string): Promise<void> {
  await api.taktischeZeichen().taktischeZeichenControllerRemoveVAlpha({ einsatzId, zeichenId });
}

export async function apiFindKatalogEintraege(einsatzId: string, params?: { kategorie?: string; suche?: string }): Promise<ZeichenKatalogEintragResponseDto[]> {
  const response = await api.taktischeZeichen().taktischeZeichenControllerGetKatalogVAlpha({
    einsatzId,
    kategorie: params?.kategorie,
    suche: params?.suche,
  });
  return response.data;
}
