import { useId } from 'react';
import { PiSpeakerHigh, PiSpeakerSlash } from 'react-icons/pi';
import { Switch } from '@/shared/ui/atoms/switch.atom';
import { cn } from '@/shared/ui/cn';

/**
 * Props für AudioToggle Komponente
 */
export interface AudioToggleProps {
  /** Ob Audio aktiviert ist */
  enabled: boolean;
  /** Callback wenn Zustand geändert wird */
  onChange: (enabled: boolean) => void;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

/**
 * AudioToggle - Globaler Audio-Aktivierungsschalter
 *
 * Ermöglicht das Ein-/Ausschalten aller Alarm-Töne.
 * Bei Deaktivierung erscheinen weiterhin visuelle Benachrichtigungen.
 *
 * **Story 2.7 AC7:** Globale Stummschaltung
 */
export function AudioToggle({ enabled, onChange, className }: AudioToggleProps) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div className={cn('flex items-center justify-between rounded-panel border border-border-subtle bg-surface-panel p-4', className)}>
      <div className="flex items-center gap-3">
        {enabled ? <PiSpeakerHigh className="h-6 w-6 text-status-success-text" aria-hidden="true" /> : <PiSpeakerSlash className="h-6 w-6 text-text-muted" aria-hidden="true" />}
        <div>
          <span id={labelId} className="block font-medium text-text-primary">
            Alarm-Töne aktivieren
          </span>
          <span id={descriptionId} className="text-text-secondary text-sm">
            {enabled ? 'Töne werden bei Erinnerungen abgespielt' : 'Nur visuelle Benachrichtigungen'}
          </span>
        </div>
      </div>

      <Switch checked={enabled} onChange={onChange} labelledBy={labelId} description={descriptionId} />
    </div>
  );
}
