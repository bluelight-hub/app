import { Listbox } from '@headlessui/react';
import { useMemo } from 'react';
import { PiMagicWand, PiCheck, PiCaretUpDown } from 'react-icons/pi';

import { useAdminQualifikationenManagement } from '@/features/admin/api';
import type { QualifikationMappingItemDto } from '@/shared';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { cn } from '@/shared/ui/cn';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

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
  const { qualifikationen, isLoading: isLoadingQualifikationen } = useAdminQualifikationenManagement({ istAktiv: true });

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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <Text size="sm" color="muted" as="span">
              {stats.mapped} zugeordnet, {stats.unmapped} nicht zugeordnet
            </Text>
            <Button intent="primary" appearance="outline" size="sm" onClick={onAutoMatch} loading={isAutoMatching} disabled={isAutoMatching || isSaving}>
              <PiMagicWand className="mr-2 h-4 w-4" />
              Auto-Match
            </Button>
          </div>

          {(isLoading || isLoadingQualifikationen) && (
            <div className="py-8 text-center">
              <Text color="muted">Lade Daten...</Text>
            </div>
          )}

          {!isLoading && !isLoadingQualifikationen && (!mappings || mappings.length === 0) && (
            <div className="py-8 text-center">
              <Text color="muted">Keine HiOrg-Qualifikationen gefunden.</Text>
              <Text size="sm" color="muted" className="mt-2">
                Laden Sie zuerst Personen aus HiOrg-Server, um Qualifikationen zu importieren.
              </Text>
            </div>
          )}

          {!isLoading && !isLoadingQualifikationen && mappings && mappings.length > 0 && (
            <div className="overflow-hidden rounded-panel border border-border-subtle">
              <table className="min-w-full divide-y divide-border-subtle">
                <thead className="bg-surface-raised">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-text-muted text-xs uppercase tracking-wider">
                      HiOrg-Name
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-text-muted text-xs uppercase tracking-wider">
                      Zugeordnet zu
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-text-muted text-xs uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface-panel">
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
  const currentQualifikationId = mapping.qualifikationId as string | null;
  const confidence = mapping.confidence as number | null;

  const handleChange = (qualifikationId: string | null) => {
    onSaveMapping(mapping.id, qualifikationId);
  };

  return (
    <tr className="hover:bg-surface-raised">
      <td className="whitespace-nowrap px-4 py-3">
        <Text size="sm" as="span">
          {mapping.externalName}
        </Text>
      </td>
      <td className="px-4 py-3">
        <QualifikationListbox value={currentQualifikationId} qualifikationen={qualifikationen} onChange={handleChange} disabled={isSaving} />
      </td>
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
    <Listbox as="div" value={value} onChange={onChange} disabled={disabled}>
      <Listbox.Button
        className={cn(
          'relative w-full cursor-pointer rounded-control py-2 pr-10 pl-3 text-left shadow-sm ring-1 ring-inset focus:outline-none focus-visible:shadow-focus-ring sm:text-sm',
          selectedQualifikation ? 'bg-status-info-surface text-status-info-text ring-status-info-border' : 'bg-surface-raised text-text-muted ring-border-subtle',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="block truncate">{buttonLabel}</span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <PiCaretUpDown className="h-5 w-5 text-text-muted" aria-hidden="true" />
        </span>
      </Listbox.Button>

      <Listbox.Options
        anchor="bottom start"
        className="z-[100] mt-1 max-h-60 w-[var(--button-width)] overflow-auto rounded-control bg-surface-panel py-1 text-base shadow-lg ring-1 ring-border-subtle [--anchor-gap:4px] focus:outline-none sm:text-sm"
      >
        <Listbox.Option value={null} className={({ active }) => cn('relative cursor-pointer select-none py-2 pr-4 pl-10', active ? 'bg-surface-raised' : '', 'text-text-muted')}>
          {({ selected }) => (
            <>
              <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>Nicht zugeordnet</span>
              {selected && (
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-action-primary">
                  <PiCheck className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
            </>
          )}
        </Listbox.Option>

        {qualifikationen.map((qualifikation) => (
          <Listbox.Option key={qualifikation.id} value={qualifikation.id} className={({ active }) => cn('relative cursor-pointer select-none py-2 pr-4 pl-10', active ? 'bg-status-info-surface' : '')}>
            {({ selected }) => (
              <>
                <span className={cn('block truncate text-text-primary', selected ? 'font-medium' : 'font-normal')}>
                  <span className="font-medium text-action-primary">{qualifikation.abkuerzung}</span>
                  {' - '}
                  {qualifikation.name}
                </span>
                {selected && (
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-action-primary">
                    <PiCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
              </>
            )}
          </Listbox.Option>
        ))}
      </Listbox.Options>
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
