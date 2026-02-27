import { ComingSoon } from '@/shared/ui/atoms';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/protokoll')({
  component: () => <ComingSoon title="Führungsprotokoll" description="Protokollierung der Führungsentscheidungen im Einsatz." />,
});
