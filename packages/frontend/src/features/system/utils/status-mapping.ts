import type { IndicatorStatus } from '@/shared/ui/molecules/logo-with-indicator.molecule';
import type { ConnectionMode } from '../api/use-system-health';

/**
 * Status-Labels für nicht-technische User
 *
 * Actionable Messaging statt technischer Begriffe
 */
export const STATUS_LABELS: Record<IndicatorStatus, string> = {
  online: 'System online',
  offline: 'Eingeschränkter Modus',
  error: 'Keine Verbindung zum Server',
  checking: 'Verbindung wird geprüft...',
};

/**
 * Status-Farben für Dot-Indikatoren
 *
 * Wird für AuthFooter Badges und andere Status-Anzeigen verwendet.
 */
export const STATUS_DOT_COLORS = {
  online: 'green',
  offline: 'yellow',
  error: 'red',
  checking: 'gray',
} as const;

/**
 * Tooltip-Texte mit Handlungsempfehlungen
 */
export const STATUS_TOOLTIPS: Record<IndicatorStatus, string> = {
  online: 'Alle Systeme arbeiten normal',
  offline: 'Internet nicht verfügbar - lokaler Betrieb möglich',
  error: 'Server nicht erreichbar - bitte App neu starten',
  checking: 'Verbindungsstatus wird ermittelt',
};

/**
 * Ermittelt den Status basierend auf Query-State und ConnectionMode
 *
 * @param isLoading - Query lädt noch
 * @param isError - Query hat Fehler
 * @param connectionMode - Backend ConnectionMode
 * @returns UI IndicatorStatus
 */
export function getIndicatorStatus(isLoading: boolean, isError: boolean, connectionMode: ConnectionMode): IndicatorStatus {
  if (isLoading) return 'checking';
  if (isError) return 'error';
  return connectionMode;
}
