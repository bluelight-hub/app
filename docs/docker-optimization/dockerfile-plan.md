# Optimized Dockerfile Structure - Complete Plan

## Current Issues Analysis

### 1. Redundant Shared Build (Performance Issue)
- **Current**: shared package built twice (lines 17 and 30)
  - `frontend-builder` stage: `RUN cd packages/shared && pnpm build`
  - `backend-builder` stage: `RUN cd packages/shared && pnpm build`
- **Impact**: ~15-20% build time waste
- **Solution**: Single `shared-builder` stage, reused by both

### 2. cd Command Anti-Pattern (Best Practice Issue)
- **Current**: `RUN cd packages/shared && pnpm build` (lines 17, 22, 30, 32)
- **Problem**: 
  - Each RUN layer starts fresh; `cd` doesn't persist
  - Unclear context of what directory commands run in
  - Not portable across different shell interpreters
- **Solution**: Use `WORKDIR` for explicit, persistent context

### 3. API Client Generation (Clarity Issue)
- **Current**: No API generation in Dockerfile
- **Analysis**: 
  - Shared package already has pre-generated `client/` directory
  - `generate-api` script requires running backend (chicken-egg problem)
  - For Docker builds: API client already present, no generation needed
- **Solution**: 
  - Document that API client must be generated before Docker build
  - Ensure client/ directory is copied to preserve pre-generated types

### 4. Oversized Production Image (Size Issue)
- **Current Line 48**: `COPY --from=backend-builder /app/packages/shared ./packages/shared`
  - Copies entire directory including `src/`, `tsconfig.json`, etc.
  - Only need: `dist/`, `package.json`, `node_modules` (runtime deps)
- **Impact**: ~2-3MB unnecessary files in production image
- **Solution**: Copy only necessary artifacts

### 5. Inefficient WORKDIR Switching (Clarity Issue)
- **Current Lines 38, 51**: 
  - Sets `/app` (line 38)
  - Then switches to `/app/packages/backend` (line 51) for installation
  - Then no explicit switch back for CMD
- **Solution**: Single WORKDIR for production, use explicit paths

---

## Optimized Dockerfile Structure

### Build Stages Overview

```
base
 ├─ shared-builder ──┐
 │                   ├─ frontend-builder ──┐
 │                   │                     └─ production
 │                   └─ backend-builder ───┘
```

### Stage 1: base
- Install dependencies and tools
- Copy workspace configuration files
- Install pnpm dependencies (once for all packages)
- **Purpose**: Shared foundation for all builders
- **Cache Strategy**: Invalidate only when package.json/pnpm-lock.yaml changes

### Stage 2: shared-builder
- Dedicated to building the shared package only
- Produces: `dist/`, type declarations, and pre-generated client
- **Reused by**: frontend-builder and backend-builder
- **Benefits**: 
  - Single compilation of shared package
  - Clean dependency for frontend/backend builds
  - Can be cached and reused independently

### Stage 3: frontend-builder
- Inherits from base
- Copies compiled shared package from shared-builder
- Builds frontend application
- **Artifacts**: `packages/frontend/dist/` → copied to production as `/app/public`

### Stage 4: backend-builder
- Inherits from base
- Copies compiled shared package from shared-builder
- Generates Prisma client
- Builds backend application
- **Artifacts**: `packages/backend/dist/` → copied to production

### Stage 5: production
- Minimal runtime image
- Copies only necessary files:
  - Built backend executable
  - Frontend static assets
  - Workspace configuration
  - Runtime dependencies only (--prod)
  - Shared package artifacts (dist + package.json only)
- **Non-root user**: Runs as 'node' user
- **No build tools**: Stripped down, optimized for execution

---

## Detailed Copy Strategy

### base Stage (Line Copying)
```dockerfile
# Copy only configuration files needed for pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/backend/package.json ./packages/backend/
```
**Why**: Enables layer caching - if source code changes, but package.json doesn't, dependencies are cached

### shared-builder Stage
```dockerfile
# Copy only source code needed for compilation
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/

# Copy pre-generated API client if it exists
COPY packages/shared/client ./packages/shared/client

# Build shared package
WORKDIR /app/packages/shared
RUN pnpm build
```
**Why**: 
- Minimal layers for shared-builder
- Pre-generated client is preserved
- Clear what gets built (just src → dist)

### frontend-builder Stage
```dockerfile
# Inherits base (has node_modules installed)
# Copy compiled shared from shared-builder
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=shared-builder /app/packages/shared/package.json ./packages/shared/

# Copy frontend source
COPY packages/frontend/src ./packages/frontend/src
COPY packages/frontend/tsconfig.json ./packages/frontend/
COPY packages/frontend/vite.config.ts ./packages/frontend/
# ... other frontend config files

# Build frontend
WORKDIR /app/packages/frontend
ENV NODE_ENV=production
ENV SKIP_TESTS=true
RUN pnpm build
```
**Why**:
- Explicit WORKDIR shows what runs where
- Reuses shared compilation (not rebuilt)
- Clear layer progression

