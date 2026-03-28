import { Button } from '@/shared/ui/atoms/button.atom';
import { RoleField, UsernameField } from '@/features/admin/ui/molecules/UserFormFields';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { type ManagedUserResponseDto, ManagedUserResponseDtoRoleEnum } from '@/shared';
import { useForm } from '@tanstack/react-form';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { UserPermissionsPanel } from './UserPermissionsPanel.organism';
import { Combobox, type ComboboxGroup } from '@/shared/ui/headless/combobox';
import { useAdminStammPersonenManagement } from '@/features/admin/api/use-admin-stamm-personen-management';

const _editUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Benutzername muss mindestens 3 Zeichen lang sein')
    .max(30, 'Benutzername darf maximal 30 Zeichen lang sein')
    .regex(/^[a-zA-Z0-9._]+$/, 'Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Punkte enthalten'),
  role: z.nativeEnum(ManagedUserResponseDtoRoleEnum),
  operativeRole: z.enum(['FUEHRUNGSKRAFT', 'EINSATZKRAFT', 'EXTERNE']),
  stammpersonId: z.string().nullable(),
});

export type EditUserFormData = z.infer<typeof _editUserSchema>;

interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: EditUserFormData) => void;
  isSubmitting: boolean;
  user: ManagedUserResponseDto | null;
  allUsers: ManagedUserResponseDto[] | undefined;
}

type TabId = 'details' | 'permissions';

