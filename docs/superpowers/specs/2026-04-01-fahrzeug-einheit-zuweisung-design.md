# Fahrzeug→Einheit Zuweisung + Einheiten-Tests + Registry-Fix

**Issue:** #411 (Taktische Einheitenverwaltung)
**Follow-up:** #607 (Erweiterte UI + Dashboard-Integration)
**Datum:** 2026-04-01

## Ziel

Drei offene Punkte aus Issue #411 abschließen:

1. Fahrzeuge können direkt Einheiten/Abschnitten zugewiesen werden
2. Fehlende Backend- und Frontend-Tests für das Einheiten-Feature nachrüsten
3. Workspace-Registry Widerspruch auflösen

## Design-Entscheidungen

- **Fahrzeug→Einheit**: Direkter FK `einheitId` auf `EinsatzFahrzeug` (nullable, OnDelete: SetNull)
- **Implizite Personalzugehörigkeit**: Besatzung eines Fahrzeugs gehört implizit zur selben Einheit — wird nur UI-seitig aufgelöst, keine automatische DB-Synchronisation
- **Registry**: Test auf `visible` anpassen, da das Feature fertig ist

---

## 1. Datenbank

### Schema-Änderung: `EinsatzFahrzeug`

Neues Feld:

```prisma
einheitId  String?  @map("einheit_id")
```

Relation zu `EinsatzEinheit` mit `onDelete: SetNull` (Einheit gelöscht → Fahrzeug bleibt, verliert Zuweisung).

Index: `@@index([einheitId])` und Composite `@@index([einsatzId, einheitId])`.

Inverse Relation auf `EinsatzEinheit`: `fahrzeuge EinsatzFahrzeug[]`.

### Migration

Name: `add_fahrzeug_einheit_relation`

---

## 2. Backend

### Domain Layer

**`einsatz-fahrzeug.aggregate.ts`** — Neue Methode:

```typescript
assignToEinheit(einheitId: string | null, updatedBy: string): void
```

- Idempotent: wenn bereits zugewiesen, kein Event
- Emittiert `FahrzeugEinheitZugewiesenEvent` mit `{ fahrzeugId, einheitId, previousEinheitId }`

**Neues Domain Event**: `FahrzeugEinheitZugewiesenEvent`
- Event-Name: `einsatz_fahrzeug.einheit_zugewiesen`
- Registrierung in `event-deserializer.ts`

### Application Layer

**Neuer Command**: `AssignFahrzeugToEinheitCommand`

```typescript
{ einsatzId: string; fahrzeugId: string; einheitId: string | null; userId: string }
```

Handler:
- Lädt Fahrzeug-Aggregate
- Optional: Validiert dass `einheitId` zum selben Einsatz gehört
- Ruft `assignToEinheit()` auf
- Speichert via TransactionalCommandHandler + Outbox

**Neuer ETB-Event-Handler**: `FahrzeugEinheitZugewiesenEtbHandler`
- Erstellt ETB-Eintrag: "Fahrzeug [funkrufname] wurde Einheit [name] zugewiesen" / "...von Einheit entfernt"

**Query-Erweiterung**: `GetEinheitDetailsHandler`
- Fahrzeuge der Einheit mit zurückgeben (inkl. Besatzung als implizite Mitglieder)
- Neues Feld im Response-DTO: `fahrzeuge: EinsatzFahrzeugDto[]`

### Controller Layer

**`einsatz-fahrzeuge.controller.ts`** — Neuer Endpoint:

```
PATCH /einsaetze/:einsatzId/fahrzeuge/:id/einheit
Body: { einheitId: string | null }
```

Throttle: `ADMIN_MUTATION_RATE_LIMIT`

### DTOs

- `AssignFahrzeugToEinheitDto`: `{ einheitId: string | null }`
- `EinsatzFahrzeugDto` erweitern um `einheitId: string | null`
- `EinheitDetailsDto` erweitern um `fahrzeuge: EinsatzFahrzeugDto[]`

