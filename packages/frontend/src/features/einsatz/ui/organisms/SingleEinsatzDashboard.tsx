import { useUserNames } from '@/features/auth/api/use-users';
import { FMS_STATUS_LABELS, useActiveEinsatz, useEinsatzDetails, useEinsatzFahrzeuge } from '@/features/einsatz';
import { isWorkspaceRouteAccessible } from '@/features/workspace';
import type { AddressDto, EintragDto, EinsatzDetailsDto, EinsatzFahrzeugDto } from '@/shared';
import { ErrorState } from '@/shared/ui/atoms/ErrorState';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';
import { cn, type PriorityPanelTone } from '@/shared/ui';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { PiArrowRight, PiClipboard, PiClock, PiMapPin, PiPulse, PiTruck, PiWarning } from 'react-icons/pi';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { StatusChangeMeta } from '../molecules/StatusChangeMeta';
import { deriveStatusChangeMeta } from '../../utils/status-change-meta';
import { consumeKeyboardNavigationFlag, resolveNavigationTarget } from '../../utils/navigation-target';

const PRIORITY_ROUTE_TARGETS = {
  etb: '/app/einsatz/$einsatzId/führung/etb',
  lagekarte: '/app/einsatz/$einsatzId/übersicht/karte',
  kraefte: '/app/einsatz/$einsatzId/kräfte/dashboard',
} as const;

const ETB_CHART_FILLS = ['#3b82f6', '#f59e0b', '#22c55e', '#64748b', '#ef4444', '#9ca3af'];

type OverviewRouteTarget = (typeof PRIORITY_ROUTE_TARGETS)[keyof typeof PRIORITY_ROUTE_TARGETS];

type DashboardEinsatz = EinsatzDetailsDto['einsatz'] & {
  name?: string;
  alarmierungszeit?: Date | string;
  beschreibung?: string;
  einsatzort?: AddressDto | string;
};

interface KpiItem {
  label: string;
  value: string;
  tone: PriorityPanelTone;
  icon: ComponentType<{ className?: string }>;
}

interface QuickLink {
  id: string;
  label: string;
  count: string;
  icon: ComponentType<{ className?: string }>;
  to?: OverviewRouteTarget;
  available: boolean;
}

interface EtbCategoryDatum {
  kategorie: string;
  count: number;
  fill: string;
}

interface FmsStatusDatum {
  name: string;
  value: number;
  fill: string;
}

function useDelayedFlag(isActive: boolean, delayMs: number): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setIsVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, isActive]);

  return isVisible;
}

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatEinsatzort(einsatzort: DashboardEinsatz['einsatzort']): string {
  if (!einsatzort) {
    return 'Ort wird nachgereicht';
  }

  if (typeof einsatzort === 'string') {
    return einsatzort;
  }

  const street = [einsatzort.strasse, einsatzort.hausnummer].filter(Boolean).join(' ');
  const locality = [einsatzort.plz, einsatzort.ort].filter(Boolean).join(' ');

  return [street, locality].filter(Boolean).join(', ');
}

function getEinsatzDisplayName(einsatz: DashboardEinsatz): string {
  return einsatz.name?.trim() || einsatz.alarmstichwort || 'Aktiver Einsatz';
}

function getEinsatzStartTime(einsatz: DashboardEinsatz): Date {
  return parseDate(einsatz.alarmierungszeit) ?? parseDate(einsatz.createdAt) ?? new Date();
}

function getEntryCategoryLabel(category: EintragDto['kategorie'] | undefined): string {
  switch (category) {
    case 'ALARMIERUNG':
      return 'Alarmierung';
    case 'ANKUNFT':
      return 'Ankunft';
    case 'BEFEHL':
      return 'Befehl';
    case 'ERKUNDUNG':
      return 'Erkundung';
    case 'LAGE':
      return 'Lage';
    case 'MASSNAHME':
      return 'Maßnahme';
    case 'PERSONAL':
      return 'Personal';
    case 'FAHRZEUG':
      return 'Fahrzeug';
    case 'MATERIAL':
      return 'Material';
    case 'KOMMUNIKATION':
      return 'Kommunikation';
    case 'WETTER':
      return 'Wetter';
    case 'DOKUMENTATION':
      return 'Dokumentation';
    case 'SYSTEM':
      return 'System';
    case 'SONSTIGES':
      return 'Sonstiges';
    default:
      return 'Eintrag';
  }
}

