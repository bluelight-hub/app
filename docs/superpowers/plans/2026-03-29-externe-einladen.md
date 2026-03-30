# Externe zu Einsatz einladen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Führungskräfte können EXTERNE zu einem Einsatz einladen (genehmigte Beitrittsanfrage). EXTERNE sehen eingeladene Einsätze in der Liste.

**Architecture:** Wiederverwendung der bestehenden `EinsatzBeitrittsanfrage`-Infrastruktur. Neuer Command für FK-initiierte Einladung (Status direkt GENEHMIGT). Einsatz-Liste für EXTERNE erweitern um genehmigte Beitrittsanfragen.

**Tech Stack:** NestJS + Prisma (Backend), React + TanStack Query (Frontend)

**Spec:** `docs/superpowers/specs/2026-03-29-externe-einladen-design.md`

---

## File Map

### Backend (Create)
- `packages/backend/src/application/einsatz-beitritt/commands/invite-externe/invite-externe.command.ts`
- `packages/backend/src/application/einsatz-beitritt/commands/invite-externe/invite-externe.handler.ts`
- `packages/backend/src/application/einsatz-beitritt/dto/invite-externe.dto.ts`

### Backend (Modify)
- `packages/backend/src/modules/einsatz-beitritt/controllers/einsatz-beitritt.controller.ts` — neue Endpoints
- `packages/backend/src/modules/einsatz-beitritt/einsatz-beitritt.module.ts` — Handler registrieren
- `packages/backend/src/modules/einsatz/controllers/einsatz.controller.ts` — `getAssignedEinsatzIds` erweitern

### Frontend (Create)
- `packages/frontend/src/features/einsatz/ui/organisms/ExterneEinladenDialog.tsx`

### Frontend (Modify)
- `packages/frontend/src/features/operative-roles/api/` — neuer `useInviteExterne` Hook
- `packages/frontend/src/features/einsatz/ui/organisms/EinsatzDashboard.tsx` — Button + Dialog
- `packages/frontend/src/features/operative-roles/hooks/use-operative-role.ts` — `hasEinsatzInvitations` Flag

---

## Task 1: Backend — InviteExterneCommand + Handler

**Files:**
- Create: `packages/backend/src/application/einsatz-beitritt/commands/invite-externe/invite-externe.command.ts`
- Create: `packages/backend/src/application/einsatz-beitritt/commands/invite-externe/invite-externe.handler.ts`
- Create: `packages/backend/src/application/einsatz-beitritt/dto/invite-externe.dto.ts`

- [ ] **Step 1: InviteExterneDto erstellen**

```typescript
// packages/backend/src/application/einsatz-beitritt/dto/invite-externe.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Request DTO zum Einladen eines EXTERNE-Users zu einem Einsatz.
 */
export class InviteExterneDto {
  @ApiProperty({
    description: 'User-ID des einzuladenden EXTERNE-Users',
    example: 'user_abc123',
  })
  @IsString({ message: 'userId muss ein String sein' })
  userId!: string;
}
```

- [ ] **Step 2: InviteExterneCommand erstellen**

```typescript
// packages/backend/src/application/einsatz-beitritt/commands/invite-externe/invite-externe.command.ts
import { Result } from '@domain/common/result';

/**
 * Command zum Einladen eines EXTERNE-Users zu einem Einsatz.
 *
 * Erstellt eine genehmigte Beitrittsanfrage (Status GENEHMIGT).
 */
export class InviteExterneCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly userId: string,
    public readonly invitedBy: string,
  ) {}

  static create(einsatzId: string, userId: string, invitedBy: string): Result<InviteExterneCommand> {
    if (!einsatzId) return Result.fail('einsatzId ist erforderlich');
    if (!userId) return Result.fail('userId ist erforderlich');
    if (!invitedBy) return Result.fail('invitedBy ist erforderlich');
    return Result.ok(new InviteExterneCommand(einsatzId, userId, invitedBy));
  }
}
```

- [ ] **Step 3: InviteExterneHandler erstellen**

Folgt dem Transactional Outbox Pattern wie die anderen Beitrittsanfrage-Handler. Prüfe zuerst die bestehenden Handler:
- `packages/backend/src/application/einsatz-beitritt/commands/create-beitrittsanfrage/create-beitrittsanfrage.handler.ts`
- Nutze dasselbe Repository-Interface und Event-Pattern.

