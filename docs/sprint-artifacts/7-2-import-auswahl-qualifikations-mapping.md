# Story 7.2: Import-Auswahl & Qualifikations-Mapping

Status: ready-for-dev

## Story

Als **Admin (Maria)**,
möchte ich **vor dem Import auswählen, welche Personen importiert werden und Qualifikationen mappen**,
damit **ich nur relevante Personen übernehme und Qualifikationen korrekt zugeordnet werden**.

## Hintergrund

Diese Story baut auf Story 7.1 auf, die bereits OAuth2-Verbindung, Token-Management und Personen-Vorschau implementiert hat. Story 7.2 erweitert dies um:
1. Selektiven Import (Checkbox-Auswahl statt Alle-oder-Nichts)
2. Qualifikations-Mapping (HiOrg-Namen → Bluelight-Qualifikationen)
3. Import-Log mit Fehlerbehandlung

**Epic 7:** HiOrg-Server Integration
**Depends on:** Story 7.1 (Verbindung & Synchronisation)
**FRs covered:** FR39 (Import-Auswahl), FR40 (Qualifikations-Mapping)

---

## Code Reuse aus Story 7.1

### Direkte Wiederverwendung (NICHT neu implementieren!)

| Komponente | Pfad | Verwendung |
|------------|------|------------|
| `HiOrgServerAdapter` | `infrastructure/integrations/hiorg-server.adapter.ts` | API-Kommunikation |
| `IHiOrgServerPort` | `domain/ports/i-hiorg-server.port.ts` | Port Interface |
| `HiOrgTokenService` | `infrastructure/integrations/hiorg-token.service.ts` | Token-Management |
| `PreviewHiOrgPersonsQuery` | `application/integrations/queries/preview-hiorg-persons/` | Person-Preview |
| `HiOrgPersonPreviewItemDto` | `modules/integrations/dto/` | DTO erweitern (isDuplicate) |
| `AdminHiOrgIntegrationController` | `modules/integrations/controllers/` | Endpoints hinzufügen |

### Patterns aus Story 7.1 übernehmen

- **DI Token Struktur:** `DI_TOKENS.INTEGRATIONS.*`
- **Result Pattern:** `Result<T>` für Handler-Rückgaben
- **Error Handling:** Domain Exceptions für unerwartete Fehler
- **API Client:** `apiService.*` (NICHT `api.*`)

---

## Acceptance Criteria

### AC1: Selektiver Import mit Checkbox-Liste

- [ ] **Given** ich sehe die Import-Vorschau mit 42 Personen
- [ ] **When** ich Personen selektiere (Checkbox-Liste mit "Alle auswählen/abwählen")
- [ ] **Then** kann ich nur die ausgewählten Personen importieren
- [ ] **And** der Button zeigt "23 Personen importieren" (dynamische Anzahl)
- [ ] **And** bei Duplikaten (existiert bereits) sehe ich "Wird aktualisiert" Badge

### AC2: Qualifikations-Mapping konfigurieren

- [ ] **Given** HiOrg-Server nutzt andere Qualifikations-Namen ("Gruppenführer" statt "GrFü")
- [ ] **When** ich auf "Mapping konfigurieren" klicke
- [ ] **Then** sehe ich eine Mapping-Tabelle mit allen HiOrg-Qualifikationen
- [ ] **And** jede Zeile hat Dropdown zur Zuordnung einer Bluelight-Qualifikation
- [ ] **And** es gibt einen "Auto-Match" Button (Fuzzy-Matching)
- [ ] **And** kann Custom-Mappings speichern

### AC3: Import-Log mit Fehlerbehandlung

- [ ] **Given** der Import läuft
- [ ] **When** 3 Personen fehlschlagen (z.B. ungültige Daten)
- [ ] **Then** sehe ich ein Log "39/42 erfolgreich, 3 Fehler"
- [ ] **And** Details pro fehlgeschlagener Person (Name + Fehlergrund)
- [ ] **And** die erfolgreichen Imports sind nicht betroffen (Partial Success)

### AC4: Automatischer Qualifikations-Import

- [ ] **Given** Person "Anna Schmidt" hat in HiOrg-Server Qualifikationen ["GrFü", "SanA"]
- [ ] **When** der Import abgeschlossen ist
- [ ] **Then** hat Anna in Bluelight Hub die gleichen Qualifikationen (nach Mapping)
- [ ] **And** die StammPerson hat `externalSource="HIORG_SERVER"` und `externalId=username`
- [ ] **And** `lastSyncAt` ist gesetzt

---

## Tasks / Subtasks

### Task 0: Prisma Schema erweitern (QualifikationMapping)

