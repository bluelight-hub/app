import { useCreateEinsatz } from '@/features/einsatz';
import { Button } from '@/shared/ui/atoms/button.atom';
import { DateInput } from '@/shared/ui/atoms/date-input.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import type { CreateEinsatzDto } from '@/shared';
import { FormFieldWrapper } from '@/shared/ui/molecules/form/FormFieldWrapper';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useForm } from '@tanstack/react-form';
import { useCallback, useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import { z } from 'zod';

const alarmstichwortSchema = z.string().trim().min(1, 'Alarmstichwort ist erforderlich.');

// Schema für minimale Einsatz-Erstellung mit fachlicher Pflichtangabe
const createEinsatzSchema = z.object({
  alarmstichwort: z.string(),
  beschreibung: z.string().optional(),
  einsatzort: z.string().optional(),
  // Im Formular als ISO-String, später in Date konvertiert
  alarmierungszeit: z.string().optional(),
});

type CreateEinsatzFormData = z.infer<typeof createEinsatzSchema>;

interface EinsatzCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (einsatzId: string) => void | Promise<void>;
}

export function EinsatzCreateForm({ isOpen, onClose, onSuccess }: EinsatzCreateFormProps) {
  const createEinsatz = useCreateEinsatz();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      alarmstichwort: '',
      beschreibung: '',
      einsatzort: '',
      alarmierungszeit: new Date().toISOString(),
    } as CreateEinsatzFormData,
    validators: {
      onSubmit: createEinsatzSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        setSubmitError(null);
        // Optimistic UI: Toast zeigt sofort Erfolg
        const toastId = toast.loading('Einsatz wird erstellt…');

        // Werte für API-Payload aufbereiten (Trim + Typwandlung)
        const payload: CreateEinsatzDto = {};
        payload.alarmstichwort = value.alarmstichwort.trim();
        if (value.beschreibung && value.beschreibung.trim() !== '') payload.beschreibung = value.beschreibung.trim();
        if (value.einsatzort && value.einsatzort.trim() !== '') payload.einsatzort = value.einsatzort.trim();
        if (value.alarmierungszeit && value.alarmierungszeit !== '') {
          const d = new Date(value.alarmierungszeit);
          if (!Number.isNaN(d.valueOf())) payload.alarmierungszeit = d;
        }

        const result = await createEinsatz.mutateAsync(payload);

        // Validierung: Prüfe ob result und result.id existieren
        if (!result || !result.id) {
          console.error('Invalid mutation result:', result);
          throw new Error(`Ungültige Server-Antwort: Einsatz-ID fehlt (result: ${JSON.stringify(result)})`);
        }

        // Optional: Callback für Navigation
        if (onSuccess) {
          await onSuccess(result.id);
        }

        toast.success('Einsatz erfolgreich erstellt.', { id: toastId });

        // Reset form und schließe Panel (nach success callbacks)
        // setTimeout verhindert "Editor disposed" Fehler
        setTimeout(() => {
          setSubmitError(null);
          form.reset();
          onClose();
        }, 0);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        setSubmitError(errorMessage);
        toast.error('Fehler beim Erstellen des Einsatzes', {
          description: errorMessage,
        });
      }
    },
  });

  const handleClose = useCallback(() => {
    setSubmitError(null);
    form.reset();
    onClose();
  }, [form, onClose]);

  useHotkeys('esc', handleClose, {
    enabled: isOpen,
    preventDefault: true,
  });

  useHotkeys(
    'mod+enter',
    () => {
      form.handleSubmit();
    },
    [form],
    {
      enabled: isOpen,
      preventDefault: true,
    },
  );

  // Reset form wenn Panel geschlossen wird
  useEffect(() => {
    if (!isOpen) {
      setSubmitError(null);
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Dialog.SlideIn
      isOpen={isOpen}
      onClose={handleClose}
      title="Neuen Einsatz erstellen"
      description="Erstelle schnell einen neuen Einsatz. Das Alarmstichwort ist verpflichtend; weitere Details können direkt danach ergänzt werden."
      size="lg"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        {/* Alarmstichwort */}
        <form.Field
          name="alarmstichwort"
          validators={{
            onBlur: ({ value }) => {
              const result = alarmstichwortSchema.safeParse(value);
              return result.success ? undefined : result.error.issues[0]?.message;
            },
            onSubmit: ({ value }) => {
              const result = alarmstichwortSchema.safeParse(value);
              return result.success ? undefined : result.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <FormFieldWrapper field={field} label="Alarmstichwort" required>
              <Input
                id={field.name}
                type="text"
                placeholder="z.B. B1 - Wohnungsbrand"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
                autoFocus
              />
            </FormFieldWrapper>
          )}
        </form.Field>

        {/* Ort */}
        <form.Field name="einsatzort">
          {(field) => (
            <FormFieldWrapper field={field} label="Einsatzort" optional>
              <Input
                id={field.name}
                type="text"
                placeholder="z.B. Hauptstraße 42, 12345 Musterstadt"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </FormFieldWrapper>
          )}
        </form.Field>

        {/* Beschreibung */}
        <form.Field name="beschreibung">
          {(field) => (
            <FormFieldWrapper field={field} label="Beschreibung" optional>
              <Textarea
                id={field.name}
                placeholder="Zusätzliche Informationen zum Einsatz..."
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </FormFieldWrapper>
          )}
        </form.Field>

        {/* Datum */}
        <form.Field name="alarmierungszeit">
          {(field) => (
            <FormFieldWrapper field={field} label="Einsatzdatum" optional>
              <DateInput
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(date) => field.handleChange(date ? date.toISOString() : '')}
                className="mt-1"
                showIcon={true}
                includeTime={true}
                showNatoFormat={true}
              />
            </FormFieldWrapper>
          )}
        </form.Field>

        {(form.state.isSubmitting || submitError) && (
          <div className="space-y-2">
            {form.state.isSubmitting && (
              <output aria-live="polite" className="block text-gray-600 text-sm dark:text-gray-300">
                Einsatz wird erstellt…
              </output>
            )}
            {submitError && (
              <p role="alert" className="text-red-600 text-sm dark:text-red-400">
                {submitError}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button onClick={handleClose} intent="secondary" appearance="ghost">
            Abbrechen
          </Button>
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? 'Erstelle...' : 'Einsatz erstellen'}
          </Button>
        </div>

        {/* Keyboard Hint */}
        <div className="text-center text-gray-500 text-xs">
          <kbd className="rounded-lg border border-gray-200 bg-gray-100 px-2 py-1 font-semibold text-gray-800 text-xs">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter</kbd> zum schnellen
          Erstellen
        </div>
      </form>
    </Dialog.SlideIn>
  );
}
