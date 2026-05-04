/**
 * Formatierungs-Helper für `ConflictResolutionList` (Story 3.10 AC8).
 *
 * - `formatLocalPayloadPreview` baut eine kompakte, human-readable Vorschau
 *   aus dem `localPayload` (Verlierer-State eines Sync-Konflikts).
 * - `formatRelativeTimeDe` kapselt `date-fns/formatDistanceToNow` mit
 *   deutscher Locale und Suffix.
 * - `formatEntityTypeLabel` liefert das de-i18n-Label für den Entity-Type.
 */

import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import type { SyncConflictListItemDto } from '@bluelight-hub/shared/client';

const ENTITY_TYPE_LABELS: Record<SyncConflictListItemDto['entityType'], string> = {
  PSA_PROFIL_ZUWEISUNG: 'PSA-Profil',
  GEFAEHRDUNGSBEURTEILUNG_ITEM: 'Gefährdungsbeurteilung',
};

/**
 * Liefert den de-i18n-Anzeigetext für einen `entityType` (Story 3.10 AC8 §Spaltenmodell).
 */
export function formatEntityTypeLabel(entityType: SyncConflictListItemDto['entityType']): string {
  return ENTITY_TYPE_LABELS[entityType] ?? entityType;
}

/**
 * Formatiert eine relative Zeitangabe in deutscher Locale (z. B. "vor 5 Minuten").
 *
 * Akzeptiert sowohl `Date` als auch ISO-Strings — der generierte Client
 * liefert für `reportedAt` einen `Date` (`SyncConflictListItemDto.reportedAt`),
 * aber Tests/Storybook-Fixtures übergeben oft Strings.
 */
export function formatRelativeTimeDe(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return formatDistanceToNow(date, { locale: de, addSuffix: true });
}

interface ToggleEntry {
  code: string;
  active: boolean;
}

/**
 * Heuristik-basierte Lokal-Snapshot-Vorschau für die Konflikt-Tabelle (UX-DR6).
 *
 * Erkennt strukturierte Toggle-Sets (z. B. `{ toggles: [{ code: 'BASIS', active: true }, ...] }`),
 * die das PSA-Profil-Format dominieren, und rendert sie als kompakte Liste:
 * `BASIS+, CBRN-`. Fällt sonst auf eine getrimmte JSON-Vorschau zurück.
 */
export function formatLocalPayloadPreview(payload: unknown, maxLength = 80): string {
  if (payload == null) return '–';

  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>;
    const toggles = record['toggles'];
    if (Array.isArray(toggles) && toggles.length > 0 && isToggleEntryArray(toggles)) {
      const formatted = toggles
        .slice(0, 6)
        .map((t) => `${t.code}${t.active ? '+' : '−'}`)
        .join(', ');
      const suffix = toggles.length > 6 ? `, +${toggles.length - 6}` : '';
      return `${formatted}${suffix}`;
    }
  }

  try {
    const json = JSON.stringify(payload);
    if (!json) return '–';
    return json.length > maxLength ? `${json.slice(0, maxLength - 1)}…` : json;
  } catch {
    return '–';
  }
}

/**
 * Liefert eine vollständige, eingerückte JSON-Repräsentation für das
 * Lokal-Snapshot-Popover (`<details>`-Inhalt, UX-DR6).
 */
export function formatLocalPayloadFull(payload: unknown): string {
  if (payload == null) return '–';
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

function isToggleEntryArray(value: unknown[]): value is ToggleEntry[] {
  return value.every((entry) => {
    if (entry === null || typeof entry !== 'object') return false;
    const e = entry as Record<string, unknown>;
    return typeof e.code === 'string' && typeof e.active === 'boolean';
  });
}
