# Story 4.2: Person via QR-Code registrieren

**Status:** ready-for-dev

---

## Blocker / Prerequisites

| Blocker | Status | Beschreibung |
|---------|--------|--------------|
| ✅ **Story 4.1 Complete** | DONE | Manuelle Personen-Registrierung muss funktionieren |
| ✅ **StammPerson.personalnummer Index** | DONE | `personalnummer` ist `@unique` in Prisma Schema (automatischer Index) |

---

## Quick Context

| Aspekt | Details |
|--------|---------|
| **Entities** | Nutzt bestehende `EinsatzPerson` Aggregate aus Story 4.1 |
| **Pattern** | QR-Dekodierung → Stammdaten-Lookup (via `personalnummer`) → Automatische Registrierung |
| **API** | `POST /api/v-alpha/einsaetze/:einsatzId/personen/qr` (NEU) |
| **Events** | `EinsatzPersonHinzugefuegtEvent` (existing) → ETB Auto-Eintrag |
| **Frontend** | Tab-basierter Dialog, Kamera via `navigator.mediaDevices.getUserMedia()` |
| **Library** | `jsqr` (50KB, pure JS QR decoder) + Fallback `html5-qrcode` |
| **Performance** | <3 Sekunden (Scan → Erfasst) - NFR3 |
| **Aufwand** | ~2-3 Tage |

**Task Dependencies:** Task 1 → Task 2 → Task 3 → Task 4

---

## Story

**Als** FüKw (Sandra),
**möchte ich** eine Person durch Scannen ihres DRK-App QR-Codes in <3s registrieren,
**damit** ich eine schnelle Helfer-Erfassung ohne Tippfehler habe.

---

## Acceptance Criteria

### AC1: QR-Scanner öffnen

**Given** ich bin auf der Einsatz-Detail-Seite eines aktiven Einsatzes
**When** ich "Person hinzufügen" klicke und Tab "QR-Code" wähle
**Then** wird Kamera-Zugriff angefordert (Tauri Native / Browser `getUserMedia`)
**And** Video-Feed wird im Dialog angezeigt
**And** Scanner beginnt automatisch mit QR-Erkennung

**UI Details:**
- Tab 1: "Manuell" (existierend aus Story 4.1)
- Tab 2: "QR-Code" (neu)
- Video-Container: 16:9 Aspect Ratio, zentriert
- Overlay: Viewfinder-Rahmen zur Orientierung
- Loading-State: Spinner während Kamera-Initialisierung
- Fehler-State: "Kamera-Zugriff verweigert" mit Retry-Button

### AC2: DRK-Format dekodieren

**Given** Scanner ist aktiv
**When** ich DRK-App QR-Code scanne
**Then** wird Code automatisch erkannt (kein Button-Klick nötig!)
**And** Format `drk://person?mnr={mitgliedsnummer}&vn={vorname}&nn={nachname}` wird dekodiert
**And** Visuelle Bestätigung: Kurzes grünes Blinken des Viewfinders

**DRK QR-Format Spezifikation:**
```
drk://person?mnr=12345678&vn=Max&nn=Mustermann[&fk=BOS-Funkkennung]
```

| Parameter | Beschreibung | Maps to | Required |
|-----------|-------------|---------|----------|
| `mnr` | Mitgliedsnummer (= Personalnummer) | `StammPerson.personalnummer` | ✅ Ja |
| `vn` | Vorname | `StammPerson.vorname` | ✅ Ja |
| `nn` | Nachname | `StammPerson.nachname` | ✅ Ja |
| `fk` | BOS-Funkkennung | `StammPerson.funkkenungBOS` | ❌ Optional |

**WICHTIG:** Der QR-Parameter `mnr` (Mitgliedsnummer) entspricht dem Feld `personalnummer` im Prisma Schema!

**Fallback für unbekanntes Format:**
- Wenn QR nicht DRK-konform: Warning anzeigen, Scanner bleibt aktiv
- Wenn QR nur Text (ohne Schema): Versuche JSON/CSV Parsing

### AC3: Stammdaten-Lookup via Personalnummer

**Given** QR mit Mitgliedsnummer (`mnr`) dekodiert
**When** Backend-Lookup via `findByPersonalnummer(qr.mnr)` durchgeführt wird
**Then**:
- Bei Treffer (`StammPerson.personalnummer === qr.mnr`):
  - `stammId` wird gesetzt
  - Qualifikationen werden aus Stammdaten übernommen (als `qualifikationIds[]`)
  - Funktion aus Stammdaten oder Default "Helfer"
  - Funkrufname aus `stammPerson.funkkenungBOS`
- Bei KEINEM Treffer:
  - `stammId` bleibt `undefined` (temporäre Person)
  - Qualifikationen leer
  - Funktion = "Helfer" (Default)

**Lookup Performance:**
- `personalnummer` ist `@unique` im Prisma Schema → automatischer Index
- Erwartete Query-Zeit: <50ms
- **Methode existiert bereits:** `IStammPersonRepository.findByPersonalnummer()`

### AC4: Automatische Registrierung

**Given** gültiger QR dekodiert und Lookup abgeschlossen
**When** keine Validierungsfehler
**Then**:
- Person wird **AUTOMATISCH** registriert (KEIN Bestätigungs-Button!)
- Scanner/Kamera wird sofort gestoppt
- Dialog schließt sich automatisch nach 1s Delay (für visuelles Feedback)
- Success-Toast: "Person via QR registriert"
- Person erscheint sofort in der Personen-Liste

**Bei Duplikat (gleiche StammPerson bereits erfasst):**
- Warning-Toast: "Person bereits erfasst"
- Scanner bleibt aktiv für nächsten Scan
- Dialog bleibt offen

### AC5: Performance <3s (NFR3)

**Given** QR wird gescannt
**When** ich Zeit messe von Scan-Start bis Toast
**Then** Gesamtdauer <3 Sekunden

