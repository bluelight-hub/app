/**
 * Aufbewahrungs-Admin Route (DSGVO-Loeschkonzept)
 *
 * Route fuer die Verwaltung der Aufbewahrungsregeln.
 * Nur fuer authentifizierte Admin-Benutzer zugaenglich.
 *
 * **Guards:**
 * - Admin-Authentifizierung erforderlich (redirect zu /admin-login falls nicht authentifiziert)
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const AufbewahrungPage = lazy(() =>
  import('@/features/aufbewahrung/ui').then((m) => ({
    default: m.AufbewahrungPage,
  })),
);

export const Route = createFileRoute('/server/aufbewahrung')({
  component: () => (
    <Suspense fallback={null}>
      <AufbewahrungPage />
    </Suspense>
  ),
  meta: () => [{ title: 'Aufbewahrungsregeln (DSGVO)' }],
});