- [ ] **0.1** Model `QualifikationMapping` hinzufügen:
  ```prisma
  model QualifikationMapping {
    id              String   @id @default(cuid())
    externalName    String   @db.VarChar(200)  // "Gruppenführer" (HiOrg)
    externalSource  String   @db.VarChar(50)   // "HIORG_SERVER"
    qualifikationId String?                     // FK zu Qualifikation (nullable)
    isAutoMatched   Boolean  @default(false)
    confidence      Int?                        // 0-100 für Auto-Match
    createdAt       DateTime @default(now())
    createdBy       String?
    updatedAt       DateTime @updatedAt
    updatedBy       String?

    qualifikation   Qualifikation? @relation(fields: [qualifikationId], references: [id])

    @@unique([externalName, externalSource])
    @@index([externalSource, qualifikationId])
  }
  ```
- [ ] **0.2** Rück-Relation in Qualifikation Model hinzufügen:
  ```prisma
  model Qualifikation {
    // ... existierend ...
    mappings QualifikationMapping[]
  }
  ```
- [ ] **0.3** Migration erstellen: `pnpm --filter @bluelight-hub/backend prisma:migrate`

### Task 1: Domain Layer - Entities & Value Objects

- [ ] **1.1** Value Object: `src/domain/integrations/value-objects/import-source.vo.ts`
  ```typescript
  export const IMPORT_SOURCES = {
    HIORG_SERVER: 'HIORG_SERVER',
  } as const;
  export type ImportSource = (typeof IMPORT_SOURCES)[keyof typeof IMPORT_SOURCES];
  ```

- [ ] **1.2** Value Object: `src/domain/integrations/value-objects/qualifikation-mapping-id.vo.ts`
  ```typescript
  export class QualifikationMappingId extends ValueObject<string> {
    public static create(value: string): Result<QualifikationMappingId> {
      if (!value || value.trim() === '') {
        return Result.fail('QualifikationMappingId darf nicht leer sein');
      }
      return Result.ok(new QualifikationMappingId(value));
    }

    public static generate(): QualifikationMappingId {
      return new QualifikationMappingId(crypto.randomUUID());
    }
  }
  ```

- [ ] **1.3** Value Object: `src/domain/integrations/value-objects/match-result.vo.ts`
  ```typescript
  export type MatchType = 'EXACT' | 'ABBREVIATION' | 'FUZZY' | 'NONE';

  export interface MatchResultProps {
    qualifikationId: QualifikationId | null;
    qualifikationName: string | null;
    confidence: number;  // 0-100
    type: MatchType;
  }

  export class MatchResult extends ValueObject<MatchResultProps> {
    get isMatched(): boolean {
      return this.props.type !== 'NONE' && this.props.qualifikationId !== null;
    }

    static noMatch(): MatchResult {
      return new MatchResult({ qualifikationId: null, qualifikationName: null, confidence: 0, type: 'NONE' });
    }

    static exact(qualifikationId: QualifikationId, name: string): MatchResult {
      return new MatchResult({ qualifikationId, qualifikationName: name, confidence: 100, type: 'EXACT' });
    }

    static abbreviation(qualifikationId: QualifikationId, name: string): MatchResult {
      return new MatchResult({ qualifikationId, qualifikationName: name, confidence: 95, type: 'ABBREVIATION' });
    }

    static fuzzy(qualifikationId: QualifikationId, name: string, similarity: number): MatchResult {
      return new MatchResult({
        qualifikationId,
        qualifikationName: name,
        confidence: Math.round(similarity * 100),
        type: 'FUZZY'
      });
    }
  }
  ```

- [ ] **1.4** Domain Entity: `src/domain/integrations/entities/qualifikation-mapping.entity.ts`
  ```typescript
  interface QualifikationMappingProps {
    externalName: string;
    externalSource: ImportSource;
    qualifikationId: QualifikationId | null;
    isAutoMatched: boolean;
    confidence: number | null;
    createdAt: Date;
    createdBy: string | null;
  }

  export class QualifikationMapping extends Entity<QualifikationMappingId, QualifikationMappingProps> {
    static create(props: Omit<QualifikationMappingProps, 'createdAt'>): Result<QualifikationMapping> {
      if (!props.externalName || props.externalName.trim() === '') {
        return Result.fail('externalName darf nicht leer sein');
      }
      return Result.ok(new QualifikationMapping(
        QualifikationMappingId.generate(),
        { ...props, createdAt: new Date() }
      ));
    }

    static reconstitute(id: QualifikationMappingId, props: QualifikationMappingProps): QualifikationMapping {
      return new QualifikationMapping(id, props);
    }

    updateMapping(qualifikationId: QualifikationId, confidence: number): void {
      this._props.qualifikationId = qualifikationId;
      this._props.confidence = confidence;
      this._props.isAutoMatched = false;
    }

    get externalName(): string { return this._props.externalName; }
    get externalSource(): ImportSource { return this._props.externalSource; }
    get qualifikationId(): QualifikationId | null { return this._props.qualifikationId; }
    get isAutoMatched(): boolean { return this._props.isAutoMatched; }
    get confidence(): number | null { return this._props.confidence; }
  }
  ```

