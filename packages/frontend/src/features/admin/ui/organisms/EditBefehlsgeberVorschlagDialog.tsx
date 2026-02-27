import { useEffect, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import type { BefehlsgeberVorschlagDto, UpdateBefehlsgeberVorschlagDto } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Switch } from '@/shared/ui/atoms/switch.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';

/**
 * Zod-Schema fuer UpdateBefehlsgeberVorschlag Form.
 */
const updateBefehlsgeberVorschlagSchema = z.object({
  kuerzel: z.string().min(1, 'Kürzel ist erforderlich').max(10, 'Kürzel darf maximal 10 Zeichen haben'),
  label: z.string().min(2, 'Label muss mindestens 2 Zeichen haben'),
  sortOrder: z.number().int('Sortierung muss eine Ganzzahl sein').min(0, 'Sortierung muss >= 0 sein'),
  istAktiv: z.boolean(),
});

interface EditBefehlsgeberVorschlagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateBefehlsgeberVorschlagDto) => void;
  isSubmitting: boolean;
  vorschlag: BefehlsgeberVorschlagDto | null;
}

/**
 * Dialog zum Bearbeiten eines Befehlsgeber-Vorschlags.
 */
export const EditBefehlsgeberVorschlagDialog = ({ isOpen, onClose, onSubmit, isSubmitting, vorschlag }: EditBefehlsgeberVorschlagDialogProps) => {
  // Track last loaded vorschlag ID to prevent unnecessary resets
  const lastLoadedIdRef = useRef<string | null>(null);

  const form = useForm({
    defaultValues: {
      kuerzel: vorschlag?.kuerzel || '',
      label: vorschlag?.label || '',
      sortOrder: vorschlag?.sortOrder ?? 0,
      istAktiv: vorschlag?.istAktiv ?? true,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onBlur: updateBefehlsgeberVorschlagSchema,
    },
    onSubmit: ({ value }) => {
      if (!vorschlag) return;

      // Nur geaenderte Felder senden (Partial Update)
      const updates: UpdateBefehlsgeberVorschlagDto = {};

      if (value.kuerzel !== vorschlag.kuerzel) {
        updates.kuerzel = value.kuerzel;
      }
      if (value.label !== vorschlag.label) {
        updates.label = value.label;
      }
      if (value.sortOrder !== vorschlag.sortOrder) {
        updates.sortOrder = value.sortOrder;
      }
      if (value.istAktiv !== vorschlag.istAktiv) {
        updates.istAktiv = value.istAktiv;
      }

      // Pruefen ob ueberhaupt Aenderungen vorliegen
      if (Object.keys(updates).length === 0) {
        // Keine Aenderungen - Dialog einfach schliessen
        handleClose();
        return;
      }

      onSubmit(updates);
    },
  });

  // Update form when vorschlag changes
  // Reset form nur wenn ein neuer Vorschlag geladen wird (ID-Wechsel)
  //
  // WARUM kein useCallback fuer form.reset:
  // - `form` ist eine instabile Referenz (aendert sich bei jedem Render)
  // - useCallback mit `form` als Dependency wuerde Callback bei jedem Render neu erstellen
  // - Stattdessen: form.reset direkt im useEffect aufrufen, lastLoadedIdRef verhindert unnoetige Resets
  // - biome-ignore ist sicher: form.reset ist stabil (interne TanStack Form Implementierung)
  // biome-ignore lint/correctness/useExhaustiveDependencies: form.reset ist stabil, lastLoadedIdRef verhindert Race Conditions
  useEffect(() => {
    if (vorschlag && isOpen && lastLoadedIdRef.current !== vorschlag.id) {
      lastLoadedIdRef.current = vorschlag.id;
      form.reset({
        kuerzel: vorschlag.kuerzel,
        label: vorschlag.label,
        sortOrder: vorschlag.sortOrder,
        istAktiv: vorschlag.istAktiv,
      });
    }
  }, [vorschlag, isOpen]);

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      lastLoadedIdRef.current = null;
      onClose();
    }
  };

  if (!vorschlag) return null;

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <Dialog.Title>Befehlsgeber-Vorschlag bearbeiten</Dialog.Title>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <Dialog.Body>
          <div className="space-y-4">
            {/* Kuerzel */}
            <form.Field name="kuerzel">
              {(field) => (
                <FormField label="Kürzel" error={field.state.meta.errors[0]} required htmlFor="edit-befehlsgeber-vorschlag-kuerzel">
                  <Input
                    id="edit-befehlsgeber-vorschlag-kuerzel"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                    placeholder="z.B. EL, ZF"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            {/* Label */}
            <form.Field name="label">
              {(field) => (
                <FormField label="Label" error={field.state.meta.errors[0]} required htmlFor="edit-befehlsgeber-vorschlag-label">
                  <Input
                    id="edit-befehlsgeber-vorschlag-label"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="z.B. Einsatzleiter, Zugführer"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            {/* SortOrder */}
            <form.Field name="sortOrder">
              {(field) => (
                <FormField label="Sortierung" error={field.state.meta.errors[0]} htmlFor="edit-befehlsgeber-vorschlag-sort-order">
                  <Input
                    id="edit-befehlsgeber-vorschlag-sort-order"
                    name={field.name}
                    type="number"
                    value={String(field.state.value)}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(Number.parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            {/* Status */}
            <form.Field name="istAktiv">
              {(field) => (
                <FormField label="Status" htmlFor="edit-befehlsgeber-vorschlag-status">
                  <div className="flex items-center gap-3">
                    <Switch checked={field.state.value} onChange={field.handleChange} labelledBy="edit-befehlsgeber-vorschlag-status" />
                    <span id="edit-befehlsgeber-vorschlag-status" className="text-gray-700 text-sm dark:text-gray-300">
                      {field.state.value ? 'Aktiv' : 'Deaktiviert'}
                    </span>
                  </div>
                </FormField>
              )}
            </form.Field>
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isFormSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isFormSubmitting || isSubmitting} loading={isSubmitting || isFormSubmitting}>
                Änderungen speichern
              </Button>
            )}
          </form.Subscribe>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
};
