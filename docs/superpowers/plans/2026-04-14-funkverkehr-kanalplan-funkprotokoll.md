# Funkverkehr: Kanalplan & Funkprotokoll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## 📌 Handoff-Status (Stand 2026-04-15, Wave 1 + Phasen 4–12 abgeschlossen)

**Branch:** `407/wave-1-foundation-v2` (Basis: `407/funkverkehr-implementation`, nur Spec-Commits). Frischer Start — die alten Wave-1-Branches (`407/wave-1-foundation`) werden NICHT verwendet.

**Scope dieses Handoffs:** Wave 1 (Tasks 0–10 + 38–39), Wave-2-Phase-4 (Tasks 11–13, Funkkanal Infrastructure), Wave-2-Phase-5 (Tasks 14–17, Funkkanal Application-Layer), Wave-2-Phase-6 (Task 18, WebSocket-Gateway + Publisher), Wave-2-Phase-7 (Tasks 19–24, HTTP-Layer: DTOs + Controller + PDF-Export), Phase 8 (Task 25, API-Client-Regenerierung inkl. DTO-Fix für EintragKontext-Discriminator), Phase 9 (Tasks 26–29, Frontend-Foundation: Feature-Skelett + Filter-Store, Kanalplan-API-Hooks, ETB-Funkprotokoll-Hooks, useEinsatzEvents WebSocket-Hook), Phase 10 (Tasks 30–31, Atoms + Molecules: Priorität-/Status-Badges, KanalDetailsForm, FunkspruchBubble/CompactRow, FunkKontextBadge, NotfallAlertToast), **Phase 11** (Tasks 32–33, Kanalplan-Organisms inkl. Drag-and-Drop) **und Phase 12** (Tasks 34–37, Funkprotokoll-Organisms + FunkverkehrLayout + Tab-Routing auf `/app/einsatz/:einsatzId/kommunikation/funk?tab=kanalplan|protokoll`). **Alle 39 Kern-Tasks sind committed.** Nur Phase 14 (Tasks 40–41, Browser-E2E + Definition-of-Done-Checks) steht noch aus — kein Code mehr zu schreiben, nur Verification.

### ✅ Fertig (committed auf `407/wave-1-foundation-v2`)

| Task | Commit (short SHA) | Stand |
|------|-------------------|-------|
| Task 0 — Baseline-Tests | (keine Code-Änderung) | Baseline: Backend 8558 passing / 62 pre-existing fails / 60 skipped · Frontend 4236 passing / 21 skipped |
| Task 1 — Migration `add_etb_eintrag_kontext_and_zeitstempel` | `1c6cf49af` | Migration applied, Backfill aus `timestamp`, 4 neue Spalten verifiziert |
| Task 2 — Migration `add_funkkanal_and_zuordnung` | `eb2b83ec1` | Check-Constraint `funkkanal_zuordnung_genau_eine_kraft` getestet |
| Task 3 — FunkPrioritaet + EintragKontext VOs | `63d807a89` | 18 Tests grün (VOs liegen in `domain/value-objects/`, nicht `aggregates/etb/`) |
| Task 4 — EtbEintrag-Entity erweitert | `41f586d32` | Felder an Positionen 14 (ereignisZeitpunkt), 15 (erfasstAm), 16 (kontext). 39/39 Entity-Tests |
| Task 5 — Aggregat `addEintrag` + EintragAddedEvent | `93d55e2fa` | Options-Objekt `AddEintragOptions`, Event trägt kontext/ereignisZeitpunkt/absender/empfaenger, Serializer+Deserializer angepasst |
| Task 6 — ETB-Prisma-Mapper + Repository | `4b734ca15` | Raw-SQL-INSERT in `prisma-etb.repository.ts` um 4 neue Spalten erweitert, Roundtrip-Tests grün |
| Task 7 — AddEintragCommand + Handler | `f63847918` | `AddEintragCommandKontext` POJO am API-Rand, Handler konvertiert zu Domain-VO. 60/60 Tests |
| Task 8 — KanalDetails VO | `7309da047` | 19 Tests grün, liegt in `domain/aggregates/funkkanal/kanal-details.vo.ts` |
| Task 9 — Funkkanal-Entity + Aggregat + Zuordnung + IDs | `ae21aa232` | 22 Aggregat-Tests grün, `FunkkanalId`/`FunkkanalZuordnungId` in `domain/value-objects/`, Aggregat mit `reconstitute()` für Repository-Hook |
| Task 10 — 7 Funkkanal Domain-Events + EVENT_NAMES.FUNKKANAL/FUNK | `ed4017716` | 10 Event-Tests grün, `FunkkanalReihenfolgeGeaendert`/`NotfallAlertRequested` haben `aggregateId = einsatzId` (kanal-übergreifend) |
| Task 38 — 4 ADRs (005–008) | `ac846a34d` | Nummerierung folgt bestehendem Schema `adr-NNN-*.md`, nicht `NNNN-*.md` |
| Task 39 — Architektur-Doku erweitert | `928c1913c` | Kein `docs/architecture/` im Repo — stattdessen `docs/deep-dive-backend.md` erweitert (Aggregat-Tabelle, Funkkanal-Sektion, Funkspruch-Notfall-Flow) |
| Task 11 — Funkkanal-Mapper + Repository | `3b032d376` | `IFunkkanalRepository` in `domain/repositories/` (nicht `application/common/ports/`), `PrismaFunkkanalMapper` (TMO/DMO/Analog Roundtrip), `PrismaFunkkanalRepository` mit Upsert Root + Diff Zuordnungen + `hasFunkspruchReferenz` via raw SQL. PrismaService um `funkkanal`/`funkkanalZuordnung`-Getter erweitert. 11 Mapper-Unit-Tests + 8 Postgres-Integration-Tests grün |
| Task 12 — Event-Registry + Adapter | `a2b1d20c7` | 7 Funkkanal-Events in `event-serializer.ts` + `event-deserializer.ts` registriert, `FunkkanalEventAdapter` (alle 7 Events) + `EtbFunkspruchBroadcastAdapter` (ETB-Einträge mit Funkspruch-Kontext) in `EventAdaptersModule`. Publisher via `EINSATZ_EVENT_PUBLISHER` @Optional — konkrete Impl kommt mit Task 18; bis dahin Log-only. `event-deserializer.spec` + `architecture-rules.spec` grün (102 registrierte Events). 9 Roundtrip + 13 Adapter-Tests |
| Task 13 — DI-Tokens + FunkkanalInfrastructureModule | `680e68d45` | `FUNKKANAL_TOKENS` (REPOSITORY, MAPPER, KANALPLAN_PDF_SERVICE, EINSATZ_EVENT_PUBLISHER) in `di-tokens.ts` — `EINSATZ_EVENT_PUBLISHER` wurde bereits in Task 12 eingezogen, da der Adapter sie braucht. `FunkkanalInfrastructureModule` bindet `PrismaFunkkanalRepository` an `FUNKKANAL_REPOSITORY` und wird im `AppModule` nach `TaktischeZeichenModule` importiert. `check:di:imports` + `di-resolution.spec` grün |
| Task 14 — Funkkanal-Commands (9 Stück: create/rename/changeDetails/setZweck/setSortIndex/archive/deactivate/activate/reorder) | `803cb2d76` · `4c7b366cc` · `db54731c5` · `94049066c` · `830e91bde` · `230044780` · `4ff422ed1` · `54789341b` · `0faf3375c` | Jeder Command in eigenem Ordner unter `application/funkkanal/commands/` mit `*.command.ts`, `*.handler.ts`, `__tests__/`, `index.ts`. Handler erben `TransactionalCommandHandler`, lösen `FUNKKANAL_REPOSITORY` via `@Inject` auf. `ReorderFunkkanaeleHandler` emittiert einen einzigen `FunkkanalReihenfolgeGeaendertEvent` (aggregateId = einsatzId) nach Bulk-`repo.reorder`. Namens-Duplikat-Check (`existsByName`) im create + rename. Zusammen **45 Tests grün** |
| Task 15 — Funkkanal-Zuordnungs-Commands (zuordne-kraft-zu-kanal / aendere-zuordnung-rolle / entferne-zuordnung) | `c84a25020` | `ZuordneKraftZuKanalHandler` injiziert `KRAEFTE_REPOSITORIES.EINSATZ_{FAHRZEUG,PERSON,EINHEIT}` und zieht `rufnameSnapshot` aus dem jeweiligen Aggregat (Person fallback: `vorname + nachname`). 12 Tests grün |
| Task 16 — Funkkanal-Queries (get-kanalplan / get-funkkanal-by-id / get-rufnamen-vorschlaege) | `a1a6be96b` | Read-only Handler ohne Transaction/Outbox. `GetRufnamenVorschlaegeQueryHandler` aggregiert Fahrzeuge/Personen/Einheiten parallel via `Promise.all`. 10 Tests grün |
| Task 17 — NotfallFunkspruchAlertHandler + Adapter-Wiring | `59e60980e` | Application-Handler in `application/funkkanal/event-handlers/notfall-funkspruch-alert.handler.ts`, Infrastructure-Adapter `NotfallFunkspruchAlertEventAdapter` (`@OnEvent` auf `EintragAddedEvent`). `FunkkanalApplicationModule` registriert Handler unter `EVENT_HANDLER.NOTFALL_FUNKSPRUCH_ALERT` und wird im `EventAdaptersModule` importiert. 7 Tests grün |
| Task 18 — EinsatzEventsGateway + EinsatzEventPublisher | `020bfa738` | Infrastructure-Modul `WebsocketModule` unter `packages/backend/src/infrastructure/websocket/` (Gateway + Publisher + `WsJwtAuthGuard` + DTO). Namespace `/ws/einsatz-events`, Room `einsatz:{id}`, `SubscribeMessage('join:einsatz')` mit `IEinsatzTeilnehmerRepository`-Check. Publisher implementiert `broadcast` (direkt) + `broadcastByEtb` (resolved etbId → einsatzId via `IEtbRepository`) und wird unter `EINSATZ_EVENT_PUBLISHER` registriert. `EventAdaptersModule` importiert `WebsocketModule` — damit sind `FunkkanalEventAdapter`, `EtbFunkspruchBroadcastAdapter` + indirekt `NotfallFunkspruchAlertEventAdapter` scharf geschaltet. `IEinsatzEventPublisher`-Port + `EinsatzEventName`-Union leben jetzt in `infrastructure/websocket/events/einsatz-event.types.ts`. 10 neue Tests (6 Gateway + 4 Publisher), 526 Funkverkehr-Tests gesamt grün |
| Task 19 — Funkkanal-DTOs + EintragKontext-DTOs | `83164b71c` | Discriminated-Union-DTOs für KanalDetails (TmoDetailsDto/DmoDetailsDto/AnalogDetailsDto + `KANAL_DETAILS_SCHEMA` für Swagger oneOf+discriminator), CRUD/Reorder/Zuordnung/Response-DTOs sowie `RufnameVorschlaegeResponseDto` unter `application/funkkanal/dto/` (NICHT `modules/funkkanal/dto/` wie im Plan — entspricht bestehendem Pattern für ETB/Einsatz). EintragKontext-DTOs (`StandardKontextDto`/`FunkKontextDto` + `EINTRAG_KONTEXT_SCHEMA`) liegen in `application/etb/dto/eintrag-kontext.dto.ts`. XOR-Validator `HasExactlyOneKraftReference` mit 7 Tests grün |
| Task 20 — Funkkanal-Controller (CRUD + Reorder) | `08168b047` | `FunkkanalController` unter `modules/funkkanal/funkkanal.controller.ts`, Prefix `einsatz/:einsatzId/funkkanaele`. PATCH-Endpoint dispatcht gesetzte UpdateFunkkanalDto-Felder auf die 9 feingranularen Aggregat-Commands; `status: 'aktiv' \| 'inaktiv'` triggert Activate/Deactivate, DELETE archiviert. `FunkkanalApplicationModule` registriert + exportiert jetzt alle Command-/Query-Handler. Error-Helper `toHttpError` mappt Domain-Fehler-Strings auf 409/404/422/400. 13 Controller-Tests + DI-Resolution grün |
| Task 21 — Funkkanal-Zuordnungs-Controller | `a5aaadf6a` | `FunkkanalZuordnungController` unter `einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen` für Create / UpdateRolle / Delete. Mappt fahrzeugId/personId/einheitId XOR-DTO auf diskriminierten `ZuordneKraftRef`. Error-Helper erkennt jetzt zusätzlich „bereits ... zugeordnet" als 409-Konflikt. 9 Tests grün |
| Task 22 — Rufname-Vorschlaege-Controller | `344c53002` | `RufnameVorschlaegeController` unter `einsatz/:einsatzId/rufname-vorschlaege` mit Mapping vom flachen Query-Result auf `RufnameVorschlaegeResponseDto`. 3 Tests grün |
| Task 23 — Kanalplan-PDF-Export (Service + Controller) | `e9700b52b` | `IKanalplanPdfService`-Port unter `application/funkkanal/ports/`, pdfkit-basierter Adapter `KanalplanPdfService` unter `infrastructure/funkkanal/`. Provider-Binding `KANALPLAN_PDF_SERVICE → KanalplanPdfService` ergänzt im `FunkkanalInfrastructureModule`. `KanalplanExportController` (`einsatz/:einsatzId/kanalplan/export.pdf`) löst Einsatz-Name via `EINSATZ_REPOSITORY` auf (Fallback einsatzId), liefert `application/pdf` mit `Content-Disposition: attachment`. 5 Tests (3 Service + 2 Controller) grün |
| Task 24 — ETB-Controller um Kontext erweitert | `a103a05ab` | `AddEintragDto` + `EintragDto` um `kontext` (StandardKontext\|FunkKontext), `ereignisZeitpunkt` und `erfasstAm` erweitert. `EtbCqrsController.addEintrag` reicht beide Felder an `AddEintragCommand.create` durch. `GET /etb/einsatz/:einsatzId` akzeptiert optionale Query-Filter `kontextType` + `kanalId` — Filterung erfolgt aktuell **in-memory** im `EtbQueryMapper.toEtbDto` (Plan-Abweichung: kein Repository-Filter, um Migrations- und Raw-SQL-Änderungen zu vermeiden). 3 neue Mapper-Tests + bestehende 1100 ETB-Tests grün |
| Task 25 — API-Client + DTO-Fix + Lint-Staged-Fix | `7a4f3ffad` · `429eb652a` · `1abee3581` | Zuerst `oneOf/discriminator` an `AddEintragDto.kontext` und `EintragDto.kontext` ergänzt (Swagger-Annotation fehlte → Client generierte `object`). Dann `lint-staged` angepasst (`oxlint --no-error-on-unmatched-pattern`), weil `packages/shared/client/**` in `.oxlintrc.json` ignoriert ist und Commits mit ausschließlich generiertem Code sonst fehlschlugen. `pnpm run generate-api` liefert saubere Unions: `FunkkanalResponseDtoDetails = {type:'analog'} & AnalogDetailsDto \| ...`, `AddEintragDtoKontext`/`EintragDtoKontext = {type:'funkspruch'} & FunkKontextDto \| {type:'standard'} & StandardKontextDto`. Frontend-Typecheck sauber. |
| Task 26 — Feature-Skelett + Filter-Store | `2f1fedec7` | `packages/frontend/src/features/funkverkehr/` mit Verzeichnissen `api/`, `hooks/`, `schemas/`, `stores/`, `ui/{atoms,molecules,organisms,pages}`, `utils/`, `__tests__/`. `funkprotokoll-filter.store.ts` via `createStore` (kein `new Store()`) — persistiert Filter pro Einsatz-ID (kanalIds / prioritaeten / vonDate / bisDate / absender / volltext / dichteMode). 4 Store-Tests grün. |
| Task 27 — Kanalplan-API-Hooks (TanStack Query) | `b4ee1600b` | `FunkkanalApi` in `shared/api/api.ts`-Proxy registriert. `api/queries.ts` (`FUNKVERKEHR_QUERY_KEYS` + `useKanalplan`/`useFunkkanal`/`useRufnameVorschlaege`) und `api/mutations.ts` (Create/Update/Archive/Reorder + Zuordnungs-Hooks + `useExportKanalplanPdf` via `*Raw`-Variante → `response.raw.blob()`). `useReorderFunkkanaele` mit optimistic Cache-Update + Rollback. 12 Tests grün. |
| Task 28 — ETB-basierte Funkprotokoll-Hooks | `45ea7bacd` | `hooks/use-funkprotokoll-eintraege.ts` nutzt `etbCqrsControllerGetEtbByEinsatzIdVAlpha` mit `kontextType=funkspruch`; `kanalId` nur bei **genau einem** gewählten Kanal serverseitig, alle weiteren Filter (Priorität, Zeitraum, Absender-Query, Volltext, Multi-Kanal) in `applyClientFilters`. 404 → leere Liste (ETB noch nicht angelegt). `use-create-funkspruch.ts` kapselt AddEintrag mit Default-`kategorie=KOMMUNIKATION` + `einsatzId` im Body (Auto-ETB-Creation-Flag). `use-dichte-mode.ts` dünner Wrapper um Filter-Store. 8 Tests grün. |
| Task 29 — useEinsatzEvents WebSocket-Hook | `0f0917b08` | `api/use-einsatz-events.ts` — socket.io ohne Auto-Reconnect (eigener Backoff 1s/2s/5s/10s/30s via `EINSATZ_EVENTS_BACKOFF_MS`). Nach `connect` wird `join:einsatz` emittiert + Full-Invalidate (Kanalplan/Funkprotokoll/ETB). Handler für `etb:eintrag-erstellt/korrigiert`, 6× `funkkanal:*` und `funk:notfall-alert` (mit optionalem `onNotfall`-Callback). `join:einsatz:error` → Status `error` + Disconnect. 7 Tests grün (Connect, Invalidierung, Backoff, Cleanup). |
| Task 30 — Atoms: FunkPrioritaetBadge + KanalStatusBadge | `35406c8cf` | `utils/priority-color.ts` liefert `PRIORITAET_STYLES` (routine/prioritaet/notfall mit Farbe, Border, Icon-Name, `pulse`-Flag). `FunkPrioritaetBadge` mit Radio-/Warning-/Sirenen-Icon (`react-icons/pi`), `iconOnly`-Modus, `role="status"`, `aria-label`. `KanalStatusBadge` für `aktiv`/`inaktiv`/`archiviert`. 8 Tests grün. |
| Task 31 — Molecules: KanalDetailsForm + Bubbles + NotfallToast | `3f299dfa4` | `ui/molecules/`: `KanalDetailsForm` Controlled mit Radio-Group TMO/DMO/Analog und typabhängigen Feldern, `aria-invalid` + `role="radiogroup"`. `FunkKontextBadge` (Button/Span via `asSpan`) mit Fallback "Kanal (gelöscht)" und Prioritäts-Icon rechts. `FunkspruchBubble` (Chat-Card, Prio-Border links, `time`-Element) + `FunkspruchCompactRow` (font-mono Zeile, `role="listitem"`). `NotfallAlertToast` via `toast.custom` — 10s Dauer, deterministische ID `notfall:{einsatzId}:{ereignisZeitpunkt}`. `utils/format-kanal-details.ts` für Typ-Label + Kennung. 12 Tests grün. |
| Task 32 — KanalEditDrawer + ZuordnungsManager | `efc3f5f92` | `schemas/kanal.schema.ts` mit `z.discriminatedUnion('type', [tmo, dmo, analog])` + `kanalFormSchema`. `KanalEditDrawer` nutzt `Dialog.SlideIn` (right, lg), `@tanstack/react-form` + `zodValidator`, bettet `KanalDetailsForm` ein, dispatcht Create/Update auf `useCreateFunkkanal`/`useUpdateFunkkanal`, bietet Archivieren mit `Dialog.Confirm`-Dialog und hookt 422→Toast mit Archivierungs-Hinweis. `ZuordnungsManager` mit Headless Combobox (gruppiert Fahrzeuge/Personen/Einheiten aus `useRufnameVorschlaege`), Segmented-Rolle (primär/sekundär/zuhören), `useCreateZuordnung`/`useUpdateZuordnungRolle`/`useRemoveZuordnung`. 7 neue Tests. |
| Task 33 — KanalplanTable mit Drag-and-Drop | `869fc976e` | `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` neu installiert (fehlten). Eigene `<table>` (kein shared DataTable) mit `DndContext` + `SortableContext` + `useSortable`, Drag-Handle pro Row, Spalten Name / Typ-Badge / Kennung / ZuordnungChipList / Status-Badge / Dropdown-Aktionen (Edit / Toggle-Status / Archivieren). `onDragEnd` baut neue `ordering`-Liste und reicht sie an `useReorderFunkkanaele`. 3 neue Tests. |
| Task 34 — FunkspruchComposer | `06e8fd812` | Sticky-Form am Fuß des Funkprotokolls. Absender/Empfänger als Headless-UI-Combobox mit `allowCustomValue` (via direktes `onChange` auf dem Eingabewert), Kanal-Dropdown nur aktive Kanäle, DateTime-Picker `datetime-local` (Default jetzt), Prio-Segmented (routine/priorität/notfall), Textarea mit Cmd/Ctrl+Enter Submit + Shift+Enter Newline (Browser-Default). Nutzt `useCreateFunkspruch({ einsatzId, etbId })`; Reset von Text + Prio nach Erfolg. 3 neue Tests. |
| Task 35 — FunkprotokollFilterSidebar | `ca2a59d7f` | Seitenleiste 280px mit Multi-Select Kanäle (aus `useKanalplan` inkl. archivierter — für Historie), Checkbox-Gruppe Priorität, DateTime-Range von/bis, Absender-Input, Volltextsuche mit 250ms Debounce (`setTimeout` pro Edit), Zurücksetzen-Button (`resetFilterForEinsatz`). Liest/schreibt direkt `funkprotokollFilterStore` via `useStore`. 3 neue Tests. |
| Task 36 — virtualisierte FunkprotokollView | `62a874da7` | `@tanstack/react-virtual` mit dynamischem `estimateSize` (`kompakt` 28px / `bubbles` 96px), `measureElement`-Ref pro Row. Dichte-Toggle (`useDichteMode`) im Sticky-Header mit Live-Umschaltung. Auto-Scroll-Logik: `isNearBottom` per scroll-listener (80px Schwelle); bei neuen Einträgen wird entweder auto-gescrollt oder ein Floating-Badge „X neue Nachricht(en)" angezeigt, Pausiert-Indikator wenn nicht am Ende. 4 neue Tests (Virtualizer-Interaktion per Hook-Mock gestubt). |
| Task 37 — FunkverkehrLayout + Page + Route | `5ca5d81b6` | Route `/app/einsatz/:einsatzId/kommunikation/funk` (nicht `funkverkehr` — passt in bestehenden Routenbaum `kommunikation/*`) mit `validateSearch` (`tab: 'kanalplan' \| 'protokoll'`, Default `kanalplan`). `FunkverkehrPage` verdrahtet `useEinsatzEvents` + `showNotfallAlertToast`. `FunkverkehrLayout` steuert Tabs: Kanalplan-Tab mit PDF-Export + „Kanal hinzufügen" + `KanalplanTable` + `KanalEditDrawer`; Protokoll-Tab mit 3-Spalten-Layout (`FunkprotokollFilterSidebar` + `FunkprotokollView` + sticky `FunkspruchComposer`; wenn noch keine ETB existiert, wird Hinweis angezeigt). ETB-Id via `useEtb({ einsatzId })`. 4 neue Route-/Schema-Tests. |

