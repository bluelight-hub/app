import { useAdminAuth } from '@/features/auth';
import { useListInvites } from '@/features/admin/api/use-admin-invite-management';
import { InviteCodeTable, CreateInviteDialog } from '@/features/admin/ui/organisms';
import { InviteFilters, type InviteStatusFilter } from '@/features/admin/ui/molecules/InviteFilters';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { PiWarning, PiPlus } from 'react-icons/pi';

/**
 * AdminInvitesPage - Verwaltung von Invite-Codes
 *
 * Zeigt eine vollständige Übersicht aller Invite-Codes mit:
 * - Filtermöglichkeiten nach Status (alle, aktiv, verwendet, abgelaufen, widerrufen)
 * - Pagination (20 Codes pro Seite)
 * - Revoke-Funktionalität für aktive/expired Codes
 *
 * Pattern konsistent mit AdminUsers.tsx.
 *
 * @example
 * ```tsx
 * // Route Definition (routes/admin/invites.tsx)
 * export const Route = createFileRoute('/admin/invites')({
 *   component: AdminInvitesPage,
 * });
 * ```
 */
export function AdminInvites() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<InviteStatusFilter>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // API Query mit Filter und Pagination
  const { data, isLoading, error } = useListInvites({
    status: statusFilter === 'all' ? undefined : statusFilter,
    page: currentPage,
    pageSize: 20,
  });

  // Redirect if not admin
  if (!isAuthLoading && !isAdmin) {
    return <Navigate to="/admin-login" />;
  }

  // Loading State
  if (isAuthLoading) {
    return (
      <Container maxWidth="6xl" className="py-8">
        <div className="flex h-[50vh] items-center justify-center">
          <Spinner size="xl" />
        </div>
      </Container>
    );
  }

  // Error State
  if (error) {
    return (
      <Container maxWidth="6xl" className="py-8">
        <div className="flex h-[50vh] items-center justify-center">
          <Alert status="error" title="Fehler beim Laden der Invite-Codes" description={error.message} icon={<PiWarning className="h-6 w-6" />} />
        </div>
      </Container>
    );
  }

  // Calculate total pages from pagination metadata
  const totalPages = data?.pagination?.totalPages ?? 1;
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
        <InviteCodeTable invites={invites} isLoading={isLoading} onPageChange={setCurrentPage} currentPage={currentPage} totalPages={totalPages} />

        {/* Create Invite Dialog */}
        <CreateInviteDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} />
      </div>
    </Container>
  );
}
