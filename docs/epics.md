---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
workflowComplete: true
inputDocuments:
  - docs/prd.md
  - docs/architecture.md
  - docs/architecture-kraefte.md
  - docs/ux-design-specification.md
---

# Bluelight Hub - Kräfte-Management Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Kräfte-Management-Modul, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

**Produkt-Scope:** Ersetzt veraltete Windows-App für BOS/Rettungsdienste. Kernfeatures: Schnellerfassung (<5s), QR-Code-Scan (<3s), Taktische Stärke, Dual-Mode Dashboard, HiOrg-Server Integration.

## Requirements Inventory

### Functional Requirements

```
FR1:  FüKw Personal can capture vehicles from master data into active deployment
FR2:  FüKw Personal can create temporary vehicles without master data for spontaneous units
FR3:  FüKw Personal can update vehicle FMS status (0-9)
FR4:  FüKw Personal can view available vehicle types according to DIN EN 1789 classification
FR5:  System can track vehicle attributes (OPTA, Funkrufname, Typ, Sollbesatzung)

FR6:  FüKw Personal can register personnel via QR-Code scan with automatic database lookup
FR7:  FüKw Personal can create temporary personnel records for unknown helpers
FR8:  FüKw Personnel can assign personnel to vehicles
FR9:  System can track personnel qualifications (NotSan, RS, RH, GF, ZF, etc.)
FR10: System can match scanned QR-Code against local personnel database

FR11: FüKw Personnel can assign personnel to configurable role slots (LNA, OrgL, Leiter BHP, etc.)
FR12: FüKw Personnel can unassign personnel from roles
FR13: System can validate qualification requirements when assigning roles
FR14: System can track role attributes (Name, Funkrufname, required qualifications)

FR15: System can calculate tactical strength in format Führer/Unterführer/Helfer/Gesamt
FR16: System can categorize personnel by current function (not highest qualification)
FR17: System can count physicians as "Führer" category
FR18: System can auto-recalculate strength on any personnel or assignment change

FR19: Einsatzleiter can view Kräfte-Dashboard with tactical strength, vehicles, and roles
FR20: Einsatzleiter can view dashboard in FullScreen mode optimized for monitors
FR21: FüKw Personnel can view dashboard in compact mode optimized for editing
FR22: Users can switch between FullScreen and compact display modes
FR23: Einsatzleiter can view all vehicles with current FMS status
FR24: Einsatzleiter can view role occupancy status (assigned/vacant)

FR25: System can display deployed forces as POIs on the situation map
FR26: System can synchronize force positions with existing Lagekarte module

FR27: System can automatically create ETB entry on vehicle status change
FR28: System can automatically create ETB entry on role assignment/unassignment
FR29: System can automatically create ETB entry on force capture
FR30: System can ensure all auto-generated ETB entries are immutable
FR31: System can persist ETB entries atomically with domain operations (Outbox pattern)

FR32: Admin can manage vehicle master data (create, read, update, archive)
FR33: Admin can manage personnel master data (create, read, update, archive)
FR34: Admin can manage qualification definitions
FR35: Admin can manage vehicle type definitions
FR36: Admin can manage role definitions with Funkrufname and required qualifications
FR37: Admin can configure FMS status labels 7-9 per organization/region

FR38: Admin can synchronize personnel from HiOrg-Server API
FR39: Admin can select which personnel to import from sync results
FR40: System can automatically map qualifications from HiOrg-Server data
FR41: System can decode DRK-Helfer-App QR-Code format
```

### Non-Functional Requirements

```
NFR1:  Dashboard (inkl. Stärke, Fahrzeuge, Rollen) lädt vollständig in < 2 Sekunden
NFR2:  Fahrzeug-Erfassung aus Stammdaten abgeschlossen in < 5 Sekunden (inkl. UI-Interaktion)
NFR3:  QR-Code-Scan bis Helfer erfasst in < 3 Sekunden
NFR4:  Status-Update (1-2 Klicks) bis ETB-Eintrag erstellt in < 1 Sekunde
NFR5:  Taktische Stärke Re-Berechnung bei Änderungen in < 500ms

NFR6:  ETB-Einträge sind nach Erstellung unveränderlich (Immutability)
NFR7:  ETB-Daten müssen 10 Jahre aufbewahrt werden können
NFR8:  Alle API-Kommunikation über HTTPS (TLS 1.2+)
NFR9:  Admin-Funktionen nur für autorisierte Benutzer zugänglich
NFR10: Einsatzdaten sind mandantenfähig isoliert

NFR11: System bleibt bei Netzwerkausfall bedienbar (Offline-Modus)
NFR12: Lokale Änderungen werden bei Reconnect automatisch synchronisiert
NFR13: Kein Datenverlust bei unerwartetem App-Absturz (Autosave)
NFR14: ETB-Einträge werden atomar mit Domain-Operationen persistiert (Outbox)

NFR15: ETB-Integration erfolgt über Domain Events (lose Kopplung)
NFR16: HiOrg-Server API-Fehler unterbrechen nicht den Hauptworkflow
NFR17: QR-Code-Dekodierung unterstützt DRK-Helfer-App Format
NFR18: Externe Integrationen als austauschbare Adapter implementiert (Port/Adapter)

NFR19: FullScreen-Modus optimiert für Monitor-Ansicht auf Distanz (3m lesbar)
NFR20: Kompakt-Modus optimiert für Tablet-Bearbeitung
NFR21: Kritische Aktionen (Status-Update) mit maximal 2 Klicks erreichbar
NFR22: Feedback bei allen Benutzeraktionen innerhalb 200ms
```

### Additional Requirements

#### Technische Anforderungen (aus Architecture)

**Foundation (KRITISCH für Epic 1):**
- Brownfield-Integration in bestehendes Monorepo (KEIN neues Starter-Template)
- Prisma Schema MUSS als erstes definiert werden (Stamm + Einsatz Entities)
- Hexagonale Architektur PFLICHT (Domain → Application → Infrastructure)
- CQRS Pattern ist Pflicht (Commands für Write, Queries für Read)
- TransactionalCommandHandler Base Class für alle Commands
- Outbox Pattern für Domain Events (NIEMALS direktes emit())
- DI Token Constants als Symbols (KEINE inline String-Literals)
- Domain Layer MUSS framework-agnostic sein (keine Prisma/HTTP Imports)

**Daten-Patterns:**
- NO-DELETE Policy für Einsätze (PostgreSQL Trigger blockiert DELETE)
- Soft-Delete Pattern für Users, ETB Entries
- Audit Trail PFLICHT auf ALLEN Entities (createdAt, createdBy, updatedAt, updatedBy)
- Stammdaten vs. Einsatzdaten Trennung (stammId als nullable Referenz)
- FunkStatusConfig als DB-Table (KEIN Hardcoding der Status 7-9)

**API Design:**
- OpenAPI Decorators PFLICHT (@ApiTags, @ApiOperation, @ApiCreatedResponse)
- class-validator + @ApiProperty auf DTOs
- API-Client generieren nach Backend-Änderungen: `pnpm run generate-api`
- Response Wrapping via Interceptor ({ data, statusCode, timestamp })

**Security:**
- Cookie-basiertes 3-Token JWT System (Access 15min, Refresh 7d, Admin)
- JwtAuthGuard für Einsatz-Kräfte Endpoints
- AdminJwtAuthGuard für Admin Stammdaten Endpoints
- RBAC: USER (Kräfte erfassen), ADMIN (Stammdaten), SUPER_ADMIN (Full)

**Event Flow:**
- Event Naming: FahrzeugErfasst, FahrzeugStatusGeaendert, PersonZugewiesen, etc.
- Alle Events via TransactionalCommandHandler in Outbox persistieren
- EtbAutoCreationHandler konsumiert Events und erstellt ETB-Einträge

#### UX-Anforderungen (aus UX Design)

**Density Modi:**
- Compact-Modus: gap-2, p-2, text-sm (optimiert für Maus/Keyboard)
- FullScreen-Modus: gap-6, p-6, text-xl+ (auf 3m lesbar)
- Toggle via Button oder F-Taste

**Keyboard-First Interaction:**
- S: Status-Update der fokussierten Zeile
- F: Fahrzeug hinzufügen / FullScreen-Toggle
- Cmd+K / Ctrl+K: Command Palette
- ↑/↓: Navigation in Listen
- Esc: FullScreen-Modus verlassen

**Inline-Editing:**
- Klick auf Wert → Dropdown öffnet
- Blur oder Enter → Automatisches Speichern
- Kein Modal, alles inline

**Accessibility (WCAG 2.1 AA):**
- Kontrast ≥ 4.5:1 für Text
- Keyboard-Navigation vollständig
- ARIA-Labels für alle interaktiven Elemente
- Min. 44x44px Klickziele
- prefers-reduced-motion respektieren

**Design System:**
- NUR Tailwind CSS + Headless UI
- Heroicons für Icons
- Atomic Design: atoms → molecules → organisms → templates
- Density-Varianten für alle Komponenten

**Feedback & States:**
- Optimistic Updates für sofortige Reaktion
- Toast Auto-Dismiss: 3 Sekunden
- Skeleton-Loader für Ladezustände
- Offline-Banner bei Netzwerkausfall

### FR Coverage Map

| FR | Epic | Beschreibung |
|----|------|--------------|
| FR1 | Epic 3 | Fahrzeuge aus Stammdaten erfassen |
| FR2 | Epic 3 | Temporäre Fahrzeuge anlegen |
| FR3 | Epic 3 | FMS-Status updaten (0-9) |
| FR4 | Epic 3 | Fahrzeugtypen nach DIN EN 1789 anzeigen |
| FR5 | Epic 3 | Fahrzeug-Attribute tracken |
| FR6 | Epic 4 | QR-Code Registrierung mit DB-Lookup |
| FR7 | Epic 4 | Temporäre Personen anlegen |
| FR8 | Epic 4 | Personen zu Fahrzeugen zuweisen |
| FR9 | Epic 4 | Qualifikationen tracken |
| FR10 | Epic 4 | QR-Code gegen DB matchen |
| FR11 | Epic 5 | Rollen zuweisen (LNA, OrgL, etc.) |
| FR12 | Epic 5 | Rollen freigeben |
| FR13 | Epic 5 | Qualifikationsvalidierung bei Rollenzuweisung |
| FR14 | Epic 5 | Rollen-Attribute tracken |
| FR15 | Epic 6 | Taktische Stärke berechnen (Führer/Unterführer/Helfer/Gesamt) |
| FR16 | Epic 6 | Personal nach Funktion kategorisieren |
| FR17 | Epic 6 | Ärzte als "Führer" zählen |
| FR18 | Epic 6 | Auto-Neuberechnung bei Änderungen |
| FR19 | Epic 6 | Kräfte-Dashboard anzeigen |
| FR20 | Epic 6 | FullScreen-Modus für Monitore |
| FR21 | Epic 6 | Compact-Modus für Bearbeitung |
| FR22 | Epic 6 | Modus-Wechsel |
| FR23 | Epic 6 | Fahrzeuge mit FMS-Status anzeigen |
| FR24 | Epic 6 | Rollenbesetzung anzeigen |
| FR25 | Epic 8 | Kräfte als POIs auf Lagekarte |
| FR26 | Epic 8 | Synchronisation mit Lagekarte-Modul |
| FR27 | Epic 3 | Auto-ETB bei Fahrzeug-Statusänderung |
| FR28 | Epic 5 | Auto-ETB bei Rollenzuweisung |
| FR29 | Epic 3,4 | Auto-ETB bei Kräfte-Erfassung |
| FR30 | Epic 3,4,5 | ETB-Einträge immutable |
| FR31 | Epic 3,4,5 | Outbox Pattern für ETB-Persistierung |
| FR32 | Epic 2 | Fahrzeug-Stammdaten CRUD |
| FR33 | Epic 2 | Personen-Stammdaten CRUD |
| FR34 | Epic 1 | Qualifikationen verwalten |
| FR35 | Epic 1 | Fahrzeugtypen verwalten |
| FR36 | Epic 1 | Rollen-Definitionen verwalten |
| FR37 | Epic 1 | Funkstatus 7-9 konfigurieren |
| FR38 | Epic 7 | HiOrg-Server Synchronisation |
| FR39 | Epic 7 | Import-Auswahl aus Sync-Ergebnissen |
| FR40 | Epic 7 | Qualifikations-Mapping |
| FR41 | Epic 4 | DRK-Helfer-App QR-Format dekodieren |

