# Operative Nutzer & Rollen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a three-tier operative role system (Führungskraft, Einsatzkraft, Externe) with Stammperson linking, backend guards, and an Einsatz join-request workflow.

**Architecture:** Extends the existing User model with an `OperativeRole` enum field and an optional `stammpersonId` FK to `StammPerson`. A new `EinsatzBeitrittsanfrage` model handles join requests. Backend guards filter Einsatz access by operative role. Admin UI allows role/Stammperson management.

**Tech Stack:** Prisma + PostgreSQL, NestJS (CQRS, Guards, Decorators), React 19 + TanStack Query/Router, Zod, Tailwind + Headless UI

**Spec:** `docs/superpowers/specs/2026-03-27-operative-nutzer-rollen-design.md`

---

## File Structure

### Backend — New Files

| File | Responsibility |
|---|---|
| `src/domain/value-objects/operative-role.ts` | OperativeRole Value Object |
| `src/domain/value-objects/__tests__/operative-role.spec.ts` | Tests |
| `src/domain/events/operative-role-changed.event.ts` | Domain Event |
| `src/domain/events/stammperson-assigned.event.ts` | Domain Event |
| `src/domain/events/einsatz-beitrittsanfrage-erstellt.event.ts` | Domain Event |
| `src/domain/events/einsatz-beitrittsanfrage-entschieden.event.ts` | Domain Event |
| `src/domain/repositories/i-einsatz-beitrittsanfrage.repository.ts` | Repository Port |
| `src/application/user-management/commands/change-operative-role/change-operative-role.command.ts` | Command |
| `src/application/user-management/commands/change-operative-role/change-operative-role.handler.ts` | Handler |
| `src/application/user-management/commands/change-operative-role/__tests__/change-operative-role.handler.spec.ts` | Tests |
| `src/application/user-management/commands/assign-stammperson/assign-stammperson.command.ts` | Command |
| `src/application/user-management/commands/assign-stammperson/assign-stammperson.handler.ts` | Handler |
| `src/application/user-management/commands/assign-stammperson/__tests__/assign-stammperson.handler.spec.ts` | Tests |
| `src/application/einsatz-beitritt/commands/create-beitrittsanfrage/create-beitrittsanfrage.command.ts` | Command |
| `src/application/einsatz-beitritt/commands/create-beitrittsanfrage/create-beitrittsanfrage.handler.ts` | Handler |
| `src/application/einsatz-beitritt/commands/create-beitrittsanfrage/__tests__/create-beitrittsanfrage.handler.spec.ts` | Tests |
| `src/application/einsatz-beitritt/commands/resolve-beitrittsanfrage/resolve-beitrittsanfrage.command.ts` | Command |
| `src/application/einsatz-beitritt/commands/resolve-beitrittsanfrage/resolve-beitrittsanfrage.handler.ts` | Handler |
| `src/application/einsatz-beitritt/commands/resolve-beitrittsanfrage/__tests__/resolve-beitrittsanfrage.handler.spec.ts` | Tests |
| `src/application/einsatz-beitritt/queries/get-beitrittsanfragen/get-beitrittsanfragen.query.ts` | Query |
| `src/application/einsatz-beitritt/queries/get-beitrittsanfragen/get-beitrittsanfragen.handler.ts` | Handler |
| `src/application/einsatz-beitritt/einsatz-beitritt-application.module.ts` | Application Module |
| `src/infrastructure/database/repositories/prisma-einsatz-beitrittsanfrage.repository.ts` | Repository Impl |
| `src/modules/auth/guards/operative-role.guard.ts` | Guard |
| `src/modules/auth/decorators/operative-roles.decorator.ts` | Decorator |
| `src/modules/einsatz-beitritt/controllers/einsatz-beitritt.controller.ts` | Controller |
| `src/modules/einsatz-beitritt/einsatz-beitritt.module.ts` | Module |

### Backend — Modified Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `OperativeRole` enum, `BeitrittsanfrageStatus` enum, User fields, `EinsatzBeitrittsanfrage` model |
| `src/domain/events/event-names.ts` | Add `OPERATIVE_ROLLE` and `BEITRITTSANFRAGE` event name constants |
| `src/infrastructure/di-tokens.ts` | Add `EINSATZ_BEITRITTSANFRAGE_REPOSITORY` token |
| `src/infrastructure/outbox/event-serializer.ts` | Register 4 new events |
| `src/infrastructure/outbox/event-deserializer.ts` | Register 4 new events |
| `src/modules/einsatz/controllers/einsatz.controller.ts` | Filter Einsatz list/detail by operative role |
| `src/modules/auth/strategies/jwt.strategy.ts` | Include `operativeRole` in JWT payload/ValidatedUser |

### Frontend — New Files

| File | Responsibility |
|---|---|
| `src/features/operative-roles/api/queries.ts` | Query keys |
| `src/features/operative-roles/api/use-beitrittsanfragen.ts` | Query hook |
| `src/features/operative-roles/api/use-create-beitrittsanfrage.ts` | Mutation hook |
| `src/features/operative-roles/api/use-resolve-beitrittsanfrage.ts` | Mutation hook |
| `src/features/operative-roles/hooks/use-operative-role.ts` | Role helper hook |
| `src/features/operative-roles/hooks/use-can-access-einsatz.ts` | Access check hook |
| `src/features/operative-roles/index.ts` | Barrel export |

### Frontend — Modified Files

| File | Change |
|---|---|
| `src/features/admin/` | Add operative role dropdown + Stammperson picker to user management |
| `src/features/einsatz/` | Filter Einsatz list by role, add "Beitritt anfragen" button |

---

## Task 1: Prisma Schema + Migration

**Files:**
- Modify: `packages/backend/prisma/schema.prisma`

- [ ] **Step 1: Add OperativeRole + BeitrittsanfrageStatus enums**

Add after the `UserRole` enum (line 20):

```prisma
enum OperativeRole {
  FUEHRUNGSKRAFT
  EINSATZKRAFT
  EXTERNE
}

enum BeitrittsanfrageStatus {
  OFFEN
  GENEHMIGT
  ABGELEHNT
}
```

- [ ] **Step 2: Add operative role + stammperson fields to User model**

Add after `permissions` field (line 51), before `// Relations`:

```prisma
  // Operative Role (Issue #98)
  operativeRole  OperativeRole  @default(EXTERNE)
  stammpersonId  String?        @unique
  stammperson    StammPerson?   @relation("UserStammperson", fields: [stammpersonId], references: [id])
```

Add to the indexes section (after line 223):

```prisma
  @@index([operativeRole], map: "idx_user_operative_role")
```

- [ ] **Step 3: Add reverse relation on StammPerson model**

Add in StammPerson model (after `einsatzPersonen` relation, line 963):

```prisma
  // User-Account Relation (Issue #98 - Stammperson Verknüpfung)
  userAccount User? @relation("UserStammperson")
```

- [ ] **Step 4: Add EinsatzBeitrittsanfrage model**

Add at the end of the schema file:

```prisma
/// Beitrittsanfrage: Einsatzkraft fragt Beitritt zu einem Einsatz an
/// Führungskraft genehmigt oder lehnt ab (Issue #98)
model EinsatzBeitrittsanfrage {
  id         String                  @id @default(cuid())
  einsatzId  String
  userId     String
  status     BeitrittsanfrageStatus  @default(OFFEN)
  createdAt  DateTime                @default(now())
  resolvedAt DateTime?
  resolvedBy String?                 @db.VarChar(100)

  // Relations
  einsatz  Einsatz @relation(fields: [einsatzId], references: [id], onDelete: Cascade)
  user     User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  resolver User?   @relation("BeitrittsanfrageResolver", fields: [resolvedBy], references: [id], onDelete: SetNull)

  @@unique([einsatzId, userId])
  @@index([einsatzId, status])
  @@index([userId, status])
  @@map("einsatz_beitrittsanfragen")
}
```

Add User relation (after `einsatzRollenzuweisungen`, line 200):

```prisma
  // Beitrittsanfragen Relations (Issue #98)
  einsatzBeitrittsanfragen         EinsatzBeitrittsanfrage[]
  resolvedEinsatzBeitrittsanfragen EinsatzBeitrittsanfrage[] @relation("BeitrittsanfrageResolver")
```

Add Einsatz relation (find `model Einsatz`, add inside relations):

```prisma
  // Beitrittsanfragen (Issue #98)
  beitrittsanfragen EinsatzBeitrittsanfrage[]
```

- [ ] **Step 5: Run migration**

```bash
cd packages/backend && pnpx prisma migrate dev --name add_operative_roles_and_beitrittsanfragen
```

- [ ] **Step 6: Verify migration**

```bash
cd packages/backend && pnpx prisma generate
```

- [ ] **Step 7: Commit**

```bash
git add packages/backend/prisma/
git commit -m "✨(backend): Prisma Schema für operative Rollen und Beitrittsanfragen

Neue Enums: OperativeRole (FUEHRUNGSKRAFT, EINSATZKRAFT, EXTERNE),
BeitrittsanfrageStatus (OFFEN, GENEHMIGT, ABGELEHNT).
User bekommt operativeRole (default EXTERNE) + stammpersonId.
Neues Modell EinsatzBeitrittsanfrage für Beitritts-Workflow.

Issue: #98"
```

---

## Task 2: Domain — OperativeRole Value Object

**Files:**
- Create: `packages/backend/src/domain/value-objects/operative-role.ts`
- Test: `packages/backend/src/domain/value-objects/__tests__/operative-role.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/backend/src/domain/value-objects/__tests__/operative-role.spec.ts`:

```typescript
import { OperativeRole } from '../operative-role';

describe('OperativeRole', () => {
  describe('create', () => {
    it('erstellt FUEHRUNGSKRAFT aus gültigem String', () => {
      const result = OperativeRole.create('FUEHRUNGSKRAFT');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('FUEHRUNGSKRAFT');
    });

    it('erstellt EINSATZKRAFT aus gültigem String', () => {
      const result = OperativeRole.create('EINSATZKRAFT');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('EINSATZKRAFT');
    });

    it('erstellt EXTERNE aus gültigem String', () => {
      const result = OperativeRole.create('EXTERNE');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('EXTERNE');
    });

    it('lehnt ungültigen Wert ab', () => {
      const result = OperativeRole.create('INVALID');
      expect(result.isFailure).toBe(true);
    });
  });

  describe('static factories', () => {
    it('FUEHRUNGSKRAFT() erstellt korrekte Rolle', () => {
      expect(OperativeRole.FUEHRUNGSKRAFT().value).toBe('FUEHRUNGSKRAFT');
    });

    it('EINSATZKRAFT() erstellt korrekte Rolle', () => {
      expect(OperativeRole.EINSATZKRAFT().value).toBe('EINSATZKRAFT');
    });

    it('EXTERNE() erstellt korrekte Rolle', () => {
      expect(OperativeRole.EXTERNE().value).toBe('EXTERNE');
    });
  });

  describe('canAccessEinsatzList', () => {
    it('FK kann Einsatz-Liste sehen', () => {
      expect(OperativeRole.FUEHRUNGSKRAFT().canAccessEinsatzList()).toBe(true);
    });

    it('EK kann Einsatz-Liste sehen', () => {
      expect(OperativeRole.EINSATZKRAFT().canAccessEinsatzList()).toBe(true);
    });

    it('Externe kann Einsatz-Liste NICHT sehen', () => {
      expect(OperativeRole.EXTERNE().canAccessEinsatzList()).toBe(false);
    });
  });

  describe('canOpenEinsatz', () => {
    it('FK kann Einsatz öffnen', () => {
      expect(OperativeRole.FUEHRUNGSKRAFT().canOpenEinsatz()).toBe(true);
    });

    it('EK kann Einsatz NICHT öffnen', () => {
      expect(OperativeRole.EINSATZKRAFT().canOpenEinsatz()).toBe(false);
    });

    it('Externe kann Einsatz NICHT öffnen', () => {
      expect(OperativeRole.EXTERNE().canOpenEinsatz()).toBe(false);
    });
  });

  describe('canArchiveEinsatz', () => {
    it('FK kann Einsatz archivieren', () => {
      expect(OperativeRole.FUEHRUNGSKRAFT().canArchiveEinsatz()).toBe(true);
    });

    it('EK kann Einsatz NICHT archivieren', () => {
      expect(OperativeRole.EINSATZKRAFT().canArchiveEinsatz()).toBe(false);
    });

    it('Externe kann Einsatz NICHT archivieren', () => {
      expect(OperativeRole.EXTERNE().canArchiveEinsatz()).toBe(false);
    });
  });

  describe('requiresStammperson', () => {
    it('FK benötigt Stammperson', () => {
      expect(OperativeRole.FUEHRUNGSKRAFT().requiresStammperson()).toBe(true);
    });

    it('EK benötigt Stammperson', () => {
      expect(OperativeRole.EINSATZKRAFT().requiresStammperson()).toBe(true);
    });

    it('Externe benötigt KEINE Stammperson', () => {
      expect(OperativeRole.EXTERNE().requiresStammperson()).toBe(false);
    });
  });

  describe('toString', () => {
    it('gibt den Rollenwert zurück', () => {
      expect(OperativeRole.FUEHRUNGSKRAFT().toString()).toBe('FUEHRUNGSKRAFT');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/backend && npx jest --testPathPatterns="operative-role.spec" --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement OperativeRole Value Object**

Create `packages/backend/src/domain/value-objects/operative-role.ts`:

```typescript
import { Result } from '@domain/common/result';
import { ValueObject } from '@domain/common/value-object';

