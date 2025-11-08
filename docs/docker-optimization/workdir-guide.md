# WORKDIR Best Practices Guide

## Why WORKDIR Matters

### The cd Problem

```dockerfile
# ❌ ANTI-PATTERN: cd doesn't persist across RUN commands
WORKDIR /app
COPY . .
RUN cd packages/shared && npm build   # Sets context to packages/shared
RUN npm start                         # BUT: Starts from /app (cd was lost!)
```

Each `RUN` command executes in a NEW shell:
```
Container Layer 1: RUN cd packages/shared && npm build
  → Creates a shell, cd to packages/shared, build, shell exits
  
Container Layer 2: RUN npm start
  → Creates a NEW shell (previous cd is gone!)
  → Starts from /app (cd lost!)
```

### The WORKDIR Solution

```dockerfile
# ✅ BEST PRACTICE: WORKDIR persists
WORKDIR /app
COPY . .
WORKDIR /app/packages/shared
RUN npm build                         # Context is packages/shared
RUN npm start                         # Still in packages/shared
```

Each `RUN` uses the persisted `WORKDIR`:
```
Container Layer 1: WORKDIR /app/packages/shared
  → Sets context for following RUN commands
  
Container Layer 2: RUN npm build
  → Runs in /app/packages/shared (context persists!)
  
Container Layer 3: RUN npm start
  → Also runs in /app/packages/shared (context still persists!)
```

---

## WORKDIR Rules

### Rule 1: WORKDIR Persists Across Subsequent Layers
```dockerfile
WORKDIR /app
RUN echo $PWD                    # Output: /app

WORKDIR /app/backend
RUN echo $PWD                    # Output: /app/backend
RUN npm run build                # Also in /app/backend
```

### Rule 2: WORKDIR Only Changes with Explicit WORKDIR Command
```dockerfile
WORKDIR /app/backend
RUN cd /app/frontend && npm build   # Runs in /app/frontend for this RUN only
RUN npm build                       # Back to /app/backend (cd was lost!)
```

### Rule 3: Relative Paths Start from WORKDIR
```dockerfile
WORKDIR /app
WORKDIR packages/backend         # Resolves to /app/packages/backend
RUN npm build                    # Current dir: /app/packages/backend
```

### Rule 4: Each Stage Has Its Own WORKDIR
```dockerfile
FROM node AS builder
WORKDIR /build
RUN mkdir test

FROM node AS runner
WORKDIR /app
# test directory doesn't exist in this stage!
# Each FROM creates a new filesystem
```

---

## Project-Specific Examples

### Example 1: Shared Package Build

#### ❌ Wrong (using cd)
```dockerfile
FROM base AS shared-builder
WORKDIR /app
COPY packages/shared/ ./packages/shared/
RUN cd packages/shared && pnpm build
RUN pnpm add @types/node           # Oops! Runs from /app, not /app/packages/shared
```

#### ✅ Right (using WORKDIR)
```dockerfile
FROM base AS shared-builder
WORKDIR /app
COPY packages/shared/ ./packages/shared/
WORKDIR /app/packages/shared
RUN pnpm build
RUN pnpm add @types/node           # Runs from /app/packages/shared
```

---

### Example 2: Multiple Package Builds

#### ❌ Wrong (confusing context switches)
```dockerfile
FROM base AS builder
WORKDIR /app
COPY packages/ ./packages/

# Build shared
RUN cd packages/shared && pnpm build
RUN cd packages/frontend && pnpm build   # Which dir are we in?
RUN cd packages/backend && pnpm build    # Confusing to read

WORKDIR /app/packages/backend            # Suddenly switching
RUN pnpm start                           # Where am I?
```

#### ✅ Right (explicit context)
```dockerfile
FROM base AS builder
WORKDIR /app
COPY packages/ ./packages/

# Build shared
WORKDIR /app/packages/shared
RUN pnpm build

# Build frontend
WORKDIR /app/packages/frontend
RUN pnpm build

# Build backend
WORKDIR /app/packages/backend
RUN pnpm build
RUN pnpm start
```

---

### Example 3: Production Stage (Single WORKDIR)

#### ❌ Wrong (unnecessary switching)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .

WORKDIR /app/packages/backend
RUN pnpm install --prod           # Why switch? Not needed

WORKDIR /app                       # Switch back
EXPOSE 3000
CMD ["node", "packages/backend/dist/main.js"]
```

#### ✅ Right (stick with one)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .

RUN pnpm install --prod            # No switch needed
EXPOSE 3000
CMD ["node", "packages/backend/dist/main.js"]
```

---

## WORKDIR Strategy for Monorepos

### Strategy 1: Root-Based (Recommended for Your Project)
```dockerfile
FROM node:20-alpine
WORKDIR /app                          # Set once, never change
COPY . .
RUN pnpm install --prod               # From /app
CMD ["node", "packages/backend/dist/main.js"]
```

**When to use**: 
- monorepo with pnpm workspaces
- Multiple packages that work together
- Can reference packages by relative path

**Benefits**:
- Single WORKDIR
- Clearer code
- Easier to debug

---

