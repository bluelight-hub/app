import { useAvailablePermissions } from '@/features/admin/api/use-available-permissions';
import { Button } from '@/shared/ui/atoms/button.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Select } from '@/shared/ui/atoms/select.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { useEffect, useMemo } from 'react';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
const grantPermissionSchema = z.object({ domain: z.string().min(1, 'Domain ist erforderlich'), action: z.string().min(1, 'Aktion ist erforderlich') });
interface GrantPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGrant: (permission: string) => void;
  isGranting: boolean;
  existingPermissions: string[];
  username: string;
} /** * Dialog zum Gewaehren einer neuen Custom Permission. * * Story 5.2 AC1: Domain-Select + Action-Select aus Available Permissions * mit Duplikat-Check (bereits vergebene Permissions ausgeschlossen). */
export function GrantPermissionDialog({ isOpen, onClose, onGrant, isGranting, existingPermissions, username }: GrantPermissionDialogProps) {
  const { data: available, isLoading } = useAvailablePermissions();
  const form = useForm({
    defaultValues: { domain: '', action: '' },
    validatorAdapter: zodValidator(),
    validators: { onBlur: grantPermissionSchema },
    onSubmit: ({ value }) => {
      const permission = `${value.domain}:${value.action}`;
      if (!existingPermissions.includes(permission)) {
        onGrant(permission);
      }
    },
  }); /** Formular zuruecksetzen wenn Dialog geoeffnet wird */
  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);
  const selectedDomain = useStore(form.store, (state) => state.values.domain);
  const selectedAction = useStore(form.store, (state) => state.values.action); /** Verfuegbare Actions fuer gewaehlte Domain (ohne bereits vergebene) */
  const availableActions = useMemo(() => {
    if (!selectedDomain || !available) return [];
    const domainEntry = available.find((a) => a.domain === selectedDomain);
    if (!domainEntry) return [];
    return domainEntry.actions.filter((action) => !existingPermissions.includes(`${selectedDomain}:${action}`));
  }, [selectedDomain, available, existingPermissions]);
  const permission = selectedDomain && selectedAction ? `${selectedDomain}:${selectedAction}` : '';
  const isDuplicate = existingPermissions.includes(permission);
  const handleClose = () => {
    if (isGranting) return;
    form.reset();
    onClose();
  }; /** Domain-Optionen fuer das Select */
  const domainOptions = useMemo(() => (available ?? []).map((a) => ({ value: a.domain, label: `${a.domain} - ${a.description}` })), [available]); /** Action-Optionen fuer das Select */
  const actionOptions = useMemo(() => availableActions.map((action) => ({ value: action, label: `${selectedDomain}:${action}` })), [availableActions, selectedDomain]);
  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      {' '}
      <Dialog.Title>Permission vergeben an {username}</Dialog.Title>{' '}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        {' '}
        <Dialog.Body>
          {' '}
          {isLoading ? (
            <div className="flex items-center gap-2 py-4">
              {' '}
              <Spinner size="sm" /> <span className="text-sm text-text-muted">Verfuegbare Permissions laden...</span>{' '}
            </div>
          ) : (
            <div className="space-y-4">
              {' '}
              <form.Field name="domain">
                {' '}
                {(field) => (
                  <FormField label="Domain" required error={field.state.meta.errors[0]} htmlFor="grant-perm-domain">
                    {' '}
                    <Select
                      id="grant-perm-domain"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        form.setFieldValue('action', '');
                      }}
                      options={domainOptions}
                      placeholder="Domain waehlen..."
                      variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                      fullWidth
                    />{' '}
                  </FormField>
                )}{' '}
              </form.Field>{' '}
              {selectedDomain && (
                <form.Field name="action">
                  {' '}
                  {(field) => (
                    <FormField label="Aktion" required error={field.state.meta.errors[0]} htmlFor="grant-perm-action">
                      {' '}
                      <Select
                        id="grant-perm-action"
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        options={actionOptions}
                        placeholder="Aktion waehlen..."
                        variant={field.state.meta.errors.length > 0 ? 'error' : 'default'}
                        fullWidth
                      />{' '}
                      {availableActions.length === 0 && selectedDomain && <p className="mt-1 text-sm text-text-muted">Alle Aktionen dieser Domain sind bereits vergeben.</p>}{' '}
                    </FormField>
                  )}{' '}
                </form.Field>
              )}{' '}
            </div>
          )}{' '}
        </Dialog.Body>{' '}
        <Dialog.Footer>
          {' '}
          <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isGranting}>
            {' '}
            Abbrechen{' '}
          </Button>{' '}
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {' '}
            {([canSubmit, isFormSubmitting]) => {
              const submitting = isFormSubmitting || isGranting;
              return (
                <Button type="submit" disabled={!canSubmit || !permission || isDuplicate || submitting} loading={submitting}>
                  {' '}
                  Permission vergeben{' '}
                </Button>
              );
            }}{' '}
          </form.Subscribe>{' '}
        </Dialog.Footer>{' '}
      </form>{' '}
    </Dialog>
  );
}
