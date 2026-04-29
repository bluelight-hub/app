import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentUser } from '@/features/auth/api/use-current-user';
import { useEigenschutzPsaLiveBanner, type PsaProfilLiveBanner, type PsaProfilLiveValue } from '../../api/use-eigenschutz-psa-live-banner';
import { type PsaProfileByEinheitDto, useAckPsaQuittung, usePsaProfileByEinheit } from '../../api/queries';
import { PSA_PROFIL_META } from '../../constants/psa-profil.constants';
import { useAktiveEinsatzEinheit } from '../../hooks/use-aktive-einsatz-einheit';
import { useReducedMotion } from '../../hooks/use-reduced-motion';
import { eigenschutzTelemetryQueue, getOrCreateSessionId } from '../../lib/telemetry-queue';
import { PsaProfilDetailDrawer } from './PsaProfilDetailDrawer';
import { MeldeLueckeDialog } from './MeldeLueckeDialog';
import { SeverityBanner } from './SeverityBanner';

/**
 * Maximale Anzahl gleichzeitig sichtbarer kritischer Banner (UX-DR22 Alarm-
 * Budget). 1:1 aus `SicherheitsregelEmpfangBanner.tsx` gespiegelt — eine
 * globale Konstante würde Story 7.x als platform-wide Refactor benötigen.
 */
const MAX_VISIBLE = 3;

export interface PsaProfilEmpfangBannerProps {
  readonly einsatzId: string;
  /**
   * Story-3.5-Stub: wird in einer späteren Story als Tertiär-Aktion „Details
   * ansehen" angebunden. Story 3.4 ersetzt die Primary-Action durch die
   * Quittungs-Mutation („Verstanden, Ausrüstung vorhanden") — dieser
   * Prop wird aktuell nicht mehr für die Primary-Action verdrahtet.
   */
  readonly onShowDetails?: (propagationGroupId: string) => void;
}

/**
 * Empfangs-Banner-Stack für PSA-Profil-Änderungen (Story 3.3 AC6, AC7, AC8, AC9, AC10).
 *
 * **Verhalten:**
 * - Hört auf Live-Events via {@link useEigenschutzPsaLiveBanner}.
 * - Filtert auf die aktuell aktive Einheit (sonst rendert die Komponente `null`).
 * - Aggregiert Toggles derselben `propagationGroupId` zu **einem** Banner (AC5).
 * - Rendert maximal {@link MAX_VISIBLE} Banner; Overflow läuft als
 *   `variant="warning" tone="polite"`-Sammel-Banner.
 * - Lädt Begründung + Klartext-Kontext über die Detail-Query
 *   {@link usePsaProfileByEinheit} (Architektur §B5: Begründung NICHT aus
 *   WS-Payload, nur via authentifizierte Refetch-Query).
 * - Schreibt **einmal** pro `propagationGroupId` ein
 *   `all_banners_delivered`-Telemetrie-Event in die
 *   {@link eigenschutzTelemetryQueue} (AC9 — Idempotenz via `useRef<Set>`).
 *
 * **Reduced-Motion (AC10):** keine zusätzlichen JS-Animationen — der
 * Komponente-eigene Truncate + `motion-reduce:transition-none` von
 * `SeverityBanner` deckt CSS-Transitions ab.
 */
