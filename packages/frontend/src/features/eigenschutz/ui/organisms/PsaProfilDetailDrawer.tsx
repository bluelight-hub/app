import { useCallback, useState } from 'react';
import type { PsaProfilValue } from '@bluelight-hub/shared/schemas/eigenschutz/psa-profil.schema';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { useAckPsaQuittung } from '../../api/queries';
import { PSA_PROFIL_META } from '../../constants/psa-profil.constants';
import { useEquipmentChecklistState } from '../../hooks/use-equipment-checklist-state';
import { useReducedMotion } from '../../hooks/use-reduced-motion';
import { EquipmentChecklist, type EquipmentChecklistEinheit } from './EquipmentChecklist';

export interface PsaProfilDetailDrawerProps {
  readonly einsatzId: string;
  /** Aktive Bekanntgabe — `null` = Drawer geschlossen. */
  readonly propagationGroupId: string | null;
  /** Empfänger-Einheiten für die Bekanntgabe. */
  readonly einheiten: readonly EquipmentChecklistEinheit[];
  /** Aktive Profile dieser Bekanntgabe. */
  readonly aktiveProfile: readonly PsaProfilValue[];
  /**
   * Profil-Toggles (AKTIVIERT/DEAKTIVIERT) der konkreten Bekanntgabe.
   * Wenn gesetzt, rendert Section B beide Listen separat (was wurde
   * aktiviert vs. deaktiviert) — Decision-Aufloesung zur AC7-Section-B-
   * Differenzierung. Ohne diese Prop fällt der Drawer auf das bisherige
   * `aktiveProfile`-Rendering zurück (Backwards-Compat für Aufrufer ohne
   * Toggle-Information).
   */
  readonly profilToggles?: readonly { readonly profil: PsaProfilValue; readonly aktion: 'AKTIVIERT' | 'DEAKTIVIERT' }[];
  /** Klartext-Begründung. */
  readonly begruendung?: string;
  /** Profile-Refetch lädt noch — zeigt Skeleton in Section B + Checkliste (P8). */
  readonly profileLoading?: boolean;
  readonly onClose: () => void;
  /**
   * Wenn gesetzt: rendert primäre Quittungs-Action (Empfänger-Sicht). Wird
   * NACH erfolgreicher Mutation pro quittierter Einheit aufgerufen — der
   * Banner-Wrapper kann darüber den Banner aus der Queue entfernen
   * (Story 3.4 `dismiss`-Lifecycle).
   */
  readonly onQuittieren?: (einheitId: string) => void;
  /** Story-3.6-Stub: wenn gesetzt, „Lücke melden"-Button enabled. */
  readonly onMeldeLuecke?: (input: { einheitId: string; vorbereiteteNotiz: string }) => void;
}

/**
 * `PsaProfilDetailDrawer` — Detail-Ansicht einer PSA-Bekanntgabe (Story 3.5 AC7).
 *
 * **Pfade:**
 * - **Empfänger** (`onQuittieren` gesetzt): zeigt Primary „Verstanden, Ausrüstung
 *   vorhanden" + Secondary „Ausrüstungs-Lücke melden" + Tertiary „Schließen".
 *   Quittungs-Aktion ruft `useAckPsaQuittung` (Story 3.4 AC14) — bei Erfolg
 *   `useEquipmentChecklistState.reset()`, `onQuittieren(einheitId)`-Notify
 *   pro quittierter Einheit, danach `onClose()`. Bei Fehler bleibt der
 *   Drawer offen mit `data-ack-error="true"`-Marker (UX-DR21 Zero-Toast).
 * - **Sender-Read-Only** (`onQuittieren === undefined`): rendert nur die
 *   Checkliste + Begründung als Soll-Referenz; keine Quittungs-/Lücke-
 *   Aktionen, im Footer steht „(Sender-Sicht — keine Aktionen)".
 *
 * **Pattern-Vorlage:** `SicherheitsregelDrawer.tsx` (Headless-UI-`Dialog.SlideIn`,
 * Backdrop, Focus-Trap, Sizing).
 */
