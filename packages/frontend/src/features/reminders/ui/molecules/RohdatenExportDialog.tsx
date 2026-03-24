import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Radio, RadioGroup } from '@headlessui/react';
import { PiExport, PiSpinner, PiX } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { useExportRohdaten, type RohdatenExportFormat } from '../../api/use-export-rohdaten';
import { downloadExport } from '../../lib/download-export';

interface RohdatenExportDialogProps {
  einsatzId: string;
  isOpen: boolean;
  onClose: () => void;
}

const FORMAT_OPTIONS: { value: RohdatenExportFormat; label: string; description: string }[] = [
  { value: 'csv', label: 'CSV', description: 'Excel-kompatible Tabelle (UTF-8, Semikolon)' },
  { value: 'json', label: 'JSON', description: 'Strukturierte Daten fuer externe Tools' },
];

/**
 * Dialog zur Auswahl des Export-Formats fuer Erinnerungs-Rohdaten.
 * Story 9.10: Export der Rohdaten (CSV/JSON).
 */
export function RohdatenExportDialog({ einsatzId, isOpen, onClose }: RohdatenExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<RohdatenExportFormat>('csv');
  const exportMutation = useExportRohdaten();

  const handleClose = () => {
    exportMutation.reset();
    setSelectedFormat('csv');
    onClose();
  };

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({ einsatzId, format: selectedFormat });
      await downloadExport(result.blob, result.filename);
      handleClose();
    } catch {
      // Fehlerzustand wird durch mutation.isError abgebildet
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto w-full max-w-md rounded-panel bg-surface-panel p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 font-semibold text-lg text-text-primary">
              <PiExport className="h-5 w-5" />
              Rohdaten exportieren
            </DialogTitle>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Dialog schliessen"
              className="rounded-lg p-1 text-text-muted hover:text-text-secondary focus:outline-none focus-visible:shadow-focus-ring"
            >
              <PiX className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4">
            <RadioGroup value={selectedFormat} onChange={setSelectedFormat} className="space-y-2">
              {FORMAT_OPTIONS.map((option) => (
                <Radio
                  key={option.value}
                  as="div"
                  value={option.value}
                  className={({ checked }) =>
                    cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                      checked ? 'border-action-primary bg-action-secondary' : 'border-border-subtle hover:bg-action-secondary',
                    )
                  }
                >
                  {({ checked }) => (
                    <>
                      <div className={cn('flex h-4 w-4 items-center justify-center rounded-full border-2', checked ? 'border-action-primary bg-action-primary' : 'border-border-subtle')}>
                        {checked && <div className="h-1.5 w-1.5 rounded-full bg-text-inverse" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-text-primary">{option.label}</p>
                        <p className="text-text-muted text-xs">{option.description}</p>
                      </div>
                    </>
                  )}
                </Radio>
              ))}
            </RadioGroup>
          </div>

          {exportMutation.isError && (
            <div role="alert" className="mt-3 rounded-lg bg-status-danger-surface p-3 text-sm text-status-danger-text">
              {exportMutation.error?.message || 'Export fehlgeschlagen. Bitte erneut versuchen.'}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="rounded-lg px-4 py-2 text-sm text-text-secondary hover:bg-action-secondary focus:outline-none focus-visible:shadow-focus-ring">
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-sm text-text-inverse',
                'bg-action-primary hover:bg-action-primary-hover',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {exportMutation.isPending ? (
                <>
                  <PiSpinner className="h-4 w-4 animate-spin" />
                  Exportiere...
                </>
              ) : (
                <>
                  <PiExport className="h-4 w-4" />
                  Exportieren
                </>
              )}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
