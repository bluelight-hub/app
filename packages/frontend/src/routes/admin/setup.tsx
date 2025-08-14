import { lazy } from 'react';
import { createFileRoute } from '@tanstack/react-router';

const AdminSetup = lazy(() => import('@/pages/AdminSetup').then((module) => ({ default: module.AdminSetup })));

export const Route = createFileRoute('/admin/setup')({
  component: AdminSetup,
});
