import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/app/einsaetze/$einsatzId')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/app/einsatz/$einsatzId',
      params,
    });
  },
});