### 🔑 Wichtige Abweichungen vom Plan (Wave 1 Gesamt)

1. **Ordner-Struktur:** Plan suggeriert `domain/aggregates/etb/eintrag-kontext.ts`. Tatsächlich: flache Struktur unter `domain/value-objects/` — `EintragKontext`, `FunkPrioritaet`, `FunkkanalId`, `FunkkanalZuordnungId` liegen dort. `KanalDetails` + Funkkanal-Aggregat liegen in `domain/aggregates/funkkanal/`.
2. **Leere Migration aufgeräumt:** Der lokale Ordner `prisma/migrations/20260413090000_reorder_zeichen_katalog/` war leer (nicht in git). Gelöscht, damit Prisma neue Migrationen erzeugen konnte.
3. **EtbEintrag-Konstruktor:** Neue Felder additiv an Pos 14/15/16 angehängt (statt Options-Refactor), um bestehende Call-Sites nicht zu brechen.
4. **Aggregat-`addEintrag`:** `options?: AddEintragOptions` als 8. Parameter — positional bleibt kompatibel.
5. **Validierung `ereignisZeitpunkt`:** Max 60s in Zukunft erlaubt (Plan sagt „> 1 min" → als `> 60_000 ms` umgesetzt).
6. **Event-Serializer:** `EintragAddedEvent` trägt jetzt kontext/ereignisZeitpunkt/absender/empfaenger im Payload. Deserializer ist backward-compatible (Legacy-Events bekommen `{ type: 'standard' }` als Default).
7. **Repository-SQL (Task 6):** Raw-INSERT um `kontext_type`, `kontext_data`, `erfasst_am`, `ereignis_zeitpunkt` erweitert (inkl. `ON CONFLICT DO UPDATE`). `JSON.stringify(kontextData)` wird via `::jsonb` cast geschrieben; für `standard` wird `NULL` geschrieben.
8. **Commit-Konvention:** Hooks erzwingen Erste-Zeile ≤ 72 Zeichen. Commit-Messages entsprechend kurz halten.
9. **Funkkanal-Aggregat (Task 9):** Mutable Entity-Felder (analog Einsatztagebuch-Pattern); Aggregat hält die Root-Entity als readonly Referenz und mutiert ihre Felder direkt via Setter-Methoden. `reconstitute(kanal, zuordnungen)` für Repository-Hydration ohne Event-Emission. Archivierter Kanal lehnt alle mutierenden Methoden mit `Result.fail` ab (statt Soft-Lock wie ETB).
10. **Funkkanal-Events (Task 10):** `FunkkanalReihenfolgeGeaendert` + `NotfallAlertRequested` tragen `aggregateId = einsatzId.value` (nicht `funkkanalId`), weil sie aggregatsübergreifend sind bzw. einen Einsatz-Room-Broadcast triggern sollen. Die Events sind noch NICHT im Serializer/Deserializer/Adapter-Registry eingehängt — das ist Task 12 in Wave 2.
11. **ADR-Nummerierung (Task 38):** Nächste freie Nummer war 005; bestehendes Schema `adr-NNN-kebab-case.md` wurde übernommen (nicht das im Plan vorgeschlagene 4-stellige `NNNN`). ADR-008 nennt die echten Tabellennamen (`einsatz_fahrzeuge`/`einsatz_personen`/`einsatz_einheiten`) aus der Migration.
12. **Architektur-Doku (Task 39):** `docs/architecture/` existiert nicht als eigener arc42-Ordner; die Projekt-Doku nutzt statt dessen `docs/deep-dive-*.md`. Erweiterungen wurden dort (Bausteinsicht → Aggregat-Tabelle + Funkkanal-Sektion, Laufzeitsicht → Notfall-Flow) ergänzt.
13. **Repository-Port-Ort (Task 11):** Plan sagt `application/common/ports/funkkanal.repository.port.ts`. Tatsächlich: `domain/repositories/i-funkkanal.repository.ts` — konsistent mit `IEtbRepository` und den anderen bestehenden Repository-Ports im Projekt.
14. **`EINSATZ_EVENT_PUBLISHER`-Token vorgezogen (Task 12 statt 13):** Der `FunkkanalEventAdapter` braucht das Token bereits beim Import, daher wurde es zusammen mit den übrigen `FUNKKANAL_TOKENS` in Task 12/13 eingeführt. Der konkrete `EinsatzEventPublisher` kommt mit Task 18; bis dahin ist der Adapter via `@Optional()` verdrahtet und loggt nur.
15. **`EtbFunkspruchBroadcastAdapter` mit etbId-Room (Task 12):** `EintragAddedEvent` + `EintragKorrigiertEvent` tragen aktuell keine `einsatzId`. Der Adapter broadcastet mit `etbId` als Room-Schlüssel; die Resolution `etb → einsatz` erfolgt erst im `EinsatzEventsGateway` (Task 18), das einen Einsatz-Index hält. Filter im Adapter: Nur Einträge mit `kontext.type === 'funkspruch'` werden weitergegeben (Korrektur-Events grundsätzlich).
16. **`einsaetze.status` beim Integration-Test:** Tabelle hat Enum-Werte `ANGELEGT | IN_BEARBEITUNG | ABGESCHLOSSEN | ARCHIVIERT` (nicht `OFFEN`); `EtbStatus` hat `DRAFT | ACTIVE | LOCKED` (nicht `AKTIV`) — Raw-SQL-Fixtures entsprechend anpassen.
17. **Phase 5 Abweichungen (Task 14–17):**
    - **Commands separat statt gebündelt (Task 14):** Plan listet 5 Commands (create/update/archive/delete/reorder); tatsächlich umgesetzt als 9 feinere Commands gemäß Aggregat-API (create/rename/changeDetails/setZweck/setSortIndex/archive/deactivate/activate/reorder). Kein `delete`-Command — Aggregat bietet nur `archive` (+ `deactivate`/`activate`). `existsByName` wird vor `create` und `rename` geprüft.
    - **Auto-sortIndex (Task 14):** `CreateFunkkanalHandler` akzeptiert optionalen `sortIndex`; fehlt er, ermittelt der Handler per `findByEinsatzId({ includeArchived: true })` den höchsten belegten Index + 1 (bzw. 0 bei leerem Plan).
    - **Reorder cross-aggregate (Task 14):** `ReorderFunkkanaeleHandler` lädt nicht alle Aggregate, sondern validiert Coverage gegen `findByEinsatzId({ includeArchived: false })` und delegiert an den Repository-Bulk-Update `reorder(...)`. Emittiert genau **einen** `FunkkanalReihenfolgeGeaendertEvent` pro Call. Plan-Pseudocode `aggregate.applyOrdering(...)` existiert nicht im Aggregat.
    - **Rufname-Snapshot (Task 15):** Plan sagt "Rufnamen-Lookup im Handler". Umsetzung: Person-Aggregat hat `funkrufname` optional; Handler fällt deterministisch auf `${vorname} ${nachname}` zurück und lehnt Zuordnung ab, wenn beide leer. Einheit nutzt `name` direkt.
    - **Queries (Task 16):** Plan sagt, Query gibt DTO zurück. Umsetzung: Queries liefern Domain-`FunkkanalAggregate[]` bzw. `FunkkanalAggregate | null`; die DTO-Projektion erfolgt im Controller (Task 20–22). `GetRufnamenVorschlaegeQuery` liefert ein flaches POJO-Result (kein Aggregat).
    - **Notfall-Flow (Task 17):** `EintragAddedEvent` trägt `etbId`, nicht `einsatzId`. Der Handler injiziert `IEtbRepository` und resolvt `einsatzId` via `findById(etbId)`. Der Infrastructure-Adapter `NotfallFunkspruchAlertEventAdapter` filtert früh auf `kontext.type === 'funkspruch'`, damit Standard-Einträge keinen Handler-Call verursachen.
    - **`EVENT_HANDLER.NOTFALL_FUNKSPRUCH_ALERT` Token** (Issue #407) wurde am Ende des `EVENT_HANDLER`-Objekts in `infrastructure/di-tokens.ts` ergänzt. `FunkkanalApplicationModule` registriert Handler und exportiert Token; `EventAdaptersModule` importiert das Modul und hängt den Adapter als Provider ein.
18. **Phase 6 Abweichungen (Task 18):**
    - **Namespace:** Plan sagt `/ws/einsatz-events` — umgesetzt wie im Plan.
    - **`IEinsatzEventPublisher` um `broadcastByEtb` erweitert:** Plan-Pseudocode zeigt nur `broadcast(einsatzId, event, payload)`. Tatsächlich: `EtbFunkspruchBroadcastAdapter` verfügt nur über `etbId` (EintragAdded/Korrigiert-Events tragen keine `einsatzId`), daher ist eine zusätzliche `broadcastByEtb(etbId, channel, payload)`-Methode nötig. Publisher resolvt via `IEtbRepository.findById(EtbId)` zur `einsatzId` und delegiert dann an `gateway.broadcastToEinsatz`.
    - **Ordner:** `infrastructure/websocket/` (nicht `modules/einsatz/websocket/`), damit `IEinsatzEventPublisher`-Port + `EinsatzEventName`-Union ohne Layer-Bruch von `infrastructure/events/adapters/*` importiert werden können.
    - **`WsJwtAuthGuard` kopiert:** Der Guard in `modules/erinnerung/guards/` ist modul-spezifisch platziert; das Infrastructure-Gateway braucht einen eigenen (identische Logik, neue Datei unter `infrastructure/websocket/guards/ws-jwt-auth.guard.ts`). Vermeidet `infrastructure → modules`-Import.
    - **Einsatz-Zugehörigkeit direkt via `EINSATZ_TEILNEHMER_REPOSITORY`** (wie `ErinnerungGateway`), nicht über ein separates `EINSATZ_ZUGEHOERIGKEIT_CHECKER`-Token — reduziert Token-Proliferation.
    - **`IEinsatzEventPublisher`-Port verschoben:** Lag ursprünglich in `infrastructure/events/adapters/funkkanal-event.adapter.ts` (Task 12, als `@Optional()`-Slot). Jetzt zentral in `infrastructure/websocket/events/einsatz-event.types.ts`; die alte Datei re-exportiert den Typ für Rückwärtskompatibilität.
    - **Room-Schlüssel vereinheitlicht:** Plan zeigt `einsatz:{id}`. ErinnerungGateway nutzt `einsatz:{id}:erinnerungen`. Das neue Gateway behält den breiten Key `einsatz:{id}` (ohne Suffix), weil es alle einsatz-gebundenen Broadcasts (Funkkanal + ETB-Funkspruch + Notfall) in einem Room bündelt.
    - **`broadcastByEtb` als Graceful-Fallback:** Bei ungültiger EtbId oder fehlendem ETB wird geloggt + Event verworfen (kein Throw), damit ein einzelner Broadcast-Fehler keine Event-Kette bricht.

19. **Phase 7 Abweichungen (Task 19–24, HTTP Layer):**
    - **DTO-Ablageort (Task 19):** Plan sagt `packages/backend/src/modules/funkkanal/dto/` + `packages/backend/src/modules/etb/dto/`. Tatsächlich liegen alle DTOs unter `packages/backend/src/application/<context>/dto/` — konsistent mit ETB- und Einsatz-Pattern (kein Modul hat aktuell ein eigenes `dto/`-Verzeichnis). Die Module importieren die DTOs aus dem Application-Layer.
    - **Update-DTO + Dispatch-Strategie (Task 20):** Statt eines fehlenden `UpdateFunkkanalHandler` wird ein PATCH-Endpoint mit `UpdateFunkkanalDto` (alle Felder optional) genutzt; der Controller dispatcht jedes gesetzte Feld auf den passenden 9-Command (rename / changeDetails / setZweck / setSortIndex / activate / deactivate). `status` toggled aktiv/inaktiv; Archivieren erfolgt ausschließlich via `DELETE /:kanalId`.
    - **Application-Modul-Erweiterung (Task 20):** `FunkkanalApplicationModule` registriert + exportiert nun zusätzlich alle 12 Command-/Query-Handler (vorher nur Notfall-Event-Handler). KraefteInfrastructureModule wird importiert, damit `ZuordneKraftZuKanalHandler` die Kräfte-Repositories auflöst.
    - **Error-Helper (`toHttpError`):** Eigener Helper unter `modules/funkkanal/helpers/funkkanal-error.helper.ts` mappt Domain-Fehler-Strings auf HTTP-Status. Erkennt: „nicht gefunden" → 404, „bereits vergeben/zugeordnet/archiviert/aktiv/inaktiv" → 409, „archiviert/referenziert" → 422, sonst 400.
    - **Funkkanal-Mapper (Task 20):** Lokal unter `modules/funkkanal/mappers/funkkanal.mapper.ts` (kein eigenes Application-Mapper-Modul nötig — die Funkkanal-DTOs sind reine HTTP-Concern).
    - **Zuordnungs-DTO XOR (Task 21):** Statt einer expliziten Marker-Property im DTO nutzt der `HasExactlyOneKraftReference`-Decorator ein privates Marker-Feld (`_kraftRef?: never`) als Anker für die Validation. Tests prüfen 0/1/2/3 IDs + leere Strings.
    - **Kanalplan-PDF-Service (Task 23):** Port `IKanalplanPdfService` unter `application/funkkanal/ports/`, Adapter unter `infrastructure/funkkanal/kanalplan-pdf.service.ts`. Layout: A4 portrait, Header (Titel + Einsatzname), pro Kanal Block (Name, Typ-Label, Zweck, Status, Liste der Zuordnungen), Footer mit Export-Zeitstempel. Provider-Binding `KANALPLAN_PDF_SERVICE → KanalplanPdfService` im `FunkkanalInfrastructureModule` (Token war seit Task 13 reserviert).
    - **Export-Controller (Task 23):** Eigener Controller `KanalplanExportController` unter `einsatz/:einsatzId/kanalplan/export.pdf`. Importiert `EINSATZ_REPOSITORY` für Name-Lookup (Fallback auf einsatzId). FunkkanalModule importiert dafür zusätzlich `EinsatzInfrastructureModule` + `FunkkanalInfrastructureModule`.
    - **ETB-Kontext-Filter in-memory (Task 24):** Plan deutet einen Repository-Filter an. Tatsächlich erfolgt die Filterung im `EtbQueryMapper.toEtbDto(aggregate, includeDeleted, kontextFilter?)` — `GetEtbQuery` trägt das neue Feld `kontextFilter?: { kontextType?, kanalId? }`, der bestehende Repository-Pfad bleibt unverändert. Das spart Migrations-/Raw-SQL-Anpassungen; performance-tolerant für übliche ETB-Größen.
    - **EintragDto-Pflichtfelder:** `EintragDto.ereignisZeitpunkt` / `erfasstAm` / `kontext` sind als Pflichtfelder markiert. Die Domain-Entity garantiert sie via Default-Konstruktor (`kontext ?? EintragKontext.standard()`); zwei bestehende Integration-Test-Mocks wurden entsprechend ergänzt.

20. **Phase 8 Abweichungen (Task 25, API-Client):**
    - **DTO-Nachbesserung vorgezogen:** Der erste `pnpm run generate-api`-Lauf hat aus `AddEintragDto.kontext` / `EintragDto.kontext` ein `object` gemacht, weil den DTOs `@ApiExtraModels` + das `...EINTRAG_KONTEXT_SCHEMA`-Spread auf `@ApiProperty(Optional)` fehlten. Im ersten Schritt Backend-DTO gefixt (Commit `7a4f3ffad`), dann Client regeneriert → saubere `AddEintragDtoKontext` / `EintragDtoKontext`-Unions.
    - **Lint-Staged-Fix als Voraussetzung:** Commits mit ausschließlich generiertem Code (`packages/shared/client/**`) brachen den Pre-Commit, weil `.oxlintrc.json` diese Pfade ignoriert und `oxlint` ohne `--no-error-on-unmatched-pattern` auf "Keine Dateien" mit Fehler bricht. Flag in `package.json`/`lint-staged` ergänzt (Commit `429eb652a`).
    - **Backend-HTTPS:** Backend lauscht lokal unter `https://127.0.0.1:3091` mit Self-Signed-Cert — `generate-api`-Skript wurde mit `NODE_TLS_REJECT_UNAUTHORIZED=0` ausgeführt (akzeptiert das Cert). OpenAPI-Endpoint ist `/api/alpha-json` (nicht `/api/docs-json`).
    - **PDF-Export-Hook nutzt `*Raw`:** Der Generator schreibt für den PDF-Endpoint `Promise<void>`; der Hook greift via `kanalplanExportControllerExportPdfVAlphaRaw` auf `response.raw.blob()` zurück und ruft dann `downloadExport(blob, filename)`.

21. **Phase 9 Abweichungen (Tasks 26–29, Frontend-Foundation):**
    - **`createStore` statt `new Store`:** Das Projekt verwendet `createStore<T>(initial)` aus `@tanstack/react-store` (siehe `lagekarte/stores/draw.store.ts`); Plan-Pseudocode `new Store()` würde fehlschlagen.
    - **API-Proxy erweitert:** `FunkkanalApi` musste in `shared/api/api.ts` sowohl als Import, als private Property, im Constructor und als `funkkanal()`-Getter eingehängt werden — der Plan vergisst diesen Schritt.
    - **`gcTime: Infinity` in Hook-Tests:** `QueryClient({ gcTime: 0 })` sammelt Cache-Einträge direkt ein, sobald keine Observer da sind — führt dazu, dass `setQueryData` in `onMutate` sofort verschwindet. Tests nutzen `Infinity`, damit optimistische Updates verifizierbar bleiben.
    - **`useFunkprotokollEintraege` kontextType nur bei 1 Kanal:** Der Plan suggeriert, `kontextType` und `kanalId` immer mitzugeben. Bei Multi-Kanal-Filter würde das serverseitig zu breit schneiden. Implementiert: `kanalId` nur wenn **genau einer** gewählt ist, sonst Client-Filter.
    - **Socket.io Backoff in eigener Hand:** Plan suggeriert, `reconnection: false` + eigene setTimeout-Chain. Umgesetzt: Ein einzelner `reconnectTimerRef`, `retryIdxRef` zählt nur fortlaufend hoch (Kappung auf letztes Element des Schedules). Das unterscheidet sich vom `useErinnerungWebSocket`-Pattern, das socket.io-eigene Reconnection nutzt.
    - **`useEinsatzEvents` ohne `@/features/auth` Dependency:** Der Erinnerung-Hook holt Current-User + JWT-Auth; der neue Hook überlässt die Auth dem `WsJwtAuthGuard` via Cookie (`withCredentials: true`).

22. **Phase 10 Abweichungen (Tasks 30–31, Atoms + Molecules):**
    - **Icon-Mapping statt direktem Icon-Import im Style-Objekt:** `PRIORITAET_STYLES` trägt nur den Icon-Namen (`'radio' \| 'warning' \| 'siren'`); das Badge-Atom mappt das auf die konkreten `react-icons/pi`-Komponenten (`PiBroadcast` statt `PiRadio`, weil `PiRadio` eher eine UI-Radio-Antenne ist).
    - **`KanalDetailsForm` ist Controlled, nicht Form-gebunden:** Plan sagt "TanStack-Form verdrahtet". Um die Molecule unabhängig testbar zu halten, bleibt das Form-Binding Aufgabe von Task 32 (`KanalEditDrawer`). Die Molecule akzeptiert `value`/`onChange`/`errors` und macht keinen Use-von-`useForm`.
    - **`NotfallAlertToast` als Funktion, nicht Komponente:** Sonner ruft `toast.custom` mit einer render function auf; exportiert wird `showNotfallAlertToast(payload)`. Damit kann der Hook (`onNotfall`) direkt diese Funktion als Callback nutzen.
    - **`FunkspruchBubble`/`CompactRow` erwarten `kanal` als optionale Prop:** Plan geht davon aus, dass Kanäle immer auflösbar sind. Tatsächlich kann ein Funkspruch eines archivierten/gelöschten Kanals in der Chronologie stehen — deshalb fallen die Molecules auf "—" oder "Kanal (gelöscht)" zurück.

23. **Phase 11 Abweichungen (Tasks 32–33):**
    - **Keine manuelle Zod→`SuperRefine`-XOR-Validierung nötig:** Der Discriminator-Union in `kanalFormSchema` übernimmt die Typ-Konsistenz — `tmo/dmo/analog`-Feldfehler werden durch `discriminatedUnion` automatisch an die richtige Variante weitergegeben.
    - **`KanalEditDrawer` liest Fehler global statt feldspezifisch:** TanStack-Form + Zod-Validator liefert `state.meta.errors` nur am Top-Level der Form, nicht per-Nestfeld. Die Drawer-Logik präsentiert die erste Zod-Fehlermeldung für `name` bzw. `details` direkt unter dem Feld. Sehr granulare Per-Feld-Fehler im `KanalDetailsForm` bleiben Aufgabe einer späteren Verfeinerung (z. B. `validate: 'onChangeAsync'` mit eigener Mapping-Logik).
    - **Archivieren-Aktion nutzt vorhandene `useArchiveFunkkanal` statt eigenen `useDeleteFunkkanal`:** Das Backend bietet kein hartes DELETE; der Plan-Text „Löschen-Button" wird als „Archivieren + 422-Fallback-Hinweis" umgesetzt, damit UX und API im Einklang bleiben.
    - **`KanalplanTable` re-exportiert keine atomaren Zellen (Spec 8.3):** Ursprüngliche Idee `useKanalColumns`-Hook → wird zur `KanalRow` + `ZuordnungChipList`-Innenkomponenten in einer Datei zusammengelegt. Grund: TanStack-Table wird nicht benutzt, also gibt es keinen Column-Descriptor-Bedarf.
    - **dnd-kit-Interaktion in Tests nicht simuliert:** Jest+JSDOM emuliert PointerEvent+Drag nur eingeschränkt; die Tests prüfen Render / Sortierung / Aktionen-Dispatch, die Drag-Integration selbst wird im E2E (Task 40) validiert.

24. **Phase 12 Abweichungen (Tasks 34–37):**
    - **Route-Pfad `/kommunikation/funk` statt neuer `funkverkehr`-Route:** Im Projektstand existiert bereits eine Coming-Soon-Route `kommunikation/funk.tsx`; statt einen weiteren Top-Level-Pfad zu öffnen, ersetzt die neue Komponente diese Route (konsistent mit den Geschwistern `alarmierung.tsx`/`meldungen.tsx`). Die Memory-Note „Einsatz-Routen-Nesting" bleibt erfüllt — der `einsatzId`-Param kommt aus dem Outer-Layout.
    - **Tab-Werte `kanalplan` | `protokoll` (nicht `funkprotokoll`):** Folgt der Spec-Tabelle (Plan Zeile 2582). Die Protokoll-Ansicht heißt trotzdem „Funkprotokoll" in der Tab-Leiste.
    - **ETB-Id per `useEtb({ einsatzId })` (nicht Auto-Create):** Der `FunkspruchComposer` rendert nur wenn ein ETB existiert; sonst zeigt das Layout einen Hinweis. Das hält die Composer-Props schmal (`etbId: string`, nie optional) und verhindert dass Cmd+Enter ohne ETB einen Request produziert, der 404 zurückgibt.
    - **`FunkspruchComposer`-Combobox nutzt rohen String-Pfad statt `allowCustomValue`-Prop:** Headless UI Combobox v2 hat keine explizite `allowCustomValue`-Prop — stattdessen wird bei jedem `onChange` des `ComboboxInput` sowohl der Query-State als auch der Parent-Wert gesetzt. Listenselektion überschreibt den Wert anschließend mit der gewählten Option.
    - **`FunkprotokollView` sortiert chronologisch aufsteigend (älteste oben) statt absteigend:** Chat-Metapher — neue Nachrichten erscheinen unten. Auto-Scroll + „X neue Nachricht(en)"-Badge folgen derselben Konvention.
    - **`FunkprotokollFilterSidebar` zeigt auch archivierte Kanäle im Filter:** Funksprüche archivierter Kanäle bleiben sichtbar und sollen gefiltert werden können (`includeArchived: true`). Die Kompositionsansicht in Tasks 34 filtert für Sende-Dropdown separat auf `status=aktiv`.
    - **FunkverkehrLayout enthält keine separate „Status-Filter-Bar" für Kanalplan:** Der Filter „inkl. archiviert" soll später als URL-Param zurückkehren (Follow-up #686) — aktuell wird dauerhaft `includeArchived=true` verwendet, damit archivierte Kanäle nicht verschwinden, bis der Toggle dazukommt.

### 🚦 Nächster Agent: Nur noch Phase 14 (E2E + DoD-Checks)

Phasen 1–12 sind vollständig. Das Frontend ist unter `/app/einsatz/:einsatzId/kommunikation/funk?tab=kanalplan|protokoll` produktionsfertig:

**Frontend-Bausteine bereits verfügbar** (unter `packages/frontend/src/features/funkverkehr/`):
- **Filter-Store** (`stores/funkprotokoll-filter.store.ts`): `DEFAULT_FILTER`, `getFilterForEinsatz`, `setFilterForEinsatz`, `resetFilterForEinsatz`.
- **API-Hooks** (`api/`): `useKanalplan`, `useFunkkanal`, `useRufnameVorschlaege`, `useCreateFunkkanal`, `useUpdateFunkkanal`, `useArchiveFunkkanal`, `useReorderFunkkanaele` (mit optimistic update + rollback), `useCreateZuordnung`, `useUpdateZuordnungRolle`, `useRemoveZuordnung`, `useExportKanalplanPdf`, `FUNKVERKEHR_QUERY_KEYS`.
- **Hooks** (`hooks/`): `useFunkprotokollEintraege`, `useCreateFunkspruch`, `useDichteMode`, plus `applyClientFilters`-Export.
- **WebSocket**: `useEinsatzEvents({ einsatzId, onNotfall })` mit Backoff 1s→2s→5s→10s→30s, bei `connect` wird `join:einsatz` emittiert und ein Full-Invalidate ausgelöst.
- **Atoms**: `FunkPrioritaetBadge` (iconOnly + Pulse), `KanalStatusBadge`.
- **Molecules**: `KanalDetailsForm` (Controlled, TMO/DMO/Analog typabhängig), `FunkKontextBadge` (Button/Span, Fallback "Kanal (gelöscht)"), `FunkspruchBubble`, `FunkspruchCompactRow`, `showNotfallAlertToast(payload)`.
- **Utilities**: `utils/priority-color.ts` (`PRIORITAET_STYLES`), `utils/format-kanal-details.ts` (`getKanalTypLabel`, `formatKanalKennung`).

**Backend-Endpoints** (unverändert seit Phase 7):
- **Funkkanal-Controller** (`einsatz/:einsatzId/funkkanaele/*`): Listing, GetById, Create, Patch, Delete (=archive), Reorder.
- **Zuordnungs-Controller** (`einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen/*`): Create / UpdateRolle / Delete.
- **Rufnamen-Vorschläge** (`einsatz/:einsatzId/rufname-vorschlaege`): Bündelt Fahrzeuge / Personen / Einheiten.
- **PDF-Export** (`einsatz/:einsatzId/kanalplan/export.pdf`): pdfkit-Stream als `application/pdf`.
- **API-Client** (`@bluelight-hub/shared/client`): saubere Discriminated Unions für KanalDetails (tmo/dmo/analog) und EintragKontext (standard/funkspruch).

**Was bleibt (ausschließlich Verification, kein Code-Write):**
- **Task 40** — Browser-E2E (Claude-in-Chrome, Login `rubeen / MyPass123*`): Navigation `/app/einsatz/<id>/kommunikation/funk`, Kanal anlegen / bearbeiten / archivieren, Drag-and-Drop-Sortierung, Kräfte-Zuordnung (Rolle wechseln + entfernen), PDF-Export. Protokoll: Funkspruch absetzen (routine + notfall), Dichte-Toggle, Filter (Kanal / Prio / Zeitraum / Volltext), Reconnect-Verhalten beim Backend-Neustart. Zweites Browser-Fenster gegentesten (WebSocket-Live-Update + `NotfallAlertToast`).
- **Task 41** — Definition-of-Done-Checks: Backend + Frontend-Tests (exakte Counts notieren), `pnpm lint`, `pnpm --filter backend check:arch` + `check:di:imports`, `pnpm run generate-api` (keine Diff erwartet), Event-Registry-Grep, Migrations-Check, PR-Beschreibung vorbereiten.

**Frontend-Testbestand (Stand nach Phase 12):**
- Funkverkehr: **76/76 Tests grün** (`packages/frontend/src/features/funkverkehr/**`). Vorher 57 → +19 durch Phasen 11 + 12.
- Route-Tests: **+4 neue** Spec-Tests für `kommunikation/funk.tsx` (validateSearch).

**Dev-Setup (nur für E2E nötig):**
```bash
cd /Users/rubeen/dev/personal/bluelight-hub
git switch 407/wave-1-foundation-v2

# Backend (inkl. Postgres auf Port 3092):
docker compose up -d postgres
pnpm --filter @bluelight-hub/backend dev
# Backend lauscht auf https://127.0.0.1:3091 (self-signed)

# Frontend:
pnpm --filter @bluelight-hub/frontend dev:vite

# Funkverkehr-Tests (aktuell 76/76 grün):
cd packages/frontend && pnpm exec vitest run src/features/funkverkehr
```

Hinweis zum API-Client: Falls Backend-DTOs erweitert werden, vorher prüfen ob Swagger-Annotationen die Discriminator-Unions korrekt setzen (siehe Abweichung 20) — sonst generiert der Client wieder `object`.

Alle Endpoints nutzen `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse`, nie Standard-Swagger-Decorators (sonst bricht die Client-Generation).

---

**Goal:** BOS-Digitalfunk im Einsatz dokumentierbar machen: zwei Tabs unter `/einsatz/:einsatzId/funkverkehr` — **Kanalplan** (Sprechgruppen/Kanäle pro Einsatz, Kräfte-Zuordnung, PDF-Export) und **Funkprotokoll** (chat-artiges, live-aktualisierendes Protokoll mit Filter).

**Architektur:** ETB wird zum **Protokoll-Backbone**. Funksprüche sind ETB-Einträge mit typisiertem `EintragKontext` (Discriminated Union: `standard | funkspruch`). Funkkanäle werden als eigenes Aggregat modelliert. Live-Updates via neuem einsatz-gebundenem WebSocket-Gateway (Room `einsatz:{id}`). PDF-Export über eigenen Service (pdfkit).

**Tech Stack:** NestJS + Prisma + PostgreSQL (Backend, hexagonal), React 19 + TanStack Router/Query/Store + Tailwind + Headless UI (Frontend), socket.io (@nestjs/websockets), pdfkit. Alle API-Calls über generierten Client (`@bluelight-hub/shared/client`).

**Scope-Anpassungen ggü. Spec:**

- **Kein `wichtigkeit`-Feld im ETB** — existiert im Projekt nicht. Notfall-Eskalation basiert **allein** auf `FunkKontext.funkPrioritaet === 'notfall'`. Domain-Invariante "setzt wichtigkeit auf kritisch" entfällt; stattdessen triggert der `FunkKontext` direkt den Broadcast-Alert.
- **`einsatzabschnittId` am `Funkkanal` entfällt** — `Einsatzabschnitt` existiert nicht als eigenes Model. Feld wird später via Issue #687 nachgezogen. Nur `zweck: string?` als Freitext.
- **`EtbKategorie.KOMMUNIKATION`** existiert ✓ — Funksprüche bekommen diesen Default beim Erstellen.
- **Prisma-Feldname des bestehenden Zeitstempels** ist `timestamp` (nicht `eingetragenAm`). Neue Felder `erfasstAm` + `ereignisZeitpunkt` werden additiv ergänzt; `timestamp` bleibt vorerst (Entfernung in Folge-Issue).
- **`EinsatzEinheit` existiert** ✓ → `einheitId` in `FunkkanalZuordnung` bleibt im Scope.

---

## Phase 0: Branch & Vorbereitung

### Task 0: Worktree & Branch verifizieren

**Files:** _(keine Änderungen)_

- [ ] **Step 1: Branch und Working Directory prüfen**

Run:
```bash
git branch --show-current
pwd
```

Expected: Branch `407-funkverkehr-funkprotokoll-kanalverwaltung`, WD ist das Bluelight-Hub-Root.

- [ ] **Step 2: Baseline-Test-Counts erfassen**

Run (im Backend):
```bash
cd packages/backend && npx jest --no-coverage --silent 2>&1 | tail -20
```
Run (im Frontend):
```bash
cd packages/frontend && pnpm test -- --run --reporter=basic 2>&1 | tail -20
```

Notiere die Test-Zahlen (Backend + Frontend passing/failing) als Baseline für den PR.

---

## Phase 1: Datenbank-Migrationen

### Task 1: Migration "add_etb_eintrag_kontext_and_zeitstempel"

**Files:**
- Modify: `packages/backend/prisma/schema.prisma` (Model `EtbEintrag`, Zeilen ~452-503)
- Create: `packages/backend/prisma/migrations/<ts>_add_etb_eintrag_kontext_and_zeitstempel/migration.sql`

- [ ] **Step 1: Schema erweitern**

In `schema.prisma` am Model `EtbEintrag` folgende Felder hinzufügen (nicht `timestamp` entfernen):

```prisma
model EtbEintrag {
  // ... bestehende Felder ...

  erfasstAm         DateTime @default(now()) @map("erfasst_am")
  ereignisZeitpunkt DateTime                 @map("ereignis_zeitpunkt")

  kontextType       String   @default("standard") @map("kontext_type")
  kontextData       Json?    @map("kontext_data")

  // ... bestehende Indizes bleiben ...
  @@index([etbId, ereignisZeitpunkt])
  @@index([etbId, kontextType])
}
```

- [ ] **Step 2: Migration generieren**

Run:
```bash
pnpm --filter @bluelight-hub/backend prisma:migrate --name add_etb_eintrag_kontext_and_zeitstempel
```

Erwartete generierte SQL-Schritte:
1. `ALTER TABLE etb_eintraege ADD COLUMN erfasst_am TIMESTAMP NOT NULL DEFAULT NOW()`
2. `ALTER TABLE etb_eintraege ADD COLUMN ereignis_zeitpunkt TIMESTAMP NULL` (nullable anlegen)
3. `ALTER TABLE etb_eintraege ADD COLUMN kontext_type TEXT NOT NULL DEFAULT 'standard'`
4. `ALTER TABLE etb_eintraege ADD COLUMN kontext_data JSONB NULL`
5. Index auf `(etb_id, ereignis_zeitpunkt)`
6. Index auf `(etb_id, kontext_type)`

- [ ] **Step 3: Backfill-SQL in Migration einfügen**

In der generierten `migration.sql` **vor** dem `NOT NULL`-Constraint für `ereignis_zeitpunkt` folgenden Block ergänzen (oder als separates Statement):

```sql
-- Backfill: ereignis_zeitpunkt = timestamp, erfasst_am bleibt auf Default
UPDATE etb_eintraege SET ereignis_zeitpunkt = "timestamp" WHERE ereignis_zeitpunkt IS NULL;
UPDATE etb_eintraege SET erfasst_am = "timestamp";
ALTER TABLE etb_eintraege ALTER COLUMN ereignis_zeitpunkt SET NOT NULL;
```

Falls Prisma den NOT-NULL-Constraint bereits beim CREATE setzt (kein zweischrittiger Ansatz), anpassen: Spalte erst nullable anlegen, backfillen, dann `SET NOT NULL`.

- [ ] **Step 4: Migration lokal anwenden und validieren**

Run:
```bash
docker compose exec postgres psql -U bluelight -d bluelight-hub -c "SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'etb_eintraege' AND column_name IN ('erfasst_am','ereignis_zeitpunkt','kontext_type','kontext_data');"
```

Expected: 4 Zeilen, `erfasst_am` und `ereignis_zeitpunkt` NOT NULL, `kontext_data` nullable JSONB.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/prisma/schema.prisma packages/backend/prisma/migrations
git commit -m "✨(backend): Add ETB-Eintrag Kontext und Zeitstempel-Felder

Erweitert EtbEintrag um erfasstAm, ereignisZeitpunkt, kontextType und
kontextData (JSONB) für Kontext-Varianten. Migration backfillt bestehende
Einträge aus timestamp."
```

---

### Task 2: Migration "add_funkkanal_and_zuordnung"

**Files:**
- Modify: `packages/backend/prisma/schema.prisma` (neue Models am Ende oder im passenden Bereich einfügen)
- Create: `packages/backend/prisma/migrations/<ts>_add_funkkanal_and_zuordnung/migration.sql`

- [ ] **Step 1: Prisma-Models hinzufügen**

```prisma
model Funkkanal {
  id                 String   @id @default(cuid())
  einsatzId          String   @map("einsatz_id")
  einsatz            Einsatz  @relation(fields: [einsatzId], references: [id], onDelete: Cascade)

  name               String
  detailsType        String   @map("details_type")    // 'tmo' | 'dmo' | 'analog'
  detailsData        Json     @map("details_data")
  status             String   @default("aktiv")       // 'aktiv' | 'inaktiv' | 'archiviert'
  zweck              String?
  sortIndex          Int      @default(0) @map("sort_index")

  zuordnungen        FunkkanalZuordnung[]

  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt       @map("updated_at")
  createdBy          String?  @map("created_by")
  updatedBy          String?  @map("updated_by")

  @@unique([einsatzId, name])
  @@index([einsatzId, status, sortIndex])
  @@map("funkkanal")
}

model FunkkanalZuordnung {
  id              String           @id @default(cuid())
  kanalId         String           @map("kanal_id")
  kanal           Funkkanal        @relation(fields: [kanalId], references: [id], onDelete: Cascade)

  fahrzeugId      String?          @map("fahrzeug_id")
  fahrzeug        EinsatzFahrzeug? @relation(fields: [fahrzeugId], references: [id], onDelete: Cascade)

  personId        String?          @map("person_id")
  person          EinsatzPerson?   @relation(fields: [personId], references: [id], onDelete: Cascade)

  einheitId       String?          @map("einheit_id")
  einheit         EinsatzEinheit?  @relation(fields: [einheitId], references: [id], onDelete: Cascade)

  rufnameSnapshot String           @map("rufname_snapshot")
  rolle           String           @default("primaer")  // 'primaer' | 'sekundaer' | 'zuhoeren'

  createdAt       DateTime         @default(now()) @map("created_at")
  createdBy       String?          @map("created_by")

  @@unique([kanalId, fahrzeugId])
  @@unique([kanalId, personId])
  @@unique([kanalId, einheitId])
  @@index([kanalId])
  @@map("funkkanal_zuordnung")
}
```

Zusätzlich am `Einsatz`-Model Back-Reference ergänzen:
```prisma
  funkkanaele Funkkanal[]
```
und an `EinsatzFahrzeug`, `EinsatzPerson`, `EinsatzEinheit` jeweils:
```prisma
  funkkanalZuordnungen FunkkanalZuordnung[]
```

- [ ] **Step 2: Migration generieren**

Run:
```bash
pnpm --filter @bluelight-hub/backend prisma:migrate --name add_funkkanal_and_zuordnung
```

- [ ] **Step 3: Check-Constraint manuell in migration.sql ergänzen**

Am Ende der generierten `migration.sql`:

```sql
ALTER TABLE funkkanal_zuordnung
ADD CONSTRAINT funkkanal_zuordnung_genau_eine_kraft
CHECK (
  (fahrzeug_id IS NOT NULL)::int +
  (person_id IS NOT NULL)::int +
  (einheit_id IS NOT NULL)::int = 1
);
```

- [ ] **Step 4: Migration lokal anwenden**

Run:
```bash
pnpm --filter @bluelight-hub/backend prisma:migrate
docker compose exec postgres psql -U bluelight -d bluelight-hub -c "\d funkkanal_zuordnung"
```

Expected: Tabelle existiert, Check-Constraint `funkkanal_zuordnung_genau_eine_kraft` ist sichtbar.

- [ ] **Step 5: Check-Constraint testen**

Run:
```bash
docker compose exec postgres psql -U bluelight -d bluelight-hub -c "INSERT INTO funkkanal_zuordnung (id, kanal_id, rufname_snapshot) VALUES ('test', 'fake', 'X');"
```

Expected: Fehler `new row for relation "funkkanal_zuordnung" violates check constraint`. (Anschließend evtl. nötigen Cleanup durchführen.)

- [ ] **Step 6: Commit**

```bash
git add packages/backend/prisma/schema.prisma packages/backend/prisma/migrations
git commit -m "✨(backend): Add Funkkanal und FunkkanalZuordnung Models

Neue Tabellen für Kanalplan-Feature. FunkkanalZuordnung nutzt polymorphe
Kraft-Referenz via drei nullable FKs mit Check-Constraint 'genau eine
Kraft gesetzt'."
```

---

## Phase 2: ETB Domain-Erweiterung

### Task 3: EintragKontext VO + FunkPrioritaet VO

**Files:**
- Create: `packages/backend/src/domain/aggregates/etb/eintrag-kontext.ts`
- Create: `packages/backend/src/domain/value-objects/funk-prioritaet.ts`
- Create: `packages/backend/src/domain/aggregates/etb/__tests__/eintrag-kontext.spec.ts`

- [ ] **Step 1: Failing Test — FunkPrioritaet**

`packages/backend/src/domain/value-objects/__tests__/funk-prioritaet.spec.ts`:

```typescript
import { FunkPrioritaet } from '../funk-prioritaet';

describe('FunkPrioritaet', () => {
  it('akzeptiert gültige Werte', () => {
    expect(FunkPrioritaet.create('routine').isSuccess).toBe(true);
    expect(FunkPrioritaet.create('prioritaet').isSuccess).toBe(true);
    expect(FunkPrioritaet.create('notfall').isSuccess).toBe(true);
  });

  it('lehnt ungültige Werte ab', () => {
    const result = FunkPrioritaet.create('dringend' as never);
    expect(result.isFailure).toBe(true);
  });

  it('isNotfall() liefert true nur für notfall', () => {
    const notfall = FunkPrioritaet.create('notfall').value;
    expect(notfall.isNotfall()).toBe(true);
    const routine = FunkPrioritaet.create('routine').value;
    expect(routine.isNotfall()).toBe(false);
  });
});
```

Run: `cd packages/backend && npx jest --testPathPatterns="funk-prioritaet" --no-coverage`. Expected: FAIL.

- [ ] **Step 2: FunkPrioritaet VO implementieren**

`packages/backend/src/domain/value-objects/funk-prioritaet.ts`:

```typescript
import { Result } from '../common/result';

export type FunkPrioritaetValue = 'routine' | 'prioritaet' | 'notfall';

const VALID: readonly FunkPrioritaetValue[] = ['routine', 'prioritaet', 'notfall'];

export class FunkPrioritaet {
  private constructor(public readonly value: FunkPrioritaetValue) {}

  static create(value: FunkPrioritaetValue): Result<FunkPrioritaet> {
    if (!VALID.includes(value)) {
      return Result.fail(`Ungültige FunkPrioritaet: ${value}`);
    }
    return Result.ok(new FunkPrioritaet(value));
  }

  isNotfall(): boolean {
    return this.value === 'notfall';
  }

  equals(other: FunkPrioritaet): boolean {
    return this.value === other.value;
  }
}
```

Run: `npx jest --testPathPatterns="funk-prioritaet" --no-coverage`. Expected: PASS.

- [ ] **Step 3: Failing Test — EintragKontext**

`packages/backend/src/domain/aggregates/etb/__tests__/eintrag-kontext.spec.ts`:

```typescript
import { EintragKontext, StandardKontext, FunkKontext } from '../eintrag-kontext';

describe('EintragKontext', () => {
  it('standard() baut Standard-Kontext', () => {
    const k = EintragKontext.standard();
    expect(k.type).toBe('standard');
  });

  it('funkspruch() baut FunkKontext mit kanalId und Priorität', () => {
    const k = EintragKontext.funkspruch({ kanalId: 'k1', funkPrioritaet: 'notfall' });
    expect(k.type).toBe('funkspruch');
    expect((k as FunkKontext).kanalId).toBe('k1');
    expect((k as FunkKontext).funkPrioritaet).toBe('notfall');
  });

  it('fromPersistence() dekodiert JSONB', () => {
    const k = EintragKontext.fromPersistence('funkspruch', { kanalId: 'x', funkPrioritaet: 'routine' });
    expect(k.type).toBe('funkspruch');
  });

  it('toPersistence() serialisiert zurück', () => {
    const k = EintragKontext.funkspruch({ kanalId: 'x', funkPrioritaet: 'prioritaet' });
    expect(k.toPersistence()).toEqual({ type: 'funkspruch', kanalId: 'x', funkPrioritaet: 'prioritaet' });
  });
});
```

Run: expected FAIL.

- [ ] **Step 4: EintragKontext implementieren**

`packages/backend/src/domain/aggregates/etb/eintrag-kontext.ts`:

```typescript
import type { FunkPrioritaetValue } from '../../value-objects/funk-prioritaet';

export type EintragKontextType = 'standard' | 'funkspruch';

export interface StandardKontext {
  readonly type: 'standard';
  toPersistence(): { type: 'standard' };
}

export interface FunkKontext {
  readonly type: 'funkspruch';
  readonly kanalId: string;
  readonly funkPrioritaet: FunkPrioritaetValue;
  toPersistence(): { type: 'funkspruch'; kanalId: string; funkPrioritaet: FunkPrioritaetValue };
}

export type EintragKontextShape = StandardKontext | FunkKontext;

export const EintragKontext = {
  standard(): StandardKontext {
    return {
      type: 'standard',
      toPersistence: () => ({ type: 'standard' }),
    };
  },

  funkspruch(args: { kanalId: string; funkPrioritaet: FunkPrioritaetValue }): FunkKontext {
    return {
      type: 'funkspruch',
      kanalId: args.kanalId,
      funkPrioritaet: args.funkPrioritaet,
      toPersistence: () => ({
        type: 'funkspruch',
        kanalId: args.kanalId,
        funkPrioritaet: args.funkPrioritaet,
      }),
    };
  },

  fromPersistence(type: string, data: unknown): EintragKontextShape {
    if (type === 'funkspruch') {
      const d = data as { kanalId: string; funkPrioritaet: FunkPrioritaetValue };
      return EintragKontext.funkspruch({ kanalId: d.kanalId, funkPrioritaet: d.funkPrioritaet });
    }
    return EintragKontext.standard();
  },
};
```

Run Tests: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/domain
git commit -m "✨(backend): Add EintragKontext VO und FunkPrioritaet VO"
```

---

### Task 4: EtbEintrag-Entity erweitern (erfasstAm, ereignisZeitpunkt, kontext)

**Files:**
- Modify: `packages/backend/src/domain/entities/etb-eintrag.entity.ts`
- Modify: `packages/backend/src/domain/aggregates/etb/__tests__/*` (bestehende Tests ggf. anpassen)

- [ ] **Step 1: Failing Test für neue Felder**

`packages/backend/src/domain/entities/__tests__/etb-eintrag.entity.spec.ts` (erweitern oder neu):

```typescript
import { EtbEintrag } from '../etb-eintrag.entity';
import { EintragKontext } from '../../aggregates/etb/eintrag-kontext';

describe('EtbEintrag – Kontext und Zeitstempel', () => {
  it('setzt erfasstAm = now() automatisch', () => {
    const before = new Date();
    const eintrag = EtbEintrag.create({
      id: /* ... */, sequenceNumber: 1, text: 'x',
      createdBy: /* UserId */, kategorie: /* KOMMUNIKATION */,
      ereignisZeitpunkt: new Date('2026-04-14T10:00:00Z'),
      kontext: EintragKontext.standard(),
    }).value;
    expect(eintrag.erfasstAm.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('default kontext ist standard', () => {
    const eintrag = EtbEintrag.create({ /* ohne kontext */ }).value;
    expect(eintrag.kontext.type).toBe('standard');
  });

  it('speichert FunkKontext korrekt', () => {
    const eintrag = EtbEintrag.create({
      /* ... */,
      kontext: EintragKontext.funkspruch({ kanalId: 'k1', funkPrioritaet: 'notfall' }),
    }).value;
    expect(eintrag.kontext.type).toBe('funkspruch');
  });
});
```

Run: FAIL.

- [ ] **Step 2: Entity erweitern**

In `etb-eintrag.entity.ts`:

```typescript
// Neue Felder auf EtbEintrag:
readonly erfasstAm: Date;            // immutable, Erfassungszeitpunkt
readonly ereignisZeitpunkt: Date;    // user-editierbar, fachlicher Zeitpunkt
readonly kontext: EintragKontextShape;
```

Konstruktor/Factory `EtbEintrag.create(props)`:
- `erfasstAm` auf `new Date()` setzen (nicht aus `props` übernehmen)
- `ereignisZeitpunkt` aus `props.ereignisZeitpunkt ?? new Date()` (mit Validierung: nicht in der Zukunft > 1 min)
- `kontext` aus `props.kontext ?? EintragKontext.standard()`

Validierung: `ereignisZeitpunkt` darf nicht mehr als 60 Sekunden in der Zukunft liegen → `Result.fail`.

Run Tests: PASS.

- [ ] **Step 3: Bestehende ETB-Tests anpassen**

Alle Stellen, wo `EtbEintrag.create(...)` aufgerufen wird, bekommen zusätzlich `ereignisZeitpunkt` (Default = jetzt). Bestehende Tests um diesen Parameter ergänzen, um Breakage zu vermeiden. Run:
```bash
cd packages/backend && npx jest --testPathPatterns="etb" --no-coverage
```
Alle ETB-Tests sollen wieder PASS sein.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/domain
git commit -m "✨(backend): EtbEintrag um erfasstAm, ereignisZeitpunkt und kontext erweitern"
```

---

### Task 5: Aggregat `addEintrag()` erweitern + Notfall-Event-Detection

**Files:**
- Modify: `packages/backend/src/domain/aggregates/einsatztagebuch.aggregate.ts`
- Modify: `packages/backend/src/domain/events/eintrag-added.event.ts` (falls Payload erweitert werden muss)

- [ ] **Step 1: Failing Test**

In einem Aggregat-Spec: `addEintrag()` soll `kontext` und `ereignisZeitpunkt` entgegennehmen und korrekt auf `EtbEintrag` propagieren. Bei `FunkKontext` mit `notfall` soll das emittierte `EintragAddedEvent` den Kontext im Payload enthalten.

```typescript
it('addEintrag mit FunkKontext notfall emittiert Event mit kontext', () => {
  const etb = Einsatztagebuch.create({...}).value;
  const result = etb.addEintrag({
    text: 'Brand 12',
    userId,
    kategorie: EtbKategorie.create('KOMMUNIKATION').value,
    kontext: EintragKontext.funkspruch({ kanalId: 'k1', funkPrioritaet: 'notfall' }),
    ereignisZeitpunkt: new Date(),
  });
  expect(result.isSuccess).toBe(true);
  const events = etb.getUncommittedEvents();
  const added = events.find(e => e.constructor.name === 'EintragAddedEvent');
  expect((added as any).kontext).toMatchObject({ type: 'funkspruch', funkPrioritaet: 'notfall' });
});
```

Run: FAIL.

- [ ] **Step 2: Aggregat-Methode erweitern**

`addEintrag()` akzeptiert neue Options:
```typescript
addEintrag(args: {
  text: string;
  userId: UserId;
  kategorie: EtbKategorie;
  absender?: string;
  empfaenger?: string;
  metadata?: Record<string, unknown>;
  ereignisZeitpunkt?: Date;
  kontext?: EintragKontextShape;
}): Result<EtbEintrag>
```

Erzeugt `EtbEintrag` mit `ereignisZeitpunkt ?? new Date()` und `kontext ?? EintragKontext.standard()`. Emittiert `EintragAddedEvent` mit `kontext` im Payload.

- [ ] **Step 3: EintragAddedEvent-Payload erweitern**

`eintrag-added.event.ts`: neues Feld `kontext: { type: string; [key: string]: unknown }` und `ereignisZeitpunkt: Date`. Serializer-kompatibel (JSON-fähig).

- [ ] **Step 4: Tests grün**

Run: alle ETB-Aggregat-Tests. PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/domain
git commit -m "♻️(backend): addEintrag akzeptiert Kontext und ereignisZeitpunkt"
```

---

### Task 6: ETB-Prisma-Mapper erweitern

**Files:**
- Modify: `packages/backend/src/infrastructure/etb/prisma-etb.mapper.ts` (erstellen falls nicht vorhanden — der Grep-Befund zeigt nur einen Query-Mapper; Aggregat-Persistierung passiert via Repository, Mapper ggf. dort).
- Prüfen: `packages/backend/src/infrastructure/etb/prisma-etb.repository.ts` (oder ähnlich) für Persistenz-Pfad.

- [ ] **Step 1: Mapper-Pfad lokalisieren**

Run:
```bash
rg -l "kontextType|kontext_type|EtbEintrag\s*\{" packages/backend/src/infrastructure/etb
```

Ort identifizieren, wo aus Prisma-Row → Domain Entity gemappt wird (Repository oder Mapper).

- [ ] **Step 2: Failing Test**

Mapper-Spec: gibt einen Prisma-Row mit `kontextType='funkspruch'` + `kontextData={ kanalId: 'x', funkPrioritaet: 'notfall' }` → erwartet `EtbEintrag.kontext.type === 'funkspruch'`. Roundtrip-Test (Domain → Prisma-Create → Domain) für beide Kontext-Typen.

Run: FAIL.

- [ ] **Step 3: Mapper implementieren**

Serialisierung (Domain → Prisma):
```typescript
const persisted = eintrag.kontext.toPersistence();
return {
  kontextType: persisted.type,
  kontextData: persisted.type === 'funkspruch'
    ? { kanalId: persisted.kanalId, funkPrioritaet: persisted.funkPrioritaet }
    : null,
  erfasstAm: eintrag.erfasstAm,
  ereignisZeitpunkt: eintrag.ereignisZeitpunkt,
  // ... restliche Felder wie bisher
};
```

Deserialisierung:
```typescript
const kontext = EintragKontext.fromPersistence(row.kontextType, row.kontextData);
return EtbEintrag.create({
  // ...
  erfasstAm: row.erfasstAm,
  ereignisZeitpunkt: row.ereignisZeitpunkt,
  kontext,
}).value;
```

Run Tests: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/infrastructure/etb
git commit -m "♻️(backend): ETB-Mapper serialisiert Kontext und Zeitstempel"
```

---

### Task 7: AddEintragCommand erweitern

**Files:**
- Modify: `packages/backend/src/application/etb/commands/add-eintrag/add-eintrag.command.ts`
- Modify: `packages/backend/src/application/etb/commands/add-eintrag/add-eintrag.handler.ts`
- Modify: `packages/backend/src/application/etb/commands/add-eintrag/__tests__/*.spec.ts`

- [ ] **Step 1: Failing Test**

Handler-Spec erweitern: Command mit `kontext: { type: 'funkspruch', kanalId, funkPrioritaet }` + `ereignisZeitpunkt` → Handler delegiert korrekt an Aggregat. Ohne `kontext` → Default `standard`. Run: FAIL (Command akzeptiert Felder noch nicht).

- [ ] **Step 2: Command erweitern**

`add-eintrag.command.ts`: optionale Felder
```typescript
readonly ereignisZeitpunkt?: Date;
readonly kontext?: { type: 'standard' } | { type: 'funkspruch'; kanalId: string; funkPrioritaet: FunkPrioritaetValue };
```

Factory validiert:
- Falls `kontext.type === 'funkspruch'`: `kanalId` non-empty, `funkPrioritaet` via `FunkPrioritaet.create()` validiert.

- [ ] **Step 3: Handler mappt Command → Aggregat**

In `handler.ts`: `kontext` aus Command in `EintragKontextShape` konvertieren (via `EintragKontext.standard()` / `.funkspruch(...)`) und an `aggregate.addEintrag({ ..., kontext, ereignisZeitpunkt })` weitergeben.

Run Tests: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/application/etb
git commit -m "♻️(backend): AddEintragCommand akzeptiert Kontext und ereignisZeitpunkt"
```

---

## Phase 3: Funkkanal Domain

### Task 8: KanalDetails VO

**Files:**
- Create: `packages/backend/src/domain/aggregates/funkkanal/kanal-details.vo.ts`
- Create: `packages/backend/src/domain/aggregates/funkkanal/__tests__/kanal-details.vo.spec.ts`

- [ ] **Step 1: Failing Test**

```typescript
import { KanalDetails } from '../kanal-details.vo';

describe('KanalDetails', () => {
  it('tmo akzeptiert Sprechgruppe', () => {
    const r = KanalDetails.tmo({ sprechgruppe: 'SG_FEUER_1' });
    expect(r.isSuccess).toBe(true);
    expect(r.value.type).toBe('tmo');
  });

  it('tmo ohne Sprechgruppe schlägt fehl', () => {
    const r = KanalDetails.tmo({ sprechgruppe: '' });
    expect(r.isFailure).toBe(true);
  });

  it('dmo akzeptiert DMO-Kanal', () => {
    const r = KanalDetails.dmo({ dmoKanal: '310' });
    expect(r.value.type).toBe('dmo');
  });

  it('analog validiert Band 4m/2m', () => {
    expect(KanalDetails.analog({ band: '4m', frequenz: '84.800' }).isSuccess).toBe(true);
    expect(KanalDetails.analog({ band: 'HF' as never, frequenz: '10' }).isFailure).toBe(true);
  });

  it('fromPersistence dispatched via type', () => {
    expect(KanalDetails.fromPersistence('tmo', { sprechgruppe: 'X' }).type).toBe('tmo');
    expect(KanalDetails.fromPersistence('dmo', { dmoKanal: '1' }).type).toBe('dmo');
  });
});
```

Run: FAIL.

- [ ] **Step 2: VO implementieren**

```typescript
import { Result } from '../../common/result';

export type KanalDetailsShape =
  | { type: 'tmo'; sprechgruppe: string; gssi?: string }
  | { type: 'dmo'; dmoKanal: string; repeater?: string }
  | { type: 'analog'; band: '4m' | '2m'; frequenz: string; kanalnummer?: string };

export const KanalDetails = {
  tmo(args: { sprechgruppe: string; gssi?: string }): Result<KanalDetailsShape> {
    if (!args.sprechgruppe?.trim()) return Result.fail('Sprechgruppe erforderlich');
    return Result.ok({ type: 'tmo', sprechgruppe: args.sprechgruppe.trim(), gssi: args.gssi });
  },
  dmo(args: { dmoKanal: string; repeater?: string }): Result<KanalDetailsShape> {
    if (!args.dmoKanal?.trim()) return Result.fail('DMO-Kanal erforderlich');
    return Result.ok({ type: 'dmo', dmoKanal: args.dmoKanal.trim(), repeater: args.repeater });
  },
  analog(args: { band: '4m' | '2m'; frequenz: string; kanalnummer?: string }): Result<KanalDetailsShape> {
    if (!['4m', '2m'].includes(args.band)) return Result.fail('Band muss 4m oder 2m sein');
    if (!args.frequenz?.trim()) return Result.fail('Frequenz erforderlich');
    return Result.ok({ type: 'analog', band: args.band, frequenz: args.frequenz.trim(), kanalnummer: args.kanalnummer });
  },
  fromPersistence(type: string, data: unknown): KanalDetailsShape {
    if (type === 'tmo') return { type: 'tmo', ...(data as object) } as KanalDetailsShape;
    if (type === 'dmo') return { type: 'dmo', ...(data as object) } as KanalDetailsShape;
    if (type === 'analog') return { type: 'analog', ...(data as object) } as KanalDetailsShape;
    throw new Error(`Unbekannter KanalDetails-Type: ${type}`);
  },
};
```

Tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/domain/aggregates/funkkanal
git commit -m "✨(backend): Add KanalDetails VO (TMO/DMO/Analog)"
```

---

### Task 9: Funkkanal-Entity + Aggregat

**Files:**
- Create: `packages/backend/src/domain/aggregates/funkkanal/funkkanal.entity.ts`
- Create: `packages/backend/src/domain/aggregates/funkkanal/funkkanal.aggregate.ts`
- Create: `packages/backend/src/domain/aggregates/funkkanal/funkkanal-zuordnung.entity.ts`
- Create: `packages/backend/src/domain/aggregates/funkkanal/__tests__/funkkanal.aggregate.spec.ts`

- [ ] **Step 1: Failing Test – Funkkanal-Aggregat**

Testfälle:
- `Funkkanal.create({ einsatzId, name, details, sortIndex })` → Aggregat im Status `aktiv`
- `.rename('neu')` ändert Name, emittiert `FunkkanalGeaendert`
- `.changeDetails(newDetails)` emittiert `FunkkanalGeaendert`
- `.setZweck(...)`, `.setSortIndex(42)`
- `.archive()` → Status `archiviert`, emittiert `FunkkanalArchiviert`
- `.deactivate()`/`.activate()` Toggle zwischen `aktiv`/`inaktiv`, emittiert `FunkkanalGeaendert`
- `.zuordneKraft({ kraftRef: { fahrzeugId: 'f1' }, rufnameSnapshot: 'Florian 1', rolle: 'primaer' })` erzeugt Zuordnung
- `.aendereZuordnungRolle(zuordnungId, 'sekundaer')`
- `.entferneZuordnung(zuordnungId)`
- Invarianten: Zuordnung mit 0 oder 2+ Kraft-IDs → `Result.fail`
- `Funkkanal.create` akzeptiert nicht `status='archiviert'` aus Factory (nur via Methode)

Run: FAIL.

- [ ] **Step 2: Funkkanal-Entity implementieren**

`funkkanal.entity.ts` — plain Class mit readonly Feldern + Kopier-Methoden `withRename(...)` etc. Oder Mutable — Projekt-Konvention folgen (am Aggregat-Beispiel von Einsatztagebuch orientieren).

Relevante Felder:
```typescript
readonly id: string;
readonly einsatzId: string;
name: string;
details: KanalDetailsShape;
status: 'aktiv' | 'inaktiv' | 'archiviert';
zweck?: string;
sortIndex: number;
readonly createdAt: Date;
updatedAt: Date;
readonly createdBy?: string;
updatedBy?: string;
```

- [ ] **Step 3: FunkkanalZuordnung-Entity implementieren**

`funkkanal-zuordnung.entity.ts`:

```typescript
export type FunkkanalZuordnungKraftRef =
  | { kind: 'fahrzeug'; fahrzeugId: string }
  | { kind: 'person'; personId: string }
  | { kind: 'einheit'; einheitId: string };

export type FunkkanalRolle = 'primaer' | 'sekundaer' | 'zuhoeren';

export class FunkkanalZuordnung {
  constructor(
    readonly id: string,
    readonly kanalId: string,
    readonly kraftRef: FunkkanalZuordnungKraftRef,
    readonly rufnameSnapshot: string,
    public rolle: FunkkanalRolle,
    readonly createdAt: Date,
    readonly createdBy?: string,
  ) {}
}
```

- [ ] **Step 4: Funkkanal-Aggregat implementieren**

`funkkanal.aggregate.ts` — enthält `Funkkanal`-Entity + Liste `FunkkanalZuordnung[]`. Methoden wie in Step 1 spezifiziert. Domain-Events via `addDomainEvent(...)`. Invariante in `zuordneKraft`: prüft, dass kraftRef genau eine kind hat; dass gleiche Kraft nicht doppelt zugeordnet ist.

- [ ] **Step 5: Tests grün**

Run: `npx jest --testPathPatterns="funkkanal.aggregate" --no-coverage`. PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/domain/aggregates/funkkanal
git commit -m "✨(backend): Add Funkkanal-Aggregat mit Lifecycle und Zuordnungen"
```

---

### Task 10: Funkkanal Domain-Events

**Files:**
- Create: `packages/backend/src/domain/events/funkkanal-erstellt.event.ts`
- Create: `packages/backend/src/domain/events/funkkanal-geaendert.event.ts`
- Create: `packages/backend/src/domain/events/funkkanal-archiviert.event.ts`
- Create: `packages/backend/src/domain/events/funkkanal-reihenfolge-geaendert.event.ts`
- Create: `packages/backend/src/domain/events/funkkanal-zuordnung-erstellt.event.ts`
- Create: `packages/backend/src/domain/events/funkkanal-zuordnung-entfernt.event.ts`
- Create: `packages/backend/src/domain/events/notfall-alert-requested.event.ts`
- Create: zugehörige `__tests__`-Specs

- [ ] **Step 1: Failing Tests**

Je Event: Spec prüft `eventName()` (unique, `kebab-case`), Payload-Felder, Serialisierbarkeit (JSON.stringify/parse Roundtrip via `toPayload()/fromPayload()`).

- [ ] **Step 2: Events implementieren**

Am Muster von `eintrag-added.event.ts` orientieren. Jedes Event trägt: `eventId`, `aggregateId` (= `funkkanalId`), `einsatzId`, `occurredAt`, und spezifische Felder:

- `FunkkanalErstellt` — `name, details, status, sortIndex`
- `FunkkanalGeaendert` — `changedFields: { name?, details?, zweck?, status? }`
- `FunkkanalArchiviert` — (nur IDs)
- `FunkkanalReihenfolgeGeaendert` — `ordering: Array<{ kanalId, sortIndex }>` _(Event am Aggregat „Einsatz" oder am Kanal; für Einfachheit eigenes Domain-Event mit aggregateId = einsatzId)_
- `FunkkanalZuordnungErstellt` — `kanalId, zuordnungId, kraftRef, rufnameSnapshot, rolle`
- `FunkkanalZuordnungEntfernt` — `kanalId, zuordnungId`
- `NotfallAlertRequested` — `einsatzId, kanalId, funkspruchEintragId, absender?, text` (abgeleitet im NotfallHandler)

- [ ] **Step 3: Tests PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/domain/events
git commit -m "✨(backend): Add Funkkanal Domain Events"
```

---

## Phase 4: Funkkanal Infrastructure

### Task 11: Funkkanal-Mapper + Repository

**Files:**
- Create: `packages/backend/src/infrastructure/funkkanal/prisma-funkkanal.mapper.ts`
- Create: `packages/backend/src/infrastructure/funkkanal/prisma-funkkanal.repository.ts`
- Create: `packages/backend/src/infrastructure/funkkanal/__tests__/prisma-funkkanal.mapper.spec.ts`
- Create: `packages/backend/src/infrastructure/funkkanal/__tests__/prisma-funkkanal.repository.spec.ts` (Integration, Test-DB)
- Create: `packages/backend/src/application/common/ports/funkkanal.repository.port.ts` — Interface

- [ ] **Step 1: Repository-Port definieren**

```typescript
// funkkanal.repository.port.ts
export interface IFunkkanalRepository {
  findById(id: string): Promise<Funkkanal | null>;
  findByEinsatzId(einsatzId: string, opts?: { includeArchived?: boolean }): Promise<Funkkanal[]>;
  existsByName(einsatzId: string, name: string, excludeId?: string): Promise<boolean>;
  hasFunkspruchReferenz(kanalId: string): Promise<boolean>;
  save(kanal: Funkkanal): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(einsatzId: string, ordering: Array<{ id: string; sortIndex: number }>): Promise<void>;
}
```

- [ ] **Step 2: Mapper-Tests (Roundtrip)**

Testfälle: TMO-Kanal mit Zuordnungen → Prisma-Shape → zurück zum Aggregat. Analog DMO + Analog.

- [ ] **Step 3: Mapper implementieren**

Serialisierung:
- `Funkkanal` → Prisma `Funkkanal.create`/`update` mit `detailsType = details.type`, `detailsData = details without type`
- `FunkkanalZuordnung` → einer der drei FK-Felder gesetzt je nach `kraftRef.kind`

Deserialisierung entsprechend invers.

- [ ] **Step 4: Repository implementieren**

Orientiere an `prisma-etb.repository` (Pattern: Transactional Save mit Outbox). `save(kanal)` in einer Prisma-Transaktion:
1. Upsert Funkkanal
2. Diff Zuordnungen (vorhandene löschen, neue inserten, geänderte updaten)
3. Outbox-Events aus `aggregate.getUncommittedEvents()` schreiben
4. `aggregate.markEventsAsCommitted()`

`hasFunkspruchReferenz(kanalId)` — SQL-Query über `etb_eintraege WHERE kontext_type='funkspruch' AND kontext_data->>'kanalId' = $1 LIMIT 1`.

`reorder(...)` — Bulk-Update in Transaktion.

- [ ] **Step 5: Integration-Tests gegen Test-DB**

Testfälle:
- Create + reload via `findByEinsatzId`
- Check-Constraint wird ausgelöst, wenn zwei FKs gleichzeitig gesetzt werden (via raw insert)
- `existsByName` True/False
- `hasFunkspruchReferenz` True nach Anlage eines Funkspruch-ETB-Eintrags

Run: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/infrastructure/funkkanal packages/backend/src/application/common/ports
git commit -m "✨(backend): Add Funkkanal-Repository mit Prisma-Mapper"
```

---

### Task 12: Event-Registry an 4 Stellen aktualisieren

**Files:**
- Modify: `packages/backend/src/infrastructure/outbox/event-deserializer.ts`
- Create: `packages/backend/src/infrastructure/events/adapters/funkkanal-event.adapter.ts`
- Modify: `packages/backend/src/infrastructure/events/adapters/index.ts`
- Modify: `packages/backend/src/infrastructure/events/event-adapters.module.ts`
- Prüfen: `packages/backend/src/infrastructure/outbox/event-serializer.ts` (evtl. nur Klassen-Mapping nötig)

- [ ] **Step 1: Serializer anpassen**

Zentrale Stelle finden (`event-serializer.ts`). Für jedes neue Event Klassen-Name → `eventName()`-Mapping hinzufügen, falls nötig.

- [ ] **Step 2: Deserializer Mapping ergänzen**

```typescript
import { FunkkanalErstelltEvent } from '@domain/events/funkkanal-erstellt.event';
import { FunkkanalGeaendertEvent } from '@domain/events/funkkanal-geaendert.event';
// ... alle 7 Events importieren

const EVENT_CLASS_MAP: Record<string, EventClass> = {
  // ... bestehende Einträge
  [FunkkanalErstelltEvent.eventName()]: FunkkanalErstelltEvent,
  [FunkkanalGeaendertEvent.eventName()]: FunkkanalGeaendertEvent,
  [FunkkanalArchiviertEvent.eventName()]: FunkkanalArchiviertEvent,
  [FunkkanalReihenfolgeGeaendertEvent.eventName()]: FunkkanalReihenfolgeGeaendertEvent,
  [FunkkanalZuordnungErstelltEvent.eventName()]: FunkkanalZuordnungErstelltEvent,
  [FunkkanalZuordnungEntferntEvent.eventName()]: FunkkanalZuordnungEntferntEvent,
  [NotfallAlertRequestedEvent.eventName()]: NotfallAlertRequestedEvent,
};
```

- [ ] **Step 3: Event-Adapter erstellen (Infrastructure)**

`funkkanal-event.adapter.ts` — delegiert an `EinsatzEventPublisher` für WebSocket-Broadcast (siehe Task 15):

```typescript
@Injectable()
export class FunkkanalEventAdapter {
  constructor(@Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher: IEinsatzEventPublisher) {}

  @OnEvent(FunkkanalErstelltEvent.eventName())
  async onErstellt(event: FunkkanalErstelltEvent) {
    await this.publisher.broadcast(event.einsatzId, 'funkkanal:erstellt', { kanalId: event.aggregateId, ... });
  }

  // analog für alle 6 Funkkanal-Events + NotfallAlert
  @OnEvent(NotfallAlertRequestedEvent.eventName())
  async onNotfall(event: NotfallAlertRequestedEvent) {
    await this.publisher.broadcast(event.einsatzId, 'funk:notfall-alert', { ... });
  }
}
```

Zusätzlich: Ein `EtbFunkspruchBroadcastAdapter` hört auf `EintragAddedEvent` + `EintragKorrigiertEvent`, broadcastet `etb:eintrag-erstellt` / `etb:eintrag-korrigiert` an den Einsatz-Room.

- [ ] **Step 4: Adapters-Index + Module**

In `adapters/index.ts`: Export der neuen Adapter hinzufügen.
In `event-adapters.module.ts`: Adapter in `providers: []` registrieren.

- [ ] **Step 5: Adapter-Tests**

Spec je Adapter: Event wird empfangen → `publisher.broadcast` wird mit korrekten Args aufgerufen (Mock-Publisher). PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/infrastructure
git commit -m "✨(backend): Register Funkkanal-Events in Serializer, Deserializer und Adapters"
```

---

### Task 13: DI-Tokens & Infrastructure-Modul

**Files:**
- Modify: `packages/backend/src/infrastructure/di-tokens.ts`
- Create: `packages/backend/src/infrastructure/funkkanal/funkkanal-infrastructure.module.ts`

- [ ] **Step 1: Tokens anlegen**

In `di-tokens.ts` neuen Namespace:

```typescript
export const FUNKKANAL_TOKENS = {
  REPOSITORY: Symbol('IFunkkanalRepository'),
  MAPPER: Symbol('FunkkanalPrismaMapper'),
  KANALPLAN_PDF_SERVICE: Symbol('KanalplanPdfService'),
  EINSATZ_EVENT_PUBLISHER: Symbol('IEinsatzEventPublisher'),
} as const;

// Backward-kompatible Flat-Exports (an bestehendes Muster angepasst, falls nötig):
export const FUNKKANAL_REPOSITORY = FUNKKANAL_TOKENS.REPOSITORY;
export const KANALPLAN_PDF_SERVICE = FUNKKANAL_TOKENS.KANALPLAN_PDF_SERVICE;
export const EINSATZ_EVENT_PUBLISHER = FUNKKANAL_TOKENS.EINSATZ_EVENT_PUBLISHER;
```

- [ ] **Step 2: Modul anlegen**

```typescript
@Module({
  providers: [
    PrismaFunkkanalMapper,
    { provide: FUNKKANAL_REPOSITORY, useClass: PrismaFunkkanalRepository },
    FunkkanalEventAdapter,
  ],
  exports: [FUNKKANAL_REPOSITORY],
})
export class FunkkanalInfrastructureModule {}
```

- [ ] **Step 3: In Root/AppModule einhängen**

- [ ] **Step 4: `pnpm --filter @bluelight-hub/backend check:di:imports`** grün halten. Alle Injectable-Imports ohne `import type`.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/infrastructure
git commit -m "✨(backend): Add FUNKKANAL_TOKENS und Infrastructure-Module"
```

---

## Phase 5: Funkkanal Application Layer

### Task 14: Funkkanal-Commands (CRUD + Reorder)

**Files:** (je Command ein Ordner `commands/<name>/`)
- Create: `create-funkkanal/{.command.ts, .handler.ts, __tests__/.handler.spec.ts}`
- Create: `update-funkkanal/*`
- Create: `archive-funkkanal/*`
- Create: `delete-funkkanal/*`
- Create: `reorder-funkkanaele/*`

Alle unter `packages/backend/src/application/funkkanal/commands/`.

Pattern für jeden Command (TDD):

- [ ] **Step 1: Command-Spec schreiben**

Testfälle pro Command:
- Happy Path → `Result.ok`, Repository-Save wird aufgerufen
- Validierungsfehler (z.B. leerer Name, doppelter Name via `existsByName` True) → `Result.fail` mit korrekter Error-Message
- Not-Found → `Result.fail('Funkkanal nicht gefunden')`
- Für `delete`: Wenn `hasFunkspruchReferenz` True → `Result.fail` mit Hinweis "Kanal archivieren statt löschen"

Beispiel `create-funkkanal.handler.spec.ts`:

```typescript
describe('CreateFunkkanalHandler', () => {
  it('erstellt aktiven Kanal und persistiert', async () => {
    const repo = createMockRepo();
    const handler = new CreateFunkkanalHandler(repo);
    const cmd = CreateFunkkanalCommand.create({
      einsatzId: 'e1', name: 'Kanal 1',
      details: { type: 'tmo', sprechgruppe: 'SG_1' },
      userId: 'u1',
    }).value;
    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);
    expect(repo.save).toHaveBeenCalled();
  });

  it('lehnt doppelten Namen ab', async () => {
    const repo = createMockRepo({ existsByName: true });
    // ...
    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });
});
```

Run: FAIL.

- [ ] **Step 2: Command + Handler implementieren**

Pattern am bestehenden `AddEintragHandler` orientieren. Jeder Command:
```typescript
@Injectable()
export class CreateFunkkanalHandler {
  constructor(@Inject(FUNKKANAL_REPOSITORY) private readonly repo: IFunkkanalRepository) {}
  async execute(cmd: CreateFunkkanalCommand): Promise<Result<Funkkanal>> {
    if (await this.repo.existsByName(cmd.einsatzId, cmd.name)) {
      return Result.fail('Kanalname bereits vergeben');
    }
    const detailsResult = buildDetailsVO(cmd.details);
    if (detailsResult.isFailure) return Result.fail(detailsResult.error);
    const aggregateResult = Funkkanal.create({ ... });
    if (aggregateResult.isFailure) return Result.fail(aggregateResult.error);
    await this.repo.save(aggregateResult.value);
    return Result.ok(aggregateResult.value);
  }
}
```

Reorder-Handler akzeptiert `{ einsatzId, ordering: Array<{id, sortIndex}> }` → lädt alle Kanäle → Aggregat-Methode `applyOrdering(ordering)` auf Domain-Ebene (emittiert `FunkkanalReihenfolgeGeaendertEvent`) → Repository `reorder(...)`.

- [ ] **Step 3: Alle Handler-Tests PASS**

Run: `npx jest --testPathPatterns="application/funkkanal" --no-coverage`. PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/application/funkkanal
git commit -m "✨(backend): Add Funkkanal CRUD Commands"
```

---

### Task 15: Funkkanal-Zuordnungs-Commands

**Files:**
- Create: `zuordne-kraft-zu-kanal/*`
- Create: `aendere-zuordnung-rolle/*`
- Create: `entferne-zuordnung/*`

Unter `packages/backend/src/application/funkkanal/commands/`.

- [ ] **Step 1: Failing Tests**

- `ZuordneKraftZuKanalCommand` — akzeptiert `kanalId`, **eine** von `fahrzeugId | personId | einheitId`, `rolle`, `userId`. Handler lädt Kanal, ruft `aggregate.zuordneKraft(...)`; bei bereits existierender Zuordnung → `Result.fail('Zuordnung existiert bereits')`. `rufnameSnapshot` wird vom Handler aus der jeweiligen Kraft-Repository geholt (Fahrzeug.funkrufname / Person.funkrufname / Einheit.name).
- `AendereZuordnungRolleCommand` — triggert `aggregate.aendereZuordnungRolle(...)`.
- `EntferneZuordnungCommand` — triggert `aggregate.entferneZuordnung(...)`.

- [ ] **Step 2: Kraft-Repositories für Rufname-Lookup injizieren**

`ZuordneKraftZuKanalHandler` hat zusätzliche Inject-Dependencies:
```typescript
@Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG) private readonly fahrzeugRepo,
@Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON) private readonly personRepo,
@Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT) private readonly einheitRepo,
```

Logik:
```typescript
let rufnameSnapshot: string;
if (cmd.fahrzeugId) {
  const fz = await this.fahrzeugRepo.findById(cmd.fahrzeugId);
  if (!fz) return Result.fail('Fahrzeug nicht gefunden');
  rufnameSnapshot = fz.funkrufname;
} // analog person / einheit
```

- [ ] **Step 3: Handler implementieren, Tests PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/application/funkkanal/commands
git commit -m "✨(backend): Add Funkkanal Zuordnungs-Commands"
```

---

### Task 16: Funkkanal-Queries

**Files:**
- Create: `packages/backend/src/application/funkkanal/queries/get-kanalplan/{query.ts, handler.ts, __tests__/}`
- Create: `queries/get-funkkanal-by-id/*`
- Create: `queries/get-rufnamen-vorschlaege/*`

- [ ] **Step 1: Failing Tests**

- `GetKanalplanQuery(einsatzId, includeArchived?)` → Array aller Kanäle inkl. Zuordnungen, sortiert nach `sortIndex asc, name asc`.
- `GetFunkkanalByIdQuery(kanalId)` → einzelner Kanal oder `Result.fail('not found')`.
- `GetRufnamenVorschlaegeQuery(einsatzId)` → `{ fahrzeuge: Array<{ id, funkrufname }>, personen: Array<{...}>, einheiten: Array<{ id, name }> }`.

- [ ] **Step 2: Queries implementieren**

Query-Handler via Repository-Ports (Read-only).

- [ ] **Step 3: Tests PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/application/funkkanal/queries
git commit -m "✨(backend): Add Funkkanal-Queries (Kanalplan, ById, Rufnamen-Vorschläge)"
```

---

### Task 17: NotfallFunkspruchAlertHandler (Application-Event-Handler)

**Files:**
- Create: `packages/backend/src/application/funkkanal/event-handlers/notfall-funkspruch-alert.handler.ts`
- Create: `packages/backend/src/application/funkkanal/event-handlers/__tests__/notfall-funkspruch-alert.handler.spec.ts`
- Modify: Infrastructure-Adapter registriert Handler für `EintragAddedEvent`

- [ ] **Step 1: Failing Test**

```typescript
it('emittiert NotfallAlertRequested bei Funkspruch mit Priorität notfall', async () => {
  const eventBus = { publish: jest.fn() };
  const handler = new NotfallFunkspruchAlertHandler(eventBus);
  const event = new EintragAddedEvent({
    aggregateId: 'etb1', einsatzId: 'e1',
    eintragId: 'ei1',
    kontext: { type: 'funkspruch', kanalId: 'k1', funkPrioritaet: 'notfall' },
    text: 'Brand 12',
    absender: 'Florian 1',
    // ...
  });
  await handler.handle(event);
  expect(eventBus.publish).toHaveBeenCalledWith(
    expect.objectContaining({ eventName: expect.stringContaining('notfall-alert-requested') })
  );
});

it('ignoriert Standard-Kontext', async () => {
  // event mit kontext.type='standard' → publish NICHT aufgerufen
});

it('ignoriert Funkspruch mit Priorität routine', async () => {
  // publish NICHT aufgerufen
});
```

Run: FAIL.

- [ ] **Step 2: Handler implementieren**

```typescript
@Injectable()
export class NotfallFunkspruchAlertHandler implements IEventHandler<EintragAddedEvent> {
  constructor(@Inject(EVENT_BUS) private readonly eventBus: IEventBus) {}

  async handle(event: EintragAddedEvent): Promise<void> {
    if (event.kontext?.type !== 'funkspruch') return;
    if (event.kontext.funkPrioritaet !== 'notfall') return;
    const alert = new NotfallAlertRequestedEvent({
      einsatzId: event.einsatzId,
      kanalId: event.kontext.kanalId,
      funkspruchEintragId: event.eintragId,
      absender: event.absender,
      text: event.text,
    });
    await this.eventBus.publish(alert);
  }
}
```

- [ ] **Step 3: Infrastructure-Adapter + Module-Registrierung**

Der bestehende Adapter-Mechanismus hört `EintragAddedEvent` → delegiert an Application-Handler. Registrierung in `event-adapters.module.ts` + `adapters/index.ts` + Serializer/Deserializer für `NotfallAlertRequestedEvent` (schon in Task 12 enthalten, verifizieren).

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/application/funkkanal/event-handlers packages/backend/src/infrastructure
git commit -m "✨(backend): Add NotfallFunkspruchAlertHandler"
```

---

## Phase 6: WebSocket-Gateway

### Task 18: EinsatzEventsGateway + Publisher

**Files:**
- Create: `packages/backend/src/infrastructure/websocket/einsatz-events.gateway.ts`
- Create: `packages/backend/src/infrastructure/websocket/einsatz-event-publisher.ts`
- Create: `packages/backend/src/infrastructure/websocket/events/einsatz-event.types.ts`
- Create: `packages/backend/src/infrastructure/websocket/__tests__/einsatz-events.gateway.spec.ts`
- Modify: `packages/backend/src/infrastructure/di-tokens.ts` (Publisher-Token)
- Create: `packages/backend/src/infrastructure/websocket/websocket.module.ts`
- Modify: `packages/backend/src/app.module.ts` (Modul einbinden)

- [ ] **Step 1: Event-Types definieren**

```typescript
// einsatz-event.types.ts
export type EinsatzEventName =
  | 'etb:eintrag-erstellt'
  | 'etb:eintrag-korrigiert'
  | 'funkkanal:erstellt'
  | 'funkkanal:geaendert'
  | 'funkkanal:archiviert'
  | 'funkkanal:reihenfolge-geaendert'
  | 'funkkanal:zuordnung-erstellt'
  | 'funkkanal:zuordnung-entfernt'
  | 'funk:notfall-alert';

export interface IEinsatzEventPublisher {
  broadcast(einsatzId: string, event: EinsatzEventName, payload: unknown): Promise<void>;
}
```

- [ ] **Step 2: Gateway implementieren**

Orientiere am bestehenden `ErinnerungGateway`:

```typescript
@WebSocketGateway({ namespace: '/ws/einsatz-events', cors: corsConfig })
@UseGuards(WsJwtAuthGuard)
export class EinsatzEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    @Inject(AUTH_SERVICE) private readonly authService: IAuthService,
    @Inject(EINSATZ_ZUGEHOERIGKEIT_CHECKER) private readonly access: IEinsatzAccessChecker,
  ) {}

  async handleConnection(client: Socket) {
    // JWT schon vom Guard verifiziert, UserId im client.data.user
    const einsatzId = client.handshake.query.einsatzId as string;
    if (!einsatzId) return client.disconnect();
    const allowed = await this.access.canAccess(client.data.user.id, einsatzId);
    if (!allowed) return client.disconnect();
    client.join(`einsatz:${einsatzId}`);
  }

  async handleDisconnect(client: Socket) {}
}
```

- [ ] **Step 3: Publisher implementieren**

```typescript
@Injectable()
export class EinsatzEventPublisher implements IEinsatzEventPublisher {
  constructor(private readonly gateway: EinsatzEventsGateway) {}
  async broadcast(einsatzId: string, event: EinsatzEventName, payload: unknown) {
    this.gateway.server.to(`einsatz:${einsatzId}`).emit(event, payload);
  }
}
```

Im Modul registrieren: `{ provide: EINSATZ_EVENT_PUBLISHER, useClass: EinsatzEventPublisher }`.

- [ ] **Step 4: Gateway-Tests**

Testfälle:
- Connect ohne einsatzId → disconnect
- Connect ohne Zugehörigkeit → disconnect
- Connect mit Zugehörigkeit → `client.join` wird mit korrektem Room aufgerufen
- `publisher.broadcast(...)` sendet via `server.to(room).emit(event, payload)`

Run: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/infrastructure/websocket packages/backend/src/infrastructure/di-tokens.ts packages/backend/src/app.module.ts
git commit -m "✨(backend): Add EinsatzEventsGateway mit JWT-Auth und Room-Broadcast"
```

---

## Phase 7: HTTP Layer

### Task 19: DTOs (discriminated unions + CRUD)

**Files:** (alle unter `packages/backend/src/modules/funkkanal/dto/`)
- Create: `kanal-details.dto.ts` — `TmoDetailsDto`, `DmoDetailsDto`, `AnalogDetailsDto` + Union
- Create: `create-funkkanal.dto.ts`, `update-funkkanal.dto.ts`, `reorder-funkkanaele.dto.ts`
- Create: `funkkanal.response.dto.ts`
- Create: `zuordnung.dto.ts` — `CreateZuordnungDto`, `UpdateZuordnungRolleDto`, `ZuordnungResponseDto`
- Create: `rufname-vorschlaege.response.dto.ts`
- Create: `packages/backend/src/modules/etb/dto/eintrag-kontext.dto.ts` — `StandardKontextDto`, `FunkKontextDto`

- [ ] **Step 1: Discriminated-Union-DTO für KanalDetails**

```typescript
// kanal-details.dto.ts
export class TmoDetailsDto {
  @ApiProperty({ enum: ['tmo'] }) type: 'tmo';
  @ApiProperty() @IsString() @IsNotEmpty() sprechgruppe: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() gssi?: string;
}
// analog DmoDetailsDto, AnalogDetailsDto

@ApiExtraModels(TmoDetailsDto, DmoDetailsDto, AnalogDetailsDto)
export class KanalDetailsDto {
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(TmoDetailsDto) },
      { $ref: getSchemaPath(DmoDetailsDto) },
      { $ref: getSchemaPath(AnalogDetailsDto) },
    ],
    discriminator: { propertyName: 'type', mapping: { tmo: '#/components/schemas/TmoDetailsDto', dmo: '#/components/schemas/DmoDetailsDto', analog: '#/components/schemas/AnalogDetailsDto' } },
  })
  @ValidateNested() @Type(...)
  details: TmoDetailsDto | DmoDetailsDto | AnalogDetailsDto;
}
```

Analoges Muster für `EintragKontextDto` mit `StandardKontextDto | FunkKontextDto`.

- [ ] **Step 2: CRUD + Zuordnungs-DTOs**

`CreateFunkkanalDto`:
```typescript
@IsString() @IsNotEmpty() @MaxLength(100) name: string;
@ValidateNested() @Type(...) details: TmoDetailsDto | DmoDetailsDto | AnalogDetailsDto;
@IsOptional() @IsString() zweck?: string;
```

`UpdateFunkkanalDto`: alle Felder optional.
`ReorderFunkkanaeleDto`: `ordering: Array<{ id: string; sortIndex: number }>` mit `@ValidateNested({ each: true })`.
`CreateZuordnungDto`: `fahrzeugId?` XOR `personId?` XOR `einheitId?`, `rolle: 'primaer' | 'sekundaer' | 'zuhoeren'` (default `primaer`). Validator prüft: genau eines gesetzt.
`FunkkanalResponseDto`: alle Felder + `zuordnungen: ZuordnungResponseDto[]`.

- [ ] **Step 3: Validator-Test für "genau eine Kraft"**

Unit-Test: bei 0 gesetzten IDs → Validation-Fehler; bei 2 gesetzten → Fehler; bei 1 → OK.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/modules/funkkanal/dto packages/backend/src/modules/etb/dto
git commit -m "✨(backend): Add Funkkanal-DTOs und EintragKontext-DTOs"
```

---

### Task 20: Funkkanal-Controller (CRUD + Reorder)

**Files:**
- Create: `packages/backend/src/modules/funkkanal/funkkanal.controller.ts`
- Create: `packages/backend/src/modules/funkkanal/__tests__/funkkanal.controller.spec.ts`
- Create: `packages/backend/src/modules/funkkanal/funkkanal.module.ts`
- Modify: `app.module.ts` (FunkkanalModule importieren)

- [ ] **Step 1: Failing Controller-Spec**

Testfälle (mit Supertest + Mock-Handlers):
- `POST /einsatz/:einsatzId/funkkanaele` → 201, `@ApiWrappedCreatedResponse`-Wrapping
- `GET /einsatz/:einsatzId/funkkanaele` → 200 Array
- `GET /einsatz/:einsatzId/funkkanaele/:kanalId` → 200 oder 404
- `PATCH /einsatz/:einsatzId/funkkanaele/:kanalId` → 200
- `DELETE /einsatz/:einsatzId/funkkanaele/:kanalId` → 204 wenn OK, 422 wenn Referenzen
- `POST /einsatz/:einsatzId/funkkanaele/reorder` → 200

- [ ] **Step 2: Controller implementieren**

```typescript
@Controller('einsatz/:einsatzId/funkkanaele')
@UseGuards(JwtAuthGuard)
@ApiTags('funkkanal')
export class FunkkanalController {
  constructor(
    private readonly createHandler: CreateFunkkanalHandler,
    private readonly updateHandler: UpdateFunkkanalHandler,
    private readonly archiveHandler: ArchiveFunkkanalHandler,
    private readonly deleteHandler: DeleteFunkkanalHandler,
    private readonly reorderHandler: ReorderFunkkanaeleHandler,
    private readonly getKanalplanHandler: GetKanalplanHandler,
    private readonly getByIdHandler: GetFunkkanalByIdHandler,
  ) {}

  @Post()
  @ApiWrappedCreatedResponse(FunkkanalResponseDto, { description: 'Kanal erstellt' })
  async create(@Param('einsatzId') einsatzId: string, @Body() dto: CreateFunkkanalDto, @User() user) {
    const cmd = CreateFunkkanalCommand.create({ einsatzId, ...dto, userId: user.id });
    if (cmd.isFailure) throw new BadRequestException(cmd.error);
    const result = await this.createHandler.execute(cmd.value);
    return mapResult(result, toDto);
  }

  // ... weitere Endpoints
}
```

Fehler-Mapping via Helper `mapResult(result)`:
- `Result.fail` mit Message containing "existiert bereits" → 409 Conflict
- "nicht gefunden" → 404
- "referenziert" / "archivieren" → 422 Unprocessable
- sonst → 400 Bad Request

- [ ] **Step 3: Tests PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/modules/funkkanal
git commit -m "✨(backend): Add Funkkanal-Controller"
```

---

### Task 21: Zuordnungs-Controller

**Files:**
- Create: `packages/backend/src/modules/funkkanal/zuordnung.controller.ts`
- Create: `packages/backend/src/modules/funkkanal/__tests__/zuordnung.controller.spec.ts`

- [ ] **Step 1: Failing Tests**

Endpoints:
- `POST /einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen` (CreateZuordnungDto) → 201
- `PATCH /einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen/:zuordnungId` (UpdateZuordnungRolleDto) → 200
- `DELETE /einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen/:zuordnungId` → 204

- [ ] **Step 2: Controller implementieren**

Pattern wie Task 20. Eigener Controller-Prefix: `einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen`.

- [ ] **Step 3: Tests PASS. Commit**

```bash
git commit -m "✨(backend): Add Funkkanal-Zuordnungs-Controller"
```

---

### Task 22: Rufname-Vorschlaege-Controller

**Files:**
- Create: `packages/backend/src/modules/funkkanal/rufname-vorschlaege.controller.ts`
- Create: `__tests__/rufname-vorschlaege.controller.spec.ts`

- [ ] **Step 1: Failing Tests**

`GET /einsatz/:einsatzId/rufname-vorschlaege` → 200 mit `{ fahrzeuge, personen, einheiten }`.

- [ ] **Step 2: Controller implementieren**

Delegiert an `GetRufnamenVorschlaegeHandler`.

- [ ] **Step 3: Tests PASS. Commit**

```bash
git commit -m "✨(backend): Add Rufname-Vorschlaege-Controller"
```

---

### Task 23: PDF-Export — Service + Controller

**Files:**
- Create: `packages/backend/src/infrastructure/export/kanalplan-pdf.service.ts`
- Create: `packages/backend/src/infrastructure/export/__tests__/kanalplan-pdf.service.spec.ts`
- Create: `packages/backend/src/modules/funkkanal/kanalplan-export.controller.ts`
- Create: `__tests__/kanalplan-export.controller.spec.ts`

- [ ] **Step 1: Failing Service-Test**

```typescript
describe('KanalplanPdfService', () => {
  it('erzeugt PDF-Buffer mit Header, Kanal-Tabelle und Zuordnungen', async () => {
    const svc = new KanalplanPdfService();
    const kanaele: Funkkanal[] = [/* 2 Kanäle mit je 1 Zuordnung */];
    const buffer = await svc.generate({ einsatzName: 'Einsatz X', kanaele, exportiertAm: new Date('2026-04-14T12:00:00Z') });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    // Buffer-Beginn ist PDF-Signatur
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
```

- [ ] **Step 2: Service implementieren**

Mit `pdfkit`:
- Seite: Titel, Einsatzname, Export-Zeitstempel
- Tabelle pro Kanal: Name, Typ-Badge-Text, Kennung (typabhängig formatiert: TMO → Sprechgruppe (GSSI), DMO → Kanal (Repeater), Analog → Band Frequenz (Kanalnr)), Zweck, Status
- Unter jedem Kanal: Zuordnungen als Liste: „Rufname (Rolle)"

- [ ] **Step 3: Controller-Endpoint**

```typescript
@Get('/einsatz/:einsatzId/kanalplan/export.pdf')
async export(@Param('einsatzId') einsatzId: string, @Res() res: Response) {
  const kanaele = await this.getKanalplanHandler.execute(...);
  const einsatzName = /* aus GetEinsatzById ... */;
  const buffer = await this.pdfService.generate({ einsatzName, kanaele: kanaele.value, exportiertAm: new Date() });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="kanalplan-${einsatzId}-${formatDate(new Date())}.pdf"`);
  res.send(buffer);
}
```

- [ ] **Step 4: Integration-Test**

Via Supertest: Response Content-Type `application/pdf`, Body startet mit `%PDF`.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/infrastructure/export packages/backend/src/modules/funkkanal
git commit -m "✨(backend): Add Kanalplan-PDF-Export-Service und Controller"
```

---

### Task 24: ETB-Controller für Kontext erweitern

**Files:**
- Modify: `packages/backend/src/modules/etb/controllers/*` (bestehende ETB-Controller)
- Modify: `packages/backend/src/modules/etb/dto/eintrag.dto.ts` (response + create)

- [ ] **Step 1: Failing Test**

ETB-Controller-Spec: `POST /einsatz/:einsatzId/etb/eintraege` mit `kontext: { type: 'funkspruch', kanalId, funkPrioritaet }` + `ereignisZeitpunkt` → 201, Response enthält Kontext + Zeitstempel.

Zusätzlich: `GET /einsatz/:einsatzId/etb/eintraege?kontextType=funkspruch&kanalId=...` (optionale Query-Filter) → gefilterte Liste.

- [ ] **Step 2: Request-DTO + Response-DTO anpassen**

`CreateEtbEintragDto`:
```typescript
@ValidateNested() @Type(/* discriminator resolver */)
@IsOptional()
kontext?: StandardKontextDto | FunkKontextDto;

@IsDateString() @IsOptional()
ereignisZeitpunkt?: string;
```

`EtbEintragResponseDto`:
```typescript
erfasstAm: Date;
ereignisZeitpunkt: Date;
kontext: { type: 'standard' } | { type: 'funkspruch'; kanalId: string; funkPrioritaet: 'routine' | 'prioritaet' | 'notfall' };
```

- [ ] **Step 3: Controller-Methoden + Query-Handler anpassen**

`GetEtbEintraegeQuery` bekommt optionale Filter `kontextType`, `kanalId`. Repository-Query filtert entsprechend über `kontext_type` und `kontext_data ->> 'kanalId'`.

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/modules/etb packages/backend/src/application/etb
git commit -m "♻️(backend): ETB-Controller erweitert um Kontext und Kontext-Filter"
```

---

## Phase 8: API-Client generieren

### Task 25: API-Client regenerieren

**Files:**
- Modify: `packages/shared/client/` (generated, darf manuell nicht angepasst werden, sondern regeneriert)

- [ ] **Step 1: Backend starten**

Run:
```bash
pnpm --filter @bluelight-hub/backend dev
```
Im Hintergrund, warte auf "Nest application successfully started" auf Port 3091.

- [ ] **Step 2: Client generieren**

Run:
```bash
pnpm run generate-api
```

Expected: `packages/shared/client/` aktualisiert mit `funkkanalControllerCreate*`, `etbCqrsControllerListEtbEintraege*`-Signaturen, KanalDetails/EintragKontext-Types.

- [ ] **Step 3: TypeScript-Check**

Run:
```bash
pnpm --filter @bluelight-hub/frontend typecheck
```

Erwartet: Keine Fehler bzgl. neuer Types. (Alte Calls könnten evtl. brechen, falls ETB-DTO-Shape inkompatibel — dann prüfen und Spec-additiv halten.)

- [ ] **Step 4: Commit**

```bash
git add packages/shared/client
git commit -m "🤖(shared): Regenerate API client for Funkverkehr endpoints"
```

---

## Phase 9: Frontend — Foundation

### Task 26: Feature-Skelett + Store

**Files:**
- Create: `packages/frontend/src/features/funkverkehr/` (Verzeichnisstruktur laut Spec 8.1)
- Create: `packages/frontend/src/features/funkverkehr/stores/funkprotokoll-filter.store.ts`
- Create: `packages/frontend/src/features/funkverkehr/__tests__/store.spec.ts`
- Create: `packages/frontend/src/features/funkverkehr/index.ts` (Barrel)

- [ ] **Step 1: Failing Store-Test**

```typescript
import { getFilterForEinsatz, setFilterForEinsatz, resetFilterForEinsatz } from '../stores/funkprotokoll-filter.store';

describe('funkprotokoll-filter.store', () => {
  it('speichert Filter pro Einsatz-ID', () => {
    setFilterForEinsatz('e1', { kanalIds: ['k1'], prioritaeten: ['notfall'], dichteMode: 'bubbles' });
    expect(getFilterForEinsatz('e1').kanalIds).toEqual(['k1']);
    expect(getFilterForEinsatz('e2').kanalIds).toEqual([]); // default
  });

  it('resetet Filter auf Default zurück', () => {
    setFilterForEinsatz('e1', { kanalIds: ['k1'] });
    resetFilterForEinsatz('e1');
    expect(getFilterForEinsatz('e1').kanalIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Store implementieren**

```typescript
// funkprotokoll-filter.store.ts
import { Store } from '@tanstack/react-store';

export type DichteMode = 'bubbles' | 'kompakt';
export type FunkPrioritaetFilter = 'routine' | 'prioritaet' | 'notfall';

export interface FunkprotokollFilter {
  kanalIds: string[];
  prioritaeten: FunkPrioritaetFilter[];
  vonDate?: string;
  bisDate?: string;
  absenderQuery?: string;
  volltextQuery?: string;
  dichteMode: DichteMode;
}

const DEFAULT: FunkprotokollFilter = {
  kanalIds: [], prioritaeten: [], dichteMode: 'bubbles',
};

interface State { byEinsatz: Record<string, FunkprotokollFilter>; }

export const funkprotokollFilterStore = new Store<State>({ byEinsatz: {} });

export const getFilterForEinsatz = (einsatzId: string): FunkprotokollFilter =>
  funkprotokollFilterStore.state.byEinsatz[einsatzId] ?? DEFAULT;

export const setFilterForEinsatz = (einsatzId: string, patch: Partial<FunkprotokollFilter>): void => {
  funkprotokollFilterStore.setState((s) => ({
    byEinsatz: { ...s.byEinsatz, [einsatzId]: { ...getFilterForEinsatz(einsatzId), ...patch } },
  }));
};

export const resetFilterForEinsatz = (einsatzId: string): void => {
  funkprotokollFilterStore.setState((s) => {
    const copy = { ...s.byEinsatz };
    delete copy[einsatzId];
    return { byEinsatz: copy };
  });
};
```

- [ ] **Step 3: Tests PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/funkverkehr
git commit -m "✨(frontend): Add funkverkehr Feature-Skelett und Filter-Store"
```

---

### Task 27: Kanalplan-API-Hooks

**Files:** (unter `packages/frontend/src/features/funkverkehr/api/`)
- Create: `queries.ts` — Query-Key Factory
- Create: `use-kanalplan.ts`, `use-create-funkkanal.ts`, `use-update-funkkanal.ts`, `use-archive-funkkanal.ts`, `use-delete-funkkanal.ts`, `use-reorder-funkkanaele.ts`
- Create: `use-create-zuordnung.ts`, `use-update-zuordnung-rolle.ts`, `use-remove-zuordnung.ts`
- Create: `use-rufname-vorschlaege.ts`
- Create: `use-export-kanalplan-pdf.ts`
- Create: Spec je Hook unter `__tests__/`

- [ ] **Step 1: Query-Key-Factory**

```typescript
export const FUNKVERKEHR_QUERY_KEYS = {
  kanalplan: (einsatzId: string) => ['funkverkehr', 'kanalplan', einsatzId] as const,
  kanal: (kanalId: string) => ['funkverkehr', 'kanal', kanalId] as const,
  rufnamenVorschlaege: (einsatzId: string) => ['funkverkehr', 'rufnamen-vorschlaege', einsatzId] as const,
  funkprotokoll: (einsatzId: string, filter?: unknown) =>
    ['funkverkehr', 'funkprotokoll', einsatzId, filter] as const,
};
```

- [ ] **Step 2: Query-Hook als Vorlage (`use-kanalplan.ts`)**

```typescript
export const useKanalplan = ({ einsatzId, includeArchived = false, enabled = true }) => {
  return useQuery({
    enabled: enabled && !!einsatzId,
    queryKey: [...FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId), { includeArchived }],
    queryFn: () => api.funkkanal().funkkanalControllerListV*({ einsatzId, includeArchived }),
    staleTime: 30_000,
  });
};
```

- [ ] **Step 3: Mutation-Hooks mit Optimistic Updates**

Pattern (Beispiel `use-create-funkkanal.ts`):
```typescript
export const useCreateFunkkanal = (einsatzId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFunkkanalDto) =>
      api.funkkanal().funkkanalControllerCreateV*({ einsatzId, createFunkkanalDto: dto }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) });
      toast.success('Kanal erstellt');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
};
```

Reorder-Hook mit Optimistic Update:
```typescript
onMutate: async (ordering) => {
  await qc.cancelQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) });
  const prev = qc.getQueryData(FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId));
  qc.setQueryData(FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId), (old) =>
    applyOrderingLocally(old, ordering)
  );
  return { prev };
},
onError: (_e, _v, ctx) => qc.setQueryData(FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId), ctx?.prev),
onSettled: () => qc.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) }),
```

- [ ] **Step 4: PDF-Export-Hook**

```typescript
// use-export-kanalplan-pdf.ts
export const useExportKanalplanPdf = (einsatzId: string) => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.funkkanal().kanalplanExportControllerExport({ einsatzId }, { responseType: 'blob' });
      return { blob: response as unknown as Blob, filename: `kanalplan-${einsatzId}-${format(new Date(), 'yyyy-MM-dd')}.pdf` };
    },
    onSuccess: ({ blob, filename }) => {
      downloadExport(blob, filename);
      toast.success('PDF heruntergeladen');
    },
    onError: () => toast.error('PDF-Export fehlgeschlagen'),
  });
};
```

Wiederverwendet `downloadExport` aus `packages/frontend/src/features/reminders/lib/download-export.ts` — bei Bedarf als shared utility nach `shared/lib/` verschieben (YAGNI: erstmal nicht verschieben, einfach importieren).

- [ ] **Step 5: Tests je Hook**

Run: `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="funkverkehr/api"`. PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/features/funkverkehr/api
git commit -m "✨(frontend): Add Kanalplan API-Hooks (TanStack Query)"
```

---

### Task 28: ETB-basierte Funkprotokoll-Hooks

**Files:**
- Create: `packages/frontend/src/features/funkverkehr/hooks/use-funkprotokoll-eintraege.ts`
- Create: `packages/frontend/src/features/funkverkehr/hooks/use-create-funkspruch.ts`
- Create: `packages/frontend/src/features/funkverkehr/hooks/use-dichte-mode.ts`
- Create: `__tests__/` für alle

- [ ] **Step 1: `useFunkprotokollEintraege`-Test**

Wrappt ETB-Query mit Filter `kontextType='funkspruch'` und weiteren Frontend-Filtern. Mit Filter-Store verdrahtet.

```typescript
it('ruft ETB-API mit kontextType=funkspruch und Filter auf', () => {
  // ... rendered hook with einsatzId='e1'
  // filter-store pre-populated with kanalIds=['k1']
  expect(mockApi).toHaveBeenCalledWith(expect.objectContaining({ einsatzId: 'e1', kontextType: 'funkspruch', kanalId: 'k1' }));
});
```

- [ ] **Step 2: Implementieren**

```typescript
export const useFunkprotokollEintraege = (einsatzId: string) => {
  const filter = useStore(funkprotokollFilterStore, (s) => s.byEinsatz[einsatzId] ?? DEFAULT);
  return useQuery({
    queryKey: FUNKVERKEHR_QUERY_KEYS.funkprotokoll(einsatzId, filter),
    queryFn: () => api.etb().etbCqrsControllerListEintraege*({
      einsatzId,
      kontextType: 'funkspruch',
      kanalId: filter.kanalIds.length === 1 ? filter.kanalIds[0] : undefined,
      // weitere Filter als Server-Query-Params soweit im Backend unterstützt (ansonsten clientseitig filtern in `select`)
    }),
    select: (data) => applyClientFilters(data, filter),
  });
};
```

- [ ] **Step 3: `useCreateFunkspruch`-Hook**

Wrappt `AddEintragCommand` mit `kontext.type='funkspruch'` + Default `kategorie=KOMMUNIKATION`.

```typescript
export const useCreateFunkspruch = (einsatzId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { text: string; absender?: string; empfaenger?: string; kanalId: string; funkPrioritaet: FunkPrioritaetFilter; ereignisZeitpunkt: string; }) =>
      api.etb().etbCqrsControllerAddEintrag*({
        einsatzId,
        addEintragDto: {
          text: input.text,
          absender: input.absender, empfaenger: input.empfaenger,
          kategorie: 'KOMMUNIKATION',
          kontext: { type: 'funkspruch', kanalId: input.kanalId, funkPrioritaet: input.funkPrioritaet },
          ereignisZeitpunkt: input.ereignisZeitpunkt,
        },
      }),
    onSuccess: () => {
      // Optimistic: WebSocket-Event wird ebenfalls invalidate triggern — hier nur Fallback
      qc.invalidateQueries({ queryKey: ['funkverkehr', 'funkprotokoll', einsatzId] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
};
```

- [ ] **Step 4: `useDichteMode`-Hook**

Dünner Wrapper um Filter-Store-`dichteMode` mit `useStore`-Selector + Setter.

- [ ] **Step 5: Tests PASS. Commit**

```bash
git commit -m "✨(frontend): Add Funkprotokoll-Hooks (ETB-Wrapping, CreateFunkspruch, DichteMode)"
```

---

### Task 29: WebSocket-Hook `useEinsatzEvents`

**Files:**
- Create: `packages/frontend/src/features/funkverkehr/api/use-einsatz-events.ts`
- Create: `packages/frontend/src/features/funkverkehr/api/__tests__/use-einsatz-events.spec.ts`
- Check: `packages/frontend/package.json` — `socket.io-client` vorhanden? (Sonst: `pnpm --filter @bluelight-hub/frontend add socket.io-client`).

- [ ] **Step 1: Socket.io-Client installieren (falls fehlt)**

Run:
```bash
cd packages/frontend && grep socket.io-client package.json || pnpm add socket.io-client
```

- [ ] **Step 2: Failing Test**

```typescript
it('connected on mount, subscribed auf Einsatz-Events', async () => {
  const mockSocket = createMockSocket();
  // ...render hook
  expect(mockSocket.emit).toBeCalledWith(...); // or: on('connect') was triggered
});

it('bei etb:eintrag-erstellt invalidate funkprotokoll- und etb-Queries', async () => {
  // fire event → queryClient.invalidate called with expected keys
});

it('bei funk:notfall-alert ruft onNotfall-Callback auf', async () => {});

it('reconnect backoff 1s → 2s → 5s → 10s → 30s', async () => {
  // jest.useFakeTimers(); trigger disconnect mehrmals, überprüfe Delays
});
```

- [ ] **Step 3: Hook implementieren**

```typescript
// use-einsatz-events.ts
import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import { queryClient } from '@/shared/query-client';

const BACKOFF_SCHEDULE = [1000, 2000, 5000, 10000, 30000];

export interface UseEinsatzEventsOptions {
  einsatzId: string;
  onNotfall?: (payload: NotfallAlertPayload) => void;
}

export const useEinsatzEvents = ({ einsatzId, onNotfall }: UseEinsatzEventsOptions) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const retryIdxRef = useRef(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!einsatzId) return;

    const connect = () => {
      const socket = io('/ws/einsatz-events', {
        query: { einsatzId },
        auth: { token: getAuthToken() }, // Projekt-Konvention
        reconnection: false, // wir steuern selbst
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        retryIdxRef.current = 0;
        setStatus('connected');
        // Reconnect-Fall: Full-Invalidate
        queryClient.invalidateQueries({ queryKey: ['funkverkehr', 'kanalplan', einsatzId] });
        queryClient.invalidateQueries({ queryKey: ['funkverkehr', 'funkprotokoll', einsatzId] });
        queryClient.invalidateQueries({ queryKey: ['etb', einsatzId] });
      });

      socket.on('disconnect', () => {
        setStatus('reconnecting');
        const delay = BACKOFF_SCHEDULE[Math.min(retryIdxRef.current, BACKOFF_SCHEDULE.length - 1)];
        retryIdxRef.current += 1;
        setTimeout(connect, delay);
      });

      socket.on('etb:eintrag-erstellt', () => {
        queryClient.invalidateQueries({ queryKey: ['funkverkehr', 'funkprotokoll', einsatzId] });
        queryClient.invalidateQueries({ queryKey: ['etb', einsatzId] });
      });
      socket.on('etb:eintrag-korrigiert', () => {
        queryClient.invalidateQueries({ queryKey: ['funkverkehr', 'funkprotokoll', einsatzId] });
        queryClient.invalidateQueries({ queryKey: ['etb', einsatzId] });
      });
      ['erstellt', 'geaendert', 'archiviert', 'reihenfolge-geaendert', 'zuordnung-erstellt', 'zuordnung-entfernt']
        .forEach((ev) => socket.on(`funkkanal:${ev}`, () => {
          queryClient.invalidateQueries({ queryKey: ['funkverkehr', 'kanalplan', einsatzId] });
        }));
      socket.on('funk:notfall-alert', (payload) => onNotfall?.(payload));
    };

    connect();
    return () => { socketRef.current?.disconnect(); socketRef.current = null; };
  }, [einsatzId]);

  return { status };
};
```

- [ ] **Step 4: Tests PASS. Commit**

```bash
git commit -m "✨(frontend): Add useEinsatzEvents WebSocket-Hook mit Backoff-Reconnect"
```

---

## Phase 10: Frontend — UI Atoms + Molecules

### Task 30: Atoms — FunkPrioritaetBadge, KanalStatusBadge

**Files:**
- Create: `packages/frontend/src/features/funkverkehr/ui/atoms/FunkPrioritaetBadge.atom.tsx`
- Create: `packages/frontend/src/features/funkverkehr/ui/atoms/KanalStatusBadge.atom.tsx`
- Create: `utils/priority-color.ts`
- Create: Specs

- [ ] **Step 1: `priority-color.ts`**

```typescript
export const PRIORITAET_STYLES = {
  routine: { text: 'text-slate-600', border: 'border-slate-300', icon: 'radio' },
  prioritaet: { text: 'text-amber-600', border: 'border-amber-500', icon: 'warning' },
  notfall: { text: 'text-red-700', border: 'border-red-600', icon: 'siren', pulse: true },
} as const;
```

- [ ] **Step 2: Failing Test**

```typescript
it('rendert "Routine" mit slate-Farbe', () => {
  render(<FunkPrioritaetBadge prioritaet="routine" />);
  expect(screen.getByText(/routine/i)).toBeInTheDocument();
});

it('Notfall hat Pulse-Animation und Siren-Icon', () => {
  const { container } = render(<FunkPrioritaetBadge prioritaet="notfall" />);
  expect(container.querySelector('.animate-pulse')).toBeTruthy();
  // Icon-Check je nach Icon-Library
});
```

- [ ] **Step 3: Implementieren**

```tsx
export const FunkPrioritaetBadge = ({ prioritaet }: { prioritaet: FunkPrioritaetValue }) => {
  const s = PRIORITAET_STYLES[prioritaet];
  const Icon = getIcon(s.icon);
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', s.text, s.pulse && 'animate-pulse')}>
      <Icon className="size-3.5" aria-hidden />
      {LABEL[prioritaet]}
    </span>
  );
};
```

Analog `KanalStatusBadge` für `aktiv | inaktiv | archiviert`.

- [ ] **Step 4: Tests PASS. Commit**

```bash
git commit -m "✨(frontend): Add FunkPrioritaetBadge und KanalStatusBadge Atoms"
```

---

### Task 31: Molecules — KanalDetailsForm + FunkKontextBadge + NotfallAlertToast

**Files:**
- Create: `ui/molecules/KanalDetailsForm.molecule.tsx`
- Create: `ui/molecules/FunkKontextBadge.molecule.tsx`
- Create: `ui/molecules/NotfallAlertToast.molecule.tsx`
- Create: `ui/molecules/FunkspruchBubble.molecule.tsx`
- Create: `ui/molecules/FunkspruchCompactRow.molecule.tsx`
- Create: Specs

- [ ] **Step 1: KanalDetailsForm — typabhängige Felder**

Props:
```typescript
interface Props {
  value: KanalDetailsShape;
  onChange: (next: KanalDetailsShape) => void;
  errors?: Partial<Record<keyof KanalDetailsShape, string>>;
}
```

Rendert Radio-Group für Typ (TMO/DMO/Analog) und wechselt dann die sichtbaren Felder. TanStack-Form verdrahtet (siehe KanalEditDrawer in Task 32).

- [ ] **Step 2: FunkKontextBadge**

Zeigt Kanal-Name + Priorität kompakt. Falls `kanal` zur Zeit nicht auflösbar (z.B. inaktiv gelöscht) → "Kanal (gelöscht)".

- [ ] **Step 3: NotfallAlertToast — triggered on event**

```tsx
// via sonner's custom content
toast.custom((id) => (
  <div className="animate-pulse rounded border-l-4 border-red-700 bg-red-50 p-3">
    <SirenIcon /> NOTFALL — {payload.kanal}: "{payload.text}"
  </div>
), { duration: 10_000 });
```

- [ ] **Step 4: FunkspruchBubble + FunkspruchCompactRow**

`FunkspruchBubble`: Links Absender + Zeit, Rechts Empfänger; Inhalt als Text. Farbakzent via Priorität-Border links.
`FunkspruchCompactRow`: `[HH:mm:ss] {KANAL} {ABSENDER} → {EMPFAENGER}: "{Inhalt}"` mit Priorität-Icon.

- [ ] **Step 5: Tests je Molecule**

- [ ] **Step 6: Commit**

```bash
git commit -m "✨(frontend): Add Funkverkehr Molecules (KanalDetailsForm, Bubbles, NotfallToast)"
```

---

## Phase 11: Frontend — UI Organisms — Kanalplan

### Task 32: KanalEditDrawer + ZuordnungsManager

**Files:**
- Create: `ui/organisms/KanalEditDrawer.organism.tsx`
- Create: `ui/organisms/ZuordnungsManager.organism.tsx`
- Create: `schemas/kanal.schema.ts` (Zod)
- Create: Specs

- [ ] **Step 1: Zod-Schema für Kanal**

```typescript
export const kanalDetailsSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('tmo'), sprechgruppe: z.string().min(1), gssi: z.string().optional() }),
  z.object({ type: z.literal('dmo'), dmoKanal: z.string().min(1), repeater: z.string().optional() }),
  z.object({ type: z.literal('analog'), band: z.enum(['4m', '2m']), frequenz: z.string().min(1), kanalnummer: z.string().optional() }),
]);

