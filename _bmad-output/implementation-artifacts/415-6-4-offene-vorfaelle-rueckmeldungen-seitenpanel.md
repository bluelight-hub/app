# Story 6.4: Offene Vorfälle + Rückmeldungen-Seitenpanel

Status: done

## Story

Als Sicherheitsbeauftragter,
möchte ich im Eigenschutz-Dashboard ein Seitenpanel sehen, das offene Vorfälle und ungelöste Rückmeldungen des aktuellen Einsatzes zusammenfasst,
damit nicht abschnittsspezifische Punkte sichtbar bleiben, ohne dass ich in die Vorfall- oder PSA-Detailseiten wechseln muss.

## Pivot-Anker

- **Dashboard baut auf 6.1 bis 6.3 auf.** `AmpelProjection`, `useEigenschutzAmpelStatus(einsatzId)`, `AmpelDashboard`, `AmpelCard`, `AmpelDashboardRow`, `AbschnittDetailPanel` und der persistente `cards|focus`-Store existieren bereits.
- **Vorfälle wiederverwenden.** Es gibt bereits `GET /api/einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle` und `useListVorfaelle(einsatzId, filter)`. Für 6.4 darf kein zweiter Vorfall-Listenpfad entstehen. "Offen" bedeutet im MVP: alle Vorfälle des Einsatzes, weil `EigenschutzVorfall` noch kein Status-/Abschlussfeld besitzt.
- **Rückmeldungen brauchen einen Detail-Read.** `AmpelProjection.ungeloesteRueckmeldungen` liefert nur Zähler, `useOffenePsaBekanntgaben` liefert nur Gruppen mit `lueckenCount`, aber keine einzelne Kurz-Meldung pro Einheit. Für AC3 ist daher ein neuer schmaler Backend-Read für ungelöste Ausrüstungs-Lücken nötig.
- **Backend zuerst, dann Generator, dann Hook, dann UI.** Neuer Rückmeldungs-Endpoint und DTOs kommen vor `pnpm run generate-api`; Frontend konsumiert danach ausschließlich den generierten Client via TanStack Query.
- **Kein Auflösen in 6.4.** Es gibt weiterhin kein `LueckeAufgeloestEvent` und keinen Resolve-Command. Das Panel zeigt und verlinkt offene Rückmeldungen; es markiert sie nicht als erledigt.
- **Keine Warn-Badge-Logik.** Warn-Markierungen für unbearbeitete Gefährdungen und nicht quittierte PSA sind Story 6.5.
- **Produkt-UI ohne Implementierungsbegriffe.** Keine sichtbaren Texte wie "AmpelProjection", "Read-Model", "Story 6.4", "Query" oder "Backend" rendern.

## Acceptance Criteria

1. **Seitenpanel ab `xl`**
   - `AmpelDashboard` rendert ab `xl` / 1280 px rechts ein Seitenpanel mit zwei Abschnitten: "Offene Vorfälle" und "Ungelöste Rückmeldungen".
   - Das Panel ist in Direction B und Direction C sichtbar, ohne den bestehenden View-Toggle zu verdrängen.
   - Unter `xl` ist das Panel kollabiert: ein kompakter Indikator zeigt die Gesamtanzahl offener Punkte; ein Klick öffnet ein modal/dialogbasiertes Panel.
   - Der kollabierte Zustand nutzt Headless-UI `Dialog` oder ein vorhandenes Drawer-/Dialog-Pattern, inklusive Fokusfalle, Esc-Close und Fokus-Rückkehr.

2. **Offene Vorfälle**
   - Das Panel nutzt den bestehenden Vorfall-Listenpfad (`useListVorfaelle(einsatzId, {})` oder einen dünnen Wrapper darauf).
   - Einträge sind nach `vorfallZeit DESC, id DESC` sortiert. Diese Sortierung kommt bereits aus dem Backend; Frontend darf nur defensiv stabilisieren, nicht fachlich neu sortieren.
   - Jeder Eintrag zeigt Titel/Kurztext aus `was`, Zeitstempel, Abschnitts-/Einheitsname, UK-Relevanz-Badge und Link "Öffnen".
   - Der Link führt zur bestehenden Vorfall-Detailroute, falls vorhanden; wenn die Detailroute nicht direkt erreichbar ist, führt er zur Vorfälle-Seite mit bestehendem fachlichem Pfad. Keine tote Schaltfläche.
   - Die Liste bleibt auf maximal 200 Einträge begrenzt wie der bestehende Vorfall-Endpoint; bei 200 Einträgen zeigt das Panel einen knappen Hinweis "Liste begrenzt".

