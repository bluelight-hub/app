import { useState, useCallback } from 'react';
import { PiTable, PiFileText, PiExport } from 'react-icons/pi';
import { Button } from '@/shared/ui/atoms/button.atom';
import { RadioGroup } from '@/shared/ui/atoms/radio-group.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
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
        <p className="mb-4 text-sm text-text-secondary">Wählen Sie das gewünschte Exportformat:</p>

        <RadioGroup
          variant="card"
          value={selectedFormat}
          onChange={setSelectedFormat}
          disabled={isExporting}
          aria-label="Exportformat wählen"
          options={FORMAT_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            description: option.description,
            icon: <option.icon className="h-4 w-4" />,
          }))}
        />
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