```typescript
// packages/backend/src/application/einsatz-beitritt/commands/invite-externe/invite-externe.handler.ts
import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
import { OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { EinsatzBeitrittsanfrageEntschiedenEvent } from '@domain/events/einsatz-beitrittsanfrage-entschieden.event';
import { InviteExterneCommand } from './invite-externe.command';

/**
 * Handler zum Einladen eines EXTERNE-Users.
 *
 * Erstellt eine Beitrittsanfrage mit Status GENEHMIGT.
 * Validiert: User existiert, ist EXTERNE, keine bestehende Anfrage.
 */
@CommandHandler(InviteExterneCommand)
@Injectable()
export class InviteExterneHandler extends TransactionalCommandHandler<InviteExterneCommand, string> {
  constructor(prisma: PrismaService, @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: InviteExterneCommand,
    tx: TransactionContext,
  ): Promise<{ result: Result<string>; events: DomainEvent[] }> {
    const prisma = tx as PrismaService;

    // 1. User existiert und ist EXTERNE
    const user = await prisma.user.findUnique({
      where: { id: command.userId },
      select: { id: true, operativeRole: true },
    });

    if (!user) {
      return { result: Result.fail('User nicht gefunden'), events: [] };
    }

    if (user.operativeRole !== 'EXTERNE') {
      return { result: Result.fail('Nur EXTERNE können eingeladen werden'), events: [] };
    }

    // 2. Keine bestehende aktive Anfrage
    const existing = await prisma.einsatzBeitrittsanfrage.findUnique({
      where: { einsatzId_userId: { einsatzId: command.einsatzId, userId: command.userId } },
    });

    if (existing && existing.status === 'GENEHMIGT') {
      return { result: Result.fail('User ist bereits eingeladen'), events: [] };
    }

    // 3. Einsatz existiert
    const einsatz = await prisma.einsatz.findUnique({
      where: { id: command.einsatzId },
      select: { id: true },
    });

    if (!einsatz) {
      return { result: Result.fail('Einsatz nicht gefunden'), events: [] };
    }

    // 4. Erstelle oder aktualisiere Beitrittsanfrage (direkt GENEHMIGT)
    let anfrageId: string;
    if (existing) {
      // Bestehende abgelehnte Anfrage → auf GENEHMIGT setzen
      const updated = await prisma.einsatzBeitrittsanfrage.update({
        where: { id: existing.id },
        data: {
          status: 'GENEHMIGT',
          resolvedBy: command.invitedBy,
          resolvedAt: new Date(),
        },
      });
      anfrageId = updated.id;
    } else {
      // Neue Anfrage erstellen
      const created = await prisma.einsatzBeitrittsanfrage.create({
        data: {
          einsatzId: command.einsatzId,
          userId: command.userId,
          status: 'GENEHMIGT',
          resolvedBy: command.invitedBy,
          resolvedAt: new Date(),
        },
      });
      anfrageId = created.id;
    }

    const event = new EinsatzBeitrittsanfrageEntschiedenEvent(
      anfrageId,
      command.einsatzId,
      command.userId,
      'GENEHMIGT',
      command.invitedBy,
    );

    return { result: Result.ok(anfrageId), events: [event] };
  }
}
```

- [ ] **Step 4: DTO-Index exportieren**

In `packages/backend/src/application/einsatz-beitritt/dto/index.ts`, den neuen DTO exportieren:

```typescript
export { InviteExterneDto } from './invite-externe.dto';
```

- [ ] **Step 5: Compile-Check**

Run: `cd packages/backend && pnpx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/application/einsatz-beitritt/
git commit -m "✨(backend): InviteExterne Command + Handler"
```

---

## Task 2: Backend — Controller Endpoints + Module Registration

**Files:**
- Modify: `packages/backend/src/modules/einsatz-beitritt/controllers/einsatz-beitritt.controller.ts`
- Modify: `packages/backend/src/modules/einsatz-beitritt/einsatz-beitritt.module.ts`

- [ ] **Step 1: InviteExterneHandler im Module registrieren**

In `packages/backend/src/modules/einsatz-beitritt/einsatz-beitritt.module.ts`, den neuen Handler importieren und zu den providers hinzufügen. Lies die Datei zuerst, um das bestehende Pattern zu sehen.

