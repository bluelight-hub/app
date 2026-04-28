import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { cn } from '@/shared/ui/cn';
import { api } from '@/shared';
import { EIGENSCHUTZ_QUERY_KEYS, PsaProfilConflictError, useChangePsaProfil, usePsaProfileByEinheit, type ChangePsaProfilHookInput, type PsaProfileByEinheitDto } from '../../api/queries';
import { eigenschutzTelemetryQueue, getOrCreateSessionId } from '../../lib/telemetry-queue';
import { PSA_PROFIL_META } from '../../constants/psa-profil.constants';
import type { PsaProfilValue } from '@bluelight-hub/shared/schemas/eigenschutz/psa-profil.schema';
import { PSAProfileMultiSelect } from './PSAProfileMultiSelect';

const BEGRUENDUNG_MIN_LENGTH = 1;
const BEGRUENDUNG_MAX_LENGTH = 500;

export interface PsaChangeDrawerEinheitRef {
  readonly id: string;
  readonly name: string;
}

export interface PSAChangeDrawerProps {
  readonly einsatzId: string;
  /** Single-Modus (Story 3.1). */
  readonly einheitId?: string;
  readonly einheitName?: string;
  /** Bulk-Modus (Story 3.2). Wenn gesetzt, hat Vorrang vor `einheitId`. */
  readonly einheitIds?: ReadonlyArray<string>;
  readonly einheiten?: ReadonlyArray<PsaChangeDrawerEinheitRef>;
  readonly callerUserId: string;
  readonly open: boolean;
  readonly onClose: () => void;
  /**
   * Wird nach erfolgreichem Submit aufgerufen. Liefert die
   * `propagationGroupId` und die Liste der tatsächlich mutierten
   * Einheit-IDs (extrahiert aus `affected[].einheitId` des Response-DTOs)
   * — relevant für den Orange-Fade-Indikator (Story 3.2 AC7), der nur
   * für tatsächlich geänderte Einheiten flashen soll, nicht über die
   * volle Selection (Code-Review E16).
   */
  readonly onSaved?: (propagationGroupId: string, mutatedEinheitIds: readonly string[]) => void;
  /** Bulk-Header-Chip-Abwählen → entfernt eine Einheit aus der Selection. */
  readonly onRemoveEinheit?: (einheitId: string) => void;
}

/**
 * Drawer-Organism für PSA-Profil-Toggle (Story 3.1 Single + Story 3.2 Bulk).
 *
 * **Modus-Wahl:** wenn `einheitIds.length >= 1` gesetzt ist, läuft der Drawer
 * im Bulk-Modus mit konsolidiertem Profil-Status, Bulk-Endpoint und
 * Konflikt-Banner mit Einheit-Identifikation. Sonst klassischer Single-
 * Modus (Story 3.1, Last-BASIS-Modal).
 *
 * **Width-Logic (UX-DR25):** `w-[640px]` ab N≥3 Einheiten, sonst Standard.
 *
 * **Telemetrie:** `assess_started`-Event in `eigenschutzTelemetryQueue` mit
 * `abschnittCount`-Wert (Story 3.2 AC8).
 */