export function PsaProfilDetailDrawer({
  einsatzId,
  propagationGroupId,
  einheiten,
  aktiveProfile,
  profilToggles,
  begruendung,
  profileLoading = false,
  onClose,
  onQuittieren,
  onMeldeLuecke,
}: PsaProfilDetailDrawerProps) {
  const isOpen = propagationGroupId !== null;
  const reducedMotion = useReducedMotion();
  const ackMutation = useAckPsaQuittung(einsatzId);
  const [ackError, setAckError] = useState<string | null>(null);
  const isReadOnly = onQuittieren === undefined;

  const { checked, toggle, reset, missingItemsFor } = useEquipmentChecklistState({
    propagationGroupId: propagationGroupId ?? '',
    einheitenIds: einheiten.map((e) => e.einheitId),
    aktiveProfile,
  });

  const handleClose = useCallback(() => {
    setAckError(null);
    onClose();
  }, [onClose]);

  const handleQuittieren = useCallback(async () => {
    if (propagationGroupId === null || onQuittieren === undefined) return;
    setAckError(null);

    // P9: Per-Einheit-Error-Sammlung statt früher Throw nach erstem Fehler.
    // MVP-Pragmatik (Q3): typischer Fall ist 1 Einheit; im Story-3.6+ Multi-
    // Einheit-Pfad würden wir bei einem Fehler in Einheit B die A-Quittung
    // bereits server-seitig + via `onQuittieren('a')` notify gemeldet haben,
    // aber `reset()`/`handleClose()` übersprungen. Jetzt sammeln wir Fehler
    // und schließen nur bei vollständigem Erfolg.
    const failedEinheiten: string[] = [];
    for (const einheit of einheiten) {
      try {
        await ackMutation.mutateAsync({ propagationGroupId, einheitId: einheit.einheitId });
        onQuittieren(einheit.einheitId);
      } catch {
        failedEinheiten.push(einheit.einheitName);
      }
    }

    if (failedEinheiten.length === 0) {
      reset();
      handleClose();
      return;
    }
    setAckError(
      failedEinheiten.length === einheiten.length
        ? 'Quittung fehlgeschlagen — bitte nochmal versuchen.'
        : `Quittung teilweise fehlgeschlagen — bitte erneut versuchen für: ${failedEinheiten.join(', ')}`,
    );
  }, [propagationGroupId, onQuittieren, einheiten, ackMutation, reset, handleClose]);

  // P4: Footer „Lücke melden" füllt vorbereiteteNotiz aus den nicht-gehakten
  // Items der ersten Einheit (`missingItemsFor`) — gleicher Contract wie der
  // per-Row-Button in EquipmentChecklist. Story-3.6-Consumer bekommen damit
  // konsistente Notizen aus beiden Pfaden.
  const handleMeldeLuecke = useCallback(() => {
    if (onMeldeLuecke === undefined || einheiten.length === 0) return;
    const ersteEinheit = einheiten[0];
    const vorbereiteteNotiz = missingItemsFor(ersteEinheit.einheitId)
      .map((item) => item.label)
      .join(', ');
    onMeldeLuecke({ einheitId: ersteEinheit.einheitId, vorbereiteteNotiz });
  }, [onMeldeLuecke, einheiten, missingItemsFor]);

  // Decision-Aufloesung: Profil-Toggles separat nach Aktion gruppieren.
  const toggleAktiviert = (profilToggles ?? []).filter((t) => t.aktion === 'AKTIVIERT');
  const toggleDeaktiviert = (profilToggles ?? []).filter((t) => t.aktion === 'DEAKTIVIERT');

  return (
    <Dialog.SlideIn
      isOpen={isOpen}
      onClose={handleClose}
      title="PSA-Profil-Änderung — Details"
      description={isReadOnly ? 'Sender-Sicht — Soll-Ausrüstung als Referenz, keine Aktionen.' : 'Ausrüstung prüfen und quittieren oder Lücke melden.'}
      size="lg"
      position="right"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isReadOnly ? (
            <>
              <span className="mr-auto text-xs text-text-muted" data-testid="psa-profil-detail-read-only-hint">
                Sender-Sicht — keine Aktionen
              </span>
              <Button intent="secondary" appearance="ghost" type="button" onClick={handleClose}>
                Schließen
              </Button>
            </>
          ) : (
            <>
              <Button
                intent="primary"
                type="button"
                onClick={() => void handleQuittieren()}
                loading={ackMutation.isPending}
                disabled={ackMutation.isPending}
                data-testid="psa-profil-detail-quittieren"
              >
                Verstanden, Ausrüstung vorhanden
              </Button>
              <Button
                intent="secondary"
                type="button"
                onClick={handleMeldeLuecke}
                disabled={onMeldeLuecke === undefined}
                title={onMeldeLuecke === undefined ? 'Verfügbar ab Story 3.6 (Rückmeldung an Sicherheitsbeauftragten)' : undefined}
                data-testid="psa-profil-detail-luecke"
              >
                Ausrüstungs-Lücke melden
              </Button>
              <Button intent="secondary" appearance="ghost" type="button" onClick={handleClose}>
                Schließen
              </Button>
            </>
          )}
        </div>
      }
    >
      <div
        className="flex h-full flex-col gap-5"
        data-testid="psa-profil-detail-drawer"
        data-ack-error={ackError !== null ? 'true' : undefined}
        data-reduced-motion={reducedMotion ? 'true' : 'false'}
        data-read-only={isReadOnly ? 'true' : undefined}
      >
        <section aria-labelledby="psa-detail-begruendung-heading" className="space-y-2">
          <h3 id="psa-detail-begruendung-heading" className="text-sm font-semibold text-text-primary">
            Begründung
          </h3>
          <p className="text-sm text-text-muted" data-testid="psa-profil-detail-begruendung">
            {begruendung && begruendung.trim().length > 0 ? begruendung : 'Begründung wird geladen …'}
          </p>
        </section>

        <section aria-labelledby="psa-detail-profile-heading" className="space-y-2">
          <h3 id="psa-detail-profile-heading" className="text-sm font-semibold text-text-primary">
            Profil-Toggles
          </h3>
          {/* P8: Skeleton-Hinweis während Profile-Query lädt — sonst rendert
              die Section leer und sieht „bereit + geprüft" aus. */}
          {profileLoading ? (
            <p className="text-xs text-text-muted" data-testid="psa-profil-detail-profile-loading">
              Profile werden geladen …
            </p>
          ) : profilToggles !== undefined ? (
            <div className="space-y-2" data-testid="psa-profil-detail-profil-toggles">
              {toggleAktiviert.length > 0 ? (
                <div data-testid="psa-profil-detail-aktiviert">
                  <p className="text-xs font-medium text-text-muted">Aktiviert</p>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {toggleAktiviert.map((t) => {
                      const meta = PSA_PROFIL_META[t.profil];
                      return (
                        <li key={t.profil} className={`inline-flex items-center gap-1 rounded-control border px-2 py-1 text-xs font-medium ${meta.chipColorActiveClass}`}>
                          <meta.icon aria-hidden="true" className="h-4 w-4" />
                          {meta.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {toggleDeaktiviert.length > 0 ? (
                <div data-testid="psa-profil-detail-deaktiviert">
                  <p className="text-xs font-medium text-text-muted">Deaktiviert</p>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {toggleDeaktiviert.map((t) => {
                      const meta = PSA_PROFIL_META[t.profil];
                      return (
                        <li key={t.profil} className="inline-flex items-center gap-1 rounded-control border border-border-subtle px-2 py-1 text-xs font-medium text-text-muted line-through opacity-80">
                          <meta.icon aria-hidden="true" className="h-4 w-4" />
                          {meta.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {toggleAktiviert.length === 0 && toggleDeaktiviert.length === 0 ? (
                <p className="text-xs text-text-muted" data-testid="psa-profil-detail-toggles-empty">
                  Keine Profil-Änderungen erfasst.
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="flex flex-wrap gap-2" data-testid="psa-profil-detail-aktive-profile">
              {aktiveProfile.length === 0 ? (
                <li className="text-xs text-text-muted" data-testid="psa-profil-detail-aktive-profile-empty">
                  Keine aktiven Profile.
                </li>
              ) : (
                aktiveProfile.map((profil) => {
                  const meta = PSA_PROFIL_META[profil];
                  return (
                    <li key={profil} className={`inline-flex items-center gap-1 rounded-control border px-2 py-1 text-xs font-medium ${meta.chipColorActiveClass}`}>
                      <meta.icon aria-hidden="true" className="h-4 w-4" />
                      {meta.label}
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </section>

        <section aria-labelledby="psa-detail-checklist-heading" className="flex-1 space-y-2">
          <h3 id="psa-detail-checklist-heading" className="text-sm font-semibold text-text-primary">
            Ausrüstungs-Checkliste
          </h3>
          {/* P15: Empty-Einheiten Fallback. */}
          {einheiten.length === 0 ? (
            <p className="rounded-control border border-border-subtle bg-surface-panel px-3 py-2 text-sm text-text-muted" data-testid="psa-profil-detail-einheiten-empty">
              Keine betroffenen Einheiten verfügbar.
            </p>
          ) : profileLoading ? (
            <p className="rounded-control border border-border-subtle bg-surface-panel px-3 py-2 text-sm text-text-muted" data-testid="psa-profil-detail-checklist-loading">
              Checkliste wird vorbereitet …
            </p>
          ) : (
            <EquipmentChecklist
              aktiveProfile={aktiveProfile}
              einheiten={einheiten}
              checked={checked}
              onToggle={toggle}
              onMeldeLuecke={onMeldeLuecke}
              readOnly={isReadOnly}
              data-testid="psa-profil-detail-checklist"
            />
          )}
        </section>

        {ackError !== null ? (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-control border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text"
            data-testid="psa-profil-detail-ack-error"
          >
            {ackError}
          </p>
        ) : null}
      </div>
    </Dialog.SlideIn>
  );
}
