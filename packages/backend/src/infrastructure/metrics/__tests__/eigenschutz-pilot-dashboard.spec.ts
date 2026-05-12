/**
 * Strukturelle Validierung des Eigenschutz-Pilot-Grafana-Dashboards.
 *
 * Story 7.9 AC7 (Block A — PromQL-Syntax-Gate als Jest-Spec):
 * Diese Spec lädt das Dashboard-JSON unter
 * `packages/backend/grafana-dashboards/eigenschutz-pilot.json` und prüft:
 *   - Top-Level-Pflichtfelder (schemaVersion, uid, title, tags, time, refresh,
 *     __inputs, templating.list).
 *   - Panel-Inventar (4–5 Panels, eindeutige IDs, Pflichtfelder pro Panel).
 *   - Metriken-Whitelist gegen DSGVO-Drift (Pivot-Anker Story 3.11 /
 *     Architektur §B9).
 *   - PromQL-Heuristiken (Bracket-Balance, Histogram-Quantile-Pattern,
 *     Metriken-Allowlist im Expression-Body).
 *   - Bekannte Threshold-Linien (NFR-P1 = 90 s, NFR-P5 = 5 s).
 *
 * Reine File-IO + JSON-Parse — kein NestJS-Context, kein `@/...`-Import.
 */

import * as fs from 'fs';
import * as path from 'path';

/** Pfad zum Dashboard-JSON, relativ zum Spec-Verzeichnis. */
const DASHBOARD_PATH = path.join(__dirname, '..', '..', '..', '..', 'grafana-dashboards', 'eigenschutz-pilot.json');

/**
 * Erlaubte Metriken in PromQL-Expressions. Erweiterungs-Hinweis: Falls eine
 * Folge-Story zusätzliche Metriken einführt, hier ergänzen.
 */
const ALLOWED_METRICS = new Set<string>([
  'eigenschutz_psa_propagation_duration_seconds_bucket',
  'eigenschutz_psa_propagation_duration_seconds_count',
  'eigenschutz_quittung_latency_seconds_bucket',
  'eigenschutz_quittung_latency_seconds_count',
  'eigenschutz_blind_ack_total',
  'http_request_duration_seconds_bucket',
  'http_request_duration_seconds_count',
  'http_request_duration_seconds_sum',
]);

/**
 * DSGVO-Negativ-Whitelist (verbotene Label-/Feld-Bezeichner). Beide Casings
 * (camelCase + snake_case) sind enthalten, weil PromQL-Labels typischerweise
 * snake_case verwenden, während TypeScript-/Event-Payload-Felder camelCase
 * tragen — beide Drift-Vektoren müssen abgedeckt sein.
 */
const FORBIDDEN_LABELS = [
  'userId',
  'user_id',
  'sessionId',
  'session_id',
  'propagationGroupIdCandidate',
  'propagationGroupId',
  'propagation_group_id',
  'einsatzId',
  'einsatz_id',
  'clientTime',
  'client_time',
  'serverTime',
  'server_time',
  'payload',
  'email',
  'name',
  'funkrufname',
] as const;

interface DashboardTarget {
  refId?: string;
  expr?: string;
}

interface DashboardThresholdStep {
  color?: string;
  value: number | null;
}

interface DashboardPanel {
  id?: unknown;
  type?: string;
  title?: string;
  description?: string;
  datasource?: { uid?: string };
  targets?: DashboardTarget[];
  fieldConfig?: {
    defaults?: {
      thresholds?: {
        steps?: DashboardThresholdStep[];
      };
    };
  };
}

interface DashboardInput {
  name?: string;
  type?: string;
  pluginId?: string;
}

interface DashboardTemplatingItem {
  name?: string;
  type?: string;
  query?: string;
}

interface Dashboard {
  schemaVersion?: number;
  title?: string;
  uid?: string;
  tags?: string[];
  version?: number;
  timezone?: string;
  time?: { from?: string; to?: string };
  refresh?: string;
  __inputs?: DashboardInput[];
  templating?: { list?: DashboardTemplatingItem[] };
  panels?: DashboardPanel[];
}

/** Lädt + parsed das Dashboard genau einmal pro Spec-Lauf. */
function loadDashboard(): { raw: string; data: Dashboard } {
  const raw = fs.readFileSync(DASHBOARD_PATH, 'utf-8');
  const data = JSON.parse(raw) as Dashboard;
  return { raw, data };
}