3. **Ungelöste Rückmeldungen**
   - Neuer Backend-Read liefert einzelne Ausrüstungs-Lücken pro Einsatz aus `PsaProfilQuittung` mit `lueckeGemeldet=true`.
   - Response-Felder mindestens:
     - `propagationGroupId`
     - `einsatzId`
     - `einheitId`
     - `lueckeNotiz`
     - `gemeldetAm`
     - optional `begruendungAnriss` aus der zugehörigen PSA-Bekanntgabe, wenn mit vertretbarem Aufwand aus Outbox-Daten ableitbar
   - `gemeldetAm` nutzt im MVP `PsaProfilQuittung.quittiertAm`, weil es keine separate `luecke_gemeldet_am`-Spalte gibt. Die Story dokumentiert diese Semantik im DTO-Kommentar.
   - Sortierung: neueste Rückmeldungen zuerst, stabilisiert über `id ASC` oder ein deterministisches Äquivalent bei gleichem Timestamp.
   - Cap: maximal 200 Rückmeldungen pro Einsatz.
   - Jeder Panel-Eintrag zeigt Einheit, Kurz-Meldung, Zeitstempel und Link "Bearbeiten".
   - "Bearbeiten" führt zu einem vorhandenen PSA-/Bekanntgaben-Pfad oder öffnet den bestehenden Sender-Read-Only-Drawer, sofern dafür echte `propagationGroupId`-Daten vorliegen. Kein neuer Resolve-Drawer.

4. **API-Vertrag und Sicherheit**
   - Route-Vorschlag: `GET /api/einsaetze/:einsatzId/sicherheit/eigenschutz/psa-profile/rueckmeldungen/offen` oder ein ähnlich klarer, statischer Pfad im bestehenden `PsaProfilController`.
   - Die statische Route muss vor dynamischen `propagation-groups/:propagationGroupId/...`-Routen registriert sein, damit Express/Nest sie nicht falsch matcht.
   - Permission: `eigenschutz:psa:read`, analog `listOffeneBekanntgaben`.
   - Guard-Kette bleibt `JwtAuthGuard -> EinsatzScopeGuard -> PermissionsGuard`.
   - Swagger nutzt `@ApiWrappedResponse(OffeneRueckmeldungDto, { isArray: true, ... })`; keine Standard-`@ApiOkResponse`.
   - Query/Handler sitzt im Application-Layer; Controller greift nicht direkt auf Prisma zu.
   - Repository- oder Query-Code filtert immer nach `einsatzId`; keine Cross-Einsatz-Leaks.

5. **Live-Aktualisierung ≤ 1 s**
   - Vorfall-Meldungen aktualisieren Panel und Ampel über vorhandene Mutation-/Live-Invalidierungen oder eine gezielte Ergänzung.
   - `useEigenschutzLueckeGemeldetLive` invalidiert zusätzlich den neuen Rückmeldungs-Query-Key.
   - Nach WS-Reconnect werden Ampelstatus, offene PSA-Bekanntgaben und der neue Rückmeldungs-Query-Key invalidiert.
   - `staleTime` bleibt niedrig genug für Safety-Dashboard-Nutzung, z. B. 10-15 s, aber Live-Events sind der primäre Aktualisierungspfad.

6. **Empty, Loading und Error States**
   - Pro Abschnitt im Panel gibt es eigene Loading-/Error-/Empty-States.
   - Leerer Zustand pro Abschnitt: "Keine offenen Punkte" bzw. fachlich getrennt "Keine offenen Vorfälle" und "Keine ungelösten Rückmeldungen".
   - Fehler werden inline angezeigt, ohne globale Toasts.
   - Wenn eine der beiden Datenquellen fehlschlägt, bleibt die andere sichtbar.

7. **Responsive und visuelle Qualität**
   - Bei `xl` nutzt das Dashboard eine stabile Layoutstruktur, z. B. Hauptbereich `minmax(0,1fr)` plus Panel `20-24rem`.
   - Keine Card-in-Card-Struktur. Das Seitenpanel darf ein gerahmtes Arbeitspanel sein; Einträge sind einzelne wiederholte Items.
   - Lange Meldungen und Vorfalltexte werden sauber gekürzt, bleiben per `title` oder Detail-Link zugänglich und überlappen nicht bei 1280 px.
   - Mobile/Tablet-Dialog hat eine maximale Breite, volle Tastaturbedienung und keine verdeckten Aktionen.

8. **Accessibility**
   - Panel-Überschriften sind semantisch als Sections erkennbar.
   - Der kompakte Indikator unter `xl` hat ein verständliches `aria-label`, z. B. "3 offene Punkte im Eigenschutz".
   - Modal/Dialog nutzt `aria-labelledby`, sichtbaren Close-Button, Esc-Close und Fokus-Rückkehr.
   - Vorfall- und Rückmeldungs-Einträge kommunizieren Status nicht nur über Farbe; UK-Relevanz und Rückmeldung werden mit Text und Icon dargestellt.