- [ ] **Step 2: POST /einladen Endpoint im Controller hinzufügen**

Im `EinsatzBeitrittController`, nach der `create` Methode:

```typescript
import { Delete } from '@nestjs/common';
import { InviteExterneCommand } from '@/application/einsatz-beitritt/commands/invite-externe/invite-externe.command';
import { InviteExterneHandler } from '@/application/einsatz-beitritt/commands/invite-externe/invite-externe.handler';
import { InviteExterneDto } from '@/application/einsatz-beitritt/dto';

// Im Constructor hinzufügen:
private readonly inviteHandler: InviteExterneHandler,

// Neuer Endpoint:
/**
 * Lädt eine externe Person zu einem Einsatz ein.
 *
 * Erstellt eine genehmigte Beitrittsanfrage (FK-initiiert).
 */
@Post('einladen')
@RequiresOperativeRole('FUEHRUNGSKRAFT')
@UseGuards(OperativeRoleGuard)
@ApiOperation({
  summary: 'Externe Person einladen',
  description: 'Führungskraft lädt eine externe Person zu einem Einsatz ein (erstellt genehmigte Beitrittsanfrage).',
})
@ApiWrappedCreatedResponse(BeitrittsanfrageResponseDto, {
  description: 'Einladung erfolgreich erstellt',
})
@ApiBadRequestResponse({ description: 'Validierungsfehler oder User ist keine Externe' })
async invite(
  @Param('einsatzId') einsatzId: string,
  @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: InviteExterneDto,
  @CurrentUser() user: ValidatedUser,
): Promise<BeitrittsanfrageResponseDto> {
  const commandResult = InviteExterneCommand.create(einsatzId, dto.userId, user.userId);
  if (commandResult.isFailure || !commandResult.value) {
    throw new BadRequestException(commandResult.error);
  }

  const result = await this.inviteHandler.execute(commandResult.value);
  if (result.isFailure) {
    if (result.error?.includes('nicht gefunden')) {
      throw new NotFoundException(result.error);
    }
    throw new BadRequestException(result.error);
  }

  // Lade die erstellte Anfrage für Response
  const queryResult = GetBeitrittsanfragenQuery.create({ einsatzId });
  if (queryResult.isSuccess && queryResult.value) {
    const anfragen = await this.getHandler.execute(queryResult.value);
    const created = anfragen.value?.find((a) => a.userId === dto.userId);
    if (created) return created;
  }

  throw new BadRequestException('Einladung erstellt, aber Anfrage konnte nicht geladen werden');
}
```

- [ ] **Step 3: DELETE /:userId Endpoint hinzufügen (Einladung widerrufen)**

```typescript
/**
 * Widerruft die Einladung einer externen Person.
 *
 * Setzt die genehmigte Beitrittsanfrage auf ABGELEHNT.
 */
@Delete(':userId')
@RequiresOperativeRole('FUEHRUNGSKRAFT')
@UseGuards(OperativeRoleGuard)
@ApiOperation({
  summary: 'Einladung widerrufen',
  description: 'Führungskraft widerruft die Einladung einer externen Person.',
})
@ApiWrappedResponse(BeitrittsanfrageResponseDto, {
  description: 'Einladung erfolgreich widerrufen',
})
@ApiNotFoundResponse({ description: 'Keine genehmigte Einladung gefunden' })
async revokeInvitation(
  @Param('einsatzId') einsatzId: string,
  @Param('userId') userId: string,
  @CurrentUser() user: ValidatedUser,
): Promise<BeitrittsanfrageResponseDto> {
  // Finde die genehmigte Anfrage
  const queryResult = GetBeitrittsanfragenQuery.create({ einsatzId, status: 'GENEHMIGT' });
  if (queryResult.isFailure || !queryResult.value) {
    throw new BadRequestException(queryResult.error);
  }

  const anfragen = await this.getHandler.execute(queryResult.value);
  const anfrage = anfragen.value?.find((a) => a.userId === userId);

  if (!anfrage) {
    throw new NotFoundException('Keine genehmigte Einladung für diesen User gefunden');
  }

  // Resolve als ABGELEHNT
  const resolveResult = ResolveBeitrittsanfrageCommand.create(anfrage.id, 'ABGELEHNT', user.userId);
  if (resolveResult.isFailure || !resolveResult.value) {
    throw new BadRequestException(resolveResult.error);
  }

  const result = await this.resolveHandler.execute(resolveResult.value);
  if (result.isFailure) {
    throw new BadRequestException(result.error);
  }

  return result.value!;
}
```

