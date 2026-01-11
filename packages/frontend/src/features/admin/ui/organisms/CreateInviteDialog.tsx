import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import type { CreateInviteDto } from '@/shared';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { useCreateInvite } from '@/features/admin/api/use-admin-invite-management';
import { createInviteSchema } from '@/features/admin/schemas';
import { useState } from 'react';
import { PiCheck, PiCopy } from 'react-icons/pi';

interface CreateInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Dialog zum Erstellen eines neuen Invite-Codes.
 *
 * Zeigt ein Formular mit:
 * - Label (optional, max 100 Zeichen)
 * - Ablaufdatum (required, datetime-local input)
 * - Max Uses (optional, number 1-100)
 *
 * Nach erfolgreicher Erstellung wird der vollständige Code
 * in einem kopierbaren Format angezeigt.
 */
export const CreateInviteDialog = ({ isOpen, onClose }: CreateInviteDialogProps) => {
  const createInviteMutation = useCreateInvite();
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm({
    defaultValues: {
      label: '',
      expiresAt: '',
      maxUses: undefined as number | undefined,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onBlur: createInviteSchema,
    },
    onSubmit: async ({ value }) => {
      const dto: CreateInviteDto = {
        expiresAt: value.expiresAt,
        label: value.label || undefined,
        maxUses: value.maxUses,
      };

      createInviteMutation.mutate(dto, {
        onSuccess: (response) => {
          setCreatedCode(response.data?.code || null);
        },
      });
    },
  });

  const handleClose = () => {
    if (!createInviteMutation.isPending) {
      form.reset();
      setCreatedCode(null);
      setCopied(false);
      onClose();
    }
  };

  const handleCopyCode = async () => {
    if (createdCode) {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Success View: Show created code
  if (createdCode) {
    return (
      <Dialog isOpen={isOpen} onClose={handleClose}>
        <Dialog.Title>Invite-Code erstellt</Dialog.Title>
        <Dialog.Body>
          <div className="space-y-4">
            <p className="text-gray-700 text-sm dark:text-gray-300">Der Invite-Code wurde erfolgreich erstellt. Kopiere ihn jetzt, da er später nur maskiert angezeigt wird.</p>
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
              <div className="mb-2 font-medium text-gray-700 text-sm dark:text-gray-300">Invite-Code:</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-3 py-2 font-bold font-mono text-green-700 text-lg dark:bg-gray-800 dark:text-green-400">{createdCode}</code>
                <Button intent="secondary" size="sm" onClick={handleCopyCode} aria-label="Code kopieren">
                  {copied ? <PiCheck className="h-5 w-5" /> : <PiCopy className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button onClick={handleClose}>Schließen</Button>
        </Dialog.Footer>
      </Dialog>
    );
  }

  // Form View: Create new invite
  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <Dialog.Title>Neuer Invite-Code</Dialog.Title>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <Dialog.Body>
          <div className="space-y-4">
            {/* Label */}
            <form.Field name="label">
              {(field) => (
                <FormField label="Label" error={field.state.meta.errors[0]} htmlFor="create-invite-label">
                  <Input
                    id="create-invite-label"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="z.B. Neue Mitglieder 2025"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            {/* Ablaufdatum */}
            <form.Field name="expiresAt">
              {(field) => (
                <FormField label="Ablaufdatum" error={field.state.meta.errors[0]} required htmlFor="create-invite-expires">
                  <Input
                    id="create-invite-expires"
                    type="datetime-local"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                  />
                </FormField>
              )}
            </form.Field>

            {/* Max Uses */}
            <form.Field name="maxUses">
              {(field) => (
                <FormField label="Maximale Nutzungen" error={field.state.meta.errors[0]} htmlFor="create-invite-maxuses">
                  <Input
                    id="create-invite-maxuses"
                    type="number"
                    name={field.name}
                    value={field.state.value ?? ''}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.handleChange(val === '' ? undefined : Number.parseInt(val, 10));
                    }}
                    placeholder="Standard: 1"
                    variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                    fullWidth
                    min={1}
                    max={100}
                  />
                </FormField>
              )}
            </form.Field>
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={createInviteMutation.isPending}>
            Abbrechen
          </Button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isFormSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isFormSubmitting || createInviteMutation.isPending} loading={createInviteMutation.isPending || isFormSubmitting}>
                Invite-Code erstellen
              </Button>
            )}
          </form.Subscribe>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
};
