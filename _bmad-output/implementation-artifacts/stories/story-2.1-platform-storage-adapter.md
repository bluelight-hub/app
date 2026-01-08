# Story 2.1: Platform Storage Adapter

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Entwickler**,
I want **einen plattform-agnostischen Storage-Adapter für Server-Konfigurationen**,
so that **die Anwendung auf Desktop (Tauri) und Web (Browser) dieselbe Logik nutzen kann**.

## Business Context

**Epic:** 2 - Client-Onboarding & Server-Verbindung
**Epic Objective:** Einsatzkräfte können über Deep Links, URL-Parameter oder manuelles Formular einem Server beitreten und nahtlos Access-Tokens erhalten.

**Story Value:**
- **Foundation Story** für Epic 2 - alle nachfolgenden Stories (2.2-2.7) bauen darauf auf
- Ermöglicht Multi-Server-Configuration mit plattformübergreifender Persistierung
- Garantiert Offline-Verfügbarkeit der Server-Liste (NFR-R1)
- Sichert Token-Persistenz über App-Updates hinweg (NFR-R4)

## Acceptance Criteria

### AC1: Tauri Desktop Storage ✅

```gherkin
Given die Anwendung läuft auf einer Tauri Desktop-Plattform
When ein Server-Config gespeichert wird
Then wird die Konfiguration über @tauri-apps/plugin-store verschlüsselt gespeichert
And der Speichervorgang ist für den Nutzer nicht sichtbar (keine UI-Interaktion)
```

**Technische Details:**
- Tauri Rust Backend Command: `storage_get`, `storage_set`, `storage_remove`, `storage_clear`
- Adapter-Klasse: `TauriStorageAdapter` implementiert `IStoragePort`
- Verschlüsselung: Tauri Store Plugin v2.x nutzt OpenSSL/Security Framework
- Performance: < 200ms Ladezeit (NFR-P5)

### AC2: Browser Storage ✅

```gherkin
Given die Anwendung läuft in einem Web-Browser
When ein Server-Config gespeichert wird
Then wird die Konfiguration im localStorage gespeichert
And ein Flag `storageType: 'insecure'` wird mitgespeichert
```

**Technische Details:**
- Adapter-Klasse: `WebStorageAdapter` implementiert `IStoragePort`
- Storage: `window.localStorage` (synchron, aber async-wrapped für Interface-Kompatibilität)
- Security-Flag: `storageType: 'insecure'` für User-Awareness (Story 2.7 nutzt dies für Warning)

### AC3: Plattform-Erkennung ✅

```gherkin
Given die Anwendung startet
When der Storage-Adapter initialisiert wird
Then erkennt das System automatisch die Plattform (Tauri vs. Browser)
And wählt den entsprechenden Adapter (TauriStorageAdapter oder BrowserStorageAdapter)
```

**Technische Details:**
- Platform Detection: `isTauri()` prüft auf `window.__TAURI__` Präsenz
- Factory Pattern: `getStorageAdapter()` Singleton liefert korrekten Adapter
- Location: `shared/utils/platform.ts` für Detection, `shared/services/storage/storage-adapter.factory.ts` für Factory

### AC4: Persistenz nach Updates ✅

```gherkin
Given ein gespeicherter Server existiert
When die App nach einem Update oder Neustart geöffnet wird
Then sind alle Server-Konfigurationen inkl. Access-Tokens weiterhin verfügbar
And die Ladezeit beträgt weniger als 200ms (NFR-P5)
```

**Technische Details:**
- Tauri Store persistiert automatisch bei App-Close
- localStorage bleibt bei Browser-Neustart erhalten
- Lazy Loading: Storage nur bei Bedarf geladen, nicht bei App-Start
- Performance-Test: Vitest Benchmark für Ladezeit-Verifikation

### AC5: Offline-Verfügbarkeit ✅

```gherkin
Given der Nutzer ist offline
When die App geöffnet wird
Then ist die Server-Liste aus dem lokalen Storage verfügbar (NFR-R1)
```

**Technische Details:**
- Kein Backend-Call erforderlich - lokaler Storage ist immer verfügbar
- Fallback: Leere Server-Liste wenn Storage leer (Onboarding Flow startet)

## Tasks / Subtasks

### Task 1: Storage Abstraction Layer (AC3) ✅
- [ ] **Subtask 1.1:** Interface `IStoragePort` definieren in `shared/types/storage.ts`
  - [ ] Methods: `getItem(key): Promise<string|null>`, `setItem(key, value): Promise<void>`, `removeItem(key): Promise<void>`, `clear(): Promise<void>`
  - [ ] Type-safe mit TypeScript strict mode
  - [ ] JSDoc Kommentare (Deutsch) für public API
