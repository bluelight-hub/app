# Gefahrenmatrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gefahrenmatrix (4A-C-5E + Absturz/Brand/Durchbruch/Ertrinken) als interaktive Bewertungsmatrix für Einsätze implementieren – ohne Lagekartenintegration.

**Architecture:** Backend: Neues `Gefahr`-Aggregate im Domain Layer mit CQRS Handlers, Prisma-Model und REST Controller. Frontend: Neues Feature `gefahrenmatrix` mit Matrix-Grid-UI, die 13 Gefahrentypen gegen 5 Schutzobjekte (Menschen, Tiere, Umwelt, Sachwerte, Einsatzkräfte) bewertet. Warnstufen (KEINE/NIEDRIG/MITTEL/HOCH/AKUT) werden als Enum-Wert pro Zelle gespeichert.

**Tech Stack:** NestJS + Prisma (Backend), React 19 + TanStack Router/Query/Form + Zod + Tailwind + Headless UI (Frontend)

---

## Fachliche Domäne

Die Gefahrenmatrix ist ein Standardwerkzeug im Katastrophenschutz (4A-C-5E-Schema, erweitert um Absturz/Brand/Durchbruch/Ertrinken):

**13 Gefahrentypen (Spalten):**
1. Atemgifte (A)
2. Angstreaktion/Panik (A)
3. Ausbreitung (A)
4. Atomare Strahlung (A)
5. Chemische Stoffe (C)
6. Erkrankung/Verletzung (E)
7. Explosion (E)
8. Elektrizität (E)
9. Einsturz (E)
10. Absturz
11. Brand
12. Durchbruch
13. Ertrinken

**5 Schutzobjekte (Zeilen):**
1. Menschen
2. Tiere
3. Umwelt
4. Sachwerte
5. Einsatzkräfte

**Warnstufen pro Zelle:**
- KEINE (default) – nicht erkannt
- NIEDRIG – beobachten
- MITTEL – Schutzmaßnahmen vorbereiten
- HOCH – Sofortige Schutzmaßnahmen
- AKUT – Gefahr für Leib und Leben

Zwei Matrix-Sektionen (wie auf Papierform):
1. **"Welche Gefahren sind erkannt?"** – für Menschen, Tiere, Umwelt, Sachwerte
2. **"Vor welchen Gefahren müssen sich Einsatzkräfte schützen?"** – für Einsatzkräfte

---

## File Structure

### Backend

```
packages/backend/src/domain/gefahr/
├── value-objects/
│   ├── gefahr-id.ts                     # Type-safe ID (extends EntityId<'Gefahr'>)
│   ├── gefahrentyp.ts                   # Enum der 13 Gefahrentypen
│   ├── schutzobjekt.ts                  # Enum der 5 Schutzobjekte
│   └── warnstufe.ts                     # Enum KEINE/NIEDRIG/MITTEL/HOCH/AKUT
├── entities/
│   └── gefahrenmatrix.entity.ts         # Aggregate: Matrix pro Einsatz mit Bewertungen
├── events/
│   ├── gefahrenmatrix-aktualisiert.event.ts  # Domain Event
│   └── index.ts
├── repositories/
│   └── i-gefahrenmatrix.repository.ts   # Port Interface

packages/backend/src/application/gefahr/
├── commands/
│   └── update-gefahrenmatrix/
│       ├── update-gefahrenmatrix.command.ts
│       └── update-gefahrenmatrix.handler.ts
├── queries/
│   └── get-gefahrenmatrix/
│       ├── get-gefahrenmatrix.query.ts
│       └── get-gefahrenmatrix.handler.ts
├── dto/
│   ├── gefahrenmatrix-response.dto.ts
│   ├── update-gefahrenmatrix.dto.ts
│   └── index.ts
├── errors/
│   └── gefahr-error.codes.ts
└── gefahr-application.module.ts

packages/backend/src/infrastructure/database/repositories/
└── prisma-gefahrenmatrix.repository.ts

packages/backend/src/modules/gefahr/
├── controllers/
│   └── gefahrenmatrix.controller.ts
└── gefahr.module.ts
```

### Frontend

```
packages/frontend/src/features/gefahrenmatrix/
├── api/
│   ├── queries.ts                       # Query Keys + useGefahrenmatrix Hook
│   ├── mutations.ts                     # useUpdateGefahrenmatrix Mutation
│   └── index.ts
├── schemas/
│   └── gefahrenmatrix.schema.ts         # Zod Schemas für Validierung
├── ui/
│   ├── atoms/
│   │   └── WarnstufeBadge.tsx           # Farb-Badge für Warnstufe
│   ├── molecules/
│   │   └── GefahrenmatrixCell.tsx        # Einzelne Zelle mit Warnstufen-Selector
│   └── organisms/
│       └── GefahrenmatrixGrid.tsx        # Vollständige Matrix-Tabelle
└── index.ts

packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/
└── gefahren.tsx                         # Route (existiert, wird ersetzt)
```

### Prisma

```
packages/backend/prisma/schema.prisma    # Neue Models: GefahrenmatrixBewertung + Enums
```

---

## Task 1: Prisma Schema – Gefahrenmatrix Model

**Files:**
- Modify: `packages/backend/prisma/schema.prisma`

- [ ] **Step 1: Enums und Model zum Prisma Schema hinzufügen**

Am Ende der Datei (vor den letzten Kommentaren oder am Ende) einfügen:

```prisma
// ========================================
// Gefahrenmatrix Models (Issue #414)
// ========================================

enum Gefahrentyp {
  ATEMGIFTE
  ANGSTREAKTION
  AUSBREITUNG
  ATOMARE_STRAHLUNG
  CHEMISCHE_STOFFE
  ERKRANKUNG_VERLETZUNG
  EXPLOSION
  ELEKTRIZITAET
  EINSTURZ
  ABSTURZ
  BRAND
  DURCHBRUCH
  ERTRINKEN
}

enum Schutzobjekt {
  MENSCHEN
  TIERE
  UMWELT
  SACHWERTE
  EINSATZKRAEFTE
}

enum Warnstufe {
  KEINE
  NIEDRIG
  MITTEL
  HOCH
  AKUT
}

model GefahrenmatrixBewertung {
  id            String       @id @default(cuid())
  einsatzId     String
  gefahrentyp   Gefahrentyp
  schutzobjekt  Schutzobjekt
  warnstufe     Warnstufe    @default(KEINE)
  beschreibung  String?      @db.Text
  gemeldetVon   String?      @db.VarChar(255)
  aktualisiertVon String     @db.VarChar(100)

  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  // Relations
  einsatz       Einsatz      @relation(fields: [einsatzId], references: [id], onDelete: Restrict)

  // Constraints: Pro Einsatz nur eine Bewertung pro Gefahrentyp+Schutzobjekt
  @@unique([einsatzId, gefahrentyp, schutzobjekt])
  @@index([einsatzId])
  @@map("gefahrenmatrix_bewertungen")
}
```

- [ ] **Step 2: Einsatz-Model Relation ergänzen**

Im `model Einsatz` Block, vor den Indexes, ergänzen:

```prisma
  // Gefahrenmatrix Relation (1:N, Issue #414)
  gefahrenmatrixBewertungen GefahrenmatrixBewertung[]
```

- [ ] **Step 3: Migration erstellen**

Run: `pnpm --filter @bluelight-hub/backend prisma:migrate --name add_gefahrenmatrix`
Expected: Migration erfolgreich erstellt

- [ ] **Step 4: Prisma Client generieren**

Run: `pnpm --filter @bluelight-hub/backend prisma:generate`
Expected: Client erfolgreich generiert

- [ ] **Step 5: Commit**

```bash
git add packages/backend/prisma/
git commit -m "✨(backend): Gefahrenmatrix Prisma Schema (#414)"
```

---

## Task 2: Domain Layer – Value Objects

**Files:**
- Create: `packages/backend/src/domain/gefahr/value-objects/gefahr-id.ts`
- Create: `packages/backend/src/domain/gefahr/value-objects/gefahrentyp.ts`
- Create: `packages/backend/src/domain/gefahr/value-objects/schutzobjekt.ts`
- Create: `packages/backend/src/domain/gefahr/value-objects/warnstufe.ts`

- [ ] **Step 1: GefaehrId Value Object erstellen**

```typescript
// packages/backend/src/domain/gefahr/value-objects/gefahr-id.ts
import { EntityId } from '@domain/common/entity-id';

/**
 * Type-Safe ID für Gefahrenmatrix-Bewertungen.
 */
export class GefahrId extends EntityId<'Gefahr'> {}
```

- [ ] **Step 2: Gefahrentyp Enum erstellen**

