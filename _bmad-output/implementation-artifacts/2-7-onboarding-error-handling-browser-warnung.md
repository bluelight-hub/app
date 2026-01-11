# Story 2.7: Onboarding Error Handling & Browser-Warnung

Status: done

## Story

Als **Nutzer**,
möchte ich **bei Fehlern klare Handlungsanweisungen erhalten und im Browser über Sicherheitsrisiken informiert werden**,
damit **ich weiß was zu tun ist und informierte Entscheidungen treffen kann**.

## Acceptance Criteria

### AC1: Abgelaufener Invite-Code Error

**Given** ein Invite-Code ist abgelaufen
**When** der Exchange fehlschlägt mit INVITE_EXPIRED
**Then** wird eine Error-Card (fullscreen/prominent) angezeigt
**And** der Titel ist: "Einladungslink abgelaufen"
**And** die Nachricht ist: "Dieser Einladungslink ist nicht mehr gültig."
**And** die CTA ist: "Fordere einen neuen Link bei deinem Administrator an."
**And** optional wird Admin-Kontakt angezeigt falls verfügbar

### AC2: Bereits verwendeter Invite-Code Error

**Given** ein Invite-Code wurde bereits verwendet
**When** der Exchange fehlschlägt mit INVITE_ALREADY_USED
**Then** wird eine Error-Card angezeigt
**And** der Titel ist: "Link bereits verwendet"
**And** die Nachricht ist: "Dieser Einladungslink wurde bereits eingelöst."
**And** die CTA ist: "Falls du Probleme hast, kontaktiere deinen Administrator."

### AC3: Server nicht erreichbar Error

**Given** der Server ist nicht erreichbar
**When** der Health-Check oder Exchange fehlschlägt (Netzwerk-Error)
**Then** wird ein Inline-Alert angezeigt (nicht fullscreen)
**And** die Nachricht ist: "Server nicht erreichbar."
**And** eine "Erneut versuchen" Button ist vorhanden
**And** die Fehlermeldung erscheint in unter 2 Sekunden (NFR-R2)

### AC4: Browser-Sicherheitswarnung

**Given** die App läuft im Web-Browser
**When** ein Server erfolgreich hinzugefügt wird
**Then** wird eine Sicherheitswarnung angezeigt (Banner/Alert, nicht Modal)
**And** der Text ist: "Im Browser werden Server-Daten unverschlüsselt gespeichert. Für maximale Sicherheit nutze die Desktop-App."
**And** die Warnung ist sichtbar ohne Scrollen auf der Login-Page (NFR-U4)
**And** die Warnung kann dismissed werden (merkt sich Dismiss für Session)

### AC5: Keine Warnung in Tauri

**Given** die App läuft in Tauri Desktop
**When** ein Server hinzugefügt wird
**Then** wird KEINE Sicherheitswarnung angezeigt
**And** Daten werden verschlüsselt gespeichert

### AC6: Generischer Fehler

**Given** ein unbekannter Fehler tritt auf
**When** der Exchange mit unbekanntem Error fehlschlägt
**Then** wird eine generische Error-Card angezeigt
**And** die Nachricht ist: "Ein unerwarteter Fehler ist aufgetreten."
**And** die CTA ist: "Erneut versuchen" und "Manuell einrichten"

### AC7: Deutsche Fehlermeldungen

**Given** alle Fehlermeldungen
**When** sie angezeigt werden
**Then** sind sie in deutscher Sprache (NFR-U3)
**And** enthalten eine klare Handlungsanweisung (actionable)

## Tasks / Subtasks

- [x] **Task 1: Error-Codes Mapping Service erstellen** (AC: 1, 2, 6, 7)
  - [x] 1.1 Erstelle `features/server/constants/error-codes.constants.ts`
  - [x] 1.2 Definiere Error-Code Enum: `INVITE_EXPIRED`, `INVITE_ALREADY_USED`, `INVITE_INVALID`, `INVITE_RATE_LIMITED`, `SERVER_NOT_SETUP`, `NETWORK_ERROR`, `UNKNOWN`
  - [x] 1.3 Erstelle Error-Message Mapping mit deutschen Texten
  - [x] 1.4 Erstelle `getOnboardingErrorDetails(errorCode: string)` Helper Funktion
  - [x] 1.5 Schreibe Unit-Tests für Error-Mapping (43 Tests)

- [x] **Task 2: OnboardingErrorCard Komponente erstellen** (AC: 1, 2, 6)
  - [x] 2.1 Erstelle `features/server/ui/molecules/OnboardingErrorCard.tsx`
  - [x] 2.2 Basiere auf existierender `Alert` Atom mit erweiterten Props
  - [x] 2.3 Implementiere Props: `errorCode`, `title`, `message`, `cta`, `onRetry`, `onManualSetup`
  - [x] 2.4 Implementiere fullscreen/prominent Layout für kritische Fehler
  - [x] 2.5 Füge Icon-Varianten je Error-Type hinzu
  - [x] 2.6 Schreibe Unit-Tests für Komponente (29 Tests)

