# Operative Rollen Admin-UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Operative Rollen + Stammperson-Zuweisung in bestehende Admin-Seiten integrieren (Users-Tabelle, EditUserDialog, StammPersonen-Tabelle).

**Architecture:** Backend-Queries erweitern um operativeRole + stammperson Daten mitzuliefern, API-Client regenerieren, dann Frontend-Tabellen und Dialog anpassen. Kein neuer Endpoint nötig — bestehende Endpoints für Mutations nutzen.

**Tech Stack:** NestJS + Prisma (Backend), React + TanStack Table/Query/Form + Headless UI Combobox (Frontend), Zod (Validation)

**Spec:** `docs/superpowers/specs/2026-03-28-operative-rollen-admin-ui-design.md`

---

## File Map

### Backend (Modify)
- `packages/backend/src/application/user-management/dto/user.dto.ts` — operativeRole + stammperson Felder
- `packages/backend/src/application/user-management/dto/managed-user-response.dto.ts` — API Response DTO
- `packages/backend/src/application/user-management/queries/get-all-users/get-all-users.handler.ts` — PrismaService für operative Daten
- `packages/backend/src/modules/user-management/controllers/user-management.controller.ts` — mapToApiUserDto erweitern
- `packages/backend/src/application/kraefte/stamm-personen/dto/stamm-person.dto.ts` — userAccount Feld
- `packages/backend/src/application/kraefte/stamm-personen/queries/get-all-stamm-personen/get-all-stamm-personen.handler.ts` — PrismaService für User-Relation
- `packages/backend/src/application/kraefte/stamm-personen/queries/stamm-person-query.mapper.ts` — userAccount mappen

### Frontend (Modify)
- `packages/frontend/src/features/admin/api/use-admin-user-management.ts` — Mutations für operative Rolle + Stammperson
- `packages/frontend/src/features/admin/ui/organisms/UsersTable.tsx` — neue Spalten + Filter
- `packages/frontend/src/features/admin/ui/organisms/EditUserDialog.tsx` — operative Einstellungen Sektion
- `packages/frontend/src/features/admin/ui/pages/AdminUsers.tsx` — Filter-State + erweiterte onSubmit-Logik
- `packages/frontend/src/features/admin/ui/organisms/StammPersonenTable.tsx` — Benutzer-Account Spalte

---

## Task 1: Backend — UserDto + ManagedUserResponseDto erweitern

**Files:**
- Modify: `packages/backend/src/application/user-management/dto/user.dto.ts`
- Modify: `packages/backend/src/application/user-management/dto/managed-user-response.dto.ts`

**Parallelisierbar mit:** Task 2

- [ ] **Step 1: UserDto um operative Felder erweitern**

In `packages/backend/src/application/user-management/dto/user.dto.ts`, nach dem `lockReason` Feld hinzufügen:

```typescript
@ApiProperty({
  description: 'Operative Rolle des Benutzers',
  enum: ['FUEHRUNGSKRAFT', 'EINSATZKRAFT', 'EXTERNE'],
  example: 'EXTERNE',
})
operativeRole!: string;

@ApiPropertyOptional({
  description: 'Zugewiesene Stammperson (falls vorhanden)',
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Stammperson-ID' },
    vorname: { type: 'string', description: 'Vorname' },
    nachname: { type: 'string', description: 'Nachname' },
    personalnummer: { type: 'string', description: 'Personalnummer' },
  },
  nullable: true,
})
stammperson!: { id: string; vorname: string; nachname: string; personalnummer: string } | null;
```

Dazu den Import ergänzen: `ApiPropertyOptional` neben `ApiProperty` importieren.

- [ ] **Step 2: ManagedUserResponseDto um operative Felder erweitern**

In `packages/backend/src/application/user-management/dto/managed-user-response.dto.ts`, nach dem `lockReason` Feld hinzufügen:

```typescript
@ApiProperty({
  description: 'Operative Rolle des Benutzers',
  enum: ['FUEHRUNGSKRAFT', 'EINSATZKRAFT', 'EXTERNE'],
  example: 'EXTERNE',
})
operativeRole!: string;

@ApiPropertyOptional({
  description: 'Zugewiesene Stammperson (falls vorhanden)',
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Stammperson-ID' },
    vorname: { type: 'string', description: 'Vorname' },
    nachname: { type: 'string', description: 'Nachname' },
    personalnummer: { type: 'string', description: 'Personalnummer' },
  },
  nullable: true,
})
stammperson!: { id: string; vorname: string; nachname: string; personalnummer: string } | null;
```

Dazu den Import ergänzen: `ApiPropertyOptional` neben `ApiProperty` importieren.