export function PsaProfilEmpfangBanner({ einsatzId, onShowDetails }: PsaProfilEmpfangBannerProps) {
  const { einheitId, einheitName } = useAktiveEinsatzEinheit(einsatzId);
  const { banner, dismiss } = useEigenschutzPsaLiveBanner({ einsatzId, einheitId, enabled: einheitId !== null });
  const profileQuery = usePsaProfileByEinheit(einsatzId, einheitId ?? '', { enabled: einheitId !== null });
  const { user } = useCurrentUser();
  // Story 3.4 AC10 — Primary-Action verdrahten.
  const ackMutation = useAckPsaQuittung(einsatzId);
  // Inline-Error-State (Zero-Toast-Policy): wenn die Quittungs-Mutation
  // fehlschlägt, markieren wir den betroffenen Banner per `data-ack-error`,
  // damit Story-7.x-Inline-Error-Tests greifen können. Sonner-Toast wird
  // bewusst nicht ausgelöst (UX-DR21 + `meta: silentError` im Hook).
  const [ackErrors, setAckErrors] = useState<Set<string>>(new Set());
  // Story 3.5 AC9 — Tertiary-Action „Details ansehen" öffnet den
  // Detail-Drawer. Single-Slot-State (Q4): ein zweiter Tap auf einen
  // anderen Banner ersetzt den ersten Drawer-Open.
  const [openDrawerForGroup, setOpenDrawerForGroup] = useState<string | null>(null);
  // Story 3.6 AC12 — Lücke-Dialog-State (Single-Slot, analog Drawer).
  const [lueckeDialogOpen, setLueckeDialogOpen] = useState<{
    propagationGroupId: string;
    einheitId: string;
    einheitName: string;
    vorbereiteteNotiz: string;
  } | null>(null);
  // AC10: Reduced-Motion-Respekt — der CSS-Transition-Layer in `SeverityBanner`
  // nutzt `motion-reduce:transition-none`; diese explizite Konsultation hält die
  // wörtliche Spec-Vorgabe ein und macht den Wert für Test-Snapshots verfügbar.
  const prefersReducedMotion = useReducedMotion();

  // **Kein** lokales Dismiss-State: der Hook führt die Single-Source-of-Truth
  // für die Banner-Queue. Würden wir hier ein `dismissed`-Set parallel halten,
  // würde ein neuer Event mit derselben `propagationGroupId` (z. B. nach
  // Stunden eine erneute Bulk-Operation) durch das Set still ausgeblendet —
  // das widerspricht AC9 („neu eingehender Eintrag macht den Übergang
  // unsichtbar → sichtbar"). `hookDismiss` entfernt den Eintrag aus der
  // Hook-Queue; ein späterer Event erzeugt einen frischen Eintrag.
  const visible = useMemo(() => banner.slice(0, MAX_VISIBLE), [banner]);
  const overflowCount = banner.length - visible.length;

  // AC9 — `all_banners_delivered`-Idempotenz pro propagationGroupId.
  const emittedRef = useRef<Set<string>>(new Set());
  // Wenn der User noch nicht geladen ist, skippen wir die Telemetrie statt
  // einen `'unknown'`-Fallback zu emittieren — Story 3.11 nutzt diese
  // Marken im CBRN-End-zu-End-Trace, ein Userless-Event würde ihn verzerren.
  // Sobald der Auth-Hook den User liefert, läuft der Effekt erneut und holt
  // die noch unemittierten Banner nach (`emittedRef` deduppt).
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    for (const eintrag of visible) {
      if (emittedRef.current.has(eintrag.propagationGroupId)) continue;
      emittedRef.current.add(eintrag.propagationGroupId);
      eigenschutzTelemetryQueue.push({
        eventName: 'all_banners_delivered',
        propagationGroupIdCandidate: eintrag.propagationGroupId,
        abschnittCount: 1,
        userId,
        sessionId: getOrCreateSessionId(),
        clientTime: new Date().toISOString(),
        metadata: { receivedToggles: eintrag.profilToggles.length },
      });
    }
  }, [visible, userId]);

  // AC9-Erweiterung: emittedRef bereinigen, sobald eine propagationGroupId
  // dismissed wurde oder anderweitig aus der Banner-Queue verschwindet. Sonst
  // würde ein erneut eintreffender Event derselben Gruppe (z. B. Re-Trigger
  // nach Stunden) das `all_banners_delivered`-Event nicht erneut emittieren —
  // der Übergang „unsichtbar → sichtbar" ginge verloren. Verhindert zudem
  // unbegrenztes Wachsen des Sets in Mehrstunden-Sessions.
  useEffect(() => {
    const liveIds = new Set(banner.map((b) => b.propagationGroupId));
    const stale: string[] = [];
    for (const id of emittedRef.current) {
      if (!liveIds.has(id)) stale.push(id);
    }
    for (const id of stale) emittedRef.current.delete(id);
  }, [banner]);

  // Overflow-Klick (P5): nutzt nun denselben Drawer-Pfad wie die sichtbaren
  // Banner. Vor P5 ging der Pfad über den deprecated `onShowDetails`-Stub —
  // der Drawer wurde nie geöffnet. Wir greifen die erste überzählige Group
  // und mounten den Drawer für sie. `onShowDetails` bleibt als optionale
  // Telemetrie-Notify, falls Aufrufer sie weiter setzen wollen.
  const handleOverflowClick = useMemo(() => {
    const overflowFirst = banner[MAX_VISIBLE];
    if (!overflowFirst) return undefined;
    return () => {
      setOpenDrawerForGroup(overflowFirst.propagationGroupId);
      onShowDetails?.(overflowFirst.propagationGroupId);
    };
  }, [banner, onShowDetails]);

  /**
   * Story 3.4 AC10 — Primary-Action: optimistisch dismissen + Mutation feuern.
   *
   * - **Optimistisch:** `dismiss(propagationGroupId)` entfernt den Banner aus
   *   der Hook-Queue, bevor das Backend antwortet. UX-Spec Z. 752 + FR18
   *   („einfach quittieren"): kein Spinner, kein Pending-State auf dem Button.
   * - **Bei Fehler:** wir markieren die Group im `ackErrors`-Set, damit das
   *   Wrapper-Div `data-ack-error="true"` trägt. Der Banner kommt durch die
   *   Cache-Invalidation des Hook-Re-Sync wieder zurück, sobald der nächste
   *   `psa-profil-geaendert`-Frame eintrifft (oder via Reload).
   * - **Anti-Pattern vermieden:** Kein lokales `acknowledged: Set<string>`
   *   (Story 3.3 Code-Review-Decision 1) — Single-Source-of-Truth bleibt der
   *   Hook-Banner-Array.
   */
  const handleAcknowledge = useCallback(
    (propagationGroupId: string) => {
      if (einheitId === null) return;
      // Optimistic: zuerst aus der Banner-Queue ziehen.
      dismiss(propagationGroupId);
      // Vorhandenen ackError für diese Group entfernen (Re-Try-Pfad).
      setAckErrors((prev) => {
        if (!prev.has(propagationGroupId)) return prev;
        const next = new Set(prev);
        next.delete(propagationGroupId);
        return next;
      });
      ackMutation.mutate(
        { propagationGroupId, einheitId },
        {
          onError: () => {
            setAckErrors((prev) => {
              if (prev.has(propagationGroupId)) return prev;
              const next = new Set(prev);
              next.add(propagationGroupId);
              return next;
            });
          },
        },
      );
    },
    [einheitId, dismiss, ackMutation],
  );

  if (einheitId === null) return null;
  if (banner.length === 0) return null;

  const overflowLabel = overflowCount === 1 ? `${overflowCount} weiteres kritisches Ereignis` : `${overflowCount} weitere kritische Ereignisse`;

  return (
    <div className="flex flex-col gap-3" data-testid="psa-empfang-stack" data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}>
      {visible.map((eintrag) => (
        // Wrapper-Div trägt `data-propagation-group-id` für E2E-Selektoren
        // (AC6) und `data-ack-error` für den Story-3.4-Inline-Error-Pfad
        // (AC10). Das `SeverityBanner`-Atom akzeptiert nur `data-testid`,
        // also setzen wir die Story-Marker auf den Wrapper.
        <div key={eintrag.propagationGroupId} data-propagation-group-id={eintrag.propagationGroupId} data-ack-error={ackErrors.has(eintrag.propagationGroupId) ? 'true' : undefined}>
          <SeverityBanner
            variant="critical"
            tone="assertive"
            headline={buildHeadline(eintrag)}
            body={buildBody(eintrag, profileQuery.data, profileQuery.isPending)}
            footer={buildFooter(eintrag)}
            primaryActionLabel="Verstanden, Ausrüstung vorhanden"
            onPrimary={() => handleAcknowledge(eintrag.propagationGroupId)}
            secondaryActionLabel="Später"
            onSecondary={() => dismiss(eintrag.propagationGroupId)}
            tertiaryActionLabel="Details ansehen"
            onTertiary={() => setOpenDrawerForGroup(eintrag.propagationGroupId)}
            data-testid="psa-empfang-banner"
          />
        </div>
      ))}
      {overflowCount > 0 && (
        // AC7: Sammel-Banner als `SeverityBanner variant="warning" tone="polite"`.
        // Klick-Handling läuft über die Primary-Action — damit erbt der
        // Sammel-Banner Tastatur-Fokus, Touch-Target ≥ 48 px und axe-Konformität
        // (kein interaktives `<div>` mit `role="status"`).
        <SeverityBanner
          variant="warning"
          tone="polite"
          headline={overflowLabel}
          primaryActionLabel={handleOverflowClick === undefined ? undefined : 'Details ansehen'}
          onPrimary={handleOverflowClick}
          data-testid="psa-empfang-overflow-banner"
        />
      )}
      {/* Story 3.5 AC9 — Detail-Drawer als Geschwister-Element zum Banner-Stack.
          MVP-Pragmatik (Q3): die aktive Empfänger-Einheit ist die einzige
          Empfänger-Einheit im Drawer; eine Hierarchie „Abschnitt → N Einheiten"
          wird in Story 6.x ergänzt.
          P3: `aktiveProfile` wird aus dem konkreten `eintrag` (zur geöffneten
          propagationGroupId) abgeleitet — nicht aus der globalen Einheit-
          Profile-Liste, sonst zeigt der Drawer auch nicht-betroffene Profile. */}
      {(() => {
        const activeBannerEntry = openDrawerForGroup === null ? undefined : banner.find((b) => b.propagationGroupId === openDrawerForGroup);
        const drawerToggles = activeBannerEntry?.profilToggles.map((t) => ({ profil: t.profil as PsaProfilLiveValue, aktion: t.aktion }));
        const drawerAktiveProfile = drawerToggles ? drawerToggles.filter((t) => t.aktion === 'AKTIVIERT').map((t) => t.profil) : [];
        return (
          <PsaProfilDetailDrawer
            einsatzId={einsatzId}
            propagationGroupId={openDrawerForGroup}
            einheiten={einheitName === null ? [] : [{ einheitId, einheitName }]}
            aktiveProfile={drawerAktiveProfile}
            profilToggles={drawerToggles}
            profileLoading={profileQuery.isPending}
            begruendung={(profileQuery.data ?? []).find((row) => row.propagationGroupId === openDrawerForGroup)?.begruendung}
            onClose={() => setOpenDrawerForGroup(null)}
            // Drawer ruft `useAckPsaQuittung` intern (AC14) — diese Notify-Callback
            // entfernt den Banner aus der Hook-Queue, sobald die Quittung erfolgreich
            // war. Identisches Pattern wie der Banner-Primary-Pfad (handleAcknowledge).
            onQuittieren={() => {
              if (openDrawerForGroup !== null) dismiss(openDrawerForGroup);
            }}
            // Story 3.6 AC12 — Lücke-Button verdrahtet: öffnet den Inline-Dialog.
            // Der Drawer übergibt die vorbereiteteNotiz aus
            // `useEquipmentChecklistState.missingItemsFor` (Story 3.5 P4).
            onMeldeLuecke={({ einheitId: targetEinheitId, vorbereiteteNotiz }) => {
              if (openDrawerForGroup === null || einheitName === null) return;
              setLueckeDialogOpen({
                propagationGroupId: openDrawerForGroup,
                einheitId: targetEinheitId,
                einheitName,
                vorbereiteteNotiz,
              });
            }}
          />
        );
      })()}
      <MeldeLueckeDialog
        einsatzId={einsatzId}
        open={lueckeDialogOpen}
        onClose={() => setLueckeDialogOpen(null)}
        onSuccess={({ propagationGroupId }) => {
          // Q6-Default: nach erfolgreicher Lücken-Meldung wird der Banner
          // dismissed UND der Drawer geschlossen — die Aktion schließt die
          // Bekanntgabe organisatorisch ab.
          dismiss(propagationGroupId);
          setOpenDrawerForGroup(null);
        }}
      />
    </div>
  );
}