**Performance Budget:**
| Phase | Max. Zeit |
|-------|-----------|
| QR Dekodierung | 500ms |
| Stammdaten-Lookup | 500ms |
| Registrierung (inkl. Outbox) | 1000ms |
| UI Update + Toast | 500ms |
| **Gesamt** | <3000ms |

### AC6: Fehlerbehandlung ungültiger QR

**Given** ich scanne einen QR-Code
**When** Format nicht DRK-konform
**Then**:
- Warning anzeigen: "Ungültiger QR-Code - bitte DRK-Helfer-App QR verwenden"
- Scanner bleibt aktiv (kein Stopp!)
- Kein Dialog-Close

**When** Kamera-Zugriff verweigert
**Then**:
- Error anzeigen: "Kamera-Zugriff erforderlich"
- Button: "Erneut versuchen" oder "Manuell eingeben"
- Tab wechselt NICHT automatisch

**When** Backend-Fehler (Netzwerk, Server)
**Then**:
- Error-Toast: "Registrierung fehlgeschlagen - bitte erneut scannen"
- Scanner bleibt aktiv

---

## Tasks / Subtasks

### Task 1: Backend - QR-Registrierung Endpoint (AC: 2, 3, 4)

- [ ] **1.1 `RegistrierePersonViaQrCodeCommand` erstellen**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/commands/registriere-person-qr/registriere-person-qr.command.ts`
  - Properties: `einsatzId`, `personalnummer` (aus QR `mnr`), `vorname`, `nachname`, `funkkennung?`, `registriertVon`
  - **Private Constructor + Static Factory Pattern**
  ```typescript
  import { Result } from '@domain/common/result';
  import { EinsatzId } from '@domain/einsatz/value-objects/einsatz-id';

  export class RegistrierePersonViaQrCodeCommand {
    private constructor(
      public readonly einsatzId: EinsatzId,
      public readonly personalnummer: string,  // QR-Parameter "mnr" maps to personalnummer
      public readonly vorname: string,
      public readonly nachname: string,
      public readonly funkkennung: string | undefined,
      public readonly registriertVon: string,
    ) {}

    public static create(props: {
      einsatzId: string;
      personalnummer: string;  // aus QR "mnr"
      vorname: string;
      nachname: string;
      funkkennung?: string;
      registriertVon: string;
    }): Result<RegistrierePersonViaQrCodeCommand> {
      if (!props.personalnummer?.trim()) {
        return Result.fail('Personalnummer darf nicht leer sein');
      }
      if (!props.vorname?.trim()) {
        return Result.fail('Vorname darf nicht leer sein');
      }
      if (!props.nachname?.trim()) {
        return Result.fail('Nachname darf nicht leer sein');
      }

      return Result.ok(new RegistrierePersonViaQrCodeCommand(
        EinsatzId.fromString(props.einsatzId),
        props.personalnummer.trim(),
        props.vorname.trim(),
        props.nachname.trim(),
        props.funkkennung?.trim() || undefined,
        props.registriertVon,
      ));
    }
  }
  ```

- [ ] **1.2 `RegistrierePersonViaQrCodeHandler` implementieren**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/commands/registriere-person-qr/registriere-person-qr.handler.ts`
  - EXTENDS `TransactionalCommandHandler` für Outbox Pattern
  - **Inject Logger via `LOGGER` Token** (AC3 Compliance)
  - Workflow:
    1. Lookup `StammPerson` via **existierender** `findByPersonalnummer()` Methode
    2. Prüfe Duplikat (falls stammId gefunden)
    3. Erstelle `EinsatzPerson` via Factory mit **extrahierten Feldern** (NICHT ganzes Objekt!)
    4. Speichere + Emittiere Event
  ```typescript
  import { Injectable, Inject } from '@nestjs/common';
  import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
  import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
  import { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
  import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
  import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
  import { ILogger } from '@domain/ports/i-logger.port';
  import { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
  import { EINSATZ_PERSON_ERROR_CODES } from '@domain/kraefte/common/einsatz-person-error-codes';
  import { Result } from '@domain/common/result';
  import type { TransactionContext, DomainEvent } from '@domain/common/types';

  @Injectable()
  export class RegistrierePersonViaQrCodeHandler extends TransactionalCommandHandler<
    RegistrierePersonViaQrCodeCommand,
    string
  > {
    constructor(
      @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
      private readonly personRepository: IEinsatzPersonRepository,
      @Inject(KRAEFTE_REPOSITORIES.STAMM_PERSON)
      private readonly stammPersonRepository: IStammPersonRepository,
      @Inject(OUTBOX_REPOSITORY)
      outboxRepository: IOutboxRepository,
      @Inject(LOGGER)
      private readonly logger: ILogger,
      prisma: PrismaService,
    ) {
      super(prisma, outboxRepository);  // Korrekte Signatur: 2 Parameter
    }

    protected async executeInTransaction(
      command: RegistrierePersonViaQrCodeCommand,
      tx: TransactionContext,
    ): Promise<{ result: string; events: DomainEvent[] }> {
      // 1. Lookup StammPerson via personalnummer (existierende Methode!)
      const stammPersonResult = await this.stammPersonRepository.findByPersonalnummer(
        command.personalnummer,
        tx,
      );

      if (stammPersonResult.isFailure) {
        this.logger.error(`StammPerson Lookup fehlgeschlagen: ${stammPersonResult.error}`, 'RegistrierePersonViaQrCodeHandler');
        return { result: '', events: [] };
      }

      const stammPerson = stammPersonResult.value;

      // 2. Duplikat-Check (falls StammPerson gefunden)
      if (stammPerson) {
        const existsResult = await this.personRepository.existsByEinsatzIdAndStammId(
          command.einsatzId.value,
          stammPerson.id.value,
          tx,
        );

        if (existsResult.isFailure) {
          return { result: '', events: [] };
        }

        if (existsResult.value) {
          this.logger.warn(
            `QR-Duplikat: StammPerson ${stammPerson.id.value} bereits in Einsatz ${command.einsatzId.value}`,
            'RegistrierePersonViaQrCodeHandler',
          );
          // Return empty result - Controller maps to 409 ConflictException
          return { result: EINSATZ_PERSON_ERROR_CODES.DUPLICATE_PERSON, events: [] };
        }
      }

      // 3. EinsatzPerson erstellen - MIT EXTRAHIERTEN FELDERN (nicht ganzes Objekt!)
      let personResult: Result<EinsatzPerson>;

      if (stammPerson) {
        // StammPerson gefunden → Snapshot Pattern (KOPIE der Daten)
        personResult = EinsatzPerson.createFromStammPerson({
          einsatzId: command.einsatzId.value,
          stammId: stammPerson.id.value,              // ✅ Nur ID
          vorname: stammPerson.vorname,               // ✅ Extrahiertes Feld
          nachname: stammPerson.nachname,             // ✅ Extrahiertes Feld
          funktion: stammPerson.funktion ?? 'Helfer',
          funkrufname: stammPerson.funkkenungBOS,     // ✅ BOS-Kennung
          qualifikationIds: stammPerson.qualifikationIds, // ✅ Array von IDs
          createdBy: command.registriertVon,
        });
      } else {
        // Keine StammPerson → Temporäre Person aus QR-Daten
        personResult = EinsatzPerson.createTemporary({
          einsatzId: command.einsatzId.value,
          vorname: command.vorname,
          nachname: command.nachname,
          funktion: 'Helfer',
          funkrufname: command.funkkennung,
          createdBy: command.registriertVon,
        });
      }

      if (personResult.isFailure) {
        this.logger.error(`EinsatzPerson Erstellung fehlgeschlagen: ${personResult.error}`, 'RegistrierePersonViaQrCodeHandler');
        return { result: '', events: [] };
      }

      const person = personResult.value!;

      // 4. Speichern
      const saveResult = await this.personRepository.save(person, tx);
      if (saveResult.isFailure) {
        this.logger.error(`EinsatzPerson Speichern fehlgeschlagen: ${saveResult.error}`, 'RegistrierePersonViaQrCodeHandler');
        return { result: '', events: [] };
      }

      // 5. Events extrahieren (für Outbox)
      const events = person.getDomainEvents();
      person.clearDomainEvents();

      this.logger.log(
        `Person ${person.id.value} via QR registriert (Stamm: ${stammPerson?.id.value ?? 'temporär'})`,
        'RegistrierePersonViaQrCodeHandler',
      );

      return { result: person.id.value, events };
    }
  }
  ```

