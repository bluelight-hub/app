import { AdminStammFahrzeuge } from '@/features/admin/ui';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/stammdaten/fahrzeuge')({
  component: AdminStammFahrzeuge,
  meta: () => [{ title: 'Stamm-Fahrzeuge' }],
});
