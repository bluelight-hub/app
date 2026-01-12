/**
 * Server-Verwaltung Route
 *
 * Route für die ServerManagementPage wo alle Server verwaltet werden können.
 * Diese Route ist OHNE Login erreichbar (vor Auth-Flow), da Server-Konfiguration
 * vor dem Login benötigt wird.
 *
 * **Use Cases:**
 * - Übersicht aller konfigurierten Server
 * - Server hinzufügen (Navigation zu /server/setup)
 * - Server bearbeiten (Future Story 3.3)
 * - Server löschen (Future Story 3.4)
 *
 * **Guards:**
 * - Keine Auth-Guards (vor Login erreichbar)
 */

import { createFileRoute } from '@tanstack/react-router';
import { ServerManagementPage } from '@/features/server/ui/pages';

export const Route = createFileRoute('/server/manage')({
  component: ServerManagementPage,
});