- [x] **1.3 `IStammPersonRepository.findByPersonalnummer()` - EXISTIERT BEREITS!**
  - Datei: `packages/backend/src/domain/kraefte/repositories/i-stamm-person.repository.ts`
  - ✅ Methode existiert: `findByPersonalnummer(personalnummer: string, tx?: TransactionContext): Promise<Result<StammPerson | null>>`
  - ⚠️ **KEINE ÄNDERUNG ERFORDERLICH** - nutze existierende Methode!

- [x] **1.4 `PrismaStammPersonRepository.findByPersonalnummer()` - EXISTIERT BEREITS!**
  - Datei: `packages/backend/src/infrastructure/kraefte/repositories/prisma-stamm-person.repository.ts`
  - ✅ Implementiert mit `where: { personalnummer }`
  - ✅ Index existiert: `personalnummer` ist `@unique` im Prisma Schema (automatischer Index)

- [ ] **1.5 `RegistrierePersonViaQrCodeDto` erstellen**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/dto/registriere-person-qr.dto.ts`
  ```typescript
  import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
  import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

  export class RegistrierePersonViaQrCodeDto {
    @ApiProperty({
      description: 'Personalnummer aus QR-Code (QR-Parameter "mnr")',
      example: '12345678',
    })
    @IsString()
    @IsNotEmpty()
    personalnummer: string;

    @ApiProperty({ description: 'Vorname aus QR-Code', example: 'Max' })
    @IsString()
    @IsNotEmpty()
    vorname: string;

    @ApiProperty({ description: 'Nachname aus QR-Code', example: 'Mustermann' })
    @IsString()
    @IsNotEmpty()
    nachname: string;

    @ApiPropertyOptional({
      description: 'BOS-Funkkennung (optional, QR-Parameter "fk")',
      example: '4711',
    })
    @IsOptional()
    @IsString()
    funkkennung?: string;
  }
  ```

- [ ] **1.6 Unit Tests für Handler**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/commands/registriere-person-qr/__tests__/registriere-person-qr.handler.spec.ts`
  - Test Cases:
    - Success: StammPerson gefunden → EinsatzPerson mit stammId + Qualifikationen
    - Success: Keine StammPerson → temporäre EinsatzPerson ohne stammId
    - Duplikat: StammPerson bereits registriert → `DUPLICATE_PERSON` Error Code
    - Validation: Leere Personalnummer → Result.fail()
    - Repository Fehler → graceful handling, empty events
  - **KRITISCH:**
    - `jest.clearAllMocks()` in `beforeEach()`
    - `jest.Mocked<T>` für Repository Mocks
    - Given-When-Then Kommentare (AAA Pattern)

### Task 2: API Layer - QR Endpoint (AC: 4)