9. **Out-of-Scope bleibt draußen**
   - Kein `LueckeAufgeloestEvent`, kein Resolve-Command, kein Statusfeld auf `EigenschutzVorfall`.
   - Keine Prisma-Migration.
   - Keine neue Permission.
   - Keine neue Ampel-Projection-Spalte.
   - Keine Warn-Badges für Gefährdungen oder nicht quittierte PSA.
   - Kein manuelles Editieren von `packages/shared/client/**`.
   - Keine produktiven Architektur- oder Story-Erklärtexte.

## Tasks / Subtasks

- [x] T1 Rückmeldungs-Read im Backend definieren (AC3, AC4).
  - [x] DTO `OffeneRueckmeldungDto` unter `packages/backend/src/application/eigenschutz/dto/` erstellen.
  - [x] Query `ListOffeneRueckmeldungenQuery(einsatzId)` unter `packages/backend/src/application/eigenschutz/queries/list-offene-rueckmeldungen/` anlegen.
  - [x] Handler liest `PsaProfilQuittung` mit `einsatzId` und `lueckeGemeldet=true`, sortiert neueste zuerst und capped bei 200.
  - [x] Optionalen `begruendungAnriss` nur aus vorhandenen Outbox-Daten ableiten, ohne PII-Klartext in Logs und ohne Outbox-Vollscan über andere Einsätze.
  - [x] Handler in `EigenschutzApplicationModule` registrieren.

- [x] T2 Controller-Endpoint ergänzen (AC4).
  - [x] Statische Route im `PsaProfilController` vor dynamischen `propagation-groups/:propagationGroupId/...`-Routen platzieren.
  - [x] `@RequiresPermission('eigenschutz:psa:read')`, bestehende Guards und `@ApiWrappedResponse` verwenden.
  - [x] Bad-/Infrastructure-Errors analog bestehender PSA-Query-Controller mappen.
  - [x] Controller-Specs für Happy Path, leere Liste, Permission-Metadaten, Route-Reihenfolge und Fehlerpfad ergänzen.

- [x] T3 API-Client regenerieren (AC4).
  - [x] `pnpm run generate-api` nach dem Backend-Vertrag ausführen.
  - [x] Generierte Änderungen unter `packages/shared/client/**` prüfen, aber nicht manuell editieren.
  - [x] Falls Generator-Namen vom erwarteten Hook-Namen abweichen, den tatsächlichen generierten Methodennamen im Hook verwenden.

- [x] T4 Frontend-Hook und Query-Key ergänzen (AC3, AC5, AC6).
  - [x] `EIGENSCHUTZ_QUERY_KEYS.offeneRueckmeldungen(einsatzId)` in `queries.ts` ergänzen.
  - [x] `useOffeneRueckmeldungen(einsatzId)` über den generierten Client erstellen.
  - [x] `retry: eigenschutzRetry`, `meta: { silentError: true }`, `enabled`-Guard und `staleTime` analog bestehenden Eigenschutz-Queries nutzen.
  - [x] `useEigenschutzLueckeGemeldetLive` invalidiert den neuen Key bei Payload und Reconnect.
  - [x] Hook-Specs für enabled=false, Client-Call, leere Liste, Fehler ohne Toast und Query-Key ergänzen.

- [x] T5 Seitenpanel-Komponenten bauen (AC1, AC2, AC3, AC6, AC7, AC8).
  - [x] Neue Komponente z. B. `EigenschutzOffenePunktePanel.tsx` unter `ui/organisms/` erstellen.
  - [x] Panel konsumiert `useListVorfaelle(einsatzId, {})`, `useOffeneRueckmeldungen(einsatzId)` und `useEinsatzEinheiten(einsatzId)` für Namen.
  - [x] Reine Presenter für Vorfall- und Rückmeldungs-Einträge schneiden, damit Tests ohne QueryClient möglich sind.
  - [x] UK-Badge mit Text+Icon rendern, nicht nur farbig.
  - [x] "Öffnen" und "Bearbeiten" nur auf echte bestehende Pfade oder echte Drawer-Aktionen legen.
  - [x] Loading/Error/Empty pro Abschnitt getrennt testen.

- [x] T6 `AmpelDashboard` integrieren (AC1, AC5, AC7).
  - [x] Bestehende Loading/Error/Empty-Logik unverändert lassen.
  - [x] In Direction B und Direction C Hauptbereich plus Panel arrangieren.
  - [x] Unter `xl` den kompakten Indikator und Dialog/Modal aktivieren.
  - [x] Keine View-Store-Erweiterung; Panel-Offenheit unter `xl` ist lokaler UI-State.
  - [x] `prefers-reduced-motion` respektieren; keine Slide-Animation erzwingen.