- [ ] **Subtask 1.2:** Platform Detection Utilities in `shared/utils/platform.ts`
  - [ ] `isTauri(): boolean` - prüft `window.__TAURI__` Präsenz
  - [ ] `getPlatform(): 'tauri' | 'web'` - liefert Platform-String
  - [ ] Unit Tests mit Vitest (Mock `window.__TAURI__`)

### Task 2: Tauri Storage Adapter (AC1) ✅
- [ ] **Subtask 2.1:** Rust Storage Commands in `src-tauri/src/storage.rs`
  - [ ] `storage_get(key: String) -> Option<String>` Tauri Command
  - [ ] `storage_set(key: String, value: String)` Tauri Command
  - [ ] `storage_remove(key: String)` Tauri Command
  - [ ] `storage_clear()` Tauri Command
  - [ ] State Management: `StorageState(Mutex<HashMap<String, String>>)`
  - [ ] Command Registration in `main.rs` (`invoke_handler`)
- [ ] **Subtask 2.2:** TypeScript Adapter `TauriStorageAdapter` in `shared/services/storage/tauri-storage-adapter.ts`
  - [ ] `class TauriStorageAdapter implements IStoragePort`
  - [ ] Nutzt `@tauri-apps/api/tauri` `invoke()` für Rust-Calls
  - [ ] Error Handling: Try-Catch mit Console Logging
  - [ ] JSDoc Kommentare für alle public Methods
- [ ] **Subtask 2.3:** Integration Test (manuell via Tauri Desktop App)
  - [ ] Set-Get-Remove Roundtrip Test
  - [ ] App Restart Test (Persistenz-Check)
  - [ ] Clear Storage Test

### Task 3: Web Storage Adapter (AC2) ✅
- [ ] **Subtask 3.1:** Adapter `WebStorageAdapter` in `shared/services/storage/web-storage-adapter.ts`
  - [ ] `class WebStorageAdapter implements IStoragePort`
  - [ ] Nutzt `window.localStorage` (async-wrapped)
  - [ ] Error Handling: Try-Catch mit Console Logging
  - [ ] Security-Flag `storageType: 'insecure'` in gespeicherten Daten
- [ ] **Subtask 3.2:** Unit Tests mit Vitest
  - [ ] Test: `getItem()` / `setItem()` Roundtrip
  - [ ] Test: `removeItem()` entfernt Eintrag
  - [ ] Test: `clear()` löscht alle Einträge
  - [ ] Test: Error Handling bei Storage Quota exceeded

### Task 4: Storage Factory & Singleton (AC3) ✅
- [ ] **Subtask 4.1:** Factory `getStorageAdapter()` in `shared/services/storage/storage-adapter.factory.ts`
  - [ ] Singleton Pattern: Eine Instanz pro Runtime
  - [ ] Platform Detection via `getPlatform()`
  - [ ] Liefert `TauriStorageAdapter` oder `WebStorageAdapter`
  - [ ] `resetStorageAdapter()` für Testing (Singleton zurücksetzen)
- [ ] **Subtask 4.2:** Unit Tests für Factory
  - [ ] Test: Tauri Platform → `TauriStorageAdapter` Instance
  - [ ] Test: Web Platform → `WebStorageAdapter` Instance
  - [ ] Test: Singleton Behavior (gleiche Instanz bei mehrfachen Calls)
  - [ ] Mock `window.__TAURI__` für Platform-Simulation

### Task 5: Documentation & ADR (AC alle) ✅
- [ ] **Subtask 5.1:** ADR erstellen `docs/adr/010-platform-storage-adapter.md`
  - [ ] Context: Multi-Platform Storage Requirement
  - [ ] Decision: Port-Adapter Pattern mit Factory
  - [ ] Consequences: Pros (testbar, erweiterbar) & Cons (Abstraktionsschicht)
  - [ ] Alternatives Considered: Tauri Store Plugin, direktes localStorage
- [ ] **Subtask 5.2:** Arc42 Update `docs/architecture/08-querschnittliche-konzepte.md`
  - [ ] Abschnitt "Storage Abstraction" mit Pattern-Beschreibung
  - [ ] Code-Beispiel für `IStoragePort` Nutzung
  - [ ] Verweis auf ADR 010
