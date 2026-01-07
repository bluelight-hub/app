---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# bluelight-hub - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for bluelight-hub, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Server-Konfiguration (FR1-FR8)**
- FR1: Benutzer kann einen neuen Server zur Liste hinzufuegen (Name, URL, optional Access-Token)
- FR2: Benutzer kann gespeicherte Server in einer Liste einsehen
- FR3: Benutzer kann einen Server aus der Liste auswaehlen
- FR4: Benutzer kann Server-Details bearbeiten (Name, URL)
- FR5: Benutzer kann einen Server aus der Liste entfernen
- FR6: System speichert Server-Liste persistent zwischen App-Neustarts
- FR7: System markiert den zuletzt verwendeten Server als Default
- FR8: Benutzer kann einem Server ein visuelles Icon/Farbe zuweisen

**Authentifizierung & Access Control (FR9-FR16)**
- FR9: System sendet Access-Token im HTTP-Header bei allen API-Requests
- FR10: System blockiert Login-Versuch wenn kein Server konfiguriert ist
- FR11: System erlaubt Server-Wechsel nur im ausgeloggten Zustand
- FR12: Server validiert Access-Token bei jedem Request
- FR13: Server liefert reduzierte Health-Informationen ohne gueltigen Token
- FR14: Server unterstuetzt INSECURE_MODE fuer lokale Entwicklung
- FR15: System kann mehrere Access-Tokens pro Server verwalten
- FR16: Admin kann Server von INSECURE zu SECURE migrieren mit Token-Setup

