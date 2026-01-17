---
title: 'ETB: Absender automatisch ausfüllen'
slug: 'etb-absender-autofill'
created: '2026-01-16'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'React 19'
  - 'TanStack Query'
  - 'TanStack Form + Zod'
  - 'TanStack Store'
  - 'Headless UI Combobox'
  - 'NestJS + Prisma'
  - 'PostgreSQL'
files_to_modify:
  - 'packages/backend/prisma/schema.prisma'
  - 'packages/backend/src/application/etb/dto/add-eintrag.dto.ts'
  - 'packages/backend/src/application/etb/dto/eintrag.dto.ts'
  - 'packages/backend/src/application/etb/commands/add-eintrag/add-eintrag.command.ts'
  - 'packages/backend/src/application/etb/commands/add-eintrag/add-eintrag.handler.ts'
  - 'packages/backend/src/modules/etb/controllers/etb-cqrs.controller.ts'
  - 'packages/backend/src/modules/einsatz/controllers/einsatz-teilnehmer.controller.ts (neu)'
  - 'packages/backend/src/application/einsatz/commands/join-einsatz/ (neu)'
  - 'packages/backend/src/application/einsatz/queries/get-user-funkrufname/ (neu)'
  - 'packages/frontend/src/features/einsatz/stores/active-einsatz.store.ts'
  - 'packages/frontend/src/features/einsatz/api/use-einsatz-teilnahme.ts (neu)'
  - 'packages/frontend/src/features/etb/ui/molecules/FunkrufnameCombobox.tsx (neu)'
  - 'packages/frontend/src/features/einsatz/ui/organisms/EinsatzBeitrittDialog.tsx (neu)'
  - 'packages/frontend/src/features/etb/ui/organisms/EtbEntryForm.tsx'
code_patterns:
  - 'TanStack Form mit Zod-Schema'
  - 'TanStack Store mit LocalStorage-Persistierung'
  - 'Headless UI Combobox mit allowCustomValue'
  - 'CQRS mit Command/Handler Pattern'
  - 'Result Pattern für Domain-Operationen'
test_patterns:
  - 'Jest + AAA Pattern mit Given-When-Then'
  - 'Mock Repository Pattern'
  - 'Command Unit Tests'
---

# Tech-Spec: ETB: Absender automatisch ausfüllen

**Created:** 2026-01-16
**Issue:** https://github.com/rubenvitt/bluelight-hub/issues/115

## Overview

### Problem Statement

Beim Erstellen manueller ETB-Einträge muss der Absender/Empfänger jedes Mal händisch eingegeben werden. Das ist fehleranfällig und zeitaufwändig im Einsatzgeschehen. Automatische ETB-Einträge (via FMS-Events, Fahrzeug-Events) haben bereits Absender, aber manuelle Einträge nicht.

### Solution

1. User wählt **einmalig pro Einsatz** seinen Funkrufnamen (beim Beitreten/Öffnen des Einsatzes)
2. Dieser wird als **Standard-Absender** für neue ETB-Einträge verwendet
3. **Override möglich** aber nicht prominent (für Einträge im Namen anderer Parteien wie EL → LST)
4. **Unified Input (Combobox)** mit Autocomplete aus eingesetzten EKs (EinsatzFahrzeuge + EinsatzPersonen) + Freitext für externe Parteien

### Scope

**In Scope:**
- Einsatz-spezifische Funkrufname-Auswahl für User (einmalig pro Einsatz)
- Auto-Fill im ETB-Formular für Absender und Empfänger
- Combobox-Komponente mit Vorschlägen aus eingesetzten EKs
- Freitext-Eingabe für externe Parteien (LST, Polizei, etc.)
- Persistierung der User-Auswahl pro Einsatz (neue DB-Tabelle)
- Backend-Erweiterung um Absender/Empfänger im AddEintragCommand

**Out of Scope:**
- Validierung der Funkrufnamen (separates Issue)
- Admin-Bereich für Funkrufnamen-Pflege
- Globaler User-Funkrufname (nicht einsatz-spezifisch)

## Context for Development

### Codebase Patterns

**Frontend Patterns:**
- **Forms:** TanStack React Form mit Zod-Schema Validierung
- **State:** TanStack Store mit LocalStorage-Persistierung (siehe `active-einsatz.store.ts`)
- **API:** Generierter Client `@bluelight-hub/shared/client` + TanStack Query
- **Combobox:** Headless UI Wrapper in `/shared/ui/headless/combobox.tsx`
  - `allowCustomValue={true}` für Freitext-Unterstützung
  - Debouncing via `@tanstack/pacer` (300ms Standard)
