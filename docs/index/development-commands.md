# Development Commands

## Monorepo-wide

```bash
# Start all services (backend + frontend)
pnpm -r dev

# Build all packages
pnpm -r build

# Lint all packages (auto-fix with Biome)
pnpm lint

# Lint check only (CI mode)
pnpm lint:check

# Generate API client (after backend changes)
pnpm run generate-api

# Generate documentation (arc42 HTML + PDF)
pnpm docs:build
```

## Backend

```bash
# Development mode (watch)
pnpm --filter @bluelight-hub/backend dev

# Build
pnpm --filter @bluelight-hub/backend build

# Production mode
pnpm --filter @bluelight-hub/backend start:prod

# Prisma commands
pnpm --filter @bluelight-hub/backend prisma:generate  # Generate client
pnpm --filter @bluelight-hub/backend prisma:migrate   # Run migrations
pnpm --filter @bluelight-hub/backend prisma:studio    # Open GUI

# Documentation
pnpm --filter @bluelight-hub/backend docs:build       # Generate Compodoc
pnpm --filter @bluelight-hub/backend check:jsdoc:public  # Check JSDoc coverage (85% threshold)

# Admin tools
pnpm --filter @bluelight-hub/backend admin:reset      # Reset admin password
```

## Frontend

```bash
# Tauri dev mode (desktop app)
pnpm --filter @bluelight-hub/frontend dev

# Vite only (browser mode)
pnpm --filter @bluelight-hub/frontend dev:vite

# Build
pnpm --filter @bluelight-hub/frontend build

# Preview production build
pnpm --filter @bluelight-hub/frontend preview

# Tauri build (cross-platform)
pnpm --filter @bluelight-hub/frontend tauri build
```

---
