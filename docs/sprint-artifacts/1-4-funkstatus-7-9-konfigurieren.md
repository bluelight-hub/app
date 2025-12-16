# Story 1.4: Funkstatus 7-9 konfigurieren

Status: review

## Quick Start

**Empfohlene Reihenfolge:**
1. DI Token in `di-tokens.ts` hinzufügen
2. Domain Layer (Aggregate, Repository Interface, Error Codes)
3. Infrastructure Layer (Repository, Mapper)
4. Application Layer (Command, Queries, DTOs)
5. Controller Layer (Admin Controller)
6. Seed Script ausführen
7. `pnpm run generate-api`

**Kopiere von:** `admin-qualifikationen.controller.ts` → Entferne POST/DELETE (Config-Only!)

**Config-Only Pattern:** Diese Story hat KEINEN Create/Delete Endpoint. Funkstatus werden via Seed erstellt.

---

## Story

Als **Admin**,
möchte ich **die Beschreibung und Farbe für Funkstatus 7-9 pro Organisation anpassen**,
damit **das System den regionalen Leitstellenbereich-Standards entspricht**.

## Akzeptanzkriterien

### AC1: Status-Config auflisten
- **Given** ich bin als Admin authentifiziert
- **When** ich die Seite `/admin/kraefte/funkstatus` aufrufe
- **Then** sehe ich eine Tabelle mit Status 0-9 (Code, Standard-Label, Custom-Label, Farbe)
- **And** Status 0-6 sind schreibgeschützt (DIN-Standard), Status 7-9 sind editierbar

### AC2: Inline-Editing Label
- **Given** ich sehe die Status-Tabelle
- **When** ich auf die Custom-Label-Zelle von Status 7 klicke
- **Then** wird die Zelle zu einem Input-Feld
- **And** beim Blur/Enter wird gespeichert und Toast zeigt "Status aktualisiert"