- [ ] **1.5** Domain Service: `src/domain/integrations/services/qualifikation-matcher.service.ts`
  ```typescript
  @Injectable()
  export class QualifikationMatcherService {
    match(externalName: string, candidates: Qualifikation[]): MatchResult {
      // 1. Exakter Name-Match
      const exact = candidates.find(c =>
        c.name.toLowerCase() === externalName.toLowerCase()
      );
      if (exact) return MatchResult.exact(exact.id, exact.name);

      // 2. Abkürzung-Match
      const abbrev = candidates.find(c =>
        c.abkuerzung?.toLowerCase() === externalName.toLowerCase()
      );
      if (abbrev) return MatchResult.abbreviation(abbrev.id, abbrev.name);

      // 3. Fuzzy-Match (Levenshtein)
      const fuzzy = this.findBestFuzzyMatch(externalName, candidates);
      if (fuzzy.similarity > 0.8) {
        return MatchResult.fuzzy(fuzzy.candidate.id, fuzzy.candidate.name, fuzzy.similarity);
      }

      return MatchResult.noMatch();
    }

    private findBestFuzzyMatch(name: string, candidates: Qualifikation[]): { candidate: Qualifikation; similarity: number } {
      // Levenshtein-Distanz berechnen
    }
  }
  ```

- [ ] **1.6** Repository Interface: `src/domain/integrations/repositories/i-qualifikation-mapping.repository.ts`
  ```typescript
  export interface IQualifikationMappingRepository {
    findById(id: QualifikationMappingId, tx?: TransactionClient): Promise<QualifikationMapping | null>;
    findAll(tx?: TransactionClient): Promise<QualifikationMapping[]>;
    findByExternalName(externalName: string, source: ImportSource, tx?: TransactionClient): Promise<QualifikationMapping | null>;
    findAllBySource(source: ImportSource, tx?: TransactionClient): Promise<QualifikationMapping[]>;
    save(mapping: QualifikationMapping, tx?: TransactionClient): Promise<void>;
    saveMany(mappings: QualifikationMapping[], tx?: TransactionClient): Promise<void>;
    delete(id: QualifikationMappingId, tx?: TransactionClient): Promise<void>;
  }
  ```

- [ ] **1.7** Import Error Codes: `src/domain/integrations/common/import-error-codes.ts`
  ```typescript
  export const IMPORT_ERROR_CODES = {
    PERSON_NOT_FOUND: 'IMPORT_001',
    VALIDATION_FAILED: 'IMPORT_002',
    MAPPING_INCOMPLETE: 'IMPORT_003',
    REPOSITORY_ERROR: 'IMPORT_004',
    DUPLICATE_PERSONALNUMMER: 'IMPORT_005',
  } as const;

  export class HiOrgImportError extends DomainException {
    constructor(
      public readonly code: string,
      public readonly username: string,
      message: string
    ) {
      super(`[${code}] ${username}: ${message}`);
    }
  }
  ```

### Task 2: Application Layer - Import Commands

- [ ] **2.1** Command: `src/application/integrations/commands/import-selected-persons/import-selected-persons.command.ts`
  ```typescript
  interface ImportSelectedPersonsProps {
    selectedUsernames: string[];
    activeOnly?: boolean;
    createdBy: string;
  }

  export class ImportSelectedPersonsCommand {
    private constructor(public readonly props: ImportSelectedPersonsProps) {}

    static create(props: ImportSelectedPersonsProps): ImportSelectedPersonsCommand {
      return new ImportSelectedPersonsCommand(props);
    }

    get selectedUsernames(): string[] { return this.props.selectedUsernames; }
    get createdBy(): string { return this.props.createdBy; }
  }
  ```

- [ ] **2.2** Handler mit TransactionalCommandHandler: `import-selected-persons.handler.ts`
  ```typescript
  @Injectable()
  export class ImportSelectedPersonsHandler extends TransactionalCommandHandler<
    ImportSelectedPersonsCommand,
    ImportResultDto
  > {
    constructor(
      @Inject(DI_TOKENS.INTEGRATIONS.HIORG_SERVER_PORT)
      private readonly hiorgPort: IHiOrgServerPort,
      @Inject(DI_TOKENS.REPOSITORIES.STAMM_PERSON)
      private readonly stammPersonRepository: IStammPersonRepository,
      @Inject(DI_TOKENS.INTEGRATIONS.QUALIFIKATION_MAPPING_REPOSITORY)
      private readonly mappingRepository: IQualifikationMappingRepository,
      prismaService: PrismaService,
      outboxRepository: IOutboxRepository,
    ) {
      super(prismaService, outboxRepository);
    }

    protected async executeInTransaction(
      command: ImportSelectedPersonsCommand,
      tx: TransactionClient
    ): Promise<{ result: ImportResultDto; events: DomainEvent[] }> {
      const results: ImportItemResult[] = [];
      const events: DomainEvent[] = [];

      for (const username of command.selectedUsernames) {
        try {
          const result = await this.importSinglePerson(username, command.createdBy, tx);
          results.push(result);
          if (result.events) events.push(...result.events);
        } catch (error) {
          results.push({
            username,
            success: false,
            errorCode: IMPORT_ERROR_CODES.REPOSITORY_ERROR,
            errorMessage: error.message,
          });
        }
      }

      return {
        result: this.buildResultDto(results),
        events,
      };
    }

    private async importSinglePerson(
      username: string,
      createdBy: string,
      tx: TransactionClient
    ): Promise<ImportItemResult> {
      // 1. Person aus HiOrg laden
      // 2. findByExternalId() → Upsert-Logik
      // 3. Qualifikationen mappen
      // 4. StammPerson.markAsSynced() aufrufen
      // 5. Repository.save(tx)
    }
  }
  ```

