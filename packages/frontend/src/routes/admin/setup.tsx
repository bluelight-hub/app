import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const AdminSetup = lazy(() => import('@/pages/AdminSetup').then((module) => ({ default: module.AdminSetup })));

export const Route = createFileRoute('/admin/setup')({
  component: AdminSetup,
});
