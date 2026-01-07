---
stepsCompleted: [1, 2, 3, 4, 7, 8, 9, 10, 11]
skippedSteps: [5, 6]
inputDocuments:
  - 'GitHub Issue #284: Multi-Server-Konfiguration mit Server-Authentifizierung'
  - 'docs/project-documentation/00-index.md'
  - 'docs/project-documentation/01-projektueberblick.md'
  - 'docs/project-documentation/02-backend-architektur.md'
  - 'docs/project-documentation/03-frontend-architektur.md'
workflowType: 'prd'
lastStep: 7
nextStep: 8
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 0
  projectDocsCount: 5
  issueCount: 1
---

# Product Requirements Document - bluelight-hub

**Author:** Rubeen
**Date:** 2026-01-05

## Executive Summary

### Vision

Bluelight Hub soll als universeller Client (Desktop + Web) mit beliebig vielen Backend-Instanzen arbeiten können. Nutzer – insbesondere Einsatzkräfte in Bereitschaften und Katastrophenschutz, die in mehreren Organisationen tätig sind – sollen nahtlos zwischen verschiedenen Servern wechseln können. Öffentlich erreichbare Server werden durch ein Server-Access-Token abgesichert.

### Problemstellung

| Problem | Auswirkung |
|---------|------------|
| Backend-URL fest per `VITE_API_URL` konfiguriert | Kein Wechsel zwischen Servern möglich |
| Kein Multi-Server-Support | Nutzer mit mehreren Organisationen müssen mehrere App-Instanzen nutzen |
| Öffentliche Server ungeschützt | Jeder mit URL kann Login-Seite erreichen |
| Entwickler-Workflow umständlich | Env-Variablen-Wechsel für Dev/Staging/Prod |

### Zielgruppen

| Gruppe | Bedarf |
|--------|--------|
| **Einsatzkräfte** | Zugriff auf verschiedene Organisations-Server (z.B. DRK Ortsverein + Kreisverband) |
| **Server-Administratoren** | Absicherung öffentlicher Instanzen |
| **Entwickler** | Schneller Wechsel zwischen Umgebungen |

### Primärer Anwendungsbereich

| Bereich | Beispiele |
|---------|-----------|
| **Sanitätsdienste** | Bereitschaften, Sanitätswachdienste |
| **Katastrophenschutz** | KatS-Einheiten, Schnelleinsatzgruppen |
| **Hilfsorganisationen** | DRK, ASB, Malteser, Johanniter, THW |
| **Weitere Blaulichtorganisationen** | Feuerwehr, Rettungsdienst |

### Was macht dieses Feature special

Der **Client ist der "Multi-Tenant"** – nicht das Backend. Jede Organisation betreibt ihre eigene Backend-Instanz, während der universelle Client (Desktop + Web) sich mit beliebigen Instanzen verbinden kann.

**Plattformgerechte Security:**
- **Desktop (Tauri):** Token verschlüsselt gespeichert (plugin-store/stronghold)
- **Web (Browser):** Token in localStorage mit expliziter Sicherheitswarnung

**Secure-by-Default:** Server starten im Secure-Mode. `INSECURE_MODE=true` ist ein bewusstes Opt-out für lokale Entwicklung.

## Project Classification

| Dimension | Wert |
|-----------|------|
| **Client-Typ** | Universal (Desktop + Web) |
| **Desktop** | Cross-platform via Tauri (macOS, Windows, Linux) |
| **Web** | SPA (React 19 + Vite) |
| **Backend** | NestJS 11 + PostgreSQL (Multi-Instance Deployment) |
| **Architektur** | Hexagonal + CQRS + DDD |
| **Domain** | Blaulichtorganisationen / Emergency Services (B2B) |
| **Komplexität** | Medium |
| **Projekt-Kontext** | Brownfield – Erweiterung existierender Codebasis |

### Strategischer Kontext

