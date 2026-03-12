/**
 * Server-Verwaltung Page
 *
 * Zeigt die Liste aller konfigurierten Server mit Möglichkeit
 * zum Hinzufügen, Bearbeiten und Löschen.
 *
 * **Features:**
 * - Übersicht aller konfigurierten Server
 * - Navigation zum Server-Setup für neue Server
 * - Edit-Modal zum Bearbeiten von Server-Details (Story 3.3)
 * - Callbacks für Delete (Story 3.4)
 *
 * @module features/server/ui/pages/ServerManagementPage
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { PiArrowLeft, PiPencilSimple, PiPlus, PiWarning, PiX } from 'react-icons/pi';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Route } from '@/routes/server/manage';
import { resetAuthStore } from '@/features/auth/stores/auth.store';
import { setSetupRedirectInProgress } from '@/shared/lib/server-access-token';
import { queryClient } from '@/shared/query-client';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { AuthCard } from '@/shared/ui/molecules/auth-card.molecule';
import { AuthLayout } from '@/shared/ui/templates';
import { useServerById } from '../../hooks/use-server-by-id';
import { useServerList } from '../../hooks';
import { removeServer, serverStore } from '../../stores/server.store';
import { ServerNavigationActions } from '../molecules/ServerNavigationActions';
import { ServerEditForm } from '../organisms/ServerEditForm';
import { ServerList } from '../organisms/ServerList';

/**
 * ServerManagementPage Komponente
 *
 * Zentrale Verwaltungsseite für alle Server-Konfigurationen.
 * Nutzt das ServerList Organism zur Darstellung und bietet
 * Navigation zum Hinzufügen neuer Server sowie Edit-Modal.
 *
 * @example
 * ```tsx
 * // In Route-Datei
 * export const Route = createFileRoute('/server/manage')({
 *   component: ServerManagementPage,
 * });
 * ```
 */
