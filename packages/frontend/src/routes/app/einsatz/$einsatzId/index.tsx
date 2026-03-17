import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsatz/$einsatzId/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/app/einsatz/$einsatzId/übersicht',
      params,
    });
  },
});