```typescript
// packages/backend/src/domain/gefahr/value-objects/gefahrentyp.ts

/**
 * Die 13 Gefahrentypen der Gefahrenmatrix (4A-C-5E + Absturz/Brand/Durchbruch/Ertrinken).
 */
export enum Gefahrentyp {
  ATEMGIFTE = 'ATEMGIFTE',
  ANGSTREAKTION = 'ANGSTREAKTION',
  AUSBREITUNG = 'AUSBREITUNG',
  ATOMARE_STRAHLUNG = 'ATOMARE_STRAHLUNG',
  CHEMISCHE_STOFFE = 'CHEMISCHE_STOFFE',
  ERKRANKUNG_VERLETZUNG = 'ERKRANKUNG_VERLETZUNG',
  EXPLOSION = 'EXPLOSION',
  ELEKTRIZITAET = 'ELEKTRIZITAET',
  EINSTURZ = 'EINSTURZ',
  ABSTURZ = 'ABSTURZ',
  BRAND = 'BRAND',
  DURCHBRUCH = 'DURCHBRUCH',
  ERTRINKEN = 'ERTRINKEN',
}

/** Kurzbezeichnung für UI-Anzeige (A/A/A/A/C/E/E/E/E/-/-/-/-) */
export const GEFAHRENTYP_KUERZEL: Record<Gefahrentyp, string> = {
  [Gefahrentyp.ATEMGIFTE]: 'A',
  [Gefahrentyp.ANGSTREAKTION]: 'A',
  [Gefahrentyp.AUSBREITUNG]: 'A',
  [Gefahrentyp.ATOMARE_STRAHLUNG]: 'A',
  [Gefahrentyp.CHEMISCHE_STOFFE]: 'C',
  [Gefahrentyp.ERKRANKUNG_VERLETZUNG]: 'E',
  [Gefahrentyp.EXPLOSION]: 'E',
  [Gefahrentyp.ELEKTRIZITAET]: 'E',
  [Gefahrentyp.EINSTURZ]: 'E',
  [Gefahrentyp.ABSTURZ]: '',
  [Gefahrentyp.BRAND]: '',
  [Gefahrentyp.DURCHBRUCH]: '',
  [Gefahrentyp.ERTRINKEN]: '',
};

/** Anzeigename für UI */
export const GEFAHRENTYP_LABEL: Record<Gefahrentyp, string> = {
  [Gefahrentyp.ATEMGIFTE]: 'Atemgifte',
  [Gefahrentyp.ANGSTREAKTION]: 'Angstreaktion',
  [Gefahrentyp.AUSBREITUNG]: 'Ausbreitung',
  [Gefahrentyp.ATOMARE_STRAHLUNG]: 'Atomare Strahlung',
  [Gefahrentyp.CHEMISCHE_STOFFE]: 'Chemische Stoffe',
  [Gefahrentyp.ERKRANKUNG_VERLETZUNG]: 'Erkrankung/Verletzung',
  [Gefahrentyp.EXPLOSION]: 'Explosion',
  [Gefahrentyp.ELEKTRIZITAET]: 'Elektrizität',
  [Gefahrentyp.EINSTURZ]: 'Einsturz',
  [Gefahrentyp.ABSTURZ]: 'Absturz',
  [Gefahrentyp.BRAND]: 'Brand',
  [Gefahrentyp.DURCHBRUCH]: 'Durchbruch',
  [Gefahrentyp.ERTRINKEN]: 'Ertrinken',
};

/** Sortierreihenfolge (4A, C, 5E, dann Zusätzliche) */
export const GEFAHRENTYP_ORDER: Gefahrentyp[] = [
  Gefahrentyp.ATEMGIFTE,
  Gefahrentyp.ANGSTREAKTION,
  Gefahrentyp.AUSBREITUNG,
  Gefahrentyp.ATOMARE_STRAHLUNG,
  Gefahrentyp.CHEMISCHE_STOFFE,
  Gefahrentyp.ERKRANKUNG_VERLETZUNG,
  Gefahrentyp.EXPLOSION,
  Gefahrentyp.ELEKTRIZITAET,
  Gefahrentyp.EINSTURZ,
  Gefahrentyp.ABSTURZ,
  Gefahrentyp.BRAND,
  Gefahrentyp.DURCHBRUCH,
  Gefahrentyp.ERTRINKEN,
];
```

- [ ] **Step 3: Schutzobjekt Enum erstellen**

```typescript
// packages/backend/src/domain/gefahr/value-objects/schutzobjekt.ts

/**
 * Die 5 Schutzobjekte der Gefahrenmatrix.
 * Aufgeteilt in zwei Sektionen:
 * 1. "Welche Gefahren sind erkannt?" (MENSCHEN, TIERE, UMWELT, SACHWERTE)
 * 2. "Vor welchen Gefahren müssen sich Einsatzkräfte schützen?" (EINSATZKRAEFTE)
 */
export enum Schutzobjekt {
  MENSCHEN = 'MENSCHEN',
  TIERE = 'TIERE',
  UMWELT = 'UMWELT',
  SACHWERTE = 'SACHWERTE',
  EINSATZKRAEFTE = 'EINSATZKRAEFTE',
}

/** Anzeigename für UI */
export const SCHUTZOBJEKT_LABEL: Record<Schutzobjekt, string> = {
  [Schutzobjekt.MENSCHEN]: 'Menschen',
  [Schutzobjekt.TIERE]: 'Tiere',
  [Schutzobjekt.UMWELT]: 'Umwelt',
  [Schutzobjekt.SACHWERTE]: 'Sachwerte',
  [Schutzobjekt.EINSATZKRAEFTE]: 'Einsatzkräfte',
};

/** Schutzobjekte Sektion 1: "Welche Gefahren sind erkannt?" */
export const SCHUTZOBJEKTE_ERKANNT: Schutzobjekt[] = [
  Schutzobjekt.MENSCHEN,
  Schutzobjekt.TIERE,
  Schutzobjekt.UMWELT,
  Schutzobjekt.SACHWERTE,
];

/** Schutzobjekte Sektion 2: "Vor welchen Gefahren müssen sich Einsatzkräfte schützen?" */
export const SCHUTZOBJEKTE_EINSATZKRAEFTE: Schutzobjekt[] = [
  Schutzobjekt.EINSATZKRAEFTE,
];
```

- [ ] **Step 4: Warnstufe Enum erstellen**

```typescript
// packages/backend/src/domain/gefahr/value-objects/warnstufe.ts

/**
 * Warnstufen für die Gefahrenbewertung.
 */
export enum Warnstufe {
  KEINE = 'KEINE',
  NIEDRIG = 'NIEDRIG',
  MITTEL = 'MITTEL',
  HOCH = 'HOCH',
  AKUT = 'AKUT',
}

/** Anzeigename für UI */
export const WARNSTUFE_LABEL: Record<Warnstufe, string> = {
  [Warnstufe.KEINE]: 'Keine',
  [Warnstufe.NIEDRIG]: 'Niedrig',
  [Warnstufe.MITTEL]: 'Mittel',
  [Warnstufe.HOCH]: 'Hoch',
  [Warnstufe.AKUT]: 'Akut',
};

/** Sortierreihenfolge (aufsteigend) */
export const WARNSTUFE_ORDER: Warnstufe[] = [
  Warnstufe.KEINE,
  Warnstufe.NIEDRIG,
  Warnstufe.MITTEL,
  Warnstufe.HOCH,
  Warnstufe.AKUT,
];
```

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/domain/gefahr/
git commit -m "✨(backend): Gefahrenmatrix Domain Value Objects (#414)"
```

---

## Task 3: Domain Layer – Entity, Event, Repository Interface

**Files:**
- Create: `packages/backend/src/domain/gefahr/entities/gefahrenmatrix.entity.ts`
- Create: `packages/backend/src/domain/gefahr/events/gefahrenmatrix-aktualisiert.event.ts`
- Create: `packages/backend/src/domain/gefahr/events/index.ts`
- Create: `packages/backend/src/domain/gefahr/repositories/i-gefahrenmatrix.repository.ts`
- Modify: `packages/backend/src/domain/events/event-names.ts`

- [ ] **Step 1: Event Names registrieren**

In `packages/backend/src/domain/events/event-names.ts`, vor dem `} as const;` am Ende:

```typescript
  /**
   * Gefahrenmatrix Bounded Context Events (Issue #414)
   */
  GEFAHRENMATRIX: {
    /** Event: Gefahrenmatrix wurde aktualisiert (Bewertung geändert) */
    AKTUALISIERT: 'gefahrenmatrix.aktualisiert',
  },
```

Und im `EventName` Type-Union ergänzen:

```typescript
  | (typeof EVENT_NAMES.GEFAHRENMATRIX)[keyof typeof EVENT_NAMES.GEFAHRENMATRIX]
```

- [ ] **Step 2: Domain Event erstellen**

```typescript
// packages/backend/src/domain/gefahr/events/gefahrenmatrix-aktualisiert.event.ts
import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Gefahrenmatrix-Bewertung wurde aktualisiert.
 */
export class GefahrenmatrixAktualisiertEvent extends DomainEvent {
  constructor(
    public readonly einsatzId: string,
    public readonly gefahrentyp: string,
    public readonly schutzobjekt: string,
    public readonly warnstufe: string,
    public readonly aktualisiertVon: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.GEFAHRENMATRIX.AKTUALISIERT;
  }
}
```

```typescript
// packages/backend/src/domain/gefahr/events/index.ts
export { GefahrenmatrixAktualisiertEvent } from './gefahrenmatrix-aktualisiert.event';
```

- [ ] **Step 3: Gefahrenmatrix Entity erstellen**

```typescript
// packages/backend/src/domain/gefahr/entities/gefahrenmatrix.entity.ts
import { AggregateRoot } from '@domain/common/aggregate-root';
import { Result } from '@domain/common/result';
import { GefahrId } from '@domain/gefahr/value-objects/gefahr-id';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { Schutzobjekt } from '@domain/gefahr/value-objects/schutzobjekt';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import { GefahrenmatrixAktualisiertEvent } from '@domain/gefahr/events/gefahrenmatrix-aktualisiert.event';

export interface CreateBewertungProps {
  einsatzId: string;
  gefahrentyp: Gefahrentyp;
  schutzobjekt: Schutzobjekt;
  warnstufe: Warnstufe;
  beschreibung?: string;
  gemeldetVon?: string;
  aktualisiertVon: string;
}

export interface ReconstructBewertungProps {
  id: GefahrId;
  einsatzId: string;
  gefahrentyp: Gefahrentyp;
  schutzobjekt: Schutzobjekt;
  warnstufe: Warnstufe;
  beschreibung: string | null;
  gemeldetVon: string | null;
  aktualisiertVon: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Gefahrenmatrix-Bewertung: Eine Zelle in der Matrix (Gefahrentyp x Schutzobjekt).
 *
 * Jede Bewertung repräsentiert die Einschätzung einer Gefahr für ein bestimmtes Schutzobjekt.
 * Pro Einsatz gibt es maximal 65 Bewertungen (13 Gefahrentypen × 5 Schutzobjekte).
 *
 * Business Rules:
 * 1. Gefahrentyp und Schutzobjekt müssen valide Enum-Werte sein
 * 2. Warnstufe KEINE entfernt die Bewertung effektiv (kein Eintrag nötig)
 * 3. Nur eine Bewertung pro (einsatzId, gefahrentyp, schutzobjekt)
 */
export class GefahrenmatrixBewertung extends AggregateRoot<GefahrId> {
  private readonly _einsatzId: string;
  private readonly _gefahrentyp: Gefahrentyp;
  private readonly _schutzobjekt: Schutzobjekt;
  private _warnstufe: Warnstufe;
  private _beschreibung: string | null;
  private _gemeldetVon: string | null;
  private _aktualisiertVon: string;

