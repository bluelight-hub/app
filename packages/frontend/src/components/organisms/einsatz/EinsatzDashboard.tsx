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
import { EinsatzControllerFindAllVAlphaOrderByEnum, EinsatzControllerFindAllVAlphaOrderDirectionEnum, EinsatzResponseDtoStatusEnum } from '@bluelight-hub/shared/client';
import { Dialog } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PiFunnel, PiFunnelX, PiPlus, PiSpinner, PiTrendDown, PiTrendUp, PiX } from 'react-icons/pi';

interface SortOption {
  key: EinsatzControllerFindAllVAlphaOrderByEnum;
  direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum;
}

export function EinsatzDashboard() {
  const [statusFilter, setStatusFilter] = useState<EinsatzResponseDtoStatusEnum | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>({
    key: EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt,
    direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum.Desc,
  });
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
      direction:
        prev.key === key && prev.direction === EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc
          ? EinsatzControllerFindAllVAlphaOrderDirectionEnum.Desc
          : EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc,
    }));
  };

  const handleQuickCreate = () => {
    setIsCreatePanelOpen(true);
  };

  const handleCreateSuccess = (_einsatzId: string) => {
    setIsCreatePanelOpen(false);
    refetch();
    // Optional: Navigiere zum neuen Einsatz
    // navigate({ to: `/app/einsaetze/$einsatzId`, params: { einsatzId } });
  };

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
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
    <div className="flex h-full min-h-0 flex-col">
      {/* Header - fixed height */}
      <div className="flex-shrink-0 border-gray-200 border-b bg-white px-2 py-3 sm:px-4 sm:py-4 lg:px-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-2xl text-gray-900 dark:text-white">Einsatz-Dashboard</h1>
          <Button onClick={handleQuickCreate} title="Neuer Einsatz (Cmd+N)" kbd="Cmd+N">
            <PiPlus className="mr-2 h-5 w-5" />
            Neuer Einsatz
          </Button>
        </div>

        {/* Mobile Status Bar */}
        <div className="mt-3 flex items-center justify-around rounded-lg bg-gray-50 p-2 sm:hidden dark:bg-gray-700">
          <div className="text-center">
            <p className="text-gray-600 text-xs dark:text-gray-300">Gesamt</p>
            <p className="font-bold text-gray-900 text-lg dark:text-white">{statusStats.total}</p>
          </div>
          <div className="text-center">
            <p className="text-blue-600 text-xs dark:text-blue-400">Angelegt</p>
            <p className="font-bold text-blue-900 text-lg dark:text-blue-300">{statusStats[EinsatzResponseDtoStatusEnum.Angelegt]}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">In Bearb.</p>
            <p className="font-bold text-lg text-yellow-900 dark:text-yellow-300">{statusStats[EinsatzResponseDtoStatusEnum.InBearbeitung]}</p>
          </div>
          <div className="text-center">
            <p className="text-green-600 text-xs dark:text-green-400">Abgeschl.</p>
            <p className="font-bold text-green-900 text-lg dark:text-green-300">{statusStats[EinsatzResponseDtoStatusEnum.Abgeschlossen]}</p>
          </div>
        </div>

        {/* Desktop Status-Übersicht */}
        <div className="mt-4 hidden gap-4 sm:grid sm:grid-cols-5">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-600 text-sm dark:text-gray-300">Gesamt</p>
            </div>
            <p className="font-bold text-2xl text-gray-900 dark:text-white">{statusStats.total}</p>
          </div>

          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <div className="flex items-center justify-between">
              <p className="font-medium text-blue-600 text-sm dark:text-blue-400">Angelegt</p>
              {statusStats.trendsUp.angelegt ? <PiTrendUp className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : <PiTrendDown className="h-4 w-4 text-blue-400 dark:text-blue-600" />}
            </div>
            <p className="font-bold text-2xl text-blue-900 dark:text-blue-300">{statusStats[EinsatzResponseDtoStatusEnum.Angelegt]}</p>
          </div>

          <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm text-yellow-600 dark:text-yellow-400">In Bearbeitung</p>
              {statusStats.trendsUp.inBearbeitung ? <PiTrendUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" /> : <PiTrendDown className="h-4 w-4 text-yellow-400 dark:text-yellow-600" />}
            </div>
            <p className="font-bold text-2xl text-yellow-900 dark:text-yellow-300">{statusStats[EinsatzResponseDtoStatusEnum.InBearbeitung]}</p>
          </div>

          <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
            <div className="flex items-center justify-between">
              <p className="font-medium text-green-600 text-sm dark:text-green-400">Abgeschlossen</p>
              {statusStats.trendsUp.abgeschlossen ? <PiTrendUp className="h-4 w-4 text-green-600 dark:text-green-400" /> : <PiTrendDown className="h-4 w-4 text-green-400 dark:text-green-600" />}
            </div>
            <p className="font-bold text-2xl text-green-900 dark:text-green-300">{statusStats[EinsatzResponseDtoStatusEnum.Abgeschlossen]}</p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-600 text-sm dark:text-gray-300">Archiviert</p>
            </div>
            <p className="font-bold text-2xl text-gray-900 dark:text-white">{statusStats[EinsatzResponseDtoStatusEnum.Archiviert]}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar - fixed height */}
      <div className="flex-shrink-0 border-gray-200 border-b bg-white px-2 py-2 sm:px-4 sm:py-3 lg:px-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <div className="flex-1">
            <Input type="text" placeholder="Einsätze durchsuchen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          {/* Desktop Filter Button */}
          <Button onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)} variant="secondary" className="hidden sm:flex">
            <PiFunnel className="mr-2 h-5 w-5" />
            Filter & Sortierung
          </Button>
          {/* Mobile Filter Button */}
          <Button onClick={() => setIsMobileFilterOpen(true)} variant="secondary" className="sm:hidden">
            <PiFunnel className="mr-2 h-5 w-5" />
            Filter
          </Button>
        </div>
      </div>

      {/* Main Content Area - takes remaining space */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar Filter Panel (collapsible) - hidden on mobile */}
        {isFilterPanelOpen && (
          <div className="hidden w-64 flex-shrink-0 overflow-y-auto border-gray-200 border-r bg-gray-50 p-4 sm:block dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-4 font-medium text-gray-900 text-lg dark:text-white">Filter & Sortierung</h3>

            <div className="space-y-4">
              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter-desktop" className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Status filtern
                </label>
                <Select
                  id="status-filter-desktop"
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
                <span className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">Sortieren nach</span>
                <div className="space-y-2">
                  <Button
                    variant={'ghost'}
                    onClick={() => handleSort(EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                      sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Erstellungsdatum{' '}
                    {sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt && (sortOption.direction === EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc ? '↑' : '↓')}
                  </Button>
                  <Button
                    variant={'ghost'}
                    onClick={() => handleSort(EinsatzControllerFindAllVAlphaOrderByEnum.Alarmstichwort)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                      sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.Alarmstichwort
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Alarmstichwort{' '}
                    {sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.Alarmstichwort && (sortOption.direction === EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc ? '↑' : '↓')}
                  </Button>
                  <Button
                    variant={'ghost'}
                    onClick={() => handleSort(EinsatzControllerFindAllVAlphaOrderByEnum.Status)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                      sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.Status
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Status {sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.Status && (sortOption.direction === EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc ? '↑' : '↓')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Einsatz Liste - scrollable area */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-gray-100 dark:bg-gray-950" ref={listContainerRef}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-blue-600 border-b-2"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Einsätze...</p>
              </div>
            </div>
          ) : einsaetze.length === 0 && !isFetchingNextPage ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="mb-4 text-gray-600 dark:text-gray-400">Keine Einsätze gefunden</p>
                {!statusFilter ? (
                  <Button onClick={handleQuickCreate}>
                    <PiPlus className="mr-2 h-5 w-5" />
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
            <div className="min-h-0 space-y-2 p-3 sm:p-4">
              {einsaetze.map((einsatz) => (
                <Link
                  key={einsatz.id}
                  to="/app/einsaetze/$einsatzId"
                  params={{ einsatzId: einsatz.id }}
                  className="block rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                >
                  <EinsatzListItem einsatz={einsatz} />
                </Link>
              ))}

              {/* Load More Trigger & Indicator */}
              <div ref={observerTarget} className="mt-4">
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center rounded-lg bg-white p-4 dark:bg-gray-800">
                    <PiSpinner className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Lade weitere Einsätze...</span>
                  </div>
                )}
                {!hasNextPage && einsaetze.length > 0 && <div className="p-4 text-center text-gray-500 text-sm dark:text-gray-400">Alle {einsaetze.length} Einsätze geladen</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Einsatz Create Form Panel */}
      <EinsatzCreateForm isOpen={isCreatePanelOpen} onClose={() => setIsCreatePanelOpen(false)} onSuccess={handleCreateSuccess} />

      {/* Mobile Filter Modal */}
      <Dialog open={isMobileFilterOpen} onClose={() => setIsMobileFilterOpen(false)} className="relative z-50 sm:hidden">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-end">
          <Dialog.Panel className="max-h-[80vh] w-full rounded-t-2xl bg-white shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-gray-200 border-b p-4 dark:border-gray-700">
              <Dialog.Title className="font-medium text-gray-900 text-lg dark:text-white">Filter & Sortierung</Dialog.Title>
              <Button variant="ghost" size="sm" onClick={() => setIsMobileFilterOpen(false)} className="rounded-full">
                <PiX className="h-5 w-5" />
              </Button>
            </div>

            <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter-mobile" className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Status filtern
                </label>
                <Select
                  id="status-filter-mobile"
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
                <span className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">Sortieren nach</span>
                <div className="space-y-2">
                  <Button
                    variant={'ghost'}
                    onClick={() => {
                      handleSort(EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt);
                      setIsMobileFilterOpen(false);
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                      sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Erstellungsdatum{' '}
                    {sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt && (sortOption.direction === EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc ? '↑' : '↓')}
                  </Button>
                  <Button
                    variant={'ghost'}
                    onClick={() => {
                      handleSort(EinsatzControllerFindAllVAlphaOrderByEnum.Alarmstichwort);
                      setIsMobileFilterOpen(false);
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                      sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.Alarmstichwort
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Alarmstichwort{' '}
                    {sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.Alarmstichwort && (sortOption.direction === EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc ? '↑' : '↓')}
                  </Button>
                  <Button
                    variant={'ghost'}
                    onClick={() => {
                      handleSort(EinsatzControllerFindAllVAlphaOrderByEnum.Status);
                      setIsMobileFilterOpen(false);
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                      sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.Status
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Status {sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.Status && (sortOption.direction === EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc ? '↑' : '↓')}
                  </Button>
                </div>
              </div>

              {/* Reset Button */}
              <Button
                variant="secondary"
                onClick={() => {
                  setStatusFilter(undefined);
                  setSortOption({
                    key: EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt,
                    direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum.Desc,
                  });
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
    <div className="cursor-pointer px-3 py-3 transition-all hover:bg-gray-50 sm:px-4 sm:py-4 dark:hover:bg-gray-700/50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2 sm:mb-2 sm:items-center">
            <h3 className="line-clamp-2 font-medium text-base text-gray-900 sm:line-clamp-1 sm:text-lg dark:text-white">{einsatz.alarmstichwort || 'Kein Alarmstichwort'}</h3>
            <EinsatzStatusBadge status={einsatz.status || EinsatzStatus.ANGELEGT} size="sm" className="flex-shrink-0" />
          </div>
          <div className="flex flex-col gap-1 text-gray-500 text-xs sm:flex-row sm:items-center sm:gap-2 sm:space-x-2 sm:text-sm dark:text-gray-400">
            <span className="font-mono">{formatNatoDateTime(einsatz.createdAt)}</span>
            {/*{einsatz.einsatzort && <span className="truncate">📍 {einsatz.einsatzort}</span>}*/}
            {/*{einsatz.einsatzleiter && <span className="hidden truncate sm:inline">Leiter: {einsatz.einsatzleiter}</span>}*/}
          </div>
          <div className="mt-2">
            <EinsatzCompletenessBar einsatz={einsatz} showTooltip={false} showPercentage={true} size="sm" className="max-w-full sm:max-w-xs" />
          </div>
        </div>
      </div>
    </div>
  );
}
