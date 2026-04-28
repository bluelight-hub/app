import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useCurrentUser } from '@/features/auth/api/use-current-user';
import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import { EmptyState } from '@/shared/ui/molecules/empty-state.molecule';
import { PiShield, PiShieldCheck } from 'react-icons/pi';
import { PSA_PROFIL_META } from '../../constants/psa-profil.constants';
import { useLongPress } from '../../hooks/use-long-press';
import { useReducedMotion } from '../../hooks/use-reduced-motion';
import { useEigenschutzSelection } from '../../stores/eigenschutz-selection.store';
import { PSAChangeDrawer } from '../organisms/PSAChangeDrawer';
import { PsaProfilDetailDrawer } from '../organisms/PsaProfilDetailDrawer';
import { PsaBulkActionBar } from '../molecules/PsaBulkActionBar';
import { useOffenePsaBekanntgaben, usePsaProfileByEinheit, type OffenePsaBekanntgabeEntry } from '../../api/queries';
import { AcknowledgmentStatusBadge } from '../molecules/AcknowledgmentStatusBadge';
import type { PsaProfilValue } from '@bluelight-hub/shared/schemas/eigenschutz/psa-profil.schema';

export interface PsaProfilePageProps {
  readonly einsatzId: string;
}

const FADE_DURATION_MS = 600;

/**
 * Übersichts-Page für PSA-Profile pro Einheit (Story 3.1 + Story 3.2 Bulk).
 *
 * Im Single-Modus öffnet ein Klick auf „PSA-Profil ändern" den Drawer für
 * eine Einheit. Im Multi-Select-Modus (Long-Press / Shift-Klick auf eine
 * Karte) erscheint die `PsaBulkActionBar` und der Drawer wird mit einer
 * Liste von Einheiten geöffnet.
 *
 * **Orange-Fade-Indikator (AC7):** Nach erfolgreichem Bulk-Submit
 * markieren wir die mutierten Einheiten kurz mit einem Fade — bei
 * `prefers-reduced-motion: reduce` ohne Animation.
 */
