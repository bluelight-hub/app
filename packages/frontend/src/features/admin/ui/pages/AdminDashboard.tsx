import { useCurrentUser, useAdminLogout } from '@/features/auth';
import {
  useAdminUserManagement,
  useAdminStammFahrzeugeManagement,
  useAdminStammPersonenManagement,
  useAdminQualifikationenManagement,
  useAdminRollenDefinitionenManagement,
  useAdminFahrzeugtypenManagement,
  useListInvites,
  useIntegrationOverview,
} from '@/features/admin/api';
import { AdminInviteControllerListInvitesVAlphaStatusEnum } from '@/shared';
import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Card } from '@/shared/ui/atoms/card.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { Text } from '@/shared/ui/atoms/text.atom';
import { AdminDashboardLayout } from '@/shared/ui/templates/AdminDashboardLayout';
import { useNavigate } from '@tanstack/react-router';
import { isTauri } from '@tauri-apps/api/core';
import { useCallback, useMemo, useState } from 'react';
import { PiCaretRight, PiCertificate, PiIdentificationBadge, PiPlus, PiPlugsConnected, PiSignOut, PiTicket, PiTruck, PiUserList, PiUsers } from 'react-icons/pi';
import { StatCard } from '@/features/admin/ui/molecules/StatCard';
import { CreateUserDialog } from '@/features/admin/ui/organisms/CreateUserDialog';
import { CreateInviteDialog } from '@/features/admin/ui/organisms/CreateInviteDialog';
import { CreateStammFahrzeugDialog } from '@/features/admin/ui/organisms/CreateStammFahrzeugDialog';
import { CreateStammPersonDialog } from '@/features/admin/ui/organisms/CreateStammPersonDialog';
import type { CreateUserDto } from '@/shared';

/** Sektion-Header */
function SectionHeader({ title }: { title: string }) {
  return <Text className="mb-3 text-lg font-semibold text-text-primary">{title}</Text>;
}

