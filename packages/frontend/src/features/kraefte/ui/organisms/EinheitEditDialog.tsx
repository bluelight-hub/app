/**
 * Dialog zum Bearbeiten einer bestehenden taktischen Einheit.
 *
 * Lädt die Einheit-Details über useEinheitDetails und ermöglicht
 * Änderungen an allen Feldern sowie dem Status.
 */

import { useCallback, useEffect, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { PiPencilSimple } from 'react-icons/pi';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { useEinheitDetails } from '@/features/kraefte/api/use-einheit-details';
import { useUpdateEinheit } from '@/features/kraefte/api/use-update-einheit';
import { useChangeEinheitStatus } from '@/features/kraefte/api/use-change-einheit-status';
import { createEinheitSchema, EINHEIT_TYP_OPTIONS, EINHEIT_STATUS_OPTIONS } from '@/features/kraefte/schemas/einheit.schema';

import type { z } from 'zod';

type EditEinheitFormData = z.infer<typeof createEinheitSchema> & {
  status: string;
};

interface EinheitEditDialogProps {
  /** Ob der Dialog geöffnet ist */
  isOpen: boolean;
  /** Handler zum Schließen */
  onClose: () => void;
  /** Einsatz-ID */
  einsatzId: string;
  /** ID der zu bearbeitenden Einheit */
  einheitId: string;
}

/**
 * Extrahiert benutzerfreundliche Fehlermeldung aus API-Fehler.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('not_found') || message.includes('nicht gefunden')) {
      return 'Einheit nicht gefunden';
    }
    if (message.includes('already') || message.includes('bereits')) {
      return 'Eine Einheit mit diesem Namen existiert bereits';
    }
  }
  return 'Fehler beim Aktualisieren der Einheit';
}

/**
 * Bearbeitungs-Dialog für taktische Einheiten.
 *
 * Lädt die bestehenden Daten und füllt das Formular vor.
 * Status-Änderungen werden über einen separaten API-Call gehandhabt.
 */
export function EinheitEditDialog({ isOpen, onClose, einsatzId, einheitId }: EinheitEditDialogProps) {
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const { data: details, isLoading: isLoadingDetails } = useEinheitDetails(einsatzId, einheitId);
  const { mutate: updateEinheit, isPending: isUpdating } = useUpdateEinheit(einsatzId);
  const { mutate: changeStatus, isPending: isChangingStatus } = useChangeEinheitStatus(einsatzId);

  const isPending = isUpdating || isChangingStatus;

  const form = useForm<EditEinheitFormData>({
    defaultValues: {
      name: '',
      typ: 'GRUPPE',
      funktion: '',
      sollStaerke: 9,
      auftrag: '',
      einsatzort: '',
      status: 'AUFGESTELLT',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: createEinheitSchema,
    },
    onSubmit: async ({ value }) => {
      setApiErrorMessage(null);

      // Status separat ändern wenn er sich geändert hat
      const statusChanged = details && value.status !== details.status;

      updateEinheit(
        {
          einheitId,
          name: value.name.trim(),
          typ: value.typ,
          funktion: value.funktion?.trim() || undefined,
          sollStaerke: value.sollStaerke,
          auftrag: value.auftrag?.trim() || undefined,
          einsatzort: value.einsatzort?.trim() || undefined,
        },
        {
          onSuccess: () => {
            if (statusChanged) {
              changeStatus(
                { einheitId, status: value.status },
                {
                  onSuccess: () => {
                    form.reset();
                    onClose();
                  },
                  onError: (error) => {
                    setApiErrorMessage(getErrorMessage(error));
                  },
                },
              );
            } else {
              form.reset();
              onClose();
            }
          },
          onError: (error) => {
            setApiErrorMessage(getErrorMessage(error));
          },
        },
      );
    },
  });

  // Formular mit geladenen Details vorbelegen
  useEffect(() => {
    if (details && isOpen) {
      form.reset();
      form.setFieldValue('name', details.name);
      form.setFieldValue('typ', details.typ);
      form.setFieldValue('funktion', details.funktion ?? '');
      form.setFieldValue('sollStaerke', details.sollStaerke);
      form.setFieldValue('auftrag', details.auftrag ?? '');
      form.setFieldValue('einsatzort', details.einsatzort ?? '');
      form.setFieldValue('status', details.status);
    }
  }, [details, isOpen, form]);

  const handleClose = useCallback(() => {
    if (!isPending) {
      setApiErrorMessage(null);
      form.reset();
      onClose();
    }
  }, [isPending, form, onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-status-info-surface p-2">
          <PiPencilSimple className="h-5 w-5 text-status-info-text" />
        </div>
        <Dialog.Title>Einheit bearbeiten</Dialog.Title>
      </div>

      <Dialog.Body>
        {isLoadingDetails ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingState message="Lade Einheit-Details..." fullScreen={false} />
          </div>
        ) : (
          <form
            id="edit-einheit-form"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            {/* Name */}
            <form.Field name="name">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor="edit-einheit-name" className="block text-sm font-medium text-text-secondary">
                    Name *
                  </label>
                  <Input
                    id="edit-einheit-name"
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={isPending}
                    fullWidth
                    variant={field.state.meta.errors?.length ? 'error' : 'default'}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && <p className="text-xs text-status-danger-text">{field.state.meta.errors.join(', ')}</p>}
                </div>
              )}
            </form.Field>

            {/* Typ */}
            <form.Field name="typ">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor="edit-einheit-typ" className="block text-sm font-medium text-text-secondary">
                    Typ *
                  </label>
                  <select
                    id="edit-einheit-typ"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={isPending}
                    className="w-full rounded-control border border-border-subtle bg-surface-panel px-3 py-2 text-sm text-text-primary focus:border-action-primary focus:ring-1 focus:ring-action-primary focus:outline-none disabled:opacity-50"
                  >
                    {EINHEIT_TYP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </form.Field>

            {/* Status */}
            <form.Field name="status">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor="edit-einheit-status" className="block text-sm font-medium text-text-secondary">
                    Status
                  </label>
                  <select
                    id="edit-einheit-status"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={isPending}
                    className="w-full rounded-control border border-border-subtle bg-surface-panel px-3 py-2 text-sm text-text-primary focus:border-action-primary focus:ring-1 focus:ring-action-primary focus:outline-none disabled:opacity-50"
                  >
                    {EINHEIT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </form.Field>

            {/* Funktion (optional) */}
            <form.Field name="funktion">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor="edit-einheit-funktion" className="block text-sm font-medium text-text-secondary">
                    Funktion
                  </label>
                  <Input
                    id="edit-einheit-funktion"
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={isPending}
                    placeholder="z.B. Bergung, Rettung"
                    fullWidth
                  />
                </div>
              )}
            </form.Field>

            {/* Soll-Stärke */}
            <form.Field name="sollStaerke">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor="edit-einheit-sollstaerke" className="block text-sm font-medium text-text-secondary">
                    Soll-Stärke *
                  </label>
                  <Input
                    id="edit-einheit-sollstaerke"
                    type="number"
                    min={1}
                    max={999}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number.parseInt(e.target.value, 10) || 1)}
                    onBlur={field.handleBlur}
                    disabled={isPending}
                    fullWidth
                    variant={field.state.meta.errors?.length ? 'error' : 'default'}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && <p className="text-xs text-status-danger-text">{field.state.meta.errors.join(', ')}</p>}
                </div>
              )}
            </form.Field>

            {/* Auftrag (optional) */}
            <form.Field name="auftrag">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor="edit-einheit-auftrag" className="block text-sm font-medium text-text-secondary">
                    Auftrag
                  </label>
                  <Textarea
                    id="edit-einheit-auftrag"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={isPending}
                    placeholder="Auftrag der Einheit..."
                    rows={2}
                    fullWidth
                  />
                </div>
              )}
            </form.Field>

            {/* Einsatzort (optional) */}
            <form.Field name="einsatzort">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor="edit-einheit-einsatzort" className="block text-sm font-medium text-text-secondary">
                    Einsatzort
                  </label>
                  <Input
                    id="edit-einheit-einsatzort"
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={isPending}
                    placeholder="z.B. Abschnitt Nord"
                    fullWidth
                  />
                </div>
              )}
            </form.Field>

            {/* API Error Message */}
            {apiErrorMessage && <div className="rounded-panel bg-status-danger-surface p-3 text-sm text-status-danger-text">{apiErrorMessage}</div>}
          </form>
        )}
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button type="submit" form="edit-einheit-form" intent="primary" loading={isPending} disabled={isPending || isLoadingDetails}>
          Speichern
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
