/**
 * Rollen-Management Route
 *
 * Seite zur Verwaltung von befehlsspezifischen Rollen im Einsatz.
 * Story 5.2 AC7
 */

import { EinsatzRollenManager } from '@/features/einsatz/ui/organisms';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/rollen')({
  component: RollenSeite,
});

function RollenSeite() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl text-gray-900 dark:text-gray-100">Befehlsrollen</h1>
        <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">Verwalten Sie die Rollen für das Befehlsmanagement in diesem Einsatz.</p>
      </div>
      <EinsatzRollenManager einsatzId={einsatzId} />
    </div>
  );
}
