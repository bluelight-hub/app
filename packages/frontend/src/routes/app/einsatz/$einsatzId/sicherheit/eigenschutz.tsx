import { useCallback } from 'react';
import { EigenschutzEntryPage } from '@/features/eigenschutz';
import { useEigenschutzPsaQuittungLive } from '@/features/eigenschutz/api/use-eigenschutz-psa-quittung-live';
import { useEigenschutzLueckeGemeldetLive } from '@/features/eigenschutz/api/use-eigenschutz-luecke-gemeldet-live';
import { useEigenschutzQuittungUeberfaelligLive } from '@/features/eigenschutz/api/use-eigenschutz-quittung-ueberfaellig-live';
import { useEigenschutzKonfliktErkanntLive } from '@/features/eigenschutz/api/use-eigenschutz-konflikt-erkannt-live';
import { PsaProfilEmpfangBanner } from '@/features/eigenschutz/ui/organisms/PsaProfilEmpfangBanner';
import { EinsatzleiterReprompEskalationBanner } from '@/features/eigenschutz/ui/organisms/EinsatzleiterReprompEskalationBanner';
import { KonfliktErkanntMikroBanner } from '@/features/eigenschutz/ui/molecules/KonfliktErkanntMikroBanner';
import { logger } from '@/shared/lib/logger';
import { Outlet, createFileRoute, useLocation } from '@tanstack/react-router';

/**
 * Layout-Route für den Eigenschutz-Bereich.
 *
 * Rendert den Eigenschutz-Bereich unter dem bereits geladenen Einsatz-
 * Workspace. Das konkrete Eigenschutz-Rollen-/Freigabemodell ist aktuell
 * kein Scope; der Einstieg darf deshalb nicht durch einen zusätzlichen
 * Health-/Scope-Gate blockiert werden.
 *
 * **Warum Layout-Route statt Leaf-Route:** Story 2.1 ergänzt die Dot-
 * Notation-Child-Route `eigenschutz.gefaehrdungen.tsx`; TanStack Router
 * behandelt `eigenschutz.tsx` dadurch automatisch als Parent. Ohne
 * `<Outlet />` würden Child-Routes niemals sichtbar werden.
 *
 * **Story 3.3 (AC8):** der `PsaProfilEmpfangBanner` ist hier als
 * gemeinsamer Layout-Container montiert — der kritische CBRN-Banner
 * bleibt damit auf der Entry-Page **und** allen Eigenschutz-Sub-Pages
 * persistent oberhalb des Inhalts sichtbar.
 */
export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz')({
  component: EigenschutzRouteComponent,
});

function EigenschutzRouteComponent() {
  const { einsatzId } = Route.useParams();
  const location = useLocation();

  // Story 3.4 AC11 — Sender-Live-Hook auf demselben Layout-Mount wie der
  // Empfänger-Banner-Hook (`useEigenschutzPsaLiveBanner` im
  // `PsaProfilEmpfangBanner` weiter unten). Beide Subscriptions sind
  // unabhängig — separater Channel + separater LRU-Cache + separater
  // Hook-Lifecycle, kein Cross-Talk.
  useEigenschutzPsaQuittungLive({ einsatzId });
  // Story 3.6 AC14 — separate Subscription für `eigenschutz:luecke-gemeldet`
  // (eigener Channel, eigener LRU-Cache, eigener Hook-Lifecycle). Keine
  // Beeinflussung des Quittungs-Live-Hooks.
  useEigenschutzLueckeGemeldetLive({ einsatzId });
  // Story 3.7 AC6 — Re-Prompt-Live-Hook für überfällige PSA-Quittungen.
  // Liefert `notices` für sowohl Empfänger-Re-Prompt-Pfad (PsaProfilEmpfangBanner)
  // als auch Einsatzleiter-Polite-Eskalation. Der Hook bleibt hier zentral
  // gemountet, damit beide Konsumenten denselben Notice-Buffer teilen.
  const reprompt = useEigenschutzQuittungUeberfaelligLive({ einsatzId });
  // Story 3.9 AC8 — Konflikt-Erkannt-Live-Hook + Mikro-Banner. Pattern Story
  // 3.7 (`reprompt`): Hook liefert notices + dismiss; Banner gated
  // intern auf `BEFEHLSGEBER`-Rolle (Pattern Story 3.7 — `useMyEinsatzPermissions`
  // existiert noch nicht; Spec-Wortlaut „eigenschutz:psa:write" ist auf eine
  // Phase-2-Permission-Hook-Story aufgeschoben).
  const konfliktLive = useEigenschutzKonfliktErkanntLive({ einsatzId });

  const isEigenschutzRoot = location.pathname.replace(/\/+$/, '').endsWith('/sicherheit/eigenschutz');

  // AC6-Stub: Story 3.3 verlangt einen Stub-Handler für die Primary-Action
  // „Details ansehen" — die volle Detail-Ansicht (mit Ausrüstungs-Checkliste)
  // kommt in Story 3.5. Ohne diesen Handler würde `SeverityBanner` den Button
  // permanent disabled rendern und der CBRN-kritische Aktions-Pfad wäre tot.
  const handleShowPsaDetails = useCallback((propagationGroupId: string) => {
    logger.info?.('[eigenschutz] Details-Stub geklickt — Story 3.5 ergänzt Detail-Page', { propagationGroupId });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <PsaProfilEmpfangBanner einsatzId={einsatzId} onShowDetails={handleShowPsaDetails} repromptNotices={reprompt.notices} onRepromptDismiss={reprompt.dismiss} />
      <EinsatzleiterReprompEskalationBanner einsatzId={einsatzId} notices={reprompt.notices} onDismiss={reprompt.dismiss} />
      <KonfliktErkanntMikroBanner einsatzId={einsatzId} notices={konfliktLive.notices} onDismiss={konfliktLive.dismissNotice} />
      {isEigenschutzRoot ? <EigenschutzEntryPage einsatzId={einsatzId} /> : <Outlet />}
    </div>
  );
}
