import { getAuthContextSummary, useCurrentUser } from '@/features/auth';
import { useOperativeRole } from '@/features/operative-roles';
import { useActiveEinsaetzeWithCounts, useActiveEinsatz, useArchiveEinsatz, useEinsaetzeInfiniteQuery, useEinsatzStatusCounts } from '@/features/einsatz';
import { EinsatzListItem } from '@/features/einsatz/ui/molecules/EinsatzListItem';
import { EinsatzCreateForm } from '@/features/einsatz/ui/organisms/EinsatzCreateForm';
import {
  EinsatzControllerFindAllVAlphaOrderByEnum,
  EinsatzControllerFindAllVAlphaOrderDirectionEnum,
  EinsatzControllerFindAllVAlphaStatusEnum,
  type EinsatzListItemDto,
  EinsatzListItemDtoStatusEnum,
} from '@/shared';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Select } from '@/shared/ui/atoms/select.atom';
import { cn } from '@/shared/ui/cn';
import { ConfirmButton } from '@/shared/ui/molecules';
import { SearchInput } from '@/shared/ui/molecules/search-input.molecule';
import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { PiArchive, PiCheckCircle, PiPlus, PiSpinner } from 'react-icons/pi';

type DashboardView = 'active' | 'archive';

interface SortOption {
  key: EinsatzControllerFindAllVAlphaOrderByEnum;
  direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum;
}

interface ActiveSection {
  status: EinsatzListItemDtoStatusEnum;
  title: string;
  description: string;
  badgeClassName: string;
}

const ACTIVE_SECTIONS: ActiveSection[] = [
  {
    status: EinsatzListItemDtoStatusEnum.InBearbeitung,
    title: 'In Bearbeitung',
    description: 'Laufende Einsätze mit aktuellem Arbeitsbedarf.',
    badgeClassName: 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
  },
  {
    status: EinsatzListItemDtoStatusEnum.Angelegt,
    title: 'Neu angelegt',
    description: 'Einsätze, die als Nächstes übernommen werden können.',
    badgeClassName: 'border-status-info-border bg-status-info-surface text-status-info-text',
  },
  {
    status: EinsatzListItemDtoStatusEnum.Abgeschlossen,
    title: 'Abgeschlossen',
    description: 'Dokumentation ist fertig, Archivierung steht noch aus.',
    badgeClassName: 'border-status-success-border bg-status-success-surface text-status-success-text',
  },
];

const ARCHIVE_SORT_OPTIONS: Array<SortOption & { label: string; value: string }> = [
  {
    key: EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt,
    direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum.Desc,
    label: 'Neueste zuerst',
    value: `${EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt}:${EinsatzControllerFindAllVAlphaOrderDirectionEnum.Desc}`,
  },
  {
    key: EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt,
    direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc,
    label: 'Älteste zuerst',
    value: `${EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt}:${EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc}`,
  },
  {
    key: EinsatzControllerFindAllVAlphaOrderByEnum.UpdatedAt,
    direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum.Desc,
    label: 'Zuletzt geändert',
    value: `${EinsatzControllerFindAllVAlphaOrderByEnum.UpdatedAt}:${EinsatzControllerFindAllVAlphaOrderDirectionEnum.Desc}`,
  },
  {
    key: EinsatzControllerFindAllVAlphaOrderByEnum.Alarmstichwort,
    direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc,
    label: 'Alarmstichwort A-Z',
    value: `${EinsatzControllerFindAllVAlphaOrderByEnum.Alarmstichwort}:${EinsatzControllerFindAllVAlphaOrderDirectionEnum.Asc}`,
  },
];

