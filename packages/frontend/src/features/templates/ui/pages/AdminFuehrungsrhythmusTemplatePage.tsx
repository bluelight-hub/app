import { useState } from 'react';
import { Navigate } from '@tanstack/react-router';
import { PiMetronome, PiPlus, PiPencil, PiTrash, PiBuilding } from 'react-icons/pi';
import { useAdminAuth } from '@/features/auth/api/use-current-user';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { useGlobalFuehrungsrhythmusTemplates, useDeleteGlobalFuehrungsrhythmusTemplate } from '../../api';
import { CreateFuehrungsrhythmusTemplateDialog } from '../organisms/CreateFuehrungsrhythmusTemplateDialog';
import { EditFuehrungsrhythmusTemplateDialog } from '../organisms/EditFuehrungsrhythmusTemplateDialog';

interface TemplateForEdit {
  id: string;
  name: string;
  beschreibung: string | null;
  scope?: string;
  einsatzId?: string | null;
  eintraege: Array<{ titel: string; intervallMinuten: number; offsetMinuten: number }>;
}

interface TemplateForDelete {
  id: string;
  name: string;
}

/**
 * Admin-Seite fuer Fuehrungsrhythmus-Template-Verwaltung (Story 6.8 AC1).
 * Zeigt nur globale Templates an.
 */
export function AdminFuehrungsrhythmusTemplatePage() {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const { data: templates, isLoading, error } = useGlobalFuehrungsrhythmusTemplates();
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteGlobalFuehrungsrhythmusTemplate();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<TemplateForEdit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TemplateForDelete | null>(null);

  if (!authLoading && !isAdmin) {
    return <Navigate to="/admin-login" />;
  }

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteTemplate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          setDeleteTarget(null);
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
            <PiMetronome className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="font-bold text-gray-900 text-xl dark:text-white">Globale Fuehrungsrhythmus-Templates</h1>
        </div>
        <Button intent="primary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <PiPlus className="mr-1.5 h-4 w-4" />
          Neues globales Template
        </Button>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 p-4 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400">Fehler beim Laden der Templates</div>}

      {!isLoading && !error && templates && templates.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-gray-500 dark:text-gray-400">
          <PiMetronome className="h-8 w-8 opacity-50" />
          <p className="text-sm">Noch keine globalen Templates vorhanden</p>
        </div>
      )}

      {!isLoading && !error && templates && templates.length > 0 && (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between rounded-lg border-2 border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-gray-900 text-sm dark:text-white">{template.name}</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-300">
                    <PiBuilding className="h-3 w-3" /> Global
                  </span>
                </div>
                {template.beschreibung && <p className="mt-1 truncate text-gray-500 text-xs dark:text-gray-400">{template.beschreibung}</p>}
                <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-300">
                  {template.eintraege.length} {template.eintraege.length === 1 ? 'Erinnerung' : 'Erinnerungen'}
                </span>
              </div>

              <div className="ml-4 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setEditTemplate({
                      id: template.id,
                      name: template.name,
                      beschreibung: template.beschreibung ?? null,
                      scope: template.scope,
                      einsatzId: template.einsatzId,
                      eintraege: template.eintraege.map((e) => ({
                        titel: e.titel,
                        intervallMinuten: e.intervallMinuten,
                        offsetMinuten: e.offsetMinuten,
                      })),
                    })
                  }
                  className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  aria-label={`${template.name} bearbeiten`}
                >
                  <PiPencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: template.id, name: template.name })}
                  className="rounded-md p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  aria-label={`${template.name} loeschen`}
                >
                  <PiTrash className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog - scope GLOBAL wird automatisch gesetzt */}
      <CreateFuehrungsrhythmusTemplateDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} defaultScope="GLOBAL" />

      {/* Edit Dialog */}
      {editTemplate && <EditFuehrungsrhythmusTemplateDialog isOpen={!!editTemplate} onClose={() => setEditTemplate(null)} template={editTemplate} />}

      {/* Delete Confirmation Dialog */}
      <Dialog isOpen={!!deleteTarget} onClose={() => !isDeleting && setDeleteTarget(null)} size="sm">
        <Dialog.Title>Template loeschen?</Dialog.Title>
        <Dialog.Body>
          <p className="text-gray-600 text-sm dark:text-gray-400">
            Template <span className="font-semibold">'{deleteTarget?.name}'</span> wirklich loeschen?
          </p>
          <p className="mt-2 text-gray-500 text-xs dark:text-gray-400">Bereits erstellte Erinnerungen bleiben erhalten.</p>
        </Dialog.Body>
        <Dialog.Footer loading={isDeleting}>
          <Button intent="secondary" appearance="ghost" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
            Abbrechen
          </Button>
          <Button intent="danger" onClick={handleDelete} loading={isDeleting} disabled={isDeleting}>
            <PiTrash className="mr-1.5 h-4 w-4" />
            Loeschen
          </Button>
        </Dialog.Footer>
      </Dialog>
    </div>
  );
}