Dieses Feature ist **Production-Enablement** – eine strategische Grundlage für den produktiven Einsatz von Bluelight Hub in echten Hilfsorganisationen. Es ist keine optionale Erweiterung, sondern Core-Infrastructure.

## Success Criteria

### User Success

| Kriterium | Metrik | Validierung |
|-----------|--------|-------------|
| Multi-Server-Support | ≥3 Server konfigurierbar und wechselbar | Funktionstest |
| Nahtlose UX | Server-Wechsel in <3 Klicks | UX-Test |
| Selbstständige Konfiguration | Server hinzufügen ohne IT-Support | User-Test |
| Security-Transparenz | Browser-Warnung bei unverschlüsselter Speicherung sichtbar | UI-Review |

### Business Success

| Kriterium | Metrik |
|-----------|--------|
| Production-Readiness | Feature ermöglicht ersten produktiven Einsatz |
| Multi-Org-Fähigkeit | Eine App-Installation kann mehrere Organisationen bedienen |
| Reduktion Support-Aufwand | Kein manueller Eingriff für Server-Konfiguration nötig |

### Technical Success

| Kriterium | Metrik |
|-----------|--------|
| Secure-by-Default | Server startet im Secure-Mode (INSECURE_MODE=false) |
| Token-Verschlüsselung | Tauri: plugin-store/stronghold verschlüsselt |
| API-Konsistenz | Health-Endpoint differenziert nach Token-Status |
| Architektur-Konformität | Hexagonal Architecture Pattern eingehalten |

### Measurable Outcomes

| Outcome | Target |
|---------|--------|
| Server-Konfiguration | Benutzer kann Server in <2 Minuten hinzufügen |
| Token-Validierung | <100ms Latenz für Token-Check |
| Setup-Flow | Admin-Setup + Token-Generierung in einem Flow |

## Product Scope

### MVP - Must Have (P0)

| ID | Anforderung |
|----|-------------|
| R1 | Server-Liste persistent speichern (Name, URL, Access-Token optional) |
| R2 | Vor Login: Server auswählen oder neuen hinzufügen |
| R3 | Bei >1 Server: Dropdown-Selektor auf Login-Seite |
| R4 | Bei 0 Servern: Server-Setup erzwingen |
| R5 | Access-Token im Header `X-Server-Access-Token` mitsenden |
| R6 | Server-Wechsel nur vor Login möglich |
| R7 | `INSECURE_MODE` ENV-Variable (default: false) |
| R8 | Secure-Mode: Token-Setup während Admin-Setup erzwingen |
| R9 | Setup-Pending-Mode: Nur /health und /admin/setup erreichbar |
| R10 | Health-Endpoint: Reduzierte Infos ohne gültigen Token |

### Growth Features - Should Have (P1)

| ID | Anforderung |
|----|-------------|
| R11 | Bei 1 Server: Direkter Login ohne Dropdown |
| R12 | Letzter verwendeter Server als Default |
| R13 | "Verbindung testen" Button mit Health-Check |
| R14 | Server bearbeiten/löschen in Einstellungen |
| R15 | Multiple Access-Tokens pro Server unterstützen |
| R16 | Wechsel INSECURE → SECURE mit Token-Setup |

### Vision - Could Have (P2)

| ID | Anforderung |
|----|-------------|
| R17 | Token mit Namen/Labels für Audit ("Desktop-App Nord") |
| R18 | Token-Rotation im Admin-Panel |
| R19 | Token-Usage-Statistiken (lastUsedAt) |
| R20 | Server-Icon/Farbe für visuelle Unterscheidung |

## User Journeys

### Journey 1: Lisa - Erster Einsatz mit Bluelight Hub

**Persona:** Lisa, 28, Rettungssanitäterin beim DRK Ortsverein Musterstadt. Technisch versiert, aber keine IT-Expertin.

Lisa hat gerade ihre erste Schicht mit Bluelight Hub vor sich. Der Admin hat ihr einen **Deep Link** per Signal geschickt: `bluelight://connect?url=https://api.drk-musterstadt.de&invite=abc123&expires=2026-01-06T18:00:00Z`

