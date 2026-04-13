import { erzeugeTaktischesZeichen } from 'taktische-zeichen-core';

import type { TaktischesZeichenRenderer, ZeichenDefinition } from './renderer';

/**
 * Renderer-Implementierung auf Basis der `phjardas/taktische-zeichen`-Bibliothek.
 * Erzeugt DV 102-konforme taktische Zeichen als SVG.
 */
export class PhjardasRenderer implements TaktischesZeichenRenderer {
  /**
   * Rendert ein taktisches Zeichen als SVG-String.
   */
  renderSvg(definition: ZeichenDefinition): string {
    const zeichen = erzeugeTaktischesZeichen({
      grundzeichen: definition.grundzeichen,
      organisation: definition.organisation,
      fachaufgabe: definition.fachaufgabe,
      einheit: definition.einheit,
      verwaltungsstufe: definition.verwaltungsstufe,
      symbol: definition.symbol,
      text: definition.text,
    });
    return zeichen.toString();
  }

  /**
   * Rendert ein taktisches Zeichen als Data-URL (base64-kodiertes SVG).
   * Wird für img-Tags und MapLibre-Image-Registrierung benötigt.
   */
  renderDataUrl(definition: ZeichenDefinition): string {
    const zeichen = erzeugeTaktischesZeichen({
      grundzeichen: definition.grundzeichen,
      organisation: definition.organisation,
      fachaufgabe: definition.fachaufgabe,
      einheit: definition.einheit,
      verwaltungsstufe: definition.verwaltungsstufe,
      symbol: definition.symbol,
      text: definition.text,
    });
    return zeichen.dataUrl;
  }

  /**
   * Gibt die natürliche Größe [Breite, Höhe] des Zeichens zurück.
   */
  getSize(definition: ZeichenDefinition): [number, number] {
    const zeichen = erzeugeTaktischesZeichen({
      grundzeichen: definition.grundzeichen,
      organisation: definition.organisation,
      fachaufgabe: definition.fachaufgabe,
      einheit: definition.einheit,
      verwaltungsstufe: definition.verwaltungsstufe,
      symbol: definition.symbol,
      text: definition.text,
    });
    return zeichen.size;
  }
}

/** Standard-Renderer-Instanz (Singleton). */
export const renderer = new PhjardasRenderer();
