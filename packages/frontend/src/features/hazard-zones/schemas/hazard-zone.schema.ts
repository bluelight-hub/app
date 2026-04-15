import type { WarnstufeValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';

export const HAZARD_ZONE_GEOMETRY_TYPES = ['POLYGON', 'CIRCLE'] as const;
export type HazardZoneGeometryType = (typeof HAZARD_ZONE_GEOMETRY_TYPES)[number];

/**
 * Farbcodierung der Gefahrenzonen-Darstellung pro Warnstufe (Issue #627, AC3).
 *
 * Wird für Fill + Stroke Farben der Map-Layer genutzt. Die Farben spiegeln die
 * Design-Tokens des WarnstufeBadge wider (grün/gelb/orange/rot), damit die
 * Legende einheitlich bleibt.
 */
export const WARNSTUFE_MAP_COLORS: Record<WarnstufeValue, { fill: string; stroke: string; fillOpacity: number; strokeOpacity: number }> = {
  KEINE: { fill: '#9ca3af', stroke: '#6b7280', fillOpacity: 0.15, strokeOpacity: 0.6 },
  NIEDRIG: { fill: '#22c55e', stroke: '#15803d', fillOpacity: 0.2, strokeOpacity: 0.8 },
  MITTEL: { fill: '#eab308', stroke: '#a16207', fillOpacity: 0.25, strokeOpacity: 0.85 },
  HOCH: { fill: '#f97316', stroke: '#c2410c', fillOpacity: 0.3, strokeOpacity: 0.9 },
  AKUT: { fill: '#ef4444', stroke: '#991b1b', fillOpacity: 0.35, strokeOpacity: 1 },
};

/**
 * Gibt die Kartendarstellungs-Farbe für eine Warnstufe zurück.
 */
export function getWarnstufeColor(warnstufe: string): {
  fill: string;
  stroke: string;
  fillOpacity: number;
  strokeOpacity: number;
} {
  return WARNSTUFE_MAP_COLORS[(warnstufe as WarnstufeValue) ?? 'KEINE'] ?? WARNSTUFE_MAP_COLORS.KEINE;
}
