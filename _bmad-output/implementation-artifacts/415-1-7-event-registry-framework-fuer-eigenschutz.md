# Story 1.7: Event-Registry-Framework für Eigenschutz

Status: done

**Scope-Grenze (KRITISCH):** Diese Story liefert **nur das Framework** für die nachfolgende Event-Registrierung im Eigenschutz-Kontext. Konkret: eine abstrakte `EigenschutzDomainEvent`-Basisklasse mit Pflichtfeldern aus Architecture §D, ein vor-befüllter `EVENT_NAMES.EIGENSCHUTZ`-Namespace mit allen 14 Katalog-Namen aus Architecture §B13 (ohne Event-Klassen dahinter), eine Konsistenz-Spec, die für jeden Namen prüft „0 oder 4 Stellen" (nie 1–3), und einen Outbox→WebSocket-Smoke-Test mit einem **Test-scoped** Dummy-Event. **Nicht in dieser Story:**

- **Keine produktiven Eigenschutz-Event-Klassen** — `GefaehrdungsbeurteilungErstellt`, `PsaProfilGeaendert`, `SicherheitsregelAusgerufen`, `SicherheitsregelQuittiert`, `SicherungspostenEingerichtet`/`-Aktualisiert`, `VorfallGemeldet`/`-Exportiert`, `QuittungAbgegeben`/`-Ueberfaellig`, `LueckeGemeldet`, `KonfliktErkannt`/`-Aufgeloest` bleiben Epic 2–5.
- **Keine Einträge in die produktiven 4 Registrierungs-Stellen** — `event-serializer.ts` (switch), `event-deserializer.ts` (Registry-Map), `event-adapters.module.ts` (providers), `events/adapters/index.ts` (barrel) bleiben für Eigenschutz **0 Einträge**. Der Dummy-Event aus AC5 lebt ausschließlich im Test-Scope (`__tests__/`), **nie** im Produktions-Code-Pfad.
- **Keine Application-Layer-Event-Handler, DI-Tokens für reale Handler, Mapper, Projections, Controller, DTOs** — Epic 2+ zieht je Event nach.
- **Keine Prisma-Migrationen, keine Seed-Änderungen, keine Frontend-Änderungen, keine Guard-Anpassungen** (Story 1.4/1.5/1.6 decken das ab).
- **Kein Ausbau von `EventConsumerValidatorService`** — die Plattform-Logik bleibt unverändert, die neue Konsistenz-Spec ist ein eigenständiger Test.
- **Keine neuen ADRs** — das Event-Registry-Pattern ist plattformweit bereits etabliert (Architecture §D + §4.3/§4.4 der Architekturprinzipien); dieses Story materialisiert das Pattern **für Eigenschutz**, ohne neue Architekturentscheidung zu treffen.

<!-- Note: Validation ist optional. `validate-create-story` kann vor `dev-story` für Quality-Check laufen. -->

## Story

As a **Backend-Entwickler einer nachfolgenden Eigenschutz-Story (Epic 2–5)**,
I want **ein einsatzbereites Registry-Framework mit einer streng typisierten `EigenschutzDomainEvent`-Basisklasse, einem vollständig befüllten `EVENT_NAMES.EIGENSCHUTZ`-Namespace und einer automatischen Konsistenz-Prüfung, die „Event nur an 3 von 4 Stellen registriert" fail-loudly meldet**,
so that **ich beim Hinzufügen neuer Eigenschutz-Events `extends EigenschutzDomainEvent` erben, den Namen aus dem zentralen Namespace ziehen und darauf vertrauen kann, dass die CI die Vollständigkeit meiner 4-Stellen-Registrierung mechanisch einfordert — ohne eigenes Boilerplate, ohne silent-drift** (Epic 1, Story 1.7; Architecture §B13 `architecture.md:734-751`, §D `architecture.md:1011-1062`; Architekturprinzipien §4.3/§4.4 `docs/architecture-principles.md:318-345`; NFR-I3 `prd.md:571`).

## Acceptance Criteria

### AC1 — `EigenschutzDomainEvent`-Basisklasse (Architecture §D)

**Given** die Plattform-Event-Basisklasse `DomainEvent` unter `packages/backend/src/domain/common/domain-event.ts:52` (liefert `eventId: string` via CUID2 + `occurredAt: Date` + optionales `aggregateId: string`)
**When** eine neue Datei `packages/backend/src/domain/eigenschutz/events/eigenschutz-domain-event.ts` angelegt wird
**Then** exportiert sie eine **abstrakte** Klasse `EigenschutzDomainEvent extends DomainEvent` mit **Pflicht**-Konstruktor-Parametern (in dieser Reihenfolge):

1. `einsatzId: string` (`readonly public` — für WebSocket-Scope-Filter `einsatz:{einsatzId}`, ADR-006)
2. `userId: string` (`readonly public` — Urheber)
3. `einheitId?: string` (`readonly public` — optional, wo relevant)
4. `aggregateId?: string` (weitergereicht an `super(aggregateId)`)
5. `occurredOn?: Date` (weitergereicht an `super(aggregateId, occurredOn)` — für Rehydration)

**And** der `protected constructor(...)` delegiert via `super(aggregateId, occurredOn)` und weist die Eigenschutz-Pflichtfelder via Parameter-Property-Shorthand zu (keine `this.xxx = xxx`-Assignments; konsistent mit `SystemWarnungEvent`).

**And** die Klasse überschreibt **nicht** `static eventName()` — das erledigt die konkrete Subklasse in Epic 2+ (`static eventName(): string` bleibt Pflicht der Subklasse, erbt den Runtime-Error-Throw aus der Basisklasse bei Nicht-Override).

**And** JSDoc dokumentiert:

- Das Invariant „jedes Eigenschutz-Event trägt `einsatzId` + `userId`" (Architecture §D).
- Den Verweis auf Architecture §B13 (14 Katalog-Events).
- Ein Beispiel-Subklassen-Skelett (aber **keine** echte Subklasse anlegen — das bleibt Epic 2+).

**And** eine Unit-Spec `packages/backend/src/domain/eigenschutz/events/__tests__/eigenschutz-domain-event.spec.ts` prüft:

1. Eine Test-lokale Subklasse `class TestEigenschutzEvent extends EigenschutzDomainEvent { static eventName() { return 'eigenschutz.test'; } }` lässt sich **nur** mit `einsatzId` + `userId` instanziieren (Type-Level via `expectTypeOf`/`ts-expect-error` **oder** Runtime: Konstruktor wirft nicht, aber fehlendes Feld bricht auf TS-Ebene).
2. `einheitId` ist optional (beide Instanziierungs-Varianten grün).
3. `eventId` wird auto-generiert (CUID2, 24 Zeichen `^[a-z0-9]+$`).
4. `occurredAt` wird auto-generiert und ist vor `new Date(Date.now() + 10)`.
5. Der explizite `occurredOn`-Override wird durchgereicht (Rehydration-Szenario).
6. `aggregateId` defaultet auf `undefined` wenn nicht gesetzt.

**And** der Datei-Import erfolgt durch Subklassen via `import { EigenschutzDomainEvent } from '@domain/eigenschutz/events/eigenschutz-domain-event';` — **niemals** mit `import type`, da CLAUDE.md AC1 (Backend DI) für _abstrakte Basisklassen_ zwar nicht zwingend gilt (sie werden nicht via DI injected), aber die Projekt-Konvention `import` für Klassen-Symbole einheitlich zu halten einfacher zu prüfen ist als Ausnahmen.

**Source:** Architecture §D `architecture.md:1011-1045`; `packages/backend/src/domain/common/domain-event.ts:52-143`; `packages/backend/src/domain/events/system-warnung.event.ts:13-26` (Vorbild).

### AC2 — `EVENT_NAMES.EIGENSCHUTZ`-Namespace (14 Namen, vor-befüllt)

**Given** die zentrale Event-Namens-Konstante `packages/backend/src/domain/events/event-names.ts` (aktuell 25 Namespace-Blöcke, 0 × Eigenschutz)
**When** ein neues Namespace-Objekt `EIGENSCHUTZ` innerhalb des `EVENT_NAMES as const`-Objekts ergänzt wird (alphabetisch korrekt **vor** `ETB` einsortiert)
**Then** enthält es **genau** die folgenden 14 Einträge (dot-notation, lowercase, past-tense, konsistent mit `ERINNERUNG`/`BEFEHL`/`ALARMIERUNG`-Mustern):

