/**
 * BesetzeRolleDialog fuer die Zuweisung einer Person zu einer Rolle.
 *
 * **Story TD2-Picker:**
 * Vollstaendige Rollen- und Personenauswahl via Combobox statt ID-Eingabe.
 * Bereits besetzte Rollen und Personen werden automatisch ausgefiltert.
 */

import { useCallback, useMemo, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { PiUserPlus } from 'react-icons/pi';
import { z } from 'zod';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { useBesetzeRolle, useRollenBesetzungen } from '../../api';
import { EinsatzPersonenPicker } from '../molecules/EinsatzPersonenPicker';
import { RollenDefinitionenPicker } from '../molecules/RollenDefinitionenPicker';

/**
 * Zod-Schema fuer das Besetze-Rolle Formular.
 * Validiert dass beide IDs vorhanden und nicht leer sind.
 */
const besetzeRolleSchema = z.object({
  rollenDefinitionId: z.string().min(1, 'Rollen-Definition ID ist erforderlich'),
  einsatzPersonId: z.string().min(1, 'Einsatz-Person ID ist erforderlich'),
});

type BesetzeRolleFormData = z.infer<typeof besetzeRolleSchema>;

interface BesetzeRolleDialogProps {
  /** Ob der Dialog offen ist */
  isOpen: boolean;
  /** Schliessen-Handler */
  onClose: () => void;
  /** Einsatz ID */
  einsatzId: string;
  /** Optionale vorausgewaehlte RollenDefinition ID */
  rollenDefinitionId?: string;
}

/**
 * Extrahiert Error Code aus API-Fehler und liefert benutzerfreundliche Meldung.
 *
 * Bekannte Fehlercodes werden uebersetzt:
 * - ROLLE_ALREADY_BESETZT -> "Diese Rolle ist bereits besetzt"
 * - PERSON_NOT_FOUND -> "Person nicht gefunden"
 * - PERSON_BEREITS_AUF_ANDERER_ROLLE -> "Person ist bereits einer anderen Rolle zugewiesen"
 * - PERSON_NOT_QUALIFIED -> "Person besitzt nicht die erforderlichen Qualifikationen"
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('already_besetzt') || message.includes('bereits besetzt')) {
      return 'Diese Rolle ist bereits besetzt';
    }
    if (message.includes('person_not_found') || message.includes('person nicht gefunden')) {
      return 'Person nicht gefunden';
    }
    if (message.includes('bereits_auf_anderer_rolle') || message.includes('already assigned')) {
      return 'Person ist bereits einer anderen Rolle zugewiesen';
    }
    if (message.includes('qualifikation') || message.includes('qualified') || message.includes('erforderlich')) {
      return 'Person besitzt nicht die erforderlichen Qualifikationen fuer diese Rolle';
    }
  }
  return 'Fehler beim Besetzen der Rolle';
}

/**
 * Dialog zum Besetzen einer Rolle mit einer EinsatzPerson.
 *
 * Nutzt EinsatzPersonenPicker fuer benutzerfreundliche Personenauswahl
 * mit Autocomplete statt manueller ID-Eingabe.
 * Bereits besetzte Personen werden automatisch ausgefiltert.
 */
export function BesetzeRolleDialog({ isOpen, onClose, einsatzId, rollenDefinitionId: initialRollenDefinitionId }: BesetzeRolleDialogProps) {
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const { mutate: besetzeRolle, isPending } = useBesetzeRolle(einsatzId);
  const { data: besetzungen } = useRollenBesetzungen(einsatzId);

  // AC4: Bereits besetzte Personen ausfiltern
  // einsatzPersonId ist ein required field im RollenBesetzungListItemDto (Backend garantiert)
  const besetztePersonIds = useMemo(() => {
    if (!besetzungen) return [];
    return besetzungen.map((b) => b.einsatzPersonId);
  }, [besetzungen]);

  const besetzteRollenDefinitionIds = useMemo(() => {
    if (!besetzungen) return [];
    return besetzungen.map((b) => b.rollenDefinitionId);
  }, [besetzungen]);

  const form = useForm<BesetzeRolleFormData>({
    defaultValues: {
      rollenDefinitionId: initialRollenDefinitionId ?? '',
      einsatzPersonId: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: besetzeRolleSchema,
    },
    onSubmit: async ({ value }) => {
      setApiErrorMessage(null);
      besetzeRolle(
        {
          rollenDefinitionId: value.rollenDefinitionId.trim(),
          einsatzPersonId: value.einsatzPersonId.trim(),
        },
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
    },
  });

  const handleClose = useCallback(() => {
    if (!isPending) {
      setApiErrorMessage(null);
      form.reset();
      onClose();
    }
  }, [isPending, form, onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="sm">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
          <PiUserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <Dialog.Title>Rolle besetzen</Dialog.Title>
      </div>

      <Dialog.Body>
        <form
          id="besetze-rolle-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="rollenDefinitionId">
            {(field) => (
              <RollenDefinitionenPicker
                value={field.state.value}
                onChange={(rollenDefinitionId) => field.handleChange(rollenDefinitionId)}
                onBlur={field.handleBlur}
                disabled={isPending || !!initialRollenDefinitionId}
                error={field.state.meta.isTouched && field.state.meta.errors.length > 0 ? field.state.meta.errors.join(', ') : undefined}
                excludeRollenDefinitionIds={besetzteRollenDefinitionIds.filter((id) => id !== field.state.value)}
                label="Rolle auswaehlen"
                placeholder="Rollenname eingeben..."
              />
            )}
          </form.Field>

          <form.Field name="einsatzPersonId">
            {(field) => (
              <EinsatzPersonenPicker
                einsatzId={einsatzId}
                value={field.state.value}
                onChange={(personId) => field.handleChange(personId)}
                onBlur={field.handleBlur}
                disabled={isPending}
                error={field.state.meta.isTouched && field.state.meta.errors.length > 0 ? field.state.meta.errors.join(', ') : undefined}
                excludePersonIds={besetztePersonIds}
                label="Person auswaehlen"
                placeholder="Name eingeben..."
              />
            )}
          </form.Field>

          {/* API Error Message */}
          {apiErrorMessage && <div className="rounded-lg bg-red-50 p-3 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400">{apiErrorMessage}</div>}
        </form>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button type="submit" form="besetze-rolle-form" intent="primary" loading={isPending} disabled={isPending}>
          Zuweisen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