- [ ] **2.3** Query + Handler: `GetQualifikationMappingsQuery`
  ```typescript
  @Injectable()
  export class GetQualifikationMappingsHandler {
    constructor(
      @Inject(DI_TOKENS.INTEGRATIONS.QUALIFIKATION_MAPPING_REPOSITORY)
      private readonly repository: IQualifikationMappingRepository,
    ) {}

    async execute(query: GetQualifikationMappingsQuery): Promise<Result<QualifikationMappingItemDto[]>> {
      const mappings = await this.repository.findAllBySource(query.source);
      return Result.ok(mappings.map(m => QualifikationMappingItemDto.fromEntity(m)));
    }
  }
  ```

- [ ] **2.4** Command + Handler: `SaveQualifikationMappingCommand`
  ```typescript
  @Injectable()
  export class SaveQualifikationMappingHandler {
    constructor(
      @Inject(DI_TOKENS.INTEGRATIONS.QUALIFIKATION_MAPPING_REPOSITORY)
      private readonly repository: IQualifikationMappingRepository,
    ) {}

    async execute(command: SaveQualifikationMappingCommand): Promise<Result<QualifikationMappingItemDto>> {
      const existing = await this.repository.findByExternalName(
        command.externalName,
        command.externalSource
      );

      if (existing) {
        existing.updateMapping(
          QualifikationId.create(command.qualifikationId).value!,
          100
        );
        await this.repository.save(existing);
        return Result.ok(QualifikationMappingItemDto.fromEntity(existing));
      }

      const mappingResult = QualifikationMapping.create({
        externalName: command.externalName,
        externalSource: command.externalSource,
        qualifikationId: QualifikationId.create(command.qualifikationId).value!,
        isAutoMatched: false,
        confidence: 100,
        createdBy: command.createdBy,
      });

      if (mappingResult.isFailure) {
        return Result.fail(mappingResult.error);
      }

      await this.repository.save(mappingResult.value);
      return Result.ok(QualifikationMappingItemDto.fromEntity(mappingResult.value));
    }
  }
  ```

- [ ] **2.5** Command + Handler: `AutoMatchQualifikationenCommand`

### Task 3: Infrastructure Layer - Repository & Mapper

- [ ] **3.1** DI Tokens erweitern in `src/infrastructure/di-tokens.ts`:
  ```typescript
  export const DI_TOKENS = {
    // ... existierende REPOSITORIES, PORTS, SERVICES ...

    INTEGRATIONS: {
      ENCRYPTION_PORT: Symbol('IEncryptionPort'),
      HIORG_SERVER_PORT: Symbol('IHiOrgServerPort'),
      CREDENTIAL_REPOSITORY: Symbol('IIntegrationCredentialRepository'),
      // NEU für Story 7.2:
      QUALIFIKATION_MAPPING_REPOSITORY: Symbol('IQualifikationMappingRepository'),
      QUALIFIKATION_MATCHER_SERVICE: Symbol('QualifikationMatcherService'),
    },
  } as const;
  ```

- [ ] **3.2** Mapper: `src/infrastructure/integrations/mappers/prisma-qualifikation-mapping.mapper.ts`
  ```typescript
  export class PrismaQualifikationMappingMapper {
    static toDomain(data: PrismaQualifikationMapping): QualifikationMapping {
      return QualifikationMapping.reconstitute(
        QualifikationMappingId.create(data.id).value!,
        {
          externalName: data.externalName,
          externalSource: data.externalSource as ImportSource,
          qualifikationId: data.qualifikationId
            ? QualifikationId.create(data.qualifikationId).value!
            : null,
          isAutoMatched: data.isAutoMatched,
          confidence: data.confidence,
          createdAt: data.createdAt,
          createdBy: data.createdBy,
        }
      );
    }

    static toPersistence(entity: QualifikationMapping): Prisma.QualifikationMappingCreateInput {
      return {
        id: entity.id.value,
        externalName: entity.externalName,
        externalSource: entity.externalSource,
        qualifikationId: entity.qualifikationId?.value ?? null,
        isAutoMatched: entity.isAutoMatched,
        confidence: entity.confidence,
        createdBy: entity.createdBy,
      };
    }
  }
  ```