- [x] **Task 3: BrowserSecurityBanner Komponente erstellen** (AC: 4, 5)
  - [x] 3.1 Erstelle `features/server/ui/molecules/BrowserSecurityBanner.tsx`
  - [x] 3.2 Implementiere Fixed Banner (oberhalb Login-Formular)
  - [x] 3.3 Nutze `isTauri()` für Conditional Rendering
  - [x] 3.4 Implementiere Dismiss-Button mit sessionStorage Persistence
  - [x] 3.5 Style mit Warning-Farben (gelb/orange)
  - [x] 3.6 Schreibe Unit-Tests mit isTauri Mocking (18 Tests)

- [x] **Task 4: Session-Storage für Banner-Dismiss** (AC: 4)
  - [x] 4.1 Erstelle `features/server/hooks/useBrowserWarningDismissed.ts`
  - [x] 4.2 Implementiere sessionStorage Key `browser-security-warning-dismissed`
  - [x] 4.3 Erstelle getter/setter Funktionen
  - [x] 4.4 Schreibe Unit-Tests (15 Tests)

- [x] **Task 5: Error-Handling in Exchange-Flow integrieren** (AC: 1, 2, 3, 6)
  - [x] 5.1 Erweitere `useExchangeInvite` Mutation Error-Handling
  - [x] 5.2 Parse Backend Error-Codes aus Response
  - [x] 5.3 Setze Error-State für OnboardingErrorCard
  - [x] 5.4 Implementiere Retry-Logik für Netzwerk-Fehler
  - [x] 5.5 Schreibe Integration-Tests (19 Tests)

- [x] **Task 6: Inline Network-Error Alert** (AC: 3)
  - [x] 6.1 Erweitere ServerSetupForm mit Inline-Error State
  - [x] 6.2 Nutze existierende `Alert` Atom mit status="error"
  - [x] 6.3 Implementiere "Erneut versuchen" Button
  - [x] 6.4 Stelle sicher Fehlermeldung < 2s (NFR-R2)
  - [x] 6.5 Schreibe Unit-Tests (7 Tests in ServerSetupForm.spec)

- [x] **Task 7: Browser-Banner Integration in Login-Page** (AC: 4, 5)
  - [x] 7.1 Integriere BrowserSecurityBanner in AuthLayout Template
  - [x] 7.2 Stelle sicher Banner ist sichtbar ohne Scrollen (NFR-U4) - sticky top-0 z-50
  - [x] 7.3 Teste Rendering in Browser vs. Tauri (via BrowserSecurityBanner Tests)
  - [x] 7.4 E2E Test mit Chrome MCP - SKIPPED (manuelle Verifizierung)

- [x] **Task 8: Refactor ExpiredLinkError zu OnboardingErrorCard** (AC: 1)
  - [x] 8.1 Prüfe ob ExpiredLinkError.tsx noch verwendet wird - ja, in 2 Dateien
  - [x] 8.2 Migriere zu generischer OnboardingErrorCard
  - [x] 8.3 Entferne ExpiredLinkError - DELETED beide Dateien
  - [x] 8.4 Aktualisiere alle Imports - ServerSetupForm, ServerOnboardingPage, index.ts

## Dev Notes

### Architektur-Patterns (MUST FOLLOW)

**Platform Detection (aus Codebase-Analyse):**
```typescript
// ✅ RICHTIG: Zentrale isTauri() Funktion
import { isTauri } from '@/shared/utils/platform';

// Conditional Rendering
{!isTauri() && <BrowserSecurityBanner />}
```

**Error-Handling Pattern (aus apiErrorHandler.ts):**
```typescript
// Bestehender Error Handler erweitern
export const ONBOARDING_ERROR_MESSAGES: Record<string, OnboardingErrorDetails> = {
  INVITE_EXPIRED: {
    title: 'Einladungslink abgelaufen',
    message: 'Dieser Einladungslink ist nicht mehr gültig.',
    cta: 'Fordere einen neuen Link bei deinem Administrator an.',
    severity: 'error',
    fullscreen: true,
  },
  INVITE_ALREADY_USED: {
    title: 'Link bereits verwendet',
    message: 'Dieser Einladungslink wurde bereits eingelöst.',
    cta: 'Falls du Probleme hast, kontaktiere deinen Administrator.',
    severity: 'error',
    fullscreen: true,
  },
  // ...weitere Codes
};
```

