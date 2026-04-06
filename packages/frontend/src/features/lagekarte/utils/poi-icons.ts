import type { IconType } from 'react-icons';
import {
  PiBriefcaseFill,
  PiCarFill,
  PiCircleFill,
  PiFirstAidFill,
  PiFlagFill,
  PiHouseFill,
  PiMapPinFill,
  PiPackageFill,
  PiProhibitFill,
  PiSquaresFourFill,
  PiUsersFill,
  PiUsersThreeFill,
  PiWarningFill,
} from 'react-icons/pi';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * POI-Type Enum (Legacy - für Abwärtskompatibilität)
 */
export type PoiTypeLegacy =
  | 'EINSATZORT'
  | 'FAHRZEUG'
  | 'EINHEIT'
  | 'GEFAHRENQUELLE'
  | 'SPERRBEREICH'
  | 'VERSORGUNGSPUNKT'
  | 'BEREITSTELLUNGSRAUM'
  | 'BEHANDLUNGSPLATZ'
  | 'SAMMELSTELLE'
  | 'UNTERKUNFT'
  | 'EINSATZABSCHNITT'
  | 'EINSATZLEITUNG'
  | 'SONSTIGES';

/**
 * POI-Kategorie Enum (neue CQRS API - DRK-Standard)
 */
export type PoiCategory = 'EINSATZSTELLE' | 'BEREITSTELLUNGSRAUM' | 'GEFAHRENSTELLE' | 'WASSERENTNAHMESTELLE' | 'SONSTIGES';

/**
 * Kombinierter POI-Type (für Abwärtskompatibilität)
 */
export type PoiType = PoiTypeLegacy | PoiCategory;

/**
 * POI-Icon-Konfiguration
 */
export interface PoiIconConfig {
  Icon: IconType;
  color: string;
  size: number;
}

/**
 * Mapping von POI-Typen zu react-icons (Phosphor Icons)
 */
export const POI_ICON_MAP: Record<PoiType, PoiIconConfig> = {
  EINSATZORT: { Icon: PiMapPinFill, color: '#EF4444', size: 32 },
  EINSATZABSCHNITT: { Icon: PiFlagFill, color: '#F97316', size: 24 },
  EINSATZLEITUNG: { Icon: PiBriefcaseFill, color: '#3B82F6', size: 24 },
  FAHRZEUG: { Icon: PiCarFill, color: '#3B82F6', size: 24 },
  EINHEIT: { Icon: PiUsersFill, color: '#3B82F6', size: 24 },
  GEFAHRENQUELLE: { Icon: PiWarningFill, color: '#EF4444', size: 24 },
  SPERRBEREICH: { Icon: PiProhibitFill, color: '#EF4444', size: 24 },
  VERSORGUNGSPUNKT: { Icon: PiPackageFill, color: '#10B981', size: 24 },
  BEREITSTELLUNGSRAUM: { Icon: PiSquaresFourFill, color: '#3B82F6', size: 24 },
  BEHANDLUNGSPLATZ: { Icon: PiFirstAidFill, color: '#EF4444', size: 24 },
  SAMMELSTELLE: { Icon: PiUsersThreeFill, color: '#A855F7', size: 24 },
  UNTERKUNFT: { Icon: PiHouseFill, color: '#3B82F6', size: 24 },
  SONSTIGES: { Icon: PiCircleFill, color: '#6B7280', size: 24 },
  EINSATZSTELLE: { Icon: PiMapPinFill, color: '#EF4444', size: 32 },
  GEFAHRENSTELLE: { Icon: PiWarningFill, color: '#EF4444', size: 24 },
  WASSERENTNAHMESTELLE: { Icon: PiCircleFill, color: '#0EA5E9', size: 24 },
};

/**
 * Rendert ein POI-Icon als HTML-String für MapLibre Marker
 *
 * @param type - POI-Typ für Icon-Auswahl
 * @returns HTML-String des gerenderten Icons
 */
export const renderPoiIconHtml = (type: PoiType): string => {
  const config = POI_ICON_MAP[type] || POI_ICON_MAP.SONSTIGES;
  const { Icon, color, size } = config;

  const iconElement = Icon({ size, color });
  return renderToStaticMarkup(iconElement);
};

/**
 * Prüft, ob ein POI-Typ valide ist
 */
export const isValidPoiType = (type: string): type is PoiType => {
  return type in POI_ICON_MAP;
};
