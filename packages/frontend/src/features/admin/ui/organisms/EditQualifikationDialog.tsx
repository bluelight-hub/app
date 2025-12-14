import { useEffect, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { type QualifikationDto, type UpdateQualifikationDto, type QualifikationKategorie, KATEGORIE_LABELS } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Switch } from '@headlessui/react';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Select } from '@/shared/ui/atoms/select.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';

/**
 * Zod-Schema für UpdateQualifikation Form.
 */
const updateQualifikationSchema = z.object({
  name: z.string().min(3, 'Name muss mindestens 3 Zeichen haben'),
  abkuerzung: z.string().min(2, 'Abkürzung muss mindestens 2 Zeichen haben'),
  kategorie: z.enum(['FUEHRUNG', 'SANITAET', 'BETREUUNG', 'TECHNIK', 'SONSTIGES']),
  beschreibung: z.string().optional(),
  istAktiv: z.boolean(),
});

interface EditQualifikationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateQualifikationDto) => void;
  isSubmitting: boolean;
  qualifikation: QualifikationDto | null;
}

const KATEGORIE_OPTIONS: { value: QualifikationKategorie; label: string }[] = [
  { value: 'FUEHRUNG', label: KATEGORIE_LABELS.FUEHRUNG },
  { value: 'SANITAET', label: KATEGORIE_LABELS.SANITAET },
  { value: 'BETREUUNG', label: KATEGORIE_LABELS.BETREUUNG },
  { value: 'TECHNIK', label: KATEGORIE_LABELS.TECHNIK },
  { value: 'SONSTIGES', label: KATEGORIE_LABELS.SONSTIGES },
];

/**
 * Dialog zum Bearbeiten einer Qualifikation.
 */
export const EditQualifikationDialog = ({ isOpen, onClose, onSubmit, isSubmitting, qualifikation }: EditQualifikationDialogProps) => {
  // Track last loaded qualifikation ID to prevent unnecessary resets
  const lastLoadedIdRef = useRef<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: qualifikation?.name || '',
      abkuerzung: qualifikation?.abkuerzung || '',
      kategorie: qualifikation?.kategorie || ('SONSTIGES' as QualifikationKategorie),
      beschreibung: qualifikation?.beschreibung || '',
      istAktiv: qualifikation?.istAktiv ?? true,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: updateQualifikationSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit({
        name: value.name || undefined,
        abkuerzung: value.abkuerzung || undefined,
        kategorie: value.kategorie,
        beschreibung: value.beschreibung || undefined,
        istAktiv: value.istAktiv,
      });
    },
  });

  // Update form when qualifikation changes
  // Reset form nur wenn eine neue Qualifikation geladen wird (ID-Wechsel)
  useEffect(() => {
    if (qualifikation && isOpen && lastLoadedIdRef.current !== qualifikation.id) {
      lastLoadedIdRef.current = qualifikation.id;
      form.reset({
        name: qualifikation.name,
        abkuerzung: qualifikation.abkuerzung,
        kategorie: qualifikation.kategorie,
        beschreibung: qualifikation.beschreibung || '',
        istAktiv: qualifikation.istAktiv,
      });
    }
  }, [qualifikation, isOpen, form]);

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      lastLoadedIdRef.current = null;
      onClose();
    }
  };

  if (!qualifikation) return null;

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <Dialog.Title>Qualifikation bearbeiten</Dialog.Title>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <Dialog.Body>
          <div className="space-y-4">
            {/* Name */}
            <form.Field name="name">
              {(field) => (
                <FormField label="Name" error={field.state.meta.errors[0]} required>
                  <Input
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="z.B. Zugführer"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            {/* Abkürzung */}
            <form.Field name="abkuerzung">
              {(field) => (
                <FormField label="Abkürzung" error={field.state.meta.errors[0]} required>
                  <Input
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                    placeholder="z.B. ZFÜ"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            {/* Kategorie */}
            <form.Field name="kategorie">
              {(field) => (
                <FormField label="Kategorie" required>
                  <Select value={field.state.value} onChange={(value) => field.handleChange(value as QualifikationKategorie)} options={KATEGORIE_OPTIONS} fullWidth />
                </FormField>
              )}
            </form.Field>

            {/* Beschreibung */}
            <form.Field name="beschreibung">
              {(field) => (
                <FormField label="Beschreibung">
                  <Textarea
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Optionale Beschreibung der Qualifikation"
                    rows={3}
                  />
                </FormField>
              )}
            </form.Field>

            {/* Status */}
            <form.Field name="istAktiv">
              {(field) => (
                <FormField label="Status">
                  <div className="flex items-center gap-3">
                    <Switch checked={field.state.value} onChange={field.handleChange} />
                    <span className="text-gray-700 text-sm dark:text-gray-300">{field.state.value ? 'Aktiv' : 'Deaktiviert'}</span>
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
