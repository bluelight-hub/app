/**
 * Typen für das Layer-Detail-Provider-System
 *
 * Provider liefern Feature-Informationen beim Klick auf die Karte.
 * Jeder Layer-Typ (DWD, POI, etc.) implementiert einen eigenen Provider.
 */

import type { ReactNode } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

/**
 * Ergebnis einer Feature-Abfrage beim Klick auf die Karte
 */
export interface LayerFeatureInfo {
  /** Provider-ID (z.B. 'dwd') */
  providerId: string;
  /** Titel für den Popup-Header */
  title: string;
  /** Rohdaten vom Layer (Provider-spezifisch) */
  data: unknown;
  /** Klick-Koordinaten für Popup-Positionierung */
  coordinate: { lng: number; lat: number };
}

/**
 * Ein Provider der Detail-Infos für einen bestimmten Layer-Typ liefert
 *
 * Jeder Layer (DWD-Warnungen, POIs, Gefahrenzonen, etc.) registriert
 * einen Provider, der beim Karten-Klick abgefragt wird.
 */
export interface LayerDetailProvider {
  /** Eindeutige ID des Providers */
  id: string;
  /** Ist dieser Provider aktuell aktiv? (z.B. nur wenn Layer sichtbar) */
  isActive(): boolean;
  /** Versucht Feature-Info an der Koordinate abzufragen. null = kein Treffer */
  queryFeature(lng: number, lat: number, map: MapRef): Promise<LayerFeatureInfo | null>;
  /** Kompakte Popup-Ansicht (direkt auf der Karte) */
  renderPopup(info: LayerFeatureInfo): ReactNode;
  /** Volle Detail-Ansicht (im Side-Panel) */
  renderPanel(info: LayerFeatureInfo): ReactNode;
}