- [x] T7 Story-Scope validieren (AC1-AC9).
  - [x] Backend-Query- und Controller-Specs ausführen.
  - [x] Frontend-Hook- und Panel-Specs ausführen.
  - [x] `AmpelDashboard.spec.tsx` um Panel-Integration erweitern.
  - [x] Nach API-Änderung Frontend-TypeScript laufen lassen.
  - [x] Relevante Backend-/Frontend-Suites und Quality-Gates ausführen.

### Review Findings

- [x] [Review][Patch] Rückmeldungs-DTO generiert nullable Strings als `object | null` [`packages/backend/src/application/eigenschutz/dto/offene-rueckmeldung.dto.ts:17`]
- [x] [Review][Patch] `useMeldeLuecke` invalidiert den neuen Rückmeldungs-Key nicht [`packages/frontend/src/features/eigenschutz/api/queries.ts:1185`]
- [x] [Review][Patch] Vorfall-Meldungen invalidieren den Ampelstatus nicht innerhalb der AC5-Live-Frist [`packages/frontend/src/features/eigenschutz/api/use-report-vorfall.ts:63`]
- [x] [Review][Patch] Panel-Testmindestabdeckung aus der Story wird unterschritten [`packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/EigenschutzOffenePunktePanel.spec.tsx:76`]
- [x] [Review][Patch] Rückmeldungs-Cap bei 200 wird im Panel nicht sichtbar gemacht [`packages/frontend/src/features/eigenschutz/ui/organisms/EigenschutzOffenePunktePanel.tsx:120`]
- [x] [Review][Patch] Outbox-Begründungsanrisse können nach 1000 älteren PSA-Events still fehlen [`packages/backend/src/application/eigenschutz/queries/list-offene-rueckmeldungen/list-offene-rueckmeldungen.handler.ts:76`]
- [x] [Review][Patch] UK-Relevanz erfüllt AC8 nicht als Text-und-Icon-Signal [`packages/frontend/src/features/eigenschutz/ui/organisms/EigenschutzOffenePunktePanel.tsx:168`]
- [x] [Review][Patch] Media-Query-Hook registriert moderne und Legacy-Listener parallel [`packages/frontend/src/features/eigenschutz/hooks/use-lg-viewport.ts:29`]
- [x] [Review][Defer] Application-Query-Handler nutzt direkt `PrismaService` statt Read-Port [`packages/backend/src/application/eigenschutz/queries/list-offene-rueckmeldungen/list-offene-rueckmeldungen.handler.ts:5`] — deferred, pre-existing Architekturpattern im Eigenschutz-Query-Layer

## Dev Notes

### Projekt- und Architekturkontext

- Monorepo: `packages/frontend` React + Vite + Tauri, `packages/backend` NestJS + Prisma, `packages/shared/client` generiert.
- API-Workflow ist verbindlich: Backend Endpoint/DTO zuerst, dann `pnpm run generate-api`, dann Frontend-Hook über generierten Client, dann UI.
- Generated Client unter `packages/shared/client/**` niemals manuell ändern.
- Backend-DI-Regel: Bei `@Injectable()` Klassen keine `import type` für injizierte Klassen verwenden.
- Controller-Responses: projektspezifische `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse` nutzen; kein `@ApiOkResponse` für reguläre Client-Generator-Pfade.
- Layering: `modules -> infrastructure -> application -> domain`; Domain bleibt NestJS- und Prisma-frei.
- UI-Stack: Tailwind CSS + Headless UI, TanStack Query für Server-State, TanStack Store nur für Client/UI-State.
- Aktuelle relevante Versionen laut lokalen `package.json`: React 19.2.5, `@tanstack/react-query` 5.99.2, `@tanstack/react-router` 1.168.23, `@tanstack/react-store` 0.11.0, `@headlessui/react` 2.2.10, Tailwind 4.2.2, Vitest 4.1.4, NestJS 11.1.19, `@nestjs/cqrs` 11.0.3, Prisma 7.7.0, Jest 30.3.0, TypeScript 6.0.3.

### Relevante bestehende Code-Anker

