# Taktische Zeichen (DV 102) — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vollständiges taktisches Zeichensystem nach DV 102 — Katalog, Baukasten-Editor, Kräfte-Verknüpfung und Lagekarte-Integration mit Echtzeit-Sync.

**Architecture:** Eigene `TaktischesZeichen`-Entität mit hexagonaler Backend-Architektur (CQRS). Frontend-Rendering via `phjardas/taktische-zeichen` hinter Abstraktionsschicht. MapLibre Symbol-Layer getrennt von MapboxDraw. WebSocket-Sync via Outbox-Pattern.

**Tech Stack:** NestJS, Prisma, `taktische-zeichen-core`, `taktische-zeichen-react`, React 19, MapLibre GL JS, TanStack Query/Store, Tailwind CSS, Headless UI

**Spec:** `docs/superpowers/specs/2026-04-10-taktische-zeichen-design.md`

**Parallelisierung:**
- Tasks 1-6 sind sequentiell (Backend, Schema → Domain → Application → Infrastructure → Module → API-Gen)
- Task 7 (Frontend Rendering) kann **parallel** zu Tasks 2-6 laufen
- Tasks 8-10 (Frontend Katalog/Baukasten) brauchen Task 6 (API-Gen) + Task 7
- Tasks 11-12 (Karten-Integration) brauchen Task 7 + Task 8
- Task 13-14 (Kräfte-Verknüpfung) brauchen Task 5 + Task 12
- Task 15 (WebSocket) braucht Task 2 + Task 11

---

### Task 1: Prisma Schema + Migration

**Files:**
- Modify: `packages/backend/prisma/schema.prisma`

- [ ] **Step 1: TaktischesZeichen Model hinzufügen**

In `packages/backend/prisma/schema.prisma`, nach dem `Lagekarte`-Model (ca. Zeile 659), folgendes Model einfügen:

```prisma
model TaktischesZeichen {
  id                String     @id @default(cuid())
  einsatzId         String     @map("einsatz_id")
  zeichenDefinition Json       @map("zeichen_definition") @db.JsonB
  referenzTyp       String?    @map("referenz_typ") @db.VarChar(20)
  referenzId        String?    @map("referenz_id")
  lat               Float?
  lng               Float?
  mgrs              String?    @db.VarChar(20)
  lagekarteId       String?    @map("lagekarte_id")
  label             String?    @db.VarChar(200)
  notiz             String?    @db.Text
  istAusKatalog     Boolean    @default(false) @map("ist_aus_katalog")
  katalogEintragId  String?    @map("katalog_eintrag_id")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  createdBy String   @map("created_by") @db.VarChar(100)
  updatedBy String?  @map("updated_by") @db.VarChar(100)

  einsatz   Einsatz    @relation(fields: [einsatzId], references: [id], onDelete: Cascade, onUpdate: Cascade)
  lagekarte Lagekarte? @relation(fields: [lagekarteId], references: [id], onDelete: SetNull, onUpdate: Cascade)
  creator   User       @relation("TaktischesZeichenCreator", fields: [createdBy], references: [id], onDelete: NoAction, onUpdate: NoAction)
  updater   User?      @relation("TaktischesZeichenUpdater", fields: [updatedBy], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@index([einsatzId])
  @@index([lagekarteId])
  @@index([referenzTyp, referenzId])
  @@index([einsatzId, lagekarteId])
  @@index([createdBy])
  @@map("taktische_zeichen")
}
```

- [ ] **Step 2: ZeichenKatalogEintrag Model hinzufügen**

Direkt nach dem `TaktischesZeichen`-Model:

```prisma
model ZeichenKatalogEintrag {
  id                String   @id @default(cuid())
  name              String   @db.VarChar(200)
  kategorie         String   @db.VarChar(50)
  beschreibung      String?  @db.Text
  zeichenDefinition Json     @map("zeichen_definition") @db.JsonB
  tags              String[]
  sortOrder         Int      @default(0) @map("sort_order")
  istStandard       Boolean  @default(true) @map("ist_standard")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([kategorie])
  @@index([kategorie, sortOrder])
  @@map("zeichen_katalog_eintraege")
}
```

- [ ] **Step 3: FahrzeugtypZeichenDefault Model hinzufügen**

Direkt nach dem `ZeichenKatalogEintrag`-Model:

```prisma
model FahrzeugtypZeichenDefault {
  id                String @id @default(cuid())
  fahrzeugtypId     String @unique @map("fahrzeugtyp_id")
  zeichenDefinition Json   @map("zeichen_definition") @db.JsonB

  fahrzeugtyp Fahrzeugtyp @relation(fields: [fahrzeugtypId], references: [id], onDelete: Cascade, onUpdate: Cascade)

  @@map("fahrzeugtyp_zeichen_defaults")
}

model EinheitentypZeichenDefault {
  id                String @id @default(cuid())
  einheitentyp      EinsatzEinheitTyp
  zeichenDefinition Json   @map("zeichen_definition") @db.JsonB

  @@unique([einheitentyp])
  @@map("einheitentyp_zeichen_defaults")
}
```

- [ ] **Step 4: Relations auf bestehenden Models ergänzen**

Im `Einsatz`-Model, in der Relations-Sektion (nach `einheiten EinsatzEinheit[]`):

```prisma
  taktischeZeichen TaktischesZeichen[]
```

Im `Lagekarte`-Model, in der Relations-Sektion (nach `pois LagekartePoi[]`):

```prisma
  taktischeZeichen TaktischesZeichen[]
```

Im `User`-Model, zwei neue Relations ergänzen (analoges Pattern wie bestehende Creator/Updater Relations):

```prisma
  taktischeZeichenCreated  TaktischesZeichen[] @relation("TaktischesZeichenCreator")
  taktischeZeichenUpdated  TaktischesZeichen[] @relation("TaktischesZeichenUpdater")
```

Im `Fahrzeugtyp`-Model, eine neue Relation ergänzen:

```prisma
  zeichenDefault FahrzeugtypZeichenDefault?
```

- [ ] **Step 5: Migration erstellen und ausführen**

```bash
cd packages/backend && pnpm prisma:migrate --name add_taktische_zeichen
```

- [ ] **Step 6: Prisma Client generieren und TypeScript-Check**

```bash
cd packages/backend && pnpm prisma generate && pnpm exec tsc --noEmit
```

Expected: Keine Fehler.

- [ ] **Step 7: Commit**

```bash
git add packages/backend/prisma/ && git commit -m "✨(backend): Prisma Schema für taktische Zeichen (DV 102) #636"
```

---

### Task 2: Backend Domain Layer

**Files:**
- Create: `packages/backend/src/domain/taktische-zeichen/value-objects/zeichen-definition.vo.ts`
- Create: `packages/backend/src/domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate.ts`
- Create: `packages/backend/src/domain/taktische-zeichen/events/zeichen-erstellt.event.ts`
- Create: `packages/backend/src/domain/taktische-zeichen/events/zeichen-platziert.event.ts`
- Create: `packages/backend/src/domain/taktische-zeichen/events/zeichen-verschoben.event.ts`
- Create: `packages/backend/src/domain/taktische-zeichen/events/zeichen-entfernt.event.ts`
- Create: `packages/backend/src/domain/taktische-zeichen/ports/itaktisches-zeichen.repository.ts`
- Create: `packages/backend/src/domain/taktische-zeichen/ports/izeichen-katalog.repository.ts`
- Modify: `packages/backend/src/domain/events/event-names.ts`

**Referenz-Pattern:** `packages/backend/src/domain/aggregates/einsatz.aggregate.ts`, `packages/backend/src/domain/events/einsatz-created.event.ts`

- [ ] **Step 1: ZeichenDefinition Value Object**

```typescript
// packages/backend/src/domain/taktische-zeichen/value-objects/zeichen-definition.vo.ts
import { Result } from '@domain/common/result';

export interface ZeichenDefinitionProps {
  grundzeichen: string;
  organisation?: string;
  fachaufgabe?: string;
  einheit?: string;
  verwaltungsstufe?: string;
  symbol?: string;
  text?: string;
}

export class ZeichenDefinition {
  private constructor(
    public readonly grundzeichen: string,
    public readonly organisation: string | undefined,
    public readonly fachaufgabe: string | undefined,
    public readonly einheit: string | undefined,
    public readonly verwaltungsstufe: string | undefined,
    public readonly symbol: string | undefined,
    public readonly text: string | undefined,
  ) {}

  static create(props: ZeichenDefinitionProps): Result<ZeichenDefinition> {
    if (!props.grundzeichen || props.grundzeichen.trim() === '') {
      return Result.fail<ZeichenDefinition>('GRUNDZEICHEN_REQUIRED');
    }

    return Result.ok<ZeichenDefinition>(
      new ZeichenDefinition(
        props.grundzeichen.trim(),
        props.organisation?.trim() || undefined,
        props.fachaufgabe?.trim() || undefined,
        props.einheit?.trim() || undefined,
        props.verwaltungsstufe?.trim() || undefined,
        props.symbol?.trim() || undefined,
        props.text?.trim() || undefined,
      ),
    );
  }

  static fromJson(json: Record<string, unknown>): Result<ZeichenDefinition> {
    return ZeichenDefinition.create({
      grundzeichen: json.grundzeichen as string,
      organisation: json.organisation as string | undefined,
      fachaufgabe: json.fachaufgabe as string | undefined,
      einheit: json.einheit as string | undefined,
      verwaltungsstufe: json.verwaltungsstufe as string | undefined,
      symbol: json.symbol as string | undefined,
      text: json.text as string | undefined,
    });
  }

  toJson(): ZeichenDefinitionProps {
    return {
      grundzeichen: this.grundzeichen,
      ...(this.organisation && { organisation: this.organisation }),
      ...(this.fachaufgabe && { fachaufgabe: this.fachaufgabe }),
      ...(this.einheit && { einheit: this.einheit }),
      ...(this.verwaltungsstufe && { verwaltungsstufe: this.verwaltungsstufe }),
      ...(this.symbol && { symbol: this.symbol }),
      ...(this.text && { text: this.text }),
    };
  }

  equals(other: ZeichenDefinition): boolean {
    return (
      this.grundzeichen === other.grundzeichen &&
      this.organisation === other.organisation &&
      this.fachaufgabe === other.fachaufgabe &&
      this.einheit === other.einheit &&
      this.verwaltungsstufe === other.verwaltungsstufe &&
      this.symbol === other.symbol &&
      this.text === other.text
    );
  }
}
```

- [ ] **Step 2: Event Names registrieren**

In `packages/backend/src/domain/events/event-names.ts`, im `EVENT_NAMES`-Objekt, neuen Block hinzufügen:

```typescript
  TAKTISCHES_ZEICHEN: {
    ERSTELLT: 'taktisches_zeichen.erstellt',
    PLATZIERT: 'taktisches_zeichen.platziert',
    VERSCHOBEN: 'taktisches_zeichen.verschoben',
    AKTUALISIERT: 'taktisches_zeichen.aktualisiert',
    ENTFERNT: 'taktisches_zeichen.entfernt',
  },
```

- [ ] **Step 3: Domain Events erstellen**

```typescript
// packages/backend/src/domain/taktische-zeichen/events/zeichen-erstellt.event.ts
import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { ZeichenDefinitionProps } from '../value-objects/zeichen-definition.vo';

export class ZeichenErstelltEvent extends DomainEvent {
  constructor(
    public readonly zeichenId: string,
    public readonly einsatzId: string,
    public readonly zeichenDefinition: ZeichenDefinitionProps,
    public readonly label: string | undefined,
    public readonly referenzTyp: string | undefined,
    public readonly referenzId: string | undefined,
    public readonly createdBy: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.TAKTISCHES_ZEICHEN.ERSTELLT;
  }
}
```