Sie klickt den Link auf ihrem Laptop – die Bluelight Hub App öffnet sich automatisch und zeigt: "Server 'DRK Musterstadt' hinzufügen?" Lisa bestätigt, gibt ihren Namen für den Server ein, und wird zur Login-Seite weitergeleitet. Der Invite-Code ist einmalig und bereits verbraucht – kein Risiko, falls der Chat-Verlauf später geleakt wird.

Nach dem Login sieht Lisa das Dashboard mit dem aktuellen Einsatz ihrer Bereitschaft: Sanitätswachdienst beim Stadtfest. Sie öffnet den Einsatz, navigiert zum **ETB** und beginnt, den ersten Eintrag zu schreiben: "14:32 - Behandlung Kreislaufkollaps, Patient stabil, keine Einweisung."

Am Ende der Schicht hat sie 12 ETB-Einträge dokumentiert und 3 Patienten in der **Patientenverwaltung** erfasst. Bluelight Hub fühlt sich an wie ein digitales Einsatztagebuch – genau das, was sie braucht.

**Revealed Requirements:** Deep Link Setup, Invite-Code (einmalig), ETB-Kontext, Patientenverwaltung

---

### Journey 2: Markus - Zwischen Kreisverband und Ortsverein

**Persona:** Markus, 35, ehrenamtlicher Zugführer. Aktiv beim DRK Kreisverband (KatS-Einheit) UND beim lokalen Ortsverein (Sanitätsdienste).

Markus kommt von einer KatS-Übung beim Kreisverband zurück. Er öffnet Bluelight Hub und ist noch beim Kreisverband eingeloggt – dort hat er die Übung dokumentiert. Jetzt muss er aber den **Sanitätsdienst-Bericht** für den Ortsverein schreiben.

Er klickt auf "Abmelden", sieht im Server-Dropdown beide Server, wählt "DRK Ortsverein" und loggt sich ein. Der Einsatz vom Wochenende ist noch offen – er ergänzt die fehlenden ETB-Einträge und schließt den Einsatz ab.

Markus schätzt, dass er nicht zwei Apps braucht. Ein Account hier, ein Account dort – aber eine App für alles. Am Wochenende ist er beim Kreisverband, unter der Woche beim Ortsverein. Bluelight Hub macht mit.

**Revealed Requirements:** Multi-Server für Multi-Org-User, Server-Wechsel, ETB über mehrere Organisationen

---

### Journey 3: Thomas - Secure Server Setup

**Persona:** Thomas, 42, IT-Administrator beim DRK Kreisverband.

Thomas hat einen neuen Bluelight Hub Server für den Kreisverband deployed. Der Server läuft im **Secure-Mode** (default) – ohne Token kommt niemand rein.

Er öffnet die Web-Version von Bluelight Hub und gibt die Server-URL manuell ein. Der Server ist im **Setup-Pending-Mode** – Thomas muss erst Admin-Account und Server-Token einrichten:

1. **Admin-Account erstellen** – Sicheres Passwort gesetzt
2. **Server-Access-Token generieren** – Token `blh_k7x9...` erscheint einmalig

Jetzt will Thomas den Kollegen das Onboarding erleichtern. Er geht ins Admin-Panel und erstellt **Invite-Links**:
- `bluelight://connect?url=https://api.kreisverband.de&invite=INV_lisa_001&expires=2026-01-07`
- Jeder Link ist einmalig, hat ein Ablaufdatum, und kann einem Namen zugeordnet werden

Thomas schickt die Links per Signal an die Teamleiter. Sobald jemand den Link nutzt, sieht Thomas im Admin-Panel: "INV_lisa_001 – eingelöst am 05.01.2026 14:32".

**Revealed Requirements:** Admin-Setup, Token-Generierung, Invite-Link-System, Audit-Trail für Invites

---

### Journey 4: Sarah - Dev/Staging/Prod Wechsel

