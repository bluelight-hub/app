# ADR-014: `AuthModule` re-exportiert `KraefteInfrastructureModule` für Guard-Dependency-Resolution

## Status

Akzeptiert (2026-04-24) — schließt Action Item **A1** aus der Epic-1-Retro (`epic-1-retro-2026-04-22.md`) und **B2** aus der Epic-2-Retro (`epic-2-retro-2026-04-24.md`).

## Kontext

ADR-012 hat den `EinsatzScopeGuard` als Plattform-Pattern eingeführt. Der Guard hängt am Provider `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG`, den nur das `KraefteInfrastructureModule` exportiert. Weil NestJS Guard-Dependencies **im Modul-Kontext des Consumers** auflöst, muss jedes Consumer-Modul, das den Guard via `@UseGuards` einsetzt, **zwei Imports** zeichnen:

```typescript
// packages/backend/src/modules/eigenschutz/eigenschutz.module.ts (Status Quo)
@Module({
  imports: [AuthModule, KraefteInfrastructureModule, ...],
})
export class EigenschutzModule {}
```

Dieser Doppel-Import ist seit Story 1.3 (ADR-012) viermal in Folge repliziert worden:

| # | Consumer | Story | Anmerkung |
|---|---|---|---|
| 1 | `AuthModule` selbst | 1.3 | Original-Setup für den Guard |
| 2 | `EigenschutzModule` | 2.1 | Erster echter Consumer |
| 3 | Auth-internes Re-Through | 2.6 | Konsumiert über `EigenschutzRolleGuard` |
| 4 | (anstehend) `EigenschutzModule`-Erweiterung für PSA-Controller | 3.1 | Würde fünfter Replikat-Konsument werden |

A1 aus Epic-1-Retro hatte bereits drei kandidierende Auflösungen genannt:

1. **Status Quo:** Jedes Consumer-Modul importiert `AuthModule` **plus** `KraefteInfrastructureModule` mit klärendem Kommentar.
2. **Re-Export aus `AuthModule`:** `AuthModule` importiert `KraefteInfrastructureModule` und gibt es im `exports`-Array weiter, sodass Consumer nur `imports: [AuthModule]` brauchen.
3. **Dediziertes `EinsatzScopingPlatformModule`:** Eigenes Plattform-Modul, das `KraefteInfrastructureModule` + den Guard bündelt; Consumer importieren ausschließlich dieses Modul.

A1 ist über drei Iterationen unentschieden geblieben. Die Epic-2-Retro Section 3.2 hat den Punkt als **Critical Path vor Story 3.1** markiert (B2): „Plattform-Entscheidungen mit globalem Schatten verschleppen sich nicht von selbst."

### Verifizierte Rahmenbedingungen

- **Kein Circular-Dependency-Risiko:** `KraefteInfrastructureModule` (`packages/backend/src/infrastructure/kraefte/kraefte-infrastructure.module.ts`) importiert ausschließlich `PrismaModule` und greift weder auf `AuthModule` noch auf irgendein Guard-/Decorator-Artefakt zurück. Eine `grep -rn "AuthModule\|JwtAuthGuard\|JwtModule" packages/backend/src/infrastructure/kraefte/` liefert null Treffer (Stand 2026-04-24).
- **Guard-Provider-Sichtbarkeit:** `AuthModule` exportiert `EinsatzScopeGuard`, `EigenschutzRolleGuard` und `PermissionsGuard` bereits explizit (`packages/backend/src/modules/auth/auth.module.ts:82`). Die Repository-Provider müssen für den Guard im Consumer-Kontext sichtbar sein — **nicht** im Auth-Kontext (dort sind sie über den `imports`-Eintrag bereits aufgelöst).
- **Konsumenten-Horizont:** Epics 3–6 fügen voraussichtlich ≤ 6 weitere einsatz-scoped Controller hinzu (PSA, Sicherungsposten, Vorfälle, Dashboards, Telemetrie). Ein dediziertes Plattform-Modul für so wenige Consumer ist Overengineering ohne Mehrwert.

## Entscheidung