## Epic List

### Epic 0: Technical Foundation 🔧 [TECHNICAL]

**Typ:** TECHNICAL EPIC - Keine direkten User-Features
**Kontext:** Kritische Risiko-Mitigationen (Security, Data Integrity, Domain Model)

**Stories:** S0.1 (AdminJwtAuthGuard), S0.2 (UNIQUE Constraint), S0.3 (GeoCoordinate VO)
**Aufwand:** 14h

**Standalone:** ✅ Ja – Foundation für alle Feature-Epics
**Blocks:** Epic 1, 2, 3, 4, 5, 6, 7, 8

---

### Epic 1: Admin-Grundkonfiguration 🔧

**User Outcome:** Maria (Admin) kann Qualifikationen, Fahrzeugtypen, Rollen-Definitionen und Funkstatus 7-9 konfigurieren – das System ist einsatzbereit.

**FRs covered:** FR34, FR35, FR36, FR37

**Standalone:** ✅ Ja – liefert komplette Konfigurationsfähigkeit
**Depends on:** Epic 0 (Technical Foundation)
**Enables:** Epic 2, 3, 4, 5 (nutzen die konfigurierten Definitionen)

---

### Epic 2: Stammdaten-Administration 📂

**User Outcome:** Maria (Admin) kann Fahrzeug- und Personen-Stammdaten vollständig verwalten (Create, Read, Update, Archive).

**FRs covered:** FR32, FR33

**Standalone:** ✅ Ja – vollständige CRUD-Fähigkeit für Stammdaten
**Depends on:** Epic 1 (nutzt definierte Typen/Qualifikationen)
**Enables:** Epic 3, 4, 7 (Stammdaten für Einsatz-Erfassung und Import)

---

### Epic 3: Fahrzeug-Einsatz-Verwaltung 🚑

**User Outcome:** Sandra (FüKw) kann Fahrzeuge aus Stammdaten erfassen, temporäre Fahrzeuge anlegen, FMS-Status updaten – alles wird automatisch im ETB dokumentiert.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR27, FR29, FR30, FR31

**Standalone:** ✅ Ja – vollständiges Fahrzeug-Lifecycle im Einsatz
**Depends on:** Epic 1 (Fahrzeugtypen), Epic 2 (Stamm-Fahrzeuge)
**Enables:** Epic 6 (Dashboard zeigt Fahrzeuge), Epic 8 (Lagekarte-POIs)

---

### Epic 4: Helfer-Registrierung 📱

**User Outcome:** Sandra (FüKw) kann Helfer per QR-Code in <3s erfassen – mit automatischem DB-Lookup, DRK-App-Format-Support und Auto-ETB.

**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR29, FR30, FR31, FR41

**Standalone:** ✅ Ja – vollständige Registrierungsfähigkeit
**Depends on:** Epic 1 (Qualifikationen), Epic 2 (Stamm-Personen)
**Enables:** Epic 5 (Personen für Rollenzuweisung), Epic 6 (Stärke-Berechnung)

---

### Epic 5: Rollen & Führung 👔

**User Outcome:** Sandra (FüKw) kann Führungsrollen (LNA, OrgL, Leiter BHP) besetzen/freigeben – mit Qualifikationsvalidierung und Auto-ETB.

**FRs covered:** FR11, FR12, FR13, FR14, FR28, FR30, FR31

**Standalone:** ✅ Ja – vollständiges Rollen-Management
**Depends on:** Epic 1 (Rollen-Definitionen), Epic 4 (registrierte Personen)
**Enables:** Epic 6 (Dashboard zeigt Rollenbesetzung)

---

### Epic 6: Taktische Übersicht 📊

**User Outcome:** Thomas (Einsatzleiter) sieht auf einen Blick: Taktische Stärke (2/4/18/24), alle Fahrzeuge mit Status, Rollenbesetzung – in FullScreen oder Compact-Modus.

**FRs covered:** FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24

**Standalone:** ✅ Ja – Dashboard funktioniert mit allen bis dahin erfassten Daten
**Depends on:** Epic 3, 4, 5 (Daten zum Anzeigen)
**Enables:** Keine weiteren Epics abhängig

---

### Epic 7: HiOrg-Server Integration 🔄

**User Outcome:** Maria (Admin) kann Personaldaten aus HiOrg-Server importieren – mit Vorschau, Auswahl und automatischem Qualifikations-Mapping.

**FRs covered:** FR38, FR39, FR40

**Standalone:** ✅ Ja – vollständiger Import-Workflow
**Depends on:** Epic 1 (Qualifikationen zum Mappen), Epic 2 (Ziel für Import)
**Enables:** Epic 4 profitiert (mehr Stammdaten für QR-Lookup)

---

### Epic 8: Lagekarte-Integration 🗺️

**User Outcome:** Alle können Kräfte als POIs auf der Lagekarte sehen – synchronisiert mit dem bestehenden Lagekarte-Modul.

**FRs covered:** FR25, FR26

**Standalone:** ✅ Ja – Integration mit bestehendem Modul
**Depends on:** Epic 3 (Fahrzeuge als POI-Quelle)
**Enables:** Keine weiteren Epics abhängig

---

## Dependency Graph

```
Epic 0: Technical Foundation [TECHNICAL] ← MUST BE FIRST
    ↓
Epic 1: Admin-Grundkonfiguration
    ↓
Epic 2: Stammdaten-Administration
    ↓
    ├── Epic 3: Fahrzeug-Einsatz-Verwaltung ──→ Epic 8: Lagekarte
    │       ↓                                    (parallel möglich)
    ├── Epic 4: Helfer-Registrierung ←──┐
    │       ↓                           │
    └── Epic 5: Rollen & Führung        │
            ↓                           │
        Epic 6: Taktische Übersicht     │
                                        │
Epic 7: HiOrg-Server ───────────────────┘ (parallel zu Epic 3-6 möglich)
```

### Parallel Execution Summary

| Phase | Epics | Parallelisierbar |
|-------|-------|------------------|
| 1 | Epic 0 | Nein (Foundation) |
| 2 | Epic 1 | Nein |
| 3 | Epic 2 | Nein |
| 4 | Epic 3, 4, 7 | ✅ Ja |
| 5 | Epic 5, 8 | ✅ Ja |
| 6 | Epic 6 | Nein |

---

## Epic 1: Admin-Grundkonfiguration 🔧

**Goal:** Maria (Admin) kann Qualifikationen, Fahrzeugtypen, Rollen-Definitionen und Funkstatus 7-9 konfigurieren – das System ist einsatzbereit.

---

### Story 1.0: Prisma Schema für Admin-Konfiguration (Epic 1 Foundation)

**Als** Entwickler,
**möchte ich** das Prisma Schema für die Admin-Konfigurations-Entitäten definieren,
**damit** Epic 1 Stories auf einer stabilen Datenbankstruktur aufbauen können.

**Hinweis:** Schema wird inkrementell erweitert - jeder Epic fügt seine Entities hinzu (demand-driven, nicht supply-driven).

**Acceptance Criteria:**

**AC1: Konfigurations-Entities definiert**
**Given** das bestehende Prisma Schema
**When** ich die Epic-1-Entities hinzufüge
**Then** existieren folgende Models mit Audit-Trail (createdAt, createdBy, updatedAt, updatedBy):
- `Qualifikation` (name, abkuerzung, kategorie ENUM, beschreibung, istAktiv)
- `Fahrzeugtyp` (code, bezeichnung, kategorie ENUM, sollbesatzung JSONB, istAktiv)
- `RollenDefinition` (name, funkrufname, beschreibung, istAktiv)
- `RolleQualifikation` (M:N Junction Table)
- `FunkStatusConfig` (code 0-9, standardLabel, customLabel, farbe, istAlarmierbar)

**AC2: Relations korrekt definiert**
**Given** die Entities sind definiert
**When** ich die Relations prüfe
**Then** sind alle FKs mit `onDelete: RESTRICT` konfiguriert
**And** Indexes auf `istAktiv` Felder

**AC3: Migration erstellt und angewendet**
**Given** das Schema ist vollständig
**When** ich `prisma migrate dev` ausführe
**Then** wird Migration `add_kraefte_admin_config` erfolgreich erstellt
**And** alle Tables existieren in PostgreSQL

**AC4: Seed-Daten für Entwicklung**
**Given** Migration ist angewendet
**When** ich `prisma db seed` ausführe
**Then** werden Standard-Qualifikationen (NotSan, RS, RH, GF, ZF) angelegt
**And** Standard-Fahrzeugtypen (RTW, KTW, NEF, NAW) angelegt
**And** Standard-Rollen (LNA, OrgL, Leiter BHP) angelegt
**And** FunkStatus 0-9 mit DIN-Standard-Labels angelegt

**Technische Notes:**
- **Backend:** Schema in `packages/backend/prisma/schema.prisma`, Migration mit `pnpm --filter @bluelight-hub/backend prisma:migrate`
- **Seed:** `packages/backend/prisma/seed.ts` erweitern
- **Aufwand:** ~1-2 Tage
- **Scope:** NUR Epic 1 Entities - Epic 2-8 erweitern das Schema bei Bedarf

---

### Story 2.0: Prisma Schema für Stammdaten (Epic 2 Foundation)

**Als** Entwickler,
**möchte ich** das Prisma Schema für die Stammdaten-Entitäten erweitern,
**damit** Epic 2 Stories auf einer stabilen Datenbankstruktur aufbauen können.

**Acceptance Criteria:**