**Invite-System & Onboarding (FR17-FR25)**
- FR17: Admin kann Invite-Codes mit Ablaufdatum erstellen
- FR18: Admin kann Invite-Codes widerrufen
- FR19: Admin kann Liste aller Invite-Codes einsehen (Status, Ersteller, Einloesedatum)
- FR20: Benutzer kann Invite-Code gegen Access-Token eintauschen
- FR21: System validiert Invite-Code Ablaufdatum vor Einloesung
- FR22: System markiert Invite-Code nach Einloesung als "verwendet"
- FR23: Desktop-App verarbeitet Deep Links zum Server-Setup (bluelight://connect)
- FR24: Web-App verarbeitet URL-Parameter zum Server-Setup (?server=...&invite=...)
- FR25: Benutzer kann Server manuell per Formular hinzufuegen (URL + Invite-Code)

**Admin-Verwaltung (FR26-FR31)**
- FR26: Admin kann Access-Tokens mit Namen/Labels erstellen
- FR27: Admin kann Access-Tokens deaktivieren
- FR28: Admin kann Token-Usage-Statistiken einsehen (lastUsedAt)
- FR29: Admin kann Token rotieren (neuen Token generieren, alten invalidieren)
- FR30: Server zeigt Token nur einmalig bei Erstellung an (kein spaeteres Abrufen)
- FR31: Admin muss Access-Token waehrend initialem Server-Setup erstellen (Secure Mode)

**Plattform-Integration (FR32-FR36)**
- FR32: Desktop-App speichert Credentials verschluesselt (Tauri plugin-store)
- FR33: Web-App speichert Credentials in localStorage mit Sicherheitswarnung
- FR34: System erkennt Plattform und wendet entsprechende Speicher-Strategie an
- FR35: Desktop-App reagiert auf Deep-Link-Aufrufe auch wenn App geschlossen
- FR36: Web-App zeigt explizite Warnung bei unverschluesselter Speicherung

**Setup & Initialisierung (FR37-FR40)**
- FR37: Server startet im Setup-Pending-Mode wenn kein Admin existiert
- FR38: Setup-Pending-Mode erlaubt nur /health und /admin/setup Endpoints
- FR39: Benutzer kann Verbindung zu Server testen vor Speicherung
- FR40: System zeigt klare Fehlermeldung bei abgelaufenem Invite-Code

### NonFunctional Requirements

**Performance (NFR-P1 bis NFR-P5)**
- NFR-P1: Token-Validierung unter 100ms Latenz pro Request
- NFR-P2: Server-Dropdown reagiert in unter 50ms
- NFR-P3: Deep Link Verarbeitung (App-Start + Server-Setup) in unter 3s
- NFR-P4: Health-Check Timeout nach 5s, Feedback sofort
- NFR-P5: Server-Liste laden unter 200ms aus lokalem Storage

**Security (NFR-S1 bis NFR-S8)**
- NFR-S1: Token-Hashing mit bcrypt cost factor >= 10
- NFR-S2: Token-Format: Prefix blh_ + 32 random bytes (base64)
- NFR-S3: Rate Limiting: Max 5 Invite-Einloesungen/Minute/IP
- NFR-S4: Desktop-Speicherung verschluesselt via Tauri plugin-store
- NFR-S5: Invite-Code Entropie: Min. 128 Bit Zufaelligkeit
- NFR-S6: Token-Transmission nur ueber HTTPS (ausser INSECURE_MODE)
- NFR-S7: Token-Anzeige einmalig bei Erstellung, nie wieder abrufbar
- NFR-S8: Audit-Trail: Alle Token-Operationen geloggt (ohne Token-Wert)

**Integration (NFR-I1 bis NFR-I5)**
- NFR-I1: Deep Link Schema bluelight://connect registriert auf Desktop
- NFR-I2: URL-Parameter ?server= und ?invite= auf Web unterstuetzt
- NFR-I3: Tauri Plugin Store @tauri-apps/plugin-store v2.x kompatibel
- NFR-I4: Backward Compatibility: Bestehende Auth-Flows unveraendert nutzbar
- NFR-I5: API-Versioning: Health-Endpoint Aenderungen rueckwaertskompatibel

**Reliability (NFR-R1 bis NFR-R5)**
- NFR-R1: Offline-Verhalten: Server-Liste offline verfuegbar
- NFR-R2: Connection-Fehler: Klare Fehlermeldung in unter 2s
- NFR-R3: Invite-Code Race: Atomare "used" Markierung (keine Doppelnutzung)
- NFR-R4: Token-Persistenz: Token ueberlebt App-Updates und OS-Neustarts
- NFR-R5: Graceful Degradation: Bei Token-Fehler -> Login-Screen (nicht Crash)

**Usability (NFR-U1 bis NFR-U5)**
- NFR-U1: Server-Setup: Neuer Server in unter 2 Minuten konfiguriert
- NFR-U2: Server-Wechsel: Max. 3 Klicks von Login zu anderem Server
- NFR-U3: Fehlermeldungen: Deutsch, actionable (was tun bei Fehler)
- NFR-U4: Browser-Warnung: Sichtbar ohne Scrollen auf Login-Page
- NFR-U5: Deep Link Feedback: Visuelles Feedback bei Link-Verarbeitung

### Additional Requirements

**Aus Architecture Document:**

- Brownfield-Projekt: Erweiterung der existierenden Codebasis, keine neue Starter-Template erforderlich
- Hexagonal Architecture Pattern einhalten (Domain -> Application -> Infrastructure -> Modules)
- CQRS Pattern: Separate Command/Query Handlers
- Result<T> Pattern statt Exceptions im Domain/Application Layer
- Outbox Pattern fuer zuverlaessige Event-Publikation
- DI_TOKENS fuer neue Repository-Injektionen
- TransactionalCommandHandler fuer atomare Events

**Neue Backend-Komponenten (aus Architecture):**
- Domain Entities: ServerAccessToken, InviteCode
- Value Objects: AccessTokenId, InviteCodeId, TokenHash
- Guards: ServerAccessGuard, SetupPendingGuard
- Guard-Reihenfolge: SetupPendingGuard -> ServerAccessGuard -> JwtAuthGuard
- Decorators: SkipServerAccess, SkipSetupCheck
- Handlers: ExchangeInviteHandler, CreateInviteHandler, RevokeTokenHandler
- Neue Prisma Models: ServerAccessToken, InviteCode
- Neue Dependencies: bcrypt, @nestjs/throttler

**Neue Frontend-Komponenten (aus Architecture):**
- Feature: features/server/ mit api/, adapters/, stores/, services/, hooks/, schemas/, ui/
- Storage Adapter Pattern: IServerStorageAdapter mit TauriStorageAdapter und BrowserStorageAdapter
- TanStack Store fuer Server-State
- DeepLinkService fuer URL-Handling

**Aus UX Design Document:**

- Zero-Friction Deep Link Onboarding: 1 Klick -> Server da -> Login
- Server-Auswahl nur auf Login-Screen (Pre-Auth Server Selection)
- Toast Notifications statt Modals fuer Success-Feedback
- Error Cards mit klarer Handlungsanweisung bei Blockern
- Mobile-First Approach fuer alle neuen Komponenten
- Touch-Targets mindestens 44x44px
- WCAG AA Accessibility Target
- Keyboard-First fuer Power-User (FueKw-Personal)
- Server-Identitaet immer sichtbar im Header nach Login

**Neue UI-Komponenten (aus UX):**
- ServerSelector (Organism): Dropdown zur Server-Auswahl
- ServerListItem (Molecule): Server-Eintrag in Settings
- InviteCreator (Organism): Formular zum Erstellen von Invite-Links
- InviteLinkDisplay (Molecule): Link mit Copy-Funktion
- ServerSetupForm (Organism): Manuelles Server-Setup
- ServerStatusDot (Atom): Online/Offline Indikator

### FR Coverage Map

| FR | Epic | Beschreibung |
|----|------|--------------|
| FR1 | Epic 2 | Server zur Liste hinzufuegen |
| FR2 | Epic 3 | Server-Liste einsehen |
| FR3 | Epic 3 | Server auswaehlen |
| FR4 | Epic 3 | Server bearbeiten |
| FR5 | Epic 3 | Server entfernen |
| FR6 | Epic 2 | Server-Liste persistent speichern |
| FR7 | Epic 3 | Letzter Server als Default |
| FR8 | Epic 3 | Server Icon/Farbe |
| FR9 | Epic 1 | Token im HTTP-Header |
| FR10 | Epic 3 | Login blockiert ohne Server |
| FR11 | Epic 3 | Server-Wechsel nur ausgeloggt |
| FR12 | Epic 1 | Token-Validierung bei Request |
| FR13 | Epic 1 | Reduzierte Health-Infos ohne Token |
| FR14 | Epic 1 | INSECURE_MODE Support |
| FR15 | Epic 4 | Multiple Tokens pro Server |
| FR16 | Epic 4 | INSECURE zu SECURE Migration |
| FR17 | Epic 1 | Invite-Codes mit Ablaufdatum erstellen |
| FR18 | Epic 1 | Invite-Codes widerrufen |
| FR19 | Epic 1 | Invite-Code-Liste einsehen |
| FR20 | Epic 2 | Invite gegen Token tauschen |
| FR21 | Epic 2 | Ablaufdatum validieren |
| FR22 | Epic 2 | Invite als verwendet markieren |
| FR23 | Epic 2 | Deep Links verarbeiten (Desktop) |
| FR24 | Epic 2 | URL-Parameter verarbeiten (Web) |
| FR25 | Epic 2 | Manuelles Server-Formular |
| FR26 | Epic 4 | Tokens mit Namen/Labels |
| FR27 | Epic 4 | Tokens deaktivieren |
| FR28 | Epic 4 | Token-Usage-Statistiken |
| FR29 | Epic 4 | Token rotieren |
| FR30 | Epic 4 | Token einmalig anzeigen |
| FR31 | Epic 1 | Token bei Admin-Setup erstellen |
| FR32 | Epic 2 | Tauri verschluesselte Speicherung |
| FR33 | Epic 2 | Browser localStorage + Warnung |
| FR34 | Epic 2 | Plattform-Erkennung |
| FR35 | Epic 2 | Deep Link bei geschlossener App |
| FR36 | Epic 2 | Browser-Sicherheitswarnung |
| FR37 | Epic 1 | Setup-Pending-Mode |
| FR38 | Epic 1 | Whitelist /health, /admin/setup |
| FR39 | Epic 2 | Verbindung testen |
| FR40 | Epic 2 | Fehlermeldung bei abgelaufenem Invite |

## Epic List

### Epic 1: Secure Server Foundation & Invite-System

Server-Administratoren koennen einen neuen Bluelight Hub Server sicher aufsetzen, Access-Tokens generieren, und Invite-Links erstellen, damit Einsatzkraefte onboarden koennen.

**FRs abgedeckt:** FR9, FR12-14, FR17-19, FR31, FR37-38

**User Outcomes:**
- Server startet im Setup-Pending-Mode
- Admin erstellt Account + Initial-Token
- Invite-Codes mit Ablaufdatum erstellen, widerrufen, einsehen
- Token-Validierung via Guards
- INSECURE_MODE fuer Entwicklung

---

### Epic 2: Client-Onboarding & Server-Verbindung

Einsatzkraefte koennen ueber Deep Links, URL-Parameter oder manuelles Formular einem Server beitreten und nahtlos Access-Tokens erhalten.

**FRs abgedeckt:** FR1, FR6, FR20-25, FR32-36, FR39-40

**User Outcomes:**
- Deep Link Onboarding (1-Klick)
- Web URL-Parameter Support
- Manuelles Server-Setup-Formular
- Invite-Code gegen Token tauschen
- Plattform-spezifische Speicherung (Tauri/Browser)
- Connection-Test und Fehler-Handling

---

### Epic 3: Server-Auswahl & -Management

Nutzer koennen zwischen mehreren Servern wechseln, ihre Server-Liste verwalten, und eine intuitive Login-Erfahrung mit klarer Server-Identitaet nutzen.

**FRs abgedeckt:** FR2-5, FR7-8, FR10-11

**User Outcomes:**
- Server-Dropdown auf Login-Screen
- Server-Liste einsehen und verwalten
- Server bearbeiten und entfernen
- Letzter Server als Default
- Icon/Farbe fuer visuelle Unterscheidung
- Login-Guards (kein Server = blockiert)

---

### Epic 4: Admin Token-Verwaltung

Administratoren koennen Access-Tokens benennen, deaktivieren, rotieren und Usage-Statistiken einsehen fuer vollstaendige Kontrolle.

**FRs abgedeckt:** FR15-16, FR26-30

**User Outcomes:**
- Tokens mit Namen/Labels
- Token deaktivieren
- Token-Usage-Statistiken (lastUsedAt)
- Token rotieren
- INSECURE zu SECURE Migration

---

## Epic 1: Secure Server Foundation & Invite-System

Server-Administratoren koennen einen neuen Bluelight Hub Server sicher aufsetzen, Access-Tokens generieren, und Invite-Links erstellen, damit Einsatzkraefte onboarden koennen.

### Story 1.1: Server-Access-Token Entity & Repository

Als **Server-Administrator**,
moechte ich **dass Server-Access-Tokens als Domain Entity mit Repository existieren**,
damit **Tokens persistent gespeichert und validiert werden koennen**.

#### Acceptance Criteria

**AC1: Prisma Models erstellen**

**Given** das Backend-Projekt ohne ServerAccessToken-Tabelle
**When** die Migration ausgefuehrt wird
**Then** existiert eine ServerAccessToken-Tabelle mit den Feldern:
- `id` (cuid, Primary Key)
- `tokenHash` (String, unique, indexed)
- `name` (String, optional)
- `lastUsedAt` (DateTime, optional)
- `expiresAt` (DateTime, optional)
- `isRevoked` (Boolean, default: false)
- `revokedAt` (DateTime, optional)
- `createdAt` (DateTime, default: now())
**And** ein Index auf `tokenHash` und `isRevoked` existiert

> **Hinweis:** Die Relation zu InviteCode (`inviteCodeId`) wird in Story 1.6 hinzugefuegt, nachdem InviteCode existiert.

**AC2: Domain Entity erstellen**

**Given** die Domain-Schicht des Backends
**When** ein ServerAccessToken Entity benoetigt wird
**Then** existiert `ServerAccessToken` als AggregateRoot in `domain/entities/`
**And** die Entity enthaelt Value Objects fuer `AccessTokenId` und `TokenHash`
**And** die Entity emittiert `ServerAccessTokenCreatedEvent` und `ServerAccessTokenRevokedEvent`
**And** alle Validierungen sind im Domain Layer implementiert

**AC3: Repository Interface und Implementation**

**Given** das Domain und Infrastructure Layer
**When** ein ServerAccessToken persistiert werden soll
**Then** existiert `IServerAccessTokenRepository` in `domain/repositories/`
**And** existiert `PrismaServerAccessTokenRepository` in `infrastructure/repositories/`
**And** das Repository ist via `DI_TOKENS.REPOSITORIES.SERVER_ACCESS_TOKEN` injizierbar
**And** die Methode `validateToken(rawToken: string): Promise<boolean>` existiert
**And** `validateToken` hasht den Token mit bcrypt und vergleicht mit der Datenbank

#### Technical Notes

- Token-Format: `blh_` + cuid2 (28 Zeichen total) gemaess NFR-S2
- bcrypt cost factor: 10 gemaess NFR-S1
- Neues DI_TOKEN: `DI_TOKENS.REPOSITORIES.SERVER_ACCESS_TOKEN`

**FRs:** FR9, FR12
**NFRs:** NFR-S1 (bcrypt cost >= 10), NFR-S2 (Token-Format blh_ + cuid2)

---

### Story 1.1a: ServerAccessGuard & Decorator

Als **Server-Administrator**,
moechte ich **dass der Server eingehende Requests anhand eines Access-Tokens validiert**,
damit **nur autorisierte Clients auf die API zugreifen koennen**.

**Abhaengigkeit:** Story 1.1 (ServerAccessToken Entity & Repository) muss abgeschlossen sein.

#### Acceptance Criteria

**AC1: ServerAccessGuard implementieren**

**Given** ein eingehender HTTP-Request
**When** der Request den Header `X-Server-Access-Token` enthaelt
**Then** validiert der `ServerAccessGuard` den Token gegen die Datenbank
**And** bei gueltigem Token wird der Request durchgelassen
**And** bei ungueltigem/fehlendem Token wird 401 Unauthorized zurueckgegeben
**And** bei gueltigem Token wird `lastUsedAt` aktualisiert

**AC2: SkipServerAccess Decorator**

**Given** ein Controller-Endpoint der keinen Token benoetigt
**When** der Endpoint mit `@SkipServerAccess()` dekoriert ist
**Then** ueberspringt der `ServerAccessGuard` die Token-Validierung
**And** der Decorator nutzt `SetMetadata('skipServerAccess', true)`

#### Technical Notes

- Guard-Platzierung: Nach SetupPendingGuard, vor JwtAuthGuard
- Guard in `infrastructure/guards/server-access.guard.ts`
- Decorator in `infrastructure/decorators/skip-server-access.decorator.ts`

**FRs:** FR9, FR12
**NFRs:** NFR-P1 (Token-Validierung <100ms)

---

### Story 1.2: Setup-Pending-Mode

Als **Server-Administrator**,
moechte ich **dass ein frisch deployter Server nur Setup-relevante Endpoints freigibt**,
damit **unbefugter Zugriff vor der Initialisierung verhindert wird**.

#### Acceptance Criteria

**AC1: Setup-Status in Datenbank**

**Given** ein neuer Server ohne Admin-User
**When** der Server startet
**Then** ist der Server im "Setup-Pending-Mode"
**And** sobald ein Admin-User mit Rolle `ADMIN` existiert UND mindestens ein Access-Token existiert, ist Setup-Pending-Mode deaktiviert

**AC2: SetupPendingGuard implementieren**

**Given** ein Server im Setup-Pending-Mode
**When** ein Request an einen beliebigen Endpoint gesendet wird
**Then** blockiert der `SetupPendingGuard` den Request mit 503 Service Unavailable
**And** die Response enthaelt `{ error: "SERVER_NOT_SETUP", message: "Server setup required" }`

**AC3: Whitelist-Endpoints im Setup-Pending-Mode**

**Given** ein Server im Setup-Pending-Mode
**When** ein Request an folgende Endpoints gesendet wird:
- `GET /health`
- `POST /admin/setup`
- `POST /auth/exchange-invite`
**Then** wird der Request durchgelassen (Guard uebersprungen)

**AC4: SkipSetupCheck Decorator**

**Given** ein Controller-Endpoint der im Setup-Mode erreichbar sein soll
**When** der Endpoint mit `@SkipSetupCheck()` dekoriert ist
**Then** ueberspringt der `SetupPendingGuard` die Pruefung
**And** der Decorator nutzt `SetMetadata('skipSetupCheck', true)`

**AC5: Guard-Reihenfolge**

**Given** die Guard-Pipeline
**When** Guards registriert werden
**Then** ist die Reihenfolge: SetupPendingGuard -> ServerAccessGuard -> JwtAuthGuard
**And** SetupPendingGuard prueft als erstes, ob Setup abgeschlossen ist

#### Technical Notes

- Setup-Status Query: `SELECT COUNT(*) FROM User WHERE role = 'ADMIN'` + `SELECT COUNT(*) FROM ServerAccessToken WHERE isRevoked = false`
- Caching: Setup-Status kann fuer 10s gecacht werden (Startup-Performance)
- Guard in `infrastructure/guards/setup-pending.guard.ts`
- Decorator in `infrastructure/decorators/skip-setup-check.decorator.ts`
- Globale Guard-Registrierung im AppModule

**FRs:** FR37, FR38
**NFRs:** NFR-P1 (Setup-Check sollte <10ms dauern durch Caching)

---

### Story 1.3: Admin-Setup mit Token-Erstellung

Als **Server-Administrator**,
moechte ich **waehrend des initialen Setups einen Admin-Account und Server-Token erstellen**,
damit **der Server im Secure-Mode betriebsbereit ist**.

#### Acceptance Criteria

**AC1: Setup-Endpoint erweitern**

**Given** der Server ist im Setup-Pending-Mode
**When** ein POST an `/admin/setup` mit Admin-Credentials gesendet wird
**Then** wird ein Admin-User erstellt
**And** ein Server-Access-Token wird automatisch generiert
**And** der Raw-Token wird **einmalig** in der Response zurueckgegeben
**And** der Token-Hash wird in der Datenbank gespeichert

**AC2: Response-Format**

**Given** ein erfolgreicher Setup-Request
**When** die Response zurueckgegeben wird
**Then** enthaelt sie:
```json
{
  "data": {
    "user": { "id": "...", "email": "...", "role": "ADMIN" },
    "accessToken": {
      "token": "blh_xxx...",
      "name": "Initial Setup Token",
      "createdAt": "2026-01-06T..."
    }
  }
}
```
**And** die UI zeigt einen Hinweis: "Speichern Sie diesen Token sicher - er wird nicht erneut angezeigt!"

**AC3: Token-Generierung**

**Given** ein Setup-Request im Secure-Mode
**When** der Token generiert wird
**Then** hat er das Format `blh_` + cuid2 (28 Zeichen)
**And** nur der bcrypt-Hash wird gespeichert (cost 10)
**And** der Token-Name ist "Initial Setup Token"
**And** ein `ServerAccessTokenCreatedEvent` wird in die Outbox geschrieben

**AC4: Audit-Trail**

**Given** ein erfolgreicher Setup
**When** der Token erstellt wird
**Then** wird ein Log-Eintrag geschrieben: `"Server setup completed. Initial access token created (prefix: blh_xxx)"`
**And** der vollstaendige Token-Wert wird NICHT geloggt

**AC5: Setup nur einmal moeglich**

**Given** der Server hat bereits einen Admin-User
**When** ein POST an `/admin/setup` gesendet wird
**Then** wird 400 Bad Request zurueckgegeben
**And** die Response enthaelt `{ error: "SETUP_ALREADY_COMPLETED" }`

#### Technical Notes

- Handler: `CompleteSetupHandler` in `application/admin/commands/`
- Token-Generierung: `blh_${createId()}` mit @paralleldrive/cuid2
- Hashing: `bcrypt.hash(token, 10)`
- Outbox-Pattern fuer atomare Event-Speicherung
- Response mit `@ApiWrappedCreatedResponse` dekorieren

**FRs:** FR31
**NFRs:** NFR-S1 (bcrypt), NFR-S2 (Token-Format), NFR-S7 (Token einmalig anzeigen), NFR-S8 (Audit-Trail)

---

### Story 1.4: Differenzierter Health-Endpoint

Als **Client-Entwickler**,
moechte ich **vom Health-Endpoint unterschiedliche Informationen je nach Token-Status erhalten**,
damit **ich den Server-Status ohne Authentifizierung pruefen, aber keine sensiblen Daten leaken kann**.

#### Acceptance Criteria

**AC1: Health ohne Token**

**Given** ein Request an `GET /health` ohne `X-Server-Access-Token` Header
**When** der Server antwortet
**Then** enthaelt die Response nur:
```json
{
  "status": "ok",
  "setupComplete": true,
  "version": "1.0.0-alpha.37"
}
```
**And** keine weiteren System-Informationen werden preisgegeben

**AC2: Health mit gueltigem Token**

**Given** ein Request an `GET /health` mit gueltigem `X-Server-Access-Token`
**When** der Server antwortet
**Then** enthaelt die Response erweiterte Informationen:
```json
{
  "status": "ok",
  "setupComplete": true,
  "version": "1.0.0-alpha.37",
  "serverName": "DRK Kreisverband Musterstadt",
  "database": "connected",
  "uptime": 12345
}
```

**AC3: Health im Setup-Pending-Mode**

**Given** ein Server im Setup-Pending-Mode
**When** ein Request an `GET /health` gesendet wird
**Then** ist `setupComplete: false`
**And** der Endpoint ist auch ohne Token erreichbar (Whitelist)

**AC4: Guard-Bypass fuer Health**

**Given** der Health-Controller
**When** der `/health` Endpoint definiert wird
**Then** ist er mit `@SkipServerAccess()` und `@SkipSetupCheck()` dekoriert
**And** die Token-Pruefung erfolgt manuell im Controller (optional enhanced response)

**AC5: Rueckwaertskompatibilitaet**

**Given** ein bestehender Client der `/health` aufruft
**When** die Aenderungen deployed werden
**Then** funktioniert der Health-Check weiterhin ohne Breaking Changes
**And** das Basis-Response-Schema bleibt stabil

#### Technical Notes

- Health-Controller in `modules/health/` erweitern
- Conditional Logic: Token vorhanden -> erweiterte Response
- Kein Cache fuer Setup-Status im Health (immer aktuell)
- OpenAPI-Schema fuer beide Response-Varianten dokumentieren

**FRs:** FR13
**NFRs:** NFR-I5 (Rueckwaertskompatibilitaet), NFR-P4 (Health-Check <5s Timeout)

---

### Story 1.5: INSECURE_MODE fuer Entwicklung

Als **Entwickler**,
moechte ich **einen INSECURE_MODE aktivieren koennen, der Token-Validierung ueberspringt**,
damit **ich lokal ohne Access-Token entwickeln kann**.

#### Acceptance Criteria

**AC1: Environment-Variable**

**Given** die Backend-Konfiguration
**When** die Env-Variable `INSECURE_MODE=true` gesetzt ist
**Then** ueberspringt der `ServerAccessGuard` die Token-Validierung
**And** eine Warnung wird beim Server-Start geloggt: `"⚠️ INSECURE_MODE aktiv - Token-Validierung deaktiviert!"`

**AC2: Default-Wert**

**Given** keine `INSECURE_MODE` Env-Variable
**When** der Server startet
**Then** ist der Default-Wert `false`
**And** Token-Validierung ist aktiv (Secure-by-Default)

**AC3: Health-Response im INSECURE_MODE**

**Given** der Server laeuft im INSECURE_MODE
**When** ein Health-Check durchgefuehrt wird
**Then** enthaelt die Response `"insecureMode": true`
**And** Clients koennen diese Information zur Warnung nutzen

**AC4: Startup-Log**

**Given** der Server startet
**When** INSECURE_MODE=true
**Then** erscheint beim Start:
```
⚠️ ====================================
⚠️ INSECURE_MODE ACTIVE
⚠️ Token validation is DISABLED
⚠️ DO NOT USE IN PRODUCTION
⚠️ ====================================
```

**AC5: Production-Warning**

**Given** der Server startet mit INSECURE_MODE=true
**When** NODE_ENV=production
**Then** wird zusaetzlich ein Error-Log geschrieben: `"CRITICAL: INSECURE_MODE in production environment!"`
**And** der Server startet trotzdem (kein Crash, aber deutliche Warnung)

#### Technical Notes

- ConfigService fuer INSECURE_MODE Auswertung
- Guard-Injection: `ServerAccessGuard` prueft INSECURE_MODE vor Validierung
- Kein separate "Insecure Guard" - Integration in bestehenden Guard

**FRs:** FR14
**NFRs:** NFR-S6 (Token nur ueber HTTPS ausser INSECURE_MODE)

---

### Story 1.6: Invite-Code erstellen

Als **Server-Administrator**,
moechte ich **Invite-Codes mit Ablaufdatum erstellen koennen**,
damit **ich Einsatzkraeften einen sicheren Onboarding-Link bereitstellen kann**.

#### Acceptance Criteria

**AC1: Prisma Model fuer InviteCode**

**Given** das Backend-Projekt
**When** die Migration ausgefuehrt wird
**Then** existiert eine InviteCode-Tabelle mit den Feldern:
- `id` (cuid, Primary Key)
- `code` (String, unique, indexed)
- `expiresAt` (DateTime)
- `maxUses` (Int, default: 1)
- `useCount` (Int, default: 0)
- `createdAt` (DateTime, default: now())
- `createdById` (String, FK zu User)
**And** die ServerAccessToken-Tabelle wird um `inviteCodeId` (String, optional, unique, FK zu InviteCode) erweitert
**And** bidirektionale Relation existiert: InviteCode.redeemedToken <-> ServerAccessToken.inviteCode

**AC2: InviteCode Domain Entity**

**Given** die Domain-Schicht
**When** ein InviteCode erstellt wird
**Then** validiert die Entity:
- `expiresAt` muss in der Zukunft liegen
- `maxUses` muss >= 1 sein
- `code` wird automatisch generiert (8 alphanumerische Zeichen)
**And** emittiert `InviteCodeCreatedEvent`

**AC3: CreateInviteHandler**

**Given** ein Admin-User
**When** POST `/admin/invites` mit Body `{ expiresAt: "...", maxUses: 1, label?: "..." }` aufgerufen wird
**Then** wird ein InviteCode erstellt
**And** die Response enthaelt:
```json
{
  "data": {
    "id": "...",
    "code": "A1B2C3D4",
    "expiresAt": "2026-01-07T18:00:00Z",
    "maxUses": 1,
    "useCount": 0,
    "deepLink": "bluelight://connect?url=https://api.example.de&invite=A1B2C3D4&expires=...",
    "webLink": "https://app.example.de?server=https://api.example.de&invite=A1B2C3D4"
  }
}
```

**AC4: Code-Generierung**

**Given** ein neuer Invite-Code
**When** der Code generiert wird
**Then** besteht er aus 8 alphanumerischen Zeichen (A-Z, 0-9, keine Verwechslungsgefahr: kein O/0, I/1/l)
**And** die Entropie ist mindestens 128 Bit (NFR-S5)
**And** Uniqueness wird durch DB-Constraint sichergestellt

**AC5: Rate-Limiting**

**Given** ein Admin erstellt Invite-Codes
**When** mehr als 10 Codes pro Minute erstellt werden
**Then** wird 429 Too Many Requests zurueckgegeben
**And** @nestjs/throttler enforced das Limit

**AC6: Audit-Trail**

**Given** ein Invite-Code wird erstellt
**When** die Operation erfolgreich ist
**Then** wird geloggt: `"Invite code created (id: xxx, expires: ..., by: admin@example.de)"`
**And** der Code-Wert selbst wird NICHT geloggt

#### Technical Notes

- Handler: `CreateInviteHandler` in `application/admin/commands/`
- Controller: `AdminInviteController` in `modules/admin/controllers/`
- Code-Alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 Zeichen ohne Verwechslung)
- Deep-Link-URL basiert auf Server-Config (baseUrl)
- @nestjs/throttler fuer Rate-Limiting

