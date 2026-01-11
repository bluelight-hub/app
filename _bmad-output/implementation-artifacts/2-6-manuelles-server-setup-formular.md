# Story 2.6: Manuelles Server-Setup-Formular

Status: done

## Story

Als **Einsatzkraft**,
möchte ich **einen Server manuell per Formular hinzufügen können**,
damit **ich auch ohne Deep Link onboarden kann**.

## Acceptance Criteria

### AC1: Automatische Anzeige bei leerem Server-State

**Given** kein Server ist konfiguriert
**When** die App geöffnet wird
**Then** wird automatisch das ServerSetupForm angezeigt
**And** der Nutzer kann nicht zum Login navigieren ohne Server hinzuzufügen

### AC2: Formular-Felder

**Given** das ServerSetupForm ist sichtbar
**When** der Nutzer die Felder ausfüllt
**Then** sind folgende Felder vorhanden:
- Server-URL (required)
- Invite-Code (required)
- Server-Name (optional, Auto-Fill aus Health-Response)
**And** die URL wird auf gültiges Format validiert (https:// oder http:// für INSECURE_MODE)
**And** der Invite-Code wird auf Format validiert (8 Zeichen, A-Z0-9)

### AC3: Connection-Test vor Exchange

**Given** gültige Daten wurden eingegeben
**When** der Nutzer "Verbinden" klickt
**Then** wird erst ein Health-Check ausgeführt (FR39)
**And** bei erfolgreichem Health-Check wird der Exchange gestartet
**And** ein Spinner zeigt den Fortschritt

### AC4: Health-Check Fehler

**Given** der Health-Check schlägt fehl
**When** der Server nicht erreichbar ist
**Then** wird ein Inline-Error angezeigt: "Server nicht erreichbar. Prüfe die URL."
**And** eine "Erneut versuchen" Option ist verfügbar
**And** der Timeout beträgt 5 Sekunden (NFR-P4)

### AC5: Erfolgreicher Setup

**Given** der Exchange erfolgreich ist
**When** der Server hinzugefügt wurde
**Then** wird ein Toast "Server '[Name]' hinzugefügt" angezeigt
**And** der Nutzer wird zum Login-Screen weitergeleitet
**And** der gesamte Prozess dauert weniger als 2 Minuten (NFR-U1)

### AC6: URL-Validierung

**Given** die URL-Validierung
**When** eine ungültige URL eingegeben wird
**Then** erscheint ein Inline-Error unter dem Feld
**And** die Validierung erfolgt onBlur und onChange nach erstem Blur

## Tasks / Subtasks

- [x] **Task 1: Erweitere ServerSetupForm mit Server-Name Feld** (AC: 2)
  - [x] 1.1 Füge optionales "Server-Name" Feld zum bestehenden Form hinzu
  - [x] 1.2 Implementiere Auto-Fill aus Health-Response (`serverInfo.name`)
  - [x] 1.3 Aktualisiere Zod-Schema für optionalen Server-Name
  - [x] 1.4 Schreibe Unit-Tests für neues Feld

- [x] **Task 2: Implementiere Health-Check vor Exchange** (AC: 3, 4)
  - [x] 2.1 Erstelle `useHealthCheck` Hook in `features/server/api/`
  - [x] 2.2 Integriere Health-Check in Form-Submit-Flow
  - [x] 2.3 Implementiere 5-Sekunden Timeout
  - [x] 2.4 Erstelle Loading-State mit Spinner
  - [x] 2.5 Schreibe Unit-Tests für Health-Check Flow

- [x] **Task 3: Implementiere Error-Handling für Health-Check** (AC: 4)
  - [x] 3.1 Erstelle Inline-Error-Komponente für Server-nicht-erreichbar
  - [x] 3.2 Implementiere "Erneut versuchen" Button
  - [x] 3.3 Unterscheide zwischen Timeout und anderen Fehlern
  - [x] 3.4 Schreibe Unit-Tests für Fehlerszenarien

- [x] **Task 4: Implementiere Redirect-Guard für leeren Server-State** (AC: 1)
  - [x] 4.1 Erstelle `useRequireServer` Hook oder Guard
  - [x] 4.2 Integriere Guard in Root-Route oder Auth-Routes
  - [x] 4.3 Redirect zu ServerOnboardingPage wenn keine Server konfiguriert
  - [x] 4.4 Schreibe Unit-Tests für Guard-Logik

- [x] **Task 5: Verbessere URL-Validierung mit INSECURE_MODE Support** (AC: 6)
  - [x] 5.1 Erweitere URL-Schema um http:// Unterstützung (nur wenn INSECURE_MODE)
  - [x] 5.2 Implementiere onBlur-First Validierung Pattern
  - [x] 5.3 Aktualisiere Fehlermeldungen (Deutsch)
  - [x] 5.4 Schreibe Unit-Tests für Validierung

- [x] **Task 6: Integriere Server-Name in addServer Flow** (AC: 5)
  - [x] 6.1 Erweitere `useExchangeInvite` Mutation um optionalen serverName Parameter
  - [x] 6.2 Nutze Server-Name aus Form oder fallback auf serverInfo.name
  - [x] 6.3 Aktualisiere Toast-Nachricht mit dynamischem Server-Namen
  - [x] 6.4 Schreibe Integration-Tests

- [x] **Task 7: E2E Testing mit Chrome MCP** (AC: 1-6)
  - [x] 7.1 Teste manuellen Server-Setup Flow End-to-End
  - [x] 7.2 Teste Health-Check Timeout Szenario
  - [x] 7.3 Teste Redirect bei leerem Server-State

## Dev Notes

### Architektur-Patterns (MUST FOLLOW)

**Form-Pattern (aus CLAUDE.md):**
```typescript
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';

const form = useForm({
  defaultValues: { serverUrl: '', inviteCode: '', serverName: '' },
  validatorAdapter: zodValidator(),
  validators: {
    onChange: serverSetupSchema,
  },
});
```

**API-Pattern (NIEMALS manuell fetch!):**
```typescript
// ✅ RICHTIG: Generierter Client
import { api } from '@bluelight-hub/shared/client';
const healthCheck = await api.health.getHealth({ baseUrl: serverUrl });

// ❌ FALSCH: Manueller fetch
const response = await fetch(`${serverUrl}/health`);
```

### Bestehende Komponenten (WIEDERVERWENDEN)

**ServerSetupForm existiert bereits:** `features/server/ui/organisms/ServerSetupForm.tsx`
- Hat bereits Server-URL und Invite-Code Felder
- Nutzt TanStack Form mit zodValidator
- Prefill via Props möglich
- **ERWEITERN, nicht neu erstellen!**

**Existierende Hooks (aus Story 2.5):**
- `useExchangeInvite()` - Exchange-Mutation → wiederverwenden
- `useUrlParams()` - URL-Parameter-Handling → referenzieren für Patterns

**Existierende Schemas:**
- `serverUrlSchema` in `features/server/schemas/url-params.schema.ts`
- `inviteCodeSchema` - 8-char A-Z0-9 Format

### API Health-Check Endpoint

**Endpoint:** `GET /health`
**Response (ohne Token):**
```json
{
  "status": "ok",
  "setupComplete": true,
  "version": "1.0.0-alpha.37",
  "serverName": "DRK Kreisverband Musterstadt"
}
```

**Generierter Client Aufruf:**
```typescript
// Temporärer Client für Health-Check auf fremdem Server
import { createApi } from '@bluelight-hub/shared/client';

const tempApi = createApi({ baseUrl: serverUrl });
const health = await tempApi.health.getHealth();
```

### Validation Schema Erweiterung

```typescript
// features/server/schemas/server-setup.schema.ts
import { z } from 'zod';

export const serverSetupSchema = z.object({
  serverUrl: z.string()
    .min(1, 'Server-URL ist erforderlich')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          // http:// nur wenn INSECURE_MODE (env variable check)
          return parsed.protocol === 'https:' ||
                 (parsed.protocol === 'http:' && import.meta.env.VITE_INSECURE_MODE === 'true');
        } catch {
          return false;
        }
      },
      { message: 'Ungültige Server-URL. HTTPS erforderlich.' }
    ),
  inviteCode: z.string()
    .length(8, 'Invite-Code muss 8 Zeichen haben')
    .regex(/^[A-Z0-9]+$/, 'Invite-Code enthält ungültige Zeichen'),
  serverName: z.string().optional(),
});
```

### Guard Implementation Pattern

```typescript
// features/server/hooks/use-require-server.ts
export function useRequireServer() {
  const { servers, isHydrated } = useServerStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isHydrated && servers.length === 0) {
      navigate({ to: '/server/setup' });
    }
  }, [isHydrated, servers.length, navigate]);

  return { hasServer: servers.length > 0, isLoading: !isHydrated };
}
```

### Health-Check Hook Pattern

```typescript
// features/server/api/use-health-check.ts
import { useMutation } from '@tanstack/react-query';
import { createApi } from '@bluelight-hub/shared/client';

export function useHealthCheck() {
  return useMutation({
    mutationFn: async (serverUrl: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      try {
        const tempApi = createApi({ baseUrl: serverUrl });
        const response = await tempApi.health.getHealth({ signal: controller.signal });
        clearTimeout(timeout);
        return response.data;
      } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          throw new Error('TIMEOUT');
        }
        throw error;
      }
    },
  });
}
```

### Error Messages (Deutsch)

| Error Code | Message | Action |
|------------|---------|--------|
| TIMEOUT | "Server nicht erreichbar. Prüfe die URL." | "Erneut versuchen" |
| NETWORK_ERROR | "Netzwerkfehler. Prüfe deine Verbindung." | "Erneut versuchen" |
| INVITE_INVALID | "Ungültiger Invite-Code." | "Prüfe den Code" |
| INVITE_EXPIRED | "Invite-Code abgelaufen." | "Neuen Link anfordern" |
| INVITE_ALREADY_USED | "Invite-Code bereits verwendet." | "Admin kontaktieren" |

### Project Structure Notes

**Files to Create/Modify:**
```
packages/frontend/src/features/server/
├── api/
│   └── use-health-check.ts          # NEU: Health-Check Hook
├── hooks/
│   └── use-require-server.ts        # NEU: Server Guard Hook
├── schemas/
│   └── server-setup.schema.ts       # NEU oder ERWEITERN
└── ui/
    └── organisms/
        └── ServerSetupForm.tsx      # ERWEITERN: Server-Name Feld, Health-Check
```

**Route Integration:**
- `/server/setup` - ServerOnboardingPage (existiert)
- Root-Route Guard - Redirect wenn keine Server

### References

- [Source: CLAUDE.md#Forms-State] - TanStack Form + Zod Pattern
- [Source: epics.md#Story-2.6] - Vollständige Acceptance Criteria
- [Source: Story 2.5] - URL-Params Schema, Exchange-Flow Pattern
- [Source: architecture.md#Frontend] - Component Structure
- [Source: Story 2.3] - Exchange Endpoint API Contract

### Learnings aus Story 2.5 (MUST APPLY)

1. **Service Layer First:** Pure functions für Business Logic, dann Hook, dann UI
2. **Zod `.refine()`:** Für custom Validators mit klaren Fehlermeldungen
3. **Fire-and-forget Pattern:** In useEffect für async Operations
4. **Test Structure:** 24-30 Tests pro Layer (schema, service, hook, UI)
5. **Error Handling Matrix:** Alle Error-Codes vorab definieren
6. **URL Cleanup:** Nach erfolgreichem Exchange Parameter entfernen

### NFR Compliance

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR-U1 | Setup < 2min | Optimierter Flow, minimale Klicks |
| NFR-P4 | Health-Check Timeout 5s | AbortController mit setTimeout |
| NFR-U3 | Deutsche Fehlermeldungen | Alle Errors in Deutsch |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- E2E Tests mit Chrome MCP durchgeführt (2026-01-11)
- Unit Tests: 20+ Tests für useRequireServer Hook
- URL-Validierung Tests in url-params.schema.spec.ts

### Completion Notes List

- **Task 4 (useRequireServer):** Hook bereits vollständig implementiert in `use-require-server.ts`. Integration in `LoginWindow.tsx` vorhanden (Zeile 38). 20+ Unit Tests decken alle ACs ab.
- **Task 5 (URL-Validierung):** `serverUrlSchema` mit INSECURE_MODE Support via `superRefine()`. `isInsecureModeEnabled()` Funktion. onBlur-First Validierung Pattern im Form.
- **Task 6 (Server-Name):** `ExchangeInviteInput` hat `serverName` Parameter. Form übergibt `serverName` an Mutation (Zeile 191). Toast zeigt dynamischen Namen.
- **Task 7 (E2E):** Chrome MCP Tests verifiziert: AC1 (Redirect), AC2 (Felder + Auto-Fill), AC3 (Health-Check), AC6 (URL-Validierung)

### File List

**Bereits implementiert (Tasks 1-3, vorherige Session):**
- `packages/frontend/src/features/server/api/use-health-check.ts`
- `packages/frontend/src/features/server/ui/organisms/ServerSetupForm.tsx`

**Task 4 - useRequireServer:**
- `packages/frontend/src/features/server/hooks/use-require-server.ts` (existierend)
- `packages/frontend/src/features/server/hooks/__tests__/use-require-server.spec.tsx` (20+ Tests)
- `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx` (Integration Zeile 38)

**Task 5 - URL-Validierung:**
- `packages/frontend/src/features/server/schemas/url-params.schema.ts` (serverUrlSchema mit INSECURE_MODE)
- `packages/frontend/src/features/server/schemas/__tests__/url-params.schema.spec.ts`

**Task 6 - Server-Name Integration:**
- `packages/frontend/src/features/server/api/mutations.ts` (ExchangeInviteInput mit serverName)
- `packages/frontend/src/features/server/ui/organisms/ServerSetupForm.tsx` (serverName an Mutation übergeben)

**Code Review Fixes (2026-01-11):**
- `packages/frontend/src/features/server/hooks/use-require-server.ts` (C1: Redirect-Loop Fix, M2: Console.log entfernt, M6: Setup-Flag Check)
- `packages/frontend/src/features/server/api/use-health-check.ts` (C2/C3: Interface erweitert, H1: HTTP Error Handling, H2: finally Block)
- `packages/frontend/src/features/server/api/__tests__/use-health-check.spec.tsx` (M1: Tests erweitert)
- `packages/frontend/src/features/server/schemas/url-params.schema.ts` (H3: Password Regex Fix)
- `packages/frontend/src/features/server/schemas/__tests__/url-params.schema.spec.ts` (H4: INSECURE_MODE Tests)
- `packages/frontend/src/features/server/services/url-params.service.ts` (M5: Invite Code Validation)
- `packages/frontend/src/features/server/ui/pages/ServerOnboardingPage.tsx` (M7: Setup-Flag Reset)
- `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx` (H6: Toast Race Fix, H7: Loading State)
- `packages/frontend/src/features/system/utils/status-mapping.ts` (dotColor: gray → blue)
