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
import { ViewNotizDialog } from './ViewNotizDialog';

interface NotizListProps {
  einsatzId: string;
  className?: string;
  /**
   * Anzeige-Modus der NotizList.
   * - 'default': Vollstaendige Ansicht mit Suche, Filtern und allen Details
   * - 'sidebar': Kompakte Sidebar-Ansicht ohne Suche/Filter, fuer Pinnwand-Widget
   * @default 'default'
   */
  mode?: 'default' | 'sidebar';
}

/**
 * Organism: Liste der Notizen fuer einen Einsatz mit Create-, Edit- und Convert-to-Erinnerung-Dialog (Story 7.1, 7.3, 7.6).
 */
export function NotizList({ einsatzId, className, mode = 'default' }: NotizListProps) {
  const { user: currentUser } = useCurrentUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewingNotiz, setViewingNotiz] = useState<NotizResponseDto | null>(null);
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

  const isSidebar = mode === 'sidebar';

  return (
    <div className={cn(isSidebar ? '' : 'space-y-4', className)}>
      {/* Header */}
      {isSidebar ? (
        <div className="flex items-center justify-between rounded-t-xl border border-border-subtle bg-surface-panel px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <PiNotepad className="h-4 w-4 text-text-muted" />
            <h2 className="font-bold text-text-primary text-lg tracking-tight">Notizen</h2>
          </div>
          <Button intent="primary" size="sm" onClick={() => setIsCreateDialogOpen(true)} className="h-7 rounded-lg px-3 font-semibold text-xs">
            <PiPlus className="mr-0.5 h-3.5 w-3.5" />
            Neu
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiNotepad className="h-5 w-5 text-text-muted" />
            <h2 className="font-semibold text-text-primary text-lg">Notizen</h2>
          </div>
          <Button intent="primary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <PiPlus className="mr-1 h-4 w-4" />
            Neue Notiz
          </Button>
        </div>
      )}

      {/* Story 7.8 / Story 8.3: Suchfeld und Filter - nur anzeigen wenn Notizen vorhanden und nicht im Sidebar-Modus */}
      {mode !== 'sidebar' && !isLoading && !error && notizen && notizen.length > 0 && (
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
            <span className="text-text-muted text-xs">
              {filteredNotizen?.length ?? 0} von {notizen.length}
            </span>
          )}
        </div>
      )}

      {/* Story 8.6 Task 4: Aktive Filter als Chips anzeigen (nur Kategorie fuer Notizen) */}
      {mode !== 'sidebar' && !isLoading && !error && notizen && notizen.length > 0 && (
        <ActiveFiltersBar kategorieFilter={selectedKategorieFilter} kategorien={kategorien} onClearKategorieFilter={handleClearKategorieFilter} />
      )}

      {/* Content - im Sidebar-Modus als Container-Body (passend zum Header) */}
      {isSidebar ? (
        <div className="overflow-y-auto rounded-b-xl border-border-subtle border-x border-b bg-surface-panel" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
            </div>
          )}
          {error && <div className="p-4 text-status-danger-text text-sm">Fehler beim Laden</div>}
          {!isLoading && !error && notizen && notizen.length === 0 && (
            <div className="py-6 text-center text-text-muted">
              <PiNotepad className="mx-auto h-6 w-6 opacity-40" />
              <p className="mt-1 text-xs">Keine Notizen</p>
            </div>
          )}
          {!isLoading && !error && filteredNotizen && filteredNotizen.length > 0 && (
            <>
              {filteredNotizen.slice(0, 5).map((notiz) => (
                // biome-ignore lint/a11y/useSemanticElements: Div mit komplexem Inhalt
                <div
                  key={notiz.id}
                  className="cursor-pointer border-border-subtle/50 border-b px-4 py-3 transition-colors hover:bg-surface-raised"
                  onClick={() => setViewingNotiz(notiz)}
                  onKeyUp={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setViewingNotiz(notiz);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h3 className="truncate font-medium text-text-primary text-sm">{notiz.titel}</h3>
                    <span className="mt-0.5 flex-shrink-0 text-[10px] text-text-muted">{new Date(notiz.updatedAt).toLocaleDateString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {notiz.inhalt && <p className="mb-1.5 truncate text-text-muted text-xs">{notiz.inhalt}</p>}
                  {typeof notiz.kategorieName === 'string' && typeof notiz.kategorieFarbe === 'string' && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: notiz.kategorieFarbe }} />
                      <span className="font-medium text-[10px] text-text-muted uppercase tracking-wider">{notiz.kategorieName}</span>
                    </div>
                  )}
                </div>
              ))}
              {/* "Alle anzeigen" Link */}
              {filteredNotizen.length > 5 && (
                <div className="px-4 py-3">
                  <button
                    type="button"
                    className="flex items-center gap-1 font-medium text-action-primary text-sm transition-colors hover:opacity-80 focus:outline-none focus-visible:shadow-focus-ring"
                    onClick={() => {
                      /* TODO: Navigation zur vollen Notizen-Seite */
                    }}
                  >
                    Alle anzeigen &rarr;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
            </div>
          )}

          {/* Error */}
          {error && <div className="rounded-panel bg-status-danger-surface p-4 text-status-danger-text text-sm">Fehler beim Laden der Notizen</div>}

          {/* Empty State */}
          {!isLoading && !error && notizen && notizen.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-text-muted">
              <PiNotepad className="h-8 w-8 opacity-50" aria-hidden="true" />
              <p className="text-sm">Noch keine Notizen vorhanden</p>
              <Button intent="secondary" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                Erste Notiz erstellen
              </Button>
            </div>
          )}

          {/* Such-Empty-State (Story 7.8 AC5) */}
          {!isLoading && !error && searchQuery && filteredNotizen && filteredNotizen.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-text-muted">
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
                  onClick={() => setViewingNotiz(notiz)}
                  onEdit={notiz.erstelltVon === currentUser?.id ? () => setEditingNotiz(notiz) : undefined}
                  onDelete={notiz.erstelltVon === currentUser?.id ? () => setDeletingNotiz(notiz) : undefined}
                  onConvertToErinnerung={() => setConvertingNotiz(notiz)}
                  searchQuery={searchQuery || undefined}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Dialog */}
      <CreateNotizDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} einsatzId={einsatzId} />

      {/* Edit Dialog */}
      {editingNotiz && <EditNotizDialog isOpen={!!editingNotiz} onClose={() => setEditingNotiz(null)} einsatzId={einsatzId} notiz={editingNotiz} />}

      {/* Delete Dialog */}
      <DeleteNotizDialog isOpen={!!deletingNotiz} onClose={() => setDeletingNotiz(null)} notiz={deletingNotiz} einsatzId={einsatzId} />

      {/* View Dialog (Lese-Ansicht) */}
      <ViewNotizDialog
        isOpen={!!viewingNotiz}
        onClose={() => setViewingNotiz(null)}
        notiz={viewingNotiz}
        isOwner={viewingNotiz?.erstelltVon === currentUser?.id}
        onEdit={
          viewingNotiz?.erstelltVon === currentUser?.id
            ? () => {
                if (viewingNotiz) {
                  setEditingNotiz(viewingNotiz);
                  setViewingNotiz(null);
                }
              }
            : undefined
        }
        onDelete={
          viewingNotiz?.erstelltVon === currentUser?.id
            ? () => {
                if (viewingNotiz) {
                  setDeletingNotiz(viewingNotiz);
                  setViewingNotiz(null);
                }
              }
            : undefined
        }
        onConvertToErinnerung={() => {
          if (viewingNotiz) {
            setConvertingNotiz(viewingNotiz);
            setViewingNotiz(null);
          }
        }}
      />

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