export function ServerManagementPage() {
  const navigate = useNavigate();
  const { reason } = Route.useSearch();
  const servers = useServerList();
  const activeServerId = useStore(serverStore, (state) => state.activeServerId);
  const activeServer = servers.find((server) => server.id === activeServerId) ?? null;
  const rootRef = useRef<HTMLDivElement>(null);

  // Reset Setup-Redirect-Flag (analog zu ServerOnboardingPage)
  useEffect(() => {
    setSetupRedirectInProgress(false);
  }, []);

  // State für Edit-Modal (Story 3.3)
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [dialogPortalContainer, setDialogPortalContainer] = useState<HTMLElement | null>(null);

  // State für Delete-Modal (Story 3.4)
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Server-Daten für Edit-Modal via Selector-Hook
  const editingServer = useServerById(editingServerId);

  // Server-Daten für Delete-Modal via Selector-Hook
  const deletingServer = useServerById(deletingServerId);

  // C5 Fix: Auto-Close wenn Server verschwindet (z.B. durch Löschung)
  useEffect(() => {
    if (editingServerId && !editingServer) {
      setEditingServerId(null);
    }
  }, [editingServerId, editingServer]);

  // C5 Fix: Auto-Close Delete-Modal wenn Server verschwindet
  useEffect(() => {
    if (deletingServerId && !deletingServer) {
      setDeletingServerId(null);
    }
  }, [deletingServerId, deletingServer]);

  // C6 Fix: Cleanup bei Unmount - verhindert Memory Leak bei Navigation
  useEffect(() => {
    return () => {
      setEditingServerId(null);
      setDeletingServerId(null);
    };
  }, []);

  useEffect(() => {
    setDialogPortalContainer(rootRef.current?.closest('.auth-theme') ?? null);
  }, []);

  /**
   * Navigiert zur Server-Setup Seite zum Hinzufügen eines neuen Servers.
   */
  const handleAddServer = () => {
    void navigate({ to: '/server/setup' });
  };

  /**
   * Öffnet das Edit-Modal für einen Server (Story 3.3).
   */
  const handleEditServer = (serverId: string) => {
    setDeletingServerId(null);
    setEditingServerId(serverId);
  };

  /**
   * M8 Fix: Unified Handler zum Schließen des Edit-Modals.
   * Wird für Success und Cancel verwendet - eliminiert Code Duplication.
   */
  const closeEditModal = useCallback(() => {
    setEditingServerId(null);
  }, []);

  /**
   * Bestätigt die Löschung und führt sie aus (Story 3.4).
   * Handled AC2 (Löschung), AC4 (letzter Server), AC5 (Default-Server via Store),
   * AC6 (eingeloggter Server - Auth-State via Store auto-cleared).
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingServerId || !deletingServer || isDeleting) return;

    const serverName = deletingServer.name;
    const isLastServer = servers.length === 1;
    const wasActiveServer = activeServerId === deletingServerId;

    setIsDeleting(true);
    try {
      // removeServer handled automatisch:
      // - Server aus Liste entfernen
      // - Token löschen (AC2)
      // - Auto-Fallback wenn aktiver Server gelöscht (AC5)
      await removeServer(deletingServerId);

      // AC6: Explicit Auth-State cleanup when deleting logged-in server
      if (wasActiveServer) {
        resetAuthStore();
        await queryClient.invalidateQueries({ queryKey: ['auth'] });
      }

      // Toast mit Server-Name (AC2)
      toast.success(`Server '${serverName}' entfernt`);

      // Navigation nach Löschung (AC4, AC6)
      if (isLastServer) {
        toast.info('Du brauchst mindestens einen Server');
        // Kleine Verzögerung um Toast-Rendering zu garantieren
        setTimeout(() => void navigate({ to: '/server/setup' }), 50);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error('Fehler beim Entfernen', { description: message });
    } finally {
      setIsDeleting(false);
      setDeletingServerId(null);
    }
  }, [activeServerId, deletingServer, deletingServerId, isDeleting, navigate, servers]);

  const handleDeleteServerAction = useCallback(
    (serverId: string) => {
      const server = servers.find((entry) => entry.id === serverId);
      if (!server) {
        toast.error('Server nicht gefunden');
        return;
      }

      if (isDeleting) {
        return;
      }

      if (deletingServerId === serverId) {
        void handleDeleteConfirm();
        return;
      }

      setDeletingServerId(serverId);
    },
    [deletingServerId, handleDeleteConfirm, isDeleting, servers],
  );

  return (
    <AuthLayout>
      <div ref={rootRef}>
        <AuthCard className="mx-auto w-full max-w-6xl" padding="none">
          <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="flex h-full flex-col border-slate-200/80 border-b bg-slate-50/85 p-6 lg:border-r lg:border-b-0 lg:p-8 dark:border-slate-800/80 dark:bg-slate-900/60">
              <div className="flex h-full flex-col gap-6">
                <div className="space-y-3">
                  <Text as="span" size="xs" className="font-semibold text-sky-700 uppercase tracking-[0.2em] dark:text-sky-300">
                    Serververwaltung
                  </Text>
                  <Heading as="h1" size="2xl">
                    Server verwalten
                  </Heading>
                  <Text size="sm" className="text-slate-600 dark:text-slate-300">
                    Verwalte deine konfigurierten Server und halte den Einstieg stabil.
                  </Text>
                </div>

                {reason === 'token-invalid' && (
                  <Card role="alert" className="rounded-xl border-amber-200/80 bg-amber-50/90 shadow-none dark:border-amber-950/60 dark:bg-amber-950/30">
                    <CardContent className="flex items-start gap-3 p-4">
                      <PiWarning className="mt-0.5 size-5 flex-shrink-0 text-amber-700 dark:text-amber-300" />
                      <Text size="sm" className="text-amber-900 dark:text-amber-100">
                        Der Zugangstoken ist nicht mehr gültig. Entferne den betroffenen Server und richte ihn erneut ein.
                      </Text>
                    </CardContent>
                  </Card>
                )}

                <Card className="rounded-xl border-slate-200/80 bg-white/85 shadow-none dark:border-slate-800/80 dark:bg-slate-950/55">
                  <CardHeader className="space-y-2 p-4 pb-3">
                    <Text as="span" size="xs" className="font-semibold text-slate-500 uppercase tracking-[0.16em] dark:text-slate-400">
                      Überblick
                    </Text>
                    <CardDescription className="text-slate-600 dark:text-slate-300">Speichere mehrere Server und wechsle im Login zwischen den Verbindungen.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0">
                    <dl className="space-y-2 rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-900/40">
                      <div className="flex items-center justify-between gap-3">
                        <Text as="dt" size="xs" className="font-medium text-slate-500 dark:text-slate-400">
                          Gespeicherte Server
                        </Text>
                        <Text as="dd" size="sm" className="font-semibold text-slate-900 dark:text-slate-100">
                          {servers.length}
                        </Text>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <Text as="dt" size="xs" className="font-medium text-slate-500 dark:text-slate-400">
                          Aktive Verbindung
                        </Text>
                        <Text as="dd" size="sm" className="truncate text-right font-semibold text-slate-900 dark:text-slate-100">
                          {activeServer?.name ?? 'Keine aktiv'}
                        </Text>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <ServerNavigationActions
                  className="mt-auto pt-2"
                  actions={[
                    {
                      id: 'manage-auth',
                      label: 'Zurück zur Anmeldung',
                      icon: PiArrowLeft,
                      onClick: () => navigate({ to: '/auth' }),
                      disabled: servers.length === 0,
                    },
                    {
                      id: 'manage-setup',
                      label: 'Server hinzufügen',
                      icon: PiPlus,
                      onClick: handleAddServer,
                    },
                  ]}
                />
              </div>
            </aside>

            <section className="p-6 lg:p-8">
              <div className="mx-auto flex h-full max-w-2xl flex-col space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <Text as="span" size="xs" className="font-semibold text-sky-700 uppercase tracking-[0.18em] dark:text-sky-300">
                      Konfiguration
                    </Text>
                    <Heading as="h2" size="xl">
                      Gespeicherte Server
                    </Heading>
                  </div>
                  <Badge variant="outline" className="rounded-md border-slate-300 bg-white/80 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                    {servers.length} Verbindung{servers.length === 1 ? '' : 'en'}
                  </Badge>
                </div>

                <Card className="overflow-hidden rounded-xl border-slate-200/80 bg-slate-50/75 shadow-none dark:border-slate-800/80 dark:bg-slate-900/40">
                  <CardContent className="p-0">
                    <ServerList
                      onAddServer={handleAddServer}
                      onEditServer={handleEditServer}
                      onDeleteServer={handleDeleteServerAction}
                      pendingDeleteServerId={deletingServerId}
                      isDeletingServerId={isDeleting ? deletingServerId : null}
                    />
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        </AuthCard>

        {/* Edit-Modal (Story 3.3) */}
        {/* C5 Fix: Modal nur öffnen wenn editingServerId UND editingServer vorhanden */}
        <Dialog
          open={editingServerId !== null && editingServer !== null}
          onOpenChange={(open) => {
            if (!open) {
              closeEditModal();
            }
          }}
        >
          <DialogContent
            data-testid="edit-server-dialog"
            aria-label={editingServer ? `Server "${editingServer.name}" bearbeiten` : 'Server bearbeiten'}
            overlayProps={{ 'data-testid': 'dialog-backdrop' }}
            portalProps={dialogPortalContainer ? { container: dialogPortalContainer } : undefined}
            className="flex max-h-[80vh] w-[calc(100%-1.5rem)] max-w-[26rem] flex-col gap-0 overflow-hidden border-slate-200/80 bg-white/95 p-0 shadow-xl sm:max-w-[27.5rem] sm:rounded-2xl dark:border-slate-800/80 dark:bg-slate-950/95"
          >
            <DialogHeader className="border-slate-200/80 border-b bg-slate-50/70 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/60">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <DialogTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-slate-50">
                    <PiPencilSimple className="size-5" />
                    {editingServer?.name ?? 'Server'} bearbeiten
                  </DialogTitle>
                  <DialogDescription className="text-slate-600 dark:text-slate-300">Passe Name, URL und visuelle Kennzeichnung an, ohne den Server neu anzulegen.</DialogDescription>
                </div>
                <DialogClose asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="!rounded-md" aria-label="Modal schließen">
                    <PiX className="size-5" />
                  </Button>
                </DialogClose>
              </div>
            </DialogHeader>

            {editingServer && <ServerEditForm server={editingServer} onSuccess={closeEditModal} onCancel={closeEditModal} className="min-h-0 flex-1 px-5 pt-4 pb-5" />}
          </DialogContent>
        </Dialog>
      </div>
    </AuthLayout>
  );
}