export const kanalFormSchema = z.object({
  name: z.string().min(1).max(100),
  details: kanalDetailsSchema,
  zweck: z.string().optional(),
});
```

- [ ] **Step 2: KanalEditDrawer implementieren**

- Nutzt `Dialog.SlideIn` (aus `shared/ui/molecules/dialog.molecule.tsx`, `position="right"`, `size="lg"`)
- TanStack Form (`@tanstack/react-form`) mit Zod-Resolver
- Props: `kanal?: FunkkanalDto` (undefined → Create-Modus, sonst Edit)
- Submit → `useCreateFunkkanal` oder `useUpdateFunkkanal` (je nach Modus)
- Zeigt `KanalDetailsForm`
- Zeigt Löschen-Button (nur Edit-Modus) → `useDeleteFunkkanal` mit Confirm-Dialog; falls Fehler 422 → Toast mit Archivieren-Vorschlag

- [ ] **Step 3: ZuordnungsManager**

- Combobox (Headless UI Combobox) mit `useRufnamenVorschlaege(einsatzId)` als Datenquelle
- Gruppen: Fahrzeuge (funkrufname), Personen (funkrufname), Einheiten (name)
- Pro bereits zugeordnete Kraft: Segmented-Control für Rolle (`primaer | sekundaer | zuhoeren`) + Remove-X
- Submit `Kraft zuordnen` → `useCreateZuordnung`
- Rolle ändern → `useUpdateZuordnungRolle`
- Entfernen → `useRemoveZuordnung`

- [ ] **Step 4: Tests mit Mock-API-Client**

- [ ] **Step 5: Commit**

```bash
git commit -m "✨(frontend): Add KanalEditDrawer und ZuordnungsManager Organisms"
```

---

### Task 33: KanalplanTable mit Drag-and-Drop

**Files:**
- Create: `ui/organisms/KanalplanTable.organism.tsx`
- Create: `hooks/use-kanal-columns.tsx`
- Create: Spec
- Check: `@dnd-kit/core` + `@dnd-kit/sortable` in `package.json` (sonst installieren)

- [ ] **Step 1: dnd-kit installieren (falls fehlt)**

Run:
```bash
cd packages/frontend && grep dnd-kit package.json || pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: KanalplanTable implementieren**