export function PsaProfilePage({ einsatzId }: PsaProfilePageProps) {
  const { user } = useCurrentUser();
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const selection = useEigenschutzSelection();
  const reducedMotion = useReducedMotion();

  // Single-Drawer-Trigger: legacy Story-3.1-Pfad — Klick auf den Karten-Button
  // im Single-Modus öffnet den Drawer für GENAU eine Einheit.
  const [singleDrawerEinheitId, setSingleDrawerEinheitId] = useState<string | null>(null);
  // Bulk-Drawer-Open-Flag: getrennt vom Selection-Store, damit ein
  // Drawer-Cancel die Selection erhalten kann (Q3 — User kann erneut auf
  // „PSA ändern für N Abschnitte" tippen, ohne neu zu markieren).
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false);

  // Recently-mutated-Set für den Orange-Fade-Indikator (AC7).
  const [recentlyMutated, setRecentlyMutated] = useState<ReadonlySet<string>>(() => new Set<string>());
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (fadeTimerRef.current !== null) clearTimeout(fadeTimerRef.current);
    },
    [],
  );

  const handleSingleSaved = useCallback(() => {
    setSingleDrawerEinheitId(null);
  }, []);

  const triggerFade = useCallback(
    (einheitIds: readonly string[]) => {
      if (reducedMotion) return;
      // F5: zwei Bulk-Operationen <600 ms nacheinander dürfen die erste
      // Set-Membership nicht überschreiben. Wir mergen die neuen IDs in
      // den existierenden Set; jeder Eintrag bekommt durch die Refresh
      // des einen Sammeltimers die volle 600-ms-Phase ab dem letzten
      // Submit. (Per-einheitId-Timeouts wären sauberer, sind aber als
      // Defer-Item dokumentiert — der Merge schließt die offensichtliche
      // visuelle Lücke.)
      setRecentlyMutated((prev) => {
        const next = new Set(prev);
        for (const id of einheitIds) next.add(id);
        return next;
      });
      if (fadeTimerRef.current !== null) clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = setTimeout(() => {
        setRecentlyMutated(new Set<string>());
        fadeTimerRef.current = null;
      }, FADE_DURATION_MS);
    },
    [reducedMotion],
  );

  const handleBulkSaved = useCallback(
    (einheitIds: readonly string[]) => {
      triggerFade(einheitIds);
      setBulkDrawerOpen(false);
      selection.clearSelection();
    },
    [selection, triggerFade],
  );

  const handleBulkOpen = useCallback(() => {
    if (selection.selectionCount === 0) return;
    setBulkDrawerOpen(true);
  }, [selection.selectionCount]);

  const handleBulkCancel = useCallback(() => {
    selection.exitMultiSelect();
  }, [selection]);

  const bulkEinheitIds = [...selection.selectedEinheitIds];
  const bulkEinheiten = (einheitenQuery.data ?? []).filter((e) => selection.selectedEinheitIds.has(e.id));

  // P19: Wenn Drawer offen ist und die Selection extern auf 0 fällt
  // (z. B. via Conflict-Banner-„Einheit entfernen" der letzten Einheit),
  // muss `bulkDrawerOpen` synchron auf false zurückgehen — sonst öffnet
  // sich der Drawer beim nächsten Multi-Select-Trigger sofort wieder.
  useEffect(() => {
    if (bulkDrawerOpen && bulkEinheitIds.length === 0) {
      setBulkDrawerOpen(false);
    }
  }, [bulkDrawerOpen, bulkEinheitIds.length]);

  // E15: Wechselseitige Exklusivität zwischen Single- und Bulk-Drawer.
  // Beide Drawer-Pfade dürfen niemals gleichzeitig offen sein — sonst
  // entstehen doppelte Telemetrie-Events und doppelte Mutationen.
  useEffect(() => {
    if (singleDrawerEinheitId !== null && selection.isMultiSelectActive) {
      selection.exitMultiSelect();
    }
  }, [singleDrawerEinheitId, selection]);
  useEffect(() => {
    if (bulkDrawerOpen && singleDrawerEinheitId !== null) {
      setSingleDrawerEinheitId(null);
    }
  }, [bulkDrawerOpen, singleDrawerEinheitId]);

  // Lookup für Konflikt-Banner-Texte (P23): auch im Single-Modus übergeben
  // wir die einheiten-Liste, damit der Drawer beim 409-Conflict den
  // Einheit-Namen statt der rohen CUID rendern kann.
  const allEinheiten = (einheitenQuery.data ?? []).map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">PSA-Profile</h1>
          <p className="mt-1 text-sm text-text-muted">Schutzstufe pro Einheit aktivieren oder deaktivieren — jede Änderung ist auditierbar.</p>
        </div>
      </header>

      {selection.isMultiSelectActive ? <PsaBulkActionBar selectionCount={selection.selectionCount} onChange={handleBulkOpen} onCancel={handleBulkCancel} /> : null}

      {einheitenQuery.isLoading ? (
        <p className="text-sm text-text-muted">Lade Einheiten…</p>
      ) : einheitenQuery.isError ? (
        <p role="alert" className="rounded-control border border-status-danger bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
          Einheiten konnten nicht geladen werden.
        </p>
      ) : !einheitenQuery.data || einheitenQuery.data.length === 0 ? (
        <EmptyState icon={PiShield} title="Keine Einheiten im Einsatz" description="Sobald Einheiten dem Einsatz beigetreten sind, kannst du hier PSA-Profile aktivieren." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="psa-einheiten-list">
          {einheitenQuery.data.map((einheit) => (
            <li key={einheit.id}>
              <PsaEinheitCard
                einsatzId={einsatzId}
                einheitId={einheit.id}
                einheitName={einheit.name}
                multiSelectActive={selection.isMultiSelectActive}
                isSelected={selection.isSelected(einheit.id)}
                onSingleChange={() => setSingleDrawerEinheitId(einheit.id)}
                onEnterMultiSelect={() => selection.enterMultiSelect(einheit.id)}
                onToggleSelection={() => selection.toggleSelection(einheit.id)}
                recentlyMutated={recentlyMutated.has(einheit.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {singleDrawerEinheitId !== null && user
        ? (() => {
            const aktiv = einheitenQuery.data?.find((e) => e.id === singleDrawerEinheitId);
            if (!aktiv) return null;
            return (
              <PSAChangeDrawer
                einsatzId={einsatzId}
                einheitId={aktiv.id}
                einheitName={aktiv.name}
                einheiten={allEinheiten}
                callerUserId={user.id}
                open={true}
                onClose={() => setSingleDrawerEinheitId(null)}
                onSaved={handleSingleSaved}
              />
            );
          })()
        : null}

      {bulkDrawerOpen && user && bulkEinheitIds.length > 0 ? (
        <PSAChangeDrawer
          einsatzId={einsatzId}
          einheitIds={bulkEinheitIds}
          einheiten={bulkEinheiten.map((e) => ({ id: e.id, name: e.name }))}
          callerUserId={user.id}
          open={true}
          onClose={() => setBulkDrawerOpen(false)}
          onSaved={(_, mutatedIds) => handleBulkSaved(mutatedIds)}
          onRemoveEinheit={(id) => selection.removeFromSelection(id)}
        />
      ) : null}

      <OffenePsaBekanntgabenSection einsatzId={einsatzId} />
    </div>
  );
}

/**
 * Story 3.4 AC13 / AC15 — Sender-Sektion „Offene PSA-Bekanntgaben".
 *
 * Listet PSA-Bekanntgaben der letzten 24 h, die noch nicht von allen
 * Empfängern quittiert wurden. Pro Eintrag rendert die Sektion einen
 * `AcknowledgmentStatusBadge`-Trigger plus Begründungs-Anriss, Zeit und
 * Einheiten-Anzahl.
 *
 * **Migration:** Story 6.2 hängt das Badge an die `AmpelCard`-Komponente
 * an. Diese Sektion bleibt als Drill-Down-Detail-View erhalten oder wird
 * in Story 6.2 zugunsten der `AmpelCard` entfernt — die Entscheidung
 * trifft Story 6.2.
 */
function OffenePsaBekanntgabenSection({ einsatzId }: { readonly einsatzId: string }) {
  const offeneQuery = useOffenePsaBekanntgaben(einsatzId);
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  // Story 3.5 AC11 — Sender-Drawer-State (Single-Slot): „Checkliste anzeigen"
  // öffnet den Detail-Drawer im Read-Only-Modus. Ein zweiter Klick auf einen
  // anderen Eintrag ersetzt den aktuellen Drawer (gleiches Pattern wie der
  // Banner-Drawer-Slot).
  const [checklistDrawerGroup, setChecklistDrawerGroup] = useState<string | null>(null);

  if (offeneQuery.isLoading) {
    return null;
  }

  const eintraege = offeneQuery.data ?? [];

  // Lookup `einheitId → einheitName` für den Sender-Drawer-Mount; Fallback
  // auf den rohen einheitId-String, wenn der Eintrag im Kräfte-Listing fehlt
  // (z. B. nach „Einheit verlassen"). Story 6.x ergänzt eine dedizierte
  // Membership-Auflösung.
  const einheitNameById = new Map<string, string>((einheitenQuery.data ?? []).map((e) => [e.id, e.name]));

  const activeEintrag: OffenePsaBekanntgabeEntry | undefined = checklistDrawerGroup === null ? undefined : eintraege.find((e) => e.propagationGroupId === checklistDrawerGroup);

  return (
    <section data-testid="offene-psa-bekanntgaben-section" className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold text-text-primary">Offene PSA-Bekanntgaben</h2>
        <p className="mt-1 text-sm text-text-muted">Bekanntgaben der letzten 24 Stunden, die noch nicht von allen Empfängern quittiert wurden.</p>
      </header>

      {offeneQuery.isError ? (
        <p role="alert" className="rounded-control border border-status-danger bg-status-danger/10 px-3 py-2 text-sm text-status-danger" data-testid="offene-psa-bekanntgaben-error">
          Offene Bekanntgaben konnten nicht geladen werden — bitte erneut versuchen.
        </p>
      ) : eintraege.length === 0 ? (
        <p className="text-sm text-text-muted" data-testid="offene-psa-bekanntgaben-empty">
          Aktuell keine offenen Bekanntgaben — alle Empfänger haben quittiert.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="offene-psa-bekanntgaben-list">
          {eintraege.map((eintrag) => (
            <li key={eintrag.propagationGroupId} className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border-subtle bg-surface-panel px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{eintrag.begruendungAnriss || `${eintrag.profilToggles.length} Profil-Änderung(en)`}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {formatBekanntgabeZeit(eintrag.occurredAt)} · {eintrag.betroffeneEinheitIds.length} Einheit{eintrag.betroffeneEinheitIds.length === 1 ? '' : 'en'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChecklistDrawerGroup(eintrag.propagationGroupId)}
                  className="hover:bg-surface-panel-elevated inline-flex min-h-11 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-text-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-info"
                  data-testid={`offene-psa-bekanntgabe-checkliste-${eintrag.propagationGroupId}`}
                >
                  Checkliste anzeigen
                </button>
                <AcknowledgmentStatusBadge einsatzId={einsatzId} propagationGroupId={eintrag.propagationGroupId} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Story 3.5 AC11 — Sender-Read-Only-Drawer: KEIN onQuittieren /
          onMeldeLuecke (Sender quittiert nicht selbst). */}
      {activeEintrag !== undefined ? (
        <PsaProfilDetailDrawer
          einsatzId={einsatzId}
          propagationGroupId={activeEintrag.propagationGroupId}
          aktiveProfile={activeEintrag.profilToggles.filter((t) => t.aktion === 'AKTIVIERT').map((t) => t.profil)}
          einheiten={activeEintrag.betroffeneEinheitIds.map((id) => ({ einheitId: id, einheitName: einheitNameById.get(id) ?? id }))}
          begruendung={activeEintrag.begruendungAnriss}
          onClose={() => setChecklistDrawerGroup(null)}
        />
      ) : null}
    </section>
  );
}

function formatBekanntgabeZeit(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return iso;
  }
}

interface PsaEinheitCardProps {
  einsatzId: string;
  einheitId: string;
  einheitName: string;
  multiSelectActive: boolean;
  isSelected: boolean;
  onSingleChange: () => void;
  onEnterMultiSelect: () => void;
  onToggleSelection: () => void;
  recentlyMutated: boolean;
}

function PsaEinheitCard({ einsatzId, einheitId, einheitName, multiSelectActive, isSelected, onSingleChange, onEnterMultiSelect, onToggleSelection, recentlyMutated }: PsaEinheitCardProps) {
  const profilQuery = usePsaProfileByEinheit(einsatzId, einheitId);
  const aktiveProfile: PsaProfilValue[] = (profilQuery.data ?? []).map((row) => row.profil);

  const longPress = useLongPress({
    onLongPress: () => {
      if (multiSelectActive) {
        // Im Multi-Modus ist Long-Press ein No-Op — Toggle passiert über
        // den regulären Click. Return `false`, damit der nachfolgende
        // synthetische Click NICHT als Long-Press-Suppress konsumiert wird
        // (sonst frisst er den ersten Toggle, F2).
        return false;
      }
      onEnterMultiSelect();
    },
  });

  const handleCardClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      // Klick auf den Single-Change-Button bubblt; wir sollen nur reagieren,
      // wenn wir nicht den Button selbst getroffen haben.
      const target = event.target as HTMLElement;
      if (target.closest('button')) return;

      // Browser feuert nach pointerdown/pointerup einen synthetischen Click —
      // wenn der Long-Press bereits Multi-Select aktiviert hat, würde der
      // folgende Click im Multi-Mode die gerade gesetzte Selection sofort
      // wieder deselektieren. Das Flag wird hier konsumiert.
      if (longPress.consumeClickIfLongPressFired()) return;

      if (event.shiftKey && !multiSelectActive) {
        onEnterMultiSelect();
        return;
      }
      if (multiSelectActive) {
        onToggleSelection();
      }
    },
    [multiSelectActive, onEnterMultiSelect, onToggleSelection, longPress],
  );

  return (
    <article
      className={cn(
        'flex h-full flex-col gap-3 rounded-panel border border-border-subtle bg-surface-panel p-4 shadow-panel transition-colors',
        multiSelectActive && 'cursor-pointer select-none',
        isSelected && 'border-status-info ring-2 ring-status-info',
        recentlyMutated && 'bg-status-warning-surface duration-[600ms]',
      )}
      data-testid={`psa-einheit-card-${einheitId}`}
      data-multi-selected={isSelected || undefined}
      data-recently-mutated={recentlyMutated || undefined}
      aria-pressed={multiSelectActive ? isSelected : undefined}
      onClick={handleCardClick}
      onPointerDown={longPress.onPointerDown}
      onPointerUp={longPress.onPointerUp}
      onPointerLeave={longPress.onPointerLeave}
      onPointerCancel={longPress.onPointerCancel}
      onContextMenu={longPress.onContextMenu}
    >
      <header className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-text-primary">{einheitName}</h2>
        <PiShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-text-muted" />
      </header>
      <div className="flex flex-wrap gap-2">
        {profilQuery.isLoading ? (
          <span className="text-xs text-text-muted">Lade Profile…</span>
        ) : aktiveProfile.length === 0 ? (
          <span className="text-xs text-text-muted">Kein aktives Profil</span>
        ) : (
          aktiveProfile.map((profil) => (
            <span key={profil} className={`inline-flex items-center gap-1 rounded-control border px-2 py-1 text-xs font-medium ${PSA_PROFIL_META[profil].chipColorActiveClass}`}>
              {PSA_PROFIL_META[profil].label}
            </span>
          ))
        )}
      </div>
      {multiSelectActive ? null : (
        <Button type="button" intent="primary" size="sm" onClick={onSingleChange} data-testid={`psa-change-button-${einheitId}`}>
          PSA-Profil ändern
        </Button>
      )}
    </article>
  );
}