**FRs:** FR17
**NFRs:** NFR-S5 (Invite-Code Entropie), NFR-S8 (Audit-Trail), NFR-S3 (Rate-Limiting)

---

### Story 1.7: Invite-Code verwalten

Als **Server-Administrator**,
moechte ich **alle Invite-Codes einsehen und widerrufen koennen**,
damit **ich die Kontrolle ueber Onboarding-Links behalte**.

#### Acceptance Criteria

**AC1: Invite-Code-Liste abrufen**

**Given** ein Admin-User
**When** GET `/admin/invites` aufgerufen wird
**Then** wird eine Liste aller Invite-Codes zurueckgegeben:
```json
{
  "data": [
    {
      "id": "...",
      "code": "A1B2C3D4",
      "expiresAt": "2026-01-07T18:00:00Z",
      "maxUses": 1,
      "useCount": 0,
      "status": "active",
      "createdAt": "2026-01-06T12:00:00Z",
      "createdBy": { "id": "...", "email": "admin@example.de" },
      "redeemedToken": null
    }
  ],
  "meta": { "total": 1 }
}
```

**AC2: Status-Berechnung**

**Given** ein Invite-Code
**When** der Status angezeigt wird
**Then** ist er:
- `active`: `useCount < maxUses` AND `expiresAt > now()` AND nicht widerrufen
- `used`: `useCount >= maxUses`
- `expired`: `expiresAt <= now()`
- `revoked`: Code wurde explizit widerrufen

**AC3: Invite-Code widerrufen**

**Given** ein aktiver Invite-Code
**When** DELETE `/admin/invites/:id` aufgerufen wird
**Then** wird der Code als widerrufen markiert (Soft Delete)
**And** der Status wechselt zu `revoked`
**And** ein `InviteCodeRevokedEvent` wird emittiert
**And** die Response ist 200 OK mit dem aktualisierten Code

**AC4: Widerruf eines bereits genutzten Codes**

**Given** ein Invite-Code mit Status `used`
**When** DELETE aufgerufen wird
**Then** ist die Operation erfolgreich (idempotent)
**And** der Status bleibt `used` (nicht `revoked`)

**AC5: Filter und Sortierung**

**Given** die Invite-Code-Liste
**When** Query-Parameter uebergeben werden:
- `?status=active` (nur aktive)
- `?createdBy=userId` (nur von bestimmtem Admin)
- `?sort=expiresAt:asc` (Sortierung)
**Then** werden die Ergebnisse entsprechend gefiltert und sortiert

**AC6: Audit-Trail fuer Widerruf**

**Given** ein Invite-Code wird widerrufen
**When** die Operation erfolgreich ist
**Then** wird geloggt: `"Invite code revoked (id: xxx, by: admin@example.de)"`

#### Technical Notes

- Handler: `ListInvitesHandler` (Query), `RevokeInviteHandler` (Command)
- Controller: `AdminInviteController` in `modules/admin/controllers/`
- Status ist ein computed field, nicht in DB gespeichert
- Soft-Delete via `revokedAt` Timestamp (optional: neues Feld hinzufuegen)
- Pagination mit Standard-Pattern (page, pageSize)

**FRs:** FR18, FR19
**NFRs:** NFR-S8 (Audit-Trail)

---

### Epic 1 Zusammenfassung

| Story | Titel | FRs | Haupt-NFRs | Abhaengigkeiten |
|-------|-------|-----|------------|-----------------|
| 1.1 | Server-Access-Token Infrastruktur | FR9, FR12 | NFR-S1, NFR-S2, NFR-P1 | - |
| 1.2 | Setup-Pending-Mode | FR37, FR38 | NFR-P1 | Story 1.1 |
| 1.3 | Admin-Setup mit Token-Erstellung | FR31 | NFR-S1, NFR-S2, NFR-S7, NFR-S8 | Story 1.1, Story 1.2 |
| 1.4 | Differenzierter Health-Endpoint | FR13 | NFR-I5, NFR-P4 | Story 1.1, Story 1.2 |
| 1.5 | INSECURE_MODE fuer Entwicklung | FR14 | NFR-S6 | Story 1.1 |
| 1.6 | Invite-Code erstellen | FR17 | NFR-S5, NFR-S8, NFR-S3 | Story 1.1 |
| 1.7 | Invite-Code verwalten | FR18, FR19 | NFR-S8 | Story 1.6 |