Basis: `DataTable` (aus `shared/ui/organisms/data-table.organism.tsx`) **wird nicht** genutzt (passt nicht zu Drag-Row). Stattdessen eigene `<table>` mit `DndContext` + `SortableContext` + `useSortable`.

Spalten laut Spec 8.3:
- Drag-Handle (`useSortable`)
- Name
- Typ-Badge (aus `details.type`)
- Kennung (formatiert: `formatKanalKennung(details)` aus `utils/kanal-details-helpers.ts`)
- Zuordnungen — `<ZuordnungChipList>` (inline editor öffnet `ZuordnungsManager` per Click)
- Status-Badge
- Aktionen — Dropdown (Edit, Archivieren, Löschen, Kräfte zuordnen)

`onDragEnd` → baut neue `ordering` (id + sortIndex) → `useReorderFunkkanaele`.

- [ ] **Step 3: Tests**

- Dragging-Interaction (jest-dom + fireEvent)
- Sortierung nach Drop
- Dropdown-Aktionen

- [ ] **Step 4: Commit**

```bash
git commit -m "✨(frontend): Add KanalplanTable mit Drag-and-Drop-Sortierung"
```

---

## Phase 12: Frontend — UI Organisms — Funkprotokoll

### Task 34: FunkspruchComposer

