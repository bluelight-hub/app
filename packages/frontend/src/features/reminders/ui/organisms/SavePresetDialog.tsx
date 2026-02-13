/**
 * SavePresetDialog Organism (Story 8.9 Task 2)
 *
 * Dialog zum Speichern einer Filter-Kombination als Preset.
 * AC1: Dialog mit Namensfeld, aktuelle Filter-Zusammenfassung
 *
 * Pattern: Headless UI Dialog (wie QuickCreateErinnerungDialog)
 * Form: @tanstack/react-form + Zod
 */

import { useCallback } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { PiBookmarkSimple } from 'react-icons/pi';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { filterPresetNameSchema } from '../../schemas/filter-preset.schema';
import { addPreset } from '../../stores/filter-preset.store';
import { getTeamFilter, getTeamSort, getKategorieFilter, getStatusFilter } from '../../stores';
import type { TeamFilterType, TeamSortType, KategorieFilterType, StatusFilterType } from '../../stores';

interface SavePresetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Teilnehmer-Namen fuer die Anzeige des Team-Filters */
  teilnehmerMap?: Map<string, string>;
  /** Kategorien-Namen fuer die Anzeige des Kategorie-Filters */
  kategorienMap?: Map<string, string>;
}

/**
 * Extrahiert Fehlermeldungen aus TanStack Form Errors.
 */
function formatErrors(errors: unknown[]): string {
  return errors
    .map((e) => {
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message;
      return String(e);
    })
    .join(', ');
}

/**
 * Erzeugt ein lesbares Label fuer einen Team-Filter.
 */
function teamFilterLabel(filter: TeamFilterType, teilnehmerMap?: Map<string, string>): string | null {
  switch (filter.type) {
    case 'all':
      return null;
    case 'mine':
      return 'Meine';
    case 'unassigned':
      return 'Unzugewiesen';
    case 'user':
      return teilnehmerMap?.get(filter.userId) ?? 'Benutzer';
  }
}

/**
 * Erzeugt ein lesbares Label fuer einen Kategorie-Filter.
 */
function kategorieFilterLabel(filter: KategorieFilterType, kategorienMap?: Map<string, string>): string | null {
  switch (filter.type) {
    case 'all':
      return null;
    case 'kategorie':
      return kategorienMap?.get(filter.kategorieId) ?? 'Kategorie';
    case 'untagged':
      return 'Ohne Kategorie';
  }
}

/**
 * Erzeugt ein lesbares Label fuer einen Status-Filter.
 */
function statusFilterLabel(filter: StatusFilterType): string | null {
  if (filter.type === 'all') return null;
  return filter.status;
}

/**
 * Erzeugt ein lesbares Label fuer eine Sortierung.
 */
function sortLabel(sort: TeamSortType): string {
  const labels: Record<TeamSortType, string> = {
    faelligkeit: 'Faelligkeit',
    faelligkeit_desc: 'Faelligkeit (abst.)',
    erstellt: 'Erstellungsdatum',
    status: 'Status',
    titel: 'Titel A-Z',
  };
  return labels[sort];
}

export function SavePresetDialog({ isOpen, onClose, teilnehmerMap, kategorienMap }: SavePresetDialogProps) {
  const form = useForm({
    defaultValues: { name: '' },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: filterPresetNameSchema,
    },
    onSubmit: ({ value }) => {
      handleSave(value.name);
    },
  });

  const handleSave = useCallback(
    (name: string) => {
      addPreset({
        name,
        teamFilter: getTeamFilter(),
        kategorieFilter: getKategorieFilter(),
        statusFilter: getStatusFilter(),
        sortierung: getTeamSort(),
      });
      form.reset();
      onClose();
    },
    [form, onClose],
  );

  const handleClose = useCallback(() => {
    form.reset();
    onClose();
  }, [form, onClose]);

  // Aktuelle Filter fuer Zusammenfassung
  const currentTeamFilter = getTeamFilter();
  const currentKategorieFilter = getKategorieFilter();
  const currentStatusFilter = getStatusFilter();
  const currentSort = getTeamSort();

  const teamLabel = teamFilterLabel(currentTeamFilter, teilnehmerMap);
  const kategorieLabel = kategorieFilterLabel(currentKategorieFilter, kategorienMap);
  const statusLabel = statusFilterLabel(currentStatusFilter);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary-100 p-2 dark:bg-primary-900/30">
          <PiBookmarkSimple className="h-5 w-5 text-primary-500" />
        </div>
        <Dialog.Title>Filter-Preset speichern</Dialog.Title>
      </div>

      <Dialog.Body>
        <form
          id="save-preset-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* Name-Feld */}
          <form.Field name="name">
            {(field) => (
              <div>
                <label htmlFor="preset-name" className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Preset-Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="preset-name"
                  type="text"
                  placeholder="z.B. Meine ueberfaelligen"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  maxLength={50}
                  autoFocus
                />
                {field.state.meta.isTouched && field.state.meta.errors.length > 0 && <p className="mt-1 text-red-600 text-sm dark:text-red-400">{formatErrors(field.state.meta.errors)}</p>}
              </div>
            )}
          </form.Field>

          {/* Filter-Zusammenfassung */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="mb-2 font-medium text-gray-600 text-xs dark:text-gray-400">Aktuelle Filter:</p>
            <div className="flex flex-wrap gap-1.5">
              {teamLabel && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-300">Team: {teamLabel}</span>
              )}
              {kategorieLabel && (
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-700 text-xs dark:bg-purple-900/30 dark:text-purple-300">
                  Kategorie: {kategorieLabel}
                </span>
              )}
              {statusLabel && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-300">
                  Status: {statusLabel}
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 font-medium text-gray-600 text-xs dark:bg-gray-700 dark:text-gray-300">
                Sortierung: {sortLabel(currentSort)}
              </span>
            </div>
          </div>
        </form>
      </Dialog.Body>

      <Dialog.Footer>
        <Button intent="secondary" appearance="ghost" onClick={handleClose}>
          Abbrechen
        </Button>
        <Button type="submit" form="save-preset-form" intent="primary" kbd="Enter">
          Speichern
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
