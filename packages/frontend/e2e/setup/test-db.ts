import { Pool, type PoolClient } from 'pg';

/**
 * Eigenständiger Postgres-Pool für Test-Reads (Outbox, Snapshot-Persistenz).
 *
 * Begründung gegen `@prisma/client`-Direkt-Import (Story 7.11 Pivot-Anker §3):
 * Der Prisma-Generator-Output liegt im Backend-Workspace; ein TS-Reference-Setup
 * vom Frontend dorthin würde die Workspace-Topologie brechen. Stattdessen sprechen
 * wir Postgres direkt mit parameter-bound SQL — kein Schema-Coupling, kein Generator.
 *
 * Tabellen-Mapping (verifiziert gegen `packages/backend/prisma/schema.prisma`):
 *  - `einsaetze` (@@map auf Einsatz)
 *  - `einsatz_einheiten` (@@map auf EinsatzEinheit)
 *  - `einsatz_rollen_besetzung` (@@map auf EinsatzRollenbesetzung)
 *  - `eigenschutz_vorfaelle` (@@map auf EigenschutzVorfall, Spalten via @map → snake_case)
 *  - `eigenschutz_telemetry_events` / `ampel_projections` / `sync_conflicts`
 *  - `outbox_events` mit `event_name` (NICHT `event_type`), `aggregate_id`, `payload`, `occurred_at`
 *  - `User` als unmappierte Tabelle (Pascal-Case-Quoting erforderlich)
 */

let pool: Pool | null = null;

export function getTestDbPool(): Pool {
  if (pool === null) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('[E2E] DATABASE_URL ist nicht gesetzt — die E2E-Suite benötigt eine echte Postgres-Verbindung.');
    }
    pool = new Pool({ connectionString: databaseUrl, max: 5 });
  }
  return pool;
}

export async function disconnectTestDb(): Promise<void> {
  if (pool !== null) {
    await pool.end();
    pool = null;
  }
}

export async function withClient<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getTestDbPool().connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
}

