import { Fragment, useMemo } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { PiMagicWand, PiCheck, PiCaretUpDown } from 'react-icons/pi';
import type { QualifikationMappingItemDto } from '@bluelight-hub/shared/client';
import { useAdminQualifikationenManagement } from '@/features/admin/api';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { cn } from '@/shared/ui/cn';

interface QualifikationMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mappings: QualifikationMappingItemDto[] | undefined;
  isLoading: boolean;
  onSaveMapping: (mappingId: string, qualifikationId: string | null) => void;
  isSaving: boolean;
  onAutoMatch: () => void;
  isAutoMatching: boolean;
}

/**
 * Dialog zur Verwaltung von HiOrg-Qualifikation-Mappings.
 *
 * Ermoeglicht das Zuordnen von externen HiOrg-Qualifikationsnamen
 * zu internen Bluelight-Qualifikationen.
 */
export function QualifikationMappingDialog({ isOpen, onClose, mappings, isLoading, onSaveMapping, isSaving, onAutoMatch, isAutoMatching }: QualifikationMappingDialogProps) {
  // Lade alle aktiven Qualifikationen fuer die Auswahl
  const { qualifikationen, isLoading: isLoadingQualifikationen } = useAdminQualifikationenManagement({ istAktiv: true });

  // Berechne Statistiken
  const stats = useMemo(() => {
    if (!mappings) return { mapped: 0, unmapped: 0, total: 0 };

    const mapped = mappings.filter((m) => m.qualifikationId != null).length;
    const total = mappings.length;

    return { mapped, unmapped: total - mapped, total };
  }, [mappings]);

  const handleClose = () => {
    if (!isSaving && !isAutoMatching) {
      onClose();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="xl">
      <div className="relative">
        <Dialog.CloseButton onClose={handleClose} />
        <Dialog.Title>Qualifikation-Zuordnungen</Dialog.Title>

        <Dialog.Body className="max-h-[60vh] overflow-y-auto">
          {/* Header mit Stats und Auto-Match Button */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Text size="sm" color="muted" as="span">
                {stats.mapped} zugeordnet, {stats.unmapped} nicht zugeordnet
              </Text>
            </div>
            <Button intent="primary" appearance="outline" size="sm" onClick={onAutoMatch} loading={isAutoMatching} disabled={isAutoMatching || isSaving}>
              <PiMagicWand className="mr-2 h-4 w-4" />
              Auto-Match
            </Button>
          </div>

          {/* Loading State */}
          {(isLoading || isLoadingQualifikationen) && (
            <div className="py-8 text-center">
              <Text color="muted">Lade Daten...</Text>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isLoadingQualifikationen && (!mappings || mappings.length === 0) && (
            <div className="py-8 text-center">
              <Text color="muted">Keine HiOrg-Qualifikationen gefunden.</Text>
              <Text size="sm" color="muted" className="mt-2">
                Laden Sie zuerst Personen aus HiOrg-Server, um Qualifikationen zu importieren.
              </Text>
            </div>
          )}

          {/* Mapping Table */}
          {!isLoading && !isLoadingQualifikationen && mappings && mappings.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                      HiOrg-Name
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                      Zugeordnet zu
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {mappings.map((mapping) => (
                    <MappingRow key={mapping.id} mapping={mapping} qualifikationen={qualifikationen || []} onSaveMapping={onSaveMapping} isSaving={isSaving} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Dialog.Body>

        <Dialog.Footer>
          <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isSaving || isAutoMatching}>
            Schliessen
          </Button>
        </Dialog.Footer>
      </div>
    </Dialog>
  );
}

// --- Private Components ---

interface MappingRowProps {
  mapping: QualifikationMappingItemDto;
  qualifikationen: Array<{ id: string; name: string; abkuerzung: string }>;
  onSaveMapping: (mappingId: string, qualifikationId: string | null) => void;
  isSaving: boolean;
}

/**
 * Einzelne Zeile in der Mapping-Tabelle.
 */
function MappingRow({ mapping, qualifikationen, onSaveMapping, isSaving }: MappingRowProps) {
  // qualifikationId ist als `object` typisiert, wir casten zu string | null
  const currentQualifikationId = mapping.qualifikationId as string | null;
  const confidence = mapping.confidence as number | null;

  const handleChange = (qualifikationId: string | null) => {
    onSaveMapping(mapping.id, qualifikationId);
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      {/* HiOrg Name */}
      <td className="whitespace-nowrap px-4 py-3">
        <Text size="sm" as="span">
          {mapping.externalName}
        </Text>
      </td>

      {/* Qualifikation Auswahl */}
      <td className="px-4 py-3">
        <QualifikationListbox value={currentQualifikationId} qualifikationen={qualifikationen} onChange={handleChange} disabled={isSaving} />
      </td>

      {/* Confidence Badge */}
      <td className="whitespace-nowrap px-4 py-3">
        {mapping.isAutoMatched && confidence != null && <ConfidenceBadge confidence={confidence} />}
        {!mapping.isAutoMatched && currentQualifikationId && (
          <Badge variant="default" size="sm">
            Manuell
          </Badge>
        )}
      </td>
    </tr>
  );
}

interface QualifikationListboxProps {
  value: string | null;
  qualifikationen: Array<{ id: string; name: string; abkuerzung: string }>;
  onChange: (qualifikationId: string | null) => void;
  disabled?: boolean;
}

/**
 * Listbox zur Auswahl einer Qualifikation.
 */
function QualifikationListbox({ value, qualifikationen, onChange, disabled = false }: QualifikationListboxProps) {
  const selectedQualifikation = value ? qualifikationen.find((q) => q.id === value) : null;

  const buttonLabel = selectedQualifikation ? `${selectedQualifikation.abkuerzung} - ${selectedQualifikation.name}` : 'Nicht zugeordnet';

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className="relative">
        <Listbox.Button
          className={cn(
            'relative w-full cursor-pointer rounded-lg py-2 pr-10 pl-3 text-left shadow-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm',
            selectedQualifikation
              ? 'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:ring-blue-800'
              : 'bg-gray-50 text-gray-500 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <span className="block truncate">{buttonLabel}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <PiCaretUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>

        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm dark:bg-gray-800 dark:ring-gray-700">
            {/* Option: Nicht zugeordnet */}
            <Listbox.Option
              value={null}
              className={({ active }) => cn('relative cursor-pointer select-none py-2 pr-4 pl-10', active ? 'bg-gray-100 dark:bg-gray-700' : '', 'text-gray-500 dark:text-gray-400')}
            >
              {({ selected }) => (
                <>
                  <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>Nicht zugeordnet</span>
                  {selected && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600 dark:text-primary-400">
                      <PiCheck className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </>
              )}
            </Listbox.Option>

            {/* Qualifikation-Optionen */}
            {qualifikationen.map((qualifikation) => (
              <Listbox.Option
                key={qualifikation.id}
                value={qualifikation.id}
                className={({ active }) => cn('relative cursor-pointer select-none py-2 pr-4 pl-10', active ? 'bg-blue-50 dark:bg-blue-900/20' : '')}
              >
                {({ selected }) => (
                  <>
                    <span className={cn('block truncate text-gray-900 dark:text-gray-100', selected ? 'font-medium' : 'font-normal')}>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{qualifikation.abkuerzung}</span>
                      {' - '}
                      {qualifikation.name}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400">
                        <PiCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

interface ConfidenceBadgeProps {
  confidence: number;
}

/**
 * Badge zur Anzeige des Konfidenz-Scores.
 */
function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  // Bestimme Variante basierend auf Score
  let variant: 'success' | 'warning' | 'error' = 'success';
  if (confidence < 50) {
    variant = 'error';
  } else if (confidence < 80) {
    variant = 'warning';
  }

  return (
    <Badge variant={variant} size="sm">
      Auto ({confidence}%)
    </Badge>
  );
}
