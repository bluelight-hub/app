import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Radio, RadioGroup } from '@headlessui/react';
import { PiExport, PiSpinner, PiX } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { useExportStatistik, type ExportFormat } from '../../api/use-export-statistik';
import { downloadExport } from '../../lib/download-export';

interface StatistikExportDialogProps {
  einsatzId: string;
  isOpen: boolean;
  onClose: () => void;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'pdf', label: 'PDF', description: 'Zusammenfassung + Details' },
  { value: 'csv', label: 'CSV', description: 'Tabellarische Rohdaten' },
  { value: 'json', label: 'JSON', description: 'Strukturierte Rohdaten' },
];

/**
 * Dialog zur Auswahl des Export-Formats fuer Erinnerungs-Statistiken.
 * Story 9.6: Statistiken nach Einsatz-Ende exportieren.
 */
export function StatistikExportDialog({ einsatzId, isOpen, onClose }: StatistikExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const exportMutation = useExportStatistik();

  const handleClose = () => {
    exportMutation.reset();
    setSelectedFormat('pdf');
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
        <DialogPanel className="mx-auto w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 font-semibold text-lg text-slate-900 dark:text-slate-100">
              <PiExport className="h-5 w-5" />
              Statistik exportieren
            </DialogTitle>
            <button type="button" onClick={handleClose} aria-label="Dialog schliessen" className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
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
                      checked ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700/50',
                    )
                  }
                >
                  {({ checked }) => (
                    <>
                      <div className={cn('flex h-4 w-4 items-center justify-center rounded-full border-2', checked ? 'border-blue-500 bg-blue-500' : 'border-slate-300 dark:border-slate-500')}>
                        {checked && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm dark:text-slate-100">{option.label}</p>
                        <p className="text-slate-500 text-xs dark:text-slate-400">{option.description}</p>
                      </div>
                    </>
                  )}
                </Radio>
              ))}
            </RadioGroup>
          </div>

          {exportMutation.isError && (
            <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400">
              {exportMutation.error?.message || 'Export fehlgeschlagen. Bitte erneut versuchen.'}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="rounded-lg px-4 py-2 text-slate-600 text-sm hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className={cn('inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-sm text-white', 'bg-blue-600 hover:bg-blue-700', 'disabled:cursor-not-allowed disabled:opacity-50')}
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