- [ ] **Step 4: Compile-Check**

Run: `cd packages/backend && pnpx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/modules/einsatz-beitritt/
git commit -m "✨(backend): Einladungs- und Widerruf-Endpoints für EXTERNE"
```

---

## Task 3: Backend — Einsatz-Liste für EXTERNE erweitern

**Files:**
- Modify: `packages/backend/src/modules/einsatz/controllers/einsatz.controller.ts`

- [ ] **Step 1: `getAssignedEinsatzIds` um genehmigte Beitrittsanfragen erweitern**

Die bestehende Methode `getAssignedEinsatzIds` (Zeile ~598) prüft nur `einsatzTeilnehmer`. Erweitern um genehmigte `einsatzBeitrittsanfrage`:

```typescript
private async getAssignedEinsatzIds(userId: string): Promise<Set<string>> {
  const [teilnahmen, beitrittsanfragen] = await Promise.all([
    this.prisma.einsatzTeilnehmer.findMany({
      where: { userId, leftAt: null },
      select: { einsatzId: true },
    }),
    this.prisma.einsatzBeitrittsanfrage.findMany({
      where: { userId, status: 'GENEHMIGT' },
      select: { einsatzId: true },
    }),
  ]);

  const ids = new Set<string>();
  for (const t of teilnahmen) ids.add(t.einsatzId);
  for (const b of beitrittsanfragen) ids.add(b.einsatzId);
  return ids;
}
```

- [ ] **Step 2: Compile-Check**

Run: `cd packages/backend && pnpx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/modules/einsatz/controllers/einsatz.controller.ts
git commit -m "🐛(backend): EXTERNE sehen eingeladene Einsätze in der Liste"
```

---

## Task 4: API-Client regenerieren + Frontend-Hook

**Abhängig von:** Task 1, 2, 3

**Files:**
- Modify: `packages/shared/client/` (regeneriert)
- Create/Modify: Frontend Hook für Einladung

- [ ] **Step 1: API-Client regenerieren**

Run: `pnpm run generate-api`
Verify: Neue Methoden für `einladen` und Widerruf in generiertem Client sichtbar

- [ ] **Step 2: Frontend-Hook `useInviteExterne` erstellen**

In `packages/frontend/src/features/operative-roles/api/`, einen neuen Hook erstellen (oder in bestehende Datei einfügen). Lies zuerst die bestehenden Hooks (`use-create-beitrittsanfrage.ts`) als Vorlage.

Der Hook soll:
- `mutateAsync` für `POST /einsatz/:einsatzId/beitrittsanfragen/einladen`
- Auf Erfolg: Toast "Externe Person eingeladen", Cache invalidieren
- Auf Fehler: Toast mit Fehlermeldung

- [ ] **Step 3: Frontend-Hook `useRevokeInvitation` erstellen**

Analog: `DELETE /einsatz/:einsatzId/beitrittsanfragen/:userId`

- [ ] **Step 4: Commit**

```bash
git add packages/shared/client/ packages/frontend/src/features/operative-roles/api/
git commit -m "✨(frontend): Hooks für Externe einladen + widerrufen"
```

---

## Task 5: Frontend — Einladungs-Dialog + Dashboard-Integration

**Abhängig von:** Task 4

**Files:**
- Create: `packages/frontend/src/features/einsatz/ui/organisms/ExterneEinladenDialog.tsx`
- Modify: `packages/frontend/src/features/einsatz/ui/organisms/EinsatzDashboard.tsx`

- [ ] **Step 1: ExterneEinladenDialog erstellen**

Lies zuerst:
- `packages/frontend/src/features/einsatz/ui/organisms/EinsatzDashboard.tsx` (für Kontext)
- `packages/frontend/src/shared/ui/headless/combobox.tsx` (bestehende Combobox)
- `packages/frontend/src/features/admin/api/use-admin-user-management.ts` (User-Liste laden)

