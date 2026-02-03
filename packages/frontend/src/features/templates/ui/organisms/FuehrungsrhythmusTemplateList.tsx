import { useState } from 'react';
import { PiMetronome, PiPlus } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';
import { useFuehrungsrhythmusTemplates } from '../../api';
import { FuehrungsrhythmusTemplateCard } from '../atoms/FuehrungsrhythmusTemplateCard';
import { CreateFuehrungsrhythmusTemplateDialog } from './CreateFuehrungsrhythmusTemplateDialog';

interface FuehrungsrhythmusTemplateListProps {
  className?: string;
}

/**
 * Organism: Liste der Fuehrungsrhythmus-Templates mit Create-Dialog (Story 6.6 AC2).
 */
export function FuehrungsrhythmusTemplateList({ className }: FuehrungsrhythmusTemplateListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data: templates, isLoading, error } = useFuehrungsrhythmusTemplates();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiMetronome className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Fuehrungsrhythmus-Templates</h2>
        </div>
        <Button intent="primary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <PiPlus className="mr-1 h-4 w-4" />
          Neues Template
        </Button>
      </div>

      {/* Inhalt */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 p-4 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400">Fehler beim Laden der Templates</div>}

      {!isLoading && !error && templates && templates.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-gray-500 dark:text-gray-400">
          <PiMetronome className="h-8 w-8 opacity-50" />
          <p className="text-sm">Noch keine Fuehrungsrhythmus-Templates erstellt</p>
          <Button intent="secondary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            Erstes Template erstellen
          </Button>
        </div>
      )}

      {!isLoading && !error && templates && templates.length > 0 && (
        <div className="grid gap-3">
          {templates.map((template) => (
            <FuehrungsrhythmusTemplateCard key={template.id} name={template.name} beschreibung={template.beschreibung ?? null} eintraege={template.eintraege} />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateFuehrungsrhythmusTemplateDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} />
    </div>
  );
}
