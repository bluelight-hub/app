import { EinsatzCreateForm } from '@/components/organisms/einsatz/EinsatzCreateForm';
import { useEinsaetze } from '@/hooks/useEinsaetze';
import { useEinsatzStatusCounts } from '@/hooks/useEinsatzStatusCounts';
import { Button } from '@atoms/button.atom';
import { Input } from '@atoms/input.atom';
import { EinsatzControllerFindAllVAlphaOrderByEnum, EinsatzControllerFindAllVAlphaOrderDirectionEnum, EinsatzResponseDtoStatusEnum } from '@bluelight-hub/shared/client';
import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PiFunnel, PiFunnelX, PiPlus, PiSpinner } from 'react-icons/pi';
import { StatusCard } from '@/components/molecules/dashboard/StatusCard';
import { MobileStatusBar } from '@/components/molecules/dashboard/MobileStatusBar';
import { FilterPanel } from '@/components/organisms/dashboard/FilterPanel';
import { MobileFilterDialog } from '@/components/organisms/dashboard/MobileFilterDialog';
import { EinsatzListItem } from '@/components/molecules/einsatz/EinsatzListItem';

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
  const [showArchived, setShowArchived] = useState(false);

  const effectiveStatusFilter = useMemo(() => {
    if (showArchived && !statusFilter) {
      return undefined;
    }
    return statusFilter;
  }, [showArchived, statusFilter]);

  const {
    einsaetze: rawEinsaetze,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    fetchNextPage,
    refetch,
  } = useEinsaetze({
    status: effectiveStatusFilter,
    search: searchTerm,
    orderBy: sortOption.key,
    orderDirection: sortOption.direction,
    limit: 20,
    infinite: true,
  });

  const einsaetze = useMemo(() => {
    if (showArchived && !statusFilter) {
      return rawEinsaetze.filter((e) => e.status !== EinsatzResponseDtoStatusEnum.Archiviert);
    }
    return rawEinsaetze;
  }, [rawEinsaetze, showArchived, statusFilter]);

  const { total, counts } = useEinsatzStatusCounts(true);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setIsCreatePanelOpen(true);
      }
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
  };

  const handleArchiveToggle = () => {
    setShowArchived(!showArchived);
    if (!showArchived) {
      setStatusFilter(EinsatzResponseDtoStatusEnum.Archiviert);
    } else {
      setStatusFilter(undefined);
    }
  };

  const handleFilterReset = () => {
    setStatusFilter(undefined);
    setSortOption({
      key: EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt,
      direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum.Desc,
    });
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

        <MobileStatusBar total={total} counts={counts} />

        <div className="mt-4 hidden gap-4 sm:grid sm:grid-cols-5">
          <StatusCard label="Gesamt" value={total} variant="default" />
          <StatusCard label="Angelegt" value={counts.angelegt} variant="blue" />
          <StatusCard label="In Bearbeitung" value={counts.inBearbeitung} variant="yellow" />
          <StatusCard label="Abgeschlossen" value={counts.abgeschlossen} variant="green" />
          <StatusCard label="Archiviert" value={counts.archiviert} variant="gray" />
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

      <div className="flex min-h-0 flex-1">
        {isFilterPanelOpen && (
          <FilterPanel
            statusFilter={statusFilter}
            sortOption={sortOption}
            showArchived={showArchived}
            onStatusFilterChange={setStatusFilter}
            onSortChange={handleSort}
            onArchiveToggle={handleArchiveToggle}
            className="hidden sm:block"
          />
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain bg-gray-100 dark:bg-gray-950">
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

      <EinsatzCreateForm isOpen={isCreatePanelOpen} onClose={() => setIsCreatePanelOpen(false)} onSuccess={handleCreateSuccess} />

      <MobileFilterDialog
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        statusFilter={statusFilter}
        sortOption={sortOption}
        showArchived={showArchived}
        onStatusFilterChange={setStatusFilter}
        onSortChange={handleSort}
        onArchiveToggle={handleArchiveToggle}
        onReset={handleFilterReset}
      />
    </div>
  );
}
