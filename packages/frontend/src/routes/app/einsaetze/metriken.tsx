import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

export const Route = createFileRoute('/app/einsaetze/metriken')({
  component: lazy(() =>
    import('@/features/befehl/ui/organisms/BefehlMetrikenDashboard.organism').then((m) => ({
      default: m.BefehlMetrikenDashboard,
    })),
  ),
});
