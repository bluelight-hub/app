/**
 * Lokale Typen für taktische Zeichen.
 *
 * Diese Typen werden nach der API-Client-Generierung (Task 6)
 * durch die generierten Typen aus `@bluelight-hub/shared/client` ersetzt.
 * Bis dahin dienen sie als Platzhalter, die die gleiche Struktur haben.
 */

export interface ZeichenDefinitionDto {
  grundzeichen: string;
  organisation?: string;
  fachaufgabe?: string;
  einheit?: string;
  verwaltungsstufe?: string;
  symbol?: string;
  text?: string;
}

export interface TaktischesZeichenResponseDto {
  id: string;
  einsatzId: string;
  zeichenDefinition: ZeichenDefinitionDto;
  referenzTyp?: string;
  referenzId?: string;
  lat?: number;
  lng?: number;
  mgrs?: string;
  lagekarteId?: string;
  label?: string;
  notiz?: string;
  istAusKatalog: boolean;
  katalogEintragId?: string;
  istPlatziert: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface ZeichenKatalogEintragResponseDto {
  id: string;
  name: string;
  kategorie: string;
  beschreibung?: string;
  zeichenDefinition: ZeichenDefinitionDto;
  tags: string[];
  sortOrder: number;
  istStandard: boolean;
}

export interface CreateTaktischesZeichenDto {
  zeichenDefinition: ZeichenDefinitionDto;
  referenzTyp?: string;
  referenzId?: string;
  label?: string;
  notiz?: string;
  istAusKatalog?: boolean;
  katalogEintragId?: string;
}

export interface UpdateTaktischesZeichenDto {
  zeichenDefinition?: ZeichenDefinitionDto;
  label?: string;
  notiz?: string;
}

export interface PlatziereZeichenDto {
  lagekarteId: string;
  lat: number;
  lng: number;
  mgrs?: string;
}
