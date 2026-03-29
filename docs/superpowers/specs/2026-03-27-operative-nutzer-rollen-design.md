# Operative Nutzer & Rollen — Design Spec

**Issue:** #98
**Datum:** 2026-03-27
**Status:** Approved

## Kontext

Bluelight Hub benötigt ein Rollensystem für operative Benutzer (Einsatzkräfte). Dieses Feature ist unabhängig von:
- **Issue #28** (Admin-Rollen für App-Verwaltung) — teilweise implementiert
- **Issue #59** (Funktionsbearbeiter pro Einsatz) — einsatzspezifische taktische Rollen, baut auf #98 auf

## Entscheidungen

| Entscheidung | Ergebnis |
|---|---|
| Verhältnis App-Rolle / Operative Rolle | Zwei getrennte Dimensionen — jeder User hat beides |
| Rollenmodell | 3 Rollen: Führungskraft, Einsatzkraft, Externe |
| Stammperson-Konzept | Getrennt aber verknüpft (User ↔ Person 1:1) |
| Gruppenmanagement | Out of Scope (YAGNI) |
| User-Onboarding | Bestehender Unified-Login, Default-Rolle = Externe |
| Rollenverwaltung | Nur Admins (ADMIN/SUPER_ADMIN) |
| Stammperson-Zuweisung | Nur Admins |
| Beitritts-Flow | EK fragt an, FK im Einsatz genehmigt/lehnt ab |
| Technischer Ansatz | Minimale Erweiterung: Enum-Feld auf User-Modell |

## Rollenmodell

