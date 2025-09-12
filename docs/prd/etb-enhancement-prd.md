# Einsatztagebuch (ETB) Enhancement PRD

## Projektanalyse und Kontext

### Überblick über das bestehende Projekt

#### Analysequelle
- **IDE-basierte Analyse** - Projekt im aktuellen Workspace geladen
- **Brownfield Architecture Document** verfügbar unter: `docs/brownfield-architecture.md`
- **GitHub Issue #103** mit Anforderungen
- **ADR-005** - CRUD-basierter Ansatz (Angenommen: 2025-01-09)

#### Aktueller Projektzustand
BlueLight Hub ist eine moderne Unterstützungsanwendung für Rettungsdienste, aufgebaut als Monorepo mit:
- **Frontend**: React + Vite + Tauri (Desktop-App) mit Tailwind CSS und Headless UI
- **Backend**: NestJS mit Prisma ORM und PostgreSQL
- **Shared**: OpenAPI-generierte TypeScript-Clients für typsichere API-Kommunikation
- **Hauptzweck**: Einsatzmanagement-Plattform mit Offline-Fähigkeiten, Echtzeitkommunikation und Ressourcenverwaltung

### Verfügbare Dokumentationsanalyse

#### Verfügbare Dokumentation
- ✓ Tech Stack Dokumentation (in brownfield-architecture.md)
- ✓ Source Tree/Architektur (dokumentiert in brownfield-architecture.md)
- ✓ Coding Standards (CLAUDE.md mit strikten Richtlinien)
- ✓ API-Dokumentation (OpenAPI-Spec-Generierung)
- ✓ Externe API-Dokumentation (API-Client-Generierungs-Workflow)
- ✓ UX/UI-Richtlinien (Tailwind CSS + Headless UI Standards)
- ✓ Technical Debt Dokumentation (verfolgt in brownfield-architecture.md)
- ✓ Architecture Decision Records (ADR-005 für CRUD-Ansatz, ADR-015 für Filter)

### Definition des Erweiterungsumfangs

#### Erweiterungstyp
- ✓ **Neue Feature-Ergänzung** - Digitales Einsatztagebuch (ETB) System
- ✓ **Integration mit neuen Systemen** - Integration mit bestehendem Einsatzmanagement
- ✓ **UI/UX-Erweiterung** - Neue ETB-Oberflächenkomponenten

#### Erweiterungsbeschreibung
Implementierung eines umfassenden digitalen Einsatztagebuchs (ETB) als zentrale Dokumentationskomponente für Einsätze mit chronologischer Ereignisprotokollierung, strukturierter Dateneingabe, Echtzeit-Updates, Offline-Fähigkeit und Export-Funktionalität.

#### Auswirkungsbewertung
- ✓ **Moderate Auswirkung** - Neues Modul mit Integrationspunkten zu bestehenden Benutzer- und Einsatzsystemen

### Ziele und Hintergrundkontext

#### Ziele
- Digitale Dokumentation von Einsatzereignissen in chronologischer Reihenfolge ermöglichen
- Strukturierte, durchsuchbare und exportierbare Einsatzprotokolle bereitstellen
- Echtzeit-Zusammenarbeit mehrerer Benutzer bei der Einsatzdokumentation unterstützen
- Offline-Fähigkeit für Feldeinsätze ohne Netzwerkverbindung sicherstellen
- Standardisierte Berichte für die Nachbereitung von Einsätzen generieren

#### Hintergrundkontext
Rettungsdienste verfügen derzeit über kein zentralisiertes digitales System zur Dokumentation von Einsatzereignissen. Das Einsatztagebuch (ETB) ist eine kritische Anforderung für deutsche Rettungsdienste und bietet rechtssichere Dokumentation aller Aktionen, Entscheidungen und Ereignisse während eines Einsatzes. Diese Erweiterung transformiert das traditionelle papierbasierte ETB in eine moderne digitale Lösung, die sich nahtlos in die bestehende BlueLight Hub-Plattform integriert.

