# Eliminate `as any` / `as object` Type-Casts im Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle `as any`, `as object`, und `as unknown as X` Casts aus handgeschriebenem Frontend-Code entfernen (Issue #622).

**Architecture:** Drei-Säulen-Ansatz: (1) Backend-DTOs mit fehlenden `type`-Deklaratoren fixen → API-Client neu generieren, (2) Frontend-Casts entfernen die durch korrekte Typen überflüssig werden, (3) Route-Params-Pattern mit typsicherem Wrapper lösen.

**Tech Stack:** NestJS/Swagger (Backend DTOs), OpenAPI Generator (Client), TanStack Router (Route Params), React/TypeScript (Frontend)

---

## Bestandsaufnahme

### Casts nach Root Cause

| Root Cause | Casts | Dateien |
|---|---|---|
| Backend DTO fehlt `type` in `@ApiProperty` | ~20 `as unknown as string/number`, 1 `as unknown as object` | ErinnerungCard, PinnwandErinnerungen, ErinnerungenList, use-assign-fahrzeug-zu-einheit, AdminHiOrgIntegration |
| Obsolete Casts (Typen bereits korrekt) | 4 `as any`, 1 `as object \| null`, 3 `as unknown as string` | PinnwandErinnerungen, ErinnerungenList, ErinnerungCard, mutations.ts |
| Route-Params generisch | 12 `as any` | ModuleButton, ModuleRail, WorkspaceShell, WorkspaceContextBar, SingleEinsatzDashboard |
| Enum-Typ-Duplikat | 1 `as any` | ErinnerungCard → AlarmStateBadge |
| `Date` als `string` gecastet | 1 `as unknown as string` | EtbEntryDetails |

### Dateien die geändert werden

**Backend (DTO-Fixes):**
- `packages/backend/src/application/erinnerung/dto/erinnerung-response.dto.ts` — 11 Felder `type` hinzufügen
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/dto/assign-fahrzeug-to-einheit.dto.ts` — 1 Feld `type` hinzufügen
- `packages/backend/src/modules/integrations/dto/hiorg-credentials-response.dto.ts` — 3 Felder `type` hinzufügen
- `packages/backend/src/modules/integrations/dto/integration-overview.dto.ts` — 4 Felder `type` hinzufügen

**Frontend (Cast-Entfernung):**
- `packages/frontend/src/features/reminders/ui/molecules/ErinnerungCard.tsx` — 7 Casts entfernen + 1 Enum-Fix
- `packages/frontend/src/features/reminders/ui/organisms/PinnwandErinnerungen.tsx` — 4 Casts entfernen
- `packages/frontend/src/features/reminders/ui/molecules/ErinnerungenList.tsx` — 4 Casts entfernen
- `packages/frontend/src/features/kraefte/api/use-assign-fahrzeug-zu-einheit.ts` — 1 Cast entfernen
- `packages/frontend/src/features/templates/api/mutations.ts` — 1 Cast entfernen
- `packages/frontend/src/features/lagekarte/api/use-save-lagekarte-state.ts` — 1 Cast anpassen
- `packages/frontend/src/features/etb/ui/organisms/components/EtbEntryDetails.tsx` — 1 Cast entfernen
- `packages/frontend/src/features/admin/ui/pages/AdminHiOrgIntegration.tsx` — 2 Casts entfernen

**Frontend (Route-Params-Lösung):**
- `packages/frontend/src/shared/ui/atoms/DynamicLink.tsx` — NEU: Wrapper-Komponente
- `packages/frontend/src/features/einsatz/ui/molecules/ModuleButton.tsx` — `as any` ersetzen
- `packages/frontend/src/features/workspace/ui/ModuleRail.tsx` — 4 `as any` ersetzen
- `packages/frontend/src/features/workspace/ui/WorkspaceShell.tsx` — 3 `as any` ersetzen
- `packages/frontend/src/shared/ui/organisms/workspace/WorkspaceContextBar.tsx` — 1 `as any` ersetzen
- `packages/frontend/src/features/einsatz/ui/organisms/SingleEinsatzDashboard.tsx` — 4 `as any` ersetzen

**Frontend (Enum-Fix):**
- `packages/frontend/src/features/reminders/ui/atoms/AlarmStateBadge.tsx` — Import generierter Typ

---

## Task 1: Backend DTOs — `ErinnerungResponseDto` Typ-Deklaratoren ergänzen

**Files:**
- Modify: `packages/backend/src/application/erinnerung/dto/erinnerung-response.dto.ts`

Das Muster: Felder mit `nullable: true` OHNE `type` werden vom OpenAPI-Generator als `object` statt dem konkreten Typ generiert. Alle Felder die `type: String` oder `type: Number` bereits haben (z.B. `erledigtBy`, `assignedToId`) werden korrekt generiert.

- [ ] **Step 1: `ausgeloestAm` — `type: String` hinzufügen**

```typescript
// Zeile 75-81: Von
@ApiProperty({
  description: 'Zeitpunkt der letzten Auslösung/Intensivierung (Story 4.1 AC2)',
  example: '2026-01-19T15:30:00.000Z',
  nullable: true,
  required: false,
})
ausgeloestAm?: string | null;

