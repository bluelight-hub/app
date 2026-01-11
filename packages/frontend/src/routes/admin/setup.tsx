import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Legacy-Route für Admin-Setup
 *
 * Redirected zur Server-Setup-Route `/server/setup`.
 * Behalten für Backward-Compatibility.
 */
export const Route = createFileRoute('/admin/setup')({
  beforeLoad: () => {
    throw redirect({
      to: '/server/setup',
    });
  },
});
