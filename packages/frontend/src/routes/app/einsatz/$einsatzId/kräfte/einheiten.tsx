import { ComingSoon } from '@/shared/ui/atoms';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/kräfte/einheiten')({
  component: () => <ComingSoon title="Einheiten" description="Einheitenübersicht und -verwaltung." />,
});