- [ ] **Step 3: mapToApiUserDto im Controller erweitern**

In `packages/backend/src/modules/user-management/controllers/user-management.controller.ts`, die `mapToApiUserDto` Funktion erweitern:

```typescript
function mapToApiUserDto(appDto: AppUserDto): ManagedUserResponseDto {
  return {
    id: appDto.id,
    username: appDto.username,
    role: appDto.role as PrismaUserRole,
    createdAt: appDto.createdAt,
    updatedAt: appDto.updatedAt,
    isLocked: appDto.isLocked,
    lockReason: appDto.lockReason,
    operativeRole: appDto.operativeRole,
    stammperson: appDto.stammperson,
  };
}
```

- [ ] **Step 4: Compile-Check**

Run: `cd packages/backend && pnpx tsc --noEmit --pretty 2>&1 | head -30`
Expected: Keine Fehler (oder nur bestehende)

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/application/user-management/dto/user.dto.ts packages/backend/src/application/user-management/dto/managed-user-response.dto.ts packages/backend/src/modules/user-management/controllers/user-management.controller.ts
git commit -m "✨(backend): UserDto um operativeRole und stammperson erweitern"
```

---

## Task 2: Backend — GetAllUsersQueryHandler um operative Daten anreichern

**Files:**
- Modify: `packages/backend/src/application/user-management/queries/get-all-users/get-all-users.handler.ts`

**Parallelisierbar mit:** Task 1

**Kontext:** Das `UserAggregate` enthält NICHT `operativeRole` (diese wird direkt in Prisma gespeichert, nicht im Aggregate). Daher muss der Handler PrismaService für einen ergänzenden Query nutzen.

- [ ] **Step 1: PrismaService injizieren**

Im Konstruktor von `GetAllUsersQueryHandler`, PrismaService hinzufügen:

```typescript
import { PrismaService } from '@/infrastructure/database/prisma.service';

// Im constructor:
constructor(
  @Inject(USER_REPOSITORY)
  private readonly repository: IUserRepository,
  @Inject(LOGGER) private readonly logger: ILogger,
  private readonly prisma: PrismaService,
) {}
```

- [ ] **Step 2: execute() um operative Daten erweitern**

Nach dem Repository-Aufruf und vor dem DTO-Mapping einen Prisma-Query einfügen. Die `execute` Methode anpassen:

```typescript
async execute(_query: GetAllUsersQuery): Promise<Result<UserDto[]>> {
  try {
    const repositoryResult = await this.repository.findAll();

    if (repositoryResult.isFailure) {
      this.logger.error(`Repository error: ${repositoryResult.error}`);
      return Result.fail<UserDto[]>(repositoryResult.error ?? 'Failed to fetch users from repository');
    }

    const users = repositoryResult.value;
    if (!users) {
      return Result.ok<UserDto[]>([]);
    }

    // Operative Daten (operativeRole + stammperson) aus Prisma laden
    const userIds = users.map((u) => u.id.toString());
    const operativeData = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        operativeRole: true,
        stammperson: {
          select: {
            id: true,
            vorname: true,
            nachname: true,
            personalnummer: true,
          },
        },
      },
    });

    const operativeMap = new Map(
      operativeData.map((u) => [u.id, { operativeRole: u.operativeRole, stammperson: u.stammperson }]),
    );

    const dtos = users.map((aggregate) => this.aggregateToDto(aggregate, operativeMap));

    this.logger.log(`Found ${dtos.length} users`);
    return Result.ok<UserDto[]>(dtos);
  } catch (error) {
    this.logger.error('Unexpected error fetching all users', error instanceof Error ? error.stack : String(error));
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error while fetching all users';
    return Result.fail<UserDto[]>(errorMessage);
  }
}
```

- [ ] **Step 3: aggregateToDto() Signatur erweitern**

```typescript
private aggregateToDto(
  aggregate: import('@domain/aggregates/user.aggregate').UserAggregate,
  operativeMap: Map<string, { operativeRole: string; stammperson: { id: string; vorname: string; nachname: string; personalnummer: string } | null }>,
): UserDto {
  const operative = operativeMap.get(aggregate.id.toString());
  return {
    id: aggregate.id.toString(),
    username: aggregate.username.toString(),
    role: aggregate.role.toString(),
    createdAt: aggregate.createdAt,
    updatedAt: aggregate.updatedAt,
    isLocked: aggregate.isLocked,
    lockReason: null,
    operativeRole: operative?.operativeRole ?? 'EXTERNE',
    stammperson: operative?.stammperson ?? null,
  };
}
```

- [ ] **Step 4: Compile-Check**

Run: `cd packages/backend && pnpx tsc --noEmit --pretty 2>&1 | head -30`
Expected: Keine Fehler

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/application/user-management/queries/get-all-users/get-all-users.handler.ts
git commit -m "✨(backend): GetAllUsersQuery um operativeRole + stammperson anreichern"
```