| Konstante                              | Wert (String)                                        | Quelle (Architecture §B13)           |
| -------------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| `GEFAEHRDUNGSBEURTEILUNG_ERSTELLT`     | `'eigenschutz.gefaehrdungsbeurteilung_erstellt'`     | Beurteilung neu (auch aus Vorlage)   |
| `GEFAEHRDUNGSBEURTEILUNG_AKTUALISIERT` | `'eigenschutz.gefaehrdungsbeurteilung_aktualisiert'` | Item add/change/remove, neue Version |
| `PSA_PROFIL_GEAENDERT`                 | `'eigenschutz.psa_profil_geaendert'`                 | Toggle eines Profils (kritisch)      |
| `SICHERHEITSREGEL_AUSGERUFEN`          | `'eigenschutz.sicherheitsregel_ausgerufen'`          | neue/aktualisierte Regel             |
| `SICHERHEITSREGEL_QUITTIERT`           | `'eigenschutz.sicherheitsregel_quittiert'`           | Abschnittsleiter quittiert           |
| `SICHERUNGSPOSTEN_EINGERICHTET`        | `'eigenschutz.sicherungsposten_eingerichtet'`        | CRUD-Create                          |
| `SICHERUNGSPOSTEN_AKTUALISIERT`        | `'eigenschutz.sicherungsposten_aktualisiert'`        | CRUD-Update                          |
| `VORFALL_GEMELDET`                     | `'eigenschutz.vorfall_gemeldet'`                     | neue Meldung mit Snapshot            |
| `VORFALL_EXPORTIERT`                   | `'eigenschutz.vorfall_exportiert'`                   | Unfallkassen-Export                  |
| `QUITTUNG_ABGEGEBEN`                   | `'eigenschutz.quittung_abgegeben'`                   | Abschnittsleiter bestätigt           |
| `LUECKE_GEMELDET`                      | `'eigenschutz.luecke_gemeldet'`                      | Rück-Eskalation fehlende Ausrüstung  |
| `QUITTUNG_UEBERFAELLIG`                | `'eigenschutz.quittung_ueberfaellig'`                | Scheduler, > 5 min offen             |
| `KONFLIKT_ERKANNT`                     | `'eigenschutz.konflikt_erkannt'`                     | Sync-Konflikt auf kritischem Feld    |
| `KONFLIKT_AUFGELOEST`                  | `'eigenschutz.konflikt_aufgeloest'`                  | manuelle Auflösung                   |

**And** der `EventName`-Type-Union (am Ende der Datei) wird um `(typeof EVENT_NAMES.EIGENSCHUTZ)[keyof typeof EVENT_NAMES.EIGENSCHUTZ]` erweitert — alphabetisch korrekt **vor** `ETB` einsortiert, damit die Union-Reihenfolge spiegelt der `EVENT_NAMES`-Reihenfolge (Convention in der Datei).

**And** JSDoc über dem `EIGENSCHUTZ`-Block referenziert Architecture §B13 + ADR-006 + Story 1.7 und dokumentiert: „Diese 14 Namen sind pre-allocated; reale Event-Klassen und 4-Stellen-Registrierung liefern Epic 2–5 Stories; die Konsistenz-Spec in `__tests__/eigenschutz-event-registry.spec.ts` prüft, dass für jeden dieser Namen die Registrierung entweder **0 oder 4 Stellen** umfasst".

**And** eine Unit-Spec `packages/backend/src/domain/events/__tests__/event-names.eigenschutz.spec.ts` prüft:

1. `Object.keys(EVENT_NAMES.EIGENSCHUTZ)` hat **Länge 14** und enthält exakt die 14 `UPPER_SNAKE_CASE`-Konstanten aus der Tabelle.
2. Jeder Wert matcht `^eigenschutz\.[a-z_]+$` (dot-notation Präfix + lowercase snake_case).
3. Jeder Wert ist **unique** (kein Duplikat).
4. Kein Wert überschneidet sich mit existierenden `EVENT_NAMES.*`-Werten (Cross-Namespace-Duplikats-Check via `Object.values(EVENT_NAMES).flatMap(...)`).
5. Der `EventName`-Type-Union (Type-Level-Spec mit `expectTypeOf`) enthält alle 14 neuen Namen als zulässige Werte.

**Source:** `packages/backend/src/domain/events/event-names.ts:36-390`; Architecture §B13 `architecture.md:734-751`.

### AC3 — Verzeichnis-Struktur + DI-Token-Pattern für Eigenschutz-Event-Pipeline

**Given** die durch Story 1.6 bereits angelegten Platzhalter-Ordner `packages/backend/src/domain/eigenschutz/events/.gitkeep`, `packages/backend/src/application/eigenschutz/event-handlers/.gitkeep`, `packages/backend/src/infrastructure/eigenschutz/event-adapters/.gitkeep`
**When** Story 1.7 abgeschlossen ist
**Then** enthalten die Ordner **zusätzlich zur** `.gitkeep` ausschließlich die folgenden Dateien (keine weiteren Produktions-Dateien):

- `packages/backend/src/domain/eigenschutz/events/eigenschutz-domain-event.ts` (AC1)
- `packages/backend/src/domain/eigenschutz/events/__tests__/eigenschutz-domain-event.spec.ts` (AC1)
- `packages/backend/src/domain/eigenschutz/events/index.ts` (Barrel-Export **nur** der Basisklasse, **keine** konkreten Events — Epic 2+ füllt sie nach)

**And** ein neuer DI-Token-Block in `packages/backend/src/infrastructure/di-tokens.ts` unter dem bestehenden `EVENT_HANDLER as const`-Objekt (am Ende, mit Kommentar `/* ===== EIGENSCHUTZ EVENT HANDLER TOKENS (Story 1.7 pre-allocated) ===== */`) reserviert die Symbol-Namen für die nachfolgenden Stories — **jedoch nur als JSDoc-Kommentar-Block im Stil eines „Rezepts"**, **nicht** als tatsächliche `Symbol(...)`-Zuweisungen (da jeder ungenutzte Symbol-Eintrag die DI-Token-Runtime belastet und Consumer-Validator-Warnungen auslöst). Der Kommentar-Block listet als Pattern-Referenz:

```ts
/* Beispiel-Muster für nachfolgende Stories (keine Live-Tokens in 1.7!):
 *   GEFAEHRDUNGSBEURTEILUNG_ERSTELLT_PROJECTION: Symbol('IEventHandler<GefaehrdungsbeurteilungErstelltEvent>:AmpelProjection'),
 *   PSA_PROFIL_GEAENDERT_WEBSOCKET: Symbol('IEventHandler<PsaProfilGeaendertEvent>:WebSocketBroadcast'),
 *   ...
 * Convention: EIGENSCHUTZ-Token-Namen folgen UPPER_SNAKE_CASE + "_{Aspect}"-Suffix (PROJECTION, WEBSOCKET, ETB, TELEMETRY).
 */
```

**And** der `EigenschutzInfrastructureModule`-Kommentar in `packages/backend/src/infrastructure/eigenschutz/eigenschutz-infrastructure.module.ts:1-16` wird erweitert um eine kurze Referenz: „Story 1.7 etabliert das Event-Registry-Framework (siehe `domain/eigenschutz/events/eigenschutz-domain-event.ts`); Event-Adapter werden pro Event in `infrastructure/eigenschutz/event-adapters/` angelegt, sobald Epic 2+ Events liefert." — der Modul-Body bleibt `@Module({})` (keine Provider, keine Imports, kein Konsument in AppModule).

**And** **keine** Änderung an `event-adapters.module.ts` (bleibt unverändert — Eigenschutz-Adapter existieren noch nicht).

**Source:** Architecture §B „Structure Patterns" `architecture.md:918-974`; `packages/backend/src/infrastructure/di-tokens.ts:195-274`; Story 1.6 File List (Folder-Scaffold bereits angelegt).

### AC4 — Konsistenz-Spec „0 oder 4 Stellen, niemals 1–3" (NFR-I3-Härtung)

**Given** die 14 Namen in `EVENT_NAMES.EIGENSCHUTZ` (AC2) und die 4 produktiven Registrierungs-Stellen der Plattform:

1. **Serializer-Switch:** `packages/backend/src/infrastructure/outbox/event-serializer.ts` — Fall-Label `case '{eventName}':` innerhalb der `serializePayload`-Switch-Anweisung (~Zeile 218–505).
2. **Deserializer-Registry:** `packages/backend/src/infrastructure/outbox/event-deserializer.ts` — Map-Eintrag `['{eventName}', ...]` im Konstruktor (~Zeile 256–425).
3. **Adapters-Module-Provider:** `packages/backend/src/infrastructure/events/event-adapters.module.ts` — Provider-Klassenname im `providers`-Array.
4. **Adapters-Index-Barrel:** `packages/backend/src/infrastructure/events/adapters/index.ts` — `export * from './…-event.adapter';`-Zeile.

**When** eine neue Unit-Spec `packages/backend/src/infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts` ausgeführt wird
**Then** iteriert sie über `Object.values(EVENT_NAMES.EIGENSCHUTZ)` (14 Einträge) und berechnet für jeden Eintrag einen **4-Tupel**-Count `{serializer, deserializer, adaptersModule, adaptersIndex}` aus:

- **Stelle 1 (`serializer`):** Liest `event-serializer.ts` via `fs.readFileSync(__dirname + '/../event-serializer.ts', 'utf8')`, sucht Literal `case '{eventName}':` (Substring-Match auf den exakten Wert, **inkl.** Single-Quotes) → Count = 1 (gefunden) oder 0.
- **Stelle 2 (`deserializer`):** Instanziiert `EventDeserializer` mit Mock-Logger, ruft `.getSupportedEventTypes()` → `includes(eventName) ? 1 : 0`.
- **Stelle 3 (`adaptersModule`):** Liest `event-adapters.module.ts` via `fs.readFileSync`, sucht mit Regex `/^\s*(\w+EventAdapter[A-Za-z]*)\s*,\s*(\/\/.*)?$/m` und filtert auf Zeilen, die den `eventName`-Substring in einem trailing `// … {eventName}`-Kommentar enthalten **oder** — als Fallback — prüft via NestJS-Runtime-TestingModule, ob `Reflect.getMetadata('event', adapterClass)` (bzw. analog) den Namen referenziert. Praktikabler Ansatz: statische Quellcode-Suche auf Substring `'{eventName}'` innerhalb der Datei → 1 oder 0. (Begründung: Barrel-Consistency ist struktureller Natur; Runtime-Check wäre redundant zum `EventConsumerValidatorService` der bereits beim Bootstrap läuft.)
- **Stelle 4 (`adaptersIndex`):** Liest `events/adapters/index.ts`, sucht Literal `{slug-Form des eventName}.adapter` **oder** — robuster — leitet die erwartete Adapter-Datei über eine Konvention ab (Story-1.7-Dev-Note: Adapter-Dateinamen folgen `{event-slug}.adapter.ts`, z. B. `eigenschutz-psa-profil-geaendert-websocket.adapter.ts` — aber da Adapter-Aspect-Suffixe frei wählbar sind, ist **Substring-Match auf den `eventName`-Wert** innerhalb der Index-Datei der einzig robuste Check). → 1 oder 0.

**And** die Spec **asserted** pro Eintrag: `const count = sum(tuple); expect([0, 4]).toContain(count);` und liefert bei Fehler eine aussagekräftige Meldung `'Event "${eventName}" ist an ${count}/4 Stellen registriert (erwartet: 0 oder 4). Fehlende Stellen: ${missing.join(", ")}'`.

**And** die Spec prüft zusätzlich — als positiver Sanity-Check — mit einem **bekannten bereits vollständig registrierten Produktions-Event** (z. B. `EVENT_NAMES.SYSTEM.WARNUNG = 'system.warnung'`, registriert an allen 4 Stellen): Die 4-Tupel-Summe muss `4` sein. Scheitert dieser Sanity-Check, ist die Spec-Logik selbst kaputt (nicht die Eigenschutz-Registrierung) — der Fehler ist dann unterscheidbar.

**And** **aktuell** passiert der Test trivial (alle 14 Eigenschutz-Einträge → Count 0 → OK). **Sobald Epic 2.1 `GefaehrdungsbeurteilungErstellt` nur an 3 von 4 Stellen registriert**, schlägt die Spec **mit aussagekräftiger Fehlermeldung** fehl — genau das vom Epic-AC geforderte Failure-Case-Verhalten.

**And** die Spec hat eine `describe('Failure-Case-Regression')`-Sektion, die mit **einem bewusst unregistrierten Test-Event-Namen** (Constant `const FAKE_PARTIAL_EVENT = 'eigenschutz.__fake_partial_only_in_serializer_test__';`) und **einem gemockten Serializer-String** (z. B. via `jest.spyOn(fs, 'readFileSync')` + Return-Wert-Override für die Serializer-Datei) demonstriert: wenn der Name in exakt 1–3 der 4 Stellen auftaucht, schlägt das Assert fehl und wirft mit korrekter „fehlende Stellen"-Liste. Dieser Sub-Test beweist, dass die Failure-Case-Mechanik **korrekt greift**, ohne reale Quelldateien zu modifizieren.

**Source:** Epic 1 Story 1.7 AC4 (NFR-I3-Härtung); Architekturprinzipien §4.4 `docs/architecture-principles.md:335-345`; `EventConsumerValidatorService` als komplementärer Runtime-Check (`event-consumer-validator.service.ts:81-135`).

### AC5 — Smoke-Test Outbox → WebSocket (ADR-006-Beleg)

**Given** die bestehende Outbox-Pipeline (`OutboxEventPublisher`, `EventSerializer`, `EventDeserializer`, `EinsatzEventsGateway.broadcastToEinsatz`) und die Anforderung, dass Eigenschutz-Events am Ende der Pipeline im Room `einsatz:{einsatzId}` landen (ADR-006, Architecture §D `architecture.md:1056-1062`)
**When** die Integration-Spec `packages/backend/src/infrastructure/outbox/__tests__/eigenschutz-smoke.integration.spec.ts` ausgeführt wird
**Then** verifiziert sie **end-to-end** folgenden Flow mit einem **Test-scoped** Dummy-Event (das **nicht** in Produktions-Serializer/-Deserializer/-AdaptersModule/-Index landet):