- [ ] **3.3** Repository: `src/infrastructure/integrations/repositories/prisma-qualifikation-mapping.repository.ts`
  ```typescript
  @Injectable()
  export class PrismaQualifikationMappingRepository implements IQualifikationMappingRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: QualifikationMappingId, tx?: TransactionClient): Promise<QualifikationMapping | null> {
      const client = tx ?? this.prisma;
      const data = await client.qualifikationMapping.findUnique({ where: { id: id.value } });
      return data ? PrismaQualifikationMappingMapper.toDomain(data) : null;
    }

    async findAll(tx?: TransactionClient): Promise<QualifikationMapping[]> {
      const client = tx ?? this.prisma;
      const data = await client.qualifikationMapping.findMany();
      return data.map(d => PrismaQualifikationMappingMapper.toDomain(d));
    }

    async findByExternalName(
      externalName: string,
      source: ImportSource,
      tx?: TransactionClient
    ): Promise<QualifikationMapping | null> {
      const client = tx ?? this.prisma;
      const data = await client.qualifikationMapping.findUnique({
        where: { externalName_externalSource: { externalName, externalSource: source } }
      });
      return data ? PrismaQualifikationMappingMapper.toDomain(data) : null;
    }

    async findAllBySource(source: ImportSource, tx?: TransactionClient): Promise<QualifikationMapping[]> {
      const client = tx ?? this.prisma;
      const data = await client.qualifikationMapping.findMany({
        where: { externalSource: source }
      });
      return data.map(d => PrismaQualifikationMappingMapper.toDomain(d));
    }

    async save(mapping: QualifikationMapping, tx?: TransactionClient): Promise<void> {
      const client = tx ?? this.prisma;
      const data = PrismaQualifikationMappingMapper.toPersistence(mapping);
      await client.qualifikationMapping.upsert({
        where: { id: mapping.id.value },
        create: data,
        update: data,
      });
    }

    async saveMany(mappings: QualifikationMapping[], tx?: TransactionClient): Promise<void> {
      const client = tx ?? this.prisma;
      await client.$transaction(
        mappings.map(m => {
          const data = PrismaQualifikationMappingMapper.toPersistence(m);
          return client.qualifikationMapping.upsert({
            where: { id: m.id.value },
            create: data,
            update: data,
          });
        })
      );
    }

    async delete(id: QualifikationMappingId, tx?: TransactionClient): Promise<void> {
      const client = tx ?? this.prisma;
      await client.qualifikationMapping.delete({ where: { id: id.value } });
    }
  }
  ```

- [ ] **3.4** Module Provider in `IntegrationsModule` hinzufügen

### Task 4: Controller - Import Endpoints

- [ ] **4.1** Endpoints in `AdminHiOrgIntegrationController` hinzufügen:
  ```typescript
  @Post('import')
  @ApiOperation({ summary: 'Ausgewählte Personen importieren' })
  @ApiWrappedCreatedResponse(ImportResultDto, { description: 'Import-Ergebnis' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async importPersons(@Body() dto: ImportPersonsRequestDto): Promise<ImportResultDto> {
    const command = ImportSelectedPersonsCommand.create({
      selectedUsernames: dto.selectedUsernames,
      activeOnly: dto.activeOnly,
      createdBy: /* aus JWT */,
    });
    const result = await this.importHandler.execute(command);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }
    return result.value;
  }

  @Get('qualifikation-mappings')
  @ApiOperation({ summary: 'Qualifikations-Mappings abrufen' })
  @ApiWrappedResponse(QualifikationMappingItemDto, { isArray: true })
  async getQualifikationMappings(): Promise<QualifikationMappingItemDto[]> {
    const result = await this.getMappingsHandler.execute(
      GetQualifikationMappingsQuery.create({ source: IMPORT_SOURCES.HIORG_SERVER })
    );
    return result.value;
  }

  @Post('qualifikation-mappings')
  @ApiOperation({ summary: 'Qualifikations-Mapping speichern' })
  @ApiWrappedCreatedResponse(QualifikationMappingItemDto)
  async saveQualifikationMapping(@Body() dto: SaveQualifikationMappingDto): Promise<QualifikationMappingItemDto> {
    const result = await this.saveMappingHandler.execute(
      SaveQualifikationMappingCommand.create(dto)
    );
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }
    return result.value;
  }

  @Post('qualifikation-mappings/auto-match')
  @ApiOperation({ summary: 'Auto-Match für Qualifikationen' })
  @ApiWrappedResponse(AutoMatchResultDto)
  async autoMatchQualifikationen(): Promise<AutoMatchResultDto> {
    const result = await this.autoMatchHandler.execute(
      AutoMatchQualifikationenCommand.create({ source: IMPORT_SOURCES.HIORG_SERVER })
    );
    return result.value;
  }
  ```

- [ ] **4.2** DTOs erstellen mit vollständigen Decorators

