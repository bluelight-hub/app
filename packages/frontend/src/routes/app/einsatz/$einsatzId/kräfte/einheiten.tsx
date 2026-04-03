/**
 * Taktische Einheiten Route (Issue #411)
 *
 * Zeigt die Verwaltungsseite für taktische Einheiten eines Einsatzes.
 * Geschützt durch EinsatzRolleGate (sekundäre Rollen haben keinen Zugriff).
 */

import { createFileRoute, useParams } from '@tanstack/react-router';
import { EinsatzRolleGate } from '@/features/einsatz/ui/molecules/EinsatzRolleGate';
import { TaktischeEinheitenPage } from '@/features/kraefte/ui/pages/TaktischeEinheitenPage';

export const Route = createFileRoute('/app/einsatz/$einsatzId/kräfte/einheiten')({
  component: RouteComponent,
});

function RouteComponent() {
  const { einsatzId } = useParams({ from: '/app/einsatz/$einsatzId/kräfte/einheiten' });
  return (
    <EinsatzRolleGate einsatzId={einsatzId}>
      <TaktischeEinheitenPage einsatzId={einsatzId} />
    </EinsatzRolleGate>
  );
}