  private constructor(
    id: GefahrId,
    einsatzId: string,
    gefahrentyp: Gefahrentyp,
    schutzobjekt: Schutzobjekt,
    warnstufe: Warnstufe,
    beschreibung: string | null,
    gemeldetVon: string | null,
    aktualisiertVon: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._einsatzId = einsatzId;
    this._gefahrentyp = gefahrentyp;
    this._schutzobjekt = schutzobjekt;
    this._warnstufe = warnstufe;
    this._beschreibung = beschreibung;
    this._gemeldetVon = gemeldetVon;
    this._aktualisiertVon = aktualisiertVon;
  }

  get einsatzId(): string { return this._einsatzId; }
  get gefahrentyp(): Gefahrentyp { return this._gefahrentyp; }
  get schutzobjekt(): Schutzobjekt { return this._schutzobjekt; }
  get warnstufe(): Warnstufe { return this._warnstufe; }
  get beschreibung(): string | null { return this._beschreibung; }
  get gemeldetVon(): string | null { return this._gemeldetVon; }
  get aktualisiertVon(): string { return this._aktualisiertVon; }

  static create(props: CreateBewertungProps): Result<GefahrenmatrixBewertung> {
    if (!Object.values(Gefahrentyp).includes(props.gefahrentyp)) {
      return Result.fail<GefahrenmatrixBewertung>('GEFAHR_GEFAHRENTYP_INVALID');
    }
    if (!Object.values(Schutzobjekt).includes(props.schutzobjekt)) {
      return Result.fail<GefahrenmatrixBewertung>('GEFAHR_SCHUTZOBJEKT_INVALID');
    }
    if (!Object.values(Warnstufe).includes(props.warnstufe)) {
      return Result.fail<GefahrenmatrixBewertung>('GEFAHR_WARNSTUFE_INVALID');
    }

    const idResult = GefahrId.create();
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<GefahrenmatrixBewertung>(idResult.error ?? 'GEFAHR_ID_INVALID');
    }

    const bewertung = new GefahrenmatrixBewertung(
      idResult.value as GefahrId,
      props.einsatzId,
      props.gefahrentyp,
      props.schutzobjekt,
      props.warnstufe,
      props.beschreibung?.trim() || null,
      props.gemeldetVon?.trim() || null,
      props.aktualisiertVon,
    );

    bewertung.addDomainEvent(
      new GefahrenmatrixAktualisiertEvent(
        props.einsatzId,
        props.gefahrentyp,
        props.schutzobjekt,
        props.warnstufe,
        props.aktualisiertVon,
        (idResult.value as GefahrId).toString(),
      ),
    );

    return Result.ok(bewertung);
  }

  static reconstruct(props: ReconstructBewertungProps): GefahrenmatrixBewertung {
    return new GefahrenmatrixBewertung(
      props.id,
      props.einsatzId,
      props.gefahrentyp,
      props.schutzobjekt,
      props.warnstufe,
      props.beschreibung,
      props.gemeldetVon,
      props.aktualisiertVon,
      props.createdAt,
      props.updatedAt,
    );
  }

  /**
   * Aktualisiert die Warnstufe dieser Bewertung.
   */
  public updateWarnstufe(warnstufe: Warnstufe, aktualisiertVon: string): Result<void> {
    if (!Object.values(Warnstufe).includes(warnstufe)) {
      return Result.fail<void>('GEFAHR_WARNSTUFE_INVALID');
    }

    this._warnstufe = warnstufe;
    this._aktualisiertVon = aktualisiertVon;
    this.updateTimestamp();

    this.addDomainEvent(
      new GefahrenmatrixAktualisiertEvent(
        this._einsatzId,
        this._gefahrentyp,
        this._schutzobjekt,
        warnstufe,
        aktualisiertVon,
        this.id.toString(),
      ),
    );

    return Result.ok<void>(undefined);
  }

  /**
   * Aktualisiert die Beschreibung.
   */
  public updateBeschreibung(beschreibung: string | null): void {
    this._beschreibung = beschreibung?.trim() || null;
    this.updateTimestamp();
  }
}
```

- [ ] **Step 4: Repository Interface erstellen**

```typescript
// packages/backend/src/domain/gefahr/repositories/i-gefahrenmatrix.repository.ts
import type { GefahrenmatrixBewertung } from '@domain/gefahr/entities/gefahrenmatrix.entity';

/**
 * Repository Interface für Gefahrenmatrix-Bewertungen.
 */
export interface IGefahrenmatrixRepository {
  /** Speichert oder aktualisiert eine Bewertung (upsert auf einsatzId+gefahrentyp+schutzobjekt) */
  save(bewertung: GefahrenmatrixBewertung, tx?: unknown): Promise<void>;

  /** Lädt alle Bewertungen eines Einsatzes */
  findByEinsatzId(einsatzId: string, tx?: unknown): Promise<GefahrenmatrixBewertung[]>;

