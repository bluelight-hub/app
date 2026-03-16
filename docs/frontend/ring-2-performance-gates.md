# Ring-2-Performance-Gates

## Zweck

Diese Doku ergänzt das Ring-2-Fundament um belastbare Performance-Gates für `Überblick`, `ETB` und `Befehle`. Ziel ist kein allgemeines Bauchgefühl, sondern eine wiederholbare Abnahme gegen konkrete Lasten, Metriken und Diagnosepfade.

Die Browser-, Zoom- und Breakpoint-Matrix wird bewusst nicht neu definiert. Dafür bleibt die Zielumgebung aus [`ring-2-review-gates.md`](./ring-2-review-gates.md) verbindlich.

## Verbindliche Lasten

Die Story `1.2b` nutzt drei zentrale Referenzlasten, die in Doku, Tests und manuellen Reviews identisch wiederverwendet werden:

- `100` Überblicksobjekte über `buildOverviewStatusObjects()` bzw. `buildOverviewDashboardFixture()`
- `200` ETB-Einträge über `buildEtbEntries()`
- `20` offene Befehle über `buildOpenBefehle()`

Die Fixture-Builder liegen unter [`packages/frontend/src/test/performance/ring-2-performance-fixtures.ts`](/Users/rubeen/dev/personal/bluelight-hub/packages/frontend/src/test/performance/ring-2-performance-fixtures.ts).

## Szenario-Matrix

| Fläche | Kanonischer Anker | Nutzbarer Zustand | Referenzlast |
| --- | --- | --- | --- |
| `Überblick` | `SingleEinsatzDashboard` auf `/app/einsatz/$einsatzId/übersicht` | Workspace-Kontext, Statistik-Karten und Schnellzugriffe sind sichtbar; priorisierte Überblicksinformationen sind lesbar | `100` Überblicksobjekte, ETB-Referenz `200` |
| `ETB` | `EtbPage` / `EtbEntryList` auf `/app/einsatz/$einsatzId/führung/etb` | Header, Eingabeformular und erste virtuelle Zeilen oder ein textlich eindeutiger Ladezustand sind sichtbar | `200` ETB-Einträge |
| `Befehle` | `BefehlsListeMitEingabe` auf `/app/einsatz/$einsatzId/führung/befehle` | Header/Filter und erste Karten oder ein textlich eindeutiger Ladezustand sind sichtbar | `20` offene Befehle |

## Verbindliche Gates aus `NFR1` bis `NFR5`

| Metrik | Grenzwert | Bedeutung |
| --- | --- | --- |
| `usable-state` | `P95 <= 2000 ms` | Navigation oder Einstieg bis zum nutzbaren Zustand |
| `interaction-feedback` | `<= 200 ms` | sichtbare Reaktion auf Scroll, Filterwechsel oder Wiederaufnahme |
| `status-feedback` | `<= 300 ms` | textlich erkennbarer Status wie `lädt`, `aktualisiert` oder Degradation |
| `pass-rate` | `>= 95 %` bei `30` Läufen | Story-Gate für wiederholbare Szenarien |

Die maschinenlesbaren Reports verwenden mindestens:

- `scenario`
- `metric`
- `threshold`
- `measured`
- `iterations`
- `device`
- `browser`
- `pass`

Die Report-Logik liegt unter [`packages/frontend/src/test/performance/ring-2-performance-metrics.ts`](/Users/rubeen/dev/personal/bluelight-hub/packages/frontend/src/test/performance/ring-2-performance-metrics.ts).

## Statusfeedback über 300 ms

Die Guardrail bleibt ausdrücklich bei bestehenden Produktstatusflächen:

- `Überblick`: `LoadingState` mit `Lade Einsatzdaten...` sowie Kartenstatus `Wird geladen...`
- `ETB`: `LoadingState` mit `Lade Einsatztagebuch...`, Reload-Status `Aktualisiere ETB…` und Tabellenstatus `Einträge werden aktualisiert…`
- `Befehle`: `role="status"` mit `Befehle werden geladen` sowie `IntegrationStatusBanner` für degradierte Integrationen