- `packages/frontend/src/features/eigenschutz/ui/organisms/AmpelDashboard.tsx` ist der Integrationspunkt für Panel und kollabierten Indikator. Es sortiert Projektionen bereits nach Aufmerksamkeit und lädt `useEigenschutzAmpelStatus` + `useEinsatzEinheiten`.
- `packages/frontend/src/features/eigenschutz/ui/organisms/AmpelCard.tsx` und `AmpelDashboardRow.tsx` zeigen bereits Vorfall-/Rückmeldungszähler als Kennzahlen. Nicht duplizieren, wenn kleine Formatter extrahierbar sind.
- `packages/frontend/src/features/eigenschutz/ui/organisms/AbschnittDetailPanel.tsx` ist abschnittsspezifisch. Das 6.4-Panel ist einsatzweit und sollte nicht in das Detailpanel verlagert werden.
- `packages/frontend/src/features/eigenschutz/api/use-list-vorfaelle.ts` ist der bestehende Vorfall-Listen-Hook. Für offene Vorfälle im Panel wiederverwenden.
- `packages/frontend/src/features/eigenschutz/api/queries.ts` enthält `EIGENSCHUTZ_QUERY_KEYS`, `useOffenePsaBekanntgaben`, `useEigenschutzPsaQuittungen`, `useMeldeLuecke` und die gemeinsame Retry-/Silent-Error-Policy.
- `packages/frontend/src/features/eigenschutz/api/use-eigenschutz-luecke-gemeldet-live.ts` invalidiert bereits `psaQuittungen`, `offenePsaBekanntgaben`, `psaProfileByEinheit` und `ampelStatus`. Hier den neuen Rückmeldungs-Key ergänzen.
- `packages/frontend/src/features/eigenschutz/ui/pages/PsaProfilePage.tsx` enthält die bestehende "Offene PSA-Bekanntgaben"-Sektion und den `PsaProfilDetailDrawer`-Read-Only-Pfad. Für "Bearbeiten" keinen neuen Fake-Flow bauen.
- `packages/backend/src/modules/eigenschutz/controllers/psa-profil.controller.ts` enthält `meldeLuecke`, `listOffeneBekanntgaben` und die Route-Reihenfolge-Warnung für statische Routen vor dynamischen `propagationGroupId`-Routen.
- `packages/backend/src/application/eigenschutz/queries/list-offene-psa-bekanntgaben/` zeigt das bestehende Outbox-plus-Quittungs-Aggregationspattern und den `lueckenCount`-Sonderfall.
- `packages/backend/src/domain/eigenschutz/repositories/i-psa-profil-quittung.repository.ts` dokumentiert die Semantik von `lueckeGemeldet` und `lueckeNotiz`.
- `packages/backend/prisma/schema.prisma` hat `PsaProfilQuittung.lueckeGemeldet`, `lueckeNotiz`, `quittiertAm`, aber keine separate Lücken-Zeit und keinen Resolve-Status.
- `packages/backend/src/modules/eigenschutz/controllers/eigenschutz-vorfall.controller.ts` ist der bestehende Vorfall-Controller; `listVorfaelle` nutzt `eigenschutz:vorfall:read`, `ListVorfaelleQuery` und `toEigenschutzVorfallListItemDto`.

### Vorgänger-Story-Intelligenz

- Story 6.1 fixierte den echten DTO-/Prisma-Feldnamen `ungeloesteRueckmeldungen`. Keine Schreibweise `ungelesteRueckmeldungen` neu einführen.
- Story 6.1 entschied: `LueckeAufgeloestEvent` existiert im MVP nicht. Ungelöste Rückmeldungen bleiben offen, bis eine spätere Story den Auflösungs-Pfad modelliert.
- Story 6.2 lieferte Dashboard/Card-UI, StatusIndicator, defensive DTO-Normalisierung, Container-Query-Verhalten und Ampelstatus-Invalidierung.
- Story 6.3 lieferte Focus-View, Store-Hydration und Detailpanel. Review-Fixes betrafen race-sichere Store-Hydration, stale Storage-Writes, einsatzweite Sicherheitsregeln mit `einheitId: undefined`, leere PSA-Detaildaten und tastaturzugängliche Tooltips.
- Story 3.6 entschied: Lücke-Meldung ist atomar mit Quittung; `lueckeGemeldet=true` ist eine Antwort und zugleich organisatorische Restschuld.
- Story 3.6 WS-Frame enthält aus Datenschutzgründen nur `meldungLength`, nicht die Klartext-Meldung. Das Panel muss den Klartext per REST-Query laden.
- Story 3.4/3.6 `useOffenePsaBekanntgaben` bleibt gruppenorientiert. Für einzelne Rückmeldungen nicht versuchen, `lueckenCount` in Einzelmeldungen umzudeuten.

### Implementierungsleitplanken

