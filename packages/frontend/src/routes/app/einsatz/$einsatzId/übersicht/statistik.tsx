import { ComingSoon } from '@/shared/ui/atoms';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/übersicht/statistik')({
  component: () => <ComingSoon title="Statistik" description="Live-Auswertungen und Einsatzstatistiken." />,
});