**Empfohlene Implementierungsreihenfolge:**
1. Story 1.1 (Token-Infrastruktur - Basis fuer alles)
2. Story 1.2 (Setup-Pending-Mode)
3. Story 1.5 (INSECURE_MODE - erleichtert Entwicklung)
4. Story 1.3 (Admin-Setup)
5. Story 1.4 (Health-Endpoint)
6. Story 1.6 (Invite erstellen)
7. Story 1.7 (Invite verwalten)

## Epic 2: Client-Onboarding & Server-Verbindung

Einsatzkraefte koennen ueber Deep Links, URL-Parameter oder manuelles Formular einem Server beitreten und nahtlos Access-Tokens erhalten.

**FRs abgedeckt:** FR1, FR6, FR20-25, FR32-36, FR39-40

**Relevante NFRs:**
- NFR-P3: Deep Link < 3s
- NFR-P5: Server-Liste laden < 200ms
- NFR-I1: Deep Link Schema bluelight://connect
- NFR-I2: URL-Parameter ?server= und ?invite=
- NFR-I3: Tauri plugin-store v2.x
- NFR-R1: Offline Server-Liste
- NFR-R4: Token ueberlebt App-Updates
- NFR-U1: Server-Setup < 2min
- NFR-U5: Deep Link Feedback

---

### Story 2.1: Platform Storage Adapter

Als **Entwickler**,
moechte ich **einen plattform-agnostischen Storage-Adapter fuer Server-Konfigurationen**,
damit **die Anwendung auf Desktop (Tauri) und Web (Browser) dieselbe Logik nutzen kann**.

#### Acceptance Criteria

**AC1: Tauri Desktop Storage**

**Given** die Anwendung laeuft auf einer Tauri Desktop-Plattform
**When** ein Server-Config gespeichert wird
**Then** wird die Konfiguration ueber @tauri-apps/plugin-store verschluesselt gespeichert
**And** der Speichervorgang ist fuer den Nutzer nicht sichtbar (keine UI-Interaktion)

**AC2: Browser Storage**

**Given** die Anwendung laeuft in einem Web-Browser
**When** ein Server-Config gespeichert wird
**Then** wird die Konfiguration im localStorage gespeichert
**And** ein Flag `storageType: 'insecure'` wird mitgespeichert

**AC3: Plattform-Erkennung**

**Given** die Anwendung startet
**When** der Storage-Adapter initialisiert wird
**Then** erkennt das System automatisch die Plattform (Tauri vs. Browser)
**And** waehlt den entsprechenden Adapter (TauriStorageAdapter oder BrowserStorageAdapter)

**AC4: Persistenz nach Updates**

**Given** ein gespeicherter Server existiert
**When** die App nach einem Update oder Neustart geoeffnet wird
**Then** sind alle Server-Konfigurationen inkl. Access-Tokens weiterhin verfuegbar
**And** die Ladezeit betraegt weniger als 200ms (NFR-P5)

**AC5: Offline-Verfuegbarkeit**

**Given** der Nutzer ist offline
**When** die App geoeffnet wird
**Then** ist die Server-Liste aus dem lokalen Storage verfuegbar (NFR-R1)

#### Technical Notes

- Interface: `features/server/adapters/i-server-storage.adapter.ts`
- Implementierungen: `tauri-storage.adapter.ts`, `browser-storage.adapter.ts`
- Plattform-Erkennung: `shared/lib/platform.ts` mit `isTauri()` Helper
- Tauri Plugin: @tauri-apps/plugin-store v2.x (NFR-I3)
- ServerConfig Interface: id, name, url, accessToken, isDefault, createdAt, lastUsedAt

**FRs:** FR32, FR33, FR34
**NFRs:** NFR-I3, NFR-P5, NFR-R1, NFR-R4, NFR-S4

---

### Story 2.2: Server Store & Persistence

Als **Nutzer**,
moechte ich **dass meine konfigurierten Server persistent gespeichert werden**,
damit **ich nach App-Neustarts nicht erneut Server hinzufuegen muss**.

#### Acceptance Criteria

**AC1: Server hinzufuegen**

**Given** der Server Store ist initialisiert
**When** ein neuer Server hinzugefuegt wird
**Then** wird der Server im TanStack Store gespeichert
**And** der Storage-Adapter synchronisiert die Aenderung persistent
**And** der Server erscheint sofort in der Server-Liste (reaktiv)

**AC2: Aktiven Server setzen**

**Given** mehrere Server sind konfiguriert
**When** ein Server als aktiv ausgewaehlt wird
**Then** wird `activeServerId` im Store aktualisiert
**And** der zuletzt verwendete Server wird als Default markiert (isDefault: true)
**And** alle anderen Server haben isDefault: false

**AC3: Store-Hydration beim Start**

**Given** die App wird gestartet
**When** der Server Store initialisiert wird
**Then** werden alle Server aus dem Storage-Adapter geladen
**And** der Store-State wird mit den persistierten Daten hydratisiert
**And** der Default-Server wird als aktiv gesetzt

**AC4: Server loeschen**

**Given** ein Server wird geloescht
**When** die Loeschaktion bestaetigt wird
**Then** wird der Server aus dem Store entfernt
**And** der Storage-Adapter entfernt den Server persistent
**And** war es der aktive Server, wird ein anderer Server aktiv (oder null bei 0 Servern)

**AC5: Connection-Status**

**Given** die Netzwerkverbindung besteht
**When** der Connection-Status eines Servers geprueft wird
**Then** wird der Status in connectionStatus Map aktualisiert ('connected' | 'disconnected' | 'checking')

#### Technical Notes

- Store: `features/server/stores/server.store.ts` mit TanStack Store
- State-Interface: `ServerState { servers, activeServerId, connectionStatus }`
- Hook: `useStore(serverStore, selector)` fuer reaktive Komponenten
- Hooks: `use-active-server.ts`, `use-server-list.ts`, `use-platform-storage.ts`
- Sync-Logik: Store-Aenderungen triggern Adapter-Persist

**FRs:** FR1, FR6
**NFRs:** NFR-P5, NFR-R1

---

### Story 2.3: Invite-Code Exchange Endpoint

Als **Einsatzkraft**,
moechte ich **einen Invite-Code gegen ein dauerhaftes Access-Token eintauschen koennen**,
damit **ich nach dem Onboarding dauerhaften Zugriff auf den Server habe**.

#### Acceptance Criteria

**AC1: Erfolgreicher Exchange**

**Given** ein gueltiger Invite-Code existiert
**When** POST /auth/exchange-invite mit { inviteCode: "INV_xxx" } aufgerufen wird
**Then** gibt der Server { accessToken: "blh_xxx", serverInfo: { name, version, baseUrl } } zurueck
**And** der Invite-Code wird als "verwendet" markiert (usedAt gesetzt)
**And** der HTTP-Status ist 200

**AC2: Abgelaufener Invite-Code**

**Given** ein abgelaufener Invite-Code
**When** POST /auth/exchange-invite aufgerufen wird
**Then** gibt der Server HTTP 400 mit code: "INVITE_EXPIRED" zurueck
**And** die Fehlermeldung ist: "Dieser Einladungscode ist abgelaufen."
**And** der Invite-Code wird NICHT als verwendet markiert

**AC3: Bereits verwendeter Invite-Code**

**Given** ein bereits verwendeter Invite-Code
**When** POST /auth/exchange-invite aufgerufen wird
**Then** gibt der Server HTTP 400 mit code: "INVITE_ALREADY_USED" zurueck
**And** die Fehlermeldung ist: "Dieser Einladungscode wurde bereits verwendet."

**AC4: Ungueltiger Invite-Code**

**Given** ein ungueltiger/nicht existierender Invite-Code
**When** POST /auth/exchange-invite aufgerufen wird
**Then** gibt der Server HTTP 400 mit code: "INVITE_INVALID" zurueck
**And** die Fehlermeldung ist: "Ungueltiger Einladungscode."

**AC5: Rate-Limiting**

**Given** mehr als 5 Exchange-Versuche von derselben IP in einer Minute
**When** ein weiterer POST /auth/exchange-invite aufgerufen wird
**Then** gibt der Server HTTP 429 mit code: "INVITE_RATE_LIMITED" zurueck
**And** die Fehlermeldung ist: "Zu viele Anfragen. Bitte warte eine Minute."

**AC6: Atomare Race-Condition Prevention**

**Given** zwei gleichzeitige Exchange-Requests fuer denselben Invite-Code
**When** beide Requests den Server erreichen
**Then** wird nur der erste Request erfolgreich abgeschlossen
**And** der zweite erhaelt INVITE_ALREADY_USED (NFR-R3: Atomare Markierung)

#### Technical Notes

- Handler: `application/auth/commands/exchange-invite.handler.ts`
- DTO: `exchange-invite.dto.ts`, `exchange-invite-response.dto.ts`
- Controller: `modules/auth/controllers/auth.controller.ts` erweitern
- Rate-Limiter: @nestjs/throttler mit `@Throttle({ default: { limit: 5, ttl: 60000 } })`
- Decorators: `@SkipServerAccess()` und `@SkipSetupCheck()` fuer diesen Endpoint
- Repository: `PrismaInviteCodeRepository` mit atomarer Update-Query
- Event: `InviteCodeRedeemedEvent` nach erfolgreichem Exchange

**FRs:** FR20, FR21, FR22
**NFRs:** NFR-S3, NFR-R3

---

### Story 2.4: Deep Link Integration (Desktop)

Als **Einsatzkraft mit Desktop-App**,
moechte ich **einen Deep Link klicken und automatisch dem Server beitreten**,
damit **ich ohne manuelle Eingabe onboarded werde**.

#### Acceptance Criteria

**AC1: Deep Link oeffnet App**

**Given** die Desktop-App ist installiert
**When** ein Deep Link `bluelight://connect?url=https://api.example.de&invite=INV_xxx` geklickt wird
**Then** oeffnet sich die Bluelight Hub App (oder wird in den Vordergrund geholt)
**And** die Deep Link Parameter werden extrahiert (url, invite, optional: expires)
**And** der Exchange-Prozess startet automatisch

**AC2: Deep Link bei geschlossener App**

**Given** die Desktop-App ist geschlossen
**When** ein Deep Link geklickt wird
**Then** startet die App
**And** die Deep Link Parameter werden beim Start verarbeitet (NFR-I1)
**And** der gesamte Prozess dauert weniger als 3 Sekunden (NFR-P3)

**AC3: Erfolgreicher Exchange via Deep Link**

**Given** der Deep Link verarbeitet wird
**When** der Exchange erfolgreich ist
**Then** wird der Server zur Liste hinzugefuegt
**And** ein Toast zeigt "Server '[Name]' hinzugefuegt" (2-3s sichtbar)
**And** der Nutzer wird zum Login-Screen weitergeleitet
**And** der neue Server ist im Dropdown vorausgewaehlt

**AC4: Visuelles Feedback**

**Given** der Deep Link verarbeitet wird
**When** waehrend der Verarbeitung
**Then** wird ein visuelles Feedback angezeigt (Spinner + "Verbinde mit Server...")
**And** der Nutzer sieht den Fortschritt (NFR-U5)

**AC5: Abgelaufener Deep Link (Client-Check)**

**Given** die App erkennt einen Deep Link
**When** das `expires` Datum bereits ueberschritten ist (Client-Side Check)
**Then** wird der Exchange NICHT gestartet
**And** eine Error-Card zeigt: "Dieser Einladungslink ist abgelaufen."
**And** eine CTA zeigt: "Fordere einen neuen Link bei deinem Administrator an."

#### Technical Notes

- Service: `features/server/services/deep-link.service.ts`
- Tauri Plugin: @tauri-apps/plugin-deep-link
- Deep Link Schema: `bluelight://connect` in `tauri.conf.json` registrieren
- URL-Parsing: `url`, `invite`, `expires` Parameter extrahieren
- Event Pattern: DeepLinkService emittiert Events, Store reagiert
- Integration: DeepLinkService -> useExchangeInvite Mutation -> ServerStore.addServer()

**FRs:** FR23, FR35
**NFRs:** NFR-P3, NFR-I1, NFR-U5

---

### Story 2.5: Web URL-Parameter Support

Als **Einsatzkraft mit Web-Browser**,
moechte ich **ueber URL-Parameter einem Server beitreten koennen**,
damit **ich auch ohne Desktop-App das Onboarding durchfuehren kann**.

