import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { type CreateQualifikationDto, type QualifikationKategorie, KATEGORIE_LABELS } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Select } from '@/shared/ui/atoms/select.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';

/**
 * Zod-Schema für CreateQualifikation Form.
 */
const createQualifikationSchema = z.object({
  name: z.string().min(3, 'Name muss mindestens 3 Zeichen haben'),
  abkuerzung: z.string().min(2, 'Abkürzung muss mindestens 2 Zeichen haben'),
  kategorie: z.enum(['FUEHRUNG', 'SANITAET', 'BETREUUNG', 'TECHNIK', 'SONSTIGES']),
  beschreibung: z.string().optional(),
});

interface CreateQualifikationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateQualifikationDto) => void;
  isSubmitting: boolean;
}

const KATEGORIE_OPTIONS: { value: QualifikationKategorie; label: string }[] = [
  { value: 'FUEHRUNG', label: KATEGORIE_LABELS.FUEHRUNG },
  { value: 'SANITAET', label: KATEGORIE_LABELS.SANITAET },
  { value: 'BETREUUNG', label: KATEGORIE_LABELS.BETREUUNG },
  { value: 'TECHNIK', label: KATEGORIE_LABELS.TECHNIK },
  { value: 'SONSTIGES', label: KATEGORIE_LABELS.SONSTIGES },
];

/**
 * Dialog zum Erstellen einer neuen Qualifikation.
 */
export const CreateQualifikationDialog = ({ isOpen, onClose, onSubmit, isSubmitting }: CreateQualifikationDialogProps) => {
  const form = useForm({
    defaultValues: {
      name: '',
      abkuerzung: '',
      kategorie: 'SONSTIGES' as QualifikationKategorie,
      beschreibung: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: createQualifikationSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit({
        name: value.name,
        abkuerzung: value.abkuerzung,
        kategorie: value.kategorie,
        beschreibung: value.beschreibung || undefined,
      });
    },
  });

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <Dialog.Title>Neue Qualifikation erstellen</Dialog.Title>

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
                <FormField label="Name" error={field.state.meta.errors[0]} required htmlFor="create-qualifikation-name">
                  <Input
                    id="create-qualifikation-name"
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
                <FormField label="Abkürzung" error={field.state.meta.errors[0]} required htmlFor="create-qualifikation-abkuerzung">
                  <Input
                    id="create-qualifikation-abkuerzung"
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
                <FormField label="Kategorie" required htmlFor="create-qualifikation-kategorie">
                  <Select
                    id="create-qualifikation-kategorie"
                    value={field.state.value}
                    onChange={(value) => field.handleChange(value as QualifikationKategorie)}
                    options={KATEGORIE_OPTIONS}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            {/* Beschreibung */}
            <form.Field name="beschreibung">
              {(field) => (
                <FormField label="Beschreibung" htmlFor="create-qualifikation-beschreibung">
                  <Textarea
                    id="create-qualifikation-beschreibung"
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
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isFormSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isFormSubmitting || isSubmitting} loading={isSubmitting || isFormSubmitting}>
                Qualifikation erstellen
              </Button>
            )}
          </form.Subscribe>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
};
