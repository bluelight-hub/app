import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Legacy-Route für Admin-Setup
 *
 * Redirected zur neuen Top-Level Setup-Route `/setup`.
 * Behalten für Backward-Compatibility.
 */
export const Route = createFileRoute('/admin/setup')({
  beforeLoad: () => {
    throw redirect({
      to: '/setup',
    });
  },
});
