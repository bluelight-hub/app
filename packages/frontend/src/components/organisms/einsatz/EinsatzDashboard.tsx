import { api } from '@/api';
import { EinsatzCompletenessBar } from '@/components/molecules/einsatz/einsatz-completeness-bar.molecule';
import { EinsatzStatus, EinsatzStatusBadge } from '@/components/molecules/einsatz/einsatz-status-badge.molecule';
import { EinsatzCreateForm } from '@/components/organisms/einsatz/EinsatzCreateForm';
import { useEinsaetze } from '@/hooks/useEinsaetze';
import { formatNatoDateTime } from '@/utils/dateFormatter';
import { Button } from '@atoms/button.atom';
import { Input } from '@atoms/input.atom';
import { Select } from '@atoms/select.atom';
import type { EinsatzResponseDto } from '@bluelight-hub/shared/client';
import { EinsatzResponseDtoStatusEnum } from '@bluelight-hub/shared/client';
import { Dialog } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PiFunnel, PiFunnelX, PiPlus, PiSpinner, PiTrendDown, PiTrendUp, PiX } from 'react-icons/pi';

interface SortOption {
  key: 'createdAt' | 'alarmstichwort' | 'status';
  direction: 'asc' | 'desc';
}

export function EinsatzDashboard() {
  const [statusFilter, setStatusFilter] = useState<EinsatzResponseDtoStatusEnum | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>({ key: 'createdAt', direction: 'desc' });
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const { einsaetze, isLoading, isFetchingNextPage, hasNextPage, error, fetchNextPage, refetch } = useEinsaetze({
    status: statusFilter,
    search: searchTerm,
    orderBy: sortOption.key,
    orderDirection: sortOption.direction,
    limit: 20,
    infinite: true,
  });

  // Hole Status-Counts vom Backend
  const { data: statusCounts } = useQuery({
    queryKey: ['einsatz', 'status-counts', false],
    queryFn: () => api.einsatz().einsatzControllerGetStatusCountsVAlpha({ includeArchived: false }),
  });

  // Status-Statistiken aus Backend-Daten
  const statusStats = useMemo(() => {
    if (!statusCounts?.data) {
      return {
        [EinsatzResponseDtoStatusEnum.Angelegt]: 0,
        [EinsatzResponseDtoStatusEnum.InBearbeitung]: 0,
        [EinsatzResponseDtoStatusEnum.Abgeschlossen]: 0,
        [EinsatzResponseDtoStatusEnum.Archiviert]: 0,
        total: 0,
        trendsUp: {
          angelegt: false,
          inBearbeitung: true,
          abgeschlossen: false,
        },
      };
    }

    const data = statusCounts.data;
    return {
      [EinsatzResponseDtoStatusEnum.Angelegt]: data.counts?.angelegt || 0,
      [EinsatzResponseDtoStatusEnum.InBearbeitung]: data.counts?.inBearbeitung || 0,
      [EinsatzResponseDtoStatusEnum.Abgeschlossen]: data.counts?.abgeschlossen || 0,
      [EinsatzResponseDtoStatusEnum.Archiviert]: data.counts?.archiviert || 0,
      total: data.total || 0,
      trendsUp: {
        angelegt: false,
        inBearbeitung: true,
        abgeschlossen: false,
      },
    };
  }, [statusCounts]);

  // Intersection Observer für Infinite Scrolling
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage?.();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Keyboard shortcut für neuen Einsatz (Cmd+N oder Ctrl+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+N auf Mac, Ctrl+N auf Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault(); // Verhindert Browser-Default (neue Tab/Fenster)
        setIsCreatePanelOpen(true);
      }
      // Escape zum Schließen
      if (e.key === 'Escape' && isCreatePanelOpen) {
        setIsCreatePanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreatePanelOpen]);

  const handleSort = (key: SortOption['key']) => {
    setSortOption((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleQuickCreate = () => {
    setIsCreatePanelOpen(true);
  };

  const handleCreateSuccess = (_einsatzId: string) => {
    setIsCreatePanelOpen(false);
    refetch();
    // Optional: Navigiere zum neuen Einsatz
    // navigate({ to: `/einsaetze/$einsatzId`, params: { einsatzId } });
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="mb-4 text-red-600">Fehler beim Laden der Einsätze</p>
          <Button onClick={() => refetch()} className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Header - fixed height */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 py-3 sm:px-4 sm:py-4 lg:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Einsatz-Dashboard</h1>
          <Button onClick={handleQuickCreate} title="Neuer Einsatz (Cmd+N)" kbd="Cmd+N">
            <PiPlus className="mr-2 h-5 w-5" />
            Neuer Einsatz
          </Button>
        </div>

        {/* Mobile Status Bar */}
        <div className="mt-3 sm:hidden flex items-center justify-around bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-300">Gesamt</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{statusStats.total}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-blue-600 dark:text-blue-400">Angelegt</p>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-300">{statusStats[EinsatzResponseDtoStatusEnum.Angelegt]}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">In Bearb.</p>
            <p className="text-lg font-bold text-yellow-900 dark:text-yellow-300">{statusStats[EinsatzResponseDtoStatusEnum.InBearbeitung]}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-green-600 dark:text-green-400">Abgeschl.</p>
            <p className="text-lg font-bold text-green-900 dark:text-green-300">{statusStats[EinsatzResponseDtoStatusEnum.Abgeschlossen]}</p>
          </div>
        </div>

        {/* Desktop Status-Übersicht */}
        <div className="mt-4 hidden sm:grid sm:grid-cols-5 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Gesamt</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{statusStats.total}</p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Angelegt</p>
              {statusStats.trendsUp.angelegt ? <PiTrendUp className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : <PiTrendDown className="h-4 w-4 text-blue-400 dark:text-blue-600" />}
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{statusStats[EinsatzResponseDtoStatusEnum.Angelegt]}</p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">In Bearbeitung</p>
              {statusStats.trendsUp.inBearbeitung ? <PiTrendUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" /> : <PiTrendDown className="h-4 w-4 text-yellow-400 dark:text-yellow-600" />}
            </div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">{statusStats[EinsatzResponseDtoStatusEnum.InBearbeitung]}</p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Abgeschlossen</p>
              {statusStats.trendsUp.abgeschlossen ? <PiTrendUp className="h-4 w-4 text-green-600 dark:text-green-400" /> : <PiTrendDown className="h-4 w-4 text-green-400 dark:text-green-600" />}
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">{statusStats[EinsatzResponseDtoStatusEnum.Abgeschlossen]}</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Archiviert</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{statusStats[EinsatzResponseDtoStatusEnum.Archiviert]}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar - fixed height */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 py-2 sm:px-4 sm:py-3 lg:px-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1">
            <Input type="text" placeholder="Einsätze durchsuchen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          {/* Desktop Filter Button */}
          <Button onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)} variant="secondary" className="hidden sm:flex">
            <PiFunnel className="h-5 w-5 mr-2" />
            Filter & Sortierung
          </Button>
          {/* Mobile Filter Button */}
          <Button onClick={() => setIsMobileFilterOpen(true)} variant="secondary" className="sm:hidden">
            <PiFunnel className="h-5 w-5 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Main Content Area - takes remaining space */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar Filter Panel (collapsible) - hidden on mobile */}
        {isFilterPanelOpen && (
          <div className="hidden sm:block flex-shrink-0 w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Filter & Sortierung</h3>

            <div className="space-y-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status filtern</label>
                <Select
                  value={statusFilter || ''}
                  onChange={(e) => setStatusFilter((e.target.value as EinsatzResponseDtoStatusEnum) || undefined)}
                  selectSize="sm"
                  fullWidth
                  placeholder="Alle Status"
                  options={[
                    { value: '', label: 'Alle Status' },
                    { value: EinsatzResponseDtoStatusEnum.Angelegt, label: 'Angelegt' },
                    { value: EinsatzResponseDtoStatusEnum.InBearbeitung, label: 'In Bearbeitung' },
                    { value: EinsatzResponseDtoStatusEnum.Abgeschlossen, label: 'Abgeschlossen' },
                    { value: EinsatzResponseDtoStatusEnum.Archiviert, label: 'Archiviert' },
                  ]}
                />
              </div>

              {/* Sortierung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sortieren nach</label>
                <div className="space-y-2">
                  <Button
                    variant={'ghost'}
                    onClick={() => handleSort('createdAt')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      sortOption.key === 'createdAt' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Erstellungsdatum {sortOption.key === 'createdAt' && (sortOption.direction === 'asc' ? '↑' : '↓')}
                  </Button>
                  <Button
                    variant={'ghost'}
                    onClick={() => handleSort('alarmstichwort')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      sortOption.key === 'alarmstichwort' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Alarmstichwort {sortOption.key === 'alarmstichwort' && (sortOption.direction === 'asc' ? '↑' : '↓')}
                  </Button>
                  <Button
                    variant={'ghost'}
                    onClick={() => handleSort('status')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      sortOption.key === 'status' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Status {sortOption.key === 'status' && (sortOption.direction === 'asc' ? '↑' : '↓')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Einsatz Liste - scrollable area */}
        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950 overscroll-contain" ref={listContainerRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Einsätze...</p>
              </div>
            </div>
          ) : einsaetze.length === 0 && !isFetchingNextPage ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">Keine Einsätze gefunden</p>
                {!statusFilter ? (
                  <Button onClick={handleQuickCreate}>
                    <PiPlus className="h-5 w-5 mr-2" />
                    Ersten Einsatz erstellen
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={() => setStatusFilter(undefined)}>
                    <PiFunnelX className="mr-2 h-5 w-5" />
                    Filter entfernen
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="min-h-0 p-3 sm:p-4 space-y-2">
              {einsaetze.map((einsatz) => (
                <div key={einsatz.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <EinsatzListItem einsatz={einsatz} />
                </div>
              ))}

              {/* Load More Trigger & Indicator */}
              <div ref={observerTarget} className="mt-4">
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                    <PiSpinner className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Lade weitere Einsätze...</span>
                  </div>
                )}
                {!hasNextPage && einsaetze.length > 0 && <div className="text-center text-gray-500 dark:text-gray-400 text-sm p-4">Alle {einsaetze.length} Einsätze geladen</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Einsatz Create Form Panel */}
      <EinsatzCreateForm isOpen={isCreatePanelOpen} onClose={() => setIsCreatePanelOpen(false)} onSuccess={handleCreateSuccess} />

      {/* Mobile Filter Modal */}
      <Dialog open={isMobileFilterOpen} onClose={() => setIsMobileFilterOpen(false)} className="sm:hidden relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-end">
          <Dialog.Panel className="w-full max-h-[80vh] bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">Filter & Sortierung</Dialog.Title>
              <Button variant="ghost" size="sm" onClick={() => setIsMobileFilterOpen(false)} className="rounded-full">
                <PiX className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status filtern</label>
                <Select
                  value={statusFilter || ''}
                  onChange={(e) => {
                    setStatusFilter((e.target.value as EinsatzResponseDtoStatusEnum) || undefined);
                    setIsMobileFilterOpen(false);
                  }}
                  selectSize="md"
                  fullWidth
                  placeholder="Alle Status"
                  options={[
                    { value: '', label: 'Alle Status' },
                    { value: EinsatzResponseDtoStatusEnum.Angelegt, label: 'Angelegt' },
                    { value: EinsatzResponseDtoStatusEnum.InBearbeitung, label: 'In Bearbeitung' },
                    { value: EinsatzResponseDtoStatusEnum.Abgeschlossen, label: 'Abgeschlossen' },
                    { value: EinsatzResponseDtoStatusEnum.Archiviert, label: 'Archiviert' },
                  ]}
                />
              </div>

              {/* Sortierung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sortieren nach</label>
                <div className="space-y-2">
                  <Button
                    variant={'ghost'}
                    onClick={() => {
                      handleSort('createdAt');
                      setIsMobileFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      sortOption.key === 'createdAt' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Erstellungsdatum {sortOption.key === 'createdAt' && (sortOption.direction === 'asc' ? '↑' : '↓')}
                  </Button>
                  <Button
                    variant={'ghost'}
                    onClick={() => {
                      handleSort('alarmstichwort');
                      setIsMobileFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      sortOption.key === 'alarmstichwort' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Alarmstichwort {sortOption.key === 'alarmstichwort' && (sortOption.direction === 'asc' ? '↑' : '↓')}
                  </Button>
                  <Button
                    variant={'ghost'}
                    onClick={() => {
                      handleSort('status');
                      setIsMobileFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      sortOption.key === 'status' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Status {sortOption.key === 'status' && (sortOption.direction === 'asc' ? '↑' : '↓')}
                  </Button>
                </div>
              </div>

              {/* Reset Button */}
              <Button
                variant="secondary"
                onClick={() => {
                  setStatusFilter(undefined);
                  setSortOption({ key: 'createdAt', direction: 'desc' });
                  setIsMobileFilterOpen(false);
                }}
                className="w-full"
              >
                Filter zurücksetzen
              </Button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}

interface EinsatzListItemProps {
  einsatz: EinsatzResponseDto;
}

function EinsatzListItem({ einsatz }: EinsatzListItemProps) {
  return (
    <div className="cursor-pointer px-3 py-3 sm:px-4 sm:py-4 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 sm:mb-2 flex items-start sm:items-center justify-between gap-2">
            <h3 className="font-medium text-gray-900 text-base sm:text-lg dark:text-white line-clamp-2 sm:line-clamp-1">{einsatz.alarmstichwort || 'Kein Alarmstichwort'}</h3>
            <EinsatzStatusBadge status={einsatz.status || EinsatzStatus.ANGELEGT} size="sm" className="flex-shrink-0" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 gap-1 sm:gap-2 sm:space-x-2">
            <span className="font-mono">{formatNatoDateTime(einsatz.createdAt)}</span>
            {einsatz.einsatzort && <span className="truncate">📍 {einsatz.einsatzort}</span>}
            {einsatz.einsatzleiter && <span className="truncate hidden sm:inline">Leiter: {einsatz.einsatzleiter}</span>}
          </div>
          <div className="mt-2">
            <EinsatzCompletenessBar einsatz={einsatz} showTooltip={false} showPercentage={true} size="sm" className="max-w-full sm:max-w-xs" />
          </div>
        </div>
      </div>
    </div>
  );
}
