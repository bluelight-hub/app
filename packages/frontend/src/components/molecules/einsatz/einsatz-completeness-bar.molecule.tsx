import type { ProgressBarVariant } from '@/components/atoms/progress-bar.atom';
import { ProgressBar } from '@/components/atoms/progress-bar.atom';
import type { EinsatzResponseDto } from '@bluelight-hub/shared/client';
import { useMemo } from 'react';

type EinsatzFields = 'alarmstichwort' | 'alarmierungszeit' | 'einsatzort' | 'einsatzleiter';

interface EinsatzCompletenessBarProps {
  einsatz: Pick<EinsatzResponseDto, EinsatzFields | 'id'>;
  requiredFields?: EinsatzFields[];
  showTooltip?: boolean;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * EinsatzCompletenessBar-Komponente für Vollständigkeitsanzeige
 *
 * Berechnet und zeigt die Vollständigkeit eines Einsatzes basierend auf erforderlichen Feldern.
 */
export function EinsatzCompletenessBar({
  einsatz,
  requiredFields = ['alarmstichwort', 'alarmierungszeit', 'einsatzort', 'einsatzleiter'],
  showTooltip = true,
  showPercentage = true,
  size = 'md',
  className,
}: EinsatzCompletenessBarProps) {
  const { completeness, missingFields } = useMemo(() => {
    const missing: string[] = [];
    let filledCount = 0;

    requiredFields.forEach((field) => {
      const value = einsatz[field as keyof typeof einsatz];
      const isFilled = value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0);

      if (isFilled) {
        filledCount++;
      } else {
        missing.push(fieldToLabel(field));
      }
    });

    return {
      completeness: requiredFields.length > 0 ? Math.round((filledCount / requiredFields.length) * 100) : 100,
      missingFields: missing,
    };
  }, [einsatz, requiredFields]);

  const getVariant = (): ProgressBarVariant => {
    if (completeness === 100) return 'success';
    if (completeness >= 75) return 'info';
    if (completeness >= 50) return 'warning';
    return 'error';
  };

  const label = showTooltip && missingFields.length > 0 ? `Vollständigkeit (Fehlend: ${missingFields.join(', ')})` : 'Vollständigkeit';

  return (
    <div className={className}>
      <ProgressBar value={completeness} max={100} variant={getVariant()} size={size} label={label} showPercentage={showPercentage} animated />
      {showTooltip && missingFields.length > 0 && (
        <div className="mt-1 text-gray-600 text-xs dark:text-gray-400">
          <span className="font-medium">Fehlende Felder:</span> {missingFields.join(', ')}
        </div>
      )}
    </div>
  );
}

function fieldToLabel(field: string): string {
  const labels: Record<string, string> = {
    alarmstichwort: 'Alarmstichwort',
    alarmierungszeit: 'Alarmierungszeit',
    einsatzort: 'Einsatzort',
    einsatzleiter: 'Einsatzleiter',
    fahrzeuge: 'Fahrzeuge',
    mannschaft: 'Mannschaft',
    bemerkungen: 'Bemerkungen',
  };
  return labels[field] || field;
}
