/**
 * Hilfsfunktionen zur Textuellen Darstellung der KanalDetails-Union.
 */

import type { FunkkanalResponseDto } from '@bluelight-hub/shared/client';

type KanalDetails = FunkkanalResponseDto['details'];

/**
 * Liefert ein kurzes, konsistentes Label für den Kanaltyp (TMO/DMO/Analog).
 */
export function getKanalTypLabel(details: KanalDetails): string {
  switch (details.type) {
    case 'tmo':
      return 'TMO';
    case 'dmo':
      return 'DMO';
    case 'analog':
      return `Analog ${details.band}`;
  }
}

/**
 * Formatiert die spezifische Kennung (Sprechgruppe / DMO-Kanal / Frequenz) eines
 * Kanals — z. B. für die Kanalplan-Tabelle oder den FunkKontextBadge.
 */
export function formatKanalKennung(details: KanalDetails): string {
  switch (details.type) {
    case 'tmo':
      return details.gssi ? `${details.sprechgruppe} · GSSI ${details.gssi}` : details.sprechgruppe;
    case 'dmo':
      return details.repeater ? `${details.dmoKanal} (Repeater ${details.repeater})` : details.dmoKanal;
    case 'analog':
      return details.kanalnummer ? `${details.frequenz} MHz / K${details.kanalnummer}` : `${details.frequenz} MHz`;
  }
}