---

## Task 3: Backend — StammPersonDto + Query um userAccount erweitern

**Files:**
- Modify: `packages/backend/src/application/kraefte/stamm-personen/dto/stamm-person.dto.ts`
- Modify: `packages/backend/src/application/kraefte/stamm-personen/queries/get-all-stamm-personen/get-all-stamm-personen.handler.ts`
- Modify: `packages/backend/src/application/kraefte/stamm-personen/queries/stamm-person-query.mapper.ts`

**Parallelisierbar mit:** Task 1, Task 2

- [ ] **Step 1: StammPersonDto um userAccount erweitern**

In `packages/backend/src/application/kraefte/stamm-personen/dto/stamm-person.dto.ts`, nach `updatedBy` hinzufügen:

```typescript
@ApiPropertyOptional({
  description: 'Zugewiesener Benutzer-Account (falls vorhanden)',
  type: 'object',
  properties: {
    id: { type: 'string', description: 'User-ID' },
    username: { type: 'string', description: 'Benutzername' },
  },
  nullable: true,
})
userAccount?: { id: string; username: string } | null;
```

- [ ] **Step 2: StammPersonQueryMapper erweitern**

In `packages/backend/src/application/kraefte/stamm-personen/queries/stamm-person-query.mapper.ts`:

Die `toDto` Methode erweitern, um einen optionalen `userAccount` Parameter zu akzeptieren. Neue Überladung hinzufügen und die Implementation anpassen:

```typescript
// Neue Überladung (nach den bestehenden):
static toDto(
  aggregate: StammPerson,
  qualifikationen: QualifikationData[],
  userAccount?: { id: string; username: string } | null,
): StammPersonDto;

// Implementation anpassen (die bestehende):
static toDto(
  aggregate: StammPerson,
  qualifikationen: Qualifikation[] | QualifikationData[],
  userAccount?: { id: string; username: string } | null,
): StammPersonDto {
  // ... bestehender Qualifikationen-Mapping Code bleibt gleich ...

  return {
    id: aggregate.id.value,
    vorname: aggregate.vorname,
    nachname: aggregate.nachname,
    personalnummer: aggregate.personalnummer,
    funkkenungBOS: aggregate.funkkenungBOS,
    qualifikationen: qualifikationDtos,
    archivedAt: aggregate.archivedAt,
    archivedBy: aggregate.archivedBy,
    createdAt: aggregate.createdAt,
    updatedAt: aggregate.updatedAt,
    createdBy: aggregate.createdBy,
    updatedBy: aggregate.updatedBy,
    userAccount: userAccount ?? null,
  };
}
```

- [ ] **Step 3: GetAllStammPersonenHandler erweitern**

In `packages/backend/src/application/kraefte/stamm-personen/queries/get-all-stamm-personen/get-all-stamm-personen.handler.ts`:

PrismaService injizieren und User-Account Daten laden:

```typescript
import { PrismaService } from '@/infrastructure/database/prisma.service';

// Im constructor:
constructor(
  @Inject(KRAEFTE_REPOSITORIES.STAMM_PERSON)
  private readonly stammPersonRepository: IStammPersonRepository,
  @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
  private readonly qualifikationRepository: IQualifikationRepository,
  @Inject(LOGGER) protected readonly logger: ILogger,
  private readonly prisma: PrismaService,
) {}
```

Vor dem DTO-Mapping (nach Zeile 113, dem Qualifikation-Map-Aufbau), User-Account-Daten laden:

```typescript
// 4b. Lade zugewiesene User-Accounts für alle StammPersonen
const stammPersonIds = stammPersonen.map((sp) => sp.id.value);
const userAccounts = await this.prisma.user.findMany({
  where: { stammpersonId: { in: stammPersonIds } },
  select: {
    id: true,
    username: true,
    stammpersonId: true,
  },
});
const userAccountMap = new Map(
  userAccounts.map((u) => [u.stammpersonId!, { id: u.id, username: u.username }]),
);
```

Dann im DTO-Mapping (Zeile 130 ersetzen):

```typescript
const dto = StammPersonQueryMapper.toDto(
  stammPerson,
  qualifikationData,
  userAccountMap.get(stammPerson.id.value) ?? null,
);
```

- [ ] **Step 4: Compile-Check**