**Files:**
- Create: `ui/organisms/FunkspruchComposer.organism.tsx`
- Create: Spec

- [ ] **Step 1: Failing Test**

- Cmd/Ctrl+Enter triggert Submit
- Shift+Enter fügt Newline ein
- Priorität-Default `routine`
- Ereigniszeitpunkt-Default = now
- `useRufnamenVorschlaege` wird für Absender-Combobox genutzt
- Kanal-Dropdown nur aktive Kanäle

- [ ] **Step 2: Implementieren**

- TanStack Form
- Felder:
  - Combobox Absender — Rufnamen-Vorschläge (gruppiert), `allowCustomValue=true`
  - Combobox Empfänger — optional, `allowCustomValue=true`
  - Dropdown Kanal — `kanalplan.filter(k => k.status === 'aktiv')`
  - Textarea Inhalt (min-height 2.5rem, grows)
  - Segmented-Control Priorität
  - DateTimePicker Ereigniszeitpunkt (default jetzt, edit-bar)
- Sticky am unteren Rand des Chat-Views (Flex-Container)
- Submit → `useCreateFunkspruch`

- [ ] **Step 3: Tests PASS. Commit**

```bash
git commit -m "✨(frontend): Add FunkspruchComposer"
```

---

### Task 35: FunkprotokollFilterSidebar

