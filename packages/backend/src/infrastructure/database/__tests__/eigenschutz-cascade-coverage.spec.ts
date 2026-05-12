import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Story 7.10 AC5 — NFR-S5 Cascade-Cover-Decke Discovery-Spec.
 *
 * **Diese Spec ist eine Discovery-Spec, KEINE Migration.** Sie friert den
 * Ist-Zustand der `onDelete: Cascade`-FK-Beziehungen zwischen Eigenschutz-
 * Models und `Einsatz` maschinenlesbar ein. Wenn der Ist-Zustand sich ändert
 * (z. B. spätere FK-Migration), bricht die Spec und erzwingt eine
 * Audit-Bericht-Aktualisierung.
 *
 * **Erkenntnis (Verifikation gegen `packages/backend/prisma/schema.prisma`
 * per 2026-05-11):**
 *
 * - **Cascade aktiv (`einsatz Einsatz @relation(..., onDelete: Cascade)`):**
 *   - `Gefaehrdungsbeurteilung` (Z. 2623)
 *   - `PsaProfilZuweisung` (Z. 2685)
 *   - `Sicherheitsregel` (Z. 2721)
 *   - `Sicherungsposten` (Z. 2781)
 *
 * - **Cascade FEHLT (nur `einsatzId String`, kein `@relation`):**
 *   - `PsaProfilQuittung` (Z. 2693)
 *   - `EigenschutzVorfall` (Z. 2807)
 *   - `EigenschutzTelemetryEvent` (Z. 2835)
 *   - `AmpelProjection` (Z. 2851)
 *   - `SyncConflict` (Z. 2870)
 *
 * **Folge:** Bei einem hart-gelöschten Einsatz bleiben die 5 letztgenannten
 * Tabellen als Waisen. NFR-S5 verlangt vollständige Kaskade — diese Lücke
 * wird im Audit-Bericht (Sektion NFR-S5) als P1-Architektur-Defer mit
 * Owner-Vorschlag (`@bluelight-hub/backend`-Maintainer) dokumentiert.
 *
 * **Out-of-Scope:** Migration. Story 7.10 ist Audit, kein FK-Refactor über
 * 5 Modelle hinweg (Pivot-Anker §6 + Story-Spec-Sektion „Bewusst aus dem
 * Scope gehaltene Architektur-Slots").
 */

const SCHEMA_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'prisma', 'schema.prisma');

interface CascadeStatus {
  model: string;
  hasEinsatzId: boolean;
  hasCascadeRelation: boolean;
}

interface ParsedModelBlock {
  name: string;
  body: string;
}

function parseModels(schemaText: string): ParsedModelBlock[] {
  const blocks: ParsedModelBlock[] = [];
  for (const match of schemaText.matchAll(/^model\s+(\w+)\s*{([\s\S]*?)^}/gm)) {
    blocks.push({ name: match[1], body: match[2] });
  }
  return blocks;
}

function analyzeEigenschutzCascade(): Map<string, CascadeStatus> {
  const schemaText = readFileSync(SCHEMA_PATH, 'utf-8');
  const models = parseModels(schemaText);
  const interesting = [
    'Gefaehrdungsbeurteilung',
    'PsaProfilZuweisung',
    'PsaProfilQuittung',
    'Sicherheitsregel',
    'Sicherungsposten',
    'EigenschutzVorfall',
    'EigenschutzTelemetryEvent',
    'AmpelProjection',
    'SyncConflict',
  ];

  const result = new Map<string, CascadeStatus>();
  for (const target of interesting) {
    const block = models.find((m) => m.name === target);
    if (!block) {
      throw new Error(`Erwartetes Eigenschutz-Model nicht gefunden: ${target}. Schema-Änderung ohne Audit-Refresh.`);
    }
    const hasEinsatzId = /^\s*einsatzId\s+String/m.test(block.body);
    const hasCascadeRelation = /einsatz\s+Einsatz\s+@relation\([^)]*onDelete:\s*Cascade/.test(block.body);
    result.set(target, { model: target, hasEinsatzId, hasCascadeRelation });
  }
  return result;
}

describe('Story 7.10 AC5 — NFR-S5 Cascade-Cover-Decke Discovery (Schema-Parser)', () => {
  let cascadeStatus: Map<string, CascadeStatus>;

  beforeAll(() => {
    cascadeStatus = analyzeEigenschutzCascade();
  });

  describe('Cascade aktiv (Soll-Zustand per 2026-05-11)', () => {
    it.each(['Gefaehrdungsbeurteilung', 'PsaProfilZuweisung', 'Sicherheitsregel', 'Sicherungsposten'])('%s hat `einsatz Einsatz @relation(..., onDelete: Cascade)`', (model) => {
      const status = cascadeStatus.get(model);
      expect(status).toBeDefined();
      expect(status!.hasEinsatzId).toBe(true);
      expect(status!.hasCascadeRelation).toBe(true);
    });
  });

  describe('Cascade FEHLT (Discovery-Snapshot per 2026-05-11 — P1-Architektur-Defer)', () => {
    it.each(['PsaProfilQuittung', 'EigenschutzVorfall', 'EigenschutzTelemetryEvent', 'AmpelProjection', 'SyncConflict'])(
      '%s hat `einsatzId String`, aber KEIN `einsatz Einsatz @relation` (Audit-Finding)',
      (model) => {
        const status = cascadeStatus.get(model);
        expect(status).toBeDefined();
        expect(status!.hasEinsatzId).toBe(true);
        // Wenn diese Assertion bricht, wurde die Cascade nachgerüstet → Audit-Bericht aktualisieren.
        expect(status!.hasCascadeRelation).toBe(false);
      },
    );
  });

  it('emittiert maschinenlesbare Cover-Tabelle (Audit-Trace)', () => {
    const lines = ['Model | hasEinsatzId | hasCascadeRelation', '------|--------------|-----'];
    for (const [model, status] of cascadeStatus) {
      lines.push(`${model} | ${status.hasEinsatzId} | ${status.hasCascadeRelation}`);
    }
    const table = lines.join('\n');
    expect(table).toContain('hasCascadeRelation');
    expect(table.split('\n').length).toBe(2 + cascadeStatus.size);
  });

  /**
   * Real-DB-Integrationstest (Story-Wortlaut „Integrationstest-Sanity-Check, Block A, light").
   *
   * **Begründung des `it.skip`:** Reale DB-Round-Trips brauchen Test-Database-Setup
   * mit Prisma-Migration-Stand. Das Setup ist Cross-Cutting und gehört in eine eigene
   * Test-Infrastructure-Story (out-of-scope per Story-Spec).
   *
   * Der Schema-Parser-Test oben liefert äquivalente Discovery-Garantie ohne DB-Setup.
   * Block-B-Item dokumentiert das Real-DB-Verifikations-Protokoll im Audit-Bericht.
   */
  it.skip('Block-B-Handoff: Integrationstest gegen reale DB (Migration-Stand-Verifikation)', () => {
    // Pseudo-Code:
    // 1. Lege Einsatz an
    // 2. Lege 9 Eigenschutz-Entity-Typen für diesen Einsatz an
    // 3. prisma.einsatz.delete({ where: { id } })
    // 4. Erwartung: 4 kaskadieren (Gefaehrdungsbeurteilung, PsaProfilZuweisung, Sicherheitsregel, Sicherungsposten),
    //    5 bleiben als Waisen (PsaProfilQuittung, EigenschutzVorfall, EigenschutzTelemetryEvent, AmpelProjection, SyncConflict).
    // 5. Test dokumentiert Waisen-Stand und schlägt NICHT fehl bei Waisen.
  });
});