```typescript
// packages/backend/src/domain/taktische-zeichen/events/zeichen-platziert.event.ts
import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

export class ZeichenPlatziertEvent extends DomainEvent {
  constructor(
    public readonly zeichenId: string,
    public readonly einsatzId: string,
    public readonly lagekarteId: string,
    public readonly lat: number,
    public readonly lng: number,
    public readonly mgrs: string | undefined,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.TAKTISCHES_ZEICHEN.PLATZIERT;
  }
}
```

```typescript
// packages/backend/src/domain/taktische-zeichen/events/zeichen-verschoben.event.ts
import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

export class ZeichenVerschobenEvent extends DomainEvent {
  constructor(
    public readonly zeichenId: string,
    public readonly einsatzId: string,
    public readonly lat: number,
    public readonly lng: number,
    public readonly mgrs: string | undefined,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.TAKTISCHES_ZEICHEN.VERSCHOBEN;
  }
}
```

```typescript
// packages/backend/src/domain/taktische-zeichen/events/zeichen-entfernt.event.ts
import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

export class ZeichenEntferntEvent extends DomainEvent {
  constructor(
    public readonly zeichenId: string,
    public readonly einsatzId: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.TAKTISCHES_ZEICHEN.ENTFERNT;
  }
}
```

- [ ] **Step 4: TaktischesZeichen Aggregate**

```typescript
// packages/backend/src/domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate.ts
import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { ZeichenDefinition } from '../value-objects/zeichen-definition.vo';
import type { ZeichenDefinitionProps } from '../value-objects/zeichen-definition.vo';
import { ZeichenErstelltEvent } from '../events/zeichen-erstellt.event';
import { ZeichenPlatziertEvent } from '../events/zeichen-platziert.event';
import { ZeichenVerschobenEvent } from '../events/zeichen-verschoben.event';
import { ZeichenEntferntEvent } from '../events/zeichen-entfernt.event';

export type ReferenzTyp = 'EINHEIT' | 'FAHRZEUG' | 'ROLLE';

export interface TaktischesZeichenCreateProps {
  id: string;
  einsatzId: string;
  zeichenDefinition: ZeichenDefinitionProps;
  referenzTyp?: ReferenzTyp;
  referenzId?: string;
  label?: string;
  notiz?: string;
  istAusKatalog?: boolean;
  katalogEintragId?: string;
  createdBy: string;
}

export interface TaktischesZeichenReconstitutionProps {
  id: string;
  einsatzId: string;
  zeichenDefinition: ZeichenDefinition;
  referenzTyp?: ReferenzTyp;
  referenzId?: string;
  lat?: number;
  lng?: number;
  mgrs?: string;
  lagekarteId?: string;
  label?: string;
  notiz?: string;
  istAusKatalog: boolean;
  katalogEintragId?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
}

export class TaktischesZeichen extends AggregateRoot<string> {
  private _einsatzId: string;
  private _zeichenDefinition: ZeichenDefinition;
  private _referenzTyp?: ReferenzTyp;
  private _referenzId?: string;
  private _lat?: number;
  private _lng?: number;
  private _mgrs?: string;
  private _lagekarteId?: string;
  private _label?: string;
  private _notiz?: string;
  private _istAusKatalog: boolean;
  private _katalogEintragId?: string;
  private _createdAt: Date;
  private _createdBy: string;
  private _updatedAt: Date;
  private _updatedBy?: string;

  private constructor(id: string) {
    super(id);
  }

  // Getters
  get einsatzId(): string { return this._einsatzId; }
  get zeichenDefinition(): ZeichenDefinition { return this._zeichenDefinition; }
  get referenzTyp(): ReferenzTyp | undefined { return this._referenzTyp; }
  get referenzId(): string | undefined { return this._referenzId; }
  get lat(): number | undefined { return this._lat; }
  get lng(): number | undefined { return this._lng; }
  get mgrs(): string | undefined { return this._mgrs; }
  get lagekarteId(): string | undefined { return this._lagekarteId; }
  get label(): string | undefined { return this._label; }
  get notiz(): string | undefined { return this._notiz; }
  get istAusKatalog(): boolean { return this._istAusKatalog; }
  get katalogEintragId(): string | undefined { return this._katalogEintragId; }
  get createdAt(): Date { return this._createdAt; }
  get createdBy(): string { return this._createdBy; }
  get updatedAt(): Date { return this._updatedAt; }
  get updatedBy(): string | undefined { return this._updatedBy; }
  get istPlatziert(): boolean { return this._lat !== undefined && this._lng !== undefined; }

  static create(props: TaktischesZeichenCreateProps): Result<TaktischesZeichen> {
    const definitionResult = ZeichenDefinition.create(props.zeichenDefinition);
    if (definitionResult.isFailure || !definitionResult.value) {
      return Result.fail<TaktischesZeichen>(definitionResult.error ?? 'ZEICHEN_DEFINITION_INVALID');
    }

    if (props.referenzTyp && !props.referenzId) {
      return Result.fail<TaktischesZeichen>('REFERENZ_ID_REQUIRED_WITH_TYP');
    }

    const zeichen = new TaktischesZeichen(props.id);
    zeichen._einsatzId = props.einsatzId;
    zeichen._zeichenDefinition = definitionResult.value;
    zeichen._referenzTyp = props.referenzTyp;
    zeichen._referenzId = props.referenzId;
    zeichen._label = props.label?.trim() || undefined;
    zeichen._notiz = props.notiz?.trim() || undefined;
    zeichen._istAusKatalog = props.istAusKatalog ?? false;
    zeichen._katalogEintragId = props.katalogEintragId;
    zeichen._createdAt = new Date();
    zeichen._createdBy = props.createdBy;
    zeichen._updatedAt = new Date();

    zeichen.addDomainEvent(
      new ZeichenErstelltEvent(
        props.id,
        props.einsatzId,
        definitionResult.value.toJson(),
        zeichen._label,
        props.referenzTyp,
        props.referenzId,
        props.createdBy,
        props.id,
      ),
    );

    return Result.ok<TaktischesZeichen>(zeichen);
  }

  static reconstitute(props: TaktischesZeichenReconstitutionProps): TaktischesZeichen {
    const zeichen = new TaktischesZeichen(props.id);
    zeichen._einsatzId = props.einsatzId;
    zeichen._zeichenDefinition = props.zeichenDefinition;
    zeichen._referenzTyp = props.referenzTyp;
    zeichen._referenzId = props.referenzId;
    zeichen._lat = props.lat;
    zeichen._lng = props.lng;
    zeichen._mgrs = props.mgrs;
    zeichen._lagekarteId = props.lagekarteId;
    zeichen._label = props.label;
    zeichen._notiz = props.notiz;
    zeichen._istAusKatalog = props.istAusKatalog;
    zeichen._katalogEintragId = props.katalogEintragId;
    zeichen._createdAt = props.createdAt;
    zeichen._createdBy = props.createdBy;
    zeichen._updatedAt = props.updatedAt;
    zeichen._updatedBy = props.updatedBy;
    return zeichen;
  }

  platziere(lagekarteId: string, lat: number, lng: number, mgrs?: string, updatedBy?: string): Result<void> {
    this._lagekarteId = lagekarteId;
    this._lat = lat;
    this._lng = lng;
    this._mgrs = mgrs;
    this._updatedAt = new Date();
    this._updatedBy = updatedBy;

    this.addDomainEvent(
      new ZeichenPlatziertEvent(this.id, this._einsatzId, lagekarteId, lat, lng, mgrs, this.id),
    );

    return Result.ok<void>(undefined);
  }

  verschiebe(lat: number, lng: number, mgrs?: string, updatedBy?: string): Result<void> {
    if (!this.istPlatziert) {
      return Result.fail<void>('ZEICHEN_NICHT_PLATZIERT');
    }

    this._lat = lat;
    this._lng = lng;
    this._mgrs = mgrs;
    this._updatedAt = new Date();
    this._updatedBy = updatedBy;

    this.addDomainEvent(
      new ZeichenVerschobenEvent(this.id, this._einsatzId, lat, lng, mgrs, this.id),
    );

    return Result.ok<void>(undefined);
  }

  aktualisiere(props: {
    zeichenDefinition?: ZeichenDefinitionProps;
    label?: string | null;
    notiz?: string | null;
    updatedBy: string;
  }): Result<void> {
    if (props.zeichenDefinition) {
      const defResult = ZeichenDefinition.create(props.zeichenDefinition);
      if (defResult.isFailure || !defResult.value) {
        return Result.fail<void>(defResult.error ?? 'ZEICHEN_DEFINITION_INVALID');
      }
      this._zeichenDefinition = defResult.value;
    }

    if (props.label !== undefined) {
      this._label = props.label?.trim() || undefined;
    }
    if (props.notiz !== undefined) {
      this._notiz = props.notiz?.trim() || undefined;
    }

    this._updatedAt = new Date();
    this._updatedBy = props.updatedBy;
    return Result.ok<void>(undefined);
  }

  entferneVonKarte(updatedBy?: string): Result<void> {
    if (!this.istPlatziert) {
      return Result.fail<void>('ZEICHEN_NICHT_PLATZIERT');
    }

    this._lat = undefined;
    this._lng = undefined;
    this._mgrs = undefined;
    this._lagekarteId = undefined;
    this._updatedAt = new Date();
    this._updatedBy = updatedBy;

    return Result.ok<void>(undefined);
  }
}
```

- [ ] **Step 5: Repository Ports**

```typescript
// packages/backend/src/domain/taktische-zeichen/ports/itaktisches-zeichen.repository.ts
import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction-context';
import type { TaktischesZeichen } from '../aggregates/taktisches-zeichen.aggregate';

export interface ITaktischesZeichenRepository {
  save(zeichen: TaktischesZeichen, tx?: TransactionContext): Promise<Result<void>>;
  findById(id: string): Promise<Result<TaktischesZeichen | null>>;
  findByEinsatzId(einsatzId: string): Promise<Result<TaktischesZeichen[]>>;
  findByLagekarteId(lagekarteId: string): Promise<Result<TaktischesZeichen[]>>;
  delete(id: string, tx?: TransactionContext): Promise<Result<void>>;
}
```

```typescript
// packages/backend/src/domain/taktische-zeichen/ports/izeichen-katalog.repository.ts
import type { Result } from '@domain/common/result';

export interface ZeichenKatalogEintragData {
  id: string;
  name: string;
  kategorie: string;
  beschreibung?: string;
  zeichenDefinition: Record<string, unknown>;
  tags: string[];
  sortOrder: number;
  istStandard: boolean;
}

export interface IZeichenKatalogRepository {
  findAll(): Promise<Result<ZeichenKatalogEintragData[]>>;
  findByKategorie(kategorie: string): Promise<Result<ZeichenKatalogEintragData[]>>;
  search(suchbegriff: string): Promise<Result<ZeichenKatalogEintragData[]>>;
}
```

- [ ] **Step 6: TypeScript-Check**

```bash
cd packages/backend && pnpm exec tsc --noEmit
```

Expected: Keine Fehler.

- [ ] **Step 7: Commit**

```bash
git add packages/backend/src/domain/taktische-zeichen/ packages/backend/src/domain/events/event-names.ts && git commit -m "✨(backend): Domain Layer für taktische Zeichen — Aggregate, Events, Ports #636"
```

---

### Task 3: Backend Application Layer

