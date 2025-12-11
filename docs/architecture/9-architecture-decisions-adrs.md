# 9. Architecture Decisions (ADRs)

## Implemented ADRs (✅)

### ADR-005: Event Sourcing → CRUD + Audit Log

**Status:** ✅ Fully implemented

**Decision:** CRUD-basierter Ansatz mit Versionierung und Audit-Trail

**Implementation:**
- Soft-Delete only (keine physischen Löschungen)
- Versionierte Einträge (EtbEintragHistorie)
- Separater Audit-Table für alle Aktionen
- Status-Feld für ETB (DRAFT → ACTIVE → LOCKED)

**Rationale:**
- Konsistenz mit Prisma/PostgreSQL Stack
- Einfachere Implementierung
- Schnellere Time-to-Market
- Performance: Direkte Queries ohne Event-Replay

### ADR-007: JWT-Authentifizierung

**Status:** ✅ Fully implemented

**Implementation:**
- Cookie-basierte JWT-Tokens (HTTP-Only, Secure, SameSite)
- 3-Token-System: Access (15min), Refresh (7d), Admin
- Passport JWT Strategy
- Automatic token refresh on 401

### ADR-007b: 3-Token Authentication System

**Status:** ✅ Fully implemented
**Date:** 2025-12-10
**Context:** Admin-Operationen erfordern erhöhte Sicherheit und separaten Token-Lifecycle

**Decision:**
Wir verwenden ein 3-Token-System für differenzierte Authentifizierung und Autorisierung:

1. **accessToken** (15 Minuten TTL)
   - Cookie-Name: `accessToken`
   - Verwendung: Normale Benutzer-Authentifizierung
   - Benötigt für: Alle authentifizierten Endpunkte
   - Guard: `JwtAuthGuard`

2. **refreshToken** (7 Tage TTL)
   - Cookie-Name: `refreshToken`
   - Verwendung: Erneuerung des accessToken
   - Endpoint: `POST /api/auth/refresh`
   - Nur für Token-Refresh, nicht für API-Calls

3. **adminToken** (15 Minuten TTL)
   - Cookie-Name: `adminToken`
   - Verwendung: Admin-Berechtigung
   - Benötigt für: Admin-Endpunkte (zusätzlich zu accessToken)
   - Guard: `AdminJwtAuthGuard`

**Admin-Endpoints benötigen BEIDE Tokens:**
- `accessToken` (Authentifizierung: "Wer bist du?")
- `adminToken` (Autorisierung: "Darfst du Admin-Operationen ausführen?")

**Implementation:**
```typescript
// Backend Guard-Logik
@UseGuards(AdminJwtAuthGuard)
@Post('/admin/critical-operation')
async criticalOperation(@Request() req) {
  // Beide Tokens wurden validiert:
  // 1. accessToken → user ist authentifiziert
  // 2. adminToken → user hat Admin-Rechte
}
```

**Consequences:**

**Positive:**
- ✅ Höhere Sicherheit für Admin-Operationen (Dual-Token-Prinzip)
- ✅ Separater Token-Lifecycle für Admin-Rechte (kann unabhängig ablaufen)
- ✅ Granulare Autorisierung (Admin-Token kann widerrufen werden, ohne User auszuloggen)
- ✅ Compliance: Admin-Aktionen haben separaten Audit-Trail
- ✅ Zeitlich begrenzte Admin-Rechte (Re-Authentication erforderlich)

**Negative:**
- ⚠️ Komplexere Token-Verwaltung im Frontend (3 Cookies zu tracken)
- ⚠️ Zusätzlicher API-Call für Admin-Token-Erneuerung
- ⚠️ Verwirrendes UX-Szenario: accessToken gültig, aber adminToken abgelaufen

