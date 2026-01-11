/**
 * Server Setup Route
 *
 * Route für die ServerOnboardingPage wo neue Server konfiguriert werden.
 * Diese Route ist OHNE Login erreichbar (vor Auth-Flow).
 *
 * **Use Cases:**
 * - Erster App-Start ohne konfigurierte Server
 * - Manuelles Hinzufügen weiterer Server
 * - Deep-Link mit server/invite URL-Parametern
 *
 * **Guards:**
 * - Keine Auth-Guards (vor Login erreichbar)
 * - URL-Parameter werden durch urlParamsSchema validiert
 */

import { createFileRoute } from '@tanstack/react-router';
import { ServerOnboardingPage } from '@/features/server/ui/pages';

export const Route = createFileRoute('/server/setup')({
  component: ServerOnboardingPage,
});