- [ ] **Subtask 5.3:** Development Guide Update `docs/development-guide/code-conventions.md`
  - [ ] Sektion "Storage Adapter Pattern"
  - [ ] Beispiel: `getStorageAdapter()` Nutzung
  - [ ] Hinweis: Tauri Command Registration

## Dev Notes

### 🎯 CRITICAL MISSION CONTEXT

**Diese Story ist DIE Grundlage für das gesamte Multi-Server-Feature!**
- ⚠️ **Keine Shortcuts:** Port-Adapter Pattern MUSS sauber implementiert werden
- ⚠️ **Type Safety:** TypeScript strict mode - keine `any` Types
- ⚠️ **Testing:** Unit Tests für jeden Adapter + Factory sind PFLICHT
- ⚠️ **Dokumentation:** ADR + Arc42 Update vor Story-Abschluss

### 🏗️ Architecture Patterns (MUST FOLLOW)

**Port-Adapter Pattern (Hexagonal Architecture):**
```typescript
// Port (Interface) - Was die App braucht
interface IStoragePort {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Adapter (Implementation) - Wie es umgesetzt wird
class TauriStorageAdapter implements IStoragePort { ... }
class WebStorageAdapter implements IStoragePort { ... }

// Factory - Wer entscheidet welcher Adapter
export async function getStorageAdapter(): Promise<IStoragePort> {
  const platform = getPlatform();
  return platform === 'tauri'
    ? new TauriStorageAdapter()
    : new WebStorageAdapter();
}
```

**Singleton Pattern:**
- `getStorageAdapter()` liefert IMMER dieselbe Instanz
- Wichtig für State-Konsistenz und Performance
- `resetStorageAdapter()` nur für Tests!

### 📁 File Structure (MUST CREATE)

```
packages/frontend/src/
├── shared/
│   ├── types/
│   │   └── storage.ts                           # IStoragePort interface
│   ├── services/
│   │   └── storage/
│   │       ├── storage-adapter.factory.ts       # getStorageAdapter() Singleton
│   │       ├── tauri-storage-adapter.ts         # Tauri Implementation
│   │       ├── web-storage-adapter.ts           # Web Implementation
│   │       └── __tests__/
│   │           ├── storage-adapter.factory.test.ts
│   │           ├── tauri-storage-adapter.test.ts
│   │           └── web-storage-adapter.test.ts
│   └── utils/
│       └── platform.ts                          # isTauri(), getPlatform()
│
└── src-tauri/
    └── src/
        ├── storage.rs                            # Rust Storage Commands
        └── main.rs                               # Command Registration
```

### 🔧 Technical Stack (ALREADY IN PROJECT)

**Frontend:**
- ✅ TypeScript (strict mode enabled)
- ✅ Vite (Build Tool)
- ✅ Vitest (Testing Framework)
- ✅ @tauri-apps/api (bereits installiert - `^1.5.0`)
- ✅ Biome (Linter/Formatter - NICHT ESLint!)

**Backend (Tauri Rust):**
- ✅ Tauri v2 mit rustls-tls
- ✅ Serde (Serialization)
- ⚠️ **KEINE zusätzlichen Rust Dependencies nötig!** (In-Memory HashMap reicht)

### 🚫 BREAKING RULES (NIEMALS brechen!)

1. **NIEMALS** andere CSS-Frameworks - nur Tailwind CSS (aber irrelevant für diese Story)
2. **NIEMALS** manuelle API-Helper - nur generierter Client (aber irrelevant für diese Story)
3. **NIEMALS** `--no-verify` bei Git Commits
4. **NIEMALS** ESLint/Prettier - nur Biome
5. **NIEMALS** Redux/Zustand - nur TanStack Store (relevant für Story 2.2)

### 🧪 Testing Requirements

**Unit Tests (Vitest):**
```typescript
// ✅ MUST TEST:
describe('StorageAdapterFactory', () => {
  it('should return TauriStorageAdapter on Tauri platform');
  it('should return WebStorageAdapter on web platform');
  it('should return same instance (singleton)');
});

describe('WebStorageAdapter', () => {
  it('should store and retrieve values');
  it('should remove values');
  it('should clear all values');
  it('should handle storage quota errors gracefully');
});

describe('Platform Detection', () => {
  it('should detect Tauri platform via __TAURI__');
  it('should detect web platform when __TAURI__ absent');
});
```

**Integration Tests (Manual):**
- Tauri App starten → Storage setzen → App neustarten → Storage abrufen
- Web App öffnen → localStorage prüfen via DevTools

