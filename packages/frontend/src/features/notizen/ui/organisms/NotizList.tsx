import { useCallback, useEffect, useMemo, useState } from 'react';
import { PiNotepad, PiPlus } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';
import type { NotizResponseDto } from '@bluelight-hub/shared/client';
import { QuickCreateErinnerungDialog, KategorieFilterDropdown, ActiveFiltersBar } from '@/features/reminders';
import { useKategorieFilter, setKategorieFilter, resetKategorieFilterStore, type KategorieFilterType } from '@/features/reminders/stores';
import { useCurrentUser } from '@/features/auth/api';
import { useKategorienByEinsatz } from '@/features/kategorien';

import { useNotizenByEinsatz } from '../../api';
import { NotizCard } from '../atoms/NotizCard';
import { NotizSearchBar } from '../molecules/NotizSearchBar';
import { CreateNotizDialog } from './CreateNotizDialog';
import { EditNotizDialog } from './EditNotizDialog';
import { DeleteNotizDialog } from './DeleteNotizDialog';

interface NotizListProps {
  einsatzId: string;
  className?: string;
}

/**
 * Organism: Liste der Notizen fuer einen Einsatz mit Create-, Edit- und Convert-to-Erinnerung-Dialog (Story 7.1, 7.3, 7.6).
 */
