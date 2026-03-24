/**
 * System-Monitoring Route (Admin)
 *
 * Route fuer das System-Monitoring-Dashboard.
 * Nur fuer authentifizierte Admin-Benutzer zugaenglich.
 *
 * @remarks Story 5.6 AC4
 */

import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const MonitoringDashboard = lazy(() =>
  import('@/features/monitoring').then((m) => ({
    default: m.MonitoringDashboard,
  })),
);

export const Route = createFileRoute('/app/einsaetze/monitoring')({
  component: () => (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-action-primary border-t-transparent" />
        </div>
      }
    >
      <MonitoringDashboard />
    </Suspense>
  ),
  meta: () => [{ title: 'System-Monitoring' }],
});