function trimText(text: string | undefined, maxLength = 88): string {
  if (!text) {
    return 'Keine Lageänderung dokumentiert.';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

function resolveActionAvailability(target: OverviewRouteTarget, einsatzId: string): boolean {
  return isWorkspaceRouteAccessible(target.replace('$einsatzId', einsatzId), einsatzId);
}

function getSurfaceToneClasses(tone: PriorityPanelTone): string {
  switch (tone) {
    case 'active':
      return 'border-status-info-border bg-status-info-surface text-status-info-text';
    case 'warning':
      return 'border-status-warning-border bg-status-warning-surface text-status-warning-text';
    case 'critical':
      return 'border-status-danger-border bg-status-danger-surface text-status-danger-text';
    case 'observing':
      return 'border-border-subtle bg-surface-raised text-text-primary';
    default:
      return 'border-border-subtle bg-surface-panel text-text-primary';
  }
}

function getMetricToneClasses(tone: PriorityPanelTone): string {
  switch (tone) {
    case 'active':
      return 'border-status-info-border bg-surface-panel';
    case 'warning':
      return 'border-status-warning-border bg-surface-panel';
    case 'critical':
      return 'border-status-danger-border bg-surface-panel';
    case 'observing':
      return 'border-border-subtle bg-surface-canvas';
    default:
      return 'border-border-subtle bg-surface-panel';
  }
}

function formatFeedTime(value: Date | string | null | undefined): string {
  const date = parseDate(value);
  return date ? format(date, 'dd.MM. HH:mm', { locale: de }) : 'Zeit offen';
}

function getVehicleSortScore(fahrzeug: EinsatzFahrzeugDto): number {
  if (fahrzeug.fmsStatus >= 3 && fahrzeug.fmsStatus <= 4) {
    return 0;
  }

  if (fahrzeug.fmsStatus === 2 || fahrzeug.fmsStatus === 1) {
    return 1;
  }

  return 2;
}

function KpiCard({ item }: { item: KpiItem }) {
  const Icon = item.icon;

  return (
    <div className={cn('rounded-panel border px-3 py-2 shadow-sm', getMetricToneClasses(item.tone))}>
      <div className="flex items-center gap-2 text-text-secondary">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-body-xs font-medium tracking-[0.08em] uppercase">{item.label}</span>
      </div>
      <p className="mt-2 text-title-md font-semibold text-text-primary">{item.value}</p>
    </div>
  );
}

function QuickLinkCard({ link, einsatzId }: { link: QuickLink; einsatzId: string }) {
  const Icon = link.icon;
  const stateLabel = link.available ? 'Direkt verfügbar' : 'Weiter beobachten';

  const content = (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-panel border border-border-subtle bg-surface-raised">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium text-text-primary">{link.label}</p>
        <p className="text-body-xs text-text-secondary">{stateLabel}</p>
      </div>
      <span className="rounded-pill border border-border-subtle bg-surface-raised px-2 py-0.5 text-body-xs font-medium text-text-secondary">{link.count}</span>
      {link.to ? <PiArrowRight className="h-4 w-4 flex-shrink-0 text-text-secondary" aria-hidden="true" /> : null}
    </div>
  );

  const cardClassName = cn(
    'rounded-panel border border-border-subtle bg-surface-panel px-4 py-3 shadow-sm',
    link.to ? 'block transition-colors hover:border-border-strong focus-visible:shadow-focus-ring focus-visible:outline-none' : 'block',
  );

  if (!link.to) {
    return <div className={cardClassName}>{content}</div>;
  }

  return (
    <Link
      to={link.to}
      // eslint-disable-next-line typescript/no-explicit-any -- Workspace-Aktionen binden kanonische Route-Templates mit Einsatz-Parametern.
      params={{ einsatzId } as any}
      search={(prev) => prev}
      className={cardClassName}
    >
      {content}
    </Link>
  );
}

function EtbBarChart({ data }: { data: EtbCategoryDatum[] }) {
  if (data.length === 0) {
    return <div className="rounded-panel border border-dashed border-border-subtle bg-surface-raised px-4 py-3 text-body-sm text-text-secondary">Noch keine ETB-Aktivität vorhanden.</div>;
  }

  return (
    <div role="img" aria-label="ETB-Aktivität">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #e2e8f0)" />
          <XAxis dataKey="kategorie" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
          <Tooltip
            formatter={(value: number) => [`${value} Einträge`, 'Anzahl']}
            contentStyle={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--color-border-subtle)', borderRadius: '0.375rem' }}
            labelStyle={{ color: 'var(--color-text-secondary)' }}
            itemStyle={{ color: 'var(--color-text-primary)' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.kategorie} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FmsDonutChart({ data, total }: { data: FmsStatusDatum[]; total: number }) {
  if (total === 0) {
    return <div className="rounded-panel border border-dashed border-border-subtle bg-surface-raised px-4 py-3 text-body-sm text-text-secondary">Noch keine Ressourcen im Überblick verfügbar.</div>;
  }

  const visibleData = data.filter((d) => d.value > 0);

  return (
    <div role="img" aria-label="Ressourcenverteilung" className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={visibleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2}>
            {visibleData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} Fzg.`, name]}
            contentStyle={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--color-border-subtle)', borderRadius: '0.375rem' }}
            labelStyle={{ color: 'var(--color-text-secondary)' }}
            itemStyle={{ color: 'var(--color-text-primary)' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-title-md font-semibold text-text-primary">{total}</span>
      </div>
    </div>
  );
}

export function SingleEinsatzDashboard() {
  const { einsatzId } = useParams({ from: '/app/einsatz/$einsatzId' });
  const { activeEinsatz, setActiveEinsatz, isEinsatzActive } = useActiveEinsatz();
  const { einsatz: einsatzData, etb, lagekarte, isLoading, isFetching, error } = useEinsatzDetails(einsatzId);
  const { data: fahrzeuge = [], isLoading: isLoadingFahrzeuge, isFetching: isFetchingFahrzeuge } = useEinsatzFahrzeuge(einsatzId);
  const { getUserName } = useUserNames();
  const navigate = useNavigate();

  const einsatz = einsatzData as DashboardEinsatz | undefined;

  // Story 2.3 AC4: Highlight-Tracking bei Daten-Updates
  const prevEntryIdsRef = useRef<string>('');
  const [highlightedEntryIds, setHighlightedEntryIds] = useState<Set<string>>(new Set());

  const etbEntries = etb?.eintraege.filter((entry) => !entry.isDeleted) ?? [];
  const currentEntryIds = etbEntries.map((e) => e.id).join(',');

  useEffect(() => {
    const prev = prevEntryIdsRef.current;
    prevEntryIdsRef.current = currentEntryIds;

    if (prev && currentEntryIds !== prev) {
      const prevIds = new Set(prev.split(','));
      const currentIds = currentEntryIds.split(',');
      const newIds = new Set<string>();
      for (const id of currentIds) {
        if (id && !prevIds.has(id)) {
          newIds.add(id);
        }
      }
      if (newIds.size > 0) {
        setHighlightedEntryIds(newIds);
        const timer = window.setTimeout(() => setHighlightedEntryIds(new Set()), 2000);
        return () => window.clearTimeout(timer);
      }
    }
  }, [currentEntryIds]);

  useEffect(() => {
    if (einsatz && (!isEinsatzActive || activeEinsatz?.id !== einsatz.id)) {
      setActiveEinsatz(einsatz.id);
    }
  }, [activeEinsatz, einsatz, isEinsatzActive, setActiveEinsatz]);

  /** Story 2.4 Task 5.4: Fokus auf erstes interaktives Element nach Keyboard-Navigation */
  const dashboardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (dashboardRef.current && consumeKeyboardNavigationFlag()) {
      const firstFocusable = dashboardRef.current.querySelector<HTMLElement>('a[href], button:not([disabled])');
      firstFocusable?.focus();
    }
  }, []);

  // Story 2.4 AC5: Keyboard-Interaktion tracken für Fokus-Management nach Navigation
  const lastInteractionRef = useRef<'keyboard' | 'mouse'>('mouse');

  useEffect(() => {
    const trackKeyboard = () => {
      lastInteractionRef.current = 'keyboard';
    };
    const trackMouse = () => {
      lastInteractionRef.current = 'mouse';
    };
    document.addEventListener('keydown', trackKeyboard);
    document.addEventListener('mousedown', trackMouse);
    return () => {
      document.removeEventListener('keydown', trackKeyboard);
      document.removeEventListener('mousedown', trackMouse);
    };
  }, []);

  /** Story 2.4 AC4: Pre-flight Check bei Link-Klick — Toast bei Fehlschlag + AC5 Fokus-Management */
  function guardNavigation(event: React.MouseEvent, route: string) {
    const resolvedRoute = route.replace('$einsatzId', einsatzId);
    if (!isWorkspaceRouteAccessible(resolvedRoute, einsatzId)) {
      event.preventDefault();
      toast.error('Bereich nicht zugänglich', {
        description: 'Der Zielbereich ist derzeit nicht verfügbar.',
        action: {
          label: 'Zur Übersicht',
          onClick: () =>
            navigate({
              to: '/app/einsatz/$einsatzId/übersicht',
              // eslint-disable-next-line typescript/no-explicit-any -- Workspace-Aktionen binden kanonische Route-Templates mit Einsatz-Parametern.
              params: { einsatzId } as any,
              search: (prev: Record<string, unknown>) => prev,
            }),
        },
      });
      return;
    }

    // AC5: Fokus auf erstes interaktives Element im Zielbereich bei Keyboard-Navigation
    if (lastInteractionRef.current === 'keyboard') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const focusable = document.querySelector<HTMLElement>('main a, main button, main input, main [tabindex="0"]');
          focusable?.focus();
        });
      });
    }
  }

  /** Story 2.4 AC5: Space-Taste auf Links aktivieren (nativ nur bei Buttons) */
  function handleLinkSpace(event: React.KeyboardEvent) {
    if (event.key === ' ') {
      event.preventDefault();
      (event.currentTarget as HTMLElement).click();
    }
  }

  const delayedOverviewRefresh = useDelayedFlag((isFetching && !isLoading) || (isFetchingFahrzeuge && !isLoadingFahrzeuge), 300);
  const delayedResourceLoading = useDelayedFlag(isLoadingFahrzeuge && !isLoading, 300);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingState message="Lade priorisierte Lageübersicht..." fullScreen={false} />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Fehler beim Laden" description="Die priorisierte Lageübersicht konnte nicht geladen werden." />;
  }

  if (!einsatz) {
    return <ErrorState title="Einsatz nicht gefunden" description="Der angeforderte Einsatz existiert nicht." />;
  }

  const startTime = getEinsatzStartTime(einsatz);
  const einsatzName = getEinsatzDisplayName(einsatz);
  const einsatzort = formatEinsatzort(einsatz.einsatzort);
  const duration = formatDistanceToNow(startTime, { locale: de, addSuffix: false });
  const latestEntry = etbEntries.at(-1);
  const pois = Array.isArray(lagekarte?.pois) ? (lagekarte.pois as Array<Record<string, unknown>>) : [];
  const poisCount = pois.length;
  const activeVehicleCount = fahrzeuge.filter((fahrzeug) => fahrzeug.fmsStatus >= 3 && fahrzeug.fmsStatus <= 4).length;
  const readyVehicleCount = fahrzeuge.filter((fahrzeug) => fahrzeug.fmsStatus === 1 || fahrzeug.fmsStatus === 2).length;
  const unavailableVehicleCount = fahrzeuge.filter((fahrzeug) => fahrzeug.fmsStatus === 0 || fahrzeug.fmsStatus === 6).length;
  const specialVehicleCount = fahrzeuge.filter((fahrzeug) => ![0, 1, 2, 3, 4, 6].includes(fahrzeug.fmsStatus)).length;
  const resourcePreview = [...fahrzeuge].sort((left, right) => getVehicleSortScore(left) - getVehicleSortScore(right)).slice(0, 4);
  const recentEntries = [...etbEntries].slice(-4).reverse();
  const needsEtbAttention = !latestEntry;
  const needsMapAttention = poisCount === 0;
  const needsResourceAttention = fahrzeuge.length === 0 || activeVehicleCount === 0;
  const displayNumber = einsatz.nummer ? `${einsatz.nummer} · ${einsatzName}` : einsatzName;

  let heroTone: PriorityPanelTone = 'active';
  let focusLabel = 'Lage stabil';
  let focusIcon: ComponentType<{ className?: string }> = PiPulse;

  if (needsEtbAttention) {
    heroTone = 'critical';
    focusLabel = 'Dokumentation offen';
    focusIcon = PiWarning;
  } else if (needsMapAttention) {
    heroTone = 'warning';
    focusLabel = 'Karte unvollständig';
    focusIcon = PiMapPin;
  } else if (needsResourceAttention) {
    heroTone = 'warning';
    focusLabel = 'Kräfte prüfen';
    focusIcon = PiTruck;
  }

  const kpis: KpiItem[] = [
    { label: 'Dauer', value: duration, tone: 'active', icon: PiClock },
    { label: 'ETB', value: String(etbEntries.length), tone: needsEtbAttention ? 'critical' : 'observing', icon: PiClipboard },
    { label: 'Ortsmarken', value: String(poisCount), tone: needsMapAttention ? 'warning' : 'active', icon: PiMapPin },
    { label: 'Kräfte', value: `${activeVehicleCount}/${fahrzeuge.length || 0}`, tone: needsResourceAttention ? 'warning' : 'active', icon: PiTruck },
  ];

  const etbActionAvailable = resolveActionAvailability(PRIORITY_ROUTE_TARGETS.etb, einsatzId);
  const lagekarteActionAvailable = resolveActionAvailability(PRIORITY_ROUTE_TARGETS.lagekarte, einsatzId);
  const kraefteActionAvailable = resolveActionAvailability(PRIORITY_ROUTE_TARGETS.kraefte, einsatzId);

  const quickLinks: QuickLink[] = [
    {
      id: 'etb',
      label: 'ETB',
      count: `${etbEntries.length} Einträge`,
      icon: PiClipboard,
      to: etbActionAvailable ? PRIORITY_ROUTE_TARGETS.etb : undefined,
      available: etbActionAvailable,
    },
    {
      id: 'lagekarte',
      label: 'Lagekarte',
      count: `${poisCount} Ortsmarken`,
      icon: PiMapPin,
      to: lagekarteActionAvailable ? PRIORITY_ROUTE_TARGETS.lagekarte : undefined,
      available: lagekarteActionAvailable,
    },
    {
      id: 'kraefte',
      label: 'Kräfte-Dashboard',
      count: `${activeVehicleCount}/${fahrzeuge.length || 0} aktiv`,
      icon: PiTruck,
      to: kraefteActionAvailable ? PRIORITY_ROUTE_TARGETS.kraefte : undefined,
      available: kraefteActionAvailable,
    },
  ];

  const activityCountMap = new Map<string, number>();
  for (const entry of etbEntries) {
    const label = getEntryCategoryLabel(entry.kategorie);
    activityCountMap.set(label, (activityCountMap.get(label) ?? 0) + 1);
  }

  const etbChartData: EtbCategoryDatum[] = [...activityCountMap.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([kategorie, count], index) => ({
      kategorie,
      count,
      fill: ETB_CHART_FILLS[index % ETB_CHART_FILLS.length],
    }));

  const fmsChartData: FmsStatusDatum[] = [
    { name: 'Im Einsatz', value: activeVehicleCount, fill: '#3b82f6' },
    { name: 'Bereit', value: readyVehicleCount, fill: '#22c55e' },
    { name: 'Sonderstatus', value: specialVehicleCount, fill: '#f59e0b' },
    { name: 'Nicht bereit', value: unavailableVehicleCount, fill: '#ef4444' },
  ];

  const FocusIcon = focusIcon;
  const vehicleTarget = resolveNavigationTarget('kraefte-status', einsatzId, isWorkspaceRouteAccessible);
  const entryTarget = resolveNavigationTarget('etb-entry', einsatzId, isWorkspaceRouteAccessible);

  return (
    <section ref={dashboardRef} aria-label="Einsatz-Dashboard" className="space-y-4">
      <div className="space-y-2">
        <div className={cn('flex items-center gap-2 rounded-panel border px-3 py-1.5', getSurfaceToneClasses(heroTone))}>
          <FocusIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="text-body-xs font-medium tracking-[0.05em] uppercase opacity-80">Fokus</span>
          <span className="rounded-pill border border-current/15 bg-surface-panel/70 px-2.5 py-0.5 text-body-xs font-medium">{focusLabel}</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} item={kpi} />
          ))}
        </div>

        {delayedOverviewRefresh || delayedResourceLoading ? (
          <output aria-live="polite" aria-atomic="true" className="block rounded-panel border border-border-subtle bg-surface-panel px-3 py-2 text-body-sm text-text-secondary">
            Lageübersicht wird aktualisiert.
          </output>
        ) : null}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-panel border border-border-subtle bg-surface-panel p-4 shadow-panel">
          <h3 className="text-body-lg font-semibold text-text-primary">Lagebild</h3>
          <div className="mt-3">
            <EtbBarChart data={etbChartData} />
          </div>
        </section>

        <section className="rounded-panel border border-border-subtle bg-surface-panel p-4 shadow-panel">
          <h3 className="text-body-lg font-semibold text-text-primary">Ressourcenlage</h3>
          <div className="mt-3">
            <FmsDonutChart data={fmsChartData} total={fahrzeuge.length} />
          </div>
          {resourcePreview.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {resourcePreview.map((fahrzeug) => {
                const fmsLabel = FMS_STATUS_LABELS[fahrzeug.fmsStatus] ?? `Status ${fahrzeug.fmsStatus}`;

                const vehicleContent = (
                  <>
                    <span className="truncate text-body-sm font-medium text-text-primary">{fahrzeug.funkrufname}</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-pill border border-border-subtle bg-surface-panel px-2 py-0.5 text-body-xs font-medium text-text-secondary">{fmsLabel}</span>
                      {vehicleTarget.available ? <PiArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-text-secondary" aria-hidden="true" /> : null}
                    </div>
                  </>
                );

                return (
                  <li key={fahrzeug.id}>
                    {vehicleTarget.available && vehicleTarget.route ? (
                      <Link
                        to={vehicleTarget.route}
                        // eslint-disable-next-line typescript/no-explicit-any -- Workspace-Aktionen binden kanonische Route-Templates mit Einsatz-Parametern.
                        params={{ einsatzId } as any}
                        search={(prev) => prev}
                        onClick={(e) => guardNavigation(e, vehicleTarget.route as string)}
                        onKeyDown={handleLinkSpace}
                        className="hover:bg-muted/50 flex items-center justify-between gap-3 rounded-panel border border-border-subtle bg-surface-raised px-3 py-2 transition-colors focus-visible:shadow-focus-ring focus-visible:outline-none"
                      >
                        <span className="sr-only">{vehicleTarget.label}</span>
                        {vehicleContent}
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between gap-3 rounded-panel border border-border-subtle bg-surface-raised px-3 py-2 opacity-70">{vehicleContent}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      </div>

      <section className="rounded-panel border border-border-subtle bg-surface-panel p-4 shadow-panel">
        <h3 className="text-body-lg font-semibold text-text-primary">Einsatzinformationen</h3>
        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-body-xs font-medium tracking-[0.08em] text-text-secondary uppercase">Einsatz</dt>
            <dd className="mt-0.5 text-body-sm text-text-primary">{displayNumber}</dd>
          </div>
          <div>
            <dt className="text-body-xs font-medium tracking-[0.08em] text-text-secondary uppercase">Alarmstichwort</dt>
            <dd className="mt-0.5 text-body-sm text-text-primary">{einsatz.alarmstichwort}</dd>
          </div>
          <div>
            <dt className="text-body-xs font-medium tracking-[0.08em] text-text-secondary uppercase">Ort</dt>
            <dd className="mt-0.5 text-body-sm text-text-primary">{einsatzort}</dd>
          </div>
          <div>
            <dt className="text-body-xs font-medium tracking-[0.08em] text-text-secondary uppercase">Alarmierung</dt>
            <dd className="mt-0.5 text-body-sm text-text-primary">{format(startTime, 'dd.MM.yyyy HH:mm', { locale: de })} Uhr</dd>
          </div>
          <div>
            <dt className="text-body-xs font-medium tracking-[0.08em] text-text-secondary uppercase">Hinweis</dt>
            <dd className="mt-0.5 text-body-sm text-text-primary">{einsatz.beschreibung?.trim() || einsatz.bemerkung?.trim() || 'Keine zusätzliche Lagemitteilung hinterlegt.'}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-panel border border-border-subtle bg-surface-panel p-4 shadow-panel">
        <h3 className="text-body-lg font-semibold text-text-primary">Direktzugriffe</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <QuickLinkCard key={link.id} link={link} einsatzId={einsatzId} />
          ))}
        </div>
      </section>

      <section className="rounded-panel border border-border-subtle bg-surface-panel p-4 shadow-panel" aria-label="Letzte Meldungen">
        <h3 className="text-body-lg font-semibold text-text-primary">Letzte Meldungen</h3>
        <output aria-live="polite" aria-atomic="false" className="mt-3 block">
          {isFetching && !isLoading && recentEntries.length > 0 ? (
            <div className="mb-2 flex gap-2">
              {[1, 2, 3].map((i) => (
                <span key={i} className="h-3 w-16 animate-pulse rounded bg-surface-raised" />
              ))}
            </div>
          ) : null}
          {recentEntries.length > 0 ? (
            <ul className="divide-y divide-border-subtle">
              {recentEntries.map((entry, index) => {
                const meta = deriveStatusChangeMeta(entry, getUserName);
                const isNewest = index === 0;
                const isHighlighted = highlightedEntryIds.has(entry.id);

                const entryContent = (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className={cn('text-body-sm font-medium text-text-primary', isNewest && 'font-semibold')}>{getEntryCategoryLabel(entry.kategorie)}</span>
                        <span className="ml-2 text-body-sm text-text-secondary">{trimText(entry.text, 110)}</span>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="text-body-xs text-text-secondary">{formatFeedTime(entry.timestamp)}</span>
                        {entryTarget.available ? <PiArrowRight className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" /> : null}
                      </div>
                    </div>
                    <div className="mt-1">
                      <StatusChangeMeta meta={meta} isNewest={isNewest} />
                    </div>
                  </>
                );

                return (
                  <li key={entry.id} className={cn('py-2.5 first:pt-0 last:pb-0', isNewest ? 'opacity-100' : 'opacity-70', isHighlighted && 'animate-highlight-new rounded-panel')}>
                    {entryTarget.available && entryTarget.route ? (
                      <Link
                        to={entryTarget.route}
                        // eslint-disable-next-line typescript/no-explicit-any -- Workspace-Aktionen binden kanonische Route-Templates mit Einsatz-Parametern.
                        params={{ einsatzId } as any}
                        search={(prev) => prev}
                        onClick={(e) => guardNavigation(e, entryTarget.route as string)}
                        onKeyDown={handleLinkSpace}
                        className="hover:bg-muted/50 -mx-2 -my-1 block rounded-panel px-2 py-1 transition-colors focus-visible:shadow-focus-ring focus-visible:outline-none"
                      >
                        <span className="sr-only">{entryTarget.label}</span>
                        {entryContent}
                      </Link>
                    ) : (
                      <div className="-mx-2 -my-1 px-2 py-1">
                        {entryContent}
                        {!entryTarget.available ? <p className="mt-1 text-body-xs text-text-secondary italic">{entryTarget.fallbackAction}</p> : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-panel border border-dashed border-border-subtle bg-surface-raised px-4 py-3 text-body-sm text-text-secondary">Noch keine Meldungen im ETB vorhanden.</div>
          )}
        </output>
      </section>
    </section>
  );
}