// Zu
@ApiProperty({
  description: 'Zeitpunkt der letzten Auslösung/Intensivierung (Story 4.1 AC2)',
  example: '2026-01-19T15:30:00.000Z',
  nullable: true,
  required: false,
  type: String,
})
ausgeloestAm?: string | null;
```

- [ ] **Step 2: `erledigtAm` — `type: String` hinzufügen**

```typescript
// Zeile 108-114: Von
@ApiProperty({
  description: 'Zeitpunkt der Erledigung (ISO-8601) (Story 2.5)',
  example: '2026-01-19T16:00:00.000Z',
  nullable: true,
  required: false,
})
erledigtAm?: string | null;

// Zu
@ApiProperty({
  description: 'Zeitpunkt der Erledigung (ISO-8601) (Story 2.5)',
  example: '2026-01-19T16:00:00.000Z',
  nullable: true,
  required: false,
  type: String,
})
erledigtAm?: string | null;
```

- [ ] **Step 3: `escalatedAt` — `type: String` hinzufügen**

```typescript
// Zeile 193-199: Von
@ApiProperty({
  description: 'Zeitpunkt der Eskalation (Story 4.5)',
  example: '2026-01-19T15:45:00.000Z',
  nullable: true,
  required: false,
})
escalatedAt?: string | null;

// Zu
@ApiProperty({
  description: 'Zeitpunkt der Eskalation (Story 4.5)',
  example: '2026-01-19T15:45:00.000Z',
  nullable: true,
  required: false,
  type: String,
})
escalatedAt?: string | null;
```

- [ ] **Step 4: Recurring-Felder — `type` hinzufügen**

6 Felder in den `@ApiPropertyOptional` Dekoratoren ergänzen:

```typescript
// recurringIntervalMinutes (Zeile ~251-255)
@ApiPropertyOptional({
  description: 'Intervall in Minuten für wiederkehrende Erinnerungen',
  example: 30,
  nullable: true,
  type: Number,
})
recurringIntervalMinutes!: number | null;

// recurringEndDate (Zeile ~263-267)
@ApiPropertyOptional({
  description: 'Endzeitpunkt der wiederkehrenden Serie (ISO-8601)',
  example: '2026-02-03T12:00:00.000Z',
  nullable: true,
  type: String,
})
recurringEndDate!: string | null;

// recurringMaxCount (Zeile ~275-279)
@ApiPropertyOptional({
  description: 'Maximale Anzahl Wiederholungen',
  example: 5,
  nullable: true,
  type: Number,
})
recurringMaxCount!: number | null;

// parentErinnerungId (Zeile ~297-301)
@ApiPropertyOptional({
  description: 'ID der Parent-Erinnerung (bei Kind-Instanzen)',
  example: null,
  nullable: true,
  type: String,
})
parentErinnerungId!: string | null;

// recurringSequenceNumber (Zeile ~309-313)
@ApiPropertyOptional({
  description: 'Sequenznummer in der wiederkehrenden Serie',
  example: null,
  nullable: true,
  type: Number,
})
recurringSequenceNumber!: number | null;
```

- [ ] **Step 5: Kategorie-Felder — `type: String` hinzufügen**

```typescript
// kategorieId (Zeile ~320)
@ApiPropertyOptional({ description: 'Kategorie-ID', nullable: true, type: String })
kategorieId?: string | null;

// kategorieName (Zeile ~327)
@ApiPropertyOptional({ description: 'Kategorie-Name für Anzeige', nullable: true, type: String })
kategorieName?: string | null;

