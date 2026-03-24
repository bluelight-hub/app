import { useState, useCallback } from 'react';
import { PiTable, PiFileText, PiExport } from 'react-icons/pi';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { cn } from '@/shared/ui/cn';
import { useExportBefehle } from '../../api/use-export-befehle';

type ExportFormat = 'csv' | 'json';

interface FormatOption {
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: 'csv',
    label: 'CSV',
    description: 'Für Excel, Tabellenkalkulation und einfache Auswertung',
    icon: PiTable,
  },
  {
    value: 'json',
    label: 'JSON',
    description: 'Strukturierte Daten für technische Weiterverarbeitung',
    icon: PiFileText,
  },
];

interface BefehlExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  einsatzId: string;
}

/**
 * Dialog zum Export von Befehlen als CSV oder JSON.
 *
 * Bietet eine Format-Auswahl mit Beschreibung und loest
 * den Download ueber den useExportBefehle Hook aus.
 */
export function BefehlExportDialog({ isOpen, onClose, einsatzId }: BefehlExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const { exportBefehle, isExporting } = useExportBefehle();

  const handleExport = async () => {
    try {
      await exportBefehle(einsatzId, selectedFormat);
      setSelectedFormat('csv');
      onClose();
    } catch {
      // Error-Toast wird bereits im Hook angezeigt
    }
  };

  const handleClose = useCallback(() => {
    if (!isExporting) {
      setSelectedFormat('csv');
      onClose();
    }
  }, [isExporting, onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="sm">
      <Dialog.Title>
        <div className="flex items-center gap-2">
          <PiExport className="h-5 w-5 text-text-muted" aria-hidden="true" />
          <span>Befehle exportieren</span>
        </div>
      </Dialog.Title>

      <Dialog.Body>
        <p className="mb-4 text-text-secondary text-sm">Wählen Sie das gewünschte Exportformat:</p>

        <div className="space-y-2" role="radiogroup" aria-label="Exportformat wählen">
          {FORMAT_OPTIONS.map((option) => {
            const isSelected = selectedFormat === option.value;
            const Icon = option.icon;

            return (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                  isSelected ? 'border-action-primary bg-action-secondary' : 'border-border-subtle bg-surface-panel hover:border-border-strong hover:bg-action-secondary',
                  isExporting && 'pointer-events-none opacity-50',
                )}
              >
                <input
                  type="radio"
                  name="export-format"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => setSelectedFormat(option.value)}
                  disabled={isExporting}
                  className="mt-1 h-4 w-4 border-border-subtle text-action-primary focus-visible:shadow-focus-ring"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', isSelected ? 'text-action-primary' : 'text-text-muted')} />
                    <span className={cn('font-medium text-sm', isSelected ? 'text-action-primary' : 'text-text-primary')}>{option.label}</span>
                  </div>
                  <p className="mt-0.5 text-text-muted text-xs">{option.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </Dialog.Body>

      <Dialog.Footer loading={isExporting}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isExporting}>
          Abbrechen
        </Button>
        <Button intent="primary" loading={isExporting} onClick={handleExport}>
          Exportieren
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