**Persona:** Sarah, 30, Full-Stack-Entwicklerin an Bluelight Hub.

Sarah debuggt ein Problem mit der Patientenverwaltung auf Staging. Statt `.env.local` zu editieren, öffnet sie Bluelight Hub, loggt aus, und wählt "staging.bluelight.dev" aus ihrem Server-Dropdown.

Auf Staging reproduziert sie das Problem: Ein Patient mit Umlauten im Namen wird falsch gespeichert. Sie fixt den Bug lokal, testet auf localhost:3091, und deployed nach Staging. Noch mal einloggen, Problem gelöst.

Am Ende des Tages hat sie 5x zwischen localhost, Staging und Prod gewechselt – ohne einmal eine Env-Variable anzufassen.

**Revealed Requirements:** Dev-Workflow, Multi-Server ohne Env-Wechsel

---

### Journey 5: Lisa (Edge Case) - Abgelaufener Invite-Link

**Persona:** Lisa hat einen Invite-Link bekommen, aber erst 3 Tage später geklickt.

Lisa klickt den Deep Link – aber statt Setup sieht sie: "Dieser Einladungslink ist abgelaufen. Bitte fordere einen neuen Link bei deinem Administrator an."

Sie schreibt Thomas eine Nachricht. Thomas generiert einen neuen Invite-Link mit 7 Tagen Gültigkeit und schickt ihn. Diesmal klappt es.

**Revealed Requirements:** Ablaufdatum-Validierung, Klare Fehlermeldung, Re-Invite-Flow

---

### Journey 6: Web-User Setup (kein Deep Link)

**Persona:** Jemand ohne Desktop-App nutzt die Web-Version.

Ein Helfer öffnet `https://app.bluelight-hub.de` im Browser. Ohne konfigurierte Server sieht er: "Füge deinen ersten Server hinzu."

Er hat die Server-URL und einen Invite-Code vom Admin bekommen. Er gibt beides in das Formular ein:
- Server-URL: `https://api.drk-musterstadt.de`
- Invite-Code: `INV_max_002`

Die App validiert den Code, speichert den Server, und leitet zur Login-Seite weiter. Im Browser erscheint eine Warnung: "⚠️ Im Browser werden Server-Daten unverschlüsselt gespeichert. Für maximale Sicherheit nutze die Desktop-App."

**Revealed Requirements:** Web-Form-Setup, Invite-Code manuell, Browser-Sicherheitswarnung

---

## Server-Konfigurationsmethoden

| Methode | Plattform | Secret-Handling |
|---------|-----------|-----------------|
| **Deep Link** | Desktop (Tauri) | Invite-Code encoded, mit Ablaufdatum |
| **URL-Parameter** | Web | `?server=...&invite=...` |
| **Manuelles Form** | Desktop + Web | Server-URL + Invite-Code eingeben |

---

## Offene Security-Analyse: Token/Secret-Handling

### Problem

Server-Access-Token soll nicht hardcoded im Client gespeichert werden. Deep Links mit Secrets sind praktisch, aber riskant.

### Analyse-Optionen

| Option | Beschreibung | Pro | Contra |
|--------|--------------|-----|--------|
| **Invite-Code → Token-Exchange** | Deep Link enthält Einmal-Invite-Code, Client tauscht gegen persistenten Token | Sicher, Audit-Trail | Erfordert Exchange-Endpoint |
| **Time-limited Token direkt** | Token im Link mit Ablaufdatum | Einfach | Bei Leak bis Ablauf nutzbar |
| **Invite-Code + manuelle Bestätigung** | Link enthält nur Code, Token wird nach Login generiert | Am sichersten | Mehr Friction |

### Empfehlung (vorläufig)

**Option 1: Invite-Code → Token-Exchange**