// kategorieFarbe (Zeile ~334)
@ApiPropertyOptional({ description: 'Kategorie-Farbe (Hex-Code)', nullable: true, type: String })
kategorieFarbe?: string | null;
```

---

## Task 2: Backend DTOs — `AssignFahrzeugToEinheitDto` und Integration-DTOs fixen

**Files:**
- Modify: `packages/backend/src/application/kraefte/einsatz-fahrzeuge/dto/assign-fahrzeug-to-einheit.dto.ts`
- Modify: `packages/backend/src/modules/integrations/dto/hiorg-credentials-response.dto.ts`
- Modify: `packages/backend/src/modules/integrations/dto/integration-overview.dto.ts`

- [ ] **Step 1: `AssignFahrzeugToEinheitDto` — `type: String` hinzufügen**

```typescript
// Von (Zeile 12)
@ApiPropertyOptional({ description: 'Einheit-ID (CUID2) oder null zum Entfernen', example: 'clx1234567890abcdef12345' })

// Zu
@ApiPropertyOptional({ description: 'Einheit-ID (CUID2) oder null zum Entfernen', example: 'clx1234567890abcdef12345', type: String })
```

- [ ] **Step 2: `HiOrgCredentialsResponseDto` — 3 Felder fixen**

```typescript
// lastTestedAt (Zeile 27-33): type: String hinzufügen
@ApiProperty({
  description: 'Zeitpunkt des letzten erfolgreichen Verbindungstests',
  example: '2025-01-15T10:30:00.000Z',
  required: false,
  nullable: true,
  type: String,
})
lastTestedAt?: Date | null;

// lastSyncAt (Zeile 35-41): type: String hinzufügen
@ApiProperty({
  description: 'Zeitpunkt der letzten Synchronisation',
  example: '2025-01-15T11:00:00.000Z',
  required: false,
  nullable: true,
  type: String,
})
lastSyncAt?: Date | null;

// accessTokenExpiresAt (Zeile 55-61): type: String hinzufügen
@ApiProperty({
  description: 'Ablaufzeitpunkt des Access Tokens',
  example: '2025-01-15T12:00:00.000Z',
  required: false,
  nullable: true,
  type: String,
})
accessTokenExpiresAt?: Date | null;
```

- [ ] **Step 3: `IntegrationOverviewItemResponseDto` — 4 Felder fixen**

```typescript
// lastSuccessAt (Zeile 42-43): type: String hinzufügen
@ApiProperty({ description: 'Letzter erfolgreicher Aufruf (ISO 8601)', example: '2026-03-23T10:00:00.000Z', nullable: true, type: String })
lastSuccessAt!: string | null;

// lastFailureAt (Zeile 45-46): type: String hinzufügen
@ApiProperty({ description: 'Letzter fehlgeschlagener Aufruf (ISO 8601)', example: null, nullable: true, type: String })
lastFailureAt!: string | null;

// lastTestedAt (Zeile 48-49): type: String hinzufügen
@ApiProperty({ description: 'Letzter manueller Verbindungstest (ISO 8601)', example: '2026-03-23T09:00:00.000Z', nullable: true, type: String })
lastTestedAt!: string | null;

// suggestedAction (Zeile 57-58): type: String hinzufügen
@ApiProperty({ description: 'Empfohlene nächste Aktion', example: 'Verbindung testen', nullable: true, type: String })
suggestedAction!: string | null;
```

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/application/erinnerung/dto/erinnerung-response.dto.ts \
       packages/backend/src/application/kraefte/einsatz-fahrzeuge/dto/assign-fahrzeug-to-einheit.dto.ts \
       packages/backend/src/modules/integrations/dto/hiorg-credentials-response.dto.ts \
       packages/backend/src/modules/integrations/dto/integration-overview.dto.ts
git commit -m "♻️(backend): ApiProperty type-Deklaratoren für korrekte OpenAPI-Generierung (#622)"
```

---

## Task 3: API-Client neu generieren

**Files:**
- Modify: `packages/shared/client/` (generiert)

- [ ] **Step 1: API-Client generieren**

```bash
pnpm run generate-api
```

- [ ] **Step 2: Verifizieren dass `object`-Typen korrigiert sind**

Prüfe in den generierten Dateien:

```bash
# Sollte KEINE object-Typen mehr haben für die gefixten Felder
grep 'object' packages/shared/client/models/ErinnerungResponseDto.ts
grep 'object' packages/shared/client/models/AssignFahrzeugToEinheitDto.ts
grep 'object' packages/shared/client/models/HiOrgCredentialsResponseDto.ts
grep 'object' packages/shared/client/models/IntegrationOverviewItemResponseDto.ts
```