export interface OutboxEventRow {
  id: string;
  eventName: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

/**
 * Pollt das Outbox-Events-Repository auf das erste Event eines Typs für einen Einsatz.
 * `eventName` matched die persistierte Domain-Event-Identifikation (z. B. `PsaProfilGeaendert`).
 * Der Payload-Match auf `einsatzId` erfolgt über JSON-Pfad — wir akzeptieren sowohl
 * Top-Level-`einsatzId` als auch innerhalb von `aggregate.einsatzId` (Backend-konsistent).
 */
export async function findOutboxEvent(eventName: string, einsatzId: string, timeoutMs = 10_000, intervalMs = 250): Promise<OutboxEventRow | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await withClient(async (client) =>
      client.query<{ id: string; event_name: string; payload: Record<string, unknown>; occurred_at: Date }>(
        `SELECT id, event_name, payload, occurred_at
         FROM outbox_events
         WHERE event_name = $1
           AND (payload ->> 'einsatzId' = $2 OR payload -> 'aggregate' ->> 'einsatzId' = $2)
         ORDER BY occurred_at DESC
         LIMIT 1`,
        [eventName, einsatzId],
      ),
    );
    if (result.rows.length > 0) {
      const row = result.rows[0]!;
      return { id: row.id, eventName: row.event_name, payload: row.payload, occurredAt: row.occurred_at };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

export interface VorfallRow {
  id: string;
  was: string;
  einsatzId: string;
  kontextSnapshot: Record<string, unknown> | null;
  unfallkasseRelevant: boolean;
}

export async function findVorfallByWasContains(einsatzId: string, wasSubstring: string): Promise<VorfallRow | null> {
  const result = await withClient(async (client) =>
    client.query<{
      id: string;
      was: string;
      einsatz_id: string;
      kontext_snapshot: Record<string, unknown> | null;
      unfallkasse_relevant: boolean;
    }>(
      `SELECT id, was, einsatz_id, kontext_snapshot, unfallkasse_relevant
       FROM eigenschutz_vorfaelle
       WHERE einsatz_id = $1
         AND was ILIKE $2
       ORDER BY erfasst_am DESC
       LIMIT 1`,
      [einsatzId, `%${wasSubstring}%`],
    ),
  );
  if (result.rows.length === 0) {
    return null;
  }
  const row = result.rows[0]!;
  return {
    id: row.id,
    was: row.was,
    einsatzId: row.einsatz_id,
    kontextSnapshot: row.kontext_snapshot,
    unfallkasseRelevant: row.unfallkasse_relevant,
  };
}

/**
 * Löscht alle Datensätze mit dem Story-7.11-Marker (Prefix `E2E711-`).
 *
 * Reihenfolge orientiert sich am bekannten FK-Stand (Story 7.10 NFR-S5 P1-Defer
 * dokumentiert 5 fehlende Cascades) — wir räumen Children explizit auf, statt auf
 * Cascade zu hoffen. Marker greift auf `nummer` (Einsatz, UNIQUE) und `name`
 * (EinsatzEinheit, UNIQUE pro Einsatz) — beide nehmen den Marker als Prefix.
 *
 * P9 (Review): Erweitert um alle Eigenschutz-Children mit FK auf `einsatzId` ODER
 * `einheitId` (`gefaehrdungsbeurteilungen`, `psa_profil_zuweisungen`, `sicherheitsregeln`,
 * `sicherungsposten`), plus deren Versionen-Tabellen. Reihenfolge: Children-First
 * (FK-tief), dann Aggregate, dann Roots.
 */
export async function cleanupMarkedData(marker: string, usernameMarker?: string): Promise<void> {
  const likePattern = `${marker}%`;
  // Test-User werden mit einem kompakten, Login-DTO-tauglichen Username-Marker erzeugt
  // (siehe seed.ts). Fallback auf `marker`, falls Seed-State von einem alten Run stammt.
  const userPattern = `${usernameMarker ?? marker}%`;
  await withClient(async (client) => {
    const einsatzIdsResult = await client.query<{ id: string }>(`SELECT id FROM einsaetze WHERE nummer LIKE $1`, [likePattern]);
    const einsatzIds = einsatzIdsResult.rows.map((row) => row.id);
    if (einsatzIds.length === 0) {
      await client.query(`DELETE FROM "User" WHERE username LIKE $1`, [userPattern]);
      return;
    }

    // 1. Outbox-Events (referenzieren einsatzId nur per payload-JSON, kein echter FK)
    await client.query(
      `DELETE FROM outbox_events
       WHERE (payload ->> 'einsatzId' = ANY($1::text[]))
          OR (payload -> 'aggregate' ->> 'einsatzId' = ANY($1::text[]))`,
      [einsatzIds],
    );

    // 2. Eigenschutz-Read-Models + Aggregate-Children mit FK auf einsatzId
    await client.query(`DELETE FROM eigenschutz_telemetry_events WHERE einsatz_id = ANY($1)`, [einsatzIds]);
    await client.query(`DELETE FROM eigenschutz_vorfaelle WHERE einsatz_id = ANY($1)`, [einsatzIds]);
    await client.query(`DELETE FROM ampel_projections WHERE einsatz_id = ANY($1)`, [einsatzIds]);
    await client.query(`DELETE FROM sync_conflicts WHERE einsatz_id = ANY($1)`, [einsatzIds]);

    // 3. PSA + Sicherheitsregeln + Sicherungsposten (Versions-Tabellen vor Haupt-Tabelle)
    await client.query(`DELETE FROM psa_profil_quittungen WHERE einheit_id IN (SELECT id FROM einsatz_einheiten WHERE einsatz_id = ANY($1))`, [einsatzIds]);
    await client.query(`DELETE FROM psa_profil_zuweisungen WHERE einheit_id IN (SELECT id FROM einsatz_einheiten WHERE einsatz_id = ANY($1))`, [einsatzIds]);
    await client.query(`DELETE FROM sicherheitsregel_quittungen WHERE sicherheitsregel_id IN (SELECT id FROM sicherheitsregeln WHERE einsatz_id = ANY($1))`, [einsatzIds]);
    await client.query(`DELETE FROM sicherheitsregel_versionen WHERE sicherheitsregel_id IN (SELECT id FROM sicherheitsregeln WHERE einsatz_id = ANY($1))`, [einsatzIds]);
    await client.query(`DELETE FROM sicherheitsregeln WHERE einsatz_id = ANY($1)`, [einsatzIds]);
    await client.query(`DELETE FROM sicherungsposten_versionen WHERE sicherungsposten_id IN (SELECT id FROM sicherungsposten WHERE einsatz_id = ANY($1))`, [einsatzIds]);
    await client.query(`DELETE FROM sicherungsposten WHERE einsatz_id = ANY($1)`, [einsatzIds]);

    // 4. Gefährdungsbeurteilungen + Versionen
    await client.query(`DELETE FROM gefaehrdungsbeurteilung_versionen WHERE gefaehrdungsbeurteilung_id IN (SELECT id FROM gefaehrdungsbeurteilungen WHERE einsatz_id = ANY($1))`, [einsatzIds]);
    await client.query(`DELETE FROM gefaehrdungsbeurteilungen WHERE einsatz_id = ANY($1)`, [einsatzIds]);

    // 5. Rollen/Einheiten/Einsatz selbst
    await client.query(`DELETE FROM einsatz_rollen_besetzung WHERE einsatz_id = ANY($1)`, [einsatzIds]);
    await client.query(`DELETE FROM einsatz_einheiten WHERE einsatz_id = ANY($1)`, [einsatzIds]);
    await client.query(`DELETE FROM einsaetze WHERE id = ANY($1)`, [einsatzIds]);

    // 6. Test-User
    await client.query(`DELETE FROM "User" WHERE username LIKE $1`, [userPattern]);
  });
}
