import { useEinsaetze } from '@/hooks/useEinsaetze';
import { Button } from '@atoms/button.atom';
import { DateInput } from '@atoms/date-input.atom';
import { Input } from '@atoms/input.atom';
import { Textarea } from '@atoms/textarea.atom';
import { FormFieldWrapper } from '@molecules/form/FormFieldWrapper';
import { SlideInPanel } from '@molecules/layout/slide-in-panel.molecule';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

// Schema für minimale Einsatz-Erstellung (alle Felder optional)
const createEinsatzSchema = z.object({
  alarmstichwort: z.string().optional(),
  beschreibung: z.string().optional(),
  ort: z.string().optional(),
  datum: z.string().optional(),
});

type CreateEinsatzFormData = z.infer<typeof createEinsatzSchema>;

interface EinsatzCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (einsatzId: string) => void;
}

export function EinsatzCreateForm({ isOpen, onClose, onSuccess }: EinsatzCreateFormProps) {
  const navigate = useNavigate();
  const { createEinsatz } = useEinsaetze();

  const form = useForm({
    defaultValues: {
      alarmstichwort: '',
      beschreibung: '',
      ort: '',
      datum: new Date().toISOString().split('T')[0], // Heutiges Datum als Default
    } as CreateEinsatzFormData,
    onSubmit: async ({ value }) => {
      try {
        // Optimistic UI: Toast zeigt sofort Erfolg
        const toastId = toast.loading('Einsatz wird erstellt…');

        // Filtere leere Strings raus
        const payload = Object.fromEntries(Object.entries(value).filter(([_, v]) => v && v !== ''));

        const result = await createEinsatz.mutateAsync(payload.alarmstichwort ? payload : { alarmstichwort: 'Neuer Einsatz' });

        toast.success('Einsatz erfolgreich erstellt!', {
          id: toastId,
          action: {
            label: 'Bearbeiten',
            onClick: () => navigate({ to: `/einsaetze/${result.id}` }),
          },
        });

        // Reset form und schließe Panel
        form.reset();
        onClose();

        // Optional: Callback für Navigation
        if (onSuccess) {
          onSuccess(result.id);
        }
      } catch (error) {
        toast.error('Fehler beim Erstellen des Einsatzes', {
          description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
      }
    },
  });

  // Keyboard Shortcut: Enter zum Absenden
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        form.handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, form]);

  // Reset form wenn Panel geschlossen wird
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const handleClose = useCallback(() => {
    form.reset();
    onClose();
  }, [form, onClose]);

  return (
    <SlideInPanel
      isOpen={isOpen}
      onClose={handleClose}
      title="Neuen Einsatz erstellen"
      description="Erstelle schnell einen neuen Einsatz. Alle Felder sind optional - Details können später ergänzt werden."
      size="lg"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        {/* Alarmstichwort */}
        <form.Field name="alarmstichwort">
          {(field) => (
            <FormFieldWrapper field={field} label="Alarmstichwort" optional>
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
        <form.Field name="ort">
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
        <form.Field name="datum">
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button type="submit" variant="primary" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? 'Erstelle...' : 'Einsatz erstellen'}
          </Button>
        </div>

        {/* Keyboard Hint */}
        <div className="text-xs text-gray-500 text-center">
          <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter</kbd> zum schnellen
          Erstellen
        </div>
      </form>
    </SlideInPanel>
  );
}
