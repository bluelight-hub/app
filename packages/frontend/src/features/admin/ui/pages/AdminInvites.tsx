import { useAdminAuth } from '@/features/auth';
import { useListInvites } from '@/features/admin/api/use-admin-invite-management';
import { InviteCodeTable, CreateInviteDialog } from '@/features/admin/ui/organisms';
import { InviteFilters, type InviteStatusFilter } from '@/features/admin/ui/molecules/InviteFilters';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { PiPlus } from 'react-icons/pi';

/**
 * AdminInvitesPage - Verwaltung von Invite-Codes
 *
 * Zeigt eine vollständige Übersicht aller Invite-Codes mit:
 * - Filtermöglichkeiten nach Status (alle, aktiv, verwendet, abgelaufen, widerrufen)
 * - Client-seitige Pagination via DataTable
 * - Revoke-Funktionalität für aktive/expired Codes
 */
export function AdminInvites() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const [statusFilter, setStatusFilter] = useState<InviteStatusFilter>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // API Query mit Filter — Pagination wird client-seitig von DataTable gehandhabt
  const { data, isLoading, error, refetch } = useListInvites({
    status: statusFilter === 'all' ? undefined : statusFilter,
    pageSize: 1000,
  });

  // Redirect if not admin
  if (!isAuthLoading && !isAdmin) {
    return <Navigate to="/admin-login" />;
  }

  // Auth-Loading separat behandeln
  if (isAuthLoading) {
    return (
      <Container maxWidth="6xl" className="py-8">
        <div className="flex h-[50vh] items-center justify-center">
          <Spinner size="xl" />
        </div>
      </Container>
    );
  }

  const invites = data?.data;

  return (
    <Container maxWidth="6xl" className="py-8">
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <Heading size="lg" as="h1">
            Invite-Codes
          </Heading>
          <Button intent="primary" onClick={() => setIsCreateDialogOpen(true)}>
            <PiPlus className="h-5 w-5" />
            Neuer Invite-Code
          </Button>
        </div>

        {/* Filters Section */}
        <div className="flex items-center justify-between">
          <InviteFilters selectedStatus={statusFilter} onChange={setStatusFilter} />
        </div>

        {/* Table Section */}
        <InviteCodeTable invites={invites} isLoading={isLoading} error={error} onRetry={refetch} />

        {/* Create Invite Dialog */}
        <CreateInviteDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} />
      </div>
    </Container>
  );
}