---

## 3. Frontend

### API-Client

Nach Backend-Änderungen: `pnpm run generate-api`

### Neuer Hook

`useAssignFahrzeugToEinheit` — Mutation-Hook für `PATCH /:id/einheit`
- Invalidiert: `KRAEFTE_QUERY_KEYS.fahrzeuge` + `KRAEFTE_QUERY_KEYS.einheiten` + `KRAEFTE_QUERY_KEYS.einheitDetails`

### Fahrzeuge-Seite (`fahrzeuge.tsx`)

`EinheitZuweisungsDropdown` pro Fahrzeug-Card:
- Dropdown mit allen Einheiten des Einsatzes (aus `useEinsatzEinheiten`)
- "Keine Einheit" Option zum Entfernen
- Folgt dem Pattern von `FahrzeugZuweisungsDropdown` auf der Personal-Seite

### Einheiten-Baum (`EinheitCard`)

Erweitern um Fahrzeug-Anzeige:
- Unterhalb der zugewiesenen Personen: zugewiesene Fahrzeuge anzeigen
- Pro Fahrzeug: Funkrufname + FMS-Status-Badge
- Besatzung der Fahrzeuge als implizite Mitglieder anzeigen (visuell abgesetzt, z.B. mit Fahrzeug-Icon als Prefix)
- Ist-Stärke Berechnung: explizit zugewiesene Personen + implizite Besatzung (dedupliziert)

---

## 4. Registry-Fix

**Datei**: `einsatz-workspace.registry.ts`
- Keine Änderung nötig — Einheiten-Seite ist bereits als `visible` registriert

**Test**: `einsatz-workspace.registry.spec.ts`
- Zeile 61-63: `disabled` → `visible` anpassen

---

## 5. Tests

### Backend-Tests (neue spec-Dateien)

**Command-Handler** (je Handler eine spec-Datei):
- `CreateEinheitHandler` — Happy Path, Validation (Name zu lang, doppelter Name), Outbox-Event
- `UpdateEinheitHandler` — Partial Update, Not Found
- `ChangeEinheitStatusHandler` — Status-Übergang, Idempotenz
- `SetEinheitenfuehrerHandler` — Zuweisung, Entfernung (null)
- `AssignPersonToEinheitHandler` — Happy Path, Duplikat-Check
- `RemovePersonFromEinheitHandler` — Happy Path, Not Found
- `MoveEinheitHandler` — Hierarchie-Move, Zirkel-Check
- `DeleteEinheitHandler` — Happy Path, Cascade
- `AssignFahrzeugToEinheitHandler` (NEU) — Happy Path, Idempotenz, Einsatz-Validierung

**Query-Handler**:
- `GetEinsatzEinheitenHandler` — Liste, leerer Einsatz
- `GetEinheitDetailsHandler` — Inkl. Fahrzeuge + Besatzung

**Controller**:
- Alle Endpoints testen (Auth, Validation, Response-Format)

**ETB-Event-Handler**:
- `EinheitErstelltEtbHandler`, `EinheitStatusGeaendertEtbHandler`
- `PersonZuEinheitZugewiesenEtbHandler`, `PersonVonEinheitEntferntEtbHandler`
- `FahrzeugEinheitZugewiesenEtbHandler` (NEU)

### Frontend-Tests

- `TaktischeEinheitenPage` — Rendering, Loading State, CRUD-Dialoge
- `EinheitenBaum` — Baum-Aufbau, Collapse-Toggle
- `EinheitCard` — Status-Badge, Actions, Fahrzeug-Anzeige
- `EinheitZuweisungsDropdown` (NEU) — Auswahl, Entfernung

---

## Nicht im Scope

- Bidirektionale Zuweisung von der Einheiten-Seite aus (→ #607)
- Dashboard-Integration mit Fahrzeugen pro Einheit (→ #607)
- Einsatzabschnitte als eigenständiges Konzept (→ #34, #90)