/** Admin-Dashboard Seite */
export function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const logoutAdmin = useAdminLogout();

  // Daten-Hooks
  const { users, isLoading: usersLoading, createUser, isCreating } = useAdminUserManagement();
  const { stammFahrzeuge, isLoading: fahrzeugeLoading, createStammFahrzeug, isCreating: isCreatingFahrzeug } = useAdminStammFahrzeugeManagement();
  const { stammPersonen, isLoading: personenLoading, createStammPerson, isCreating: isCreatingPerson } = useAdminStammPersonenManagement();
  const { qualifikationen, isLoading: qualifikationenLoading } = useAdminQualifikationenManagement();
  const { rollenDefinitionen } = useAdminRollenDefinitionenManagement();
  const { fahrzeugtypen, isLoading: fahrzeugtypenLoading } = useAdminFahrzeugtypenManagement();
  const invitesQuery = useListInvites({ status: AdminInviteControllerListInvitesVAlphaStatusEnum.Active });
  const integrationOverview = useIntegrationOverview();

  // Dialog-States
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateInviteOpen, setIsCreateInviteOpen] = useState(false);
  const [isCreateFahrzeugOpen, setIsCreateFahrzeugOpen] = useState(false);
  const [isCreatePersonOpen, setIsCreatePersonOpen] = useState(false);

  // KPI-Daten
  const stats = useMemo(
    () => ({
      users: users?.length ?? 0,
      personen: stammPersonen?.length ?? 0,
      fahrzeuge: stammFahrzeuge?.length ?? 0,
      invites: invitesQuery.data?.data?.length ?? 0,
    }),
    [users, stammPersonen, stammFahrzeuge, invitesQuery.data],
  );

  const kraefteSummary = useMemo(
    () => ({
      qualifikationen: qualifikationen?.length ?? 0,
      rollen: rollenDefinitionen?.length ?? 0,
      fahrzeugtypen: fahrzeugtypen?.length ?? 0,
    }),
    [qualifikationen, rollenDefinitionen, fahrzeugtypen],
  );

  // Handlers
  const handleCreateUser = (data: CreateUserDto) => {
    createUser(data, { onSuccess: () => setIsCreateUserOpen(false) });
  };

  const handleCreateFahrzeug = (data: any) => {
    createStammFahrzeug(data, { onSuccess: () => setIsCreateFahrzeugOpen(false) });
  };

  const handleCreatePerson = (data: any) => {
    createStammPerson(data, { onSuccess: () => setIsCreatePersonOpen(false) });
  };

  const handleLogout = useCallback(async () => {
    await logoutAdmin.mutateAsync();
    if (isTauri()) {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        await getCurrentWebviewWindow().close();
      } catch (error) {
        logger.error('Fehler beim Schließen des Admin-Fensters:', error);
        await navigate({ to: '/' });
      }
    } else {
      await navigate({ to: '/' });
    }
  }, [logoutAdmin, navigate]);

  const isKpiLoading = usersLoading || fahrzeugeLoading || personenLoading;

  return (
    <AdminDashboardLayout maxWidth="full">
      <div className="mb-2">
        <Heading size="xl" className="mb-1">
          Admin-Dashboard
        </Heading>
        <Text color="muted">
          Willkommen im Admin-Bereich, <span className="font-medium text-text-secondary">{user?.username}</span>
        </Text>
      </div>

      {/* KPI-Karten */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isKpiLoading ? (
            <>
              <Skeleton className="h-24 w-full rounded-panel" />
              <Skeleton className="h-24 w-full rounded-panel" />
              <Skeleton className="h-24 w-full rounded-panel" />
              <Skeleton className="h-24 w-full rounded-panel" />
            </>
          ) : (
            <>
              <StatCard label="Benutzer" value={stats.users} icon={PiUsers} />
              <StatCard label="Personen" value={stats.personen} icon={PiUserList} />
              <StatCard label="Fahrzeuge" value={stats.fahrzeuge} icon={PiTruck} />
              <StatCard label="Offene Einladungen" value={stats.invites} icon={PiTicket} />
            </>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <SectionHeader title="Schnellaktionen" />
        <div className="flex flex-wrap gap-3">
          <Button intent="primary" appearance="outline" size="sm" onClick={() => setIsCreateUserOpen(true)}>
            <PiPlus className="mr-1.5 h-4 w-4" />
            Benutzer anlegen
          </Button>
          <Button intent="primary" appearance="outline" size="sm" onClick={() => setIsCreateInviteOpen(true)}>
            <PiPlus className="mr-1.5 h-4 w-4" />
            Einladung erstellen
          </Button>
          <Button intent="primary" appearance="outline" size="sm" onClick={() => setIsCreateFahrzeugOpen(true)}>
            <PiPlus className="mr-1.5 h-4 w-4" />
            Fahrzeug anlegen
          </Button>
          <Button intent="primary" appearance="outline" size="sm" onClick={() => setIsCreatePersonOpen(true)}>
            <PiPlus className="mr-1.5 h-4 w-4" />
            Person anlegen
          </Button>
        </div>
      </section>

      {/* Statusübersicht */}
      <section>
        <SectionHeader title="Statusübersicht" />
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Kräfte */}
          <Card padding="md">
            <div className="flex items-start justify-between">
              <div>
                <Text className="font-semibold text-text-primary">Kräfte</Text>
                <Text size="sm" color="muted" className="mt-2">
                  {kraefteSummary.qualifikationen} Qualifikationen · {kraefteSummary.rollen} Rollen · {kraefteSummary.fahrzeugtypen} Fahrzeugtypen
                </Text>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => navigate({ to: '/admin/kraefte/qualifikationen' })}
                  className="rounded p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
                  aria-label="Qualifikationen"
                  title="Qualifikationen"
                >
                  <PiCertificate className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: '/admin/kraefte/rollen-definitionen' })}
                  className="rounded p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
                  aria-label="Rollen-Definitionen"
                  title="Rollen-Definitionen"
                >
                  <PiIdentificationBadge className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: '/admin/kraefte/fahrzeugtypen' })}
                  className="rounded p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
                  aria-label="Fahrzeugtypen"
                  title="Fahrzeugtypen"
                >
                  <PiTruck className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>

          {/* Integrationen */}
          <Card padding="md">
            <div className="flex items-start justify-between">
              <div>
                <Text className="font-semibold text-text-primary">Integrationen</Text>
                <Text size="sm" color="muted" className="mt-2">
                  {integrationOverview.data?.integrations
                    ? `${integrationOverview.data.integrations.filter((i) => i.status === 'verbunden').length} von ${integrationOverview.data.integrations.length} verbunden`
                    : 'Wird geladen...'}
                </Text>
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: '/admin/integrations/' })}
                className="rounded p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
                aria-label="Integrationen"
                title="Integrationen"
              >
                <PiCaretRight className="h-4 w-4" />
              </button>
            </div>
          </Card>
        </div>
      </section>

      <div className="border-t border-border-subtle pt-4">
        <Button appearance="ghost" intent="danger" size="sm" onClick={handleLogout}>
          <PiSignOut className="mr-2" />
          Admin-Bereich verlassen
        </Button>
      </div>

      {/* Dialoge */}
      <CreateUserDialog isOpen={isCreateUserOpen} onClose={() => setIsCreateUserOpen(false)} onSubmit={handleCreateUser} isSubmitting={isCreating} />
      <CreateInviteDialog isOpen={isCreateInviteOpen} onClose={() => setIsCreateInviteOpen(false)} />
      <CreateStammFahrzeugDialog
        isOpen={isCreateFahrzeugOpen}
        onClose={() => setIsCreateFahrzeugOpen(false)}
        onSubmit={handleCreateFahrzeug}
        isSubmitting={isCreatingFahrzeug}
        fahrzeugtypen={fahrzeugtypen ?? []}
        fahrzeugtypenLoading={fahrzeugtypenLoading}
      />
      <CreateStammPersonDialog
        isOpen={isCreatePersonOpen}
        onClose={() => setIsCreatePersonOpen(false)}
        onSubmit={handleCreatePerson}
        isSubmitting={isCreatingPerson}
        qualifikationen={qualifikationen ?? []}
        qualifikationenLoading={qualifikationenLoading}
      />
    </AdminDashboardLayout>
  );
}
