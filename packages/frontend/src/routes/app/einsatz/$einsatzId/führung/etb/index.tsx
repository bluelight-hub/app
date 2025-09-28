import { EtbPage } from '@/components/pages/app/einsatz/EtbPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/etb/')({
  component: EtbPage,
});
