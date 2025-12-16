# Story 2.0: Prisma Schema für Stammdaten

**Epic:** 2 - Stammdaten-Administration
**Story Key:** 2-0-prisma-schema-stammdaten
**Status:** done
**Created:** 2025-12-16
**FRs covered:** FR32 (Stamm-Fahrzeuge), FR33 (Stamm-Personen)

---

## Pre-Requisites

- [x] Epic 1 Stories sind DONE (Admin-Grundkonfiguration)
- [x] Prisma Schema enthält bereits: `Qualifikation`, `Fahrzeugtyp`, `RollenDefinition`, `FunkStatusConfig`
- [x] Audit-Trail Pattern aus Story 1-0 ist etabliert
- [x] PostgreSQL läuft (Port 3092)

---

## User Story

**Als** Entwickler,
**möchte ich** das Prisma Schema für die Stammdaten-Entitäten (Fahrzeuge & Personen) definieren,
**damit** Epic 2 Stories auf einer stabilen Datenbankstruktur aufbauen können.

---

## Definition of Done (Checklist)

**Implementierung abgeschlossen:**

- [x] Model `StammFahrzeug` mit allen Attributen und Relations
- [x] Model `StammPerson` mit allen Attributen und Relations
- [x] Model `StammPersonQualifikation` (M:N Junction Table)
- [x] Alle Audit-Trail Felder: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- [x] Archive-Felder: `archivedAt`, `archivedBy` (KEIN `isDeleted`!)
- [x] User-Model mit 8 neuen Relations erweitert (3×Fahrzeug + 3×Person + 2×Junction)
- [x] Migration `add_kraefte_stammdaten` erstellt und auf lokaler DB angewendet
- [x] Seed-Daten mit **Upsert-Pattern** erweitert (Funktion `seedStammdaten`)
- [x] `prisma validate` erfolgreich
- [x] Alle Indexes auf Filter- und FK-Felder vorhanden
- [x] `pnpm run generate-api` erfolgreich (API-Client aktualisiert)

---

## Acceptance Criteria

### AC1: Stamm-Fahrzeug Entity definiert

**Given** das bestehende Prisma Schema mit Fahrzeugtyp aus Epic 1
**When** ich die StammFahrzeug Entity hinzufüge
**Then** existiert Model `StammFahrzeug` mit:
- `id` (CUID)
- `rufname` (String, required) - Fahrzeugbezeichnung
- `funkrufname` (String, UNIQUE) - Funkrufzeichen
- `fahrzeugtypId` (FK → Fahrzeugtyp, required) - Referenz zu Epic 1
- `kennzeichen` (String?, optional) - Nummernschild
- `baujahr` (Int?, optional) - Baujahr
- `funkkenungBOS` (String?, optional) - BOS-Funkkennung
- Audit-Trail: `createdAt`, `updatedAt`, `createdBy` (FK), `updatedBy` (FK)
- Archive: `archivedAt`, `archivedBy` (FK)

### AC2: Stamm-Person Entity definiert

**Given** das bestehende Prisma Schema mit Qualifikation aus Epic 1
**When** ich die StammPerson Entity hinzufüge
**Then** existiert Model `StammPerson` mit:
- `id` (CUID)
- `vorname` (String, required)
- `nachname` (String, required)
- `personalnummer` (String, UNIQUE) - Eindeutige Personalnummer
- `funkkenungBOS` (String?, optional) - BOS-Funkkennung
- M:N Relation zu Qualifikation via `StammPersonQualifikation`
- Audit-Trail: `createdAt`, `updatedAt`, `createdBy` (FK), `updatedBy` (FK)
- Archive: `archivedAt`, `archivedBy` (FK)

### AC3: M:N Junction Table für Qualifikationen

**Given** StammPerson und Qualifikation Entities
**When** ich die Junction Table definiere
**Then** existiert Model `StammPersonQualifikation` mit:
- `id` (CUID)
- `personId` (FK → StammPerson)
- `qualifikationId` (FK → Qualifikation)
- Audit-Trail: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- `@@unique([personId, qualifikationId])` - Keine Duplikate

### AC4: Relations korrekt definiert

