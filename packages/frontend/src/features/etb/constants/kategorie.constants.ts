import { EintragDtoKategorieEnum as EtbKategorie } from '@/shared';

/**
 * Farben für verschiedene Kategorien
 */
export const kategorieFarben: Record<EtbKategorie, string> = {
  [EtbKategorie.Alarmierung]: 'bg-status-danger-surface text-status-danger-text',
  [EtbKategorie.Ankunft]: 'bg-status-info-surface text-status-info-text',
  [EtbKategorie.Befehl]: 'bg-action-secondary text-action-primary',
  [EtbKategorie.Erkundung]: 'bg-status-warning-surface text-status-warning-text',
  [EtbKategorie.Lage]: 'bg-status-success-surface text-status-success-text',
  [EtbKategorie.Massnahme]: 'bg-action-secondary text-action-primary',
  [EtbKategorie.Personal]: 'bg-status-info-surface text-status-info-text',
  [EtbKategorie.Fahrzeug]: 'bg-action-secondary text-action-primary',
  [EtbKategorie.Material]: 'bg-status-warning-surface text-status-warning-text',
  [EtbKategorie.Kommunikation]: 'bg-status-info-surface text-status-info-text',
  [EtbKategorie.Wetter]: 'bg-status-warning-surface text-status-warning-text',
  [EtbKategorie.Dokumentation]: 'bg-surface-raised text-text-secondary',
  [EtbKategorie.Sonstiges]: 'bg-surface-raised text-text-secondary',
  [EtbKategorie.System]: 'bg-surface-raised text-text-secondary',
};