- [ ] **2.1 `EinsatzPersonenController` erweitern**
  - Datei: `packages/backend/src/modules/kraefte/controllers/einsatz-personen.controller.ts`
  - Neuer Endpoint: `POST /api/v-alpha/einsaetze/:einsatzId/personen/qr`
  - **Inject Handler im Konstruktor!**
  ```typescript
  import { Controller, Post, Param, Body, BadRequestException, ConflictException } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiParam, ApiCreatedResponse, ApiBadRequestResponse, ApiConflictResponse } from '@nestjs/swagger';
  import { RegistrierePersonViaQrCodeCommand } from '@application/kraefte/einsatz-personen/commands/registriere-person-qr/registriere-person-qr.command';
  import { RegistrierePersonViaQrCodeDto } from '@application/kraefte/einsatz-personen/dto/registriere-person-qr.dto';
  import { EINSATZ_PERSON_ERROR_CODES } from '@domain/kraefte/common/einsatz-person-error-codes';
  import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
  import type { JwtPayload } from '@modules/auth/types';

  // Im Controller:
  @Post('qr')
  @ApiOperation({ summary: 'Person via QR-Code registrieren' })
  @ApiParam({ name: 'einsatzId', description: 'Einsatz ID' })
  @ApiCreatedResponse({ type: EinsatzPersonDto, description: 'Person erfolgreich via QR registriert' })
  @ApiBadRequestResponse({ description: 'Ungültige QR-Daten' })
  @ApiConflictResponse({ description: 'Person bereits erfasst (Duplikat)' })
  async registriereViaQr(
    @Param('einsatzId') einsatzId: string,
    @Body() dto: RegistrierePersonViaQrCodeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WrappedResponse<EinsatzPersonDto>> {
    // 1. Command erstellen mit Validation
    const commandResult = RegistrierePersonViaQrCodeCommand.create({
      einsatzId,
      personalnummer: dto.personalnummer,  // ✅ Korrekt: personalnummer
      vorname: dto.vorname,
      nachname: dto.nachname,
      funkkennung: dto.funkkennung,
      registriertVon: user.sub,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    // 2. Handler ausführen
    const result = await this.qrHandler.execute(commandResult.value!);

    // 3. Fehlerbehandlung mit korrektem Error Code
    if (result.result === EINSATZ_PERSON_ERROR_CODES.DUPLICATE_PERSON) {
      throw new ConflictException('Person bereits im Einsatz erfasst');
    }

    if (!result.result || result.result === '') {
      throw new BadRequestException('Registrierung fehlgeschlagen');
    }

    // 4. Erstellte Person laden für Response
    const personResult = await this.getHandler.execute({ personId: result.result });
    if (personResult.isFailure) {
      throw new BadRequestException(personResult.error);
    }

    return { data: personResult.value! };
  }
  ```

- [ ] **2.2 Handler DI Registration**
  - Datei: `packages/backend/src/modules/kraefte/kraefte.module.ts`
  - `RegistrierePersonViaQrCodeHandler` zu `providers` hinzufügen

- [ ] **2.3 API Client regenerieren**
  - `pnpm run generate-api`
  - Verifizieren: `EinsatzPersonenApi.registriereViaQr()` in `packages/shared/client/`

### Task 3: Frontend - QR Scanner Tab (AC: 1, 2, 6)

- [ ] **3.1 jsqr Library installieren**
  - `pnpm --filter @bluelight-hub/frontend add jsqr`
  - TypeScript Types: `pnpm --filter @bluelight-hub/frontend add -D @types/jsqr`

- [ ] **3.2 QR Parser Utility erstellen**
  - Datei: `packages/frontend/src/features/einsatz/utils/drk-qr-parser.ts`
  ```typescript
  /**
   * DRK QR-Code Daten.
   * QR-Parameter "mnr" wird zu "personalnummer" gemappt (Backend-Feldname).
   */
  export interface DrkQrData {
    personalnummer: string;  // QR "mnr" → Backend "personalnummer"
    vorname: string;
    nachname: string;
    funkkennung?: string;
  }

  export interface Result<T> {
    isSuccess: boolean;
    isFailure: boolean;
    value?: T;
    error?: string;
  }

  const success = <T>(value: T): Result<T> => ({
    isSuccess: true,
    isFailure: false,
    value,
  });

  const fail = <T>(error: string): Result<T> => ({
    isSuccess: false,
    isFailure: true,
    error,
  });

  /**
   * Parst DRK-Helfer-App QR-Code Format.
   *
   * Format: drk://person?mnr=12345&vn=Max&nn=Mustermann[&fk=BOS-Kennung]
   *
   * WICHTIG: QR-Parameter "mnr" wird zu "personalnummer" gemappt,
   * da das Backend-Schema "personalnummer" verwendet (nicht "mitgliedsnummer").
   */
  export function parseDrkQrCode(qrData: string): Result<DrkQrData> {
    // Schema-Check
    if (!qrData.startsWith('drk://person?')) {
      return fail('Ungültiges QR-Format: Kein DRK-Schema');
    }

    try {
      // drk:// → https:// für URL Parsing
      const url = new URL(qrData.replace('drk://', 'https://'));
      const params = url.searchParams;

      const mnr = params.get('mnr');  // QR-Parameter
      const vorname = params.get('vn');
      const nachname = params.get('nn');
      const funkkennung = params.get('fk') || undefined;

      if (!mnr || !vorname || !nachname) {
        return fail('QR-Code unvollständig: mnr, vn, nn erforderlich');
      }

      return success({
        personalnummer: decodeURIComponent(mnr),  // ✅ Mapping: mnr → personalnummer
        vorname: decodeURIComponent(vorname),
        nachname: decodeURIComponent(nachname),
        funkkennung: funkkennung ? decodeURIComponent(funkkennung) : undefined,
      });
    } catch (error) {
      return fail('QR-Code konnte nicht geparst werden');
    }
  }
  ```