**Given** alle Entities sind definiert
**When** ich die Relations prüfe
**Then** sind:
- Creator-FKs mit `onDelete: Restrict` konfiguriert
- Updater-FKs mit `onDelete: SetNull` konfiguriert
- Archiver-FKs mit `onDelete: SetNull` konfiguriert
- `fahrzeugtypId` auf Fahrzeugtyp mit `onDelete: Restrict`
- Junction `personId` mit `onDelete: Cascade` (Person gelöscht → Qualifikationen weg)
- Junction `qualifikationId` mit `onDelete: Restrict` (Qualifikation nicht löschbar wenn zugewiesen)

### AC5: Migration erstellt und angewendet

**Given** das Schema ist vollständig
**When** ich `prisma migrate dev` ausführe
**Then** wird Migration `add_kraefte_stammdaten` erfolgreich erstellt
**And** alle Tables existieren in PostgreSQL

### AC6: Seed-Daten für Entwicklung (Idempotent)

**Given** Migration ist angewendet
**When** ich `prisma db seed` ausführe (auch mehrfach)
**Then** werden Beispiel-Fahrzeuge (RTW 1, KTW 1) angelegt oder aktualisiert
**And** Beispiel-Personen mit Qualifikationen angelegt oder aktualisiert
**And** keine Duplikate entstehen bei mehrfacher Ausführung (Upsert-Pattern)

---

## Developer Context

### Warum diese Story existiert

**Foundation für Epic 2-7:** Ohne dieses Schema blockiert:
- Story 2.1/2.2: Stammdaten CRUD
- Epic 3: Fahrzeug-Einsatz (→ StammFahrzeug)
- Epic 4: Helfer-Registrierung (→ StammPerson)
- Epic 7: HiOrg-Sync (→ Import)

### Kritische Semantiken

| Pattern | Verwendung | Regel |
|---------|------------|-------|
| `archivedAt/By` | Stammdaten | **KEIN `isDeleted`!** Archiviert = ausgeblendet, aber historisch verfügbar |
| `istAktiv` | Config-Entities | Admin-Toggle, nicht Löschung |
| `fahrzeugtypId` | StammFahrzeug | **IMMUTABLE!** Bei Umrüstung: neues Fahrzeug anlegen, altes archivieren |

### M:N Qualifikation-Semantik

Junction-Table speichert jede Zuweisung mit eigenem Audit-Trail. **Keine `istPflicht`-Flag** (anders als RolleQualifikation) - nur "welche Qualifikationen HAT die Person".

---

## Bestehende Schema-Patterns (ZWINGEND folgen!)

**Aus Story 1-0 und `packages/backend/prisma/schema.prisma`:**

```prisma
// AUDIT-TRAIL PATTERN - Bei JEDER Entity!
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
createdBy String   @db.VarChar(100)  // User.id (FK)
updatedBy String?  @db.VarChar(100)  // User.id (FK, optional)

// ARCHIVE PATTERN - Für Stammdaten (NICHT isDeleted!)
archivedAt DateTime?
archivedBy String?  @db.VarChar(100)  // User.id (FK, optional)

// RELATIONS - IMMER onDelete explizit
creator User  @relation("XyzCreator", fields: [createdBy], references: [id], onDelete: Restrict)
updater User? @relation("XyzUpdater", fields: [updatedBy], references: [id], onDelete: SetNull)
archiver User? @relation("XyzArchiver", fields: [archivedBy], references: [id], onDelete: SetNull)

// INDEXES - Immer auf Audit + Filter-Felder
@@index([createdBy])
@@index([archivedAt])  // Für "aktive" Filter

// TABLE NAMING - lowercase mit Unterstrichen
@@map("table_name")
```

---

## Schema-Vorlage (Copy-Paste Ready)

**Datei:** `packages/backend/prisma/schema.prisma`

### Änderungsübersicht (4 Stellen im Schema!)

| # | Änderung | Sektion |
|---|----------|---------|
| 1 | **3 neue Models** hinzufügen | StammFahrzeug, StammPerson, StammPersonQualifikation |
| 2 | **User-Model** erweitern | 8 neue Relations (Sektion unten) |
| 3 | **Fahrzeugtyp-Model** erweitern | 1 inverse Relation |
| 4 | **Qualifikation-Model** erweitern | 1 inverse Relation |

