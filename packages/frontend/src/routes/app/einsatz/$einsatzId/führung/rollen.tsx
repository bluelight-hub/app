import { ComingSoon } from '@/shared/ui/atoms';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/rollen')({
  component: () => <ComingSoon title="Einsatzrollen" description="Rollen und Funktionen im Einsatz." />,
});
