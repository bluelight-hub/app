# CLAUDE.md - Repository Guide

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
- Commit style: `<emoji>(<context>): <description>` (e.g., `✨(frontend): Add user dashboard`)

## Architecture & Patterns
- React frontend with Atomic Design and Vite/Vitest for testing
- NestJS backend with TypeORM (SQLite)
- Packages: frontend, backend, shared (monorepo with pnpm workspaces)
- DRY code with clear separation of concerns
- Single Responsibility Principle for components (<150 lines)
- Full test coverage for new features