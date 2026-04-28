# ADR-012: `EinsatzScopeGuard` als Plattform-Pattern für einsatz-scoped Routen

## Status

Akzeptiert (2026-04-21)

## Kontext

Mit dem Eigenschutz-Epic (Issue #415) kommen mehrere einsatz-gebundene HTTP-Endpoints ins Backend (Gefährdungsbeurteilungen, PSA-Profile, Sicherungsposten, Vorfälle, Dashboards). Alle diese Routen liegen nach Plattform-Konvention unter `/api/einsaetze/:einsatzId/...`. Jeder Endpoint braucht dieselbe Vorprüfung: **„Ist der authentifizierte User aktuell Mitglied dieses Einsatzes (aktive `EinsatzRollenbesetzung`)?"**

Ohne ein gemeinsames Pattern würde jeder Controller-Handler diesen Check inline duplizieren — mit dem Risiko, dass jemand den Filter `freigegebenAm IS NULL` vergisst, den Join-Pfad halbiert oder den Security-Log pro Modul unterschiedlich implementiert (NFR-S7). Weiter verschärft: Die Q4-Revision des Rollen-/Permission-Modells (siehe `packages/backend/prisma/schema.prisma` → `EinsatzRollenbesetzung`) streicht jeden `EigenschutzRolle`-Enum und jede Schema-Änderung an `EinsatzRollenbesetzung` — das Rollen-Modell bleibt **unverändert**. Folglich darf der Guard die Membership **ausschließlich** über bestehende Felder (`rollenName`-Snapshot, `freigegebenAm`-Soft-Delete, `personId → EinsatzPerson.id`) ableiten.

Zusätzliche Rahmenbedingungen:

- Das Schema hat **keinen** direkten FK zwischen `User` und `EinsatzRollenbesetzung`. Der Join-Pfad ist dreistufig (`User.stammpersonId @unique → StammPerson.id ← EinsatzPerson.stammId ← EinsatzRollenbesetzung.personId`, siehe `packages/backend/prisma/schema.prisma` → Modelle `User`, `EinsatzPerson`, `EinsatzRollenbesetzung`).
- Eigenschutz-spezifische Rollen-Matches (Präfix `^Eigenschutz: `) sind **NICHT** Teil dieser Plattform-Funktion, sondern Aufgabe des nachgelagerten `EigenschutzRolleGuard` aus Story 1.5.
- Die `User.permissions` liegen im Schema als JSON-String vor (`String? @db.Text`, siehe `packages/backend/prisma/schema.prisma` → Modell `User`). Der Guard muss JSON-Parse-Robustheit liefern, weil fehlerhafte Persistierung existiert.

Drei kandidierende Lösungen:

1. **Inline-Check im Controller** — jeder Handler ruft ein kleines `assertEinsatzMember(userId, einsatzId)`-Helper. Einfach, aber dupliziert den Security-Log und macht Abweichungen möglich.
2. **Express-Middleware** — greift vor NestJS-DI, hat keinen Zugang zu `Reflector`/Decorator-Metadata und keinen sauberen Zugriff auf `@Inject`-Ports. Unklare Integration mit `JwtAuthGuard` und DX-unfreundlich.
3. **Dedizierter `EinsatzMembershipService`, in jedem Controller-Handler manuell aufgerufen** — klare Schichtung, aber das Aufruf-Pattern muss weiter in jedem Handler wiederholt werden; das Vergessen-Risiko bleibt.

## Entscheidung

Wir führen einen Plattform-`EinsatzScopeGuard` ein (`packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts`) und platzieren ihn als **einheitliches Membership-Gate** in der Guard-Kette jedes einsatz-gebundenen Controllers:

```text
JwtAuthGuard  →  EinsatzScopeGuard  →  [EigenschutzRolleGuard | PermissionsGuard]
   (Auth)         (Membership)            (Rollen-Match)   (Permission-Flag)
```

Die drei Guard-Schichten sind **orthogonal** und gemeinsam einsetzbar:

- **`JwtAuthGuard`** — bestätigt die Authentizität des Users (bereits existiert).
- **`EinsatzScopeGuard`** — bestätigt die **Membership**: User ist in diesem Einsatz aktiv besetzt.
- **`EigenschutzRolleGuard`** (Story 1.5) — bestätigt einen konkreten Rollen-Präfix-Match, z. B. `Eigenschutz: Sicherheitsbeauftragter`.
- **`PermissionsGuard`** (Story 1.5) — bestätigt ein globales Permission-Flag (z. B. `eigenschutz:psa:write`).

### Architektur-Platzierung

Die Plattform-Schichtung bleibt strikt hexagonal (CLAUDE.md):

- **Domain** (`packages/backend/src/domain/kraefte/repositories/i-rollen-besetzung.repository.ts`) — Port wird um eine neue Methode `findActiveByUserIdAndEinsatzId(userId, einsatzId)` erweitert. Die Methode liefert `Result<RollenBesetzung[]>`; der Guard konsumiert via `Result.isFailure`.
- **Infrastructure** (`packages/backend/src/infrastructure/kraefte/repositories/prisma-rollen-besetzung.repository.ts`) — Prisma-Adapter mit dem 3-stufigen Join-Filter. Keine weiteren Infrastruktur-Änderungen; `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG` existierte bereits in `packages/backend/src/infrastructure/di-tokens.ts`.
- **Modules** (`packages/backend/src/modules/auth/`) — der Guard selbst plus der Begleit-Decorator `@EinsatzParam` und das Request-Context-Interface `EinsatzRequestContext`. Der Guard ist Plattform-Feature und gehört bewusst nicht in ein Eigenschutz-Modul (Parallele zu ADR-011: `PushSubscription` lag unter `modules/push-notifications/`, nicht unter `modules/eigenschutz/`).

### Join-Pfad User ↔ Einsatz

Der Guard delegiert den Membership-Check komplett an das Repository. Prisma-Query-Form im Adapter:

```ts
client.einsatzRollenbesetzung.findMany({
  where: {
    einsatzId,
    freigegebenAm: null,                  // Soft-Delete-Filter
    person: {                             // EinsatzPerson
      stamm: {                            // StammPerson (EinsatzPerson.stammId optional!)
        userAccount: { id: userId },      // User.stammpersonId @unique → StammPerson.id
      },
    },
  },
});
```

**Aktiv bedeutet:** `freigegebenAm IS NULL`. Das Schema hat **kein** `gueltigBis`-Feld — die Architecture-Formulierung „aktiv, nicht-abgelaufen" ist sprachlich, die einzige technische Quelle bleibt der `freigegebenAm`-Soft-Delete.

### `@EinsatzParam`-Decorator

Routen-Shapes weichen selten vom Default `:einsatzId` ab, aber für Bestands-Endpoints (z. B. `:id`) muss der Guard den Parameter-Namen lesen können. Deshalb:

```ts
// packages/backend/src/modules/auth/decorators/einsatz-param.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const EINSATZ_PARAM_KEY = 'einsatzParam';
export const EinsatzParam = (paramName: string) => SetMetadata(EINSATZ_PARAM_KEY, paramName);
```

Der Guard liest über `Reflector.getAllAndOverride<string>(EINSATZ_PARAM_KEY, [handler, class])` und fällt auf `'einsatzId'` zurück. **Kein** `createParamDecorator` — der Decorator injiziert keinen Wert, sondern setzt nur Metadata. Das Pattern entspricht `@RequiresOperativeRole` (`operative-roles.decorator.ts`) und ist sowohl auf Handler- als auch auf Controller-Klassen-Ebene anwendbar.

### Request-Augmentation: `EinsatzRequestContext`

Nach erfolgreichem Guard-Pass hängt der Guard einen schlanken Kontext an den Request:

```ts
// packages/backend/src/modules/auth/interfaces/einsatz-request-context.ts
export interface EinsatzRequestContext {
  einsatzId: string;
  einsatzRollenNamen: string[];   // dedupliziert, Snapshot-Feld
  einsatzPermissions: string[];   // globale User-Permissions, robust geparsed
}

declare global {
  namespace Express {
    interface Request {
      einsatzContext?: EinsatzRequestContext;
    }
  }
}
export {};
```

**Bewusst nicht im `ValidatedUser` / JWT-Payload** (AC2): Die Permissions bleiben Guard-lokal pro Request. Das hält den JWT klein, vermeidet Re-Issues bei Permission-Änderungen und isoliert einsatz-bezogene Daten pro Request-Lifecycle.

### Fail-Fast bei falsch verdrahteten Routen

Wenn der Pfad-Parameter fehlt (Dev-Fehler: Guard gesetzt, aber `:einsatzId` nicht im Route-Pfad), wirft der Guard beim ersten Request eine `InternalServerErrorException` mit DX-Message:

```text
EinsatzScopeGuard: Pfad-Parameter 'einsatzId' fehlt auf Route 'GET /einsaetze/foo'.
Entweder Route um :einsatzId ergänzen oder passenden @EinsatzParam setzen.
```

**500, nicht 403** — weil das ein Programmier-Fehler ist, kein Autorisierungs-Fehler. Eine optionale Eager-Validation über `OnApplicationBootstrap` + `DiscoveryService` ist **nicht** Pflicht dieser Story und mit einem `TODO(story-future)`-Kommentar markiert; Lazy genügt bis die Route-Matrix groß genug wird, dass Smoke-Tests das zu spät aufdecken.

### Fehlerpfade (403)

Unifier 403-Exit bei folgenden Fällen (AC3, AC6):

| Fall | `reason` im Security-Log |
| --- | --- |
| Keine aktive Rollenbesetzung für `(userId, einsatzId)` | `no-active-rollenbesetzung` |
| Alle Besetzungen haben `freigegebenAm IS NOT NULL` | `no-active-rollenbesetzung` (identisch) |
| `User.stammpersonId = null` | `user-without-stammperson` |
| User zwischen JWT-Ausstellung und Request gelöscht/gelockt (`AuthService.findUserById` wirft `NotFoundException`) | `user-not-found` |
| Ungültige / unbekannte `einsatzId` (leer, nicht-CUID) | `no-active-rollenbesetzung` — ununterscheidbar, keine Enumeration-Vuln |

Das Response-Body ist in allen Fällen identisch:

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Kein Zugriff auf diesen Einsatz",
  "suggestedAction": "Zurück zum Überblick"
}
```

Der Security-Log enthält ausschließlich `{userId, einsatzId, reason}` — **niemals** PII-Snapshots (`personVorname`, `personNachname`), Rollen-Namen oder Permission-Inhalte (NFR-S7).

### Beispiel-Einbindung (für Consumer-Stories)

**Standard-Fall** (Default-Param `:einsatzId`):

```ts
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz/psa-profile', version: '1' })
@UseGuards(JwtAuthGuard, EinsatzScopeGuard)
export class PsaProfilController {
  @Post('bulk-change')
  @RequiresEigenschutzRolle('Eigenschutz: Sicherheitsbeauftragter')
  @UseGuards(EigenschutzRolleGuard) // Story 1.5 — läuft NACH EinsatzScopeGuard
  async changePsaProfil(@Param('einsatzId') einsatzId: string, @Req() req: Request) {
    const { einsatzRollenNamen, einsatzPermissions } = req.einsatzContext!;
    // einsatzRollenNamen z. B. ['Eigenschutz: Sicherheitsbeauftragter']
    // einsatzPermissions z. B. ['eigenschutz:psa:write']
    // ...
  }
}
```

**Legacy-/Bestands-Route mit abweichendem Param-Namen**:

```ts
@Get(':id/detail')
@EinsatzParam('id')
@UseGuards(JwtAuthGuard, EinsatzScopeGuard)
async detail(@Param('id') id: string) { /* ... */ }
```

## Konsequenzen

### Positiv

- **Zentrales Membership-Gate.** Kein Controller-Handler muss den 3-stufigen Join oder den `freigegebenAm`-Filter selbst implementieren. Sicherheits-Bugs durch vergessene Filter werden strukturell verhindert.
- **Orthogonales Guard-Stacking.** `EinsatzScopeGuard` kennt weder Eigenschutz-Rollen noch Permissions — das hält das Pattern für künftige, nicht-eigenschutz-bezogene einsatz-scoped Module nutzbar (z. B. Dashboards, Vorfall-Export).
- **Snapshot-Rollen + globale Permissions im Request-Kontext.** Nachgelagerte Guards und Controller-Handler lesen ohne zusätzlichen DB-Roundtrip, was Permission- und Rollen-Checks O(1) macht.
- **DX durch klaren Fail-Fast.** Vergessener `:einsatzId`-Parameter führt zu einer präzisen 500-Message mit Hinweis auf die Fehlerquelle — keine „Guard verhält sich seltsam"-Suche.
- **Plattform-Konvention zementiert.** Die ADR dokumentiert verbindlich, dass einsatz-gebundene Routen unter `/api/einsaetze/:einsatzId/...` liegen müssen, damit der Guard zieht (Memory `feedback_route_nesting`).

### Negativ

- **Zwei DB-Queries pro Request.** Der Guard ruft `AuthService.findUserById` **und** `findActiveByUserIdAndEinsatzId`. Für ultra-latenz-sensitive Endpoints kann das relevant werden; ein späterer Request-Scope-Cache ist möglich, aber für die MVP-Route-Matrix überdimensioniert.
- **Kein Request-Scope-Cache.** Bei mehreren einsatz-scoped Handlers in einer Middleware-Kette führt jeder Guard-Hit zu neuen Queries. Akzeptiert für den aktuellen Design-Horizont; eine `@scope(REQUEST)`-Einführung wäre eine separate Plattform-Story.
- **Koppelt `AuthModule` an `KraefteInfrastructureModule`.** Das ist eine neue (aber saubere) Abhängigkeit. Kein Circular-Dep-Risiko, weil `KraefteInfrastructureModule` nichts aus Auth importiert.
- **Permissions-Parse-Robustheit muss diszipliniert bleiben.** Der Guard toleriert fehlerhafte JSON-Payloads mit `[]` + Warn-Log. Das maskiert Persistierungs-Bugs — ein lauter Fehler wäre strenger, würde aber bei einer einzigen Fehleingabe ganze Einsätze blockieren. Wir priorisieren Verfügbarkeit über Strenge, mit Log-Signal für Wartung.

## Alternativen

### 1. Inline-Check im Controller (`assertEinsatzMember`-Helper)

Abgelehnt. Jedes Modul würde den Security-Log unterschiedlich formatieren, der Filter `freigegebenAm IS NULL` könnte lokal vergessen werden, und ein Parameter-Namens-Override (`:id`-Routen) müsste in jedem Handler einzeln aufgelöst werden. Keine strukturelle Garantie.

### 2. Express-Middleware statt Guard

Abgelehnt. Middleware läuft vor der NestJS-DI, hat keinen sauberen Zugriff auf `Reflector`/Decorator-Metadata und kein Standard-Interface für `Forbidden`/`InternalServerError`-Responses. Die Integration mit `JwtAuthGuard` (der ebenfalls ein Guard ist) wäre wackelig — NestJS sieht Middleware und Guards als zwei getrennte Lifecycle-Stufen.

### 3. Dedizierter `EinsatzMembershipService`, in jedem Handler manuell aufgerufen

Abgelehnt. Saubere Schichtung, aber das Aufruf-Pattern muss in jedem Handler wiederholt werden. Der Kernnutzen eines zentralen Guards (`@UseGuards` → einmaliger Decorator, kein manueller Aufruf, verbindlich durch Guard-Kette) geht verloren. Wird zum impliziten „Muss man immer in der ersten Zeile des Handlers schreiben" — fragil.

### 4. Schema-Erweiterung mit `EigenschutzRolle`-Enum oder `gueltigBis`-Feld

Abgelehnt durch Q4-Revision des Rollen-/Permission-Modells. Kein Prisma-Enum `EigenschutzRolle`, keine neue Spalte an `EinsatzRollenbesetzung`. Der Guard arbeitet ausschließlich mit Bestandsfeldern.

## Umsetzungshinweise

- **Keine Prisma-Migration.** Q4-Revision hält das Schema unverändert — `EinsatzRollenbesetzung` wird nicht ergänzt.
- **DI-Imports:** `AuthService`, `Reflector`, der Repository-Token sind `@Injectable()`/DI-Bindings und müssen mit `import { … }` (nicht `import type`) importiert werden (CLAUDE.md AC1, Pre-Commit `check:di:imports`). Nur reine Typen (`ValidatedUser`, `Request`, `EinsatzRequestContext`, `IRollenBesetzungRepository` als Interface) dürfen `import type` nutzen.
- **AuthModule-Setup:** `KraefteInfrastructureModule` wird in `packages/backend/src/modules/auth/auth.module.ts` importiert, damit `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG` für den Guard auflösbar ist. Der Guard selbst ist als Provider **und** Export eingetragen, damit spätere Module (Eigenschutz aus Story 1.5+) ihn ohne Re-Provisioning nutzen können. **Kein `APP_GUARD`** — der Guard wird gezielt pro Controller via `@UseGuards` eingesetzt.
- **Security-Log (NFR-S7):** Ausschließlich strukturierte `logger.warn`-Aufrufe mit knappen Kontext-Objekten (`{userId, einsatzId, reason}`). **Niemals** PII-Snapshots oder Permission-Inhalte loggen.
- **Tests:** Unit-Tests decken die 9 AC7-Szenarien (a–i) plus Defense-in-Depth-Pfade ab. Ausführung gemäß MEMORY.md: `cd packages/backend && npx jest --testPathPatterns="einsatz-scope|einsatz-param|rollen-besetzung" --no-coverage` — **nicht** `pnpm --filter … -- --testPathPattern …` (Args-Pipe-Bug).
- **Event-Registry:** Nicht relevant. Der Guard publiziert keine Domain-Events.
- **Frontend-Relevanz:** Keine. Der Guard ist reines Backend-Pattern; der generierte Shared-Client (`pnpm run generate-api`) wird nicht berührt.

## Referenzen

- [ADR-006: WebSocket Event Bus einsatz-scoped](./adr-006-websocket-event-bus-einsatz-scoped.md) — vergleichbarer „einsatz-scoped"-Plattform-Boundary
- [ADR-011: Plattform-Push-Notifications via VAPID + web-push](./adr-011-plattform-push-notifications.md) — Format-Vorlage, ebenso Plattform-getriebener Spillover aus Eigenschutz-Epic
- [`packages/backend/prisma/schema.prisma`](../../packages/backend/prisma/schema.prisma) — Modelle `User` (`stammpersonId @unique`, `permissions String? @db.Text`), `EinsatzPerson` (`stammId`), `EinsatzRollenbesetzung` (`rollenName`-Snapshot + `freigegebenAm`)
- [CLAUDE.md](../../CLAUDE.md) — Backend DI Import (AC1): `import type`-Verbot für Injectable-Klassen; Plattform-Konvention: Einsatz-scoped HTTP-Endpoints liegen unter `/api/einsaetze/:einsatzId/...`

> **Hinweis zu Planning-Quellen:** Die detaillierten Architektur-/Epic-Dokumente liegen unter `_bmad-output/planning-artifacts/` als Workflow-Scratchpad und sind bewusst **nicht** im Repository versioniert. Für aktuelle Referenzen gelten ausschließlich die hier verlinkten versionierten Quellen (Schema, CLAUDE.md, andere ADRs).

---

## Append 2026-04-28: Eigenschutz-Rollen-Schicht entfernt

`EinsatzScopeGuard` selbst bleibt **unverändert** Plattform-Pattern. Die nachgelagerte `EigenschutzRolleGuard`-Schicht aus Story 1.5 wurde aus dem Codebase entfernt — Domain-Enum `EigenschutzRolle`, Decorator `@RequiresEigenschutzRolle`, Guard `EigenschutzRolleGuard` und die zugehörige 403-Body-Konstante existieren nicht mehr. Permission-Guard (`PermissionsGuard` + `@RequiresPermission`) ist die einzige verbleibende Autorisierungsschicht für Eigenschutz-Endpoints.

Auswirkung auf diese ADR:

- Verweise im Body auf `[EigenschutzRolleGuard | PermissionsGuard]` als nachgelagerte Guards lesen sich jetzt als „nur `PermissionsGuard`".
- Erwähnungen der Vier-Schicht-Kette (Section „Architektur-Platzierung", Code-Beispiele) gelten als historisch; produktive Soll-Kette ist `JwtAuthGuard → EinsatzScopeGuard → PermissionsGuard`.
- Die ADR-Entscheidung „kein Prisma-Enum `EigenschutzRolle`, keine Schema-Änderung an `EinsatzRollenbesetzung`" bleibt durch den Refactor weiter bestätigt.

Begründung: doppelte Autorisierung (Rolle + Permission) erzeugte Pflege-Aufwand und User-facing-Verwirrung beim 403-Mapping; Permissions sind Source of Truth.