describe('Eigenschutz-Pilot-Dashboard (Story 7.9 AC7)', () => {
  const { raw: rawJson, data: dashboard } = loadDashboard();

  describe('Block 1 — Strukturelle Top-Level-Asserts', () => {
    it('lädt das Dashboard-JSON ohne Parse-Fehler', () => {
      expect(() => JSON.parse(rawJson)).not.toThrow();
    });

    it('hat eine `schemaVersion` ≥ 39', () => {
      expect(typeof dashboard.schemaVersion).toBe('number');
      expect(dashboard.schemaVersion as number).toBeGreaterThanOrEqual(39);
    });

    it('hat den korrekten `title` mit "Eigenschutz Pilot"-Marker', () => {
      expect(typeof dashboard.title).toBe('string');
      expect(dashboard.title).toContain('Eigenschutz Pilot');
    });

    it('hat die `uid` "eigenschutz-pilot"', () => {
      expect(dashboard.uid).toBe('eigenschutz-pilot');
    });

    it('hat exakt die Tags ["eigenschutz", "pilot"]', () => {
      expect(Array.isArray(dashboard.tags)).toBe(true);
      const tagSet = new Set(dashboard.tags ?? []);
      expect(tagSet.size).toBe(2);
      expect(tagSet.has('eigenschutz')).toBe(true);
      expect(tagSet.has('pilot')).toBe(true);
    });

    it('hat `version === 1`', () => {
      expect(dashboard.version).toBe(1);
    });

    it('hat `timezone === ""`', () => {
      expect(dashboard.timezone).toBe('');
    });

    it('hat `time.from === "now-24h"` und `time.to === "now"`', () => {
      expect(dashboard.time?.from).toBe('now-24h');
      expect(dashboard.time?.to).toBe('now');
    });

    it('hat `refresh === "30s"`', () => {
      expect(dashboard.refresh).toBe('30s');
    });

    it('hat genau einen `__inputs`-Eintrag für `DS_PROMETHEUS`', () => {
      expect(Array.isArray(dashboard.__inputs)).toBe(true);
      expect(dashboard.__inputs?.length).toBe(1);
      const input = dashboard.__inputs?.[0];
      expect(input?.name).toBe('DS_PROMETHEUS');
      expect(input?.type).toBe('datasource');
      expect(input?.pluginId).toBe('prometheus');
    });

    it('hat einen `templating.list`-Eintrag für `DS_PROMETHEUS`', () => {
      const list = dashboard.templating?.list ?? [];
      const dsEntry = list.find((entry) => entry.name === 'DS_PROMETHEUS');
      expect(dsEntry).toBeDefined();
      expect(dsEntry?.type).toBe('datasource');
      expect(dsEntry?.query).toBe('prometheus');
    });

    it('enthält KEIN `einsatzId`-Template (DSGVO-Pivot-Anker Story 3.11)', () => {
      const list = dashboard.templating?.list ?? [];
      const einsatzMatch = list.find((entry) => typeof entry.name === 'string' && /einsatz/i.test(entry.name));
      expect(einsatzMatch).toBeUndefined();
    });
  });

  describe('Block 2 — Panel-Inventar-Asserts', () => {
    const panels = dashboard.panels ?? [];

    it('hat exakt 5 Panels (Story 7.9 Epic-AC)', () => {
      expect(panels.length).toBe(5);
    });

    it('jedes Panel hat eine numerische `id`', () => {
      for (const panel of panels) {
        expect(typeof panel.id).toBe('number');
      }
    });

    it('Panel-IDs sind paarweise eindeutig', () => {
      const ids = panels.map((panel) => panel.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('jedes Panel hat `type === "timeseries"`', () => {
      for (const panel of panels) {
        expect(panel.type).toBe('timeseries');
      }
    });

    it('jedes Panel hat einen non-empty `title` (String)', () => {
      for (const panel of panels) {
        expect(typeof panel.title).toBe('string');
        expect((panel.title ?? '').length).toBeGreaterThan(0);
      }
    });

    it('jedes Panel hat `datasource.uid === "${DS_PROMETHEUS}"`', () => {
      for (const panel of panels) {
        expect(panel.datasource?.uid).toBe('${DS_PROMETHEUS}');
      }
    });

    it('jedes Panel hat non-empty `targets[]`', () => {
      for (const panel of panels) {
        expect(Array.isArray(panel.targets)).toBe(true);
        expect((panel.targets ?? []).length).toBeGreaterThan(0);
      }
    });

    it('jedes Panel hat eine non-empty `description` (DSGVO-/Trade-off-Hinweis)', () => {
      for (const panel of panels) {
        expect(typeof panel.description).toBe('string');
        expect((panel.description ?? '').length).toBeGreaterThan(0);
      }
    });

    it('jedes Target hat einen `refId` (String) und non-empty `expr`', () => {
      for (const panel of panels) {
        for (const target of panel.targets ?? []) {
          expect(typeof target.refId).toBe('string');
          expect(typeof target.expr).toBe('string');
          expect((target.expr ?? '').length).toBeGreaterThan(0);
        }
      }
    });

    it('Target-`refId`-Werte sind pro Panel paarweise eindeutig', () => {
      for (const panel of panels) {
        const refIds = (panel.targets ?? []).map((target) => target.refId);
        expect(new Set(refIds).size).toBe(refIds.length);
      }
    });
  });

  describe('Block 3 — Metriken-Whitelist + DSGVO-Negativ-Liste', () => {
    const panels = dashboard.panels ?? [];
    const allExpressions: string[] = panels.flatMap((panel) => (panel.targets ?? []).map((target) => target.expr ?? '').filter((expr) => expr.length > 0));

    it('referenziert `eigenschutz_psa_propagation_duration_seconds` in mindestens einem Target', () => {
      const hit = allExpressions.some((expr) => expr.includes('eigenschutz_psa_propagation_duration_seconds'));
      expect(hit).toBe(true);
    });

    it('referenziert `eigenschutz_quittung_latency_seconds` in mindestens einem Target', () => {
      const hit = allExpressions.some((expr) => expr.includes('eigenschutz_quittung_latency_seconds'));
      expect(hit).toBe(true);
    });

    it('referenziert `eigenschutz_blind_ack_total` in mindestens einem Target', () => {
      const hit = allExpressions.some((expr) => expr.includes('eigenschutz_blind_ack_total'));
      expect(hit).toBe(true);
    });

    it('referenziert `http_request_duration_seconds_bucket` in mindestens einem Target (Panel 5)', () => {
      const hit = allExpressions.some((expr) => expr.includes('http_request_duration_seconds_bucket'));
      expect(hit).toBe(true);
    });

    // Stringifizierte Repräsentation der relevanten Felder (Targets +
    // Templating-Queries) — bewusst OHNE Panel-`description`, weil
    // Markdown-Descriptions die verbotenen Bezeichner explizit als
    // "kein userId / kein einsatzId"-DSGVO-Begründungs-Disclaimer
    // erwähnen dürfen (Pivot-Anker Story 3.11).
    const targetSurface = JSON.stringify(
      panels.flatMap((panel) =>
        (panel.targets ?? []).map((target) => ({
          expr: target.expr ?? '',
          refId: target.refId ?? '',
        })),
      ),
    );
    // Templating-Surface beschränkt auf die wert-tragenden Felder (Query,
    // Regex, Label). Eine naive JSON.stringify-Variante würde auf strukturelle
    // Property-Namen wie `"name"` matchen, die hier nicht als DSGVO-Drift
    // gemeint sind — Drift ist ein verbotenes Label-/Feld-`Value`, nicht der
    // JSON-Property-Name. Casing-insensitiv abgeglichen analog zu Targets.
    const templatingSurface = JSON.stringify(
      (dashboard.templating?.list ?? []).map((entry) => ({
        query: entry.query ?? '',
      })),
    );

    it.each(FORBIDDEN_LABELS)('enthält die verbotene Bezeichnung `%s` weder in `expr`-Bodies noch in Templating-Queries (DSGVO-Drift-Schutz)', (forbidden) => {
      const pattern = new RegExp(forbidden, 'i');
      expect(pattern.test(targetSurface)).toBe(false);
      expect(pattern.test(templatingSurface)).toBe(false);
    });
  });

  describe('Block 4 — PromQL-Heuristik', () => {
    const panels = dashboard.panels ?? [];
    const targetsWithExpr: { expr: string; panelId: unknown; refId: string }[] = panels.flatMap((panel) =>
      (panel.targets ?? []).map((target) => ({
        expr: target.expr ?? '',
        panelId: panel.id,
        refId: target.refId ?? '',
      })),
    );

    // Fenster-Class bewusst offen (`\[\d+[smhd]\]`), damit Re-Tuning auf
    // `[10m]` / `[1h]` ohne Spec-Refactor möglich bleibt.
    const HISTOGRAM_QUANTILE_PATTERN = /^histogram_quantile\(0\.(50|95|99), sum by \(le\) \(rate\([a-z_]+_bucket(\{[^}]*\})?\[\d+[smhd]\]\)\)\)$/;

    // Erzwingt Suffix `_bucket|_count|_sum` für die HTTP-Histogram-Subseries
    // (keine bare-name-Treffer mehr). Erlaubt zusätzlich Ziffern in
    // Eigenschutz-Metric-Namen, falls eine Folge-Story Versions-Suffixe
    // einführt.
    const METRIC_TOKEN_PATTERN = /\b(eigenschutz_[a-z0-9_]+|http_request_duration_seconds_(bucket|count|sum))\b/g;

    it('jeder Expr hat balancierte runde + geschweifte Klammern', () => {
      for (const { expr } of targetsWithExpr) {
        let round = 0;
        let curly = 0;
        for (const char of expr) {
          if (char === '(') round++;
          else if (char === ')') round--;
          else if (char === '{') curly++;
          else if (char === '}') curly--;

          // Klammern dürfen unterwegs nicht negativ werden.
          expect(round).toBeGreaterThanOrEqual(0);
          expect(curly).toBeGreaterThanOrEqual(0);
        }
        expect(round).toBe(0);
        expect(curly).toBe(0);
      }
    });

    it('jeder `histogram_quantile`-Expr matched das erwartete Pattern', () => {
      const quantileExprs = targetsWithExpr.filter(({ expr }) => expr.includes('histogram_quantile('));
      expect(quantileExprs.length).toBeGreaterThan(0);
      for (const { expr } of quantileExprs) {
        expect(expr).toMatch(HISTOGRAM_QUANTILE_PATTERN);
      }
    });

    it('jeder Expr referenziert ausschließlich Metriken aus der Allowlist', () => {
      for (const { expr, panelId, refId } of targetsWithExpr) {
        const tokens = expr.match(METRIC_TOKEN_PATTERN) ?? [];
        expect(tokens.length).toBeGreaterThan(0);
        for (const token of tokens) {
          if (!ALLOWED_METRICS.has(token)) {
            // Aussagekräftige Fehlermeldung bei Drift.
            throw new Error(`Unerlaubte Metrik "${token}" in Panel ${String(panelId)} / refId "${refId}". ` + `Allowlist erweitern oder Expression korrigieren.`);
          }
          expect(ALLOWED_METRICS.has(token)).toBe(true);
        }
      }
    });
  });

  describe('Block 5 — Bekannte Threshold-Linien', () => {
    const panels = dashboard.panels ?? [];

    function panelHasThresholdValue(panel: DashboardPanel, value: number): boolean {
      const steps = panel.fieldConfig?.defaults?.thresholds?.steps ?? [];
      return steps.some((step) => step.value === value);
    }

    function panelHasRedThresholdAt(panel: DashboardPanel, value: number): boolean {
      const steps = panel.fieldConfig?.defaults?.thresholds?.steps ?? [];
      return steps.some((step) => step.value === value && step.color === 'red');
    }

    function panelHasAbsoluteThresholdMode(panel: DashboardPanel): boolean {
      return (panel.fieldConfig?.defaults?.thresholds as { mode?: string } | undefined)?.mode === 'absolute';
    }

    it('Panel mit `eigenschutz_psa_propagation_duration_seconds` hat Threshold 90 in Rot + Mode "absolute" (NFR-P1)', () => {
      const propagationPanels = panels.filter((panel) => (panel.targets ?? []).some((target) => (target.expr ?? '').includes('eigenschutz_psa_propagation_duration_seconds_bucket')));
      expect(propagationPanels.length).toBeGreaterThan(0);
      const hasThreshold = propagationPanels.some((panel) => panelHasThresholdValue(panel, 90));
      expect(hasThreshold).toBe(true);
      const hasRed = propagationPanels.some((panel) => panelHasRedThresholdAt(panel, 90));
      expect(hasRed).toBe(true);
      const hasAbsolute = propagationPanels.some((panel) => panelHasAbsoluteThresholdMode(panel));
      expect(hasAbsolute).toBe(true);
    });

    it('Panel mit `http_request_duration_seconds_bucket` hat Threshold 5 in Rot + Mode "absolute" (NFR-P5)', () => {
      const exportPanels = panels.filter((panel) => (panel.targets ?? []).some((target) => (target.expr ?? '').includes('http_request_duration_seconds_bucket')));
      expect(exportPanels.length).toBeGreaterThan(0);
      const hasThreshold = exportPanels.some((panel) => panelHasThresholdValue(panel, 5));
      expect(hasThreshold).toBe(true);
      const hasRed = exportPanels.some((panel) => panelHasRedThresholdAt(panel, 5));
      expect(hasRed).toBe(true);
      const hasAbsolute = exportPanels.some((panel) => panelHasAbsoluteThresholdMode(panel));
      expect(hasAbsolute).toBe(true);
    });
  });
});
