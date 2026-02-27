import { ComingSoon } from '@/shared/ui/atoms';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/gefahren')({
  component: () => <ComingSoon title="Gefahren" description="Gefahrenübersicht an der Einsatzstelle." />,
});
