import { ComingSoon } from '@/shared/ui/atoms';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/berichte')({
  component: () => <ComingSoon title="Einsatzberichte" description="Erstellung und Verwaltung von Einsatzberichten." />,
});
