import { Badge } from '@/shared/ui/atoms/badge.atom';
import { cn } from '@/shared/ui/cn';
import { EintragDtoKategorieEnum as EtbKategorie } from '@/shared';
import { kategorieLabels } from '../../../types/etb.types';

interface EtbKategorieBadgeProps {
  kategorie: EtbKategorie;
  className?: string;
}

const KATEGORIE_VARIANTS: Record<EtbKategorie, 'default' | 'success' | 'error' | 'warning' | 'info'> = {
  [EtbKategorie.Alarmierung]: 'error',
  [EtbKategorie.Ankunft]: 'info',
  [EtbKategorie.Befehl]: 'info',
  [EtbKategorie.Erkundung]: 'warning',
  [EtbKategorie.Lage]: 'success',
  [EtbKategorie.Massnahme]: 'info',
  [EtbKategorie.Personal]: 'warning',
  [EtbKategorie.Fahrzeug]: 'info',
  [EtbKategorie.Material]: 'default',
  [EtbKategorie.Kommunikation]: 'info',
  [EtbKategorie.Wetter]: 'info',
  [EtbKategorie.Dokumentation]: 'default',
  [EtbKategorie.Sonstiges]: 'default',
  [EtbKategorie.System]: 'warning',
};

/**
 * Badge zur Anzeige der ETB-Kategorie mit farblicher Kennzeichnung
 *
 * Nutzt das Badge-Atom mit kategorie-spezifischen Farben aus kategorie.constants
 *
 * @param kategorie - Die Kategorie des ETB-Eintrags
 * @param className - Zusätzliche CSS-Klassen
 */
export function EtbKategorieBadge({ kategorie, className }: EtbKategorieBadgeProps) {
  return (
    <Badge size="sm" variant={KATEGORIE_VARIANTS[kategorie]} className={cn('rounded-md', className)}>
      {kategorieLabels[kategorie]}
    </Badge>
  );
}