- **Rückmeldungs-Query schlank halten.** Für das Panel reicht ein Listen-Read-Model. Kein Resolve-Status, keine Mutation, keine neue Domain-Entity.
- **Keine Outbox-Vollscans.** Wenn `begruendungAnriss` aus Outbox abgeleitet wird, immer per `payload.path(['einsatzId'])` und Cap filtern wie `ListOffenePsaBekanntgabenHandler`.
- **Zeitsemantik ehrlich machen.** Weil keine separate Lücken-Zeit existiert, `gemeldetAm = quittiertAm` nennen und im DTO-Kommentar erklären. Keine neue Migration in dieser Story.
- **Einheitennamen im Frontend mappen.** Der Rückmeldungs-Endpoint darf `einheitId` liefern; Namen können wie Dashboard/Vorfall-Panel über `useEinsatzEinheiten(einsatzId)` gemappt werden.
- **Fehler isolieren.** Vorfälle und Rückmeldungen sind zwei Datenquellen. Ein Fehler auf einer Seite darf die andere Liste nicht ausblenden.
- **Panel-Offenheit lokal halten.** Unter `xl` ist der Modal-/Dialog-State lokaler UI-State im Dashboard/Panel, nicht TanStack Store.
- **Keine neuen externen Libraries.** Headless UI und bestehende UI-Atoms reichen.

### Latest Tech Notes

- Keine neuen externen APIs oder Libraries nötig. Die Story nutzt die lokal installierten Versionen und bestehende Patterns aus dem Repo.
- TanStack Query 5 und Headless UI 2 sind bereits im Frontend vorhanden; neue Queries sollen die lokale `EIGENSCHUTZ_QUERY_KEYS`-Factory, `silentError`-Policy und vorhandene Dialog-/Drawer-Patterns nutzen.
- Prisma 7.7.0 ist lokal installiert; für den Rückmeldungs-Read reichen `findMany`, `where`, `select`, `orderBy` und `take` auf bestehendem Schema.

## Testanforderungen

Gezielte Tests zuerst:

```bash
pnpm --filter @bluelight-hub/backend test -- --testPathPatterns="list-offene-rueckmeldungen|psa-profil.controller" --no-coverage
pnpm --filter @bluelight-hub/frontend exec vitest run src/features/eigenschutz/api/__tests__/use-offene-rueckmeldungen.spec.tsx
pnpm --filter @bluelight-hub/frontend exec vitest run src/features/eigenschutz/api/__tests__/use-eigenschutz-luecke-gemeldet-live.spec.tsx
pnpm --filter @bluelight-hub/frontend exec vitest run src/features/eigenschutz/ui/organisms/__tests__/EigenschutzOffenePunktePanel.spec.tsx
pnpm --filter @bluelight-hub/frontend exec vitest run src/features/eigenschutz/ui/organisms/__tests__/AmpelDashboard.spec.tsx
```

Nach Backend-Vertragsänderung:

```bash
pnpm run generate-api
pnpm --filter @bluelight-hub/frontend exec tsc --skipLibCheck --noEmit
```

Relevante Suites und Gates:

```bash
pnpm --filter @bluelight-hub/backend test -- --testPathPatterns="eigenschutz|event-serializer|event-deserializer|architecture-rules" --no-coverage
pnpm --filter @bluelight-hub/frontend exec vitest run src/features/eigenschutz
pnpm lint
pnpm --filter @bluelight-hub/backend check:arch
pnpm --filter @bluelight-hub/backend check:di:imports
```

Mindestabdeckung im Story-Scope:

- Backend Query/Handler: mindestens 7 Tests für leere Liste, Happy Path, `einsatzId`-Filter, `lueckeGemeldet=false` ausgeschlossen, Sortierung, Cap 200 und InfrastructureError.
- Backend Controller: mindestens 5 Tests für Route/QueryBus, Permission-Metadaten, Swagger-Wrapper-DTO, Bad/Infrastructure-Error-Mapping und statische Route vor dynamischer Propagation-Route.
- Frontend Hook: mindestens 5 Tests für Query-Key, enabled-Guard, Client-Call, leere Liste und Silent-Error/Retry-Verhalten.
- Live-Hook: mindestens 3 zusätzliche Tests, dass `eigenschutz:luecke-gemeldet` und Reconnect den neuen Rückmeldungs-Key invalidieren und Event-Dedup erhalten bleibt.
- Panel: mindestens 14 Tests für `xl`-Panel, kollabierten Indikator, Dialog-Fokus/Close, Vorfall-Eintrag, Rückmeldungs-Eintrag, getrennte Loading/Error/Empty-States, Linkziele, Count-Summen, lange Texte, UK-Badge, a11y-Labels und "eine Datenquelle rot, andere sichtbar".
- Dashboard-Integration: mindestens 5 Tests für Direction B + Panel, Direction C + Panel, unter-`xl`-Kollaps, kein Layoutverlust bei Empty State und View-Toggle bleibt bedienbar.