Run: `cd packages/backend && pnpx tsc --noEmit --pretty 2>&1 | head -30`
Expected: Keine Fehler

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/application/kraefte/stamm-personen/dto/stamm-person.dto.ts packages/backend/src/application/kraefte/stamm-personen/queries/stamm-person-query.mapper.ts packages/backend/src/application/kraefte/stamm-personen/queries/get-all-stamm-personen/get-all-stamm-personen.handler.ts
git commit -m "✨(backend): StammPersonDto um userAccount-Relation erweitern"
```

---

## Task 4: API-Client regenerieren

**Abhängig von:** Task 1, 2, 3

- [ ] **Step 1: Backend starten (falls nicht laufend)**

Run: `cd /Users/rubeen/dev/personal/bluelight-hub && pnpm --filter @bluelight-hub/backend dev &`
Warte bis der Server auf Port 3091 hört.

- [ ] **Step 2: API-Client generieren**

Run: `pnpm run generate-api`
Expected: Erfolgreich, neue Felder in generierten Models sichtbar

- [ ] **Step 3: Verify generierte Typen**

Prüfe dass `ManagedUserResponseDto` in `packages/shared/client/models/ManagedUserResponseDto.ts` die neuen Felder `operativeRole` und `stammperson` enthält.

Prüfe dass `StammPersonDto` in `packages/shared/client/models/` das neue Feld `userAccount` enthält.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/client/
git commit -m "♻️(shared): API-Client mit operativen Rollen-Feldern regenerieren"
```

---

## Task 5: Frontend — UsersTable um Spalten + Filter erweitern

**Files:**
- Modify: `packages/frontend/src/features/admin/ui/organisms/UsersTable.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminUsers.tsx`

**Abhängig von:** Task 4
**Parallelisierbar mit:** Task 6, Task 7

- [ ] **Step 1: UsersTable um operative Rolle + Stammperson Spalten erweitern**

In `packages/frontend/src/features/admin/ui/organisms/UsersTable.tsx`:

Badge-Variante Hilfsfunktion für operative Rollen hinzufügen (nach `getRoleBadgeVariant`):

```typescript
const getOperativeRoleBadgeVariant = (role: string): 'warning' | 'info' | 'default' => {
  switch (role) {
    case 'FUEHRUNGSKRAFT':
      return 'warning';
    case 'EINSATZKRAFT':
      return 'info';
    default:
      return 'default';
  }
};

const getOperativeRoleLabel = (role: string): string => {
  switch (role) {
    case 'FUEHRUNGSKRAFT':
      return 'Führungskraft';
    case 'EINSATZKRAFT':
      return 'Einsatzkraft';
    default:
      return 'Externe';
  }
};
```

Im `columns` Array — nach der `role` Spalte und vor der `isLocked` Spalte — zwei neue Spalten einfügen:

```typescript
columnHelper.accessor('operativeRole', {
  header: 'Operative Rolle',
  cell: ({ row }) => (
    <Badge variant={getOperativeRoleBadgeVariant(row.original.operativeRole)}>
      {getOperativeRoleLabel(row.original.operativeRole)}
    </Badge>
  ),
}),
columnHelper.display({
  id: 'stammperson',
  header: 'Stammperson',
  cell: ({ row }) => {
    const sp = row.original.stammperson;
    if (sp) {
      return <span className="text-sm text-text-secondary">{sp.nachname}, {sp.vorname} ({sp.personalnummer})</span>;
    }
    const requiresStammperson = row.original.operativeRole === 'FUEHRUNGSKRAFT' || row.original.operativeRole === 'EINSATZKRAFT';
    if (requiresStammperson) {
      return <span className="text-sm text-red-500 italic">⚠ Keine Stammperson</span>;
    }
    return <span className="text-text-muted">—</span>;
  },
}),
```

Die `id` Spalte entfernen (die Zeile mit `columnHelper.accessor('id', ...)`).

Im Loading-Skeleton die Header anpassen (ID entfernen, die zwei neuen hinzufügen):

```typescript
<Table.Head>Benutzername</Table.Head>
<Table.Head>Rolle</Table.Head>
<Table.Head>Operative Rolle</Table.Head>
<Table.Head>Stammperson</Table.Head>
<Table.Head>Status</Table.Head>
<Table.Head>Aktionen</Table.Head>
```

Und `columns={5}` → `columns={6}` im Skeleton.

- [ ] **Step 2: Props für Filter erweitern**

Die `UsersTableProps` um Filter-Props erweitern:

```typescript
interface UsersTableProps {
  users: Array<ManagedUserResponseDto> | undefined;
  isLoading: boolean;
  onDelete: (user: ManagedUserResponseDto) => void;
  onEdit: (user: ManagedUserResponseDto) => void;
  onUnlock: (user: ManagedUserResponseDto) => void;
  operativeRoleFilter: string;
  onOperativeRoleFilterChange: (value: string) => void;
  showOnlyWithoutStammperson: boolean;
  onShowOnlyWithoutStammpersonChange: (value: boolean) => void;
}
```