Der Dialog soll:
- Combobox mit allen EXTERNE-Usern (lade User-Liste, filtere auf `operativeRole === 'EXTERNE'`)
- Bereits eingeladene User (genehmigte Beitrittsanfrage für diesen Einsatz) ausgegraut
- "Einladen" Button ruft `useInviteExterne` auf
- Toast-Bestätigung nach Erfolg
- Dialog schließt sich

**Für die User-Liste:** Die Admin-User-API liefert `operativeRole`. Erstelle einen einfachen Hook der alle User lädt und auf EXTERNE filtert. Oder nutze den bestehenden `useAdminUserManagement` Hook.

**ACHTUNG:** Der Admin-API-Aufruf (`userManagementControllerFindAllVAlpha`) erfordert Admin-Authentifizierung. Da die FK kein Admin sein muss, braucht es entweder:
- Einen neuen öffentlichen Endpoint der nur EXTERNE-User mit minimalem Daten zurückgibt (id + username)
- ODER: Die FK muss auch Admin sein (was im aktuellen System häufig der Fall ist)

**Pragmatische Lösung:** Nutze den bestehenden Admin-Endpoint. Falls der FK kein Admin ist, zeige eine Fehlermeldung "Admin-Rechte erforderlich für Einladungen". Dies kann in einer späteren Story verbessert werden.

- [ ] **Step 2: EinsatzDashboard — Button + Dialog einfügen**

Im `EinsatzDashboard.tsx`, neben dem bestehenden FK-Bereich:

```tsx
// State
const [isExterneDialogOpen, setIsExterneDialogOpen] = useState(false);

// Button (nur für FK, neben bestehenden Buttons)
{isFuehrungskraft && (
  <Button appearance="outline" size="sm" onClick={() => setIsExterneDialogOpen(true)}>
    <PiUserPlus className="mr-2 h-4 w-4" />
    Externe einladen
  </Button>
)}

// Dialog
<ExterneEinladenDialog
  einsatzId={einsatzId}
  isOpen={isExterneDialogOpen}
  onClose={() => setIsExterneDialogOpen(false)}
/>
```

- [ ] **Step 3: Compile-Check**

Run: `cd packages/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/features/einsatz/ui/organisms/ExterneEinladenDialog.tsx packages/frontend/src/features/einsatz/ui/organisms/EinsatzDashboard.tsx
git commit -m "✨(frontend): Externe-einladen Dialog im EinsatzDashboard"
```

---

## Task 6: Frontend — Einsatz-Liste für EXTERNE anpassen

**Abhängig von:** Task 4

**Files:**
- Modify: `packages/frontend/src/features/einsatz/ui/organisms/EinsatzDashboard.tsx`

- [ ] **Step 1: EXTERNE sehen eingeladene Einsätze**

Das Backend filtert jetzt korrekt (Task 3). Im Frontend muss der EinsatzDashboard den EXTERNE Zugang erlauben wenn sie eingeladene Einsätze haben.

Lies die bestehende Logik im `EinsatzDashboard.tsx`:
- Zeile ~90: `useOperativeRole()` wird verwendet
- Zeile ~325: EXTERNE Info-Text
- Die Einsatz-Liste wird vermutlich mit `canAccessEinsatzList` gesteuert

Anpassung: Statt `canAccessEinsatzList` als Gate zu verwenden, die Einsatz-Liste immer laden. Wenn EXTERNE keine Einsätze haben (Backend gibt leere Liste), zeige den "Kein Zugang"-Hinweis. Wenn sie eingeladene Einsätze haben, zeige die Liste.

Das Backend kümmert sich bereits um die Filterung — das Frontend muss nur den Guard lockern.

- [ ] **Step 2: Compile-Check**

Run: `cd packages/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/features/einsatz/ui/organisms/EinsatzDashboard.tsx
git commit -m "✨(frontend): EXTERNE sehen eingeladene Einsätze"
```

---

## Ausführungsreihenfolge

```
Task 1 ──┐
         ├── Task 2 ── Task 3 ── Task 4 ──┬── Task 5
         │                                  └── Task 6
```

- Tasks 1→2→3 sequenziell (Backend, aufeinander aufbauend)
- Task 4 nach Backend fertig (API-Client + Hooks)
- Tasks 5+6 parallelisierbar (unterschiedliche UI-Bereiche)
