# Eigenschutz-Permissions-Status — Audit Epic 2

**Stand:** 2026-04-24
**Geltungsbereich:** Branch `415-eigenschutz-einsatzkraefte-sicherheit-psa`, Eigenschutz-Feature-Slice (Issue #415)
**Auslöser:** Action Item **B1** der Epic-2-Retrospektive (`_bmad-output/implementation-artifacts/epic-2-retro-2026-04-24.md` Section 3.1) — „Guards/Permissions — Late-Discovery (Hauptschmerz)".
**Charakter:** **Status-Doc, kein Plan.** Beschreibt den **Ist-Zustand** der Guard- und Permissions-Verkabelung am Ende von Epic 2 plus die verbindliche **Soll-Konvention** für Stories 3.1+. Nicht-trivialen Retrofit der Bestands-Endpunkte regelt eine separate Story (Vorschlag siehe Section 5).

---

## 1. Drei-Schichten-Architektur (Soll)

```
JwtAuthGuard  →  EinsatzScopeGuard  →  EigenschutzRolleGuard  +  PermissionsGuard
   (Auth)         (Membership)            (Rollen-Match)         (Permission-Flag)
```

Die vier Schichten sind **orthogonal** und gemeinsam einsetzbar (ADR-012 Section „Architektur-Platzierung"). Konkret bedeutet das:

| Schicht | Quelle | Datenbasis | Block-Verhalten |
|---|---|---|---|
| `JwtAuthGuard` | bestehend (`packages/backend/src/modules/auth/guards/jwt-auth.guard.ts`) | `Authorization: Bearer …` JWT | 401, wenn Token fehlt/ungültig |
| `EinsatzScopeGuard` (ADR-012) | `packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts` | aktive `EinsatzRollenbesetzung` (`freigegebenAm IS NULL`) | 403, wenn keine aktive Besetzung; 500 bei fehlendem `:einsatzId` |
| `EigenschutzRolleGuard` (Story 1.5) | `packages/backend/src/modules/auth/guards/eigenschutz-rolle.guard.ts` | `request.einsatzContext.einsatzRollenNamen` (Snapshot mit `Eigenschutz: `-Präfix) | 403 mit `InsufficientRole`-Body, wenn keine erforderliche Eigenschutz-Rolle |
| `PermissionsGuard` (Story 1.5) | `packages/backend/src/modules/auth/guards/permissions.guard.ts` | `request.einsatzContext.einsatzPermissions` (User-Permissions JSON-Array) | 403 mit `InsufficientPermission`-Body, wenn Flag fehlt |

Der `EinsatzScopeGuard` füllt nach erfolgreichem Pass das `request.einsatzContext` mit `einsatzId`, `einsatzRollenNamen[]` und `einsatzPermissions[]`. Beide nachgelagerten Guards lesen rein aus diesem Kontext (kein zusätzlicher DB-Query).

ADMIN-Bypass: `validatedUser.role ∈ {ADMIN, SUPER_ADMIN}` short-circuited sowohl `EigenschutzRolleGuard` als auch `PermissionsGuard` (`logger.debug` mit `reason: 'admin-bypass'` statt `warn`).

---

## 2. Ist-Zustand pro Controller

| Controller | Datei | `@UseGuards`-Kette | `@RequiresEigenschutzRolle` | `@RequiresPermission` |
|---|---|---|---|---|
| `EigenschutzHealthController` | `packages/backend/src/modules/eigenschutz/controllers/eigenschutz-health.controller.ts` | `JwtAuthGuard` | – | – |
| `GefaehrdungsbeurteilungController` | `packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts` | **nur `JwtAuthGuard`** | – | – |
| `SicherheitsregelController` | `packages/backend/src/modules/eigenschutz/controllers/sicherheitsregel.controller.ts` | `JwtAuthGuard, EinsatzScopeGuard` | – | – |

Belege: `grep -rn "RequiresEigenschutzRolle\|RequiresPermission" packages/backend/src/modules/eigenschutz/` liefert null Treffer (Stand 2026-04-24). Beide Decorators sind in `packages/backend/src/modules/auth/decorators/` definiert, aber nirgends konsumiert.

### 2.1 Was tatsächlich heute schützt

| Endpoint-Klasse | Effektive Schutzschicht | Begründung |
|---|---|---|
| Health-Check | Authentifizierung | bewusst öffentlich für angemeldete User; kein Einsatz-Bezug |
| Gefährdungsbeurteilungs-Lese-/Schreib-Endpoints (Stories 2.1–2.5) | nur Authentifizierung + Repository-`einsatzId`-Filter im Handler | Keine Membership-Prüfung am Edge — Cross-Einsatz-Trennung hängt rein an den `WHERE einsatzId = ?`-Klauseln in jedem Handler/Repository |
| Sicherheitsregel-Lese-/Schreib-Endpoints (Stories 2.6) | Authentifizierung + Membership (aktive `EinsatzRollenbesetzung`) | Keine Rollen- oder Permission-Differenzierung — jeder Einsatz-Mitglied darf alles |
| Sicherheitsregel-Quittungs-Endpoint (Story 2.7) | Authentifizierung + Membership + Business-Rule-Check (`UnzulaessigeEinheitenZuordnung`) im Handler | Caller-Authorization, dass User Mitglied der konkreten `einheitId` ist, läuft als Domain-Invariante in `AckSicherheitsregelHandler`, nicht als Guard |

### 2.2 Drei Ist-Zustand-Risiken (in absteigender Severity)

#### Risiko **R1**: `GefaehrdungsbeurteilungController` ohne `EinsatzScopeGuard`

**Severity:** Hoch.
**Symptom:** Cross-Einsatz-Trennung hängt allein an Repository-`einsatzId`-Filtern. Vergisst ein neuer Handler in einer späteren Story den `WHERE einsatzId = ?`-Filter, leaken Daten anderer Einsätze.
**Aktuelle Mitigation:** Alle bestehenden Handler (`CreateGefaehrdungsbeurteilungHandler`, `UpdateGefaehrdungsbeurteilungItemsHandler`, `Get*Query`-Handler, `ListGefaehrdungsbeurteilungenQuery`-Handler) führen den Cross-Einsatz-Check defensiv im Use-Case-Code. Reviews aus Stories 2.1–2.5 haben das wiederholt validiert.
**Echtes Loch:** Es gibt **keine strukturelle Garantie** — der nächste Handler kann den Filter unbeabsichtigt weglassen, ohne dass eine Test-Suite das automatisch fängt.
**Empfehlung:** Retrofit `@UseGuards(JwtAuthGuard, EinsatzScopeGuard)` als eigenständige Bug-Fix-Story (siehe Section 5, Vorschlag P1).

#### Risiko **R2**: `EigenschutzRolleGuard` + `PermissionsGuard` produktiv ungenutzt

**Severity:** Mittel.
**Symptom:** Beide Guards sind in `AuthModule.providers` und `AuthModule.exports` registriert (`auth.module.ts:78–82`), aber kein Controller setzt sie ein. Damit gilt im aktuellen Stand: **Jeder Einsatz-Member darf alle Eigenschutz-Aktionen ausführen**, sofern er die Membership-Hürde passiert (oder im Fall der Gefährdungsbeurteilung: nur den JWT-Hürde).
**Konsequenz:** FR45 (Permission-basierte Zugriffskontrolle) und FR46 (Rollen-Differenzierung Sicherheitsbeauftragter ≠ Einheitsführer) sind im Code **noch nicht aktiv**. Die UI in `packages/frontend/src/features/eigenschutz/` zeigt UI-Elemente bedingungslos an oder verlässt sich auf clientseitige Permissions-Gates (`useEigenschutzPermissions` ist in Story 2.5/2.6 zurückgenommen worden — Comment `sicherheitsregel.controller.ts:78`).
**Mitigation heute:** Stories 2.6/2.7 prüfen Caller-Authorization über fachliche Domain-Invarianten. Z. B. wirft `AckSicherheitsregelHandler` `UnzulaessigeEinheitenZuordnung`, wenn der Quittierer nicht zur Einheit gehört — das ersetzt den `PermissionsGuard` semantisch, aber an einer anderen Schicht.

#### Risiko **R3**: Permissions-Layer und Business-Rule-Layer driften

**Severity:** Niedrig (heute), aber wachsend.
**Symptom:** Die zwei Welten — globale `User.permissions` (z. B. `eigenschutz:sicherheitsregel:write`) und einsatz-spezifische `EinsatzRollenbesetzung`-Snapshots — werden inkonsistent angewandt. Ein User kann global `eigenschutz:psa:write` haben, aber im konkreten Einsatz nur als `Eigenschutz: Einheitsführer` besetzt sein — wer entscheidet, ob er einen PSA-Profil-Wechsel auf eine fremde Einheit machen darf?
**Aktueller Zustand:** Dieser Konflikt ist **nicht aufgetreten**, weil Stories 2.6/2.7 die Permissions-Schicht ausgelassen haben. Wird er in Story 3.2 (Bulk-PSA) zum ersten Mal scharf, weil Sicherheitsbeauftragter eine fremde Einheit umsetzt — diese Cross-Einheit-Aktion erzwingt eine klare Hierarchie zwischen Rollen-Match und Permission-Flag.

---

## 3. Soll-Konvention für Stories 3.1+ (verbindlich)

Stories 3.1+ verkabeln die volle Vier-Schicht-Kette **am Edge**, bevor sie Domain-Invarianten anhängen. Konkretes Copy-Paste-Pattern:

### 3.1 Standard-Edge-Endpoint mit Mutation

```typescript
@Post('einheiten/:einheitId/psa-profil')
@RequiresEigenschutzRolle('Sicherheitsbeauftragter')
@RequiresPermission('eigenschutz:psa:write')
@UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard, PermissionsGuard)
async setPsaProfil(...) { /* ... */ }
```

**Reihenfolge in `@UseGuards(...)` ist verbindlich** — die nachgelagerten Guards (`EigenschutzRolleGuard`, `PermissionsGuard`) lesen `request.einsatzContext`, das ausschließlich `EinsatzScopeGuard` setzt. Eine andere Reihenfolge wirft `InternalServerErrorException` (Fail-Fast, AC5 aus Story 1.5).

### 3.2 Read-Only-Endpoint

```typescript
@Get('einheiten/:einheitId/psa-profil')
@RequiresPermission('eigenschutz:psa:read')
@UseGuards(JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard)
async getPsaProfil(...) { /* ... */ }
```

Lesen erfordert in der Regel kein Rollen-Match — nur ein Permission-Flag. `@RequiresEigenschutzRolle` darf weggelassen werden (kein Decorator → `EigenschutzRolleGuard` Pass-Through).

### 3.3 Klassen-Level-Default + Handler-Override

```typescript
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz/psa-profile', version: 'alpha' })
@UseGuards(JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard)
@RequiresPermission('eigenschutz:psa:read')
export class PsaProfilController {
  // Erbt automatisch read-Permission

  @Post(':id')
  @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
  @RequiresPermission('eigenschutz:psa:write') // Override für diesen Handler
  @UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard, PermissionsGuard)
  async update(...) { /* ... */ }
}
```

### 3.4 Wann `@RequiresEigenschutzRolle` zwingend ist

`@RequiresEigenschutzRolle` ist **zwingend** für Endpunkte, die in den **fachlichen Verantwortungsbereich des Sicherheitsbeauftragten** fallen — also Aktionen, die laut Q4-Rollen-/Permissions-Modell exklusiv dieser Rolle vorbehalten sind. Konkret aus dem Architecture-Dokument §B10 Z. 699–706 und FR44–FR47:

| Endpoint-Klasse | Rolle (Short-Form) | Permission |
|---|---|---|
| Gefährdungsbeurteilung erstellen/aktualisieren | `Sicherheitsbeauftragter` | `eigenschutz:gefaehrdungsbeurteilung:write` |
| Sicherheitsregel anlegen/aktualisieren | `Sicherheitsbeauftragter`, optional `Abschnittsleiter` | `eigenschutz:sicherheitsregel:write` |
| PSA-Profil ändern (Stories 3.1, 3.2) | `Sicherheitsbeauftragter` | `eigenschutz:psa:write` |
| Sicherungsposten anlegen (Story 4.1) | `Sicherheitsbeauftragter` | `eigenschutz:sicherungsposten:write` |
| Vorfall melden (Story 5.1) | – (jeder Einsatz-Member) | `eigenschutz:vorfall:report` |
| Vorfall exportieren (Story 5.4/5.5) | `Nachbereitung`, `Sicherheitsbeauftragter` | `eigenschutz:vorfall:export` |
| Sicherheitsregel quittieren (Story 2.7) | `Einheitsführer` der Ziel-Einheit | `eigenschutz:sicherheitsregel:acknowledge` |

`@RequiresEigenschutzRolle` darf **weglassen werden** für reine Read-Endpoints und für Aktionen, die jeder Einsatz-Member ausführen darf (z. B. eigene Vorfallsmeldung).

### 3.5 Wann Domain-Invariante zusätzlich nötig ist

`PermissionsGuard` prüft das **globale** Flag des Users; er weiß nichts über Einheits-Zugehörigkeit innerhalb des Einsatzes. Sobald eine Aktion **einheits-spezifisch** ist (z. B. „nur eigene Einheit darf quittieren", „nur eigene Einheit darf PSA-Lücken melden"), ist eine **Domain-Invariante im Handler** zusätzlich Pflicht. Das ersetzt den Guard nicht, sondern ergänzt ihn:

```typescript
// im Handler:
if (caller.einheitId !== command.einheitId) {
  return Result.fail('BusinessRule:UnzulaessigeEinheitenZuordnung');
}
```

**Diese Pattern-Doppelung ist erwartet, nicht redundant.** Die Guard-Schicht macht „Du darfst grundsätzlich PSA bearbeiten"; die Domain-Invariante macht „aber nicht für eine andere Einheit". Story 2.7 hat das Pattern bereits etabliert.

---

## 4. Bekannte Lücken (Gap-Liste)

| Lücke | Schweregrad | Mitigation heute | Schließt durch |
|---|---|---|---|
| `GefaehrdungsbeurteilungController` ohne `EinsatzScopeGuard` (R1) | Hoch | Repository-`einsatzId`-Filter in jedem Handler | Trivial-Patch-Story (Section 5, Vorschlag P1) |
| Kein `PermissionsGuard` an Eigenschutz-Endpoints (R2) | Mittel | UI verbirgt Aktionen rolle-basiert (clientseitig), aber Backend setzt nichts durch | Stories 3.1+ verkabeln die Vier-Schicht-Kette **direkt** mit ihrem Schnitt; Bestands-Endpunkte aus Epic 2 retrofittet eigene Plattform-Story (P2) |
| Kein `EigenschutzRolleGuard` an Eigenschutz-Schreib-Endpoints (R2) | Mittel | UI verbirgt Aktionen rolle-basiert; Backend prüft nichts | wie R2 |
| Wildcard-Match (`eigenschutz:*`) nicht implementiert (Out-of-Scope laut `permissions.guard.ts:50–51`) | Niedrig | Alle Permissions sind explizit gelistet | bleibt Out-of-Scope; bewusste Design-Entscheidung |
| `User.permissions` JSON-Persistierung kann theoretisch Drift produzieren | Niedrig | `EinsatzScopeGuard.parsePermissions` toleriert Garbage mit `[]` + Warn-Log (`einsatz-scope.guard.ts:57–73`) | langfristig: typed Column oder Constraint; nicht MVP-blockierend |
| `propagationGroupId`-Permission-Konsequenz | Niedrig | Story 2.6/2.7 nutzen `propagationGroupId` als Event-Payload-Feld (kein FK, kein Index) | Action Item B5 — Architect-Agent vor Story 3.2 |
| Re-Wire (Story 2.3 / 2.6) erzeugt neue Rows mit neuen IDs — Permission-Snapshot bleibt am Caller, nicht an der Row | Niedrig | Bestätigt durch Re-Wire-Tests in Story 2.6 | Pattern dokumentiert |

---

## 5. Empfohlene Folge-Stories (außerhalb dieser Doku)

Die folgenden Stories sind **Empfehlungen**, nicht Bestandteil dieses Audits. Sie kommen in den Backlog, sobald der Sprint-Planner sie aufnimmt.

### Vorschlag **P1**: Bug-Fix-Story „GefaehrdungsbeurteilungController um EinsatzScopeGuard ergänzen"

- **Scope:** `@UseGuards(JwtAuthGuard, EinsatzScopeGuard)` an `GefaehrdungsbeurteilungController` ergänzen, plus `@ApiForbiddenResponse`-Doku-Update.
- **Aufwand:** ≤ ½ Tag inkl. Tests.
- **Risiko-Reduktion:** Strukturelle Garantie gegen vergessene `einsatzId`-Filter in zukünftigen Handlern.
- **Timing-Empfehlung:** Vor oder parallel zu Story 3.1 — nicht blockierend.

### Vorschlag **P2**: Plattform-Story „Permissions-Schicht für Eigenschutz-Endpunkte aktivieren"

- **Scope:** `@RequiresEigenschutzRolle` + `@RequiresPermission` + `@UseGuards(..., EigenschutzRolleGuard, PermissionsGuard)` an alle bestehenden Eigenschutz-Endpunkte (Gefährdungsbeurteilung Stories 2.1–2.5, Sicherheitsregel Stories 2.6, Quittungs-Endpoint 2.7).
- **Aufwand:** 1–2 Tage inkl. Test-Coverage und Permission-Seeds.
- **Pre-Req:** Permission-Seeds in `prisma/seed.ts` müssen die 13 Eigenschutz-Permissions an die Default-Rollen verteilen (siehe `eigenschutz-permission.enum.ts:30–44`).
- **Timing-Empfehlung:** Nach Story 3.1 (sodass Story 3.1 als Referenz-Implementierung der Vier-Schicht-Kette dient), spätestens vor Epic 4 (Sicherungsposten brauchen Pattern-Konsistenz).

### Vorschlag **P3**: ADR-016 „Permissions-Seed-Mapping pro Default-Rolle"

- **Scope:** Verbindliches Mapping `(EigenschutzRolle → EigenschutzPermission[])` festschreiben. Heute existiert kein einziger Seed-Eintrag, der globale `User.permissions` mit `eigenschutz:*`-Strings befüllt.
- **Aufwand:** ½ Tag (ADR + Seed-Patch).
- **Pre-Req:** Action Item A10 aus Epic-1-Retro (Seed-Vorlagen-Governance) muss klar sein.

---

## 6. Verbindliche Konsequenzen für Story 3.1

Story 3.1 (`415-3-1-psa-profil-einer-einheit-aktivieren-deaktivieren`) **muss** nach diesem Audit:

1. **Single-Import-Pattern (ADR-014).** `EigenschutzModule` braucht nur `imports: [AuthModule, ...]` — kein direkter `KraefteInfrastructureModule`-Import mehr nötig (auch wenn defensiver Doppel-Import nicht bricht).
2. **Vier-Schicht-Guard-Kette.** `@UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard, PermissionsGuard)` mit `@RequiresEigenschutzRolle('Sicherheitsbeauftragter')` und `@RequiresPermission('eigenschutz:psa:write')`.
3. **Domain-Invariante zusätzlich.** Cross-Einheit-Korrektheit (Sicherheitsbeauftragter ändert PSA-Profil einer fremden Einheit) wird im Handler über Business-Rule-Code abgesichert — Section 3.5.
4. **Story-Test-Suite.** Unit-Tests müssen die Vier-Schicht-Kette explizit prüfen (mindestens je ein Test pro Guard-Schicht: 401/403/403/403). Setup-Helper aus `auth/guards/__tests__/*.spec.ts` wiederverwenden.

Stories 3.2–3.11 erben das Pattern; pro Story darf nur das `@RequiresPermission`-Flag und ggf. die Rollen-Liste tauschen.

---

## 7. Glossar

- **Membership** — User ist im konkreten Einsatz aktiv besetzt (`EinsatzRollenbesetzung.freigegebenAm IS NULL`). Geprüft von `EinsatzScopeGuard`.
- **Eigenschutz-Rolle (Snapshot)** — `EinsatzRollenbesetzung.rollenName` mit Präfix `Eigenschutz: ` (z. B. `Eigenschutz: Sicherheitsbeauftragter`). Nicht zu verwechseln mit der Plattform-Rolle `User.role` (`USER` / `ADMIN` / `SUPER_ADMIN`).
- **Permission (Flag)** — globaler String aus `User.permissions` (JSON-Array, z. B. `eigenschutz:psa:write`). Geprüft von `PermissionsGuard` per exaktem String-Match.
- **Domain-Invariante** — Business-Rule, die auf konkretem Aggregate-Zustand prüft (z. B. „caller gehört zur Ziel-Einheit"). Lebt im Handler/Aggregate, nicht im Guard.
- **Edge** — die HTTP-Boundary des Backends. Guards laufen am Edge; Domain-Invarianten laufen tiefer in der Use-Case-Schicht.

---

## Referenzen

- [`docs/adr/adr-012-einsatz-scope-guard.md`](../adr/adr-012-einsatz-scope-guard.md) — Plattform-Pattern, Guard-Kette, Request-Augmentation.
- [`docs/adr/adr-014-auth-module-re-exports-kraefte-infrastructure.md`](../adr/adr-014-auth-module-re-exports-kraefte-infrastructure.md) — Single-Import-Konvention.
- [`packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts`](../../packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts)
- [`packages/backend/src/modules/auth/guards/eigenschutz-rolle.guard.ts`](../../packages/backend/src/modules/auth/guards/eigenschutz-rolle.guard.ts)
- [`packages/backend/src/modules/auth/guards/permissions.guard.ts`](../../packages/backend/src/modules/auth/guards/permissions.guard.ts)
- [`packages/backend/src/domain/eigenschutz/enums/eigenschutz-rolle.enum.ts`](../../packages/backend/src/domain/eigenschutz/enums/eigenschutz-rolle.enum.ts) — Vier Eigenschutz-Rollen (Short-Form).
- [`packages/backend/src/domain/eigenschutz/enums/eigenschutz-permission.enum.ts`](../../packages/backend/src/domain/eigenschutz/enums/eigenschutz-permission.enum.ts) — 13 Eigenschutz-Permissions.
- `_bmad-output/implementation-artifacts/epic-2-retro-2026-04-24.md` Section 3.1 + 5.1 — Auslöser dieses Audits (Workflow-Scratchpad, nicht versioniert).
- `_bmad-output/planning-artifacts/architecture.md` §B10 Z. 699–706 — FR44–FR47 Permissions-Inventar (Workflow-Scratchpad, nicht versioniert).