**Files:**
- Create: `packages/backend/src/application/taktische-zeichen/commands/erstelle-zeichen/erstelle-zeichen.command.ts`
- Create: `packages/backend/src/application/taktische-zeichen/commands/erstelle-zeichen/erstelle-zeichen.handler.ts`
- Create: `packages/backend/src/application/taktische-zeichen/commands/platziere-zeichen/platziere-zeichen.command.ts`
- Create: `packages/backend/src/application/taktische-zeichen/commands/platziere-zeichen/platziere-zeichen.handler.ts`
- Create: `packages/backend/src/application/taktische-zeichen/commands/verschiebe-zeichen/verschiebe-zeichen.command.ts`
- Create: `packages/backend/src/application/taktische-zeichen/commands/verschiebe-zeichen/verschiebe-zeichen.handler.ts`
- Create: `packages/backend/src/application/taktische-zeichen/commands/aktualisiere-zeichen/aktualisiere-zeichen.command.ts`
- Create: `packages/backend/src/application/taktische-zeichen/commands/aktualisiere-zeichen/aktualisiere-zeichen.handler.ts`
- Create: `packages/backend/src/application/taktische-zeichen/commands/entferne-zeichen/entferne-zeichen.command.ts`
- Create: `packages/backend/src/application/taktische-zeichen/commands/entferne-zeichen/entferne-zeichen.handler.ts`
- Create: `packages/backend/src/application/taktische-zeichen/queries/finde-zeichen-fuer-einsatz/finde-zeichen-fuer-einsatz.query.ts`
- Create: `packages/backend/src/application/taktische-zeichen/queries/finde-zeichen-fuer-einsatz/finde-zeichen-fuer-einsatz.handler.ts`
- Create: `packages/backend/src/application/taktische-zeichen/queries/finde-zeichen-fuer-lagekarte/finde-zeichen-fuer-lagekarte.query.ts`
- Create: `packages/backend/src/application/taktische-zeichen/queries/finde-zeichen-fuer-lagekarte/finde-zeichen-fuer-lagekarte.handler.ts`
- Create: `packages/backend/src/application/taktische-zeichen/queries/finde-katalog-eintraege/finde-katalog-eintraege.query.ts`
- Create: `packages/backend/src/application/taktische-zeichen/queries/finde-katalog-eintraege/finde-katalog-eintraege.handler.ts`
- Create: `packages/backend/src/application/taktische-zeichen/queries/finde-default-zeichen/finde-default-zeichen.query.ts`
- Create: `packages/backend/src/application/taktische-zeichen/queries/finde-default-zeichen/finde-default-zeichen.handler.ts`
- Create: `packages/backend/src/application/taktische-zeichen/dtos/taktisches-zeichen-response.dto.ts`
- Create: `packages/backend/src/application/taktische-zeichen/dtos/zeichen-katalog-eintrag-response.dto.ts`
- Create: `packages/backend/src/application/taktische-zeichen/factories/taktisches-zeichen-response.factory.ts`

**Referenz-Pattern:** `packages/backend/src/application/notiz/commands/create-notiz/` (Command + Handler), `packages/backend/src/application/notiz/queries/get-notizen-by-einsatz/` (Query + Handler)

- [ ] **Step 1: Response DTOs erstellen**

```typescript
// packages/backend/src/application/taktische-zeichen/dtos/taktisches-zeichen-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ZeichenDefinitionDto {
  @ApiProperty({ description: 'Grundzeichen (z.B. "kraftfahrzeug-gelaendegaengig")' })
  grundzeichen: string;

  @ApiPropertyOptional({ description: 'Organisation (z.B. "feuerwehr")' })
  organisation?: string;

  @ApiPropertyOptional({ description: 'Fachaufgabe (z.B. "brandbekaempfung")' })
  fachaufgabe?: string;

  @ApiPropertyOptional({ description: 'Einheitsgröße (z.B. "gruppe")' })
  einheit?: string;

  @ApiPropertyOptional({ description: 'Verwaltungsstufe (z.B. "kreis")' })
  verwaltungsstufe?: string;

  @ApiPropertyOptional({ description: 'Symbol-ID aus den 84 DV 102 Symbolen' })
  symbol?: string;

  @ApiPropertyOptional({ description: 'Freitext-Beschriftung' })
  text?: string;
}

export class TaktischesZeichenResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() einsatzId: string;
  @ApiProperty({ type: ZeichenDefinitionDto }) zeichenDefinition: ZeichenDefinitionDto;
  @ApiPropertyOptional() referenzTyp?: string;
  @ApiPropertyOptional() referenzId?: string;
  @ApiPropertyOptional() lat?: number;
  @ApiPropertyOptional() lng?: number;
  @ApiPropertyOptional() mgrs?: string;
  @ApiPropertyOptional() lagekarteId?: string;
  @ApiPropertyOptional() label?: string;
  @ApiPropertyOptional() notiz?: string;
  @ApiProperty() istAusKatalog: boolean;
  @ApiPropertyOptional() katalogEintragId?: string;
  @ApiProperty() istPlatziert: boolean;
  @ApiProperty() createdAt: string;
  @ApiProperty() createdBy: string;
  @ApiProperty() updatedAt: string;
  @ApiPropertyOptional() updatedBy?: string;
}
```

```typescript
// packages/backend/src/application/taktische-zeichen/dtos/zeichen-katalog-eintrag-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ZeichenDefinitionDto } from './taktisches-zeichen-response.dto';

export class ZeichenKatalogEintragResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() kategorie: string;
  @ApiPropertyOptional() beschreibung?: string;
  @ApiProperty({ type: ZeichenDefinitionDto }) zeichenDefinition: ZeichenDefinitionDto;
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty() sortOrder: number;
  @ApiProperty() istStandard: boolean;
}
```

- [ ] **Step 2: Response Factory**

```typescript
// packages/backend/src/application/taktische-zeichen/factories/taktisches-zeichen-response.factory.ts
import { Injectable } from '@nestjs/common';
import type { TaktischesZeichen } from '@domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate';
import { TaktischesZeichenResponseDto } from '../dtos/taktisches-zeichen-response.dto';

@Injectable()
export class TaktischesZeichenResponseFactory {
  create(zeichen: TaktischesZeichen): TaktischesZeichenResponseDto {
    const dto = new TaktischesZeichenResponseDto();
    dto.id = zeichen.id;
    dto.einsatzId = zeichen.einsatzId;
    dto.zeichenDefinition = zeichen.zeichenDefinition.toJson();
    dto.referenzTyp = zeichen.referenzTyp;
    dto.referenzId = zeichen.referenzId;
    dto.lat = zeichen.lat;
    dto.lng = zeichen.lng;
    dto.mgrs = zeichen.mgrs;
    dto.lagekarteId = zeichen.lagekarteId;
    dto.label = zeichen.label;
    dto.notiz = zeichen.notiz;
    dto.istAusKatalog = zeichen.istAusKatalog;
    dto.katalogEintragId = zeichen.katalogEintragId;
    dto.istPlatziert = zeichen.istPlatziert;
    dto.createdAt = zeichen.createdAt.toISOString();
    dto.createdBy = zeichen.createdBy;
    dto.updatedAt = zeichen.updatedAt.toISOString();
    dto.updatedBy = zeichen.updatedBy;
    return dto;
  }
}
```

- [ ] **Step 3: ErstelleZeichen Command + Handler**

```typescript
// packages/backend/src/application/taktische-zeichen/commands/erstelle-zeichen/erstelle-zeichen.command.ts
import { Result } from '@domain/common/result';
import type { ZeichenDefinitionProps } from '@domain/taktische-zeichen/value-objects/zeichen-definition.vo';
import type { ReferenzTyp } from '@domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate';

export interface ErstelleZeichenCommandProps {
  einsatzId: string;
  zeichenDefinition: ZeichenDefinitionProps;
  referenzTyp?: ReferenzTyp;
  referenzId?: string;
  label?: string;
  notiz?: string;
  istAusKatalog?: boolean;
  katalogEintragId?: string;
  erstelltVon: string;
}

export class ErstelleZeichenCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly zeichenDefinition: ZeichenDefinitionProps,
    public readonly referenzTyp: ReferenzTyp | undefined,
    public readonly referenzId: string | undefined,
    public readonly label: string | undefined,
    public readonly notiz: string | undefined,
    public readonly istAusKatalog: boolean,
    public readonly katalogEintragId: string | undefined,
    public readonly erstelltVon: string,
  ) {}

  static create(props: ErstelleZeichenCommandProps): Result<ErstelleZeichenCommand> {
    if (!props.einsatzId?.trim()) {
      return Result.fail<ErstelleZeichenCommand>('EINSATZ_ID_REQUIRED');
    }
    if (!props.zeichenDefinition?.grundzeichen?.trim()) {
      return Result.fail<ErstelleZeichenCommand>('GRUNDZEICHEN_REQUIRED');
    }
    if (!props.erstelltVon?.trim()) {
      return Result.fail<ErstelleZeichenCommand>('ERSTELLT_VON_REQUIRED');
    }

    return Result.ok<ErstelleZeichenCommand>(
      new ErstelleZeichenCommand(
        props.einsatzId.trim(),
        props.zeichenDefinition,
        props.referenzTyp,
        props.referenzId,
        props.label,
        props.notiz,
        props.istAusKatalog ?? false,
        props.katalogEintragId,
        props.erstelltVon.trim(),
      ),
    );
  }
}
```

```typescript
// packages/backend/src/application/taktische-zeichen/commands/erstelle-zeichen/erstelle-zeichen.handler.ts
import { Inject, Injectable } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command-handler';
import type { TransactionContext } from '@domain/common/transaction-context';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { TaktischesZeichen } from '@domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import type { IOutboxRepository } from '@domain/common/ports/ioutbox.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/common/ports/ilogger';
import { TAKTISCHE_ZEICHEN_REPOSITORY } from './../../di-tokens';
import { TaktischesZeichenResponseFactory } from '../../factories/taktisches-zeichen-response.factory';
import type { TaktischesZeichenResponseDto } from '../../dtos/taktisches-zeichen-response.dto';
import type { ErstelleZeichenCommand } from './erstelle-zeichen.command';

@Injectable()
export class ErstelleZeichenHandler extends TransactionalCommandHandler<ErstelleZeichenCommand, TaktischesZeichenResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(TAKTISCHE_ZEICHEN_REPOSITORY)
    private readonly zeichenRepository: ITaktischesZeichenRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly responseFactory: TaktischesZeichenResponseFactory,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: ErstelleZeichenCommand,
    tx: TransactionContext,
  ): Promise<Result<TaktischesZeichenResponseDto> | { result: TaktischesZeichenResponseDto; events: DomainEvent[] }> {
    const zeichenResult = TaktischesZeichen.create({
      id: createId(),
      einsatzId: command.einsatzId,
      zeichenDefinition: command.zeichenDefinition,
      referenzTyp: command.referenzTyp,
      referenzId: command.referenzId,
      label: command.label,
      notiz: command.notiz,
      istAusKatalog: command.istAusKatalog,
      katalogEintragId: command.katalogEintragId,
      createdBy: command.erstelltVon,
    });

    if (zeichenResult.isFailure || !zeichenResult.value) {
      return Result.fail<TaktischesZeichenResponseDto>(zeichenResult.error ?? 'ZEICHEN_CREATION_FAILED');
    }

    const zeichen = zeichenResult.value;
    await this.zeichenRepository.save(zeichen, tx);

    const events = zeichen.getDomainEvents();
    zeichen.clearDomainEvents();

    this.logger.log(`Taktisches Zeichen erstellt: ${zeichen.id}`, 'ErstelleZeichenHandler');

    return {
      result: this.responseFactory.create(zeichen),
      events,
    };
  }
}
```

- [ ] **Step 4: Weitere Commands + Handler erstellen**

Erstelle folgende Command/Handler-Paare nach dem gleichen Pattern wie Step 3:

**PlatziereZeichen** (`commands/platziere-zeichen/`):
- Command: `einsatzId`, `zeichenId`, `lagekarteId`, `lat`, `lng`, `mgrs?`, `platziertVon`
- Handler: Lädt Zeichen via Repository, ruft `zeichen.platziere()`, speichert, gibt Events zurück