### Änderungsprotokoll
| Änderung | Datum | Version | Beschreibung | Autor |
|----------|-------|---------|--------------|-------|
| Initiales PRD | 2025-01-09 | 1.0 | ETB Enhancement PRD Erstellung | John (PM) |

## Anforderungen

### Funktionale Anforderungen

- **FR1**: Das System muss chronologische ETB-Einträge mit automatischem Zeitstempel (sekundengenau) für jeden Einsatz ermöglichen
- **FR2**: ETB-Einträge müssen kategorisierbar sein (Alarmierung, Ankunft, Maßnahme, Transport, Übergabe, etc.)
- **FR3**: Rollenbasierte Berechtigungen: EL kann alle Einträge bearbeiten/löschen, GF nur eigene, FüKW Personal hat Vollzugriff, Einsatzkraft kann Vorschläge machen
- **FR4**: Quick-Entry Funktion mit vordefinierten Textbausteinen für häufige Ereignisse
- **FR5**: Multi-User-fähig: Mehrere Nutzer können gleichzeitig Einträge erstellen ohne Konflikte
- **FR6**: ETB-Status-Management: draft → active → locked (nach Einsatzende unveränderbar)
- **FR7**: Suchfunktion über alle ETB-Einträge mit Filtern (Zeit, Kategorie, Ersteller, Stichwort)
- **FR8**: Export in PDF (für Behörden), CSV (für Statistik) und Word (für Nachbearbeitung)
- **FR9**: Offline-Fähigkeit mit automatischer Synchronisation bei Verbindungswiederherstellung
- **FR10**: Versionierung: Bei nachträglichen Änderungen wird die alte Version archiviert
- **FR11**: Integration in neue Einsatzvollansicht - ETB als Vollansicht über Menü erreichbar
- **FR12**: Audit-Log für alle Änderungen (wer, wann, was) gemäß rechtlichen Anforderungen
- **FR13**: Einsatzvollansicht-Basislayout mit Menü-Navigation zwischen Einsatzdetails, ETB, etc.

### Nicht-funktionale Anforderungen

- **NFR1**: Performance: ETB-Einträge müssen innerhalb von 100ms geladen werden (bis 1000 Einträge)
- **NFR2**: Offline-Storage für mindestens 50 Einsätze mit je 500 Einträgen
- **NFR3**: DSGVO-konform: Keine Klarnamen von Patienten, Pseudonymisierung
- **NFR4**: Aufbewahrung: Daten müssen 10 Jahre revisionssicher gespeichert werden
- **NFR5**: Real-time Updates innerhalb von 500ms für alle verbundenen Clients
- **NFR6**: Mobile-Ready: Responsive Design für Tablet-Nutzung im Einsatzfahrzeug
- **NFR7**: Verfügbarkeit: 99.9% Uptime für Online-Funktionen
- **NFR8**: Browser-Support: Chrome, Firefox, Edge (jeweils letzte 2 Versionen)
- **NFR9**: Nahtlose Navigation zwischen Einsatzliste und neuer Einsatzvollansicht

### Kompatibilitätsanforderungen

- **CR1**: Vollständige Integration mit bestehendem JWT-Auth-System ohne Breaking Changes
- **CR2**: Prisma-Schema-Erweiterung ohne Beeinträchtigung bestehender Entitäten
- **CR3**: UI-Konsistenz: Ausschließlich Tailwind CSS + Headless UI gemäß Projekt-Standards
- **CR4**: API-First: Alle Endpoints OpenAPI-dokumentiert für automatische Client-Generierung
- **CR5**: TanStack Query für alle API-Calls, keine direkten fetch-Aufrufe
- **CR6**: NestJS-Modul-Struktur im Backend mit Repository-Pattern
- **CR7**: Einsatzvollansicht muss erweiterbar sein für zukünftige Module

## Stakeholder und Rollen

### Primäre Nutzer (Schreibrechte)
- **EL (Einsatzleiter)**: Hauptverantwortlicher, finale Freigabe, kritische Entscheidungen
- **GF (Gruppenführer)**: Taktische Einträge, Maßnahmen ihrer Gruppen
- **FüKW Personal**: Vollzugriff auf alle ETB-Funktionen, Kommunikationsereignisse
- **Protokollant**: Dedizierte ETB-Führung bei größeren Einsätzen