export function PSAChangeDrawer(props: PSAChangeDrawerProps) {
  const { einsatzId, einheitId, einheitName, einheitIds, einheiten = [], callerUserId, open, onClose, onSaved, onRemoveEinheit } = props;

  const isBulk = einheitIds !== undefined && einheitIds.length >= 1;
  const effectiveEinheitIds = isBulk ? einheitIds! : einheitId !== undefined ? [einheitId] : [];
  const abschnittCount = effectiveEinheitIds.length;

  const begruendungHintId = useId();
  const begruendungFieldId = useId();
  const dialogTitleId = useId();
  const dialogDescId = useId();

  const [pendingMap, setPendingMap] = useState<Map<PsaProfilValue, boolean>>(new Map());
  const [begruendung, setBegruendung] = useState('');
  const [destructiveModalOpen, setDestructiveModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Single-Modus: bestehender Hook bleibt (Behavior unverändert).
  const singleProfileQuery = usePsaProfileByEinheit(einsatzId, einheitId ?? '', { enabled: !isBulk && open && einheitId !== undefined && pendingMap.size === 0 });

  // Bulk-Modus: für jede Einheit in der Liste eine separate Query. `useQueries`
  // ist Hook-rules-konform, da die Anzahl der Queries pro Render konstant ist
  // (sie ändert sich nur, wenn der Caller die einheitIds-Liste ändert — was
  // ohnehin einen Re-render auslöst).
  const bulkQueries = useQueries({
    queries: isBulk
      ? effectiveEinheitIds.map((id) => ({
          queryKey: EIGENSCHUTZ_QUERY_KEYS.psaProfileByEinheit(einsatzId, id),
          queryFn: async (): Promise<PsaProfileByEinheitDto[]> => {
            const response = await api.eigenschutz().psaProfilControllerGetPsaProfileVAlpha({ einsatzId, einheitId: id });
            return ((response?.data ?? []) as PsaProfileByEinheitDto[]) ?? [];
          },
          // Wie der Single-Hook: pausieren während pending Toggles, sonst
          // könnte ein Refetch den Diff überschreiben (DEC-6).
          enabled: open && pendingMap.size === 0,
          staleTime: 15_000,
        }))
      : [],
  });

  const changeMutation = useChangePsaProfil(einsatzId);

  // E7: synchroner In-Flight-Guard gegen Double-Click. `mutation.isPending`
  // ist React-State und propagiert erst nach dem React-Commit; ein zweiter
  // Click im selben Microtask sieht ihn noch auf `false`.
  const submittingRef = useRef(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset bei Open/Close. Wechsel der Einheiten-Liste innerhalb einer
  // offenen Sitzung (z. B. via Conflict-Banner-„Einheit entfernen") soll
  // die Begründung und die vorgemerkten Toggles NICHT verlieren — nur
  // beim Drawer-Lifecycle wird zurückgesetzt.
  const einheitenKey = effectiveEinheitIds.join(',');
  useEffect(() => {
    setPendingMap(new Map());
    setBegruendung('');
    setDestructiveModalOpen(false);
    setSubmitError(null);
    // P10: Veralteten Mutation-Error zurücksetzen, damit ein vorheriger
    // Konflikt-Banner beim erneuten Öffnen nicht reaktiviert wird.
    if (!open) changeMutation.reset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // E18: Konflikt-Banner ist an `changeMutation.error` gebunden. Wenn der
  // User die Konflikt-Einheit manuell aus der Selection entfernt (Chip-X
  // im Header), würde der Banner trotzdem weiterhin auf eine Einheit
  // verweisen, die gar nicht mehr im Bulk steckt. Wir resetten den
  // Mutation-Error, sobald die in `conflictError.einheitId` referenzierte
  // Einheit nicht mehr in `effectiveEinheitIds` ist.
  useEffect(() => {
    const conflictErr = changeMutation.error instanceof PsaProfilConflictError ? changeMutation.error : null;
    if (!conflictErr?.einheitId) return;
    if (!effectiveEinheitIds.includes(conflictErr.einheitId)) {
      changeMutation.reset();
    }
  }, [einheitenKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // AC8: genau EIN `assess_started`-Event pro Drawer-Open. Selection-Änderungen
  // (z. B. Konflikt-Einheit entfernen) dürfen den Effekt nicht erneut feuern.
  // Latest-Werte werden über Refs gelesen, der Effekt hängt nur an `open`.
  const telemetryRefs = useRef({ einheitenKey, abschnittCount, callerUserId });
  telemetryRefs.current = { einheitenKey, abschnittCount, callerUserId };
  useEffect(() => {
    if (!open) return;
    const { einheitenKey: keySnap, abschnittCount: countSnap, callerUserId: userSnap } = telemetryRefs.current;
    const candidateSuffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    eigenschutzTelemetryQueue.push({
      eventName: 'assess_started',
      propagationGroupIdCandidate: `candidate-${keySnap}-${candidateSuffix}`,
      abschnittCount: countSnap,
      userId: userSnap,
      sessionId: getOrCreateSessionId(),
      clientTime: new Date().toISOString(),
    });
  }, [open]);

  // Konsolidiertes Server-State über alle Einheiten (Bulk-Modus) bzw. eine
  // Einheit (Single).
  const profileByEinheit = useMemo(() => {
    const map = new Map<string, PsaProfileByEinheitDto[]>();
    if (isBulk) {
      effectiveEinheitIds.forEach((id, idx) => {
        map.set(id, bulkQueries[idx]?.data ?? []);
      });
    } else if (einheitId !== undefined) {
      map.set(einheitId, singleProfileQuery.data ?? []);
    }
    return map;
  }, [isBulk, effectiveEinheitIds, bulkQueries, einheitId, singleProfileQuery.data]);

  const aktiveProfileProEinheit = useMemo(() => {
    const map = new Map<string, PsaProfilValue[]>();
    for (const [id, rows] of profileByEinheit) {
      map.set(
        id,
        rows.map((r) => r.profil),
      );
    }
    return map;
  }, [profileByEinheit]);

  // Im Single-Modus: legacy-currentActive-Set + versionByProfil-Map (für
  // expectedVersion und Last-BASIS-Logic).
  const currentActive = useMemo(() => {
    const set = new Set<PsaProfilValue>();
    if (!isBulk && einheitId !== undefined) {
      for (const row of profileByEinheit.get(einheitId) ?? []) {
        set.add(row.profil);
      }
    }
    return set;
  }, [isBulk, einheitId, profileByEinheit]);

  const versionByProfilByEinheit = useMemo(() => {
    const map = new Map<string, Map<PsaProfilValue, number>>();
    for (const [id, rows] of profileByEinheit) {
      const inner = new Map<PsaProfilValue, number>();
      for (const row of rows) inner.set(row.profil, row.version);
      map.set(id, inner);
    }
    return map;
  }, [profileByEinheit]);

  const begruendungTrim = begruendung.trim();
  const begruendungValid = begruendungTrim.length >= BEGRUENDUNG_MIN_LENGTH && begruendungTrim.length <= BEGRUENDUNG_MAX_LENGTH;
  const hasChanges = pendingMap.size > 0;
  const isLastBasisRemoval = !isBulk && computeLastBasisRemoval(currentActive, pendingMap);

  // E12: failende Server-State-Reads dürfen nicht als „none-active"
  // interpretiert werden — der konsolidierte Status würde User in falsche
  // Toggle-Entscheidungen führen. Solange für mindestens eine Einheit der
  // Server-Read fehlschlägt, blocken wir den Submit und zeigen einen
  // Inline-Hinweis.
  const failedReadEinheitIds = useMemo(() => {
    if (!isBulk) {
      return singleProfileQuery.isError && einheitId !== undefined ? [einheitId] : [];
    }
    return effectiveEinheitIds.filter((_, idx) => bulkQueries[idx]?.isError === true);
  }, [isBulk, effectiveEinheitIds, bulkQueries, singleProfileQuery.isError, einheitId]);
  const hasFailedReads = failedReadEinheitIds.length > 0;

  // D-3.2-1 (Pre-Flight-Banner): Im Bulk-Modus müssen für jeden
  // Deaktivierungs-Toggle ALLE selektierten Einheiten dieselbe Aggregate-
  // Version tragen — sonst kann das Backend den OCC-Schutz nicht
  // anwenden (`expectedVersion` ist ein Skalar pro Toggle, nicht pro
  // Einheit-Profil-Kombination). Sobald für ein Profil divergente
  // Versionen erkannt werden, blocken wir den Submit und zeigen einen
  // expliziten Pre-Flight-Banner mit „Aktualisieren"-Button. Aktivierungen
  // sind ausgenommen — die brauchen keine `expectedVersion`.
  const versionDivergentProfile = useMemo(() => {
    if (!isBulk) return new Set<PsaProfilValue>();
    const divergent = new Set<PsaProfilValue>();
    for (const [profil, willBeActive] of pendingMap.entries()) {
      if (willBeActive) continue;
      let sharedVersion: number | undefined;
      let isDivergent = false;
      for (const [, inner] of versionByProfilByEinheit) {
        const v = inner.get(profil);
        if (v === undefined) continue;
        if (sharedVersion === undefined) {
          sharedVersion = v;
        } else if (sharedVersion !== v) {
          isDivergent = true;
          break;
        }
      }
      if (isDivergent) divergent.add(profil);
    }
    return divergent;
  }, [isBulk, pendingMap, versionByProfilByEinheit]);
  const hasVersionDivergence = versionDivergentProfile.size > 0;

  const submitDisabled = !begruendungValid || !hasChanges || changeMutation.isPending || hasFailedReads || hasVersionDivergence;

  const isLoading = isBulk ? bulkQueries.some((q) => q.isLoading) : singleProfileQuery.isLoading;

  const drawerWidthClass = abschnittCount >= 3 ? 'w-[640px] max-w-[640px]' : 'w-full max-w-md';

  function handleToggle(profil: PsaProfilValue): void {
    setPendingMap((prev) => {
      const next = new Map(prev);
      if (isBulk) {
        // Set-Operation (Story 3.2 AC3):
        // - alle aktiv → setze auf alle deaktivieren
        // - keine aktiv oder mixed → setze auf alle aktivieren
        // Beim Toggle wird der pendingMap-Eintrag invertiert oder gelöscht
        // (zurück zum konsolidierten Server-State).
        const consolidated = computeConsolidated(profil, aktiveProfileProEinheit);
        const targetIfNoOverride: boolean = consolidated === 'all-active' ? false : true;
        const currentOverride = next.get(profil);
        if (currentOverride === undefined) {
          next.set(profil, targetIfNoOverride);
        } else if (currentOverride === targetIfNoOverride) {
          // Erstes Toggle hat Override gesetzt; ein zweites Klicken kehrt um.
          next.set(profil, !currentOverride);
        } else {
          // Override matcht den natürlichen Toggle-Effekt → Eintrag löschen.
          next.delete(profil);
        }
      } else {
        const isActive = currentActive.has(profil);
        const willBeActive = !(next.get(profil) ?? isActive);
        if (willBeActive === isActive) {
          next.delete(profil);
        } else {
          next.set(profil, willBeActive);
        }
      }
      return next;
    });
  }

  async function handleConfirmedSubmit(): Promise<void> {
    if (effectiveEinheitIds.length === 0) return;
    // E7: zweiter Click im selben Microtask sieht `isPending` noch auf
    // `false`. Der Ref-Guard ist synchron — kein Doppel-Submit, kein
    // doppelter Audit-Trail-Eintrag.
    if (submittingRef.current) return;
    submittingRef.current = true;

    let toggles: ChangePsaProfilHookInput['profilToggles'];
    if (isBulk) {
      // Bulk: pro Profil ein Toggle. expectedVersion ist gerade im Bulk
      // unsicher (verschiedene Versionen pro Einheit) — wir senden ihn nur
      // dann mit, wenn alle Einheiten dieselbe Version für das Profil haben.
      // Andere Fälle laufen ohne expectedVersion und vertrauen dem Server-
      // Conflict-Detect.
      toggles = [];
      for (const [profil, willBeActive] of pendingMap.entries()) {
        let sharedVersion: number | undefined;
        let conflict = false;
        if (!willBeActive) {
          for (const [, inner] of versionByProfilByEinheit) {
            const v = inner.get(profil);
            if (v === undefined) continue;
            if (sharedVersion === undefined) {
              sharedVersion = v;
            } else if (sharedVersion !== v) {
              conflict = true;
              break;
            }
          }
        }
        toggles.push({ profil, aktivieren: willBeActive, expectedVersion: !willBeActive && !conflict ? sharedVersion : undefined });
      }
    } else {
      toggles = [];
      const versionByProfil = einheitId !== undefined ? (versionByProfilByEinheit.get(einheitId) ?? new Map<PsaProfilValue, number>()) : new Map<PsaProfilValue, number>();
      for (const [profil, willBeActive] of pendingMap.entries()) {
        const wasActive = currentActive.has(profil);
        if (willBeActive === wasActive) continue;
        toggles.push({
          profil,
          aktivieren: willBeActive,
          expectedVersion: !willBeActive ? versionByProfil.get(profil) : undefined,
        });
      }
    }
    if (toggles.length === 0) {
      submittingRef.current = false;
      return;
    }

    setSubmitError(null);
    try {
      const result = await changeMutation.mutateAsync({
        einheitId: !isBulk ? einheitId : undefined,
        einheitIds: isBulk ? [...effectiveEinheitIds] : undefined,
        profilToggles: toggles,
        begruendung: begruendungTrim,
      });
      if (!isMountedRef.current) return;
      // E16: tatsächlich mutierte Einheit-IDs aus dem Response-DTO ableiten
      // (eindeutige Liste über alle Toggle-Klassen). Das Frontend flasht nur
      // diese Karten orange (AC7), nicht die volle Selection — No-Op-Toggles
      // bleiben unmarkiert.
      const mutatedIds = Array.from(new Set(result.affected.map((a) => a.einheitId)));
      onSaved?.(result.propagationGroupId, mutatedIds);
      onClose();
    } catch (error) {
      if (!isMountedRef.current) return;
      setSubmitError(mapErrorToInlineText(error, einheiten));
    } finally {
      submittingRef.current = false;
    }
  }

  async function handleSubmitClick(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitDisabled) return;
    if (isLastBasisRemoval) {
      setDestructiveModalOpen(true);
      return;
    }
    await handleConfirmedSubmit();
  }

  function handleConflictRemoveEinheit(): void {
    if (!isBulk) return;
    const conflictError = changeMutation.error instanceof PsaProfilConflictError ? changeMutation.error : null;
    if (conflictError?.einheitId) {
      onRemoveEinheit?.(conflictError.einheitId);
      setSubmitError(null);
    }
  }

  function handleConflictRefetch(): void {
    for (const id of effectiveEinheitIds) {
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.psaProfileByEinheit(einsatzId, id) });
      // E9: `enabled: pendingMap.size === 0` blockt den Auto-Refetch nach
      // einer Invalidate, solange Toggles vorgemerkt sind. Der User hat
      // aber durch den Banner-Klick aktiv um aktuellen Server-State
      // gebeten — wir forcieren den Refetch via `refetchQueries({ type:
      // 'inactive' })`, der die `enabled`-Gate ignoriert. Pending-Toggles
      // und Begründung bleiben dabei erhalten (Konflikt-Recovery-Vertrag).
      void queryClient.refetchQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.psaProfileByEinheit(einsatzId, id), type: 'inactive' });
    }
    setSubmitError(null);
  }

  const conflictError = changeMutation.error instanceof PsaProfilConflictError ? changeMutation.error : null;
  const conflictEinheit = conflictError?.einheitId ? (einheiten.find((e) => e.id === conflictError.einheitId) ?? { id: conflictError.einheitId, name: conflictError.einheitId }) : null;

  const headerTitle = isBulk ? `PSA-Profile ändern für ${abschnittCount} ${abschnittCount === 1 ? 'Abschnitt' : 'Abschnitte'}` : 'PSA-Profil ändern';
  const headerSubtitle = isBulk ? null : einheitName ? `Einheit: ${einheitName}` : `Einheit: ${einheitId ?? ''}`;

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={changeMutation.isPending ? () => undefined : onClose} aria-labelledby={dialogTitleId} aria-describedby={dialogDescId}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        </Transition.Child>

        <div className={cn('fixed inset-y-0 right-0 flex', drawerWidthClass)}>
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-in-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition ease-in-out duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="flex h-full w-full flex-col bg-surface-panel shadow-xl" data-testid="psa-change-drawer" data-bulk={isBulk || undefined} data-abschnitt-count={abschnittCount}>
              <header className="flex flex-col gap-2 border-b border-border-subtle px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Dialog.Title id={dialogTitleId} className="text-lg font-semibold text-text-primary">
                      {headerTitle}
                    </Dialog.Title>
                    {headerSubtitle ? (
                      <Dialog.Description id={dialogDescId} className="text-sm text-text-muted">
                        {headerSubtitle}
                      </Dialog.Description>
                    ) : null}
                  </div>
                  <Button type="button" intent="secondary" size="sm" onClick={onClose} disabled={changeMutation.isPending} aria-label="Drawer schließen">
                    Schließen
                  </Button>
                </div>
                {isBulk && einheiten.length > 0 ? (
                  <ul className="flex flex-wrap gap-2" data-testid="psa-bulk-einheit-chips">
                    {einheiten.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => onRemoveEinheit?.(e.id)}
                          disabled={changeMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-control border border-border-subtle bg-action-secondary px-2 py-1 text-xs font-medium text-text-primary hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Einheit ${e.name} aus Auswahl entfernen`}
                          data-testid={`psa-bulk-chip-${e.id}`}
                        >
                          <span>{e.name}</span>
                          <span aria-hidden="true">×</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </header>

              <form className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4" onSubmit={handleSubmitClick} data-testid="psa-change-form">
                {hasFailedReads ? (
                  <p role="alert" className="rounded-control border border-status-danger bg-status-danger/10 px-3 py-2 text-sm text-status-danger" data-testid="psa-change-read-error">
                    {`Aktueller PSA-Status für ${failedReadEinheitIds.length} Einheit${failedReadEinheitIds.length === 1 ? '' : 'en'} konnte nicht geladen werden. Bitte „Aktualisieren" oder Drawer schließen und erneut öffnen — Submit ist solange blockiert.`}
                  </p>
                ) : null}
                {hasVersionDivergence ? (
                  <div
                    role="alert"
                    className="flex flex-wrap items-start justify-between gap-3 rounded-control border border-status-warning-border bg-status-warning-surface px-3 py-2 text-sm text-text-primary"
                    data-testid="psa-change-version-divergence"
                  >
                    <div className="flex-1">
                      <p className="font-medium">Versionen divergieren — bitte aktualisieren</p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {`Für ${versionDivergentProfile.size === 1 ? 'das Profil' : 'die Profile'} ${[...versionDivergentProfile].map((p) => PSA_PROFIL_META[p].label).join(', ')} haben die ausgewählten Einheiten unterschiedliche Versionen. Aktualisiere den Server-Stand, bevor du deaktivierst — sonst greift der Lost-Update-Schutz nicht.`}
                      </p>
                    </div>
                    <Button type="button" intent="secondary" size="sm" onClick={handleConflictRefetch} data-testid="psa-change-version-divergence-refresh">
                      Aktualisieren
                    </Button>
                  </div>
                ) : null}
                {isLoading ? (
                  <p className="text-sm text-text-muted">Lade aktive Profile…</p>
                ) : (
                  <PSAProfileMultiSelect
                    currentActive={currentActive}
                    pendingMap={pendingMap}
                    onToggle={handleToggle}
                    disabled={changeMutation.isPending}
                    aktiveProfileProEinheit={isBulk ? aktiveProfileProEinheit : undefined}
                  />
                )}

                <div className="flex flex-col gap-1">
                  <label htmlFor={begruendungFieldId} className="text-sm font-medium text-text-secondary">
                    Begründung <span aria-hidden="true">*</span>
                  </label>
                  <Textarea
                    id={begruendungFieldId}
                    value={begruendung}
                    onChange={(event) => setBegruendung(event.target.value)}
                    aria-required="true"
                    aria-describedby={begruendungHintId}
                    aria-invalid={(begruendung.length > 0 && !begruendungValid) || undefined}
                    textareaSize="md"
                    maxLength={BEGRUENDUNG_MAX_LENGTH}
                    variant={begruendungValid || begruendung.length === 0 ? 'default' : 'error'}
                    placeholder="Warum diese Änderung?"
                    data-testid="psa-change-begruendung"
                  />
                  <p id={begruendungHintId} className="text-xs text-text-muted">
                    Begründung ist verpflichtend. {begruendungTrim.length}/{BEGRUENDUNG_MAX_LENGTH}
                  </p>
                </div>

                {isBulk && conflictEinheit ? (
                  <div
                    role="alert"
                    className="flex flex-col gap-2 rounded-control border border-status-danger bg-status-danger/10 px-3 py-2 text-sm text-status-danger"
                    data-testid="psa-bulk-conflict-banner"
                  >
                    <p className="font-semibold">Konflikt für Einheit »{conflictEinheit.name}«</p>
                    <p>Profil wurde parallel geändert — bitte prüfe den aktuellen Stand und versuche erneut.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" intent="primary" size="sm" onClick={handleConflictRemoveEinheit}>
                        Konflikt-Einheit aus Auswahl entfernen
                      </Button>
                      <Button type="button" intent="secondary" size="sm" onClick={handleConflictRefetch}>
                        Aktualisieren und neu prüfen
                      </Button>
                    </div>
                  </div>
                ) : submitError ? (
                  <p role="alert" className="rounded-control border border-status-danger bg-status-danger/10 px-3 py-2 text-sm text-status-danger" data-testid="psa-change-error">
                    {submitError}
                  </p>
                ) : null}

                <footer className="mt-auto flex items-center justify-end gap-2 border-t border-border-subtle pt-3">
                  <Button type="button" intent="secondary" onClick={onClose} disabled={changeMutation.isPending}>
                    Abbrechen
                  </Button>
                  <Button type="submit" intent="primary" disabled={submitDisabled} data-testid="psa-change-submit">
                    {changeMutation.isPending ? 'Wird gespeichert…' : 'Änderung speichern'}
                  </Button>
                </footer>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>

        {destructiveModalOpen ? (
          <Dialog as="div" className="relative z-[60]" open={destructiveModalOpen} onClose={() => setDestructiveModalOpen(false)} aria-modal="true">
            <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md rounded-panel bg-surface-panel p-5 shadow-panel" data-testid="psa-last-basis-modal">
                <Dialog.Title className="text-lg font-semibold text-text-primary">Letztes Basis-Profil entfernen?</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-text-muted">
                  Du entfernst das einzige aktive Basis-Profil dieser Einheit, während andere Profile (z. B.{' '}
                  {[...currentActive]
                    .filter((p) => p !== 'BASIS')
                    .map((p) => PSA_PROFIL_META[p].label)
                    .join(', ')}
                  ) aktiv bleiben. Bitte bestätige.
                </Dialog.Description>
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" intent="secondary" onClick={() => setDestructiveModalOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button
                    type="button"
                    intent="danger"
                    onClick={async () => {
                      setDestructiveModalOpen(false);
                      await handleConfirmedSubmit();
                    }}
                    data-testid="psa-last-basis-confirm"
                  >
                    Trotzdem entfernen
                  </Button>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        ) : null}
      </Dialog>
    </Transition>
  );
}

function computeConsolidated(profil: PsaProfilValue, aktive: ReadonlyMap<string, ReadonlyArray<PsaProfilValue>>): 'all-active' | 'none-active' | 'mixed' {
  let active = 0;
  let total = 0;
  for (const profile of aktive.values()) {
    total++;
    if (profile.includes(profil)) active++;
  }
  if (active === 0) return 'none-active';
  if (active === total) return 'all-active';
  return 'mixed';
}

function computeLastBasisRemoval(currentActive: ReadonlySet<PsaProfilValue>, pendingMap: ReadonlyMap<PsaProfilValue, boolean>): boolean {
  const basisChange = pendingMap.get('BASIS');
  if (basisChange !== false) return false;
  if (!currentActive.has('BASIS')) return false;
  for (const profil of currentActive) {
    if (profil === 'BASIS') continue;
    const pending = pendingMap.get(profil);
    if (pending === false) continue;
    return true;
  }
  return false;
}

function mapErrorToInlineText(error: unknown, einheiten: ReadonlyArray<PsaChangeDrawerEinheitRef>): string {
  if (error instanceof PsaProfilConflictError) {
    if (error.einheitId) {
      const name = einheiten.find((e) => e.id === error.einheitId)?.name ?? error.einheitId;
      return `Konflikt für Einheit »${name}«: das Profil wurde zwischenzeitlich von einer anderen Stelle geändert.`;
    }
    if (error.variant === 'DuplicateActiveProfile') {
      return 'Eine andere Stelle hat parallel das gleiche Profil aktiviert. Bitte Drawer schließen und neu laden.';
    }
    if (error.currentVersion !== undefined) {
      return `Das Profil wurde zwischenzeitlich in Version ${error.currentVersion} geändert. Bitte Drawer schließen und neu laden.`;
    }
    return 'Das Profil wurde zwischenzeitlich von einer anderen Stelle geändert.';
  }
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 403) return 'Keine Berechtigung für diese Aktion. Bitte an die Einsatzleitung wenden.';
  if (status === 404) return 'Aktives Profil zum Schließen wurde nicht mehr gefunden.';
  if (status === 422) return 'Ungültige Eingabe. Bitte Begründung und Toggles prüfen.';
  return 'Unerwarteter Fehler beim Speichern. Bitte erneut versuchen.';
}