- [ ] **4.3** Guards: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ADMIN', 'SUPER_ADMIN')`

### Task 5: Frontend - API Hooks & Query Keys

- [ ] **5.1** Query Keys erweitern in `queryKeys.ts`:
  ```typescript
  export const QUERY_KEYS = {
    // ... existierende ...
    admin: {
      // ... existierende ...
      integrations: {
        hiorg: {
          all: () => ['admin', 'integrations', 'hiorg'] as const,
          preview: () => [...QUERY_KEYS.admin.integrations.hiorg.all(), 'preview'] as const,
          qualifikationMappings: () => [...QUERY_KEYS.admin.integrations.hiorg.all(), 'qualifikation-mappings'] as const,
          importResult: (id: string) => [...QUERY_KEYS.admin.integrations.hiorg.all(), 'import-result', id] as const,
        },
      },
    },
  };
  ```

- [ ] **5.2** Hook erweitern: `use-admin-hiorg-integration.ts`
  ```typescript
  // Queries
  export const useQualifikationMappings = () => {
    return useQuery({
      queryKey: QUERY_KEYS.admin.integrations.hiorg.qualifikationMappings(),
      queryFn: () => apiService.adminIntegrationsHiorg.getQualifikationMappings(),
    });
  };

  // Mutations
  export const useImportPersons = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (dto: ImportPersonsRequestDto) =>
        apiService.adminIntegrationsHiorg.importPersons(dto),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.admin.stammPersonen.all(),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.admin.integrations.hiorg.preview(),
        });
      },
    });
  };

  export const useSaveQualifikationMapping = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (dto: SaveQualifikationMappingDto) =>
        apiService.adminIntegrationsHiorg.saveQualifikationMapping(dto),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.admin.integrations.hiorg.qualifikationMappings(),
        });
      },
    });
  };

  export const useAutoMatchQualifikationen = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: () => apiService.adminIntegrationsHiorg.autoMatchQualifikationen(),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.admin.integrations.hiorg.qualifikationMappings(),
        });
      },
    });
  };
  ```

### Task 6: Frontend - UI Komponenten mit TanStack Form

- [ ] **6.1** Komponente: `HiOrgPersonSelectTable.tsx` (Organism)
  ```typescript
  import { useForm } from '@tanstack/react-form';
  import { zodValidator } from '@tanstack/zod-form-adapter';
  import { Checkbox } from '@headlessui/react';

  const selectionSchema = z.object({
    selectedUsernames: z.array(z.string()).min(1, 'Mindestens eine Person auswählen'),
  });

  export const HiOrgPersonSelectTable: React.FC<Props> = ({ persons, onImport }) => {
    const form = useForm({
      defaultValues: {
        selectedUsernames: persons.filter(p => !p.isDuplicate).map(p => p.username),
      },
      validatorAdapter: zodValidator(),
      validators: {
        onSubmit: selectionSchema,
      },
      onSubmit: async ({ value }) => {
        onImport(value.selectedUsernames);
      },
    });

    const allSelected = form.state.values.selectedUsernames.length === persons.length;

    const toggleAll = () => {
      if (allSelected) {
        form.setFieldValue('selectedUsernames', []);
      } else {
        form.setFieldValue('selectedUsernames', persons.map(p => p.username));
      }
    };

    const togglePerson = (username: string) => {
      const current = form.state.values.selectedUsernames;
      if (current.includes(username)) {
        form.setFieldValue('selectedUsernames', current.filter(u => u !== username));
      } else {
        form.setFieldValue('selectedUsernames', [...current, username]);
      }
    };

    return (
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="w-10 px-4 py-2">
                <Checkbox checked={allSelected} onChange={toggleAll} />
              </th>
              <th>Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {persons.map(p => (
              <tr key={p.username} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-2">
                  <Checkbox
                    checked={form.state.values.selectedUsernames.includes(p.username)}
                    onChange={() => togglePerson(p.username)}
                  />
                </td>
                <td className="px-4 py-2">{p.vorname} {p.nachname}</td>
                <td className="px-4 py-2">
                  {p.isDuplicate ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      Wird aktualisiert
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Neu
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="submit"
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {form.state.values.selectedUsernames.length} Personen importieren
        </button>
      </form>
    );
  };
  ```

- [ ] **6.2** Komponente: `QualifikationMappingDialog.tsx` (Organism)
  - Dialog mit Headless UI `Dialog`
  - Mapping-Tabelle mit `Listbox` pro Zeile
  - Auto-Match Button

- [ ] **6.3** Komponente: `ImportProgressDialog.tsx` (Organism)
  - Progress-Bar während Import
  - Live-Update von success/failed counts

- [ ] **6.4** Komponente: `ImportResultSummary.tsx` (Molecule)
  - Zeigt finale Statistiken
  - Fehler-Liste mit Details

### Task 7: Duplikatserkennung erweitern