### Sekundäre Nutzer
- **Einsatzkraft**: Können eigene Tätigkeiten melden (zur Übernahme durch GF/EL)
- **Leitstelle**: Lesezugriff für Lageübersicht
- **Führungsassistent**: Unterstützung bei ETB-Führung

### Nachgelagerte Nutzer
- **Verwaltung**: Für Berichte und Abrechnungen
- **Ausbilder**: Für Nachbesprechungen und Schulungen
- **Behörden**: Bei Anforderung für rechtliche Zwecke

## Technische Architektur

### Architekturentscheidung (ADR-005)
Nach Analyse wurde ein **CRUD-basierter Ansatz mit Versionierung und Audit-Log** gewählt:
- Konsistenz mit bestehendem Prisma/PostgreSQL Stack
- Schnellere Implementierung
- Bewährtes Pattern
- Migration zu Event Sourcing später möglich

### Datenmodell (Vereinfacht)

```prisma
// Enum für ETB-Eintrag Kategorien
enum EtbKategorie {
  ALARMIERUNG
  ANKUNFT
  LAGEMELDUNG
  MASSNAHME
  ANFORDERUNG
  TRANSPORT
  UEBERGABE
  KOMMUNIKATION
  ENTSCHEIDUNG
  SONSTIGES
}

// Enum für ETB Status
enum EtbStatus {
  DRAFT      // In Bearbeitung
  ACTIVE     // Aktiv während Einsatz
  LOCKED     // Gesperrt nach Einsatzende
}

model Einsatztagebuch {
  id          String      @id @default(cuid())
  einsatzId   String      @unique
  einsatz     Einsatz     @relation(fields: [einsatzId], references: [id])
  status      EtbStatus   @default(DRAFT)
  lockedAt    DateTime?   
  lockedBy    String?     
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  eintraege   EtbEintrag[]
  
  @@index([einsatzId])
  @@map("einsatztagebuecher")
}

model EtbEintrag {
  id                String           @id @default(cuid())
  etbId             String
  etb               Einsatztagebuch  @relation(fields: [etbId], references: [id])
  
  timestamp         DateTime         @default(now())
  sequenceNumber    Int              
  
  kategorie         EtbKategorie
  text              String           @db.Text
  
  erstelltVon       String           
  erstelltVonUser   User             @relation("EtbEintragErsteller", fields: [erstelltVon], references: [id])
  erstelltAm        DateTime         @default(now())
  
  version           Int              @default(1)
  istAktuell        Boolean          @default(true)
  originalId        String?          
  
  historie          EtbEintragHistorie[]
  
  @@index([etbId, timestamp])
  @@index([etbId, sequenceNumber])
  @@map("etb_eintraege")
}

model EtbEintragHistorie {
  id              String      @id @default(cuid())
  eintragId       String
  eintrag         EtbEintrag  @relation(fields: [eintragId], references: [id])
  
  version         Int
  text            String      @db.Text
  kategorie       EtbKategorie
  
  geaendertVon    String      
  geaendertVonUser User       @relation(fields: [geaendertVon], references: [id])
  geaendertAm     DateTime    @default(now())
  
  @@index([eintragId, version])
  @@map("etb_eintrag_historie")
}

model EtbTextbaustein {
  id              String       @id @default(cuid())
  kategorie       EtbKategorie
  kurztext        String       
  volltext        String       @db.Text
  reihenfolge     Int          @default(0)
  istAktiv        Boolean      @default(true)
  
  @@index([kategorie])
  @@map("etb_textbausteine")
}
```

## UI Enhancement Goals

### Integration mit bestehender UI
- ETB als integrierte Vollansicht innerhalb der Einsatzvollansicht
- Navigation über Menü in der Einsatzvollansicht
- Konsistentes Design mit Tailwind CSS und Headless UI
- Mobile-first Design für Tablet-Nutzung

### Neue Views
1. **Einsatzvollansicht** (`/einsaetze/:id`)
   - Header mit Einsatz-Stammdaten
   - Menü-Navigation (Details, ETB, weitere später)

