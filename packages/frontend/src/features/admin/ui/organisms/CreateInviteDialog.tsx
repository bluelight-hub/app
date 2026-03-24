import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { PiCheck, PiCopy } from 'react-icons/pi';

import type { CreateInviteDto } from '@/shared';
import { useCreateInvite } from '@/features/admin/api/use-admin-invite-management';
import { createInviteSchema } from '@/features/admin/schemas';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

interface CreateInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Dialog zum Erstellen eines neuen Invite-Codes.
 *
 * Zeigt ein Formular mit:
 * - Label (optional, max 100 Zeichen)
 * - Ablaufdatum (optional, Default: 7 Tage)
 * - Max Uses (optional, Default: 1)
 *
 * Nach erfolgreicher Erstellung wird der vollständige Code
 * in einem kopierbaren Format angezeigt.
 */
function getDefaultExpiresAt(): string {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 16);
}

export const CreateInviteDialog = ({ isOpen, onClose }: CreateInviteDialogProps) => {
  const createInviteMutation = useCreateInvite();
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm({
    defaultValues: {
      label: '',
      expiresAt: getDefaultExpiresAt(),
      maxUses: undefined as number | undefined,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onBlur: createInviteSchema,
    },
    onSubmit: async ({ value }) => {
      const dto: CreateInviteDto = {
        // Leerer String -> undefined -> Backend-Default (7 Tage)
        expiresAt: value.expiresAt || undefined,
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

  if (createdCode) {
    return (
      <Dialog isOpen={isOpen} onClose={handleClose}>
        <Dialog.Title>Invite-Code erstellt</Dialog.Title>
        <Dialog.Body>
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">Der Invite-Code wurde erfolgreich erstellt. Kopiere ihn jetzt, da er später nur maskiert angezeigt wird.</p>
            <div className="rounded-panel border-2 border-status-success-border bg-status-success-surface p-4">
              <div className="mb-2 font-medium text-text-secondary text-sm">Invite-Code:</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-control bg-surface-panel px-3 py-2 font-bold font-mono text-status-success-text text-lg">{createdCode}</code>
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

            <form.Field name="expiresAt">
              {(field) => (
                <FormField label="Ablaufdatum" helperText="Standard: 7 Tage ab jetzt" error={field.state.meta.errors[0]} htmlFor="create-invite-expires">
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