```prisma
// ========================================
// Kräfte-Management: Stammdaten
// Epic 2 - Story 2.0
// ========================================

/// Stamm-Fahrzeug: Dauerhaft registriertes Fahrzeug der Organisation
/// Referenziert von: EinsatzFahrzeug (Epic 3), Lagekarte-POIs (Epic 8)
model StammFahrzeug {
  id            String   @id @default(cuid())
  rufname       String   @db.VarChar(100) // z.B. "Rettungswagen 1"
  funkrufname   String   @unique @db.VarChar(50) // z.B. "Rotkreuz 83/1"
  fahrzeugtypId String   // FK zu Fahrzeugtyp (Epic 1)
  kennzeichen   String?  @db.VarChar(20) // z.B. "DA-RK 123"
  baujahr       Int?     // z.B. 2022
  funkkenungBOS String?  @db.VarChar(50) // BOS-Funkkennung

  // Archive-Pattern (NICHT isDeleted!)
  archivedAt DateTime?
  archivedBy String?   @db.VarChar(100)

  // Audit-Trail
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String   @db.VarChar(100)
  updatedBy String?  @db.VarChar(100)

  // Relations
  fahrzeugtyp Fahrzeugtyp @relation(fields: [fahrzeugtypId], references: [id], onDelete: Restrict)
  creator     User        @relation("StammFahrzeugCreator", fields: [createdBy], references: [id], onDelete: Restrict)
  updater     User?       @relation("StammFahrzeugUpdater", fields: [updatedBy], references: [id], onDelete: SetNull)
  archiver    User?       @relation("StammFahrzeugArchiver", fields: [archivedBy], references: [id], onDelete: SetNull)

  // Indexes
  @@index([fahrzeugtypId])
  @@index([archivedAt])
  @@index([archivedAt, fahrzeugtypId])
  @@index([createdBy])
  @@map("stamm_fahrzeuge")
}

/// Stamm-Person: Dauerhaft registriertes Mitglied der Organisation
/// Referenziert von: EinsatzPerson (Epic 4), Rollenbesetzung (Epic 5)
model StammPerson {
  id             String   @id @default(cuid())
  vorname        String   @db.VarChar(100)
  nachname       String   @db.VarChar(100)
  personalnummer String   @unique @db.VarChar(50) // Eindeutige Personalnummer
  funkkenungBOS  String?  @db.VarChar(50) // BOS-Funkkennung

  // Archive-Pattern (NICHT isDeleted!)
  archivedAt DateTime?
  archivedBy String?   @db.VarChar(100)

  // Audit-Trail
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String   @db.VarChar(100)
  updatedBy String?  @db.VarChar(100)

  // Relations
  creator User  @relation("StammPersonCreator", fields: [createdBy], references: [id], onDelete: Restrict)
  updater User? @relation("StammPersonUpdater", fields: [updatedBy], references: [id], onDelete: SetNull)
  archiver User? @relation("StammPersonArchiver", fields: [archivedBy], references: [id], onDelete: SetNull)

  // M:N: Qualifikationen dieser Person
  qualifikationen StammPersonQualifikation[]

  // Indexes
  @@index([archivedAt])
  @@index([archivedAt, nachname])
  @@index([createdBy])
  @@map("stamm_personen")
}

/// M:N Junction Table: StammPerson <-> Qualifikation
/// Jede Qualifikation einer Person ist ein separater Eintrag mit Audit-Trail
model StammPersonQualifikation {
  id              String @id @default(cuid())
  personId        String
  qualifikationId String

  // Audit-Trail (wann wurde Qualifikation zugewiesen?)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String   @db.VarChar(100)
  updatedBy String?  @db.VarChar(100)

  // Relations
  person        StammPerson   @relation(fields: [personId], references: [id], onDelete: Cascade)
  qualifikation Qualifikation @relation(fields: [qualifikationId], references: [id], onDelete: Restrict)
  creator       User          @relation("StammPersonQualifikationCreator", fields: [createdBy], references: [id], onDelete: Restrict)
  updater       User?         @relation("StammPersonQualifikationUpdater", fields: [updatedBy], references: [id], onDelete: SetNull)

  // Unique Constraint (keine Duplikate in M:N)
  @@unique([personId, qualifikationId])
  @@index([personId])
  @@index([qualifikationId])
  @@index([createdBy])
  @@map("stamm_person_qualifikationen")
}
```

---

## User-Model erweitern