### ⚡ Performance Considerations

- **NFR-P5:** Server-Liste laden < 200ms
  - localStorage ist synchron → Performance kein Problem
  - Tauri Invoke hat ~10-50ms Overhead → immer noch weit unter 200ms
  - Bei Bedarf: Lazy Loading (erst bei Nutzung laden, nicht bei App-Start)

- **Optimization:**
  - Singleton Pattern verhindert mehrfache Initialisierung
  - Keine Serialization Overhead (JSON.stringify nur bei Nutzung)

### 🔒 Security Considerations

**Tauri Desktop (AC1):**
- ✅ Tauri Store Plugin nutzt OS-native Encryption (OpenSSL/Security Framework)
- ✅ Storage-Datei liegt in `~/.bluelight-hub/` (User-Scope, OS-protected)
- ✅ Access-Tokens sind verschlüsselt persistiert

**Web Browser (AC2):**
- ⚠️ `localStorage` ist NICHT verschlüsselt (plain text)
- ⚠️ Story 2.7 nutzt `storageType: 'insecure'` Flag für User-Warning
- ⚠️ XSS Vulnerabilities können Storage auslesen (Mitigation: CSP Headers)

**Recommendation:**
- In `WebStorageAdapter.setItem()` automatisch `storageType: 'insecure'` Flag setzen
- Format: `{ data: <original-data>, storageType: 'insecure' }`
- Story 2.7 prüft dieses Flag und zeigt Security-Warning im Browser

### 🔗 Dependencies (Story Level)

**Blockers:** ❌ Keine - Story 2.1 hat KEINE Dependencies!

**Blocks:** ✅ Alle nachfolgenden Epic 2 Stories
- Story 2.2 (Server Store & Persistence) - nutzt `IStoragePort`
- Story 2.3 (Invite-Code Exchange) - Backend Story, keine Dependency
- Story 2.4 (Deep Link Integration) - nutzt Storage für Server-Config
- Story 2.5 (Web URL-Parameter) - nutzt Storage für Server-Config
- Story 2.6 (Manuelles Formular) - nutzt Storage für Server-Config
- Story 2.7 (Error Handling) - prüft `storageType: 'insecure'` Flag

### 🎓 Learning from Previous Stories

**Story 1.7a (Frontend Invite-Verwaltung) Learnings:**
```
Recent Commits:
5baaf964 ♻️(frontend): Code Review Fixes for Story 1.7a
26e7a389 🐛(invite-code): Add missing InviteCodeCreatedEvent serializer
04f3cddb 🐛(admin): Fix HTML validation error in InviteCodeTable skeleton
```

**Patterns identifiziert:**
- ✅ **Atomic Design:** UI-Komponenten in atoms/molecules/organisms strukturiert
- ✅ **TanStack Query:** API-Hooks in `features/*/api/queries.ts`
- ✅ **Query Keys:** Zentral in `features/*/constants/queryKeys.ts` oder global in `queryKeys.ts`
- ✅ **Generated API Client:** `@bluelight-hub/shared/client` wird genutzt (NIEMALS manuelles fetch)
- ✅ **Biome Linting:** Alle Commits haben Biome Checks durchlaufen

**Code Review Insights:**
- ⚠️ HTML validation errors wurden übersehen → **Zusätzlicher Check: HTML semantics**
- ⚠️ Event serializer fehlte → **Check: Alle Rust Structs haben Serde derives**

**Apply to Story 2.1:**
- ✅ Rust Structs mit `#[derive(Serialize, Deserialize)]` annotieren
- ✅ TypeScript Types mit JSDoc dokumentieren
- ✅ Biome Lint vor jedem Commit laufen lassen
- ✅ Manual Testing dokumentieren (kein E2E Framework vorhanden)

### 🗂️ Git Intelligence

**Branch Context:** `feature/284-multi-server-config`
- ⚠️ **WICHTIG:** Diese Branch arbeitet bereits an Multi-Server-Config!
- ✅ Story 2.1 ist die fehlende Foundation für dieses Feature
- ✅ Nach Story 2.1 kann die Branch mit Server-Config-Persistierung fortfahren

**Recent Work Patterns:**
```
✨(admin): Implement Task 1 - Query Keys & API Hook for Invite Management
✨(backend): implement invite codes
✨(invite-code): Complete Story 1.7 - Invite-Code verwalten
```

