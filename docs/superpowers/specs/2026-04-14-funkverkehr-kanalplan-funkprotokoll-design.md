# Funkverkehr: Kanalplan & Funkprotokoll (Issue #407)

**Datum:** 2026-04-14
**Branch:** `407-funkverkehr-funkprotokoll-kanalverwaltung`
**Issue:** https://github.com/rubenvitt/bluelight-hub/issues/407
**Follow-ups:** #685 (ETB Mehrfach-Empfänger), #686 (Kanalplan-Templates)

## 1. Ziel & Scope

Das Feature "Funkverkehr" macht den BOS-Digitalfunk im Einsatz dokumentierbar und organisierbar. Zwei gleichberechtigte Tabs unter `/app/einsatz/$einsatzId/kommunikation/funk`:

- **Kanalplan** — Sprechgruppen/Kanäle pro Einsatz verwalten, Einheiten zuordnen, als PDF exportieren
- **Funkprotokoll** — Funksprüche chronologisch erfassen (chat-artig), live updaten, filtern

**Architektonische Kernentscheidung (Option α):** ETB wird zum **Protokoll-Backbone**. Funksprüche sind ETB-Einträge mit typisiertem `EintragKontext`. Das ermöglicht spätere Module (Befehle, Meldungen) als weitere Kontext-Varianten.

**Scope:** Full-Scope in einem PR auf `alpha`. Enthält ETB-Kontext-Refactor, Funkkanal-Aggregat, WebSocket-Live-Updates für ETB+Funk, PDF-Export, vollständige Frontend-UI.