### AC3: Farbe anpassen
- **Given** ich bearbeite einen Status
- **When** ich auf die Farb-Zelle klicke
- **Then** öffnet sich ein Color-Picker
- **And** Farbe wird als Hex-Code gespeichert (#FF0000)

### AC4: Ist-Alarmierbar Flag
- **Given** ich bearbeite Status 7-9
- **When** ich die Checkbox "Ist Alarmierbar" toggle
- **Then** wird das Flag gespeichert für spezielle Kennzeichnung

### AC5: Backend Persistierung
- **Given** Admin sendet PATCH `/api/admin/kraefte/funkstatus/:code`
- **When** Backend aktualisiert via Handler
- **Then** wird `FunkStatusConfig` mit Audit-Trail updated

### AC6: Custom vs Standard Label
- **Given** Frontend lädt Status-Config
- **When** GET-Request
- **Then** wird `customLabel` zurückgegeben wenn gesetzt, sonst `standardLabel`

### AC7: Code-Range Validierung
- **Given** Admin sendet PATCH mit Code außerhalb 0-9
- **When** Request verarbeitet wird
- **Then** antwortet Backend mit 400 Bad Request

## Tasks / Subtasks

### Task 0: DI Token (ZUERST!)
- [x] 0.1 `KRAEFTE_REPOSITORIES.FUNK_STATUS_CONFIG` in `di-tokens.ts` hinzufügen

### Task 1: Domain Layer (AC: 5, 7)
- [x] 1.1 Value Object: `FunkStatusConfigId` erstellen (CUID2)
- [x] 1.2 Aggregate: `FunkStatusConfig` mit `reconstitute()`, `update()` (KEIN create() - Config-Only!)
- [x] 1.3 Error Codes: `FUNKSTATUS_ERROR_CODES` in `error-codes.ts` ergänzen
- [x] 1.4 Validation Constants: `funkstatus-validation.constants.ts` erstellen
- [x] 1.5 Repository Interface: `IFunkStatusConfigRepository` erstellen (NUR `update()`, KEIN `save()`!)
- [x] 1.6 Domain Events: `FunkStatusConfigUpdatedEvent` erstellen
- [x] 1.7 Unit Tests: 26 Tests für Aggregate

### Task 2: Infrastructure Layer (AC: 5)
- [x] 2.1 Mapper: `PrismaFunkStatusConfigMapper` (toPersistence, toDomain)
- [x] 2.2 Repository: `PrismaFunkStatusConfigRepository` mit `update()` (KEIN `upsert()`!)
- [x] 2.3 Module Update: `KraefteInfrastructureModule` erweitern

### Task 3: Application Layer (AC: 5, 6, 7)
- [x] 3.1 DTOs: `UpdateFunkStatusConfigDto`, `FunkStatusConfigDto` (KEIN CreateDto!)
- [x] 3.2 Command: `UpdateFunkStatusConfigCommand` + `Handler` (TransactionalCommandHandler)
- [x] 3.3 Query: `GetAllFunkStatusConfigsHandler`
- [x] 3.4 Query: `GetFunkStatusConfigByCodeHandler` für Einzelabfrage
- [x] 3.5 Application Module: `FunkStatusApplicationModule`
- [x] 3.6 Unit Tests: 44 Tests für Handler (24 UpdateHandler + 7 GetAll + 13 GetByCode)

### Task 4: Controller/Presentation Layer (AC: 1-7)
- [x] 4.1 Controller: `AdminFunkStatusController` (NUR GET + PATCH, KEIN POST/DELETE!)
- [x] 4.2 Endpoints: GET `/`, GET `/:code`, PATCH `/:code`
- [x] 4.3 Error Mapping: Result → HTTP Status (400, 404)
- [x] 4.4 Module Update: `KraefteModule` Controller registrieren

### Task 5: Seed Data (AC: 1, 6)
- [x] 5.1 Seed Script in `prisma/seed.ts` erweitern
- [x] 5.2 Alle 10 Status (0-9) nach DIN 14610 einfügen

### Task 6: API Client Generation (AC: alle)
- [x] 6.1 `pnpm run generate-api` ausführen
- [x] 6.2 Verifizieren: `AdminKraefteFunkstatusApi` generiert

### Task 7: Frontend (AC: 1, 2, 3, 4, 6) - **OPTIONAL für diese Story**
- [ ] 7.1 Route: `/admin/kraefte/funkstatus` erstellen
- [ ] 7.2 Hooks: `useFunkStatusConfigs()`, `useUpdateFunkStatus()`
- [ ] 7.3 Table: Inline-Editing für Status 7-9
- [ ] 7.4 Color-Picker: Headless UI für Farb-Auswahl

---

## Dev Notes

### KRITISCH: biome-ignore für DI Imports

Biome wird `import type` vorschlagen - das bricht NestJS DI zur Laufzeit!

```typescript
// ✅ RICHTIG: biome-ignore für DI-Injectable Interfaces
// biome-ignore lint/style/useImportType: NestJS DI benötigt Runtime-Symbol
import { IFunkStatusConfigRepository } from '@domain/kraefte/repositories/i-funk-status-config.repository';

// ❌ FALSCH: import type bricht NestJS DI!
import type { IFunkStatusConfigRepository } from '...';
```

### KRITISCH: Config-Only Pattern

Diese Story unterscheidet sich fundamental von Story 1-1/1-2/1-3:

```typescript
// ❌ FALSCH für Config-Only (Story 1-4):
@Post() // Funkstatus werden via Seed erstellt!
async create() { ... }

@Delete(':code') // Funkstatus sind permanente System-Codes!
async delete() { ... }

async save(entity): Promise<void> {
  await prisma.upsert({ ... }); // Kann neue Records erstellen!
}

// ✅ RICHTIG für Config-Only (Story 1-4):
// NUR @Get() und @Patch() Endpoints
// Repository nutzt update() statt save()/upsert()

async update(entity): Promise<void> {
  await prisma.funkStatusConfig.update({
    where: { code: entity.code },
    data: { ... }, // Nur bestehende Records!
  });
}
```

| Aspekt | Story 1-1/1-2/1-3 | Story 1-4 Funkstatus |
|--------|-------------------|----------------------|
| **Create Endpoint** | POST | **KEINER** (Seed!) |
| **Delete Endpoint** | DELETE (Soft) | **KEINER** (permanent) |
| **Repository Method** | `save()` mit upsert | `update()` nur |
| **Editierbar** | Alle Felder | Nur Code 7-9 |

### KRITISCH: Route verwendet `:code` (Integer)

Die Route nutzt den **code** (0-9) als Parameter, nicht die UUID-ID:

```typescript
@Controller('admin/kraefte/funkstatus')
export class AdminFunkStatusController {
  @Get(':code')
  async findByCode(@Param('code', ParseIntPipe) code: number) { ... }

  @Patch(':code')
  async update(@Param('code', ParseIntPipe) code: number, @Body() dto: UpdateDto) { ... }
}
```

Repository braucht daher `findByCode(code: number)` statt `findById(id: string)`.

### Error Codes (zentralisiert)

```typescript
// domain/kraefte/common/error-codes.ts
export const FUNKSTATUS_ERROR_CODES = {
  NOT_FOUND: 'FUNKSTATUS_NOT_FOUND',
  CODE_READ_ONLY: 'FUNKSTATUS_CODE_READ_ONLY',         // Status 0-6
  CODE_OUT_OF_RANGE: 'FUNKSTATUS_CODE_OUT_OF_RANGE',   // < 0 oder > 9
  INVALID_COLOR_FORMAT: 'FUNKSTATUS_INVALID_COLOR',    // Nicht #RRGGBB
} as const;
```

### Validation Constants

```typescript
// domain/kraefte/constants/funkstatus-validation.constants.ts
export const FUNKSTATUS_VALIDATION = {
  CODE_MIN: 0,
  CODE_MAX: 9,
  EDITABLE_CODES: [7, 8, 9] as const,
  READ_ONLY_CODES: [0, 1, 2, 3, 4, 5, 6] as const,
  LABEL_MAX_LENGTH: 100,
  COLOR_HEX_PATTERN: /^#[0-9A-Fa-f]{6}$/,
} as const;
```

### Defense-in-Depth für numerische Felder

```typescript
// Im Aggregate reconstitute() oder update()
public static reconstitute(props: FunkStatusConfigProps, id: UniqueEntityID): Result<FunkStatusConfig> {
  // Defense-in-Depth: Validiere code
  if (!Number.isFinite(props.code) || !Number.isInteger(props.code)) {
    return Result.fail(FUNKSTATUS_ERROR_CODES.CODE_OUT_OF_RANGE);
  }
  if (props.code < FUNKSTATUS_VALIDATION.CODE_MIN || props.code > FUNKSTATUS_VALIDATION.CODE_MAX) {
    return Result.fail(FUNKSTATUS_ERROR_CODES.CODE_OUT_OF_RANGE);
  }

  // Farbe normalisieren
  const farbe = props.farbe?.toUpperCase();
  if (farbe && !FUNKSTATUS_VALIDATION.COLOR_HEX_PATTERN.test(farbe)) {
    return Result.fail(FUNKSTATUS_ERROR_CODES.INVALID_COLOR_FORMAT);
  }

  return Result.ok(new FunkStatusConfig({ ...props, farbe }, id));
}

public update(props: Partial<UpdateableProps>): Result<void> {
  // Nur Code 7-9 sind editierbar
  if (!FUNKSTATUS_VALIDATION.EDITABLE_CODES.includes(this.props.code)) {
    return Result.fail(FUNKSTATUS_ERROR_CODES.CODE_READ_ONLY);
  }

  // ... Update-Logik
  return Result.ok();
}
```

### Repository Interface Template

```typescript
// domain/kraefte/repositories/i-funk-status-config.repository.ts

// biome-ignore lint/style/useImportType: Domain Entity für Repository
import { FunkStatusConfig } from '../aggregates/funk-status-config.aggregate';

export interface IFunkStatusConfigRepository {
  /** Findet alle Funkstatus (sortiert nach code) */
  findAll(): Promise<FunkStatusConfig[]>;

  /** Findet Funkstatus nach Code (0-9) */
  findByCode(code: number): Promise<FunkStatusConfig | null>;

  /** Aktualisiert bestehenden Funkstatus (Config-Only, KEIN Insert!) */
  update(entity: FunkStatusConfig): Promise<void>;

  // KEIN save()! Config-Only Pattern
  // KEIN delete()! Permanente System-Codes
}
```

### Seed Script Template

```typescript
// prisma/seed.ts - FunkStatusConfig Seeding

const DIN_STANDARD_STATUS: Prisma.FunkStatusConfigCreateInput[] = [
  { code: 0, standardLabel: 'Betriebsbereit auf Funk', farbe: '#00AA00', istAlarmierbar: false, createdBy: 'SYSTEM_SEED' },
  { code: 1, standardLabel: 'Einsatzbereit über Funk', farbe: '#00AA00', istAlarmierbar: false, createdBy: 'SYSTEM_SEED' },
  { code: 2, standardLabel: 'Einsatzbereit auf Wache', farbe: '#00AA00', istAlarmierbar: false, createdBy: 'SYSTEM_SEED' },
  { code: 3, standardLabel: 'Einsatzübernahme', farbe: '#FFFF00', istAlarmierbar: false, createdBy: 'SYSTEM_SEED' },
  { code: 4, standardLabel: 'Ankunft Einsatzstelle', farbe: '#FF0000', istAlarmierbar: false, createdBy: 'SYSTEM_SEED' },
  { code: 5, standardLabel: 'Sprechwunsch', farbe: '#0000FF', istAlarmierbar: false, createdBy: 'SYSTEM_SEED' },
  { code: 6, standardLabel: 'Nicht einsatzbereit', farbe: '#808080', istAlarmierbar: false, createdBy: 'SYSTEM_SEED' },
  { code: 7, standardLabel: 'Patient aufgenommen', farbe: '#FFFF00', istAlarmierbar: true, createdBy: 'SYSTEM_SEED' },
  { code: 8, standardLabel: 'Ankunft Krankenhaus', farbe: '#FF0000', istAlarmierbar: false, createdBy: 'SYSTEM_SEED' },
  { code: 9, standardLabel: 'Handquittung', farbe: '#FF0000', istAlarmierbar: false, createdBy: 'SYSTEM_SEED' },
];

async function seedFunkStatusConfig() {
  console.log('Seeding FunkStatusConfig...');

  for (const status of DIN_STANDARD_STATUS) {
    await prisma.funkStatusConfig.upsert({
      where: { code: status.code },
      create: status,
      update: {}, // Bestehende Custom-Daten NICHT überschreiben!
    });
  }

  console.log('✅ FunkStatusConfig seeded (10 Status nach DIN 14610)');
}

// In main seed function aufrufen:
// await seedFunkStatusConfig();
```

### Controller Template (Config-Only)

```typescript
// modules/kraefte/controllers/admin-funk-status.controller.ts

@ApiTags('admin/kraefte/funkstatus')
@Controller('admin/kraefte/funkstatus')
export class AdminFunkStatusController {
  constructor(
    private readonly getAllHandler: GetAllFunkStatusConfigsHandler,
    private readonly getByCodeHandler: GetFunkStatusConfigByCodeHandler,
    private readonly updateHandler: UpdateFunkStatusConfigHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Alle Funkstatus-Konfigurationen abrufen' })
  @ApiOkResponse({ type: [FunkStatusConfigDto] })
  async findAll(): Promise<FunkStatusConfigDto[]> { ... }

  @Get(':code')
  @ApiOperation({ summary: 'Funkstatus nach Code abrufen' })
  @ApiParam({ name: 'code', type: Number, description: 'Status-Code (0-9)' })
  @ApiOkResponse({ type: FunkStatusConfigDto })
  @ApiNotFoundResponse({ description: 'Funkstatus nicht gefunden' })
  async findByCode(@Param('code', ParseIntPipe) code: number): Promise<FunkStatusConfigDto> { ... }

  @Patch(':code')
  @ApiOperation({ summary: 'Funkstatus konfigurieren (nur Code 7-9)' })
  @ApiParam({ name: 'code', type: Number, description: 'Status-Code (7-9)' })
  @ApiOkResponse({ type: FunkStatusConfigDto })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder Code 0-6 (read-only)' })
  @ApiNotFoundResponse({ description: 'Funkstatus nicht gefunden' })
  async update(
    @Param('code', ParseIntPipe) code: number,
    @Body() dto: UpdateFunkStatusConfigDto,
  ): Promise<FunkStatusConfigDto> { ... }

  // ❌ KEIN @Post() - Funkstatus werden via Seed erstellt
  // ❌ KEIN @Delete() - Funkstatus sind permanente System-Codes
}
```

### DI Token

```typescript
// infrastructure/di-tokens.ts
export const KRAEFTE_REPOSITORIES = {
  QUALIFIKATION: Symbol('IQualifikationRepository'),
  FAHRZEUGTYP: Symbol('IFahrzeugtypRepository'),
  ROLLEN_DEFINITION: Symbol('IRollenDefinitionRepository'),
  FUNK_STATUS_CONFIG: Symbol('IFunkStatusConfigRepository'), // NEU
} as const;
```

### Mapper Template

```typescript
// infrastructure/kraefte/mappers/prisma-funk-status-config.mapper.ts

export class PrismaFunkStatusConfigMapper {
  static toDomain(raw: PrismaFunkStatusConfig): FunkStatusConfig {
    const result = FunkStatusConfig.reconstitute(
      {
        code: raw.code,
        standardLabel: raw.standardLabel,
        customLabel: raw.customLabel ?? undefined, // NULL → undefined!
        farbe: raw.farbe ?? undefined,
        istAlarmierbar: raw.istAlarmierbar,
        beschreibung: raw.beschreibung ?? undefined,
      },
      new UniqueEntityID(raw.id),
    );

    if (result.isFailure) {
      throw new Error(`FunkStatusConfig Mapping failed: ${result.error}`);
    }

    return result.value;
  }

  static toPersistence(entity: FunkStatusConfig): Prisma.FunkStatusConfigUpdateInput {
    return {
      customLabel: entity.customLabel,
      farbe: entity.farbe?.toUpperCase(), // Normalisierung!
      istAlarmierbar: entity.istAlarmierbar,
      beschreibung: entity.beschreibung,
      // code und standardLabel werden NICHT aktualisiert (System-Werte)
    };
  }
}
```

### Learnings aus vorherigen Stories (1-1, 1-2, 1-3)

1. **NULL-to-undefined in Mapper:** `customLabel: entity.customLabel ?? undefined`
2. **Code-Normalisierung:** Farbe zu Uppercase normalisieren (#ff0000 → #FF0000)
3. **Defense-in-Depth:** Validierung auf allen Layern (Domain, DTO, Controller)
4. **Error Code Mapping:** P2025 → 404 Not Found (kein P2002 da kein Create)
5. **biome-ignore:** Für alle DI-Injectable Imports verwenden
6. **sortOrder/ordnung Validierung:** `Number.isFinite()` + `Number.isInteger()` prüfen

### Prisma Schema (Referenz)

Das Prisma Schema ist bereits in Story 1.0 definiert: `prisma/schema.prisma`
Modell: `FunkStatusConfig` mit `code`, `standardLabel`, `customLabel`, `farbe`, `istAlarmierbar`

### Project Structure

**Neue Dateien:**
```
packages/backend/src/
├── domain/kraefte/
│   ├── aggregates/funk-status-config.aggregate.ts
│   ├── repositories/i-funk-status-config.repository.ts
│   ├── events/funk-status-config-updated.event.ts
│   └── constants/funkstatus-validation.constants.ts
├── application/kraefte/funkstatus/
│   ├── commands/update-funk-status-config/
│   │   ├── update-funk-status-config.command.ts
│   │   └── update-funk-status-config.handler.ts
│   ├── queries/
│   │   ├── get-all-funk-status-configs.handler.ts
│   │   └── get-funk-status-config-by-code.handler.ts
│   └── dto/
│       ├── funk-status-config.dto.ts
│       └── update-funk-status-config.dto.ts
├── infrastructure/kraefte/
│   ├── repositories/prisma-funk-status-config.repository.ts
│   └── mappers/prisma-funk-status-config.mapper.ts
└── modules/kraefte/controllers/
    └── admin-funk-status.controller.ts
```

**Zu modifizierende Dateien:**
- `infrastructure/di-tokens.ts` → Token hinzufügen
- `modules/kraefte/kraefte.module.ts` → Controller + Handlers registrieren
- `prisma/seed.ts` → Seed-Daten hinzufügen
- `domain/kraefte/common/error-codes.ts` → FUNKSTATUS_ERROR_CODES

---

## Dev Agent Record

### Context Reference

Validation Report: `docs/sprint-artifacts/validation-report-1-4-2025-12-16.md`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101) via Claude Code

### Debug Log References

### Completion Notes List

- Prisma Schema für FunkStatusConfig bereits vorhanden (Story 1-0)
- **Config-Only Pattern:** Kein CREATE/DELETE Endpoint
- Status 0-6 sind READ-ONLY nach DIN 14610
- Nur customLabel, farbe, istAlarmierbar für Status 7-9 editierbar
- Frontend ist optional für diese Story (Backend-fokussiert)
- Route nutzt `:code` (Integer 0-9), nicht `:id` (UUID)
- biome-ignore für alle DI-Injectable Imports erforderlich

### File List

**Neue Dateien erstellt:**
- `packages/backend/src/domain/kraefte/value-objects/funk-status-config-id.ts`
- `packages/backend/src/domain/kraefte/aggregates/funk-status-config.aggregate.ts`
- `packages/backend/src/domain/kraefte/aggregates/__tests__/funk-status-config.aggregate.spec.ts`
- `packages/backend/src/domain/kraefte/constants/funkstatus-validation.constants.ts`
- `packages/backend/src/domain/kraefte/events/funk-status-config-updated.event.ts`
- `packages/backend/src/domain/kraefte/repositories/i-funk-status-config.repository.ts`
- `packages/backend/src/infrastructure/kraefte/mappers/prisma-funk-status-config.mapper.ts`
- `packages/backend/src/infrastructure/kraefte/repositories/prisma-funk-status-config.repository.ts`
- `packages/backend/src/application/kraefte/funkstatus/dto/funk-status-config.dto.ts`
- `packages/backend/src/application/kraefte/funkstatus/dto/update-funk-status-config.dto.ts`
- `packages/backend/src/application/kraefte/funkstatus/commands/update-funk-status-config/update-funk-status-config.command.ts`
- `packages/backend/src/application/kraefte/funkstatus/commands/update-funk-status-config/update-funk-status-config.handler.ts`
- `packages/backend/src/application/kraefte/funkstatus/commands/update-funk-status-config/__tests__/update-funk-status-config.handler.spec.ts`
- `packages/backend/src/application/kraefte/funkstatus/queries/get-all-funk-status-configs.handler.ts`
- `packages/backend/src/application/kraefte/funkstatus/queries/__tests__/get-all-funk-status-configs.handler.spec.ts`
- `packages/backend/src/application/kraefte/funkstatus/queries/get-funk-status-config-by-code.handler.ts`
- `packages/backend/src/application/kraefte/funkstatus/queries/__tests__/get-funk-status-config-by-code.handler.spec.ts`
- `packages/backend/src/application/kraefte/funkstatus/funkstatus-application.module.ts`
- `packages/backend/src/modules/kraefte/controllers/admin-funk-status.controller.ts`

**Modifizierte Dateien:**
- `packages/backend/src/infrastructure/di-tokens.ts` (FUNK_STATUS_CONFIG Token hinzugefügt)
- `packages/backend/src/domain/kraefte/common/error-codes.ts` (FUNKSTATUS_ERROR_CODES hinzugefügt)
- `packages/backend/src/domain/kraefte/index.ts` (Exports hinzugefügt)
- `packages/backend/src/infrastructure/kraefte/kraefte-infrastructure.module.ts` (Repository Provider hinzugefügt)
- `packages/backend/src/modules/kraefte/kraefte.module.ts` (Controller + Module registriert)
- `packages/backend/prisma/seed.ts` (FunkStatusConfig Seed-Daten hinzugefügt)

**Generierte Dateien (API Client):**
- `packages/shared/client/apis/AdminKraefteFunkstatusApi.ts`
- `packages/shared/client/models/FunkStatusConfigDto.ts`
- `packages/shared/client/models/UpdateFunkStatusConfigDto.ts`
