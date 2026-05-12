# Pilot-Auswertungs-Guide — Eigenschutz Prometheus + Grafana

**Story:** 7.9 (Prometheus-Metriken + Grafana-Ready)
**Letzte Aktualisierung:** 2026-05-11 (Initialer Guide, Block A automatisiert verifiziert, Block B Human-QA-Handoff dokumentiert)

> ⚠ **DoD-Hinweis:** Der Story-Status `done` bedeutet **Block A grün** (Dashboard-JSON valide + Jest-Specs grün). Block B (echter Grafana-Import gegen Prometheus mit NFR-C1-Sizing, Walltime-Audit < 5 s pro Panel, End-to-End-Smoke einer Bekanntgabe-Sequenz) MUSS vor Pilot-Release abgeschlossen sein, sonst ist die Dashboard-Performance-Aussage nicht belegt. Pilot-Release-Gate setzt voraus, dass alle Block-B-Sektionen den Status `human-handoff-erledigt` tragen.

## Zweck

Dieser Guide ist die Single-Source-of-Truth für die Pilot-Auswertung der Eigenschutz-Telemetrie über Prometheus und Grafana. Er dokumentiert (a) den Schritt-für-Schritt-Import des mitgelieferten Dashboards `eigenschutz-pilot.json`, (b) die fachliche Bedeutung und Threshold-Begründung der fünf Panels (CBRN-Propagation, Quittungs-Latenz, Blind-Ack-Rate, Event-Volumen, PDF-Export-Dauer), (c) die DSGVO-Begründung für das gewählte Label-Modell, (d) den Ad-hoc-SQL-Pfad für Pro-Einsatz-Drill-Down (weil Prometheus bewusst kein `einsatzId`-Label trägt) und (e) die Block-B-Human-QA-Handoff-Checkliste, die vor Pilot-Release erledigt sein muss.

Adressaten sind SRE/Plattform-Verantwortliche, die das Dashboard auf einer realen Grafana-Instanz importieren, sowie Pilot-Auswerter:innen, die die fachliche Interpretation der Metriken übernehmen. Block A (Dashboard-JSON-Struktur, PromQL-Syntax, DSGVO-Label-Inventar) ist über Jest-Specs in `packages/backend/src/infrastructure/metrics/__tests__/` automatisiert abgesichert; Block B verlangt echte Grafana-Stage-Verifikation.

Re-Runs nach Dashboard-Änderungen (neue Panels, Threshold-Tuning, Recording-Rules-Aktivierung) erzeugen einen neuen datierten Bericht unter `docs/audits/eigenschutz-prometheus-grafana-YYYY-MM-DD.md`, der den vorherigen zitiert. Historie wird per Git getrackt (Konvention analog Story 7.7 / 7.8).

## Voraussetzungen

- **Prometheus ≥ 2.40** — Plattform-Infrastruktur, nicht Modul-Eigentum. Histogram-Quantile-Pfad (`histogram_quantile` + `sum by (le) (rate(..._bucket[...]))`) ist seit 2.x stabil.
- **Grafana ≥ 10 LTS** — Mindest-`schemaVersion` 39 wird vom Dashboard gefordert. Forward-Kompatibel zu Grafana 11.
- **Scrape-Target `bluelight-hub-backend:3091/metrics`** ist in der Prometheus-Konfiguration eingetragen. **Scrape-Interval ≤ 30 s** empfohlen, weil der Dashboard-`refresh` auf `30s` steht und sonst die jüngsten Buckets leer bleiben.
- **Pilot-Onboarding-Permission:** `eigenschutz:telemetry:write` ist auf den Pilot-Einheiten gesetzt (Folge-Schritt aus `_bmad-output/implementation-artifacts/deferred-work.md:434`). Ohne diese Permission erreichen Telemetrie-Events den Collector nicht, und die Eigenschutz-Metriken bleiben auf 0.
- **Self-Signed-Zertifikate (Pilot/Stage):** Der Backend-Service exposed `/metrics` über HTTPS mit Self-Signed-Zertifikat. Prometheus muss in der Scrape-Config entweder `tls_config.insecure_skip_verify: true` setzen oder den Self-Signed-CA als `ca_file` mounten. Beide Pfade sind plattformseitig zu entscheiden und nicht Story-7.9-Pflicht.

## Dashboard-Import — Schritt für Schritt

Grafana-UI-Flow:

1. Grafana öffnen → **Dashboards** → **New** → **Import**.
2. JSON-Inhalt aus `packages/backend/grafana-dashboards/eigenschutz-pilot.json` einfügen (Copy-Paste in das Textfeld oder Datei-Upload via „Upload dashboard JSON file").
3. Im Import-Dialog erscheint das Input-Feld `${DS_PROMETHEUS}` (Top-Level-`__inputs`-Eintrag des Dashboards). Hier die Prometheus-Datasource auswählen, die `bluelight-hub-backend:3091/metrics` scrapt. Es werden **keine** Datasource-UIDs hardcoded — das Dashboard ist damit auch in anderen Grafana-Instanzen (Dev/Stage/Prod) portabel.
4. **Import** klicken → das Dashboard öffnet sich. Alle fünf Panels rendern entweder Live-Daten oder den Default-„No data"-State, bis Telemetrie eintrudelt (siehe Block-B-Smoke).

**Recording-Rules-Hinweis:** Für Long-Term-Auswertung (> 7 Tage) ist die Definition von Recording-Rules (z. B. `eigenschutz:propagation_p95_5m`) ratsam, weil `histogram_quantile` über lange Fenster teuer wird. Story 7.9 liefert **keine** Recording-Rules — der Folgeschritt ist in Block B (B4) als Phase-2-SRE-Defer dokumentiert.

## Panel-Erklärungen

### Panel 1 — CBRN-Propagations-Dauer

- **Use-Case:** Wie schnell erreicht eine PSA-Bekanntgabe alle adressierten Einheiten? Misst das Zeitfenster `assess_started → all_banners_delivered`. Kern-Sicherheits-Indikator für Journey 1b (CBRN-Moment).
- **Threshold-Begründung:** Rote Linie bei **90 s** (NFR-P1, Journey-1b-Zielfenster). Wenn das p95 dauerhaft > 90 s liegt, ist das Pilot-Akzeptanz-Kriterium für die Bekanntgabe-Latenz verletzt.
- **Drill-Down-Verweis:** Pro-Bucket-Aufschlüsselung nach `abschnitt_count_bucket` (`'1'` / `'2-3'` / `'4-8'` / `'9+'`): Per-Lage-Größe-Drill-Down (`sum by (abschnitt_count_bucket) (rate(eigenschutz_psa_propagation_duration_seconds_count[5m]))`) ist als Folge-Story-Polish vorgesehen — Operator:innen können das Target manuell in der Grafana-UI hinzufügen, sobald Bedarf besteht (siehe Block-B-Sektion). Pro-Einsatz-Detail über Ad-hoc SQL (siehe nächste Sektion); Architektur-Begründung in §B9 / Folge-Story 3.11.
- **Alert-Vorschlag:** `eigenschutz:propagation_p95_5m > 90` für ≥ 5 min ⇒ Sprint-Change-Vorschlag. Konkrete Alert-Rule gehört in eine eigene SRE-Story (siehe B5).

### Panel 2 — Quittungs-Latenz

- **Use-Case:** Wie lange braucht eine einzelne Einheit von Banner-Sichtbarkeit bis Quittung? Misst pro Empfänger das Fenster `all_banners_delivered → psa_quittung_abgegeben`.
- **Threshold-Begründung:** Keine harte Schwelle — Quittungslatenz ist personen- und kontext-abhängig. Soft-Ziel ≤ 30 s pro Quittung für Pilot-Auswertung. Daueraussetzer > 60 s im p95 werten Pilot-Auswerter:innen als Workflow-Reibung.
- **Drill-Down-Verweis:** Label `einheit_id_bucket` ist `'present'` / `'absent'` (Präsenz-Flag, kein Identifier). Pro-Einheit-Detail nur über Ad-hoc SQL gegen `eigenschutz_telemetry_event`.
- **Alert-Vorschlag:** Erst nach Pilot-Auswertung des realen Quittungs-Profils; potenziell `p95 > 60 s` als Soft-Warning.

### Panel 3 — Blind-Ack-Rate

- **Use-Case:** Wie häufig quittieren Einheiten ohne das Banner gelesen zu haben (Blind-Ack)? Coaching-Signal für Pilot-Begleitung — **kein** Sicherheits-Alarm. Top-3-Einheiten werden via `topk(3, ...)` über das `einheit_id`-Pseudonym ausgewiesen.
- **Threshold-Begründung:** Keine Hard-Threshold; Pilot-Auswerter:innen interpretieren den Trend qualitativ. Ein steigender Trend ist Hinweis auf Schulungsbedarf, nicht auf System-Fehler.
- **Drill-Down-Verweis:** `einheit_id` ist auf 32 Zeichen gecappt (CUID2-Länge 24–32 passt unverändert), Fallback `'unknown'` bei fehlender Metadata. BOS-Einheit ist Gruppe, nicht Individuum — Pseudonymität, nicht Anonymität (siehe DSGVO-Tabelle).
- **Alert-Vorschlag:** Nicht alert-fähig — Coaching-Werkzeug, kein Pager-Signal.

### Panel 4 — Event-Volumen

- **Use-Case:** 5-Minuten-Stacked-Counts der drei Pilot-Telemetrie-Metriken: Propagationen abgeschlossen (Histogram-Count `rate(eigenschutz_psa_propagation_duration_seconds_count[5m])`, getriggert durch `all_banners_delivered`-Events), Quittungen (Histogram-Count `rate(eigenschutz_quittung_latency_seconds_count[5m])`, getriggert durch `psa_quittung_abgegeben`-Events), Blind-Acks (Counter `rate(eigenschutz_blind_ack_total[5m])`). Hilft, Aktivitätsphasen im Pilot-Tag zu erkennen und Lücken in der Telemetrie-Erfassung zu spotten.
- **Threshold-Begründung:** Keine Schwelle — reines Volumen-Panel. Auffällig sind dauerhaft leere Buckets (Telemetrie-Pipeline gebrochen) oder grobe Disproportionen zwischen Sende- und Quittungs-Marken.
- **Drill-Down-Verweis:** Aggregiert über **alle** Einsätze (Architektur §B9-Z. 665 — bewusst kein `einsatzId`-Label, Time-Series-Kardinalitäts-Schutz). Pro-Einsatz-Aufschlüsselung ausschließlich via Ad-hoc SQL.
- **Alert-Vorschlag:** „Counter steht still trotz Pilot-Aktivität" wäre ein Pipeline-Heartbeat — gehört in eine eigene Heartbeat-Story, nicht hierher.

### Panel 5 — PDF-Export-Dauer

- **Use-Case:** Wie lange braucht der Vorfälle-PDF-Export? Quelle ist die globale `http_request_duration_seconds`-Histogram aus Story 5.6, gefiltert mit `route=~".*vorfaelle.*export.*"`.
- **Threshold-Begründung:** Rote Linie bei **5 s** (NFR-P5, Pilot-Export-Akzeptanz). p95 > 5 s gefährdet die Pilot-Übergabe-Zeit.
- **Drill-Down-Verweis:** PDF und JSON werden in der HTTP-Histogram **conflated** (gemeinsamer `route`-Match) — bewusster Trade-off, ehrlich dokumentiert. Phase-2-Polish wäre eine dedizierte `eigenschutz_pdf_export_duration_seconds`-Histogram mit `format`-Label (defer auf eigene Story).
- **Alert-Vorschlag:** `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{route=~".*vorfaelle.*export.*"}[5m]))) > 5` für ≥ 10 min.

## DSGVO-Begründung

| Metrik | Typ | Labels | Klassifizierung | Begründung |
| --- | --- | --- | --- | --- |
| `eigenschutz_psa_propagation_duration_seconds` | Histogram | `abschnitt_count_bucket` (`'1'` / `'2-3'` / `'4-8'` / `'9+'`) | Aggregierte Lage-Klasse, kein Personenbezug | Bucket faltet `abschnittCount` deterministisch in vier Klassen → konstante Time-Series-Kardinalität, keine Re-Identifikation möglich. |
| `eigenschutz_quittung_latency_seconds` | Histogram | `einheit_id_bucket` (`'present'` / `'absent'`) | Präsenz-Flag, kein Einheits-Identifier | Reduziert die Information auf „Einheit war/war nicht in der Metadata enthalten". Keine Personalisierbarkeit, keine Cohort-Auswertung über Prometheus. |
| `eigenschutz_blind_ack_total` | Counter | `einheit_id` (CUID2, 32-Char-Cap, Fallback `'unknown'`) | Pseudonymer Gruppen-Identifier | BOS-Einheit ist eine Gruppe ≠ Individuum; CUID2 ist nicht-sequenziell und nicht rückführbar auf Klarnamen ohne separaten Lookup. Pseudonymität, nicht Anonymität — bewusst akzeptiert für das Coaching-Signal. |

**Verbotene Label-Namen (Negativ-Inventar, im Spec-Gate `eigenschutz-metrics-dsgvo.spec.ts` automatisiert geprüft):**
`userId`, `sessionId`, `propagationGroupIdCandidate`, `propagationGroupId`, `einsatzId`, `clientTime`, `serverTime`, `payload`, `email`, `name`, `funkrufname`.

Diese Labels sind **strukturell** ausgeschlossen, weil sie entweder einen direkten Personenbezug erzeugen (`userId`, `email`, `name`, `funkrufname`), eine Sitzung deanonymisierbar machen (`sessionId`), die Time-Series-Kardinalität explodieren lassen würden (`einsatzId`, `propagationGroupId`) oder unstrukturierte Payload-Felder in den Label-Raum heben (`payload`, `clientTime`, `serverTime`).

**Architektur-Quellen:**

- `_bmad-output/planning-artifacts/architecture.md#B9` Z. 663 — „Payload enthält keine unnötigen Personenbezüge; `userId` ist einsatz-scoped und konsistent mit Audit-Trail. Retention folgt Einsatz-Lifetime."
- `_bmad-output/implementation-artifacts/415-3-11-telemetrie-capture-fuer-cbrn-moment.md` AC4 — Pivot-Anker für Label-Cardinality-Cap (CUID2-32-Char-Cap, `'unknown'`-Fallback).

## Pro-Einsatz-Drill-Down via Ad-hoc SQL

**Begründung:** Prometheus-Metriken tragen **kein** `einsatzId`-Label (Time-Series-Kardinalitäts-Schutz, Architektur §B9-Z. 665). Pro-Einsatz-Auswertung erfolgt deshalb über Ad-hoc SQL gegen die Tabelle `eigenschutz_telemetry_events` in PostgreSQL — dort liegen die Roh-Events inklusive `einsatz_id` und einer `payload`-`jsonb`-Spalte, die unter dem Key `metadata` die in `prometheus-eigenschutz.collector.ts` ausgewerteten Felder enthält (z. B. `elapsedMs`, `elapsedFromBannerMs`, `einheitIdCandidate`). Prometheus liefert Echtzeit-Aggregate; PostgreSQL liefert Pro-Einsatz-Forensik.

**Sample-Query** (Beispiel: Wie viele Quittungen liefen über 30 s im Einsatz X?):

```sql
-- Quittungen mit Latenz > 30 s im Einsatz X (UTC-Zeitraum: Pilot-Tag)
SELECT
  event_name,
  einsatz_id,
  (payload -> 'metadata' ->> 'elapsedFromBannerMs')::numeric / 1000 AS latency_s,
  client_time
FROM eigenschutz_telemetry_events
WHERE event_name IN ('psa_quittung_abgegeben', 'quittung_abgegeben')
  AND einsatz_id = 'EINSATZ_ID_HIER'
  AND payload -> 'metadata' ? 'elapsedFromBannerMs'
  AND (payload -> 'metadata' ->> 'elapsedFromBannerMs')::numeric > 30000
  AND client_time BETWEEN '2026-05-11T00:00:00Z' AND '2026-05-11T23:59:59Z'
ORDER BY client_time;
```

> **Scope-Hinweis:** Dieser Query ist auf Quittungs-Latenz-Events (`event_name IN ('psa_quittung_abgegeben', 'quittung_abgegeben')`) gefiltert. Für CBRN-Propagations-Dauer oder Blind-Ack-Counts entsprechend `event_name` anpassen (`all_banners_delivered` für Propagations-Dauer, `blind_ack` für Blind-Acks).

**Datenqualitäts-Diagnose:** Wenn der Haupt-Query unerwartet wenige Zeilen liefert, prüfe ob `elapsedFromBannerMs` regelmäßig fehlt — das deutet auf einen Frontend-Capture-Bug oder ein nicht-CBRN-Code-Pfad hin.

```sql
-- Datenqualitäts-Diagnose: Events, denen elapsedFromBannerMs fehlt
SELECT event_name, COUNT(*) AS missing_elapsed
FROM eigenschutz_telemetry_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND NOT (payload -> 'metadata' ? 'elapsedFromBannerMs')
GROUP BY event_name
ORDER BY missing_elapsed DESC;
```

> Schema-Quelle (verifiziert gegen `packages/backend/prisma/schema.prisma` Z. 2835–2848 + `telemetry-ingest.service.ts` Z. 100–115): Tabelle `eigenschutz_telemetry_events` (plural), Spalten `id`, `einsatz_id`, `user_id`, `session_id`, `event_name`, `payload` (jsonb), `client_time`, `server_time`. Die Application-Layer-`metadata` aus `EigenschutzTelemetryEventInput` wird in `payload.metadata` persistiert (Wrapping in `telemetry-ingest.service.ts`); der Pfad-Zugriff `payload -> 'metadata' ->> '...'` ist daher zweistufig.

**DB-Zugriff im Pilot:** `docker compose exec postgres psql -U bluelight -d bluelight-hub -c "<query>"` (kein lokales `psql` installiert, gemäß CLAUDE.md-Konvention).

## Block B — Human-QA-Handoff (Pilot-Release-Gate)

**Status:** `human-handoff-pending` (alle Block-B-Sub-Items, soweit nicht explizit `phase-2-defer`).

Jeder Block-B-Eintrag trägt: Beschreibung + Erfolgs-Kriterium + Status. Initialer Status ist `human-handoff-pending`. Sobald ein Eintrag im Pilot-QA-Pass erledigt ist, ändert sich der Status auf `human-handoff-erledigt`. Phase-2-Defer-Einträge tragen `phase-2-defer`.

### B1: Echter Grafana-Import auf Stage

**Beschreibung:** Tester:in importiert `eigenschutz-pilot.json` via Grafana-UI gegen eine reale Prometheus-Datasource auf der Stage-Instanz.
**Erfolgs-Kriterium:** Alle fünf Panels rendern; keine Datasource-Resolve-Fehler im Import-Dialog; keine PromQL-Parse-Errors in der Browser-Console (DevTools-Network-Tab + Console).
**Status:** `human-handoff-pending`.

### B2: Walltime-Audit pro Panel (NFR-Epic „< 5 s pro Panel")

**Beschreibung:** Auf einer Prometheus-Instanz mit NFR-C1-Sizing (20 Abschnitte, 100 Einheiten, 50 aktive Clients, 200 Telemetrie-Events) die Render-Zeit pro Panel messen via Grafana-Browser-DevTools-Network-Tab (alternativ Grafana-internes `grafana_api_dashboard_search_duration_seconds`).
**Erfolgs-Kriterium:** Jedes Panel rendert in < 5 s; die Quantile-Panels (1, 2, 5) sind die kritischen Kandidaten, weil `histogram_quantile`-Aggregation über `_bucket`-Series rechenintensiv ist.
**Status:** `human-handoff-pending`.

### B3: End-to-End-Smoke einer Bekanntgabe-Sequenz

**Beschreibung:** Tester:in löst auf Stage manuell aus: 1 PSA-Bekanntgabe, 3 Quittungen, 1 Blind-Ack (alternativ gegen lokalen Dev-Server via `pnpm -r dev`).
**Erfolgs-Kriterium:** Innerhalb ≤ 60 s sind die Counts in Panel 1 / 2 / 3 / 4 sichtbar (Default-`refresh: 30s` greift; Scrape-Interval ≤ 30 s vorausgesetzt).
**Status:** `human-handoff-pending`.

### B4: Recording-Rules-Folgeschritt (optional)

**Beschreibung:** Falls die SRE-Plattform Recording-Rules unterstützt: Definiere `eigenschutz:propagation_p95_5m`, `eigenschutz:quittung_p95_5m` und `eigenschutz:blind_ack_rate_5m` als Long-Term-Aggregations-Rules.
**Erfolgs-Kriterium:** Recording-Rules sind in der Prometheus-Rules-Pipeline registriert und liefern die erwarteten Aggregate (validierbar via `promtool check rules`).
**Status:** `phase-2-defer` — eigene SRE-Story, weil BlH zur Zeit keine aktive Recording-Rules-Pipeline betreibt.

### B5: Alert-Definition-Folgeschritt

**Beschreibung:** Aus den Panel-Thresholds (90 s Propagation laut Panel 1, 5 s PDF-Export laut Panel 5) Grafana-Alert-Rules ableiten.
**Erfolgs-Kriterium:** Alert-Rules existieren, sind über das Plattform-Alert-Routing (PagerDuty / E-Mail / Slack) verdrahtet und werden im Test ausgelöst.
**Status:** `phase-2-defer` — eigene SRE-Story, weil das Plattform-Alert-Routing nicht Story-7.9-Scope ist.

### Failure-Eskalation

Jeder Block-B-Befund mit fachlicher Implikation (z. B. Panel-Walltime > 5 s, Recording-Rule-Bedarf, fehlerhafte PromQL-Aggregation, Datasource-Inkompatibilität) wird als Backlog-Eintrag mit Story-Anker dokumentiert (Sprint-Backlog oder Linear). Cosmetic-Befunde (Panel-Reihenfolge, Color-Tuning, Description-Wording) sind Iteration im Block A einer Folge-Story 7.9.x.

## Tooling-Limit-Disclaimer

- **Recording-Rules `.yaml`** sind **nicht** Teil dieses Repos, weil BlH zur Zeit keine aktive Prometheus-Operator-/-Rules-Pipeline betreibt. Sobald die SRE-Plattform Recording-Rules unterstützt, wird `eigenschutz-recording-rules.yaml` in `packages/backend/grafana-dashboards/` (oder einem dedizierten `prometheus-rules/`-Folder) ergänzt. Bis dahin gilt B4 als Phase-2-Defer.
- **`promtool` als optionales Spec-Gate** (siehe Story-7.9 AC7): nicht in CI aktiviert, weil `promtool` im CI-Image nicht installiert ist. Die PromQL-Syntax wird strukturell über die Regex-Heuristik in `eigenschutz-pilot-dashboard.spec.ts` (Bracket-Balance, `histogram_quantile`-Form, Metriken-Whitelist) abgedeckt — vollständige Lexer-/Parser-Validierung bleibt Block-B-Verantwortung beim echten Grafana-Import (B1).
- **Grafana-Walltime-Audit** ist Block-B-Pflicht (B2). Im Block A wird ausschließlich strukturelle Validität geprüft (JSON-Parse, Pflichtfelder, Label-Inventar), **nicht** Echtzeit-Render-Performance gegen reale Prometheus-Last.

## Re-Run-Konvention

Re-Runs dieses Pilot-Auswertungs-Guides nach Dashboard-Änderungen (z. B. neues Panel, Threshold-Tuning, Recording-Rules-Aktivierung, neue Telemetrie-Marke aus Folge-Story 3.11.x) erzeugen einen neuen datierten Bericht unter `docs/audits/eigenschutz-prometheus-grafana-YYYY-MM-DD.md`, der den vorherigen explizit per Pfad zitiert. Die Historie wird per Git getrackt; der Vorgänger-Bericht wird nicht überschrieben (Konvention analog Story 7.7 / 7.8).

## References

- `_bmad-output/planning-artifacts/epics.md#Story 7.9: Prometheus-Metriken + Grafana-Ready` (Z. 1984–2009) — Epic-AC-Text, NFR-Mapping.
- `_bmad-output/planning-artifacts/architecture.md#B9. Client-Telemetrie für CBRN-Moment — Backend-Endpoint + Prometheus` (Z. 642–665) — Metrik-Inventar, DSGVO-Begründung, Ad-hoc-SQL-Pfad-Begründung.
- `_bmad-output/implementation-artifacts/415-3-11-telemetrie-capture-fuer-cbrn-moment.md` — Pivot-Anker, Label-Cardinality-Cap-Begründung, Library-Drift (`prom-client` direkt statt `@willsoto/nestjs-prometheus`).
- `_bmad-output/implementation-artifacts/deferred-work.md` (Z. 434, 437) — Pilot-Permission `eigenschutz:telemetry:write` + Grafana-Dashboard-Defer auf Story 7.9.
- `packages/backend/src/infrastructure/metrics/metrics.module.ts` — Provider-Inventar (Histogram-/Counter-Konstruktion mit `prom-client`).
- `packages/backend/src/infrastructure/eigenschutz/telemetry/prometheus-eigenschutz.collector.ts` — Label-Bucketing-Heuristik (`abschnitt_count_bucket`, `einheit_id_bucket`, `einheit_id`-Cap).
- `packages/backend/grafana-dashboards/eigenschutz-pilot.json` — das Dashboard-JSON selbst.
- `docs/audits/eigenschutz-a11y-audit-2026-05-10.md` — Block-A/B-Pattern-Vorbild aus Story 7.8 (Header, DoD-Hinweis, Tabellen-Stil).