2. **ETB-Ansicht** (`/einsaetze/:id/etb`)
   - Chronologische Eintragsliste
   - Quick-Entry Bereich
   - Filter-Sidebar
   - Eingabeformular

3. **ETB-Export-Dialog**
   - Format-Auswahl (PDF, CSV, Word)
   - Zeitraum-Filter
   - Vorschau-Bereich

### UI-Konsistenz
- Wiederverwendung bestehender Komponenten
- Optimistic Updates für bessere UX
- Loading-States mit Skeleton-Screens
- Toast-Notifications für Feedback

## Technische Constraints und Integration

### Technology Stack
- **Languages**: TypeScript (Frontend & Backend)
- **Frameworks**: React + Vite (Frontend), NestJS (Backend), Tauri (Desktop)
- **Database**: PostgreSQL mit Prisma ORM
- **State Management**: TanStack Store (kein React Context)
- **API Communication**: TanStack Query mit generierten Clients

### Code-Organisation
```
packages/backend/src/etb/
├── etb.module.ts
├── etb.controller.ts
├── etb.service.ts
└── dto/

packages/frontend/src/
├── pages/einsaetze/[id]/
├── components/etb/
├── hooks/etb/
└── stores/etbStore.ts  // TanStack Store
```

### Integration Strategy
- **Database**: Prisma-Schema-Erweiterung mit Migrations
- **API**: NestJS-Modul mit OpenAPI-Dokumentation
- **Frontend**: TanStack Query Hooks und TanStack Store
- **Deployment**: Direkte Integration ohne Feature-Flags

### Risiken und Mitigation
- **Offline-Sync-Konflikte**: Conflict-Resolution-Algorithm
- **Performance bei großen ETBs**: Pagination und Virtual Scrolling
- **WebSocket-Verbindungsabbrüche**: Reconnection-Logic
- **Datenmigration**: Rollback-Strategie vorbereitet

## Epic: Digitales Einsatztagebuch mit Einsatzvollansicht

**Epic-Ziel**: Implementation eines rechtssicheren, digitalen Einsatztagebuchs als integraler Bestandteil einer neuen Einsatzvollansicht, mit Offline-Fähigkeit, Real-time-Synchronisation und Export-Funktionen.

### Story-Sequenz

#### Story 1.1: Einsatzvollansicht Basislayout und Routing
**Als** Einsatzkraft  
**möchte ich** von der Einsatzliste zu einer detaillierten Einsatzansicht navigieren  
**damit** ich alle Informationen zentral einsehen kann

**Acceptance Criteria:**
- Klick auf Einsatz öffnet `/einsaetze/:id`
- Basislayout mit Header und Menü-Navigation
- Menü enthält Optionen für "Details", "ETB", etc.
- Responsive Design für Tablet

#### Story 1.2: Prisma-Schema und Datenbank-Setup für ETB
**Als** Entwickler  
**möchte ich** die Datenbank-Struktur für ETB einrichten  
**damit** Einsatztagebuch-Daten persistent gespeichert werden

**Acceptance Criteria:**
- Prisma-Schema mit ETB-Models definiert
- Migration erfolgreich angewendet
- Seed-Daten für Entwicklung
- Indizes optimiert

#### Story 1.3: Backend ETB-Modul mit CRUD-Operations
**Als** Backend-System  
**möchte ich** ETB-Einträge verwalten  
**damit** die Grundfunktionalität bereitsteht

**Acceptance Criteria:**
- NestJS EtbModule implementiert
- CRUD-Endpoints funktionsfähig
- OpenAPI-Dokumentation vollständig
- Validierung mit DTOs

#### Story 1.4: API-Client-Generierung und TanStack Query Hooks
**Als** Frontend-Entwickler  
**möchte ich** typsichere API-Calls nutzen  
**damit** die Kommunikation robust ist

**Acceptance Criteria:**
- API-Client generiert
- TanStack Query Hooks implementiert
- Optimistic Updates
- Error-Handling

#### Story 1.5: ETB-UI mit Eingabe und Anzeige
**Als** Einsatzleiter  
**möchte ich** ETB-Einträge erstellen und einsehen  
**damit** ich den Einsatzverlauf dokumentiere