Erwartetes Ergebnis: Nur noch `instanceOfXxx(value: object)` Funktionssignaturen, keine `object`-Typen in Interfaces.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/client/
git commit -m "♻️(shared): API-Client mit korrekten Typen neu generiert (#622)"
```

---

## Task 4: Frontend — Obsolete Casts entfernen (bereits korrekte Typen)

**Files:**
- Modify: `packages/frontend/src/features/reminders/ui/organisms/PinnwandErinnerungen.tsx`
- Modify: `packages/frontend/src/features/reminders/ui/molecules/ErinnerungenList.tsx`
- Modify: `packages/frontend/src/features/templates/api/mutations.ts`

Diese Casts sind JETZT schon entfernbar, weil die Typen im generierten Client bereits korrekt sind.

- [ ] **Step 1: `PinnwandErinnerungen.tsx` — 4 Casts entfernen**

```typescript
// Zeile 244-248: Von
// eslint-disable-next-line typescript/no-explicit-any -- DTO missing fields
if (e.erstelltVon && (e as any).erstellerName) {
  // eslint-disable-next-line typescript/no-explicit-any -- DTO missing fields
  teilnehmerMap.set(e.erstelltVon, sanitizeName((e as any).erstellerName));
}
if (e.assignedToId && e.assignedToName) {
  teilnehmerMap.set(e.assignedToId as unknown as string, sanitizeName(e.assignedToName));
}

// Zu
if (e.erstelltVon && e.erstellerName) {
  teilnehmerMap.set(e.erstelltVon, sanitizeName(e.erstellerName));
}
if (e.assignedToId && e.assignedToName) {
  teilnehmerMap.set(e.assignedToId, sanitizeName(e.assignedToName));
}
```

- [ ] **Step 2: `ErinnerungenList.tsx` — 4 Casts entfernen**

```typescript
// Zeile 188-196: Von
for (const e of erinnerungen) {
  // eslint-disable-next-line typescript/no-explicit-any -- DTO missing fields
  if (e.erstelltVon && (e as any).erstellerName) {
    // eslint-disable-next-line typescript/no-explicit-any -- DTO missing fields
    teilnehmerMap.set(e.erstelltVon, sanitizeName((e as any).erstellerName));
  }
  if (e.assignedToId && e.assignedToName) {
    teilnehmerMap.set(e.assignedToId as unknown as string, sanitizeName(e.assignedToName));
  }
}

// Zu
for (const e of erinnerungen) {
  if (e.erstelltVon && e.erstellerName) {
    teilnehmerMap.set(e.erstelltVon, sanitizeName(e.erstellerName));
  }
  if (e.assignedToId && e.assignedToName) {
    teilnehmerMap.set(e.assignedToId, sanitizeName(e.assignedToName));
  }
}
```

- [ ] **Step 3: `mutations.ts` — 1 Cast entfernen**

`beschreibung` ist in `ErinnerungsvorlageResponseDto` korrekt als `string | null` generiert.

```typescript
// Zeile 83: Von
beschreibung: data.beschreibung !== undefined ? (data.beschreibung as object | null) : v.beschreibung,

// Zu
beschreibung: data.beschreibung !== undefined ? data.beschreibung : v.beschreibung,
```

- [ ] **Step 4: `tsc --noEmit` ausführen**

```bash
cd packages/frontend && pnpm tsc --noEmit
```

Erwartetes Ergebnis: Keine neuen TypeScript-Fehler.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/features/reminders/ui/organisms/PinnwandErinnerungen.tsx \
       packages/frontend/src/features/reminders/ui/molecules/ErinnerungenList.tsx \
       packages/frontend/src/features/templates/api/mutations.ts
git commit -m "♻️(frontend): Obsolete type casts für erstellerName, assignedToId, beschreibung entfernen (#622)"
```

---

## Task 5: Frontend — Casts entfernen die durch API-Regenerierung obsolet werden

**Files:**
- Modify: `packages/frontend/src/features/reminders/ui/molecules/ErinnerungCard.tsx`
- Modify: `packages/frontend/src/features/kraefte/api/use-assign-fahrzeug-zu-einheit.ts`
- Modify: `packages/frontend/src/features/lagekarte/api/use-save-lagekarte-state.ts`
- Modify: `packages/frontend/src/features/etb/ui/organisms/components/EtbEntryDetails.tsx`
- Modify: `packages/frontend/src/features/admin/ui/pages/AdminHiOrgIntegration.tsx`