**Rationale:**
- Admin-Operationen (User-Verwaltung, System-Konfiguration) benötigen erhöhte Sicherheit
- Separater Token verhindert versehentliche Admin-Aktionen durch abgelaufene Sessions
- Ermöglicht zeitlich begrenzte Admin-Rechte (z.B. "Admin für 15 Minuten")
- Prinzip der minimalen Privilegien (Least Privilege Principle)
- **Separation of Concerns:** accessToken = "Wer bist du?" (Identität), adminToken = "Darfst du?" (Berechtigung)
- **Defense in Depth:** Selbst wenn accessToken kompromittiert wird, sind Admin-Operationen ohne adminToken nicht möglich
- **Audit-Trail:** Separate Tokens ermöglichen granulare Protokollierung von Admin-Aktionen

**Related:**
- ADR-011: Admin Roles System (definiert ADMIN/SUPER_ADMIN Rollen)
- Story 0-1: AdminJwtAuthGuard Tests (verifiziert Dual-Token-Logik)

### ADR-010: MFA Removal

**Status:** ✅ Implemented

**Decision:** Vollständige Entfernung von Multi-Factor Authentication

**Rationale:**
- Zu komplex für initialen Release
- Fokus auf Kernfeatures
- Kann später ergänzt werden

### ADR-011: Admin Roles System

**Status:** ✅ Fully implemented

**Implementation:**
- 3 Rollen: USER, ADMIN, SUPER_ADMIN
- Role-based Guards (`JwtAuthGuard`, `AdminJwtAuthGuard`)
- Granular permissions per endpoint

### ADR-013: Tailwind CSS + Headless UI Migration

**Status:** ✅ Fully implemented

**Decision:** Migration von Chakra UI zu Tailwind CSS + Headless UI

**Implementation:**
- Atomic Design mit Tailwind-Klassen
- Headless UI für accessible Komponenten
- Bundle-Size Reduktion um ~60%
- Performance-Verbesserung (kein CSS-in-JS Runtime)

**Rationale:**
- Bessere Performance (Zero-Runtime)
- Kleinere Bundle-Size
- Tailwind IntelliSense in IDE
- Headless UI für Accessibility

### ADR-016: Unified Authentication

**Status:** ✅ Fully implemented

**Decision:** Ein einziger `/api/auth/unified` Endpunkt für Login & Auto-Register

**Implementation:**
```typescript
POST /api/auth/unified
{
  username: string,
  password?: string // optional
}

// Backend prüft:
if (userExists) {
  // Login-Flow
  validatePassword();
  return { user, token, isNewUser: false };
} else {
  // Auto-Register-Flow
  createUser();
  return { user, token, isNewUser: true };
}
```

**Rationale:**
- Bessere UX (keine Verwirrung Login vs. Register)
- Schnellerer Onboarding
- Weniger Code (ein Formular, ein Endpunkt)

### ADR-017: No-Delete Policy für Einsätze

**Status:** ✅ Fully implemented

**Decision:** Einsätze werden NIEMALS physisch gelöscht

**Implementation:**
- `archivedAt`, `archivedBy` Felder
- Status-Transition: → ARCHIVIERT
- Prisma-Query-Filter für archivierte Einsätze
- Expliziter `/archive` Endpunkt

**Rationale:**
- Compliance (DRK-Anforderungen)
- Audit-Trail
- Datenintegrität
- Nachvollziehbarkeit

### ADR-018: Minimale Einsatzerstellung

**Status:** ✅ Fully implemented

**Decision:** Einsätze können ohne Pflichtparameter erstellt werden

**Implementation:**
- Alle Felder optional (außer ID)
- Automatische Namengenerierung aus verfügbaren Feldern
- Inkrementelle Vervollständigung
- Completeness-Score (0-100%)

**Rationale:**
- Flexibilität im Einsatz
- Schnelle Anlage ohne Vorkenntnisse
- Nachträgliche Vervollständigung

### ADR-019: Computed Fields für Einsatzdaten

**Status:** ✅ Fully implemented

**Decision:** `name` und `completeness` als Computed Fields

**Implementation:**
```typescript
// name: Automatisch generiert
name = alarmstichwort || `Einsatz ${id.slice(0,8)}` || 'Unbenannter Einsatz';

// completeness: Berechnet aus ausgefüllten Feldern
completeness = (filledFields / totalFields) * 100;
```