| | Führungskraft (FK) | Einsatzkraft (EK) | Externe (Ex) |
|---|---|---|---|
| Einsätze sehen | Alle | Liste (nicht öffnen) | Nur nach Einladung |
| Einsatz beitreten | Frei | Beitritt anfragen | Nur per Einladung |
| Einsatz löschen/archivieren | Ja | Nein | Nein |
| Rolle im Einsatz (#59) | Kann zugewiesen werden | Kann zugewiesen werden | Kann zugewiesen werden |
| Identität | Stammperson | Stammperson | Temporärer Einsatznutzer |

**Führungskraft** umfasst auch Führungsunterstützung (z.B. Personal im FüKw).

## Datenmodell

### Prisma-Erweiterungen

```prisma
enum OperativeRole {
  FUEHRUNGSKRAFT
  EINSATZKRAFT
  EXTERNE
}

enum BeitrittsanfrageStatus {
  OFFEN
  GENEHMIGT
  ABGELEHNT
}
```

**User-Modell erweitert um:**
```prisma
operativeRole    OperativeRole  @default(EXTERNE)
stammperson      Person?        @relation(fields: [stammpersonId], references: [id])
stammpersonId    String?        @unique
```

**Neues Modell:**
```prisma
model EinsatzBeitrittsanfrage {
  id            String                  @id @default(cuid())
  einsatz       Einsatz                 @relation(...)
  einsatzId     String
  user          User                    @relation(...)
  userId        String
  status        BeitrittsanfrageStatus  @default(OFFEN)
  createdAt     DateTime                @default(now())
  resolvedAt    DateTime?
  resolvedBy    String?

  @@unique([einsatzId, userId])
}
```

`stammpersonId` ist `@unique` — jede Stammperson kann nur einem User zugewiesen sein.

## Domain Layer

### Value Objects

**OperativeRole** (analog zu bestehendem `UserRole`):
- Factory-Methoden: `.FUEHRUNGSKRAFT()`, `.EINSATZKRAFT()`, `.EXTERNE()`
- `canAccessEinsatzList(): boolean` — FK: true, EK: true (nur sehen), Ex: false
- `canOpenEinsatz(): boolean` — FK: true, EK/Ex: false (nur über Zuweisung)
- `canArchiveEinsatz(): boolean` — nur FK
- `requiresStammperson(): boolean` — FK/EK: true, Ex: false

**BeitrittsanfrageStatus:**
- `OFFEN`, `GENEHMIGT`, `ABGELEHNT`
- `canTransitionTo(target): boolean` — OFFEN → GENEHMIGT/ABGELEHNT, keine Rückwärts-Übergänge

### Domain Events

- `OperativeRoleChangedEvent` — Admin ändert operative Rolle
- `StammpersonAssignedEvent` — Admin weist Stammperson zu
- `EinsatzBeitrittsanfrageErstelltEvent` — EK fragt Beitritt an
- `EinsatzBeitrittsanfrageEntschiedenEvent` — FK genehmigt/lehnt ab

Events werden im bestehenden Outbox-Pattern registriert (Serializer, Deserializer, Adapters Module, Index).

## Application Layer

### Commands

**ChangeOperativeRoleCommand**
- Input: `userId`, `newRole`, `changedBy`
- Validierung: Aufrufer muss Admin sein, User muss existieren
- Wenn Rolle zu FK/EK wechselt und keine Stammperson zugewiesen → Warnung (kein Blocker)
- Feuert `OperativeRoleChangedEvent`

**AssignStammpersonCommand**
- Input: `userId`, `stammpersonId`, `assignedBy`
- Validierung: Stammperson darf nicht schon einem anderen User zugewiesen sein
- Feuert `StammpersonAssignedEvent`

**CreateEinsatzBeitrittsanfrageCommand**
- Input: `einsatzId`, `userId`
- Validierung: User muss EK sein, darf keine offene Anfrage haben, Einsatz muss aktiv sein
- Feuert `EinsatzBeitrittsanfrageErstelltEvent`

**ResolveEinsatzBeitrittsanfrageCommand**
- Input: `anfrageId`, `decision` (GENEHMIGT/ABGELEHNT), `resolvedBy`
- Validierung: Aufrufer muss FK sein, Anfrage muss OFFEN sein
- Bei Genehmigung: User wird dem Einsatz zugewiesen
- Feuert `EinsatzBeitrittsanfrageEntschiedenEvent`

### Queries

- **GetUsersWithOperativeRolesQuery** — User-Liste mit operativen Rollen + Stammperson (Admin-UI)
- **GetEinsatzBeitrittsanfragenQuery** — Offene Anfragen für einen Einsatz (FK-Ansicht)

### Guards

**OperativeRoleGuard** — Decorator-basiert, analog zum bestehenden `RolesGuard`:
```typescript
@RequiresOperativeRole(OperativeRole.FUEHRUNGSKRAFT)
```

Einsatz-Liste-Endpoint wird nach operativer Rolle gefiltert.

## Backend API

### Bestehende Controller erweitern

**EinsatzController** — Einsatz-Liste filtern:
- `GET /einsatz` → FK: alle, EK: alle (mit Flag `canOpen: false`), Ex: nur zugewiesene
- `GET /einsatz/:id` → Guard prüft ob User FK ist ODER dem Einsatz zugewiesen
- `DELETE /einsatz/:id` → Guard prüft ob User FK ist (nur FK darf löschen)
- `PATCH /einsatz/:id/archive` → Guard prüft ob User FK ist (nur FK darf archivieren)

### Neue Endpoints

**Admin — Operative Rollenverwaltung:**
- `PATCH /admin/users/:id/operative-role` — Rolle ändern
- `PATCH /admin/users/:id/stammperson` — Stammperson zuweisen/entfernen

**Beitrittsanfragen:**
- `POST /einsatz/:id/beitrittsanfragen` — EK stellt Anfrage
- `GET /einsatz/:id/beitrittsanfragen` — FK sieht offene Anfragen
- `PATCH /einsatz/:id/beitrittsanfragen/:anfrageId` — FK genehmigt/lehnt ab

Alle Endpoints nutzen `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse`.

## Frontend

### Admin-UI Erweiterung

Erweiterung der bestehenden User-Tabelle im Admin-Bereich:
- Spalte **Operative Rolle** mit Dropdown (FK/EK/Externe)
- Spalte **Stammperson** mit Suchfeld/Auswahl aus Personalstamm

### Einsatz-Liste Anpassung

- **FK**: Alle Einsätze sichtbar, kann öffnen, Badge mit offenen Beitrittsanfragen
- **EK**: Einsätze als Liste sichtbar, kann NICHT öffnen → Button "Beitritt anfragen", Status eigener Anfragen
- **Externe**: Nur eingeladene Einsätze sichtbar

### Beitrittsanfragen-UI

- **FK-Sicht im Einsatz**: Benachrichtigungs-Badge + Liste offener Anfragen mit Genehmigen/Ablehnen
- **EK-Sicht**: Status-Anzeige der eigenen Anfrage

### Feature-Struktur

```
frontend/src/features/operative-roles/
├── api/          # Query hooks für Rollen, Beitrittsanfragen
├── ui/           # Komponenten
├── hooks/        # useOperativeRole(), useCanAccessEinsatz()
└── index.ts      # Public API
```

## Migration

Bestehende User bekommen `operativeRole = EXTERNE` als Default. Admins können dann manuell Rollen hochstufen. Kein Datenverlust, kein Breaking Change — bestehende Funktionalität bleibt erhalten, wird nur durch die neuen Guards eingeschränkt.

## Nicht in Scope

- Gruppenmanagement (Ortsvereine, Bereitschaften, Teams) — YAGNI
- Beobachter-Rolle — entfernt
- Leitstelle-Rolle — entfernt
- Einsatz-spezifische Funktionsrollen — Issue #59
- Admin-Rollen — Issue #28