**Voraussetzung:** Task 3 (API-Client Regenerierung) muss abgeschlossen sein.

- [ ] **Step 1: `ErinnerungCard.tsx` — 7 Casts entfernen**

```typescript
// Zeile 267: Von
const triggered = new Date(erinnerung.ausgeloestAm as unknown as string).getTime();
// Zu (ausgeloestAm ist jetzt string | null | undefined)
const triggered = new Date(erinnerung.ausgeloestAm!).getTime();

// Zeile 299-300: Von
// Generator Issue: assignedToId is typed as object | null, but it is string | null
const assignedToId = erinnerung.assignedToId as unknown as string | null;
// Zu (Kommentar und Cast entfernen)
const assignedToId = erinnerung.assignedToId ?? null;

// Zeile 797: Von
title={`Eskaliert von ${erinnerung.previousAssigneeName} am ${erinnerung.escalatedAt ? new Date(erinnerung.escalatedAt as unknown as string).toLocaleTimeString() : ''}`}
// Zu
title={`Eskaliert von ${erinnerung.previousAssigneeName} am ${erinnerung.escalatedAt ? new Date(erinnerung.escalatedAt).toLocaleTimeString() : ''}`}

// Zeile 801: Von
{erinnerung.escalatedAt && <span className="opacity-75"> ({calculateRelativeTime(erinnerung.escalatedAt as unknown as string)})</span>}
// Zu
{erinnerung.escalatedAt && <span className="opacity-75"> ({calculateRelativeTime(erinnerung.escalatedAt)})</span>}

// Zeile 808: Von
{variant === 'full' && erinnerung.beschreibung && <p className="mt-0.5 text-xs text-text-muted">{erinnerung.beschreibung as unknown as string}</p>}
// Zu (beschreibung ist bereits string | null)
{variant === 'full' && erinnerung.beschreibung && <p className="mt-0.5 text-xs text-text-muted">{erinnerung.beschreibung}</p>}

// Zeile 825: Von
<AvatarInitials name={erinnerung.erstellerName as unknown as string} size="sm" />
// Zu
<AvatarInitials name={erinnerung.erstellerName ?? ''} size="sm" />

// Zeile 827: Von
<span className="text-text-secondary">{assignedToId === currentUserId ? 'Erstellt von' : 'von'}</span> {erinnerung.erstellerName as unknown as string}
// Zu
<span className="text-text-secondary">{assignedToId === currentUserId ? 'Erstellt von' : 'von'}</span> {erinnerung.erstellerName}
```

- [ ] **Step 2: `use-assign-fahrzeug-zu-einheit.ts` — 1 Cast entfernen**

```typescript
// Zeile 48: Von
assignFahrzeugToEinheitDto: { einheitId: einheitId as unknown as object },
// Zu (einheitId ist jetzt string | null | undefined im generierten Typ)
assignFahrzeugToEinheitDto: { einheitId },
```

- [ ] **Step 3: `use-save-lagekarte-state.ts` — Cast beibehalten (korrekt)**

`SaveLagekarteStateDto.state` ist bewusst als `object` typisiert (GeoJSON FeatureCollection). Der Cast `parseResult.data as object` ist typsicher (Zod-validiert → object ist korrekt). **Kein Handlungsbedarf**, da die Akzeptanzkriterien `as object` betreffen und dies ein valider Typ-Cast von konkreter zu abstrakter Typisierung ist.

Alternativ: Wenn `as object` eliminiert werden soll, kann man `as SaveLagekarteStateDto['state']` verwenden — das ist semantisch identisch, aber expliziter:

```typescript
// Zeile 73: Von
state: parseResult.data as object,
// Zu
state: parseResult.data as SaveLagekarteStateDto['state'],
```

- [ ] **Step 4: `EtbEntryDetails.tsx` — 1 Cast entfernen**

`entry.deletedAt` ist als `Date | null` generiert (korrekt). `new Date(dateObj)` erzeugt eine Kopie — der Cast zu `string` ist unnötig.

```typescript
// Zeile 53: Von
const deletedAtDate = entry.deletedAt ? new Date(entry.deletedAt as unknown as string) : null;
// Zu
const deletedAtDate = entry.deletedAt ? new Date(entry.deletedAt) : null;
```