## References

- `_bmad-output/planning-artifacts/epics.md:1652` - Story 6.4 Ziel und Acceptance Criteria.
- `_bmad-output/planning-artifacts/epics.md:92` - FR38/FR39: Ampelstatus und offene Vorfälle/Rückmeldungen.
- `_bmad-output/planning-artifacts/ux-design-specification.md:592` - Dashboard 1-Spalten-Layout und Seitenpanel ab breiten Viewports.
- `_bmad-output/planning-artifacts/ux-design-specification.md:1016` - Drawer-/Side-Panel-Pattern für Kontext-Erhalt.
- `_bmad-output/planning-artifacts/ux-design-specification.md:1085` - Desktop ≥ 1440 px mit Seitenpanel, 1024-1440 px kollabierbar.
- `_bmad-output/planning-artifacts/architecture.md:505` - `AmpelProjection` als materialisiertes Read-Model.
- `_bmad-output/planning-artifacts/architecture.md:749` - Dashboard-View-State bleibt User-global und auf `cards|focus` beschränkt.
- `_bmad-output/planning-artifacts/architecture.md:1876` - Frontend-Hook-/Feature-Struktur für Eigenschutz.
- `_bmad-output/implementation-artifacts/415-6-1-ampel-projektion-backend-read-model-event-handler.md` - AmpelProjection, echter Feldname `ungeloesteRueckmeldungen`, kein `LueckeAufgeloestEvent`.
- `_bmad-output/implementation-artifacts/415-6-2-ampeldashboard-ampelcard-direction-b-default.md` - Dashboard/Card-Unterbau und Seitenpanel-Out-of-Scope.
- `_bmad-output/implementation-artifacts/415-6-3-focus-view-direction-c-opt-in-view-toggle-persistent.md` - Focus-View-Unterbau und Review-Learnings.
- `packages/frontend/src/features/eigenschutz/ui/organisms/AmpelDashboard.tsx` - bestehende Dashboard-Orchestrierung.
- `packages/frontend/src/features/eigenschutz/api/use-list-vorfaelle.ts` - bestehender Vorfall-Listen-Hook.
- `packages/frontend/src/features/eigenschutz/api/queries.ts` - Query-Key-Factory, `useOffenePsaBekanntgaben`, Retry-/Silent-Error-Policy.
- `packages/frontend/src/features/eigenschutz/api/use-eigenschutz-luecke-gemeldet-live.ts` - WS-Invalidierung für Lückenmeldungen.
- `packages/backend/src/modules/eigenschutz/controllers/psa-profil.controller.ts` - bestehende PSA-/Lücken-Routen und Route-Reihenfolge-Hinweis.
- `packages/backend/prisma/schema.prisma` - `PsaProfilQuittung`-Schema mit `lueckeGemeldet`, `lueckeNotiz`, `quittiertAm`.

## Completion Notes

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- `rtk pnpm run generate-api` — grün außerhalb der Sandbox; `OffeneRueckmeldungDto.lueckeNotiz` und `begruendungAnriss` werden im generierten Client als nullable Strings typisiert.
- `rtk pnpm --filter @bluelight-hub/backend test -- --runTestsByPath src/application/eigenschutz/queries/list-offene-rueckmeldungen/__tests__/list-offene-rueckmeldungen.handler.spec.ts src/modules/eigenschutz/controllers/__tests__/psa-profil.controller.rueckmeldungen.spec.ts --no-coverage` — 14/14 Tests grün.
- `rtk pnpm --filter @bluelight-hub/frontend exec vitest run src/features/eigenschutz/api/__tests__/use-offene-rueckmeldungen.spec.tsx src/features/eigenschutz/api/__tests__/use-eigenschutz-luecke-gemeldet-live.spec.tsx src/features/eigenschutz/api/__tests__/use-melde-luecke.spec.tsx src/features/eigenschutz/api/__tests__/use-report-vorfall.spec.tsx src/features/eigenschutz/ui/organisms/__tests__/EigenschutzOffenePunktePanel.spec.tsx src/features/eigenschutz/ui/organisms/__tests__/AmpelDashboard.spec.tsx` — 57/57 Tests grün.
- `rtk pnpm --filter @bluelight-hub/frontend exec tsc --skipLibCheck --noEmit` — grün.
- `rtk pnpm --filter @bluelight-hub/frontend exec vitest run src/features/eigenschutz` — 868/868 Tests grün.
- `rtk pnpm --filter @bluelight-hub/backend test -- --testPathPatterns="eigenschutz|event-serializer|event-deserializer|architecture-rules" --no-coverage` — 166/166 Tests grün.
- `rtk pnpm --filter @bluelight-hub/backend check:arch` — grün mit 1 bestehender Funkkanal-Warnung.
- `rtk pnpm --filter @bluelight-hub/backend check:di:imports` — grün außerhalb der Sandbox, 2178 Dateien geprüft.
- `rtk pnpm lint:check` — 0 Errors und 36 Warnungen, aber Exit 1 durch Formatproblem in untracked `.air/worktree.json` außerhalb Story-Scope.