**Files:**
- Create: `ui/organisms/FunkprotokollFilterSidebar.organism.tsx`
- Create: Spec

- [ ] **Step 1: Implementieren**

- Multi-Select Combobox Kanal (aus `useKanalplan`)
- Checkbox-Gruppe Priorität (3 Werte)
- DateTime-Picker von/bis
- Combobox Absender (`allowCustomValue`)
- Input Volltextsuche (debounce 250ms)
- "Zurücksetzen"-Button → `resetFilterForEinsatz`
- Liest/schreibt über `funkprotokollFilterStore`

- [ ] **Step 2: Tests**

- [ ] **Step 3: Commit**

```bash
git commit -m "✨(frontend): Add FunkprotokollFilterSidebar"
```

---

### Task 36: FunkprotokollView (virtualisiert)

**Files:**
- Create: `ui/organisms/FunkprotokollView.organism.tsx`
- Create: Spec

- [ ] **Step 1: Implementieren**

- `useFunkprotokollEintraege(einsatzId)` Daten
- `useVirtualizer` (wie in `EtbEntryList`) mit:
  - `count: eintraege.length`
  - `estimateSize: () => (dichteMode === 'kompakt' ? 28 : 88)`
  - `getScrollElement: () => scrollContainerRef.current`
  - `useFlushSync: false`