- [ ] **3.3 TanStack Query Hook erstellen**
  - Datei: `packages/frontend/src/features/einsatz/api/use-registriere-person-qr.ts`
  ```typescript
  import { useMutation, useQueryClient } from '@tanstack/react-query';
  import { api } from '@bluelight-hub/shared/client';
  import { QUERY_KEYS } from '@/queryKeys';

  interface RegistrierePersonViaQrParams {
    einsatzId: string;
    personalnummer: string;  // ✅ Korrekter Feldname
    vorname: string;
    nachname: string;
    funkkennung?: string;
  }

  export const useRegistrierePersonViaQr = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({ einsatzId, ...dto }: RegistrierePersonViaQrParams) => {
        const response = await api.einsatzPersonen.registriereViaQr(einsatzId, dto);
        return response.data;
      },
      onSuccess: (_, variables) => {
        // Invalidate alle relevanten Queries (3-Query Pattern aus Story 4.1)
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.kraefte.personen.byEinsatz(variables.einsatzId),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.einsatz.detail(variables.einsatzId),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.etb.byEinsatz(variables.einsatzId),
        });
      },
    });
  };
  ```

- [ ] **3.4 QR Scanner Component erstellen**
  - Datei: `packages/frontend/src/features/einsatz/ui/organisms/QrScannerTab.organism.tsx`
  ```typescript
  import { useRef, useCallback, useState, useEffect } from 'react';
  import jsQR from 'jsqr';
  import { parseDrkQrCode } from '../../utils/drk-qr-parser';
  import { useRegistrierePersonViaQr } from '../../api/use-registriere-person-qr';
  import { toast } from 'sonner';
  import { cn } from '@/shared/utils/cn';
  import { InlineSpinner } from '@/shared/ui/atoms/spinner.atom';

  interface QrScannerTabProps {
    einsatzId: string;
    onSuccess: () => void;
    isActive: boolean;
  }

  type ScannerState = 'idle' | 'requesting' | 'scanning' | 'processing' | 'error';

  export function QrScannerTab({ einsatzId, onSuccess, isActive }: QrScannerTabProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

    const [scannerState, setScannerState] = useState<ScannerState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { mutate: registriereViaQr, isPending } = useRegistrierePersonViaQr();

    // Kamera starten
    const startCamera = useCallback(async () => {
      setScannerState('requesting');
      setErrorMessage(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScannerState('scanning');
          startScanning();
        }
      } catch (error) {
        setScannerState('error');
        setErrorMessage(
          error instanceof DOMException && error.name === 'NotAllowedError'
            ? 'Kamera-Zugriff verweigert. Bitte Berechtigung erteilen.'
            : 'Kamera konnte nicht gestartet werden.'
        );
      }
    }, []);

    // Kamera stoppen
    const stopCamera = useCallback(() => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      setScannerState('idle');
    }, []);

    // QR-Scan Loop
    const startScanning = useCallback(() => {
      const scan = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          animationRef.current = requestAnimationFrame(scan);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          handleQrDetected(code.data);
        } else {
          animationRef.current = requestAnimationFrame(scan);
        }
      };

      animationRef.current = requestAnimationFrame(scan);
    }, []);

    // QR erkannt
    const handleQrDetected = useCallback((qrData: string) => {
      const parseResult = parseDrkQrCode(qrData);

      if (parseResult.isFailure) {
        toast.warning(parseResult.error);
        // Weiter scannen bei ungültigem QR
        animationRef.current = requestAnimationFrame(() => startScanning());
        return;
      }

      setScannerState('processing');
      stopCamera();

      // Automatische Registrierung (KEIN Bestätigungs-Button per AC4!)
      registriereViaQr(
        {
          einsatzId,
          personalnummer: parseResult.value.personalnummer,  // ✅ Korrektes Mapping
          vorname: parseResult.value.vorname,
          nachname: parseResult.value.nachname,
          funkkennung: parseResult.value.funkkennung,
        },
        {
          onSuccess: () => {
            toast.success('Person via QR registriert');
            setTimeout(() => onSuccess(), 500); // Kurzer Delay für visuelles Feedback
          },
          onError: (error) => {
            if (error.message.includes('409') || error.message.includes('bereits')) {
              toast.warning('Person bereits im Einsatz erfasst');
            } else {
              toast.error('Registrierung fehlgeschlagen - bitte erneut scannen');
            }
            // Kamera neu starten für nächsten Versuch
            setTimeout(() => startCamera(), 1000);
          },
        }
      );
    }, [einsatzId, registriereViaQr, onSuccess, stopCamera, startCamera]);

    // Tab-Wechsel: Kamera starten/stoppen
    useEffect(() => {
      if (isActive) {
        startCamera();
      } else {
        stopCamera();
      }

      return () => stopCamera();
    }, [isActive, startCamera, stopCamera]);

    return (
      <div className="flex flex-col items-center gap-4">
        {/* Video Container */}
        <div className="relative w-full max-w-md aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            aria-label="QR-Code Kamera-Feed"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Viewfinder Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-white/50 rounded-lg" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary-400 rounded-lg" />
          </div>

          {/* Status Overlays */}
          {scannerState === 'requesting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="text-white text-center">
                <InlineSpinner className="mx-auto mb-2" />
                <p>Kamera wird gestartet...</p>
              </div>
            </div>
          )}

          {scannerState === 'processing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="text-white text-center">
                <InlineSpinner className="mx-auto mb-2" />
                <p>Registriere Person...</p>
              </div>
            </div>
          )}

          {scannerState === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="text-white text-center px-4">
                <p className="text-red-400 mb-4">{errorMessage}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                >
                  Erneut versuchen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-500 text-center">
          Halte den DRK-Helfer-App QR-Code vor die Kamera.<br />
          Die Registrierung erfolgt automatisch.
        </p>
      </div>
    );
  }
  ```

