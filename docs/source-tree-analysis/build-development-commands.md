# Build & Development Commands

## Root (Monorepo)

```bash
# Alle Services starten
pnpm -r dev

# API-Client regenerieren (WICHTIG nach Backend-Änderungen!)
pnpm run generate-api

# Alle Packages bauen
pnpm -r build

# Dependencies installieren
pnpm install

# Linting + Formatting (Biome)
pnpm run lint
pnpm run format
```

## Backend

```bash
# Dev-Server starten (Port 3000)
pnpm --filter @bluelight-hub/backend dev

# Backend bauen
pnpm --filter @bluelight-hub/backend build

# Prisma migrations
pnpm --filter @bluelight-hub/backend prisma:migrate:dev
pnpm --filter @bluelight-hub/backend prisma:migrate:deploy

# Prisma Studio (Database GUI)
pnpm --filter @bluelight-hub/backend prisma:studio

# Database seeding
pnpm --filter @bluelight-hub/backend prisma:seed

# JSDoc coverage check
pnpm --filter @bluelight-hub/backend check:jsdoc:public

# CLI commands
pnpm --filter @bluelight-hub/backend cli:admin-reset-password
```

## Frontend

```bash
# Vite dev server (Port 5173)
pnpm --filter @bluelight-hub/frontend dev

# Tauri desktop app (dev mode)
pnpm --filter @bluelight-hub/frontend tauri dev

# Frontend bauen
pnpm --filter @bluelight-hub/frontend build

# Tauri desktop app bauen (production)
pnpm --filter @bluelight-hub/frontend tauri build

# Cypress E2E tests (deprecated)
pnpm --filter @bluelight-hub/frontend test:e2e
```

## Shared

```bash
# API-Client generieren (aus Root ausführen!)
pnpm run generate-api

# Shared package bauen
pnpm --filter @bluelight-hub/shared build
```

---
