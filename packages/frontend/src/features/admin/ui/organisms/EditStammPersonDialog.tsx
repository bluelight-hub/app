import { useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import type { StammPersonDto, UpdateStammPersonDto, QualifikationDto } from '@/shared';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Badge } from '@/shared/ui/atoms/badge.atom';

/**
 * Zod-Schema für UpdateStammPerson Form.
 * Hinweis: personalnummer ist IMMUTABLE und kann nicht geändert werden.
 */
const updateStammPersonSchema = z.object({
  vorname: z.string().min(2, 'Vorname muss mindestens 2 Zeichen haben').max(100, 'Vorname darf maximal 100 Zeichen haben'),
  nachname: z.string().min(2, 'Nachname muss mindestens 2 Zeichen haben').max(100, 'Nachname darf maximal 100 Zeichen haben'),
  funkkenungBOS: z.string().min(2, 'BOS-Funkkennung muss mindestens 2 Zeichen haben').max(50, 'BOS-Funkkennung darf maximal 50 Zeichen haben').optional().or(z.literal('')),
  qualifikationIds: z.array(z.string()).max(50, 'Maximal 50 Qualifikationen erlaubt').optional(),
});

interface EditStammPersonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateStammPersonDto) => void;
  isSubmitting: boolean;
  person: StammPersonDto | null;
  qualifikationen: QualifikationDto[];
  qualifikationenLoading: boolean;
}

/**
 * Dialog zum Bearbeiten einer Stamm-Person.
 * Hinweis: Personalnummer kann nicht geändert werden (IMMUTABLE).
 */
export const EditStammPersonDialog = ({ isOpen, onClose, onSubmit, isSubmitting, person, qualifikationen, qualifikationenLoading }: EditStammPersonDialogProps) => {
  const form = useForm({
    defaultValues: {
      vorname: person?.vorname || '',
      nachname: person?.nachname || '',
      funkkenungBOS: person?.funkkenungBOS || '',
      qualifikationIds: person?.qualifikationen.map((q) => q.id) || [],
    },
    validatorAdapter: zodValidator(),
    validators: {
      onBlur: updateStammPersonSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit({
        vorname: value.vorname,
        nachname: value.nachname,
        funkkenungBOS: value.funkkenungBOS || undefined,
        qualifikationIds: value.qualifikationIds,
      });
    },
  });

  // Sync form values when person changes
  useEffect(() => {
    if (person) {
      form.reset();
      form.setFieldValue('vorname', person.vorname);
      form.setFieldValue('nachname', person.nachname);
      form.setFieldValue('funkkenungBOS', person.funkkenungBOS || '');
      form.setFieldValue(
        'qualifikationIds',
        person.qualifikationen.map((q) => q.id),
      );
    }
  }, [person, form]);

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };

  // Filter nur aktive Qualifikationen
  const activeQualifikationen = qualifikationen.filter((q) => q.istAktiv);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <Dialog.Title>Person bearbeiten</Dialog.Title>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <Dialog.Body>
          <div className="space-y-4">
            {/* Personalnummer (IMMUTABLE - nur anzeigen) */}
            {person && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <Text size="sm" color="muted" className="mb-1">
                  Personalnummer (nicht änderbar)
                </Text>
                <Badge variant="info">{person.personalnummer}</Badge>
              </div>
            )}

            {/* Vorname */}
            <form.Field name="vorname">
              {(field) => (
                <FormField label="Vorname" error={field.state.meta.errors[0]} required htmlFor="edit-person-vorname">
                  <Input
                    id="edit-person-vorname"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="z.B. Max"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            {/* Nachname */}
            <form.Field name="nachname">
              {(field) => (
                <FormField label="Nachname" error={field.state.meta.errors[0]} required htmlFor="edit-person-nachname">
                  <Input
                    id="edit-person-nachname"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="z.B. Mustermann"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            {/* BOS-Funkkennung */}
            <form.Field name="funkkenungBOS">
              {(field) => (
                <FormField label="BOS-Funkkennung" error={field.state.meta.errors[0]} htmlFor="edit-person-funkkenungbos">
                  <Input
                    id="edit-person-funkkenungbos"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Optionale BOS-Funkkennung"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            {/* Qualifikationen Multi-Select */}
            <form.Field name="qualifikationIds">
              {(field) => (
                <FormField label="Qualifikationen" error={field.state.meta.errors[0]} htmlFor="edit-person-qualifikationen">
                  {qualifikationenLoading ? (
                    <Text size="sm" color="muted">
                      Lädt Qualifikationen...
                    </Text>
                  ) : activeQualifikationen.length === 0 ? (
                    <Text size="sm" color="muted">
                      Keine aktiven Qualifikationen verfügbar.
                    </Text>
                  ) : (
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      {activeQualifikationen.map((qual) => (
                        <label key={qual.id} htmlFor={`edit-person-qual-${qual.id}`} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <Checkbox
                            id={`edit-person-qual-${qual.id}`}
                            checked={field.state.value.includes(qual.id)}
                            onChange={(checked) => {
                              const newValue = checked ? [...field.state.value, qual.id] : field.state.value.filter((id) => id !== qual.id);
                              field.handleChange(newValue);
                            }}
                          />
                          <span className="font-mono text-sm">{qual.abkuerzung}</span>
                          <span className="text-gray-600 text-sm dark:text-gray-400">- {qual.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
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