**Nicht im Scope:** Kanalplan-Templates (→ #686), strukturierte Mehrfach-Empfänger (→ #685), weitere Protokoll-Module (Befehle/Meldungen).

## 2. Fachliche Modellierung

### 2.1 Begriffe

- **TMO** (Trunked Mode Operation) — Netzbetrieb über Basisstationen, identifiziert durch Sprechgruppe + GSSI
- **DMO** (Direct Mode Operation) — Direktbetrieb, identifiziert durch DMO-Kanalnummer
- **Analogfunk** — Legacy 4m/2m-Band, identifiziert durch Frequenz + Kanal
- **Sprechgruppe** — logischer Funkkanal im Digitalfunk
- **Rufname** — taktischer Funkrufname ("Florian Musterstadt 1/46")
- **Funkspruch** — einzelne Mitteilung, erfasst mit Zeitstempel, Absender, Empfänger, Inhalt, Priorität

### 2.2 Priorisierung

- **Routine** — Standardverkehr (Default)
- **Priorität** — dringende Lagemeldungen
- **Notfall** — akute Gefahr, automatische Eskalation zu ETB-Wichtigkeit `kritisch` + Broadcast-Alert an alle verbundenen Clients

## 3. Domain-Architektur

### 3.1 ETB-Aggregat (refactored)

```typescript
// domain/aggregates/etb/eintrag-kontext.ts

type EintragKontextType = 'standard' | 'funkspruch';

interface StandardKontext {
  readonly type: 'standard';
}

interface FunkKontext {
  readonly type: 'funkspruch';
  readonly kanalId: FunkkanalId;
  readonly funkPrioritaet: FunkPrioritaet; // 'routine' | 'prioritaet' | 'notfall'
}

type EintragKontext = StandardKontext | FunkKontext;
```

`EtbEintrag` erhält zusätzlich:

- `erfasstAm: Date` — immutable, `now()` bei Erstellung
- `ereignisZeitpunkt: Date` — user-editierbar, default `erfasstAm`
- `kontext: EintragKontext` — default `{ type: 'standard' }`

Domain-Invariante: bei `kontext.type === 'funkspruch' && funkPrioritaet === 'notfall'` wird `wichtigkeit` automatisch auf höchste Stufe gesetzt (im Aggregat-Konstruktor/Factory).

`kategorie` bleibt als **orthogonaler** Klassifizierer bestehen. Ein Funkspruch hat typischerweise `kategorie = KOMMUNIKATION`, aber die beiden Konzepte sind entkoppelt.

### 3.2 Funkkanal-Aggregat (neu)

```
domain/aggregates/funkkanal/
├── funkkanal.aggregate.ts
├── funkkanal.entity.ts
├── funkkanal-zuordnung.entity.ts
├── kanal-details.vo.ts
└── events/
    ├── funkkanal-erstellt.event.ts
    ├── funkkanal-geaendert.event.ts
    ├── funkkanal-archiviert.event.ts
    ├── funkkanal-reihenfolge-geaendert.event.ts
    ├── funkkanal-zuordnung-erstellt.event.ts
    └── funkkanal-zuordnung-entfernt.event.ts
```

`KanalDetails` (Value Object, discriminated union):

```typescript
type KanalDetails =
  | { type: 'tmo'; sprechgruppe: string; gssi?: string }
  | { type: 'dmo'; dmoKanal: string; repeater?: string }
  | { type: 'analog'; band: '4m' | '2m'; frequenz: string; kanalnummer?: string };
```

`Funkkanal`-Entity:

- `id`, `einsatzId`, `name` (unique pro Einsatz)
- `details: KanalDetails`
- `status: 'aktiv' | 'inaktiv' | 'archiviert'` (default `aktiv`)
- `zweck?: string` (Freitext "Nutzer/Zweck")
- `sortIndex: number` (manuelle Reihenfolge via Drag-and-Drop)
- `einsatzabschnittId?: string` (optional, nur wenn Schema existiert — sonst Feld weglassen)
- Audit-Felder: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

`FunkkanalZuordnung`-Entity (N:M mit Rolle):

- `id`, `kanalId`
- `rolle: 'primaer' | 'sekundaer' | 'zuhoeren'`
- Polymorphe Kraft-Referenz via drei nullable FKs (exakt eine gesetzt):
  - `fahrzeugId?` (FK zu `EinsatzFahrzeug`, ON DELETE CASCADE)
  - `personId?` (FK zu `EinsatzPerson`, ON DELETE CASCADE)
  - `einheitId?` (FK zu `EinsatzEinheit`, falls existent — ON DELETE CASCADE)
- `rufnameSnapshot: string` — Kopie zum Zeitpunkt der Zuordnung (stabil bei Umbenennung)
- Audit-Felder: `createdAt`, `createdBy`

### 3.3 Lifecycle

- `aktiv` — im Kanalplan sichtbar, im Composer auswählbar
- `inaktiv` — im Kanalplan sichtbar, im Composer **nicht** auswählbar, bereits erfasste Funksprüche referenzieren ihn weiterhin
- `archiviert` — default ausgeblendet im Kanalplan (Filter-Toggle macht sichtbar)
- Hard-Delete nur erlaubt, wenn keine Funksprüche den Kanal referenzieren. Sonst: klare Fehlermeldung, Empfehlung "Archivieren".

## 4. Persistenz (Prisma)

### 4.1 ETB-Eintrag-Erweiterung

```prisma
model EtbEintrag {
  // ... bestehende Felder ...

  erfasstAm         DateTime @default(now()) @map("erfasst_am")
  ereignisZeitpunkt DateTime                 @map("ereignis_zeitpunkt")

  kontextType       String   @default("standard") @map("kontext_type")
  kontextData       Json?    @map("kontext_data")

  @@index([einsatzId, ereignisZeitpunkt])
  @@index([einsatzId, kontextType])
}
```

**Migration-Strategie** (Name: `add_etb_eintrag_kontext_and_zeitstempel`):

1. Neue Spalten hinzufügen (nullable wo nötig)
2. Backfill: `UPDATE etb_eintrag SET ereignis_zeitpunkt = timestamp, erfasst_am = timestamp, kontext_type = 'standard'` (konkrete Spaltennamen werden in Implementierung verifiziert)
3. `ereignis_zeitpunkt` NOT NULL setzen
4. Bestehendes `timestamp`-Feld bleibt (vorerst) — wird in Folge-Issue entfernt, sobald kein Code mehr darauf zugreift

### 4.2 Funkkanal & Zuordnung (neu)

```prisma
model Funkkanal {
  id                 String   @id @default(cuid())
  einsatzId          String   @map("einsatz_id")
  einsatz            Einsatz  @relation(fields: [einsatzId], references: [id], onDelete: Cascade)

  name               String
  detailsType        String   @map("details_type")    // 'tmo' | 'dmo' | 'analog'
  detailsData        Json     @map("details_data")
  status             String   @default("aktiv")
  zweck              String?
  sortIndex          Int      @default(0) @map("sort_index")
  einsatzabschnittId String?  @map("einsatzabschnitt_id")

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
  // einheit: EinsatzEinheit? @relation(...)   — nur wenn Schema existiert

  rufnameSnapshot String           @map("rufname_snapshot")
  rolle           String           @default("primaer")

  createdAt       DateTime         @default(now()) @map("created_at")
  createdBy       String?          @map("created_by")

  @@unique([kanalId, fahrzeugId])
  @@unique([kanalId, personId])
  @@unique([kanalId, einheitId])
  @@index([kanalId])
  @@map("funkkanal_zuordnung")
}
```

**Check-Constraint** per raw SQL in Migration (Name: `add_funkkanal_and_zuordnung`):

```sql
ALTER TABLE funkkanal_zuordnung
ADD CONSTRAINT funkkanal_zuordnung_genau_eine_kraft
CHECK (
  (fahrzeug_id IS NOT NULL)::int +
  (person_id IS NOT NULL)::int +
  (einheit_id IS NOT NULL)::int = 1
);
```

## 5. Backend Application Layer

### 5.1 ETB-Commands

Erweitert (nicht neu):

- `CreateEtbEintrag` nimmt optional `kontext: EintragKontext` + `ereignisZeitpunkt` entgegen
- `CreateEtbKorrekturEintrag` — unverändert, trägt aber Kontext
- Bestehende Commands bekommen Default `kontext = { type: 'standard' }`

### 5.2 Funkkanal-Commands (neu)

```
application/funkkanal/commands/
├── create-funkkanal/
├── update-funkkanal/
├── archive-funkkanal/
├── delete-funkkanal/              (nur wenn keine Referenzen, sonst Result.failure)
├── reorder-funkkanaele/           (payload: [{ id, sortIndex }])
├── zuordne-kraft-zu-kanal/
├── aendere-zuordnung-rolle/
└── entferne-zuordnung/
```

Alle erben `TransactionalCommandHandler`, geben `Result<T>`.

### 5.3 Funkkanal-Queries (neu)

```
application/funkkanal/queries/
├── get-kanalplan/                 (alle Kanäle eines Einsatzes inkl. Zuordnungen)
├── get-funkkanal-by-id/
└── get-rufnamen-vorschlaege/      (alle EinsatzFahrzeuge + EinsatzPersonen mit Rufnamen)
```

### 5.4 Event-Handler: Notfall-Alert

`NotfallFunkspruchAlertHandler` (Application Layer) hört auf `EtbEintragErstellt`:

- Wenn `kontext.type === 'funkspruch' && funkPrioritaet === 'notfall'` → publisht `NotfallAlertRequested`-Event
- Der WebSocket-Gateway-Adapter (Infrastructure) fängt es via `@OnEvent` und broadcastet an alle Clients des Einsatz-Rooms

## 6. Infrastructure Layer

### 6.1 Persistenz

```
infrastructure/funkkanal/
├── prisma-funkkanal.repository.ts
├── prisma-funkkanal.mapper.ts
└── funkkanal-infrastructure.module.ts

infrastructure/etb/
└── prisma-etb.mapper.ts           // erweitert für Kontext + ereignisZeitpunkt
```

Mapper serialisiert/deserialisiert `KanalDetails` und `EintragKontext` zu/von JSONB via Discriminator.

### 6.2 PDF-Export

```
infrastructure/export/
└── kanalplan-pdf.service.ts       // eigener Service, nutzt PDFKit
```

Separat vom bestehenden `PdfExportService` (Erinnerungen) — Layout und Inhalt sind spezifisch.

### 6.3 WebSocket-Gateway (neu)

```
infrastructure/websocket/
├── einsatz-events.gateway.ts
├── einsatz-event-publisher.ts     // @OnEvent-Adapter
└── events/
    └── einsatz-event.types.ts
```

**Namespace:** `/ws/einsatz-events`
**Connect-Auth:** JWT-Verifikation beim Handshake
**Room-Pattern:** `einsatz:${einsatzId}` — Client joint Room nach Auth-Check (Einsatz-Zugehörigkeit)
**Broadcast-Events (initial):**

- `etb:eintrag-erstellt`
- `etb:eintrag-korrigiert`
- `funkkanal:erstellt` / `geaendert` / `archiviert` / `reihenfolge-geaendert`
- `funkkanal:zuordnung-erstellt` / `zuordnung-entfernt`
- `funk:notfall-alert`

**Reconnect:** Client-seitig Exponential-Backoff (1s → 2s → 5s → 10s → max 30s). Bei Reconnect invalidate des Query-Cache, um verpasste Events nachzuziehen.

### 6.4 Event-Registry

Alle neuen Domain-Events werden an vier Stellen registriert (Projekt-Konvention):

- Serializer (pro Event)
- `event-deserializer.ts` (zentral)
- Adapters-Modul
- Adapters-Index

Betroffene neue Events:

- `FunkkanalErstellt`, `FunkkanalGeaendert`, `FunkkanalArchiviert`, `FunkkanalReihenfolgeGeaendert`
- `FunkkanalZuordnungErstellt`, `FunkkanalZuordnungEntfernt`
- `NotfallAlertRequested`

### 6.5 DI-Tokens

Neuer Namespace `FUNKKANAL_TOKENS` in `infrastructure/di-tokens.ts`:

- `FUNKKANAL_REPOSITORY`
- `FUNKKANAL_MAPPER`
- `KANALPLAN_PDF_SERVICE`
- `EINSATZ_EVENT_PUBLISHER`

## 7. HTTP-Schicht (Controller + DTOs)

### 7.1 Routen

**Projekt-Konvention:** Alle einsatz-bezogenen Routen unter `/einsatz/:einsatzId/...`.

```
// Kanalplan & Kanäle
GET    /einsatz/:einsatzId/funkkanaele
POST   /einsatz/:einsatzId/funkkanaele
GET    /einsatz/:einsatzId/funkkanaele/:kanalId
PATCH  /einsatz/:einsatzId/funkkanaele/:kanalId
DELETE /einsatz/:einsatzId/funkkanaele/:kanalId
POST   /einsatz/:einsatzId/funkkanaele/reorder

// Zuordnungen
POST   /einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen
PATCH  /einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen/:zuordnungId
DELETE /einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen/:zuordnungId

// Export
GET    /einsatz/:einsatzId/kanalplan/export.pdf

// Rufnamen-Vorschläge
GET    /einsatz/:einsatzId/rufname-vorschlaege

// ETB bleibt unter /einsatz/:einsatzId/etb/... (bestehend, wird erweitert für Kontext)

// WebSocket
WS     /ws/einsatz-events?einsatzId=...
```

### 7.2 DTOs

Discriminated Unions via `@ApiExtraModels` + `@ApiProperty({ oneOf: [...], discriminator })`:

- `KanalDetailsDto` — oneOf `TmoDetailsDto | DmoDetailsDto | AnalogDetailsDto`
- `EintragKontextDto` — oneOf `StandardKontextDto | FunkKontextDto`

Alle Responses via `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse`. Niemals Standard-Swagger-Decorators.

### 7.3 Auth

Alle Endpoints hinter bestehenden Auth-Guards. WebSocket verifiziert JWT beim Connect und Einsatz-Zugehörigkeit beim Room-Join.

## 8. Frontend-Architektur

### 8.1 Feature-Struktur

```
packages/frontend/src/features/funkverkehr/
├── api/
│   ├── use-kanalplan.ts
│   ├── use-create-funkkanal.ts
│   ├── use-update-funkkanal.ts
│   ├── use-archive-funkkanal.ts
│   ├── use-delete-funkkanal.ts
│   ├── use-reorder-funkkanaele.ts
│   ├── use-create-zuordnung.ts
│   ├── use-update-zuordnung-rolle.ts
│   ├── use-remove-zuordnung.ts
│   ├── use-rufname-vorschlaege.ts
│   ├── use-export-kanalplan-pdf.ts
│   └── use-einsatz-events.ts
├── hooks/
│   ├── use-funkprotokoll-eintraege.ts   (wrapt ETB-Query mit kontextType='funkspruch'-Filter)
│   ├── use-create-funkspruch.ts         (wrapt ETB-Create mit FunkKontext)
│   └── use-dichte-mode.ts
├── stores/
│   └── funkprotokoll-filter.store.ts
├── ui/
│   ├── atoms/
│   │   ├── FunkPrioritaetBadge.atom.tsx
│   │   └── KanalStatusBadge.atom.tsx
│   ├── molecules/
│   │   ├── FunkKontextBadge.molecule.tsx
│   │   ├── KanalDetailsForm.molecule.tsx
│   │   ├── FunkspruchBubble.molecule.tsx
│   │   ├── FunkspruchCompactRow.molecule.tsx
│   │   ├── NotfallAlertToast.molecule.tsx
│   │   └── KanalplanFilterBar.molecule.tsx
│   ├── organisms/
│   │   ├── KanalplanTable.organism.tsx
│   │   ├── KanalEditDrawer.organism.tsx
│   │   ├── ZuordnungsManager.organism.tsx
│   │   ├── FunkprotokollView.organism.tsx
│   │   ├── FunkprotokollFilterSidebar.organism.tsx
│   │   ├── FunkspruchComposer.organism.tsx
│   │   └── FunkverkehrLayout.organism.tsx
│   └── pages/
│       └── FunkverkehrPage.tsx
└── utils/
    ├── kanal-details-helpers.ts
    └── priority-color.ts
```

### 8.2 Route

```
packages/frontend/src/routes/app/einsatz/$einsatzId/kommunikation/funk.tsx
```

Ersetzt `<ComingSoon>` durch `<FunkverkehrPage>`. `validateSearch` für `?tab=kanalplan|protokoll` (default: `kanalplan`).

### 8.3 Tab 1 — Kanalplan

- `KanalplanTable` (DataTable-Basis + Drag-Handle + Inline-Edit-Spalten)
  - Spalten: Drag-Handle, Name, Typ-Badge, Kennung (typabhängig formatiert), Zuordnungen (Chip-Liste), Status-Badge, Aktionen
  - Drag-and-Drop sortiert manuell, `sortIndex` wird via `useReorderFunkkanaele` persistiert
- "Kanal hinzufügen" öffnet `KanalEditDrawer` (`Dialog.SlideIn`)
  - `KanalDetailsForm` rendert typabhängig via Radio-Group + kondensiert
- "Kräfte zuordnen" pro Kanal → `ZuordnungsManager` Modal
  - Multi-Combobox mit Rufnamen-Vorschlägen (Gruppen: Fahrzeuge / Personen / Einheiten)
  - Rolle-Auswahl pro Zuordnung (Segment-Control)
- "PDF exportieren" Button oben rechts → `useExportKanalplanPdf` → Blob-Download via Browser/Tauri-FileDialog
- Status-Filter: `aktiv` (default) | `alle inkl. inaktiv/archiviert`

### 8.4 Tab 2 — Funkprotokoll

Layout: Filter-Sidebar links, Chat-View zentral, Sticky-Bottom-Composer.

**FunkprotokollFilterSidebar:**
- Kanal (Multi-Select Combobox)
- Priorität (Checkboxen: Routine, Priorität, Notfall)
- Zeitraum (von/bis DateTimePicker)
- Absender (Combobox mit Vorschlägen + Freitext)
- Volltextsuche (Inhalt)
- "Filter zurücksetzen"

**FunkprotokollView:**
- Virtualisiert via `useVirtualizer` (neueste unten, Auto-Scroll)
- Dichte-Modus-Toggle oben rechts: `Bubbles` | `Kompakt` — persistiert pro Einsatz in Client-Store
  - `Bubbles`: `FunkspruchBubble` mit Rufname, Empfänger, Inhalt, Zeit, Priorität-Akzent
  - `Kompakt`: `FunkspruchCompactRow` einzeilig: `[HH:mm:ss] KANAL ABSENDER → EMPFAENGER: "Inhalt"`
- "Pause Auto-Scroll"-Indikator erscheint, wenn User hochgescrollt hat; neuer Eintrag zeigt Badge "X neue Nachrichten"

**FunkspruchComposer (Sticky-Bottom):**
- Combobox Absender — Rufnamen-Vorschläge (aus `useRufnamenVorschlaege`), `allowCustomValue`
- Combobox Empfänger — optional, `allowCustomValue`
- Dropdown Kanal — nur aktive Kanäle des Einsatzes
- Textarea Inhalt
- Segmented-Control Priorität (`Routine | Priorität | Notfall`, default Routine)
- Ereigniszeitpunkt-Picker — default `now()`, änderbar
- Submit (Cmd/Ctrl+Enter, Shift+Enter = Newline)

### 8.5 Live-Updates

`useEinsatzEvents(einsatzId)` etabliert WebSocket beim Mount:

- `etb:eintrag-erstellt` / `etb:eintrag-korrigiert` → invalidate `['funkprotokoll-eintraege', einsatzId]` + `['etb-eintraege', einsatzId]`
- `funkkanal:*` → invalidate `['kanalplan', einsatzId]`
- `funk:notfall-alert` → Dispatch via `NotfallAlertToast` (Toast + Pulse-Badge am Funkverkehr-Tab)

**Reconnect:** Exponential-Backoff, dezenter Status-Banner "Verbindung wird wiederhergestellt". Bei Reconnect full invalidate aller Einsatz-Queries.

### 8.6 Priorität-Farben (WCAG)

Farbe ist nie alleiniger Indikator — immer Icon + Farbe + Text.

- **Routine**: neutral (`text-slate-600`, keine Akzentfarbe)
- **Priorität**: Warn-Orange (`text-amber-600`, gelber Linken-Border, Warning-Icon)
- **Notfall**: Rot + Siren-Icon + Pulse-Animation (`text-red-700`, roter Linken-Border)

### 8.7 Client-State

- `funkprotokoll-filter.store` (`@tanstack/react-store`) — Filter-Zustand, pro Einsatz keyed
- Dichte-Modus: im selben Store, keyed pro Einsatz

## 9. Error Handling

### 9.1 Backend

- Domain/Application: `Result<T>`-Pattern, keine Exceptions für erwartbare Fehler
- Controller mappen `Result.failure` → korrekte HTTP-Status:
  - `400` Validierungsfehler
  - `404` Not-Found
  - `409` Konflikt (z.B. Zuordnung existiert bereits, Kanal-Name doppelt)
  - `422` Fachliche Regel verletzt (z.B. Hard-Delete bei referenzierten Kanal)
- WebSocket: Connection-Fehler geloggt, Client wird disconnected, reconnect im Client

### 9.2 Frontend

- TanStack Query Fehler → Error-Toast (bestehender Mechanismus)
- Mutation-Rollback bei optimistic Updates (wie ETB: `onMutate` cancel → snapshot → `onError` rollback → `onSettled` invalidate)
- PDF-Export-Fehler → Toast "PDF-Export fehlgeschlagen"
- WebSocket-Disconnect → dezenter Banner

### 9.3 Edge Cases

- Kanal mit referenzierten Funksprüchen löschen → blockiert, Vorschlag "Archivieren"
- Zeitstempel in Zukunft → Validierung blockiert
- Gleicher Rufname-Snapshot auf anderem Kanal/Rolle zuordnen → erlaubt
- Einsatz-Teilnehmer verliert Zugriff während WebSocket-Session → Server trennt Socket

## 10. Tests

### 10.1 Backend

- Domain Unit: `EtbEintrag` mit allen Kontext-Varianten, `Funkkanal`-Aggregat, `KanalDetails`-VO (TMO/DMO/Analog)
- Application Unit: alle Commands/Queries mit Mock-Repos; `NotfallFunkspruchAlertHandler`
- Infrastructure: Mapper-Tests (JSONB Roundtrip), Repository-Tests gegen Test-DB
- Module/E2E: alle HTTP-Endpoints inkl. PDF-Content-Type; WebSocket-Gateway (Connect, Room-Join, Broadcast)
- Migration: Backfill-Test für bestehende ETB-Einträge

### 10.2 Frontend

- Atoms/Molecules: Snapshot + Interaction
- Organisms: Integration mit Mock-API-Client
- Pages: Routing + Tab-Switch via URL-Param
- Hooks: `useEinsatzEvents` mit WebSocket-Mock, `useFunkprotokollEintraege` mit Filter-Permutationen
- Store: `funkprotokoll-filter.store` inkl. Reset und pro-Einsatz-Keying

### 10.3 Pre-Existing Failures

Laut Memory 31 bestehende Test-Failures. Im Rahmen dieses PRs werden alle ETB-tangierenden Failures gefixt (Kontext-Refactor berührt sie ohnehin). Andere unrelated Failures bleiben separat — nur fixen wenn sie den Build blockieren.

## 11. Architektur-Dokumentation

Vier ADRs in `docs/adr/`:

1. **ETB-Eintrag-Kontext als Discriminated Union** — Begründung, Persistenz-Entscheidung (Discriminator + JSONB), Migration-Strategie, Erweiterbarkeit für Befehle/Meldungen
2. **WebSocket-Event-Bus für einsatz-gebundene Events** — Namespace, Room-Pattern, Broadcast-Semantik, Reconnect-Strategie
3. **Funkkanal als eigenes Aggregat** — Abgrenzung zu ETB, Lifecycle, typisierte Details via VO
4. **Polymorphe Zuordnung via drei nullable FKs + Check-Constraint** — Gegenüberstellung zu `kraftType + kraftId`, FK-Integrität als Ausschlag

Aktualisierung `docs/architecture/` (arc42) um Funkkanal-Aggregat und WebSocket-Gateway.

## 12. Definition of Done

- Volle Test-Suite grün (Backend + Frontend), exakte Test-Counts im PR
- `pnpm lint` grün (oxlint + oxfmt)
- `pnpm --filter @bluelight-hub/backend check:arch` grün (keine Circular Deps)
- `pnpm --filter @bluelight-hub/backend check:di:imports` grün
- `pnpm run generate-api` ausgeführt, Client committed
- Frontend im Browser getestet (Golden Path + Edge Cases beide Tabs, Live-Updates durch zwei Sessions)
- Alle neuen Events an 4 Stellen registriert (Serializer, Deserializer, Adapters-Modul, Adapters-Index)
- 4 ADRs geschrieben, `docs/architecture/` aktualisiert
- Zwei Prisma-Migrationen mit `--name`, up + down getestet
- PR-Beschreibung enthält: Scope, Migration-Hinweis, Test-Counts, Browser-Test-Checkliste

## 13. Offene Punkte (im Entwicklungsverlauf zu klären)

- Existiert im Projekt `EinsatzEinheit` als eigenes Modell? Falls nein → `einheitId` im `FunkkanalZuordnung` entfällt
- Existiert `Einsatzabschnitt`? Falls ja → optionale FK `einsatzabschnittId` am `Funkkanal`; sonst nur Freitext `zweck`
- Konkreter Feldname des bisherigen ETB-Zeitstempels (`timestamp`? `eingetragenAm`?) — wird beim Migration-Schreiben verifiziert
- Bestehender ETB-Wichtigkeits-Mechanismus — Name/Skala wird geprüft, Notfall-Eskalation entsprechend implementiert