**In `model User { ... }` hinzufügen (nach bestehenden Kräfte-Relations):**

```prisma
// ========================================
// Stammdaten Relations (Story 2.0)
// ========================================

// StammFahrzeug Relations
createdStammFahrzeuge  StammFahrzeug[] @relation("StammFahrzeugCreator")
updatedStammFahrzeuge  StammFahrzeug[] @relation("StammFahrzeugUpdater")
archivedStammFahrzeuge StammFahrzeug[] @relation("StammFahrzeugArchiver")

// StammPerson Relations
createdStammPersonen  StammPerson[] @relation("StammPersonCreator")
updatedStammPersonen  StammPerson[] @relation("StammPersonUpdater")
archivedStammPersonen StammPerson[] @relation("StammPersonArchiver")

// StammPersonQualifikation Relations (Junction Audit)
createdStammPersonQualifikationen StammPersonQualifikation[] @relation("StammPersonQualifikationCreator")
updatedStammPersonQualifikationen StammPersonQualifikation[] @relation("StammPersonQualifikationUpdater")
```

---

## Fahrzeugtyp-Model erweitern

**In `model Fahrzeugtyp { ... }` hinzufügen:**

```prisma
// Inverse Relation für StammFahrzeuge (Story 2.0)
stammFahrzeuge StammFahrzeug[]
```

---

## Qualifikation-Model erweitern

**In `model Qualifikation { ... }` hinzufügen (bei den M:N Relations):**

```prisma
// M:N: Welche Stamm-Personen haben diese Qualifikation (Story 2.0)
stammPersonQualifikationen StammPersonQualifikation[]
```

---

## Seed-Daten (Idempotent mit Upsert)

**In `packages/backend/prisma/seed.ts` erweitern:**

```typescript
// ========================================
// Stammdaten Seed Data (Story 2.0)
// Pattern: Upsert für Idempotenz
// ========================================

async function seedStammdaten(systemUserId: string) {
  // Erst Fahrzeugtypen laden (für FK)
  const rtw = await prisma.fahrzeugtyp.findUnique({ where: { code: 'RTW' } });
  const ktw = await prisma.fahrzeugtyp.findUnique({ where: { code: 'KTW' } });
  const nef = await prisma.fahrzeugtyp.findUnique({ where: { code: 'NEF' } });

  if (!rtw || !ktw || !nef) {
    logger.warn('Fahrzeugtypen nicht gefunden - überspringe Stammdaten-Seed');
    return;
  }

  // Standard-Fahrzeuge für Entwicklung
  const fahrzeuge = [
    { funkrufname: 'Rotkreuz 83/1', rufname: 'RTW 1', fahrzeugtypId: rtw.id, kennzeichen: 'DA-RK 101', baujahr: 2022 },
    { funkrufname: 'Rotkreuz 83/2', rufname: 'RTW 2', fahrzeugtypId: rtw.id, kennzeichen: 'DA-RK 102', baujahr: 2021 },
    { funkrufname: 'Rotkreuz 83/11', rufname: 'KTW 1', fahrzeugtypId: ktw.id, kennzeichen: 'DA-RK 111', baujahr: 2020 },
    { funkrufname: 'Rotkreuz 83/82', rufname: 'NEF 1', fahrzeugtypId: nef.id, kennzeichen: 'DA-RK 182', baujahr: 2023 },
  ];

  for (const f of fahrzeuge) {
    await prisma.stammFahrzeug.upsert({
      where: { funkrufname: f.funkrufname },
      create: { ...f, createdBy: systemUserId },
      update: {}, // Keine Updates bei existierenden Einträgen
    });
  }

  // Qualifikationen laden für M:N
  const notsan = await prisma.qualifikation.findUnique({ where: { abkuerzung: 'NotSan' } });
  const rs = await prisma.qualifikation.findUnique({ where: { abkuerzung: 'RS' } });
  const gf = await prisma.qualifikation.findUnique({ where: { abkuerzung: 'GF' } });

  if (!notsan || !rs || !gf) {
    logger.warn('Qualifikationen nicht gefunden - überspringe Personen-Seed');
    return;
  }

  // Standard-Personen für Entwicklung
  const personen = [
    { personalnummer: 'P-001', vorname: 'Max', nachname: 'Mustermann', qualifikationIds: [notsan.id, gf.id] },
    { personalnummer: 'P-002', vorname: 'Erika', nachname: 'Musterfrau', qualifikationIds: [notsan.id] },
    { personalnummer: 'P-003', vorname: 'Hans', nachname: 'Sanitäter', qualifikationIds: [rs.id] },
  ];

  for (const p of personen) {
    const { qualifikationIds, ...personData } = p;

    // Person upsert
    const person = await prisma.stammPerson.upsert({
      where: { personalnummer: p.personalnummer },
      create: { ...personData, createdBy: systemUserId },
      update: {},
    });

    // Qualifikationen zuweisen (nur wenn Person neu erstellt)
    // Bei Upsert prüfen wir ob Qualifikationen bereits existieren
    for (const qualifikationId of qualifikationIds) {
      await prisma.stammPersonQualifikation.upsert({
        where: {
          personId_qualifikationId: {
            personId: person.id,
            qualifikationId,
          },
        },
        create: {
          personId: person.id,
          qualifikationId,
          createdBy: systemUserId,
        },
        update: {},
      });
    }
  }

  logger.log('Stammdaten Seed completed');
}

// In main() aufrufen nach seedKraefteConfig():
// await seedStammdaten(systemUser!.id);
```