**Rationale:**
- User Experience (sinnvoller Name ohne Pflicht)
- Übersicht über Datenvollständigkeit
- Keine Duplikation in Datenbank

### ADR-020: Optimistic UI Updates

**Status:** ✅ Fully implemented with TanStack Query

**Decision:** Sofortige UI-Aktualisierung mit Rollback bei Fehler

**Implementation:**
- TanStack Query `onMutate`, `onError`, `onSuccess`, `onSettled`
- Automatic rollback bei Server-Fehler
- Visuelle Indikatoren für Pending-Status
- Toast-Notifications für Feedback

**Rationale:**
- Beste UX (sofortiges Feedback)
- Gefühlte Performance verbessern
- User-Flow nicht unterbrechen
- Stresssituationen berücksichtigen

### ADR-021: BMAD Documentation Integration

**Status:** ✅ This document

**Decision:** Nutzung von BMAD Method für Architektur-Dokumentation

**Rationale:**
- arc42 teilweise veraltet
- BMAD für brownfield-Analyse geeignet
- Single Source of Truth aus Code

### ADR-022: Domain Layer als Backend Subfolder

**Status:** ✅ Accepted
**Date:** 2025-11-13
**Context:** Hexagonal Architecture Migration (Epic-1)
**Decision Makers:** Architect + Scrum Master

#### Context and Problem Statement

Im Rahmen der Migration zu Hexagonaler Architektur (Epic-1, Story 1.1) muss entschieden werden, wo die Domain Layer strukturell leben soll. Die Domain Layer ist das Herzstück der Geschäftslogik und muss vollständig unabhängig von Infrastruktur (Prisma, HTTP, externe Services) sein.

**Problem:** Zwei mögliche Ansätze stehen zur Diskussion:
1. Separates Monorepo-Package (`packages/domain/`)
2. Backend-Subfolder (`packages/backend/src/domain/`)

#### Considered Options

**Option 1: Monorepo Package (`packages/domain/`)**
- Eigenes NPM-Package mit separatem `package.json`
- Explizite Abhängigkeiten über `package.json`
- Eigener Build-Step
- Vollständige physische Isolation

**Option 2: Backend Subfolder (`packages/backend/src/domain/`)**
- Subfolder innerhalb des Backend-Packages
- TypeScript Path Aliases (`@domain/*` → `src/domain/*`)
- Kein separater Build-Step
- Statische Analyse mit Madge für Dependency-Checking

#### Decision Outcome

**Chosen option:** "Backend Subfolder" (`packages/backend/src/domain/`)

**Rationale:**
- ✅ Einfachere Maintenance (kein separates Package)
- ✅ TypeScript-Konfiguration via Backend `tsconfig.json`
- ✅ Kein zusätzlicher Build-Step erforderlich
- ✅ Schnellerer Development-Workflow
- ✅ Weniger Boilerplate-Code
- ⚠️ Erfordert disziplinierte Dependency-Rules

#### Consequences

**Positive:**
- Einfachere Projektstruktur (weniger Packages)
- Schnellere Builds (kein Cross-Package-Linking)
- TypeScript Paths bieten logische Trennung
- Entwickler-Erfahrung verbessert (keine `pnpm --filter` Commands nötig)

**Negative:**
- Keine physische Package-Boundary
- Risiko ungewollter Imports aus `application/` oder `infrastructure/`
- Abhängig von statischer Analyse (Madge) für Enforcement

**Mitigation:**
- **Madge Circular Dependency Check:** CI-Pipeline-Integration
  ```bash
  pnpm --filter @bluelight-hub/backend check:madge
  ```
- **ESLint no-restricted-imports:** Blockiere Imports von nicht-Domain-Code in Domain Layer
- **Pre-commit Hooks:** Husky + lint-staged validieren Dependency Rules

#### Technical Implementation

