import { createFileRoute } from '@tanstack/react-router';
import { AdminSetup } from '@/features/admin/ui/pages/AdminSetup';

/**
 * Route für Admin-Passwort-Setup
 *
 * Zeigt das Formular zum Setzen des Admin-Passworts.
 * Wird angezeigt wenn `adminSetupAvailable: true` (Admin hat noch kein Passwort gesetzt).
 */
export const Route = createFileRoute('/admin/setup')({
  component: AdminSetup,
});