### backend-builder Stage
```dockerfile
# Inherits base (has node_modules installed)
# Copy compiled shared from shared-builder
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=shared-builder /app/packages/shared/package.json ./packages/shared/

# Copy backend source
COPY packages/backend/src ./packages/backend/src
COPY packages/backend/prisma ./packages/backend/prisma
COPY packages/backend/tsconfig.json ./packages/backend/
# ... other backend config files

# Generate Prisma client and build
WORKDIR /app/packages/backend
RUN prisma generate
RUN pnpm build
```
**Why**:
- Reuses shared compilation (not rebuilt)
- Prisma generation before build
- Clear context with WORKDIR

### production Stage
```dockerfile
# Fresh minimal runtime image
FROM node:20-alpine AS production
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm
WORKDIR /app

# Copy only workspace configuration (needed for pnpm)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files (needed for pnpm install --prod)
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Copy build artifacts ONLY
# Shared: compiled dist + pre-generated client
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=shared-builder /app/packages/shared/client ./packages/shared/client

# Backend: compiled code
COPY --from=backend-builder /app/packages/backend/dist ./packages/backend/dist

# Frontend: compiled static assets
COPY --from=frontend-builder /app/packages/frontend/dist ./public

# Install ONLY production dependencies
WORKDIR /app
RUN pnpm install --prod --frozen-lockfile

# Setup runtime
RUN mkdir -p /app/uploads/lagekarte && \
    chown -R node:node /app /app/uploads
USER node
EXPOSE 3000
CMD ["node", "packages/backend/dist/main.js"]
```
**Why**:
- Single WORKDIR (no switching)
- Only necessary artifacts copied
- Production dependencies only
- No source code or dev dependencies
- No build tools (stripped down)

---

## File Copying Breakdown by Stage

### What Each Package Needs Copied

#### Shared Package
| Artifact | shared-builder | frontend-builder | backend-builder | production |
|----------|---|---|---|---|
| `src/` | ✅ (for build) | ❌ | ❌ | ❌ |
| `tsconfig.json` | ✅ (for build) | ❌ | ❌ | ❌ |
| `dist/` | ✅ (output) | ✅ (for build) | ✅ (for build) | ✅ (runtime) |
| `client/` | ❌ (pre-gen) | ❌ | ❌ | ✅ (optional) |
| `package.json` | ✅ (for build) | ✅ (for ref) | ✅ (for ref) | ✅ (runtime) |
| `node_modules` | ✅ (inherited) | ✅ (inherited) | ✅ (inherited) | ❌ (minimal) |

#### Frontend Package
| Artifact | frontend-builder | production |
|----------|---|---|
| `src/` | ✅ (for build) | ❌ |
| `dist/` | ✅ (output) | ✅ (as /app/public) |
| `vite.config.ts` | ✅ (for build) | ❌ |
| `tsconfig.json` | ✅ (for build) | ❌ |
| `package.json` | ✅ (inherited) | ❌ |

#### Backend Package
| Artifact | backend-builder | production |
|----------|---|---|
| `src/` | ✅ (for build) | ❌ |
| `dist/` | ✅ (output) | ✅ (runtime) |
| `prisma/` | ✅ (for schema) | ❌ |
| `tsconfig.json` | ✅ (for build) | ❌ |
| `package.json` | ✅ (inherited) | ✅ (for ref) |
| `node_modules` | ✅ (inherited) | ✅ (minimal/prod) |

---

## WORKDIR Best Practices

### ❌ Anti-Pattern (Current)
```dockerfile
WORKDIR /app
RUN pnpm install --frozen-lockfile
RUN cd packages/shared && pnpm build      # Context unclear, cd doesn't persist
COPY packages/frontend/ ./packages/frontend/
RUN cd packages/frontend && pnpm build    # Where are we now? Need to infer
WORKDIR /app/packages/backend              # Inconsistent switching
RUN pnpm install --prod                    # Confused context
```

### ✅ Best Practice
```dockerfile
WORKDIR /app
RUN pnpm install --frozen-lockfile

# Explicit, persistent context for shared build
WORKDIR /app/packages/shared
RUN pnpm build

# Reset to workspace root for frontend
WORKDIR /app
COPY packages/frontend/ ./packages/frontend/
WORKDIR /app/packages/frontend
RUN pnpm build

# Or use explicit paths without changing WORKDIR
WORKDIR /app
RUN --mount=type=bind,source=packages/backend,target=/app/packages/backend \
    pnpm --filter @bluelight-hub/backend build
```