### Strategy 2: Per-Package (For Complex Builds)
```dockerfile
FROM node:20-alpine
WORKDIR /app

# Build each package in its own context
WORKDIR /app/packages/backend
COPY packages/backend ./
RUN pnpm install --prod

WORKDIR /app/packages/frontend
COPY packages/frontend ./
RUN pnpm build

WORKDIR /app
EXPOSE 3000
CMD ["node", "packages/backend/dist/main.js"]
```

**When to use**:
- Packages are very independent
- Different build processes per package
- Need isolated build contexts

---

### Strategy 3: Hybrid (For Complex Monorepos)
```dockerfile
FROM node:20-alpine
WORKDIR /app

# Monorepo-level operations from root
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Package-specific operations with switched context
WORKDIR /app/packages/backend
COPY packages/backend/package.json ./
RUN pnpm build

# Back to root for final setup
WORKDIR /app
CMD ["node", "packages/backend/dist/main.js"]
```

**When to use**:
- Mix of monorepo-level and package-level operations
- Some commands run from root, some from packages

---

## WORKDIR Anti-Patterns to Avoid

### Anti-Pattern 1: Over-Switching
```dockerfile
# ❌ Too many WORKDIR changes - hard to follow
FROM node:20-alpine
WORKDIR /app
WORKDIR /app/packages
WORKDIR /app/packages/backend
WORKDIR /app
WORKDIR /app/packages/frontend
WORKDIR /app
WORKDIR /app/packages/shared
```

**Fix**: Group operations by context
```dockerfile
# ✅ Clear context grouping
FROM node:20-alpine
WORKDIR /app

WORKDIR /app/packages/backend
RUN npm build
RUN npm test

WORKDIR /app/packages/frontend
RUN npm build
```

---

### Anti-Pattern 2: Mixing cd and WORKDIR
```dockerfile
# ❌ Confusing - mixing cd and WORKDIR
WORKDIR /app
RUN cd packages/shared && npm build
RUN npm start                        # Where are we? Confusing!
WORKDIR /app/packages/frontend
```

**Fix**: Use only WORKDIR
```dockerfile
# ✅ Clear and consistent
WORKDIR /app
WORKDIR /app/packages/shared
RUN npm build
RUN npm start
```

---

### Anti-Pattern 3: Absolute Paths in cd
```dockerfile
# ❌ cd with absolute paths defeats the purpose
WORKDIR /app
RUN cd /app/packages/shared && npm build   # Same as WORKDIR!
```

**Fix**: Use WORKDIR instead
```dockerfile
# ✅ Use WORKDIR for clarity
WORKDIR /app/packages/shared
RUN npm build
```

---

## WORKDIR and COPY Interactions

### Understanding Relative Paths

```dockerfile
WORKDIR /app
COPY packages/shared/ ./packages/shared/
# Copies from: <build-context>/packages/shared/
# Copies to:   /app/packages/shared/

WORKDIR /app/packages/shared
COPY . ./
# Copies from: <build-context>/  (COPY ignores WORKDIR for source!)
# Copies to:   /app/packages/shared/  (uses WORKDIR for destination)
```

### COPY Source Path Rules
```dockerfile
# Important: COPY source path is relative to build context, NOT WORKDIR
WORKDIR /app/packages/backend
COPY . ./package.json
# Source: <context>/package.json (from root of build context!)
# NOT: <context>/packages/backend/package.json

# Correct way:
COPY packages/backend/package.json ./
```

---

## Quick Reference Checklist

- [ ] Use WORKDIR instead of cd for context switching
- [ ] Set WORKDIR at the beginning of a stage
- [ ] Change WORKDIR only when context logically changes
- [ ] Group related RUN commands under the same WORKDIR
- [ ] Use absolute paths for WORKDIR (e.g., /app/packages/shared)
- [ ] Avoid multiple consecutive WORKDIR changes
- [ ] Remember: COPY source paths are relative to build context, not WORKDIR
- [ ] Prefer one WORKDIR in simple cases (production stage)
- [ ] Document WORKDIR changes with comments in complex Dockerfiles
- [ ] Never rely on cd persistence across RUN commands

---

## Your Project - Recommended WORKDIR Usage

### Base Stage
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app                    # Set once and never change in this stage
# All operations from /app root
```

### Shared Builder
```dockerfile
FROM base AS shared-builder
WORKDIR /app                    # Inherit from base
WORKDIR /app/packages/shared    # Switch to shared package context
RUN pnpm build
```

### Frontend Builder
```dockerfile
FROM base AS frontend-builder
WORKDIR /app                    # Inherit from base
WORKDIR /app/packages/frontend  # Switch to frontend context
RUN pnpm build
```

### Backend Builder
```dockerfile
FROM base AS backend-builder
WORKDIR /app                    # Inherit from base
WORKDIR /app/packages/backend   # Switch to backend context
RUN pnpm prisma generate
RUN pnpm build
```

### Production
```dockerfile
FROM node:20-alpine AS production
WORKDIR /app                    # Set once and stick with it
# All operations from /app (no switching)
RUN pnpm install --prod
EXPOSE 3000
CMD ["node", "packages/backend/dist/main.js"]
```

