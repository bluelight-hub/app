# Repository Guidelines

## Project Structure & Module Organization

- `packages/backend`: NestJS 11 + Prisma. Source in `src/`, tests in `test/`, database schema in `prisma/`, API docs via
  Compodoc in `docs/`.
- `packages/frontend`: React 19 + Vite + Tauri. App in `src/`, assets in `public/`, unit tests via Vitest, E2E via
  Playwright in `e2e/` (a `cypress/` folder exists but Playwright is primary).
- `packages/shared`: OpenAPI TypeScript client in `client/` generated from backend Swagger.
- `docs/`: Asciidoctor sources; built HTML/PDF in `dist/docs/`.

## Build, Test, and Development Commands

- Install: `pnpm install` (pnpm only). Prefer IDE run configurations; CLI is the fallback.
- Dev (all): `pnpm dev` — backend (Nest watch) + frontend (Tauri/Vite).
- Build: `pnpm build`; or per package via `pnpm --filter <pkg> build`.
- Lint/Format: `pnpm lint`, `pnpm format`, `pnpm format:check`.
- Tests (all): `pnpm test` | Coverage: `pnpm test:cov` | UI: `pnpm test:ui`.
- Backend E2E: `pnpm --filter @bluelight-hub/backend test:e2e` (add `:watch`/`:cov` as needed).
- Docs: `pnpm docs:build` → `dist/docs/`.
- API client: start backend, then `pnpm --filter @bluelight-hub/shared generate-api`.

## Coding Style & Naming Conventions

- TypeScript everywhere; 2-space indent; Prettier configured via `.prettierrc.json`.
- ESLint enabled in each package; run `pnpm lint` before PRs.
- React: components PascalCase; hooks/utilities camelCase; files `.tsx/.ts`.
- NestJS: modules/services/controllers in PascalCase with clear suffixes (e.g., `UsersModule`, `UsersService`).

## Architecture & UI/Libraries

- API access: NEVER hand-roll helpers. Use generated clients in `packages/shared/client/` via
  `packages/frontend/src/api/`.
- Forms/State/Timing: Use TanStack Form (+ Zod), TanStack Store, and TanStack Pacer.
- UI: Chakra UI v3 only; do not mix CSS frameworks. Prefer official components and theme tokens.
- Docs: arc42 lives under `docs/architecture/`; update ADRs in `docs/architecture/adr/` with architectural changes.

## MCP Integration

- Serena: Symbol-basierte Navigation statt Ganzdatei-Reads; nutze `mcp__serena__get_symbols_overview`, `find_symbol`,
  `find_referencing_symbols` vor Refactors; für präzise Edits `replace_symbol_body`.
- Context7: Vor Einsatz/Update externer Libs offizielle Doku holen (`mcp__context7__resolve-library-id` →
  `mcp__context7__get-library-docs`); relevant: NestJS, Prisma, React, Chakra, TanStack, Zod.
- Chakra MCP: UI-Implementierungen mit `mcp__chakra-ui__get_theme`, `mcp__chakra-ui__get_component_props`,
  `mcp__chakra-ui__get_component_example`, Migration-Check `mcp__chakra-ui__v2_to_v3_code_review`, Komponentenliste
  `mcp__chakra-ui__list_components`.

## Testing Guidelines

- Backend: Jest (`pnpm --filter @bluelight-hub/backend test`), coverage via `test:cov`.
- Frontend: Vitest (`pnpm --filter @bluelight-hub/frontend test`), Playwright E2E (`test:e2e`, `test:e2e:ui`).
- Naming: unit tests `*.spec.ts`/`*.spec.tsx`; E2E specs under `e2e/`.
- Frontend coverage is currently disabled; backend collects coverage.

## Commit & Pull Request Guidelines

- Commits: follow `.cursor/rules/030-commit-rules.mdc` (gitmoji + concise context).
- PRs: include summary, linked issues, reproduction/validation steps, and screenshots for UI changes.
- Require green checks: `pnpm lint`, `pnpm format:check`, `pnpm test`. Update docs and `.env.example` when configs
  change.

## Security & Configuration Tips

- Use `.env.example` as a template; never commit secrets.
- Database: manage with Prisma (`pnpm --filter @bluelight-hub/backend prisma:migrate`).
- Containers: see `docker-compose.yml` for local services.
