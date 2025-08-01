import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

export const Route = createFileRoute('/')({
  component: lazy(() => import('@pages/index.page.tsx').then((module) => ({ default: module.IndexPage }))),
});