- Dichte-Toggle oben rechts (`useDichteMode`): Bubbles | Kompakt
- Render-Item je nach Modus: `FunkspruchBubble` oder `FunkspruchCompactRow`
- Auto-Scroll: wenn User am unteren Ende (`isNearBottom`), bei neuem Eintrag automatisch scrollen. Sonst Badge "X neue Nachrichten" oben anzeigen, Click springt runter.
- Pause-Indikator wenn `!isNearBottom`

- [ ] **Step 2: Tests (mit Mock-Daten, evtl. Virtualizer-Mock)**

- [ ] **Step 3: Commit**

```bash
git commit -m "✨(frontend): Add virtualisierte FunkprotokollView mit Dichte-Modi"
```

---

### Task 37: FunkverkehrLayout + Page + Tab-Routing

**Files:**
- Create: `ui/organisms/FunkverkehrLayout.organism.tsx`
- Create: `ui/pages/FunkverkehrPage.tsx`
- Modify: `packages/frontend/src/routes/app/einsatz/$einsatzId/kommunikation/funk.tsx`
- Create: Specs

- [ ] **Step 1: Route validateSearch**

```typescript
// funk.tsx
import { z } from 'zod';
const searchSchema = z.object({ tab: z.enum(['kanalplan', 'protokoll']).optional().default('kanalplan') });

export const Route = createFileRoute('/app/einsatz/$einsatzId/kommunikation/funk')({
  validateSearch: searchSchema.parse,
  component: FunkverkehrPage,
});
```