---

## Technische Anforderungen

### Commands (REIHENFOLGE KRITISCH!)

```bash
# 1. Schema validieren
pnpm --filter @bluelight-hub/backend prisma validate

# 2. Migration erstellen (MUSS vor generate-api erfolgen!)
pnpm --filter @bluelight-hub/backend prisma migrate dev --name add_kraefte_stammdaten

# 3. API-Client generieren
# WICHTIG: Schlägt fehl wenn Migration nicht erfolgreich war!
pnpm run generate-api

# 4. Seed ausführen (idempotent - kann mehrfach laufen)
# Läuft in ALLEN Umgebungen (nicht nur development) - Stammdaten sind essentiell
pnpm --filter @bluelight-hub/backend prisma db seed
```

**Reihenfolge-Warnung:** `generate-api` liest das Prisma-Schema. Wenn die Migration fehlschlägt, fehlen die neuen Models im generierten Client!

### DONT's - Typische LLM-Fehler vermeiden

1. **NIEMALS** `isDeleted` für Stammdaten verwenden - nutze `archivedAt/archivedBy`
2. **NIEMALS** `@relation` ohne `onDelete` verwenden
3. **NIEMALS** Audit-Trail-Felder vergessen
4. **NIEMALS** `@@map()` vergessen (Table-Namen lowercase mit Unterstrichen)
5. **NIEMALS** `@@unique` auf Junction Tables vergessen
6. **NIEMALS** `createdBy` ohne User.id FK setzen
7. **NIEMALS** Seed ohne Upsert-Pattern
8. **NIEMALS** `fahrzeugtypId` nach Erstellung änderbar machen

---

## Files to Create/Modify

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `packages/backend/prisma/schema.prisma` | MODIFY | 3 Models + User Relations + Fahrzeugtyp/Qualifikation Relations |
| `packages/backend/prisma/seed.ts` | MODIFY | `seedStammdaten()` Funktion hinzufügen |
| `packages/backend/prisma/migrations/[timestamp]_add_kraefte_stammdaten/` | CREATE | Migration (auto-generiert) |

---

## Architecture Compliance (AC3)

Diese Story ist **reine Infrastructure** (Prisma Schema). Keine Domain- oder Application-Layer-Änderungen erforderlich.

**Nächste Stories (2.1, 2.2) werden benötigen:**
- Domain Layer: `StammFahrzeug` Aggregate, `StammPerson` Aggregate
- Domain Layer: Repository Interfaces (`IStammFahrzeugRepository`, `IStammPersonRepository`)
- Infrastructure Layer: Prisma Repositories + Mappers
- Application Layer: Command/Query Handlers
- Modules Layer: Controllers mit Swagger-Decorators

---

## Project Context Reference

Alle kritischen Regeln und Patterns sind dokumentiert in:
- `/docs/project-context.md` - Projekt-weite Regeln
- `/docs/hexagonal-architecture.md` - Layer-Trennung
- `/docs/adr/ADR-024-repository-interface-pattern.md` - Repository Pattern
- `/docs/adr/ADR-025-hexagonal-architecture.md` - Hexagonal Architecture