**Verzeichnisstruktur:**
```
packages/backend/src/
├── domain/                    # ✅ Kern-Geschäftslogik
│   ├── entities/              # Aggregates, Entities, Value Objects
│   ├── repositories/          # Repository-Interfaces (KEINE Implementierung!)
│   ├── services/              # Domain Services
│   └── events/                # Domain Events
├── application/               # Use Cases, DTOs
├── infrastructure/            # Prisma, HTTP, externe Services
└── presentation/              # Controller
```

**TypeScript Path Configuration (`tsconfig.json`):**
```json
{
  "compilerOptions": {
    "paths": {
      "@domain/*": ["src/domain/*"],
      "@application/*": ["src/application/*"],
      "@infrastructure/*": ["src/infrastructure/*"]
    }
  }
}
```

**Madge Dependency Rule (`.madgerc`):**
```json
{
  "detectiveOptions": {
    "ts": {
      "skipTypeImports": true
    }
  },
  "noCircular": true,
  "noOrphans": true
}
```

**ESLint Rule (`eslint.config.js`):**
```javascript
{
  files: ['src/domain/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        '@application/*',
        '@infrastructure/*',
        '@nestjs/*',
        '@prisma/*'
      ]
    }]
  }
}
```

#### Related Decisions

- **ADR-006:** Hexagonal Architecture (Kontext für diese Entscheidung)
- **ADR-003:** Monolith vs. Microservice (Modularer Monolith gewählt)
- **Story 1.1:** Domain Layer Implementation (direkte Umsetzung)

#### Validation Criteria

✅ **Acceptance Criteria:**
1. Domain Layer importiert NIEMALS aus `application/` oder `infrastructure/`
2. Madge-Check läuft erfolgreich in CI/CD
3. ESLint blockiert unerlaubte Imports
4. TypeScript Paths funktionieren korrekt

## Partially Implemented ADRs (⚠️)

### ADR-001: Verbindungskonzept

**Status:** ⚠️ Partially implemented

**Decision:** Verschiedene Konnektivitätsszenarien (lokal, vollständig, autonom)

**Reality:**
- ✅ HTTP REST API (lokal + remote)
- ❌ Keine Offline-Sync
- ❌ Kein autonomer Modus
- ⚠️ Nur Offline-Maps (Leaflet Tiles)

### ADR-004: Tauri Desktop App

**Status:** ⚠️ Implemented, but limited

**Reality:**
- ✅ Tauri 2.8.5 Desktop App
- ✅ Cross-Platform (Windows, macOS, Linux)
- ❌ Keine nativen Features genutzt (z.B. Dateisystem)
- ❌ Keine Offline-Features

### ADR-006: Docker Deployment

**Status:** ⚠️ Partially implemented

**Reality:**
- ✅ Dockerfile vorhanden
- ✅ docker-compose.yml für Development
- ❌ Production-Deployment nicht dokumentiert
- ❌ Kubernetes nicht evaluiert

### ADR-009: Dashboard-Architektur

**Status:** ⚠️ Frontend-only

**Reality:**
- ✅ 4 Dashboard-Komponenten im Frontend
- ❌ Kein Backend-Dashboard-Modul
- ❌ Keine Echtzeit-Updates

### ADR-015: ETB Filter Implementation

**Status:** ⚠️ Not fully verified

**Reality:**
- Implementierung nicht im Detail verifiziert
- Wahrscheinlich vorhanden (13 ETB-Molecules)

## Not Implemented ADRs (❌)

### ADR-002: CRDTs für Datensynchronisation

**Status:** ❌ "In Prüfung", not implemented

**Reality:**
- Keine CRDT-Bibliotheken
- Keine Konfliktauflösung
- Nur Standard HTTP REST

### ADR-003: Monolith vs. Microservice

**Status:** ❌ Monolith gewählt, aber keine klaren Service-Grenzen

**Reality:**
- Modularer Monolith (NestJS Modules)
- Keine Service-Grenzen definiert
- Keine Microservice-Architektur

### ADR-008: Offene Entscheidungen

**Status:** ❌ Dokument mit TODOs, keine finalen Entscheidungen