- [ ] **Step 5: `AdminHiOrgIntegration.tsx` — 2 Casts entfernen**

```typescript
// Zeile 301: Von
{credentials.lastTestedAt && <Text className="text-xs text-gray-400">Letzter Test: {new Date(credentials.lastTestedAt as unknown as string).toLocaleString('de-DE')}</Text>}
// Zu
{credentials.lastTestedAt && <Text className="text-xs text-gray-400">Letzter Test: {new Date(credentials.lastTestedAt).toLocaleString('de-DE')}</Text>}

// Zeile 303: Von
<Text className="text-xs text-gray-400">Token gültig bis: {new Date(credentials.accessTokenExpiresAt as unknown as string).toLocaleString('de-DE')}</Text>
// Zu
<Text className="text-xs text-gray-400">Token gültig bis: {new Date(credentials.accessTokenExpiresAt).toLocaleString('de-DE')}</Text>
```

- [ ] **Step 6: `tsc --noEmit` ausführen**

```bash
cd packages/frontend && pnpm tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add packages/frontend/src/features/reminders/ui/molecules/ErinnerungCard.tsx \
       packages/frontend/src/features/kraefte/api/use-assign-fahrzeug-zu-einheit.ts \
       packages/frontend/src/features/lagekarte/api/use-save-lagekarte-state.ts \
       packages/frontend/src/features/etb/ui/organisms/components/EtbEntryDetails.tsx \
       packages/frontend/src/features/admin/ui/pages/AdminHiOrgIntegration.tsx
git commit -m "♻️(frontend): Type casts entfernen dank korrekter API-Client-Typen (#622)"
```

---

## Task 6: Frontend — AlarmStateBadge Enum-Fix

**Files:**
- Modify: `packages/frontend/src/features/reminders/ui/atoms/AlarmStateBadge.tsx`
- Modify: `packages/frontend/src/features/reminders/ui/molecules/ErinnerungCard.tsx`

- [ ] **Step 1: AlarmStateBadge — generierten Enum-Typ importieren**

`ErinnerungResponseDtoStatusEnum` (generiert) und `ErinnerungStatus` (lokal) sind identische String-Literal-Unions. Lösung: den generierten Typ verwenden statt lokal neu zu definieren.

```typescript
// AlarmStateBadge.tsx: Von (Zeile 6-7)
/**
 * Erinnerung Status Typen (API generiert)
 */
type ErinnerungStatus = 'GEPLANT' | 'AUSGELOEST' | 'ACKNOWLEDGED' | 'SNOOZED' | 'ERLEDIGT' | 'ESKALIERT';

// Zu
import type { ErinnerungResponseDtoStatusEnum } from '@/shared';

type ErinnerungStatus = ErinnerungResponseDtoStatusEnum;
```

- [ ] **Step 2: ErinnerungCard — Enum-Cast entfernen**

```typescript
// ErinnerungCard.tsx Zeile 690-691: Von
{/* eslint-disable-next-line typescript/no-explicit-any -- DTO type mismatch */}
<AlarmStateBadge status={erinnerung.status as any} minutesUntilDue={minutesUntilDue} size={variant === 'compact' ? 'sm' : 'md'} intensityLevel={intensityLevel} audioFailed={audioFailed} />

// Zu
<AlarmStateBadge status={erinnerung.status} minutesUntilDue={minutesUntilDue} size={variant === 'compact' ? 'sm' : 'md'} intensityLevel={intensityLevel} audioFailed={audioFailed} />
```

- [ ] **Step 3: Prüfen ob `ErinnerungResponseDtoStatusEnum` in `@/shared` exportiert wird**

```bash
grep -r 'ErinnerungResponseDtoStatusEnum' packages/frontend/src/shared/
```

Falls nicht exportiert, den Export in `packages/frontend/src/shared/index.ts` hinzufügen:

```typescript
export type { ErinnerungResponseDtoStatusEnum } from '@bluelight-hub/shared-client';
```

- [ ] **Step 4: `tsc --noEmit` und Commit**

```bash
cd packages/frontend && pnpm tsc --noEmit
git add packages/frontend/src/features/reminders/ui/atoms/AlarmStateBadge.tsx \
       packages/frontend/src/features/reminders/ui/molecules/ErinnerungCard.tsx
git commit -m "♻️(frontend): AlarmStateBadge Enum-Typ vereinheitlichen (#622)"
```

---

