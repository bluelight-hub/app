import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

export const Route = createFileRoute('/app/einsaetze/')({
  component: lazy(() => import('@/components/pages/index.page.tsx').then((module) => ({ default: module.IndexPage }))),
});
