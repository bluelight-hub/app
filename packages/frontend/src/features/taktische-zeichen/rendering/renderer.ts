import type {
  EinheitId,
  FachaufgabeId,
  GrundzeichenId,
  OrganisationId,
  SymbolId,
  VerwaltungsstufeId,
} from 'taktische-zeichen-core';

/**
 * Definition eines taktischen Zeichens für die Darstellung.
 * Alle Felder außer `grundzeichen` sind optional.
 */
export interface ZeichenDefinition {
  grundzeichen?: GrundzeichenId;
  organisation?: OrganisationId;
  fachaufgabe?: FachaufgabeId;
  einheit?: EinheitId;
  verwaltungsstufe?: VerwaltungsstufeId;
  symbol?: SymbolId;
  text?: string;
}

/**
 * Renderer-Schnittstelle für taktische Zeichen.
 * Ermöglicht den Austausch der zugrundeliegenden Rendering-Bibliothek.
 */
export interface TaktischesZeichenRenderer {
  /** Gibt das taktische Zeichen als SVG-String zurück. */
  renderSvg(definition: ZeichenDefinition): string;
  /** Gibt das taktische Zeichen als Data-URL zurück (für img-Tags und MapLibre). */
  renderDataUrl(definition: ZeichenDefinition): string;
  /** Gibt die natürliche Größe [Breite, Höhe] des Zeichens in Pixeln zurück. */
  getSize(definition: ZeichenDefinition): [number, number];
}