`AuthModule` nimmt `KraefteInfrastructureModule` in das `exports`-Array auf und reicht damit alle `KRAEFTE_REPOSITORIES.*`-Provider transitiv an Consumer weiter. Consumer-Module benötigen nur noch:

```typescript
@Module({
  imports: [AuthModule, /* domänen-spezifische Module */],
})
export class EigenschutzModule {}
```

### Konkrete Code-Änderung in `auth.module.ts`

```diff
   exports: [
     AuthService,
     JwtModule,
     AdminJwtAuthGuard,
     EinsatzScopeGuard,
     EigenschutzRolleGuard,
     PermissionsGuard,
+    // Re-Export für Consumer-Module, die den EinsatzScopeGuard via @UseGuards
+    // einsetzen (ADR-014). Stellt KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG
+    // im Consumer-Kontext bereit, ohne dass jedes Consumer-Modul den
+    // Repository-Container explizit importieren muss.
+    KraefteInfrastructureModule,
   ],
```

Der `imports: [..., KraefteInfrastructureModule]`-Eintrag in `AuthModule` bleibt unverändert; nur das `exports`-Array wird ergänzt.

### Migration der Bestands-Consumer

| Consumer | Aktion |
|---|---|
| `EigenschutzModule` | Direkt-Import von `KraefteInfrastructureModule` aus dem `imports`-Array entfernen, sobald `AuthModule` re-exportiert. |
| Tests | Module-Init-Tests, die explizit beide Module zeichnen, dürfen ihren Doppel-Import behalten — sie testen Modul-Setup, nicht Convenience. |
| Künftige Consumer (Stories 3.1+, 4.1+, 5.1+, 6.1+) | Ausschließlich `imports: [AuthModule]` zeichnen. |

Die Refaktorierung von `EigenschutzModule` ist **kein** Pflichtbestandteil dieser ADR — sie kann als Trivial-Patch im Rahmen der nächsten Story abfallen, ohne dass die Consumer-Verträge brechen (defensiver Doppel-Import bleibt funktional, NestJS dedupliziert automatisch).

## Konsequenzen

### Positiv

- **Single-Import-Konvention.** Story 3.1 startet mit klarem Pattern (`imports: [AuthModule]`). Kein fünfter Status-Quo-Replikat, keine erneute Diskussion bei Stories 4.1, 5.1, 6.1.
- **Schließt A1 final.** Drei Iterationen Unentschiedenheit werden in einem definierten Beschluss aufgelöst — die Plattform-Konvention ist ab jetzt verbindlich.
- **Senkt Cognitive Load für neue Consumer-Autoren.** Die Frage „Welche Module muss ich ziehen, um `EinsatzScopeGuard` zu bekommen?" hat eine 1-Wort-Antwort.
- **Bleibt im NestJS-Idiom.** `exports: [Module]` ist offizielles Re-Export-Pattern für transitive Provider-Sichtbarkeit. Keine Custom-DI-Mechanik, keine Magic.

### Negativ

- **Implizite Provider-Sichtbarkeit.** Consumer wissen nicht direkt, dass sie über `AuthModule` an `KRAEFTE_REPOSITORIES.*`-Provider kommen. Mitigation: `auth.module.ts`-Kommentar am `exports`-Eintrag zeigt auf diese ADR.
- **`AuthModule` wird zum „Sammelmodul".** Ist akzeptabel, weil es schon Plattform-Charakter trägt (drei Guards, JWT-Strategie, Admin-Bypass). Eine spätere Aufteilung ist möglich, sobald die Plattform-Funktionen deutlich auseinanderdriften — aktuell nicht absehbar.
- **Refaktorierung der Bestands-Consumer ist optional.** Doppel-Imports im Eigenschutz-Modul bleiben semantisch korrekt; nur Style-Drift gegenüber neuen Stories.

## Alternativen

### 1. Status Quo beibehalten (Doppel-Import in jedem Consumer)

Abgelehnt. Drei Iterationen sind genug Datenbasis: Jeder neue Consumer wiederholt denselben Modul-Boilerplate und denselben erklärenden Kommentar. Die Reibung skaliert linear mit der Zahl der einsatz-scoped Controller — wir steuern auf ≥ 6 weitere zu. Das ist kein gerechtfertigter Onboarding-Tribut.