- [ ] **Step 3: Filter-Logik und UI in UsersTable einfügen**

Client-seitige Filterung mit `useMemo` (vor dem `useReactTable` Aufruf):

```typescript
const filteredUsers = useMemo(() => {
  let result = users || [];
  if (operativeRoleFilter) {
    result = result.filter((u) => u.operativeRole === operativeRoleFilter);
  }
  if (showOnlyWithoutStammperson) {
    result = result.filter((u) => {
      const requiresStammperson = u.operativeRole === 'FUEHRUNGSKRAFT' || u.operativeRole === 'EINSATZKRAFT';
      return requiresStammperson && !u.stammperson;
    });
  }
  return result;
}, [users, operativeRoleFilter, showOnlyWithoutStammperson]);
```

`useReactTable` data von `users || []` auf `filteredUsers` ändern.

Filter-UI über der Tabelle einfügen (vor `<Table.Root>`):

```tsx
<div className="flex items-center gap-4 px-4 pb-4">
  <div className="flex flex-col gap-1">
    <label htmlFor="operative-role-filter" className="text-xs font-medium uppercase text-text-muted">
      Operative Rolle
    </label>
    <select
      id="operative-role-filter"
      value={operativeRoleFilter}
      onChange={(e) => onOperativeRoleFilterChange(e.target.value)}
      className="rounded-md border border-gray-300 bg-transparent px-3 py-1.5 text-sm dark:border-gray-600"
    >
      <option value="">Alle Rollen</option>
      <option value="FUEHRUNGSKRAFT">Führungskraft</option>
      <option value="EINSATZKRAFT">Einsatzkraft</option>
      <option value="EXTERNE">Externe</option>
    </select>
  </div>
  <label className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
    <input
      type="checkbox"
      checked={showOnlyWithoutStammperson}
      onChange={(e) => onShowOnlyWithoutStammpersonChange(e.target.checked)}
      className="h-4 w-4 rounded border-gray-300"
    />
    Nur ohne Stammperson
  </label>
</div>
```

Das return-Statement muss die Filter-UI und die Tabelle wrappen:

```tsx
return (
  <div>
    {/* Filter UI hier */}
    <Table.Root>
      {/* ... bestehender Tabellen-Code ... */}
    </Table.Root>
  </div>
);
```

- [ ] **Step 4: AdminUsers Seite — Filter-State hinzufügen**

In `packages/frontend/src/features/admin/ui/pages/AdminUsers.tsx`, Filter-State hinzufügen:

```typescript
const [operativeRoleFilter, setOperativeRoleFilter] = useState('');
const [showOnlyWithoutStammperson, setShowOnlyWithoutStammperson] = useState(false);
```

Und die `UsersTable` Komponente um die neuen Props erweitern:

```tsx
<UsersTable
  users={usersData?.data}
  isLoading={isUsersLoading}
  onEdit={handleEditUser}
  onDelete={handleDeleteUser}
  onUnlock={handleUnlockUser}
  operativeRoleFilter={operativeRoleFilter}
  onOperativeRoleFilterChange={setOperativeRoleFilter}
  showOnlyWithoutStammperson={showOnlyWithoutStammperson}
  onShowOnlyWithoutStammpersonChange={setShowOnlyWithoutStammperson}
/>
```

- [ ] **Step 5: Compile-Check**

Run: `cd packages/frontend && pnpx tsc --noEmit --pretty 2>&1 | head -30`
Expected: Keine Fehler

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/features/admin/ui/organisms/UsersTable.tsx packages/frontend/src/features/admin/ui/pages/AdminUsers.tsx
git commit -m "✨(frontend): UsersTable um operative Rolle, Stammperson + Filter erweitern"
```

---

## Task 6: Frontend — EditUserDialog um operative Einstellungen erweitern

**Files:**
- Modify: `packages/frontend/src/features/admin/ui/organisms/EditUserDialog.tsx`
- Modify: `packages/frontend/src/features/admin/api/use-admin-user-management.ts`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminUsers.tsx`

**Abhängig von:** Task 4
**Parallelisierbar mit:** Task 5, Task 7

- [ ] **Step 1: Mutations für operative Rolle + Stammperson im Hook hinzufügen**

In `packages/frontend/src/features/admin/api/use-admin-user-management.ts`:

Nach dem Import-Block den Admin-API Import ergänzen:

```typescript
import type { ChangeOperativeRoleDto, AssignStammpersonDto } from '@/shared';
```