**AC1: Stammdaten-Entities definiert**
**Given** das Epic-1-Schema existiert
**When** ich die Epic-2-Entities hinzufüge
**Then** existieren folgende Models mit Audit-Trail:
- `StammFahrzeug` (rufname, funkrufname, fahrzeugtypId FK, kennzeichen, baujahr, funkkenungBOS, archivedAt, archivedBy)
- `StammPerson` (vorname, nachname, personalnummer, funkkenungBOS, archivedAt, archivedBy)
- `StammPersonQualifikation` (M:N Junction Table)

**AC2: Relations zu Epic-1-Entities**
**Given** die Entities sind definiert
**When** ich die Relations prüfe
**Then** referenziert `StammFahrzeug.fahrzeugtypId` → `Fahrzeugtyp.id`
**And** `StammPersonQualifikation` verknüpft `StammPerson` mit `Qualifikation`

**AC3: Migration erstellt**
**Given** das Schema ist erweitert
**When** ich `prisma migrate dev` ausführe
**Then** wird Migration `add_kraefte_stammdaten` erfolgreich erstellt

**Technische Notes:**
- **Aufwand:** ~1 Tag
- **Depends on:** Story 1.0 (Epic 1 Schema)

---

### Story 3.0: Prisma Schema für Einsatz-Fahrzeuge (Epic 3 Foundation)

**Als** Entwickler,
**möchte ich** das Prisma Schema für die Einsatz-Fahrzeug-Entitäten erweitern,
**damit** Epic 3 Stories auf einer stabilen Datenbankstruktur aufbauen können.

**Acceptance Criteria:**

**AC1: Einsatz-Fahrzeug-Entity definiert**
**Given** das Epic-2-Schema existiert
**When** ich die Epic-3-Entities hinzufüge
**Then** existiert folgendes Model mit Audit-Trail:
- `EinsatzFahrzeug` (einsatzId FK, stammId FK nullable, funkrufname, kennzeichen, fahrzeugtypId FK, fmsStatus ENUM, position JSONB nullable)

**AC2: Relations korrekt**
**Given** die Entity ist definiert
**When** ich die Relations prüfe
**Then** referenziert `stammId` → `StammFahrzeug.id` (nullable für temporäre Fahrzeuge)
**And** `einsatzId` → `Einsatz.id` mit `onDelete: CASCADE`

**AC3: Migration erstellt**
**Given** das Schema ist erweitert
**When** ich `prisma migrate dev` ausführe
**Then** wird Migration `add_einsatz_fahrzeuge` erfolgreich erstellt

**Technische Notes:**
- **Aufwand:** ~0.5 Tage
- **Depends on:** Story 2.0 (Epic 2 Schema)

---

### Story 4.0: Prisma Schema für Einsatz-Personen (Epic 4 Foundation)

**Als** Entwickler,
**möchte ich** das Prisma Schema für die Einsatz-Personen-Entitäten erweitern,
**damit** Epic 4 Stories auf einer stabilen Datenbankstruktur aufbauen können.

**Acceptance Criteria:**

**AC1: Einsatz-Person-Entities definiert**
**Given** das Epic-3-Schema existiert
**When** ich die Epic-4-Entities hinzufüge
**Then** existieren folgende Models mit Audit-Trail:
- `EinsatzPerson` (einsatzId FK, stammId FK nullable, vorname, nachname, funktion, fahrzeugId FK nullable)
- `EinsatzPersonQualifikation` (M:N Junction Table)

**AC2: Relations korrekt**
**Given** die Entities sind definiert
**When** ich die Relations prüfe
**Then** referenziert `stammId` → `StammPerson.id` (nullable für temporäre Personen)
**And** `fahrzeugId` → `EinsatzFahrzeug.id` (nullable)

**AC3: Migration erstellt**
**Given** das Schema ist erweitert
**When** ich `prisma migrate dev` ausführe
**Then** wird Migration `add_einsatz_personen` erfolgreich erstellt

**Technische Notes:**
- **Aufwand:** ~0.5 Tage
- **Depends on:** Story 3.0 (Epic 3 Schema)

---

### Story 5.0: Prisma Schema für Rollenbesetzung (Epic 5 Foundation)

**Als** Entwickler,
**möchte ich** das Prisma Schema für die Rollenbesetzungs-Entität erweitern,
**damit** Epic 5 Stories auf einer stabilen Datenbankstruktur aufbauen können.

**Acceptance Criteria:**

**AC1: Rollenbesetzung-Entity definiert**
**Given** das Epic-4-Schema existiert
**When** ich die Epic-5-Entity hinzufüge
**Then** existiert folgendes Model mit Audit-Trail:
- `EinsatzRollenbesetzung` (einsatzId FK, rollenDefinitionId FK, personId FK)

**AC2: UNIQUE Constraint (aus Epic 0 S0.2)**
**Given** die Entity ist definiert
**When** ich die Constraints prüfe
**Then** existiert `@@unique([einsatzId, rollenDefinitionId])` (verhindert doppelte Besetzung)

**AC3: Migration erstellt**
**Given** das Schema ist erweitert
**When** ich `prisma migrate dev` ausführe
**Then** wird Migration `add_rollenbesetzung` erfolgreich erstellt

**Technische Notes:**
- **Aufwand:** ~0.5 Tage
- **Depends on:** Story 4.0 (Epic 4 Schema), S0.2 (UNIQUE Constraint Pattern)

---

### Story 1.1: Qualifikationen verwalten

**Als** Admin,
**möchte ich** Qualifikations-Definitionen im Admin-Portal verwalten können,
**damit** im Kräfte-Modul nur gültige Qualifikationen verwendet werden.

**Acceptance Criteria:**

**AC1: Qualifikationen auflisten**
**Given** ich bin als Admin authentifiziert
**When** ich die Seite `/admin/kraefte/qualifikationen` aufrufe
**Then** sehe ich eine Tabelle mit allen Qualifikationen (Name, Abkürzung, Kategorie, Status)
**And** die Daten werden aus `GET /api/admin/kraefte/qualifikationen` geladen

**AC2: Qualifikation erstellen**
**Given** ich bin auf der Qualifikationen-Seite
**When** ich auf "Neue Qualifikation" klicke und das Formular ausfülle (Name, Abkürzung, Kategorie, Beschreibung)
**Then** wird die Qualifikation erstellt via `POST /api/admin/kraefte/qualifikationen`
**And** sie erscheint in der Tabelle
**And** ein Toast zeigt "Qualifikation erstellt" (<200ms)

**AC3: Qualifikation bearbeiten**
**Given** eine Qualifikation existiert
**When** ich auf "Bearbeiten" klicke und Änderungen vornehme
**Then** werden die Änderungen via `PATCH /api/admin/kraefte/qualifikationen/{id}` gespeichert
**And** `updatedAt`, `updatedBy` werden aktualisiert

**AC4: Qualifikation deaktivieren**
**Given** eine Qualifikation ist aktiv
**When** ich auf "Deaktivieren" klicke
**Then** wird `istAktiv: false` gesetzt
**And** sie erscheint ausgegraut und ist nicht mehr in Dropdowns verfügbar

**AC5: Backend Persistierung**
**Given** Admin sendet POST-Request
**When** Backend erstellt via `CreateQualifikationHandler`
**Then** wird Prisma-Entity `Qualifikation` mit Audit-Trail angelegt
**And** OpenAPI-Decorators sind vorhanden (@ApiTags, @ApiOperation)

**AC6: Backend Validierung**
**Given** Admin sendet ungültige Daten (Name fehlt)
**When** Request verarbeitet wird
**Then** antwortet Backend mit 400 Bad Request und Fehlermeldung

**Technische Notes:**
- **Backend:** Prisma `Qualifikation` (name, abkuerzung, kategorie ENUM, beschreibung, istAktiv, Audit-Trail), DI Token `DI_TOKENS.REPOSITORIES.KRAEFTE.QUALIFIKATION`, API `/api/admin/kraefte/qualifikationen`, Guard `AdminJwtAuthGuard`
- **Frontend:** Route `/admin/kraefte/qualifikationen`, Hooks `useQualifikationen()`, `useCreateQualifikation()`, Komponenten `QualifikationenPage`, `QualifikationenTabelle`, `QualifikationFormular`

---

### Story 1.2: Fahrzeugtypen verwalten

**Als** Admin,
**möchte ich** Fahrzeugtyp-Definitionen verwalten,
**damit** FüKw-Personal nur gültige Fahrzeugtypen bei der Erfassung auswählen kann.

**Acceptance Criteria:**

**AC1: Fahrzeugtypen auflisten**
**Given** ich bin als Admin authentifiziert
**When** ich die Seite `/admin/kraefte/fahrzeugtypen` aufrufe
**Then** sehe ich eine Tabelle mit allen Fahrzeugtypen (Code, Bezeichnung, Kategorie, Sollbesatzung)

**AC2: Fahrzeugtyp erstellen**
**Given** ich bin auf der Fahrzeugtypen-Seite
**When** ich "Neuer Fahrzeugtyp" klicke und das Formular ausfülle (Code, Bezeichnung, Kategorie, Sollbesatzung)
**Then** wird der Fahrzeugtyp erstellt
**And** Sollbesatzung wird als Struktur erfasst (Führer/Unterführer/Helfer Anzahl)

**AC3: Fahrzeugtyp bearbeiten**
**Given** ein Fahrzeugtyp existiert
**When** ich auf "Bearbeiten" klicke
**Then** öffnet sich das Formular vorausgefüllt und Änderungen werden gespeichert

**AC4: Fahrzeugtyp deaktivieren**
**Given** ein Fahrzeugtyp ist aktiv
**When** ich auf "Deaktivieren" klicke
**Then** ist er nicht mehr in Dropdown-Selects verfügbar

**AC5: DIN EN 1789 Hinweis**
**Given** Admin erstellt Fahrzeugtyp mit unbekanntem Code
**When** Code nicht DIN-konform (RTW, KTW, NEF, NAW, etc.)
**Then** zeigt System eine Warning (nicht blockierend) mit Empfehlungen

**AC6: Backend Persistierung**
**Given** Admin sendet POST-Request
**When** Backend erstellt via Handler
**Then** wird Sollbesatzung als JSONB gespeichert: `{ fuhrer: 1, unterfuhrer: 2, helfer: 3 }`

**Technische Notes:**
- **Backend:** Prisma `Fahrzeugtyp` (code, bezeichnung, kategorie ENUM, sollbesatzung JSONB, Audit-Trail), API `/api/admin/kraefte/fahrzeugtypen`
- **Frontend:** Route `/admin/kraefte/fahrzeugtypen`, Sollbesatzung-Input: 3 numerische Felder

---

### Story 1.3: Rollen-Definitionen verwalten

**Als** Admin,
**möchte ich** Führungsrollen mit Funkrufname und benötigten Qualifikationen definieren,
**damit** FüKw-Personal im Einsatz nur qualifizierte Personen Rollen zuweisen kann.

**Acceptance Criteria:**

**AC1: Rollen auflisten**
**Given** ich bin als Admin authentifiziert
**When** ich die Seite `/admin/kraefte/rollen` aufrufe
**Then** sehe ich eine Tabelle mit allen Rollen (Name, Funkrufname, Qualifikationen, Status)

