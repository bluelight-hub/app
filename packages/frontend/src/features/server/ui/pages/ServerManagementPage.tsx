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

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { PiArrowLeft, PiPencilSimple, PiWarning, PiX } from 'react-icons/pi';
import { toast } from 'sonner';

import { Route } from '@/routes/server/manage';
import { resetAuthStore } from '@/features/auth/stores/auth.store';
import { setSetupRedirectInProgress } from '@/shared/lib/server-access-token';
import { queryClient } from '@/shared/query-client';
import { AuthLayout } from '@/shared/ui/templates';
import { ServerList } from '../organisms/ServerList';
import { ServerEditForm } from '../organisms/ServerEditForm';
import { ServerDeleteConfirmDialog } from '../molecules/ServerDeleteConfirmDialog';
import { useServerById } from '../../hooks/use-server-by-id';
import { useServerList } from '../../hooks';
import { removeServer, serverStore } from '../../stores/server.store';

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

  // Reset Setup-Redirect-Flag (analog zu ServerOnboardingPage)
  useEffect(() => {
    setSetupRedirectInProgress(false);
  }, []);

  // State für Edit-Modal (Story 3.3)
  const [editingServerId, setEditingServerId] = useState<string | null>(null);

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
   * Öffnet den Delete-Bestätigungs-Dialog für einen Server (Story 3.4).
   */
  const handleDeleteServer = (serverId: string) => {
    setDeletingServerId(serverId);
  };

  /**
   * Bestätigt die Löschung und führt sie aus (Story 3.4).
   * Handled AC2 (Löschung), AC4 (letzter Server), AC5 (Default-Server via Store),
   * AC6 (eingeloggter Server - Auth-State via Store auto-cleared).
   */
  const handleDeleteConfirm = async () => {
    if (!deletingServerId || !deletingServer) return;

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
  };

  /**
   * M8 Fix: Unified Handler zum Schließen des Delete-Modals (Story 3.4).
   * Verhindert Schließen während Löschung läuft.
   */
  const closeDeleteModal = useCallback(() => {
    if (!isDeleting) {
      setDeletingServerId(null);
    }
  }, [isDeleting]);

  return (
    <AuthLayout>
      <div className="w-full max-w-3xl p-4 sm:p-6 lg:p-8">
        {/* Back Button */}
        <button type="button" onClick={() => navigate({ to: '/auth' })} className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-white/70 transition-colors hover:text-white">
          <PiArrowLeft className="h-4 w-4" />
          Zurück zur Anmeldung
        </button>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="font-bold text-2xl text-white">Server verwalten</h1>
          <p className="mt-1 text-sm text-white/70">Verwalte deine konfigurierten Server und Verbindungen.</p>
        </div>

        {/* Token-Invalid Warning Banner */}
        {reason === 'token-invalid' && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4">
            <PiWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
            <p className="text-amber-200 text-sm">
              Der Zugangstoken ist nicht mehr gültig (z.B. weil der Server zurückgesetzt wurde). Bitte entferne den betroffenen Server und füge ihn erneut hinzu.
            </p>
          </div>
        )}

        {/* Server List Container */}
        <div className="overflow-hidden rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm">
          <ServerList onAddServer={handleAddServer} onEditServer={handleEditServer} onDeleteServer={handleDeleteServer} />
        </div>
      </div>

      {/* Edit-Modal (Story 3.3) */}
      {/* C5 Fix: Modal nur öffnen wenn editingServerId UND editingServer vorhanden */}
      <Dialog
        open={editingServerId !== null && editingServer !== null}
        onClose={closeEditModal}
        className="relative z-50"
        data-testid="edit-server-dialog"
        // H6 Fix: Dynamische aria-label mit Server-Name
        aria-label={editingServer ? `Server "${editingServer.name}" bearbeiten` : 'Server bearbeiten'}
      >
        {/* Backdrop */}
        <DialogBackdrop transition className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity data-[closed]:opacity-0" data-testid="dialog-backdrop" />

        {/* Modal Container */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel transition className="mx-auto w-full max-w-md transform rounded-xl bg-white p-6 shadow-xl transition-all data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-gray-800">
            {/* Modal Header */}
            <div className="mb-4 flex items-center justify-between">
              {/* H6 Fix: DialogTitle mit dynamischem Server-Namen */}
              <DialogTitle className="flex items-center gap-2 font-semibold text-gray-900 text-lg dark:text-white">
                <PiPencilSimple className="size-5" />
                {editingServer?.name ?? 'Server'} bearbeiten
              </DialogTitle>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Modal schließen"
              >
                <PiX className="size-5" />
              </button>
            </div>

            {/* Edit Form - M8 Fix: closeEditModal für beide Callbacks */}
            {editingServer && <ServerEditForm server={editingServer} onSuccess={closeEditModal} onCancel={closeEditModal} />}
          </DialogPanel>
        </div>
      </Dialog>

      {/* Delete-Confirmation-Dialog (Story 3.4) */}
      {/* C5 Fix: Modal nur öffnen wenn deletingServerId UND deletingServer vorhanden */}
      <ServerDeleteConfirmDialog
        server={deletingServer}
        open={deletingServerId !== null && deletingServer !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        isLoading={isDeleting}
      />
    </AuthLayout>
  );
}
