import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import type React from 'react';
import { PiCamera } from 'react-icons/pi';

interface LagekarteToolbarProps {
  /** Callback wenn ETB-Export-Button geklickt wird */
  onEtbExportClick: () => void;
  /** Zeigt Loading-State während Screenshot-Generierung */
  isExportingToEtb?: boolean;
}

/**
 * Lagekarte-Toolbar-Komponente
 *
 * Zeigt zentrale Toolbar-Funktionen für die Lagekarte an:
 * - ETB-Export: Screenshot der Lagekarte ins Einsatztagebuch exportieren
 */
export const LagekarteToolbar: React.FC<LagekarteToolbarProps> = ({ onEtbExportClick, isExportingToEtb = false }) => {
  return (
    <div className={cn('rounded-xl border border-border-subtle/50 bg-surface-panel/90 shadow-xl backdrop-blur-lg', 'p-2', 'flex flex-col gap-2')}>
      <Button
        type="button"
        onClick={onEtbExportClick}
        intent="primary"
        appearance="outline"
        size="md"
        disabled={isExportingToEtb}
        className={cn('gap-2', 'hover:scale-[1.02]', isExportingToEtb && 'cursor-wait opacity-50')}
        aria-label="Lagekarte ins ETB exportieren"
        title="Screenshot der Lagekarte ins Einsatztagebuch exportieren"
      >
        <PiCamera size={20} aria-hidden="true" />
        <span className="hidden md:inline">{isExportingToEtb ? 'Exportiere...' : 'ETB-Export'}</span>
      </Button>
    </div>
  );
};
