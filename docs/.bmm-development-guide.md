# BlueLight-Hub Development Guide

**Generated:** 2025-01-11 by BMM Document-Project Workflow v1.2.0

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Development Commands](#development-commands)
6. [Docker Setup](#docker-setup)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | ≥ 24.0.0 | JavaScript runtime |
| **pnpm** | 10.20.0+ | Package manager (workspace support) |
| **PostgreSQL** | 17.x | Database (recommended, or use Docker) |
| **Rust** | stable | Required for Tauri (Frontend) |
| **Git** | Latest | Version control |

### Platform-Specific Dependencies

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

**macOS:**
- Install Xcode Command Line Tools: `xcode-select --install`
- Rust targets for cross-compilation (optional):
  ```bash
  rustup target add aarch64-apple-darwin x86_64-apple-darwin
  ```

**Windows:**
- Visual Studio Build Tools 2022 (C++ workload)
- WebView2 Runtime (usually pre-installed on Windows 11)

### Optional Tools

- **Docker & Docker Compose:** For containerized PostgreSQL
- **Prisma Studio:** GUI for database management (included)
- **Compodoc:** Backend documentation generator (included)

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/rubenvitt/bluelight-hub.git
cd bluelight-hub
```

### 2. Install Dependencies

**Monorepo-wide installation:**
```bash
pnpm install --frozen-lockfile
```

This installs dependencies for all packages (backend, frontend, shared) using workspace configuration.

**Note:** The following packages require native builds and may take longer:
- `@prisma/client`, `prisma`
- `@tauri-apps/cli`
- `bcrypt`
- `@swc/core`, `esbuild`

### 3. Verify Installation

```bash
# Check Node version
node --version  # Should be ≥ 24.0.0

# Check pnpm version
pnpm --version  # Should be 10.20.0+

# Check Rust (for Tauri)
rustc --version

# Verify workspace structure
pnpm list --depth 0
```

---

## Environment Configuration

### Backend Environment Variables

**Location:** `packages/backend/.env`

Copy example file and customize:
```bash
cp packages/backend/.env.example packages/backend/.env
```

**Required Variables:**

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bluelight_hub?schema=public"

# Server
NODE_ENV=development
PORT=3000
BACKEND_PORT=3000
APP_URL=http://localhost:3000

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production
ADMIN_JWT_SECRET=your-super-secret-admin-jwt-key-change-this-in-production
ADMIN_JWT_EXPIRATION=15m

# File Uploads
UPLOADS_PATH=../../uploads  # Relative to packages/backend/dist/src
```

**Optional Feature Flags:**

```env
# Error Handling
ERROR_HANDLING_ENABLE_ADVANCED_RETRY=true
ERROR_HANDLING_ENABLE_DUPLICATE_DETECTION=true
ERROR_HANDLING_ENABLE_METRICS=true
ERROR_HANDLING_ENABLE_CIRCUIT_BREAKER=true
ERROR_HANDLING_ENABLE_RATE_LIMITING=true

# Logging
LOG_LEVEL=info  # debug, info, warn, error

# Cache (in-memory)
CACHE_TTL_SECONDS=3600      # 1 hour default
CACHE_MAX_ITEMS=1000

# Rate Limiting
RATE_LIMITER_WINDOW_MS=60000      # 1 minute
RATE_LIMITER_MAX_REQUESTS=100

# Geocoding (Lagekarte)
NOMINATIM_API_URL=https://nominatim.openstreetmap.org
NOMINATIM_RATE_LIMIT=1  # Requests per second (OSM policy)
```

### Frontend Environment Variables

**Location:** `packages/frontend/.env`

Copy example file and customize:
```bash
cp packages/frontend/.env.example packages/frontend/.env
```

**Required Variables:**

```env
# API Configuration
VITE_API_URL=http://localhost:3000
```

**Note:** Vite requires `VITE_` prefix for environment variables to be exposed to client.

---

## Database Setup

### Option 1: Docker PostgreSQL (Recommended for Development)

**Start PostgreSQL container:**
```bash
docker-compose up -d postgres
```

**Verify database is running:**
```bash
docker ps | grep bluelight-hub-postgres
docker logs bluelight-hub-postgres
```

**Default credentials (from docker-compose.yml):**
- User: `bluelight`
- Password: `bluelight`
- Database: `bluelight-hub`
- Port: `9053` (mapped from container's 5432)

**Connection URL:**
```env
DATABASE_URL="postgresql://bluelight:bluelight@localhost:9053/bluelight-hub?schema=public"
```

### Option 2: Local PostgreSQL Installation

**Install PostgreSQL 17:**
```bash
# macOS (Homebrew)
brew install postgresql@17
brew services start postgresql@17

# Ubuntu/Debian
sudo apt-get install postgresql-17
sudo systemctl start postgresql

# Windows (PostgreSQL Installer)
# Download from: https://www.postgresql.org/download/windows/
```

**Create database and user:**
```sql
-- Connect as postgres user
psql -U postgres

-- Create user and database
CREATE USER bluelight WITH PASSWORD 'bluelight';
CREATE DATABASE bluelight_hub OWNER bluelight;
GRANT ALL PRIVILEGES ON DATABASE bluelight_hub TO bluelight;

-- Exit
\q
```

### Prisma Migrations

**Generate Prisma Client:**
```bash
pnpm --filter @bluelight-hub/backend prisma:generate
```

**Run migrations (create tables):**
```bash
pnpm --filter @bluelight-hub/backend prisma:migrate
```

This applies all migrations from `packages/backend/prisma/migrations/`.

**Seed database (optional):**
```bash
pnpm --filter @bluelight-hub/backend prisma:seed
```

**Prisma Studio (GUI):**
```bash
pnpm --filter @bluelight-hub/backend prisma:studio
```

Opens browser at `http://localhost:5555` for visual database management.

### Database Schema Overview

**9 Models:**
- User (authentication, role-based access)
- Einsatz (mission management)
- Einsatztagebuch (ETB - mission log)
- EtbEintrag (ETB entries)
- EtbEintragHistorie (ETB entry versioning)
- EtbTextbaustein (ETB text templates)
- EtbArchiv (10-year archival with SHA-256 checksums)
- Lagekarte (situation map)
- Poi (points of interest with MGRS coordinates)

**5 Enums:**
- UserRole (SUPER_ADMIN, ADMIN, USER)
- EinsatzStatus (ANGELEGT, IN_BEARBEITUNG, ABGESCHLOSSEN, ARCHIVIERT)
- EinsatztagebuchStatus (AKTIV, ABGESCHLOSSEN)
- PoiType (FAHRZEUG, EINSATZORT, etc.)
- EtbEintragPrioritaet (ROUTINE, WICHTIG, KRITISCH)

---

## Development Commands

### Monorepo-Wide Commands

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

### Backend Commands

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

### Frontend Commands

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

### Shared Package Commands

```bash
# Generate API client from OpenAPI spec
pnpm --filter @bluelight-hub/shared generate-api
```

**Important:** Run this after every backend API change to keep frontend types in sync!

---

## Docker Setup

### Development with Docker Compose

**Services:**
- `postgres`: PostgreSQL 17 database
- `app`: Backend application (production build)

**Start all services:**
```bash
docker-compose up
```

**Start in background:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f          # All services
docker-compose logs -f postgres # PostgreSQL only
docker-compose logs -f app      # Backend only
```

**Stop services:**
```bash
docker-compose down
```

**Rebuild and restart:**
```bash
docker-compose up --build
```

### Docker Environment Variables

Override defaults in `.env` file (project root):

```env
DATABASE_USER=bluelight
DATABASE_PASSWORD=bluelight
DATABASE_NAME=bluelight-hub
DATABASE_PORT=9053  # Host port (container uses 5432)
```

### Database Persistence

PostgreSQL data is persisted in named volume:
```yaml
volumes:
  postgres_data:
    name: bluelight-hub-postgres-data
```

**Reset database:**
```bash
docker-compose down -v  # Remove volumes
docker-compose up -d
```

### Dockerfile

Location: `/Dockerfile`

**Multi-stage build:**
1. **Build stage:** Compile TypeScript, generate Prisma client
2. **Production stage:** Minimal Node.js runtime with compiled artifacts

**Image features:**
- Health check endpoint: `/api/health`
- Volume mount for uploads: `./uploads:/app/uploads`
- Resource limits: 1GB max, 512MB reserved

---

## CI/CD Pipeline

### GitHub Actions Workflows

**Location:** `.github/workflows/`

#### 1. CI Pipeline (`ci.yml`)

**Triggers:**
- Pull requests to `main`, `develop`, `alpha`, `beta`, `release/*`
- Pushes to same branches

**Jobs:**
- **build-and-test:** Multi-platform build (Ubuntu, macOS, Windows)
  - Install dependencies
  - Generate Prisma client
  - Run linting (Biome)
  - Upload test artifacts on failure
  - Upload coverage to Codecov (Linux only)
- **docs:** Generate backend documentation (Compodoc)
- **code-quality:** TypeScript compiler check
- **summary:** Aggregate results for branch protection

**Status badges:**
```markdown
[![GitHub Actions](https://github.com/rubenvitt/bluelight-hub/actions/workflows/test.yml/badge.svg)](https://github.com/rubenvitt/bluelight-hub/actions/workflows/test.yml)
[![doccov](https://backend-docs.bluelight-hub.rubeen.dev/images/coverage-badge-documentation.svg)](https://backend-docs.bluelight-hub.rubeen.dev)
```

#### 2. Release Pipeline (`release.yml`)

**Triggers:**
- CI pipeline success on `main`, `alpha`, `beta`, `next`

**Jobs:**
- **build-backend:** Docker image build (multi-arch: amd64, arm64)
  - Push to GitHub Container Registry (GHCR)
  - Tags: `latest`, `main`, `main:<build_number>`
- **build-frontend:** Tauri app build (4 platforms)
  - macOS: ARM64 + x86_64
  - Ubuntu: x86_64
  - Windows: x86_64
- **release:** Semantic Release
  - Generate release notes from commits
  - Create GitHub Release
  - Attach Docker image tags and Tauri artifacts

**Semantic Versioning:**
- Emoji-based commit messages trigger version bumps
- Automatic CHANGELOG generation
- Release to `main`, `alpha`, `beta`, `next` tracks

#### 3. Docker Publish (`docker-publish.yml`)

Publishes Docker images to GHCR on release.

#### 4. Documentation Deploy (`docs.yml`)

Generates and deploys arc42 architecture documentation.

### Semantic Release Configuration

**Commit format:** `<emoji>(<scope>): <subject>`

**Version bumps:**
- 💥 Breaking: Major (1.0.0 → 2.0.0)
- ✨ Feature: Minor (1.0.0 → 1.1.0)
- 🐛 Fix: Patch (1.0.0 → 1.0.1)

**Example commits:**
```bash
git commit -m "✨(einsatz): Add bulk archive endpoint"
git commit -m "🐛(auth): Fix JWT token refresh logic"
git commit -m "💥(api): Remove deprecated /v1 endpoints"
```

---

## Troubleshooting

### Database Connection Issues

**Problem:** `Error: P1001: Can't reach database server`

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   # Docker
   docker ps | grep postgres

   # Local
   pg_isready -h localhost -p 5432
   ```

2. Check DATABASE_URL in `.env`:
   ```bash
   # Must match your database credentials
   DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
   ```

3. Test connection manually:
   ```bash
   psql -h localhost -p 5432 -U bluelight -d bluelight_hub
   ```

### Prisma Client Out of Sync

**Problem:** `Unknown argument 'include'` or similar Prisma errors

**Solution:** Regenerate Prisma client:
```bash
pnpm --filter @bluelight-hub/backend prisma:generate
```

### API Client Type Errors

**Problem:** TypeScript errors about missing API methods

**Solution:** Regenerate API client after backend changes:
```bash
pnpm run generate-api
```

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions:**
1. Kill process on port 3000:
   ```bash
   # Find PID
   lsof -i :3000

   # Kill process
   kill -9 <PID>
   ```

2. Change port in `.env`:
   ```env
   PORT=3001
   BACKEND_PORT=3001
   ```

### Tauri Build Failures

**Problem:** Tauri build fails on macOS/Linux

**Solutions:**
1. Install platform dependencies (see [Prerequisites](#prerequisites))
2. Update Rust:
   ```bash
   rustup update stable
   ```
3. Clear Tauri cache:
   ```bash
   rm -rf packages/frontend/src-tauri/target
   ```

### Docker Compose Issues

**Problem:** `database "bluelight_hub" does not exist`

**Solution:** Docker Compose auto-creates database. If missing:
```bash
docker-compose down -v  # Remove volumes
docker-compose up -d    # Recreate
```

### JWT Authentication Issues

**Problem:** `401 Unauthorized` or token refresh fails

**Solutions:**
1. Verify JWT secrets in `.env` are set and consistent
2. Check cookie settings (httpOnly, sameSite, secure)
3. Clear browser cookies and re-login
4. Verify ALLOWED_ORIGINS includes frontend URL

### File Upload Issues

**Problem:** `ENOENT: no such file or directory` for uploads

**Solution:** Create uploads directory:
```bash
mkdir -p uploads
```

Or update UPLOADS_PATH in `.env`:
```env
UPLOADS_PATH=../../uploads  # Relative to packages/backend/dist/src
```

### Lint/Biome Errors

**Problem:** Biome reports formatting errors

**Solution:** Auto-fix with:
```bash
pnpm lint
```

Or check only:
```bash
pnpm lint:check
```

### Node Version Mismatch

**Problem:** `error @tauri-apps/cli@2.9.4: The engine "node" is incompatible`

**Solution:** Upgrade Node.js to ≥ 24.0.0:
```bash
# Using nvm
nvm install 24
nvm use 24

# Using Homebrew (macOS)
brew install node@24
```

### Tests Currently Disabled

**Important Note:** Test infrastructure was removed in PR #257 (2025-01-28).

- `pnpm test` - Not functional
- `pnpm test:cov` - Not functional
- `pnpm test:ui` - Not functional

See [README.md](../README.md#tests) for migration guidance.

---

## Additional Resources

- **Backend README:** [packages/backend/README.md](../packages/backend/README.md)
- **Frontend README:** [packages/frontend/README.md](../packages/frontend/README.md)
- **Shared README:** [packages/shared/README.md](../packages/shared/README.md)
- **Architecture Docs:** [docs/architecture/index.adoc](../docs/architecture/index.adoc)
- **AI Documentation:** [docs/ai-docs/index.md](../docs/ai-docs/index.md)

---

**Last Updated:** 2025-01-11
**Workflow Version:** BMM v1.2.0 (Exhaustive Scan)