**VerschiebeZeichen** (`commands/verschiebe-zeichen/`):
- Command: `einsatzId`, `zeichenId`, `lat`, `lng`, `mgrs?`, `verschobenVon`
- Handler: Lädt Zeichen, ruft `zeichen.verschiebe()`, speichert, gibt Events zurück

**AktualisiereZeichen** (`commands/aktualisiere-zeichen/`):
- Command: `einsatzId`, `zeichenId`, `zeichenDefinition?`, `label?`, `notiz?`, `aktualisiertVon`
- Handler: Lädt Zeichen, ruft `zeichen.aktualisiere()`, speichert

**EntferneZeichen** (`commands/entferne-zeichen/`):
- Command: `einsatzId`, `zeichenId`, `entferntVon`
- Handler: Lädt Zeichen, ruft Repository `delete()`, emittiert `ZeichenEntferntEvent`

Für jede Datei: Folge exakt dem Pattern aus Step 3 mit dem jeweiligen `TransactionalCommandHandler<TCommand, TResult>`.

- [ ] **Step 5: Queries + Handler erstellen**

```typescript
// packages/backend/src/application/taktische-zeichen/queries/finde-zeichen-fuer-einsatz/finde-zeichen-fuer-einsatz.query.ts
import { Result } from '@domain/common/result';

export class FindeZeichenFuerEinsatzQuery {
  private constructor(public readonly einsatzId: string) {}

  static create(props: { einsatzId: string }): Result<FindeZeichenFuerEinsatzQuery> {
    if (!props.einsatzId?.trim()) {
      return Result.fail<FindeZeichenFuerEinsatzQuery>('EINSATZ_ID_REQUIRED');
    }
    return Result.ok<FindeZeichenFuerEinsatzQuery>(new FindeZeichenFuerEinsatzQuery(props.einsatzId.trim()));
  }
}
```

```typescript
// packages/backend/src/application/taktische-zeichen/queries/finde-zeichen-fuer-einsatz/finde-zeichen-fuer-einsatz.handler.ts
import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import { TAKTISCHE_ZEICHEN_REPOSITORY } from '../../di-tokens';
import { TaktischesZeichenResponseFactory } from '../../factories/taktisches-zeichen-response.factory';
import type { TaktischesZeichenResponseDto } from '../../dtos/taktisches-zeichen-response.dto';
import type { FindeZeichenFuerEinsatzQuery } from './finde-zeichen-fuer-einsatz.query';

@Injectable()
export class FindeZeichenFuerEinsatzHandler {
  constructor(
    @Inject(TAKTISCHE_ZEICHEN_REPOSITORY)
    private readonly zeichenRepository: ITaktischesZeichenRepository,
    private readonly responseFactory: TaktischesZeichenResponseFactory,
  ) {}

  async execute(query: FindeZeichenFuerEinsatzQuery): Promise<Result<TaktischesZeichenResponseDto[]>> {
    const result = await this.zeichenRepository.findByEinsatzId(query.einsatzId);
    if (result.isFailure) {
      return Result.fail<TaktischesZeichenResponseDto[]>(result.error ?? 'QUERY_FAILED');
    }

    const dtos = (result.value ?? []).map((z) => this.responseFactory.create(z));
    return Result.ok<TaktischesZeichenResponseDto[]>(dtos);
  }
}
```

Erstelle analog:
- **FindeZeichenFuerLagekarte** — nutzt `findByLagekarteId()`
- **FindeKatalogEintraege** — nutzt `IZeichenKatalogRepository.findAll()` / `findByKategorie()` / `search()`, mit optionalen Query-Params `kategorie?`, `suche?`
- **FindeDefaultZeichen** — liest `FahrzeugtypZeichenDefault` und `EinheitentypZeichenDefault` Tabellen direkt via PrismaService (kein Aggregate nötig)

- [ ] **Step 6: DI Tokens für taktische Zeichen**

```typescript
// packages/backend/src/application/taktische-zeichen/di-tokens.ts
export const TAKTISCHE_ZEICHEN_REPOSITORY = Symbol('ITaktischesZeichenRepository');
export const ZEICHEN_KATALOG_REPOSITORY = Symbol('IZeichenKatalogRepository');
```

- [ ] **Step 7: TypeScript-Check**

```bash
cd packages/backend && pnpm exec tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add packages/backend/src/application/taktische-zeichen/ && git commit -m "✨(backend): Application Layer für taktische Zeichen — Commands, Queries, Handlers #636"
```

---

### Task 4: Backend Infrastructure Layer

**Files:**
- Create: `packages/backend/src/infrastructure/taktische-zeichen/repositories/prisma-taktisches-zeichen.repository.ts`
- Create: `packages/backend/src/infrastructure/taktische-zeichen/repositories/prisma-taktisches-zeichen.mapper.ts`
- Create: `packages/backend/src/infrastructure/taktische-zeichen/repositories/prisma-zeichen-katalog.repository.ts`
- Create: `packages/backend/src/infrastructure/taktische-zeichen/taktische-zeichen-infrastructure.module.ts`
- Modify: `packages/backend/prisma/seed.ts`

**Referenz-Pattern:** `packages/backend/src/infrastructure/einsatz/repositories/prisma-einsatz.repository.ts`

- [ ] **Step 1: Prisma Mapper**

```typescript
// packages/backend/src/infrastructure/taktische-zeichen/repositories/prisma-taktisches-zeichen.mapper.ts
import type { TaktischesZeichen as PrismaTaktischesZeichen } from '@/generated/prisma/client';
import { TaktischesZeichen } from '@domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate';
import type { ReferenzTyp } from '@domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate';
import { ZeichenDefinition } from '@domain/taktische-zeichen/value-objects/zeichen-definition.vo';

export class PrismaTaktischesZeichenMapper {
  static toDomain(data: PrismaTaktischesZeichen): TaktischesZeichen {
    const defResult = ZeichenDefinition.fromJson(data.zeichenDefinition as Record<string, unknown>);
    if (defResult.isFailure || !defResult.value) {
      throw new Error(`Ungültige ZeichenDefinition in DB für ID ${data.id}`);
    }

    return TaktischesZeichen.reconstitute({
      id: data.id,
      einsatzId: data.einsatzId,
      zeichenDefinition: defResult.value,
      referenzTyp: data.referenzTyp as ReferenzTyp | undefined,
      referenzId: data.referenzId ?? undefined,
      lat: data.lat ?? undefined,
      lng: data.lng ?? undefined,
      mgrs: data.mgrs ?? undefined,
      lagekarteId: data.lagekarteId ?? undefined,
      label: data.label ?? undefined,
      notiz: data.notiz ?? undefined,
      istAusKatalog: data.istAusKatalog,
      katalogEintragId: data.katalogEintragId ?? undefined,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy ?? undefined,
    });
  }

  static toPersistence(zeichen: TaktischesZeichen) {
    return {
      id: zeichen.id,
      einsatzId: zeichen.einsatzId,
      zeichenDefinition: zeichen.zeichenDefinition.toJson(),
      referenzTyp: zeichen.referenzTyp ?? null,
      referenzId: zeichen.referenzId ?? null,
      lat: zeichen.lat ?? null,
      lng: zeichen.lng ?? null,
      mgrs: zeichen.mgrs ?? null,
      lagekarteId: zeichen.lagekarteId ?? null,
      label: zeichen.label ?? null,
      notiz: zeichen.notiz ?? null,
      istAusKatalog: zeichen.istAusKatalog,
      katalogEintragId: zeichen.katalogEintragId ?? null,
      createdBy: zeichen.createdBy,
      updatedBy: zeichen.updatedBy ?? null,
    };
  }
}
```

- [ ] **Step 2: TaktischesZeichen Repository Implementation**

```typescript
// packages/backend/src/infrastructure/taktische-zeichen/repositories/prisma-taktisches-zeichen.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction-context';
import type { PrismaTransactionClient } from '@infrastructure/database/prisma.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { LOGGER } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/common/ports/ilogger';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import type { TaktischesZeichen } from '@domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate';
import { PrismaTaktischesZeichenMapper } from './prisma-taktisches-zeichen.mapper';

@Injectable()
export class PrismaTaktischesZeichenRepository implements ITaktischesZeichenRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async save(zeichen: TaktischesZeichen, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
      const data = PrismaTaktischesZeichenMapper.toPersistence(zeichen);

      await client.taktischesZeichen.upsert({
        where: { id: data.id },
        create: data,
        update: {
          zeichenDefinition: data.zeichenDefinition,
          referenzTyp: data.referenzTyp,
          referenzId: data.referenzId,
          lat: data.lat,
          lng: data.lng,
          mgrs: data.mgrs,
          lagekarteId: data.lagekarteId,
          label: data.label,
          notiz: data.notiz,
          updatedBy: data.updatedBy,
        },
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      this.logger.error(`Failed to save TaktischesZeichen: ${error}`, 'PrismaTaktischesZeichenRepository');
      return Result.fail<void>(`Database error: ${error}`);
    }
  }

  async findById(id: string): Promise<Result<TaktischesZeichen | null>> {
    try {
      const data = await this.prisma.taktischesZeichen.findUnique({ where: { id } });
      if (!data) return Result.ok<TaktischesZeichen | null>(null);
      return Result.ok<TaktischesZeichen>(PrismaTaktischesZeichenMapper.toDomain(data));
    } catch (error) {
      this.logger.error(`Failed to find TaktischesZeichen: ${error}`, 'PrismaTaktischesZeichenRepository');
      return Result.fail<TaktischesZeichen | null>(`Database error: ${error}`);
    }
  }

  async findByEinsatzId(einsatzId: string): Promise<Result<TaktischesZeichen[]>> {
    try {
      const data = await this.prisma.taktischesZeichen.findMany({
        where: { einsatzId },
        orderBy: { createdAt: 'asc' },
      });
      return Result.ok<TaktischesZeichen[]>(data.map(PrismaTaktischesZeichenMapper.toDomain));
    } catch (error) {
      this.logger.error(`Failed to find TaktischeZeichen für Einsatz: ${error}`, 'PrismaTaktischesZeichenRepository');
      return Result.fail<TaktischesZeichen[]>(`Database error: ${error}`);
    }
  }

  async findByLagekarteId(lagekarteId: string): Promise<Result<TaktischesZeichen[]>> {
    try {
      const data = await this.prisma.taktischesZeichen.findMany({
        where: { lagekarteId },
        orderBy: { createdAt: 'asc' },
      });
      return Result.ok<TaktischesZeichen[]>(data.map(PrismaTaktischesZeichenMapper.toDomain));
    } catch (error) {
      this.logger.error(`Failed to find TaktischeZeichen für Lagekarte: ${error}`, 'PrismaTaktischesZeichenRepository');
      return Result.fail<TaktischesZeichen[]>(`Database error: ${error}`);
    }
  }

  async delete(id: string, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
      await client.taktischesZeichen.delete({ where: { id } });
      return Result.ok<void>(undefined);
    } catch (error) {
      this.logger.error(`Failed to delete TaktischesZeichen: ${error}`, 'PrismaTaktischesZeichenRepository');
      return Result.fail<void>(`Database error: ${error}`);
    }
  }
}
```

- [ ] **Step 3: Katalog Repository Implementation**

Erstelle `packages/backend/src/infrastructure/taktische-zeichen/repositories/prisma-zeichen-katalog.repository.ts` nach dem gleichen Pattern. Implementiert `IZeichenKatalogRepository` mit:
- `findAll()`: `findMany({ orderBy: [{ kategorie: 'asc' }, { sortOrder: 'asc' }] })`
- `findByKategorie(kategorie)`: `findMany({ where: { kategorie } })`
- `search(suchbegriff)`: `findMany({ where: { OR: [{ name: { contains: suchbegriff, mode: 'insensitive' } }, { tags: { has: suchbegriff } }] } })`

- [ ] **Step 4: Infrastructure Module**