Spinner ohne Text gelten nicht als ausreichende Evidenz.

## Automatisierte Repo-Gates

Verbindliche Guardrail-Tests:

- [`packages/frontend/src/test/performance/ring-2-performance.spec.ts`](/Users/rubeen/dev/personal/bluelight-hub/packages/frontend/src/test/performance/ring-2-performance.spec.ts)
- [`packages/frontend/src/features/einsatz/ui/organisms/__tests__/SingleEinsatzDashboard.performance.spec.tsx`](/Users/rubeen/dev/personal/bluelight-hub/packages/frontend/src/features/einsatz/ui/organisms/__tests__/SingleEinsatzDashboard.performance.spec.tsx)
- [`packages/frontend/src/features/etb/ui/pages/__tests__/EtbPage.performance.spec.tsx`](/Users/rubeen/dev/personal/bluelight-hub/packages/frontend/src/features/etb/ui/pages/__tests__/EtbPage.performance.spec.tsx)
- [`packages/frontend/src/features/etb/ui/organisms/__tests__/EtbEntryList.performance.spec.tsx`](/Users/rubeen/dev/personal/bluelight-hub/packages/frontend/src/features/etb/ui/organisms/__tests__/EtbEntryList.performance.spec.tsx)
- [`packages/frontend/src/features/befehl/ui/organisms/__tests__/BefehlsListeMitEingabe.performance.spec.tsx`](/Users/rubeen/dev/personal/bluelight-hub/packages/frontend/src/features/befehl/ui/organisms/__tests__/BefehlsListeMitEingabe.performance.spec.tsx)

Zusätzlicher Bench-Pfad für lokale Diagnose:

- [`packages/frontend/src/test/performance/ring-2-performance.bench.tsx`](/Users/rubeen/dev/personal/bluelight-hub/packages/frontend/src/test/performance/ring-2-performance.bench.tsx)

## Lokale Diagnose vs. manueller Review

### Lokal im Repo

- Guardrail-Specs liefern die vertraglichen `30`-Lauf-Reports und brechen bei verfehlten Gates.
- Benchmarks liefern zusätzliche lokale Render-Baselines im offiziellen `vitest bench`-Flow.

### Weiterhin manuell zu prüfen

- echte Browserprofile in `Chrome`, `Edge`, `Safari` und `Firefox ESR`
- `200 %` Zoom gemäß [`ring-2-review-gates.md`](./ring-2-review-gates.md)
- reale Modulwechsel im Workspace unter Netzwerk- oder Datenlast
- visuelle Rückmeldung bei hardware- oder browserbedingten Abweichungen

## Abschluss-Kommandos

```bash
pnpm --filter @bluelight-hub/frontend exec vitest run src/test/performance/ring-2-performance.spec.ts src/features/einsatz/ui/organisms/__tests__/SingleEinsatzDashboard.performance.spec.tsx src/features/etb/ui/pages/__tests__/EtbPage.performance.spec.tsx src/features/etb/ui/organisms/__tests__/EtbEntryList.performance.spec.tsx src/features/befehl/ui/organisms/__tests__/BefehlsListeMitEingabe.performance.spec.tsx
pnpm --filter @bluelight-hub/frontend exec vitest bench src/test/performance/ring-2-performance.bench.tsx --outputJson /tmp/ring-2-performance-bench.json
pnpm --filter @bluelight-hub/frontend exec tsc --noEmit
pnpm --filter @bluelight-hub/frontend lint:check
```

## Verknüpfungen

- Das technische Fundament bleibt in [`workspace-fundament-ring-2.md`](./workspace-fundament-ring-2.md) beschrieben.
- Die Browser-, Zoom- und Assistive-Tech-Freigabe bleibt in [`ring-2-review-gates.md`](./ring-2-review-gates.md) beschrieben.