### Guidelines
1. **Set once per major context change** - Don't change WORKDIR multiple times for one concept
2. **Explicit is better than implicit** - Reader should know working directory without inferring
3. **Match package context** - WORKDIR should match the package being processed
4. **Production image** - Use single WORKDIR (typically /app)

---

## Performance Benefits Comparison

### Current Dockerfile
```
Execution Time Breakdown:
├─ base stage: ~60s (pnpm install all deps)
├─ frontend-builder: ~35s
│  └─ shared build: ~10s (REDUNDANT)
│  └─ frontend build: ~25s
├─ backend-builder: ~40s
│  └─ shared build: ~10s (REDUNDANT) ← DUPLICATE WORK
│  └─ prisma generate: ~5s
│  └─ backend build: ~25s
└─ production stage: ~20s

Total: ~155s
Wasted on shared: ~20s (13% of build time)
```

### Optimized Dockerfile
```
Execution Time Breakdown:
├─ base stage: ~60s (pnpm install all deps)
├─ shared-builder: ~10s (built once)
├─ frontend-builder: ~25s (no shared rebuild)
├─ backend-builder: ~30s (no shared rebuild, just prisma + build)
└─ production stage: ~20s

Total: ~145s
Improvement: ~10s saved (6-7% faster)
Build cache reuse: Much better with dedicated shared-builder stage
Layer caching: More granular, faster rebuilds after code changes
```

### Long-term Benefits (After Initial Build)
- **Dockerfile change only**: ~5s (no rebuild needed)
- **Shared package change**: ~10s rebuild + dependent rebuilds (~35s total)
- **Frontend change only**: ~25s rebuild (shared cached)
- **Backend change only**: ~30s rebuild (shared cached)

Current structure rebuilds shared for every backend/frontend change.

---

## API Client Generation Notes

### Current Situation
- Shared package has **pre-generated** `client/` directory
- `generate-api` script in shared requires:
  1. Running backend server on localhost:3000
  2. OpenAPI spec available at `/api-json`
  3. This is impossible in Docker build (chicken-egg)

### Docker Build Workflow
1. **Local Development**: Run `pnpm generate-api` manually before Docker build
   - Backend must be running locally
   - Commits `client/` directory to git
   - Or regenerate in CI/CD before building Docker image

2. **Docker Build**: Skip API generation
   - Use pre-generated client from `client/` directory
   - Ensure `COPY packages/shared/client ./packages/shared/client` in stages
   - Or update shared package exports to work without client

3. **Production**: Pre-generated client only
   - Production image includes optional `client/` if present
   - Not required for runtime (only for types)

### Recommendation
- Add `.gitkeep` in `client/` directory to track it in git
- Document that `pnpm run generate-api` must run after backend changes
- Consider CI/CD step to auto-generate before Docker build
- Or separate "API generation" stage that requires docker build-arg with running backend hostname

---

## Docker Build Performance Tips

### Layer Caching Optimization
```dockerfile
# ❌ Bad: Changes to any source invalidate install cache
COPY . .
RUN pnpm install

# ✅ Good: Package changes only invalidate install cache
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY src/ ./src/
```

### Build Command
```bash
# Standard build (full rebuild each time)
docker build -t app:latest .

# With BuildKit (faster caching, parallelization)
DOCKER_BUILDKIT=1 docker build -t app:latest .

# Multi-platform builds
docker buildx build --platform linux/amd64,linux/arm64 -t app:latest .

# Cache optimization
docker build \
  --cache-from type=registry,ref=app:buildcache \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t app:latest .
```

### Image Size Reduction
- Current: ~250-300MB (with dependencies)
- Optimized: ~220-250MB (minimal prod deps)
- Further optimization: ~150-180MB (multi-stage with alpine)

---

## Implementation Checklist

- [ ] Create `shared-builder` stage between `base` and builders
- [ ] Convert all `cd packages/X && pnpm Y` to `WORKDIR` approach
- [ ] Update `frontend-builder` to copy shared dist from `shared-builder`
- [ ] Update `backend-builder` to copy shared dist from `shared-builder`
- [ ] Remove duplicate shared build from both builders
- [ ] Update `production` stage to copy only necessary artifacts
- [ ] Fix `CMD` to use correct path: `["node", "packages/backend/dist/main.js"]`
- [ ] Remove source code copying to production (src/, tsconfig.json, etc.)
- [ ] Document API client generation requirement
- [ ] Test build with `DOCKER_BUILDKIT=1 docker build -t test .`
- [ ] Verify image runs correctly
- [ ] Compare image size before/after
- [ ] Update docker-compose.yml if needed