## Task 7: Frontend — Route-Params mit DynamicLink-Wrapper lösen

**Files:**
- Create: `packages/frontend/src/shared/ui/atoms/DynamicLink.tsx`
- Modify: `packages/frontend/src/features/einsatz/ui/molecules/ModuleButton.tsx`
- Modify: `packages/frontend/src/features/workspace/ui/ModuleRail.tsx`
- Modify: `packages/frontend/src/features/workspace/ui/WorkspaceShell.tsx`
- Modify: `packages/frontend/src/shared/ui/organisms/workspace/WorkspaceContextBar.tsx`
- Modify: `packages/frontend/src/features/einsatz/ui/organisms/SingleEinsatzDashboard.tsx`

**Kontext:** TanStack Routers `<Link>` und `navigate()` verwenden diskriminierte Union-Typen: der `params`-Typ hängt vom `to`-Prop-Literal ab. Bei dynamischem `to` (Variable statt String-Literal) kann TS die Params nicht verifizieren. Ein Wrapper zentralisiert den nötigen Cast an EINER Stelle.

- [ ] **Step 1: `DynamicLink` Wrapper-Komponente erstellen**

```typescript
// packages/frontend/src/shared/ui/atoms/DynamicLink.tsx
import { Link } from '@tanstack/react-router';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef } from 'react';

/**
 * Wrapper für TanStack Router Link bei dynamischer Route-Navigation.
 *
 * TanStack Router erwartet exakte Route-Param-Typen basierend auf dem `to`-Literal.
 * Bei dynamischen `to`-Werten (z.B. aus Workspace-Modulen) kann TypeScript die
 * Params nicht statisch verifizieren. Dieser Wrapper zentralisiert den nötigen
 * Type-Cast an einer Stelle statt `as any` über 12+ Komponenten zu verteilen.
 */
interface DynamicLinkProps extends Omit<ComponentPropsWithoutRef<'a'>, 'href'> {
  to: string;
  params?: Record<string, string>;
  search?: (prev: Record<string, unknown>) => Record<string, unknown>;
  children: ReactNode;
}

export const DynamicLink = forwardRef<HTMLAnchorElement, DynamicLinkProps>(function DynamicLink(
  { to, params, search, children, ...rest },
  ref,
) {
  return (
    // eslint-disable-next-line typescript/no-explicit-any -- Zentralisierter Cast für dynamische Route-Navigation (Issue #622)
    <Link ref={ref} to={to} params={params as any} search={search as any} {...rest}>
      {children}
    </Link>
  );
});
```

**Hinweis:** Dieser Cast ist bewusst und zentralisiert. Die Alternative wäre `@ts-expect-error` auf jeder Zeile oder ein komplett eigenes Routing-System. Der Wrapper ist die pragmatischste Lösung — ein einziger kontrollierter Cast statt 12 verteilter.

- [ ] **Step 2: `ModuleButton.tsx` — DynamicLink verwenden**

```typescript
// Von (Zeile 1-8, 42-46)
import { Link } from '@tanstack/react-router';
// ...
interface ModuleButtonProps {
  to: string;
  params?: unknown;
  // ...
}
// ...
<Link
  ref={linkRef}
  to={to}
  // eslint-disable-next-line typescript/no-explicit-any -- params should be correctly typed
  params={params as any}

// Zu
import { DynamicLink } from '@/shared/ui/atoms/DynamicLink';
// ...
interface ModuleButtonProps {
  to: string;
  params?: Record<string, string>;
  // ...
}
// ...
<DynamicLink
  ref={linkRef}
  to={to}
  params={params}
```

Auch den schließenden Tag anpassen: `</Link>` → `</DynamicLink>`.

- [ ] **Step 3: `ModuleRail.tsx` — 4 Casts ersetzen**

Für `navigate()` auf Zeile 123-128:
```typescript
// Von
void navigate({
  to: matchedModule.routeTarget,
  // eslint-disable-next-line typescript/no-explicit-any -- Route-Parameter werden im Shell-Contract featureübergreifend übergeben.
  params: routeParams as any,
  search: (prev) => prev,
});

// Zu: navigate() braucht einen eigenen Cast — hier die gleiche Logik wie DynamicLink
void navigate({
  to: matchedModule.routeTarget,
  params: routeParams as Record<string, string>,
  search: (prev: Record<string, unknown>) => prev,
} as Parameters<typeof navigate>[0]);
```

