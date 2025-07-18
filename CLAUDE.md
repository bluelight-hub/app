# CLAUDE.md - Repository Guide

## Repository Information

- GitHub: github.com/bluelight-hub/app

## Development Tools

### IntelliJ Run Configurations (Preferred)

Use IntelliJ run configurations instead of shell commands for better IDE integration:

**Development:**

- `backend > dev` - Start backend development server
- `frontend > dev` - Start frontend development server

**Testing:**

- `Backend Tests (All)` - Run all backend tests
- `Backend Tests (Watch)` - Run backend tests in watch mode
- `Backend Tests (Coverage)` - Run backend tests with coverage
- `Frontend Tests (All)` - Run all frontend tests
- `Frontend Tests (Watch)` - Run frontend tests in watch mode
- `Frontend Tests (Coverage)` - Run frontend tests with coverage
- `All Tests (pnpm)` - Run all tests across the monorepo
- `All Tests Coverage (pnpm)` - Run all tests with coverage

**Infrastructure (you may not use these, the user should have started those):**

- `docker-compose.yml: Compose Deployment` - Start all services
- `docker-compose.yml.postgres: Compose Deployment` - Start PostgreSQL
- `docker-compose.yml.redis: Compose Deployment` - Start Redis

### Build Commands (Fallback)

Only use these shell commands if IntelliJ is not available:

- Project-wide: `pnpm -r dev`, `pnpm -r build`, `pnpm -r test`, `pnpm -r test:cov`
- Backend: `pnpm --filter @bluelight-hub/backend dev`, `pnpm --filter @bluelight-hub/backend test`
- Frontend: `pnpm --filter @bluelight-hub/frontend dev`, `pnpm --filter @bluelight-hub/frontend test`
- Single test (backend): `pnpm --filter @bluelight-hub/backend test -- -t "test name"`
- Single test (frontend): `pnpm --filter @bluelight-hub/frontend test -- -t "test name"`

## Code Style Guidelines

- TypeScript strict mode required throughout codebase
- Frontend: Atomic Design (atoms, molecules, organisms, templates, pages)
- Backend: NestJS modular architecture (controller, service, repository)
- File naming: PascalCase for components, camelCase for others
- Comments: Explain "why" not "what", JSDoc for public APIs
- Use react-icons (phosphor-icons) when using icons
- JSDoc sollte in deutsch geschrieben sein, die geht direkt in die technische Dokumentation (und die ist auf deutsch)

## Commit Message Convention

- Format: `<emoji>(<context>): <title>`
- Context: `frontend`, `backend`, `shared`, `release`, or other module names
- Title: Short summary (50-72 characters), use imperative mood
- Body (optional): Detailed explanation after blank line

### Commit Message Structure

```
<emoji>(<context>): <title>

<optional body>
```

### Examples

Single-line commits:

- `✨(frontend): Add user dashboard`
- `🐛(backend): Fix database connection timeout`
- `♻️(shared): Refactor date utility functions`

Multi-line commit:

```
💥(backend): Change API response format

BREAKING CHANGE: The API now returns data in a nested structure
instead of flat objects. This improves consistency but requires
frontend updates.

Affected endpoints:
- GET /api/users
- GET /api/organizations
```

### Semantic Release Emojis

This project uses semantic-release with gitmoji for automated versioning:

**Major Version (Breaking Changes):**

- 💥 Breaking changes

**Minor Version (New Features):**

- ✨ New features/functionality

**Patch Version (Fixes & Improvements):**

- 🐛 Bug fixes
- 🚑 Critical hotfixes
- 🔒 Security fixes
- 🧹 Code cleanup/chore
- ♻️ Code refactoring
- 🔧 Configuration/tooling changes

## Architecture & Patterns

- React frontend with Atomic Design and Vite/Vitest for testing
- NestJS backend with Prisma (PostgreSQL)
- Packages: frontend, backend, shared (monorepo with pnpm workspaces)
- DRY code with clear separation of concerns
- Single Responsibility Principle for components (<150 lines)
- Full test coverage for new features

### Documentation Guidelines

- **Architectural documentation** belongs in `docs/architecture/` following the arc42 template
- Do NOT create separate markdown files in the `docs/` root directory for architectural concepts
- System design, security concepts, and technical decisions should be documented in the appropriate arc42 sections
- Only create markdown files in `docs/` root for operational guides (deployment, migration, etc.)

## Development Workflow

### Commit-Regeln (WICHTIG!)

- **NIEMALS mit `--no-verify` committen!** Pre-commit hooks müssen IMMER durchlaufen
- **Tests dürfen NIEMALS übersprungen werden** - alle Tests müssen erfolgreich sein
- **Committe nach jedem abgeschlossenen Subtask** für bessere Nachvollziehbarkeit

### Workflow-Schritte

1. Änderungen implementieren
2. Tests ausführen (via IntelliJ Run Configurations)
3. Linting und Type-Checking sicherstellen
4. Commit MIT allen Checks (ohne `--no-verify`)
5. Bei Fehlern: Erst fixen, dann committen