**Acceptance Criteria:**
- Chronologische Eintragsliste
- Eingabeformular funktionsfähig
- Kategorie-Auswahl
- Automatische Zeitstempel

#### Story 1.6: Rollenbasierte Berechtigungen
**Als** Gruppenführer  
**möchte ich** nur meine eigenen Einträge bearbeiten  
**damit** Verantwortlichkeiten klar sind

**Acceptance Criteria:**
- EL: Vollzugriff
- GF: Eigene Einträge
- FüKW Personal: Vollzugriff
- Einsatzkraft: Vorschläge
- Backend-Enforcement

#### Story 1.7: Quick-Entry mit Textbausteinen
**Als** Einsatzkraft  
**möchte ich** häufige Ereignisse schnell dokumentieren  
**damit** die Dokumentation effizient erfolgt

**Acceptance Criteria:**
- Textbausteine filterbar
- Klick füllt Formular
- Keyboard-Shortcuts
- Mobile-optimiert

#### Story 1.8: Real-time Updates via WebSocket
**Als** FüKW Personal  
**möchte ich** neue Einträge sofort sehen  
**damit** alle informiert sind

**Acceptance Criteria:**
- WebSocket-Connection
- Auto-Update bei neuen Einträgen
- Reconnection-Logic
- Fallback auf Polling

#### Story 1.9: ETB-Status-Management und Sperrung
**Als** Einsatzleiter  
**möchte ich** das ETB sperren können  
**damit** keine nachträglichen Änderungen möglich sind

**Acceptance Criteria:**
- Status-Workflow implementiert
- Nur EL kann sperren
- UI zeigt gesperrten Status
- Audit-Log dokumentiert

#### Story 1.10: Offline-Capability mit IndexedDB
**Als** Einsatzkraft  
**möchte ich** auch offline arbeiten  
**damit** die Dokumentation immer funktioniert

**Acceptance Criteria:**
- IndexedDB-Storage
- Offline-Indicator
- Sync-Queue
- Konfliktauflösung

#### Story 1.11: Export-Funktionalität
**Als** Verwaltung  
**möchte ich** ETB-Daten exportieren  
**damit** ich Berichte erstellen kann

**Acceptance Criteria:**
- PDF-Export
- CSV-Export
- Zeitraum-Filter
- Professionelles Layout

## Entwicklungsreihenfolge

### Phase 1: Basislayout und Grundfunktionen
- Einsatzvollansicht-Routing
- ETB als integrierte Ansicht
- CRUD-Operationen
- Basis-UI

### Phase 2: Features & Integration
- Kategorien und Quick-Entry
- Rollenbasierte Berechtigungen
- WebSocket Real-time
- Multi-User-Support

### Phase 3: Erweiterte Funktionen
- Offline-Capability
- Sync-Mechanismus
- Export-Funktionen
- Versionierung und Audit

## Regulatorische und Compliance-Anforderungen

### Rechtliche Anforderungen
- **Dokumentationspflicht**: Lückenlose Dokumentation (§630f BGB)
- **Unveränderbarkeit**: Nach Einsatzende gesperrt
- **Aufbewahrungspflicht**: 10 Jahre
- **Datenschutz**: DSGVO-konform, Pseudonymisierung
- **Nachvollziehbarkeit**: Vollständiger Audit-Trail

### Technische Umsetzung
- Soft-Delete only
- Versionierte Einträge
- Audit-Log für alle Aktionen
- Status-Management (DRAFT → ACTIVE → LOCKED)
- Datenbank-Constraints für Unveränderbarkeit

## Zusammenfassung

Das Einsatztagebuch wird als essentielles Modul für die rechtssichere Dokumentation von Einsätzen implementiert. Durch die Integration in eine neue Einsatzvollansicht entsteht eine kohärente Lösung, die alle Anforderungen deutscher Rettungsdienste erfüllt. Der gewählte CRUD-basierte Ansatz ermöglicht eine schnelle Implementierung bei gleichzeitiger Erfüllung aller regulatorischen Anforderungen.