- [ ] **3.5 PersonHinzufuegenDialog mit Tabs erweitern**
  - Datei: `packages/frontend/src/features/einsatz/ui/organisms/PersonHinzufuegenDialog.organism.tsx`
  - Import: `Tab, TabGroup, TabList, TabPanel, TabPanels` from `@headlessui/react`
  - Tab 1: Existierende manuelle Form (unverändert)
  - Tab 2: QrScannerTab Component
  ```typescript
  // In PersonHinzufuegenDialog.organism.tsx
  import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
  import { QrScannerTab } from './QrScannerTab.organism';

  export function PersonHinzufuegenDialog({ isOpen, onClose, einsatzId }) {
    const [selectedTabIndex, setSelectedTabIndex] = useState(0);

    const handleClose = useCallback(() => {
      setSelectedTabIndex(0); // Reset to manual tab
      // ... existing reset logic
      onClose();
    }, [onClose]);

    return (
      <Dialog isOpen={isOpen} onClose={handleClose} size="md">
        {/* ... existing Dialog.Title */}

        <Dialog.Body>
          <TabGroup selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
            <TabList className="flex gap-2 border-b border-gray-200 pb-2 mb-4">
              <Tab className={({ selected }) => cn(
                'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
                selected
                  ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500'
                  : 'text-gray-600 hover:bg-gray-50'
              )}>
                Manuell
              </Tab>
              <Tab className={({ selected }) => cn(
                'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
                selected
                  ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500'
                  : 'text-gray-600 hover:bg-gray-50'
              )}>
                QR-Code
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                {/* Existing manual form */}
              </TabPanel>
              <TabPanel>
                <QrScannerTab
                  einsatzId={einsatzId}
                  onSuccess={handleClose}
                  isActive={selectedTabIndex === 1 && isOpen}
                />
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </Dialog.Body>

        {/* Dialog.Footer nur für Tab 0 (Manuell) anzeigen */}
        {selectedTabIndex === 0 && (
          <Dialog.Footer loading={isLoading}>
            <Button onClick={handleSubmit}>Registrieren</Button>
          </Dialog.Footer>
        )}
      </Dialog>
    );
  }
  ```

### Task 4: Testing (AC: 1-6)

- [ ] **4.1 Unit Tests für Command**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/commands/registriere-person-qr/__tests__/registriere-person-qr.command.spec.ts`
  - Tests: Validation (leere Felder, Trim), Factory Pattern
  - **KRITISCH:** `jest.clearAllMocks()` in `beforeEach()`

- [ ] **4.2 Unit Tests für Handler**
  - Datei: `packages/backend/src/application/kraefte/einsatz-personen/commands/registriere-person-qr/__tests__/registriere-person-qr.handler.spec.ts`
  - Tests:
    - Success mit StammPerson gefunden
    - Success ohne StammPerson (temporär)
    - Duplikat-Fehler
    - Mitgliedsnummer-Lookup
  - **KRITISCH:** `jest.Mocked<T>` für Repository Mocks

- [ ] **4.3 Unit Tests für QR Parser**
  - Datei: `packages/frontend/src/features/einsatz/utils/__tests__/drk-qr-parser.spec.ts`
  - Tests:
    - Gültiges DRK-Format parsen
    - Ungültiges Schema
    - Fehlende Parameter
    - URL-Encoding

- [ ] **4.4 E2E Tests (Chrome DevTools MCP)**
  - QR-Code scannen Flow (simuliert mit Bild)
  - Duplikat-Validierung
  - Kamera-Permission Handling

---

## Dev Notes

### KRITISCHE REGELN (Anti-Patterns vermeiden!)

| Regel | Richtig | Falsch |
|-------|---------|--------|
| **Automatische Registrierung** | QR erkannt → sofort registrieren | Bestätigungs-Button |
| **Scanner weiter aktiv** | Bei ungültigem QR weiter scannen | Scanner stoppen bei Fehler |
| **Kamera Cleanup** | `stopCamera()` bei Dialog-Close/Tab-Wechsel | Tracks nicht stoppen |
| **DI Export** | Nur Token exportieren | Konkrete Klasse exportieren |
| **Fehler** | `Result.fail()` im Handler | `throw Exception` |
| **Performance** | Index auf `personalnummer` (existiert bereits) | Full Table Scan |
| **Field Mapping** | QR `mnr` → Backend `personalnummer` | `mitgliedsnummer` verwenden |
| **Factory Pattern** | Extrahierte Felder übergeben | Ganzes Objekt übergeben |

### Camera Lifecycle Management (E1)

**KRITISCH:** Kamera-Stream muss bei folgenden Events gestoppt werden:
1. **Dialog Close** (X-Button, ESC, Backdrop-Click)
2. **Tab-Wechsel** von QR → Manuell
3. **Component Unmount**
4. **Erfolgreiche Registrierung** (vor Dialog-Close)

```typescript
// In QrScannerTab:
useEffect(() => {
  if (isActive) {
    startCamera();
  } else {
    stopCamera();  // KRITISCH: Tab-Wechsel → Kamera stoppen
  }
  return () => stopCamera();  // Cleanup bei Unmount
}, [isActive, startCamera, stopCamera]);
```

### Visual Feedback Timing (E2)

| Event | Duration | Visual |
|-------|----------|--------|
| QR erkannt | 300ms | Grüner Border-Flash am Viewfinder |
| Processing | variable | Overlay mit Spinner |
| Success | 500ms delay | Toast + Dialog schließt |
| Duplikat | - | Warning Toast, Scanner bleibt aktiv |

### Dialog Size Recommendation (E3)

- Tab 1 (Manuell): `size="md"` ausreichend
- Tab 2 (QR-Code): Video 16:9 → `size="lg"` empfohlen für bessere UX
- Alternative: Dynamische Size basierend auf `selectedTabIndex`

### Keyboard Shortcut Tab-Handling (E5)

```typescript
// Cmd+Enter nur für manuellen Tab aktiv
useHotkeys(
  'cmd+enter, ctrl+enter',
  handleSubmit,
  {
    enabled: selectedTabIndex === 0 && isOpen,  // ✅ Nur Tab 0
    enableOnFormTags: true,
  }
);
```

### DRK QR-Format Spezifikation

```
drk://person?mnr={personalnummer}&vn={vorname}&nn={nachname}[&fk={funkkennung}]
```

**Field Mapping (KRITISCH):**
| QR-Parameter | Backend-Feld | Beschreibung |
|--------------|--------------|--------------|
| `mnr` | `personalnummer` | Eindeutige ID im DRK-System |
| `vn` | `vorname` | Vorname |
| `nn` | `nachname` | Nachname |
| `fk` | `funkkennung` | BOS-Funkkennung (optional) |

**Beispiele:**
```
drk://person?mnr=12345678&vn=Max&nn=Mustermann
drk://person?mnr=87654321&vn=Erika&nn=Musterfrau&fk=4711
```

**URL-Encoding beachten:**
```
drk://person?mnr=12345&vn=Hans-Peter&nn=M%C3%BCller  // Müller → M%C3%BCller
```

### Camera API Pattern

```typescript
// 1. Kamera anfordern (rear camera preferred für Mobile)
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
});

