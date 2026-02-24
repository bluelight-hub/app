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
import { z } from 'zod';
import { ServerManagementPage } from '@/features/server/ui/pages';

/**
 * Search Parameter Schema fuer Token-Invalid Redirect.
 *
 * Wenn ein Server-Access-Token ungueltig ist (z.B. Server zurueckgesetzt),
 * wird zu /server/manage?reason=token-invalid weitergeleitet.
 */
const searchSchema = z.object({
  reason: z.enum(['token-invalid']).optional(),
});

export const Route = createFileRoute('/server/manage')({
  component: ServerManagementPage,
  validateSearch: searchSchema,
});