function buildHeadline(eintrag: PsaProfilLiveBanner): string {
  if (eintrag.profilToggles.length === 1) {
    const toggle = eintrag.profilToggles[0]!;
    const label = PSA_PROFIL_META[toggle.profil].label;
    const verb = toggle.aktion === 'AKTIVIERT' ? 'aktiviert' : 'deaktiviert';
    return `PSA-Profil ${label} ${verb}`;
  }
  return `${eintrag.profilToggles.length} PSA-Profile geändert`;
}

/**
 * Body-Builder. Nutzt die Detail-Query als alleinige Quelle für die
 * Klartext-Begründung (Architektur §B5). Solange die Query noch lädt,
 * zeigen wir einen Platzhalter (AC4).
 */
function buildBody(eintrag: PsaProfilLiveBanner, profile: readonly PsaProfileByEinheitDto[] | undefined, isPending: boolean): string {
  if (isPending) return 'Begründung wird geladen …';
  const matchingRow = profile?.find((row) => row.propagationGroupId === eintrag.propagationGroupId);
  if (matchingRow?.begruendung && matchingRow.begruendung.trim().length > 0) {
    return `Grund: ${matchingRow.begruendung}`;
  }
  // Fallback bei Deaktivierung (Row ist nicht mehr aktiv → kein Match in der
  // active-only-Query) oder fehlender Begründung. Zeigt eine semantisch
  // brauchbare Zusammenfassung der Toggle-Aktionen.
  return summarizeToggles(eintrag);
}

