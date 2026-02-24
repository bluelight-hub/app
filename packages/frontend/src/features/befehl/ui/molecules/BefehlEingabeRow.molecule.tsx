/**
 * BefehlEingabeRow - Inline-Eingabe-Row zur Befehlserfassung
 *
 * Kompakte Eingabezeile im Linear/Notion-Stil, die conditional
 * in der Befehle-Seite gerendert wird. Kein Modal, sondern direkt inline.
 */

import type { CreateBefehlDto } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import { useCreateBefehl } from '../../api';
import { useOfflineSync } from '../../lib/offline-queue';
import { createBefehlSchema } from '../../schemas';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Combobox, type ComboboxItem } from '@/shared/ui/headless/combobox';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import { EmpfaengerCombobox, type EmpfaengerSelection } from './EmpfaengerCombobox.molecule';

interface BefehlEingabeRowProps {
  einsatzId: string;
  onClose: () => void;
}

/** Standard-Vorschlaege fuer Befehlsgeber (Rollen + Stellen) */
const DEFAULT_ROLE_SUGGESTIONS: ComboboxItem[] = [
  { value: 'Leitstelle', label: 'Leitstelle' },
  { value: 'EL', label: 'EL (Einsatzleiter)' },
  { value: 'ZF', label: 'ZF (Zugführer)' },
  { value: 'GF', label: 'GF (Gruppenführer)' },
  { value: 'TEL', label: 'TEL (Technische Einsatzleitung)' },
  { value: 'OrgL', label: 'OrgL (Organisatorischer Leiter)' },
  { value: 'LNA', label: 'LNA (Leitender Notarzt)' },
  { value: 'Polizei', label: 'Polizei' },
];

/**
 * Extrahiert Fehlermeldungen aus dem TanStack Form Error-Array.
 * Unterstuetzt sowohl String-Fehler als auch Zod-Error-Objekte.
 */
function getFormErrors(errors: unknown[]): string {
  return errors
    .map((e) => {
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object' && 'message' in e) return (e as { message: string }).message;
      return '';
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Inline-Eingabezeile fuer neue Befehle
 *
 * Rendert eine kompakte Row mit Empfaenger-Combobox, Befehlsgeber-Combobox,
 * Auftrags-Textarea und optionaler Zeitvorgabe. Submit via Ctrl+Enter.
 */
export function BefehlEingabeRow({ einsatzId, onClose }: BefehlEingabeRowProps) {
  const { mutateAsync, isPending } = useCreateBefehl(einsatzId);
  const { isOnline, enqueue } = useOfflineSync(async (data) => {
    await mutateAsync(data as CreateBefehlDto);
  });
  const { user } = useCurrentUser();

  /** Lokaler State fuer Empfaenger-Chips (Name + optionale empfaengerId) */
  const [empfaengerChips, setEmpfaengerChips] = useState<EmpfaengerSelection[]>([]);

  const form = useForm({
    defaultValues: {
      auftrag: '',
      empfaenger: [] as EmpfaengerSelection[],
      befehlsgeber: 'EL',
      einsatzId,
      erstellerId: user?.id ?? '',
      zeitvorgabe: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: createBefehlSchema,
    },
    onSubmit: async ({ value }) => {
      if (!isOnline) {
        await enqueue(value);
        toast.info('Offline – Befehl wird gesendet sobald online');
        form.reset();
        setEmpfaengerChips([]);
        onClose();
        return;
      }

      try {
        const result = await mutateAsync({
          ...value,
          zeitvorgabe: value.zeitvorgabe || undefined,
        });
        toast.success(`Befehl #${result.nummer} erteilt an ${value.empfaenger.length} Empfänger`);
        form.reset();
        setEmpfaengerChips([]);
        onClose();
      } catch (error) {
        toast.error('Befehl konnte nicht erstellt werden', {
          description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
      }
    },
  });

  /** Ctrl+Enter: Formular absenden */
  useHotkeys('mod+enter', () => form.handleSubmit(), {
    preventDefault: true,
    enableOnFormTags: true,
  });

  /** Escape: Eingabe schliessen */
  useHotkeys('escape', () => onClose(), {
    enableOnFormTags: true,
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        {/* Zeile 1: Empfaenger + Befehlsgeber */}
        <div className="grid grid-cols-2 gap-4">
          {/* Empfaenger Multi-Input mit API-Suche */}
          <form.Field name="empfaenger">
            {(field) => (
              <FormField label="Empfänger" required error={field.state.meta.errors.length > 0 ? getFormErrors(field.state.meta.errors) : undefined}>
                <EmpfaengerCombobox
                  einsatzId={einsatzId}
                  value={empfaengerChips}
                  onChange={(selected) => {
                    setEmpfaengerChips(selected);
                    field.handleChange(selected);
                  }}
                  error={field.state.meta.errors.length > 0 ? getFormErrors(field.state.meta.errors) : undefined}
                />
              </FormField>
            )}
          </form.Field>

          {/* Befehlsgeber Combobox */}
          <form.Field name="befehlsgeber">
            {(field) => (
              <FormField label="Befehlsgeber" required>
                <Combobox
                  items={DEFAULT_ROLE_SUGGESTIONS}
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  onBlur={field.handleBlur}
                  placeholder="Befehlsgeber wählen..."
                  allowCustomValue
                  error={field.state.meta.errors.length > 0 ? getFormErrors(field.state.meta.errors) : undefined}
                />
              </FormField>
            )}
          </form.Field>
        </div>

        {/* Zeile 2: Auftrag (Full-Width) */}
        <div className="mt-4">
          <form.Field name="auftrag">
            {(field) => (
              <FormField label="Auftrag" required error={field.state.meta.errors.length > 0 ? getFormErrors(field.state.meta.errors) : undefined}>
                <Textarea
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Befehl eingeben..."
                  variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                  textareaSize="sm"
                  fullWidth
                />
              </FormField>
            )}
          </form.Field>
        </div>

        {/* Zeile 3: Zeitvorgabe + Buttons */}
        <div className="mt-4 flex items-end gap-4">
          <div className="flex-1">
            <form.Field name="zeitvorgabe">
              {(field) => (
                <FormField label="Zeitvorgabe">
                  <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="z.B. sofort, bis 14:00 Uhr" inputSize="md" fullWidth />
                </FormField>
              )}
            </form.Field>
          </div>

          <div className="flex gap-2">
            <Button intent="secondary" appearance="ghost" kbd="esc" onClick={onClose} disabled={isPending}>
              Abbrechen
            </Button>
            <Button intent="primary" kbd="ctrl+enter" type="submit" loading={isPending}>
              Befehl erteilen
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