// 2. Video Element verbinden
videoRef.current.srcObject = stream;
await videoRef.current.play();

// 3. QR Scanning Loop mit jsqr
const scan = () => {
  ctx.drawImage(video, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const code = jsQR(imageData.data, width, height);
  if (code) handleDetected(code.data);
  else requestAnimationFrame(scan);
};

// 4. Cleanup bei Unmount
const tracks = stream.getTracks();
tracks.forEach(track => track.stop());
```

### Performance Optimierungen

1. **Index auf `personalnummer` (bereits vorhanden!):**
   ```prisma
   model StammPerson {
     personalnummer String? @unique  // ✅ @unique = automatischer Index
     // ...
   }
   ```
   **Keine Migration erforderlich** - Index existiert durch `@unique` Constraint

2. **jsqr Scanning Interval**: ~30fps ausreichend (nicht 60fps)

3. **Canvas Reuse**: Nicht bei jedem Frame neu erstellen

4. **Query Caching**: TanStack Query cached `findByPersonalnummer` Ergebnisse

---

## Project Structure Notes

### Neue Dateien (CREATE)

```
packages/backend/src/
├── application/kraefte/
│   └── einsatz-personen/
│       └── commands/
│           └── registriere-person-qr/
│               ├── registriere-person-qr.command.ts
│               ├── registriere-person-qr.handler.ts
│               └── __tests__/
│                   ├── registriere-person-qr.command.spec.ts
│                   └── registriere-person-qr.handler.spec.ts
│       └── dto/
│           └── registriere-person-qr.dto.ts

packages/frontend/src/
├── features/einsatz/
│   ├── api/
│   │   └── use-registriere-person-qr.ts
│   ├── utils/
│   │   ├── drk-qr-parser.ts
│   │   └── __tests__/
│   │       └── drk-qr-parser.spec.ts
│   └── ui/
│       └── organisms/
│           └── QrScannerTab.organism.tsx
```

### Zu modifizierende Dateien (MODIFY)

| Datei | Änderung |
|-------|----------|
| ~~`packages/backend/src/domain/kraefte/repositories/i-stamm-person.repository.ts`~~ | ~~`findByPersonalnummer()` hinzufügen~~ ✅ **EXISTIERT BEREITS** |
| ~~`packages/backend/src/infrastructure/kraefte/repositories/prisma-stamm-person.repository.ts`~~ | ~~Implement `findByPersonalnummer()`~~ ✅ **EXISTIERT BEREITS** |
| `packages/backend/src/modules/kraefte/controllers/einsatz-personen.controller.ts` | `POST /qr` Endpoint hinzufügen |
| `packages/backend/src/modules/kraefte/kraefte.module.ts` | Handler registrieren |
| `packages/frontend/src/features/einsatz/ui/organisms/PersonHinzufuegenDialog.organism.tsx` | Tabs hinzufügen |
| `packages/frontend/src/features/einsatz/api/index.ts` | Export `useRegistrierePersonViaQr` |
| `packages/frontend/package.json` | `jsqr` dependency hinzufügen |

---

## Implementation Checklist

**VOR Implementation prüfen:**
- [x] Story 4.1 complete? (Manuelle Registrierung) ✅
- [x] `StammPerson.personalnummer` Feld existiert? ✅ (`@unique`)
- [x] Index auf `personalnummer` vorhanden? ✅ (automatisch durch `@unique`)
- [x] `findByPersonalnummer()` Methode existiert? ✅
- [ ] jsqr Library Docs reviewed?

**WÄHREND Implementation:**
- [ ] Command: Private Constructor + Static Factory
- [ ] Handler: `extends TransactionalCommandHandler`
- [ ] Handler: `LOGGER` Token injizieren (nicht `DI_TOKENS.PORTS.LOGGER`)
- [ ] Handler: `OUTBOX_REPOSITORY` injizieren für super()
- [ ] Handler: Result.fail() statt throw
- [ ] Handler: Factory mit **extrahierten Feldern** aufrufen (nicht ganzes Objekt!)
- [ ] Repository: Existierende `findByPersonalnummer()` nutzen
- [ ] Frontend: Kamera-Stream korrekt cleanup (Tab-Wechsel, Dialog-Close)
- [ ] Frontend: QR-Scanning Loop mit `requestAnimationFrame`
- [ ] Frontend: Automatische Registrierung (KEIN Button per AC4!)
- [ ] Frontend: QR `mnr` → `personalnummer` Mapping

**NACH Implementation:**
- [ ] Unit Tests: AAA Pattern mit Given-When-Then
- [ ] Unit Tests: `jest.clearAllMocks()` in JEDEM beforeEach
- [ ] Unit Tests: `jest.Mocked<T>` für Repository Mocks
- [ ] Performance: <3s E2E gemessen
- [ ] `pnpm run generate-api` + Frontend Hooks
- [ ] Manual E2E: QR scannen → Person in Liste

---

## References

| Dokument | Pfad | Relevanz |
|----------|------|----------|
| **Epic Definition** | `docs/epics.md` (Lines 1022-1066) | AC1-AC6 |
| **Previous Story 4.1** | `docs/sprint-artifacts/4-1-person-manuell-registrieren.md` | Patterns, Learnings |
| **Architecture** | `docs/architecture-kraefte.md` (Lines 309) | API Endpoint `/qr` |
| **PRD** | `docs/prd.md` (Lines 46, 71, 117) | QR-Code Feature Description |
| **Project Rules** | `docs/project-context.md` | AC1-AC6 Code Review |
| **Pattern: Handler** | `packages/backend/src/application/kraefte/einsatz-personen/commands/registriere-person/` | TransactionalCommandHandler |
| **Pattern: Dialog** | `packages/frontend/src/features/einsatz/ui/organisms/PersonHinzufuegenDialog.organism.tsx` | Tab-basierter Dialog |

---

## Out of Scope (für spätere Stories)

| Thema | Ziel-Story | Beschreibung |
|-------|-----------|--------------|
| Fahrzeug-Zuweisung | 4.3 | Person → Fahrzeug Mapping |
| Batch QR-Scan | TBD | Mehrere Personen hintereinander scannen |
| Offline QR-Scan | TBD | Caching bei fehlender Verbindung |
| Alternative QR-Formate | TBD | Nicht-DRK QR-Codes unterstützen |

---

## Architecture Compliance

### Hexagonal Architecture Layers

| Layer | Komponente | Pfad |
|-------|-----------|------|
| **Domain** | Nutzt existing `EinsatzPerson` Aggregate | `src/domain/kraefte/aggregates/` |
| **Application** | `RegistrierePersonViaQrCodeHandler` | `src/application/kraefte/einsatz-personen/commands/` |
| **Infrastructure** | `PrismaStammPersonRepository.findByMitgliedsnummer()` | `src/infrastructure/kraefte/repositories/` |
| **Module** | `EinsatzPersonenController.registriereViaQr()` | `src/modules/kraefte/controllers/` |

### Code Review Checklist Relevanz

| Check | Relevant für Story 4.2? | Details |
|-------|-------------------------|---------|
| AC1 (DI Import) | ✅ JA | `import { ... }` für Injectable Classes |
| AC2 (DI Tokens) | ✅ JA | Existing tokens nutzen |
| AC3 (Framework-Agnostik) | ✅ JA | Handler ohne HTTP-Konzepte |
| AC4 (Result Pattern) | ✅ JA | `Result.fail()` für Duplikat |
| AC5 (Outbox Pattern) | ✅ JA | TransactionalCommandHandler |
| AC6 (Test Pattern) | ✅ JA | AAA Pattern, jest.clearAllMocks() |

---

## Estimation

**Aufwand:** ~2-3 Tage

| Task | Zeit |
|------|------|
| Task 1: Backend (Command, Handler, Repository) | 4h |
| Task 2: API Layer (Endpoint, DI) | 2h |
| Task 3: Frontend (QR Scanner, Tabs) | 6h |
| Task 4: Testing | 3h |
| **Gesamt** | ~15h |

---

## Dev Agent Record

### Context Reference

- Epic: 4 - Helfer-Registrierung
- Story Key: 4-2-person-via-qr-code-registrieren
- Dependencies: Story 4-1 (Person manuell registrieren)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101) - Scrum Master Agent (Bob)

### Subagents Used (Story Creation - 2025-12-19)

1. **QR-Code Patterns Agent** - Codebase exploration for existing patterns
2. **QR-Code Library Research Agent** - Web research for latest libraries
3. **Frontend Patterns Agent** - PersonHinzufuegenDialog analysis

### Subagents Used (Story Validation - 2025-12-19)

1. **Epics + Architecture Agent** - Epic 4 requirements extraction
2. **Previous Story 4.1 Agent** - Learnings und Patterns aus Story 4.1
3. **Codebase Pattern Agent** - Existierende Repository/Handler Patterns
4. **Frontend Component Agent** - PersonHinzufuegenDialog Integration Analysis

### Validation Fixes Applied (2025-12-19)

**Kritische Issues behoben:**
- K1: Field Name `mitgliedsnummer` → `personalnummer` (Backend-Schema-Alignment)
- K2: Factory Method Arguments korrigiert (extrahierte Felder statt ganzes Objekt)
- K3: DI Token Paths korrigiert (`KRAEFTE_REPOSITORIES.*`, `LOGGER`)
- K4: TransactionalCommandHandler super() Signatur korrigiert (2 Parameter)

**Enhancements hinzugefügt:**
- E1: Camera Lifecycle Management dokumentiert
- E2: Visual Feedback Timing spezifiziert
- E3: Dialog Size Recommendation
- E5: Keyboard Shortcut Tab-Handling

**Tasks aktualisiert:**
- Task 1.3 + 1.4: Als `[x]` markiert (existieren bereits)
- Implementation Checklist: Pre-Checks als erledigt markiert

### Completion Notes

- Story generated via `*create-story` workflow mit Subagents
- Story validated via `*validate-create-story` mit 4 parallelen Subagents
- Nutzt existing `EinsatzPerson` Aggregate und Patterns aus Story 4.1
- Nutzt existing `findByPersonalnummer()` Repository-Methode
- QR-Scanner als Tab 2 in bestehendem Dialog (nicht separater Dialog)
- Automatische Registrierung (kein Bestätigungs-Button!) per AC4
- jsqr Library empfohlen (50KB, pure JS, gute Performance)
- DRK QR-Format: `drk://person?mnr=...&vn=...&nn=...` (mnr → personalnummer mapping!)

### File List

_To be filled by Dev Agent during implementation_