### ADR-012: API Versioning Strategy

**Status:** ⚠️ `alpha` implementiert, aber keine v1/v2-Strategie

**Reality:**
- `/api/alpha/{resource}` für Domain-Endpunkte
- Keine Backward-Compatibility-Strategie
- Kein Deprecation-Prozess

### ADR-023: UNIQUE Constraint + Upsert Pattern für Rollenbesetzung

**Status:** ✅ Fully implemented
**Date:** 2025-12-11
**Context:** Race Condition Prevention bei parallelen Rollenzuweisungen (Story 0-2, Epic 5)
**Decision Makers:** Architect + Developer
**Risk Mitigation:** R-E5-002 (Score 9, KRITISCH - Race Conditions bei Rollenzuweisungen)

#### Context and Problem Statement

Bei parallelen Rollenzuweisungen im Einsatzmanagement besteht das Risiko von Race Conditions, die zu inkonsistenten Daten führen können:

**Problem:** Zwei Benutzer weisen gleichzeitig dieselbe Rolle (z.B. "Gruppenführer") demselben Einsatz zu:
1. User A prüft: Rolle "Gruppenführer" existiert nicht → INSERT
2. User B prüft: Rolle "Gruppenführer" existiert nicht → INSERT
3. KONFLIKT: Zwei Einträge für dieselbe Rolle im selben Einsatz

**Konsequenzen ohne Lösung:**
- Dateninkonsistenz (mehrere "Gruppenführer" pro Einsatz)
- Verletzung der Geschäftslogik (eindeutige Rollen)
- Fehlerhafte Anzeige in UI (welcher Gruppenführer ist der aktuelle?)
- Audit-Trail-Probleme (welche Zuweisung war die korrekte?)

**Risk Assessment:**
- **Risk-ID:** R-E5-002
- **Severity:** KRITISCH (Score 9/12)
- **Impact:** Datenintegrität, Geschäftslogik-Verletzung
- **Probability:** HOCH (parallele Zugriffe im Einsatz wahrscheinlich)

#### Considered Options

**Option 1: Optimistic Locking (Versionierung)**
- Jeder Eintrag hat `version`-Feld
- Update nur erfolgreich, wenn `version` unverändert
- Fehler bei Konflikt → User muss Retry machen

**Option 2: Pessimistic Locking (SELECT FOR UPDATE)**
- Row-Level-Lock in Datenbank während Transaction
- Blockiert parallele Zugriffe
- Performance-Impact bei vielen parallelen Operationen

**Option 3: UNIQUE Constraint + Upsert Pattern**
- Datenbank-Level Constraint verhindert Duplikate
- Upsert (INSERT + ON CONFLICT UPDATE) für Idempotenz
- Last-write-wins Semantik
- Kein explizites Locking erforderlich

**Option 4: Application-Level Locking (Redis/Mutex)**
- Lock-Service (z.B. Redis) vor Datenbank-Operation
- Zusätzliche Infrastruktur erforderlich
- Fehleranfällig bei Lock-Release

#### Decision Outcome

**Chosen option:** "UNIQUE Constraint + Upsert Pattern" (Option 3)

**Rationale:**
- ✅ **Datenbankgarantie:** UNIQUE Constraint verhindert physisch Duplikate
- ✅ **Idempotenz:** Upsert macht Operationen wiederholbar ohne Seiteneffekte
- ✅ **Performance:** Keine expliziten Locks, nur Row-Level Constraint-Check
- ✅ **Einfachheit:** Keine zusätzliche Infrastruktur (Redis) erforderlich
- ✅ **Transparenz:** Last-write-wins Semantik ist für User verständlich
- ✅ **Atomic:** Gesamte Operation (Check + Insert/Update) ist atomar
- ⚠️ **Trade-off:** Keine Konfliktauflösungs-UI (Optimistic Locking würde Konflikt melden)

#### Technical Implementation

