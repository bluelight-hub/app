import { ComingSoon } from '@/shared/ui/atoms';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/kommunikation/funk')({
  component: () => <ComingSoon title="Funkverkehr" description="Funkprotokoll und Kommunikationsübersicht." />,
});