---

## Previous Story Intelligence

**Aus Story 1-0 gelernt:**
1. Junction Tables (M:N) MÜSSEN eigene Audit-Trail-Felder haben
2. Seed-Funktion muss für alle Umgebungen laufen (nicht nur development)
3. Performance-Indexes für Filter+Sort Kombinationen hinzufügen
4. Prisma-Kommentare (`///`) für Business-Logic dokumentieren

**Aus Story 1-1 bis 1-4 gelernt (KRITISCH für 2.1/2.2!):**
1. DI Tokens in `KRAEFTE_REPOSITORIES` Namespace gruppieren
2. `Result<T>` Pattern für alle Repository-Methoden
3. Mapper mit `toPersistence()` und `toDomain()` Methoden
4. Upsert statt separatem Create/Update
5. **NULL → undefined in Mappern** (häufigster Bug!) - siehe "Vorbereitung für Story 2.1/2.2"
6. **biome-ignore für DI Imports** (AC1 Breaking Rule!) - siehe "Vorbereitung für Story 2.1/2.2"

---

## Story Completion Notes

**Generated by:** BMad Scrum Master (Bob)
**Analysis completed:** 2025-12-16
**Confidence:** HIGH - Alle Patterns aus Story 1-0 übernommen, Epic 1 Learnings integriert

---

## Dev Agent Record

### Context Reference

- Epic 2 aus `/docs/epics.md` (Stories 2.1, 2.2)
- Story 1-0 als Referenz für Prisma-Schema-Story Pattern
- Architecture Constraints aus `/docs/adr/` und `/docs/hexagonal-architecture.md`
- Existing Code Patterns aus `/packages/backend/src/infrastructure/kraefte/`

### Agent Model Used

Claude Opus 4.5 (via BMad Scrum Master Workflow)

### File List

| Datei | Aktion |
|-------|--------|
| `packages/backend/prisma/schema.prisma` | MODIFY - 3 neue Models + Relations |
| `packages/backend/prisma/seed.ts` | MODIFY - seedStammdaten() hinzufügen |
| `packages/backend/prisma/migrations/20251216155919_add_kraefte_stammdaten/migration.sql` | CREATE |

### Implementation Notes (2025-12-16)

**Implementiert durch:** Dev Agent (Claude Opus 4.5)

**Änderungen:**
1. **StammFahrzeug Model:** Alle Felder gemäß AC1, inkl. Archive-Pattern und Audit-Trail
2. **StammPerson Model:** Alle Felder gemäß AC2, M:N Relation zu Qualifikation
3. **StammPersonQualifikation Junction Table:** Mit eigenem Audit-Trail gemäß AC3
4. **User-Model:** 8 neue Relations hinzugefügt (3×Fahrzeug + 3×Person + 2×Junction)
5. **Fahrzeugtyp-Model:** Inverse Relation `stammFahrzeuge` hinzugefügt
6. **Qualifikation-Model:** Inverse Relation `stammPersonQualifikationen` hinzugefügt
7. **Seed.ts:** `seedStammdaten()` Funktion mit Upsert-Pattern, 4 Fahrzeuge + 3 Personen

**Validierungen:**
- ✅ `prisma validate` erfolgreich
- ✅ Migration `20251216155919_add_kraefte_stammdaten` angewendet
- ✅ `pnpm run generate-api` erfolgreich (API-Client aktualisiert)

---

## Vorbereitung für Story 2.1 und 2.2

### DI Tokens hinzufügen

**In `di-tokens.ts` hinzufügen:**

```typescript
export const KRAEFTE_REPOSITORIES = {
  // ... existing tokens ...
  STAMM_FAHRZEUG: Symbol('IStammFahrzeugRepository'),
  STAMM_PERSON: Symbol('IStammPersonRepository'),
} as const;
```

### KRITISCH: Epic 1 Learnings für Mapper (AC1 + häufigster Bug!)

**1. NULL → undefined Konvertierung (HÄUFIGSTER BUG aus Epic 1!):**