  /** Löscht eine Bewertung (wenn Warnstufe auf KEINE zurückgesetzt wird) */
  deleteByKey(einsatzId: string, gefahrentyp: string, schutzobjekt: string, tx?: unknown): Promise<void>;
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/domain/gefahr/ packages/backend/src/domain/events/event-names.ts
git commit -m "✨(backend): Gefahrenmatrix Domain Entity, Events, Repository (#414)"
```

---

## Task 4: Infrastructure Layer – DI Token, Prisma Repository, Event Registration

**Files:**
- Modify: `packages/backend/src/infrastructure/di-tokens.ts`
- Create: `packages/backend/src/infrastructure/database/repositories/prisma-gefahrenmatrix.repository.ts`
- Modify: `packages/backend/src/infrastructure/outbox/event-deserializer.ts`
- Modify: `packages/backend/src/infrastructure/outbox/event-serializer.ts`

- [ ] **Step 1: DI Token hinzufügen**

In `packages/backend/src/infrastructure/di-tokens.ts`, nach `KATEGORIE_REPOSITORY`:

```typescript
/** Repository Token für IGefahrenmatrixRepository (Issue #414) */
export const GEFAHRENMATRIX_REPOSITORY = Symbol('IGefahrenmatrixRepository');
```

- [ ] **Step 2: Prisma Repository implementieren**

```typescript
// packages/backend/src/infrastructure/database/repositories/prisma-gefahrenmatrix.repository.ts
import { Injectable } from '@nestjs/common';
import type { IGefahrenmatrixRepository } from '@domain/gefahr/repositories/i-gefahrenmatrix.repository';
import { GefahrenmatrixBewertung } from '@domain/gefahr/entities/gefahrenmatrix.entity';
import { GefahrId } from '@domain/gefahr/value-objects/gefahr-id';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { Schutzobjekt } from '@domain/gefahr/value-objects/schutzobjekt';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { Prisma } from '@/generated/prisma/client';

@Injectable()
export class PrismaGefahrenmatrixRepository implements IGefahrenmatrixRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown): Prisma.TransactionClient | PrismaService {
    return (tx as Prisma.TransactionClient) ?? this.prisma;
  }

  async save(bewertung: GefahrenmatrixBewertung, tx?: unknown): Promise<void> {
    const client = this.getClient(tx);
    await client.gefahrenmatrixBewertung.upsert({
      where: {
        einsatzId_gefahrentyp_schutzobjekt: {
          einsatzId: bewertung.einsatzId,
          gefahrentyp: bewertung.gefahrentyp,
          schutzobjekt: bewertung.schutzobjekt,
        },
      },
      create: {
        id: bewertung.id.value,
        einsatzId: bewertung.einsatzId,
        gefahrentyp: bewertung.gefahrentyp,
        schutzobjekt: bewertung.schutzobjekt,
        warnstufe: bewertung.warnstufe,
        beschreibung: bewertung.beschreibung,
        gemeldetVon: bewertung.gemeldetVon,
        aktualisiertVon: bewertung.aktualisiertVon,
      },
      update: {
        warnstufe: bewertung.warnstufe,
        beschreibung: bewertung.beschreibung,
        gemeldetVon: bewertung.gemeldetVon,
        aktualisiertVon: bewertung.aktualisiertVon,
      },
    });
  }

  async findByEinsatzId(einsatzId: string, tx?: unknown): Promise<GefahrenmatrixBewertung[]> {
    const client = this.getClient(tx);
    const rows = await client.gefahrenmatrixBewertung.findMany({
      where: { einsatzId },
    });

    return rows.map((row) => {
      const idResult = GefahrId.create(row.id);
      return GefahrenmatrixBewertung.reconstruct({
        id: idResult.value! as GefahrId,
        einsatzId: row.einsatzId,
        gefahrentyp: row.gefahrentyp as Gefahrentyp,
        schutzobjekt: row.schutzobjekt as Schutzobjekt,
        warnstufe: row.warnstufe as Warnstufe,
        beschreibung: row.beschreibung,
        gemeldetVon: row.gemeldetVon,
        aktualisiertVon: row.aktualisiertVon,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    });
  }

  async deleteByKey(einsatzId: string, gefahrentyp: string, schutzobjekt: string, tx?: unknown): Promise<void> {
    const client = this.getClient(tx);
    await client.gefahrenmatrixBewertung.deleteMany({
      where: {
        einsatzId,
        gefahrentyp: gefahrentyp as any,
        schutzobjekt: schutzobjekt as any,
      },
    });
  }
}
```

- [ ] **Step 3: Event Deserializer registrieren**

In `packages/backend/src/infrastructure/outbox/event-deserializer.ts`:

Import hinzufügen (bei den anderen Event-Imports):
```typescript
// Gefahrenmatrix Events (Issue #414)
import { GefahrenmatrixAktualisiertEvent } from '@domain/gefahr/events/gefahrenmatrix-aktualisiert.event';
```

Im `deserialize` switch-case ergänzen:
```typescript
      case 'GefahrenmatrixAktualisiert':
        return Result.ok(
          new GefahrenmatrixAktualisiertEvent(
            payload.einsatzId,
            payload.gefahrentyp,
            payload.schutzobjekt,
            payload.warnstufe,
            payload.aktualisiertVon,
            payload.aggregateId,
          ),
        );
```

- [ ] **Step 4: Event Serializer registrieren**

In `packages/backend/src/infrastructure/outbox/event-serializer.ts`:

Import hinzufügen:
```typescript
import { GefahrenmatrixAktualisiertEvent } from '@domain/gefahr/events/gefahrenmatrix-aktualisiert.event';
```

Im `serialize` switch/mapping ergänzen (gleiche Struktur wie bestehende Events).

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/infrastructure/
git commit -m "✨(backend): Gefahrenmatrix Infrastructure Layer (#414)"
```

---

## Task 5: Application Layer – Error Codes, DTOs, Query Handler

**Files:**
- Create: `packages/backend/src/application/gefahr/errors/gefahr-error.codes.ts`
- Create: `packages/backend/src/application/gefahr/dto/gefahrenmatrix-response.dto.ts`
- Create: `packages/backend/src/application/gefahr/dto/update-gefahrenmatrix.dto.ts`
- Create: `packages/backend/src/application/gefahr/dto/index.ts`
- Create: `packages/backend/src/application/gefahr/queries/get-gefahrenmatrix/get-gefahrenmatrix.query.ts`
- Create: `packages/backend/src/application/gefahr/queries/get-gefahrenmatrix/get-gefahrenmatrix.handler.ts`

- [ ] **Step 1: Error Codes erstellen**

```typescript
// packages/backend/src/application/gefahr/errors/gefahr-error.codes.ts

export const GEFAHR_ERROR_CODES = {
  EINSATZ_ID_REQUIRED: 'GEFAHR_EINSATZ_ID_REQUIRED',
  GEFAHRENTYP_INVALID: 'GEFAHR_GEFAHRENTYP_INVALID',
  SCHUTZOBJEKT_INVALID: 'GEFAHR_SCHUTZOBJEKT_INVALID',
  WARNSTUFE_INVALID: 'GEFAHR_WARNSTUFE_INVALID',
  AKTUALISIERT_VON_REQUIRED: 'GEFAHR_AKTUALISIERT_VON_REQUIRED',
} as const;
```

- [ ] **Step 2: Response DTO erstellen**

```typescript
// packages/backend/src/application/gefahr/dto/gefahrenmatrix-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO für eine einzelne Gefahrenmatrix-Bewertung.
 */
export class GefahrenmatrixBewertungDto {
  @ApiProperty({ description: 'ID der Bewertung' })
  id!: string;

  @ApiProperty({ description: 'Gefahrentyp (ATEMGIFTE, ANGSTREAKTION, etc.)' })
  gefahrentyp!: string;

  @ApiProperty({ description: 'Schutzobjekt (MENSCHEN, TIERE, UMWELT, SACHWERTE, EINSATZKRAEFTE)' })
  schutzobjekt!: string;

  @ApiProperty({ description: 'Warnstufe (KEINE, NIEDRIG, MITTEL, HOCH, AKUT)' })
  warnstufe!: string;

  @ApiProperty({ description: 'Optionale Beschreibung', required: false, nullable: true })
  beschreibung!: string | null;

  @ApiProperty({ description: 'Wer die Gefahr gemeldet hat', required: false, nullable: true })
  gemeldetVon!: string | null;

  @ApiProperty({ description: 'Zeitpunkt der letzten Aktualisierung' })
  updatedAt!: Date;
}

/**
 * DTO für die komplette Gefahrenmatrix eines Einsatzes.
 */
export class GefahrenmatrixResponseDto {
  @ApiProperty({ description: 'Einsatz-ID' })
  einsatzId!: string;

  @ApiProperty({ type: [GefahrenmatrixBewertungDto], description: 'Alle Bewertungen (nur Zellen mit Warnstufe != KEINE)' })
  bewertungen!: GefahrenmatrixBewertungDto[];
}
```

- [ ] **Step 3: Update DTO erstellen**

```typescript
// packages/backend/src/application/gefahr/dto/update-gefahrenmatrix.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO zum Aktualisieren einer einzelnen Bewertung in der Gefahrenmatrix.
 */
export class UpdateGefahrenmatrixDto {
  @ApiProperty({ description: 'Gefahrentyp' })
  @IsNotEmpty()
  @IsString()
  gefahrentyp!: string;

  @ApiProperty({ description: 'Schutzobjekt' })
  @IsNotEmpty()
  @IsString()
  schutzobjekt!: string;

  @ApiProperty({ description: 'Neue Warnstufe' })
  @IsNotEmpty()
  @IsString()
  warnstufe!: string;

  @ApiProperty({ description: 'Optionale Beschreibung', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  beschreibung?: string;

  @ApiProperty({ description: 'Wer die Gefahr gemeldet hat', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  gemeldetVon?: string;
}
```

```typescript
// packages/backend/src/application/gefahr/dto/index.ts
export { GefahrenmatrixResponseDto, GefahrenmatrixBewertungDto } from './gefahrenmatrix-response.dto';
export { UpdateGefahrenmatrixDto } from './update-gefahrenmatrix.dto';
```

- [ ] **Step 4: Query erstellen**

```typescript
// packages/backend/src/application/gefahr/queries/get-gefahrenmatrix/get-gefahrenmatrix.query.ts
import { Result } from '@domain/common/result';
import { GEFAHR_ERROR_CODES } from '../../errors/gefahr-error.codes';

export class GetGefahrenmatrixQuery {
  private constructor(
    public readonly einsatzId: string,
  ) {}

  static create(props: { einsatzId: string }): Result<GetGefahrenmatrixQuery> {
    const trimmed = props.einsatzId?.trim() ?? '';
    if (trimmed.length === 0) {
      return Result.fail<GetGefahrenmatrixQuery>(GEFAHR_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }
    return Result.ok(new GetGefahrenmatrixQuery(trimmed));
  }
}
```

- [ ] **Step 5: Query Handler erstellen**

```typescript
// packages/backend/src/application/gefahr/queries/get-gefahrenmatrix/get-gefahrenmatrix.handler.ts
import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IGefahrenmatrixRepository } from '@domain/gefahr/repositories/i-gefahrenmatrix.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { GEFAHRENMATRIX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import type { GetGefahrenmatrixQuery } from './get-gefahrenmatrix.query';
import type { GefahrenmatrixResponseDto } from '../../dto/gefahrenmatrix-response.dto';

@Injectable()
export class GetGefahrenmatrixHandler {
  constructor(
    @Inject(GEFAHRENMATRIX_REPOSITORY)
    private readonly repository: IGefahrenmatrixRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async execute(query: GetGefahrenmatrixQuery): Promise<Result<GefahrenmatrixResponseDto>> {
    const bewertungen = await this.repository.findByEinsatzId(query.einsatzId);

    const response: GefahrenmatrixResponseDto = {
      einsatzId: query.einsatzId,
      bewertungen: bewertungen.map((b) => ({
        id: b.id.value,
        gefahrentyp: b.gefahrentyp,
        schutzobjekt: b.schutzobjekt,
        warnstufe: b.warnstufe,
        beschreibung: b.beschreibung,
        gemeldetVon: b.gemeldetVon,
        updatedAt: b.updatedAt,
      })),
    };

    this.logger.log(`Gefahrenmatrix geladen (einsatzId: ${query.einsatzId}, bewertungen: ${bewertungen.length})`, 'GetGefahrenmatrixHandler');

    return Result.ok(response);
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/application/gefahr/
git commit -m "✨(backend): Gefahrenmatrix Application Layer - Query + DTOs (#414)"
```

---

## Task 6: Application Layer – Command Handler

**Files:**
- Create: `packages/backend/src/application/gefahr/commands/update-gefahrenmatrix/update-gefahrenmatrix.command.ts`
- Create: `packages/backend/src/application/gefahr/commands/update-gefahrenmatrix/update-gefahrenmatrix.handler.ts`
- Create: `packages/backend/src/application/gefahr/gefahr-application.module.ts`

- [ ] **Step 1: Command erstellen**

```typescript
// packages/backend/src/application/gefahr/commands/update-gefahrenmatrix/update-gefahrenmatrix.command.ts
import { Result } from '@domain/common/result';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { Schutzobjekt } from '@domain/gefahr/value-objects/schutzobjekt';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import { GEFAHR_ERROR_CODES } from '../../errors/gefahr-error.codes';

export class UpdateGefahrenmatrixCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly gefahrentyp: Gefahrentyp,
    public readonly schutzobjekt: Schutzobjekt,
    public readonly warnstufe: Warnstufe,
    public readonly beschreibung: string | undefined,
    public readonly gemeldetVon: string | undefined,
    public readonly aktualisiertVon: string,
  ) {}

  static create(props: {
    einsatzId: string;
    gefahrentyp: string;
    schutzobjekt: string;
    warnstufe: string;
    beschreibung?: string;
    gemeldetVon?: string;
    aktualisiertVon: string;
  }): Result<UpdateGefahrenmatrixCommand> {
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<UpdateGefahrenmatrixCommand>(GEFAHR_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }

    if (!Object.values(Gefahrentyp).includes(props.gefahrentyp as Gefahrentyp)) {
      return Result.fail<UpdateGefahrenmatrixCommand>(GEFAHR_ERROR_CODES.GEFAHRENTYP_INVALID);
    }

    if (!Object.values(Schutzobjekt).includes(props.schutzobjekt as Schutzobjekt)) {
      return Result.fail<UpdateGefahrenmatrixCommand>(GEFAHR_ERROR_CODES.SCHUTZOBJEKT_INVALID);
    }

    if (!Object.values(Warnstufe).includes(props.warnstufe as Warnstufe)) {
      return Result.fail<UpdateGefahrenmatrixCommand>(GEFAHR_ERROR_CODES.WARNSTUFE_INVALID);
    }

    const trimmedVon = props.aktualisiertVon?.trim() ?? '';
    if (trimmedVon.length === 0) {
      return Result.fail<UpdateGefahrenmatrixCommand>(GEFAHR_ERROR_CODES.AKTUALISIERT_VON_REQUIRED);
    }

    return Result.ok(new UpdateGefahrenmatrixCommand(
      trimmedEinsatzId,
      props.gefahrentyp as Gefahrentyp,
      props.schutzobjekt as Schutzobjekt,
      props.warnstufe as Warnstufe,
      props.beschreibung,
      props.gemeldetVon,
      trimmedVon,
    ));
  }
}
```

- [ ] **Step 2: Command Handler erstellen**

```typescript
// packages/backend/src/application/gefahr/commands/update-gefahrenmatrix/update-gefahrenmatrix.handler.ts
import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { GefahrenmatrixBewertung } from '@domain/gefahr/entities/gefahrenmatrix.entity';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import type { IGefahrenmatrixRepository } from '@domain/gefahr/repositories/i-gefahrenmatrix.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { GEFAHRENMATRIX_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { UpdateGefahrenmatrixCommand } from './update-gefahrenmatrix.command';
import type { GefahrenmatrixBewertungDto } from '../../dto/gefahrenmatrix-response.dto';

@Injectable()
export class UpdateGefahrenmatrixHandler extends TransactionalCommandHandler<UpdateGefahrenmatrixCommand, GefahrenmatrixBewertungDto | null> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(GEFAHRENMATRIX_REPOSITORY)
    private readonly repository: IGefahrenmatrixRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: UpdateGefahrenmatrixCommand,
    _tx: TransactionContext,
  ): Promise<Result<GefahrenmatrixBewertungDto | null> | { result: GefahrenmatrixBewertungDto | null; events: DomainEvent[] }> {
    // Warnstufe KEINE → Bewertung entfernen
    if (command.warnstufe === Warnstufe.KEINE) {
      await this.repository.deleteByKey(
        command.einsatzId,
        command.gefahrentyp,
        command.schutzobjekt,
        _tx,
      );
      this.logger.log(
        `Gefahrenmatrix-Bewertung entfernt (einsatzId: ${command.einsatzId}, typ: ${command.gefahrentyp}, objekt: ${command.schutzobjekt})`,
        'UpdateGefahrenmatrixHandler',
      );
      return Result.ok(null);
    }

    // Bewertung erstellen/aktualisieren
    const bewertungResult = GefahrenmatrixBewertung.create({
      einsatzId: command.einsatzId,
      gefahrentyp: command.gefahrentyp,
      schutzobjekt: command.schutzobjekt,
      warnstufe: command.warnstufe,
      beschreibung: command.beschreibung,
      gemeldetVon: command.gemeldetVon,
      aktualisiertVon: command.aktualisiertVon,
    });

    if (bewertungResult.isFailure || !bewertungResult.value) {
      return Result.fail<GefahrenmatrixBewertungDto | null>(bewertungResult.error ?? 'GEFAHR_CREATION_FAILED');
    }

    const bewertung = bewertungResult.value;
    await this.repository.save(bewertung, _tx);

    this.logger.log(
      `Gefahrenmatrix-Bewertung gespeichert (einsatzId: ${command.einsatzId}, typ: ${command.gefahrentyp}, objekt: ${command.schutzobjekt}, stufe: ${command.warnstufe})`,
      'UpdateGefahrenmatrixHandler',
    );

    const events = bewertung.getDomainEvents();
    bewertung.clearDomainEvents();

    const dto: GefahrenmatrixBewertungDto = {
      id: bewertung.id.value,
      gefahrentyp: bewertung.gefahrentyp,
      schutzobjekt: bewertung.schutzobjekt,
      warnstufe: bewertung.warnstufe,
      beschreibung: bewertung.beschreibung,
      gemeldetVon: bewertung.gemeldetVon,
      updatedAt: bewertung.updatedAt,
    };

    return { result: dto, events };
  }
}
```

- [ ] **Step 3: Application Module erstellen**

```typescript
// packages/backend/src/application/gefahr/gefahr-application.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database';
import { OutboxModule } from '@infrastructure/outbox';
import { InfrastructureCommonModule } from '@infrastructure/common.module';
import { GetGefahrenmatrixHandler } from './queries/get-gefahrenmatrix/get-gefahrenmatrix.handler';
import { UpdateGefahrenmatrixHandler } from './commands/update-gefahrenmatrix/update-gefahrenmatrix.handler';

@Module({
  imports: [PrismaModule, OutboxModule, InfrastructureCommonModule],
  providers: [GetGefahrenmatrixHandler, UpdateGefahrenmatrixHandler],
  exports: [GetGefahrenmatrixHandler, UpdateGefahrenmatrixHandler],
})
export class GefahrApplicationModule {}
```

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/application/gefahr/
git commit -m "✨(backend): Gefahrenmatrix Application Layer - Command Handler (#414)"
```

---

## Task 7: Module Layer – Controller + NestJS Module + App Registration

**Files:**
- Create: `packages/backend/src/modules/gefahr/controllers/gefahrenmatrix.controller.ts`
- Create: `packages/backend/src/modules/gefahr/gefahr.module.ts`
- Modify: `packages/backend/src/app.module.ts`

- [ ] **Step 1: Controller erstellen**

```typescript
// packages/backend/src/modules/gefahr/controllers/gefahrenmatrix.controller.ts
import { BadRequestException, Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { GetGefahrenmatrixHandler } from '@/application/gefahr/queries/get-gefahrenmatrix/get-gefahrenmatrix.handler';
import { GetGefahrenmatrixQuery } from '@/application/gefahr/queries/get-gefahrenmatrix/get-gefahrenmatrix.query';
import { UpdateGefahrenmatrixHandler } from '@/application/gefahr/commands/update-gefahrenmatrix/update-gefahrenmatrix.handler';
import { UpdateGefahrenmatrixCommand } from '@/application/gefahr/commands/update-gefahrenmatrix/update-gefahrenmatrix.command';
import { GefahrenmatrixResponseDto, GefahrenmatrixBewertungDto, UpdateGefahrenmatrixDto } from '@/application/gefahr/dto';

/**
 * Controller für die Gefahrenmatrix eines Einsatzes (Issue #414).
 */
@ApiTags('Gefahrenmatrix')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Aktion' })
@Controller({ path: 'einsatz/:einsatzId/gefahrenmatrix', version: 'alpha' })
export class GefahrenmatrixController {
  constructor(
    private readonly getHandler: GetGefahrenmatrixHandler,
    private readonly updateHandler: UpdateGefahrenmatrixHandler,
  ) {}

  @Get()
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Gefahrenmatrix eines Einsatzes abrufen' })
  @ApiWrappedResponse(GefahrenmatrixResponseDto, { description: 'Gefahrenmatrix mit allen Bewertungen' })
  async get(@Param('einsatzId') einsatzId: string) {
    const queryResult = GetGefahrenmatrixQuery.create({ einsatzId });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error ?? 'QUERY_CREATION_FAILED');
    }

    const result = await this.getHandler.execute(queryResult.value);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return result.value;
  }

  @Put('bewertung')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Einzelne Bewertung in der Gefahrenmatrix setzen/aktualisieren' })
  @ApiWrappedResponse(GefahrenmatrixBewertungDto, { description: 'Aktualisierte Bewertung (null bei Warnstufe KEINE)', nullable: true })
  async updateBewertung(
    @Param('einsatzId') einsatzId: string,
    @Body() dto: UpdateGefahrenmatrixDto,
    @CurrentUser() user: ValidatedUser,
  ) {
    const commandResult = UpdateGefahrenmatrixCommand.create({
      einsatzId,
      gefahrentyp: dto.gefahrentyp,
      schutzobjekt: dto.schutzobjekt,
      warnstufe: dto.warnstufe,
      beschreibung: dto.beschreibung,
      gemeldetVon: dto.gemeldetVon,
      aktualisiertVon: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.updateHandler.execute(commandResult.value);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return result.value;
  }
}
```

- [ ] **Step 2: NestJS Module erstellen**

```typescript
// packages/backend/src/modules/gefahr/gefahr.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database';
import { OutboxModule } from '@infrastructure/outbox';
import { GEFAHRENMATRIX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaGefahrenmatrixRepository } from '@/infrastructure/database/repositories/prisma-gefahrenmatrix.repository';
import { GefahrApplicationModule } from '@/application/gefahr/gefahr-application.module';
import { GefahrenmatrixController } from './controllers/gefahrenmatrix.controller';

@Module({
  imports: [PrismaModule, OutboxModule, GefahrApplicationModule],
  controllers: [GefahrenmatrixController],
  providers: [
    {
      provide: GEFAHRENMATRIX_REPOSITORY,
      useClass: PrismaGefahrenmatrixRepository,
    },
  ],
  exports: [GEFAHRENMATRIX_REPOSITORY],
})
export class GefahrModule {}
```

- [ ] **Step 3: App Module registrieren**

In `packages/backend/src/app.module.ts`:

Import hinzufügen:
```typescript
import { GefahrModule } from './modules/gefahr/gefahr.module';
```

Im `@Module({ imports: [...] })` Array ergänzen:
```typescript
    GefahrModule,
```

- [ ] **Step 4: Testen – Backend starten und Swagger prüfen**

Run: `pnpm --filter @bluelight-hub/backend dev`
Expected: Server startet ohne Fehler, Swagger UI unter `localhost:3091/api` zeigt "Gefahrenmatrix" Tag

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/modules/gefahr/ packages/backend/src/app.module.ts
git commit -m "✨(backend): Gefahrenmatrix Controller + Module (#414)"
```

---

## Task 8: API Client generieren

**Files:**
- Modify: `packages/shared/client/` (auto-generiert)

- [ ] **Step 1: API Client generieren**

Run: `pnpm run generate-api`
Expected: Client wird ohne Fehler generiert, neue `GefahrenmatrixApi` Klasse existiert

- [ ] **Step 2: Prüfen dass GefahrenmatrixApi existiert**

Run: `grep -r "GefahrenmatrixApi" packages/shared/client/`
Expected: Neue API-Klasse mit `gefahrenmatrixControllerGetVAlpha` und `gefahrenmatrixControllerUpdateBewertungVAlpha` Methoden

- [ ] **Step 3: Commit**

```bash
git add packages/shared/client/
git commit -m "✨(shared): Gefahrenmatrix API Client generieren (#414)"
```

---

## Task 9: Frontend – API Integration registrieren

**Files:**
- Modify: `packages/frontend/src/shared/api/api.ts`

- [ ] **Step 1: GefahrenmatrixApi in BackendApi registrieren**

In `packages/frontend/src/shared/api/api.ts`:

Import ergänzen (bei den anderen Imports aus `@bluelight-hub/shared/client`):
```typescript
  GefahrenmatrixApi,
```

Private Field hinzufügen (bei den anderen private Fields):
```typescript
  private readonly gefahrenmatrixApi: GefahrenmatrixApi;
```

Im Constructor initialisieren:
```typescript
    this.gefahrenmatrixApi = new GefahrenmatrixApi(this.configuration);
```

Getter-Methode hinzufügen:
```typescript
  /**
   * Gibt die gecachte Gefahrenmatrix-API-Instanz zurück (Issue #414)
   *
   * @returns Die Gefahrenmatrix-API-Instanz für Gefahrenmatrix-Management
   */
  gefahrenmatrix(): GefahrenmatrixApi {
    return this.gefahrenmatrixApi;
  }
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/shared/api/api.ts
git commit -m "✨(frontend): Gefahrenmatrix API Client registrieren (#414)"
```

---

## Task 10: Frontend – Feature Queries + Mutations

**Files:**
- Create: `packages/frontend/src/features/gefahrenmatrix/api/queries.ts`
- Create: `packages/frontend/src/features/gefahrenmatrix/api/mutations.ts`
- Create: `packages/frontend/src/features/gefahrenmatrix/api/index.ts`
- Create: `packages/frontend/src/features/gefahrenmatrix/schemas/gefahrenmatrix.schema.ts`
- Create: `packages/frontend/src/features/gefahrenmatrix/index.ts`

- [ ] **Step 1: Query Keys + Query Hook erstellen**

```typescript
// packages/frontend/src/features/gefahrenmatrix/api/queries.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';

export const GEFAHRENMATRIX_QUERY_KEYS = {
  all: ['gefahrenmatrix'] as const,
  byEinsatz: (einsatzId: string) => [...GEFAHRENMATRIX_QUERY_KEYS.all, einsatzId] as const,
};

/**
 * Lädt die Gefahrenmatrix eines Einsatzes.
 */
export const useGefahrenmatrix = (einsatzId: string) => {
  return useQuery({
    queryKey: GEFAHRENMATRIX_QUERY_KEYS.byEinsatz(einsatzId),
    queryFn: async () => {
      const response = await api.gefahrenmatrix().gefahrenmatrixControllerGetVAlpha({ einsatzId });
      return response.data;
    },
    enabled: !!einsatzId,
  });
};
```

- [ ] **Step 2: Mutation Hook erstellen**

```typescript
// packages/frontend/src/features/gefahrenmatrix/api/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared';
import type { UpdateGefahrenmatrixDto } from '@bluelight-hub/shared/client';
import { GEFAHRENMATRIX_QUERY_KEYS } from './queries';

export interface UpdateBewertungVariables {
  einsatzId: string;
  data: UpdateGefahrenmatrixDto;
}

/**
 * Mutation zum Aktualisieren einer Bewertung in der Gefahrenmatrix.
 */
export const useUpdateGefahrenmatrixBewertung = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ einsatzId, data }: UpdateBewertungVariables) => {
      const response = await api.gefahrenmatrix().gefahrenmatrixControllerUpdateBewertungVAlpha({
        einsatzId,
        updateGefahrenmatrixDto: data,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: GEFAHRENMATRIX_QUERY_KEYS.byEinsatz(variables.einsatzId) });
    },
  });
};
```

```typescript
// packages/frontend/src/features/gefahrenmatrix/api/index.ts
export { useGefahrenmatrix, GEFAHRENMATRIX_QUERY_KEYS } from './queries';
export { useUpdateGefahrenmatrixBewertung } from './mutations';
```

- [ ] **Step 3: Zod Schema erstellen**

```typescript
// packages/frontend/src/features/gefahrenmatrix/schemas/gefahrenmatrix.schema.ts
import { z } from 'zod';

export const GEFAHRENTYPEN = [
  'ATEMGIFTE', 'ANGSTREAKTION', 'AUSBREITUNG', 'ATOMARE_STRAHLUNG',
  'CHEMISCHE_STOFFE', 'ERKRANKUNG_VERLETZUNG', 'EXPLOSION',
  'ELEKTRIZITAET', 'EINSTURZ', 'ABSTURZ', 'BRAND', 'DURCHBRUCH', 'ERTRINKEN',
] as const;

export const SCHUTZOBJEKTE = [
  'MENSCHEN', 'TIERE', 'UMWELT', 'SACHWERTE', 'EINSATZKRAEFTE',
] as const;

export const WARNSTUFEN = [
  'KEINE', 'NIEDRIG', 'MITTEL', 'HOCH', 'AKUT',
] as const;

export type GefahrentypValue = typeof GEFAHRENTYPEN[number];
export type SchutzobjektValue = typeof SCHUTZOBJEKTE[number];
export type WarnstufeValue = typeof WARNSTUFEN[number];

export const GEFAHRENTYP_LABELS: Record<GefahrentypValue, string> = {
  ATEMGIFTE: 'Atemgifte',
  ANGSTREAKTION: 'Angstreaktion',
  AUSBREITUNG: 'Ausbreitung',
  ATOMARE_STRAHLUNG: 'Atomare Strahlung',
  CHEMISCHE_STOFFE: 'Chemische Stoffe',
  ERKRANKUNG_VERLETZUNG: 'Erkrankung/Verletzung',
  EXPLOSION: 'Explosion',
  ELEKTRIZITAET: 'Elektrizität',
  EINSTURZ: 'Einsturz',
  ABSTURZ: 'Absturz',
  BRAND: 'Brand',
  DURCHBRUCH: 'Durchbruch',
  ERTRINKEN: 'Ertrinken',
};

export const GEFAHRENTYP_KUERZEL: Record<GefahrentypValue, string> = {
  ATEMGIFTE: 'A',
  ANGSTREAKTION: 'A',
  AUSBREITUNG: 'A',
  ATOMARE_STRAHLUNG: 'A',
  CHEMISCHE_STOFFE: 'C',
  ERKRANKUNG_VERLETZUNG: 'E',
  EXPLOSION: 'E',
  ELEKTRIZITAET: 'E',
  EINSTURZ: 'E',
  ABSTURZ: '',
  BRAND: '',
  DURCHBRUCH: '',
  ERTRINKEN: '',
};

export const SCHUTZOBJEKT_LABELS: Record<SchutzobjektValue, string> = {
  MENSCHEN: 'Menschen',
  TIERE: 'Tiere',
  UMWELT: 'Umwelt',
  SACHWERTE: 'Sachwerte',
  EINSATZKRAEFTE: 'Einsatzkräfte',
};

export const WARNSTUFE_LABELS: Record<WarnstufeValue, string> = {
  KEINE: 'Keine',
  NIEDRIG: 'Niedrig',
  MITTEL: 'Mittel',
  HOCH: 'Hoch',
  AKUT: 'Akut',
};

/** Schutzobjekte Sektion 1: "Welche Gefahren sind erkannt?" */
export const SCHUTZOBJEKTE_ERKANNT: SchutzobjektValue[] = ['MENSCHEN', 'TIERE', 'UMWELT', 'SACHWERTE'];

/** Schutzobjekte Sektion 2: "Vor welchen Gefahren müssen sich Einsatzkräfte schützen?" */
export const SCHUTZOBJEKTE_EINSATZKRAEFTE: SchutzobjektValue[] = ['EINSATZKRAEFTE'];

export const updateBewertungSchema = z.object({
  gefahrentyp: z.enum(GEFAHRENTYPEN),
  schutzobjekt: z.enum(SCHUTZOBJEKTE),
  warnstufe: z.enum(WARNSTUFEN),
  beschreibung: z.string().max(2000).optional(),
  gemeldetVon: z.string().max(255).optional(),
});
```

```typescript
// packages/frontend/src/features/gefahrenmatrix/index.ts
export { useGefahrenmatrix, useUpdateGefahrenmatrixBewertung, GEFAHRENMATRIX_QUERY_KEYS } from './api';
export * from './schemas/gefahrenmatrix.schema';
```

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/gefahrenmatrix/
git commit -m "✨(frontend): Gefahrenmatrix Feature - API + Schemas (#414)"
```

---

## Task 11: Frontend – UI Komponenten

**Files:**
- Create: `packages/frontend/src/features/gefahrenmatrix/ui/atoms/WarnstufeBadge.tsx`
- Create: `packages/frontend/src/features/gefahrenmatrix/ui/molecules/GefahrenmatrixCell.tsx`
- Create: `packages/frontend/src/features/gefahrenmatrix/ui/organisms/GefahrenmatrixGrid.tsx`
- Create: `packages/frontend/src/features/gefahrenmatrix/ui/index.ts`

- [ ] **Step 1: WarnstufeBadge Atom erstellen**

```tsx
// packages/frontend/src/features/gefahrenmatrix/ui/atoms/WarnstufeBadge.tsx
import { cn } from '@/shared/ui/cn';
import type { WarnstufeValue } from '../../schemas/gefahrenmatrix.schema';
import { WARNSTUFE_LABELS } from '../../schemas/gefahrenmatrix.schema';

const WARNSTUFE_STYLES: Record<WarnstufeValue, string> = {
  KEINE: 'bg-surface-panel text-text-muted border-border-subtle',
  NIEDRIG: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  MITTEL: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
  HOCH: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  AKUT: 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800 font-bold',
};

interface WarnstufeBadgeProps {
  warnstufe: WarnstufeValue;
  compact?: boolean;
}

/**
 * Farb-Badge für eine Warnstufe.
 */
export function WarnstufeBadge({ warnstufe, compact = false }: WarnstufeBadgeProps) {
  if (warnstufe === 'KEINE' && compact) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium',
        WARNSTUFE_STYLES[warnstufe],
      )}
    >
      {compact ? warnstufe.charAt(0) : WARNSTUFE_LABELS[warnstufe]}
    </span>
  );
}
```

- [ ] **Step 2: GefahrenmatrixCell Molecule erstellen**

```tsx
// packages/frontend/src/features/gefahrenmatrix/ui/molecules/GefahrenmatrixCell.tsx
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { cn } from '@/shared/ui/cn';
import { WARNSTUFEN, WARNSTUFE_LABELS, type WarnstufeValue } from '../../schemas/gefahrenmatrix.schema';

