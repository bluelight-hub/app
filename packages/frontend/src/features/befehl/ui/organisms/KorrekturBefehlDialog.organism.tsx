/**
 * Dialog zur Erstellung eines Korrektur-Befehls
 *
 * Oeffnet sich mit vorausgefuellten Feldern des Original-Befehls.
 * Ermoeglicht die Eingabe eines neuen Auftrags und optionaler EAMZW-Felder.
 */

import { useCurrentUser } from '@/features/auth';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Combobox, type ComboboxItem } from '@/shared/ui/headless/combobox';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import type { BefehlDto } from '@bluelight-hub/shared/client';
import { useKorrigiereBefehl } from '../../api/use-korrigiere-befehl';
import { korrigiereBefehlSchema } from '../../schemas/korrigiere-befehl.schema';
import { EmpfaengerCombobox, type EmpfaengerSelection } from '../molecules/EmpfaengerCombobox.molecule';

/** Standard-Vorschlaege fuer Befehlsgeber */
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

interface KorrekturBefehlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalBefehl: BefehlDto;
  einsatzId: string;
}

/** Extrahiert Fehlermeldungen aus dem TanStack Form Error-Array */
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

export function KorrekturBefehlDialog({ isOpen, onClose, originalBefehl, einsatzId }: KorrekturBefehlDialogProps) {
  const { mutate, isPending } = useKorrigiereBefehl(originalBefehl.id, einsatzId);
  const { user } = useCurrentUser();
  const [showEamzw, setShowEamzw] = useState(false);

  /** Empfaenger-Chips State (vorausgefuellt aus Original-Befehl) */
  const initialEmpfaenger: EmpfaengerSelection[] = useMemo(() => originalBefehl.empfaenger.map((e) => ({ name: e.name, empfaengerId: e.empfaengerId })), [originalBefehl.empfaenger]);
  const [empfaengerChips, setEmpfaengerChips] = useState<EmpfaengerSelection[]>(initialEmpfaenger);

  /** Sync empfaengerChips wenn Dialog mit neuem Befehl geoeffnet wird (H7) */
  useEffect(() => {
    if (isOpen) {
      setEmpfaengerChips(initialEmpfaenger);
    }
  }, [isOpen, initialEmpfaenger]);

  const form = useForm({
    defaultValues: {
      auftrag: '',
      empfaenger: initialEmpfaenger,
      befehlsgeber: originalBefehl.befehlsgeberName,
      erstellerId: user?.id ?? '',
      zeitvorgabe: '',
      ereignis: '',
      mittel: '',
      ziel: '',
      weg: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: korrigiereBefehlSchema,
    },
    onSubmit: ({ value }) => {
      if (!user?.id) return;
      mutate(
        {
          auftrag: value.auftrag,
          empfaenger: value.empfaenger,
          befehlsgeber: value.befehlsgeber,
          erstellerId: user.id,
          zeitvorgabe: value.zeitvorgabe || undefined,
          ereignis: value.ereignis || undefined,
          mittel: value.mittel || undefined,
          ziel: value.ziel || undefined,
          weg: value.weg || undefined,
        },
        { onSuccess: () => handleClose() },
      );
    },
  });

  const handleClose = useCallback(() => {
    form.reset();
    setEmpfaengerChips(initialEmpfaenger);
    setShowEamzw(false);
    onClose();
  }, [form, initialEmpfaenger, onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="lg">
      <Dialog.Title>Korrektur zu Befehl #{originalBefehl.nummer}</Dialog.Title>

      <Dialog.Body>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          {/* Hinweis auf Original-Befehl */}
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            Korrektur des Original-Auftrags: &ldquo;{originalBefehl.auftrag.length > 100 ? `${originalBefehl.auftrag.slice(0, 100)}...` : originalBefehl.auftrag}&rdquo;
          </div>

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

            {/* Befehlsgeber */}
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

          {/* Zeile 2: Auftrag (Korrektur) */}
          <div className="mt-4">
            <form.Field name="auftrag">
              {(field) => (
                <FormField label="Korrektur-Auftrag" required error={field.state.meta.errors.length > 0 ? getFormErrors(field.state.meta.errors) : undefined}>
                  <Textarea
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Korrektur-Auftrag eingeben..."
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    textareaSize="sm"
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>
          </div>

          {/* Zeile 3: Zeitvorgabe */}
          <div className="mt-4">
            <form.Field name="zeitvorgabe">
              {(field) => (
                <FormField label="Zeitvorgabe">
                  <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="z.B. sofort, bis 14:00 Uhr" inputSize="md" fullWidth />
                </FormField>
              )}
            </form.Field>
          </div>

          {/* Progressive Disclosure: EAMZW-Felder */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowEamzw(!showEamzw)}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showEamzw ? <PiCaretUp className="h-4 w-4" /> : <PiCaretDown className="h-4 w-4" />}
              Erweiterte Felder (EAMZW)
            </button>

            {showEamzw && (
              <div className="mt-3 space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
                <form.Field name="ereignis">
                  {(field) => (
                    <FormField label="Ereignis">
                      <Textarea
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Ereignis beschreiben..."
                        textareaSize="sm"
                        fullWidth
                      />
                    </FormField>
                  )}
                </form.Field>

                <form.Field name="mittel">
                  {(field) => (
                    <FormField label="Mittel">
                      <Textarea
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Eingesetzte Mittel..."
                        textareaSize="sm"
                        fullWidth
                      />
                    </FormField>
                  )}
                </form.Field>

                <form.Field name="ziel">
                  {(field) => (
                    <FormField label="Ziel">
                      <Textarea
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Ziel des Einsatzes..."
                        textareaSize="sm"
                        fullWidth
                      />
                    </FormField>
                  )}
                </form.Field>

                <form.Field name="weg">
                  {(field) => (
                    <FormField label="Weg">
                      <Textarea value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} placeholder="Weg / Route..." textareaSize="sm" fullWidth />
                    </FormField>
                  )}
                </form.Field>
              </div>
            )}
          </div>
        </form>
      </Dialog.Body>

      <Dialog.Footer loading={isPending}>
        <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button intent="primary" loading={isPending} onClick={() => form.handleSubmit()}>
          Korrektur erteilen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