- **Einsatz-Routing:** URL-Parameter `$einsatzId` via TanStack Router

**Backend Patterns:**
- **CQRS:** Commands in `application/*/commands/`, Queries in `application/*/queries/`
- **DTOs:** Class-Validator + Swagger Decorators (`@ApiProperty`, `@ApiWrappedResponse`)
- **Result Pattern:** `Result<T>` statt Exceptions
- **User Context:** `@CurrentUser()` Decorator liefert `{ userId, role }` aus JWT

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/frontend/src/features/etb/ui/organisms/EtbEntryForm.tsx` | Aktuelles ETB-Formular - hier Absender/Empfänger Felder hinzufügen |
| `packages/frontend/src/shared/ui/headless/combobox.tsx` | Wiederverwendbare Combobox - als Basis für FunkrufnameCombobox |
| `packages/frontend/src/features/einsatz/stores/active-einsatz.store.ts` | Globaler Einsatz-Store - erweitern um `userFunkrufname` |
| `packages/frontend/src/features/einsatz/api/use-einsatz-fahrzeuge.ts` | Hook für EinsatzFahrzeuge - Autocomplete-Quelle |
| `packages/frontend/src/features/einsatz/api/use-einsatz-personen.ts` | Hook für EinsatzPersonen - Autocomplete-Quelle |
| `packages/backend/src/application/etb/dto/add-eintrag.dto.ts` | DTO - um `absender`/`empfaenger` erweitern |
| `packages/backend/src/application/etb/dto/eintrag.dto.ts` | Response DTO - `funkrufname` zu `absender` umbenennen |
| `packages/backend/src/application/etb/commands/add-eintrag/` | Command + Handler - um Absender/Empfänger erweitern |

### Technical Decisions

1. **Neue Tabelle `EinsatzTeilnehmer`:** User-Funkrufname wird pro Einsatz in neuer DB-Tabelle gespeichert
   - Schema: `{ id, einsatzId, userId, funkrufname, joinedAt, leftAt }`
   - Unique Constraint: `[einsatzId, userId]` (User kann Einsatz nur einmal beitreten)

2. **Unified Input = Combobox mit `allowCustomValue`:** Bestehende Komponente erweitern
   - Vorschläge aus: EinsatzFahrzeuge.funkrufname + EinsatzPersonen.funkrufname
   - Freitext für: LST, Polizei, externe Einheiten

3. **Zwei Felder im ETB-Eintrag:** `absender` und `empfaenger` (beide optional, Freitext)
   - `funkrufname` wird zu `absender` umbenannt (Breaking Change im DTO)
   - `createdBy` bleibt technischer Audit-Trail (User-ID)

4. **Einsatz-Beitritt:** Dialog beim Öffnen eines Einsatzes wenn noch kein Funkrufname gewählt
   - Speicherung in DB (EinsatzTeilnehmer) + LocalStorage (Cache)

---

## Implementation Plan

### Phase 1: Backend Schema & Migration

- [ ] **Task 1.1:** Prisma Schema - EinsatzTeilnehmer Tabelle
  - File: `packages/backend/prisma/schema.prisma`
  - Action: Neues Model `EinsatzTeilnehmer` hinzufügen
  ```prisma
  model EinsatzTeilnehmer {
    id          String    @id @default(cuid())
    einsatzId   String
    userId      String
    funkrufname String    @db.VarChar(100)
    joinedAt    DateTime  @default(now())
    leftAt      DateTime?

    einsatz     Einsatz   @relation(fields: [einsatzId], references: [id], onDelete: Cascade)
    user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@unique([einsatzId, userId])
    @@index([einsatzId])
    @@index([userId])
  }
  ```
  - Notes: Relationen zu Einsatz und User Model hinzufügen

- [ ] **Task 1.2:** Prisma Schema - EtbEintrag Felder
  - File: `packages/backend/prisma/schema.prisma`
  - Action: Im `EtbEintrag` Model `funkrufname` zu `absender` umbenennen + `empfaenger` hinzufügen
  ```prisma
  model EtbEintrag {
    // ... existing fields ...
    absender    String?   @db.VarChar(100)  // renamed from funkrufname
    empfaenger  String?   @db.VarChar(100)  // new field
  }
  ```

- [ ] **Task 1.3:** Migration ausführen
  - Command: `pnpm --filter @bluelight-hub/backend prisma:migrate`
  - Notes: Migration Name: `add_einsatz_teilnehmer_and_etb_absender`

### Phase 2: Backend Application Layer - ETB

- [ ] **Task 2.1:** DTO - AddEintragDto erweitern
  - File: `packages/backend/src/application/etb/dto/add-eintrag.dto.ts`
  - Action: Felder `absender` und `empfaenger` hinzufügen
  ```typescript
  @ApiPropertyOptional({ description: 'Absender des Eintrags (z.B. Funkrufname)', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  absender?: string;

  @ApiPropertyOptional({ description: 'Empfänger des Eintrags (z.B. LST)', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  empfaenger?: string;
  ```

- [ ] **Task 2.2:** DTO - EintragDto anpassen
  - File: `packages/backend/src/application/etb/dto/eintrag.dto.ts`
  - Action: `funkrufname` zu `absender` umbenennen, `empfaenger` hinzufügen
  - Notes: Beschreibung anpassen, Swagger Docs aktualisieren

- [ ] **Task 2.3:** Command - AddEintragCommand erweitern
  - File: `packages/backend/src/application/etb/commands/add-eintrag/add-eintrag.command.ts`
  - Action: `absender` und `empfaenger` Parameter hinzufügen
  ```typescript
  private constructor(
    // ... existing params ...
    public readonly absender?: string,
    public readonly empfaenger?: string,
  ) {}
  ```

- [ ] **Task 2.4:** Handler - AddEintragHandler erweitern
  - File: `packages/backend/src/application/etb/commands/add-eintrag/add-eintrag.handler.ts`
  - Action: `absender` und `empfaenger` an Domain-Methode weitergeben

- [ ] **Task 2.5:** Controller - POST Eintrag anpassen
  - File: `packages/backend/src/modules/etb/controllers/etb-cqrs.controller.ts`
  - Action: `dto.absender` und `dto.empfaenger` an Command übergeben

- [ ] **Task 2.6:** Mapper - EtbQueryMapper anpassen
  - File: `packages/backend/src/application/etb/mappers/etb-query.mapper.ts`
  - Action: `funkrufname` zu `absender` umbenennen, `empfaenger` mappen

### Phase 3: Backend Application Layer - EinsatzTeilnehmer

- [ ] **Task 3.1:** Repository Interface
  - File: `packages/backend/src/domain/repositories/i-einsatz-teilnehmer.repository.ts` (neu)
  - Action: Interface mit `findByEinsatzAndUser`, `save`, `findByEinsatz` Methoden

- [ ] **Task 3.2:** Repository Implementation
  - File: `packages/backend/src/infrastructure/repositories/prisma-einsatz-teilnehmer.repository.ts` (neu)
  - Action: Prisma-Implementierung des Repository

- [ ] **Task 3.3:** DTOs - EinsatzTeilnehmer
  - File: `packages/backend/src/application/einsatz/dto/einsatz-teilnehmer.dto.ts` (neu)
  - Action: `JoinEinsatzDto` (input) und `EinsatzTeilnehmerDto` (output)

- [ ] **Task 3.4:** Command - JoinEinsatzCommand
  - File: `packages/backend/src/application/einsatz/commands/join-einsatz/join-einsatz.command.ts` (neu)
  - Action: Command mit `einsatzId`, `userId`, `funkrufname`

- [ ] **Task 3.5:** Handler - JoinEinsatzHandler
  - File: `packages/backend/src/application/einsatz/commands/join-einsatz/join-einsatz.handler.ts` (neu)
  - Action: Upsert-Logik (update wenn schon vorhanden, sonst insert)

- [ ] **Task 3.6:** Query - GetUserFunkrufnameQuery
  - File: `packages/backend/src/application/einsatz/queries/get-user-funkrufname/` (neu)
  - Action: Query um Funkrufname für User+Einsatz abzurufen

- [ ] **Task 3.7:** Controller - EinsatzTeilnehmerController
  - File: `packages/backend/src/modules/einsatz/controllers/einsatz-teilnehmer.controller.ts` (neu)
  - Action: Endpoints:
    - `POST /einsatz/:einsatzId/teilnehmer/join` - Beitreten mit Funkrufname
    - `GET /einsatz/:einsatzId/teilnehmer/me` - Eigenen Funkrufname abrufen
    - `GET /einsatz/:einsatzId/teilnehmer` - Alle Teilnehmer (für Autocomplete)

- [ ] **Task 3.8:** Module - EinsatzModule erweitern
  - File: `packages/backend/src/modules/einsatz/einsatz.module.ts`
  - Action: Controller, Handler, Repository registrieren

### Phase 4: API Client & Frontend Grundlagen

- [ ] **Task 4.1:** API Client regenerieren
  - Command: `pnpm run generate-api`
  - Notes: Nach allen Backend-Änderungen ausführen

- [ ] **Task 4.2:** Hook - useEinsatzTeilnahme
  - File: `packages/frontend/src/features/einsatz/api/use-einsatz-teilnahme.ts` (neu)
  - Action: TanStack Query Hook für Teilnehmer-API
  ```typescript
  export const useJoinEinsatz = () => useMutation({ ... });
  export const useUserFunkrufname = (einsatzId: string) => useQuery({ ... });
  export const useEinsatzTeilnehmer = (einsatzId: string) => useQuery({ ... });
  ```

- [ ] **Task 4.3:** Store - Active Einsatz erweitern
  - File: `packages/frontend/src/features/einsatz/stores/active-einsatz.store.ts`
  - Action: `userFunkrufname: string | null` zum State hinzufügen
  - Action: LocalStorage-Key erweitern für Cache
  - Action: Actions: `setUserFunkrufname(funkrufname)`, `clearUserFunkrufname()`

- [ ] **Task 4.4:** Query Keys erweitern
  - File: `packages/frontend/src/queryKeys.ts`
  - Action: Keys für `einsatzTeilnehmer` hinzufügen

### Phase 5: Frontend Komponenten

- [ ] **Task 5.1:** FunkrufnameCombobox Komponente
  - File: `packages/frontend/src/features/etb/ui/molecules/FunkrufnameCombobox.tsx` (neu)
  - Action: Combobox mit Vorschlägen aus EinsatzFahrzeuge + EinsatzPersonen
  ```typescript
  interface FunkrufnameComboboxProps {
    einsatzId: string;
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
  }
  ```
  - Notes:
    - `allowCustomValue={true}` für Freitext
    - Vorschläge sortiert: Fahrzeuge zuerst, dann Personen
    - Gruppierung optional (später)

- [ ] **Task 5.2:** EinsatzBeitrittDialog Komponente
  - File: `packages/frontend/src/features/einsatz/ui/organisms/EinsatzBeitrittDialog.tsx` (neu)
  - Action: Modal/Dialog für Funkrufname-Auswahl beim Einsatz-Beitritt
  - Props: `einsatzId`, `isOpen`, `onClose`, `onSuccess`
  - Notes:
    - FunkrufnameCombobox als Eingabe
    - "Später" Button um Dialog zu schließen (optional)
    - Speichern ruft `useJoinEinsatz` Mutation auf

- [ ] **Task 5.3:** ETB Entry Form erweitern
  - File: `packages/frontend/src/features/etb/ui/organisms/EtbEntryForm.tsx`
  - Action:
    - Zod-Schema um `absender` und `empfaenger` erweitern
    - FunkrufnameCombobox für beide Felder einbinden
    - `absender` mit User-Funkrufname aus Store vorausfüllen
    - `empfaenger` leer lassen (optional)
  - Notes: Layout anpassen (Absender/Empfänger in eigener Zeile über Text)

- [ ] **Task 5.4:** Einsatz-Beitritt Integration
  - File: `packages/frontend/src/routes/app/einsatz/$einsatzId.tsx` (oder Layout)
  - Action:
    - Bei Einsatz-Öffnung prüfen ob User Funkrufname hat
    - Wenn nicht: EinsatzBeitrittDialog anzeigen
    - Wenn ja: Funkrufname in Store laden
  - Notes: Check nur einmal pro Session/Einsatz

### Phase 6: Tests

- [ ] **Task 6.1:** Unit Tests - AddEintragCommand
  - File: `packages/backend/src/application/etb/commands/add-eintrag/__tests__/add-eintrag.command.spec.ts`
  - Action: Tests für `absender` und `empfaenger` Parameter hinzufügen

- [ ] **Task 6.2:** Unit Tests - JoinEinsatzCommand
  - File: `packages/backend/src/application/einsatz/commands/join-einsatz/__tests__/join-einsatz.command.spec.ts` (neu)
  - Action: Tests für Validierung (funkrufname required, max length, etc.)

- [ ] **Task 6.3:** Unit Tests - JoinEinsatzHandler
  - File: `packages/backend/src/application/einsatz/commands/join-einsatz/__tests__/join-einsatz.handler.spec.ts` (neu)
  - Action: Tests für Insert, Update, Error Cases

---

## Acceptance Criteria

### Funkrufname pro Einsatz

- [ ] **AC 1:** Given ein User öffnet einen Einsatz zum ersten Mal, when der Einsatz geladen wird, then wird ein Dialog angezeigt zur Funkrufname-Auswahl

- [ ] **AC 2:** Given der Funkrufname-Dialog ist offen, when der User einen Funkrufnamen aus der Combobox wählt, then werden Vorschläge aus EinsatzFahrzeugen und EinsatzPersonen angezeigt

- [ ] **AC 3:** Given der Funkrufname-Dialog ist offen, when der User einen Freitext eingibt (z.B. "LST"), then wird dieser als gültiger Funkrufname akzeptiert

- [ ] **AC 4:** Given der User hat einen Funkrufnamen gewählt, when er "Beitreten" klickt, then wird der Funkrufname in der Datenbank gespeichert und der Dialog geschlossen

- [ ] **AC 5:** Given ein User hat bereits einen Funkrufnamen für diesen Einsatz, when er den Einsatz erneut öffnet, then wird der Dialog NICHT angezeigt und der Funkrufname aus der DB geladen

### ETB Absender/Empfänger

- [ ] **AC 6:** Given ein User erstellt einen neuen ETB-Eintrag, when das Formular angezeigt wird, then ist das Absender-Feld mit seinem Funkrufnamen vorausgefüllt

- [ ] **AC 7:** Given das Absender-Feld ist vorausgefüllt, when der User den Absender ändern möchte, then kann er einen anderen Wert aus der Combobox wählen oder Freitext eingeben

- [ ] **AC 8:** Given der User gibt Absender und Empfänger ein, when er den Eintrag speichert, then werden beide Werte im ETB-Eintrag gespeichert

- [ ] **AC 9:** Given ein ETB-Eintrag wurde gespeichert, when der Eintrag in der Liste angezeigt wird, then sind Absender und Empfänger sichtbar

### Edge Cases

- [ ] **AC 10:** Given ein User hat keinen Funkrufnamen gewählt, when er einen ETB-Eintrag erstellt, then ist das Absender-Feld leer (aber editierbar)

- [ ] **AC 11:** Given der User gibt nur einen Absender aber keinen Empfänger ein, when er speichert, then wird der Eintrag ohne Empfänger gespeichert (Empfänger ist optional)

---

## Additional Context

### Dependencies

**Backend:**
- Prisma Schema Migration
- API Client muss nach Backend-Änderungen neu generiert werden

**Frontend:**
- Generierter API Client aus `@bluelight-hub/shared/client`
- Bestehende Hooks: `useEinsatzFahrzeuge`, `useEinsatzPersonen`
- Bestehende Komponente: `Combobox` mit `allowCustomValue`

**Reihenfolge:**
1. Backend Schema + Migration
2. Backend DTOs + Commands
3. Backend Controller
4. `pnpm run generate-api`
5. Frontend Hooks + Store
6. Frontend Komponenten
7. Tests

### Testing Strategy

**Unit Tests (Backend):**
- AddEintragCommand: Validierung von absender/empfaenger
- JoinEinsatzCommand: Validierung von funkrufname
- JoinEinsatzHandler: Insert/Update Logik, Edge Cases

**Integration Tests (optional):**
- POST /einsatz/:id/teilnehmer/join - Happy Path
- POST /etb/:id/eintrag mit absender/empfaenger

**Manuelle Tests:**
1. Einsatz öffnen → Dialog erscheint
2. Funkrufname wählen → Dialog schließt
3. ETB-Eintrag erstellen → Absender vorausgefüllt
4. Absender ändern → Speichern funktioniert
5. Eintrag in Liste → Absender/Empfänger sichtbar

### Notes

**Risiken:**
- Breaking Change: `funkrufname` → `absender` in EintragDto kann bestehende Clients brechen
  - Mitigation: API-Versionierung oder Deprecation-Warnung

**Bekannte Limitationen:**
- Keine Validierung ob Funkrufname "erlaubt" ist (Out of Scope)
- Keine Historie von Funkrufname-Änderungen (nur aktueller Wert)

**Zukunft (Out of Scope):**
- Funkrufname-Validierung gegen Stammdaten
- Admin-UI zur Funkrufname-Verwaltung
- Mehrere Funkrufnamen pro User pro Einsatz (z.B. wechselnde Fahrzeuge)