**AC2: Rolle erstellen**
**Given** ich bin auf der Rollen-Seite
**When** ich "Neue Rolle" klicke und das Formular ausfülle (Name, Funkrufname, Beschreibung, Qualifikationen Multi-Select)
**Then** wird die Rolle erstellt mit allen verknüpften Qualifikationen

**AC3: Qualifikationen verknüpfen (M:N)**
**Given** ich erstelle/bearbeite eine Rolle
**When** ich im Multi-Select mehrere Qualifikationen auswähle
**Then** werden M:N-Relationen in `RolleQualifikation` erstellt
**And** bei Rollen-Besetzung wird geprüft: Person MUSS mindestens eine der Qualifikationen haben

**AC4: Rolle bearbeiten**
**Given** eine Rolle existiert
**When** ich auf "Bearbeiten" klicke
**Then** zeigt Multi-Select die aktuell verknüpften Qualifikationen

**AC5: Rolle deaktivieren**
**Given** eine Rolle ist aktiv
**When** ich auf "Deaktivieren" klicke
**Then** ist sie nicht mehr bei Rollen-Zuweisung im Einsatz verfügbar

**AC6: Qualifikations-Validierung**
**Given** Admin verknüpft ungültige Qualifikations-ID
**When** Request verarbeitet wird
**Then** antwortet Backend mit 400 Bad Request

**AC7: Backend M:N-Relation**
**Given** Admin sendet POST-Request
**When** Backend erstellt via Handler
**Then** wird `RollenDefinition` + Junction-Table `RolleQualifikation` erstellt

**Technische Notes:**
- **Backend:** Prisma `RollenDefinition` + `RolleQualifikation` (M:N), DTO mit `qualifikationIds: string[]`
- **Frontend:** Headless UI Listbox mit `multiple` prop für Qualifikations-Multi-Select

---

### Story 1.4: Funkstatus 7-9 konfigurieren

**Als** Admin,
**möchte ich** die Beschreibung und Farbe für Funkstatus 7-9 pro Organisation anpassen,
**damit** das System den regionalen Leitstellenbereich-Standards entspricht.

**Acceptance Criteria:**

**AC1: Status-Config auflisten**
**Given** ich bin als Admin authentifiziert
**When** ich die Seite `/admin/kraefte/funkstatus` aufrufe
**Then** sehe ich eine Tabelle mit Status 0-9 (Code, Standard-Label, Custom-Label, Farbe)
**And** Status 0-6 sind schreibgeschützt (DIN-Standard), Status 7-9 sind editierbar

**AC2: Inline-Editing Label**
**Given** ich sehe die Status-Tabelle
**When** ich auf die Custom-Label-Zelle von Status 7 klicke
**Then** wird die Zelle zu einem Input-Feld
**And** beim Blur/Enter wird gespeichert und Toast zeigt "Status aktualisiert"