#### Acceptance Criteria

**AC1: URL-Parameter Extraktion**

**Given** die Web-App wird mit URL-Parametern aufgerufen
**When** die URL `https://app.bluelight-hub.de?server=https://api.example.de&invite=INV_xxx` ist
**Then** werden die Parameter `server` und `invite` extrahiert
**And** der Exchange-Prozess startet automatisch
**And** nach Erfolg werden die Parameter aus der URL entfernt (History Replace)

**AC2: Nur Server-Parameter**

**Given** nur der `server` Parameter ist vorhanden (ohne invite)
**When** die Web-App geladen wird
**Then** wird der Server-URL im ServerSetupForm vorausgefuellt
**And** der Nutzer muss den Invite-Code manuell eingeben

**AC3: Erfolgreicher Exchange via URL**

**Given** die URL-Parameter verarbeitet werden
**When** der Exchange erfolgreich ist
**Then** wird der Server zur Liste hinzugefuegt
**And** ein Toast zeigt "Server '[Name]' hinzugefuegt"
**And** der Nutzer wird zum Login-Screen weitergeleitet

**AC4: Fehlerbehandlung**

**Given** die URL-Parameter verarbeitet werden
**When** ein Fehler auftritt (Invite abgelaufen, ungueltig, etc.)
**Then** wird eine Error-Card mit klarer Fehlermeldung angezeigt
**And** der Nutzer kann manuell fortfahren (ServerSetupForm)

**AC5: Bestehende Server erhalten**

**Given** die Web-App mit URL-Parametern geoeffnet wird
**When** bereits Server konfiguriert sind
**Then** wird trotzdem der neue Server via Exchange hinzugefuegt
**And** bestehende Server bleiben erhalten

#### Technical Notes

- Hook: `features/server/hooks/use-url-params.ts` fuer Parameter-Extraktion
- Router-Integration: TanStack Router Search Params
- Parameter: `?server=<url>&invite=<code>` (NFR-I2)
- Nach Erfolg: `router.navigate({ search: {} })` zum Entfernen der Parameter
- Fallback: Bei fehlendem Invite-Code -> ServerSetupForm mit vorausgefuellter URL

**FRs:** FR24
**NFRs:** NFR-I2

---

### Story 2.6: Manuelles Server-Setup-Formular

Als **Einsatzkraft**,
moechte ich **einen Server manuell per Formular hinzufuegen koennen**,
damit **ich auch ohne Deep Link onboarden kann**.

#### Acceptance Criteria

**AC1: Automatische Anzeige bei leerem Server-State**

**Given** kein Server ist konfiguriert
**When** die App geoeffnet wird
**Then** wird automatisch das ServerSetupForm angezeigt
**And** der Nutzer kann nicht zum Login navigieren ohne Server hinzuzufuegen

**AC2: Formular-Felder**

