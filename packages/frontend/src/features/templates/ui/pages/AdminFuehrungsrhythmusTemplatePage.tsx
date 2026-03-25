import { useState } from 'react';
import { Navigate } from '@tanstack/react-router';
import { PiMetronome, PiPlus, PiPencil, PiTrash, PiBuilding } from 'react-icons/pi';
import { useAdminAuth } from '@/features/auth/api/use-current-user';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';

import { useGlobalFuehrungsrhythmusTemplates, useDeleteGlobalFuehrungsrhythmusTemplate } from '../../api';
import { CreateFuehrungsrhythmusTemplateDialog } from '@/features/templates';
import { EditFuehrungsrhythmusTemplateDialog } from '@/features/templates';

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
          <div className="rounded-full bg-status-warning-surface p-2">
            <PiMetronome className="h-5 w-5 text-status-warning-text" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">Globale Fuehrungsrhythmus-Templates</h1>
        </div>
        <Button intent="primary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <PiPlus className="mr-1.5 h-4 w-4" />
          Neues globales Template
        </Button>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-status-warning-text border-t-transparent" />
        </div>
      )}

      {error && <div className="rounded-panel bg-status-danger-surface p-4 text-sm text-status-danger-text">Fehler beim Laden der Templates</div>}

      {!isLoading && !error && templates && templates.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-text-muted">
          <PiMetronome className="h-8 w-8 opacity-50" />
          <p className="text-sm">Noch keine globalen Templates vorhanden</p>
        </div>
      )}

      {!isLoading && !error && templates && templates.length > 0 && (
        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="flex items-center justify-between rounded-panel border-2 border-border-subtle bg-surface-panel p-4 transition-colors hover:border-border-strong">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-text-primary">{template.name}</h3>
                  <span className="inline-flex items-center gap-1 rounded-pill bg-status-info-surface px-2 py-0.5 text-xs font-medium text-status-info-text">
                    <PiBuilding className="h-3 w-3" /> Global
                  </span>
                </div>
                {template.beschreibung && <p className="mt-1 truncate text-xs text-text-muted">{template.beschreibung}</p>}
                <span className="mt-1 inline-block rounded-pill bg-status-warning-surface px-2 py-0.5 text-xs font-medium text-status-warning-text">
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
                  className="rounded-control p-2 text-text-muted transition-colors hover:bg-action-secondary hover:text-text-primary"
                  aria-label={`${template.name} bearbeiten`}
                >
                  <PiPencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: template.id, name: template.name })}
                  className="rounded-control p-2 text-text-muted transition-colors hover:bg-status-danger-surface hover:text-status-danger-text"
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
          <p className="text-sm text-text-secondary">
            Template <span className="font-semibold">'{deleteTarget?.name}'</span> wirklich loeschen?
          </p>
          <p className="mt-2 text-xs text-text-muted">Bereits erstellte Erinnerungen bleiben erhalten.</p>
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