```typescript
// packages/backend/src/infrastructure/taktische-zeichen/taktische-zeichen-infrastructure.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/logging/nest-logger.adapter';
import { TAKTISCHE_ZEICHEN_REPOSITORY, ZEICHEN_KATALOG_REPOSITORY } from '@application/taktische-zeichen/di-tokens';
import { PrismaTaktischesZeichenRepository } from './repositories/prisma-taktisches-zeichen.repository';
import { PrismaZeichenKatalogRepository } from './repositories/prisma-zeichen-katalog.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('TaktischeZeichenInfrastructure'),
    },
    {
      provide: TAKTISCHE_ZEICHEN_REPOSITORY,
      useClass: PrismaTaktischesZeichenRepository,
    },
    {
      provide: ZEICHEN_KATALOG_REPOSITORY,
      useClass: PrismaZeichenKatalogRepository,
    },
  ],
  exports: [TAKTISCHE_ZEICHEN_REPOSITORY, ZEICHEN_KATALOG_REPOSITORY],
})
export class TaktischeZeichenInfrastructureModule {}
```

- [ ] **Step 5: Seed-Daten für Katalog**

In `packages/backend/prisma/seed.ts`, eine neue Funktion `seedZeichenKatalog(systemUserId: string)` hinzufügen und aus `main()` aufrufen. Die Seed-Daten definieren ~60 Katalog-Einträge in Kategorien. Beispielstruktur:

```typescript
async function seedZeichenKatalog(): Promise<void> {
  logger.log('Erstelle Zeichen-Katalog...');

  const katalogEintraege = [
    // FUEHRUNG
    { name: 'Einsatzleitung', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', fachaufgabe: 'fuehrung' }, tags: ['el', 'einsatzleitung', 'führung'], sortOrder: 1 },
    { name: 'Einsatzleitung Feuerwehr', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', organisation: 'feuerwehr', fachaufgabe: 'fuehrung' }, tags: ['el', 'feuerwehr'], sortOrder: 2 },
    { name: 'Einsatzleitung THW', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', organisation: 'thw', fachaufgabe: 'fuehrung' }, tags: ['el', 'thw'], sortOrder: 3 },
    { name: 'Einsatzabschnittsleitung', kategorie: 'FUEHRUNG', zeichenDefinition: { grundzeichen: 'befehlsstelle', fachaufgabe: 'fuehrung', einheit: 'zug' }, tags: ['eal', 'abschnitt'], sortOrder: 4 },

    // EINHEITEN
    { name: 'Löschzug Feuerwehr', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'feuerwehr', fachaufgabe: 'brandbekaempfung', einheit: 'zug' }, tags: ['lz', 'löschzug', 'feuerwehr'], sortOrder: 10 },
    { name: 'Löschgruppe Feuerwehr', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'feuerwehr', fachaufgabe: 'brandbekaempfung', einheit: 'gruppe' }, tags: ['lg', 'löschgruppe'], sortOrder: 11 },
    { name: 'Bergungsgruppe THW', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'thw', fachaufgabe: 'bergung', einheit: 'gruppe' }, tags: ['b', 'bergung', 'thw'], sortOrder: 12 },
    { name: 'SEG Rettung', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen', einheit: 'gruppe' }, tags: ['seg', 'rettung'], sortOrder: 13 },
    { name: 'SEG Betreuung', kategorie: 'EINHEITEN', zeichenDefinition: { grundzeichen: 'taktische-formation', organisation: 'hilfsorganisation', fachaufgabe: 'betreuung', einheit: 'gruppe' }, tags: ['seg', 'betreuung'], sortOrder: 14 },

    // FAHRZEUGE
    { name: 'ELW 1', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'feuerwehr', fachaufgabe: 'fuehrung' }, tags: ['elw', 'einsatzleitwagen'], sortOrder: 20 },
    { name: 'ELW 2', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'feuerwehr', fachaufgabe: 'fuehrung', einheit: 'zug' }, tags: ['elw2'], sortOrder: 21 },
    { name: 'RTW', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen' }, tags: ['rtw', 'rettungswagen'], sortOrder: 22 },
    { name: 'KTW', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'transport' }, tags: ['ktw', 'krankentransport'], sortOrder: 23 },
    { name: 'LF 20', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'feuerwehr', fachaufgabe: 'brandbekaempfung' }, tags: ['lf', 'löschfahrzeug'], sortOrder: 24 },
    { name: 'GKW THW', kategorie: 'FAHRZEUGE', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'thw', fachaufgabe: 'bergung' }, tags: ['gkw', 'gerätekraftwagen', 'thw'], sortOrder: 25 },

    // GEFAHREN
    { name: 'Brandstelle', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'brandbekaempfung' }, tags: ['brand', 'feuer', 'gefahr'], sortOrder: 30 },
    { name: 'Gefahrstoff', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'abc' }, tags: ['gefahrstoff', 'abc', 'cbrn'], sortOrder: 31 },
    { name: 'Einsturzgefahr', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-vermutet', fachaufgabe: 'bergung' }, tags: ['einsturz', 'gebäude'], sortOrder: 32 },
    { name: 'Überflutung', kategorie: 'GEFAHREN', zeichenDefinition: { grundzeichen: 'gefahr-akut', fachaufgabe: 'abwehr-wassergefahren' }, tags: ['wasser', 'überflutung', 'hochwasser'], sortOrder: 33 },

    // VERSORGUNG
    { name: 'Behandlungsplatz', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', organisation: 'hilfsorganisation', fachaufgabe: 'aerztliche-versorgung' }, tags: ['bhp', 'behandlungsplatz', 'sanität'], sortOrder: 40 },
    { name: 'Bereitstellungsraum', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'logistik' }, tags: ['br', 'bereitstellungsraum'], sortOrder: 41 },
    { name: 'Sammelstelle', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'betreuung' }, tags: ['sammelstelle', 'sammelpunkt'], sortOrder: 42 },
    { name: 'Verpflegungsstelle', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'verpflegung' }, tags: ['verpflegung', 'essen'], sortOrder: 43 },
    { name: 'Hubschrauberlandeplatz', kategorie: 'VERSORGUNG', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'transport' }, tags: ['hubschrauber', 'landeplatz', 'rth'], sortOrder: 44 },

    // INFRASTRUKTUR
    { name: 'Wasserentnahmestelle', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'wasserversorgung' }, tags: ['wasser', 'entnahme', 'hydrant'], sortOrder: 50 },
    { name: 'Stromversorgung', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'versorgung-elektrizitaet' }, tags: ['strom', 'elektrizität', 'nea'], sortOrder: 51 },
    { name: 'Beleuchtung', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'beleuchtung' }, tags: ['licht', 'beleuchtung'], sortOrder: 52 },
    { name: 'IuK-Stelle', kategorie: 'INFRASTRUKTUR', zeichenDefinition: { grundzeichen: 'stelle', fachaufgabe: 'iuk' }, tags: ['iuk', 'funk', 'kommunikation'], sortOrder: 53 },
  ];

  for (const eintrag of katalogEintraege) {
    await prisma.zeichenKatalogEintrag.upsert({
      where: { id: eintrag.name }, // wird scheitern — nutze create mit skipDuplicates
      create: {
        name: eintrag.name,
        kategorie: eintrag.kategorie,
        zeichenDefinition: eintrag.zeichenDefinition,
        tags: eintrag.tags,
        sortOrder: eintrag.sortOrder,
        istStandard: true,
      },
      update: {},
    });
  }

  logger.log(`${katalogEintraege.length} Zeichen-Katalog-Einträge erstellt`);
}
```

**ACHTUNG:** Da `ZeichenKatalogEintrag` keinen unique Constraint auf `name` hat, nutze `createMany({ skipDuplicates: true })` statt upsert, oder füge einen `@@unique([name])` in Step 1 hinzu. Alternativ: Lösche vor dem Seeden alle `istStandard: true` Einträge und erstelle sie neu.

Ergänze auch Seed-Daten für `FahrzeugtypZeichenDefault` und `EinheitentypZeichenDefault`, die die bestehenden Fahrzeugtypen mit Default-Zeichen verknüpfen.

- [ ] **Step 6: TypeScript-Check + Seed testen**

```bash
cd packages/backend && pnpm exec tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add packages/backend/src/infrastructure/taktische-zeichen/ packages/backend/prisma/seed.ts && git commit -m "✨(backend): Infrastructure Layer für taktische Zeichen — Repository, Mapper, Seeder #636"
```

---

### Task 5: Backend Module + Controller

**Files:**
- Create: `packages/backend/src/modules/taktische-zeichen/dtos/create-taktisches-zeichen.dto.ts`
- Create: `packages/backend/src/modules/taktische-zeichen/dtos/update-taktisches-zeichen.dto.ts`
- Create: `packages/backend/src/modules/taktische-zeichen/dtos/platziere-zeichen.dto.ts`
- Create: `packages/backend/src/modules/taktische-zeichen/taktische-zeichen.controller.ts`
- Create: `packages/backend/src/modules/taktische-zeichen/taktische-zeichen.module.ts`
- Modify: `packages/backend/src/app.module.ts`

**Referenz-Pattern:** `packages/backend/src/modules/notiz/controllers/notiz.controller.ts`, `packages/backend/src/modules/notiz/notiz.module.ts`

- [ ] **Step 1: Request DTOs**

Erstelle Input-DTOs mit `class-validator` Decorators (`@IsString()`, `@IsOptional()`, `@ValidateNested()` etc.) für:
- `CreateTaktischesZeichenDto`: `zeichenDefinition` (nested), `referenzTyp?`, `referenzId?`, `label?`, `notiz?`, `istAusKatalog?`, `katalogEintragId?`
- `UpdateTaktischesZeichenDto`: `zeichenDefinition?`, `label?`, `notiz?`
- `PlatziereZeichenDto`: `lagekarteId`, `lat`, `lng`, `mgrs?`

- [ ] **Step 2: Controller erstellen**