export function NotizList({ einsatzId, className }: NotizListProps) {
  const { user: currentUser } = useCurrentUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingNotiz, setEditingNotiz] = useState<NotizResponseDto | null>(null);
  const [deletingNotiz, setDeletingNotiz] = useState<NotizResponseDto | null>(null);
  const [convertingNotiz, setConvertingNotiz] = useState<NotizResponseDto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: notizen, isLoading, error } = useNotizenByEinsatz(einsatzId);

  // Story 8.3 Task 5.1: Kategorie-Filter Store Hook (gleicher Store wie Erinnerungen)
  const selectedKategorieFilter = useKategorieFilter();

  // Story 8.3 Task 5.2: Kategorien aus Einsatz laden
  const { data: kategorien = [] } = useKategorienByEinsatz(einsatzId);

  // Story 8.3: Kategorie-Filter-Change Handler
  const handleKategorieFilterChange = useCallback((filter: KategorieFilterType) => {
    setKategorieFilter(filter);
  }, []);

  // Story 8.6 Task 4: Clear-Kategorie-Filter Handler fuer ActiveFiltersBar
  const handleClearKategorieFilter = useCallback(() => {
    setKategorieFilter({ type: 'all' });
  }, []);

  // Story 8.3: Cleanup bei Unmount
  useEffect(() => {
    return () => {
      resetKategorieFilterStore();
    };
  }, []);

  /**
   * Story 8.3 Task 5.2: Kategorie-Filter-Logik fuer Notizen
   */
  const kategorieFilteredNotizen = useMemo(() => {
    if (!notizen) return notizen;
    switch (selectedKategorieFilter.type) {
      case 'all':
        return notizen;
      case 'kategorie':
        return notizen.filter((n) => n.kategorieId === selectedKategorieFilter.kategorieId);
      case 'untagged':
        return notizen.filter((n) => !n.kategorieId);
    }
  }, [notizen, selectedKategorieFilter]);

  /**
   * Story 7.8: Textsuche (nach Kategorie-Filterung)
   */
  const filteredNotizen = useMemo(() => {
    if (!kategorieFilteredNotizen || !searchQuery) return kategorieFilteredNotizen;
    const q = searchQuery.toLowerCase();
    return kategorieFilteredNotizen.filter((n) => n.titel.toLowerCase().includes(q) || n.inhalt?.toLowerCase().includes(q));
  }, [kategorieFilteredNotizen, searchQuery]);

  /** Story 8.3: Ist der Kategorie-Filter aktiv? */
  const isKategorieFilterActive = selectedKategorieFilter.type !== 'all';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiNotepad className="h-5 w-5 text-slate-500" />
          <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Notizen</h2>
        </div>
        <Button intent="primary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <PiPlus className="mr-1 h-4 w-4" />
          Neue Notiz
        </Button>
      </div>

      {/* Story 7.8 / Story 8.3: Suchfeld und Filter - nur anzeigen wenn Notizen vorhanden */}
      {!isLoading && !error && notizen && notizen.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1">
            <NotizSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              resultCount={searchQuery ? filteredNotizen?.length : undefined}
              totalCount={notizen.length}
            />
          </div>
          {/* Story 8.3 Task 5.3: Kategorie-Filter-Dropdown */}
          <KategorieFilterDropdown selectedFilter={selectedKategorieFilter} onFilterChange={handleKategorieFilterChange} kategorien={kategorien} className="w-44" />
          {/* Story 8.6 AC5: Filter-Count anzeigen */}
          {isKategorieFilterActive && (
            <span className="text-gray-500 text-xs dark:text-gray-400">
              {filteredNotizen?.length ?? 0} von {notizen.length}
            </span>
          )}
        </div>
      )}

      {/* Story 8.6 Task 4: Aktive Filter als Chips anzeigen (nur Kategorie fuer Notizen) */}
      {!isLoading && !error && notizen && notizen.length > 0 && (
        <ActiveFiltersBar kategorieFilter={selectedKategorieFilter} kategorien={kategorien} onClearKategorieFilter={handleClearKategorieFilter} />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {error && <div className="rounded-lg bg-red-50 p-4 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400">Fehler beim Laden der Notizen</div>}

      {/* Empty State */}
      {!isLoading && !error && notizen && notizen.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-gray-500 dark:text-gray-400">
          <PiNotepad className="h-8 w-8 opacity-50" aria-hidden="true" />
          <p className="text-sm">Noch keine Notizen vorhanden</p>
          <Button intent="secondary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            Erste Notiz erstellen
          </Button>
        </div>
      )}

      {/* Such-Empty-State (Story 7.8 AC5) */}
      {!isLoading && !error && searchQuery && filteredNotizen && filteredNotizen.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-gray-500 dark:text-gray-400">
          <PiNotepad className="h-8 w-8 opacity-50" aria-hidden="true" />
          <p className="text-sm">Keine Notizen für &lsquo;{searchQuery}&rsquo; gefunden</p>
          <p className="text-xs">Versuche einen anderen Suchbegriff</p>
        </div>
      )}

      {/* Notiz-Liste */}
      {!isLoading && !error && filteredNotizen && filteredNotizen.length > 0 && (
        <div className="grid gap-3">
          {filteredNotizen.map((notiz) => (
            <NotizCard
              key={notiz.id}
              id={notiz.id}
              titel={notiz.titel}
              inhalt={notiz.inhalt}
              kategorieName={notiz.kategorieName as string | null}
              kategorieFarbe={notiz.kategorieFarbe as string | null}
              erstelltVon={notiz.erstelltVon}
              createdAt={notiz.createdAt}
              updatedAt={notiz.updatedAt}
              istTeamsichtbar={notiz.istTeamsichtbar}
              erstelltVonName={notiz.erstelltVonName}
              isOwner={notiz.erstelltVon === currentUser?.id}
              onEdit={notiz.erstelltVon === currentUser?.id ? () => setEditingNotiz(notiz) : undefined}
              onDelete={notiz.erstelltVon === currentUser?.id ? () => setDeletingNotiz(notiz) : undefined}
              onConvertToErinnerung={() => setConvertingNotiz(notiz)}
              searchQuery={searchQuery || undefined}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateNotizDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} einsatzId={einsatzId} />

      {/* Edit Dialog */}
      {editingNotiz && <EditNotizDialog isOpen={!!editingNotiz} onClose={() => setEditingNotiz(null)} einsatzId={einsatzId} notiz={editingNotiz} />}

      {/* Delete Dialog */}
      <DeleteNotizDialog isOpen={!!deletingNotiz} onClose={() => setDeletingNotiz(null)} notiz={deletingNotiz} einsatzId={einsatzId} />

      {/* Convert to Erinnerung Dialog (Story 7.6) */}
      {convertingNotiz && (
        <QuickCreateErinnerungDialog
          isOpen={!!convertingNotiz}
          onClose={() => setConvertingNotiz(null)}
          einsatzId={einsatzId}
          fromNotiz={{
            notizId: convertingNotiz.id,
            titel: convertingNotiz.titel,
            inhalt: convertingNotiz.inhalt,
          }}
        />
      )}
    </div>
  );
}