```
1. Admin generiert Invite-Code (INV_xxx) mit Ablaufdatum
2. Deep Link: bluelight://connect?url=...&invite=INV_xxx&expires=...
3. Client sendet: POST /auth/exchange-invite { invite: "INV_xxx" }
4. Server validiert, markiert als "used", gibt Server-Access-Token zurück
5. Client speichert Token persistent (verschlüsselt in Tauri, localStorage im Web)
```

**Status:** 🔴 Offen – Finale Entscheidung vor Implementierung erforderlich

---

### Journey Requirements Summary

| Capability | Journeys | Priority |
|------------|----------|----------|
| **Deep Link Setup** | Lisa (J1), Lisa Edge (J5) | P0 |
| **Invite-Code System** | Lisa (J1), Thomas (J3), Web-User (J6) | P0 |
| **Server-Dropdown** | Markus (J2), Sarah (J4) | P0 |
| **Token-Exchange-Endpoint** | Alle | P0 |
| **Admin Invite-Management** | Thomas (J3) | P0 |
| **Ablaufdatum-Validierung** | Lisa Edge (J5) | P0 |
| **Web-Form Setup** | Web-User (J6) | P0 |
| **Browser-Sicherheitswarnung** | Web-User (J6) | P0 |
| **Multi-Server für Devs** | Sarah (J4) | P0 |

## Technical Architecture Requirements

### Client-Architektur (Desktop + Web)

#### Persistenz-Layer

| Aspekt | Desktop (Tauri) | Web (Browser) |
|--------|-----------------|---------------|
| **Server-Liste** | `@tauri-apps/plugin-store` (verschlüsselt) | `localStorage` |
| **Access-Token** | `@tauri-apps/plugin-store` oder Stronghold | `localStorage` + Warnung |
| **Offline-Verfügbarkeit** | ✅ Lokale Liste immer verfügbar | ✅ Lokale Liste immer verfügbar |

#### Deep-Link Integration (Tauri)

- Plugin: `@tauri-apps/plugin-deep-link`
- Schema: `bluelight://connect?url=...&invite=...&expires=...`
- Fallback: Manuelles Form wenn Deep-Link fehlschlägt

#### Server-Store Struktur

```typescript
interface ServerConfig {
  id: string;           // UUID
  name: string;         // "DRK Musterstadt"
  url: string;          // "https://api.drk.de"
  accessToken?: string; // Encrypted/stored securely
  isDefault: boolean;   // Last used server
  createdAt: Date;
  lastUsedAt?: Date;
}
```

### Backend-Architektur (NestJS)

#### Neue Endpoints

| Endpoint | Method | Auth | Beschreibung |
|----------|--------|------|--------------|
| `/auth/exchange-invite` | POST | None | Invite-Code gegen Access-Token tauschen |
| `/admin/invites` | GET | Admin JWT | Liste aller Invite-Codes |
| `/admin/invites` | POST | Admin JWT | Neuen Invite-Code erstellen |
| `/admin/invites/:id` | DELETE | Admin JWT | Invite widerrufen |
| `/health` | GET | Optional Token | Differenzierte Response je nach Token |

#### Guards & Middleware

| Guard | Verantwortung |
|-------|---------------|
| `ServerAccessGuard` | Validiert `X-Server-Access-Token` Header |
| `SetupPendingGuard` | Blockiert Routen wenn Server im Setup-Pending-Mode |
| Rate Limiter | Brute-Force-Schutz für Token-Validierung |

#### Datenmodell (Prisma)

```prisma
model ServerAccessToken {
  id          String    @id @default(uuid())
  name        String    // "Desktop-App Hauptwache"
  tokenHash   String    @unique // bcrypt hash
  tokenPrefix String    // "blh_abc..." (erste 8 Zeichen)
  createdAt   DateTime  @default(now())
  lastUsedAt  DateTime?
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdById String
  isActive    Boolean   @default(true)
}

model InviteCode {
  id          String    @id @default(uuid())
  code        String    @unique // "INV_xxx"
  expiresAt   DateTime
  usedAt      DateTime?
  usedBy      String?   // Client identifier
  createdAt   DateTime  @default(now())
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdById String
  serverAccessTokenId String?
  serverAccessToken   ServerAccessToken? @relation(fields: [serverAccessTokenId], references: [id])
}
```

