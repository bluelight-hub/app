import { useState } from 'react';
import { PiAlarm, PiPlus } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';
import { useVorlagen } from '../../api';
import { VorlageCard } from '../atoms/VorlageCard';
import { CreateVorlageDialog } from '@/features/templates';
import { EditVorlageDialog } from './EditVorlageDialog';
import { DeleteVorlageConfirm } from '@/features/templates';

interface VorlageListProps {
  className?: string;
}

/**
 * Organism: Liste der Vorlagen mit Create/Edit/Delete (Story 6.1 + 6.2).
 */
export function VorlageList({ className }: VorlageListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingVorlage, setEditingVorlage] = useState<{ id: string; titel: string; minuten: number; beschreibung: string | null } | null>(null);
  const [deletingVorlage, setDeletingVorlage] = useState<{ id: string; titel: string } | null>(null);
  const { data: vorlagen, isLoading, error } = useVorlagen();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiAlarm className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Vorlagen</h2>
        </div>
        <Button intent="primary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <PiPlus className="mr-1 h-4 w-4" />
          Neue Vorlage
        </Button>
      </div>

      {/* Inhalt */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 p-4 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400">Fehler beim Laden der Vorlagen</div>}

      {!isLoading && !error && vorlagen && vorlagen.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-gray-500 dark:text-gray-400">
          <PiAlarm className="h-8 w-8 opacity-50" />
          <p className="text-sm">Noch keine Vorlagen erstellt</p>
          <Button intent="secondary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            Erste Vorlage erstellen
          </Button>
        </div>
      )}

      {!isLoading && !error && vorlagen && vorlagen.length > 0 && (
        <div className="grid gap-3">
          {vorlagen.map((vorlage) => (
            <VorlageCard
              key={vorlage.id}
              titel={vorlage.titel}
              minuten={vorlage.minuten}
              beschreibung={vorlage.beschreibung ?? null}
              onEdit={() => setEditingVorlage({ id: vorlage.id, titel: vorlage.titel, minuten: vorlage.minuten, beschreibung: vorlage.beschreibung ?? null })}
              onDelete={() => setDeletingVorlage({ id: vorlage.id, titel: vorlage.titel })}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateVorlageDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} />
      <EditVorlageDialog isOpen={editingVorlage !== null} onClose={() => setEditingVorlage(null)} vorlage={editingVorlage} />
      <DeleteVorlageConfirm isOpen={deletingVorlage !== null} onClose={() => setDeletingVorlage(null)} vorlage={deletingVorlage} />
    </div>
  );
}