```typescript
// In ALLEN Mappern für optionale Felder:
// Prisma gibt NULL zurück, Domain erwartet undefined!

// toDomain():
archivedAt: (entity.archivedAt as Date | null) ?? undefined,
archivedBy: (entity.archivedBy as string | null) ?? undefined,
kennzeichen: (entity.kennzeichen as string | null) ?? undefined,

// toDto():
archivedAt: (entity.archivedAt as Date | null) ?? undefined,
```

**2. biome-ignore für DI Injectable Classes (AC1 - Breaking Rule!):**

```typescript
// FALSCH: Biome konvertiert zu "import type" → DI bricht zur Laufzeit!
import type { IStammFahrzeugRepository } from '...';

// RICHTIG: biome-ignore comment verwenden
// biome-ignore lint/style/useImportType: Required for NestJS DI at runtime
import { IStammFahrzeugRepository } from '...';
```

**3. sortOrder Defense-in-Depth (falls sortOrder verwendet wird):**

```typescript
// In Aggregate.reconstitute() IMMER validieren:
if (!Number.isFinite(props.sortOrder) || !Number.isInteger(props.sortOrder) || props.sortOrder < 0) {
  return Result.fail('Ungültiger sortOrder');
}
```

---

## Validation Checklist (für Code Review)

- [x] Alle Models haben `@@map()` mit snake_case Namen
- [x] Alle Relations haben explizites `onDelete`
- [x] Creator-Relations: `onDelete: Restrict`
- [x] Updater/Archiver-Relations: `onDelete: SetNull`
- [x] Junction Table hat eigene Audit-Trail-Felder
- [x] Junction Table hat `@@unique` Constraint
- [x] Fahrzeugtyp-Relation existiert auf StammFahrzeug
- [x] Qualifikation-Relation existiert auf StammPersonQualifikation
- [x] User-Model hat alle **8** neuen Relations (3×Fahrzeug + 3×Person + 2×Junction)
- [x] Fahrzeugtyp-Model hat inverse `stammFahrzeuge` Relation
- [x] Qualifikation-Model hat inverse `stammPersonQualifikationen` Relation
- [x] Composite Indexes für Filter+Sort vorhanden (`archivedAt`, `archivedAt+fahrzeugtypId`, `archivedAt+nachname`)
- [x] Seed-Funktion nutzt Upsert-Pattern
- [x] Prisma-Kommentare (`///`) dokumentieren Business-Context

---

## Senior Developer Review (AI)

**Reviewer:** Amelia (Developer Agent) + 5 Parallel Subagents
**Review Date:** 2025-12-16
**Review Method:** Adversarial Code Review mit Pattern Detection, Dependency Mapping, Test Coverage Analysis, Tech Debt Audit, Document Review

### Review Outcome: ✅ APPROVED

### Findings Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 CRITICAL | 0 | - |
| 🟡 MEDIUM | 2 | Documented |
| 🟢 LOW | 3 | Documented |

### AC Validation: 6/6 PASSED ✅

- AC1: StammFahrzeug Entity ✅
- AC2: StammPerson Entity ✅
- AC3: Junction Table mit @@unique ✅
- AC4: Relations mit korrektem onDelete ✅
- AC5: Migration erstellt und angewendet ✅
- AC6: Seed-Daten mit Upsert-Pattern ✅

### Pattern Compliance: 100% ✅

Alle Patterns aus Epic 1 korrekt übernommen:
- Audit-Trail Pattern ✅
- Archive Pattern (NICHT isDeleted) ✅
- @@map snake_case ✅
- Explicit onDelete ✅
- Junction Audit-Trail ✅
- Prisma-Kommentare ✅

### Medium Issues (Documented, Not Blocking)

1. **Git Hygiene:** Uncommitted Changes von Story 1-4 (FunkStatus) im Working Tree - nicht Story 2.0 bezogen
2. **Seed Error Handling:** logger.warn + return bei fehlenden Dependencies (partial success akzeptabel)

### Low Issues (Documented, Nice-to-Have)

1. Validation Report Line-Referenz veraltet
2. Optional: Index für vorname/nachname Kombination
3. JSDoc auf seedStammdaten() könnte @throws dokumentieren

### Recommendation

Story 2.0 ist vollständig implementiert und erfüllt alle Acceptance Criteria. Die Prisma-Schema-Änderungen folgen etablierten Patterns. Bereit für nächste Story (2.1 oder 2.2).

---

**Review completed by:** Claude Opus 4.5 (Amelia - Developer Agent)