```typescript
// packages/backend/src/modules/taktische-zeichen/taktische-zeichen.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse, ApiNoContentResponse } from '@nestjs/swagger';
import { ApiWrappedResponse, ApiWrappedCreatedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/types';
import { TaktischesZeichenResponseDto } from '@application/taktische-zeichen/dtos/taktisches-zeichen-response.dto';
import { ZeichenKatalogEintragResponseDto } from '@application/taktische-zeichen/dtos/zeichen-katalog-eintrag-response.dto';
import { ErstelleZeichenCommand } from '@application/taktische-zeichen/commands/erstelle-zeichen/erstelle-zeichen.command';
import { ErstelleZeichenHandler } from '@application/taktische-zeichen/commands/erstelle-zeichen/erstelle-zeichen.handler';
import { PlatziereZeichenCommand } from '@application/taktische-zeichen/commands/platziere-zeichen/platziere-zeichen.command';
import { PlatziereZeichenHandler } from '@application/taktische-zeichen/commands/platziere-zeichen/platziere-zeichen.handler';
import { VerschiebeZeichenCommand } from '@application/taktische-zeichen/commands/verschiebe-zeichen/verschiebe-zeichen.command';
import { VerschiebeZeichenHandler } from '@application/taktische-zeichen/commands/verschiebe-zeichen/verschiebe-zeichen.handler';
import { AktualisiereZeichenCommand } from '@application/taktische-zeichen/commands/aktualisiere-zeichen/aktualisiere-zeichen.command';
import { AktualisiereZeichenHandler } from '@application/taktische-zeichen/commands/aktualisiere-zeichen/aktualisiere-zeichen.handler';
import { EntferneZeichenCommand } from '@application/taktische-zeichen/commands/entferne-zeichen/entferne-zeichen.command';
import { EntferneZeichenHandler } from '@application/taktische-zeichen/commands/entferne-zeichen/entferne-zeichen.handler';
import { FindeZeichenFuerEinsatzQuery } from '@application/taktische-zeichen/queries/finde-zeichen-fuer-einsatz/finde-zeichen-fuer-einsatz.query';
import { FindeZeichenFuerEinsatzHandler } from '@application/taktische-zeichen/queries/finde-zeichen-fuer-einsatz/finde-zeichen-fuer-einsatz.handler';
import { FindeKatalogEintraegeQuery } from '@application/taktische-zeichen/queries/finde-katalog-eintraege/finde-katalog-eintraege.query';
import { FindeKatalogEintraegeHandler } from '@application/taktische-zeichen/queries/finde-katalog-eintraege/finde-katalog-eintraege.handler';
import { FindeDefaultZeichenQuery } from '@application/taktische-zeichen/queries/finde-default-zeichen/finde-default-zeichen.query';
import { FindeDefaultZeichenHandler } from '@application/taktische-zeichen/queries/finde-default-zeichen/finde-default-zeichen.handler';
import { CreateTaktischesZeichenDto } from './dtos/create-taktisches-zeichen.dto';
import { UpdateTaktischesZeichenDto } from './dtos/update-taktisches-zeichen.dto';
import { PlatziereZeichenDto } from './dtos/platziere-zeichen.dto';

@ApiTags('Taktische Zeichen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung' })
@Controller({ version: 'alpha' })
export class TaktischeZeichenController {
  constructor(
    private readonly erstelleHandler: ErstelleZeichenHandler,
    private readonly platziereHandler: PlatziereZeichenHandler,
    private readonly verschiebeHandler: VerschiebeZeichenHandler,
    private readonly aktualisiereHandler: AktualisiereZeichenHandler,
    private readonly entferneHandler: EntferneZeichenHandler,
    private readonly findeZeichenHandler: FindeZeichenFuerEinsatzHandler,
    private readonly findeKatalogHandler: FindeKatalogEintraegeHandler,
    private readonly findeDefaultHandler: FindeDefaultZeichenHandler,
  ) {}

  @Get('einsatz/:einsatzId/taktische-zeichen')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Alle taktischen Zeichen eines Einsatzes' })
  @ApiWrappedResponse(TaktischesZeichenResponseDto, { isArray: true, description: 'Liste der taktischen Zeichen' })
  async findAll(@Param('einsatzId') einsatzId: string) {
    const queryResult = FindeZeichenFuerEinsatzQuery.create({ einsatzId });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }
    const result = await this.findeZeichenHandler.execute(queryResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }

  @Post('einsatz/:einsatzId/taktische-zeichen')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Taktisches Zeichen erstellen' })
  @ApiWrappedCreatedResponse(TaktischesZeichenResponseDto, { description: 'Zeichen erstellt' })
  async create(
    @Param('einsatzId') einsatzId: string,
    @Body() dto: CreateTaktischesZeichenDto,
    @CurrentUser() user: ValidatedUser,
  ) {
    const cmdResult = ErstelleZeichenCommand.create({
      einsatzId,
      zeichenDefinition: dto.zeichenDefinition,
      referenzTyp: dto.referenzTyp,
      referenzId: dto.referenzId,
      label: dto.label,
      notiz: dto.notiz,
      istAusKatalog: dto.istAusKatalog,
      katalogEintragId: dto.katalogEintragId,
      erstelltVon: user.userId,
    });
    if (cmdResult.isFailure || !cmdResult.value) {
      throw new BadRequestException(cmdResult.error);
    }
    const result = await this.erstelleHandler.execute(cmdResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }

  @Patch('einsatz/:einsatzId/taktische-zeichen/:zeichenId')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Taktisches Zeichen aktualisieren' })
  @ApiWrappedResponse(TaktischesZeichenResponseDto, { description: 'Zeichen aktualisiert' })
  async update(
    @Param('einsatzId') einsatzId: string,
    @Param('zeichenId') zeichenId: string,
    @Body() dto: UpdateTaktischesZeichenDto,
    @CurrentUser() user: ValidatedUser,
  ) {
    const cmdResult = AktualisiereZeichenCommand.create({
      einsatzId,
      zeichenId,
      zeichenDefinition: dto.zeichenDefinition,
      label: dto.label,
      notiz: dto.notiz,
      aktualisiertVon: user.userId,
    });
    if (cmdResult.isFailure || !cmdResult.value) {
      throw new BadRequestException(cmdResult.error);
    }
    const result = await this.aktualisiereHandler.execute(cmdResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }

  @Delete('einsatz/:einsatzId/taktische-zeichen/:zeichenId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Taktisches Zeichen entfernen' })
  @ApiNoContentResponse({ description: 'Zeichen entfernt' })
  async remove(
    @Param('einsatzId') einsatzId: string,
    @Param('zeichenId') zeichenId: string,
    @CurrentUser() user: ValidatedUser,
  ): Promise<void> {
    const cmdResult = EntferneZeichenCommand.create({ einsatzId, zeichenId, entferntVon: user.userId });
    if (cmdResult.isFailure || !cmdResult.value) {
      throw new BadRequestException(cmdResult.error);
    }
    const result = await this.entferneHandler.execute(cmdResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
  }

  @Put('einsatz/:einsatzId/taktische-zeichen/:zeichenId/position')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Taktisches Zeichen auf Karte platzieren/verschieben' })
  @ApiWrappedResponse(TaktischesZeichenResponseDto, { description: 'Zeichen platziert' })
  async placeOrMove(
    @Param('einsatzId') einsatzId: string,
    @Param('zeichenId') zeichenId: string,
    @Body() dto: PlatziereZeichenDto,
    @CurrentUser() user: ValidatedUser,
  ) {
    // Versuche zuerst platzieren, bei Fehler verschieben
    const platziereResult = PlatziereZeichenCommand.create({
      einsatzId, zeichenId, lagekarteId: dto.lagekarteId, lat: dto.lat, lng: dto.lng, mgrs: dto.mgrs, platziertVon: user.userId,
    });
    if (platziereResult.isFailure || !platziereResult.value) {
      throw new BadRequestException(platziereResult.error);
    }
    const result = await this.platziereHandler.execute(platziereResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }

  @Delete('einsatz/:einsatzId/taktische-zeichen/:zeichenId/position')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Taktisches Zeichen von Karte entfernen (Zeichen bleibt)' })
  @ApiNoContentResponse({ description: 'Von Karte entfernt' })
  async removeFromMap(
    @Param('einsatzId') einsatzId: string,
    @Param('zeichenId') zeichenId: string,
    @CurrentUser() user: ValidatedUser,
  ): Promise<void> {
    // Implementierung: Lade Zeichen, rufe entferneVonKarte(), speichere
    // Nutzt einen separaten Command oder den AktualisiereZeichen-Handler
  }

  @Get('einsatz/:einsatzId/taktische-zeichen/katalog')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Zeichen-Katalog abrufen' })
  @ApiQuery({ name: 'suche', required: false })
  @ApiQuery({ name: 'kategorie', required: false })
  @ApiWrappedResponse(ZeichenKatalogEintragResponseDto, { isArray: true, description: 'Katalog-Einträge' })
  async getKatalog(
    @Param('einsatzId') _einsatzId: string,
    @Query('suche') suche?: string,
    @Query('kategorie') kategorie?: string,
  ) {
    const queryResult = FindeKatalogEintraegeQuery.create({ suche, kategorie });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }
    const result = await this.findeKatalogHandler.execute(queryResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }

  @Get('taktische-zeichen/defaults/fahrzeugtypen')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Default-Zeichen für Fahrzeugtypen' })
  async getDefaultsFahrzeugtypen() {
    const queryResult = FindeDefaultZeichenQuery.create({ typ: 'fahrzeugtypen' });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }
    const result = await this.findeDefaultHandler.execute(queryResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }

  @Get('taktische-zeichen/defaults/einheitentypen')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Default-Zeichen für Einheitentypen' })
  async getDefaultsEinheitentypen() {
    const queryResult = FindeDefaultZeichenQuery.create({ typ: 'einheitentypen' });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }
    const result = await this.findeDefaultHandler.execute(queryResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }
}
```

- [ ] **Step 3: Module erstellen und in AppModule registrieren**

```typescript
// packages/backend/src/modules/taktische-zeichen/taktische-zeichen.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { TaktischeZeichenInfrastructureModule } from '@infrastructure/taktische-zeichen/taktische-zeichen-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/logging/nest-logger.adapter';
import { ErstelleZeichenHandler } from '@application/taktische-zeichen/commands/erstelle-zeichen/erstelle-zeichen.handler';
import { PlatziereZeichenHandler } from '@application/taktische-zeichen/commands/platziere-zeichen/platziere-zeichen.handler';
import { VerschiebeZeichenHandler } from '@application/taktische-zeichen/commands/verschiebe-zeichen/verschiebe-zeichen.handler';
import { AktualisiereZeichenHandler } from '@application/taktische-zeichen/commands/aktualisiere-zeichen/aktualisiere-zeichen.handler';
import { EntferneZeichenHandler } from '@application/taktische-zeichen/commands/entferne-zeichen/entferne-zeichen.handler';
import { FindeZeichenFuerEinsatzHandler } from '@application/taktische-zeichen/queries/finde-zeichen-fuer-einsatz/finde-zeichen-fuer-einsatz.handler';
import { FindeKatalogEintraegeHandler } from '@application/taktische-zeichen/queries/finde-katalog-eintraege/finde-katalog-eintraege.handler';
import { FindeDefaultZeichenHandler } from '@application/taktische-zeichen/queries/finde-default-zeichen/finde-default-zeichen.handler';
import { TaktischesZeichenResponseFactory } from '@application/taktische-zeichen/factories/taktisches-zeichen-response.factory';
import { TaktischeZeichenController } from './taktische-zeichen.controller';

@Module({
  imports: [PrismaModule, OutboxModule, TaktischeZeichenInfrastructureModule],
  controllers: [TaktischeZeichenController],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('TaktischeZeichenModule'),
    },
    ErstelleZeichenHandler,
    PlatziereZeichenHandler,
    VerschiebeZeichenHandler,
    AktualisiereZeichenHandler,
    EntferneZeichenHandler,
    FindeZeichenFuerEinsatzHandler,
    FindeKatalogEintraegeHandler,
    FindeDefaultZeichenHandler,
    TaktischesZeichenResponseFactory,
  ],
})
export class TaktischeZeichenModule {}
```

In `packages/backend/src/app.module.ts`, im `imports`-Array: `TaktischeZeichenModule` hinzufügen.

- [ ] **Step 4: TypeScript-Check**

```bash
cd packages/backend && pnpm exec tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/modules/taktische-zeichen/ packages/backend/src/app.module.ts && git commit -m "✨(backend): Controller + Module für taktische Zeichen API #636"
```

---

### Task 6: API Client generieren

**Depends on:** Task 5

- [ ] **Step 1: Backend starten und Swagger generieren**

```bash
pnpm run generate-api
```

- [ ] **Step 2: Verifizieren dass neue Endpoints im Client verfügbar sind**

```bash
grep -r "taktischeZeichen" packages/shared/client/ | head -5
```

Expected: Generierte Client-Methoden für taktische Zeichen.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/client/ && git commit -m "✨(shared): API Client für taktische Zeichen generiert #636"
```

---

### Task 7: Frontend Rendering Abstraction

**Parallelisierung:** Kann parallel zu Tasks 2-6 laufen (kein Backend nötig).

**Files:**
- Create: `packages/frontend/src/features/taktische-zeichen/rendering/renderer.ts`
- Create: `packages/frontend/src/features/taktische-zeichen/rendering/phjardas-adapter.ts`
- Create: `packages/frontend/src/features/taktische-zeichen/rendering/zeichen-image-cache.ts`
- Create: `packages/frontend/src/features/taktische-zeichen/rendering/ZeichenPreview.tsx`

- [ ] **Step 1: Dependencies installieren**

```bash
pnpm --filter @bluelight-hub/frontend add taktische-zeichen-core taktische-zeichen-react
```

- [ ] **Step 2: Renderer Interface + Adapter**

```typescript
// packages/frontend/src/features/taktische-zeichen/rendering/renderer.ts
export interface ZeichenDefinition {
  grundzeichen: string;
  organisation?: string;
  fachaufgabe?: string;
  einheit?: string;
  verwaltungsstufe?: string;
  symbol?: string;
  text?: string;
}