1. **Test-Setup (vor jedem Test):**
   - Jest-Testing-Module mit `EventEmitter2`, Mock-Logger, einem **Spy-`EinsatzEventsGateway`** (`broadcastToEinsatz` als `jest.fn()`) und einem echten `EventSerializer` + `EventDeserializer`.
   - **Test-scoped Event-Klasse** `TestEigenschutzDummyEvent extends EigenschutzDomainEvent` (definiert **inline** in der Spec-Datei), `static eventName()` liefert `'eigenschutz.__test_smoke__'` (bewusst mit doppeltem Unterstrich als Marker „nur für Tests").
   - **Test-scoped Serializer-Override:** Die Spec monkey-patched `EventSerializer.prototype.serialize` via `jest.spyOn` **nur für diesen Test-Scope** (Jest `afterEach` räumt auf), sodass das Dummy-Event zu einem `SerializedEvent` mit `eventName: 'eigenschutz.__test_smoke__'` + `payload: { einsatzId, userId }` konvertiert wird — der Produktions-Switch bleibt unberührt.
   - **Test-scoped Deserializer-Override:** Analog wird `EventDeserializer.eventRegistry` via `(deserializer as any).eventRegistry.set('eigenschutz.__test_smoke__', (payload, aggregateId) => Result.ok(new TestEigenschutzDummyEvent(payload.einsatzId, payload.userId, undefined, aggregateId)))` im `beforeEach` ergänzt und im `afterEach` gelöscht.
   - **Test-scoped Adapter-Registrierung:** Ein inline-definierter `TestEigenschutzDummyAdapter` mit `@OnEvent('eigenschutz.__test_smoke__')` wird als Provider in das TestingModule eingehängt; seine `@OnEvent`-Methode ruft `spyGateway.broadcastToEinsatz(event.einsatzId, 'eigenschutz.dummy', { eventId: event.eventId })` auf — **nur im Test-Scope**.
2. **Test-Execution:**
   - Ein `TestEigenschutzDummyEvent` wird konstruiert (`einsatzId = 'test-einsatz-cuid'`, `userId = 'test-user-cuid'`).
   - Das Event wird via `eventEmitter.emit('eigenschutz.__test_smoke__', event)` publiziert (kein realer Outbox-DB-Roundtrip — der Test verifiziert **den Event-Adapter-Pfad ab EventEmitter2**, nicht den Polling-Mechanismus, siehe Dev Note unten).
   - **ODER — falls der Dev-Agent einen „echten" Outbox-Roundtrip implementiert — ein `Prisma`-Outbox-Row wird über `PrismaOutboxRepository.save()` persistiert und `OutboxEventPublisher.processPending()` manuell getriggert. Dieser Pfad setzt jedoch eine Test-DB (Postgres-Container oder SQLite-Shim) voraus und ist als `.integration.spec.ts` mit `describe.skip` für CI-ohne-DB markiert — der EventEmitter-Pfad ist der Default.**
3. **Assertions:**
   - `spyGateway.broadcastToEinsatz` wurde **genau 1×** aufgerufen.
   - **Erstes Argument** ist `'test-einsatz-cuid'` (== `einsatzId` aus Event-Konstruktor — beweist ADR-006-Scope-Mapping).
   - **Zweites Argument** ist `'eigenschutz.dummy'` (frei wählbarer Kanal-Name — nur für die Test-Verkabelung).
   - **Drittes Argument** enthält `eventId` (Beleg: CUID2 wurde von der Basisklasse auto-generiert).
4. **Teardown:**
   - `afterEach` entfernt den Deserializer-Registry-Eintrag, restauriert `EventSerializer.prototype.serialize` via `jest.restoreAllMocks()` und schließt das TestingModule. Keine Seiteneffekte auf andere Tests.

**And** die Spec-Datei enthält einen Kopf-Kommentar, der explizit feststellt:

> „Dieser Smoke-Test verifiziert Outbox-Event → `EinsatzEventsGateway.broadcastToEinsatz(room=einsatz:{einsatzId})` end-to-end, verwendet jedoch ein **Test-scoped Dummy-Event** (`eigenschutz.__test_smoke__`), das **nicht** in Produktions-Serializer/-Deserializer/-AdaptersModule/-Index registriert ist. Dies ist die von Story 1.7 AC4/AC5 geforderte Resolution des „0 Events registriert" + „Dummy-Event durch Outbox"-Widerspruchs: produktive Zählung erfolgt auf Quelldateien-Ebene (AC4), Test-Roundtrip via transientem Monkey-Patch (AC5)."

**And** die Spec toleriert weder `any` leaks auf Produktions-Typen (Typen bleiben strict) noch dauerhafte Registry-Einträge (das Pattern `beforeEach → Mock eintragen | afterEach → Mock entfernen` ist Pflicht).

**Source:** ADR-006 `docs/adr/adr-006-websocket-event-bus-einsatz-scoped.md`; `packages/backend/src/infrastructure/websocket/einsatz-events.gateway.ts:102`; `packages/backend/src/infrastructure/outbox/outbox-event-publisher.service.ts`; Architecture §D `architecture.md:1056-1062`.

### AC6 — Developer-Experience-Dokumentation („wie trage ich ein neues Event ein")

**Given** Story 1.7 etabliert das Framework und Epic 2–5 wird je Event 4 Stellen + ggf. Application-Handler ergänzen
**When** eine neue Markdown-Datei `packages/backend/src/domain/eigenschutz/events/README.md` angelegt wird
**Then** dokumentiert sie in kompakter Form (**max. 120 Zeilen**, zielgerichtet für Dev-Agents ohne Plattform-Vorwissen):

1. **Zweck:** Framework-Story-1.7-Kontext + Verweis auf diese Story-Datei + Architecture §B13 + §D.
2. **Datei-Konvention pro Event:** vollständiger Pfad-Katalog für ein hypothetisches `PsaProfilGeaendertEvent`:
   - `domain/eigenschutz/events/psa-profil-geaendert.event.ts` (Subklasse von `EigenschutzDomainEvent`, `static eventName() { return EVENT_NAMES.EIGENSCHUTZ.PSA_PROFIL_GEAENDERT; }`).
   - `domain/eigenschutz/events/__tests__/psa-profil-geaendert.event.spec.ts` (Equality-Invariante + `eventName()`).
   - `application/eigenschutz/event-handlers/{aspect}.handler.ts` (je Aspect wie `AmpelProjection`, `WebSocket`, `Push`; implementiert `IEventHandler<PsaProfilGeaendertEvent>`).
   - `infrastructure/eigenschutz/event-adapters/psa-profil-geaendert-{aspect}.adapter.ts` (`@OnEvent(EVENT_NAMES.EIGENSCHUTZ.PSA_PROFIL_GEAENDERT)`, delegiert via DI-Token).
3. **4-Stellen-Registrierungs-Checkliste** (als nummerierte Schritte + Datei-Pfad):
   1. `infrastructure/outbox/event-serializer.ts` — `case '{eventName}':` + `serialize{Event}`-Methode.
   2. `infrastructure/outbox/event-deserializer.ts` — Map-Eintrag + `deserialize{Event}`-Methode.
   3. `infrastructure/events/event-adapters.module.ts` — Adapter-Klasse in `providers`-Array + Trailing-Kommentar mit `eventName`-Substring (für AC4-Konsistenz-Check).
   4. `infrastructure/events/adapters/index.ts` — `export * from './{slug}.adapter';`.
4. **DI-Token-Konvention:** UPPER*SNAKE_CASE + `*{ASPECT}`-Suffix (PROJECTION | WEBSOCKET | ETB | TELEMETRY | PUSH) in `infrastructure/di-tokens.ts`→`EVENT_HANDLER`-Objekt.
5. **Konsistenz-Spec-Verweis:** „Die Spec `eigenschutz-event-registry.spec.ts` schlägt fehl, wenn dein neues Event an 1–3 (statt 0 oder 4) Stellen registriert ist — nutze das, um Fehlkonfigurationen in PR-CI zu fangen."
6. **Smoke-Test-Template:** Hinweis, dass `eigenschutz-smoke.integration.spec.ts` als Vorlage für spätere Event-Handler-Tests dient.

**And** die README enthält **keine** ADR-Neuinhalte (lediglich Referenzen) und **keine** Beispiel-Code-Blöcke, die länger sind als die Verweise auf reale Produktions-Dateien (Dokumentation soll nicht driften).

**Source:** Epic-Story-1.7-Spirit („Framework + Operational Handbook"); Architekturprinzipien §4.4.

### AC7 — Qualitätsgates + Projekt-Konventionen

**Given** die vier neuen/modifizierten Dateien (`eigenschutz-domain-event.ts`, `event-names.ts`-Diff, `eigenschutz-event-registry.spec.ts`, `eigenschutz-smoke.integration.spec.ts`) plus Spec-Dateien und `README.md`
**When** die Qualitätsgates laufen
**Then**:

- **`pnpm --filter @bluelight-hub/backend check:di:imports`** läuft ohne Violations (keine `import type`-Verwendung für Klassen-Symbole, auch wenn die Basisklasse abstrakt ist; CLAUDE.md AC1 + NFR-M2 `prd.md:584`).
- **`pnpm --filter @bluelight-hub/backend check:arch`** meldet **keine neuen** Circular Dependencies gegenüber der Story-1.6-Baseline (NFR-M3).
- **`pnpm --filter @bluelight-hub/backend test`** läuft vollständig grün; Jest-Coverage für die neuen Dateien ≥ 80 % (NFR-M1); die Konsistenz-Spec + Smoke-Spec laufen beide deterministisch ohne Postgres/Docker (EventEmitter-basierte Integration).
- **OXC-Lint + `oxfmt`** laufen ohne Violations (`pnpm lint` im Repo-Root).
- **Pre-commit-Hook** `scripts/sync-gitmojis.mjs --check` blockiert keinen der erwarteten Commits (reines Linter-Gate — keine Änderung an `package.json`-Skripten nötig).
- **OpenAPI-Spec-Regeneration (`pnpm run generate-api`)** ist **nicht** erforderlich (keine Controller/DTO-Änderungen in dieser Story) — Smoke-Test ist, dass `packages/shared/client` unverändert bleibt.
- **`check:arch`** zeigt zusätzlich, dass das neue `infrastructure/eigenschutz/event-adapters/`-Verzeichnis **keine** zirkulären Referenzen auf `events/event-adapters.module.ts` erzeugt (Story 1.7 berührt das Modul nicht).

**And** der fertige Commit trägt einen klaren Gitmoji-Präfix (`🏗️(eigenschutz)` oder `✨(eigenschutz-events)` — Commit-Nachricht-Vorschlag:

```text
🏗️(eigenschutz-events): Event-Registry-Framework (Story 1.7)

- EigenschutzDomainEvent-Basisklasse mit einsatzId+userId-Pflichtfeldern
- EVENT_NAMES.EIGENSCHUTZ mit 14 pre-allocated Namen (Architecture §B13)
- Konsistenz-Spec „0 oder 4 Stellen" + Outbox→WS-Smoke-Test
- DX-README als 4-Stellen-Registrierungs-Handbuch für Epic 2+
```

## Tasks / Subtasks

- [x] **Task 1: Basisklasse + Unit-Spec** (AC1)
  - [x] 1.1 `domain/eigenschutz/events/eigenschutz-domain-event.ts` anlegen — `abstract class EigenschutzDomainEvent extends DomainEvent` mit (`einsatzId`, `userId`, `einheitId?`, `aggregateId?`, `occurredOn?`).
  - [x] 1.2 `domain/eigenschutz/events/__tests__/eigenschutz-domain-event.spec.ts` — 6 Asserts (siehe AC1).
  - [x] 1.3 `domain/eigenschutz/events/index.ts` — Barrel-Export der Basisklasse (keine konkreten Events).

- [x] **Task 2: EVENT_NAMES.EIGENSCHUTZ + Union-Erweiterung** (AC2)
  - [x] 2.1 `domain/events/event-names.ts` — neuen `EIGENSCHUTZ`-Block **vor** `ETB` einsortieren, 14 Konstanten (siehe Tabelle in AC2).
  - [x] 2.2 `EventName`-Union-Type am Ende der Datei um `EIGENSCHUTZ`-Einträge erweitern.
  - [x] 2.3 `domain/events/__tests__/event-names.eigenschutz.spec.ts` — 5 Asserts (siehe AC2).

- [x] **Task 3: Verzeichnis-Struktur + DI-Token-Kommentar-Block** (AC3)
  - [x] 3.1 `.gitkeep`-Dateien in `domain/eigenschutz/events/`, `application/eigenschutz/event-handlers/`, `infrastructure/eigenschutz/event-adapters/` **beibehalten** (werden erst in Epic 2+ ersetzt).
  - [x] 3.2 `infrastructure/di-tokens.ts` — **Kommentar-Block** am Ende von `EVENT_HANDLER` mit Pattern-Vorlage (ohne Live-Symbols).
  - [x] 3.3 `infrastructure/eigenschutz/eigenschutz-infrastructure.module.ts` — Kommentar-Header um Story-1.7-Referenz ergänzen.

- [x] **Task 4: Konsistenz-Spec „0 oder 4 Stellen"** (AC4)
  - [x] 4.1 `infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts` anlegen.
  - [x] 4.2 Produktives Referenz-Event (`system.warnung`) als positiver Sanity-Check (4/4).
  - [x] 4.3 Iteration über `EVENT_NAMES.EIGENSCHUTZ` (erwartet: 0/4 pro Eintrag).
  - [x] 4.4 Regression-Sektion mit gemocktem fs-Read für 1–3-Stellen-Szenarien (AC4 „Failure-Case-Regression").

- [x] **Task 5: Outbox → WebSocket Smoke-Test** (AC5)
  - [x] 5.1 `infrastructure/outbox/__tests__/eigenschutz-smoke.integration.spec.ts` anlegen (EventEmitter-Pfad, ohne Postgres).
  - [x] 5.2 Test-scoped `TestEigenschutzDummyEvent` + Serializer-/Deserializer-Monkey-Patch (`beforeEach`/`afterEach`).
  - [x] 5.3 Spy-`EinsatzEventsGateway` + Adapter-Registrierung als Provider im TestingModule.
  - [x] 5.4 Assertion: `broadcastToEinsatz` aufgerufen mit `('test-einsatz-cuid', 'eigenschutz.dummy', { eventId: <cuid2> })`.

- [x] **Task 6: Developer-README** (AC6)
  - [x] 6.1 `domain/eigenschutz/events/README.md` mit 4-Stellen-Checkliste + DI-Token-Konvention + Verweisen auf Konsistenz- und Smoke-Spec.

- [x] **Task 7: Qualitätsgates + Finalisierung** (AC7)
  - [x] 7.1 `pnpm --filter @bluelight-hub/backend check:di:imports` grün (1933 files, 0 violations).
  - [x] 7.2 `pnpm --filter @bluelight-hub/backend check:arch` keine neuen Circles (0 errors; 1 preexisting warning in `funkkanal.command.ts` out-of-scope).
  - [x] 7.3 `pnpm --filter @bluelight-hub/backend test` — 9247/9381 tests, 74 failed + 60 skipped. **Alle 74 Failures sind preexisting DB/e2e-Tests** (13 Suites, u. a. `prisma-*.repository.integration.spec.ts`, `*-controller.e2e.spec.ts`, `outbox-race-condition.integration.spec.ts`), die einen laufenden Postgres-Container erwarten — lokal nicht vorhanden, CI-exklusiv. Kein einziger Failure enthält `eigenschutz` im Pfad; `grep -i eigenschutz` auf der Failure-Liste liefert 0 Treffer. Die 4 neuen Story-1.7-Specs laufen 38/38 grün (inkl. `eigenschutz-smoke.integration.spec.ts`). `eigenschutz-domain-event.ts` 100 % Coverage; NFR-M1-Schwelle ≥ 80 % für neue Files erfüllt.
  - [x] 7.4 `pnpm lint` (Repo-Root) grün (0 errors; 28 preexisting warnings out-of-scope).
  - [x] 7.5 `packages/shared/client` unverändert (keine API-Regeneration).
  - [ ] 7.6 Commit nach Gitmoji-Konvention (verbleibt für den Review-/Release-Schritt des Users — keine Autonom-Commits in dieser Story).

### Review Findings

**Code-Review vom 2026-04-22** (3 parallele Layer: Blind Hunter + Edge Case Hunter + Acceptance Auditor; 55+ Roh-Findings → 6 Patch / 7 Defer / 42+ Dismiss)

**Gesamtverdikt Acceptance Auditor:** Kein blockierender Befund. AC1–AC7 + Scope-Grenze alle erfüllt; 4 minor Findings dokumentiert, alle sachlich begründet oder strukturell äquivalent zur Spec-Intent.

- [x] [Review][Patch] Tautologischer `expect.any(...)`-Assert in it.each + Throw-Mechanik nur für 1/4-Fall verifiziert [packages/backend/src/infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts:140-160, 193-219] — Quelle: Blind+Auditor. `expect({...}).toEqual({ count: expect.any(Number), missing: expect.any(Array), tuple: expect.any(Object) })` (Zeilen 145-156) ist strukturell tautologisch — die Typen sind durch TypeScript bereits garantiert. Der `if (count !== 0 && count !== 4) throw ...` (Zeile 157-159) leistet die eigentliche Assertion und Jest fängt den synchronen Throw korrekt ab, aber: der dritte failure-case-Sub-Test (Zeilen 221-243) ist der einzige, der `expect(...).toThrow(/Fehlende Stellen: .../)` prüft — für 1/4. Der 3/4-Sub-Test (Zeilen 193-219) assertiert nur `tuple`-Shape, nicht die Error-Message. Fix: (a) Entferne die tautologische `toEqual`-Assertion im it.each oder ersetze sie durch `expect([0, 4]).toContain(count)`, (b) ergänze einen 3/4-Assertion-Throw-Test analog zum 1/4-Fall mit `expect(assertion).toThrow(/3\/4 Stellen registriert/)` und `/Fehlende Stellen: deserializer/`.

- [x] [Review][Patch] `occurredAt`-Toleranz 10 ms — Flaky-Risiko auf langsamen CI [packages/backend/src/domain/eigenschutz/events/__tests__/eigenschutz-domain-event.spec.ts:46-52] — Quelle: Blind+Edge. `const after = new Date(Date.now() + 10)` erlaubt nur 10 ms zwischen Instanziierung und Assert. Auf CI-Containern mit GC-Pause oder Clock-Drift kann `new TestEigenschutzEvent(...)` ≥ 10 ms brauchen → sporadischer Fehlschlag. Fix: Toleranz auf 1000 ms erhöhen oder `jest.useFakeTimers()` mit fixiertem `Date.now()`.

- [x] [Review][Patch] Drift-Risiko zwischen `knownMissingEvents` und `EVENT_NAMES.EIGENSCHUTZ` (14× Duplikation ohne Konsistenz-Assert) [packages/backend/src/__tests__/architecture-rules.spec.ts:200-217 vs packages/backend/src/domain/events/event-names.ts:73-102] — Quelle: Blind+Edge. Beide Dateien listen dieselben 14 Strings, aber keine Spec prüft, dass beide Listen identisch sind. Wird einer umbenannt (z. B. in Epic 2 „vorfall_gemeldet" → „vorfall_gemeldet_v2"), divergieren sie lautlos. Fix: Ersetze das hart-gecodete 14er-Array durch `...Object.values(EVENT_NAMES.EIGENSCHUTZ)` oder ergänze eine Konsistenz-Assertion im gleichen `describe`.

- [x] [Review][Patch] `afterEach`-Cleanup ist nicht try/finally-guardiert — partieller Leak bei Fehler [packages/backend/src/infrastructure/outbox/__tests__/eigenschutz-smoke.integration.spec.ts:124-130] — Quelle: Edge. Wirft `deserializerRegistry.delete(...)` oder `moduleRef.close()`, werden nachfolgende Cleanup-Schritte übersprungen. Test-Leak in die nächste Spec-Datei möglich. Fix: Umschließe Cleanup mit try/finally, damit `jest.restoreAllMocks()` und `moduleRef.close()` garantiert laufen.

- [x] [Review][Patch] Regex `^eigenschutz\.[a-z_]+$` akzeptiert trailing-underscore-Namen [packages/backend/src/domain/events/__tests__/event-names.eigenschutz.spec.ts:39-45] — Quelle: Edge. Ein hypothetischer Name wie `eigenschutz.foo_` würde das Match bestehen, bräche aber die Slug-Derivat-Heuristik in `eigenschutz-event-registry.spec.ts`. Aktuell harmlos (kein Name endet auf `_`), aber Regex sollte stricter sein. Fix: `^eigenschutz\.[a-z][a-z0-9_]*[a-z0-9]$` oder explizites Check „keine leading/trailing underscores pro Segment".

- [x] [Review][Patch] AC1-Sub-Check 1 Type-Level-Enforcement nur implizit verifiziert [packages/backend/src/domain/eigenschutz/events/__tests__/eigenschutz-domain-event.spec.ts:27-31] — Quelle: Auditor. AC1 erlaubt „Type-Level via expectTypeOf/ts-expect-error **oder** Runtime". Der Test nutzt nur die positive Runtime-Variante (erfolgreiche Instanziierung); das „fehlendes Feld bricht auf TS-Ebene"-Versprechen ist nicht explizit belegt. Fix: Ergänze 2-Zeilen-Block mit `// @ts-expect-error` für `new TestEigenschutzEvent()` (ohne Args) und `new TestEigenschutzEvent(EINSATZ_ID)` (nur 1 Arg). Minor gap, AC formal erfüllt.

- [x] [Review][Defer] Type-Cast `as unknown as { eventRegistry: typeof deserializerRegistry }` auf private Feld [packages/backend/src/infrastructure/outbox/__tests__/eigenschutz-smoke.integration.spec.ts:116] — Quelle: Blind+Edge — deferred, pre-existing Testcode-Pattern. Aktuell korrekt (`eventRegistry`-Feld existiert in `event-deserializer.ts:252`), aber Future-Rename produziert silent-no-op statt Compile-Error. Besserer Accessor wäre ein protected Getter, was aber Produktions-Code ändert (out-of-scope für Story 1.7). CI würde beim Rename rot werden, weil der Test semantisch fehlschlägt.

- [x] [Review][Defer] `jest.spyOn(EventSerializer.prototype, 'serialize')` patcht global [packages/backend/src/infrastructure/outbox/__tests__/eigenschutz-smoke.integration.spec.ts:97-112] — Quelle: Blind — deferred. Jest isoliert Tests pro File via Worker, aktuell kein Konflikt. Instance-level `jest.spyOn(serializer, 'serialize')` wäre sauberer, ist aber Stil-Refactor.

- [x] [Review][Defer] Adapter-Slug-Prefix-Overlap-Risiko bei zukünftigen Eigenschutz-Event-Namen [packages/backend/src/infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts:92-104] — Quelle: Edge — deferred, Epic-2+-Concern. PascalCase-/Slug-Heuristik liefert false-positives, wenn ein Event-Name Präfix eines anderen ist (`vorfall_gemeldet` vs `vorfall_gemeldet_extern`). Bei aktuellen 14 Namen kein Overlap; wenn Epic 2+ weitere Events ergänzt, muss die Heuristik exakter werden (z. B. Match mit festen Aspect-Suffixen `WebSocket|Etb|Push|Projection|Telemetry`).

- [x] [Review][Defer] Parallele Emission eines anderen Eigenschutz-Events wirft im Smoke-Test-Serializer-Override [packages/backend/src/infrastructure/outbox/__tests__/eigenschutz-smoke.integration.spec.ts:97-102] — Quelle: Edge — deferred, Epic-2+-Concern. Der Serializer-Override wirft für jedes nicht-Dummy-Event; wenn Epic-2-Tests im gleichen Worker laufen und zufällig ein echtes Eigenschutz-Event emittieren, kracht der Test. Delegation an Original statt Throw wäre robuster.

- [x] [Review][Defer] Keine Laufzeit-Validierung für leeren `einsatzId`/`userId`/`aggregateId` in `EigenschutzDomainEvent` [packages/backend/src/domain/eigenschutz/events/eigenschutz-domain-event.ts:48-58] — Quelle: Edge — deferred. Architecture §D erzwingt das Invariant, die Basisklasse akzeptiert aber leere Strings. WebSocket-Room `einsatz:` (leer) oder Outbox-Partition auf `aggregateId=''` wären silent-broken. Validierung gehört entweder in konkrete Events oder in eine Domain-Guard-Layer — Epic 2+ Entscheidung.

- [x] [Review][Defer] Deserializer-Error-Path (ungültiger Payload) nicht getestet im Smoke-Test [packages/backend/src/infrastructure/outbox/__tests__/eigenschutz-smoke.integration.spec.ts:117-121] — Quelle: Edge — deferred. Aktueller Test deckt nur Happy-Path. Result.fail-Pfad für `einsatzId=undefined` würde Handler-Robustness testen. Story 1.7 AC5 fordert nur "den" Smoke-Test, nicht Error-Coverage.

- [x] [Review][Defer] README referenziert gitignored `_bmad-output/planning-artifacts/architecture.md` mit Zeilennummern [packages/backend/src/domain/eigenschutz/events/README.md:7-9] — Quelle: Blind — deferred, pre-existing Pattern. Repo-Memory dokumentiert `_bmad-output/` als gitignored — Zeilennummern driften, wenn Architecture-Dokument sich ändert, und neue Teammitglieder sehen die Quelle nicht. Konsistent mit anderen README-Verweisen im Repo, daher als Team-Konvention behandelt.

## Dev Notes

### Resolution des AC4/AC5-Widerspruchs (AUSDRÜCKLICH dokumentiert)

Epic-Text sagt gleichzeitig:

- AC4: „0 Events (nur das Framework) registriert" — nach Story 1.7.
- AC5: „Smoke-Test publiziert ein Dummy-Event durch die Outbox und verifiziert WS-Broadcast".

**Auflösung:**

1. „0 Events registriert" bezieht sich auf **Produktions-Pfade** — d. h. `event-serializer.ts` (switch), `event-deserializer.ts` (Konstruktor-Map), `event-adapters.module.ts` (providers), `events/adapters/index.ts` (barrel). Diese Dateien bleiben für Eigenschutz-Events **leer** nach dieser Story.
2. Der Smoke-Test aus AC5 verwendet ein **Test-scoped** Dummy-Event (`eigenschutz.__test_smoke__`), das ausschließlich innerhalb der Spec-Datei via `jest.spyOn`/Registry-Monkey-Patch aktiviert wird. Der Produktions-Pfad sieht dieses Event nie.
3. Die Konsistenz-Spec aus AC4 iteriert nur über `EVENT_NAMES.EIGENSCHUTZ` (14 reale Namen); der Test-Event-Name ist **nicht** Teil dieser Liste und wird daher **nicht** von der Spec erfasst.

Diese Aufteilung liefert beide Epic-ACs ohne Konflikt: produktive Zählung auf Source-Ebene (grep-basiert), Roundtrip-Verifikation auf Test-Ebene (Monkey-Patch).

### Warum Quellcode-Substring-Matching statt AST/Reflection in AC4?

- **AST-Parsing** (z. B. via `ts-morph`) wäre robuster gegen Formatierungs-Änderungen, aber Overkill für den Konsistenz-Check (14 Eigenschutz-Namen + 1 Sanity-Event in einer Spec, die < 1 s laufen muss).
- **Runtime-Reflection** für Serializer/Adapter funktioniert nur post-Bootstrap und kostet eine TestingModule-Instanziierung pro Test — teurer als `fs.readFileSync`.
- **Substring-Match** auf den exakten `eventName`-Wert (mit Single-Quotes, um False-Positives durch JSDoc/Kommentare zu vermeiden) ist pragmatisch und deterministisch. Die Spec dokumentiert das explizit.
- **Absicherung gegen String-Drift:** Die Spec prüft mit einem **bekannten vollständig registrierten Produktions-Event** (`system.warnung` = 4/4) — scheitert dieser Sanity, ist die Spec-Mechanik selbst defekt, nicht die Eigenschutz-Registrierung → klar unterscheidbare Fehlerursache.

### Warum ein Kommentar-Block statt realer Symbols für DI-Tokens (AC3)?

- Ungenutzte `Symbol(...)`-Einträge in `EVENT_HANDLER as const` würden **keinen** Laufzeit-Fehler auslösen (Symbols sind immutabel + inert ohne Provider-Registrierung), aber:
  - `EventConsumerValidatorService` würde sie ggf. nicht erfassen (der Validator arbeitet auf `eventName`-Strings, nicht auf DI-Tokens) — kein Bug, nur Noise.
  - Sie erzeugen einen „halben" API-Vertrag (Tokens exportiert, aber kein Consumer) — Epic 2+ Dev könnte annehmen, der Handler sei bereits implementiert, und Debugging-Zeit verlieren.
- Ein **Kommentar-Block als Rezept-Vorlage** erzeugt keinen Code-Smell, ist aber beim CTRL+F auffindbar — optimales Signal-zu-Rausch.

### Warum bleibt `EigenschutzInfrastructureModule` leer (kein `@Module({ imports: [...], providers: [...] })`)?

- Story 1.6 begründet bereits (in `eigenschutz-infrastructure.module.ts:1-15`): das Modul ist leer, bis **fachliche Konsumenten** existieren. Story 1.7 hält diese Regel bei — kein Wiring, solange kein Event-Adapter/Projection/Telemetrie-Service existiert.
- **Konsequenz:** der bestehende `EventAdaptersModule` (`infrastructure/events/event-adapters.module.ts`) bleibt unverändert — keine Eigenschutz-Adapter in `providers`.
- **Zukunftspfad (ab Epic 2.1):** wenn der erste reale Eigenschutz-Adapter entsteht, entscheidet die dann-aktuelle Story, ob er direkt in `EventAdaptersModule` landet (konsistent mit Erinnerung/Befehl-Adaptern) **oder** ob ein dediziertes `EigenschutzEventAdaptersSubmodule` sinnvoll ist (Lokalität). Diese Entscheidung **ist nicht Scope von Story 1.7** — Story 1.7 stellt nur das Framework bereit.

### Naming-Convention für Event-Namen (Cross-Cutting)

Architecture §B13 nutzt PascalCase-Klassennamen (z. B. `GefaehrdungsbeurteilungErstellt`), während die Plattform-Konvention für `EVENT_NAMES` lowercase + dot-notation ist (`einsatz.created`, `erinnerung.acknowledged`). Story 1.7 folgt der **Plattform-Konvention** (AC2-Tabelle, dot-notation-lowercase), weil:

- Konsistenz mit **allen** bestehenden `EVENT_NAMES`-Einträgen (25 Namespaces, ~130 Events in der Produktion — alle dot-notation).
- Die Serializer/Deserializer-Schlüssel sind String-Werte, nicht Klassennamen — PascalCase wäre inkonsistent.
- Der `eventName()`-Static-Override in der konkreten Klasse liefert den String (z. B. `GefaehrdungsbeurteilungErstelltEvent.eventName() === 'eigenschutz.gefaehrdungsbeurteilung_erstellt'`) — der Mismatch zwischen Klassenname und String-Wert ist bewusst (und projekt-konsistent, siehe `SystemWarnungEvent.eventName() === 'system.warnung'`).

### Warum `eigenschutz.*`-Präfix statt z. B. `sicherheit.*`?

- Story 1.6 nutzt in den URL-Routen `/einsatz/$einsatzId/sicherheit/eigenschutz` — das Präfix `sicherheit` ist die Navigation-Kategorie, nicht der Modul-Name.
- Alle Backend-Pfade (`modules/eigenschutz/`, `application/eigenschutz/`, `infrastructure/eigenschutz/`, `domain/eigenschutz/`) verwenden `eigenschutz` als Namespace.
- Event-Namen folgen dieser Module-Konvention (konsistent mit `alarmierung.*`, `funkkanal.*`, `erinnerung.*` — die in URLs teils auch unter Gruppen-Pfaden liegen).
- AC2 fixiert das Präfix verbindlich → keine Kopplung an Frontend-Nav-Entscheidungen.

### Weshalb die Smoke-Spec der default-Pfad ohne Postgres ist

- Der Outbox-Polling-Zyklus (`OutboxEventPublisher.processPending()`) setzt voraus: echte PG-Transaktion mit `FOR UPDATE SKIP LOCKED` (siehe `outbox-event-publisher.service.ts` Doc-Block). Eine CI-Integration mit Docker-Postgres ist möglich (die `outbox-race-condition.integration.spec.ts` zeigt das Muster), aber teuer pro Run.
- Der **Kern der ADR-006-Garantie** ist: „Event aus dem Domain-Layer → EventEmitter2 → `@OnEvent`-Adapter → `EinsatzEventsGateway.broadcastToEinsatz(einsatzId, ...)` → Room `einsatz:{einsatzId}`". Die Outbox-Persistenz ist ein separates Reliability-Layer (at-least-once, NFR-R3) — für Story 1.7 AC5 ist der **Event-Flow ab EventEmitter2 der prüfenswerte Pfad**, weil hier die Eigenschutz-spezifische Delivery sichtbar wird.
- Ein optionaler „echter Outbox-Roundtrip" bleibt als `describe.skip` in der Spec erwähnt (für lokale Entwickler mit laufendem Postgres), ist aber nicht CI-Pflicht.

### Stolperfallen (LLM-Dev-Agent-Warnung)

- **Nicht** `GefaehrdungsbeurteilungErstelltEvent` o. Ä. als konkrete Event-Klasse anlegen — Epic 2.1 tut das. Falsche Versuchung: „Ich brauche mindestens eine konkrete Klasse, damit der Test etwas tut." → Nein, der Test-scoped `TestEigenschutzDummyEvent` in der Spec reicht.
- **Nicht** in `event-serializer.ts`/`-deserializer.ts`/`event-adapters.module.ts`/`events/adapters/index.ts` für Eigenschutz etwas hinzufügen. Das ist Scope der Nachfolge-Stories. AC4 **prüft exakt**, dass diese 4 Stellen für Eigenschutz-Namen unverändert bleiben (0 Stellen).
- **Nicht** eine ADR zu „Eigenschutz-Events" anlegen — das Pattern ist plattformweit etabliert (Architecture §D, Architekturprinzipien §4.4). Story 1.7 implementiert das bestehende Pattern, erzeugt keine neue Entscheidung.
- **Nicht** den `EventConsumerValidatorService` um Eigenschutz-Logik erweitern — er arbeitet generisch auf allen `EVENT_NAMES.*`-Einträgen und braucht keine Eigenschutz-spezifische Erweiterung.
- **Nicht** den `EventName`-Union-Type falsch einsortieren — er spiegelt die Reihenfolge in `EVENT_NAMES` (AC2 fixiert: `EIGENSCHUTZ` **vor** `ETB`).
- **`import type` ist tabu** für Klassen-Symbole auch in Domain-Layer — CLAUDE.md AC1 + `check:di:imports` greift auch dort.
- **Kein Zugriff auf Prisma/Gateway im Domain-Layer** — `EigenschutzDomainEvent` bleibt framework-agnostisch (erbt nur von `DomainEvent`).
- **Deterministische Smoke-Spec:** kein `Date.now()`/`Math.random()` in Assertions außerhalb von `toBeGreaterThan(0)`-Style-Checks; CUID2 ist nicht predictable, also assertiere nur auf Format (`.toMatch(/^[a-z0-9]{24}$/)`) oder auf „definiert" (`expect.any(String)`).
- **`afterEach` MUSS den Deserializer-Registry-Eintrag entfernen** — sonst leakt der Test-Eintrag in spätere Specs und verzerrt `getSupportedEventTypes()`.

### Project Structure Notes

- Alle Dateien landen in der bereits etablierten hexagonalen Struktur (Story 1.6 hat die Ordner `.gitkeep`-pre-created):
  - Domain-Layer: `packages/backend/src/domain/eigenschutz/events/` (framework-agnostisch, kein NestJS, kein Prisma).
  - Infrastructure-Layer: `packages/backend/src/infrastructure/outbox/__tests__/` für die 2 neuen Specs (Konsistenz + Smoke); **keine** Produktions-Dateien in `infrastructure/eigenschutz/event-adapters/` (bleibt `.gitkeep`).
  - Application-Layer: **unverändert** (keine Event-Handler in dieser Story).
  - Modules-Layer: **unverändert** (keine Controller-Änderungen).
- Keine neuen `@Injectable()`-Klassen → kein DI-Wiring in `AppModule` oder Untermodulen nötig.
- Keine Prisma-Schema-Änderungen → keine Migration.
- Keine Frontend-Änderungen → `packages/frontend/` ist kein Scope.

### References

- **Epic + Story:** Epic 1, Story 1.7 (`_bmad-output/planning-artifacts/epics.md:640-669`).
- **Architecture:**
  - §B13 Event-Katalog MVP (`_bmad-output/planning-artifacts/architecture.md:734-751`) — Quelle der 14 Event-Namen in AC2.
  - §D Event-Patterns (`_bmad-output/planning-artifacts/architecture.md:1011-1062`) — Pflichtfelder + 4-Stellen-Regel + ADR-006-Broadcast-Semantik.
  - §B „Structure Patterns" (`_bmad-output/planning-artifacts/architecture.md:918-974`) — Ordner-Konvention pro Layer.
- **Architekturprinzipien:**
  - §4.3 Transactional Outbox (`docs/architecture-principles.md:318-333`).
  - §4.4 Event Adapters (`docs/architecture-principles.md:335-345`) — explizite Nennung der 4-Stellen-Registrierung.
- **ADR:** ADR-006 Einsatz-scoped WebSocket Event Bus (`docs/adr/adr-006-websocket-event-bus-einsatz-scoped.md`).
- **PRD:**
  - NFR-I3 (`_bmad-output/planning-artifacts/prd.md:571`) — „Neue Backend-Events werden in der Event-Registry an allen vier Stellen registriert".
  - NFR-R3 (`_bmad-output/planning-artifacts/prd.md:554`) — at-least-once + Dedup via Event-IDs.
  - NFR-M2 (`_bmad-output/planning-artifacts/prd.md:584`) — Pre-commit `check:di:imports`.
- **Bestehende Referenz-Implementationen:**
  - `packages/backend/src/domain/common/domain-event.ts:52-143` — Basisklasse, Vorbild für `EigenschutzDomainEvent`.
  - `packages/backend/src/domain/events/event-names.ts` — Namespace-Muster (25 Blöcke, alphabetisch sortiert).
  - `packages/backend/src/domain/events/system-warnung.event.ts:13-26` — kompaktes Event-Klassen-Skelett (Vorbild-Simplizität).
  - `packages/backend/src/infrastructure/events/adapters/notiz-erstellt-event.adapter.ts` — Adapter-Pattern-Vorbild mit `@OnEvent` + `IEventHandler`-Delegation (für zukünftige Epic-2+-Stories, nicht für 1.7 selbst).
  - `packages/backend/src/infrastructure/events/event-consumer-validator.service.ts:81-171` — komplementärer Runtime-Validator; `getSupportedEventTypes()` liefert die „Stelle 2"-Information in der AC4-Spec.
  - `packages/backend/src/infrastructure/outbox/__tests__/event-roundtrip.spec.ts:1-60` — Vorbild für Roundtrip-Asserts (Story 1.7 Smoke-Spec nutzt ähnliches Setup, aber einfacher).
- **Projekt-Konventionen:** `CLAUDE.md` (Backend DI-Imports AC1, API-Workflow AC7, Commit-Format), `_bmad/custom/project-conventions.md` (Story-Key-Präfix `415-...`).

### Previous Story Intelligence (415-1-6)

- **File-List-Pattern:** Story 1.6 listete **Neu (Backend)**, **Neu (Frontend)**, **Editiert (Backend)**, **Editiert (Frontend)**, **Regeneriert** separat. Story 1.7 nutzt **Neu (Backend)** + **Editiert (Backend)** — kein Frontend, keine API-Regeneration.
- **Qualitätsgates-Discipline:** Story 1.6 hat 23 neue Tests geliefert (15 Backend, 8 Frontend), 100 % Coverage auf neuen Backend-Files. Story 1.7 zielt auf ähnliche Disziplin (≥ 80 % Coverage gem. NFR-M1 ist Pflicht; 100 % ist Ziel).
- **Backend-AppModule-Registration:** Story 1.6 hat `EigenschutzModule` in `AppModule` registriert — Story 1.7 berührt `AppModule` **nicht**, da keine neuen Injectables.
- **`KraefteInfrastructureModule`-Kontext:** Story 1.6 dokumentierte, warum `EigenschutzModule` `KraefteInfrastructureModule` importieren muss (Guard-Dependencies). Story 1.7 hat keine Guard-Änderungen — Modulabhängigkeiten bleiben stabil.
- **Meta-Learning:** Story 1.6 hat `meta.silentError` als Plattform-Erweiterung gekoppelt (Zero-Toast-Policy). Story 1.7 berührt keine UI-Flows → keine analoge Plattform-Kopplung.

### Git Intelligence Summary (letzte 5 Commits)

1. `08dbd9b43 🐛(backend-cli)`: Nest-Bootstrap-CLIs von tsx auf ts-node (Story 1.7 Specs nutzen Jest+SWC, kein tsx — keine Kollision).
2. `05091aaa3 🔒(push-notifications)`: Story 1.2 Review-Patches angewendet.
3. `037cd18f4 ✨(push-notifications)`: Stories 1.1 + 1.2 — Web-Push + Tauri-Bridge (Push-Events konsumieren später Eigenschutz-Events; Story 1.7 liefert den Event-Namespace, aus dem z. B. `eigenschutz.psa_profil_geaendert` später gepublished wird).
4. `afa7c2613 ✨(bmad)`: Story-Key-Präfix-Konvention.
5. `e1b9fd693 🙈(bmad)`: PRD aus Versionierung entfernen (BMad-Output-Artefakte gitignored — beim Publish nicht committen!).

**Implikation für Story 1.7:** Der Event-Namespace muss mit den Push-Client-Erwartungen kompatibel sein (Story 1.2 dokumentiert `{title, body, eventId, url?, priority}`-Payload). Die 14 EVENT_NAMES-Einträge aus AC2 beschreiben nur Event-_Namen_, keine Payload-Shape — diese liefern Epic 2+ Stories pro Event-Klasse; kein Konflikt mit Push-Client-Contract.

### Project Context Reference

- `/Users/rubeen/dev/personal/bluelight-hub/_bmad-output/project-context.md` — Tech-Stack-Versionen (Prisma 7.7, NestJS 11.1.19, `@paralleldrive/cuid2` 3.3, CUID2-IDs für `eventId`).
- `CLAUDE.md` — Backend-DI-Import-Regel + OXC-Toolchain + Pre-commit-Hooks.

## Dev Agent Record

### Agent Model Used

`claude-opus-4-7[1m]` (Claude Opus 4.7, 1M-Kontext) via Claude Code CLI.

### Debug Log References

- `pnpm --filter @bluelight-hub/backend check:di:imports` → `✅ All DI imports follow the correct pattern! (Checked 1933 files)`.
- `pnpm --filter @bluelight-hub/backend check:arch` → `Found 1 warning and 0 errors.` (Warning: preexisting `KanalDetailsShape` Import in `create-funkkanal.command.ts` — out-of-scope).
- Backend-Unit-Suite (ohne e2e/integration-DB): `Test Suites: 1 skipped, 507 passed, 507 of 508 total. Tests: 35 skipped, 8735 passed, 8770 total.`
- Backend-Full-Suite (inkl. e2e/integration): `Tests: 74 failed, 60 skipped, 9247 passed, 9381 total.` — **Baseline-Beleg:** Alle 74 Failures sind preexisting DB-Tests ohne laufenden Postgres-Container. `grep -i eigenschutz` auf der FAIL-Liste liefert 0 Treffer. Failing-Suite-Baseline: `prisma-funkkanal.repository.integration.spec.ts`, `prisma-alarmierung.repository.integration.spec.ts`, `prisma-einsatz.repository.integration.spec.ts`, `archive-old-einsaetze.integration.spec.ts`, `etb-performance.e2e.spec.ts`, `outbox-race-condition.integration.spec.ts`, `auth-controller.e2e.spec.ts`, `rbac-constraints.e2e.spec.ts`, `admin-invite.controller.e2e.spec.ts`, `einsatz-controller.e2e.spec.ts`, `server-access.guard.integration.spec.ts`. Kein Story-1.7-Test in der Failure-Liste.
- Story-1.7-Specs gezielt: `Test Suites: 4 passed, 4 total. Tests: 38 passed, 38 total.`
- Coverage auf `eigenschutz-domain-event.ts`: `100 % Stmts | 100 % Branch | 100 % Funcs | 100 % Lines`.
- `pnpm lint` (Repo-Root): `Found 28 warnings and 0 errors.` (Warnings alle preexisting, out-of-scope Frontend/UI).

### Completion Notes List

- **AC4-Heuristik — bewusste Abweichung von der Story-Text-Vorgabe:** Die AC4-Formulierung "Substring-Match auf `'{eventName}'` literal" ist für Stellen 3+4 (AdaptersModule + Adapters-Barrel) systemisch blind, weil die Plattform-Konvention dort `EVENT_NAMES.X.Y`-Symbole (keine String-Literale) bzw. Hyphen-Slug-Dateinamen (keinen Dot-separierten eventName) nutzt. Ein naives Substring-Match hätte den Sanity-Check mit `system.warnung` auf 2/4 gedrückt. Die Spec matcht deshalb:
  - **Stelle 3 (AdaptersModule):** PascalCase-Derivat des eventName als Token-Präfix von `*Adapter`-Bezeichnern (`SystemWarnung` → findet `SystemWarnungWebSocketEventAdapter`).
  - **Stelle 4 (Adapters-Barrel):** Slug-Derivat des eventName als Adapter-Datei-Präfix mit Hyphen-/Dot-Boundary (`system-warnung` → findet `'./system-warnung-websocket-event.adapter'`).
    Die Abweichung ist im Spec-Header-JSDoc dokumentiert. Der Positiv-Sanity-Check mit `system.warnung = 4/4` bestätigt, dass die Heuristik den realen Plattform-Kontrakt erfasst. Die AC6-README schreibt die Derivat-Konventionen für Epic 2+ explizit fest, damit neue Adapter die Heuristik nicht umgehen.
- **`architecture-rules.spec.ts` erweitert (out-of-scope-light-edit):** Durch die 14 neuen `EVENT_NAMES.EIGENSCHUTZ`-Einträge ohne Deserializer-Registrierung wäre der bestehende Vollständigkeits-Test fehlgeschlagen. Die 14 Namen wurden in `knownMissingEvents` als "Framework-Phase, Epic 2–5 zieht konkrete Events nach"-Ausnahme eingetragen — konsistent mit den bestehenden `server_access_token.*`/`server_config.*`/`user.locked`-Einträgen. Ergänzung ist minimal und notwendige Folge von AC2; nicht Scope-Erweiterung.
- **Smoke-Test — Result-API-Korrektur:** Erstes Draft nutzte `result.getValue()` (aus anderen Projekten übernommen); die Bluelight-Hub-Result-Klasse exponiert `.value` direkt. Eine einzelne Editierung in `eigenschutz-smoke.integration.spec.ts` hat das gefixt.
- **oxfmt-Umformatierung:** `check:arch` + `pnpm lint` hatten Format-Issues in `README.md` sowie Formatting-Optimierungen für die beiden neuen Specs getriggert. Nach `oxfmt` waren alle 38 neuen Asserts weiterhin grün — Logik unverändert.
- **Commit** (Schritt 7.6) bleibt bewusst offen: Story-Workflow überlässt Autonom-Agenten keine Commits; der User triggert den Review-/Release-Commit nach Sichtung.

### File List

**Neu (Backend):**

- `packages/backend/src/domain/eigenschutz/events/eigenschutz-domain-event.ts`
- `packages/backend/src/domain/eigenschutz/events/index.ts`
- `packages/backend/src/domain/eigenschutz/events/README.md`
- `packages/backend/src/domain/eigenschutz/events/__tests__/eigenschutz-domain-event.spec.ts`
- `packages/backend/src/domain/events/__tests__/event-names.eigenschutz.spec.ts`
- `packages/backend/src/infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts`
- `packages/backend/src/infrastructure/outbox/__tests__/eigenschutz-smoke.integration.spec.ts`

**Editiert (Backend):**

- `packages/backend/src/domain/events/event-names.ts` — `EIGENSCHUTZ`-Namespace (14 Konstanten, alphabetisch vor `ETB`) + `EventName`-Union-Erweiterung.
- `packages/backend/src/infrastructure/di-tokens.ts` — Kommentar-Block-Zusatz als Rezept-Vorlage in `EVENT_HANDLER` (keine Live-Symbols).
- `packages/backend/src/infrastructure/eigenschutz/eigenschutz-infrastructure.module.ts` — JSDoc-Header-Erweiterung um Story-1.7-Referenz (Modul-Body bleibt `@Module({})`).
- `packages/backend/src/__tests__/architecture-rules.spec.ts` — 14 `eigenschutz.*`-Einträge in `knownMissingEvents` als Framework-Phase-Ausnahme (Folge von AC2).

**Unverändert (explizit verifiziert):**

- `packages/backend/src/infrastructure/outbox/event-serializer.ts` — keine neuen `case`-Labels für Eigenschutz.
- `packages/backend/src/infrastructure/outbox/event-deserializer.ts` — keine neuen Map-Einträge für Eigenschutz.
- `packages/backend/src/infrastructure/events/event-adapters.module.ts` — keine neuen Provider für Eigenschutz.
- `packages/backend/src/infrastructure/events/adapters/index.ts` — keine neuen Exports für Eigenschutz.
- `packages/shared/client/` — unverändert (keine API-Regeneration).
- `packages/frontend/` — unverändert (kein Frontend-Scope).

### Change Log

| Datum      | Änderung                                                                                                                                                                                                                                                                  | Author                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 2026-04-22 | Story-Datei angelegt (ready-for-dev). Status-Übergang in `sprint-status.yaml`: `backlog → ready-for-dev`.                                                                                                                                                                 | Ruben Vitt (mit Claude Opus 4.7) |
| 2026-04-22 | Implementierung abgeschlossen. Alle 7 Tasks + 38 Asserts über 4 neue Specs grün. Status: `ready-for-dev → in-progress → review`. AC4-Heuristik bewusst von Story-Text-Vorgabe abgewichen (PascalCase-/Slug-Derivat statt naivem Substring-Match, siehe Completion Notes). | Ruben Vitt (mit Claude Opus 4.7) |
