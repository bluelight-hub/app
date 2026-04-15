# Alarmierung Wave 1 Implementation Plan (Issue #408)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## 📌 Handoff-Status (Stand 2026-04-15)

**Branch:** `407/wave-1-foundation-v2` (in diesem Worktree bereits ausgecheckt — Alarmierung baut direkt auf der Funkverkehr-Wave-1 auf).

**GitHub Issue:** [#408 — Kommunikation: Alarmierung](https://github.com/rubenvitt/bluelight-hub/issues/408)
**Follow-ups:** [#691 Alarmierungswege (Analyse)](https://github.com/rubenvitt/bluelight-hub/issues/691), [#692 Externe Alarmierungssysteme (Analyse)](https://github.com/rubenvitt/bluelight-hub/issues/692), [#693 ETB-Einträge in Fahrzeug-Detailansicht](https://github.com/rubenvitt/bluelight-hub/issues/693).

**Scope Wave 1 (vom User explizit bestätigt):**

- Eigenes DDD-Aggregat `AlarmierungAggregate` (analog `FunkkanalAggregate`).
- Empfänger polymorph: **Fahrzeug | Person | Einheit** (Kräfte-Modul liefert die Stammdaten).
- Status-Workflow pro Empfänger via **existierendem FMS** (nichts neu bauen). Die Alarmierung referenziert nur `EinsatzFahrzeug`-IDs.
- **4 Zeitpunkte je Empfänger**: `alarmiertAm` (Pflicht), `ausgeruecktAm`, `vorOrtAm`, `wiederFreiAm`. Manuell nachtragbar, Auto-Population aus FMS-Statuswechseln (3 → ausgeruecktAm, 4 → vorOrtAm, 1/2 → wiederFreiAm), FMS überschreibt manuelle Werte NICHT.
- **Reaktionszeit** = `vorOrtAm - alarmiertAm`, nur berechnet (nicht gespeichert).
- **Nachalarmierung** = neue Alarmierung mit `ursprungAlarmierungId`-Referenz.
- **Timeline** zeigt nur Alarmierungs-Events (keine verwandten ETB-Einträge).
- **KEIN Status-Board** — Link/Deep-Link zu `/kräfte/fahrzeuge` reicht. Keine zweite Fahrzeugansicht bauen.
- **KEINE Alarmierungswege** in Wave 1 (→ Follow-up #691).
- **KEINE externen Systeme** in Wave 1 (→ Follow-up #692).
- **KEIN Port-Stub** `IExternalAlarmierungAdapter`, **KEIN** `AlarmierungsWegPlaceholder`-VO (YAGNI — wird in Follow-ups nachgezogen).
- **ETB-Integration** via bestehender Value-Object-Kategorie `ALARMIERUNG`: Alarmierung + Statuswechsel erzeugen ETB-Einträge.
- **Outbox-Events** nach existierendem 4-Stellen-Pattern (serializer, deserializer, adapters-module, adapters-index).
- **Getrennte Commands** für manuelles Nachtragen (`KorrigiereZeitpunktCommand`) vs. FMS-Auto-Population (`AktualisiereZeitpunktAusFmsCommand`) — zwei verschiedene Events → Timeline kann Quelle unterscheiden.

**Architektur-Referenz:** Funkkanal (#407) — Aggregat-Struktur, Repository-Diff-Upsert, Event-Adapter, 4-Stellen-Registrierung, Controller-Shape, Feature-Ordner. Wenn unsicher, immer zuerst `packages/backend/src/domain/aggregates/funkkanal/`, `packages/backend/src/application/funkkanal/`, `packages/backend/src/infrastructure/funkkanal/`, `packages/backend/src/modules/funkkanal/`, `packages/frontend/src/features/funkverkehr/` studieren.

### ✅ Fertig (committed auf `407/wave-1-foundation-v2`)

| Task | Commit | Stand |
|------|--------|-------|
| T1 — Prisma-Schema + Migration | `172199cc9` | Models `Alarmierung` + `AlarmierungEmpfaenger` mit polymorphen FKs + Check-Constraint `alarmierung_empfaenger_genau_eine_kraft`. Migration `20260415195443_add_alarmierung_408` appliziert. Inverse Relationen bei Einsatz/Fahrzeug/Person/Einheit ergänzt. |
| T2 — Domain-Schicht | `172199cc9` | `AlarmierungId`, `AlarmierungEmpfaengerId` (EntityId-Subklassen). `alarmierung.entity.ts` + `alarmierung-empfaenger.entity.ts` (inkl. `ZeitpunktFeld`, `reaktionszeitSekunden`-Getter). `alarmierung-empfaenger-ref.ts` (Discriminated Union + `validateEmpfaengerRef` + `empfaengerRefEquals`). `AlarmierungAggregate` (Factory `create`, `fuegeEmpfaengerHinzu`, `entferneEmpfaenger`, `korrigiereZeitpunkt` (manuell, eigenes Event mit Audit), `aktualisiereZeitpunktAusFms` (no-op auf Nicht-Fahrzeug-Empfänger, respektiert manuelle Werte), `abschliessen`) + Helper `mapFmsStatusZuZeitpunktFeld`. Alle Methoden `Result<T>`. 7 Domain-Events (`AlarmierungErstelltEvent`, `AlarmierungEmpfaengerHinzugefuegtEvent`, `AlarmierungEmpfaengerEntferntEvent`, `AlarmierungZeitpunktKorrigiertEvent`, `AlarmierungZeitpunktFmsGesetztEvent`, `AlarmierungAbgeschlossenEvent`, `NachalarmierungErstelltEvent`). `EVENT_NAMES.ALARMIERUNG` (7 Keys) + `EventName`-Union erweitert. `IAlarmierungRepository`-Port mit `findAktiveByFahrzeugId` für FMS-Handler. `tsc --noEmit` sauber. |

### 🚧 Offen — in dieser Reihenfolge abarbeiten

Jede Task-Gruppe soll als **eigener Commit** abgeschlossen werden (Commit-Format `<emoji>(alarmierung|backend|frontend): <titel>`, siehe CLAUDE.md). Commits erzeugen, sobald Tests der jeweiligen Schicht grün sind.

---

## Task 3 — Application-Schicht

**Ziel:** Commands, Queries, Event-Handler, DTOs, ApplicationModule.

**Vorbild:** `packages/backend/src/application/funkkanal/` (Struktur 1:1 spiegeln).

**Schritte:**

- [ ] **DI-Token anlegen:** Neues Namespace-Objekt `ALARMIERUNG_TOKENS` in `packages/backend/src/infrastructure/di-tokens.ts` mit Key `REPOSITORY` (Wert: `Symbol('ALARMIERUNG_REPOSITORY')`). Analog zu `FUNKKANAL_TOKENS`. Wird von den Handlern via `@Inject(ALARMIERUNG_TOKENS.REPOSITORY)` aufgelöst.
- [ ] **Event-Handler-Token:** Neuer Symbol-Eintrag in `EVENT_HANDLER` (in `di-tokens.ts`) für `FMS_STATUS_ZU_ALARMIERUNG` und `ALARMIERUNG_ZU_ETB` — wird vom Application-Module registriert.
- [ ] **Commands unter `application/alarmierung/commands/`:**
  - `erstelle-alarmierung/` — Command-DTO (einsatzId, bezeichnung, beschreibung?, alarmierungszeit?, ursprungAlarmierungId?, empfaenger[]: {kind, id, nameSnapshot?, alarmiertAm?}, createdBy). Handler erbt `TransactionalCommandHandler`. Nutzt `AlarmierungAggregate.create` + für jeden Empfänger `fuegeEmpfaengerHinzu`. Bei fehlendem `nameSnapshot` wird er aus dem entsprechenden Kräfte-Aggregat geladen (Injection via `KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG | EINSATZ_PERSON | EINSATZ_EINHEIT`, analog `ZuordneKraftZuKanalHandler`). Repository-`save` + Outbox-Persistierung.
  - `fuege-empfaenger-hinzu/` — nachträglich einzelnen Empfänger ergänzen.
  - `entferne-empfaenger/` — Empfänger entfernen.
  - `korrigiere-zeitpunkt/` — Command-DTO (alarmierungId, empfaengerId, feld: 'ausgeruecktAm'|'vorOrtAm'|'wiederFreiAm', wert: Date|null, updatedBy). Ruft `korrigiereZeitpunkt`.
  - `schliesse-alarmierung-ab/` — Ruft `abschliessen`.
  - `erstelle-nachalarmierung/` — Wrapper um `ErstelleAlarmierungCommand` mit gesetztem `ursprungAlarmierungId`. Prüft vorher, ob Ursprung existiert und zum gleichen Einsatz gehört.
- [ ] **Queries unter `application/alarmierung/queries/`:**
  - `get-alarmierung-by-id/` — lädt via `IAlarmierungRepository.findById`.
  - `list-alarmierungen/` — Filter `status?` + Pagination (`skip`, `take`). Liefert nach `alarmierungszeit DESC` sortiert.
  - `get-alarmierung-timeline/` — aggregiert ETB-Einträge mit `kategorie = 'ALARMIERUNG'` für den Einsatz (via `ETB_REPOSITORY`) **und** ergänzt die strukturierten Alarmierungen/Empfänger aus `IAlarmierungRepository` — Ergebnis ist eine chronologisch sortierte Liste aus Alarmierungs-Events. Ob zusätzlich die Outbox als Quelle verwendet wird, ist eine Implementierungs-Entscheidung — die einfachste Variante ist, die Events aus dem aktuellen Aggregat-State zu rekonstruieren (Alarmierungs-Timestamp + je Empfänger `alarmiertAm` / `ausgeruecktAm` / `vorOrtAm` / `wiederFreiAm` als separate Timeline-Einträge).
- [ ] **Event-Handler unter `application/alarmierung/event-handlers/`:**
  - `fms-status-zu-alarmierung.handler.ts` — implementiert `IEventHandler<FmsStatusGeaendertEvent>`. Nutzt `IAlarmierungRepository.findAktiveByFahrzeugId(einsatzId, fahrzeugId)`. Pro Aggregat `aktualisiereZeitpunktAusFms(fahrzeugId, neuerStatus, event.occurredAt)` aufrufen und speichern.
  - `alarmierung-erstellt-zu-etb.handler.ts` — `@OnEvent`-Handler (via Adapter) der `AlarmierungErstelltEvent` in ETB-Eintrag mit Kategorie `ALARMIERUNG` umwandelt (Text z.B. `"Alarmierung ausgelöst: {bezeichnung} ({empfaengerCount} Empfänger)"`). Nutzt `AddEintragCommand` mit `userId = 'system'` und `occurredAt = event.occurredAt`.
  - `alarmierung-empfaenger-hinzugefuegt-zu-etb.handler.ts` — schreibt pro Empfänger einen ETB-Eintrag (`"Alarmiert: {nameSnapshot}"`).
  - `alarmierung-zeitpunkt-korrigiert-zu-etb.handler.ts` — schreibt ETB-Eintrag für manuelles Nachtragen mit Korrektur-Vermerk (alter → neuer Wert + `korrigiertVon`).
  - `alarmierung-zeitpunkt-fms-gesetzt-zu-etb.handler.ts` — optional, tendenziell nicht nötig (FMS-Statuswechsel wird vom bestehenden `FmsStatusGeaendertEvent`-Handler bereits ins ETB geschrieben). Wenn implementiert, dann ohne Duplikat-ETB.
  - `alarmierung-abgeschlossen-zu-etb.handler.ts` — einfacher Abschluss-Eintrag.
- [ ] **DTOs unter `application/alarmierung/dto/`:**
  - `alarmierung-response.dto.ts` — inkl. Empfänger-Liste mit berechnetem `reaktionszeitSekunden`.
  - `alarmierung-empfaenger.dto.ts` — polymorpher Empfänger (Discriminator `kind`).
  - `create-alarmierung.dto.ts`, `fuege-empfaenger-hinzu.dto.ts`, `korrigiere-zeitpunkt.dto.ts`, `erstelle-nachalarmierung.dto.ts`, `schliesse-alarmierung-ab.dto.ts`.
  - `list-alarmierungen.query.dto.ts` (Filter).
  - `alarmierung-timeline-event.dto.ts` — `{ type, occurredAt, data }` mit Diskriminator.
  - DTOs MÜSSEN `@ApiProperty` annotiert sein und Swagger-Discriminator (`@ApiExtraModels` + `oneOf/discriminator` wie im Kanal-Controller) verwenden — Hintergrund: `generate-api` produziert sonst `object` als Typ.
- [ ] **AlarmierungApplicationModule** unter `application/alarmierung/alarmierung-application.module.ts`. Registriert alle Command-/Query-Handler + Event-Handler. Binds Event-Handler an `EVENT_HANDLER.FMS_STATUS_ZU_ALARMIERUNG` / `EVENT_HANDLER.ALARMIERUNG_ZU_ETB`-Tokens.
- [ ] **Unit-Tests** je Command/Query/Event-Handler (mindestens happy path + 1–2 Failure-Pfade, analog Funkkanal).

**Definition-of-Done:**

- `pnpm --filter @bluelight-hub/backend test -- --testPathPatterns="application/alarmierung"` grün (mindestens 20 Tests).
- `pnpm --filter @bluelight-hub/backend check:di:imports` grün.
- Commit: `✨(alarmierung): Application-Schicht — Commands, Queries, Event-Handler`

---

## Task 4 — Infrastructure: Prisma-Repository + Mapper + Event-Adapter + Outbox-4-Stellen

**Vorbild:** `packages/backend/src/infrastructure/funkkanal/` (1:1 spiegeln).

**Schritte:**

- [ ] **PrismaAlarmierungMapper** (`packages/backend/src/infrastructure/alarmierung/prisma-alarmierung.mapper.ts`): Übersetzt zwischen Aggregate und Prisma-Models. Bildet `AlarmierungEmpfaengerRef` auf die drei nullable FKs ab und umgekehrt (Discriminator-Mapping). Behandelt Nachalarmierung-FK.
- [ ] **PrismaAlarmierungRepository** (`packages/backend/src/infrastructure/alarmierung/prisma-alarmierung.repository.ts`): Implementiert `IAlarmierungRepository`.
  - `save` als Upsert Root + Diff der Empfänger (analog `PrismaFunkkanalRepository`). In einer Prisma-Transaktion.
  - `findById` → lädt Root + Empfänger, ruft `AlarmierungAggregate.reconstitute`.
  - `findByEinsatzId` mit Filter/Pagination.
  - `findAktiveByFahrzeugId` → Query über `alarmierung_empfaenger.fahrzeug_id` + `alarmierung.status = 'aktiv'` + `alarmierung.einsatz_id`.
- [ ] **PrismaService** um die beiden neuen Model-Getter erweitern (`alarmierung`, `alarmierungEmpfaenger`) — analog `funkkanal`/`funkkanalZuordnung` in `packages/backend/src/infrastructure/database/prisma.service.ts`.
- [ ] **Outbox 4-Stellen-Registrierung** — für JEDES der 7 Events:
  1. **`packages/backend/src/infrastructure/outbox/event-serializer.ts`** — neuer Switch-Case pro `eventName()` der VOs + Value Objects in POJOs entpackt (`AlarmierungId.value` → `string`, Dates → ISO-String). `import type` am Dateianfang.
  2. **`packages/backend/src/infrastructure/outbox/event-deserializer.ts`** — neuer Eintrag in der `eventRegistry`-Map des Konstruktors + private `deserializeXxx`-Methode. Konkrete `import`-Zeilen für die 7 Event-Klassen (KEIN `import type` für die Injectable-Neighboors — hier aber reine TS-Imports erlaubt, Events sind keine Injectable-Klassen). Value Objects (`AlarmierungId`, `AlarmierungEmpfaengerId`, `EinsatzId`) über deren `create(value)` Factory rekonstruieren.
  3. **`packages/backend/src/infrastructure/events/adapters/index.ts`** — Barrel-Export um `alarmierung-event.adapter` + `fms-alarmierung-zeitpunkt.adapter` ergänzen.
  4. **`packages/backend/src/infrastructure/events/event-adapters.module.ts`** — beide Adapter als Provider registrieren.
- [ ] **AlarmierungEventAdapter** (`packages/backend/src/infrastructure/events/adapters/alarmierung-event.adapter.ts`): `@OnEvent` für alle 7 `EVENT_NAMES.ALARMIERUNG.*`-Events, broadcastet via `IEinsatzEventPublisher.broadcast(einsatzId.value, '<event>', payload)` auf WebSocket-Channels wie `alarmierung:erstellt`, `alarmierung:empfaenger-hinzugefuegt`, … . Struktur analog `FunkkanalEventAdapter`. Tolerant gegenüber fehlendem Publisher (`@Optional()`).
- [ ] **FmsAlarmierungZeitpunktAdapter** (`packages/backend/src/infrastructure/events/adapters/fms-alarmierung-zeitpunkt.adapter.ts`): `@OnEvent(FmsStatusGeaendertEvent.eventName())`, 50ms Delay (wie bei ETB-Adaptern), Circuit-Breaker `circuitBreaker.execute('alarmierung', ...)`, ruft den Application-Handler `FmsStatusZuAlarmierungHandler` auf (via DI-Token `EVENT_HANDLER.FMS_STATUS_ZU_ALARMIERUNG`).
- [ ] **AlarmierungInfrastructureModule** (`packages/backend/src/infrastructure/alarmierung/alarmierung-infrastructure.module.ts`): bindet `ALARMIERUNG_TOKENS.REPOSITORY → PrismaAlarmierungRepository`. Wird im `AppModule` nach `FunkkanalInfrastructureModule` importiert.
- [ ] **Mapper-Unit-Tests** + **Integration-Tests** gegen Postgres (analog `prisma-funkkanal.repository.spec.ts`).
- [ ] **Event-Deserializer-Test** — neuer Testfall pro neuem Event (Roundtrip-Check, inkl. Null-Werte für `neuerWert/alterWert` bei `ZeitpunktKorrigiert`).
- [ ] **Architecture-Rules-Spec** gegenbauen: die `architecture-rules.spec.ts` zählt registrierte Events. Nach Registrierung ist der erwartete Count +7.

**Definition-of-Done:**

- `pnpm --filter @bluelight-hub/backend test -- --testPathPatterns="infrastructure/alarmierung|event-serializer|event-deserializer|event-adapters"` grün.
- `pnpm --filter @bluelight-hub/backend check:arch` grün (keine Circular Dependencies).
- Commit: `✨(alarmierung): Infrastructure-Schicht — Repository, Event-Adapter, Outbox`

---

## Task 5 — Modules-Schicht: Controller + REST-Endpoints

**Vorbild:** `packages/backend/src/modules/funkkanal/funkkanal.controller.ts`.

**Schritte:**

- [ ] **AlarmierungController** unter `packages/backend/src/modules/alarmierung/alarmierung.controller.ts` mit Prefix `einsatz/:einsatzId/alarmierungen`.
- [ ] **EmpfaengerController** unter `packages/backend/src/modules/alarmierung/empfaenger.controller.ts` mit Prefix `einsatz/:einsatzId/alarmierungen/:alarmierungId/empfaenger`.
- [ ] **Endpoints:**
  - `GET  /einsatz/:einsatzId/alarmierungen` — List (Filter `status`, Pagination).
  - `POST /einsatz/:einsatzId/alarmierungen` — Create.
  - `GET  /einsatz/:einsatzId/alarmierungen/timeline` — Timeline (muss VOR der ID-Route stehen).
  - `GET  /einsatz/:einsatzId/alarmierungen/:alarmierungId` — Detail.
  - `POST /einsatz/:einsatzId/alarmierungen/:alarmierungId/abschliessen` — Abschluss.
  - `POST /einsatz/:einsatzId/alarmierungen/:alarmierungId/nachalarmierung` — Nachalarmierung erzeugen (wrapper).
  - `POST /einsatz/:einsatzId/alarmierungen/:alarmierungId/empfaenger` — Empfänger hinzufügen.
  - `DELETE /einsatz/:einsatzId/alarmierungen/:alarmierungId/empfaenger/:empfaengerId` — Empfänger entfernen.
  - `PATCH /einsatz/:einsatzId/alarmierungen/:alarmierungId/empfaenger/:empfaengerId/zeitpunkte` — Zeitpunkt korrigieren (erwartet Body mit optional `ausgeruecktAm | vorOrtAm | wiederFreiAm: string|null`). Dispatcht pro geändertem Feld einen `KorrigiereZeitpunktCommand`.
- [ ] **Decorators:** `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse` (NICHT `@ApiOkResponse` — bricht sonst die API-Client-Generierung). `@ApiTags('alarmierung')`.
- [ ] **AlarmierungModule** unter `packages/backend/src/modules/alarmierung/alarmierung.module.ts` — importiert `AlarmierungApplicationModule` + `AlarmierungInfrastructureModule`.
- [ ] **Error-Helper** `modules/alarmierung/helpers/alarmierung-error.helper.ts` — mappt Domain-Fehler-Strings auf HTTP-Status (409 Konflikt, 404 nicht gefunden, 422 Invariante verletzt, 400 Default). Analog Funkkanal.
- [ ] **Controller-Tests** pro Endpoint (happy path + 2–3 Fehlerfälle).

**Definition-of-Done:**

- `pnpm --filter @bluelight-hub/backend test -- --testPathPatterns="modules/alarmierung"` grün.
- `pnpm --filter @bluelight-hub/backend check:di:imports` grün.
- Commit: `✨(alarmierung): Controller + REST-Endpoints`

---

## Task 6 — Backend-Tests: Aggregat + Cross-Layer

**Schritte:**

- [ ] **Aggregat-Unit-Tests** (`packages/backend/src/domain/aggregates/alarmierung/__tests__/alarmierung.aggregate.spec.ts`) — mind. 25 Tests:
  - Factory happy path + jede Failure-Bedingung.
  - `fuegeEmpfaengerHinzu` inkl. Duplikat-Erkennung für alle 3 Empfänger-Typen.
  - `korrigiereZeitpunkt` mit/ohne vorherigem Wert, Zurücksetzen auf null, Rejection wenn abgeschlossen, Rejection wenn neuer Wert vor `alarmiertAm`.
  - `aktualisiereZeitpunktAusFms` — no-op auf Nicht-Fahrzeug, respektiert manuelle Werte, überschreibt nicht, Status → Feld-Mapping (1/2 → wiederFreiAm, 3 → ausgeruecktAm, 4 → vorOrtAm), unbekannter Status setzt nur `letzterFmsStatus`.
  - `abschliessen` — zweimal abschließen schlägt fehl.
  - `entferneEmpfaenger` — happy path + nicht gefunden.
  - `reaktionszeitSekunden`-Getter mit verschiedenen Kombinationen.
  - Events werden korrekt akkumuliert (`getDomainEvents()`).
- [ ] **EmpfaengerRef-Spec** (`empfaenger-ref.spec.ts`) — `validateEmpfaengerRef` + `empfaengerRefEquals`.
- [ ] **Cross-Layer-Integration-Test** (optional, `packages/backend/test/integration/alarmierung.e2e-spec.ts`) — HTTP-Flow: Alarmierung erzeugen → Empfänger hinzufügen → Zeitpunkt korrigieren → abschließen. Zählt als "golden path".
- [ ] **architecture-rules.spec** prüft das erwartete Event-Count (war +7).

**Definition-of-Done:**

- `pnpm --filter @bluelight-hub/backend test` insgesamt grün (Baseline-Count vorher/nachher notieren).
- Commit: `🧪(alarmierung): Backend-Tests — Aggregat + Integration`

---

## Task 7 — API-Client generieren

**Schritte:**

- [ ] `pnpm run generate-api` ausführen (Top-Level).
- [ ] Diff prüfen: neue `AlarmierungApi` + `AlarmierungEmpfaengerApi`-Klassen, DTOs `AlarmierungResponseDto`, `AlarmierungEmpfaengerResponseDto` (inkl. `reaktionszeitSekunden?: number`), polymorpher Empfänger-Discriminator muss als `{kind:'fahrzeug', fahrzeugId}` | `{kind:'person', personId}` | `{kind:'einheit', einheitId}`-Union generiert werden. Falls stattdessen `object` herauskommt, fehlt in den DTOs `@ApiExtraModels` + `oneOf/discriminator`-Annotation.
- [ ] `packages/shared/src/api/api.ts`-Proxy um `AlarmierungApi` und `AlarmierungEmpfaengerApi` erweitern (analog bestehendem `FunkkanalApi`-Eintrag).
- [ ] `pnpm --filter @bluelight-hub/frontend typecheck` grün.

**Definition-of-Done:**

- Generierter Client lintbar, Frontend-Typecheck grün.
- Commit: `✨(shared): API-Client für Alarmierung generiert`

---

## Task 8 — Frontend-Feature `features/alarmierung`

**Vorbild:** `packages/frontend/src/features/funkverkehr/` (Struktur 1:1 spiegeln).

**Schritte:**

- [ ] **Feature-Skelett** unter `packages/frontend/src/features/alarmierung/` mit Verzeichnissen `api/`, `hooks/`, `schemas/`, `stores/`, `ui/{atoms,molecules,organisms,pages}`, `utils/`, `__tests__/`.
- [ ] **`api/queries.ts`** — `ALARMIERUNG_QUERY_KEYS` (all, list, detail, timeline) + `useAlarmierungen(einsatzId, filter)` + `useAlarmierung(einsatzId, alarmierungId)` + `useAlarmierungTimeline(einsatzId)`.
- [ ] **`api/mutations.ts`** — `useErstelleAlarmierung`, `useFuegeEmpfaengerHinzu`, `useEntferneEmpfaenger`, `useKorrigiereZeitpunkt`, `useAbschliesseAlarmierung`, `useErstelleNachalarmierung`. Optimistic Update für `useKorrigiereZeitpunkt` (Zeile sofort zeigen + Rollback bei Fehler).
- [ ] **`stores/alarmierung.store.ts`** — `@tanstack/react-store`: selektierte AlarmierungId + Filter (status).
- [ ] **`schemas/alarmierung.schema.ts`** — Zod-Schemas für Create-/Empfänger-/Zeitpunkt-Forms.
- [ ] **`hooks/use-reaktionszeit.ts`** — formatierte Anzeige (mm:ss). Farbcodierung grün/gelb/rot per Schwellwert (<5 min / <10 min / ≥10 min).
- [ ] **WebSocket-Integration:** `packages/frontend/src/features/funkverkehr/api/use-einsatz-events.ts` um 7 `alarmierung:*`-Events erweitern (analog `funkkanal:*`). Invalidiert `ALARMIERUNG_QUERY_KEYS.list(einsatzId)` und `.timeline(einsatzId)` und bei spezifischer `alarmierungId` zusätzlich `.detail(einsatzId, alarmierungId)`.
- [ ] **Atoms:**
  - `AlarmierungStatusBadge.atom.tsx` — aktiv / abgeschlossen.
  - `ReaktionszeitAnzeige.atom.tsx` — farbcodiert, mit aria-label.
  - `ZeitpunktPill.atom.tsx` — einzelner Zeitstempel mit Quelle-Icon (FMS / manuell).
  - `EmpfaengerTypBadge.atom.tsx` — Fahrzeug / Person / Einheit.
  - `NachalarmierungBadge.atom.tsx` — "Nachalarmierung von …".
- [ ] **Molecules:**
  - `EmpfaengerZeile.molecule.tsx` — Tabellenzeile mit 4 editierbaren Zeitstempel-Popovern (Headless UI Popover + `@tanstack/react-form`).
  - `ZeitpunktKorrekturPopover.molecule.tsx` — Datum/Zeit-Edit.
  - `AlarmierungListItem.molecule.tsx` — Card mit Bezeichnung, Zeitpunkt, Empfänger-Count, Nachalarmierungs-Link.
  - `AlarmierungTimelineEvent.molecule.tsx` — einzelnes Timeline-Event mit Icon (Auslösung, Statuswechsel, Korrektur).
- [ ] **Organisms:**
  - `AlarmierungErstellenDrawer.organism.tsx` — Form mit Bezeichnung + optionaler Beschreibung + Empfänger-Combobox (wiederverwendet `useRufnameVorschlaege` aus Funkverkehr, gruppiert nach Fahrzeug/Person/Einheit).
  - `AlarmierungEmpfaengerTabelle.organism.tsx` — sortierbar nach Reaktionszeit + Inline-Edit der Zeitpunkte.
  - `AlarmierungTimeline.organism.tsx` — chronologische Liste, Default-Filter auf aktives Einsatz-Fenster.
  - `NachalarmierungDialog.organism.tsx` — kleines Modal, setzt `ursprungAlarmierungId`.
- [ ] **Page + Route:**
  - `AlarmierungPage.tsx` — 2-Panel-Layout (Liste links, Detail + Timeline-Tab rechts). `validateSearch` mit `tab: 'liste'|'timeline'`.
  - **Route-Datei** `packages/frontend/src/routes/app/einsatz/$einsatzId/kommunikation/alarmierung.tsx` — ersetzt den `<ComingSoon />`-Platzhalter durch `<AlarmierungPage />`.
- [ ] **WebSocket-Setup auf Page-Ebene** (analog `FunkverkehrPage`): `useEinsatzEvents({ einsatzId })`.
- [ ] **Vitest-Unit-Tests** für Atoms, Molecules, Hooks (mindestens 10 Tests).

**Definition-of-Done:**

- `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="features/alarmierung"` grün.
- `pnpm --filter @bluelight-hub/frontend typecheck` grün.
- **Browser-Smoke-Test** via Chrome-DevTools-MCP: Login (rubeen / MyPass123*), in Einsatz navigieren, `kommunikation/alarmierung` öffnen, Alarmierung mit 2 Fahrzeug-Empfängern erstellen, Zeitpunkt manuell nachtragen, abschließen, Nachalarmierung starten, Timeline prüfen. FMS-Auto-Population testbar, indem parallel auf `/kräfte/fahrzeuge` der FMS-Status eines zugeordneten Fahrzeugs geändert wird.
- Commit: `✨(frontend): Alarmierungs-Feature + Route`

---

## Task 9 — Quality-Pass (Code-Review + DoD)

**Schritte:**

- [ ] **Drei parallele Code-Reviewer-Agents** (via Task-Agent, subagent_type `feature-dev:code-reviewer`):
  1. Fokus Simplicity/DRY/Elegance (besonders Mapper + Repository-Diff).
  2. Fokus Bugs/Funktionale Korrektheit (besonders FMS-Auto-Population, Zeitpunkt-Korrektur, Nachalarmierung).
  3. Fokus Projekt-Konventionen (Decorators, DI-Imports, Ordnerstruktur, Naming, Event-Namenskonvention).
- [ ] Findings konsolidieren, kritische Issues direkt fixen.
- [ ] **Vollständige Test-Suite**:
  - Backend: `pnpm --filter @bluelight-hub/backend test` + Test-Count notieren.
  - Frontend: `pnpm --filter @bluelight-hub/frontend test` + Test-Count notieren.
- [ ] **Linting + Arch-Checks**: `pnpm lint` (oxlint/oxfmt) + `pnpm --filter @bluelight-hub/backend check:arch` + `check:di:imports`.
- [ ] **Dokumentation** aktualisieren (nur wenn Architektur-relevant):
  - `docs/deep-dive-backend.md` — Alarmierung-Sektion ergänzen (Aggregat-Tabelle, FMS-Handler-Flow).
  - ggf. neuer ADR unter `docs/adr/adr-00N-alarmierung.md` (Entscheidung: getrennte Commands manuell vs. FMS-Auto).
- [ ] **PR-Vorbereitung**: Branch pushen, PR gegen `alpha` erstellen, Body zusammenfassen.

**Definition-of-Done:**

- Alle Tests grün, Lint/Arch sauber.
- Commit(s): `🧪(alarmierung): Tests + Review-Fixes` und ggf. `📝(docs): Alarmierungs-ADR + Deep-Dive`.

---

## 🔑 Wichtige Konventionen (nicht vergessen)

- **DI-Imports:** `import { X } from '…'` — **niemals** `import type` für Injectable-Klassen (Pre-Commit-Hook `check:di:imports` prüft).
- **API-Decorators:** `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse` — **niemals** `@ApiOkResponse({ type: ... })` (bricht Client-Generation).
- **Response-Wrapper:** Frontend-Hooks packen aus dem Response-Wrapper **`.data`** aus (siehe Funkverkehr-Lesson-Learned: Task 40-Fix in `8f8f12579`).
- **Routen-Nesting:** alle Endpoints unter `einsatz/:einsatzId/alarmierungen` (siehe `feedback_route_nesting.md`).
- **Umlaute:** Deutsche Texte in Kommentaren/JSDoc/Tests/User-Strings mit korrekten Umlauten (ä, ö, ü, ß), nicht mit `ae`/`oe`/`ue`/`ss`. Code-Identifier bleiben ASCII.
- **Event-Registrierung:** 4 Stellen (serializer, deserializer, adapters-module, adapters-index). Architecture-Rules-Spec verifiziert Count.
- **ETB-Integration:** fire-and-forget, Circuit-Breaker `execute('alarmierung', …)`. 50ms Delay gegen DB-Commit-Race.
- **Ports (HTTPS only):** Frontend `https://localhost:3090`, Backend `https://127.0.0.1:3091/api`, DB-Port `3092`. Im Worktree via `scripts/worktree-setup.sh` zugewiesen.
- **Tests gezielt laufen:** `npx jest --testPathPatterns="application/alarmierung" --no-coverage` direkt im `packages/backend/` (via `pnpm --filter` werden `--`-Argumente falsch zusammengefügt).

---

## 🧭 Nächster-Agent-Kontext (kurz)

- **Gesamt-Scope ist Wave 1 dieses Issues.** Wave 2+ (Alarmierungswege #691, externe Systeme #692) sind bewusst verschoben.
- **Architektur: Variante C "Pragmatic" + Einheit-Empfänger**, ausgewählt aus 3 Varianten (A Minimal / B Clean / C Pragmatic). Alle drei Varianten sind in der Projekt-Konversation dokumentiert.
- **ETB-Kategorie `ALARMIERUNG`** existiert bereits als Value Object — nur verwenden, nicht neu anlegen.
- **FunkStatusConfig** hat ein `istAlarmierbar`-Flag (Status 1+2), das bisher im Frontend nicht genutzt wird. In Wave 1 **nicht auswerten** — Empfänger-Auswahl erfolgt manuell.
- **Keine Status-Board-UI.** Deep-Link zu `/kräfte/fahrzeuge` reicht.
