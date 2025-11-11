# Notes & Conventions

## Breaking Rules (NIEMALS brechen!)

1. **NIEMALS manuelle API-Helper erstellen!** Nutze IMMER TanStack Query Hooks mit generiertem API-Client.
2. **NUR Tailwind CSS + Headless UI** - keine anderen Frameworks!
3. **Forms:** NUR @tanstack/react-form mit Zod-Schemas
4. **State:** @tanstack/react-store für globalen State
5. **NIEMALS `--no-verify` bei Commits** verwenden
6. **IMMER nach jedem Subtask committen**
7. **Commit-Format:** `<emoji>(<context>): <title>`

## API Development Workflow

1. Backend-Endpoint mit NestJS/Swagger erstellen
2. `pnpm run generate-api` ausführen (aus Root!)
3. Frontend nutzt generierten Client via BackendApi-Singleton
4. TanStack Query Hooks für State Management

## UI Development Workflow

1. Nutze Atomic Design Hierarchie (Atoms → Molecules → Organisms → Templates → Pages)
2. IMMER Tailwind CSS Classes + Headless UI verwenden
3. TailwindUI-Komponenten: User nach Code fragen, NICHT selbst erstellen!
4. Forms: TanStack Form + Zod-Schemas
5. State: TanStack Query für Server-State, TanStack Store für UI-State

## Testing Strategy

- **Unit Tests:** Wird AKTUELL übersprungen (temporär)
- **E2E Tests:** Wurden entfernt
- **Manual Testing:** Chrome DevTools MCP für Browser-Testing

## Commit Conventions

**Semantic Release Triggers:**

| Emoji | Typ      | Version | Verwendung       |
|-------|----------|---------|------------------|
| 💥    | Breaking | Major   | Breaking Changes |
| ✨     | Feature  | Minor   | Neue Features    |
| 🐛    | Fix      | Patch   | Bug Fixes        |
| 🚑    | Hotfix   | Patch   | Kritische Fixes  |
| 🔒    | Security | Patch   | Security Fixes   |
| ♻️    | Refactor | Patch   | Code Refactoring |

## JSDoc Requirements

- **Sprache:** Deutsch (für technische Dokumentation)
- **Coverage Check:** `pnpm --filter @bluelight-hub/backend check:jsdoc:public`
- Erkläre "warum", nicht "was"

---
