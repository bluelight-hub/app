/**
 * IntegrationStatusBanner Molecule
 *
 * Zeigt einen Warning-Banner wenn externe Integrationen degradiert sind.
 * Auto-Dismiss bei Circuit Close (via WebSocket Event im Store).
 *
 * Story 5.3 AC5:
 * - Gelber Alert-Banner (Alert.atom.tsx mit status="warning")
 * - Text: "Externe Integration '{serviceName}' temporaer nicht verfuegbar"
 * - prefers-reduced-motion respektieren
 *
 * @module features/befehl/ui/molecules
 */

import { Alert } from '@/shared/ui/atoms/alert.atom';
import { useDegradedIntegrations, type IntegrationStatus } from '../../api/use-integration-status';

/** Service-Name Mapping fuer benutzerfreundliche Anzeige */
const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  'hiorg-server': 'HiOrg-Server (Stammdaten)',
  etb: 'ETB-Integration',
};

/** Gibt den Display-Name fuer einen Service zurueck */
function getServiceDisplayName(serviceName: string): string {
  return SERVICE_DISPLAY_NAMES[serviceName] ?? serviceName;
}

/**
 * IntegrationStatusBanner - zeigt Warnungen fuer degradierte Integrationen.
 *
 * Rendert nichts wenn alle Integrationen CLOSED sind.
 * Respektiert prefers-reduced-motion fuer Animationen.
 */
export function IntegrationStatusBanner() {
  const degradedIntegrations = useDegradedIntegrations();

  if (degradedIntegrations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {degradedIntegrations.map((integration: IntegrationStatus) => (
        <Alert
          key={integration.serviceName}
          status="warning"
          title="Eingeschraenkte Verfuegbarkeit"
          description={`Externe Integration '${getServiceDisplayName(integration.serviceName)}' temporaer nicht verfuegbar. Lokale Daten werden verwendet.`}
          role="status"
        />
      ))}
    </div>
  );
}
