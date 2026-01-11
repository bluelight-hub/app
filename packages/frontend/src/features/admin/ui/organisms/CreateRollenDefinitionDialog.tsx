import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import type { CreateRollenDefinitionDto, QualifikationDto } from '@/shared';
import { useAdminQualifikationenManagement } from '@/features/admin/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { Text } from '@/shared/ui/atoms/text.atom';

/**
 * Zod-Schema für CreateRollenDefinition Form.
 */
const createRollenDefinitionSchema = z.object({
  name: z.string().min(3, 'Name muss mindestens 3 Zeichen haben'),
  funkrufname: z.string().optional(),
  beschreibung: z.string().optional(),
  qualifikationIds: z.array(z.string()),
});

interface CreateRollenDefinitionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRollenDefinitionDto) => void;
  isSubmitting: boolean;
}

/**
 * Dialog zum Erstellen einer neuen Rollendefinition.
 *
 * Ermoeglicht die Zuordnung von erforderlichen Qualifikationen zur Rolle.
 */
export const CreateRollenDefinitionDialog = ({ isOpen, onClose, onSubmit, isSubmitting }: CreateRollenDefinitionDialogProps) => {
  // Lade aktive Qualifikationen fuer Multi-Select
  const { qualifikationen, isLoading: isLoadingQualifikationen } = useAdminQualifikationenManagement({ istAktiv: true });

  const form = useForm({
    defaultValues: {
      name: '',
      funkrufname: '',
      beschreibung: '',
      qualifikationIds: [] as string[],
    },
    validatorAdapter: zodValidator(),
    validators: {
      onBlur: createRollenDefinitionSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit({
        name: value.name,
        funkrufname: value.funkrufname || undefined,
        beschreibung: value.beschreibung || undefined,
        qualifikationIds: value.qualifikationIds,
      });
    },
  });

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };

  /**
   * Toggle Qualifikation in der Auswahl.
   */
  const toggleQualifikation = (qualifikationId: string, currentIds: string[]) => {
    if (currentIds.includes(qualifikationId)) {
      return currentIds.filter((id) => id !== qualifikationId);
    }
    return [...currentIds, qualifikationId];
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <Dialog.Title>Neue Rollendefinition erstellen</Dialog.Title>

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
                <FormField label="Name" error={field.state.meta.errors[0]} required htmlFor="create-rollendefinition-name">
                  <Input
                    id="create-rollendefinition-name"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="z.B. Einsatzleiter"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            {/* Funkrufname */}
            <form.Field name="funkrufname">
              {(field) => (
                <FormField label="Funkrufname" htmlFor="create-rollendefinition-funkrufname">
                  <Input
                    id="create-rollendefinition-funkrufname"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="z.B. EL Florian"
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            {/* Beschreibung */}
            <form.Field name="beschreibung">
              {(field) => (
                <FormField label="Beschreibung" htmlFor="create-rollendefinition-beschreibung">
                  <Textarea
                    id="create-rollendefinition-beschreibung"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Optionale Beschreibung der Rolle"
                    rows={3}
                  />
                </FormField>
              )}
            </form.Field>

            {/* Erforderliche Qualifikationen */}
            <form.Field name="qualifikationIds">
              {(field) => (
                <FormField label="Erforderliche Qualifikationen" htmlFor="create-rollendefinition-qualifikationen">
                  <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    {isLoadingQualifikationen ? (
                      <Text className="text-gray-500 text-sm">Qualifikationen werden geladen...</Text>
                    ) : qualifikationen && qualifikationen.length > 0 ? (
                      qualifikationen.map((qualifikation: QualifikationDto) => (
                        <label
                          key={qualifikation.id}
                          htmlFor={`create-qualifikation-${qualifikation.id}`}
                          className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Checkbox
                            id={`create-qualifikation-${qualifikation.id}`}
                            checked={field.state.value.includes(qualifikation.id)}
                            onChange={() => field.handleChange(toggleQualifikation(qualifikation.id, field.state.value))}
                          />
                          <span className="font-mono text-gray-600 text-sm dark:text-gray-400">{qualifikation.abkuerzung}</span>
                          <span className="text-gray-900 text-sm dark:text-gray-100">{qualifikation.name}</span>
                        </label>
                      ))
                    ) : (
                      <Text className="text-gray-500 text-sm">Keine aktiven Qualifikationen vorhanden.</Text>
                    )}
                  </div>
                  {field.state.value.length > 0 && <Text className="mt-1 text-gray-500 text-xs">{field.state.value.length} Qualifikation(en) ausgewählt</Text>}
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
                Rollendefinition erstellen
              </Button>
            )}
          </form.Subscribe>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
};