- [ ] **7.1** `PreviewHiOrgPersonsHandler` erweitern (aus Story 7.1):
  - Für jede Person `findByExternalId("HIORG_SERVER", username)` prüfen
  - `isDuplicate: boolean` und `existingId?: string` hinzufügen

- [ ] **7.2** DTO erweitern:
  ```typescript
  export class HiOrgPersonPreviewItemDto {
    // ... existierend aus Story 7.1 ...
    @ApiProperty() isDuplicate: boolean;
    @ApiPropertyOptional() existingId?: string;
  }
  ```

### Task 8: Unit Tests

- [ ] **8.1** Domain Tests: `QualifikationMatcherService`
- [ ] **8.2** Handler Tests: `ImportSelectedPersonsHandler`
- [ ] **8.3** Handler Tests: `SaveQualifikationMappingHandler`
- [ ] **8.4** Handler Tests: `AutoMatchQualifikationenHandler`
- [ ] **8.5** Repository Tests: `PrismaQualifikationMappingRepository`

### Task 9: Verifikation

- [ ] **9.1** `pnpm --filter @bluelight-hub/backend lint:check` → 0 Errors
- [ ] **9.2** `pnpm --filter @bluelight-hub/frontend lint:check` → 0 Errors
- [ ] **9.3** `pnpm --filter @bluelight-hub/backend build` → Success
- [ ] **9.4** `pnpm --filter @bluelight-hub/frontend build` → Success
- [ ] **9.5** Alle Unit Tests bestehen
- [ ] **9.6** API-Client generieren: `pnpm run generate-api`
- [ ] **9.7** Manuelle Tests mit Chrome DevTools MCP

---

## Dev Notes

### Learnings aus Story 7.1

**API Rate Limiting:**
- HiOrg API hat Rate Limits → bei Batch-Operationen Pausen einbauen
- Token-Refresh bei 401-Errors automatisch triggern

**Daten-Qualität:**
- Einige HiOrg-Felder können `null` sein → defensive Validierung
- Qualifikations-Namen variieren stark zwischen Organisationen

**Performance:**
- Pagination bei großen Personenlisten verwenden
- Preview-Daten cachen um API-Calls zu reduzieren

### Architektur-Patterns

**TransactionalCommandHandler Pattern:**
Für Import-Operationen, die Domain Events generieren und atomare Konsistenz benötigen:
```typescript
export class ImportSelectedPersonsHandler extends TransactionalCommandHandler<
  ImportSelectedPersonsCommand,
  ImportResultDto
> {
  protected async executeInTransaction(
    command: ImportSelectedPersonsCommand,
    tx: TransactionClient
  ): Promise<{ result: ImportResultDto; events: DomainEvent[] }> {
    // Alle DB-Operationen in gleicher Transaktion
    // Events werden nach Commit über Outbox verarbeitet
  }
}
```

**Result Pattern für Handler:**
```typescript
async execute(command: Cmd): Promise<Result<T>> {
  // Validierung
  if (validation.isFailure) return Result.fail(validation.error);

  // Business Logic
  const entity = Entity.create(props);
  if (entity.isFailure) return Result.fail(entity.error);

  // Speichern
  await this.repository.save(entity.value);
  return Result.ok(dto);
}
```

**Partial Success Pattern für Batch-Operationen:**
```typescript
const results: ImportItemResult[] = [];
for (const item of items) {
  try {
    const result = await this.processItem(item, tx);
    results.push({ ...result, success: true });
  } catch (error) {
    results.push({ item, success: false, error: error.message });
    // KEIN throw - weiter mit nächstem Item
  }
}
return this.buildSummary(results);
```

### Frontend Patterns

**API Service (NICHT `api.*`):**
```typescript
// ✅ RICHTIG:
queryFn: () => apiService.adminIntegrationsHiorg.getQualifikationMappings()

// ❌ FALSCH:
queryFn: () => api.admin.hiorgQualifikationen()
```

**Headless UI Imports (separate Components):**
```typescript
// ✅ RICHTIG:
import { Checkbox, Dialog, DialogPanel, DialogTitle, Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';

// ❌ FALSCH:
<Listbox.Button>  // Compound Pattern veraltet
```

**TanStack Form statt useState:**
```typescript
// ✅ RICHTIG:
const form = useForm({
  defaultValues: { selectedUsernames: [] },
  validatorAdapter: zodValidator(),
});

// ❌ FALSCH:
const [selected, setSelected] = useState<Set<string>>(new Set());
```

---

## References