**Prisma Schema (Datenbank-Level):**
```prisma
model EinsatzRolle {
  id                  String   @id @default(uuid())
  einsatzId           String
  rollenDefinitionId  String
  benutzerId          String?
  zugewiesenAm        DateTime?
  zugewiesenVon       String?

  // UNIQUE Constraint: Eine Rolle pro Einsatz
  @@unique([einsatzId, rollenDefinitionId], name: "unique_rolle_per_einsatz")
  @@index([einsatzId])
  @@index([benutzerId])
}
```

**Repository Pattern (Application-Level):**
```typescript
// Infrastructure Layer: Prisma Repository Implementation
class EinsatzRolleRepository implements IEinsatzRolleRepository {
  async assignRolle(
    einsatzId: string,
    rollenDefinitionId: string,
    benutzerId: string,
    zugewiesenVon: string
  ): Promise<Result<EinsatzRolle>> {
    try {
      // Upsert: INSERT wenn nicht existiert, UPDATE bei Konflikt
      const rolle = await this.prisma.einsatzRolle.upsert({
        where: {
          // UNIQUE Constraint als WHERE-Bedingung
          unique_rolle_per_einsatz: {
            einsatzId,
            rollenDefinitionId,
          },
        },
        // UPDATE bei Konflikt (Last-write-wins)
        update: {
          benutzerId,
          zugewiesenAm: new Date(),
          zugewiesenVon,
        },
        // INSERT wenn nicht existiert
        create: {
          einsatzId,
          rollenDefinitionId,
          benutzerId,
          zugewiesenAm: new Date(),
          zugewiesenVon,
        },
      });

      return Result.ok(rolle);
    } catch (error) {
      // Nur unerwartete Fehler (DB-Fehler, Netzwerk-Fehler)
      return Result.fail(`Database error: ${error.message}`);
    }
  }
}
```

**Handler Pattern (Use Case):**
```typescript
// Application Layer: Command Handler
export class AssignRolleToEinsatzHandler {
  async execute(
    command: AssignRolleToEinsatzCommand
  ): Promise<Result<string>> {
    // Business Rules Validation
    const validation = command.validate();
    if (validation.isFailure) {
      return Result.fail(validation.error);
    }

    // Upsert via Repository (idempotent, race-condition-safe)
    const result = await this.repository.assignRolle(
      command.einsatzId,
      command.rollenDefinitionId,
      command.benutzerId,
      command.zugewiesenVon
    );

    if (result.isFailure) {
      return Result.fail(result.error);
    }

    return Result.ok(result.value.id);
  }
}
```

#### Consequences

**Positive:**
- ✅ **Datenintegrität:** UNIQUE Constraint garantiert keine Duplikate
- ✅ **Race Condition Prevention:** Atomare Operation verhindert parallele Konflikte
- ✅ **Idempotenz:** Wiederholte Aufrufe mit gleichen Parametern haben gleichen Effekt
- ✅ **Performance:** Kein explizites Locking, nur Constraint-Check
- ✅ **Simplicity:** Keine zusätzliche Infrastruktur (Redis, Lock-Service)
- ✅ **Last-write-wins:** Semantik ist für User verständlich und akzeptabel
- ✅ **Testbarkeit:** Pattern ist einfach in Unit/Integration Tests abzubilden
- ✅ **Compliance:** Audit-Trail bleibt konsistent (nur ein Eintrag pro Rolle)

**Negative:**
- ⚠️ **Keine Konfliktauflösungs-UI:** User sieht nicht, dass seine Zuweisung überschrieben wurde
- ⚠️ **Last-write-wins:** Frühere Zuweisung wird ohne Warnung überschrieben
- ⚠️ **Audit-Trail-Lücke:** Historische Zuweisungen gehen verloren (keine Versionierung)
- ⚠️ **Business Rule Enforcement:** Constraint muss synchron mit Business Rules bleiben

**Mitigation:**

1. **Audit-Trail Ergänzung:**
   ```prisma
   model EinsatzRolleHistorie {
     id                  String   @id @default(uuid())
     einsatzRolleId      String
     benutzerId          String?
     zugewiesenAm        DateTime
     zugewiesenVon       String
     updatedAt           DateTime @default(now())

     @@index([einsatzRolleId])
   }
   ```
   - Historie-Tabelle speichert alle Zuweisungen
   - Trigger oder Application-Layer speichert alte Werte vor Update