interface OperativeRoleProps extends Record<string, unknown> {
  value: string;
}

/**
 * OperativeRole Value Object — Operative Zugangsebene eines Benutzers.
 *
 * Drei Stufen:
 * - FUEHRUNGSKRAFT: Voller operativer Zugang (inkl. Führungsunterstützung)
 * - EINSATZKRAFT: Einsätze sichtbar, Beitritt per Anfrage
 * - EXTERNE: Nur eingeladene Einsätze sichtbar
 */
export class OperativeRole extends ValueObject<OperativeRoleProps> {
  private static readonly ALLOWED_VALUES = ['FUEHRUNGSKRAFT', 'EINSATZKRAFT', 'EXTERNE'] as const;

  private constructor(value: string) {
    super({ value });
  }

  public static create(value: string): Result<OperativeRole> {
    if (!OperativeRole.ALLOWED_VALUES.includes(value as (typeof OperativeRole.ALLOWED_VALUES)[number])) {
      return Result.fail<OperativeRole>(
        `Ungültige operative Rolle: ${value}. Erlaubte Werte: ${OperativeRole.ALLOWED_VALUES.join(', ')}`,
      );
    }
    return Result.ok<OperativeRole>(new OperativeRole(value));
  }

  public static FUEHRUNGSKRAFT(): OperativeRole {
    return new OperativeRole('FUEHRUNGSKRAFT');
  }

  public static EINSATZKRAFT(): OperativeRole {
    return new OperativeRole('EINSATZKRAFT');
  }

  public static EXTERNE(): OperativeRole {
    return new OperativeRole('EXTERNE');
  }

  get value(): string {
    return this.props.value;
  }

  /** FK und EK sehen die Einsatz-Liste, Externe nicht */
  public canAccessEinsatzList(): boolean {
    return this.value !== 'EXTERNE';
  }

  /** Nur FK kann Einsätze direkt öffnen (EK/Ex nur über Zuweisung) */
  public canOpenEinsatz(): boolean {
    return this.value === 'FUEHRUNGSKRAFT';
  }

  /** Nur FK kann Einsätze archivieren/löschen */
  public canArchiveEinsatz(): boolean {
    return this.value === 'FUEHRUNGSKRAFT';
  }

  /** FK und EK müssen eine Stammperson haben, Externe nicht */
  public requiresStammperson(): boolean {
    return this.value !== 'EXTERNE';
  }