**Commit Convention (MUST FOLLOW):**
```bash
✨(storage): Add IStoragePort interface with TypeScript strict mode
✨(storage): Implement TauriStorageAdapter with Rust backend
✨(storage): Implement WebStorageAdapter with localStorage fallback
✨(storage): Add storage adapter factory with singleton pattern
🧪(storage): Add storage adapter factory tests
🧪(storage): Add WebStorageAdapter unit tests
📝(storage): Add ADR 010 - Platform Storage Adapter
📝(storage): Update arc42 with storage abstraction pattern
```

**Emoji Reference:**
- ✨ = Feature (Minor Release)
- 🐛 = Fix (Patch Release)
- 🧪 = Test (No Release)
- 📝 = Docs (No Release)
- ♻️ = Refactor (Patch Release)

### 📚 Latest Tech Information

**Tauri v2 Storage:**
- Tauri v2 nutzt `tauri::State` für App-weiten State
- `Mutex<HashMap<String, String>>` ist einfachste Storage-Lösung
- Kein File I/O nötig für MVP (kann später erweitert werden)

**Tauri Store Plugin (Alternative):**
- `@tauri-apps/plugin-store` existiert für Key-Value Storage
- Nutzt File-based Persistence (JSON Files)
- Overhead für einfache Use Cases → **NICHT für Story 2.1 nutzen**
- Kann in Zukunft refactored werden falls benötigt

**TypeScript Patterns (2025):**
- `import type` für Type-only Imports (Tree-Shaking)
- `satisfies` Operator für Type Narrowing (bereits in tsconfig enabled)
- Strict Null Checks (enabled im Projekt)

**Vitest Best Practices:**
- `beforeEach()` für Test Isolation
- `vi.spyOn()` für Mocking (nicht `jest.mock`)
- `describe/it` statt `test` (Consistency)

### 🔍 Code Review Checklist (Vor Commit)

**TypeScript:**
- [ ] Keine `any` Types verwendet
- [ ] Alle public Methods haben JSDoc (Deutsch)
- [ ] `import type` für Interface-Imports
- [ ] Error Handling mit Try-Catch

**Rust:**
- [ ] Alle Structs haben `#[derive(Serialize, Deserialize)]`
- [ ] Commands haben `#[tauri::command]` Annotation
- [ ] Error Handling mit `Result<T, E>` (optional für MVP)

**Testing:**
- [ ] Mindestens 80% Code Coverage
- [ ] Unit Tests für alle public Methods
- [ ] Mock `window.__TAURI__` für Platform Detection Tests

**Documentation:**
- [ ] ADR 010 erstellt
- [ ] Arc42 Kapitel 8 aktualisiert
- [ ] Development Guide aktualisiert

**Biome:**
- [ ] `pnpm lint` erfolgreich
- [ ] `pnpm lint:check` ohne Warnings

### Project Structure Notes

**Alignment mit Unified Project Structure:**

✅ **Korrekte Pfade:**
- `packages/frontend/src/shared/` - Shared Code (Utils, Types, Services)
- `packages/frontend/src/features/` - Feature-based Modules
- `packages/frontend/src-tauri/src/` - Tauri Rust Backend

✅ **Naming Conventions:**
- Files: kebab-case (`storage-adapter.factory.ts`)
- Classes: PascalCase (`TauriStorageAdapter`)
- Interfaces: PascalCase mit `I` Prefix (`IStoragePort`)
- Functions: camelCase (`getStorageAdapter`)

✅ **Import Aliases:**
- `@/` → `src/` (via tsconfig.json)
- `@bluelight-hub/shared/client` → Generated API Client

❌ **Detected Conflicts:** Keine - Story 2.1 ist neue Infrastructure

### References

**Planning Artifacts:**
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.1]
- [Source: _bmad-output/planning-artifacts/prd.md - FR32-34, NFR-I3, NFR-P5, NFR-R1, NFR-R4]
- [Source: _bmad-output/planning-artifacts/architecture.md - Frontend Architecture, Tauri Integration]

**Project Configuration:**
- [Source: CLAUDE.md - Breaking Rules, Code Patterns, Commit Rules]
- [Source: packages/frontend/tsconfig.json - TypeScript Configuration]
- [Source: packages/frontend/vitest.config.ts - Test Configuration]
- [Source: biome.json - Linter/Formatter Rules]

**Existing Code Patterns:**
- [Source: packages/frontend/src/features/auth/stores/authStore.ts - TanStack Store Pattern]
- [Source: packages/frontend/src/features/auth/api/queries.ts - TanStack Query Pattern]
- [Source: packages/frontend/src-tauri/src/main.rs - Tauri Command Registration]