### Completion Notes List

- Neuer Backend-Read `GET /psa-profile/rueckmeldungen/offen` liefert offene Lücken-Rückmeldungen aus `PsaProfilQuittung`, cappt bei 200 und dokumentiert `gemeldetAm = quittiertAm`.
- API-Client wurde regeneriert; Frontend-Hook `useOffeneRueckmeldungen` nutzt den generierten `psaProfilControllerListOffeneRueckmeldungenVAlpha`-Client mit Silent-Error-/Retry-Policy.
- `useEigenschutzLueckeGemeldetLive` invalidiert den neuen Rückmeldungs-Key bei Payload und Reconnect.
- `EigenschutzOffenePunktePanel` zeigt offene Vorfälle über den bestehenden Vorfall-Listenpfad und ungelöste Rückmeldungen mit getrennten Loading/Error/Empty-States.
- `AmpelDashboard` integriert das Panel ab `xl` inline und darunter als lokalen Slide-in-Dialog, ohne den `cards|focus`-Store zu erweitern.
- BMAD-Code-Review mit drei Agents abgeschlossen: 8 Patch-Findings angewendet, 1 Architektur-Defer in `deferred-work.md` persistiert, 7 Findings dismissed.
- Review-Fixes ergänzt: nullable String-DTO-Vertrag, Rückmeldungs- und Ampel-Invalidierungen, Outbox-Gruppenfilter, Rückmeldungs-Cap-Hinweis, UK-Relevanz mit Text und Icon, Media-Query-Listener-Fallback und erweiterte Panel-/Hook-Tests.

### File List

- `_bmad-output/implementation-artifacts/415-6-4-offene-vorfaelle-rueckmeldungen-seitenpanel.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/backend/src/application/eigenschutz/dto/offene-rueckmeldung.dto.ts`
- `packages/backend/src/application/eigenschutz/eigenschutz-application.module.ts`
- `packages/backend/src/application/eigenschutz/queries/list-offene-rueckmeldungen/list-offene-rueckmeldungen.query.ts`
- `packages/backend/src/application/eigenschutz/queries/list-offene-rueckmeldungen/list-offene-rueckmeldungen.handler.ts`
- `packages/backend/src/application/eigenschutz/queries/list-offene-rueckmeldungen/__tests__/list-offene-rueckmeldungen.handler.spec.ts`
- `packages/backend/src/modules/eigenschutz/controllers/psa-profil.controller.ts`
- `packages/backend/src/modules/eigenschutz/controllers/__tests__/psa-profil.controller.rueckmeldungen.spec.ts`
- `packages/frontend/src/features/eigenschutz/api/queries.ts`
- `packages/frontend/src/features/eigenschutz/api/use-report-vorfall.ts`
- `packages/frontend/src/features/eigenschutz/api/__tests__/use-melde-luecke.spec.tsx`
- `packages/frontend/src/features/eigenschutz/api/__tests__/use-report-vorfall.spec.tsx`
- `packages/frontend/src/features/eigenschutz/api/use-eigenschutz-luecke-gemeldet-live.ts`
- `packages/frontend/src/features/eigenschutz/api/__tests__/use-offene-rueckmeldungen.spec.tsx`
- `packages/frontend/src/features/eigenschutz/api/__tests__/use-eigenschutz-luecke-gemeldet-live.spec.tsx`
- `packages/frontend/src/features/eigenschutz/hooks/use-lg-viewport.ts`
- `packages/frontend/src/features/eigenschutz/ui/organisms/AmpelDashboard.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/EigenschutzOffenePunktePanel.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/AmpelDashboard.spec.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/EigenschutzOffenePunktePanel.spec.tsx`
- `packages/shared/client/.openapi-generator/FILES`
- `packages/shared/client/apis/EigenschutzApi.ts`
- `packages/shared/client/models/OffeneRueckmeldungDto.ts`
- `packages/shared/client/models/PsaProfilControllerListOffeneRueckmeldungenVAlpha200Response.ts`
- `packages/shared/client/models/index.ts`
- `_bmad-output/implementation-artifacts/deferred-work.md`

## Change Log

- 2026-05-08: Story 6.4 umgesetzt und für Review bereitgestellt.
- 2026-05-08: BMAD-Code-Review-Fixes batch-applied und Story abgeschlossen.