const CELL_BG: Record<WarnstufeValue, string> = {
  KEINE: '',
  NIEDRIG: 'bg-green-100 dark:bg-green-950/50',
  MITTEL: 'bg-yellow-100 dark:bg-yellow-950/50',
  HOCH: 'bg-orange-100 dark:bg-orange-950/50',
  AKUT: 'bg-red-200 dark:bg-red-950/60',
};

interface GefahrenmatrixCellProps {
  warnstufe: WarnstufeValue;
  onChange: (warnstufe: WarnstufeValue) => void;
  disabled?: boolean;
}

/**
 * Einzelne Zelle der Gefahrenmatrix mit Warnstufen-Dropdown.
 */
export function GefahrenmatrixCell({ warnstufe, onChange, disabled }: GefahrenmatrixCellProps) {
  return (
    <td className={cn('border border-border-subtle p-0 text-center', CELL_BG[warnstufe])}>
      <Listbox value={warnstufe} onChange={onChange} disabled={disabled}>
        <ListboxButton
          className={cn(
            'flex h-full w-full items-center justify-center px-2 py-1.5 text-xs',
            'focus:outline-none focus-visible:shadow-focus-ring',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          {warnstufe === 'KEINE' ? '–' : WARNSTUFE_LABELS[warnstufe]}
        </ListboxButton>
        <ListboxOptions
          anchor="bottom"
          className="z-50 w-32 rounded-panel border border-border-subtle bg-surface-panel shadow-lg"
        >
          {WARNSTUFEN.map((stufe) => (
            <ListboxOption
              key={stufe}
              value={stufe}
              className={cn(
                'cursor-pointer px-3 py-1.5 text-sm text-text-primary',
                'data-[focus]:bg-surface-raised',
                stufe === warnstufe && 'font-semibold',
              )}
            >
              {WARNSTUFE_LABELS[stufe]}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </td>
  );
}
```

- [ ] **Step 3: GefahrenmatrixGrid Organism erstellen**

```tsx
// packages/frontend/src/features/gefahrenmatrix/ui/organisms/GefahrenmatrixGrid.tsx
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { cn } from '@/shared/ui/cn';
import {
  GEFAHRENTYPEN,
  GEFAHRENTYP_LABELS,
  GEFAHRENTYP_KUERZEL,
  SCHUTZOBJEKTE_ERKANNT,
  SCHUTZOBJEKTE_EINSATZKRAEFTE,
  SCHUTZOBJEKT_LABELS,
  type GefahrentypValue,
  type SchutzobjektValue,
  type WarnstufeValue,
} from '../../schemas/gefahrenmatrix.schema';
import { useGefahrenmatrix, useUpdateGefahrenmatrixBewertung } from '../../api';
import { GefahrenmatrixCell } from '../molecules/GefahrenmatrixCell';

interface GefahrenmatrixGridProps {
  einsatzId: string;
}

/**
 * Vollständige Gefahrenmatrix als interaktive Tabelle.
 * Bildet das Papierformular der Gefahrenmatrix (4A-C-5E + Zusätzliche) ab.
 */
export function GefahrenmatrixGrid({ einsatzId }: GefahrenmatrixGridProps) {
  const { data, isLoading } = useGefahrenmatrix(einsatzId);
  const { mutate: updateBewertung } = useUpdateGefahrenmatrixBewertung();

  // Bewertungen als Map: "GEFAHRENTYP:SCHUTZOBJEKT" → WarnstufeValue
  const bewertungMap = useMemo(() => {
    const map = new Map<string, WarnstufeValue>();
    if (data?.bewertungen) {
      for (const b of data.bewertungen) {
        map.set(`${b.gefahrentyp}:${b.schutzobjekt}`, b.warnstufe as WarnstufeValue);
      }
    }
    return map;
  }, [data]);

  const getWarnstufe = useCallback(
    (typ: GefahrentypValue, objekt: SchutzobjektValue): WarnstufeValue => {
      return bewertungMap.get(`${typ}:${objekt}`) ?? 'KEINE';
    },
    [bewertungMap],
  );

  const handleChange = useCallback(
    (typ: GefahrentypValue, objekt: SchutzobjektValue, warnstufe: WarnstufeValue) => {
      updateBewertung(
        {
          einsatzId,
          data: { gefahrentyp: typ, schutzobjekt: objekt, warnstufe },
        },
        {
          onError: () => {
            toast.error('Fehler beim Aktualisieren der Bewertung');
          },
        },
      );
    },
    [einsatzId, updateBewertung],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-text-muted">
        Gefahrenmatrix wird geladen...
      </div>
    );
  }

  const renderSection = (
    title: string,
    schutzobjekte: SchutzobjektValue[],
  ) => (
    <>
      <tr>
        <td
          colSpan={GEFAHRENTYPEN.length + 1}
          className="bg-surface-raised px-3 py-2 text-center text-sm font-semibold text-action-primary"
        >
          {title}
        </td>
      </tr>
      {schutzobjekte.map((objekt) => (
        <tr key={objekt}>
          <th className="whitespace-nowrap border border-border-subtle bg-surface-panel px-3 py-1.5 text-left text-xs font-semibold uppercase text-text-secondary">
            {SCHUTZOBJEKT_LABELS[objekt]}
          </th>
          {GEFAHRENTYPEN.map((typ) => (
            <GefahrenmatrixCell
              key={`${typ}:${objekt}`}
              warnstufe={getWarnstufe(typ, objekt)}
              onChange={(warnstufe) => handleChange(typ, objekt, warnstufe)}
            />
          ))}
        </tr>
      ))}
    </>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-border-subtle">
        {/* Header: Gefahrentyp Labels (diagonal/vertikal) */}
        <thead>
          <tr>
            <th className="border border-border-subtle bg-surface-raised p-2 text-left text-xs font-bold uppercase text-text-primary">
              Gefahrenmatrix
            </th>
            {GEFAHRENTYPEN.map((typ) => (
              <th
                key={typ}
                className="border border-border-subtle bg-surface-raised p-1 text-center"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] leading-tight text-text-muted">
                    {GEFAHRENTYP_LABELS[typ]}
                  </span>
                  {GEFAHRENTYP_KUERZEL[typ] && (
                    <span className={cn(
                      'text-lg font-bold',
                      GEFAHRENTYP_KUERZEL[typ] === 'A' && 'text-red-600',
                      GEFAHRENTYP_KUERZEL[typ] === 'C' && 'text-red-600',
                      GEFAHRENTYP_KUERZEL[typ] === 'E' && 'text-red-600',
                    )}>
                      {GEFAHRENTYP_KUERZEL[typ]}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {renderSection('Welche Gefahren sind erkannt?', SCHUTZOBJEKTE_ERKANNT)}
          {renderSection('Vor welchen Gefahren müssen sich Einsatzkräfte schützen?', SCHUTZOBJEKTE_EINSATZKRAEFTE)}
        </tbody>
      </table>
    </div>
  );
}
```

```typescript
// packages/frontend/src/features/gefahrenmatrix/ui/index.ts
export { GefahrenmatrixGrid } from './organisms/GefahrenmatrixGrid';
export { WarnstufeBadge } from './atoms/WarnstufeBadge';
```

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/gefahrenmatrix/ui/
git commit -m "✨(frontend): Gefahrenmatrix UI Komponenten (#414)"
```

---

## Task 12: Frontend – Route aktivieren

**Files:**
- Modify: `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/gefahren.tsx`

- [ ] **Step 1: Route ersetzen**

Datei komplett ersetzen:

```tsx
// packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/gefahren.tsx
import { createFileRoute } from '@tanstack/react-router';
import { GefahrenmatrixGrid } from '@/features/gefahrenmatrix/ui';

export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/gefahren')({
  component: GefahrenPage,
});

function GefahrenPage() {
  const { einsatzId } = Route.useParams();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Gefahrenmatrix</h2>
        <p className="text-sm text-text-muted">
          Bewertung der Gefahrenlage nach dem 4A-C-5E-Schema
        </p>
      </div>
      <GefahrenmatrixGrid einsatzId={einsatzId} />
    </div>
  );
}
```

- [ ] **Step 2: Route-Tree neu generieren**

Run: `pnpm --filter @bluelight-hub/frontend dev:vite` (generiert routeTree automatisch)
Expected: Keine Fehler, Route lädt die Matrix-Seite

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/routes/app/einsatz/\$einsatzId/sicherheit/gefahren.tsx
git commit -m "✨(frontend): Gefahrenmatrix Route aktivieren (#414)"
```

---

## Task 13: Backend Tests – Domain + Handler

**Files:**
- Create: `packages/backend/src/domain/gefahr/entities/__tests__/gefahrenmatrix.entity.spec.ts`
- Create: `packages/backend/src/application/gefahr/commands/update-gefahrenmatrix/__tests__/update-gefahrenmatrix.handler.spec.ts`
- Create: `packages/backend/src/application/gefahr/queries/get-gefahrenmatrix/__tests__/get-gefahrenmatrix.handler.spec.ts`

- [ ] **Step 1: Entity Unit Tests schreiben**

```typescript
// packages/backend/src/domain/gefahr/entities/__tests__/gefahrenmatrix.entity.spec.ts
import { GefahrenmatrixBewertung } from '../gefahrenmatrix.entity';
import { Gefahrentyp } from '../../value-objects/gefahrentyp';
import { Schutzobjekt } from '../../value-objects/schutzobjekt';
import { Warnstufe } from '../../value-objects/warnstufe';

describe('GefahrenmatrixBewertung', () => {
  const validProps = {
    einsatzId: 'test-einsatz-id-1234567',
    gefahrentyp: Gefahrentyp.ATEMGIFTE,
    schutzobjekt: Schutzobjekt.MENSCHEN,
    warnstufe: Warnstufe.HOCH,
    aktualisiertVon: 'test-user-id-12345678',
  };

  describe('create', () => {
    it('erstellt eine Bewertung mit gültigen Props', () => {
      const result = GefahrenmatrixBewertung.create(validProps);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.gefahrentyp).toBe(Gefahrentyp.ATEMGIFTE);
      expect(result.value!.schutzobjekt).toBe(Schutzobjekt.MENSCHEN);
      expect(result.value!.warnstufe).toBe(Warnstufe.HOCH);
    });

    it('emittiert GefahrenmatrixAktualisiertEvent', () => {
      const result = GefahrenmatrixBewertung.create(validProps);

      expect(result.isSuccess).toBe(true);
      const events = result.value!.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('GefahrenmatrixAktualisiertEvent');
    });

    it('schlägt fehl bei ungültigem Gefahrentyp', () => {
      const result = GefahrenmatrixBewertung.create({
        ...validProps,
        gefahrentyp: 'INVALID' as Gefahrentyp,
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('GEFAHR_GEFAHRENTYP_INVALID');
    });

    it('schlägt fehl bei ungültigem Schutzobjekt', () => {
      const result = GefahrenmatrixBewertung.create({
        ...validProps,
        schutzobjekt: 'INVALID' as Schutzobjekt,
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('GEFAHR_SCHUTZOBJEKT_INVALID');
    });

    it('schlägt fehl bei ungültiger Warnstufe', () => {
      const result = GefahrenmatrixBewertung.create({
        ...validProps,
        warnstufe: 'INVALID' as Warnstufe,
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('GEFAHR_WARNSTUFE_INVALID');
    });

    it('speichert optionale Beschreibung', () => {
      const result = GefahrenmatrixBewertung.create({
        ...validProps,
        beschreibung: 'Chlorgasaustritt in Halle 3',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBe('Chlorgasaustritt in Halle 3');
    });

    it('trimmt Beschreibung', () => {
      const result = GefahrenmatrixBewertung.create({
        ...validProps,
        beschreibung: '  Test  ',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBe('Test');
    });
  });

  describe('updateWarnstufe', () => {
    it('aktualisiert die Warnstufe', () => {
      const bewertung = GefahrenmatrixBewertung.create(validProps).value!;
      bewertung.clearDomainEvents();

      const result = bewertung.updateWarnstufe(Warnstufe.AKUT, 'updater-id-1234567');

      expect(result.isSuccess).toBe(true);
      expect(bewertung.warnstufe).toBe(Warnstufe.AKUT);
    });

    it('emittiert Event bei Änderung', () => {
      const bewertung = GefahrenmatrixBewertung.create(validProps).value!;
      bewertung.clearDomainEvents();

      bewertung.updateWarnstufe(Warnstufe.AKUT, 'updater-id-1234567');

      const events = bewertung.getDomainEvents();
      expect(events).toHaveLength(1);
    });
  });

  describe('reconstruct', () => {
    it('rekonstruiert Bewertung ohne Events', () => {
      const created = GefahrenmatrixBewertung.create(validProps).value!;

      const reconstructed = GefahrenmatrixBewertung.reconstruct({
        id: created.id,
        einsatzId: created.einsatzId,
        gefahrentyp: created.gefahrentyp,
        schutzobjekt: created.schutzobjekt,
        warnstufe: created.warnstufe,
        beschreibung: created.beschreibung,
        gemeldetVon: created.gemeldetVon,
        aktualisiertVon: created.aktualisiertVon,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      });

      expect(reconstructed.getDomainEvents()).toHaveLength(0);
      expect(reconstructed.gefahrentyp).toBe(created.gefahrentyp);
    });
  });
});
```

- [ ] **Step 2: Tests ausführen und prüfen dass sie bestehen**

Run: `cd packages/backend && pnpx jest --testPathPatterns="gefahrenmatrix" --no-coverage`
Expected: Alle Tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/domain/gefahr/entities/__tests__/
git commit -m "🧪(backend): Gefahrenmatrix Domain Entity Tests (#414)"
```

---

## Task 14: Integration Test – Controller

**Files:**
- Create: `packages/backend/src/modules/gefahr/controllers/__tests__/gefahrenmatrix.controller.spec.ts`

- [ ] **Step 1: Controller Test schreiben**

```typescript
// packages/backend/src/modules/gefahr/controllers/__tests__/gefahrenmatrix.controller.spec.ts
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GefahrenmatrixController } from '../gefahrenmatrix.controller';
import { GetGefahrenmatrixHandler } from '@/application/gefahr/queries/get-gefahrenmatrix/get-gefahrenmatrix.handler';
import { UpdateGefahrenmatrixHandler } from '@/application/gefahr/commands/update-gefahrenmatrix/update-gefahrenmatrix.handler';
import { Result } from '@domain/common/result';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

describe('GefahrenmatrixController', () => {
  let controller: GefahrenmatrixController;
  let getHandler: jest.Mocked<GetGefahrenmatrixHandler>;
  let updateHandler: jest.Mocked<UpdateGefahrenmatrixHandler>;

  const mockUser: ValidatedUser = {
    userId: 'test-user-id-12345678',
    email: 'test@example.com',
    role: 'ADMIN',
  } as ValidatedUser;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [GefahrenmatrixController],
      providers: [
        {
          provide: GetGefahrenmatrixHandler,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateGefahrenmatrixHandler,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(GefahrenmatrixController);
    getHandler = module.get(GetGefahrenmatrixHandler);
    updateHandler = module.get(UpdateGefahrenmatrixHandler);
  });

  describe('get', () => {
    it('gibt Gefahrenmatrix zurück', async () => {
      const expected = { einsatzId: 'test-123', bewertungen: [] };
      getHandler.execute.mockResolvedValue(Result.ok(expected));

      const result = await controller.get('test-123');

      expect(result).toEqual(expected);
    });

    it('wirft BadRequestException bei leerem einsatzId', async () => {
      await expect(controller.get('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateBewertung', () => {
    it('aktualisiert eine Bewertung', async () => {
      const expected = {
        id: 'bewertung-1',
        gefahrentyp: 'ATEMGIFTE',
        schutzobjekt: 'MENSCHEN',
        warnstufe: 'HOCH',
        beschreibung: null,
        gemeldetVon: null,
        updatedAt: new Date(),
      };
      updateHandler.execute.mockResolvedValue(Result.ok(expected));

      const result = await controller.updateBewertung(
        'test-123',
        { gefahrentyp: 'ATEMGIFTE', schutzobjekt: 'MENSCHEN', warnstufe: 'HOCH' },
        mockUser,
      );

      expect(result).toEqual(expected);
    });

    it('wirft BadRequestException bei ungültigem Gefahrentyp', async () => {
      await expect(
        controller.updateBewertung(
          'test-123',
          { gefahrentyp: 'INVALID', schutzobjekt: 'MENSCHEN', warnstufe: 'HOCH' },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 2: Tests ausführen**

Run: `cd packages/backend && pnpx jest --testPathPatterns="gefahrenmatrix.controller" --no-coverage`
Expected: Alle Tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/modules/gefahr/controllers/__tests__/
git commit -m "🧪(backend): Gefahrenmatrix Controller Tests (#414)"
```

---

## Task 15: End-to-End Verify + Cleanup

- [ ] **Step 1: Backend Tests komplett laufen lassen**

Run: `cd packages/backend && pnpx jest --no-coverage`
Expected: Alle bestehenden Tests + neue Tests bestehen

- [ ] **Step 2: Lint prüfen**

Run: `pnpm lint`
Expected: Keine neuen Lint-Fehler

- [ ] **Step 3: DI Import Check**

Run: `pnpm --filter @bluelight-hub/backend check:di:imports`
Expected: Keine Violations (alle Injectable Classes mit `import`, nicht `import type`)

- [ ] **Step 4: Frontend Build prüfen**

Run: `pnpm --filter @bluelight-hub/frontend build`
Expected: Build erfolgreich

- [ ] **Step 5: Finaler Commit**

Falls Fixes nötig waren:
```bash
git add -A
git commit -m "🐛(backend/frontend): Gefahrenmatrix Fixes (#414)"
```