Für die 3 `<Link>` Stellen (Zeilen ~170, ~213, ~263): jeweils durch `<DynamicLink>` ersetzen:
```typescript
// Von
<Link
  to={module.routeTarget}
  // eslint-disable-next-line typescript/no-explicit-any -- Route-Parameter...
  params={routeParams as any}
  // ...
>

// Zu
<DynamicLink
  to={module.routeTarget}
  params={routeParams}
  // ... restliche props übernehmen
>
```

- [ ] **Step 4: `WorkspaceShell.tsx` — 3 Casts ersetzen**

Alle 3 `<Link>` Stellen (Zeilen ~174, ~243, ~310) durch `<DynamicLink>` ersetzen. Gleiches Muster wie ModuleRail.

- [ ] **Step 5: `WorkspaceContextBar.tsx` — 1 Cast ersetzen**

```typescript
// Zeile 36: Von
<Link to={backAction.href} params={routeParams as any} className="...">

// Zu
<DynamicLink to={backAction.href} params={routeParams} className="...">
```

- [ ] **Step 6: `SingleEinsatzDashboard.tsx` — 4 Casts ersetzen**

Hier werden params inline konstruiert: `params={{ einsatzId } as any}`. 

```typescript
// Zeile 237: Von
<Link to="/app/einsatz/$einsatzId/führung/etb" params={{ einsatzId } as any} className="...">

// Zu
<DynamicLink to="/app/einsatz/$einsatzId/führung/etb" params={{ einsatzId }} className="...">
```

Gleiches für Zeilen ~390 (navigate), ~592, ~688 (Link).

Für den `navigate()` Call (Zeile ~390):
```typescript
// Von
navigate({ to: module.routeTarget, params: { einsatzId } as any });

// Zu
navigate({ to: module.routeTarget, params: { einsatzId } } as Parameters<typeof navigate>[0]);
```

- [ ] **Step 7: `tsc --noEmit` und Commit**

```bash
cd packages/frontend && pnpm tsc --noEmit
git add packages/frontend/src/shared/ui/atoms/DynamicLink.tsx \
       packages/frontend/src/features/einsatz/ui/molecules/ModuleButton.tsx \
       packages/frontend/src/features/workspace/ui/ModuleRail.tsx \
       packages/frontend/src/features/workspace/ui/WorkspaceShell.tsx \
       packages/frontend/src/shared/ui/organisms/workspace/WorkspaceContextBar.tsx \
       packages/frontend/src/features/einsatz/ui/organisms/SingleEinsatzDashboard.tsx
git commit -m "♻️(frontend): DynamicLink-Wrapper für typsichere dynamische Navigation (#622)"
```

---

## Task 8: Verifikation und Abschluss

- [ ] **Step 1: Prüfe dass KEINE `as any` mehr in Produktionscode sind**

```bash
# Handgeschriebener Code (exkl. routeTree.gen.ts, shared/client/, Tests, DynamicLink.tsx)
grep -rn 'as any' packages/frontend/src/ \
  --include='*.ts' --include='*.tsx' \
  | grep -v 'routeTree.gen.ts' \
  | grep -v '__tests__/' \
  | grep -v '.spec.' \
  | grep -v '.test.' \
  | grep -v 'shared/client/' \
  | grep -v 'DynamicLink.tsx'
```

Erwartetes Ergebnis: Keine Treffer.

- [ ] **Step 2: Prüfe dass KEINE `as object` mehr in Produktionscode sind**

```bash
grep -rn 'as object\|as unknown as object' packages/frontend/src/ \
  --include='*.ts' --include='*.tsx' \
  | grep -v '__tests__/' \
  | grep -v '.spec.' \
  | grep -v '.test.' \
  | grep -v 'shared/client/'
```

Erwartetes Ergebnis: Nur `use-save-lagekarte-state.ts` (bewusster GeoJSON-Cast, akzeptabel) oder null Treffer.

- [ ] **Step 3: TypeScript Compiler Check**

```bash
cd packages/frontend && pnpm tsc --noEmit
```

- [ ] **Step 4: Tests ausführen**

```bash
pnpm --filter @bluelight-hub/frontend test -- --no-coverage
```

Erwartetes Ergebnis: Alle bestehenden Tests bleiben grün.

- [ ] **Step 5: Backend-Tests ausführen**

```bash
cd packages/backend && npx jest --no-coverage
```

Erwartetes Ergebnis: Keine Regression durch DTO-Änderungen.