export interface TaktischesZeichenRenderer {
  renderSvg(definition: ZeichenDefinition): string;
  renderDataUrl(definition: ZeichenDefinition): string;
  getSize(definition: ZeichenDefinition): [number, number];
}
```

```typescript
// packages/frontend/src/features/taktische-zeichen/rendering/phjardas-adapter.ts
import { erzeugeTaktischesZeichen } from 'taktische-zeichen-core';
import type { TaktischesZeichenRenderer, ZeichenDefinition } from './renderer';

export class PhjardasRenderer implements TaktischesZeichenRenderer {
  renderSvg(definition: ZeichenDefinition): string {
    const zeichen = erzeugeTaktischesZeichen({
      grundzeichen: definition.grundzeichen,
      organisation: definition.organisation,
      fachaufgabe: definition.fachaufgabe,
      einheit: definition.einheit,
      verwaltungsstufe: definition.verwaltungsstufe,
      symbol: definition.symbol,
      text: definition.text,
    });
    return zeichen.toString();
  }

  renderDataUrl(definition: ZeichenDefinition): string {
    const zeichen = erzeugeTaktischesZeichen({
      grundzeichen: definition.grundzeichen,
      organisation: definition.organisation,
      fachaufgabe: definition.fachaufgabe,
      einheit: definition.einheit,
      verwaltungsstufe: definition.verwaltungsstufe,
      symbol: definition.symbol,
      text: definition.text,
    });
    return zeichen.dataUrl;
  }

  getSize(definition: ZeichenDefinition): [number, number] {
    const zeichen = erzeugeTaktischesZeichen({
      grundzeichen: definition.grundzeichen,
      organisation: definition.organisation,
      fachaufgabe: definition.fachaufgabe,
      einheit: definition.einheit,
    });
    return zeichen.size as [number, number];
  }
}

// Singleton-Instanz
export const renderer = new PhjardasRenderer();
```

- [ ] **Step 3: Image Cache für MapLibre**

```typescript
// packages/frontend/src/features/taktische-zeichen/rendering/zeichen-image-cache.ts
import type { ZeichenDefinition } from './renderer';
import { renderer } from './phjardas-adapter';

function getCacheKey(definition: ZeichenDefinition): string {
  return [
    definition.grundzeichen,
    definition.organisation ?? '',
    definition.fachaufgabe ?? '',
    definition.einheit ?? '',
    definition.verwaltungsstufe ?? '',
    definition.symbol ?? '',
    definition.text ?? '',
  ].join('|');
}

const imageCache = new Map<string, HTMLImageElement>();

export async function getOrCreateImage(definition: ZeichenDefinition): Promise<{ key: string; image: HTMLImageElement }> {
  const key = `tz-${getCacheKey(definition)}`;

  const cached = imageCache.get(key);
  if (cached) return { key, image: cached };

  const dataUrl = renderer.renderDataUrl(definition);
  const [width, height] = renderer.getSize(definition);

  const img = new Image(width, height);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  imageCache.set(key, img);
  return { key, image: img };
}

export function clearImageCache(): void {
  imageCache.clear();
}
```

- [ ] **Step 4: ZeichenPreview Komponente**

```typescript
// packages/frontend/src/features/taktische-zeichen/rendering/ZeichenPreview.tsx
import { useMemo } from 'react';
import { cn } from '@/shared/ui/cn';
import type { ZeichenDefinition } from './renderer';
import { renderer } from './phjardas-adapter';

interface ZeichenPreviewProps {
  definition: ZeichenDefinition;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = { sm: 32, md: 48, lg: 128 } as const;

export function ZeichenPreview({ definition, size = 'md', className }: ZeichenPreviewProps) {
  const dataUrl = useMemo(() => renderer.renderDataUrl(definition), [definition]);
  const px = SIZE_MAP[size];

  return (
    <img
      src={dataUrl}
      alt={`Taktisches Zeichen: ${definition.grundzeichen}`}
      width={px}
      height={px}
      className={cn('object-contain', className)}
    />
  );
}
```

- [ ] **Step 5: Feature-Index**

```typescript
// packages/frontend/src/features/taktische-zeichen/index.ts
export { ZeichenPreview } from './rendering/ZeichenPreview';
export { renderer } from './rendering/phjardas-adapter';
export type { ZeichenDefinition, TaktischesZeichenRenderer } from './rendering/renderer';
export { getOrCreateImage, clearImageCache } from './rendering/zeichen-image-cache';
```

- [ ] **Step 6: TypeScript-Check**

```bash
pnpm --filter @bluelight-hub/frontend exec tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add packages/frontend/src/features/taktische-zeichen/ && git commit -m "✨(frontend): Rendering-Abstraction für taktische Zeichen (phjardas-adapter) #636"
```

---

### Task 8: Frontend API Hooks

**Depends on:** Task 6 (API Client), Task 7 (Rendering)

**Files:**
- Create: `packages/frontend/src/features/taktische-zeichen/api/queries.ts`
- Create: `packages/frontend/src/features/taktische-zeichen/api/use-einsatz-zeichen.ts`
- Create: `packages/frontend/src/features/taktische-zeichen/api/use-zeichen-katalog.ts`
- Create: `packages/frontend/src/features/taktische-zeichen/api/use-create-zeichen.ts`
- Create: `packages/frontend/src/features/taktische-zeichen/api/use-update-zeichen.ts`
- Create: `packages/frontend/src/features/taktische-zeichen/api/use-place-zeichen.ts`
- Create: `packages/frontend/src/features/taktische-zeichen/api/use-remove-zeichen.ts`

**Referenz-Pattern:** `packages/frontend/src/features/kraefte/api/queries.ts`, `packages/frontend/src/features/kraefte/api/use-einsatz-einheiten.ts`, `packages/frontend/src/features/kraefte/api/use-create-einheit.ts`

- [ ] **Step 1: Query Keys**

```typescript
// packages/frontend/src/features/taktische-zeichen/api/queries.ts
export const TAKTISCHE_ZEICHEN_QUERY_KEYS = {
  all: ['taktische-zeichen'] as const,
  byEinsatz: (einsatzId: string) => [...TAKTISCHE_ZEICHEN_QUERY_KEYS.all, einsatzId] as const,
  zeichen: (einsatzId: string) => [...TAKTISCHE_ZEICHEN_QUERY_KEYS.byEinsatz(einsatzId), 'zeichen'] as const,
  katalog: (einsatzId: string) => [...TAKTISCHE_ZEICHEN_QUERY_KEYS.byEinsatz(einsatzId), 'katalog'] as const,
  katalogFiltered: (einsatzId: string, kategorie?: string, suche?: string) =>
    [...TAKTISCHE_ZEICHEN_QUERY_KEYS.katalog(einsatzId), { kategorie, suche }] as const,
  defaults: ['taktische-zeichen', 'defaults'] as const,
  defaultsFahrzeugtypen: () => [...TAKTISCHE_ZEICHEN_QUERY_KEYS.defaults, 'fahrzeugtypen'] as const,
  defaultsEinheitentypen: () => [...TAKTISCHE_ZEICHEN_QUERY_KEYS.defaults, 'einheitentypen'] as const,
} as const;

export function calculateRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30_000);
}
```

- [ ] **Step 2: Query Hooks erstellen**

Erstelle `use-einsatz-zeichen.ts` und `use-zeichen-katalog.ts` nach dem Pattern von `use-einsatz-einheiten.ts`:
- Nutze `api.taktischeZeichen()` mit den generierten Controller-Methoden
- `enabled: !!einsatzId`
- `staleTime: 30_000`
- `retry: 3` mit `retryDelay: calculateRetryDelay`

- [ ] **Step 3: Mutation Hooks erstellen**

Erstelle `use-create-zeichen.ts`, `use-update-zeichen.ts`, `use-place-zeichen.ts`, `use-remove-zeichen.ts` nach dem Pattern von `use-create-einheit.ts`:
- `onSuccess`: Invalidiere `TAKTISCHE_ZEICHEN_QUERY_KEYS.zeichen(einsatzId)`
- Logger-Aufrufe für Erfolg/Fehler

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/taktische-zeichen/api/ && git commit -m "✨(frontend): TanStack Query Hooks für taktische Zeichen API #636"
```

---

### Task 9: Frontend ZeichenKatalog

**Depends on:** Task 8

**Files:**
- Create: `packages/frontend/src/features/taktische-zeichen/ui/organisms/ZeichenKatalog.tsx`
- Create: `packages/frontend/src/features/taktische-zeichen/ui/molecules/KatalogEintrag.tsx`

**Referenz-Pattern:** `packages/frontend/src/features/lagekarte/ui/molecules/SymbolLibraryPanel.molecule.tsx`

- [ ] **Step 1: KatalogEintrag Molecule**

Kleine Karte mit ZeichenPreview (size=sm), Name, Kategorie-Badge, Tags. `onClick` Callback.

- [ ] **Step 2: ZeichenKatalog Organism**

Panel mit Suchfeld (Input), Kategorie-Tabs (FUEHRUNG, EINHEITEN, FAHRZEUGE, GEFAHREN, VERSORGUNG, INFRASTRUKTUR), gefilterter Liste von `KatalogEintrag`-Komponenten. Nutzt `useZeichenKatalog(einsatzId, { kategorie, suche })`.

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/features/taktische-zeichen/ui/ && git commit -m "✨(frontend): ZeichenKatalog mit Suche und Kategorien #636"
```

---

### Task 10: Frontend ZeichenBaukasten

**Depends on:** Task 7 (Rendering), Task 8 (API Hooks)

**Files:**
- Create: `packages/frontend/src/features/taktische-zeichen/ui/organisms/ZeichenBaukasten.tsx`
- Create: `packages/frontend/src/features/taktische-zeichen/ui/molecules/BaukastenSchritt.tsx`
- Create: `packages/frontend/src/features/taktische-zeichen/ui/atoms/GrundzeichenPicker.tsx`
- Create: `packages/frontend/src/features/taktische-zeichen/ui/atoms/FachaufgabePicker.tsx`
- Create: `packages/frontend/src/features/taktische-zeichen/ui/atoms/OrganisationPicker.tsx`
- Create: `packages/frontend/src/features/taktische-zeichen/ui/atoms/EinheitPicker.tsx`

- [ ] **Step 1: Picker Atoms**

Jeder Picker zeigt ein Grid mit Auswahloptionen (ähnlich dem Wireframe aus der Spec). Nutze die Optionslisten von `taktische-zeichen-core` (grundzeichen, fachaufgaben, organisationen, einheiten) — entweder direkt importieren oder als Konstanten definieren. Jede Option zeigt eine Mini-Vorschau via `ZeichenPreview` (size=sm).

- [ ] **Step 2: BaukastenSchritt Molecule**

Wrapper für einen einzelnen Schritt: Titel, Beschreibung, Picker-Komponente. Zeigt aktiven Step-Indicator.

- [ ] **Step 3: ZeichenBaukasten Organism**

4-Schritt-Wizard: Grundzeichen → Organisation → Fachaufgabe → Einheit. Rechts eine Live-Vorschau (ZeichenPreview size=lg). State management via `useState` für die aktuelle `ZeichenDefinition` (inkrementell aufgebaut). "Erstellen"-Button am Ende ruft `useCreateZeichen` auf.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/taktische-zeichen/ui/ && git commit -m "✨(frontend): ZeichenBaukasten mit geführtem 4-Schritt-Editor #636"
```