**AC3: Farbe anpassen**
**Given** ich bearbeite einen Status
**When** ich auf die Farb-Zelle klicke
**Then** öffnet sich ein Color-Picker
**And** Farbe wird als Hex-Code gespeichert (#FF0000)

**AC4: Ist-Alarmierbar Flag**
**Given** ich bearbeite Status 7-9
**When** ich die Checkbox "Ist Alarmierbar" toggle
**Then** wird das Flag gespeichert für spezielle Kennzeichnung

**AC5: Backend Persistierung**
**Given** Admin sendet PATCH `/api/admin/kraefte/funkstatus/7`
**When** Backend aktualisiert via Handler
**Then** wird `FunkStatusConfig` mit Audit-Trail updated

**AC6: Custom vs Standard Label**
**Given** Frontend lädt Status-Config
**When** GET-Request
**Then** wird `customLabel` zurückgegeben wenn gesetzt, sonst `standardLabel`

**AC7: Code-Range Validierung**
**Given** Admin sendet PATCH mit Code außerhalb 0-9
**When** Request verarbeitet wird
**Then** antwortet Backend mit 400 Bad Request

**Technische Notes:**
- **Backend:** Prisma `FunkStatusConfig` (code INT, customLabel, farbe, istAlarmierbar, Audit-Trail), Standard-Labels 0-6 hardcoded (DIN 14610)
- **Frontend:** Inline-Editing Pattern (Klick→Input→Blur/Enter), Headless UI Color-Picker

---

## Epic 2: Stammdaten-Administration 📂

**Goal:** Maria (Admin) kann Fahrzeug- und Personen-Stammdaten vollständig verwalten (Create, Read, Update, Archive).

---

### Story 2.1: Stamm-Fahrzeuge verwalten

**Als** Admin (Maria),
**möchte ich** Fahrzeug-Stammdaten vollständig verwalten (anlegen, bearbeiten, anzeigen, archivieren),
**damit** die Flotte korrekt abgebildet und für Einsätze verfügbar ist.

**Acceptance Criteria:**

**AC1: Fahrzeug-Liste anzeigen**
**Given** ich bin als Admin eingeloggt
**When** ich `/admin/stammdaten/fahrzeuge` öffne
**Then** sehe ich eine Tabelle aller aktiven Fahrzeuge (Rufname, Funkrufname, Fahrzeugtyp)
**And** archivierte Fahrzeuge werden standardmäßig ausgeblendet (Toggle verfügbar)
**And** Tabelle lädt innerhalb 200ms

**AC2: Neues Fahrzeug anlegen**
**Given** ich bin auf der Fahrzeugverwaltungsseite
**When** ich "Neues Fahrzeug" klicke und Formular ausfülle (Rufname, Funkrufname, Fahrzeugtyp-Dropdown, Kennzeichen, Baujahr, FunkkenungBOS)
**Then** wird Fahrzeug gespeichert mit Audit-Trail (createdAt, createdBy)
**And** Toast zeigt "Fahrzeug angelegt" (<200ms)

**AC3: Fahrzeug bearbeiten**
**Given** ein Fahrzeug existiert
**When** ich "Bearbeiten" klicke und Änderungen vornehme
**Then** werden Änderungen gespeichert (updatedAt, updatedBy aktualisiert)

**AC4: Fahrzeug archivieren**
**Given** ein Fahrzeug ist aktiv
**When** ich "Archivieren" klicke und bestätige
**Then** wird archivedAt, archivedBy gesetzt
**And** Fahrzeug verschwindet aus Standard-Liste

**AC5: Validierung**
**Given** ich fülle das Formular aus
**When** Pflichtfelder fehlen (Rufname, Funkrufname, Fahrzeugtyp)
**Then** sehe ich inline Validierungsfehler
**And** Submit-Button ist disabled

**AC6: Authorization**
**Given** ich bin nicht als Admin eingeloggt
**When** ich auf Fahrzeugverwaltung zugreife
**Then** erhalte ich 403 Forbidden

**Technische Notes:**
- **Backend:** Prisma `StammFahrzeug` (rufname, funkrufname, fahrzeugtypId FK, kennzeichen, baujahr, funkkenungBOS, Audit-Trail), DI Token `DI_TOKENS.REPOSITORIES.STAMM_FAHRZEUG`, API `/api/admin/stammdaten/fahrzeuge`, Guard `AdminJwtAuthGuard`
- **Frontend:** Route `/admin/stammdaten/fahrzeuge`, Hooks `useStammFahrzeuge()`, `useCreateStammFahrzeug()`, `useArchiveStammFahrzeug()`, Fahrzeugtyp-Dropdown aus Epic 1

---

### Story 2.2: Stamm-Personen verwalten

**Als** Admin (Maria),
**möchte ich** Personen-Stammdaten vollständig verwalten und Qualifikationen zuweisen,
**damit** die Mitglieder korrekt erfasst sind und ihre Qualifikationen für Einsätze verfügbar sind.

**Acceptance Criteria:**

**AC1: Personen-Liste anzeigen**
**Given** ich bin als Admin eingeloggt
**When** ich `/admin/stammdaten/personen` öffne
**Then** sehe ich eine Tabelle aller aktiven Personen (Name, Vorname, Qualifikationen als Badges)
**And** archivierte Personen sind ausgeblendet (Toggle verfügbar)

**AC2: Neue Person anlegen**
**Given** ich bin auf der Personenverwaltungsseite
**When** ich "Neue Person" klicke und Formular ausfülle (Vorname, Nachname, Personalnummer, FunkkenungBOS, Qualifikationen Multi-Select)
**Then** wird Person mit M:N-Qualifikations-Relation gespeichert
**And** Toast zeigt "Person angelegt" (<200ms)

**AC3: Person bearbeiten**
**Given** eine Person existiert
**When** ich "Bearbeiten" klicke und Qualifikationen hinzufüge/entferne
**Then** wird M:N-Relation korrekt aktualisiert
**And** updatedAt, updatedBy werden gesetzt

**AC4: Person archivieren**
**Given** eine Person ist aktiv
**When** ich "Archivieren" klicke und bestätige
**Then** wird archivedAt, archivedBy gesetzt

**AC5: Qualifikationen Multi-Select**
**Given** ich bearbeite eine Person
**When** ich im Multi-Select Qualifikationen auswähle
**Then** wird Vorschau sofort aktualisiert
**And** beim Speichern wird Junction-Table `StammPersonQualifikation` aktualisiert

**AC6: Validierung**
**Given** ich fülle das Formular aus
**When** Pflichtfelder fehlen (Vorname, Nachname)
**Then** sehe ich inline Validierungsfehler

**AC7: Authorization**
**Given** ich bin nicht als Admin eingeloggt
**When** ich auf Personenverwaltung zugreife
**Then** erhalte ich 403 Forbidden

**Technische Notes:**
- **Backend:** Prisma `StammPerson` (vorname, nachname, personalnummer, funkkenungBOS, Audit-Trail) + `StammPersonQualifikation` (M:N Junction), DI Token `DI_TOKENS.REPOSITORIES.STAMM_PERSON`, API `/api/admin/stammdaten/personen`
- **Frontend:** Route `/admin/stammdaten/personen`, Multi-Select mit Headless UI Listbox (multiple), Qualifikations-Badges als Atoms

---

## Epic 3: Fahrzeug-Einsatz-Verwaltung 🚑

**Goal:** Sandra (FüKw) kann Fahrzeuge aus Stammdaten erfassen, temporäre Fahrzeuge anlegen, FMS-Status updaten – alles wird automatisch im ETB dokumentiert.

---

### Story 3.1: Fahrzeug aus Stammdaten erfassen

**Als** FüKw (Sandra),
**möchte ich** ein Fahrzeug aus den Stammdaten für den aktuellen Einsatz erfassen,
**damit** ich schnell einsatzbereite Fahrzeuge dokumentieren kann und die Daten automatisch im ETB erscheinen.

**Acceptance Criteria:**

**AC1: Stammdaten-Fahrzeug auswählen**
**Given** ich bin auf der Einsatz-Detail-Seite eines aktiven Einsatzes
**When** ich den "Fahrzeug hinzufügen"-Dialog öffne
**Then** sehe ich eine durchsuchbare Liste aller Stamm-Fahrzeuge (Funkrufname + Kennzeichen)

**AC2: Fahrzeug erfassen mit Snapshot**
**Given** ich habe ein Stammdaten-Fahrzeug ausgewählt
**When** ich "Fahrzeug erfassen" klicke
**Then** wird ein `EinsatzFahrzeug` mit Kopie der Stammdaten erstellt (stammId gesetzt)
**And** initialer FMS-Status ist "2 - Einsatzbereit"
**And** Domain Event `FahrzeugErfasst` wird emittiert
**And** ETB-Eintrag wird automatisch erstellt

**AC3: Atomare Event-Persistierung**
**Given** die Erfassung wird durchgeführt
**When** ein Fehler nach Entity-Persistierung auftritt
**Then** wird auch das Domain Event NICHT in der Outbox gespeichert (Rollback)

**AC4: UI Feedback**
**Given** die Erfassung war erfolgreich
**When** die Response zurückkommt
**Then** erscheint das Fahrzeug sofort in der Liste
**And** Erfolgs-Toast zeigt "Fahrzeug erfasst"

**Technische Notes:**
- **Backend:** Command `ErfasseFahrzeugAusStammdatenCommand`, Handler `extends TransactionalCommandHandler`, Domain Event `FahrzeugErfasst`, EtbAutoCreationHandler subscribt auf Event
- **Frontend:** Dialog mit Combobox für Stammdaten-Suche, Hook `useFahrzeugErfassen()`, API `/api/einsatz/{id}/kraefte/fahrzeuge`

---

### Story 3.2: Temporäres Fahrzeug anlegen

**Als** FüKw (Sandra),
**möchte ich** ein Fahrzeug anlegen, das nicht in den Stammdaten existiert (z.B. Nachbarfeuerwehr),
**damit** ich auch externe Einheiten dokumentieren kann.

**Acceptance Criteria:**

**AC1: Temporär-Formular**
**Given** ich bin im "Fahrzeug hinzufügen"-Dialog
**When** ich "Temporäres Fahrzeug" Tab wähle
**Then** sehe ich Formular: Funkrufname (required), Kennzeichen, Fahrzeugtyp (required)

**AC2: Fahrzeug ohne stammId erstellen**
**Given** ich habe Pflichtfelder ausgefüllt
**When** ich "Erfassen" klicke
**Then** wird `EinsatzFahrzeug` OHNE stammId erstellt
**And** Domain Event `FahrzeugErfasst` (mit temporaryFlag) wird emittiert
**And** ETB-Eintrag: "Temporäres Fahrzeug {funkrufname} erfasst"

**AC3: Duplikat-Validierung**
**Given** ich erfasse ein temporäres Fahrzeug
**When** im Einsatz bereits ein Fahrzeug mit gleichem Funkrufname existiert
**Then** erhalte ich Validierungsfehler

**AC4: Temporär-Badge in UI**
**Given** ich sehe die Fahrzeug-Liste
**When** ein Fahrzeug ohne stammId vorhanden ist
**Then** wird "Temporär"-Badge angezeigt (bg-gray-100)

**Technische Notes:**
- **Backend:** Command `ErfasseTemporaerenFahrzeugCommand`, Unique constraint (einsatzId, funkrufname)
- **Frontend:** TanStack Form mit Zod Schema, Tab-basierter Dialog

---

### Story 3.3: FMS-Status updaten

**Als** FüKw (Sandra),
**möchte ich** den FMS-Status eines Fahrzeugs ändern (z.B. "3 - Ausgerückt" → "4 - Am Einsatzort"),
**damit** Statuswechsel automatisch im ETB dokumentiert werden.

**Acceptance Criteria:**

**AC1: Status-Dropdown**
**Given** ich sehe die Fahrzeug-Liste
**When** ich auf den FMS-Status eines Fahrzeugs klicke
**Then** öffnet sich Dropdown mit Status 0-9 (Label + Farbe)

**AC2: Status ändern mit Event**
**Given** ich wähle einen neuen Status
**When** ich bestätige
**Then** wird Status sofort aktualisiert (optimistic update)
**And** Domain Event `FahrzeugStatusGeaendert` wird emittiert
**And** ETB-Eintrag: "Fahrzeug {funkrufname} Status: {alt} → {neu}"

**AC3: Atomare Persistierung**
**Given** Status-Änderung wird durchgeführt
**When** erfolgreich
**Then** wird Event atomar in Outbox geschrieben

**AC4: Status-Farben**
**Given** Fahrzeug hat FMS-Status
**When** ich die Liste sehe
**Then** wird Status farbcodiert angezeigt:
- 0-1: grau, 2: grün, 3: blau, 4: gelb, 5: orange, 6-9: lila

**AC5: Status-Historie Tooltip**
**Given** ich hovere über Status-Indikator
**When** Tooltip erscheint
**Then** zeigt letzte 3 Statuswechsel (aus ETB)

**Technische Notes:**
- **Backend:** Command `AendereFahrzeugStatusCommand`, Event `FahrzeugStatusGeaendert`, Enum `FmsStatus` 0-9
- **Frontend:** Headless UI Listbox, optimistic updates, Tailwind Farben

---

## Epic 4: Helfer-Registrierung 📱

**Goal:** Sandra (FüKw) kann Helfer per QR-Code in <3s erfassen – mit automatischem DB-Lookup, DRK-App-Format-Support und Auto-ETB.

---

### Story 4.1: Person manuell registrieren

**Als** FüKw (Sandra),
**möchte ich** eine Person manuell für den Einsatz registrieren,
**damit** ich auch bei defektem Scanner alle Helfer erfassen kann.

**Acceptance Criteria:**

**AC1: Manuelles Formular**
**Given** ich bin auf der Einsatz-Detail-Seite
**When** ich "Person hinzufügen" → "Manuell" klicke
**Then** öffnet sich Formular: Vorname, Nachname (required), Funktion (required), Qualifikationen (multi-select)

**AC2: Stammdaten-Autocomplete**
**Given** ich tippe im Nachname-Feld
**When** min. 1 Zeichen eingegeben (mit 300ms Debounce)
**Then** erscheinen Autocomplete-Vorschläge aus Stammdaten (max. 10 Treffer)
**And** bei Auswahl werden Felder automatisch ausgefüllt

**AC3: Registrierung mit/ohne Stammdaten**
**Given** ich habe Pflichtfelder ausgefüllt
**When** ich "Registrieren" klicke
**Then** wird `EinsatzPerson` erstellt (stammId gesetzt wenn aus Autocomplete)
**And** Domain Event `PersonRegistriert` wird emittiert
**And** ETB-Eintrag erstellt

**AC4: UI Feedback**
**Given** Registrierung erfolgreich
**When** Response zurückkommt
**Then** Person erscheint in Liste, Toast zeigt "Person registriert"

**Technische Notes:**
- **Backend:** Command `RegistrierePersonCommand`, Event `PersonRegistriert`, Stammdaten-Lookup
- **Frontend:** Headless UI Combobox für Autocomplete, debounced Query

---

### Story 4.2: Person via QR-Code registrieren

**Als** FüKw (Sandra),
**möchte ich** eine Person durch Scannen ihres DRK-App QR-Codes in <3s registrieren,
**damit** ich eine schnelle Helfer-Erfassung ohne Tippfehler habe.

**Acceptance Criteria:**

**AC1: QR-Scanner öffnen**
**Given** ich bin auf der Einsatz-Detail-Seite
**When** ich "Person hinzufügen" → "QR-Code scannen" klicke
**Then** öffnet sich Kamera (Tauri Native / Browser getUserMedia)

**AC2: DRK-Format dekodieren**
**Given** Scanner ist aktiv
**When** ich DRK-App QR-Code scanne
**Then** wird Code automatisch erkannt
**And** Format `drk://person?mnr=...&vn=...&nn=...` wird dekodiert

**AC3: Stammdaten-Lookup via Mitgliedsnummer**
**Given** QR mit Mitgliedsnummer dekodiert
**When** Backend-Lookup durchgeführt
**Then** wird stammId gesetzt bei Treffer, sonst temporäre Person

**AC4: Automatische Registrierung**
**Given** gültiger QR dekodiert
**When** Lookup abgeschlossen
**Then** wird Person AUTOMATISCH registriert (kein Button-Klick)
**And** Scanner schließt sich
**And** Toast: "Person via QR registriert"

**AC5: Performance <3s (NFR3)**
**Given** QR wird gescannt
**When** ich Zeit messe bis Toast
**Then** Gesamtdauer <3 Sekunden

**AC6: Fehlerbehandlung ungültiger QR**
**Given** ich scanne QR-Code
**When** Format nicht DRK-konform
**Then** Warning: "Ungültiger QR-Code", Scanner bleibt aktiv

**Technische Notes:**
- **Backend:** Command `RegistrierePersonViaQrCodeCommand`, Index auf `mitgliedsnummer` für schnellen Lookup
- **Frontend:** Tauri Plugin `tauri-plugin-barcode-scanner` + Fallback `html5-qrcode`, Custom Parser für DRK-Format

---

### Story 4.3: Person zu Fahrzeug zuweisen

**Als** FüKw (Sandra),
**möchte ich** eine registrierte Person einem Fahrzeug zuweisen,
**damit** ich nachverfolgen kann, welche Helfer in welchem Fahrzeug sind.

**Acceptance Criteria:**

**AC1: Zuweisung in Personen-Liste**
**Given** ich sehe registrierte Personen
**When** ich auf Fahrzeug-Icon neben Person klicke
**Then** öffnet sich Dropdown mit erfassten Fahrzeugen

**AC2: Fahrzeug zuweisen**
**Given** ich wähle ein Fahrzeug
**When** ich bestätige
**Then** wird `fahrzeugId` in `EinsatzPerson` gesetzt
**And** Domain Event `PersonZuFahrzeugZugewiesen` wird emittiert
**And** ETB-Eintrag: "Person zu Fahrzeug zugewiesen"

**AC3: Zuweisung aufheben**
**Given** Person ist einem Fahrzeug zugewiesen
**When** ich "Zuweisung aufheben" wähle
**Then** wird `fahrzeugId` NULL gesetzt
**And** Event `PersonVonFahrzeugEntfernt` emittiert

**AC4: UI Personen-Liste**
**Given** Person ist zugewiesen
**When** ich Liste sehe
**Then** Badge mit Funkrufname erscheint neben Person

**AC5: UI Fahrzeug-Liste**
**Given** Fahrzeug hat zugewiesene Personen
**When** ich Liste sehe
**Then** kompakte Personen-Liste unter Fahrzeug (max. 3 + "X weitere")

**Technische Notes:**
- **Backend:** Commands `WeisePersonZuFahrzeugZuCommand`, `EntfernePersonVonFahrzeugCommand`, Validation: Fahrzeug muss im gleichen Einsatz sein
- **Frontend:** Headless UI Listbox, Query invalidation für beide Listen

---

## Epic 5: Rollen & Führung 👔

**Goal:** Sandra (FüKw) kann Führungsrollen (LNA, OrgL, Leiter BHP) besetzen/freigeben – mit Qualifikationsvalidierung und Auto-ETB.

---

### Story 5.1: Rolle besetzen mit Qualifikationsvalidierung

**Als** FüKw (Sandra),
**möchte ich** Führungsrollen (LNA, OrgL, Leiter BHP) mit qualifizierten Personen besetzen,
**damit** nur geeignete Personen Führungsaufgaben übernehmen und ETBs automatisch aktualisiert werden.

**Acceptance Criteria:**

**AC1: Rollenauswahl mit Qualifikationsfilter**
**Given** ich bin im Einsatz-Detail-Dialog
**When** ich auf "Rolle besetzen" klicke und eine Rolle (LNA/OrgL/Leiter BHP) auswähle
**Then** sehe ich nur Personen mit passender Qualifikation (aus `kräfte.qualifikationen`) zur Auswahl

**AC2: Qualifikationswarnung bei fehlender Berechtigung**
**Given** ich versuche eine Person ohne passende Qualifikation auszuwählen
**When** ich die Auswahl bestätige
**Then** erscheint eine Warnung "Person nicht qualifiziert für diese Rolle" und die Auswahl wird blockiert

**AC3: Automatische ETB-Aktualisierung bei Rollenbesetzung**
**Given** ich besetze die Rolle "LNA" mit Person A
**When** die Besetzung gespeichert wird
**Then** wird der ETB der Person automatisch aktualisiert (von "Eingesetzt" → "Eingesetzt (LNA)")
**And** die Rolle erscheint in der Kräfte-Übersicht und im Dashboard

**AC4: Nur eine Person pro Rolle**
**Given** die Rolle "OrgL" ist bereits besetzt
**When** ich versuche eine zweite Person als OrgL zu besetzen
**Then** erscheint die Meldung "Rolle bereits besetzt. Vorherige Besetzung wird aufgehoben"
**And** die alte Besetzung wird automatisch freigegeben

**Technische Notes:**
- **Backend:** `AssignRolleCommand` (Application Layer), `validateQualifikation()` (Domain Service), Outbox-Event `RolleBesetzt`
- **Frontend:** `useAssignRolle()` Hook, Dropdown mit Filter `qualifikationen.includes(requiredQual)`, Combobox (Headless UI)

---

### Story 5.2: Rolle freigeben

**Als** FüKw (Sandra),
**möchte ich** besetzte Führungsrollen wieder freigeben,
**damit** Personen wieder als reguläre Einsatzkräfte verfügbar sind.

**Acceptance Criteria:**

**AC1: Rolle freigeben mit Bestätigung**
**Given** eine Rolle (LNA/OrgL/Leiter BHP) ist besetzt
**When** ich auf "Rolle freigeben" klicke und bestätige
**Then** wird die Rolle entfernt und der ETB der Person zurückgesetzt (z.B. "Eingesetzt (LNA)" → "Eingesetzt")

**AC2: ETB-Status bleibt erhalten**
**Given** die Person war vor Rollenbesetzung "Eingesetzt"
**When** ich die Rolle freigebe
**Then** bleibt der Basis-ETB "Eingesetzt" erhalten (kein Wechsel zu "Verfügbar")

**AC3: Rolle verschwindet aus Übersicht**
**Given** die Rolle "OrgL" wurde freigegeben
**When** ich das Kräfte-Dashboard öffne
**Then** ist die Rolle nicht mehr als besetzt markiert

**Technische Notes:**
- **Backend:** `ReleaseRolleCommand` (Application Layer), Outbox-Event `RolleFreigegeben`
- **Frontend:** `useReleaseRolle()` Hook, Confirmation Dialog (Headless UI)

---

## Epic 6: Taktische Übersicht 📊

**Goal:** Thomas (Einsatzleiter) sieht auf einen Blick: Taktische Stärke (2/4/18/24), alle Fahrzeuge mit Status, Rollenbesetzung – in FullScreen oder Compact-Modus.

---

### Story 6.1a: Taktische Stärke-Anzeige

**Als** Einsatzleiter (Thomas),
**möchte ich** die taktische Stärke (Führung/Unterführung/Mannschaft/Gesamt) sehen,
**damit** ich schnell die verfügbare Kapazität einschätzen kann.

**Acceptance Criteria:**

**AC1: Stärke-Berechnung**
**Given** ein Einsatz hat 3 Fahrzeuge mit insgesamt 12 Personen (davon 8 Helfer, 3 Führer, 1 ohne Status)
**When** ich das Dashboard öffne
**Then** sehe ich "2/3/8/11" (Führung/Unterführung/Mannschaft/Gesamt)
**And** Berechnung dauert <500ms (NFR5)

**AC2: Stärke-Card Design**
**Given** ich bin auf dem Dashboard
**When** ich die Stärke-Card sehe
**Then** sind die Zahlen prominent dargestellt (min. 24px font)
**And** Kategorien sind farblich unterschieden (Führung=blau, Unterführung=grün, Mannschaft=grau)

**AC3: Auto-Update bei Änderungen**
**Given** eine Person wird einem Fahrzeug zugewiesen
**When** die Mutation erfolgreich ist
**Then** wird die Stärke automatisch neu berechnet (Query Invalidation)

**Technische Notes:**
- **Backend:** `GetTaktischeStaerkeQuery` (CQRS Read Model), aggregiert Personen nach Funktion
- **Frontend:** `useTaktischeStaerke()` Hook, `<StaerkeCard />` Komponente
- **Aufwand:** ~2-3 Tage

---

### Story 6.1b: Fahrzeug-Status Liste

**Als** Einsatzleiter (Thomas),
**möchte ich** alle Fahrzeuge mit aktuellem FMS-Status sehen,
**damit** ich die Einsatzbereitschaft der Flotte überblicken kann.

**Acceptance Criteria:**

**AC1: Fahrzeug-Liste anzeigen**
**Given** ein Einsatz hat 5 erfasste Fahrzeuge
**When** ich das Dashboard öffne
**Then** sehe ich alle Fahrzeuge mit Funkrufname, Typ und FMS-Status

**AC2: Status-Farb-Kodierung**
**Given** Fahrzeug "HLF 20" hat Status "2 - Einsatzbereit", "MTW 1" hat Status "4 - Am Einsatzort"
**When** ich die Liste sehe
**Then** wird Status farbcodiert angezeigt (2=grün, 4=gelb, etc.)

**AC3: Fahrzeug-Detail Dialog**
**Given** ich sehe die Fahrzeug-Liste
**When** ich auf ein Fahrzeug klicke
**Then** öffnet sich ein Detail-Dialog mit Besatzung und Status-Historie

**AC4: Besatzungs-Preview**
**Given** ein Fahrzeug hat 4 zugewiesene Personen
**When** ich die Liste sehe
**Then** zeigt ein Badge "4 Personen" unter dem Fahrzeug

**Technische Notes:**
- **Backend:** `GetEinsatzFahrzeugeQuery` mit Besatzungs-Count
- **Frontend:** `useEinsatzFahrzeuge()` Hook, `<FahrzeugListe />` + `<FahrzeugDetailDialog />` Komponenten
- **Aufwand:** ~2-3 Tage

---

### Story 6.1c: Rollen-Übersicht

**Als** Einsatzleiter (Thomas),
**möchte ich** die Besetzung der Führungsrollen (LNA, OrgL, Leiter BHP) sehen,
**damit** ich weiß, ob alle kritischen Positionen besetzt sind.

**Acceptance Criteria:**

**AC1: Rollen-Status anzeigen**
**Given** LNA und OrgL sind besetzt, Leiter BHP ist frei
**When** ich das Dashboard öffne
**Then** sehe ich "LNA: Max Mustermann ✓", "OrgL: Anna Schmidt ✓", "Leiter BHP: Unbesetzt"

**AC2: Unbesetzte Rollen hervorheben**
**Given** eine Rolle ist unbesetzt
**When** ich die Rollen-Übersicht sehe
**Then** wird sie mit rotem Badge "Unbesetzt" markiert

**AC3: Rollen-Zuweisung Schnellzugriff**
**Given** ich sehe eine unbesetzte Rolle
**When** ich auf "Zuweisen" klicke
**Then** öffnet sich der Rollen-Zuweisungs-Dialog (aus Epic 5)

**AC4: Qualifikations-Info**
**Given** eine Rolle ist besetzt
**When** ich hovere
**Then** sehe ich Tooltip mit Qualifikationen der Person

**Technische Notes:**
- **Backend:** `GetRollenbesetzungQuery` mit Person-Details
- **Frontend:** `useRollenbesetzung()` Hook, `<RollenUebersicht />` Komponente
- **Aufwand:** ~2-3 Tage

---

### Story 6.1d: Dashboard Container & Layout

**Als** Einsatzleiter (Thomas),
**möchte ich** alle Kräfte-Informationen in einem übersichtlichen Dashboard sehen,
**damit** ich mit einem Blick die Gesamtsituation erfasse.

**Acceptance Criteria:**

**AC1: Dashboard Layout**
**Given** ich öffne das Kräfte-Dashboard
**When** die Seite lädt
**Then** sehe ich ein Grid-Layout mit:
- Stärke-Card (oben links)
- Fahrzeug-Liste (oben rechts)
- Rollen-Übersicht (unten)

**AC2: Performance <2s**
**Given** ein Einsatz mit 20 Fahrzeugen und 80 Personen
**When** ich das Dashboard öffne
**Then** lädt die gesamte Ansicht in <2s (NFR1)

**AC3: Responsive Layout**
**Given** ich öffne das Dashboard auf einem Tablet
**When** die Seite rendert
**Then** stacken die Cards vertikal (Mobile-First)

**Technische Notes:**
- **Backend:** `GetKraefteDashboardQuery` als Aggregat-Query (kombiniert 6.1a-c)
- **Frontend:** `useKraefteDashboard()` Hook, `<KraefteDashboard />` Container-Komponente
- **Aufwand:** ~1-2 Tage

---

### Story 6.2: FullScreen & Compact Modus

**Als** Einsatzleiter (Thomas),
**möchte ich** zwischen FullScreen (Beamer) und Compact (Tablet) wechseln,
**damit** ich das Dashboard situationsgerecht anzeigen kann.

**Acceptance Criteria:**

**AC1: FullScreen-Modus für Beamer**
**Given** ich bin im Dashboard
**When** ich auf "FullScreen" klicke
**Then** wird das Dashboard im Vollbild-Modus angezeigt (3m lesbar, NFR19)
**And** Schriftgröße min. 32px für Stärke-Zahlen, 24px für Fahrzeugnamen

**AC2: Compact-Modus für Tablet**
**Given** ich bin im FullScreen-Modus
**When** ich auf "Compact" klicke
**Then** wird das Dashboard in kompakter Tablet-Ansicht angezeigt (NFR20)
**And** Touch-Targets min. 44x44px

**AC3: Auto-Refresh alle 30s**
**Given** ich bin im FullScreen-Modus
**When** 30 Sekunden vergehen
**Then** wird das Dashboard automatisch aktualisiert (TanStack Query `refetchInterval: 30000`)

**AC4: Exit-Button in FullScreen**
**Given** ich bin im FullScreen-Modus
**When** ich ESC drücke oder auf "Exit" klicke
**Then** kehre ich zur Normal-Ansicht zurück

**AC5: Density-Modi Toggle**
**Given** ich bin im Dashboard (Compact oder FullScreen)
**When** ich den Density-Toggle klicke
**Then** wechselt das Layout zwischen:
- **Compact:** `gap-2`, `p-2`, `text-sm` (optimiert für Maus/Keyboard)
- **FullScreen:** `gap-6`, `p-6`, `text-xl+` (optimiert für Beamer/Distanz)
**And** die Einstellung wird im LocalStorage persistiert

**Technische Notes:**
- **Backend:** Keine Änderung (nutzt gleiche Query wie Story 6.1)
- **Frontend:** `useFullscreen()` Hook (Browser Fullscreen API), `useDensity()` Hook für Density-State (LocalStorage), Tailwind Density-Varianten (`compact:` / `fullscreen:` Custom Variants oder Context-basiert)

---

## Epic 7: HiOrg-Server Integration 🔄

**Goal:** Maria (Admin) kann Personaldaten aus HiOrg-Server importieren – mit Vorschau, Auswahl und automatischem Qualifikations-Mapping.

---

### Story 7.1: HiOrg-Server Verbindung & Synchronisation

**Als** Admin (Maria),
**möchte ich** Personaldaten aus HiOrg-Server importieren,
**damit** ich nicht alle Personen manuell anlegen muss.

**Acceptance Criteria:**

**AC1: HiOrg-Server Credentials konfigurieren**
**Given** ich bin in den System-Einstellungen
**When** ich HiOrg-Server URL, Username, Passwort eingebe und auf "Verbindung testen" klicke
**Then** wird die Verbindung validiert und Status "Verbunden ✓" angezeigt
**Or** bei Fehler erscheint "Verbindung fehlgeschlagen: [Fehlergrund]"

**AC2: Personen-Import starten**
**Given** HiOrg-Server ist verbunden
**When** ich auf "Personen synchronisieren" klicke
**Then** werden alle Personen aus HiOrg-Server geladen (mit Name, Vorname, Qualifikationen)
**And** ich sehe eine Vorschau mit Anzahl "42 Personen gefunden"

**AC3: Automatische Duplikatserkennung**
**Given** Person "Max Mustermann" existiert bereits in Bluelight Hub
**When** der Import läuft
**Then** wird die Person als "Bereits vorhanden (wird aktualisiert)" markiert
**And** vorhandene Daten werden überschrieben (mit Bestätigung)

**AC4: Credentials verschlüsselt speichern (Security)**
**Given** ich speichere HiOrg-Server Credentials
**When** die Daten in der DB persistiert werden
**Then** wird das Passwort mit AES-256 verschlüsselt gespeichert (Encryption Key aus ENV)
**And** URL und Username werden im Klartext gespeichert
**And** das Passwort wird NIEMALS in Logs oder API-Responses zurückgegeben

**AC5: Credentials nur für Admins zugänglich**
**Given** ein normaler User versucht auf `/api/admin/integrations/hiorg` zuzugreifen
**When** der Request ohne Admin-Rolle gesendet wird
**Then** antwortet das Backend mit 403 Forbidden

**Technische Notes:**
- **Backend:** `HiOrgSyncService` (Infrastructure Layer), HTTP Client zu HiOrg-Server API, `SyncPersonsCommand` (Application Layer)
- **Security:** `IntegrationCredentials` Entity mit `encryptedPassword` Feld, `EncryptionService` für AES-256, Env-Variable `INTEGRATION_ENCRYPTION_KEY`
- **Frontend:** `useHiOrgSync()` Hook, Credentials-Form mit Zod-Validierung, Progress-Indicator, Passwort-Feld zeigt nur "••••••••" bei bestehendem Credential

---

### Story 7.2: Import-Auswahl & Qualifikations-Mapping

**Als** Admin (Maria),
**möchte ich** vor dem Import auswählen, welche Personen importiert werden,
**damit** ich nur relevante Personen übernehme.

**Acceptance Criteria:**

**AC1: Selektiver Import mit Checkbox-Liste**
**Given** ich sehe die Import-Vorschau mit 42 Personen
**When** ich Personen selektiere (Checkbox-Liste mit "Alle auswählen")
**Then** kann ich nur die ausgewählten Personen importieren (Button "23 Personen importieren")

**AC2: Qualifikations-Mapping konfigurieren**
**Given** HiOrg-Server nutzt andere Qualifikations-Namen ("Gruppenführer" statt "GrFü")
**When** ich auf "Mapping konfigurieren" klicke
**Then** sehe ich eine Mapping-Tabelle ("Gruppenführer" → "GrFü", "Truppführer" → "TrFü")
**And** kann Custom-Mappings speichern

**AC3: Import-Log mit Fehlerbehandlung**
**Given** der Import läuft
**When** 3 Personen fehlschlagen (z.B. ungültige Qualifikation)
**Then** sehe ich ein Log "39/42 erfolgreich, 3 Fehler" mit Details pro fehlgeschlagener Person

**AC4: Automatischer Qualifikations-Import**
**Given** Person "Anna Schmidt" hat in HiOrg-Server Qualifikationen ["GrFü", "SanA"]
**When** der Import abgeschlossen ist
**Then** hat Anna in Bluelight Hub die gleichen Qualifikationen (nach Mapping)

**Technische Notes:**
- **Backend:** `ImportSelectedPersonsCommand` (Application Layer), `QualifikationMappingService` (Domain Service), Outbox-Event `PersonenImportiert`
- **Frontend:** `useImportPersons()` Hook, Checkbox-List (Headless UI), Mapping-Table mit Editable Cells

---

## Epic 8: Lagekarte-Integration 🗺️

**Goal:** Alle können Kräfte als POIs auf der Lagekarte sehen – synchronisiert mit dem bestehenden Lagekarte-Modul.

---

### Story 8.1: Fahrzeuge als POIs auf Lagekarte

**Als** Einsatzleiter,
**möchte ich** alle Fahrzeuge als Points of Interest auf der Lagekarte sehen,
**damit** ich die räumliche Verteilung der Kräfte erkenne.

**Acceptance Criteria:**

**AC1: Fahrzeuge als POIs exportieren**
**Given** ein Einsatz hat 5 Fahrzeuge mit GPS-Koordinaten
**When** das Lagekarte-Modul POIs abfragt (`GET /api/kräfte/pois?einsatzId=xyz`)
**Then** werden alle Fahrzeuge als POIs zurückgegeben (GeoJSON Format)
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": { "type": "Point", "coordinates": [7.123, 51.456] },
    "properties": {
      "id": "fzg-123",
      "name": "HLF 20",
      "status": "Eingesetzt",
      "stärke": "1/2/6"
    }
  }]
}
```

**AC2: POI-Icons nach Status färben**
**Given** Fahrzeug "HLF 20" hat Status "Eingesetzt", "MTW 1" hat Status "Eingerückt"
**When** die Lagekarte POIs rendert
**Then** werden Icons farbcodiert (gelb/grün) und zeigen Fahrzeugtyp-Symbol

**AC3: POI-Click öffnet Fahrzeug-Details**
**Given** ich klicke auf POI "HLF 20" auf der Karte
**When** der Click-Event ausgelöst wird
**Then** öffnet sich ein Popup mit Fahrzeug-Details (Status, Stärke, Besatzung)
**And** ein Link "Zum Fahrzeug" führt zum Detail-Dialog

**AC4: Realtime-Update via Polling (Phase 1)**
**Given** Fahrzeug "HLF 20" ändert Status von "Eingesetzt" → "Eingerückt"
**When** der TanStack Query Refetch-Interval (30s) triggert
**Then** wird der POI auf der Karte aktualisiert (Farbe wechselt zu grün)

**AC5: (Optional Phase 2) Realtime-Update via WebSocket**
**Given** WebSocket-Gateway ist implementiert (separates Epic)
**When** das WebSocket-Event `fahrzeug.status.changed` empfangen wird
**Then** wird der POI auf der Karte sofort aktualisiert (<1s)
**Note:** WebSocket-Integration ist ein separates Infrastruktur-Epic und nicht Teil dieser Story

**Technische Notes:**
- **Backend:** `GetKraeftePoisQuery` (CQRS Read Model), GeoJSON-Serialisierung
- **Phase 1:** Polling via TanStack Query `refetchInterval: 30000` – funktioniert ohne zusätzliche Infrastruktur
- **Phase 2 (Future):** `OutboxEventProcessor` → WebSocket Gateway → Client Subscription (separates Epic für Realtime-Infrastruktur)
- **Frontend:** Integration mit bestehendem Lagekarte-Modul (Leaflet/MapLibre), `useKraeftePois()` Hook mit `refetchInterval`, Custom POI-Icons (SVG)

---

## Epic 0: Technical Foundation 🔧 [TECHNICAL]

**Kontext:** Diese Stories adressieren die im Test Design identifizierten kritischen Risiken (Score=9). Sie sind **Blocker** für alle Feature-Epics und müssen vor Epic 1 abgeschlossen werden.

**Typ:** TECHNICAL EPIC - Keine direkten User-Features, ermöglicht sichere Feature-Entwicklung.

**Referenz:** `docs/test-design-kraeftemanagement.md`, `docs/mitigation-plan-kritische-risiken.md`

**Blocks:** Epic 1, Epic 2, Epic 3, Epic 4, Epic 5, Epic 6, Epic 7, Epic 8
**Required before:** Jede user-facing Feature-Implementierung

---

### Story S0.1: AdminJwtAuthGuard implementieren (R-E1-001)

**Als** Security-verantwortlicher Entwickler,
**möchte ich** einen AdminJwtAuthGuard implementieren,
**damit** Admin-Endpoints nur für autorisierte Administratoren zugänglich sind.

**Risiko-Referenz:** R-E1-001 (Score: 9, Kategorie: SEC)
**FRs covered:** NFR9 (Admin-Funktionen nur für autorisierte Benutzer)

**Acceptance Criteria:**

**AC1: AdminJwtAuthGuard erbt von JwtAuthGuard**
**Given** JwtAuthGuard existiert im Projekt
**When** ich AdminJwtAuthGuard implementiere
**Then** erbt er von JwtAuthGuard und erweitert die Logik um Rollen-Check
**And** der Guard ist in `packages/backend/src/common/guards/admin-jwt-auth.guard.ts` definiert

**AC2: Guard prüft ADMIN-Rolle**
**Given** ein authentifizierter User mit Rolle "USER"
**When** er einen Admin-Endpoint aufruft (z.B. `POST /api/admin/kraefte/qualifikationen`)
**Then** erhält er HTTP 403 Forbidden mit Nachricht "Admin-Rechte erforderlich"
**And** der Audit-Log enthält den fehlgeschlagenen Zugriffsversuch

**AC3: Guard erlaubt ADMIN-Rolle**
**Given** ein authentifizierter User mit Rolle "ADMIN"
**When** er einen Admin-Endpoint aufruft
**Then** wird der Request durchgelassen
**And** `request.user` enthält die Benutzer-Informationen

**AC4: Guard angewendet auf alle Admin-Controller**
**Given** AdminJwtAuthGuard ist implementiert
**When** ich die Admin-Controller prüfe
**Then** haben alle Controller unter `/api/admin/*` den `@UseGuards(AdminJwtAuthGuard)` Decorator
**And** kein Admin-Endpoint ist ohne Guard erreichbar

**AC5: Unit Tests für Guard**
**Given** AdminJwtAuthGuard ist implementiert
**When** ich die Tests ausführe
**Then** existieren Tests für:
- Zugriff mit ADMIN-Rolle → erlaubt
- Zugriff mit USER-Rolle → 403
- Zugriff ohne Authentifizierung → 401
- Zugriff mit SUPER_ADMIN-Rolle → erlaubt

**AC6: Integration Tests für Admin-Endpoints**
**Given** Guard ist auf Controller angewendet
**When** ich Integration Tests ausführe
**Then** verifizieren die Tests:
```typescript
// Unauthorized
await request(app).post('/api/admin/kraefte/qualifikationen').expect(401);

// Forbidden (USER)
await request(app)
  .post('/api/admin/kraefte/qualifikationen')
  .set('Cookie', userCookie)
  .expect(403);

// Success (ADMIN)
await request(app)
  .post('/api/admin/kraefte/qualifikationen')
  .set('Cookie', adminCookie)
  .send({ name: 'Test' })
  .expect(201);
```

**Technische Notes:**
- **Backend:** Guard in `packages/backend/src/common/guards/admin-jwt-auth.guard.ts`
- **Pattern:** Decorator `@UseGuards(AdminJwtAuthGuard)` auf Controller-Klasse (nicht einzelne Methoden)
- **Rollen:** ADMIN und SUPER_ADMIN haben Zugriff, USER nicht
- **Test-Coverage:** TC-P0-001, TC-P0-002 aus Test Design
- **Aufwand:** ~4h

---

### Story S0.2: UNIQUE Constraint für Rollenbesetzung (R-E5-002)

**Als** Datenbank-Administrator,
**möchte ich** einen UNIQUE Constraint für Rollenbesetzungen implementieren,
**damit** keine Race Conditions zu doppelten Rollenbesetzungen führen können.

**Risiko-Referenz:** R-E5-002 (Score: 9, Kategorie: DATA)
**FRs covered:** FR11, FR12 (Rollen zuweisen/freigeben)

**Acceptance Criteria:**

**AC1: Prisma Migration für UNIQUE Constraint**
**Given** das bestehende EinsatzRollenbesetzung Model
**When** ich eine Migration erstelle
**Then** wird folgender Constraint hinzugefügt:
```prisma
@@unique([einsatzId, rollenDefinitionId], name: "unique_rolle_per_einsatz")
```
**And** die Migration heißt `add_unique_rolle_constraint`

**AC2: Upsert Pattern im Handler**
**Given** zwei parallele Requests versuchen die gleiche Rolle zu besetzen
**When** BesetzeRolleHandler beide Requests verarbeitet
**Then** wird Prisma Upsert verwendet (create OR update)
**And** genau ein Datensatz existiert in der Datenbank
**And** der letzte Request "gewinnt" (last-write-wins)

**AC3: Concurrent Request Test**
**Given** ein Einsatz mit einer LNA-Rolle (unbesetzt)
**When** 10 parallele Requests versuchen verschiedene Personen als LNA zuzuweisen
**Then** existiert am Ende genau 1 Eintrag für diese Rolle
**And** keine DuplicateKeyError Exceptions werden geworfen

**AC4: Frontend optimistisches Update**
**Given** User A und User B besetzen gleichzeitig die gleiche Rolle
**When** User A's Request zuerst ankommt
**Then** sieht User A sofort sein Update (optimistic)
**When** User B's Request überschreibt
**Then** sieht User A nach Query-Invalidierung User B's Zuweisung
**And** ein Toast informiert über "Rolle wurde zwischenzeitlich geändert"

**AC5: ETB-Eintrag für jeden Wechsel**
**Given** Person A besetzt LNA-Rolle
**When** Person B überschreibt via Upsert
**Then** wird ein ETB-Eintrag erstellt: "LNA: Person A → Person B"
**And** der Wechsel ist nachvollziehbar dokumentiert

**AC6: Rollback bei Fehler**
**Given** Upsert schlägt fehl (z.B. Person existiert nicht)
**When** der Transaction Rollback ausgelöst wird
**Then** bleibt der vorherige Zustand erhalten
**And** kein inkonsistenter Zustand entsteht

**Technische Notes:**
- **Backend:** Migration in `packages/backend/prisma/migrations/`
- **Handler:** `BesetzeRolleHandler` mit Prisma Upsert
- **Test:** Concurrent Integration Test mit `Promise.all()`
- **Test-Coverage:** TC-P0-014, TC-P0-015 aus Test Design
- **Aufwand:** ~6h

---

### Story S0.3: GeoCoordinate Value Object implementieren (R-E8-001)

**Als** Backend-Entwickler,
**möchte ich** ein GeoCoordinate Value Object mit korrekter GeoJSON-Serialisierung implementieren,
**damit** Fahrzeuge auf der Lagekarte an der richtigen Position erscheinen.

**Risiko-Referenz:** R-E8-001 (Score: 9, Kategorie: TECH)
**FRs covered:** FR25, FR26 (Fahrzeuge als POIs auf Lagekarte)

**Acceptance Criteria:**

**AC1: GeoCoordinate Value Object erstellt**
**Given** Domain Layer ohne Koordinaten-Handling
**When** ich GeoCoordinate Value Object implementiere
**Then** existiert die Klasse in `packages/backend/src/domain/kraefte/value-objects/geo-coordinate.ts`
**And** sie hat Properties `latitude` (-90 bis 90) und `longitude` (-180 bis 180)

**AC2: GeoJSON-Serialisierung korrekt**
**Given** GeoCoordinate mit latitude=52.525, longitude=13.369 (Berlin)
**When** ich `toGeoJsonCoordinates()` aufrufe
**Then** wird `[13.369, 52.525]` zurückgegeben (WICHTIG: [lng, lat] nicht [lat, lng]!)
**And** ein Kommentar dokumentiert die GeoJSON-Konvention

**AC3: Factory Method mit Validierung**
**Given** ungültige Koordinaten (latitude=91 oder longitude=181)
**When** ich `GeoCoordinate.create(91, 181)` aufrufe
**Then** wird `Result.fail()` mit Fehlermeldung zurückgegeben
**And** kein ungültiges Objekt kann erstellt werden

**AC4: fromGeoJson Parser**
**Given** GeoJSON Koordinaten `[13.369, 52.525]`
**When** ich `GeoCoordinate.fromGeoJson([13.369, 52.525])` aufrufe
**Then** wird ein GeoCoordinate mit latitude=52.525, longitude=13.369 erstellt
**And** die Reihenfolge wird korrekt interpretiert

**AC5: POI Mapper verwendet Value Object**
**Given** ein EinsatzFahrzeug mit Position
**When** PoiMapper.toGeoJson() aufgerufen wird
**Then** werden Koordinaten über `position.toGeoJsonCoordinates()` serialisiert
**And** keine manuelle [lng, lat] Vertauschung an anderer Stelle

**AC6: Unit Tests für alle Konvertierungen**
**Given** GeoCoordinate Value Object ist implementiert
**When** ich die Tests ausführe
**Then** sind folgende Fälle abgedeckt:
- `toGeoJsonCoordinates()` → [lng, lat]
- `toLatLngArray()` → [lat, lng] (für Google Maps etc.)
- `fromGeoJson()` → korrekte Interpretation
- Validierung: latitude -90..90, longitude -180..180
- Grenzwerte: 0,0 (Null Island), -90,-180, 90,180

**AC7: E2E Test mit echter Lagekarte**
**Given** ein Fahrzeug mit bekannter Position (Berlin Hauptbahnhof)
**When** das Fahrzeug auf der Lagekarte angezeigt wird
**Then** erscheint der POI in Berlin (nicht im Atlantik oder umgekehrt)
**And** Klick auf POI zeigt korrekte Koordinaten im Popup

**Technische Notes:**
- **Backend:** Value Object in Domain Layer (framework-agnostic)
- **Pattern:** Immutable Value Object mit Factory Method `create()`
- **GeoJSON Standard:** RFC 7946 - Koordinaten sind IMMER [longitude, latitude]
- **Test-Coverage:** TC-P0-019 aus Test Design
- **Aufwand:** ~4h

---

## Epic 0 Summary

| Story | Risiko | Kategorie | Aufwand | Test Coverage |
|-------|--------|-----------|---------|---------------|
| S0.1 | R-E1-001 | Security | 4h | TC-P0-001, TC-P0-002 |
| S0.2 | R-E5-002 | Data Integrity | 6h | TC-P0-014, TC-P0-015 |
| S0.3 | R-E8-001 | Technical | 4h | TC-P0-019 |
| **Gesamt** | - | - | **14h** | 5 P0 Tests |

**Definition of Done für Epic 0:**
- [ ] Alle 3 Stories implementiert
- [ ] Alle Unit Tests grün (AAA Pattern)
- [ ] Alle Integration Tests grün
- [ ] Biome lint check bestanden
- [ ] PR Review bestanden
- [ ] Keine kritischen Risiken mehr offen

---

## Implementation Order & Parallelization

### Dependency Graph (Visual)

```
Epic 0 (Foundation) [TECHNICAL]
   ↓
Epic 1 (Admin-Grundkonfiguration)
   ↓
Epic 2 (Stammdaten-Administration)
   ├─→ Epic 3 (Fahrzeug-Einsatz) ──→ Epic 8 (Lagekarte)
   ├─→ Epic 4 (Helfer-Registrierung)
   │       ↓
   │   Epic 5 (Rollen & Führung)
   │       ↓
   │   Epic 6 (Taktische Übersicht)
   └─→ Epic 7 (HiOrg-Server) [parallel zu Epic 3-6]
```

### Parallel Execution Options

| Phase | Sprints | Epics | Parallelisierbar |
|-------|---------|-------|------------------|
| Phase 1 | Sprint 1 | Epic 0 | ❌ Nein (Foundation) |
| Phase 2 | Sprint 2 | Epic 1 | ❌ Nein (Configuration) |
| Phase 3 | Sprint 3 | Epic 2 | ❌ Nein (Master Data) |
| Phase 4 | Sprint 4-5 | Epic 3, 4, 7 | ✅ Ja (alle parallel) |
| Phase 5 | Sprint 6-7 | Epic 5, 8 | ✅ Ja (beide parallel) |
| Phase 6 | Sprint 8 | Epic 6 | ❌ Nein (Dashboard) |

### Critical Path

**Minimum Duration:** 12 Wochen (6 Sprints)
```
Epic 0 (2w) → Epic 1 (2w) → Epic 2 (2w) → Epic 3/4 (2w) → Epic 5 (2w) → Epic 6 (2w)
```

**Total Duration mit allen Epics:** 16 Wochen (8 Sprints)
