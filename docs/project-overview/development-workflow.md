# Development Workflow

## Daily Development

```bash
# Start all services
pnpm -r dev

# Backend only
pnpm --filter @bluelight-hub/backend dev

# Frontend only (browser)
pnpm --filter @bluelight-hub/frontend dev:vite

# Frontend only (desktop app)
pnpm --filter @bluelight-hub/frontend dev
```

## After Backend Changes

```bash
# Regenerate API client
pnpm run generate-api

# Verify TypeScript compilation
pnpm --filter @bluelight-hub/frontend build
```

## Before Committing

```bash
# Lint all packages
pnpm lint

# Check TypeScript
pnpm --filter @bluelight-hub/backend build
pnpm --filter @bluelight-hub/frontend build

# Commit with semantic emoji
git commit -m "✨(einsatz): Add bulk archive endpoint"
```

## Database Management

```bash
# Open Prisma Studio
pnpm --filter @bluelight-hub/backend prisma:studio

# Run migrations
pnpm --filter @bluelight-hub/backend prisma:migrate

# Seed database
pnpm --filter @bluelight-hub/backend prisma:seed

# Reset database (development only!)
pnpm --filter @bluelight-hub/backend prisma migrate reset
```

---
