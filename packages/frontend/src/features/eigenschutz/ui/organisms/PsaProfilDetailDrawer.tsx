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
  /** Klartext-Begründung. */
  readonly begruendung?: string;
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
export function PsaProfilDetailDrawer({ einsatzId, propagationGroupId, einheiten, aktiveProfile, begruendung, onClose, onQuittieren, onMeldeLuecke }: PsaProfilDetailDrawerProps) {
  const isOpen = propagationGroupId !== null;
  const reducedMotion = useReducedMotion();
  const ackMutation = useAckPsaQuittung(einsatzId);
  const [ackError, setAckError] = useState<string | null>(null);
  const isReadOnly = onQuittieren === undefined;

  const { checked, toggle, reset } = useEquipmentChecklistState({
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

    try {
      // MVP-Pragmatik (Q3): typischer Fall ist 1 Einheit. Bei mehreren
      // Einheiten quittieren wir sequenziell — die Mutation hat keine
      // Bulk-Variante (Story 3.4 AC9 single-einheit-Schema). Multi-Einheit-
      // Empfänger-Sicht ist Story-6.x-Hierarchie.
      for (const einheit of einheiten) {
        await ackMutation.mutateAsync({ propagationGroupId, einheitId: einheit.einheitId });
        onQuittieren(einheit.einheitId);
      }
      reset();
      handleClose();
    } catch {
      setAckError('Quittung fehlgeschlagen — bitte nochmal versuchen.');
    }
  }, [propagationGroupId, onQuittieren, einheiten, ackMutation, reset, handleClose]);

  const handleMeldeLuecke = useCallback(() => {
    if (onMeldeLuecke === undefined || einheiten.length === 0) return;
    // MVP-Pragmatik: erste Einheit, vorbereitete Notiz aus nicht-gehakten Items.
    // Mit dem `useEquipmentChecklistState`-Hook reichen wir die Items über die
    // EquipmentChecklist's per-Row-Button — der Footer-Button feuert hier
    // eine Sammel-Meldung über die erste Einheit (Story 3.6 verfeinert).
    const ersteEinheit = einheiten[0];
    onMeldeLuecke({ einheitId: ersteEinheit.einheitId, vorbereiteteNotiz: '' });
  }, [onMeldeLuecke, einheiten]);

  return (
    <Dialog.SlideIn
      isOpen={isOpen}
      onClose={handleClose}
      title="PSA-Profil-Änderung — Details"
      description={isReadOnly ? 'Sender-Sicht — Soll-Ausrüstung als Referenz, keine Aktionen.' : 'Ausrüstung prüfen und quittieren oder Lücke melden.'}
      size="lg"
      position="right"
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
            Aktive Profile
          </h3>
          <ul className="flex flex-wrap gap-2" data-testid="psa-profil-detail-aktive-profile">
            {aktiveProfile.map((profil) => {
              const meta = PSA_PROFIL_META[profil];
              return (
                <li key={profil} className={`inline-flex items-center gap-1 rounded-control border px-2 py-1 text-xs font-medium ${meta.chipColorActiveClass}`}>
                  <meta.icon aria-hidden="true" className="h-4 w-4" />
                  {meta.label}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="psa-detail-checklist-heading" className="flex-1 space-y-2">
          <h3 id="psa-detail-checklist-heading" className="text-sm font-semibold text-text-primary">
            Ausrüstungs-Checkliste
          </h3>
          <EquipmentChecklist aktiveProfile={aktiveProfile} einheiten={einheiten} checked={checked} onToggle={toggle} onMeldeLuecke={onMeldeLuecke} data-testid="psa-profil-detail-checklist" />
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

        <footer className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle pt-4">
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
        </footer>
      </div>
    </Dialog.SlideIn>
  );
}