Nach der `unlockUserMutation` (vor dem return) zwei neue Mutations hinzufügen:

```typescript
// Mutation für operative Rolle ändern
const changeOperativeRoleMutation = useMutation<unknown, ResponseError, { id: string; operativeRole: string }>({
  mutationFn: async ({ id, operativeRole }) => {
    return await api.admin().adminOperativeRoleControllerChangeOperativeRoleVAlpha({
      id,
      changeOperativeRoleDto: { operativeRole } as ChangeOperativeRoleDto,
    });
  },
  onSuccess: async () => {
    toast.success('Operative Rolle geändert', {
      description: 'Die operative Rolle wurde erfolgreich aktualisiert.',
    });
    await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users });
  },
  onError: async (error: ResponseError) => {
    const message = await getApiErrorMessage(error, 'Die operative Rolle konnte nicht geändert werden.', 'changeOperativeRole');
    logger.error('Failed to change operative role', error);
    toast.error('Fehler', { description: message });
  },
});

// Mutation für Stammperson zuweisen
const assignStammpersonMutation = useMutation<unknown, ResponseError, { id: string; stammpersonId: string | null }>({
  mutationFn: async ({ id, stammpersonId }) => {
    return await api.admin().adminOperativeRoleControllerAssignStammpersonVAlpha({
      id,
      assignStammpersonDto: { stammpersonId } as AssignStammpersonDto,
    });
  },
  onSuccess: async () => {
    toast.success('Stammperson aktualisiert', {
      description: 'Die Stammperson-Zuweisung wurde erfolgreich aktualisiert.',
    });
    await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users });
    await queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.stammdaten.personen.all() });
  },
  onError: async (error: ResponseError) => {
    const message = await getApiErrorMessage(error, 'Die Stammperson konnte nicht zugewiesen werden.', 'assignStammperson');
    logger.error('Failed to assign stammperson', error);
    toast.error('Fehler', { description: message });
  },
});
```

Im return-Objekt ergänzen:

```typescript
changeOperativeRole: changeOperativeRoleMutation.mutateAsync,
assignStammperson: assignStammpersonMutation.mutateAsync,
isChangingOperativeRole: changeOperativeRoleMutation.isPending,
isAssigningStammperson: assignStammpersonMutation.isPending,
```

**Hinweis:** `mutateAsync` statt `mutate`, damit der Dialog sequenziell beide Calls machen kann.

- [ ] **Step 2: EditUserDialog erweitern — Imports + Schema**

In `packages/frontend/src/features/admin/ui/organisms/EditUserDialog.tsx`:

Imports erweitern:

```typescript
import { Combobox, type ComboboxGroup } from '@/shared/ui/headless/combobox';
import { useAdminStammPersonenManagement } from '@/features/admin/api/use-admin-stamm-personen-management';
```

Zod-Schema erweitern:

```typescript
const _editUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Benutzername muss mindestens 3 Zeichen lang sein')
    .max(30, 'Benutzername darf maximal 30 Zeichen lang sein')
    .regex(/^[a-zA-Z0-9._]+$/, 'Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Punkte enthalten'),
  role: z.nativeEnum(ManagedUserResponseDtoRoleEnum),
  operativeRole: z.enum(['FUEHRUNGSKRAFT', 'EINSATZKRAFT', 'EXTERNE']),
  stammpersonId: z.string().nullable(),
});
```

- [ ] **Step 3: EditUserDialog Props + onSubmit anpassen**

Props-Interface ändern:

```typescript
interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: EditUserFormData) => void;
  isSubmitting: boolean;
  user: ManagedUserResponseDto | null;
  allUsers: ManagedUserResponseDto[] | undefined;
}
```

`allUsers` wird gebraucht um die Combobox-Gruppen zu bauen (welche Stammperson ist schon welchem User zugewiesen).

- [ ] **Step 4: Form defaultValues erweitern**

```typescript
const form = useForm({
  defaultValues: {
    username: user?.username || '',
    role: (user?.role || ManagedUserResponseDtoRoleEnum.User) as ManagedUserResponseDtoRoleEnum,
    operativeRole: (user?.operativeRole || 'EXTERNE') as 'FUEHRUNGSKRAFT' | 'EINSATZKRAFT' | 'EXTERNE',
    stammpersonId: user?.stammperson?.id || null,
  },
  onSubmit: ({ value }) => {
    if (user) {
      onSubmit(user.id, value);
    }
  },
});
```

Im `useEffect` die neuen Felder ergänzen:

```typescript
useEffect(() => {
  if (user) {
    form.setFieldValue('username', user.username);
    form.setFieldValue('role', user.role);
    form.setFieldValue('operativeRole', (user.operativeRole || 'EXTERNE') as 'FUEHRUNGSKRAFT' | 'EINSATZKRAFT' | 'EXTERNE');
    form.setFieldValue('stammpersonId', user.stammperson?.id || null);
  }
}, [user, form]);
```

- [ ] **Step 5: Stammpersonen für Combobox laden + Gruppen bauen**

Innerhalb der `EditUserDialog` Komponente, nach dem `useForm`:

```typescript
const { stammPersonen, isLoading: isStammPersonenLoading } = useAdminStammPersonenManagement();

const stammpersonGroups = useMemo((): ComboboxGroup[] => {
  if (!stammPersonen) return [];

  const available: Array<{ value: string; label: string }> = [];
  const assigned: Array<{ value: string; label: string }> = [];

  for (const sp of stammPersonen) {
    if (sp.archivedAt) continue;

    const label = `${sp.nachname}, ${sp.vorname} (${sp.personalnummer})`;

    // Prüfe ob Stammperson bereits einem anderen User zugewiesen ist
    const assignedUser = allUsers?.find((u) => u.stammperson?.id === sp.id && u.id !== user?.id);

    if (assignedUser) {
      assigned.push({ value: sp.id, label: `${label} → ${assignedUser.username}` });
    } else {
      available.push({ value: sp.id, label });
    }
  }

  const groups: ComboboxGroup[] = [];
  if (available.length > 0) groups.push({ label: 'Verfügbar', items: available });
  if (assigned.length > 0) groups.push({ label: 'Bereits zugewiesen', items: assigned });
  return groups;
}, [stammPersonen, allUsers, user?.id]);
```

- [ ] **Step 6: Operative Einstellungen UI im Details-Tab**

Im Details-Tab, nach dem `<form.Field name="role">` Block, die operative Einstellungen hinzufügen:

```tsx
{/* Trennlinie */}
<div className="relative border-t border-gray-200 pt-6 dark:border-gray-700">
  <span className="absolute -top-3 left-0 bg-white px-2 text-xs font-medium uppercase tracking-wide text-text-muted dark:bg-gray-800">
    Operative Einstellungen
  </span>
</div>

{/* Operative Rolle */}
<form.Field name="operativeRole">
  {(field) => (
    <div className="space-y-1">
      <label htmlFor="operativeRole" className="block text-sm font-medium text-text-primary">
        Operative Rolle
      </label>
      <select
        id="operativeRole"
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value as 'FUEHRUNGSKRAFT' | 'EINSATZKRAFT' | 'EXTERNE')}
        onBlur={field.handleBlur}
        className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-600"
      >
        <option value="EXTERNE">Externe</option>
        <option value="EINSATZKRAFT">Einsatzkraft</option>
        <option value="FUEHRUNGSKRAFT">Führungskraft</option>
      </select>
      <p className="text-xs text-text-muted">Bestimmt den Zugriff auf Einsätze und operative Funktionen</p>
    </div>
  )}
</form.Field>

{/* Stammperson Combobox */}
<form.Field name="stammpersonId">
  {(field) => (
    <div className="space-y-1">
      <Combobox
        label="Stammperson"
        groups={stammpersonGroups}
        value={field.state.value || ''}
        onChange={(value) => field.handleChange(value || null)}
        onBlur={field.handleBlur}
        placeholder="Stammperson suchen..."
        helperText="Führungskräfte und Einsatzkräfte benötigen eine zugewiesene Stammperson"
        disabled={isStammPersonenLoading}
      />
    </div>
  )}
</form.Field>

{/* Warnung bei fehlender Stammperson */}
<form.Subscribe selector={(state) => state.values}>
  {(values) => {
    const requiresStammperson = values.operativeRole === 'FUEHRUNGSKRAFT' || values.operativeRole === 'EINSATZKRAFT';
    if (requiresStammperson && !values.stammpersonId) {
      return (
        <div className="rounded-md border border-orange-500/30 bg-orange-500/10 p-3">
          <p className="text-sm text-orange-400">⚠ Diese Rolle erfordert eine Stammperson. Bitte eine Stammperson zuweisen.</p>
        </div>
      );
    }
    return null;
  }}
</form.Subscribe>
```

- [ ] **Step 7: AdminUsers onSubmit-Handler anpassen**

In `packages/frontend/src/features/admin/ui/pages/AdminUsers.tsx`:

`changeOperativeRole` und `assignStammperson` aus dem Hook destructuren:

```typescript
const {
  usersData,
  isLoading: isUsersLoading,
  error,
  createUser,
  updateUser,
  deleteUser,
  lockUser,
  unlockUser,
  changeOperativeRole,
  assignStammperson,
  isCreating,
  isUpdating,
  isDeleting,
  isLocking,
  isUnlocking,
  isChangingOperativeRole,
  isAssigningStammperson,
} = useAdminUserManagement();
```