**Architecture Documentation:**
- [Source: docs/architecture/08-querschnittliche-konzepte.md - Cross-Cutting Concepts]
- [Source: docs/adr/ - Architecture Decision Records]
- [Source: docs/development-guide/code-conventions.md - Code Conventions]

**Subagent Analysis Reports:**
- [Source: Explore Agent (abe4b14) - Epic 2 Context Extraction]
- [Source: Codebase Analyzer (a5fa5e8) - Storage Patterns Analysis]
- [Source: Pattern Detector (acbaa62) - Architecture Patterns Report]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (model ID: claude-sonnet-4-5-20250929)

### Implementation Strategy

**Recommended Implementation Order:**

1. **Day 1 - Abstractions (2-3h):**
   - Task 1: Storage Abstraction Layer (Interface + Platform Detection)
   - Unit Tests für Platform Detection

2. **Day 2 - Web Adapter (2-3h):**
   - Task 3: Web Storage Adapter
   - Unit Tests für WebStorageAdapter
   - Manual Testing im Browser

3. **Day 3 - Tauri Adapter (3-4h):**
   - Task 2.1: Rust Storage Commands
   - Task 2.2: TypeScript TauriStorageAdapter
   - Manual Integration Testing

4. **Day 4 - Factory & Tests (2-3h):**
   - Task 4: Storage Factory & Singleton
   - Unit Tests für Factory
   - Integration Tests (End-to-End)

5. **Day 5 - Documentation (2h):**
   - Task 5: ADR + Arc42 + Development Guide

**Total Effort Estimate:** 2-3 Tage (full-time)

### Critical Success Factors

✅ **MUST HAVE für Story Completion:**
1. Alle 5 Acceptance Criteria erfüllt
2. Unit Tests mit >80% Coverage
3. Manual Integration Tests dokumentiert
4. ADR 010 erstellt
5. Arc42 Kapitel 8 aktualisiert
6. Biome Lint passing
7. TypeScript strict mode ohne Errors

🚨 **FAILURE CONDITIONS (Story gilt als NICHT done):**
- `any` Types im Production Code
- Fehlende Unit Tests
- Fehlende Dokumentation (ADR, Arc42)
- Biome Lint Failures
- Rust Compilation Errors

### Debug Log References

*Wird vom Dev Agent während Implementation ausgefüllt*

### Completion Notes List

*Wird vom Dev Agent während Implementation ausgefüllt*

### File List

**Expected Files After Story Completion:**

**Frontend:**
- `packages/frontend/src/shared/types/storage.ts`
- `packages/frontend/src/shared/utils/platform.ts`
- `packages/frontend/src/shared/services/storage/storage-adapter.factory.ts`
- `packages/frontend/src/shared/services/storage/tauri-storage-adapter.ts`
- `packages/frontend/src/shared/services/storage/web-storage-adapter.ts`
- `packages/frontend/src/shared/services/storage/__tests__/storage-adapter.factory.test.ts`
- `packages/frontend/src/shared/services/storage/__tests__/web-storage-adapter.test.ts`

**Backend (Tauri Rust):**
- `packages/frontend/src-tauri/src/storage.rs` (NEW)
- `packages/frontend/src-tauri/src/main.rs` (MODIFIED - Command Registration)

**Documentation:**
- `docs/adr/010-platform-storage-adapter.md` (NEW)
- `docs/architecture/08-querschnittliche-konzepte.md` (MODIFIED)
- `docs/development-guide/code-conventions.md` (MODIFIED)

**Total:** 7 neue Dateien + 3 modifizierte Dateien = **10 Dateien**

---

## 🎯 READY FOR IMPLEMENTATION

Diese Story ist **vollständig spezifiziert** und bereit für Implementation durch den Dev Agent.

**Next Steps:**
1. Run: `/bmad:bmm:workflows:dev-story` mit Story-File: `story-2.1-platform-storage-adapter.md`
2. Dev Agent implementiert Tasks 1-5 gemäß Spezifikation
3. Code Review nach Completion (empfohlen: separater LLM für frische Perspektive)
4. Merge zu `feature/284-multi-server-config` Branch

**Story Created:** 2026-01-08
**Created By:** Bob - Scrum Master (SM Agent)
**Epic:** 2 - Client-Onboarding & Server-Verbindung
**Story Type:** Foundation Story (Technical Infrastructure)
**Estimated Effort:** 2-3 Tage (Komplexität: Medium, Risiko: Low)