function summarizeToggles(eintrag: PsaProfilLiveBanner): string {
  const aktiviert = eintrag.profilToggles.filter((t) => t.aktion === 'AKTIVIERT').map((t) => labelOf(t.profil));
  const deaktiviert = eintrag.profilToggles.filter((t) => t.aktion === 'DEAKTIVIERT').map((t) => labelOf(t.profil));
  const parts: string[] = [];
  if (aktiviert.length > 0) parts.push(`Aktiviert: ${aktiviert.join(', ')}`);
  if (deaktiviert.length > 0) parts.push(`Deaktiviert: ${deaktiviert.join(', ')}`);
  return parts.length > 0 ? parts.join(' · ') : 'PSA-Profil-Änderung wirksam';
}

function labelOf(profil: PsaProfilLiveValue): string {
  return PSA_PROFIL_META[profil].label;
}

/**
 * Footer-Builder. Format: `HH:mm:ss · Sicherheitsbeauftragter`.
 *
 * Sicherheitsbeauftragten-Klartext-Name ist im aktuellen DTO nicht enthalten
 * (Q3 — DTO-Erweiterung als Folge-Story dokumentiert). Wir zeigen den
 * generischen Rollen-Namen als Fallback, damit der Banner trotzdem
 * brauchbar bleibt.
 */
function buildFooter(eintrag: PsaProfilLiveBanner): string {
  return `${formatTime(eintrag.occurredAt)} · Sicherheitsbeauftragter`;
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  } catch {
    return iso;
  }
}