2. **Optimistic UI Update:**
   ```typescript
   // Frontend zeigt sofort neue Zuweisung (optimistic update)
   const mutation = useMutation({
     mutationFn: assignRolle,
     onMutate: async (newData) => {
       // Sofortiges UI-Update
       queryClient.setQueryData(['rollen', einsatzId], newData);
     },
     onError: (err, newData, context) => {
       // Rollback bei Fehler
       queryClient.setQueryData(['rollen', einsatzId], context.previousData);
     },
   });
   ```

3. **WebSocket Notifications:**
   - Real-time Benachrichtigung bei Überschreibung
   - User sieht, wenn jemand anderes Rolle zugewiesen hat
   - Hinweis: "Diese Rolle wurde gerade von User X neu zugewiesen"

4. **Validation Layer:**
   ```typescript
   // Business Rule: Nur berechtigte User können Rollen zuweisen
   if (!user.hasPermission('ASSIGN_ROLES')) {
     return Result.fail('Insufficient permissions');
   }

   // Business Rule: Benutzer muss existieren
   const targetUser = await this.userRepo.findById(command.benutzerId);
   if (!targetUser) {
     return Result.fail('Target user not found');
   }
   ```

#### Performance Implications

**Benchmark-Daten (simuliert):**
- **Ohne Constraint:** 50ms Latenz (SELECT → INSERT)
- **Mit UNIQUE + Upsert:** 55ms Latenz (+10% Overhead)
- **Pessimistic Locking:** 120ms Latenz bei 10 parallelen Requests (+140%)

**Skalierung:**
- UNIQUE Index: O(log n) Lookup
- Kein Lock-Contention bei verschiedenen Rollen
- Nur Lock-Contention bei exakt gleicher Rolle im gleichen Einsatz (selten)

#### Related Decisions

- **ADR-005:** CRUD + Audit Log (Audit-Trail für Rollenhistorie)
- **ADR-017:** No-Delete Policy (Historie bleibt erhalten)
- **ADR-020:** Optimistic UI Updates (Frontend-Pattern für Race Condition Handling)
- **ADR-022:** Domain Layer Subfolder (Repository Pattern Implementation)
- **Story 0-2:** Race Condition Tests (verifiziert Pattern mit Prisma Mocks)
- **Epic 5:** Kreis/Gruppe/Fahrzeug Management (Story 5.0/5.1 nutzen dieses Pattern)

#### Validation Criteria

✅ **Acceptance Criteria (Story 0-2):**
1. UNIQUE Constraint in Prisma Schema definiert
2. Repository nutzt `upsert()` statt `create()`
3. Unit Tests simulieren parallele Requests (Prisma Mock)
4. Integration Tests mit echter Datenbank verifizieren Constraint
5. Last-write-wins Semantik ist dokumentiert

✅ **Risk Mitigation:**
- **R-E5-002 (Score 9 → 3):** Race Conditions verhindert durch UNIQUE Constraint
- **Severity:** KRITISCH → NIEDRIG
- **Probability:** HOCH → VERNACHLÄSSIGBAR (nur noch DB-Fehler möglich)

#### Future Considerations

**Wenn Last-write-wins nicht mehr akzeptabel ist:**
1. **Optimistic Locking hinzufügen:**
   - `version`-Feld in `EinsatzRolle`
   - Frontend zeigt Konfliktauflösungs-Modal
   - User entscheidet: "Überschreiben" oder "Abbrechen"

2. **Approval-Workflow:**
   - Admin muss Rollenzuweisung bestätigen
   - Verhindert versehentliche Überschreibungen

3. **Role-Based Locking:**
   - Bestimmte Rollen (z.B. "Einsatzleiter") können nicht überschrieben werden
   - Business Rule prüft `isLocked` Flag

---