**Given** das ServerSetupForm ist sichtbar
**When** der Nutzer die Felder ausfuellt
**Then** sind folgende Felder vorhanden: Server-URL (required), Invite-Code (required), Server-Name (optional)
**And** die URL wird auf gueltiges Format validiert (https:// oder http:// fuer INSECURE_MODE)
**And** der Invite-Code wird auf Laenge validiert (min. 6 Zeichen)

**AC3: Connection-Test vor Exchange**

**Given** gueltige Daten wurden eingegeben
**When** der Nutzer "Verbinden" klickt
**Then** wird erst ein Health-Check ausgefuehrt (FR39)
**And** bei erfolgreichem Health-Check wird der Exchange gestartet
**And** ein Spinner zeigt den Fortschritt

**AC4: Health-Check Fehler**

**Given** der Health-Check schlaegt fehl
**When** der Server nicht erreichbar ist
**Then** wird ein Inline-Error angezeigt: "Server nicht erreichbar. Pruefe die URL."
**And** eine "Erneut versuchen" Option ist verfuegbar
**And** der Timeout betraegt 5 Sekunden (NFR-P4)

**AC5: Erfolgreicher Setup**

**Given** der Exchange erfolgreich ist
**When** der Server hinzugefuegt wurde
**Then** wird ein Toast "Server '[Name]' hinzugefuegt" angezeigt
**And** der Nutzer wird zum Login-Screen weitergeleitet
**And** der gesamte Prozess dauert weniger als 2 Minuten (NFR-U1)

**AC6: URL-Validierung**

**Given** die URL-Validierung
**When** eine ungueltige URL eingegeben wird
**Then** erscheint ein Inline-Error unter dem Feld
**And** die Validierung erfolgt onBlur und onChange nach erstem Blur

#### Technical Notes

- Komponente: `features/server/ui/organisms/ServerSetupForm.tsx`
- Form: @tanstack/react-form mit zodValidator
- Schema: `features/server/schemas/server-config.schema.ts`
- Validierung: Zod Schema fuer URL-Format und Invite-Code-Laenge
- Health-Check: `api.health.check()` vor Exchange aufrufen
- Styling: Tailwind CSS, `space-y-4` zwischen Feldgruppen

**FRs:** FR25, FR39
**NFRs:** NFR-U1, NFR-P4

---

### Story 2.7: Onboarding Error Handling & Browser-Warnung

Als **Nutzer**,
moechte ich **bei Fehlern klare Handlungsanweisungen erhalten und im Browser ueber Sicherheitsrisiken informiert werden**,
damit **ich weiss was zu tun ist und informierte Entscheidungen treffen kann**.

#### Acceptance Criteria

**AC1: Abgelaufener Invite-Code Error**

**Given** ein Invite-Code ist abgelaufen
**When** der Exchange fehlschlaegt mit INVITE_EXPIRED
**Then** wird eine Error-Card (fullscreen/prominent) angezeigt
**And** der Titel ist: "Einladungslink abgelaufen"
**And** die Nachricht ist: "Dieser Einladungslink ist nicht mehr gueltig."
**And** die CTA ist: "Fordere einen neuen Link bei deinem Administrator an."
**And** optional wird Admin-Kontakt angezeigt falls verfuegbar

**AC2: Bereits verwendeter Invite-Code Error**

**Given** ein Invite-Code wurde bereits verwendet
**When** der Exchange fehlschlaegt mit INVITE_ALREADY_USED
**Then** wird eine Error-Card angezeigt
**And** der Titel ist: "Link bereits verwendet"
**And** die Nachricht ist: "Dieser Einladungslink wurde bereits eingeloest."
**And** die CTA ist: "Falls du Probleme hast, kontaktiere deinen Administrator."

**AC3: Server nicht erreichbar Error**

**Given** der Server ist nicht erreichbar
**When** der Health-Check oder Exchange fehlschlaegt (Netzwerk-Error)
**Then** wird ein Inline-Alert angezeigt (nicht fullscreen)
**And** die Nachricht ist: "Server nicht erreichbar."
**And** eine "Erneut versuchen" Button ist vorhanden
**And** die Fehlermeldung erscheint in unter 2 Sekunden (NFR-R2)

**AC4: Browser-Sicherheitswarnung**

**Given** die App laeuft im Web-Browser
**When** ein Server erfolgreich hinzugefuegt wird
**Then** wird eine Sicherheitswarnung angezeigt (Banner/Alert, nicht Modal)
**And** der Text ist: "Im Browser werden Server-Daten unverschluesselt gespeichert. Fuer maximale Sicherheit nutze die Desktop-App."
**And** die Warnung ist sichtbar ohne Scrollen auf der Login-Page (NFR-U4)
**And** die Warnung kann dismissed werden (merkt sich Dismiss fuer Session)

**AC5: Keine Warnung in Tauri**

**Given** die App laeuft in Tauri Desktop
**When** ein Server hinzugefuegt wird
**Then** wird KEINE Sicherheitswarnung angezeigt
**And** Daten werden verschluesselt gespeichert

**AC6: Generischer Fehler**

**Given** ein unbekannter Fehler tritt auf
**When** der Exchange mit unbekanntem Error fehlschlaegt
**Then** wird eine generische Error-Card angezeigt
**And** die Nachricht ist: "Ein unerwarteter Fehler ist aufgetreten."
**And** die CTA ist: "Erneut versuchen" und "Manuell einrichten"

**AC7: Deutsche Fehlermeldungen**

**Given** alle Fehlermeldungen
**When** sie angezeigt werden
**Then** sind sie in deutscher Sprache (NFR-U3)
**And** enthalten eine klare Handlungsanweisung (actionable)

#### Technical Notes

- Error-Card Komponente: Basierend auf bestehender `Alert` Atom mit erweiterten Props
- Error-Codes Mapping: `INVITE_EXPIRED`, `INVITE_ALREADY_USED`, `INVITE_INVALID`, `INVITE_RATE_LIMITED`, `SERVER_NOT_SETUP`
- Browser-Warnung: Conditional Rendering basierend auf `!isTauri()`
- Warnung-Position: Fixed Banner oberhalb des Login-Formulars
- Session-Storage fuer Dismiss-State der Browser-Warnung
- Toast fuer nicht-blockierende Fehler, Error-Card fuer blockierende

**FRs:** FR36, FR40
**NFRs:** NFR-U3, NFR-U4, NFR-R2

---

### Epic 2 Zusammenfassung

| Story | Titel | FRs | NFRs | Abhaengigkeiten |
|-------|-------|-----|------|-----------------|
| 2.1 | Platform Storage Adapter | FR32-34 | NFR-I3, NFR-P5, NFR-R1, NFR-R4, NFR-S4 | Keine |
| 2.2 | Server Store & Persistence | FR1, FR6 | NFR-P5, NFR-R1 | 2.1 |
| 2.3 | Invite-Code Exchange Endpoint | FR20-22 | NFR-S3, NFR-R3 | Epic 1 (InviteCode Entity) |
| 2.4 | Deep Link Integration | FR23, FR35 | NFR-P3, NFR-I1, NFR-U5 | 2.1, 2.2, 2.3 |
| 2.5 | Web URL-Parameter Support | FR24 | NFR-I2 | 2.1, 2.2, 2.3 |
| 2.6 | Manuelles Server-Setup-Formular | FR25, FR39 | NFR-U1, NFR-P4 | 2.1, 2.2, 2.3 |
| 2.7 | Onboarding Error Handling | FR36, FR40 | NFR-U3, NFR-U4, NFR-R2 | 2.4, 2.5, 2.6 |

**Empfohlene Implementierungs-Reihenfolge:**
1. Story 2.1 (Storage Adapter) - Foundation
2. Story 2.2 (Server Store) - State Management
3. Story 2.3 (Exchange Endpoint) - Backend API
4. Story 2.6 (Manuelles Formular) - Basis-UI
5. Story 2.4 (Deep Link) - Desktop-Integration
6. Story 2.5 (URL-Parameter) - Web-Integration
7. Story 2.7 (Error Handling) - Polish & UX

## Epic 3: Server-Auswahl & -Management

Nutzer koennen zwischen mehreren Servern wechseln, ihre Server-Liste verwalten, und eine intuitive Login-Erfahrung mit klarer Server-Identitaet nutzen.

**FRs abgedeckt:** FR2, FR3, FR4, FR5, FR7, FR8, FR10, FR11

**Relevante NFRs:**
- NFR-P2: Server-Dropdown < 50ms Reaktionszeit
- NFR-U2: Server-Wechsel max 3 Klicks
- NFR-U3: Fehlermeldungen Deutsch, actionable
- NFR-R5: Bei Token-Fehler -> Login-Screen

---

### Story 3.1: Server-Liste anzeigen

Als **Nutzer mit mehreren konfigurierten Servern**,
moechte ich **eine uebersichtliche Liste aller meiner gespeicherten Server einsehen koennen**,
damit **ich einen Ueberblick ueber meine verfuegbaren Organisationen habe und bei Bedarf Server verwalten kann**.

#### Acceptance Criteria

**AC1: Server-Liste in Einstellungen**

**Given** der Nutzer hat mindestens einen Server konfiguriert
**When** der Nutzer die Server-Verwaltung in den Einstellungen oeffnet
**Then** wird eine Liste aller konfigurierten Server angezeigt
**And** jeder Eintrag zeigt Server-Name, URL und Online-Status

**AC2: Sortierung nach Nutzung**

**Given** die Server-Liste wird angezeigt
**When** der Nutzer die Liste betrachtet
**Then** sind die Server nach "Zuletzt verwendet" sortiert (neueste zuerst)
**And** der zuletzt verwendete Server ist visuell hervorgehoben

**AC3: Offline-Server-Anzeige**

**Given** ein Server ist offline oder nicht erreichbar
**When** die Liste geladen wird
**Then** zeigt der Status-Indikator "Offline" (grauer Punkt) an
**And** der Server bleibt in der Liste auswaehlbar

**AC4: Online-Server-Anzeige**

**Given** ein Server ist online und erreichbar
**When** die Liste geladen wird
**Then** zeigt der Status-Indikator "Online" (gruener Punkt) an

**AC5: Leere Server-Liste**

**Given** die Server-Liste ist leer
**When** der Nutzer die Server-Verwaltung oeffnet
**Then** wird ein Empty State mit Hinweis "Keine Server konfiguriert" angezeigt
**And** ein CTA-Button "Server hinzufuegen" ist sichtbar

#### Technical Notes

- Komponente: `ServerListItem` (Molecule) - zeigt Server-Name, URL, Status, Last-Used
- Komponente: `ServerStatusDot` (Atom) - animierter Status-Indikator (online/offline)
- Server-Liste aus TanStack Store (`features/server/stores/server.store.ts`)
- Status-Check via Health-Endpoint im Hintergrund (nicht blockierend)
- Responsive: Mobile zeigt kompakte Liste, Desktop mit mehr Details

**FRs:** FR2
**NFRs:** NFR-P5 (Liste laden < 200ms)

---

### Story 3.2: Server-Dropdown auf Login-Screen

Als **Nutzer mit mehreren konfigurierten Servern**,
moechte ich **auf dem Login-Screen einen Server aus einem Dropdown auswaehlen koennen**,
damit **ich mich schnell beim gewuenschten Server anmelden kann ohne in die Einstellungen zu wechseln**.

#### Acceptance Criteria

**AC1: Dropdown bei mehreren Servern**

**Given** der Nutzer hat mehr als einen Server konfiguriert
**When** der Login-Screen geladen wird
**Then** ist ein Server-Dropdown sichtbar oberhalb des Login-Formulars
**And** der zuletzt verwendete Server ist vorausgewaehlt

**AC2: Kein Dropdown bei einem Server**

**Given** der Nutzer hat genau einen Server konfiguriert
**When** der Login-Screen geladen wird
**Then** ist kein Dropdown sichtbar
**And** der Server-Name wird als statischer Text angezeigt
**And** das Login-Formular ist direkt nutzbar

**AC3: Redirect bei keinem Server**

**Given** der Nutzer hat keinen Server konfiguriert
**When** der Login-Screen aufgerufen wird
**Then** erfolgt automatisch eine Weiterleitung zum Server-Setup
**And** ein Toast zeigt "Bitte fuege zuerst einen Server hinzu"

**AC4: Server-Wechsel im Dropdown**

**Given** das Server-Dropdown ist geoeffnet
**When** der Nutzer einen anderen Server auswaehlt
**Then** schliesst das Dropdown
**And** der ausgewaehlte Server wird als aktiv markiert
**And** das Login-Formular bleibt sichtbar (kein Page-Reload)

**AC5: Offline-Server im Dropdown**

**Given** ein Server im Dropdown ist offline
**When** das Dropdown geoeffnet ist
**Then** zeigt der Eintrag einen grauen Status-Dot
**And** der Eintrag zeigt "Offline" als Zusatz-Label
**And** der Server ist trotzdem auswaehlbar

**AC6: Server hinzufuegen aus Dropdown**

**Given** das Dropdown ist geoeffnet
**When** der Nutzer auf "Server hinzufuegen" am Ende der Liste klickt
**Then** oeffnet sich das Server-Setup-Formular
**And** nach erfolgreichem Setup kehrt der Nutzer zum Login-Screen zurueck

#### Technical Notes

- Komponente: `ServerSelector` (Organism) - Headless UI Listbox mit Status-Dots
- Position: Volle Breite oberhalb Login-Formular
- Integration in bestehende `AuthCard` Komponente
- Keyboard-Navigation: Enter/Space oeffnet, Pfeiltasten navigieren, Escape schliesst
- Mobile: Full-Width, Desktop: Max-Width begrenzt
- ARIA: `aria-label="Server auswaehlen"`

**FRs:** FR3, FR10
**NFRs:** NFR-P2 (Dropdown < 50ms), NFR-U2 (max 3 Klicks)

---

### Story 3.3: Server bearbeiten

Als **Nutzer mit konfigurierten Servern**,
moechte ich **die Details eines Servers (Name, URL) nachtraeglich aendern koennen**,
damit **ich Tippfehler korrigieren oder Server umbenennen kann ohne ihn neu anlegen zu muessen**.

#### Acceptance Criteria

**AC1: Edit-Formular oeffnen**

**Given** der Nutzer ist auf der Server-Verwaltungsseite
**When** der Nutzer auf das Edit-Icon eines Server-Eintrags klickt
**Then** oeffnet sich ein Edit-Formular mit den aktuellen Server-Daten
**And** Name und URL sind editierbar
**And** der Access-Token ist nicht sichtbar (nur Hinweis "Token gespeichert")

**AC2: Name aendern**

**Given** das Edit-Formular ist geoeffnet
**When** der Nutzer den Server-Namen aendert und speichert
**Then** wird der neue Name in der Server-Liste angezeigt
**And** ein Toast bestaetigt "Server aktualisiert"
**And** das Formular schliesst sich

**AC3: URL-Validierung**

**Given** das Edit-Formular ist geoeffnet
**When** der Nutzer die Server-URL aendert
**Then** validiert das System die URL auf gueltiges Format
**And** bei ungueltigem Format erscheint Inline-Fehlermeldung

**AC4: Token bleibt erhalten**

**Given** der Nutzer aendert die URL eines Servers
**When** die Aenderung gespeichert wird
**Then** wird der Access-Token beibehalten
**And** ein optionaler Connection-Test kann ausgefuehrt werden

**AC5: Abbrechen ohne Speichern**

**Given** das Edit-Formular ist geoeffnet
**When** der Nutzer auf "Abbrechen" klickt
**Then** werden keine Aenderungen gespeichert
**And** das Formular schliesst sich ohne Bestaetigung

**AC6: Aktiven Server bearbeiten**

**Given** der Server gerade der aktive Server ist
**When** der Nutzer ihn bearbeitet
**Then** ist eine Bearbeitung trotzdem moeglich
**And** Aenderungen werden sofort im Header reflektiert

#### Technical Notes

- Edit-Formular als Dialog (Headless UI Dialog) oder Inline-Expansion
- Zod-Schema fuer URL-Validierung: `z.string().url()`
- TanStack Form fuer Formular-State
- Server-Store Mutation: `updateServer(id, { name, url })`
- URL-Aenderung invalidiert nicht automatisch den Token

**FRs:** FR4
**NFRs:** NFR-U3 (Fehlermeldungen Deutsch)

---

### Story 3.4: Server entfernen

Als **Nutzer mit mehreren konfigurierten Servern**,
moechte ich **einen Server aus meiner Liste entfernen koennen**,
damit **ich nicht mehr benoetigte Server-Eintraege aufraeumen kann und meine Liste uebersichtlich bleibt**.

#### Acceptance Criteria

**AC1: Loeschen mit Bestaetigung**

**Given** der Nutzer ist auf der Server-Verwaltungsseite
**When** der Nutzer auf das Delete-Icon eines Server-Eintrags klickt
**Then** erscheint ein Bestaetigungs-Dialog
**And** der Dialog zeigt den Server-Namen zur Bestaetigung

**AC2: Loeschung bestaetigen**

**Given** der Bestaetigungs-Dialog ist geoeffnet
**When** der Nutzer auf "Entfernen" klickt
**Then** wird der Server aus der lokalen Liste geloescht
**And** der zugehoerige Access-Token wird geloescht
**And** ein Toast bestaetigt "Server 'XYZ' entfernt"
**And** der Dialog schliesst sich

**AC3: Loeschung abbrechen**

**Given** der Bestaetigungs-Dialog ist geoeffnet
**When** der Nutzer auf "Abbrechen" klickt oder Escape drueckt
**Then** wird der Server nicht geloescht
**And** der Dialog schliesst sich

**AC4: Letzten Server loeschen**

**Given** der Nutzer versucht den einzigen konfigurierten Server zu loeschen
**When** die Loeschung bestaetigt wird
**Then** wird der Server geloescht
**And** der Nutzer wird zum Server-Setup weitergeleitet
**And** ein Hinweis erscheint "Du brauchst mindestens einen Server"

**AC5: Default-Server loeschen**

**Given** der zu loeschende Server ist der zuletzt verwendete
**When** er geloescht wird
**Then** wird der naechste Server in der Liste als Default markiert

**AC6: Eingeloggten Server loeschen**

**Given** der Nutzer ist beim zu loeschenden Server eingeloggt
**When** er den Server loescht
**Then** wird er automatisch ausgeloggt
**And** der Server wird aus der Liste entfernt
**And** er landet auf dem Login-Screen (oder Setup falls letzter Server)

#### Technical Notes

- Bestaetigungs-Dialog mit `Dialog` Komponente (Headless UI)
- Button-Variante: `intent="danger"` fuer Loeschen
- Server-Store Mutation: `removeServer(id)`
- Token-Loeschung: via Storage-Adapter (`deleteServerToken`)
- Keine Backend-Kommunikation noetig (nur lokale Daten)

**FRs:** FR5
**NFRs:** NFR-U3 (actionable Fehlermeldungen)

---

### Story 3.5: Default-Server & Last-Used Logik

Als **Nutzer, der regelmaessig verschiedene Server nutzt**,
moechte ich **dass mein zuletzt verwendeter Server automatisch vorausgewaehlt wird**,
damit **ich nicht bei jedem Login den Server manuell auswaehlen muss**.

#### Acceptance Criteria

**AC1: Last-Used Tracking**

**Given** der Nutzer loggt sich erfolgreich bei einem Server ein
**When** der Login abgeschlossen ist
**Then** wird dieser Server als "lastUsedAt" mit aktuellem Timestamp markiert
**And** dieser Server wird zum Default fuer zukuenftige Login-Screens

**AC2: Default-Server vorausgewaehlt**

**Given** der Nutzer oeffnet den Login-Screen
**When** mehrere Server konfiguriert sind
**Then** ist der Server mit dem neuesten "lastUsedAt" vorausgewaehlt
**And** dieser Server erscheint als erster im Dropdown

**AC3: Fallback bei keiner Nutzung**

**Given** der Nutzer hat noch nie einen Server verwendet
**When** der Login-Screen geladen wird
**Then** ist der zuerst hinzugefuegte Server vorausgewaehlt

**AC4: Server-Wechsel erfordert Logout**

**Given** der Nutzer ist bei Server A eingeloggt
**When** er versucht zu Server B zu wechseln (ueber UI-Element)
**Then** wird er darauf hingewiesen, dass ein Logout erforderlich ist
**And** ein CTA "Abmelden und wechseln" wird angeboten

**AC5: Server-Identitaet im Header**

**Given** der Nutzer ist eingeloggt
**When** er den Header betrachtet
**Then** ist der aktuelle Server-Name sichtbar
**And** kein Server-Wechsel ist direkt im Header moeglich (nur Info)

**AC6: Default nach Logout**

**Given** der Nutzer klickt auf "Abmelden"
**When** der Logout abgeschlossen ist
**Then** landet er auf dem Login-Screen
**And** der zuletzt verwendete Server ist vorausgewaehlt im Dropdown

#### Technical Notes

- Server-Store: `lastUsedAt: Date` pro Server
- Store-Selektor: `getDefaultServer()` - gibt Server mit neuestem lastUsedAt zurueck
- Header-Komponente zeigt Server-Name (read-only, kein Dropdown)
- Login-Guard: Prueft ob Server ausgewaehlt bevor Login-Request
- Wechsel-Guard: Verhindert API-Wechsel waehrend aktiver Session

**FRs:** FR7, FR11
**NFRs:** NFR-R5 (Token-Fehler -> Login-Screen)

---

### Story 3.6: Server Icon/Farbe fuer visuelle Unterscheidung

Als **Nutzer mit mehreren aehnlich benannten Servern**,
moechte ich **jedem Server ein individuelles Icon oder eine Farbe zuweisen koennen**,
damit **ich Server auf einen Blick unterscheiden kann ohne die Namen lesen zu muessen**.

#### Acceptance Criteria

**AC1: Icon/Farbe Auswahl im Edit-Formular**

**Given** der Nutzer bearbeitet einen Server in den Einstellungen
**When** das Edit-Formular geoeffnet ist
**Then** gibt es einen Bereich zur Auswahl von Icon oder Farbe
**And** eine Auswahl vordefinierter Farben ist verfuegbar (8-10 Optionen)
**And** eine Auswahl vordefinierter Icons ist verfuegbar (z.B. Rettungszeichen, Gebaeude, Stern)

**AC2: Farbe anwenden**

**Given** der Nutzer waehlt eine Farbe fuer einen Server
**When** er die Auswahl speichert
**Then** wird die Farbe als farbiger Ring/Hintergrund im Server-Eintrag angezeigt
**And** die Farbe ist im Dropdown, in der Liste und im Header sichtbar

**AC3: Icon anwenden**

**Given** der Nutzer waehlt ein Icon fuer einen Server
**When** er die Auswahl speichert
**Then** wird das Icon neben dem Server-Namen angezeigt
**And** das Icon ersetzt den Standard-Server-Indikator

**AC4: Default ohne Auswahl**

**Given** kein Icon oder keine Farbe wurde ausgewaehlt
**When** der Server angezeigt wird
**Then** wird ein Default-Icon (neutrales Server-Symbol) verwendet
**And** keine Farbe wird angewendet (Standard-Theme-Farben)

**AC5: Visuelle Unterscheidbarkeit**

**Given** der Nutzer hat verschiedenen Servern unterschiedliche Farben zugewiesen
**When** er das Server-Dropdown oeffnet
**Then** sind alle Server mit ihren Farben/Icons visuell unterscheidbar
**And** die Farben haben ausreichend Kontrast fuer Accessibility

**AC6: Header-Integration**

**Given** der Nutzer ist eingeloggt
**When** er den Header betrachtet
**Then** wird das Server-Icon/die Server-Farbe neben dem Namen angezeigt
**And** die Farbe wird dezent als Akzent verwendet (nicht ueberladen)

#### Technical Notes

- Server-Store erweitern: `icon?: string`, `color?: string`
- Farbpalette: Tailwind-Farben (sky, emerald, amber, rose, violet, etc.)
- Icon-Set: Heroicons Subset (BuildingOffice, ShieldCheck, Star, MapPin, etc.)
- Komponente: `ServerColorPicker` (Molecule) - Grid von Farb-Buttons
- Komponente: `ServerIconPicker` (Molecule) - Grid von Icon-Buttons
- CSS Custom Properties fuer dynamische Server-Farben: `--server-primary`

**FRs:** FR8
**NFRs:** -

---

### Epic 3 Zusammenfassung

| Story | Titel | FRs | Prioritaet |
|-------|-------|-----|-----------|
| 3.1 | Server-Liste anzeigen | FR2 | P1 |
| 3.2 | Server-Dropdown auf Login-Screen | FR3, FR10 | P0 |
| 3.3 | Server bearbeiten | FR4 | P1 |
| 3.4 | Server entfernen | FR5 | P1 |
| 3.5 | Default-Server & Last-Used | FR7, FR11 | P1 |
| 3.6 | Server Icon/Farbe | FR8 | P2 |

**Abhaengigkeiten:**
- Story 3.2 (Dropdown) haengt von Epic 2 (Server-Store, Storage-Adapter) ab
- Story 3.5 (Default-Server) haengt von Story 3.2 ab
- Story 3.6 (Icon/Farbe) kann unabhaengig implementiert werden, nutzt aber UI aus 3.1

**UX-Komponenten benoetigt:**
- `ServerSelector` (Organism) - Story 3.2
- `ServerListItem` (Molecule) - Story 3.1
- `ServerStatusDot` (Atom) - Story 3.1, 3.2
- `ServerColorPicker` (Molecule) - Story 3.6
- `ServerIconPicker` (Molecule) - Story 3.6

## Epic 4: Admin Token-Verwaltung

Administratoren koennen Access-Tokens benennen, deaktivieren, rotieren und Usage-Statistiken einsehen fuer vollstaendige Kontrolle.

**FRs abgedeckt:** FR15, FR16, FR26, FR27, FR28, FR29, FR30
**Relevante NFRs:** NFR-S7 (Token einmalig anzeigen), NFR-S8 (Audit-Trail)

---

### Story 4.1: Access-Token mit Namen erstellen

Als **Server-Administrator**,
moechte ich **Access-Tokens mit einem beschreibenden Namen/Label erstellen**,
damit **ich spaeter nachvollziehen kann, welcher Token fuer welchen Zweck oder welches Geraet verwendet wird**.

#### Acceptance Criteria

**AC1: Token-Name bei Erstellung**

**Given** ich bin als Administrator eingeloggt und befinde mich im Admin-Panel
**When** ich einen neuen Access-Token erstelle
**Then** muss ich einen Namen/Label fuer den Token angeben koennen (z.B. "Desktop-App Hauptwache", "Mobile Sanitaetsdienst")
**And** der Name muss zwischen 3 und 50 Zeichen lang sein

**AC2: Token einmalig anzeigen**

**Given** ich habe einen Token-Namen eingegeben und die Erstellung bestaetigt
**When** der Token erfolgreich generiert wurde
**Then** wird der vollstaendige Token (z.B. `blh_clxxxxxxxxxx`) genau einmal angezeigt
**And** eine deutliche Warnung erscheint: "Dieser Token wird nur einmal angezeigt. Kopieren Sie ihn jetzt."
**And** ein Copy-to-Clipboard-Button ist direkt neben dem Token verfuegbar
**And** der Dialog kann erst geschlossen werden, nachdem der Nutzer bestaetigt hat, den Token gesichert zu haben

**AC3: Token nicht erneut abrufbar**

**Given** ich habe den Token-Erstellungs-Dialog geschlossen
**When** ich versuche, den vollstaendigen Token erneut abzurufen
**Then** ist dies nicht moeglich - nur der Token-Prefix (z.B. `blh_clxx...`) und der Name werden angezeigt
**And** das System zeigt niemals den vollstaendigen Token-Wert erneut an

**AC4: Token-Liste Darstellung**

**Given** ein Token wurde erstellt
**When** ich die Token-Liste im Admin-Panel ansehe
**Then** sehe ich: Token-Name, Token-Prefix (maskiert), Erstellungsdatum, Status (aktiv/inaktiv)
**And** der vollstaendige Token ist nicht abrufbar

#### Technical Notes

- Token-Format: `blh_` + cuid2 (28 Zeichen total)
- Nur der bcrypt-Hash wird in der DB gespeichert (`tokenHash`)
- Token-Prefix (erste 8 Zeichen nach `blh_`) wird separat gespeichert fuer Identifikation
- Erweiterung `ServerAccessToken` Entity um `name: String`
- Handler: `CreateAccessTokenHandler`
- Controller: Erweiterung `AdminInviteController` um `POST /admin/tokens`
- Frontend: `TokenCreationModal` mit Copy-Funktion und Bestaetigung

**FRs:** FR26, FR30
**NFRs:** NFR-S7 (Token einmalig anzeigen), NFR-S8 (Audit-Trail)

---

### Story 4.2: Access-Token deaktivieren

Als **Server-Administrator**,
moechte ich **einen existierenden Access-Token deaktivieren koennen**,
damit **kompromittierte oder nicht mehr benoetigte Tokens sofort ungueltig werden, ohne sie endgueltig zu loeschen**.

#### Acceptance Criteria

**AC1: Deaktivierung mit Bestaetigung**

**Given** ich bin als Administrator eingeloggt und sehe die Token-Liste
**When** ich auf "Deaktivieren" bei einem aktiven Token klicke
**Then** erscheint ein Bestaetigungsdialog mit: Token-Name, Warnung "Alle Geraete mit diesem Token verlieren sofort den Zugriff"
**And** ich muss die Aktion bestaetigen

**AC2: Token-Deaktivierung durchfuehren**

**Given** ich habe die Deaktivierung bestaetigt
**When** die Aktion ausgefuehrt wird
**Then** wird `isRevoked = true` und `revokedAt = now()` gesetzt (Soft-Delete)
**And** der Token erscheint in der Liste als "Deaktiviert" mit Deaktivierungsdatum
**And** ein Audit-Log-Eintrag wird erstellt (ohne Token-Wert)

**AC3: Deaktivierter Token wird abgelehnt**

**Given** ein Token wurde deaktiviert
**When** ein Client versucht, diesen Token fuer API-Requests zu verwenden
**Then** erhaelt der Client einen 401 Unauthorized Response
**And** die Fehlermeldung lautet: "Server access token has been revoked"

**AC4: Deaktivierter Token Details**

**Given** ein Token wurde deaktiviert
**When** ich die Token-Details ansehe
**Then** sehe ich: Status "Deaktiviert", Deaktivierungsdatum, deaktiviert durch (Admin-Name)
**And** ein "Reaktivieren"-Button ist verfuegbar (optional, falls benoetigt)

**AC5: Token reaktivieren**

**Given** ich moechte einen deaktivierten Token reaktivieren
**When** ich auf "Reaktivieren" klicke und bestaetige
**Then** wird `isRevoked = false` und `revokedAt = null` gesetzt
**And** der Token ist wieder gueltig fuer API-Requests

#### Technical Notes

- Soft-Delete Pattern: `isRevoked: Boolean`, `revokedAt: DateTime?`
- Handler: `RevokeTokenHandler`, `ReactivateTokenHandler`
- Guard-Pruefung: `ServerAccessGuard` prueft `isRevoked === false`
- Controller: `DELETE /admin/tokens/:id` (Soft-Delete) oder `PATCH /admin/tokens/:id/revoke`
- Audit-Event: `ServerAccessTokenRevokedEvent` mit tokenId, revokedBy, revokedAt

**FRs:** FR27
**NFRs:** NFR-S8 (Audit-Trail)

---

### Story 4.3: Token-Usage-Statistiken einsehen

Als **Server-Administrator**,
moechte ich **sehen koennen, wann ein Token zuletzt verwendet wurde**,
damit **ich inaktive Tokens identifizieren und nicht mehr genutzte Tokens bereinigen kann**.

#### Acceptance Criteria

**AC1: Nie verwendeter Token**

**Given** ein Token existiert und wurde noch nie verwendet
**When** ich die Token-Liste oder Token-Details ansehe
**Then** zeigt `lastUsedAt` den Wert "Nie verwendet" an

**AC2: Token-Nutzung tracken**

**Given** ein Token wird fuer einen API-Request verwendet
**When** der `ServerAccessGuard` den Token validiert
**Then** wird `lastUsedAt` auf den aktuellen Zeitstempel aktualisiert
**And** diese Aktualisierung erfolgt asynchron (nicht blockierend fuer den Request)

**AC3: Token-Liste mit Usage-Info**

**Given** ich bin im Admin-Panel und sehe die Token-Liste
**When** ich die Liste ansehe
**Then** sehe ich fuer jeden Token: Name, Prefix, Status, Erstellt am, Zuletzt verwendet am
**And** die Liste ist sortierbar nach "Zuletzt verwendet" (aelteste zuerst fuer Bereinigung)

**AC4: Inaktive Tokens filtern**

**Given** ich moechte inaktive Tokens finden
**When** ich die Token-Liste nach "Zuletzt verwendet" sortiere (aufsteigend)
**Then** erscheinen Tokens, die laenger nicht verwendet wurden, oben
**And** ich kann optional nach "Nicht verwendet seit X Tagen" filtern

**AC5: Inaktivitaets-Warnung**

**Given** ein Token wurde laenger als 90 Tage nicht verwendet
**When** ich die Token-Liste ansehe
**Then** wird dieser Token mit einem visuellen Hinweis markiert (z.B. oranges Badge "Inaktiv")
**And** ein Tooltip erklaert: "Dieser Token wurde seit ueber 90 Tagen nicht verwendet"

#### Technical Notes

- `ServerAccessToken.lastUsedAt: DateTime?` Feld
- Asynchrone Aktualisierung via Event/Queue (nicht synchron im Guard)
- Repository-Methode: `updateLastUsed(tokenId: string): Promise<void>`
- Frontend: Sortier- und Filteroptionen in Token-Tabelle
- Performance: Index auf `lastUsedAt` fuer effiziente Sortierung

**FRs:** FR28
**NFRs:** NFR-P1 (Token-Validierung <100ms - daher async Update)

---

### Story 4.4: Token rotieren

Als **Server-Administrator**,
moechte ich **einen existierenden Token rotieren koennen (neuer Token, alter invalidiert)**,
damit **ich regelmaessig Credentials erneuern kann, ohne dass Nutzer einen komplett neuen Onboarding-Prozess durchlaufen muessen**.

#### Acceptance Criteria

**AC1: Rotation starten**

**Given** ich bin als Administrator eingeloggt und sehe die Token-Details
**When** ich auf "Token rotieren" klicke
**Then** erscheint ein Dialog mit Erklaerung: "Ein neuer Token wird generiert. Der alte Token wird sofort ungueltig."
**And** der bisherige Token-Name wird uebernommen (editierbar)
**And** ich muss die Aktion bestaetigen

**AC2: Rotation durchfuehren**

**Given** ich habe die Token-Rotation bestaetigt
**When** die Rotation ausgefuehrt wird
**Then** wird ein neuer Token mit gleichem Namen generiert
**And** der alte Token wird als `isRevoked = true` markiert
**And** der neue Token wird genau einmal angezeigt (wie bei Neuerstellung)
**And** Copy-to-Clipboard und Bestaetigung sind erforderlich

**AC3: Alter Token ungueltig**

**Given** die Token-Rotation wurde abgeschlossen
**When** ein Client den alten Token verwendet
**Then** erhaelt er 401 Unauthorized
**And** die Fehlermeldung lautet: "Server access token has been rotated"

**AC4: Token-Historie**

**Given** die Token-Rotation wurde abgeschlossen
**When** ich die Token-Liste ansehe
**Then** sehe ich den neuen aktiven Token mit aktualisiertem Erstellungsdatum
**And** der alte Token erscheint als "Rotiert" (nicht "Deaktiviert") mit Verweis auf den neuen Token

**AC5: Mehrfache Rotationen**

**Given** mehrere Token-Rotationen fuer denselben Zweck wurden durchgefuehrt
**When** ich die Token-Historie ansehe
**Then** sehe ich die Kette: Original -> Rotation 1 -> Rotation 2 (aktuell)
**And** alle alten Tokens sind als "Rotiert" markiert

#### Technical Notes

- Handler: `RotateTokenHandler`
- Neues Feld: `rotatedFromId: String?` (Verweis auf vorherigen Token)
- Atomare Operation: Alter Token revoken + neuer Token erstellen in einer Transaktion
- Controller: `POST /admin/tokens/:id/rotate`
- Response: Neuer vollstaendiger Token (einmalig) + Token-Metadaten
- Audit-Event: `ServerAccessTokenRotatedEvent` mit oldTokenId, newTokenId, rotatedBy

**FRs:** FR29
**NFRs:** NFR-S7 (neuer Token einmalig anzeigen), NFR-S8 (Audit-Trail)

---

### Story 4.5: Basis Token-Liste & Mehrfach-Token-Support

Als **Server-Administrator**,
moechte ich **mehrere Access-Tokens fuer meinen Server erstellen und in einer Liste sehen koennen**,
damit **ich unterschiedliche Tokens fuer verschiedene Zwecke (Desktop-App, Mobile, Backup) vergeben kann**.

#### Acceptance Criteria

**AC1: Token-Liste anzeigen**

**Given** ich bin als Administrator eingeloggt
**When** ich die Token-Verwaltung im Admin-Panel oeffne
**Then** sehe ich eine Liste aller existierenden Tokens (aktiv und deaktiviert)
**And** ein "Neuen Token erstellen"-Button ist prominent platziert

**AC2: Mehrere aktive Tokens**

**Given** es existieren mehrere aktive Tokens
**When** ein Client einen beliebigen aktiven Token im `X-Server-Access-Token` Header sendet
**Then** wird der Request akzeptiert (jeder aktive Token ist gueltig)
**And** `lastUsedAt` des verwendeten Tokens wird aktualisiert

**AC3: Token-Zuordnung**

**Given** ich moechte verstehen, welcher Token wofuer verwendet wird
**When** ich die Token-Liste ansehe
**Then** zeigt jeder Eintrag: Name, Prefix, Status, Erstellt am, Zuletzt verwendet, Aktionen
**And** die Namen ermoeglichen klare Zuordnung (z.B. "Desktop Hauptwache", "Mobile SEG Nord")

#### Technical Notes

- Keine Limit-Beschraenkung fuer Anzahl Tokens
- Alle Tokens sind gleichwertig (kein Primary/Secondary)
- Repository: `IServerAccessTokenRepository.findAll(): Promise<ServerAccessToken[]>`
- Frontend: `TokenManagementPage` mit einfacher Tabelle
- Guard prueft jeden aktiven Token gleich

**FRs:** FR15
**NFRs:** NFR-S8 (Audit-Trail fuer alle Token-Operationen)

---

### Story 4.5a: Token-Liste Paginierung & Filter

Als **Server-Administrator**,
moechte ich **die Token-Liste filtern, durchsuchen und paginieren koennen**,
damit **ich bei vielen Tokens schnell den gesuchten finden kann**.

**Abhaengigkeit:** Story 4.5 (Basis Token-Liste) muss abgeschlossen sein.

#### Acceptance Criteria

**AC1: Token-Liste mit Paginierung**

**Given** ich habe 5+ Tokens erstellt
**When** ich die Token-Liste ansehe
**Then** werden alle Tokens mit Paginierung angezeigt (10 pro Seite)

**AC2: Token-Suche**

**Given** ich habe mehrere Tokens
**When** ich einen Suchbegriff im Suchfeld eingebe
**Then** werden nur Tokens angezeigt deren Name den Suchbegriff enthaelt

**AC3: Status-Filter**

**Given** ich habe Tokens mit verschiedenen Status
**When** ich einen Status-Filter auswaehle
**Then** kann ich nach Status filtern (Alle / Aktiv / Deaktiviert / Rotiert)

#### Technical Notes

- Repository: `IServerAccessTokenRepository.findAll(filters): Promise<PaginatedResult<ServerAccessToken>>`
- Frontend: Erweiterte Tabelle mit Suchfeld, Filter-Dropdown, Paginierung

**FRs:** FR15
**NFRs:** -

---

### Story 4.5b: Letzten aktiven Token schuetzen

Als **Server-Administrator**,
moechte ich **eine Warnung erhalten wenn ich den letzten aktiven Token deaktivieren will**,
damit **ich nicht versehentlich alle Zugriffe auf den Server sperre**.

**Abhaengigkeit:** Story 4.5 (Basis Token-Liste) muss abgeschlossen sein.

#### Acceptance Criteria

**AC1: Letzten aktiven Token schuetzen**

**Given** es existiert nur ein aktiver Token und ich versuche ihn zu deaktivieren
**When** ich auf "Deaktivieren" klicke
**Then** erscheint eine Warnung: "Dies ist der einzige aktive Token. Wenn Sie ihn deaktivieren, kann sich niemand mehr verbinden."
**And** ich muss explizit bestaetigen, dass ich einen neuen Token erstellen werde

**AC2: Warnungs-Bypass bei Neuanlage**

**Given** es existiert nur ein aktiver Token
**When** ich einen neuen Token erstelle und DANACH den alten deaktiviere
**Then** erscheint keine Warnung (da nun 2 aktive Tokens existieren)

#### Technical Notes

- Backend-Check: `countActiveTokens()` vor Deaktivierung
- Frontend: Konfirmations-Dialog bei `activeCount === 1`
- UX: Dialog erklaert Konsequenz und bietet "Token erstellen"-Link

**FRs:** FR15
**NFRs:** -

---

### Story 4.6: INSECURE zu SECURE Migration

Als **Server-Administrator**,
moechte ich **meinen Server von INSECURE_MODE zu SECURE_MODE migrieren koennen**,
damit **ich einen Entwicklungsserver fuer den Produktivbetrieb absichern kann, ohne ihn neu aufsetzen zu muessen**.

#### Acceptance Criteria

**AC1: INSECURE_MODE Hinweis**

**Given** der Server laeuft im INSECURE_MODE (`INSECURE_MODE=true`)
**When** ich mich als Administrator einlogge und das Admin-Panel oeffne
**Then** sehe ich einen prominenten Hinweis: "Dieser Server laeuft im unsicheren Modus. Tokens sind nicht erforderlich."
**And** ein Button "Zu SECURE_MODE wechseln" ist verfuegbar

**AC2: Migration starten**

**Given** ich klicke auf "Zu SECURE_MODE wechseln"
**When** der Migrations-Dialog erscheint
**Then** werde ich aufgefordert, einen initialen Access-Token zu erstellen
**And** eine Erklaerung wird angezeigt: "Nach der Migration benoetigen alle Clients einen gueltigen Token."
**And** ich muss einen Token-Namen eingeben

**AC3: Migration durchfuehren**

**Given** ich habe den initialen Token erstellt und bestaetigt
**When** die Migration ausgefuehrt wird
**Then** wird `INSECURE_MODE` in der Server-Konfiguration auf `false` gesetzt
**And** der neue Token wird genau einmal angezeigt (mit Copy-Funktion)
**And** alle zukuenftigen Requests benoetigen einen gueltigen Token

**AC4: Nach Migration Token erforderlich**

**Given** die Migration zu SECURE_MODE wurde abgeschlossen
**When** ein Client ohne Token oder mit ungueltigem Token einen Request macht
**Then** erhaelt er 401 Unauthorized
**And** die Fehlermeldung lautet: "Server access token required"

**AC5: INSECURE-Option verschwindet**

**Given** die Migration wurde abgeschlossen
**When** ich das Admin-Panel oeffne
**Then** ist der "Zu SECURE_MODE wechseln"-Hinweis verschwunden
**And** die Token-Verwaltung ist vollstaendig verfuegbar

**AC6: Kein Rueckweg**

**Given** der Server laeuft bereits im SECURE_MODE
**When** ich das Admin-Panel oeffne
**Then** gibt es keine Option, zu INSECURE_MODE zu wechseln (nur in eine Richtung)

#### Technical Notes

- `INSECURE_MODE` ist eine Server-Konfiguration (ENV oder DB-Setting)
- Handler: `MigrateToSecureModeHandler`
- Transaktion: Token erstellen + Mode umschalten atomar
- Controller: `POST /admin/security/migrate-to-secure`
- Kein Rueckweg: Migration ist irreversibel ueber API (nur via ENV Reset moeglich)
- Nach Migration: ServerAccessGuard aktiviert, alle Endpoints erfordern Token (ausser Whitelist)

**FRs:** FR16
**NFRs:** NFR-S8 (Audit-Trail fuer Security-Aenderung)

---

### Epic 4 Zusammenfassung

| Story | Titel | FRs | Abhaengigkeiten |
|-------|-------|-----|-----------------|
| 4.1 | Access-Token mit Namen erstellen | FR26, FR30 | - |
| 4.2 | Access-Token deaktivieren | FR27 | 4.1 |
| 4.3 | Token-Usage-Statistiken einsehen | FR28 | 4.1 |
| 4.4 | Token rotieren | FR29 | 4.1, 4.2 |
| 4.5 | Multiple Tokens pro Server verwalten | FR15 | 4.1, 4.2 |
| 4.6 | INSECURE zu SECURE Migration | FR16 | 4.1 |

**Empfohlene Implementierungsreihenfolge:**
1. Story 4.1 (Basis fuer alle anderen)
2. Story 4.2 (Grundlegende Token-Verwaltung)
3. Story 4.5 (Multiple Tokens - baut auf 4.1 und 4.2 auf)
4. Story 4.3 (Usage-Statistiken - unabhaengig)
5. Story 4.4 (Rotation - benoetigt Deaktivierung)
6. Story 4.6 (Migration - kann parallel entwickelt werden)