---

### Task 11: MapLibre Zeichen Layer

**Depends on:** Task 7 (Rendering), Task 8 (API Hooks)

**Files:**
- Create: `packages/frontend/src/features/taktische-zeichen/hooks/use-zeichen-map-layer.ts`
- Create: `packages/frontend/src/features/taktische-zeichen/hooks/use-zeichen-drag.ts`

**Referenz-Pattern:** `packages/frontend/src/features/lagekarte/hooks/use-symbol-marker.ts`, `packages/frontend/src/features/lagekarte/hooks/use-map-layer.ts`

- [ ] **Step 1: useZeichenMapLayer Hook**

Verantwortlich für:
1. GeoJSON-Source `taktische-zeichen` registrieren
2. Symbol-Layer `taktische-zeichen-layer` registrieren
3. Zeichen-Daten aus `useEinsatzZeichen()` in GeoJSON FeatureCollection umwandeln
4. Für jedes einzigartige Zeichen: `getOrCreateImage()` → `map.addImage(key, image)`
5. Source-Daten aktualisieren wenn sich Zeichen ändern
6. Bei Kartenklick: Feature unter Cursor identifizieren
7. Re-Registrierung bei `style.load` (Basemap-Wechsel)

- [ ] **Step 2: useZeichenDrag Hook**

Implementiert Drag & Drop für platzierte Zeichen:
1. `mousedown` auf einem Feature des `taktische-zeichen-layer` → Drag starten
2. `mousemove` → Feature-Position aktualisieren (visual only)
3. `mouseup` → `usePlaceZeichen` Mutation mit neuen Koordinaten aufrufen
4. Cursor-Änderung zu `grab`/`grabbing`

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/features/taktische-zeichen/hooks/ && git commit -m "✨(frontend): MapLibre Zeichen-Layer mit Drag & Drop #636"
```

---

### Task 12: Karten-Seitenleiste

**Depends on:** Task 9, Task 10, Task 11

**Files:**
- Create: `packages/frontend/src/features/taktische-zeichen/ui/organisms/KartenZeichenSidebar.tsx`
- Create: `packages/frontend/src/features/taktische-zeichen/stores/taktische-zeichen.store.ts`
- Modify: `packages/frontend/src/features/lagekarte/ui/molecules/DrawToolbar.molecule.tsx`
- Modify: `packages/frontend/src/features/lagekarte/ui/organisms/LagekarteView/LagekarteView.tsx`
- Modify: `packages/frontend/src/features/lagekarte/stores/draw.store.ts`

- [ ] **Step 1: Store für taktische Zeichen Panel-State**

Erweitere `draw.store.ts` um `isTaktischeZeichenPanelVisible` und `taktischeZeichenSubTab: 'kraefte' | 'katalog' | 'baukasten'`.

- [ ] **Step 2: KartenZeichenSidebar Organism**

Panel mit drei Sub-Tabs:
- **Kräfte**: Nutzt `useEinsatzEinheiten()` + `useEinsatzFahrzeuge()` um Einheiten/Fahrzeuge im Einsatz anzuzeigen, mit ihren taktischen Zeichen (aus Defaults oder Override). "Platzieren"-Button startet den Platzierungs-Modus.
- **Katalog**: Eingebetteter `ZeichenKatalog`
- **Baukasten**: Eingebetteter `ZeichenBaukasten`

- [ ] **Step 3: DrawToolbar Integration**

In `DrawToolbar.molecule.tsx`, neuen Button für "Taktische Zeichen" Panel hinzufügen (analoges Pattern wie `toggleSymbolPanel`).

- [ ] **Step 4: LagekarteView Integration**

In `LagekarteView.tsx`:
- `KartenZeichenSidebar` einbinden (conditional render basierend auf Store-State)
- `useZeichenMapLayer` Hook einbinden
- `useZeichenDrag` Hook einbinden

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/features/taktische-zeichen/ packages/frontend/src/features/lagekarte/ && git commit -m "✨(frontend): Karten-Seitenleiste mit Kräfte/Katalog/Baukasten Tabs #636"
```

---

### Task 13: Default-Zeichen Backend (Seed + Endpoints)

**Depends on:** Task 4

**Files:**
- Modify: `packages/backend/prisma/seed.ts`

- [ ] **Step 1: Default-Zeichen Seed für Fahrzeugtypen**

In der Seed-Funktion, nach `seedKraefteConfig()`, verknüpfe bestehende Fahrzeugtypen mit Default-Zeichen:

```typescript
const fahrzeugtypDefaults = [
  { code: 'RTW', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'rettungswesen' } },
  { code: 'KTW', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'transport' } },
  { code: 'NEF', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', organisation: 'hilfsorganisation', fachaufgabe: 'aerztliche-versorgung' } },
  { code: 'ELW', zeichenDefinition: { grundzeichen: 'kraftfahrzeug-gelaendegaengig', fachaufgabe: 'fuehrung' } },
  // ... weitere
];
```

- [ ] **Step 2: Default-Zeichen Seed für Einheitentypen**

```typescript
const einheitentypDefaults = [
  { einheitentyp: 'TRUPP', zeichenDefinition: { grundzeichen: 'taktische-formation', einheit: 'trupp' } },
  { einheitentyp: 'STAFFEL', zeichenDefinition: { grundzeichen: 'taktische-formation', einheit: 'staffel' } },
  { einheitentyp: 'GRUPPE', zeichenDefinition: { grundzeichen: 'taktische-formation', einheit: 'gruppe' } },
  { einheitentyp: 'ZUG', zeichenDefinition: { grundzeichen: 'taktische-formation', einheit: 'zug' } },
  { einheitentyp: 'ABSCHNITT', zeichenDefinition: { grundzeichen: 'taktische-formation', einheit: 'bereitschaft' } },
];
```

- [ ] **Step 3: Commit**

```bash
git add packages/backend/prisma/seed.ts && git commit -m "✨(backend): Default-Zeichen Seeds für Fahrzeugtypen und Einheitentypen #636"
```

---

### Task 14: Kräfte-Verknüpfung Frontend

**Depends on:** Task 8, Task 12

**Files:**
- Create: `packages/frontend/src/features/taktische-zeichen/hooks/use-zeichen-from-entity.ts`
- Create: `packages/frontend/src/features/taktische-zeichen/ui/molecules/ZeichenEditor.tsx`

- [ ] **Step 1: useZeichenFromEntity Hook**

Hook der Default-Zeichen für eine Einheit oder ein Fahrzeug ableitet:
- Nutzt `useQuery` mit `TAKTISCHE_ZEICHEN_QUERY_KEYS.defaultsFahrzeugtypen()`
- Mappt `fahrzeugtypId` → `FahrzeugtypZeichenDefault.zeichenDefinition`
- Mappt `einheitentyp` → `EinheitentypZeichenDefault.zeichenDefinition`
- Berücksichtigt bereits existierende Override-Zeichen

- [ ] **Step 2: ZeichenEditor Molecule**

Inline-Editor für eine `ZeichenDefinition`. Zeigt die aktuellen Werte vorausgefüllt an (aus Default oder Override). Erlaubt einzelne Felder zu ändern. Nutzt die Picker-Atoms aus Task 10. Live-Vorschau rechts.

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/features/taktische-zeichen/ && git commit -m "✨(frontend): Kräfte-Verknüpfung mit Default-Zeichen und Override-Editor #636"
```

---

### Task 15: WebSocket Events

**Depends on:** Task 2 (Events), Task 11 (Map Layer)

**Files:**
- Modify: `packages/backend/src/infrastructure/outbox/event-deserializer.ts`
- Modify: `packages/backend/src/infrastructure/outbox/event-serializer.ts`
- Create: `packages/backend/src/infrastructure/events/adapters/zeichen-event.adapter.ts`
- Modify: `packages/backend/src/infrastructure/events/event-adapters.module.ts`
- Modify: `packages/backend/src/infrastructure/events/adapters/index.ts`

**Referenz-Pattern:** `packages/backend/src/infrastructure/events/adapters/notiz-erstellt-event.adapter.ts`

- [ ] **Step 1: Event Serializer/Deserializer registrieren**

In `event-serializer.ts` und `event-deserializer.ts` die neuen Events registrieren (`ZeichenErstelltEvent`, `ZeichenPlatziertEvent`, `ZeichenVerschobenEvent`, `ZeichenEntferntEvent`). Folge dem bestehenden Pattern.

- [ ] **Step 2: Event Adapter für ETB-Integration**

Erstelle `zeichen-event.adapter.ts` mit `@OnEvent()` Decorators für die Zeichen-Events. Delegiert an einen ETB-Handler für automatische Einsatztagebuch-Einträge (z.B. "Taktisches Zeichen 'Löschzug Mitte' auf Karte platziert").

- [ ] **Step 3: Event Adapters Module und Index aktualisieren**

Registriere den neuen Adapter in `event-adapters.module.ts` und exportiere ihn aus `adapters/index.ts`.

- [ ] **Step 4: Frontend WebSocket Handler**

Erweitere den bestehenden WebSocket-Handler in der Lagekarte um Events für taktische Zeichen. Bei Empfang → Query Cache invalidieren → MapLibre Layer wird automatisch aktualisiert.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/infrastructure/ packages/frontend/src/features/ && git commit -m "✨(backend+frontend): WebSocket Events für taktische Zeichen Echtzeit-Sync #636"
```

---

### Task 16: Tests

**Files:**
- Create: `packages/backend/src/application/taktische-zeichen/commands/erstelle-zeichen/__tests__/erstelle-zeichen.handler.spec.ts`
- Create: `packages/backend/src/application/taktische-zeichen/queries/finde-zeichen-fuer-einsatz/__tests__/finde-zeichen-fuer-einsatz.handler.spec.ts`
- Create: `packages/backend/src/modules/taktische-zeichen/__tests__/taktische-zeichen.controller.spec.ts`
- Create: `packages/frontend/src/features/taktische-zeichen/rendering/__tests__/phjardas-adapter.spec.ts`
- Create: `packages/frontend/src/features/taktische-zeichen/ui/organisms/__tests__/ZeichenKatalog.spec.tsx`

**Referenz-Pattern:** Backend: `packages/backend/src/application/notiz/commands/create-notiz/__tests__/`, Frontend: `packages/frontend/src/features/einsatz/ui/organisms/__tests__/`

- [ ] **Step 1: Backend Handler Tests**

Erstelle Tests für `ErstelleZeichenHandler` und `FindeZeichenFuerEinsatzHandler` nach dem bestehenden Pattern:
- NestJS `Test.createTestingModule()`
- Mock Repository mit `jest.Mocked<ITaktischesZeichenRepository>`
- Mock ResponseFactory
- Teste: erfolgreiche Erstellung, Validierungsfehler, Repository-Fehler
- Teste: Query gibt leere Liste, gefüllte Liste, Response-Mapping

- [ ] **Step 2: Backend Controller Tests**

Teste alle Endpoints: GET, POST, PATCH, DELETE, PUT/DELETE position.

- [ ] **Step 3: Frontend Rendering Tests**

Teste den PhjardasAdapter: SVG-Output, DataUrl-Format, Size-Tuple.

- [ ] **Step 4: Frontend Komponenten Tests**

Teste ZeichenKatalog: Rendering, Suche, Kategorie-Filter, Auswahl-Callback.

- [ ] **Step 5: Alle Tests ausführen**

```bash
cd packages/backend && npx jest --testPathPatterns="taktische-zeichen" --no-coverage
```

```bash
pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="taktische-zeichen" --no-coverage
```

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/application/taktische-zeichen/ packages/backend/src/modules/taktische-zeichen/ packages/frontend/src/features/taktische-zeichen/ && git commit -m "🧪(backend+frontend): Tests für taktische Zeichen #636"
```

---
