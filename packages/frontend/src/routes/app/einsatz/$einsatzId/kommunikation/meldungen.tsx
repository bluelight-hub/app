import { ComingSoon } from '@/shared/ui/atoms';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/kommunikation/meldungen')({
  component: () => <ComingSoon title="Meldungen" description="Statusmeldungen und Nachrichtenübersicht." />,
});
