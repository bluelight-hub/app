import { useCallback, useState } from 'react';
import { PiMetronome, PiPlus, PiTrash } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useGlobalFuehrungsrhythmusTemplates, useEinsatzFuehrungsrhythmusTemplates, useDeleteEinsatzFuehrungsrhythmusTemplate } from '../../api';
import { FuehrungsrhythmusTemplateCard } from '@/features/templates';
import { CreateFuehrungsrhythmusTemplateDialog } from '@/features/templates';
import { EditFuehrungsrhythmusTemplateDialog } from '@/features/templates';
import { ActivateFuehrungsrhythmusDialog } from '@/features/templates';

interface FuehrungsrhythmusTemplateListProps {
  /** Einsatz-ID fuer die Aktivierung. Wenn null, wird der Aktivieren-Button deaktiviert. */
  einsatzId?: string | null;
  /** Context bestimmt welche Hooks und welcher Scope verwendet wird. */
  context?: 'admin' | 'einsatz';
  className?: string;
}

/**
 * Organism: Liste der Fuehrungsrhythmus-Templates mit Create-Dialog und Aktivierung (Story 6.6 AC2 + 6.7).
 */
export function FuehrungsrhythmusTemplateList({ einsatzId = null, context = 'admin', className }: FuehrungsrhythmusTemplateListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activateTemplateId, setActivateTemplateId] = useState<string | null>(null);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const resolvedEinsatzId = einsatzId ?? '';

  const globalQuery = useGlobalFuehrungsrhythmusTemplates({ enabled: context === 'admin' });
  const einsatzQuery = useEinsatzFuehrungsrhythmusTemplates(resolvedEinsatzId, { enabled: context === 'einsatz' && !!einsatzId });
  const { mutate: deleteEinsatzTemplate, isPending: isDeleting } = useDeleteEinsatzFuehrungsrhythmusTemplate();

  const { data: templates, isLoading, error } = context === 'admin' ? globalQuery : einsatzQuery;

  const selectedTemplate = activateTemplateId ? templates?.find((t) => t.id === activateTemplateId) : null;

  const handleActivate = useCallback((templateId: string) => {
    setActivateTemplateId(templateId);
  }, []);

  const handleEdit = useCallback((templateId: string) => {
    setEditTemplateId(templateId);
  }, []);

  const handleDelete = useCallback((templateId: string) => {
    setDeleteTemplateId(templateId);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTemplateId || !einsatzId) return;
    deleteEinsatzTemplate(
      { einsatzId, id: deleteTemplateId },
      {
        onSuccess: () => {
          setDeleteTemplateId(null);
        },
      },
    );
  }, [deleteTemplateId, einsatzId, deleteEinsatzTemplate]);

  const editTemplate = editTemplateId ? templates?.find((t) => t.id === editTemplateId) : null;
  const deleteTemplate = deleteTemplateId ? templates?.find((t) => t.id === deleteTemplateId) : null;

  const defaultScope = context === 'admin' ? 'GLOBAL' : 'EINSATZ';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiMetronome className="h-5 w-5 text-status-warning-text" />
          <h2 className="text-lg font-semibold text-text-primary">Fuehrungsrhythmus-Templates</h2>
        </div>
        <Button intent="primary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <PiPlus className="mr-1 h-4 w-4" />
          Neues Template
        </Button>
      </div>

      {/* Inhalt */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-status-warning-text border-t-transparent" />
        </div>
      )}

      {error && <div className="rounded-panel bg-status-danger-surface p-4 text-sm text-status-danger-text">Fehler beim Laden der Templates</div>}

      {!isLoading && !error && templates && templates.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-text-muted">
          <PiMetronome className="h-8 w-8 opacity-50" />
          <p className="text-sm">Noch keine Fuehrungsrhythmus-Templates erstellt</p>
          <Button intent="secondary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            Erstes Template erstellen
          </Button>
        </div>
      )}

      {!isLoading && !error && templates && templates.length > 0 && (
        <div className="grid gap-3">
          {templates.map((template) => {
            /** AC6: Im Einsatz-Kontext Edit/Delete nur fuer eigene EINSATZ-Templates */
            const isEinsatzScope = context === 'einsatz' && template.scope === 'EINSATZ';
            return (
              <FuehrungsrhythmusTemplateCard
                key={template.id}
                id={template.id}
                name={template.name}
                beschreibung={template.beschreibung ?? null}
                eintraege={template.eintraege}
                einsatzId={einsatzId}
                scope={template.scope}
                onActivate={handleActivate}
                onEdit={isEinsatzScope ? handleEdit : undefined}
                onDelete={isEinsatzScope ? handleDelete : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateFuehrungsrhythmusTemplateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        defaultScope={defaultScope}
        einsatzId={context === 'einsatz' ? (einsatzId ?? undefined) : undefined}
      />

      {/* Activate Dialog (Story 6.7) */}
      {einsatzId && selectedTemplate && (
        <ActivateFuehrungsrhythmusDialog
          isOpen={!!activateTemplateId}
          onClose={() => setActivateTemplateId(null)}
          template={{
            id: selectedTemplate.id,
            name: selectedTemplate.name,
            beschreibung: selectedTemplate.beschreibung ?? null,
            eintraege: selectedTemplate.eintraege,
          }}
          einsatzId={einsatzId}
          scope={selectedTemplate.scope}
        />
      )}

      {/* Edit Dialog (Story 6.8 AC6) */}
      {editTemplate && (
        <EditFuehrungsrhythmusTemplateDialog
          isOpen={!!editTemplateId}
          onClose={() => setEditTemplateId(null)}
          template={{
            id: editTemplate.id,
            name: editTemplate.name,
            beschreibung: editTemplate.beschreibung ?? null,
            scope: editTemplate.scope,
            einsatzId: einsatzId,
            eintraege: editTemplate.eintraege.map((e) => ({
              titel: e.titel,
              intervallMinuten: e.intervallMinuten,
              offsetMinuten: e.offsetMinuten,
            })),
          }}
        />
      )}

      {/* Delete Confirmation Dialog (Story 6.8 AC6) */}
      <Dialog isOpen={!!deleteTemplateId} onClose={() => !isDeleting && setDeleteTemplateId(null)} size="sm">
        <Dialog.Title>Template loeschen?</Dialog.Title>
        <Dialog.Body>
          <p className="text-sm text-text-secondary">
            Template <span className="font-semibold">'{deleteTemplate?.name}'</span> wirklich loeschen?
          </p>
          <p className="mt-2 text-xs text-text-muted">Bereits erstellte Erinnerungen bleiben erhalten.</p>
        </Dialog.Body>
        <Dialog.Footer loading={isDeleting}>
          <Button intent="secondary" appearance="ghost" onClick={() => setDeleteTemplateId(null)} disabled={isDeleting}>
            Abbrechen
          </Button>
          <Button intent="danger" onClick={handleDeleteConfirm} loading={isDeleting} disabled={isDeleting}>
            <PiTrash className="mr-1.5 h-4 w-4" />
            Loeschen
          </Button>
        </Dialog.Footer>
      </Dialog>
    </div>
  );
}
