import type { ReactNode } from 'react';
import { useEinsatzRolleContext } from '@/features/einsatz/contexts';
import { ForbiddenPage } from '@/features/auth/ui/pages/ForbiddenPage';
import { LoadingState } from '@/shared/ui/atoms/LoadingState';

interface EinsatzRolleGateProps {
  einsatzId: string;
  children: ReactNode;
}

/**
 * Gate-Komponente fuer Routen die sekundaeren Rollen nicht zugaenglich sind (Story 5.5).
 *
 * Liest die Rolle aus dem EinsatzRolleContext (bereitgestellt vom SingleEinsatzLayout),
 * statt einen eigenen useMyEinsatzRolle-Call zu machen. Dadurch entfaellt der
 * redundante Loading-Flicker beim Mounten.
 *
 * Zeigt ForbiddenPage mit Erklaerung und naechster zulaessiger Aktion,
 * wenn der User eine sekundaere Rolle (EMPFAENGER/BEOBACHTER) hat.
 */
export function EinsatzRolleGate({ einsatzId, children }: EinsatzRolleGateProps) {
  const { meineRolle, isLoading } = useEinsatzRolleContext();

  // Waehrend des Ladens: Loading-Indikator anzeigen
  if (isLoading) return <LoadingState message="Berechtigungen werden geprüft..." fullScreen={false} />;

  // Sekundaere Rolle → Zugang verweigert
  if (meineRolle?.permissions?.isSecondaryRole) {
    return (
      <ForbiddenPage
        reason={`Dieser Bereich ist fuer Ihre Einsatzrolle (${meineRolle.rolle ?? 'Unbekannt'}) nicht freigegeben. Sie haben Zugriff auf die Uebersicht, das ETB (Lesemodus) und Befehle.`}
        suggestedAction="Zur Uebersicht"
        backTo={`/app/einsatz/${einsatzId}/übersicht`}
      />
    );
  }

  return <>{children}</>;
}
