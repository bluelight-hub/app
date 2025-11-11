# Development Commands

## Monorepo-Wide Commands

Run from project root (`/Users/rubeen/dev/personal/bluelight-hub`):

```bash
# Start all services (backend + frontend)
pnpm dev

# Build all packages
pnpm build

# Lint all packages
pnpm lint             # Auto-fix with Biome
pnpm lint:check       # Check only (CI mode)

# Generate API client (after backend changes)
pnpm run generate-api
```

## Backend Commands

Run with `pnpm --filter @bluelight-hub/backend <command>`:

```bash
# Development
pnpm --filter @bluelight-hub/backend dev              # Watch mode
pnpm --filter @bluelight-hub/backend start:debug      # Debug mode

# Build & Production
pnpm --filter @bluelight-hub/backend build            # Compile TypeScript
pnpm --filter @bluelight-hub/backend start:prod       # Production mode

# Prisma
pnpm --filter @bluelight-hub/backend prisma:generate  # Generate client
pnpm --filter @bluelight-hub/backend prisma:migrate   # Run migrations
pnpm --filter @bluelight-hub/backend prisma:deploy    # Deploy migrations (prod)
pnpm --filter @bluelight-hub/backend prisma:seed      # Seed database
pnpm --filter @bluelight-hub/backend prisma:studio    # Open Prisma Studio

# Documentation
pnpm --filter @bluelight-hub/backend docs:build       # Generate Compodoc
pnpm --filter @bluelight-hub/backend docs:serve       # Serve docs locally
pnpm --filter @bluelight-hub/backend docs:cov         # Check JSDoc coverage (85% threshold)

# JSDoc Coverage Checks
pnpm --filter @bluelight-hub/backend check:jsdoc              # Full report
pnpm --filter @bluelight-hub/backend check:jsdoc:public       # Public APIs only
pnpm --filter @bluelight-hub/backend check:jsdoc:json         # JSON report

# Admin Tools
pnpm --filter @bluelight-hub/backend admin:reset      # Reset admin password (CLI)

# Lint
pnpm --filter @bluelight-hub/backend lint             # Auto-fix
pnpm --filter @bluelight-hub/backend lint:check       # Check only
```

## Frontend Commands

Run with `pnpm --filter @bluelight-hub/frontend <command>`:

```bash
# Development
pnpm --filter @bluelight-hub/frontend dev             # Tauri dev mode (Desktop app)
pnpm --filter @bluelight-hub/frontend dev:vite        # Vite only (Browser mode)

# Build & Production
pnpm --filter @bluelight-hub/frontend build           # Build for production
pnpm --filter @bluelight-hub/frontend preview         # Preview production build

# Tauri
pnpm --filter @bluelight-hub/frontend tauri dev       # Start Tauri app
pnpm --filter @bluelight-hub/frontend tauri build     # Build Tauri app

# Lint
pnpm --filter @bluelight-hub/frontend lint            # Auto-fix
pnpm --filter @bluelight-hub/frontend lint:check      # Check only
```

## Shared Package Commands

```bash
# Generate API client from OpenAPI spec
pnpm --filter @bluelight-hub/shared generate-api
```

**Important:** Run this after every backend API change to keep frontend types in sync!

---
