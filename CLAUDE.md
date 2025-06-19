# CLAUDE.md - Repository Guide

## Repository Information

- GitHub: github.com/bluelight-hub/app

## Build Commands

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

## Development Workflow

- Committe die Änderungen nach jedem Subtask