- [ ] **Step 2: FunkverkehrLayout**

- Tab-Leiste (Headless UI Tabs oder Custom) mit `tab` aus URL
- Tab-Click → `router.navigate` mit neuen Search-Params (erhalten)
- Zeigt Child-Organismus je nach Tab:
  - `tab=kanalplan` → Filter-Bar + `KanalplanTable` + "Kanal hinzufügen"-Button + "PDF exportieren"-Button
  - `tab=protokoll` → Flex-Layout: Filter-Sidebar (links 280px) + `FunkprotokollView` (flex-1) mit `FunkspruchComposer` sticky unten

- [ ] **Step 3: FunkverkehrPage verdrahtet useEinsatzEvents**

```typescript
export function FunkverkehrPage() {
  const { einsatzId } = Route.useParams();
  useEinsatzEvents({ einsatzId, onNotfall: showNotfallToast });
  return <FunkverkehrLayout einsatzId={einsatzId} />;
}
```

- [ ] **Step 4: Route-Tests**

- URL `?tab=protokoll` rendert Protokoll-Tab
- Tab-Switch ändert URL
- Default (keine query) → Kanalplan-Tab

- [ ] **Step 5: Commit**

```bash
git commit -m "✨(frontend): Add FunkverkehrPage mit Tab-Routing (Kanalplan/Protokoll)"
```

---

## Phase 13: Architektur-Dokumentation

### Task 38: Vier ADRs schreiben

**Files:**
- Create: `docs/adr/NNNN-etb-eintrag-kontext-discriminated-union.md`
- Create: `docs/adr/NNNN-websocket-event-bus-einsatz-scoped.md`
- Create: `docs/adr/NNNN-funkkanal-als-aggregat.md`
- Create: `docs/adr/NNNN-polymorphe-zuordnung-nullable-fks.md`

`NNNN` = nächste freie Nummer (ls `docs/adr/` zuerst).

- [ ] **Step 1: ADR-Nummerierung prüfen**

Run:
```bash
ls docs/adr/ | sort | tail -5
```
Nächste Nummer ermitteln.

- [ ] **Step 2: ADR-Template nutzen**

Projekt-Konvention (`docs/adr/000X-template.md` falls vorhanden, sonst aus bestehender ADR kopieren).

Inhalte:
1. **ETB-Kontext-ADR:** Status, Kontext (ETB als Protokoll-Backbone), Entscheidung (Discriminated Union via `kontextType + kontextData` JSONB), Alternativen (separate Tabellen, Inheritance), Konsequenzen, Migration.
2. **WebSocket-ADR:** Namespace `/ws/einsatz-events`, Room-Pattern `einsatz:{id}`, JWT-Auth-Flow, Broadcast-Semantik (nur Notifications, nicht State), Reconnect-Strategie (Client-seitig).
3. **Funkkanal-Aggregat-ADR:** Abgrenzung zu ETB, Lifecycle (aktiv/inaktiv/archiviert), typisierte `KanalDetails`-VO.
4. **Polymorphe-Zuordnung-ADR:** Gegenüberstellung `kraftType + kraftId` (String) vs. drei nullable FKs + Check-Constraint. Entscheidung: FKs + Constraint wegen referentieller Integrität und CASCADE-Delete-Korrektheit.

- [ ] **Step 3: Commit**

```bash
git add docs/adr
git commit -m "📝(docs): Add 4 ADRs für Funkverkehr-Feature"
```

---

### Task 39: arc42-Architektur aktualisieren

**Files:**
- Modify: `docs/architecture/` — relevante Sektionen (Bausteinsicht, Laufzeitsicht)

- [ ] **Step 1: Architektur-Dateien sichten**

Run:
```bash
ls docs/architecture/
```

- [ ] **Step 2: Neue Bausteine dokumentieren**

Ergänzen:
- Funkkanal-Aggregat im Bausteinsicht-Abschnitt (Domain-Layer)
- WebSocket-Gateway in Infrastructure
- Laufzeitsicht: Sequenzdiagramm "Funkspruch mit Notfall-Priorität" (Command → Aggregat → Event → Adapter → WebSocket → Client)

- [ ] **Step 3: Commit**

```bash
git add docs/architecture
git commit -m "📝(docs): arc42 um Funkkanal-Aggregat und WebSocket-Gateway erweitert"
```

---

## Phase 14: Verification

### Task 40: Full-Stack E2E im Browser

**Files:** _(keine Änderungen — Verification-Schritt)_

- [ ] **Step 1: Backend + Frontend starten**

Run (parallel):
```bash
pnpm -r dev
```
Bis `http://localhost:3090` und `http://localhost:3091/api` erreichbar.

- [ ] **Step 2: Login + Einsatz öffnen**

Chrome-DevTools-MCP oder Browser:
- Login mit `rubeen / MyPass123*`
- Einsatz auswählen, zur URL `/app/einsatz/:einsatzId/kommunikation/funk` navigieren

- [ ] **Step 3: Kanalplan-Golden-Path**

- Kanal `TMO/SG_Feuer_1` hinzufügen → erscheint in Tabelle
- Zweiten Kanal `DMO/310` hinzufügen
- Drag-and-Drop Reihenfolge ändern → persistiert nach Reload
- Kräfte zuordnen (Fahrzeug + Person) → `rufnameSnapshot` korrekt
- PDF exportieren → Download startet, PDF enthält beide Kanäle + Zuordnungen
- Kanal archivieren → verschwindet (Filter `aktiv`)
- Filter auf "alle inkl. archiviert" → archivierter Kanal erscheint mit Badge

- [ ] **Step 4: Funkprotokoll-Golden-Path**

- Tab wechseln `?tab=protokoll`
- Funkspruch eingeben: Absender "Florian 1", Empfänger "LST", Kanal (erster aktiver Kanal), Text "Anfahrt", Priorität Routine → erscheint im Bubble-View
- Dichte umschalten auf Kompakt → Darstellung wechselt, Scroll-Position bleibt
- Filter: nur Kanal X → nur dessen Einträge sichtbar
- Filter zurücksetzen

- [ ] **Step 5: Live-Updates (zwei Sessions)**

- In zweitem Browser-Tab (oder Incognito, gleicher User) gleicher Einsatz
- Tab A erstellt Funkspruch → erscheint in Tab B ohne Reload
- Tab A setzt Priorität `notfall` → Tab B zeigt `NotfallAlertToast` + Pulse

- [ ] **Step 6: Reconnect**

- Backend kurz stoppen (`pnpm --filter @bluelight-hub/backend dev` Prozess stoppen)
- Banner "Verbindung wird wiederhergestellt" erscheint
- Backend neu starten → nach wenigen Sekunden erneut connected, Daten werden invalidiert und neu geladen

- [ ] **Step 7: Edge-Cases manuell**

- Kanal mit referenziertem Funkspruch löschen → 422-Fehler-Toast mit Archivieren-Hinweis
- Doppelter Kanalname → 409-Fehler-Toast
- Funkspruch mit Ereigniszeitpunkt in Zukunft → Validation-Block

- [ ] **Step 8: Ergebnisse dokumentieren**

Befunde in PR-Beschreibung festhalten. Bei Fehler: zurück in den Plan, Task korrigieren.

---

### Task 41: Definition of Done Checks

**Files:** _(keine Änderungen)_

- [ ] **Step 1: Tests grün**

Run:
```bash
pnpm --filter @bluelight-hub/backend test 2>&1 | tail -10
cd packages/frontend && pnpm test -- --run --reporter=basic 2>&1 | tail -10
```

Exakte Test-Counts notieren — Backend + Frontend mit `/` (pre-existing Failures erlaubt wenn unrelated).

- [ ] **Step 2: Linting**

Run:
```bash
pnpm lint
```
Expected: keine Fehler (oxlint + oxfmt).

- [ ] **Step 3: Architektur-Checks**

Run:
```bash
pnpm --filter @bluelight-hub/backend check:arch
pnpm --filter @bluelight-hub/backend check:di:imports
```
Beide grün.

- [ ] **Step 4: generate-api verifizieren**

Run:
```bash
pnpm run generate-api
git status packages/shared/client
```
Expected: keine ungetrackten Änderungen (alle Updates bereits committed).

- [ ] **Step 5: Event-Registry-Check**

Alle neuen Events in 4 Stellen registriert:
- `infrastructure/outbox/event-serializer.ts`
- `infrastructure/outbox/event-deserializer.ts`
- `infrastructure/events/adapters/index.ts`
- `infrastructure/events/event-adapters.module.ts`

Run:
```bash
grep -l "FunkkanalErstellt\|FunkkanalZuordnungErstellt\|NotfallAlertRequested" packages/backend/src/infrastructure/outbox packages/backend/src/infrastructure/events -r
```
Expected: mindestens 4 Treffer.

- [ ] **Step 6: Migrations prüfen**

Run:
```bash
ls packages/backend/prisma/migrations | grep -E "add_etb_eintrag_kontext_and_zeitstempel|add_funkkanal_and_zuordnung"
```
Expected: beide Migrations vorhanden.

- [ ] **Step 7: PR-Beschreibung vorbereiten**

Enthält:
- Scope-Zusammenfassung
- Migration-Hinweis (zwei neue Migrations)
- Test-Counts Backend + Frontend (vorher/nachher)
- Browser-Test-Checkliste (Kanalplan, Protokoll, Live-Updates, Reconnect, Edge-Cases)
- Verweis auf Follow-ups #685, #686, #687

- [ ] **Step 8: Finaler Commit (falls noch etwas offen)**

Falls aus Verification kleinere Fixes nötig waren, als separate Commits. Sonst: Plan ist fertig.

---

## Zusammenfassung

- **41 Tasks** über 14 Phasen
- **Zwei Prisma-Migrations** mit klarem Namen und Backfill
- **Domain-first** (ETB-Refactor, Funkkanal-Aggregat) vor Infrastructure, Application, HTTP, Frontend
- **Event-Registry** an 4 Stellen (Task 12)
- **WebSocket-Integration** mit JWT-Auth und Reconnect-Backoff
- **Full-Stack-E2E** + DoD-Checks vor PR
- **4 ADRs** + arc42-Update
- **Follow-up-Issue #687** für Einsatzabschnitt-Nachzug