#### Security-Maßnahmen

| Maßnahme | Implementierung |
|----------|-----------------|
| Token-Hashing | bcrypt für `ServerAccessToken.tokenHash` |
| Rate Limiting | Max 5 Versuche/Minute für `/auth/exchange-invite` |
| Token-Prefix | `blh_` für Identifikation in Logs |
| Einmal-Invites | `usedAt` wird bei Exchange gesetzt |

### Integration mit existierender Architektur

| Layer | Änderungen |
|-------|------------|
| **Domain** | `InviteCode` Entity, `ServerAccessToken` Value Object |
| **Application** | `ExchangeInviteHandler`, `CreateInviteHandler` |
| **Infrastructure** | `PrismaInviteRepository`, `ServerAccessGuard` |
| **Modules** | `AuthController` erweitern, neuer `AdminInviteController` |

### Hexagonal Architecture Konformität

```
┌─────────────────────────────────────────────────────────────────┐
│  Modules: AuthController, AdminInviteController                 │
│  → HTTP Layer, Guards, Decorators                               │
├─────────────────────────────────────────────────────────────────┤
│  Application: ExchangeInviteHandler, CreateInviteHandler        │
│  → Use Cases mit Result<T> Pattern                              │
├─────────────────────────────────────────────────────────────────┤
│  Domain: InviteCode Entity, ServerAccessToken VO                │
│  → Business Rules, Validierung                                  │
├─────────────────────────────────────────────────────────────────┤
│  Infrastructure: PrismaInviteRepository, ServerAccessGuard      │
│  → DB, Token-Hashing, Guards                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Gewählter Ansatz:** Full Feature Release (P0 + P1 + P2)

**Begründung:** Das Multi-Server-Feature ist ein Production-Enabler – halbe Lösungen würden den Produktiveinsatz verzögern. Der vollständige Scope liefert:
- Nahtloses Onboarding (Deep Links, Invites)
- Robuste Security (Token-Rotation, Audit)
- Professionelle UX (Labels, Icons, Usage-Stats)

**Delivery-Strategie:** Inkrementell innerhalb eines Release-Zyklus
1. Erst P0 (Core Functionality) vollständig implementieren und testen
2. Dann P1 (UX Polish) hinzufügen
3. Zuletzt P2 (Advanced Features) ergänzen

### In Scope (20 Requirements)

#### Phase 1: Core (P0) - Must Have

| ID | Requirement |
|----|-------------|
| R1 | Server-Liste persistent speichern |
| R2 | Server-Auswahl vor Login |
| R3 | Dropdown-Selektor bei >1 Server |
| R4 | Server-Setup erzwingen bei 0 Servern |
| R5 | Access-Token im Header mitsenden |
| R6 | Server-Wechsel nur vor Login |
| R7 | INSECURE_MODE ENV-Variable |
| R8 | Token-Setup während Admin-Setup |
| R9 | Setup-Pending-Mode |
| R10 | Health-Endpoint mit Token-Differenzierung |

#### Phase 2: Growth (P1) - Should Have

| ID | Requirement |
|----|-------------|
| R11 | Direkter Login bei 1 Server |
| R12 | Letzter Server als Default |
| R13 | "Verbindung testen" Button |
| R14 | Server bearbeiten/löschen |
| R15 | Multiple Access-Tokens pro Server |
| R16 | INSECURE → SECURE Migration |

#### Phase 3: Vision (P2) - Could Have

| ID | Requirement |
|----|-------------|
| R17 | Token mit Namen/Labels |
| R18 | Token-Rotation im Admin-Panel |
| R19 | Token-Usage-Statistiken |
| R20 | Server-Icon/Farbe |

### Out of Scope (Explizit ausgeschlossen)

| Feature | Begründung |
|---------|------------|
| Multi-Tenant Backend | Client ist Multi-Server, nicht Backend |
| SSO/SAML Integration | Separate Feature-Initiative |
| Server-Discovery (mDNS) | Zu komplex für v1, manuelles Setup reicht |
| Offline-Sync zwischen Servern | Keine Cross-Server-Daten |
| Token-Sharing zwischen Clients | Security-Risiko |

### Annahmen & Constraints

| Annahme | Risiko wenn falsch |
|---------|-------------------|
| Tauri plugin-store ist ausreichend sicher | Müssten auf Stronghold upgraden |
| Invite-Codes können 1x verwendet werden | Race Conditions bei parallelem Einlösen |
| Admins haben direkten Server-Zugang | Kein Remote-Admin-Onboarding |
| Web-User akzeptieren localStorage-Warnung | Müssten secure cookie alternative bauen |

### Risk Mitigation

**Technisch:** Token-Exchange-Endpoint früh implementieren (kritischer Pfad)
**Security:** Penetration-Test vor Production-Rollout
**UX:** Usability-Test mit echten Einsatzkräften vor Release

## Functional Requirements

### Server-Konfiguration

- FR1: Benutzer kann einen neuen Server zur Liste hinzufügen (Name, URL, optional Access-Token)
- FR2: Benutzer kann gespeicherte Server in einer Liste einsehen
- FR3: Benutzer kann einen Server aus der Liste auswählen
- FR4: Benutzer kann Server-Details bearbeiten (Name, URL)
- FR5: Benutzer kann einen Server aus der Liste entfernen
- FR6: System speichert Server-Liste persistent zwischen App-Neustarts
- FR7: System markiert den zuletzt verwendeten Server als Default
- FR8: Benutzer kann einem Server ein visuelles Icon/Farbe zuweisen

### Authentifizierung & Access Control

- FR9: System sendet Access-Token im HTTP-Header bei allen API-Requests
- FR10: System blockiert Login-Versuch wenn kein Server konfiguriert ist
- FR11: System erlaubt Server-Wechsel nur im ausgeloggten Zustand
- FR12: Server validiert Access-Token bei jedem Request
- FR13: Server liefert reduzierte Health-Informationen ohne gültigen Token
- FR14: Server unterstützt INSECURE_MODE für lokale Entwicklung
- FR15: System kann mehrere Access-Tokens pro Server verwalten
- FR16: Admin kann Server von INSECURE zu SECURE migrieren mit Token-Setup

### Invite-System & Onboarding

- FR17: Admin kann Invite-Codes mit Ablaufdatum erstellen
- FR18: Admin kann Invite-Codes widerrufen
- FR19: Admin kann Liste aller Invite-Codes einsehen (Status, Ersteller, Einlösedatum)
- FR20: Benutzer kann Invite-Code gegen Access-Token eintauschen
- FR21: System validiert Invite-Code Ablaufdatum vor Einlösung
- FR22: System markiert Invite-Code nach Einlösung als "verwendet"
- FR23: Desktop-App verarbeitet Deep Links zum Server-Setup (bluelight://connect)
- FR24: Web-App verarbeitet URL-Parameter zum Server-Setup (?server=...&invite=...)
- FR25: Benutzer kann Server manuell per Formular hinzufügen (URL + Invite-Code)

### Admin-Verwaltung

- FR26: Admin kann Access-Tokens mit Namen/Labels erstellen
- FR27: Admin kann Access-Tokens deaktivieren
- FR28: Admin kann Token-Usage-Statistiken einsehen (lastUsedAt)
- FR29: Admin kann Token rotieren (neuen Token generieren, alten invalidieren)
- FR30: Server zeigt Token nur einmalig bei Erstellung an (kein späteres Abrufen)
- FR31: Admin muss Access-Token während initialem Server-Setup erstellen (Secure Mode)

### Plattform-Integration

- FR32: Desktop-App speichert Credentials verschlüsselt (Tauri plugin-store)
- FR33: Web-App speichert Credentials in localStorage mit Sicherheitswarnung
- FR34: System erkennt Plattform und wendet entsprechende Speicher-Strategie an
- FR35: Desktop-App reagiert auf Deep-Link-Aufrufe auch wenn App geschlossen
- FR36: Web-App zeigt explizite Warnung bei unverschlüsselter Speicherung

### Setup & Initialisierung

- FR37: Server startet im Setup-Pending-Mode wenn kein Admin existiert
- FR38: Setup-Pending-Mode erlaubt nur /health und /admin/setup Endpoints
- FR39: Benutzer kann Verbindung zu Server testen vor Speicherung
- FR40: System zeigt klare Fehlermeldung bei abgelaufenem Invite-Code

## Non-Functional Requirements

### Performance

| NFR | Anforderung | Metrik |
|-----|-------------|--------|
| NFR-P1 | Token-Validierung | <100ms Latenz pro Request |
| NFR-P2 | Server-Wechsel-UX | Server-Dropdown reagiert in <50ms |
| NFR-P3 | Deep Link Verarbeitung | App-Start + Server-Setup in <3s |
| NFR-P4 | Health-Check | Timeout nach 5s, Feedback sofort |
| NFR-P5 | Server-Liste laden | <200ms aus lokalem Storage |

### Security

| NFR | Anforderung | Metrik |
|-----|-------------|--------|
| NFR-S1 | Token-Hashing | bcrypt mit cost factor ≥10 |
| NFR-S2 | Token-Format | Prefix `blh_` + 32 random bytes (base64) |
| NFR-S3 | Rate Limiting | Max 5 Invite-Einlösungen/Minute/IP |
| NFR-S4 | Desktop-Speicherung | Verschlüsselt via Tauri plugin-store |
| NFR-S5 | Invite-Code Entropie | Min. 128 Bit Zufälligkeit |
| NFR-S6 | Token-Transmission | Nur über HTTPS (außer INSECURE_MODE) |
| NFR-S7 | Token-Anzeige | Einmalig bei Erstellung, nie wieder abrufbar |
| NFR-S8 | Audit-Trail | Alle Token-Operationen geloggt (ohne Token-Wert) |

### Integration

| NFR | Anforderung | Metrik |
|-----|-------------|--------|
| NFR-I1 | Deep Link Schema | `bluelight://connect` registriert auf Desktop |
| NFR-I2 | URL-Parameter | `?server=` und `?invite=` auf Web unterstützt |
| NFR-I3 | Tauri Plugin Store | @tauri-apps/plugin-store v2.x kompatibel |
| NFR-I4 | Backward Compatibility | Bestehende Auth-Flows unverändert nutzbar |
| NFR-I5 | API-Versioning | Health-Endpoint Änderungen rückwärtskompatibel |

### Reliability

| NFR | Anforderung | Metrik |
|-----|-------------|--------|
| NFR-R1 | Offline-Verhalten | Server-Liste offline verfügbar |
| NFR-R2 | Connection-Fehler | Klare Fehlermeldung in <2s |
| NFR-R3 | Invite-Code Race | Atomare "used" Markierung (keine Doppelnutzung) |
| NFR-R4 | Token-Persistenz | Token überlebt App-Updates und OS-Neustarts |
| NFR-R5 | Graceful Degradation | Bei Token-Fehler → Login-Screen (nicht Crash) |

### Usability

| NFR | Anforderung | Metrik |
|-----|-------------|--------|
| NFR-U1 | Server-Setup | Neuer Server in <2 Minuten konfiguriert |
| NFR-U2 | Server-Wechsel | Max. 3 Klicks von Login zu anderem Server |
| NFR-U3 | Fehlermeldungen | Deutsch, actionable (was tun bei Fehler) |
| NFR-U4 | Browser-Warnung | Sichtbar ohne Scrollen auf Login-Page |
| NFR-U5 | Deep Link Feedback | Visuelles Feedback bei Link-Verarbeitung |