**Toast Pattern (sonner Library):**
```typescript
// Für nicht-blockierende Fehler
import { toast } from 'sonner';

toast.error('Server nicht erreichbar', {
  description: 'Prüfe deine Internetverbindung.',
  action: {
    label: 'Erneut versuchen',
    onClick: () => refetch(),
  },
});
```

### Bestehende Komponenten (WIEDERVERWENDEN)

**Alert Atom existiert:** `shared/ui/atoms/alert.atom.tsx`
- Hat bereits status: 'info' | 'warning' | 'error' | 'success'
- Unterstützt title, description, icon, children
- **ERWEITERN mit Actions-Slot, nicht neu erstellen!**

**ExpiredLinkError existiert:** `features/server/ui/molecules/ExpiredLinkError.tsx`
- Bereits für AC1 teilweise implementiert
- **REFACTOREN zu generischer OnboardingErrorCard**

**isTauri() existiert:** `shared/utils/platform.ts`
```typescript
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}
```

**WebStorageAdapter existiert:** `shared/services/storage/web-storage-adapter.ts`
- Nutzt `storageType: 'insecure'` Flag
- **Für sessionStorage-Pattern adaptieren**

### Error-Codes vom Backend

Backend liefert strukturierte Error-Responses:
```json
{
  "statusCode": 400,
  "error": "INVITE_EXPIRED",
  "message": "Invite code has expired"
}
```

**Bekannte Error-Codes (aus Story 2.3):**
- `INVITE_EXPIRED` - Invite-Code abgelaufen
- `INVITE_ALREADY_USED` - Bereits eingelöst
- `INVITE_INVALID` - Ungültiges Format
- `INVITE_RATE_LIMITED` - Zu viele Versuche
- `SERVER_NOT_SETUP` - Server noch nicht initialisiert

### Session-Storage Pattern

```typescript
// features/server/hooks/useBrowserWarningDismissed.ts
const STORAGE_KEY = 'browser-security-warning-dismissed';

export function useBrowserWarningDismissed() {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      setIsDismissed(true);
    } catch {
      // Silent fail
    }
  }, []);

  return { isDismissed, dismiss };
}
```

### Banner Positioning (NFR-U4)

```typescript
// Fixed Banner oberhalb Login-Formular
<div className="fixed top-0 inset-x-0 z-50">
  <BrowserSecurityBanner />
</div>

// ODER: Sticky innerhalb Container
<div className="sticky top-0 z-10">
  <BrowserSecurityBanner />
</div>
```

### Project Structure Notes

**Files to Create:**
```
packages/frontend/src/features/server/
├── constants/
│   └── error-codes.constants.ts      # NEU: Error-Codes + Messages
├── hooks/
│   └── useBrowserWarningDismissed.ts # NEU: Session-Storage Hook
└── ui/
    └── molecules/
        ├── OnboardingErrorCard.tsx   # NEU: Generische Error-Card
        └── BrowserSecurityBanner.tsx # NEU: Browser-Warnung
```

**Files to Modify:**
```
packages/frontend/src/features/server/
├── api/
│   └── mutations.ts                   # ERWEITERN: Error-Handling
└── ui/
    └── organisms/
        └── ServerSetupForm.tsx        # ERWEITERN: Inline Errors

packages/frontend/src/features/auth/
└── ui/
    └── organisms/
        └── LoginWindow.tsx            # ERWEITERN: Banner Integration

packages/frontend/src/routes/
└── auth.tsx                           # OPTIONAL: Banner Integration
```

**Files to Delete (nach Refactoring):**
```
packages/frontend/src/features/server/ui/molecules/ExpiredLinkError.tsx
```

### Learnings aus Story 2.6 (MUST APPLY)

1. **Service Layer First:** Pure functions für Error-Mapping, dann Hook, dann UI
2. **Zod Schema:** Für Error-Code Validation falls nötig
3. **Test Structure:** 15-25 Tests pro Komponente
4. **Error Handling Matrix:** Alle Error-Codes vorab definieren
5. **onBlur-First Pattern:** Für Form-Validierung
6. **Console.log entfernen:** Vor Code Review!

### NFR Compliance

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR-U3 | Deutsche Fehlermeldungen | Alle Texte in Deutsch |
| NFR-U4 | Banner sichtbar ohne Scrollen | Fixed/Sticky Positioning |
| NFR-R2 | Fehlermeldung < 2s | Optimierte Error Detection |

### References