| Dokument | Pfad |
|----------|------|
| Story 7.1 (Prerequisite) | `docs/sprint-artifacts/7-1-hiorg-server-verbindung-synchronisation.md` |
| StammPerson Aggregate | `packages/backend/src/domain/kraefte/aggregates/stamm-person.aggregate.ts` |
| Qualifikation Aggregate | `packages/backend/src/domain/kraefte/aggregates/qualifikation.aggregate.ts` |
| HiOrg-Server Adapter | `packages/backend/src/infrastructure/integrations/hiorg-server.adapter.ts` |
| HiOrg-Server Port | `packages/backend/src/domain/ports/i-hiorg-server.port.ts` |
| Preview Handler | `packages/backend/src/application/integrations/queries/preview-hiorg-persons/` |
| Admin HiOrg Page | `packages/frontend/src/features/admin/ui/pages/AdminHiOrgIntegration.tsx` |
| Admin HiOrg Hook | `packages/frontend/src/features/admin/api/use-admin-hiorg-integration.ts` |
| DI Tokens | `packages/backend/src/infrastructure/di-tokens.ts` |
| Query Keys | `packages/frontend/src/queryKeys.ts` |
| API Service | `packages/frontend/src/services/api.service.ts` |

---

## File List

**Zu erstellen (Domain):**
- `packages/backend/src/domain/integrations/value-objects/import-source.vo.ts`
- `packages/backend/src/domain/integrations/value-objects/qualifikation-mapping-id.vo.ts`
- `packages/backend/src/domain/integrations/value-objects/match-result.vo.ts`
- `packages/backend/src/domain/integrations/entities/qualifikation-mapping.entity.ts`
- `packages/backend/src/domain/integrations/services/qualifikation-matcher.service.ts`
- `packages/backend/src/domain/integrations/repositories/i-qualifikation-mapping.repository.ts`
- `packages/backend/src/domain/integrations/common/import-error-codes.ts`

**Zu erstellen (Application):**
- `packages/backend/src/application/integrations/commands/import-selected-persons/*`
- `packages/backend/src/application/integrations/commands/save-qualifikation-mapping/*`
- `packages/backend/src/application/integrations/commands/auto-match-qualifikationen/*`
- `packages/backend/src/application/integrations/queries/get-qualifikation-mappings/*`

**Zu erstellen (Infrastructure):**
- `packages/backend/src/infrastructure/integrations/repositories/prisma-qualifikation-mapping.repository.ts`
- `packages/backend/src/infrastructure/integrations/mappers/prisma-qualifikation-mapping.mapper.ts`

**Zu erstellen (Modules):**
- `packages/backend/src/modules/integrations/dto/import-result.dto.ts`
- `packages/backend/src/modules/integrations/dto/save-qualifikation-mapping.dto.ts`
- `packages/backend/src/modules/integrations/dto/auto-match-result.dto.ts`

**Zu erstellen (Frontend):**
- `packages/frontend/src/features/admin/ui/organisms/HiOrgPersonSelectTable.tsx`
- `packages/frontend/src/features/admin/ui/organisms/QualifikationMappingDialog.tsx`
- `packages/frontend/src/features/admin/ui/organisms/ImportProgressDialog.tsx`
- `packages/frontend/src/features/admin/ui/molecules/ImportResultSummary.tsx`

**Zu erweitern:**
- `packages/backend/prisma/schema.prisma` (QualifikationMapping Model + Qualifikation Relation)
- `packages/backend/src/infrastructure/di-tokens.ts` (INTEGRATIONS Tokens)
- `packages/backend/src/modules/integrations/dto/hiorg-persons-preview.dto.ts` (isDuplicate Flag)
- `packages/backend/src/modules/integrations/controllers/admin-hiorg-integration.controller.ts`
- `packages/frontend/src/features/admin/api/use-admin-hiorg-integration.ts`
- `packages/frontend/src/queryKeys.ts` (admin.integrations.hiorg Namespace)
- `packages/frontend/src/features/admin/ui/pages/AdminHiOrgIntegration.tsx`

---

## Dev Agent Record

### Validation History

**2026-01-03 - Story validiert (SM Agent + 4 parallele Subagents):**
- Backend Pattern Validation: 43% → 15 Issues identifiziert
- Frontend Pattern Validation: 50% → TanStack Form fehlt korrigiert
- Architecture Compliance: 86% → DI Tokens + Result Pattern ergänzt
- Previous Story Learnings: 65% → Code Reuse Sektion hinzugefügt

**Angewandte Korrekturen:**
1. ✅ Domain Entity `QualifikationMapping` + Mapper hinzugefügt
2. ✅ TanStack Form Pattern für Selection-State
3. ✅ TransactionalCommandHandler für atomare Imports
4. ✅ Dev Notes mit Learnings aus Story 7.1
5. ✅ Repository Interface mit findById, findAll, TransactionClient
6. ✅ apiService statt api
7. ✅ Query Keys Namespace admin.integrations.hiorg
8. ✅ Headless UI separate Imports
9. ✅ DI Token Hierarchie vollständig
10. ✅ Code Reuse Sektion hinzugefügt
11. ✅ Import-Fehlerklassen definiert
12. ✅ MatchResult als Value Object
13. ✅ Prisma Rück-Relation dokumentiert
14. ✅ Handler Result Pattern explizit
15. ✅ Explicit Code Reuse Section