### 2. Dediziertes `EinsatzScopingPlatformModule`

Abgelehnt. Würde aus den drei Guards + dem Repository-Re-Export ein eigenes Modul machen. Vorteile: thematisch sauber. Nachteile: erzeugt ein Modul ausschließlich für Re-Export-Zwecke, koppelt die Refactoring-Geschichte an den Move dreier bereits eingebürgerter Guard-Provider, und verlangt von **allen Consumern** einen weiteren Import (entweder `AuthModule` + `EinsatzScopingPlatformModule` oder eine neue Importkette mit `EinsatzScopingPlatformModule` als Auth-Bridge). Das skaliert in der Komplexität, nicht in der Klarheit. Bei < 10 Consumern reicht der Re-Export aus dem Plattform-Modul, das die Guards ohnehin bereitstellt.

### 3. `KraefteInfrastructureModule` zur globalen `@Global()`-Modul machen

Abgelehnt. `@Global()` versteckt die Modul-Abhängigkeit komplett und macht Modul-Init-Reihenfolge nicht-deterministisch. Wir wollen die Provider-Quelle explizit (im `imports: [AuthModule]`-Eintrag), nicht magisch.

### 4. Direkt-Provider in `AuthModule` eintragen statt Re-Export

Abgelehnt. Würde `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG` als zweiten Provider in `AuthModule` neu binden — das verstößt gegen die hexagonale Trennung („Domain-/Infrastructure-Repository wird einmalig in der Infrastructure-Schicht gebunden"). Re-Export ist die saubere Variante: ein `provide`-Punkt bleibt das `KraefteInfrastructureModule`.

## Umsetzungshinweise

- **Code-Diff** ist atomar (drei Zeilen `auth.module.ts:exports`, plus optionalem `eigenschutz.module.ts`-Cleanup). Kein Schema-Patch, keine Migration, keine Test-Änderungen Pflicht.
- **DI-Imports (CLAUDE.md AC1):** `KraefteInfrastructureModule` ist ein NestJS-Modul (Decorator-Class) — `import { KraefteInfrastructureModule } from '...'` ist bereits im `auth.module.ts` korrekt. Kein `import type` nötig.
- **Tests:** Falls Modul-Init-Tests für `AuthModule` existieren, prüfen, ob sie die `exports`-Liste assertieren — dann den neuen Eintrag ergänzen. Sicherheits-Halber: `pnpm --filter @bluelight-hub/backend check:di:imports` und `check:arch` müssen weiter clean bleiben.
- **Story-Bezug:** Wird vor `bmad-create-story` für Story 3.1 angewandt; der Story-Context referenziert dann ausschließlich diese ADR und das daraus abgeleitete Single-Import-Pattern.

## Referenzen

- [ADR-012: `EinsatzScopeGuard` als Plattform-Pattern](./adr-012-einsatz-scope-guard.md) — Original-Einführung des Guards, dort wurde die DI-Frage ursprünglich offen gelassen.
- [`packages/backend/src/modules/auth/auth.module.ts`](../../packages/backend/src/modules/auth/auth.module.ts) — Ziel-Datei der `exports`-Erweiterung.
- [`packages/backend/src/infrastructure/kraefte/kraefte-infrastructure.module.ts`](../../packages/backend/src/infrastructure/kraefte/kraefte-infrastructure.module.ts) — verifiziert ohne Auth-Module-Reverse-Dependency.
- [`packages/backend/src/modules/eigenschutz/eigenschutz.module.ts`](../../packages/backend/src/modules/eigenschutz/eigenschutz.module.ts) — Bestands-Consumer mit dokumentiertem Doppel-Import (Status Quo).
- [CLAUDE.md](../../CLAUDE.md) — Backend-DI-Import-Regel (AC1) und hexagonale Layering-Konvention.

> **Hinweis zu Planning-Quellen:** Detaillierte Architektur-/Epic-Dokumente liegen unter `_bmad-output/planning-artifacts/` als Workflow-Scratchpad und sind bewusst **nicht** im Repository versioniert. Für aktuelle Referenzen gelten ausschließlich die hier verlinkten versionierten Quellen (Schema, CLAUDE.md, andere ADRs).