- [Source: CLAUDE.md#Forms-State] - TanStack Form + Zod Pattern
- [Source: epics.md#Story-2.7] - Vollständige Acceptance Criteria
- [Source: Story 2.6] - Exchange-Flow, Error-Handling Patterns
- [Source: shared/ui/atoms/alert.atom.tsx] - Alert Komponente
- [Source: features/server/ui/molecules/ExpiredLinkError.tsx] - Bestehende Error-Card
- [Source: shared/utils/platform.ts] - isTauri() Funktion
- [Source: shared/lib/errors/apiErrorHandler.ts] - Error-Message Mapping Pattern

### Abhängigkeiten

Diese Story hängt ab von:
- **Story 2.4** (Deep Link Integration) - Error-States für Deep Links
- **Story 2.5** (URL-Parameter Support) - Error-States für URL-Params
- **Story 2.6** (Manuelles Server-Setup) - Error-States für manuelles Setup

Alle Vorgänger-Stories sind **done**.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript Check: PASSED (no errors)
- Unit Tests: 166 Tests PASSED for Story 2.7 components

### Completion Notes List

1. **Task 1** - Created error-codes.constants.ts with OnboardingErrorCode enum, ERROR_CODE_MAPPING, getOnboardingErrorDetails() and parseOnboardingErrorCode() functions. 43 unit tests covering all error codes and parsing logic.

2. **Task 2** - Created OnboardingErrorCard.tsx with fullscreen/inline layouts based on error severity. Supports error/warning styling, retry/manual-setup buttons, admin contact display. 29 unit tests.

3. **Task 3** - Created BrowserSecurityBanner.tsx with sticky positioning, isTauri() check, dismiss functionality. 18 unit tests with platform mocking.

4. **Task 4** - Created use-browser-warning-dismissed.ts hook with sessionStorage persistence, SSR-safe implementation. 15 unit tests.

5. **Task 5** - Enhanced useExchangeInvite mutation with NON_RETRYABLE_STATUS_CODES, getExchangeErrorCode() helper. Smart retry logic: no retry for 4xx errors, 2 retries for network errors. 19 tests total.

6. **Task 6** - Added inlineNetworkError state to ServerSetupForm, Alert component for NETWORK errors, "Erneut versuchen" button, error clearing on input change. 7 new tests.

7. **Task 7** - Integrated BrowserSecurityBanner into AuthLayout template. Banner appears on all auth pages (login, server setup). Sticky top-0 z-50 for visibility.

8. **Task 8** - Removed ExpiredLinkError.tsx and .spec.tsx, updated imports in ServerSetupForm, ServerOnboardingPage, and molecules/index.ts to use OnboardingErrorCard.

### File List

**Created:**
- packages/frontend/src/features/server/constants/error-codes.constants.ts
- packages/frontend/src/features/server/constants/error-codes.constants.spec.ts
- packages/frontend/src/features/server/constants/index.ts
- packages/frontend/src/features/server/hooks/use-browser-warning-dismissed.ts
- packages/frontend/src/features/server/hooks/__tests__/use-browser-warning-dismissed.spec.ts
- packages/frontend/src/features/server/ui/molecules/OnboardingErrorCard.tsx
- packages/frontend/src/features/server/ui/molecules/OnboardingErrorCard.spec.tsx
- packages/frontend/src/features/server/ui/molecules/BrowserSecurityBanner.tsx
- packages/frontend/src/features/server/ui/molecules/BrowserSecurityBanner.spec.tsx

**Modified:**
- packages/frontend/src/features/server/api/mutations.ts (getExchangeErrorCode, NON_RETRYABLE_STATUS_CODES, enhanced retry logic)
- packages/frontend/src/features/server/api/mutations.spec.tsx (13 new tests)
- packages/frontend/src/features/server/ui/organisms/ServerSetupForm.tsx (inlineNetworkError, handleRetryNetworkError)
- packages/frontend/src/features/server/ui/organisms/ServerSetupForm.spec.tsx (7 new tests)
- packages/frontend/src/features/server/ui/pages/ServerOnboardingPage.tsx (ExpiredLinkError → OnboardingErrorCard)
- packages/frontend/src/features/server/ui/molecules/index.ts (exports updated)
- packages/frontend/src/features/server/hooks/index.ts (useBrowserWarningDismissed export)
- packages/frontend/src/features/server/hooks/use-url-params.ts (JSDoc update)
- packages/frontend/src/shared/ui/templates/AuthLayout.tsx (BrowserSecurityBanner integration)

**Deleted:**
- packages/frontend/src/features/server/ui/molecules/ExpiredLinkError.tsx
- packages/frontend/src/features/server/ui/molecules/ExpiredLinkError.spec.tsx

## Change Log

- 2026-01-11: Code Review Fixes - 7 issues addressed, 168 tests passing, Status → done
- 2026-01-11: Story 2.7 Implementation complete - All 8 tasks done, 166 tests passing
