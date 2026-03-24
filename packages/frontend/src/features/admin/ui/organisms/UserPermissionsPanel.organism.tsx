import { useUserPermissions } from '@/features/admin/api/use-user-permissions';
import { useGrantPermission } from '@/features/admin/api/use-grant-permission';
import { useRevokePermission } from '@/features/admin/api/use-revoke-permission';
import { useCanAccess } from '@/features/auth/hooks';
import { useInlineConfirmation } from '@/shared/ui/hooks/use-inline-confirmation';
import { InlineConfirmation } from '@/shared/ui/atoms/InlineConfirmation.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import type { ResponseError } from '@/shared';
import { useState } from 'react';
import { PiX } from 'react-icons/pi';
import { GrantPermissionDialog } from './GrantPermissionDialog.organism';
interface UserPermissionsPanelProps {
  userId: string;
  username: string;
} /** Gruppiert Permissions nach Domain (z.B. "nav" -> ["stammdaten", "berechtigungen"]) */
function groupByDomain(permissions: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const p of permissions) {
    const [domain, action] = p.split(':');
    if (!grouped.has(domain)) {
      grouped.set(domain, []);
    }
    grouped.get(domain)?.push(action);
  }
  return grouped;
} /** * Panel fuer die Verwaltung von Custom Permissions eines Users. * * Story 5.2 AC1: Zeigt alle Custom Permissions gruppiert nach Domain. * Jede Permission kann einzeln entzogen werden (Inline-Bestaetigung). */
export function UserPermissionsPanel({ userId, username }: UserPermissionsPanelProps) {
  const { data: permissions, isLoading } = useUserPermissions(userId);
  const { accessible: canAccessBerechtigungen } = useCanAccess('berechtigungen');
  const grantMutation = useGrantPermission();
  const revokeMutation = useRevokePermission();
  const { confirmation, show: showConfirmation, dismiss } = useInlineConfirmation();
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const handleGrant = async (permission: string) => {
    try {
      await grantMutation.mutateAsync({ userId, permission });
      showConfirmation(`Permission "${permission}" vergeben`, 'success');
      setGrantDialogOpen(false);
    } catch (error) {
      const msg = await getApiErrorMessage(error as ResponseError, 'Permission konnte nicht vergeben werden.', 'grantPermission');
      showConfirmation(msg, 'error');
    }
  };
  const handleRevoke = async (permission: string) => {
    try {
      await revokeMutation.mutateAsync({ userId, permission });
      showConfirmation(`Permission "${permission}" entzogen`, 'success');
    } catch (error) {
      const msg = await getApiErrorMessage(error as ResponseError, 'Permission konnte nicht entzogen werden.', 'revokePermission');
      showConfirmation(msg, 'error');
    }
  };
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        {' '}
        <Spinner size="sm" /> <span className="text-sm text-text-muted">Berechtigungen werden geladen...</span>{' '}
      </div>
    );
  }
  const grouped = groupByDomain(permissions ?? []);
  return (
    <div className="space-y-4">
      {' '}
      <div className="flex items-center justify-between">
        {' '}
        <h3 className="text-sm font-semibold text-text-secondary">Custom Permissions</h3>{' '}
        {canAccessBerechtigungen && (
          <Button intent="primary" appearance="outline" size="sm" onClick={() => setGrantDialogOpen(true)}>
            {' '}
            Permission vergeben{' '}
          </Button>
        )}{' '}
      </div>{' '}
      {confirmation && <InlineConfirmation message={confirmation.message} variant={confirmation.variant} onDismiss={dismiss} />}{' '}
      {!permissions || permissions.length === 0 ? (
        <p className="text-sm text-text-muted">Keine Custom Permissions vergeben. Nur Role-Default-Berechtigungen aktiv.</p>
      ) : (
        <div className="space-y-3">
          {' '}
          {[...grouped.entries()].map(([domain, actions]) => (
            <div key={domain} className="rounded-control border border-border-subtle p-3">
              {' '}
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">{domain}</p>{' '}
              <div className="flex flex-wrap gap-2">
                {' '}
                {actions.map((action) => {
                  const fullPermission = `${domain}:${action}`;
                  return (
                    <Badge key={fullPermission} variant="info" className="group cursor-default gap-1.5">
                      {' '}
                      {fullPermission}{' '}
                      {canAccessBerechtigungen && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(fullPermission)}
                          disabled={revokeMutation.isPending}
                          className="ml-0.5 inline-flex items-center rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:shadow-focus-ring"
                          aria-label={`Permission ${fullPermission} entziehen`}
                        >
                          {' '}
                          <PiX className="h-3 w-3" aria-hidden="true" />{' '}
                        </button>
                      )}{' '}
                    </Badge>
                  );
                })}{' '}
              </div>{' '}
            </div>
          ))}{' '}
        </div>
      )}{' '}
      {canAccessBerechtigungen && (
        <GrantPermissionDialog
          isOpen={grantDialogOpen}
          onClose={() => setGrantDialogOpen(false)}
          onGrant={handleGrant}
          isGranting={grantMutation.isPending}
          existingPermissions={permissions ?? []}
          username={username}
        />
      )}{' '}
    </div>
  );
}