export function EinsatzDashboard() {
  const navigate = useNavigate();
  const { setActiveEinsatz } = useActiveEinsatz();
  const { user, authContext, isAdminAuthenticated } = useCurrentUser();
  const { role: operativeRole, isExterne, isEinsatzkraft, canCreateEinsatz: canCreateByOperativeRole } = useOperativeRole();
  const [currentView, setCurrentView] = useState<DashboardView>('active');
  const [archiveSearchInput, setArchiveSearchInput] = useState('');
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('');
  const [archiveSortOption, setArchiveSortOption] = useState<SortOption>({
    key: EinsatzControllerFindAllVAlphaOrderByEnum.CreatedAt,
    direction: EinsatzControllerFindAllVAlphaOrderDirectionEnum.Desc,
  });
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [openingEinsatzId, setOpeningEinsatzId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const resolvedAuthContext = authContext ?? (user ? getAuthContextSummary(user.role, isAdminAuthenticated ?? false) : null);
  const einsatzCapabilities = {
    canOpenEinsatz: resolvedAuthContext?.capabilities.canOpenEinsatz ?? false,
    canCreateEinsatz: (resolvedAuthContext?.capabilities.canCreateEinsatz ?? false) && canCreateByOperativeRole,
  };
  const restrictionHint = !einsatzCapabilities.canOpenEinsatz || !einsatzCapabilities.canCreateEinsatz ? (resolvedAuthContext?.restrictedActionHint ?? resolvedAuthContext?.nextActionLabel) : null;

  const { data: activeEinsaetze = [], isLoading: isActiveLoading, error: activeError, refetch: refetchActive } = useActiveEinsaetzeWithCounts();
  const archiveEinsatz = useArchiveEinsatz();
  const {
    data: archiveQueryData,
    isLoading: isArchiveLoading,
    error: archiveError,
    refetch: refetchArchive,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEinsaetzeInfiniteQuery(
    {
      status: EinsatzControllerFindAllVAlphaStatusEnum.Archiviert,
      search: archiveSearchTerm || undefined,
      limit: 25,
      orderBy: archiveSortOption.key,
      orderDirection: archiveSortOption.direction,
    },
    { enabled: currentView === 'archive' },
  );
  const { counts } = useEinsatzStatusCounts(true);
  const activeCount = activeEinsaetze.length;

  const activeSections = useMemo(
    () =>
      ACTIVE_SECTIONS.map((section) => ({
        ...section,
        einsaetze: [...activeEinsaetze].filter((einsatz) => einsatz.status === section.status).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      })).filter((section) => section.einsaetze.length > 0),
    [activeEinsaetze],
  );

  const archivedEinsaetze = useMemo(() => archiveQueryData?.pages.flatMap((page) => page.data ?? []) ?? [], [archiveQueryData]);
  const archiveTotal = archiveQueryData?.pages[0]?.pagination?.total ?? counts.archiviert;

  useHotkeys(
    'mod+n',
    () => {
      if (einsatzCapabilities.canCreateEinsatz) {
        setIsCreatePanelOpen(true);
      }
    },
    [einsatzCapabilities.canCreateEinsatz, setIsCreatePanelOpen],
    { preventDefault: true },
  );

  const handleCreateSuccess = async (einsatzId: string) => {
    setOpenError(null);

    try {
      await setActiveEinsatz(einsatzId);
      setCurrentView('active');
      setIsCreatePanelOpen(false);
      void refetchActive();
      await navigate({
        to: '/app/einsatz/$einsatzId',
        params: { einsatzId },
      });
    } catch {
      setOpenError('Der neue Einsatz konnte nicht direkt geöffnet werden. Bitte versuchen Sie es erneut.');
    }
  };

  const handleOpenEinsatz = async (einsatzId: string) => {
    setOpeningEinsatzId(einsatzId);
    setOpenError(null);

    try {
      await setActiveEinsatz(einsatzId);
      await navigate({
        to: '/app/einsatz/$einsatzId',
        params: { einsatzId },
      });
    } catch {
      setOpenError('Der Einsatz konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.');
    } finally {
      setOpeningEinsatzId((currentId) => (currentId === einsatzId ? null : currentId));
    }
  };

  const handleArchiveSortChange = (value: string) => {
    const selectedOption = ARCHIVE_SORT_OPTIONS.find((option) => option.value === value);
    if (!selectedOption) {
      return;
    }

    setArchiveSortOption({
      key: selectedOption.key,
      direction: selectedOption.direction,
    });
  };

  const handleArchiveFromList = async (einsatzId: string) => {
    await archiveEinsatz.mutateAsync({ id: einsatzId });
  };

  const renderEinsatzCard = (einsatz: EinsatzListItemDto) => {
    const canArchive = einsatz.status === EinsatzListItemDtoStatusEnum.Abgeschlossen;
    const isArchivingCurrent = archiveEinsatz.isPending && archiveEinsatz.variables?.id === einsatz.id;

    return (
      <div
        key={einsatz.id}
        className={cn(
          'group overflow-hidden rounded-panel border border-border-subtle bg-surface-panel shadow-panel transition-[border-color,box-shadow]',
          'hover:border-border-strong hover:shadow-raised',
        )}
      >
        <button
          type="button"
          aria-label={`Einsatz ${einsatz.nummer} öffnen`}
          aria-busy={openingEinsatzId === einsatz.id}
          disabled={openingEinsatzId === einsatz.id || !einsatzCapabilities.canOpenEinsatz}
          title={!einsatzCapabilities.canOpenEinsatz ? (restrictionHint ?? 'Einsatzöffnung ist für Ihre Rolle aktuell nicht freigegeben.') : undefined}
          onClick={() => void handleOpenEinsatz(einsatz.id)}
          className={cn('block w-full cursor-pointer text-left focus-visible:shadow-focus-ring focus-visible:outline-none', 'disabled:cursor-not-allowed')}
        >
          <EinsatzListItem einsatz={einsatz} />
        </button>

        {canArchive ? (
          <div className="flex flex-col gap-3 border-t border-border-subtle bg-surface-raised/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-text-primary">Abgeschlossen und bereit fürs Archiv</p>
              <p className="mt-1 text-body-xs text-text-secondary">Einmal klicken, dann erneut bestätigen. Danach verschwindet der Einsatz direkt aus der aktiven Liste.</p>
            </div>
            <ConfirmButton
              size="sm"
              intent="warning"
              appearance="outline"
              confirmAppearance="filled"
              confirmLabel="Archivierung bestätigen"
              loading={isArchivingCurrent}
              disabled={isArchivingCurrent}
              onConfirm={() => handleArchiveFromList(einsatz.id)}
            >
              <PiArchive className="h-4 w-4" />
              Archivieren
            </ConfirmButton>
          </div>
        ) : null}
      </div>
    );
  };

  const renderErrorState = (onRetry: () => Promise<unknown>) => (
    <div className="flex h-full items-center justify-center p-6">
      <div role="alert" className="max-w-md rounded-lg border border-status-danger-border bg-surface-panel p-4 text-center shadow-sm">
        <p className="mb-4 font-medium text-status-danger-text">Fehler beim Laden der Einsätze</p>
        <Button onClick={() => void onRetry()} className="rounded-md">
          Erneut versuchen
        </Button>
      </div>
    </div>
  );

  const renderLoadingState = (label: string) => (
    <div className="flex h-full items-center justify-center p-6">
      <output aria-live="polite" className="flex flex-col items-center text-center">
        <span aria-hidden="true" className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-action-primary" />
        <span className="mt-4 text-text-secondary">{label}</span>
      </output>
    </div>
  );

  const archiveSortValue = `${archiveSortOption.key}:${archiveSortOption.direction}`;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-border-subtle bg-surface-panel px-3 py-4 sm:px-4 lg:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 id="einsatz-dashboard-title" className="text-2xl font-bold text-text-primary">
                Einsätze
              </h2>
              {operativeRole && (
                <Badge variant={isExterne ? 'warning' : isEinsatzkraft ? 'info' : 'success'} size="sm">
                  {{ FUEHRUNGSKRAFT: 'Führungskraft', EINSATZKRAFT: 'Einsatzkraft', EXTERNE: 'Extern' }[operativeRole] ?? operativeRole}
                </Badge>
              )}
            </div>

            <div className="inline-flex rounded-lg bg-surface-raised p-1">
              <DashboardViewButton isActive={currentView === 'active'} count={activeCount} label="Aktive Einsätze" onClick={() => setCurrentView('active')} />
              <DashboardViewButton isActive={currentView === 'archive'} count={counts.archiviert} label="Archiv" onClick={() => setCurrentView('archive')} />
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap gap-2">
              <SummaryChip label="In Bearbeitung" value={counts.inBearbeitung} tone="amber" />
              <SummaryChip label="Neu angelegt" value={counts.angelegt} tone="sky" />
              <SummaryChip label="Abgeschlossen" value={counts.abgeschlossen} tone="emerald" />
            </div>

            {!isExterne && (
              <Button
                id="einsatz-dashboard-primary-action"
                onClick={() => setIsCreatePanelOpen(true)}
                title={einsatzCapabilities.canCreateEinsatz ? 'Neuer Einsatz (Cmd+N)' : 'Nur Führungskräfte können neue Einsätze anlegen.'}
                kbd="Cmd+N"
                disabled={!einsatzCapabilities.canCreateEinsatz}
              >
                <PiPlus className="h-5 w-5" />
                Neuer Einsatz
              </Button>
            )}
          </div>
        </div>

        {restrictionHint && (
          <output aria-live="polite" className="mt-3 block text-body-sm text-status-warning-text">
            {restrictionHint}
          </output>
        )}

        {isExterne && (
          <output aria-live="polite" className="mt-3 block text-body-sm text-status-info-text">
            Du siehst nur Einsätze, denen du zugewiesen bist.
          </output>
        )}
        {isEinsatzkraft && (
          <output aria-live="polite" className="mt-3 block text-body-sm text-status-info-text">
            Du kannst Einsätze sehen, aber nur per Beitrittsanfrage teilnehmen.
          </output>
        )}

        {openError && (
          <p role="alert" className="mt-3 text-body-sm text-status-danger-text">
            {openError}
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {currentView === 'active' ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
            {activeError ? (
              renderErrorState(refetchActive)
            ) : isActiveLoading ? (
              renderLoadingState('Lade aktive Einsätze...')
            ) : activeEinsaetze.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-md rounded-lg border border-dashed border-border-subtle bg-surface-panel p-8 text-center shadow-sm">
                  <p className="font-medium text-text-primary">Keine aktiven Einsätze vorhanden</p>
                  <p className="mt-2 text-body-sm text-text-secondary">Sobald ein Einsatz angelegt oder noch nicht archiviert ist, erscheint er hier als Arbeitsliste.</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {!isExterne && (
                      <Button
                        onClick={() => setIsCreatePanelOpen(true)}
                        disabled={!einsatzCapabilities.canCreateEinsatz}
                        title={einsatzCapabilities.canCreateEinsatz ? undefined : 'Nur Führungskräfte können neue Einsätze anlegen.'}
                      >
                        <PiPlus className="h-5 w-5" />
                        Einsatz anlegen
                      </Button>
                    )}
                    {counts.archiviert > 0 && (
                      <Button appearance="outline" intent="secondary" onClick={() => setCurrentView('archive')}>
                        <PiArchive className="h-5 w-5" />
                        Archiv öffnen
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {activeSections.map((section) => (
                  <section key={section.status} className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-title-sm font-semibold text-text-primary">{section.title}</h3>
                          <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-medium', section.badgeClassName)}>{section.einsaetze.length}</span>
                        </div>
                        <p className="mt-1 text-body-sm text-text-secondary">{section.description}</p>
                      </div>
                    </div>

                    <div className="space-y-3">{section.einsaetze.map((einsatz) => renderEinsatzCard(einsatz))}</div>
                  </section>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-shrink-0 border-b border-border-subtle bg-surface-panel px-3 py-4 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <SearchInput
                    value={archiveSearchInput}
                    onChange={setArchiveSearchInput}
                    placeholder="Archiv nach Nummer, Stichwort oder Ort durchsuchen..."
                    onDebouncedChange={setArchiveSearchTerm}
                    delay={250}
                  />
                </div>
                <div className="w-full lg:w-64">
                  <Select
                    aria-label="Archiv sortieren"
                    value={archiveSortValue}
                    onChange={(event) => handleArchiveSortChange(event.target.value)}
                    options={ARCHIVE_SORT_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    fullWidth
                  />
                </div>
              </div>
              <p className="mt-3 text-body-sm text-text-secondary">
                {archiveTotal} archivierte Einsätze
                {archiveSearchTerm ? `, davon ${archivedEinsaetze.length} Treffer für „${archiveSearchTerm}“` : ''}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
              {archiveError ? (
                renderErrorState(refetchArchive)
              ) : isArchiveLoading && archivedEinsaetze.length === 0 ? (
                renderLoadingState('Lade Archiv...')
              ) : archivedEinsaetze.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-md rounded-lg border border-dashed border-border-subtle bg-surface-panel p-8 text-center shadow-sm">
                    <p className="font-medium text-text-primary">Keine Archivtreffer</p>
                    <p className="mt-2 text-body-sm text-text-secondary">
                      {archiveSearchTerm ? 'Passen Sie Suche oder Sortierung an.' : 'Archivierte Einsätze erscheinen hier, sobald sie archiviert wurden.'}
                    </p>
                    {archiveSearchTerm && (
                      <Button
                        appearance="outline"
                        intent="secondary"
                        onClick={() => {
                          setArchiveSearchInput('');
                          setArchiveSearchTerm('');
                        }}
                        className="mt-6"
                      >
                        Suche zurücksetzen
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {archivedEinsaetze.map((einsatz) => renderEinsatzCard(einsatz))}

                  {hasNextPage && (
                    <div className="pt-2 text-center">
                      <Button appearance="outline" intent="secondary" onClick={() => void fetchNextPage()} loading={isFetchingNextPage}>
                        {isFetchingNextPage ? <PiSpinner className="h-5 w-5 animate-spin" /> : <PiArchive className="h-5 w-5" />}
                        Weitere Archiv-Einsätze laden
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <EinsatzCreateForm isOpen={isCreatePanelOpen} onClose={() => setIsCreatePanelOpen(false)} onSuccess={handleCreateSuccess} />
    </div>
  );
}

interface DashboardViewButtonProps {
  count: number;
  isActive: boolean;
  label: string;
  onClick: () => void;
}

function DashboardViewButton({ count, isActive, label, onClick }: DashboardViewButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
        isActive ? 'bg-surface-panel text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
      )}
    >
      <span>{label}</span>
      <span
        className={cn('inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs', isActive ? 'bg-surface-raised text-text-primary' : 'bg-surface-raised text-text-secondary')}
      >
        {count}
      </span>
    </button>
  );
}

interface SummaryChipProps {
  label: string;
  tone: 'amber' | 'emerald' | 'sky';
  value: number;
}

function SummaryChip({ label, tone, value }: SummaryChipProps) {
  const toneClassName = {
    amber: 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
    emerald: 'border-status-success-border bg-status-success-surface text-status-success-text',
    sky: 'border-status-info-border bg-status-info-surface text-status-info-text',
  }[tone];

  return (
    <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm', toneClassName)}>
      <PiCheckCircle className="h-4 w-4" />
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
