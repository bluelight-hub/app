import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Label } from '@/shared/ui/atoms/label.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useUpdateEtbEntry } from '@/features/etb';
import { EintragDtoKategorieEnum as EtbKategorie, type EintragDto } from '@/shared';
import { EtbKategorieSelect } from './EtbKategorieSelect';
import { useForm } from '@tanstack/react-form';
import { format, isValid } from 'date-fns';
import { useEffect } from 'react';
import { PiX } from 'react-icons/pi';
import { z } from 'zod';

const editEtbEntrySchema = z.object({
  kategorie: z.nativeEnum(EtbKategorie),
  text: z.string().min(1, 'Text ist erforderlich').max(2000, 'Maximal 2000 Zeichen'),
  timestamp: z.string().min(1, 'Zeitstempel ist erforderlich'),
});

type EditEtbEntryFormData = z.infer<typeof editEtbEntrySchema>;

interface EditEtbEntryModalProps {
  entry: (EintragDto & { etbId: string }) | null;
  isOpen: boolean;
  onClose: () => void;
  /** Callback nach erfolgreicher Bearbeitung (Story 3.4) */
  onEditSuccess?: (entry: EintragDto) => void;
  /** Geteilte Update-Mutation vom Workspace (für Sync-Status-Integration) */
  updateMutation?: ReturnType<typeof useUpdateEtbEntry>;
}

function formatTimestampInput(timestamp: string | Date | null | undefined) {
  const parsedDate = timestamp ? new Date(timestamp) : new Date();
  const safeDate = isValid(parsedDate) ? parsedDate : new Date();
  return format(safeDate, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Modal zum Bearbeiten von ETB-Einträgen
 *
 * Ermöglicht das Ändern von:
 * - Text (Nachricht)
 * - Zeitstempel
 * - Kategorie
 */
export function EditEtbEntryModal({ entry, isOpen, onClose, onEditSuccess, updateMutation }: EditEtbEntryModalProps) {
  const internalUpdateEintrag = useUpdateEtbEntry();
  const updateEintrag = updateMutation ?? internalUpdateEintrag;

  const form = useForm({
    defaultValues: {
      kategorie: entry?.kategorie || EtbKategorie.Lage,
      text: entry?.text || '',
      timestamp: formatTimestampInput(entry?.timestamp),
    } as EditEtbEntryFormData,
    validators: {
      onSubmit: editEtbEntrySchema,
    },
    onSubmit: async ({ value }) => {
      if (!entry) return;

      try {
        await updateEintrag.mutateAsync({
          etbId: entry.etbId,
          eintragId: entry.id,
          data: {
            // Backend erwartet nur newText (UpdateEintragDto)
            newText: value.text.trim(),
          },
        });

        onEditSuccess?.(entry);
        onClose();
      } catch (_error) {
        // Error handling durch TanStack Query
      }
    },
  });

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      form.reset({
        kategorie: entry.kategorie,
        text: entry.text,
        timestamp: formatTimestampInput(entry.timestamp),
      });
    }
  }, [entry, form]);

  if (!entry) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-surface-inverse/30" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-2xl rounded-panel border border-border-subtle bg-surface-panel p-6 shadow-xl">
          {/* Header */}
          <div className="mb-4 flex items-start justify-between">
            <div>
              <DialogTitle className="font-semibold text-lg text-text-primary">Eintrag bearbeiten</DialogTitle>
              <p className="mt-1 text-sm text-text-secondary">
                Eintrag #{entry.sequenceNumber} {entry.version > 1 && `(Version ${entry.version})`}
              </p>
            </div>
            <IconButton appearance="minimal" onClick={onClose} className="text-text-muted hover:text-text-secondary" aria-label="Schließen">
              <PiX className="h-5 w-5" />
            </IconButton>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="space-y-4">
              {/* Kategorie */}
              <form.Field name="kategorie">{(field) => <EtbKategorieSelect value={field.state.value} onChange={field.handleChange} error={field.state.meta.errors?.[0]?.message} />}</form.Field>

              {/* Zeitstempel */}
              <form.Field name="timestamp">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="timestamp">Zeitstempel</Label>
                    <Input
                      id="timestamp"
                      type="datetime-local"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    />
                    {field.state.meta.errors.length > 0 && <p className="text-sm text-status-danger-text">{field.state.meta.errors[0]?.message}</p>}
                  </div>
                )}
              </form.Field>

              {/* Text */}
              <form.Field name="text">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="text">Nachricht</Label>
                    <Textarea
                      id="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      rows={6}
                      maxLength={2000}
                      variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                      className="resize-none"
                      placeholder="Eintrag..."
                    />
                    <div className="flex items-center justify-between">
                      {field.state.meta.errors.length > 0 && <p className="text-sm text-status-danger-text">{field.state.meta.errors[0]?.message}</p>}
                      <p className="ml-auto text-text-secondary text-xs">{field.state.value.length} / 2000 Zeichen</p>
                    </div>
                  </div>
                )}
              </form.Field>

              {/* Actions */}
              <form.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting || updateEintrag.isPending}
                      className="rounded-lg border border-border-subtle bg-surface-panel px-4 py-2 font-medium text-sm text-text-secondary transition-colors hover:bg-action-secondary hover:text-text-primary focus-visible:shadow-focus-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={!canSubmit || isSubmitting || updateEintrag.isPending}
                      className="rounded-lg bg-action-primary px-4 py-2 font-medium text-sm text-text-inverse transition-colors hover:bg-action-primary-hover focus-visible:shadow-focus-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting || updateEintrag.isPending ? 'Speichern...' : 'Speichern'}
                    </button>
                  </div>
                )}
              </form.Subscribe>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