  public toString(): string {
    return this.value;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/backend && npx jest --testPathPatterns="operative-role.spec" --no-coverage
```

Expected: All 14 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/domain/value-objects/operative-role.ts packages/backend/src/domain/value-objects/__tests__/operative-role.spec.ts
git commit -m "✨(backend): OperativeRole Value Object mit Tests

FUEHRUNGSKRAFT/EINSATZKRAFT/EXTERNE mit Zugriffsmethoden:
canAccessEinsatzList, canOpenEinsatz, canArchiveEinsatz, requiresStammperson.

Issue: #98"
```

---

## Task 3: Domain Events + EVENT_NAMES

**Files:**
- Modify: `packages/backend/src/domain/events/event-names.ts`
- Create: `packages/backend/src/domain/events/operative-role-changed.event.ts`
- Create: `packages/backend/src/domain/events/stammperson-assigned.event.ts`
- Create: `packages/backend/src/domain/events/einsatz-beitrittsanfrage-erstellt.event.ts`
- Create: `packages/backend/src/domain/events/einsatz-beitrittsanfrage-entschieden.event.ts`

- [ ] **Step 1: Add EVENT_NAMES constants**

In `packages/backend/src/domain/events/event-names.ts`, add before the closing `} as const;` (after SYSTEM block, line 263):

```typescript
  /**
   * Operative Rolle Bounded Context Events (Issue #98)
   */
  OPERATIVE_ROLLE: {
    /** Event: Operative Rolle eines Users wurde geändert */
    CHANGED: 'operative_rolle.changed',
    /** Event: Stammperson wurde einem User zugewiesen */
    STAMMPERSON_ASSIGNED: 'operative_rolle.stammperson_assigned',
  },

  /**
   * Einsatz-Beitrittsanfrage Bounded Context Events (Issue #98)
   */
  BEITRITTSANFRAGE: {
    /** Event: Neue Beitrittsanfrage wurde erstellt */
    ERSTELLT: 'beitrittsanfrage.erstellt',
    /** Event: Beitrittsanfrage wurde entschieden (genehmigt/abgelehnt) */
    ENTSCHIEDEN: 'beitrittsanfrage.entschieden',
  },
```

Also update the `EventName` type union (after line 295) to include the new namespaces:

```typescript
  | (typeof EVENT_NAMES.OPERATIVE_ROLLE)[keyof typeof EVENT_NAMES.OPERATIVE_ROLLE]
  | (typeof EVENT_NAMES.BEITRITTSANFRAGE)[keyof typeof EVENT_NAMES.BEITRITTSANFRAGE];
```

- [ ] **Step 2: Create OperativeRoleChangedEvent**

Create `packages/backend/src/domain/events/operative-role-changed.event.ts`:

```typescript
import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { UserId } from '@domain/value-objects/user-id';

/**
 * Event: Die operative Rolle eines Users wurde geändert.
 * Ausgelöst von: Admin über ChangeOperativeRoleCommand
 */
export class OperativeRoleChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: UserId,
    public readonly oldRole: string,
    public readonly newRole: string,
    public readonly changedBy: UserId,
    aggregateId?: string,
  ) {
    super(aggregateId ?? userId.toString());
  }

  static eventName(): string {
    return EVENT_NAMES.OPERATIVE_ROLLE.CHANGED;
  }
}
```

- [ ] **Step 3: Create StammpersonAssignedEvent**

Create `packages/backend/src/domain/events/stammperson-assigned.event.ts`:

```typescript
import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { UserId } from '@domain/value-objects/user-id';

/**
 * Event: Eine Stammperson wurde einem User zugewiesen.
 * Ausgelöst von: Admin über AssignStammpersonCommand
 */
export class StammpersonAssignedEvent extends DomainEvent {
  constructor(
    public readonly userId: UserId,
    public readonly stammpersonId: string,
    public readonly assignedBy: UserId,
    aggregateId?: string,
  ) {
    super(aggregateId ?? userId.toString());
  }

  static eventName(): string {
    return EVENT_NAMES.OPERATIVE_ROLLE.STAMMPERSON_ASSIGNED;
  }
}
```

- [ ] **Step 4: Create EinsatzBeitrittsanfrageErstelltEvent**

Create `packages/backend/src/domain/events/einsatz-beitrittsanfrage-erstellt.event.ts`:

```typescript
import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Event: Eine Einsatzkraft hat einen Beitritt zu einem Einsatz angefragt.
 */
export class EinsatzBeitrittsanfrageErstelltEvent extends DomainEvent {
  constructor(
    public readonly anfrageId: string,
    public readonly einsatzId: string,
    public readonly userId: string,
    aggregateId?: string,
  ) {
    super(aggregateId ?? anfrageId);
  }

  static eventName(): string {
    return EVENT_NAMES.BEITRITTSANFRAGE.ERSTELLT;
  }
}
```

- [ ] **Step 5: Create EinsatzBeitrittsanfrageEntschiedenEvent**

Create `packages/backend/src/domain/events/einsatz-beitrittsanfrage-entschieden.event.ts`:

```typescript
import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Event: Eine Beitrittsanfrage wurde durch eine Führungskraft entschieden.
 */
export class EinsatzBeitrittsanfrageEntschiedenEvent extends DomainEvent {
  constructor(
    public readonly anfrageId: string,
    public readonly einsatzId: string,
    public readonly userId: string,
    public readonly decision: 'GENEHMIGT' | 'ABGELEHNT',
    public readonly resolvedBy: string,
    aggregateId?: string,
  ) {
    super(aggregateId ?? anfrageId);
  }

  static eventName(): string {
    return EVENT_NAMES.BEITRITTSANFRAGE.ENTSCHIEDEN;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/domain/events/
git commit -m "✨(backend): Domain Events für operative Rollen und Beitrittsanfragen

4 neue Events: OperativeRoleChanged, StammpersonAssigned,
BeitrittsanfrageErstellt, BeitrittsanfrageEntschieden.
EVENT_NAMES um OPERATIVE_ROLLE + BEITRITTSANFRAGE erweitert.

Issue: #98"
```

---

## Task 4: Infrastructure — DI Tokens + Repository Port + Implementation

**Files:**
- Modify: `packages/backend/src/infrastructure/di-tokens.ts`
- Create: `packages/backend/src/domain/repositories/i-einsatz-beitrittsanfrage.repository.ts`
- Create: `packages/backend/src/infrastructure/database/repositories/prisma-einsatz-beitrittsanfrage.repository.ts`

- [ ] **Step 1: Add DI Token**

In `packages/backend/src/infrastructure/di-tokens.ts`, add with the other repository tokens:

```typescript
export const EINSATZ_BEITRITTSANFRAGE_REPOSITORY = Symbol('IEinsatzBeitrittsanfrageRepository');
```

- [ ] **Step 2: Create repository port (interface)**

Create `packages/backend/src/domain/repositories/i-einsatz-beitrittsanfrage.repository.ts`:

```typescript
import type { TransactionContext } from '@domain/common/transaction-context';

export interface EinsatzBeitrittsanfrageData {
  id: string;
  einsatzId: string;
  userId: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}

export interface IEinsatzBeitrittsanfrageRepository {
  save(data: { einsatzId: string; userId: string }, tx?: TransactionContext): Promise<EinsatzBeitrittsanfrageData>;
  findById(id: string): Promise<EinsatzBeitrittsanfrageData | null>;
  findOpenByEinsatzAndUser(einsatzId: string, userId: string): Promise<EinsatzBeitrittsanfrageData | null>;
  findByEinsatz(einsatzId: string, status?: string): Promise<EinsatzBeitrittsanfrageData[]>;
  resolve(id: string, decision: string, resolvedBy: string, tx?: TransactionContext): Promise<EinsatzBeitrittsanfrageData>;
}
```

- [ ] **Step 3: Create Prisma repository implementation**

Create `packages/backend/src/infrastructure/database/repositories/prisma-einsatz-beitrittsanfrage.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import type { IEinsatzBeitrittsanfrageRepository, EinsatzBeitrittsanfrageData } from '@domain/repositories/i-einsatz-beitrittsanfrage.repository';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { TransactionContext } from '@domain/common/transaction-context';

@Injectable()
export class PrismaEinsatzBeitrittsanfrageRepository implements IEinsatzBeitrittsanfrageRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: TransactionContext) {
    return tx ?? this.prisma;
  }

  async save(data: { einsatzId: string; userId: string }, tx?: TransactionContext): Promise<EinsatzBeitrittsanfrageData> {
    const client = this.getClient(tx);
    return client.einsatzBeitrittsanfrage.create({
      data: { einsatzId: data.einsatzId, userId: data.userId },
    });
  }

  async findById(id: string): Promise<EinsatzBeitrittsanfrageData | null> {
    return this.prisma.einsatzBeitrittsanfrage.findUnique({ where: { id } });
  }

  async findOpenByEinsatzAndUser(einsatzId: string, userId: string): Promise<EinsatzBeitrittsanfrageData | null> {
    return this.prisma.einsatzBeitrittsanfrage.findFirst({
      where: { einsatzId, userId, status: 'OFFEN' },
    });
  }

  async findByEinsatz(einsatzId: string, status?: string): Promise<EinsatzBeitrittsanfrageData[]> {
    return this.prisma.einsatzBeitrittsanfrage.findMany({
      where: { einsatzId, ...(status ? { status: status as any } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(id: string, decision: string, resolvedBy: string, tx?: TransactionContext): Promise<EinsatzBeitrittsanfrageData> {
    const client = this.getClient(tx);
    return client.einsatzBeitrittsanfrage.update({
      where: { id },
      data: { status: decision as any, resolvedAt: new Date(), resolvedBy },
    });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/infrastructure/di-tokens.ts packages/backend/src/domain/repositories/i-einsatz-beitrittsanfrage.repository.ts packages/backend/src/infrastructure/database/repositories/prisma-einsatz-beitrittsanfrage.repository.ts
git commit -m "✨(backend): Repository Port + Prisma Implementierung für Beitrittsanfragen

DI Token, Interface und PrismaEinsatzBeitrittsanfrageRepository.

Issue: #98"
```

---

## Task 5: OperativeRoleGuard + Decorator

**Files:**
- Create: `packages/backend/src/modules/auth/decorators/operative-roles.decorator.ts`
- Create: `packages/backend/src/modules/auth/guards/operative-role.guard.ts`

- [ ] **Step 1: Create decorator**

Create `packages/backend/src/modules/auth/decorators/operative-roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import type { OperativeRole } from '@/generated/prisma/client';

export const OPERATIVE_ROLES_KEY = 'operativeRoles';

/**
 * Decorator zum Festlegen erforderlicher operativer Rollen für Endpunkte.
 *
 * @example
 * ```typescript
 * @RequiresOperativeRole('FUEHRUNGSKRAFT')
 * @UseGuards(JwtAuthGuard, OperativeRoleGuard)
 * async archiveEinsatz() { ... }
 * ```
 */
export const RequiresOperativeRole = (...roles: OperativeRole[]) => SetMetadata(OPERATIVE_ROLES_KEY, roles);
```

- [ ] **Step 2: Create guard**

Create `packages/backend/src/modules/auth/guards/operative-role.guard.ts`:

```typescript
import { type CanActivate, type ExecutionContext, Injectable, ForbiddenException, Inject } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@/infrastructure/di-tokens';
import { Reflector } from '@nestjs/core';
import type { OperativeRole } from '@/generated/prisma/client';
import { OPERATIVE_ROLES_KEY } from '../decorators/operative-roles.decorator';
import type { ValidatedUser } from '../strategies/jwt.strategy';

/**
 * Guard zur operativen Rollenkontrolle.
 *
 * Prüft ob der User eine der erforderlichen operativen Rollen hat.
 * Muss NACH JwtAuthGuard verwendet werden.
 */
@Injectable()
export class OperativeRoleGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private reflector: Reflector,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<OperativeRole[]>(OPERATIVE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: ValidatedUser | undefined = request.user;

    if (!user) {
      this.logger.warn('OperativeRoleGuard: Kein User im Request — JwtAuthGuard fehlt?');
      throw new ForbiddenException('Nicht authentifiziert');
    }

    if (!user.operativeRole) {
      this.logger.warn(`OperativeRoleGuard: User ${user.userId} hat keine operative Rolle`);
      throw new ForbiddenException('Keine operative Rolle zugewiesen');
    }

    const hasRequiredRole = requiredRoles.includes(user.operativeRole);

    if (!hasRequiredRole) {
      this.logger.warn(
        `OperativeRoleGuard: User ${user.userId} mit Rolle ${user.operativeRole} abgelehnt (benötigt: ${requiredRoles.join(', ')})`,
      );
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Diese Funktion erfordert eine andere operative Rolle',
        suggestedAction: 'Zurück zum Überblick',
      });
    }

    return true;
  }
}
```

- [ ] **Step 3: Update JWT Strategy to include operativeRole**

In `packages/backend/src/modules/auth/strategies/jwt.strategy.ts`, the `ValidatedUser` interface and `validate()` method need to include `operativeRole`. Find the `ValidatedUser` interface/type and add:

```typescript
operativeRole?: OperativeRole; // from @/generated/prisma/client
```

In the `validate()` method where the user is loaded from DB, include `operativeRole` in the select/return.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/modules/auth/decorators/operative-roles.decorator.ts packages/backend/src/modules/auth/guards/operative-role.guard.ts packages/backend/src/modules/auth/strategies/jwt.strategy.ts
git commit -m "✨(backend): OperativeRoleGuard + RequiresOperativeRole Decorator

Analog zu RolesGuard/Roles für die operative Rollenebene.
JWT Strategy gibt operativeRole im ValidatedUser zurück.

Issue: #98"
```

---

## Task 6: ChangeOperativeRole Command + Handler

**Files:**
- Create: `packages/backend/src/application/user-management/commands/change-operative-role/change-operative-role.command.ts`
- Create: `packages/backend/src/application/user-management/commands/change-operative-role/change-operative-role.handler.ts`
- Test: `packages/backend/src/application/user-management/commands/change-operative-role/__tests__/change-operative-role.handler.spec.ts`

- [ ] **Step 1: Write the failing test**

Create the test file. Pattern: mock PrismaService, mock OutboxRepository, create TestingModule, test happy path + validation cases.

Key test cases:
- Successful role change → returns success + fires OperativeRoleChangedEvent
- User not found → returns failure
- Same role as before → returns failure (no-op)
- Invalid role value → returns failure

Follow the exact test pattern from `create-notiz.handler.spec.ts` (mock `$transaction`, inject via DI tokens).

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/backend && npx jest --testPathPatterns="change-operative-role" --no-coverage
```

- [ ] **Step 3: Create Command**

Create `change-operative-role.command.ts`:

```typescript
import { Result } from '@domain/common/result';
import { OperativeRole } from '@domain/value-objects/operative-role';

export class ChangeOperativeRoleCommand {
  private constructor(
    public readonly userId: string,
    public readonly newRole: string,
    public readonly changedBy: string,
  ) {}

  public static create(props: { userId: string; newRole: string; changedBy: string }): Result<ChangeOperativeRoleCommand> {
    if (!props.userId?.trim()) return Result.fail('userId ist erforderlich');
    if (!props.changedBy?.trim()) return Result.fail('changedBy ist erforderlich');

    const roleResult = OperativeRole.create(props.newRole);
    if (roleResult.isFailure) return Result.fail(roleResult.getErrorValue());

    return Result.ok(new ChangeOperativeRoleCommand(props.userId, props.newRole, props.changedBy));
  }
}
```

- [ ] **Step 4: Create Handler**

Create `change-operative-role.handler.ts` extending `TransactionalCommandHandler`. The handler:
1. Loads user from DB via transaction
2. Validates user exists
3. Checks old role !== new role
4. Updates `operativeRole` on user record
5. Creates `OperativeRoleChangedEvent`
6. Returns `{ result: updatedUser, events: [event] }`

- [ ] **Step 5: Run tests**

```bash
cd packages/backend && npx jest --testPathPatterns="change-operative-role" --no-coverage
```

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/application/user-management/commands/change-operative-role/
git commit -m "✨(backend): ChangeOperativeRole Command + Handler mit Tests

Admin kann operative Rolle eines Users ändern.
Validierung: User existiert, Rolle ist verschieden, gültiger Wert.

Issue: #98"
```

---

## Task 7: AssignStammperson Command + Handler

**Files:**
- Create: `packages/backend/src/application/user-management/commands/assign-stammperson/assign-stammperson.command.ts`
- Create: `packages/backend/src/application/user-management/commands/assign-stammperson/assign-stammperson.handler.ts`
- Test: `packages/backend/src/application/user-management/commands/assign-stammperson/__tests__/assign-stammperson.handler.spec.ts`

- [ ] **Step 1: Write failing tests**

Key test cases:
- Successful assignment → returns success + fires StammpersonAssignedEvent
- User not found → failure
- Stammperson not found → failure
- Stammperson already assigned to another user → failure
- Assign null (remove link) → success

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/backend && npx jest --testPathPatterns="assign-stammperson" --no-coverage
```

- [ ] **Step 3: Create Command**

```typescript
import { Result } from '@domain/common/result';

export class AssignStammpersonCommand {
  private constructor(
    public readonly userId: string,
    public readonly stammpersonId: string | null,
    public readonly assignedBy: string,
  ) {}

  public static create(props: { userId: string; stammpersonId: string | null; assignedBy: string }): Result<AssignStammpersonCommand> {
    if (!props.userId?.trim()) return Result.fail('userId ist erforderlich');
    if (!props.assignedBy?.trim()) return Result.fail('assignedBy ist erforderlich');
    return Result.ok(new AssignStammpersonCommand(props.userId, props.stammpersonId, props.assignedBy));
  }
}
```

- [ ] **Step 4: Create Handler**

Handler validates:
1. User exists
2. If stammpersonId is not null: Stammperson exists AND is not assigned to another user
3. Updates `stammpersonId` on user
4. Creates `StammpersonAssignedEvent` (only if stammpersonId is not null)

- [ ] **Step 5: Run tests**

```bash
cd packages/backend && npx jest --testPathPatterns="assign-stammperson" --no-coverage
```

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/application/user-management/commands/assign-stammperson/
git commit -m "✨(backend): AssignStammperson Command + Handler mit Tests

Admin kann User mit Stammperson verknüpfen/entkoppeln.
Validierung: User + Stammperson existieren, keine Doppel-Zuweisung.

Issue: #98"
```

---

## Task 8: Admin Controller — Operative Rolle + Stammperson

**Files:**
- Modify: Existing admin controller (find the user management controller in `packages/backend/src/modules/admin/`)
- Or create: `packages/backend/src/modules/admin/controllers/admin-operative-role.controller.ts`

- [ ] **Step 1: Create DTOs**

Create request/response DTOs:
- `ChangeOperativeRoleDto` with `newRole: string` (validated via Zod or class-validator)
- `AssignStammpersonDto` with `stammpersonId: string | null`

- [ ] **Step 2: Create Controller**

```typescript
@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller({ path: 'admin/users', version: ['alpha', '1'] })
export class AdminOperativeRoleController {
  constructor(
    private readonly commandBus: CommandBus,
  ) {}

  @Patch(':id/operative-role')
  @ApiOperation({ summary: 'Operative Rolle eines Users ändern' })
  @ApiWrappedResponse(/* appropriate DTO */)
  async changeOperativeRole(
    @Param('id') userId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: ChangeOperativeRoleDto,
    @CurrentUser() admin: ValidatedUser,
  ) {
    const commandResult = ChangeOperativeRoleCommand.create({
      userId,
      newRole: dto.newRole,
      changedBy: admin.userId,
    });
    if (commandResult.isFailure) throw new BadRequestException(commandResult.getErrorValue());

    const result = await this.commandBus.execute(commandResult.getValue());
    if (result.isFailure) throw new BadRequestException(result.getErrorValue());
    return result.getValue();
  }

  @Patch(':id/stammperson')
  @ApiOperation({ summary: 'Stammperson einem User zuweisen' })
  @ApiWrappedResponse(/* appropriate DTO */)
  async assignStammperson(
    @Param('id') userId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: AssignStammpersonDto,
    @CurrentUser() admin: ValidatedUser,
  ) {
    const commandResult = AssignStammpersonCommand.create({
      userId,
      stammpersonId: dto.stammpersonId,
      assignedBy: admin.userId,
    });
    if (commandResult.isFailure) throw new BadRequestException(commandResult.getErrorValue());

    const result = await this.commandBus.execute(commandResult.getValue());
    if (result.isFailure) throw new BadRequestException(result.getErrorValue());
    return result.getValue();
  }
}
```

- [ ] **Step 3: Register in Module**

Add controller to the appropriate admin module's `controllers` array.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/modules/admin/
git commit -m "✨(backend): Admin Controller für operative Rolle + Stammperson

PATCH /admin/users/:id/operative-role und /admin/users/:id/stammperson.
Geschützt durch AdminJwtAuthGuard.

Issue: #98"
```

---

## Task 9: Beitrittsanfrage Commands + Queries

**Files:**
- Create: `packages/backend/src/application/einsatz-beitritt/` (full directory structure)

- [ ] **Step 1: Write failing tests for CreateBeitrittsanfrage**

Key cases:
- EK can create request → success
- FK cannot create request (no need) → failure
- Duplicate open request → failure
- Einsatz not active → failure

- [ ] **Step 2: Implement CreateBeitrittsanfrageCommand + Handler**

Handler validates:
1. User operative role is EINSATZKRAFT
2. No open request exists for this user+einsatz
3. Einsatz exists and is active (IN_BEARBEITUNG)
4. Saves via repository
5. Fires EinsatzBeitrittsanfrageErstelltEvent

- [ ] **Step 3: Write failing tests for ResolveBeitrittsanfrage**

Key cases:
- FK approves → success, status GENEHMIGT
- FK rejects → success, status ABGELEHNT
- Non-FK tries to resolve → failure
- Already resolved → failure

- [ ] **Step 4: Implement ResolveBeitrittsanfrageCommand + Handler**

Handler validates:
1. Anfrage exists and is OFFEN
2. Resolver is FK (operative role check)
3. Updates status + resolvedAt + resolvedBy
4. If GENEHMIGT: creates EinsatzTeilnehmer record (assign user to einsatz)
5. Fires EinsatzBeitrittsanfrageEntschiedenEvent

- [ ] **Step 5: Implement GetBeitrittsanfragenQuery + Handler**

Returns all requests for a given einsatz (with user info).

- [ ] **Step 6: Create Application Module**

Create `einsatz-beitritt-application.module.ts` registering all handlers.

- [ ] **Step 7: Run all tests**

```bash
cd packages/backend && npx jest --testPathPatterns="einsatz-beitritt" --no-coverage
```

- [ ] **Step 8: Commit**

```bash
git add packages/backend/src/application/einsatz-beitritt/
git commit -m "✨(backend): Beitrittsanfrage Commands + Query mit Tests

CreateBeitrittsanfrage (EK fragt an), ResolveBeitrittsanfrage (FK entscheidet),
GetBeitrittsanfragen (offene Anfragen pro Einsatz).

Issue: #98"
```

---

## Task 10: Beitrittsanfrage Controller

**Files:**
- Create: `packages/backend/src/modules/einsatz-beitritt/controllers/einsatz-beitritt.controller.ts`
- Create: `packages/backend/src/modules/einsatz-beitritt/einsatz-beitritt.module.ts`

- [ ] **Step 1: Create Controller**

```typescript
@ApiTags('Einsatz Beitritt')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'einsatz/:einsatzId/beitrittsanfragen', version: ['alpha', '1'] })
export class EinsatzBeitrittController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @RequiresOperativeRole('EINSATZKRAFT')
  @UseGuards(OperativeRoleGuard)
  @ApiWrappedCreatedResponse(/* BeitrittsanfrageDto */)
  async create(@Param('einsatzId') einsatzId: string, @CurrentUser() user: ValidatedUser) {
    // CreateBeitrittsanfrageCommand
  }

  @Get()
  @RequiresOperativeRole('FUEHRUNGSKRAFT')
  @UseGuards(OperativeRoleGuard)
  @ApiWrappedResponse(/* BeitrittsanfrageDto[] */)
  async findByEinsatz(@Param('einsatzId') einsatzId: string) {
    // GetBeitrittsanfragenQuery
  }

  @Patch(':anfrageId')
  @RequiresOperativeRole('FUEHRUNGSKRAFT')
  @UseGuards(OperativeRoleGuard)
  @ApiWrappedResponse(/* BeitrittsanfrageDto */)
  async resolve(
    @Param('anfrageId') anfrageId: string,
    @Body() dto: ResolveBeitrittsanfrageDto,
    @CurrentUser() user: ValidatedUser,
  ) {
    // ResolveBeitrittsanfrageCommand
  }
}
```

- [ ] **Step 2: Create Module**

Register controller, import application module, provide repository binding.

- [ ] **Step 3: Register module in AppModule**

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/modules/einsatz-beitritt/
git commit -m "✨(backend): Beitrittsanfragen Controller + Module

POST/GET/PATCH /einsatz/:id/beitrittsanfragen.
EK kann anfragen, FK kann genehmigen/ablehnen.

Issue: #98"
```

---

## Task 11: Event Registration (Serializer/Deserializer)

**Files:**
- Modify: `packages/backend/src/infrastructure/outbox/event-serializer.ts`
- Modify: `packages/backend/src/infrastructure/outbox/event-deserializer.ts`

- [ ] **Step 1: Add imports + serialization for 4 new events**

In `event-serializer.ts`, add imports and cases in the serialize switch for:
- `OperativeRoleChangedEvent`
- `StammpersonAssignedEvent`
- `EinsatzBeitrittsanfrageErstelltEvent`
- `EinsatzBeitrittsanfrageEntschiedenEvent`

- [ ] **Step 2: Add imports + deserialization for 4 new events**

In `event-deserializer.ts`, add imports and cases in the deserialize switch.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/infrastructure/outbox/
git commit -m "✨(backend): Event Serializer/Deserializer für operative Rollen Events

4 neue Events registriert: OperativeRoleChanged, StammpersonAssigned,
BeitrittsanfrageErstellt, BeitrittsanfrageEntschieden.

Issue: #98"
```

---

## Task 12: EinsatzController Anpassung (Rollenbasierte Filterung)

**Files:**
- Modify: `packages/backend/src/modules/einsatz/controllers/einsatz.controller.ts`
- Modify: Related query handler if needed

- [ ] **Step 1: Modify GET /einsatz to filter by operative role**

In the `findAll` method, pass the user's operative role to the query. The query handler (or controller) applies:
- FK: no filter (sees all)
- EK: all Einsätze returned but with `canOpen: false` flag
- EXTERNE: only Einsätze where user is assigned (via EinsatzTeilnehmer)

- [ ] **Step 2: Modify GET /einsatz/:id to check access**

Add check: user must be FK OR assigned to this Einsatz (via EinsatzTeilnehmer or approved Beitrittsanfrage).

- [ ] **Step 3: Add OperativeRoleGuard to DELETE/ARCHIVE endpoints**

```typescript
@RequiresOperativeRole('FUEHRUNGSKRAFT')
@UseGuards(OperativeRoleGuard)
```

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/modules/einsatz/
git commit -m "🐛(backend): Einsatz-Zugang nach operativer Rolle filtern

FK: voller Zugang, EK: Liste ohne Öffnen, Externe: nur zugewiesene.
DELETE/ARCHIVE nur für Führungskräfte.

Issue: #98"
```

---

## Task 13: API Generation + Frontend Feature Setup

**Files:**
- Run: `pnpm run generate-api`
- Create: `packages/frontend/src/features/operative-roles/` (directory structure)

- [ ] **Step 1: Generate API client**

```bash
cd /Users/rubeen/dev/personal/bluelight-hub && pnpm run generate-api
```

- [ ] **Step 2: Create feature directory structure**

```
packages/frontend/src/features/operative-roles/
├── api/
│   └── queries.ts
├── hooks/
│   ├── use-operative-role.ts
│   └── use-can-access-einsatz.ts
└── index.ts
```

- [ ] **Step 3: Create query keys**

Create `packages/frontend/src/features/operative-roles/api/queries.ts`:

```typescript
export const OPERATIVE_ROLES_QUERY_KEYS = {
  all: ['operative-roles'] as const,
  beitrittsanfragen: () => [...OPERATIVE_ROLES_QUERY_KEYS.all, 'beitrittsanfragen'] as const,
  beitrittsanfragenByEinsatz: (einsatzId: string) =>
    [...OPERATIVE_ROLES_QUERY_KEYS.beitrittsanfragen(), einsatzId] as const,
} as const;
```

- [ ] **Step 4: Create useOperativeRole hook**

```typescript
import { useAuthContext } from '@/features/auth';

export function useOperativeRole() {
  const { user } = useAuthContext();
  const role = user?.operativeRole;

  return {
    role,
    isFuehrungskraft: role === 'FUEHRUNGSKRAFT',
    isEinsatzkraft: role === 'EINSATZKRAFT',
    isExterne: role === 'EXTERNE',
    canAccessEinsatzList: role === 'FUEHRUNGSKRAFT' || role === 'EINSATZKRAFT',
    canOpenEinsatz: role === 'FUEHRUNGSKRAFT',
    canArchiveEinsatz: role === 'FUEHRUNGSKRAFT',
  };
}
```

- [ ] **Step 5: Create barrel export**

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/features/operative-roles/
git commit -m "✨(frontend): Feature-Struktur für operative Rollen

Query Keys, useOperativeRole Hook, Feature-Barrel-Export.

Issue: #98"
```

---

## Task 14: Frontend — Admin UI Erweiterung

**Files:**
- Modify: Admin user management components (in `packages/frontend/src/features/admin/`)

- [ ] **Step 1: Add operative role dropdown to user form/table**

Using the generated API client, add a dropdown with options FUEHRUNGSKRAFT, EINSATZKRAFT, EXTERNE. On change, call `PATCH /admin/users/:id/operative-role`.

- [ ] **Step 2: Add Stammperson search/picker**

Add a search input that queries StammPerson records. On selection, call `PATCH /admin/users/:id/stammperson`.

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/features/admin/
git commit -m "✨(frontend): Admin UI für operative Rolle + Stammperson

Dropdown für Rollenzuweisung, Suchfeld für Stammperson-Verknüpfung.

Issue: #98"
```

---

## Task 15: Frontend — Einsatz-Liste Anpassung

**Files:**
- Modify: `packages/frontend/src/features/einsatz/` (list components)

- [ ] **Step 1: Filter Einsatz list by role**

Using `useOperativeRole()`, adjust the Einsatz list:
- FK: Normal display (clickable)
- EK: Cards displayed but not clickable, show "Beitritt anfragen" button
- Externe: Only show assigned Einsätze (API already filters)

- [ ] **Step 2: Add "Beitritt anfragen" button for EK**

Create mutation hook `useCreateBeitrittsanfrage` and add button to EK view.

- [ ] **Step 3: Show request status for EK**

After requesting, show status badge (OFFEN/GENEHMIGT/ABGELEHNT).

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/einsatz/ packages/frontend/src/features/operative-roles/
git commit -m "✨(frontend): Einsatz-Liste nach operativer Rolle anpassen

FK: voller Zugang, EK: Liste mit Beitritts-Button, Externe: nur zugewiesene.

Issue: #98"
```

---

## Task 16: Frontend — Beitrittsanfragen UI (FK-Sicht)

**Files:**
- Modify: Einsatz detail view (for FK)
- Create: Beitrittsanfragen components in `packages/frontend/src/features/operative-roles/ui/`

- [ ] **Step 1: Create Beitrittsanfragen list component**

Shows open requests with user info + Genehmigen/Ablehnen buttons.

- [ ] **Step 2: Add badge to Einsatz header**

FK sees a notification badge with count of open Beitrittsanfragen.

- [ ] **Step 3: Create mutation hooks**

`useResolveBeitrittsanfrage` — calls `PATCH /einsatz/:id/beitrittsanfragen/:anfrageId`.

- [ ] **Step 4: Integrate into Einsatz detail view**

Add Beitrittsanfragen panel (e.g., in sidebar or as tab).

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/features/operative-roles/ packages/frontend/src/features/einsatz/
git commit -m "✨(frontend): Beitrittsanfragen UI für Führungskräfte

Badge mit offenen Anfragen, Liste mit Genehmigen/Ablehnen-Buttons.

Issue: #98"
```

---

## Task 17: Integration Test + API Generation Verify

- [ ] **Step 1: Generate API**

```bash
pnpm run generate-api
```

- [ ] **Step 2: Run full backend test suite**

```bash
cd packages/backend && npx jest --no-coverage
```

Fix any failures.

- [ ] **Step 3: Run full frontend test suite**

```bash
pnpm --filter @bluelight-hub/frontend test -- --no-coverage
```

Fix any failures.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "🧪(all): Integration Tests + API Generation für operative Rollen

Alle Tests grün nach Feature-Implementation.

Issue: #98"
```
