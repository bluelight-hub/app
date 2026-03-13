import {
  einsatzUIStore,
  resetDashboardState,
  setDashboardSearchTerm,
  setDashboardShowArchived,
  setDashboardSortOption,
  setDashboardStatusFilter,
  useActiveEinsatz,
  useActiveEinsaetzeWithCounts,
  useEinsatzStatusCounts,
  type EinsatzDashboardSortOptionId,
} from '@/features/einsatz';
import { EinsatzSelectionState } from '@/features/einsatz/ui/molecules/EinsatzSelectionState';
import { EinsatzListItem } from '@/features/einsatz/ui/molecules/EinsatzListItem';
import { EinsatzStatusBadge } from '@/features/einsatz/ui/molecules/einsatz-status-badge.molecule';
import { EinsatzCreateForm } from '@/features/einsatz/ui/organisms/EinsatzCreateForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EinsatzControllerFindAllVAlphaOrderByEnum, EinsatzControllerFindAllVAlphaOrderDirectionEnum, EinsatzResponseDtoStatusEnum } from '@/shared';
import { SearchInput } from '@/shared/ui/molecules/search-input.molecule';
import { Link } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { useDeferredValue, useMemo, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { PiArrowsClockwise, PiClockCountdown, PiFunnelX, PiMapPin, PiPlus, PiRadio, PiRows, PiSealWarning, PiStackSimple } from 'react-icons/pi';

interface SortOption {
  id: EinsatzDashboardSortOptionId;
  label: string;
  key: EinsatzControllerFindAllVAlphaOrderByEnum;
  direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum;
}

const DEFAULT_SORT_OPTION: SortOption = {
  id: 'recent',
  label: 'Neueste zuerst',
  key: EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt,
  direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum.Desc,
};

const STATUS_FILTER_OPTIONS = [
  {
    label: 'Alle',
    value: undefined,
  },
  {
    label: 'Angelegt',
    value: EinsatzResponseDtoStatusEnum.Angelegt,
  },
  {
    label: 'In Bearbeitung',
    value: EinsatzResponseDtoStatusEnum.InBearbeitung,
  },
  {
    label: 'Abgeschlossen',
    value: EinsatzResponseDtoStatusEnum.Abgeschlossen,
  },
] as const;

const SORT_OPTIONS: SortOption[] = [
  DEFAULT_SORT_OPTION,
  {
    id: 'number',
    key: EinsatzControllerFindAllVAlphaOrderByEnum.Nummer,
    direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc,
    label: 'Nummer A-Z',
  },
  {
    id: 'status',
    key: EinsatzControllerFindAllVAlphaOrderByEnum.Status,
    direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc,
    label: 'Status A-Z',
  },
];

const ALL_STATUS_FILTER_VALUE = '__all__';

function getAlarmstichwortLabel(alarmstichwort: unknown): string {
  return typeof alarmstichwort === 'string' && alarmstichwort.trim().length > 0 ? alarmstichwort : 'Aktueller Einsatz';
}

function getLocationLabel(einsatzort: unknown): string {
  if (einsatzort && typeof einsatzort === 'object' && 'ort' in einsatzort && typeof einsatzort.ort === 'string' && einsatzort.ort.trim().length > 0) {
    return einsatzort.ort;
  }

  return 'Ort wird nachgereicht';
}

export function EinsatzDashboard() {
  const dashboardState = useStore(einsatzUIStore, (state) => state.dashboard);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const deferredSearchTerm = useDeferredValue(dashboardState.searchTerm);
  const { activeEinsatz, resumeStatus, resumeReason } = useActiveEinsatz();

  const { data: rawEinsaetze = [], isLoading, error, refetch } = useActiveEinsaetzeWithCounts(dashboardState.showArchived);
  const { counts } = useEinsatzStatusCounts(true);
  const sortOption = SORT_OPTIONS.find((option) => option.id === dashboardState.sortOptionId) ?? DEFAULT_SORT_OPTION;

  const einsaetze = useMemo(() => {
    const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();
    const activeEinsatzId = activeEinsatz?.id;

    let filtered = rawEinsaetze;

    if (dashboardState.statusFilter) {
      filtered = filtered.filter((einsatz) => einsatz.status === dashboardState.statusFilter);
    } else if (!dashboardState.showArchived) {
      filtered = filtered.filter((einsatz) => einsatz.status !== EinsatzResponseDtoStatusEnum.Archiviert);
    }

    if (normalizedSearchTerm) {
      filtered = filtered.filter((einsatz) => {
        const alarmstichwort = einsatz.alarmstichwort?.toLowerCase() ?? '';
        const nummer = einsatz.nummer.toLowerCase();
        const ort = einsatz.einsatzort?.ort?.toLowerCase() ?? '';
        const strasse = einsatz.einsatzort?.strasse?.toLowerCase() ?? '';

        return alarmstichwort.includes(normalizedSearchTerm) || nummer.includes(normalizedSearchTerm) || ort.includes(normalizedSearchTerm) || strasse.includes(normalizedSearchTerm);
      });
    }

    return [...filtered].sort((a, b) => {
      if (activeEinsatzId && a.id === activeEinsatzId && b.id !== activeEinsatzId) {
        return -1;
      }

      if (activeEinsatzId && b.id === activeEinsatzId && a.id !== activeEinsatzId) {
        return 1;
      }

      let aValue: string | Date = a.createdAt;
      let bValue: string | Date = b.createdAt;

      if (sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.Nummer) {
        aValue = a.nummer;
        bValue = b.nummer;
      } else if (sortOption.key === EinsatzControllerFindAllVAlphaOrderByEnum.Status) {
        aValue = a.status;
        bValue = b.status;
      }

      const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return sortOption.direction === EinsatzControllerFindAllVAlphaOrderDirectionEnum.Desc ? -comparison : comparison;
    });
  }, [activeEinsatz?.id, dashboardState.showArchived, dashboardState.statusFilter, deferredSearchTerm, rawEinsaetze, sortOption.direction, sortOption.key]);

  const activeWorkspaceEinsatz = useMemo(() => rawEinsaetze.find((einsatz) => einsatz.id === activeEinsatz?.id) ?? activeEinsatz ?? null, [activeEinsatz, rawEinsaetze]);

  useHotkeys(
    'mod+n',
    () => {
      setIsCreatePanelOpen(true);
    },
    [setIsCreatePanelOpen],
    { preventDefault: true },
  );

  const handleCreateSuccess = () => {
    setIsCreatePanelOpen(false);
    void refetch();
  };

  const handleArchiveToggle = () => {
    setDashboardShowArchived(!dashboardState.showArchived);
  };

  const handleFilterReset = () => {
    resetDashboardState();
  };

  const isDefaultSort = sortOption.id === DEFAULT_SORT_OPTION.id;
  const hasActiveFilters = Boolean(dashboardState.statusFilter) || dashboardState.showArchived || dashboardState.searchTerm.trim().length > 0 || !isDefaultSort;
  const hasArchivedItems = counts.archiviert > 0;
  const isArchiveOnlyContext = !dashboardState.showArchived && rawEinsaetze.length === 0 && hasArchivedItems;
  const isFilterEmptyState = !isLoading && !error && rawEinsaetze.length > 0 && einsaetze.length === 0;
  const isUnavailableState = !isLoading && !error && rawEinsaetze.length === 0 && !isArchiveOnlyContext;
  const sichtbareEinsaetzeLabel = einsaetze.length === 1 ? '1 Einsatz sichtbar' : `${einsaetze.length} Einsätze sichtbar`;
  const activeContextLabel = counts.inBearbeitung === 1 ? '1 aktiver Kontext' : `${counts.inBearbeitung} aktive Kontexte`;
  const archivedContextLabel = dashboardState.showArchived ? `${counts.archiviert} Archivfälle eingeblendet` : `${counts.archiviert} im Archiv`;
  const selectedStatusLabel = STATUS_FILTER_OPTIONS.find((option) => option.value === dashboardState.statusFilter)?.label;
  const activeLocationLabel = getLocationLabel(activeWorkspaceEinsatz?.einsatzort);
  const activeEtbCount = activeWorkspaceEinsatz && 'etbEintraegeCount' in activeWorkspaceEinsatz ? activeWorkspaceEinsatz.etbEintraegeCount : undefined;
  const activePoiCount = activeWorkspaceEinsatz && 'poisCount' in activeWorkspaceEinsatz ? activeWorkspaceEinsatz.poisCount : undefined;
  const showResumeValidationState = resumeStatus === 'checking' && !activeWorkspaceEinsatz;
  const showResumeFallbackState = resumeStatus === 'unavailable' && resumeReason !== null && resumeReason !== 'no-context';
  const resumeFallbackDescription =
    resumeReason === 'unauthorized'
      ? 'Dein letzter Einsatzkontext ist nicht mehr verfügbar oder dein Zugriff hat sich geändert. Die Einsatzauswahl bleibt deshalb als sicherer Fallback geöffnet.'
      : resumeReason === 'storage-unavailable'
        ? 'Direkte Fortsetzung konnte auf diesem Gerät nicht aus dem lokalen Speicher geladen werden. Du kannst sicher über die Einsatzauswahl weiterarbeiten.'
        : 'Der zuletzt gespeicherte Einsatzkontext war nicht mehr gültig. Wähle unten einen verfügbaren Einsatz, um die Arbeit sicher fortzusetzen.';

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      {activeWorkspaceEinsatz ? (
        <Card className="overflow-hidden border-sky-200/70 bg-[linear-gradient(135deg,rgba(240,249,255,0.96),rgba(255,255,255,0.94)_42%,rgba(238,242,255,0.94))] shadow-[0_28px_70px_-46px_rgba(14,116,144,0.42)] dark:border-sky-900/50 dark:bg-[linear-gradient(135deg,rgba(12,24,42,0.92),rgba(15,23,42,0.92)_45%,rgba(30,41,59,0.9))] dark:shadow-none">
          <CardHeader className="gap-5 pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1 border-sky-200/70 bg-white/85 text-sky-800 shadow-none dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200">
                <PiRadio className="size-3.5" />
                Aktiver Kontext
              </Badge>
              <span className="font-mono text-[11px] text-slate-500 uppercase tracking-[0.18em] dark:text-slate-400">{activeWorkspaceEinsatz.nummer}</span>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-balance text-xl">{getAlarmstichwortLabel(activeWorkspaceEinsatz.alarmstichwort)}</CardTitle>
                <CardDescription className="max-w-2xl text-slate-600 dark:text-slate-300">
                  Direkter Wiedereinstieg öffnet den zuletzt genutzten Arbeitsbereich und hält deinen aktiven Kontext stabil.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <EinsatzStatusBadge status={activeWorkspaceEinsatz.status} size="sm" />
                <Button asChild size="lg" className="shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]">
                  <Link params={{ einsatzId: activeWorkspaceEinsatz.id }} to="/app/einsatz/$einsatzId">
                    Weiterarbeiten
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-wrap gap-2 pt-5">
            <Badge variant="outline" className="gap-1 bg-white/72 dark:bg-slate-950/30">
              <PiMapPin className="size-3.5" />
              {activeLocationLabel}
            </Badge>
            {typeof activeEtbCount === 'number' ? (
              <Badge variant="outline" className="bg-white/72 dark:bg-slate-950/30">
                {activeEtbCount} ETB
              </Badge>
            ) : null}
            {typeof activePoiCount === 'number' ? (
              <Badge variant="outline" className="bg-white/72 dark:bg-slate-950/30">
                {activePoiCount} POI
              </Badge>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {showResumeValidationState ? (
        <EinsatzSelectionState
          eyebrow="Wiedereinstieg"
          title="Letzter Arbeitskontext wird geprüft"
          description="Sobald der gespeicherte Einsatz belastbar validiert ist, erscheint hier wieder der direkte Weiterarbeiten-Einstieg."
          icon={<PiClockCountdown className="size-6" />}
        />
      ) : null}

      {showResumeFallbackState ? (
        <EinsatzSelectionState eyebrow="Fortsetzung" title="Direkte Fortsetzung ist gerade nicht möglich" description={resumeFallbackDescription} icon={<PiSealWarning className="size-6" />} />
      ) : null}

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-white/70 bg-white/82 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.34)] backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/58 dark:shadow-none">
        <CardHeader className="gap-5 border-slate-200/70 border-b pb-5 dark:border-slate-800/70">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">Einsatzliste</CardTitle>
                <Badge variant="outline" className="bg-white/72 dark:bg-slate-950/30">
                  {sichtbareEinsaetzeLabel}
                </Badge>
                {counts.inBearbeitung > 0 ? (
                  <Badge variant="outline" className="bg-white/72 dark:bg-slate-950/30">
                    {activeContextLabel}
                  </Badge>
                ) : null}
                {counts.archiviert > 0 ? (
                  <Badge variant="outline" className="bg-white/72 dark:bg-slate-950/30">
                    {archivedContextLabel}
                  </Badge>
                ) : null}
                {selectedStatusLabel ? (
                  <Badge variant="outline" className="bg-white/72 dark:bg-slate-950/30">
                    Filter: {selectedStatusLabel}
                  </Badge>
                ) : null}
              </div>
              <CardDescription className="max-w-2xl text-slate-600 dark:text-slate-300">Öffne einen bestehenden Arbeitskontext oder starte einen neuen Einsatz.</CardDescription>
            </div>

            <Button onClick={() => setIsCreatePanelOpen(true)} size="lg" className="shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]">
              <PiPlus className="size-4" />
              Neuen Einsatz
            </Button>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_11rem_12rem_auto]">
            <SearchInput placeholder="Einsätze durchsuchen..." value={dashboardState.searchTerm} onChange={setDashboardSearchTerm} />

            <Select
              onValueChange={(value) => setDashboardStatusFilter(value === ALL_STATUS_FILTER_VALUE ? undefined : (value as EinsatzResponseDtoStatusEnum))}
              value={dashboardState.statusFilter ?? ALL_STATUS_FILTER_VALUE}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.label} value={option.value ?? ALL_STATUS_FILTER_VALUE}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => setDashboardSortOption(value as EinsatzDashboardSortOptionId)} value={sortOption.id}>
              <SelectTrigger>
                <SelectValue placeholder="Sortierung" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Button onClick={handleArchiveToggle} type="button" variant={dashboardState.showArchived ? 'secondary' : 'outline'} size="lg">
                <PiStackSimple className="size-4" />
                {dashboardState.showArchived ? 'Archiv ausblenden' : 'Archiv'}
              </Button>

              {hasActiveFilters ? (
                <Button onClick={handleFilterReset} type="button" variant="ghost" size="lg">
                  <PiFunnelX className="size-4" />
                  Zurücksetzen
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 p-0">
          {isLoading ? (
            <div className="p-6 sm:p-8">
              <EinsatzSelectionState
                eyebrow="Ladezustand"
                title="Einsatzauswahl wird geladen"
                description="Arbeitskontext wird vorbereitet. Verfügbare Einsätze und der direkte Wiedereinstieg werden gerade synchronisiert."
                icon={<PiClockCountdown className="size-6" />}
                className="border-transparent bg-transparent shadow-none"
              />
            </div>
          ) : error ? (
            <div className="p-6 sm:p-8">
              <EinsatzSelectionState
                eyebrow="Technischer Fehler"
                title="Einsätze konnten nicht geladen werden"
                description="Die Auswahlfläche hat gerade keine aktuellen Einsatzdaten erhalten. Der direkte Arbeitsstart bleibt erst nach einem erfolgreichen Reload wieder verfügbar."
                icon={<PiSealWarning className="size-6" />}
                className="border-transparent bg-transparent shadow-none"
                actions={
                  <Button onClick={() => void refetch()} type="button" variant="outline" size="lg">
                    <PiArrowsClockwise className="size-4" />
                    Erneut laden
                  </Button>
                }
              />
            </div>
          ) : isFilterEmptyState ? (
            <div className="p-6 sm:p-8">
              <EinsatzSelectionState
                eyebrow="Filter ohne Treffer"
                title="Keine Treffer für die aktuelle Auswahl"
                description="Die vorhandenen Einsätze passen gerade nicht zu Suche oder Filterkontext. Entferne die Filter, um wieder direkt in den Arbeitsbereich zu springen."
                icon={<PiRows className="size-6" />}
                className="border-transparent bg-transparent shadow-none"
                actions={
                  <Button onClick={handleFilterReset} type="button" variant="outline" size="lg">
                    <PiFunnelX className="size-4" />
                    Filter entfernen
                  </Button>
                }
              />
            </div>
          ) : isArchiveOnlyContext ? (
            <div className="p-6 sm:p-8">
              <EinsatzSelectionState
                eyebrow="Zugriffskontext"
                title="Aktuell sind nur archivierte Einsätze verfügbar"
                description="Im aktiven Arbeitskontext gibt es gerade keine offenen Einsätze. Du kannst das Archiv einblenden oder einen neuen Einsatz starten."
                icon={<PiStackSimple className="size-6" />}
                className="border-transparent bg-transparent shadow-none"
                actions={
                  <>
                    <Button onClick={handleArchiveToggle} type="button" variant="outline" size="lg">
                      <PiStackSimple className="size-4" />
                      Archiv einblenden
                    </Button>
                    <Button onClick={() => setIsCreatePanelOpen(true)} type="button" size="lg">
                      <PiPlus className="size-4" />
                      Neuen Einsatz anlegen
                    </Button>
                  </>
                }
              />
            </div>
          ) : isUnavailableState ? (
            <div className="p-6 sm:p-8">
              <EinsatzSelectionState
                eyebrow="Leerzustand"
                title="Keine verfügbaren Einsätze"
                description="Sobald ein Einsatz für deinen aktuellen Zugriff bereitsteht, erscheint er hier als direkter Einstieg in den Workspace."
                icon={<PiRows className="size-6" />}
                className="border-transparent bg-transparent shadow-none"
                actions={
                  <Button onClick={() => setIsCreatePanelOpen(true)} type="button" size="lg">
                    <PiPlus className="size-4" />
                    Ersten Einsatz erstellen
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
                {einsaetze.map((einsatz) => (
                  <EinsatzListItem key={einsatz.id} einsatz={einsatz} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EinsatzCreateForm isOpen={isCreatePanelOpen} onClose={() => setIsCreatePanelOpen(false)} onSuccess={handleCreateSuccess} />
    </div>
  );
}