`handleUpdateUser` erweitern, um sequenziell die drei Calls auszuführen:

```typescript
const handleUpdateUser = async (id: string, data: { username: string; role: ManagedUserResponseDtoRoleEnum; operativeRole: string; stammpersonId: string | null }) => {
  try {
    // 1. Basis-Daten updaten (username + role)
    await new Promise<void>((resolve, reject) => {
      updateUser(
        { id, data: { username: data.username, role: data.role } },
        { onSuccess: () => resolve(), onError: (e) => reject(e) },
      );
    });

    // 2. Operative Rolle ändern (falls geändert)
    const currentUser = usersData?.data.find((u) => u.id === id);
    if (currentUser?.operativeRole !== data.operativeRole) {
      await changeOperativeRole({ id, operativeRole: data.operativeRole });
    }

    // 3. Stammperson zuweisen (falls geändert)
    const currentStammpersonId = currentUser?.stammperson?.id || null;
    if (currentStammpersonId !== data.stammpersonId) {
      await assignStammperson({ id, stammpersonId: data.stammpersonId });
    }

    setIsEditDialogOpen(false);
    setEditTarget(null);
  } catch {
    // Fehler werden in den Mutations selbst per Toast gehandelt
  }
};
```

`allUsers` an den EditUserDialog übergeben:

```tsx
<EditUserDialog
  isOpen={isEditDialogOpen}
  onClose={() => {
    setIsEditDialogOpen(false);
    setEditTarget(null);
  }}
  onSubmit={handleUpdateUser}
  isSubmitting={isUpdating || isChangingOperativeRole || isAssigningStammperson}
  user={editTarget}
  allUsers={usersData?.data}
/>
```

- [ ] **Step 8: Compile-Check**

Run: `cd packages/frontend && pnpx tsc --noEmit --pretty 2>&1 | head -30`
Expected: Keine Fehler

- [ ] **Step 9: Commit**

```bash
git add packages/frontend/src/features/admin/ui/organisms/EditUserDialog.tsx packages/frontend/src/features/admin/api/use-admin-user-management.ts packages/frontend/src/features/admin/ui/pages/AdminUsers.tsx
git commit -m "✨(frontend): EditUserDialog um operative Rolle + Stammperson erweitern"
```

---

## Task 7: Frontend — StammPersonenTable um Benutzer-Account Spalte erweitern

**Files:**
- Modify: `packages/frontend/src/features/admin/ui/organisms/StammPersonenTable.tsx`

**Abhängig von:** Task 4
**Parallelisierbar mit:** Task 5, Task 6

- [ ] **Step 1: Benutzer-Account Spalte hinzufügen**

In `packages/frontend/src/features/admin/ui/organisms/StammPersonenTable.tsx`:

Link-Import hinzufügen:

```typescript
import { Link } from '@tanstack/react-router';
import { PiArrowSquareOut } from 'react-icons/pi';
```

Neue Spalte im `columns` Array, nach `vorname` und vor `qualifikationen`:

```typescript
columnHelper.display({
  id: 'userAccount',
  header: 'Benutzer-Account',
  cell: ({ row }) => {
    const userAccount = row.original.userAccount;
    if (!userAccount) {
      return <span className="text-text-muted">—</span>;
    }
    return (
      <Link
        to="/admin/users"
        className="flex items-center gap-1 text-sm text-action-primary hover:underline"
      >
        {userAccount.username}
        <PiArrowSquareOut className="h-3 w-3" />
      </Link>
    );
  },
}),
```

Die `funkkenungBOS` Spalte entfernen (die Zeile mit `columnHelper.accessor('funkkenungBOS', ...)`).

- [ ] **Step 2: Compile-Check**

Run: `cd packages/frontend && pnpx tsc --noEmit --pretty 2>&1 | head -30`
Expected: Keine Fehler

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/features/admin/ui/organisms/StammPersonenTable.tsx
git commit -m "✨(frontend): StammPersonenTable um Benutzer-Account Spalte erweitern"
```

---

## Ausführungsreihenfolge

```
Task 1 ──┐
Task 2 ──┤── Task 4 ──┬── Task 5
Task 3 ──┘            ├── Task 6
                       └── Task 7
```

- **Phase 1** (parallel): Tasks 1, 2, 3 (Backend-Änderungen)
- **Phase 2** (sequenziell): Task 4 (API-Client regenerieren)
- **Phase 3** (parallel): Tasks 5, 6, 7 (Frontend-Änderungen)