export const EditUserDialog = ({ isOpen, onClose, onSubmit, isSubmitting, user, allUsers }: EditUserDialogProps) => {
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const { stammPersonen, isLoading: isStammPersonenLoading } = useAdminStammPersonenManagement();

  const stammpersonGroups = useMemo((): ComboboxGroup[] => {
    if (!stammPersonen) return [];
    const available: Array<{ value: string; label: string }> = [];
    const assigned: Array<{ value: string; label: string }> = [];

    for (const sp of stammPersonen) {
      if (sp.archivedAt) continue;
      const label = `${sp.nachname}, ${sp.vorname} (${sp.personalnummer})`;
      const assignedUser = allUsers?.find((u) => u.stammperson?.id === sp.id && u.id !== user?.id);
      if (assignedUser) {
        assigned.push({ value: sp.id, label: `${label} → ${assignedUser.username}` });
      } else {
        available.push({ value: sp.id, label });
      }
    }

    const groups: ComboboxGroup[] = [];
    if (available.length > 0) groups.push({ label: 'Verfügbar', items: available });
    if (assigned.length > 0) groups.push({ label: 'Bereits zugewiesen', items: assigned });
    return groups;
  }, [stammPersonen, allUsers, user?.id]);

  const form = useForm({
    defaultValues: {
      username: user?.username || '',
      role: (user?.role || ManagedUserResponseDtoRoleEnum.User) as ManagedUserResponseDtoRoleEnum,
      operativeRole: (user?.operativeRole || 'EXTERNE') as 'FUEHRUNGSKRAFT' | 'EINSATZKRAFT' | 'EXTERNE',
      stammpersonId: (user?.stammperson?.id || null) as string | null,
    },
    onSubmit: ({ value }) => {
      if (user) {
        onSubmit(user.id, value);
      }
    },
  });

  // Update form when user changes
  useEffect(() => {
    if (user) {
      form.setFieldValue('username', user.username);
      form.setFieldValue('role', user.role);
      form.setFieldValue('operativeRole', (user.operativeRole || 'EXTERNE') as 'FUEHRUNGSKRAFT' | 'EINSATZKRAFT' | 'EXTERNE');
      form.setFieldValue('stammpersonId', user.stammperson?.id || null);
    }
  }, [user, form]);

  const handleClose = () => {
    // Prevent closing during form submission
    if (form.state.isSubmitting || isSubmitting) {
      return;
    }
    form.reset();
    setActiveTab('details');
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="relative">
        <Dialog.Title>Benutzer bearbeiten</Dialog.Title>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 px-6 dark:border-gray-700" role="tablist" aria-label="Benutzer-Abschnitte">
        <button
          type="button"
          role="tab"
          id="tab-details"
          aria-controls="panel-details"
          aria-selected={activeTab === 'details'}
          onClick={() => setActiveTab('details')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'details' ? 'border-action-primary text-action-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          Details
        </button>
        <button
          type="button"
          role="tab"
          id="tab-permissions"
          aria-controls="panel-permissions"
          aria-selected={activeTab === 'permissions'}
          onClick={() => setActiveTab('permissions')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'permissions' ? 'border-action-primary text-action-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          Berechtigungen
        </button>
      </div>

      {activeTab === 'details' ? (
        <div id="panel-details" role="tabpanel" aria-labelledby="tab-details">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <Dialog.Body>
              <div className="space-y-4">
                <form.Field name="username">{(field) => <UsernameField field={field} />}</form.Field>

                <form.Field name="role">{(field) => <RoleField field={field} />}</form.Field>

                {/* Trennlinie */}
                <div className="relative border-t border-gray-200 pt-6 dark:border-gray-700">
                  <span className="absolute -top-3 left-0 bg-white px-2 text-xs font-medium tracking-wide text-text-muted uppercase dark:bg-gray-800">Operative Einstellungen</span>
                </div>

                {/* Operative Rolle */}
                <form.Field name="operativeRole">
                  {(field) => (
                    <div className="space-y-1">
                      <label htmlFor="operativeRole" className="block text-sm font-medium text-text-primary">
                        Operative Rolle
                      </label>
                      <select
                        id="operativeRole"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value as 'FUEHRUNGSKRAFT' | 'EINSATZKRAFT' | 'EXTERNE')}
                        onBlur={field.handleBlur}
                        className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-600"
                      >
                        <option value="EXTERNE">Externe</option>
                        <option value="EINSATZKRAFT">Einsatzkraft</option>
                        <option value="FUEHRUNGSKRAFT">Führungskraft</option>
                      </select>
                      <p className="text-xs text-text-muted">Bestimmt den Zugriff auf Einsätze und operative Funktionen</p>
                    </div>
                  )}
                </form.Field>

                {/* Stammperson Combobox */}
                <form.Field name="stammpersonId">
                  {(field) => (
                    <div className="space-y-1">
                      <Combobox
                        label="Stammperson"
                        groups={stammpersonGroups}
                        value={field.state.value || ''}
                        onChange={(value) => field.handleChange(value || null)}
                        onBlur={field.handleBlur}
                        placeholder="Stammperson suchen..."
                        helperText="Führungskräfte und Einsatzkräfte benötigen eine zugewiesene Stammperson"
                        disabled={isStammPersonenLoading}
                      />
                    </div>
                  )}
                </form.Field>

                {/* Warnung bei fehlender Stammperson */}
                <form.Subscribe selector={(state) => state.values}>
                  {(values) => {
                    const requiresStammperson = values.operativeRole === 'FUEHRUNGSKRAFT' || values.operativeRole === 'EINSATZKRAFT';
                    if (requiresStammperson && !values.stammpersonId) {
                      return (
                        <div className="rounded-md border border-orange-500/30 bg-orange-500/10 p-3">
                          <p className="text-sm text-orange-400">Diese Rolle erfordert eine Stammperson. Bitte eine Stammperson zuweisen.</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                </form.Subscribe>
              </div>
            </Dialog.Body>

            <Dialog.Footer>
              <Button intent="secondary" appearance="ghost" onClick={handleClose} disabled={isSubmitting}>
                Abbrechen
              </Button>
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isFormSubmitting]) => {
                  const submitting = isFormSubmitting || isSubmitting;
                  return (
                    <Button type="submit" disabled={!canSubmit || submitting} loading={submitting}>
                      Änderungen speichern
                    </Button>
                  );
                }}
              </form.Subscribe>
            </Dialog.Footer>
          </form>
        </div>
      ) : (
        <div id="panel-permissions" role="tabpanel" aria-labelledby="tab-permissions">
          <Dialog.Body>{user && <UserPermissionsPanel userId={user.id} username={user.username} />}</Dialog.Body>
          <Dialog.Footer>
            <Button intent="secondary" appearance="ghost" onClick={handleClose}>
              Schließen
            </Button>
          </Dialog.Footer>
        </div>
      )}
    </Dialog>
  );
};
