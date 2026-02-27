import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import type { CreateBefehlsgeberVorschlagDto } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';

/**
 * Zod-Schema fuer CreateBefehlsgeberVorschlag Form.
 */
const createBefehlsgeberVorschlagSchema = z.object({
  kuerzel: z.string().min(1, 'Kürzel ist erforderlich').max(10, 'Kürzel darf maximal 10 Zeichen haben'),
  label: z.string().min(2, 'Label muss mindestens 2 Zeichen haben'),
  sortOrder: z.number().int('Sortierung muss eine Ganzzahl sein').min(0, 'Sortierung muss >= 0 sein').optional(),
});

interface CreateBefehlsgeberVorschlagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBefehlsgeberVorschlagDto) => void;
  isSubmitting: boolean;
}

/**
 * Dialog zum Erstellen eines neuen Befehlsgeber-Vorschlags.
 */
export const CreateBefehlsgeberVorschlagDialog = ({ isOpen, onClose, onSubmit, isSubmitting }: CreateBefehlsgeberVorschlagDialogProps) => {
  const form = useForm({
    defaultValues: {
      kuerzel: '',
      label: '',
      sortOrder: 0,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onBlur: createBefehlsgeberVorschlagSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit({
        kuerzel: value.kuerzel,
        label: value.label,
        sortOrder: value.sortOrder ?? 0,
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
      <Dialog.Title>Neuen Befehlsgeber-Vorschlag erstellen</Dialog.Title>

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
                <FormField label="Kürzel" error={field.state.meta.errors[0]} required htmlFor="create-befehlsgeber-vorschlag-kuerzel">
                  <Input
                    id="create-befehlsgeber-vorschlag-kuerzel"
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
                <FormField label="Label" error={field.state.meta.errors[0]} required htmlFor="create-befehlsgeber-vorschlag-label">
                  <Input
                    id="create-befehlsgeber-vorschlag-label"
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
                <FormField label="Sortierung" error={field.state.meta.errors[0]} htmlFor="create-befehlsgeber-vorschlag-sort-order">
                  <Input
                    id="create-befehlsgeber-vorschlag-sort-order"
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
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isFormSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isFormSubmitting || isSubmitting} loading={isSubmitting || isFormSubmitting}>
                Vorschlag erstellen
              </Button>
            )}
          </form.Subscribe>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
};
